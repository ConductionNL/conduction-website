#!/usr/bin/env python3
"""Collect download metrics for Conduction Nextcloud apps.

Walks BOTH source forges, identifies repositories that look like Nextcloud
apps (presence of appinfo/info.xml), sums release-asset download counts, and
merges the two per app id:

  * GitHub  org ``ConductionNL`` — legacy/historical downloads. The apps were
    migrated off GitHub in 2026; the old release tarballs still carry their
    accumulated download counts, so we keep counting them.
  * Codeberg org ``Conduction``  — the live source. Nextcloud app-store
    installs now fetch the release tarball from here, so this is where new
    downloads accrue.

Each app's ``downloads_total`` is ``github + codeberg``; ``totals.downloads``
is the grand total the website StatsStrip renders. Joined with the Nextcloud
app store record (rating, latest store version, categories) when present.

Writes a compound JSON to data/app-downloads.json. Stdlib only — no pip deps.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

GITHUB_ORG = "ConductionNL"
CODEBERG_ORG = "Conduction"
PLATFORM_VERSION = "30.0.0"
GITHUB_API = "https://api.github.com"
CODEBERG_BASE = "https://codeberg.org"
CODEBERG_API = f"{CODEBERG_BASE}/api/v1"
STORE_API = f"https://apps.nextcloud.com/api/v1/platform/{PLATFORM_VERSION}/apps.json"
OUTPUT_PATH = Path(__file__).resolve().parents[2] / "data" / "app-downloads.json"

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
CODEBERG_TOKEN = os.environ.get("CODEBERG_TOKEN") or os.environ.get("CB_TOKEN")
USER_AGENT = "conduction-app-downloads"


# --------------------------------------------------------------------------- #
# Generic HTTP helpers
# --------------------------------------------------------------------------- #
def _request(url, headers, retries=3):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **headers})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read()), resp.headers
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) and attempt < retries - 1:
                wait = int(e.headers.get("Retry-After") or (2 ** attempt) * 5)
                print(f"  rate-limited, sleeping {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            raise


def fetch_text(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def parse_app_id(info_xml):
    m = re.search(r"<id>\s*([^<\s]+)\s*</id>", info_xml)
    return m.group(1) if m else None


# --------------------------------------------------------------------------- #
# GitHub (legacy source)
# --------------------------------------------------------------------------- #
def gh_headers():
    h = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


def gh_paginate(url):
    items = []
    while url:
        page, headers = _request(url, gh_headers())
        items.extend(page)
        next_url = None
        for part in headers.get("Link", "").split(","):
            if 'rel="next"' in part:
                next_url = part.split(";")[0].strip().strip("<>")
                break
        url = next_url
    return items


def collect_github():
    """Return {app_id: github_block}. Archived repos are kept on purpose —
    they hold the historical download counts from before the migration."""
    out = {}
    try:
        repos = gh_paginate(f"{GITHUB_API}/orgs/{GITHUB_ORG}/repos?per_page=100&type=public")
    except urllib.error.URLError as e:
        print(f"Warning: GitHub repo listing failed: {e}", file=sys.stderr)
        return out
    print(f"  GitHub: {len(repos)} repos", file=sys.stderr)

    for repo in repos:
        if repo.get("disabled") or repo.get("fork"):
            continue
        info_xml = fetch_text(
            f"https://raw.githubusercontent.com/{repo['full_name']}/{repo['default_branch']}/appinfo/info.xml"
        )
        if not info_xml:
            continue
        app_id = parse_app_id(info_xml)
        if not app_id:
            continue

        releases = gh_paginate(f"{GITHUB_API}/repos/{repo['full_name']}/releases?per_page=100")
        total, breakdown = _sum_releases(releases, asset_key="assets", tag_key="tag_name",
                                          published_key="published_at")
        latest = next((r for r in releases if not r.get("prerelease") and not r.get("draft")), None)
        out[app_id] = {
            "url": repo["html_url"],
            "repo": repo["full_name"],
            "stars": repo.get("stargazers_count", 0),
            "downloads": total,
            "latest_release": latest["tag_name"] if latest else None,
            "latest_release_at": latest["published_at"] if latest else None,
            "release_count": len(releases),
            "releases": breakdown,
        }
        print(f"  + GitHub {repo['full_name']} ({app_id}): {total}", file=sys.stderr)
    return out


# --------------------------------------------------------------------------- #
# Codeberg / Forgejo (live source)
# --------------------------------------------------------------------------- #
def cb_headers():
    h = {"Accept": "application/json"}
    if CODEBERG_TOKEN:
        h["Authorization"] = f"token {CODEBERG_TOKEN}"
    return h


def cb_paginate(path):
    """Forgejo paginates with ?limit=&page=; stop when a short page returns."""
    items, page, limit = [], 1, 50
    while True:
        sep = "&" if "?" in path else "?"
        page_data, _ = _request(f"{CODEBERG_API}{path}{sep}limit={limit}&page={page}", cb_headers())
        if not page_data:
            break
        items.extend(page_data)
        if len(page_data) < limit:
            break
        page += 1
    return items


def collect_codeberg():
    """Return {app_id: codeberg_block}."""
    out = {}
    try:
        repos = cb_paginate(f"/orgs/{CODEBERG_ORG}/repos")
    except urllib.error.URLError as e:
        print(f"Warning: Codeberg repo listing failed: {e}", file=sys.stderr)
        return out
    print(f"  Codeberg: {len(repos)} repos", file=sys.stderr)

    for repo in repos:
        if repo.get("archived") or repo.get("fork") or repo.get("private"):
            continue
        branch = repo.get("default_branch") or "main"
        info_xml = fetch_text(
            f"{CODEBERG_BASE}/{CODEBERG_ORG}/{repo['name']}/raw/branch/{branch}/appinfo/info.xml"
        )
        if not info_xml:
            continue
        app_id = parse_app_id(info_xml)
        if not app_id:
            continue

        releases = cb_paginate(f"/repos/{CODEBERG_ORG}/{repo['name']}/releases")
        total, breakdown = _sum_releases(releases, asset_key="assets", tag_key="tag_name",
                                         published_key="published_at")
        latest = next((r for r in releases if not r.get("prerelease") and not r.get("draft")), None)
        out[app_id] = {
            "url": repo["html_url"],
            "repo": repo["full_name"],
            "stars": repo.get("stars_count", 0),
            "downloads": total,
            "latest_release": latest["tag_name"] if latest else None,
            "latest_release_at": latest["published_at"] if latest else None,
            "release_count": len(releases),
            "releases": breakdown,
        }
        print(f"  + Codeberg {repo['full_name']} ({app_id}): {total}", file=sys.stderr)
    return out


def _sum_releases(releases, asset_key, tag_key, published_key):
    total, breakdown = 0, []
    for rel in releases:
        sub = sum(a.get("download_count", 0) for a in rel.get(asset_key) or [])
        total += sub
        if sub:
            breakdown.append({
                "tag": rel.get(tag_key),
                "published_at": rel.get(published_key),
                "downloads": sub,
            })
    return total, breakdown


# --------------------------------------------------------------------------- #
# Nextcloud app store
# --------------------------------------------------------------------------- #
def fetch_store_apps():
    req = urllib.request.Request(STORE_API, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except urllib.error.URLError as e:
        print(f"Warning: failed to fetch store data: {e}", file=sys.stderr)
        return {}
    return {app["id"]: app for app in data}


def store_summary(store_app):
    if not store_app:
        return None
    releases = store_app.get("releases") or []
    latest = releases[0] if releases else {}
    cats = store_app.get("categories") or []
    return {
        "in_store": True,
        "url": f"https://apps.nextcloud.com/apps/{store_app['id']}",
        "rating_recent": store_app.get("ratingRecent"),
        "rating_overall": store_app.get("ratingOverall"),
        "rating_count": store_app.get("ratingNumOverall"),
        "latest_version": latest.get("version"),
        "last_release_at": latest.get("createdAt"),
        "categories": [c["id"] if isinstance(c, dict) else c for c in cats],
    }


# --------------------------------------------------------------------------- #
# Merge + emit
# --------------------------------------------------------------------------- #
def main():
    print("Collecting GitHub (legacy) download stats...", file=sys.stderr)
    github = collect_github()
    print("Collecting Codeberg (live) download stats...", file=sys.stderr)
    codeberg = collect_codeberg()

    print("Fetching Nextcloud store catalog...", file=sys.stderr)
    store_by_id = fetch_store_apps()
    print(f"  {len(store_by_id)} apps in store", file=sys.stderr)

    apps = []
    for app_id in sorted(set(github) | set(codeberg)):
        gh = github.get(app_id)
        cb = codeberg.get(app_id)
        gh_dl = gh["downloads"] if gh else 0
        cb_dl = cb["downloads"] if cb else 0
        apps.append({
            "id": app_id,
            # Prefer the live Codeberg repo path; fall back to the GitHub one.
            "repo": (cb or gh)["repo"],
            "downloads_total": gh_dl + cb_dl,
            "github": gh,
            "codeberg": cb,
            "store": store_summary(store_by_id.get(app_id)),
        })

    dl_github = sum(a["github"]["downloads"] for a in apps if a["github"])
    dl_codeberg = sum(a["codeberg"]["downloads"] for a in apps if a["codeberg"])
    totals = {
        "downloads": dl_github + dl_codeberg,
        "downloads_github": dl_github,
        "downloads_codeberg": dl_codeberg,
        "apps_total": len(apps),
        "apps_in_store": sum(1 for a in apps if a["store"]),
    }

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {
            "github_org": GITHUB_ORG,
            "codeberg_org": CODEBERG_ORG,
            "store_platform_version": PLATFORM_VERSION,
            "notes": (
                "totals.downloads = GitHub (legacy) + Codeberg (live) release-asset "
                "fetches per app, merged by app id. Counts every tarball fetch (CI, "
                "mirrors, re-installs) — an upper bound on real installs."
            ),
        },
        "totals": totals,
        "apps": apps,
    }

    # If the existing file has the same payload (everything except the
    # timestamp), keep its generated_at so reruns with no real change
    # don't churn the working tree. Hosted CI starts from the committed
    # stub, so the payload differs there and a fresh timestamp is
    # written every build.
    try:
        with OUTPUT_PATH.open("r") as f:
            existing = json.load(f)
        new_payload = {k: v for k, v in output.items() if k != "generated_at"}
        old_payload = {k: v for k, v in existing.items() if k != "generated_at"}
        if new_payload == old_payload and existing.get("generated_at"):
            output["generated_at"] = existing["generated_at"]
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w") as f:
        json.dump(output, f, indent=2, sort_keys=True)
        f.write("\n")
    print(f"Wrote {OUTPUT_PATH} (totals={totals})", file=sys.stderr)


if __name__ == "__main__":
    main()
