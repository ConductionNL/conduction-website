/**
 * Mobile and dark-mode regression gate.
 *
 * `scripts/a11y-sweep.mjs` measures all 779 routes and is run on demand.
 * This is the part that runs every time: a sample of pages, at the widths
 * and themes where the faults actually appeared, asserting only the classes
 * that were fixed. It is deliberately not a full WCAG audit, because a gate
 * that fails on pre-existing debt teaches everyone to ignore it.
 *
 * WHAT THIS GATES, and why each one is here rather than in the "reported"
 * list below:
 *
 *   contrast-invisible   text at under 1.5:1. Two of these shipped: the
 *                        archive page title and a hero link, both at exactly
 *                        1.00, both in production, both for months.
 *   contrast-severe      under 3:1. The 1.73:1 band is where the raw-palette
 *                        inks landed, and the previous suite's 1.5 threshold
 *                        sat just underneath it and reported green.
 *   offscreen-control    a control the reader cannot reach. The page sets
 *                        overflow-x: clip, so there is no scrollbar and no
 *                        symptom.
 *   offscreen-content    same, for prose. 218 of these on academy pages from
 *                        a single grid track that refused to shrink.
 *
 * WHAT IT DOES NOT GATE, deliberately, all of it pre-existing and none of it
 * caused by mobile or dark mode:
 *
 *   target-size          ~10,500, almost all text links whose height is the
 *                        line-height. A real SC 2.5.8 gap and a design
 *                        decision, not a regression.
 *   tiny-text            ~4,100 at 11px are the brand's uppercase eyebrow
 *                        convention; ~1,000 at 10px and 23 at 9px are worth
 *                        a look.
 *   target-spacing,
 *   clipped-text,
 *   nontext-contrast     form borders at 1.78:1, which fail in LIGHT mode.
 *   contrast-aa          the 3-to-4.5 band, which is mostly the Nextcloud
 *                        blue at 4.17:1 on white, in both themes.
 *
 * Run `npx playwright test a11y-selftest` if you doubt these checks: it runs
 * each of them against a page built to break it.
 */

import {test, expect} from './base.js';
import {RUN_CHECKS} from './a11y-checks.js';

const BLOCKING = ['contrast-invisible', 'contrast-severe', 'offscreen-control', 'offscreen-content'];

/*
 * The brand-citation allowlist is gone, and this note is what replaced it.
 *
 * It held two colours: Common Ground yellow (#F6AD00) cited as text at
 * 1.93:1, and KNVB orange (#F36C21) at 2.68:1 on a cobalt-50 ground. The
 * comment said the fix was a brand decision, not an accessibility one, and
 * so the sweep should not make it.
 *
 * The decision was taken in the design system, from the kit's own rules.
 * The kit only ever sanctions the yellow as a FILL with cobalt-900 ink on
 * it, and it already published a text-safe orange for exactly this. Both
 * citation classes now read a theme-aware token: a darker derived colour on
 * a light ground, the real brand colour on a dark one. See design-system
 * PRs #86 and #87.
 *
 * So there is nothing left to allow. If either raw colour shows up as text
 * again, that is a regression and the gate should say so.
 */

/* One page per layout archetype, plus every page that actually carried a
   fixed defect, plus Dutch twins. A sample drawn only from layouts you
   already thought about keeps agreeing with you: this list is the layouts
   PLUS the crime scenes. */
const PAGES = [
  ['home', '/'],
  ['apps listing', '/apps/'],
  ['app detail, cobalt hero + cta banner', '/apps/zaakafhandelapp/'],
  ['blog archive, Infima hero', '/academy/archive/'],
  ['academy tutorial, code in steps', '/academy/run-nextcloud-locally/'],
  ['academy tutorial, prerequisites list', '/academy/openspec-tutorial-5-retrofit/'],
  ['quality, accordions + definition lists', '/quality/'],
  ['terms, SLA tables', '/terms/'],
  ['support, forms + hex network', '/support/'],
  ['commonground, layer model', '/commonground/'],
  ['arcade', '/arcade/'],
  ['contact, CRM form', '/contact/'],

  /* The Dutch locale is a parallel set of source files, not a translation
     layer, so nothing mechanically keeps it in step. It is also absent from
     sitemap.xml, which is how it went unmeasured while /nl/terms/ carried 88
     invisible elements and the English suite was green. */
  ['nl home', '/nl/'],
  ['nl app detail', '/nl/apps/zaakafhandelapp/'],
  ['nl blog archive', '/nl/academy/archive/'],
  ['nl quality', '/nl/quality/'],
  ['nl support', '/nl/support/'],
  ['nl commonground', '/nl/commonground/'],
];

/* 320 is where layouts break and 1280 is where they do not, so a failure at
   320 alone is attributable to width. Dark at both, plus light at 1280 to
   catch a fix that trades one theme for the other: migrating ink without
   migrating the surface under it once took the navbar from fine to 1.29:1. */
const COMBOS = [
  {width: 320, theme: 'dark'},
  {width: 1280, theme: 'dark'},
  {width: 1280, theme: 'light'},
];

const footerReady = () => {
  const f = document.querySelector('.canal-footer');
  if (!f) return true;
  const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => l.href.includes('canal-footer'));
  if (!link) return false;
  try {
    if (!link.sheet || link.sheet.cssRules.length === 0) return false;
  } catch {
    if (!link.sheet) return false;
  }
  const go = f.querySelector('.game-over');
  return !(go && getComputedStyle(go).display !== 'none');
};

for (const [name, path] of PAGES) {
  for (const combo of COMBOS) {
    test(`${name} at ${combo.width}px ${combo.theme}`, async ({page}) => {
      await page.setViewportSize({width: combo.width, height: combo.width < 700 ? 844 : 900});
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForFunction(footerReady);

      const found = await page.evaluate(RUN_CHECKS, {theme: combo.theme});
      const blocking = found.filter((f) => BLOCKING.includes(f.check));

      expect(
        blocking.map((f) => `${f.check}  "${f.text}"  ${f.detail}${f.color ? `  ${f.color} on ${f.background}` : ''}`),
        `${blocking.length} blocking defect(s) on ${path} at ${combo.width}px in ${combo.theme}`,
      ).toEqual([]);
    });
  }
}
