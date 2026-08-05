/**
 * Playwright config for the conduction.nl site.
 *
 * These tests run against a **built** site, not the dev server. Docusaurus
 * dev and production differ in the ways that have actually bitten this
 * repo: hydration mismatches only surface when a server-rendered page is
 * hydrated, and CSS-module class names are hashed differently. A suite that
 * passed against `docusaurus start` would miss both.
 *
 *   npm run build && npm run test:e2e
 *
 * `reuseExistingServer` means a `docusaurus serve` you already have running
 * on this port is used as-is, so an edit-run loop does not pay the startup
 * cost each time.
 */

import {defineConfig, devices} from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  /* The cookie CLI tests type into a terminal and play a game that ticks on
     a timer, so they are slower than a normal page assertion. */
  timeout: 90_000,
  expect: {timeout: 10_000},
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : [['list']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
  ],

  webServer: {
    command: `npx docusaurus serve --port ${PORT} --no-open`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
