# Deployment architecture

_Status: 2026-08-05. GitHub Pages is retired. There is now one path to
production and CI owns it._

## The pipeline

```
merge to development
  └─ Deploy workflow (.github/workflows/deploy.yml)
       └─ builds the Docusaurus site (repo root)
       └─ wrangler pages deploy build --branch main
            └─ Cloudflare Pages project `conduction-website`  ← PRODUCTION
                 └─ www.conduction.nl is a proxied CNAME to
                    conduction-website.pages.dev
```

Production is the Cloudflare Pages project `conduction-website`
(direct-upload). DNS for `www.conduction.nl` and the vanity hosts
(`academy`, `commonground`, `connext.conduction.nl`) points at
`conduction-website.pages.dev`, proxied.

## Two things that will bite you

**`--branch main` is not this repo's branch.** Cloudflare Pages treats one
branch name per project as production, and for `conduction-website` that
name is `main`. Deploying from `development` under its own name produces a
*preview* deployment on a random `*.pages.dev` URL. It succeeds, it looks
right, and it never reaches `www.conduction.nl`.

**Required secrets.** `CF_API_TOKEN` (permission: Account → Cloudflare
Pages → Edit) and `CF_ACCOUNT_ID`, both org-level and already present.
The names matter: this workflow previously asked for
`CLOUDFLARE_API_TOKEN`, which is not a secret anywhere, so every deploy
since ~15 Aug failed on an empty token while PR checks stayed green —
the deploy step is skipped on `pull_request`, so nothing surfaced it.

## Deploying by hand

Only needed if CI is unavailable. Requires wrangler authenticated to the
Conduction Cloudflare account:

```bash
npm ci --legacy-peer-deps && npm run build
npx wrangler pages deploy build --project-name=conduction-website --branch main
```

Verify by fetching the live page and checking the asset hash actually
changed, rather than trusting the deployment URL:

```bash
curl -s "https://www.conduction.nl/?cb=$RANDOM" | grep -oE 'main\.[a-f0-9]+\.js'
```

Give the edge a minute. Immediately after a deploy, different edge nodes
briefly serve different versions, so a chunk can 404 on one request and
return 200 on the next. Check twice before believing a missing asset.

## Retired: GitHub Pages

The site used to publish to the `gh-pages` branch via
`.github/workflows/documentation.yml` (a reusable workflow from
`ConductionNL/.github`), and GitHub Pages served it with a custom-domain
claim on `www.conduction.nl` plus a `static/CNAME` file.

DNS moved to Cloudflare during a GitHub Pages outage and never moved back,
which left the repo writing `gh-pages` on every push and GitHub Pages
building a site nobody could reach. Retired on 2026-08-05: the workflow is
deleted, the Pages site is disabled, the domain claim released, and
`static/CNAME` removed. Nothing consumes the `gh-pages` branch now; it is
kept only as history.

## Retired: the Forgejo deploy workflow

Codeberg was retired on 2026-08-04. Any `.forgejo/workflows/*` in this repo
is residue and runs nowhere.
