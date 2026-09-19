/**
 * The cookie banner.
 *
 * Every assertion here corresponds to something that was once wrong:
 * the banner appearing unprompted, the footer link navigating instead of
 * opening it, reopening showing stale checkboxes, and the panel growing
 * past the top of the viewport until the buttons were unreachable.
 */

import {test, expect} from '@playwright/test';
import {
  BANNER, clearConsent, readConsent, openBannerFromFooter,
  collectConsoleErrors, expectNoConsoleErrors,
} from './helpers.js';

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await clearConsent(page);
  await page.reload();
});

test('never appears unprompted, even on a first visit', async ({page}) => {
  expect(await readConsent(page)).toBeNull();
  await page.waitForTimeout(1500);
  await expect(page.locator(BANNER)).toHaveCount(0);
});

test('the footer Cookies link opens it in place without navigating', async ({page}) => {
  const before = page.url();
  await openBannerFromFooter(page);
  expect(page.url(), 'clicking Cookies must not navigate').toBe(before);
  await expect(page.locator(BANNER)).toBeVisible();
});

test('defaults to essential only, with no marketing category', async ({page}) => {
  await openBannerFromFooter(page);
  const items = page.locator(`${BANNER} li`);
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toHaveAttribute('aria-pressed', 'true');   // essential
  await expect(items.nth(1)).toHaveAttribute('aria-pressed', 'false');  // analytics
  await expect(items.nth(2)).toHaveAttribute('aria-pressed', 'false');  // preferences
  await expect(page.locator(BANNER)).not.toContainText('marketing');
});

test('accept all stores all three and closes', async ({page}) => {
  await openBannerFromFooter(page);
  await page.locator(BANNER).getByRole('button', {name: /Accept all/}).click();
  await expect(page.locator(BANNER)).toHaveCount(0);
  expect(await readConsent(page)).toMatchObject({essential: true, analytics: true, preferences: true});
});

test('reject stores essential only', async ({page}) => {
  await openBannerFromFooter(page);
  await page.locator(BANNER).getByRole('button', {name: /Reject non-essential/}).click();
  await expect(page.locator(BANNER)).toHaveCount(0);
  expect(await readConsent(page)).toMatchObject({essential: true, analytics: false, preferences: false});
});

/**
 * The regression that prompted the on-demand rework.
 *
 * The preset's reset() clears localStorage without clearing its own
 * checkbox state, so a reused instance reopened showing whatever was ticked
 * last time. Accepting everything and then rejecting used to leave
 * `analytics` visibly ticked on the next open, which reads as consent the
 * visitor did not give.
 */
test('reopening shows the stored choice, not the previous one', async ({page}) => {
  await openBannerFromFooter(page);
  await page.locator(BANNER).getByRole('button', {name: /Accept all/}).click();

  await openBannerFromFooter(page);
  const items = page.locator(`${BANNER} li`);
  await expect(items.nth(1), 'should mirror the stored accept-all').toHaveAttribute('aria-pressed', 'true');

  await page.locator(BANNER).getByRole('button', {name: /Reject non-essential/}).click();

  await openBannerFromFooter(page);
  await expect(
    page.locator(`${BANNER} li`).nth(1),
    'analytics must not stay ticked after a reject',
  ).toHaveAttribute('aria-pressed', 'false');
});

test('the panel stays inside the viewport with a full scrollback', async ({page}) => {
  await openBannerFromFooter(page);
  await page.keyboard.type('ls', {delay: 10});
  await page.keyboard.press('Enter');
  await page.keyboard.type('cat README.md', {delay: 10});
  await page.keyboard.press('Enter');
  await page.keyboard.type('help', {delay: 10});
  await page.keyboard.press('Enter');

  const box = await page.locator(BANNER).boundingBox();
  const viewport = page.viewportSize();
  expect(box.y, 'the title bar must not be pushed off the top').toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
});

test('the privacy page settings panel reopens the banner on a hard load', async ({page}) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/privacy/#cookies');

  const button = page.getByRole('button', {name: /Change your cookie choices/});
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.locator(BANNER)).toBeVisible();

  expectNoConsoleErrors(errors);
});
