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

/* 4173 by default, overridable because it does collide. `reuseExistingServer`
 * takes whatever is already on the port, and another project's `docusaurus
 * serve` sitting there is indistinguishable from our own: the suite then runs
 * green or red against a different site entirely. Seen 2026-09-19, where it
 * produced 20 confident failures against a site that was not this one.
 * Set E2E_PORT to move out of the way. */
const PORT = Number(process.env.E2E_PORT) || 4173;

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
    /* The desktop suite skips the mobile spec: its assertions are about
       a 390px viewport and would be meaningless at 1280px. */
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
      testIgnore: /mobile-layout\.spec\.js/,
    },
    /* Mobile layout regressions. iPhone 13 is 390x844, the viewport the
       September 2026 audit measured, so the numbers in that spec and
       the ones in the report refer to the same thing.

       `browserName` is overridden because the iPhone descriptor brings
       `defaultBrowserType: 'webkit'` with it, and nothing else in this
       repo installs WebKit: the suite would fail on a missing binary
       rather than on the page. The assertions here are about layout and
       reachability, which are engine-agnostic, so Chromium at the same
       viewport, device scale and touch settings answers the same
       question and runs wherever the chromium project already runs. */
    {
      name: 'mobile',
      use: {...devices['iPhone 13'], browserName: 'chromium'},
      testMatch: /mobile-layout\.spec\.js/,
    },
    /* The same assertions on the engine most phones actually use.
       The comment above is right that layout and reachability are largely
       engine-agnostic, and that argument was used to justify never running
       WebKit at all. "Largely" is not "entirely": Safari is the dominant
       mobile browser, and the September 2026 review covered zero percent of
       it. WebKit is installed now, so the excuse is gone.
       CI installs it alongside chromium in .github/workflows/deploy.yml. */
    {
      name: 'mobile-safari',
      use: {...devices['iPhone 13']},
      testMatch: /mobile-layout\.spec\.js|a11y\.spec\.js/,
    },
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
