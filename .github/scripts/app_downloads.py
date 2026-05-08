#!/usr/bin/env python3
"""Collect download metrics for ConductionNL Nextcloud apps.

Walks the ConductionNL GitHub org, identifies repositories that look like
Nextcloud apps (presence of appinfo/info.xml), sums GitHub release-asset
download counts, and joins each entry with the corresponding Nextcloud app
store record (rating, latest store version, categories) when present.

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

ORG = "ConductionNL"
PLATFORM_VERSION = "30.0.0"
GITHUB_API = "https://api.github.com"
STORE_API = f"https://apps.nextcloud.com/api/v1/platform/{PLATFORM_VERSION}/apps.json"
OUTPUT_PATH = Path(__file__).resolve().parents[2] / "data" / "app-downloads.json"

TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
USER_AGENT = "conduction-app-downloads"


def gh_request(url, accept="application/vnd.github+json"):
    headers = {"Accept": accept, "User-Agent": USER_AGENT}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    req = urllib.request.Request(url, headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read()), resp.headers
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) and attempt < 2:
                wait = int(e.headers.get("Retry-After") or (2 ** attempt) * 5)
                print(f"  rate-limited, sleeping {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            raise


def gh_paginate(url):
    items = []
    while url:
        page, headers = gh_request(url)
        items.extend(page)
        next_url = None
        for part in headers.get("Link", "").split(","):
            if 'rel="next"' in part:
                next_url = part.split(";")[0].strip().strip("<>")
                break
        url = next_url
    return items


def fetch_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
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


def main():
    print(f"Listing public repos for org {ORG}...", file=sys.stderr)
    repos = gh_paginate(f"{GITHUB_API}/orgs/{ORG}/repos?per_page=100&type=public")
    print(f"  {len(repos)} repos", file=sys.stderr)

    print("Fetching Nextcloud store catalog...", file=sys.stderr)
    store_by_id = fetch_store_apps()
    print(f"  {len(store_by_id)} apps in store", file=sys.stderr)

    apps = []
    for repo in repos:
        if repo.get("archived") or repo.get("disabled"):
            continue
        info_xml = fetch_text(
            f"https://raw.githubusercontent.com/{repo['full_name']}/{repo['default_branch']}/appinfo/info.xml"
        )
        if not info_xml:
            continue
        app_id = parse_app_id(info_xml)
        if not app_id:
            continue

        print(f"  + {repo['full_name']} ({app_id})", file=sys.stderr)
        releases = gh_paginate(f"{GITHUB_API}/repos/{repo['full_name']}/releases?per_page=100")
        total = 0
        breakdown = []
        for rel in releases:
            sub = sum(a.get("download_count", 0) for a in rel.get("assets") or [])
            total += sub
            if sub:
                breakdown.append({
                    "tag": rel.get("tag_name"),
                    "published_at": rel.get("published_at"),
                    "downloads": sub,
                })

        latest = next((r for r in releases if not r.get("prerelease") and not r.get("draft")), None)
        apps.append({
            "id": app_id,
            "repo": repo["full_name"],
            "github": {
                "url": repo["html_url"],
                "stars": repo.get("stargazers_count", 0),
                "downloads": total,
                "latest_release": latest["tag_name"] if latest else None,
                "latest_release_at": latest["published_at"] if latest else None,
                "release_count": len(releases),
                "releases": breakdown,
            },
            "store": store_summary(store_by_id.get(app_id)),
        })

    apps.sort(key=lambda a: a["id"])

    totals = {
        "downloads": sum(a["github"]["downloads"] for a in apps),
        "apps_total": len(apps),
        "apps_in_store": sum(1 for a in apps if a["store"]),
    }

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {
            "org": ORG,
            "store_platform_version": PLATFORM_VERSION,
            "notes": "github.downloads counts every release-asset fetch (CI, mirrors, re-installs) — upper bound on real installs.",
        },
        "totals": totals,
        "apps": apps,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w") as f:
        json.dump(output, f, indent=2, sort_keys=True)
        f.write("\n")
    print(f"Wrote {OUTPUT_PATH} (totals={totals})", file=sys.stderr)


if __name__ == "__main__":
    main()
