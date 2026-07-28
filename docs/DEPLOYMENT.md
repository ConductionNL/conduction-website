# Deployment architecture

_Status: 2026-07-28. This file describes how the site actually reaches
production today — including the temporary Cloudflare leg — so nobody has to
reverse-engineer it from DNS again._

## The pipeline

```
merge to development
  └─ Documentation workflow (.github/workflows/documentation.yml,
     reusable workflow from ConductionNL/.github@main)
       └─ builds the Docusaurus site (repo root, source-folder: .)
       └─ publishes the build to the gh-pages branch   ← CI target
                    │
                    │  (manual bridge, see below)
                    ▼
     Cloudflare Pages project `conduction-website`     ← PRODUCTION
       └─ www.conduction.nl is a proxied CNAME to
          conduction-website.pages.dev
```

- **gh-pages is the CI target, not production.** The workflow deploys there
  on every push to `development` (plus a nightly rebuild), but since the
  GitHub Pages outage failover, `www.conduction.nl` does **not** serve
  GitHub Pages.
- **Production is the Cloudflare Pages project `conduction-website`**
  (direct-upload). DNS for `www.conduction.nl` (and the vanity hosts
  `academy`/`commonground`/`connext.conduction.nl`) points at
  `conduction-website.pages.dev`, proxied.

## How a merge reaches production

There is **no Cloudflare API token secret in this repository**, so CI cannot
deploy to Cloudflare Pages. Until DNS reverts to GitHub Pages or a CF token
secret is added, delivery is a one-command host-side step (Ruben's machine,
where wrangler is OAuth-authenticated):

```bash
bash ~/conduction-cf-failover/deliver-website.sh
```

The script fetches the current `gh-pages` snapshot of this repository and
runs `npx wrangler pages deploy <dir> --project-name conduction-website`,
then echoes the deployment URL. It is idempotent — re-running deploys the
same snapshot again, which is harmless.

So the full flow after merging a PR to `development` is:

1. wait for the **Documentation** workflow on `development` to finish
   (it pushes the new build to `gh-pages`),
2. run `deliver-website.sh`,
3. spot-check `https://www.conduction.nl`.

## Exit paths from this setup

Either of these removes the manual step:

- **Revert DNS to GitHub Pages** (see
  `~/conduction-cf-failover/revert-to-github.sh`): gh-pages becomes
  production again and the CF project turns into a cold standby.
- **Add a `CLOUDFLARE_API_TOKEN` secret** to this repo and append a wrangler
  deploy step/job to the Documentation workflow: CI then delivers to CF
  Pages directly.

## Known degradation: the fallback site image

The reusable Documentation workflow also builds a self-contained Apache
image of the site and pushes it to GHCR (`ghcr.io/conductionnl/conduction-website`).
That push currently fails with `denied: permission_denied: write_package`:
the GHCR **package**'s "Manage Actions access" does not grant this
repository write access, and only an org/package admin can add it — repo
tokens cannot. The job is marked best-effort (`continue-on-error`) with a
loud workflow warning until that org-side grant is made. The gh-pages deploy
and the Cloudflare delivery are unaffected.
