/**
 * Product names, as rendered.
 *
 * The 2026-08-21 renaming board moved fourteen apps onto the -iq/-inq
 * scheme. The rename is display-name-only: every slug, route and asset
 * path keeps its old value, so a regression here does not 404 — the page
 * loads perfectly and simply shows the wrong brand. Nothing else in the
 * suite would notice.
 *
 * Two failure modes this pins, both silent:
 * - A page reverts to the old name (a revert, a bad merge, or a stale
 *   @conduction/docusaurus-preset whose apps-registry still carries the
 *   old `name:` — that registry is a second source of names, so the site
 *   can regress without this repo changing at all).
 * - A rename leaks into a slug. The routes below must keep resolving on
 *   their OLD ids; asserting the response is what catches an over-eager
 *   find-and-replace that renamed the URL too.
 *
 * Each app is checked for the presence of its NEW name rather than the
 * absence of the old one: an empty page passes an absence check.
 */

import {test, expect} from '@playwright/test';

/* slug (unchanged, load-bearing) → display name (renamed 2026-08-21) */
const RENAMED = {
  openconnector: 'Integriq',
  docudesk: 'Filinq',
  procest: 'Dossiq',
  doriath: 'Keepiq',
  hrmq: 'Humaniq',
  scholiq: 'Learniq',
  decidesk: 'Decidiq',
  softwarecatalog: 'Stackiq',
  nldesign: 'Thematiq',
  openbuild: 'Buildiq',
  larpingapp: 'Larpinq',
  'app-versions': 'Versioniq',
  // Planninq, not Planiq: "PlanIQ" is Anaplan's trademark in the same
  // planning category, so this one took the -inq form instead.
  planix: 'Planninq',
};

/* Names that were deliberately NOT renamed; a sweep that catches them
 * has overreached. Checked on their own product page rather than the
 * index, because the index card set is curated and does not list all. */
const UNCHANGED = {
  openregister: 'OpenRegister',
  opencatalogi: 'OpenCatalogi',
  pipelinq: 'Pipelinq',
  shillinq: 'Shillinq',
  hermiq: 'Hermiq',
  portaliq: 'Portaliq',
};

test.describe('renamed products', () => {
  for (const [slug, name] of Object.entries(RENAMED)) {
    test(`/apps/${slug} keeps its route and shows "${name}"`, async ({page}) => {
      const response = await page.goto(`/apps/${slug}`);
      // The rename must not have moved the URL.
      expect(response.status(), `/apps/${slug} must still resolve`).toBeLessThan(400);
      await expect(page.locator('h1')).toContainText(name);
    });
  }

  test('the apps index lists every new name', async ({page}) => {
    await page.goto('/apps');
    const body = await page.locator('body').innerText();
    for (const name of Object.values(RENAMED)) {
      expect(body, `/apps should name ${name}`).toContain(name);
    }
  });

  test('connext lists the renamed apps it builds on', async ({page}) => {
    await page.goto('/connext');
    // The stack tiles are <pd-item name="…"> custom elements, so the
    // names live in an attribute and never appear in innerText.
    const names = await page.locator('pd-item[name]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('name')),
    );
    expect(names.length, 'connext should render stack tiles').toBeGreaterThan(0);
    for (const name of ['Integriq', 'Filinq', 'Keepiq', 'Versioniq', 'Thematiq']) {
      // Substring, not equality: some tiles qualify the product name
      // with its role ("Thematiq Theme").
      expect(
        names.some((n) => n.includes(name)),
        `/connext should name ${name}, got: ${names.join(', ')}`,
      ).toBe(true);
    }
  });

  for (const [slug, name] of Object.entries(UNCHANGED)) {
    test(`${name} was not caught by the rename sweep`, async ({page}) => {
      await page.goto(`/apps/${slug}`);
      await expect(page.locator('h1')).toContainText(name);
    });
  }

  test('NL Design System keeps its name where the standard is meant', async ({page}) => {
    // nldesign the app became Thematiq; "NL Design System" the Dutch
    // government standard must survive the sweep untouched.
    await page.goto('/apps/nldesign');
    await expect(page.locator('h1')).toContainText('Thematiq');
    await expect(page.locator('body')).toContainText('NL Design System');
  });
});
