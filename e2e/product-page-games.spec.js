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

import {test, expect} from './base.js';

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
  'pipe-fit': async (page) => {
    /* Integriq's game hides behind the same quiet opener: the one way
       in that shows itself, for a page with nothing else to poke at. */
    await page.getByRole('button', {name: /take a break/i}).click();
  },
  'dice-duel': async (page) => { await page.keyboard.type('20'); },
  'full-stack': async (page) => { await page.keyboard.type('stack'); },
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

    /* A case, its clock, and somewhere to send it. Deliberately not an
       answer key: this test used to map each case's wording to the step
       it wanted, and that map broke twice — once when the copy was
       rewritten and once when a fourth lane arrived, because a case that
       takes no next step at all is now one of the answers. What matters
       here is that the board is dealt and readable; whether a given case
       belongs in Intake is the engine's own tests' business. */
    await expect(game.locator('p[class*="fileText"]')).toBeVisible({timeout: 5000});
    /* Two of them now: the margin left on the case, and the clock. */
    await expect(game.getByRole('progressbar').first()).toBeVisible();

    const lanes = game.getByRole('button', {name: /^(Intake|Assessment|Decision|Off the queue)$/});
    await expect(lanes).toHaveCount(4);

    /* And answering does something: the case in front of you is replaced,
       whichever lane you chose and whether or not it was right. */
    const first = await game.locator('p[class*="fileText"]').innerText();
    await lanes.first().click();
    await expect(game.locator('p[class*="fileText"]')).not.toHaveText(first, {timeout: 5000});
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

  test('stays hidden until the word is typed, then deals a rail and a tray', async ({page}) => {
    const game = page.locator('section[class*="br_"]');
    await findGame(page, 'blueprint-rush', game);
    await game.getByRole('button', {name: /open a blueprint/i}).click();

    /* The flow is an ordered rail with places still to fill, and a
       tray of parts to fill them from. */
    const rail = game.getByRole('list', {name: /the flow, in order/i});
    await expect(rail).toBeVisible({timeout: 5000});
    await expect(game.getByRole('button', {name: /needs/})).not.toHaveCount(0);
  });

  test('laying what is ready builds the flow and scores', async ({page}) => {
    const game = page.locator('section[class*="br_"]');
    await findGame(page, 'blueprint-rush', game);
    await game.getByRole('button', {name: /open a blueprint/i}).click();

    /* Every part says its own state, so the rail can be built without
       the test knowing the order: lay whatever needs nothing first,
       and what that unlocks says so in turn. Reading the labels is the
       game, which is why they are the thing to drive. */
    const ready = game.getByRole('button', {name: /needs nothing first/});
    const score = game.locator('span[class*="hudPill"]').first();

    await expect(async () => {
      /* The flow is on a clock, so a worker that loses one simply takes
         the next: this asserts that laying what is ready scores, not that
         it happens inside any one flow. */
      const again = game.getByRole('button', {name: /open a blueprint|restart/i});
      if (await again.isVisible().catch(() => false)) await again.click().catch(() => {});

      const n = await ready.count();
      for (let i = 0; i < n; i++) await ready.nth(i).click({timeout: 800}).catch(() => {});
      const points = Number((await score.innerText()).replace(/\D/g, ''));
      expect(points, 'nothing was laid, so nothing scored').toBeGreaterThan(0);
    }).toPass({timeout: 60000});
  });
});

test.describe('lock pick, on the Keepiq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/keepiq/');
  });

  /**
   * Read the lock at one position.
   *
   * The dial no longer tells you anything by itself: you set the pick,
   * lean on the cylinder, and watch how far it comes round. A lean that
   * is released as soon as it stops is free, which the game says in its
   * own hint, so a sweep costs nothing.
   */
  async function feelAt(game, value) {
    await game.getByRole('slider').fill(String(value));
    await game.getByRole('button', {name: /hold to turn the cylinder/i}).click();
    return (await game.locator('p[class*="feel"]').innerText()).trim();
  }

  test('stays hidden until the logo is held down, then reads hot and cold', async ({page}) => {
    const game = page.locator('section[class*="lp_"]');
    await findGame(page, 'lock-pick', game);
    await game.getByRole('button', {name: /take a pick/i}).click();

    /* The lock has to feel different in different places, or there is
       nothing to read and the game is a guess. */
    const readings = new Set();
    for (const value of ['5', '25', '50', '75', '95']) {
      readings.add(await feelAt(game, value));
    }
    expect(readings.size, 'the lock felt the same everywhere').toBeGreaterThan(1);

    /* And reading it cost nothing: all three picks are still in hand. */
    await expect(game.getByText(/Picks 3/)).toBeVisible();
  });

  test('a careful sweep opens a lock', async ({page}) => {
    const game = page.locator('section[class*="lp_"]');
    await findGame(page, 'lock-pick', game);
    await game.getByRole('button', {name: /take a pick/i}).click();

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
    for (let v = 2; v < 100; v += 4) {
      const r = rank(await feelAt(game, v));
      if (r > bestRank) { bestRank = r; band = [v]; }
      else if (r === bestRank) band.push(v);
    }
    const best = band[Math.floor(band.length / 2)];
    await game.getByRole('slider').fill(String(best));

    /* Now lean and keep leaning: letting go the moment it stops is what
       makes a sweep free, so opening it means holding past that. */
    const turn = game.getByRole('button', {name: /hold to turn the cylinder/i});
    await expect(async () => {
      await turn.hover();
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await expect(game.locator('p[class*="feedback"]')).toContainText(/Open, in/, {timeout: 500});
    }).toPass({timeout: 30000});
  });
});

test.describe('black it out, on the Filinq page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/apps/filinq/');
  });

  /* What may not be published, by kind rather than by wording. Each
     word carries its own `data-token`, so the test blacks out the same
     thing the rules do and does not go stale the next time the copy is
     rewritten, which is exactly how the previous version of this test
     broke. Must stay in step with `secret: true` in the engine. */
  const SECRET = ['name', 'address', 'bsn', 'iban', 'email', 'birthdate',
    'phone', 'medical', 'benefit', 'plate'];

  test('stays hidden until a sentence is selected, then publishes clean', async ({page}) => {
    const game = page.getByRole('region', {name: 'Black it out'});
    await findGame(page, 'redaction', game);
    await game.getByRole('button', {name: /open the stack/i}).click();

    const secrets = game.locator(SECRET.map((t) => `button[data-token="${t}"]`).join(', '));
    const count = await secrets.count();
    expect(count, 'the document dealt nothing to redact').toBeGreaterThan(0);
    for (let i = 0; i < count; i++) await secrets.nth(i).click();

    await game.getByRole('button', {name: /publish it/i}).click();
    await expect(game.locator('p[class*="hint"]')).toContainText(/Clean\./);
  });

  test('publishing with a name still on it is a breach', async ({page}) => {
    const game = page.getByRole('region', {name: 'Black it out'});
    await findGame(page, 'redaction', game);
    await game.getByRole('button', {name: /open the stack/i}).click();

    /* Straight to publish, with everything still legible. */
    await game.getByRole('button', {name: /publish it/i}).click();
    await expect(game.locator('p[class*="hint"]')).toContainText(/Breach\./);
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
    await expect(cells).toHaveCount(56);   // 7 across, 8 down

    const wanted = await cells.first().getAttribute('aria-label');
    const token = wanted.replace(/^Wants /, '').trim();
    await game.getByRole('button', {name: new RegExp(`\\b${token}\\b`), exact: false}).first().click();
    await cells.first().click();
    await expect(cells.first()).toHaveAttribute('aria-label', new RegExp(`Filled with ${token}`));
  });
});

test('a game found once is hidden again on the next visit', async ({page}) => {
  /* Deliberate, and the opposite of what this suite used to assert: a
     game stays open for the visit that found it and no longer. A page
     pinned open on a game stops doing the job it is there for, which
     is explaining the product. The way back without the riddle is the
     play link, asserted below. */
  await clearScores(page);
  await page.goto('/apps/decidiq/');

  const game = page.locator('section[class*="rush"]');
  await findGame(page, 'stamp-rush', game);

  await page.reload();
  await expect(game, 'the game stayed open across a reload').toHaveCount(0);
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
    'Stamp rush', 'Deadline defender', 'Blueprint rush',
    'Lock pick', 'Paint by tokens', 'Black it out',
    'Monster run', 'Dice duel', 'Match the bank', 'Make the connection',
    'Full stack',
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
      const flags = await game.getByRole('button', {name: /^Flag /}).all();
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
       before hydration reaches nobody. There is no longer a visible
       opener on this page to wait for, so the retry below does the
       waiting: it fires again until the card answers. */
    const fire = () => page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connext:gameend', {detail: {
        id: 'full-stack',
        won: false,
        score: 102,
        summary: '9 layers · 2 whole stacks',
        title: 'The stack is full.',
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

test.describe('full stack, on the Connext page', () => {
  test.beforeEach(async ({page}) => {
    await clearScores(page);
    await page.goto('/connext/');
  });

  test('stays hidden until the word is typed, then deals a well of app tiles', async ({page}) => {
    const game = page.getByRole('region', {name: 'Full stack'});
    await findGame(page, 'full-stack', game);
    await game.getByRole('button', {name: /start stacking/i}).click();

    /* A column per width of the well, each saying how deep it already
       is, so the board is readable without seeing it. */
    const columns = game.getByRole('button', {name: /^Column \d/});
    await expect(columns.first()).toBeVisible({timeout: 5000});
    await expect(game.getByText(/In play:/)).toBeVisible();
  });
});
