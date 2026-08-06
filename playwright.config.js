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

/* Point the same suite at a deployed site instead of a local build:
 *
 *   E2E_BASE_URL=https://www.conduction.nl npm run test:e2e
 *
 * Useful as a post-deploy smoke test, and the only way to check what
 * visitors actually get rather than what the build produced. No local
 * server is started in that mode. Expect timeouts are looser because the
 * assertions now include a network. */
const REMOTE = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  /* The cookie CLI tests type into a terminal and play a game that ticks on
     a timer, so they are slower than a normal page assertion. */
  timeout: 90_000,
  expect: {timeout: 10_000},
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* Against a deployed site, run serially. Pointed at www.conduction.nl
     with the default worker count, 26 of 63 tests failed and every one
     passed in isolation; at two workers, immediately after a deploy when
     the edge cache is cold, four still failed. Cloudflare throttles a burst
     of parallel requests from one address and a throttled response is
     indistinguishable from a broken page, so the suite was reporting on the
     CDN rather than on the site. One worker takes about three minutes and
     tells the truth. */
  workers: REMOTE ? 1 : (process.env.CI ? 2 : undefined),
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : [['list']],

  use: {
    baseURL: REMOTE || `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
  ],

  ...(REMOTE ? {} : {
    webServer: {
      command: `npx docusaurus serve --port ${PORT} --no-open`,
      url: `http://localhost:${PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
});
