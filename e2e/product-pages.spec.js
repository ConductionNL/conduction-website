/**
 * Product pages, in both locales: structure, hydration, and the new
 * interactive surfaces.
 *
 * The 2026-08 rewrite gave every app page the same skeleton (hero, four
 * ways, widget carousel, workspace showcase, pairs, partners at the
 * bottom) with deliberate per-app exceptions. This suite pins that
 * skeleton the same way smoke.spec.js pins the route list: expectations
 * are listed explicitly per page, so a page that silently loses a section
 * fails a test instead of a review.
 *
 * What each check is for:
 * - "Unknown app" is AppMock's fallback frame; it appearing means the
 *   preset shipped without the page's hero variant (this happened when the
 *   npm trusted publisher silently broke and node_modules stayed on an
 *   old preset).
 * - The carousel controls only render when WidgetShelf is in carousel
 *   mode; their absence means the shelf regressed to the static grid.
 * - Console errors catch hydration failures, which build green and
 *   screenshot perfectly (see smoke.spec.js's header).
 */

import {test, expect} from '@playwright/test';
import {collectConsoleErrors, expectNoConsoleErrors} from './helpers.js';

/*
 * ways: expected heading fragment ('four' | 'three' | null when the page
 *       has no cards section at all).
 * shelf: page renders a WidgetShelf (carousel controls expected).
 * demo: hero carries the partner-demo deeplink for this slug.
 */
const APPS = {
  pipelinq: {ways: 'four', shelf: true, demo: true},
  openregister: {ways: 'four', shelf: true, demo: true},
  buildiq: {ways: 'four', shelf: true, demo: true},
  hermiq: {ways: 'four', shelf: true, demo: true},
  shillinq: {ways: 'four', shelf: true, demo: true},
  launchpad: {ways: 'four', shelf: true, demo: true},
  stackiq: {ways: 'four', shelf: true, demo: true},
  decidiq: {ways: 'four', shelf: true, demo: true},
  dossiq: {ways: 'four', shelf: true, demo: true},
  learniq: {ways: 'four', shelf: true, demo: true},
  filinq: {ways: 'four', shelf: true, demo: true},
  opencatalogi: {ways: 'four', shelf: true, demo: true},
  integriq: {ways: 'four', shelf: true, demo: true},
  planninq: {ways: 'four', shelf: true, demo: true},
  humaniq: {ways: 'four', shelf: true, demo: true},
  larpinq: {ways: 'four', shelf: true, demo: true},
  /* Deliberate exceptions, and why:
   * - keepiq: a zero-knowledge vault has no client-self-service story,
   *   so it honestly keeps three ways.
   * - portaliq: it IS the self-service story; the trio stays.
   * - thematiq: ships zero widgets; its shelf shows the theme tokens.
   * - zaakafhandelapp: sunset page pointing at Procest; no cards/shelf.
   * - versioniq: in development; no cards/shelf/demo CTA. */
  keepiq: {ways: 'three', shelf: true, demo: true},
  portaliq: {ways: 'three', shelf: true, demo: true},
  /* thematiq: a theme has no client-self-service card either. */
  thematiq: {ways: 'three', shelf: true, demo: true},
  zaakafhandelapp: {ways: null, shelf: false, demo: true},
  'versioniq': {ways: null, shelf: false, demo: false},
};

const WAYS_HEADING = {
  en: {four: /Four ways .+ earns its place/i, three: /Three ways .+ earns its place/i},
  nl: {four: /Vier manieren waarop .+ zijn plek verdient/i, three: /Drie manieren waarop .+ zijn plek verdient/i},
};

/* PAGE SLUG -> the app id the PARTNERS PAGE and <AppMock> still use.
 *
 * The page paths moved 2026-08-23; these two identifiers did NOT, and the
 * difference is deliberate. `?app=` filters the partners directory, and
 * `<AppMock app>` resolves an illustration out of
 * @conduction/docusaurus-preset — both keyed on the id those consumers know.
 * Moving them here would filter on a value the partners page has never seen and
 * render the "Unknown app" fallback frame, which the assertion just above
 * explicitly forbids.
 *
 * Absent from this map means the page slug and the app id are still the same. */
const PARTNER_APP_ID = {
  versioniq: 'app-versions',
  decidiq: 'decidesk',
  filinq: 'docudesk',
  keepiq: 'doriath',
  humaniq: 'hrmq',
  larpinq: 'larpingapp',
  thematiq: 'nldesign',
  buildiq: 'openbuild',
  integriq: 'openconnector',
  planninq: 'planix',
  dossiq: 'procest',
  learniq: 'scholiq',
  stackiq: 'softwarecatalog',
};

for (const locale of ['en', 'nl']) {
  const prefix = locale === 'nl' ? '/nl' : '';
  test.describe(`product pages (${locale})`, () => {
    for (const [slug, exp] of Object.entries(APPS)) {
      const path = `${prefix}/apps/${slug}/`;

      test(`${slug}: renders, hydrates, and keeps its skeleton`, async ({page}) => {
        const errors = collectConsoleErrors(page);
        await page.goto(path);

        // A real page, not a soft 404.
        await expect(page.locator('h1').first()).toBeVisible();

        // Hero renders a real mock, never the fallback frame.
        await expect(page.getByText('Unknown app')).toHaveCount(0);

        // The cards section, where the page has one.
        if (exp.ways) {
          await expect(
            page.getByText(WAYS_HEADING[locale][exp.ways]).first(),
          ).toBeVisible();
        }

        // Carousel controls prove the shelf is the carousel, not the grid.
        if (exp.shelf) {
          await expect(
            page.getByRole('button', {name: /Previous widgets/i}).first(),
          ).toBeVisible();
        }

        // The demo CTA deeplinks to the partners page for this app — by the
        // app id the partners directory knows, which is not always the page
        // slug any more. See PARTNER_APP_ID.
        if (exp.demo) {
          const appId = PARTNER_APP_ID[slug] ?? slug;
          await expect(
            page.locator(`a[href*="/partners/?app=${appId}"]`).first(),
          ).toBeAttached();
        }

        expectNoConsoleErrors(errors);
      });
    }
  });
}

test.describe('widget carousel behaviour', () => {
  test('pause and nudge controls actually operate the track', async ({page}) => {
    await page.goto('/apps/pipelinq/');
    const track = page.locator('[class*="track"]').first();
    await expect(track).toBeVisible();

    const pause = page.getByRole('button', {name: /Pause/i}).first();
    await pause.click();
    const before = await track.evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(800);
    const after = await track.evaluate(el => getComputedStyle(el).transform);
    expect(after).toBe(before); // paused = zero drift

    const next = page.getByRole('button', {name: /Next widgets/i}).first();
    await next.click();
    await page.waitForTimeout(600);
    const nudged = await track.evaluate(el => getComputedStyle(el).transform);
    expect(nudged).not.toBe(before); // nudge moved the track while paused
  });
});

test.describe('partners deeplink', () => {
  test('?app= names the app: filtered when partners match, welcoming when none do', async ({page}) => {
    await page.goto('/partners/?app=pipelinq');
    // Either note form must acknowledge the app the visitor came from.
    await expect(
      page.getByText(/(Showing partners for|help you get started with)/i),
    ).toBeVisible();
    await expect(page.getByText('PipelinQ').first()).toBeVisible();
  });

  test('?app= with matching partners filters and offers the escape hatch', async ({page}) => {
    // OpenRegister is carried by several partners in the catalog.
    await page.goto('/partners/?app=openregister');
    await expect(page.getByText(/Showing partners for/i)).toBeVisible();
    await expect(page.getByRole('link', {name: /Show all partners/i})).toBeVisible();
  });

  test('an unknown slug falls back to the full directory', async ({page}) => {
    await page.goto('/partners/?app=no-such-app');
    await expect(page.getByText(/Showing partners for/i)).toHaveCount(0);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
