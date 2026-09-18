/**
 * The three mini-games on the product pages.
 *
 * Each game's rules have their own unit tests upstream in the design
 * system, and those are the tests that say the scoring is right. This
 * suite covers the half they cannot see: that the game is actually
 * mounted on the page it belongs to, that it starts, and that a
 * finished run reaches the shared game-over dialog with a score.
 *
 * That is the failure worth catching before Contributor Week. A game
 * that is never mounted, or one whose end event nobody hears, looks
 * exactly like a game nobody found.
 */

import {test, expect} from '@playwright/test';

const MODAL = 'div[class*="modal"] div[class*="panel"]';

/** Clear the cross-game score table, so a run starts from nothing. */
async function clearScores(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('conduction:minigames');
      window.localStorage.removeItem('conduction:mastodon-instance');
    } catch (e) {/* private mode: the game copes, so must the test */}
  });
}

test.describe('stamp rush, on the Decidiq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/decidiq/');
  });

  test('is on the page, and deals decisions once started', async ({page}) => {
    const game = page.locator('section[class*="rush"]');
    await expect(game).toBeVisible();
    await game.getByRole('button', {name: /take the pen/i}).click();

    /* A desk holding a decision, whichever kind it is. */
    const occupied = game.getByRole('button', {name: /Desk \d: (Ready to adopt|No quorum|Interest declared)/});
    await expect(occupied.first()).toBeVisible({timeout: 5000});
  });

  test('three bad stamps end the run and open the dialog with a score', async ({page}) => {
    const game = page.locator('section[class*="rush"]');
    await game.getByRole('button', {name: /take the pen/i}).click();

    /* Stamp only what should have been held back. Three of those end
       it, whatever else is on the board. */
    const bad = game.getByRole('button', {name: /Desk \d: (No quorum|Interest declared)/});
    await expect(async () => {
      const count = await bad.count();
      for (let i = 0; i < count; i++) await bad.nth(i).click({timeout: 1000}).catch(() => {});
      await expect(page.locator(MODAL)).toBeVisible({timeout: 500});
    }).toPass({timeout: 30000});

    await expect(page.locator(MODAL)).toContainText(/decisions adopted/);
    await expect(page.locator(MODAL)).toContainText(/mini-games found/i);
  });
});

test.describe('deadline defender, on the Dossiq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/dossiq/');
  });

  test('deals a case with a deadline, and routes it to a step', async ({page}) => {
    const game = page.locator('section[class*="dd_"]');
    await expect(game).toBeVisible();
    await game.getByRole('button', {name: /open the queue/i}).click();

    await expect(game.locator('p[class*="fileText"]')).toBeVisible({timeout: 5000});
    await expect(game.getByRole('progressbar')).toBeVisible();

    /* Read the case and answer it. Trying the three steps in turn
       cannot work: a misroute replaces the case, so every later click
       lands on a different one. */
    const CASE_TO_STEP = [
      [/Nothing registered yet/, 'Intake'],
      [/has not been logged/, 'Intake'],
      [/No case number yet/, 'Intake'],
      [/The file is complete/, 'Assessment'],
      [/site visit is done/, 'Assessment'],
      [/advice from the fire service/, 'Assessment'],
      [/assessment is finished/, 'Decision'],
      [/has been assessed/, 'Decision'],
      [/Enforcement has been prepared/, 'Decision'],
    ];

    const text = await game.locator('p[class*="fileText"]').innerText();
    const match = CASE_TO_STEP.find(([re]) => re.test(text));
    expect(match, `no step is written for the case "${text}"`).toBeTruthy();

    await game.getByRole('button', {name: match[1], exact: false}).click();
    await expect(game.locator('span[class*="hudPill"]').first()).toContainText('10');
  });

  test('a run that goes wrong reaches the dialog', async ({page}) => {
    const game = page.locator('section[class*="dd_"]');
    await game.getByRole('button', {name: /open the queue/i}).click();

    /* Send everything to intake. Most cases do not belong there, so the
       run ends within a handful of cases. */
    await expect(async () => {
      await game.getByRole('button', {name: 'Intake', exact: false}).click({timeout: 1000}).catch(() => {});
      await expect(page.locator(MODAL)).toBeVisible({timeout: 500});
    }).toPass({timeout: 30000});

    await expect(page.locator(MODAL)).toContainText(/cases on time/);
  });
});

test.describe('blueprint rush, on the Buildiq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/buildiq/');
  });

  test('deals a blueprint whose parts are all on the shelf', async ({page}) => {
    const game = page.locator('section[class*="br_"]');
    await expect(game).toBeVisible();
    await game.getByRole('button', {name: /open a blueprint/i}).click();

    const slots = game.locator('li[class*="slot"] span[class*="slotText"]');
    await expect(slots).toHaveCount(4);

    /* Four slots, six parts: the two extra belong to another app. */
    const parts = game.locator('button[class*="part"]');
    await expect(parts).toHaveCount(6);
  });

  test('completing a blueprint scores and buys time', async ({page}) => {
    const game = page.locator('section[class*="br_"]');
    await game.getByRole('button', {name: /open a blueprint/i}).click();

    const SLOT_TO_PART = {
      'Somewhere to keep the records': 'A register',
      'What one record looks like': 'A set of fields',
      'How people fill one in': 'A form',
      'How people find one back': 'A list with search',
      'What happens after someone saves': 'A flow',
      'Who is allowed to see it': 'A group and its rights',
      'What the manager sees on Monday': 'A dashboard widget',
      'Who hears about it': 'A notification',
    };

    const slots = await game.locator('li[class*="slot"] span[class*="slotText"]').allInnerTexts();
    expect(slots.length).toBe(4);

    for (const slot of slots) {
      const part = SLOT_TO_PART[slot.trim()];
      expect(part, `no part is written for the slot "${slot}"`).toBeTruthy();
      await game.getByRole('button', {name: part, exact: true}).click();
    }

    /* The score only moves when the last slot is filled. */
    await expect(game.locator('span[class*="hudPill"]').first()).toContainText('25');
    await expect(game.locator('p[class*="hint"]')).toContainText(/bought you seven seconds/i);
  });
});

test('the arcade page lists every game the site ships', async ({page}) => {
  await page.goto('/arcade/');
  /* The roster in docusaurus.config.js and this list have to agree, or
     the dialog counts a game the page never names. */
  for (const name of [
    'Twelve apps', 'Sink the boats', 'Hex-vaders', 'Logo memory', 'Kade cyclist',
    'Stamp rush', 'Deadline defender', 'Blueprint rush',
  ]) {
    await expect(page.getByText(name, {exact: false}).first()).toBeVisible();
  }
});
