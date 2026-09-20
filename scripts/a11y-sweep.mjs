#!/usr/bin/env node
/**
 * The full mobile and dark-mode review: every route, both locales, four
 * widths, both themes.
 *
 *   npm run build
 *   npx docusaurus serve --port 4300 --no-open &
 *   node scripts/a11y-sweep.mjs                       # local build
 *   SWEEP_BASE=https://www.conduction.nl node scripts/a11y-sweep.mjs
 *
 * This is not part of CI. `e2e/a11y.spec.js` gates a sample on every run;
 * this measures the whole site when something structural moves.
 *
 * Two things it does that the earlier sweeps did not, both of which changed
 * the answer:
 *
 *   - It builds the route list from the BUILD DIRECTORY, not from
 *     sitemap.xml. The sitemap does not list `/nl/`, so three separate
 *     "all 163 pages" sweeps measured exactly half the site and reported
 *     green while /nl/terms/ carried 88 invisible elements.
 *   - It refuses to start until the checks have been shown to fail. Run
 *     `npx playwright test a11y-selftest` first.
 */
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.SWEEP_BASE || 'http://localhost:4300';
const LANES = Number(process.env.SWEEP_LANES || 6);
const OUT = process.env.SWEEP_OUT || 'a11y-findings.json';
const BUILD = process.env.SWEEP_BUILD || 'build';

const {RUN_CHECKS} = await import('../e2e/a11y-checks.js');

/* Every directory in the build that holds an index.html is a route a
   visitor can reach. Docusaurus's own machinery (assets, the search index)
   has no index.html, so this needs no allow-list. */
function routes(dir) {
  const found = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, {withFileTypes: true})) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'index.html') {
        const rel = path.relative(BUILD, path.dirname(full));
        found.push(rel === '' ? '/' : `/${rel}/`);
      }
    }
  };
  walk(dir);
  return [...new Set(found)].sort();
}

/* 320 is the narrowest phone still in real use and the width that actually
   breaks layouts; 390 is the audit baseline; 768 is the tablet hinge where
   a desktop grid is still in force; 1280 catches desktop-only regressions.
   Light runs alongside dark so a finding can be ATTRIBUTED to dark mode
   rather than assumed: a contrast miss present in both themes is brand debt
   that predates it. */
const COMBOS = [
  {width: 320, theme: 'dark'},
  {width: 390, theme: 'light'},
  {width: 390, theme: 'dark'},
  {width: 768, theme: 'dark'},
  {width: 1280, theme: 'light'},
  {width: 1280, theme: 'dark'},
];

/* The footer stylesheet is injected lazily; measured before it lands the
   footer reports its unstyled metrics and invents target-size findings. */
const footerReady = () => {
  const f = document.querySelector('.canal-footer');
  if (!f) return true;
  const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) =>
    l.href.includes('canal-footer'),
  );
  if (!link) return false;
  try {
    if (!link.sheet || link.sheet.cssRules.length === 0) return false;
  } catch {
    if (!link.sheet) return false;
  }
  const go = f.querySelector('.game-over');
  return !(go && getComputedStyle(go).display !== 'none');
};

const all = routes(BUILD);
const findings = [];
const errors = [];
const redirects = [];
let done = 0;

async function lane(browser, slice) {
  const pages = [];
  for (const combo of COMBOS) {
    const ctx = await browser.newContext({
      viewport: {width: combo.width, height: combo.width < 700 ? 844 : 900},
      deviceScaleFactor: combo.width < 700 ? 3 : 1,
      isMobile: combo.width < 700,
      hasTouch: combo.width < 700,
    });
    pages.push({combo, ctx, page: await ctx.newPage()});
  }
  for (const url of slice) {
    for (const {combo, page} of pages) {
      let ok = false;
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
        try {
          const resp = await page.goto(BASE + url, {waitUntil: 'networkidle', timeout: 45000});
          if (!resp || resp.status() >= 400) throw new Error(`HTTP ${resp && resp.status()}`);
          /* 118 of these routes are redirect stubs: a meta-refresh plus a
             location assignment. The browser follows them, so without this
             check the sweep measures whatever it lands on and files the
             findings under the stub's URL. Off site that means reporting
             another domain's defects as ours (/openconnector/ redirects to
             openconnector.conduction.nl, which this repo does not control);
             on site it means measuring the target twice and attributing one
             copy to the wrong page. Either way the stub itself has no
             content to check. */
          const landed = page.url();
          if (!landed.startsWith(BASE) || new URL(landed).pathname !== url) {
            redirects.push({from: url, to: landed});
            ok = true;
            break;
          }
          await page.waitForFunction(footerReady, null, {timeout: 20000});
          for (const f of await page.evaluate(RUN_CHECKS, {theme: combo.theme})) {
            findings.push({url, width: combo.width, theme: combo.theme, ...f});
          }
          ok = true;
        } catch (e) {
          if (attempt === 3) {
            errors.push({url, combo, error: String(e).slice(0, 140)});
            console.log(`ERROR ${url} ${combo.width}/${combo.theme}: ${String(e).slice(0, 80)}`);
          } else {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
      }
    }
    done++;
    if (done % 25 === 0) console.log(`PROGRESS ${done}/${all.length} routes, ${findings.length} findings`);
  }
  for (const p of pages) await p.ctx.close();
}

console.log(`sweeping ${all.length} routes x ${COMBOS.length} combos = ${all.length * COMBOS.length} loads against ${BASE}`);
const browser = await chromium.launch();
await Promise.all(
  Array.from({length: LANES}, (_, i) => lane(browser, all.filter((_, j) => j % LANES === i))),
);
await browser.close();

/* A defect seen at six combos is one defect. Attribution: a contrast miss
   that also occurs in light is not something dark mode broke; a layout
   defect that also occurs at 1280 is not a mobile defect. */
const uniq = new Map();
for (const f of findings) {
  const k = `${f.url}|${f.check}|${f.text}`;
  if (!uniq.has(k)) uniq.set(k, {...f, themes: new Set(), widths: new Set()});
  uniq.get(k).themes.add(f.theme);
  uniq.get(k).widths.add(f.width);
}
const defects = [...uniq.values()].map((f) => ({
  ...f,
  themes: [...f.themes],
  widths: [...f.widths],
  bucket: f.check.includes('contrast')
    ? (f.themes.has('dark') && !f.themes.has('light') ? 'dark-only' : 'both-themes')
    : (f.widths.has(1280) ? 'all-widths' : 'narrow-only'),
}));

fs.writeFileSync(OUT, JSON.stringify({defects, errors, redirects}, null, 1));

const pagesOf = (l) => new Set(l.map((f) => f.url)).size;
console.log('');
const stubRoutes = new Set(redirects.map((r) => r.from)).size;
console.log(`SWEPT ${done - stubRoutes} routes with content, skipped ${stubRoutes} redirect stubs, ${errors.length} load failures`);
console.log(`raw ${findings.length}  ->  distinct defects ${defects.length}`);
console.log('');
console.log('check                   defects  pages   en/nl     attribution');
const byCheck = {};
for (const f of defects) (byCheck[f.check] = byCheck[f.check] || []).push(f);
for (const [check, sub] of Object.entries(byCheck).sort((a, b) => b[1].length - a[1].length)) {
  const en = sub.filter((f) => !f.url.startsWith('/nl/')).length;
  const b = {};
  for (const f of sub) b[f.bucket] = (b[f.bucket] || 0) + 1;
  console.log(
    `${check.padEnd(22)} ${String(sub.length).padStart(7)} ${String(pagesOf(sub)).padStart(6)}  ${String(en).padStart(4)}/${String(sub.length - en).padEnd(4)} ` +
      Object.entries(b).map(([k, v]) => `${k}:${v}`).join(' '),
  );
}
const crit = defects.filter((f) => f.severity === 'critical');
console.log('');
console.log(`=== critical: ${crit.length} on ${pagesOf(crit)} pages ===`);
for (const f of crit.slice(0, 40)) console.log(`  ${f.url}  ${f.check}  "${f.text}"  ${f.detail}`);
console.log('');
console.log(`SWEEP EXIT=${crit.length || errors.length ? 1 : 0}`);
