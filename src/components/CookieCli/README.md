# Vendored `<CookieCli />` — temporary

**This is a copy. Do not fix bugs here.**

The source of truth is
`docusaurus-preset/src/components/CookieCli/` in the
[design-system](https://github.com/ConductionNL/design-system) repo, where
this shipped as commit `cc0a576` (the shell and Space Invaders port).

## Why the copy exists

The site consumes these components from `@conduction/docusaurus-preset` on
npm. The version carrying the game, 3.29.0, is not published yet: the
publish requires a one-time password on the npm account, which only a human
with the second factor can supply.

The automation that used to do this is gone rather than broken. The preset
was published by `.forgejo/workflows/release-npm.yml`, a semantic-release
job that ran on Codeberg, and Codeberg was retired on 2026-08-04. Nothing on
GitHub replaced it, which is why `docusaurus-preset/package.json` still says
`0.1.1` while npm is at 3.28.0: the real versions only ever existed as
semantic-release git tags (`docusaurus-preset-v*`).

So the choice was to ship the game from here, or not ship it.

## Removing this

Once `@conduction/docusaurus-preset@3.29.0` (or later) is on npm:

1. `npm install @conduction/docusaurus-preset@^3.29.0`
2. Delete this directory.
3. In `src/theme/Root.js`, import `CookieCli` from
   `@conduction/docusaurus-preset/components` again — the import is marked
   with a comment pointing back here.
4. Rebuild and check the banner still opens from the footer and that
   `./game.exe` still runs.

Nothing else references these files.
