/**
 * Shared helpers for the e2e suite.
 */

import {expect} from '@playwright/test';

export const BANNER = '[role="dialog"][aria-label="Cookie consent"]';
export const STORAGE_KEY = 'conduction:cookie-cli';

/**
 * Collect console errors for the lifetime of a test.
 *
 * This exists because of a specific failure mode: a Docusaurus build can be
 * completely green, the page can look correct, and React can still be
 * failing to hydrate it. That shows up only as console errors. Two separate
 * MDX changes shipped that way before anyone noticed, so every page test
 * asserts on this.
 *
 * Returns a live array; read it at the end of the test.
 */
export function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

/**
 * Assert no console errors, ignoring ones the site does not control.
 *
 * Immediately after a deploy, Cloudflare edge nodes briefly disagree about
 * which build they serve, so a chunk can 404 on one request. That is a
 * property of the CDN rather than of the page, and failing a test on it
 * would make the suite flaky against production.
 */
export function expectNoConsoleErrors(errors) {
  const real = errors.filter((e) => !/Failed to load resource.*40[34]/i.test(e));
  expect(real, `console errors:\n${real.join('\n')}`).toEqual([]);
}

/** Clear any stored consent so a test starts from a first-visit state. */
export async function clearConsent(page) {
  await page.evaluate((key) => {
    try { window.localStorage.removeItem(key); } catch (e) { /* private mode */ }
  }, STORAGE_KEY);
}

/** Read the stored consent object, or null. */
export function readConsent(page) {
  return page.evaluate((key) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }, STORAGE_KEY);
}

/**
 * Open the banner the way a visitor does: the Cookies link in the footer.
 * That link is intercepted and must NOT navigate.
 */
export async function openBannerFromFooter(page) {
  await page.locator('footer a[href$="#cookies"]').first().click();
  await page.locator(BANNER).waitFor({state: 'visible'});
}

/**
 * Type into the terminal.
 *
 * The shell listens on window rather than through a focused input, so
 * keyboard.type() is what a visitor's keystrokes actually look like to it.
 */
export async function typeCommand(page, command) {
  await page.keyboard.type(command, {delay: 15});
  await page.keyboard.press('Enter');
}

/** The banner's terminal text, whitespace-normalised. */
export async function terminalText(page) {
  return (await page.locator(BANNER).innerText()).replace(/\s+/g, ' ');
}
