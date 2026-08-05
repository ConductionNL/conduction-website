/**
 * The AI transparency page, in both locales.
 *
 * The console-error assertions are the important ones. This page shipped
 * twice with a green build and a broken hydration, because MDX parses the
 * children of a block-level JSX tag as markdown: a <blockquote> wrapping a
 * <p> nests a paragraph inside a paragraph, the HTML parser splits it, and
 * the client tree stops matching the server's. Nothing about the rendered
 * page looks wrong. Only the console says so.
 */

import {test, expect} from '@playwright/test';
import {collectConsoleErrors, expectNoConsoleErrors} from './helpers.js';

const LOCALES = [
  {
    name: 'en',
    path: '/ai/',
    title: /How we use AI/,
    heading: /A human is\s+always responsible/,
    sections: ['The rule', 'Where we use it', 'Blogs and articles', 'Where this sits in the AI Act'],
    article4: 'Article 4',
    academy: '/academy/?series=hydra-tutorial',
  },
  {
    name: 'nl',
    path: '/nl/ai/',
    title: /Hoe wij AI gebruiken/,
    heading: /Een mens is\s+altijd verantwoordelijk/,
    sections: ['De regel', 'Waar we het gebruiken', 'Blogs en artikelen', 'Hoe dit zich verhoudt tot de AI-verordening'],
    article4: 'Artikel 4',
    academy: '/nl/academy/?series=hydra-tutorial',
  },
];

for (const locale of LOCALES) {
  test.describe(`ai page (${locale.name})`, () => {
    test('renders without console errors', async ({page}) => {
      const errors = collectConsoleErrors(page);
      await page.goto(locale.path);
      await expect(page).toHaveTitle(locale.title);
      await page.waitForTimeout(1200); // let hydration settle and complain
      expectNoConsoleErrors(errors);
    });

    test('has the hero, the sections and the IBM quote', async ({page}) => {
      await page.goto(locale.path);
      /* innerText, not toHaveText. The hero splits across a <br>, which
         textContent ignores, so toHaveText sees "A human isalways
         responsible." innerText renders the break the way a browser, a
         screen reader and a search engine all do. */
      expect(await page.locator('h1').innerText()).toMatch(locale.heading);
      for (const section of locale.sections) {
        await expect(page.getByRole('heading', {name: section, level: 2})).toBeVisible();
      }
      await expect(page.locator('blockquote')).toContainText('A computer can never be held accountable');
    });

    test('states the AI Act position, including Article 4', async ({page}) => {
      await page.goto(locale.path);
      const main = page.locator('main');
      await expect(main).toContainText(locale.article4);
      // Article 50 is addressed and explicitly does not apply to us.
      await expect(main).toContainText(/50/);
    });

    test('links to the ordered Hydra series, not the tag page', async ({page}) => {
      await page.goto(locale.path);
      await expect(page.locator(`main a[href="${locale.academy}"]`).first()).toBeVisible();
      await expect(page.locator('main a[href*="tags/hydra"]')).toHaveCount(0);
    });

    test('does not scroll horizontally', async ({page}) => {
      await page.goto(locale.path);
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflows).toBe(false);
    });

    test('is reachable from the footer', async ({page}) => {
      await page.goto(locale.name === 'nl' ? '/nl/' : '/');
      const link = page.locator(`footer a[href$="${locale.name === 'nl' ? '/nl/ai/' : '/ai/'}"]`).first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveTitle(locale.title);
    });
  });
}

/**
 * The series link is a query parameter on a static site, which only works
 * because the academy page reads and validates it. If that ever regresses,
 * the link silently degrades to "all posts" and nobody notices.
 */
test('the hydra series link actually filters the academy', async ({page}) => {
  await page.goto('/academy/?series=hydra-tutorial');
  const headings = page.getByRole('heading', {name: /Hydra tutorial series/});
  await expect(headings.first()).toBeVisible();
  expect(await headings.count(), 'the series has seven parts').toBeGreaterThanOrEqual(7);
});
