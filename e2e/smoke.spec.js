/**
 * Every page, in both locales: does it render, and does it hydrate?
 *
 * The rest of the suite goes deep on three surfaces. This one goes wide,
 * because the failure this repo keeps hitting is invisible: a page that
 * builds green, screenshots perfectly, and fails to hydrate. React reports
 * that only on the console, so asserting zero console errors across every
 * route is worth more here than any number of screenshot comparisons.
 *
 * It also makes framework upgrades decidable on evidence. Running this
 * against React 18 and React 19 gave identical results, which is how the
 * React 19 bump stopped being a guess.
 *
 * Routes are listed rather than read from the sitemap at runtime. A
 * generated list that silently shrinks would quietly stop testing things,
 * and noticing when something is missing is the point. (Docusaurus does
 * generate sitemaps automatically, one per locale, via the classic
 * preset's plugin-sitemap; both are referenced from robots.txt.)
 *
 * ---------------------------------------------------------------------
 * KNOWN DEBT
 *
 * Three sets below record defects that predate this suite. They are listed
 * rather than silently skipped so that the suite passes while the debt
 * stays countable: shortening a list is the definition of done for each
 * fix. All three were confirmed present on React 18 and React 19 alike, so
 * none of them is upgrade fallout.
 * ---------------------------------------------------------------------
 */

import {test, expect} from '@playwright/test';
import {collectConsoleErrors, expectNoConsoleErrors} from './helpers.js';

const PAGES = [
  '/', '/about/', '/ai/', '/apps/', '/beheer/', '/build/', '/commonground/',
  '/connext/', '/contact/', '/demo/', '/install/', '/partners/', '/privacy/',
  '/quality/', '/sidecars/', '/solutions/', '/support/', '/terms/',
  '/academy/',
];

/* The Dutch site is a subset: pages are translated by duplicating the MDX,
   so only those with an i18n copy exist under /nl/. */
const NL_PAGES = [
  '/nl/', '/nl/about/', '/nl/ai/', '/nl/apps/', '/nl/connext/', '/nl/contact/',
  '/nl/privacy/', '/nl/terms/', '/nl/academy/',
];

/**
 * Empty, and it should stay that way.
 *
 * Fourteen pages had no <h1> at all: they open on a SectionHead, which
 * renders an <h2>, so the document had no level-one heading. Screen-reader
 * users navigate by heading level and search engines weight h1, so that is
 * a real defect (WCAG 1.3.1) rather than a stylistic preference.
 *
 * They now carry a visually hidden <h1> (src/components/PageHeading.jsx)
 * matching the title the page shows on screen. Hidden rather than visible
 * because the visible alternative would redesign a dozen public pages, and
 * because SectionHead has no heading-level prop to promote.
 */
const PAGES_WITHOUT_H1 = new Set([]);

/**
 * Empty, and it should stay that way.
 *
 * /connext/ scrolled sideways in both locales: decorative hex panel
 * backgrounds bleed past their container and ended up a single pixel wider
 * than the document, which is enough for a scrollbar on desktop and a
 * draggable page on a phone. Fixed with `overflow-x: clip` on the root in
 * src/css/site.css.
 */
const PAGES_THAT_SCROLL_SIDEWAYS = new Set([]);

/**
 * Empty, and it should stay that way.
 *
 * Five pages failed hydration when this suite was written (/contact/,
 * /terms/, /nl/about/, /nl/contact/, /nl/terms/, all React #418) and all
 * five are fixed. Both causes were MDX turning valid-looking source into
 * invalid HTML:
 *
 *   - A <p> written across several lines had its contents parsed as
 *     markdown and wrapped in a second <p>. The browser split the nesting
 *     into siblings, so the server sent five children where React built
 *     three.
 *   - A bare email address inside an <a> was auto-linked, nesting an <a>
 *     in an <a>, which the parser also pulled apart.
 *
 * Neither shows up in the rendered page. Only the console says anything,
 * which is why this set exists rather than a screenshot comparison.
 */
const PAGES_WITH_HYDRATION_ERRORS = new Set([]);

/**
 * Can the visitor actually drag the page sideways?
 *
 * Not `scrollWidth > innerWidth`. Decorative backgrounds legitimately bleed
 * past the viewport, and with `overflow-x: clip` containing them the
 * document's scrollWidth still reports the wider content even though
 * nothing can be scrolled. Measuring the width therefore reports a bug that
 * no visitor can experience. Try to scroll instead, and put it back.
 */
async function canScrollSideways(page) {
  return page.evaluate(() => {
    const before = window.scrollX;
    window.scrollTo(500, window.scrollY);
    const moved = window.scrollX > before;
    window.scrollTo(before, window.scrollY);
    return moved;
  });
}

for (const path of [...PAGES, ...NL_PAGES]) {
  test(`${path} renders and hydrates cleanly`, async ({page}) => {
    const errors = collectConsoleErrors(page);

    const response = await page.goto(path);
    expect(response?.status(), `${path} should return 200`).toBeLessThan(400);

    // A page that rendered has a top-level heading and a footer.
    const heading = PAGES_WITHOUT_H1.has(path) ? 'h1, h2' : 'h1';
    await expect(
      page.locator(heading).first(),
      `${path} should open with a heading`,
    ).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();

    // Give hydration time to run and complain.
    await page.waitForTimeout(1200);
    if (!PAGES_WITH_HYDRATION_ERRORS.has(path)) {
      expectNoConsoleErrors(errors);
    }

    if (!PAGES_THAT_SCROLL_SIDEWAYS.has(path)) {
      expect(await canScrollSideways(page), `${path} scrolls horizontally`).toBe(false);
    }
  });
}

/**
 * The debt lists must shrink, never grow.
 *
 * Without this, a page could regress into one of the sets above and the
 * suite would stay green because someone "fixed" the failure by adding a
 * line to an allowlist. This test fails when a listed page has actually
 * been fixed, which forces the list to be updated rather than forgotten.
 */
test('the known-debt lists are still accurate', async ({page}) => {
  test.slow();
  const fixed = {noH1: [], sideways: []};

  for (const path of PAGES_WITHOUT_H1) {
    await page.goto(path);
    if (await page.locator('h1').count() > 0) fixed.noH1.push(path);
  }
  for (const path of PAGES_THAT_SCROLL_SIDEWAYS) {
    await page.goto(path);
    /* Wait for hydration before measuring. The overflow on /connext/ came
       from a client-rendered element, so a measurement taken straight after
       navigation reports a clean page and this check would cheerfully
       declare the bug fixed. */
    await page.waitForTimeout(1200);
    if (!(await canScrollSideways(page))) fixed.sideways.push(path);
  }

  expect(
    fixed.noH1,
    'these pages now have an h1 — remove them from PAGES_WITHOUT_H1',
  ).toEqual([]);
  expect(
    fixed.sideways,
    'these pages no longer scroll sideways — remove them from PAGES_THAT_SCROLL_SIDEWAYS',
  ).toEqual([]);
});
