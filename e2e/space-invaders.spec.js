/**
 * The game hiding in the cookie banner.
 *
 * The engine has its own unit tests upstream in the design system. This
 * suite covers what those cannot: that the thing is reachable and playable
 * through a real browser, from the footer link to a moving ship.
 *
 * The headline assertion is that you cannot lose. It is an easter egg
 * inside a consent dialog, so ending someone's game with GAME OVER while
 * they were setting a preference is a worse outcome than letting them play.
 */

import {test, expect} from '@playwright/test';
import {
  BANNER, clearConsent, openBannerFromFooter, typeCommand, terminalText,
  collectConsoleErrors, expectNoConsoleErrors,
} from './helpers.js';

const SCREEN = `${BANNER} pre[class*="gameScreen"]`;
const HUD = `${BANNER} div[class*="gameHud"]`;
const FOOTER = `${BANNER} div[class*="gameFooter"]`;

async function launchGame(page) {
  await openBannerFromFooter(page);
  await typeCommand(page, './game.exe');
  await page.locator(SCREEN).waitFor({state: 'visible'});
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await clearConsent(page);
  await page.reload();
});

test('the shell responds, and ls reveals an executable', async ({page}) => {
  await openBannerFromFooter(page);
  await typeCommand(page, 'ls');
  const text = await terminalText(page);
  expect(text).toContain('game.exe');
  expect(text, 'game.exe should be listed as executable').toMatch(/-rwxr-xr-x\s+\d+\s+game\.exe/);
});

test('typing a command does not trigger the consent shortcuts', async ({page}) => {
  await openBannerFromFooter(page);
  // `ls` contains the "s" that saves; typing it must not answer the dialog.
  await typeCommand(page, 'ls');
  await expect(page.locator(BANNER), 'the banner must survive being typed into').toBeVisible();
});

test('an unknown command is rejected rather than ignored', async ({page}) => {
  await openBannerFromFooter(page);
  await typeCommand(page, 'xyzzy');
  expect(await terminalText(page)).toContain('command not found');
});

/**
 * Commands starting with a, s or r must reach the shell.
 *
 * They did not: [A] [S] [R] were live consent accelerators whenever the
 * prompt was empty, so typing `sudo` answered the dialog and closed the
 * banner. Two of the shell's own commands were unreachable that way, and
 * `sudo` is the first thing anyone tries in a fake terminal.
 */
for (const command of ['sudo rm -rf /', 'rm cookies.toml', 'ls']) {
  test(`\`${command}\` reaches the shell instead of answering the dialog`, async ({page}) => {
    await openBannerFromFooter(page);
    await typeCommand(page, command);
    await expect(page.locator(BANNER), 'the banner must not close').toBeVisible();
    expect(await terminalText(page)).toContain(command);
  });
}

test('./game.exe boots Space Invaders', async ({page}) => {
  await launchGame(page);
  await expect(page.locator(BANNER)).toContainText('CONDUCTION SPACE INVADERS');
  await expect(page.locator(`${SCREEN} .g-ufo`).first()).toBeVisible();
  await expect(page.locator(HUD)).toContainText('SCORE');
});

test('the ship moves and the swarm animates', async ({page}) => {
  await launchGame(page);
  const playerX = async () => page.evaluate((sel) => {
    const rows = document.querySelector(sel).innerText.split('\n').filter((l) => l.trim());
    return rows[rows.length - 1].indexOf('<A>');
  }, SCREEN);

  const start = await playerX();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(200);
  expect(await playerX(), 'left arrow should move the ship left').toBeLessThan(start);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  expect(await playerX()).toBeGreaterThan(start);
});

test('firing scores', async ({page}) => {
  test.slow();
  await launchGame(page);
  await expect(page.locator(HUD)).toContainText('SCORE 0000');

  /* Sweep while firing rather than standing still. The ship starts at
     column 23 and fires from 24, while the UFO columns sit at 6, 13, 20,
     27 and so on, each three wide. So the starting position is a gap: a
     test that only presses Space can empty a magazine into open space for
     as long as the swarm happens to drift away from it. Moving guarantees
     alignment. */
  /* Pace the shots. Only three lasers may be in flight at once and each
     takes about a second to cross the screen, so hammering Space every
     120ms turns most presses into no-ops and the run can end with nothing
     hit. A quarter-second cadence keeps the magazine usefully full. */
  /* Normalise before comparing. The HUD lays its labels out across lines,
     so raw innerText reads "SCORE\n0000" and a check for the literal
     "SCORE 0000" is false on the very first pass. An early-exit written
     that way ends the loop after one shot and the run scores nothing,
     which looks exactly like a broken game. expect()'s toContainText
     normalises whitespace for you; innerText does not. */
  const scoreIsZero = async () =>
    (await page.locator(HUD).innerText()).replace(/\s+/g, ' ').includes('SCORE 0000');

  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Space');
    await page.keyboard.press(i % 12 < 6 ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForTimeout(250);
    if (!(await scoreIsZero())) break;
  }
  await expect(page.locator(HUD), 'shooting a UFO should score').not.toContainText('SCORE 0000');
});

test('pause and resume', async ({page}) => {
  await launchGame(page);
  await page.keyboard.press('p');
  await expect(page.locator(FOOTER)).toContainText('paused');
  await page.keyboard.press('p');
  await expect(page.locator(FOOTER)).not.toContainText('paused');
});

test('escape returns to the shell and consent still works afterwards', async ({page}) => {
  await launchGame(page);
  await page.keyboard.press('Escape');
  await expect(page.locator(SCREEN)).toHaveCount(0);
  await expect(page.locator(BANNER)).toContainText('thanks for playing');

  await page.locator(BANNER).getByRole('button', {name: /Reject non-essential/}).click();
  await expect(page.locator(BANNER)).toHaveCount(0);
});

/**
 * The point of the whole change: no death.
 *
 * Standing still under the swarm is exactly how you used to lose, by bombs
 * draining three lives. The other death path, the swarm reaching the floor,
 * takes minutes of real time to reach and is covered by the engine's unit
 * tests upstream instead.
 */
test('you cannot die', async ({page}) => {
  test.slow();
  await launchGame(page);

  await expect(page.locator(HUD), 'the HUD should promise an infinite shield').toContainText('SHIELD');
  await expect(page.locator(HUD)).not.toContainText('LIVES');

  /* Park the ship in the open and absorb whatever lands for 40 seconds.
     The watching happens inside the page rather than as forty round-trips
     with an assertion each: driven from the test side, a slow machine can
     stretch a single poll past the expect timeout and fail a game that is
     running perfectly. One evaluate samples every 250ms and reports what
     it saw. */
  const verdict = await page.evaluate(async ({screenSel, footSel, hudSel, ms}) => {
    const out = {sawGameOver: false, screenDisappeared: false, samples: 0, lastHud: '', maxHits: 0};
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await new Promise((r) => setTimeout(r, 250));
      out.samples++;
      const screen = document.querySelector(screenSel);
      if (!screen) { out.screenDisappeared = true; break; }
      const foot = document.querySelector(footSel);
      if (foot && /GAME OVER/i.test(foot.innerText)) { out.sawGameOver = true; break; }
      const hud = document.querySelector(hudSel);
      if (hud) {
        out.lastHud = hud.innerText.replace(/\s+/g, ' ').trim();
        const hits = out.lastHud.match(/HITS (\d+)/);
        if (hits) out.maxHits = Math.max(out.maxHits, Number(hits[1]));
      }
    }
    return out;
  }, {screenSel: SCREEN, footSel: FOOTER, hudSel: HUD, ms: 40_000});

  expect(verdict.sawGameOver, `the game must never end — HUD: ${verdict.lastHud}`).toBe(false);
  expect(verdict.screenDisappeared, 'the game must still be on screen').toBe(false);
  expect(verdict.samples, 'the watcher should have sampled the game').toBeGreaterThan(100);
  await expect(page.locator(SCREEN)).toBeVisible();
});

test('playing produces no console errors', async ({page}) => {
  const errors = collectConsoleErrors(page);
  await launchGame(page);
  await page.keyboard.press('Space');
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape');
  expectNoConsoleErrors(errors);
});
