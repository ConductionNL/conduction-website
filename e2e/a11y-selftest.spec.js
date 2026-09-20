/**
 * The control for the accessibility checks.
 *
 * Every check in `a11y-checks.js` is run here against a page built to break
 * it, and the test fails if any check stays silent. This exists because a
 * check that has never been observed failing tells you nothing when it
 * returns zero, and during this work two instruments did exactly that: one
 * reported "0 findings, 4 unreachable" because `page.evaluate(fn, a, b)`
 * silently takes only one argument, and an earlier contrast sweep reported
 * a clean site because it threw away the alpha channel and skipped every
 * gradient.
 *
 * Runs in the `chromium` project. It never loads the site, so it is fast and
 * cannot be broken by a content change.
 */

import {test, expect} from '@playwright/test';
import {RUN_CHECKS} from './a11y-checks.js';

const FIXTURE = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, user-scalable=no, maximum-scale=1.0">
<style>
  html,body{background:#fff;color:#000;font-family:sans-serif;margin:0}
  .invisible{color:#fff;background:#fff}
  /* 3.45:1 on white: clears the 3:1 severe floor, misses the 4.5:1 AA bar,
     so it lands in contrast-aa and nowhere else. */
  .aafail{color:#8a8a8a;background:#fff}
  /* 1.92:1: below 3, above the 1.5 invisible line. */
  .severe{color:#bbb;background:#fff}
  .onimage{background-image:url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");padding:10px}
  .ongradient{background-image:linear-gradient(90deg, rgb(255,255,255) 0%, rgb(250,250,250) 100%)}
  .ongradient p{color:rgb(252,252,252)}
  .tiny{font-size:9px}
  .faraway{position:absolute;left:2000px;top:10px;width:200px}
  .clipbox{overflow:hidden;width:50px;white-space:nowrap}
  .overlapA{position:absolute;top:400px;left:20px;width:200px;height:40px;margin:0}
  .overlapB{position:absolute;top:405px;left:25px;width:200px;height:40px;margin:0}
  input.faintborder{border:1px solid #eee;background:#fff}
  /* A border carrying alpha. Taken as opaque white it would look fine
     against the navy panel; painted at 12% over the panel it is not. */
  input.veilborder{border:1px solid rgba(255,255,255,0.12);background:transparent}
  button.small{width:10px;height:10px;padding:0;font-size:6px}
  button.crowdedA{width:20px;height:20px;position:absolute;top:500px;left:0}
  button.crowdedB{width:20px;height:20px;position:absolute;top:500px;left:24px}
  /* Pure white on this panel is ~14:1 and passes. At 0.18 alpha it is the
     blend, and a reader sees roughly 1.9:1. */
  .darkpanel{background:rgb(16,34,70);padding:8px}
  .fadedink{color:rgba(255,255,255,0.18)}
  /* An 85% white veil makes the ground nearly white; resolving to the panel
     underneath instead of the composite makes white ink here look fine. */
  .veil{background:rgba(255,255,255,0.85);padding:8px}
  .whiteink{color:#fff}
</style></head><body>
  <p class="invisible">This paragraph is the same colour as its background.</p>
  <p class="severe">This paragraph is a severe miss without being invisible.</p>
  <p class="aafail">This paragraph misses the AA bar but clears three to one.</p>
  <div class="onimage"><p>This paragraph sits on a background image.</p></div>
  <div class="ongradient"><p>This paragraph sits on a near white gradient.</p></div>
  <p class="tiny">This paragraph is set far too small to read on a phone.</p>
  <p class="faraway">This paragraph is parked outside the viewport entirely.</p>
  <a class="faraway" href="#" style="top:60px">A link parked outside the viewport</a>
  <button class="small">x</button>
  <button class="crowdedA">a</button><button class="crowdedB">b</button>
  <p class="overlapA">First overlapping paragraph of text here</p>
  <p class="overlapB">Second overlapping paragraph of text here</p>
  <div class="clipbox">This sentence is much wider than the box that holds it</div>
  <input class="faintborder" name="email" placeholder="Your email address">
  <div class="darkpanel"><input class="veilborder" name="translucent" placeholder="On a tinted panel"></div>
  <!-- Closed accordion. Its content keeps a full layout box and reports
       display:block / visibility:visible / opacity:1, so a checker that
       infers visibility from those three counts it as on screen. Nothing
       inside here may be reported. -->
  <details>
    <summary>A collapsed question nobody has opened</summary>
    <p class="invisible">collapsed-invisible text that must never be reported</p>
    <p class="tiny">collapsed-tiny text that must never be reported</p>
    <a class="faraway" href="#" style="top:120px">collapsed-offscreen link that must never be reported</a>
  </details>
  <div class="darkpanel"><p class="fadedink">alpha-text painted at low opacity over a dark panel</p></div>
  <div class="darkpanel"><div class="veil"><p class="whiteink">veil-text in white on a panel that is nearly white</p></div></div>
</body></html>`;

const MUST_FIRE = [
  'zoom-disabled',
  'zoom-capped',
  'contrast-invisible',
  'contrast-severe',
  'contrast-aa',
  'contrast-unmeasurable',
  'tiny-text',
  'offscreen-content',
  'offscreen-control',
  'target-size',
  'target-spacing',
  'text-overlap',
  'clipped-text',
  'nontext-contrast',
];

test('every check can actually fail', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.setContent(FIXTURE, {waitUntil: 'load'});
  const found = await page.evaluate(RUN_CHECKS, {theme: null});

  const counts = {};
  for (const f of found) counts[f.check] = (counts[f.check] || 0) + 1;

  const silent = MUST_FIRE.filter((c) => !counts[c]);
  expect(
    silent,
    `these checks stayed silent on a page built to break them, so a zero from ` +
      `them on the real site would mean nothing:\n  ${silent.join('\n  ')}\n\n` +
      `what did fire: ${JSON.stringify(counts)}`,
  ).toEqual([]);
});

/* Three colour paths that each pass a checker doing the naive thing. Named
   separately because they are silent failures of the CONTRAST check rather
   than of a check of their own, so the list above cannot see them. */
/* The negative control. Everything above asks "can this check fail?"; this
   asks "can it stay quiet when it should?". Without it the suite rewards a
   checker that simply reports everything, and the closed-accordion case is
   exactly how that happens: the browser gives collapsed content a full
   layout box, so it looks like ordinary on-screen content to anyone who
   does not ask `checkVisibility()`. */
test('content inside a closed accordion is never reported', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.setContent(FIXTURE, {waitUntil: 'load'});
  const found = await page.evaluate(RUN_CHECKS, {theme: null});

  const leaked = found.filter((f) => f.text.includes('collapsed-'));
  expect(
    leaked.map((f) => `${f.check}: ${f.text}`),
    'a collapsed <details> keeps a layout box and reports display:block, ' +
      'visibility:visible and opacity:1; only checkVisibility() knows better',
  ).toEqual([]);
});

test('alpha and gradients are measured, not assumed', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.setContent(FIXTURE, {waitUntil: 'load'});
  const found = await page.evaluate(RUN_CHECKS, {theme: null});

  const hit = (needle) => found.find((f) => f.text.includes(needle) && f.check.startsWith('contrast-'));

  expect(
    hit('alpha-text'),
    'a foreground with alpha must be composited over its background; ' +
      'uncomposited this is white on navy and scores about 14:1',
  ).toBeTruthy();

  expect(
    hit('veil-text'),
    'a translucent panel fill is a real layer; resolving past it to the ' +
      'surface underneath makes white ink on a near-white veil look like a pass',
  ).toBeTruthy();

  expect(
    found.find((f) => f.check === 'nontext-contrast' && f.text === 'translucent'),
    'a field border with alpha must be composited too; taken as opaque white ' +
      'it looks fine against a navy panel',
  ).toBeTruthy();

  const gradient = found.find((f) => f.bgKind === 'gradient');
  expect(
    gradient,
    'text on a gradient must be judged against its worst colour stop, ' +
      'not skipped as unmeasurable',
  ).toBeTruthy();
});
