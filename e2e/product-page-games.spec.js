/**
 * The mini-games on the product pages, and the way in to each.
 *
 * Each game's rules have their own unit tests upstream in the design
 * system, and the unlock matchers have theirs. This suite covers the
 * half neither can see: that a game is mounted on the page it belongs
 * to, that it stays hidden until somebody finds it, that its own way
 * in works through a real browser, and that a finished run reaches the
 * shared game-over dialog with a score.
 *
 * Two failures are worth catching before Contributor Week, and they
 * look identical from the outside: a game nobody can reach, and a game
 * sitting in plain sight on a product page.
 */

import {test, expect} from '@playwright/test';

const MODAL = 'div[class*="modal"] div[class*="panel"]';

/** Clear the score table and the found-games list, so a visit is a first visit. */
async function clearScores(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('conduction:minigames');
      window.localStorage.removeItem('conduction:minigames-found');
      window.localStorage.removeItem('conduction:mastodon-instance');
    } catch (e) {/* private mode: the game copes, so must the test */}
  });
}

/* How each game is found. The same riddles the arcade page hints at,
   written out once so a test never has to know a game's own way in. */
const UNLOCK = {
  'stamp-rush': async (page) => {
    const glyph = page.locator('[data-hidden-target="app-glyph"]').first();
    for (let i = 0; i < 3; i++) await glyph.click({force: true});
  },
  'deadline-defender': async (page) => {
    for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
      await page.keyboard.press(key);
    }
  },
  'blueprint-rush': async (page) => { await page.keyboard.type('build'); },
  'paint-by-tokens': async (page) => { await page.keyboard.type('paint'); },
  'lock-pick': async (page) => {
    const glyph = page.locator('[data-hidden-target="app-glyph"]').first();
    await glyph.hover();
    await page.mouse.down();
    await page.waitForTimeout(1800);
    await page.mouse.up();
  },
  redaction: async (page) => {
    /* Select a paragraph and leave it selected, as if reaching for a
       marker. The watcher waits for the selection to settle. */
    await page.evaluate(() => {
      const p = [...document.querySelectorAll('p')].find((el) => el.textContent.trim().length > 60);
      const range = document.createRange();
      range.selectNodeContents(p);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    await page.waitForTimeout(1500);
  },
  'record-run': async (page) => {
    await page.getByRole('button', {name: /take a break/i}).click();
  },
  'pipe-fit': async (page) => {
    /* Integriq's game hides behind the same quiet opener: the one way
       in that shows itself, for a page with nothing else to poke at. */
    await page.getByRole('button', {name: /take a break/i}).click();
  },
  'dice-duel': async (page) => { await page.keyboard.type('nat20'); },
  'monster-run': async (page) => { await page.keyboard.type('alive'); },
  reconcile: async (page) => {
    /* Five knocks, not three: Shillinq's logo wants more patience than
       Decidiq's, so that one page's riddle cannot open another's. */
    const glyph = page.locator('[data-hidden-target="app-glyph"]').first();
    for (let i = 0; i < 5; i++) await glyph.click({force: true});
  },
};

/**
 * Open a game the way a player would, then wait for it to arrive.
 *
 * The unlock is retried rather than tried once. Every trigger listens
 * from the client, so a test that types the instant `goto` resolves
 * can beat hydration to it and find nothing: under parallel load that
 * turned four solid tests into flakes. A person who types and sees
 * nothing types again, and so does this.
 */
async function findGame(page, id, locator) {
  await expect(locator, 'the game was on the page before anyone found it').toHaveCount(0);
  await expect(async () => {
    await UNLOCK[id](page);
    await expect(locator).toBeVisible({timeout: 1500});
  }).toPass({timeout: 25000});
}

test.describe('stamp rush, on the Decidiq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/decidiq/');
  });

  test('stays hidden until the logo is knocked on, then deals decisions', async ({page}) => {
    const game = page.locator('section[class*="rush"]');
    await findGame(page, 'stamp-rush', game);

    /* In the hero, not somewhere down the page: the way in is the logo
       at the top, so the reward cannot be a screen you have to go
       looking for. `withIllustration` is the product hero's own class;
       the games carry a `head` of their own, so matching on that would
       find the game inside itself. */
    await expect(
      page.locator('section[class*="withIllustration"] section[class*="rush"]'),
      'the game opened somewhere other than the hero',
    ).toBeVisible();

    /* And in the mock's place, not beside it. */
    await expect(
      page.locator('[class*="illustration_"]'),
      'the app mock is still there, so the game is not where it should be',
    ).toBeHidden();

    await game.getByRole('button', {name: /take the pen/i}).click();

    /* A desk holding a decision, whichever kind it is. */
    const occupied = game.getByRole('button', {name: /Desk \d: (Ready to adopt|No quorum|Interest declared)/});
    await expect(occupied.first()).toBeVisible({timeout: 5000});
  });

  test('three bad stamps end the run and open the dialog with a score', async ({page}) => {
    const game = page.locator('section[class*="rush"]');
    await findGame(page, 'stamp-rush', game);
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

  test('stays hidden until the old code is typed, then deals a case', async ({page}) => {
    const game = page.locator('section[class*="dd_"]');
    await findGame(page, 'deadline-defender', game);
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
    await findGame(page, 'deadline-defender', game);
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

  test('stays hidden until the word is typed, then deals a blueprint', async ({page}) => {
    const game = page.locator('section[class*="br_"]');
    await findGame(page, 'blueprint-rush', game);
    await game.getByRole('button', {name: /open a blueprint/i}).click();

    const slots = game.locator('li[class*="slot"] span[class*="slotText"]');
    await expect(slots).toHaveCount(4);

    /* Four slots, six parts: the two extra belong to another app. */
    const parts = game.locator('button[class*="part"]');
    await expect(parts).toHaveCount(6);
  });

  test('completing a blueprint scores and buys time', async ({page}) => {
    const game = page.locator('section[class*="br_"]');
    await findGame(page, 'blueprint-rush', game);
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

test.describe('record run, on the Connext page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/connext/');
  });

  test('stays hidden behind a quiet break, then runs a record down three lanes', async ({page}) => {
    const game = page.locator('section[class*="rr_"]');
    await findGame(page, 'record-run', game);
    await game.getByRole('button', {name: /send a record/i}).click();

    const lanes = game.getByRole('button', {name: /^Lane \d\. Coming next:/});
    await expect(lanes).toHaveCount(3);

    /* The record is in exactly one lane, and steering moves it. */
    await expect(game.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await lanes.nth(2).click();
    await expect(lanes.nth(2)).toHaveAttribute('aria-pressed', 'true');
  });

  test('steering into what blocks a record ends the run and opens the dialog', async ({page}) => {
    const game = page.locator('section[class*="rr_"]');
    await findGame(page, 'record-run', game);
    await game.getByRole('button', {name: /send a record/i}).click();

    /* Always steer into whatever is about to stop the record. Three of
       those and the run is over, whatever the board deals. */
    await expect(async () => {
      const labels = await game.getByRole('button', {name: /^Lane \d\. Coming next:/}).all();
      for (const lane of labels) {
        const what = await lane.getAttribute('aria-label');
        if (/Format nothing reads|Permission nobody granted|Connector that is not there/.test(what)) {
          await lane.click({timeout: 1000}).catch(() => {});
        }
      }
      await expect(page.locator(MODAL)).toBeVisible({timeout: 400});
    }).toPass({timeout: 40000});

    await expect(page.locator(MODAL)).toContainText(/hops/);
  });
});

test.describe('lock pick, on the Keepiq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/keepiq/');
  });

  test('stays hidden until the logo is held down, then reads hot and cold', async ({page}) => {
    const game = page.locator('section[class*="lp_"]');
    await findGame(page, 'lock-pick', game);
    await game.getByRole('button', {name: /take a pick/i}).click();

    const dial = game.getByRole('slider');
    const feel = game.locator('p[class*="feel"]');

    /* Sweeping the dial has to change the feedback without turning:
       that is the whole fix that made the game playable. */
    const readings = new Set();
    for (const value of ['5', '25', '50', '75', '95']) {
      await dial.fill(value);
      readings.add((await feel.innerText()).trim());
    }
    expect(readings.size, 'the dial felt the same everywhere').toBeGreaterThan(1);

    /* And no turn was taken while sweeping. */
    await expect(game.getByText(/Picks 3/)).toBeVisible();
  });

  test('a careful sweep opens a lock', async ({page}) => {
    const game = page.locator('section[class*="lp_"]');
    await findGame(page, 'lock-pick', game);
    await game.getByRole('button', {name: /take a pick/i}).click();

    const dial = game.getByRole('slider');
    const feel = game.locator('p[class*="feel"]');
    const rank = (text) => (/almost turns/.test(text) ? 4
      : /good way/.test(text) ? 3
      : /gives a little/.test(text) ? 2
      : /Barely/.test(text) ? 1 : 0);

    /* Sweep, then commit in the middle of the best-feeling band. The
       first position that feels strongest sits at its edge, which is
       often just outside the tolerance: exactly the mistake a player
       makes on their first lock. */
    let bestRank = -1;
    let band = [];
    for (let v = 2; v < 100; v += 2) {
      await dial.fill(String(v));
      const r = rank((await feel.innerText()).trim());
      if (r > bestRank) { bestRank = r; band = [v]; }
      else if (r === bestRank) band.push(v);
    }
    const best = band[Math.floor(band.length / 2)];
    await dial.fill(String(best));
    await game.getByRole('button', {name: /turn the cylinder/i}).click();
    await expect(game.locator('p[class*="feedback"]')).toContainText(/Open, in/);
  });
});

test.describe('black it out, on the Filinq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/filinq/');
  });

  test('stays hidden until a sentence is selected, then publishes clean', async ({page}) => {
    const game = page.getByRole('region', {name: 'Black it out'});
    await findGame(page, 'redaction', game);
    await game.getByRole('button', {name: /open the stack/i}).click();

    /* Every document deals a name, a number or an address. Black out
       whatever matches, leave the sentence, and publish. */
    const SECRET = /de Vries|Keizersgracht|BSN|NL91|@example|March|maart|06 12/;
    const words = game.locator('button[class*="word"]');
    const count = await words.count();
    let blacked = 0;
    for (let i = 0; i < count; i++) {
      const text = await words.nth(i).innerText();
      if (SECRET.test(text)) { await words.nth(i).click(); blacked++; }
    }
    expect(blacked, 'the document dealt nothing to redact').toBeGreaterThan(0);

    await game.getByRole('button', {name: /publish it/i}).click();
    await expect(game.locator('p[class*="hint"]')).toContainText(/Clean\./);
    await expect(game.getByText(/Breaches left 3/)).toBeVisible();
  });

  test('publishing with a name still on it is a breach', async ({page}) => {
    const game = page.getByRole('region', {name: 'Black it out'});
    await findGame(page, 'redaction', game);
    await game.getByRole('button', {name: /open the stack/i}).click();
    await game.getByRole('button', {name: /publish it/i}).click();
    await expect(game.locator('p[class*="hint"]')).toContainText(/should not have/);
    await expect(game.getByText(/Breaches left 2/)).toBeVisible();
  });
});

test.describe('paint by tokens, on the Thematiq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/thematiq/');
  });

  test('stays hidden until the word is typed, then every cell says its token', async ({page}) => {
    const game = page.getByRole('region', {name: 'Paint by tokens'});
    await findGame(page, 'paint-by-tokens', game);
    await game.getByRole('button', {name: /open a theme/i}).click();

    const cells = game.locator('button[class*="cell"]');
    await expect(cells).toHaveCount(48);

    const wanted = await cells.first().getAttribute('aria-label');
    const token = wanted.replace(/^Wants /, '').trim();
    await game.getByRole('button', {name: new RegExp(`\\b${token}\\b`), exact: false}).first().click();
    await cells.first().click();
    await expect(cells.first()).toHaveAttribute('aria-label', new RegExp(`Filled with ${token}`));
  });
});

test('a game found once stays found in that browser', async ({page}) => {
  /* Hiding a game again from the person who already solved it would be
     a punishment for playing.

     Deliberately without clearScores(): that helper runs as an init
     script on every navigation, so it would wipe the found-games list
     during the reload and the test would be checking its own cleanup
     rather than the feature. Storage is cleared once, by hand. */
  await page.goto('/apps/decidiq/');
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem('conduction:minigames');
      window.localStorage.removeItem('conduction:minigames-found');
    } catch (e) {/* private mode */}
  });
  await page.reload();

  const game = page.locator('section[class*="rush"]');
  await findGame(page, 'stamp-rush', game);

  await page.reload();
  await expect(game, 'the game hid itself again after being found').toBeVisible({timeout: 8000});
});

test('a direct play link opens a game without solving its riddle', async ({page}) => {
  /* The way out for anyone stuck, and the way in for a link in a post. */
  await clearScores(page);
  await page.goto('/apps/thematiq/#play-paint-by-tokens');
  await expect(page.getByRole('region', {name: 'Paint by tokens'})).toBeVisible({timeout: 5000});
});

test('the app mock has the hero to itself until a game is found', async ({page}) => {
  /* The other half of the swap: a page whose game nobody has found
     looks exactly like a page with no game at all. */
  await clearScores(page);
  await page.goto('/apps/decidiq/');
  await expect(page.locator('[class*="illustration_"]')).toBeVisible();
  await expect(page.locator('section[class*="rush"]')).toHaveCount(0);
});

test('one riddle does not open another page game', async ({page}) => {
  await clearScores(page);
  await page.goto('/apps/buildiq/');
  /* Buildiq answers to a typed word, not to the Konami code. */
  await UNLOCK['deadline-defender'](page);
  await page.waitForTimeout(600);
  await expect(page.locator('section[class*="br_"]')).toHaveCount(0);

  await UNLOCK['blueprint-rush'](page);
  await expect(page.locator('section[class*="br_"]')).toBeVisible({timeout: 5000});
});

test('the arcade page lists every game the site ships', async ({page}) => {
  await page.goto('/arcade/');
  /* The roster in docusaurus.config.js and this list have to agree, or
     the dialog counts a game the page never names. */
  for (const name of [
    'Twelve apps', 'Sink the boats', 'Hex-vaders', 'Logo memory', 'Kade cyclist',
    'Stamp rush', 'Deadline defender', 'Blueprint rush', 'Record run',
    'Lock pick', 'Paint by tokens', 'Black it out',
    'Monster run', 'Dice duel', 'Match the bank', 'Make the connection',
  ]) {
    await expect(page.getByText(name, {exact: false}).first()).toBeVisible();
  }
});

test.describe('dice duel, on the Larpinq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/larpinq/');
  });

  test('stays hidden until the lucky roll is typed, then deals a hand', async ({page}) => {
    const game = page.getByRole('region', {name: 'Dice duel'});
    await findGame(page, 'dice-duel', game);
    await game.getByRole('button', {name: /draw steel/i}).click();

    const dice = game.getByRole('group', {name: /your dice/i}).getByRole('button');
    await expect(dice).toHaveCount(4);

    /* Holding a die says so in its label, not only in its colour: that
       is the whole state a player has to read before pushing. */
    await dice.first().click();
    await expect(dice.first()).toHaveAttribute('aria-label', /held/);
    await expect(game.locator('p[class*="worth"]')).toContainText(/worth \d/i);
  });

  test('pushing your luck until it bites reaches the dialog', async ({page}) => {
    const game = page.getByRole('region', {name: 'Dice duel'});
    await findGame(page, 'dice-duel', game);
    await game.getByRole('button', {name: /draw steel/i}).click();

    /* Hold nothing and keep throwing. A hand that comes up worse than
       the one before it costs a heart, and three of those end it. */
    await expect(async () => {
      await game.getByRole('button', {name: /push your luck/i}).click({timeout: 800}).catch(() => {});
      await game.getByRole('button', {name: /^Swing$/}).click({timeout: 800}).catch(() => {});
      await expect(page.locator(MODAL)).toBeVisible({timeout: 400});
    }).toPass({timeout: 40000});

    await expect(page.locator(MODAL)).toContainText(/monsters felled/);
  });
});

test.describe('match the bank, on the Shillinq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/shillinq/');
  });

  test('wants five knocks, not three, and then settles a payment', async ({page}) => {
    const game = page.getByRole('region', {name: 'Match the bank'});
    const glyph = page.locator('[data-hidden-target="app-glyph"]').first();

    /* Decidiq's three knocks must not open Shillinq's game, or every
       page would answer to the same riddle and the hunt would be one
       riddle long. Three, a pause, then the two that finish it. */
    await expect(async () => {
      for (let i = 0; i < 3; i++) await glyph.click({force: true});
      await page.waitForTimeout(400);
      await expect(game).toHaveCount(0);
    }).toPass({timeout: 15000});

    await findGame(page, 'reconcile', game);
    await game.getByRole('button', {name: /open the statement/i}).click();

    /* Pick up a payment; the one in hand says so in its pressed state. */
    const payments = game.getByRole('button', {name: /^Settle invoice/}).first();
    const picked = game.locator('button[aria-pressed="true"]');
    await expect(picked).toHaveCount(0);
    await game.locator('button[class*="pick"]').first().click();
    await expect(picked).toHaveCount(1);
    await expect(payments).toBeVisible();
  });

  test('flagging the real payments burns the corrections and opens the dialog', async ({page}) => {
    const game = page.getByRole('region', {name: 'Match the bank'});
    await findGame(page, 'reconcile', game);
    await game.getByRole('button', {name: /open the statement/i}).click();

    /* At most one line on a statement belongs to nobody, so flagging
       everything spends the three corrections within a sheet or two. */
    await expect(async () => {
      const flags = await game.getByRole('button', {name: /as belonging to nobody/}).all();
      for (const flag of flags) await flag.click({timeout: 600}).catch(() => {});
      await expect(page.locator(MODAL)).toBeVisible({timeout: 400});
    }).toPass({timeout: 30000});

    await expect(page.locator(MODAL)).toContainText(/lines matched/);
  });
});

test.describe('make the connection, on the Integriq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/integriq/');
  });

  test('stays behind a quiet opener, then a route can be made to meet', async ({page}) => {
    const game = page.getByRole('region', {name: 'Make the connection'});
    await findGame(page, 'pipe-fit', game);
    await game.getByRole('button', {name: /send it/i}).click();

    const pieces = game.getByRole('button', {name: /^Connector \d/});
    await expect(pieces.first()).toBeVisible({timeout: 5000});

    /* Turn left to right: each connector has exactly one turn that
       meets what the one before it hands over, so a single pass
       settles the line. The route is replaced the moment it connects,
       so the walk starts over rather than carrying on into a puzzle
       nobody asked for. */
    await expect(async () => {
      const count = await pieces.count();
      for (let i = 0; i < count; i++) {
        for (let t = 0; t < 3; t++) {
          const label = await pieces.nth(i).getAttribute('aria-label');
          if (label && !/does not meet/.test(label)) break;
          await pieces.nth(i).click({timeout: 600});
        }
      }
      await expect(game.locator('p[class*="hint"]')).toContainText(/Through/, {timeout: 500});
    }).toPass({timeout: 30000});

    const score = Number((await game.locator('span[class*="hudPill"]').first().innerText()).replace(/\D/g, ''));
    expect(score, 'the route connected without paying the bonus').toBeGreaterThanOrEqual(20);
  });
});

test.describe('the monster goes for a run, in the La Frankendesk post', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/academy/blog/la-frankendesk/');
  });

  test('stays hidden until the word Frankenstein shouts is typed', async ({page}) => {
    const game = page.getByRole('region', {name: 'The monster goes for a run'});
    await findGame(page, 'monster-run', game);
    await game.getByRole('button', {name: /it lives/i}).click();

    await expect(game.getByRole('button', {name: /^Jump$/})).toBeVisible();
    await expect(game.getByRole('button', {name: /^Duck$/})).toBeVisible();
  });

  test('the first stride is clear, so nobody loses a stitch to a standing start', async ({page}) => {
    /* The run opened with an obstacle already on top of the monster,
       which cost a stitch before anyone could reach a key. The lead-in
       columns fixed it, and this is the line that keeps them. */
    const game = page.getByRole('region', {name: 'The monster goes for a run'});
    await findGame(page, 'monster-run', game);
    await game.getByRole('button', {name: /it lives/i}).click();

    await page.waitForTimeout(1200);
    await expect(game.getByText(/Stitches 3/)).toBeVisible();
  });
});

test.describe('the game-over card', () => {
  /* The card is the thing people screenshot and the only place the
     total and the share buttons live, so it has to fit in the window
     it opens in. With sixteen games in one column it did not: on a
     laptop the roster ran past the bottom and took Play again with it.
     Both tests below fail if the two-column layout is dropped. */

  /** Open the card without playing: the modal listens for this event. */
  async function showCard(page) {
    await page.goto('/connext/');
    /* The listener is attached from the client, so an event dispatched
       before hydration reaches nobody. Wait for something only the
       hydrated page has. */
    await page.getByRole('button', {name: /take a break/i}).waitFor();
    const fire = () => page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connext:gameend', {detail: {
        id: 'record-run',
        won: false,
        score: 102,
        summary: '39 hops · 5 apps picked up',
        title: 'The record got stuck.',
      }}));
    });
    const panel = page.locator('div[class*="modal"] > div[class*="panel"]');
    await expect(async () => {
      await fire();
      await expect(panel).toBeVisible({timeout: 1500});
    }).toPass({timeout: 20000});
    return panel;
  }

  test('fits in a laptop window, with the buttons in it', async ({page}) => {
    await clearScores(page);
    await page.setViewportSize({width: 1440, height: 800});
    const panel = await showCard(page);

    /* Not a height in pixels: the card carries its own scrollbar as a
       last resort, so "shorter than 760" would pass on a card that is
       scrolling. Ask the card whether it had to. */
    const overflow = await panel.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow, 'the card has to scroll to show itself').toBeLessThanOrEqual(1);

    /* Not merely rendered: on screen. A button below the fold of a card
       that cannot scroll is the same as no button. */
    await expect(page.getByRole('button', {name: /play again/i})).toBeInViewport();
  });

  test('lays the sixteen games out in two columns when there is room', async ({page}) => {
    await clearScores(page);
    await page.setViewportSize({width: 1440, height: 800});
    const panel = await showCard(page);

    const items = panel.locator('li[class*="gridItem"]');
    await expect(items).toHaveCount(16);

    const first = await items.first().boundingBox();
    const ninth = await items.nth(8).boundingBox();
    expect(ninth.x, 'the roster is still one column').toBeGreaterThan(first.x + 40);
    expect(Math.abs(ninth.y - first.y), 'the second column does not start at the top')
      .toBeLessThan(8);
  });
});
