/**
 * Controls for the two checks that reach past a page's load-time state.
 *
 * Both were added after the September review found that a clean sweep said
 * nothing about either. `REVEAL_ALL` opens what a visitor would have to click;
 * `FOCUS_CHECK` asks whether a keyboard user can see where they are. Neither
 * had ever been observed failing, which is the same as not having them.
 */

import {test, expect} from './base.js';
import {REVEAL_ALL} from './a11y-reveal.js';
import {FOCUS_CHECK} from './a11y-focus.js';
import {RUN_CHECKS} from './a11y-checks.js';

/* A page whose defects are all behind a disclosure. Measured as it loads it
   is spotless; measured after opening, it is not. */
const HIDDEN_FIXTURE = `<!doctype html><html><head><style>
  html,body{background:#fff;color:#111;font-family:sans-serif;margin:0}
  .invisible{color:#fff;background:#fff}
  [hidden]{display:none}
</style></head><body>
  <details>
    <summary>Closed by default</summary>
    <p class="invisible">disclosure-text that is the same colour as its background</p>
  </details>
  <button aria-expanded="false" aria-controls="panel" onclick="
    this.setAttribute('aria-expanded','true');
    document.getElementById('panel').hidden = false;">Show panel</button>
  <div id="panel" hidden>
    <p class="invisible">panel-text that is the same colour as its background</p>
  </div>
</body></html>`;

test('a page measured only as it loads misses what is behind a disclosure', async ({page}) => {
  await page.setContent(HIDDEN_FIXTURE, {waitUntil: 'load'});

  const beforeReveal = await page.evaluate(RUN_CHECKS, {theme: null});
  const hiddenBefore = beforeReveal.filter((f) => /disclosure-text|panel-text/.test(f.text));
  expect(
    hiddenBefore,
    'the fixture is built so that nothing is reported before opening; if this ' +
      'fails the fixture is wrong, not the checker',
  ).toEqual([]);

  const opened = await page.evaluate(REVEAL_ALL);
  expect(opened.details, 'the closed <details> should have been opened').toBeGreaterThan(0);
  expect(opened.expanded, 'the aria-expanded button should have been clicked').toBeGreaterThan(0);

  const afterReveal = await page.evaluate(RUN_CHECKS, {theme: null});
  const found = afterReveal.filter((f) => f.check === 'contrast-invisible').map((f) => f.text);
  expect(found.some((t) => t.includes('disclosure-text')), 'text inside the opened <details>').toBe(true);
  expect(found.some((t) => t.includes('panel-text')), 'text inside the revealed panel').toBe(true);
});

const FOCUS_FIXTURE = `<!doctype html><html><head><style>
  html,body{background:#fff;color:#111;margin:0;font-family:sans-serif}
  /* The classic failure: focus removed and nothing put back. */
  a.stripped:focus{outline:none}
  /* An indicator that exists but cannot be seen against the page. */
  a.faint:focus{outline:2px solid #f2f2f2}
  /* A correct one. */
  a.good:focus{outline:3px solid #0a172f}
  /* Two-tone: the outline alone is 1.00:1 against the orange button, and the
     halo behind it is 5.93:1. Judging the outline alone reports a failure the
     reader does not experience, which is what the site's own focus treatment
     relies on. */
  a.twotone{background:#f36c21;display:inline-block}
  a.twotone:focus{outline:2px solid #f36c21;box-shadow:0 0 0 4px rgb(10,23,47)}
</style></head><body>
  <a class="stripped" href="#">stripped-focus link</a>
  <a class="faint" href="#">faint-focus link</a>
  <a class="good" href="#">good-focus link</a>
  <a class="twotone" href="#">twotone-focus link</a>
</body></html>`;

test('focus that is removed, or too faint to see, is reported', async ({page}) => {
  await page.setContent(FOCUS_FIXTURE, {waitUntil: 'load'});
  const {findings, sampled} = await page.evaluate(FOCUS_CHECK, {limit: 20});
  expect(sampled, 'all four links should have been sampled').toBe(4);

  const byText = (needle) => findings.find((f) => f.text.includes(needle));
  expect(byText('stripped-focus'), 'outline:none with nothing put back').toBeTruthy();
  expect(byText('stripped-focus').check).toBe('focus-invisible');
  expect(byText('faint-focus'), 'an indicator under 3:1 against the page').toBeTruthy();
  expect(byText('faint-focus').check).toBe('focus-contrast');
  expect(byText('good-focus'), 'a correct indicator must stay quiet').toBeFalsy();
  expect(
    byText('twotone-focus'),
    'an indicator whose halo carries the contrast must stay quiet, or the ' +
      "site's own two-ring focus treatment reports as broken",
  ).toBeFalsy();
});
