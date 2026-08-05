/**
 * Conduction Space Invaders — the game behind `game.exe` in the cookie CLI.
 *
 * Ported from the kit specimen at preview/cookie-cli.html, where this had
 * lived since the component was designed. The React <CookieCli /> shipped
 * without it for a while, which meant GameModal advertised a game
 * ("Hex-vaders · cookie CLI") that no site actually had.
 *
 * Kept as a plain class rather than React state on purpose. It ticks every
 * 90ms and repaints a 48x14 character grid, which is 672 cells per frame,
 * eleven times a second. Reconciling that through React would do a great
 * deal of work to arrive at the same string. The class builds the frame as
 * HTML and hands it to the caller, which writes it to a ref.
 *
 * Cobalt UFOs, KNVB-orange lasers, per the kit.
 *
 * The engine owns no DOM and reads no globals. It reports frames through
 * `onFrame` and asks to be dismissed through `onExit`, so the React
 * component stays the only thing that touches the document.
 */

const COLS = 48;
const ROWS = 14;

/* The event the shared GameModal listens for. Named `connext:` because the
   modal has used that prefix since the ConNext era; it is a brand-internal
   identifier kept for compatibility, not a live brand reference. */
const GAME_END_EVENT = 'connext:gameend';
const GAME_REPLAY_EVENT = 'connext:gamereplay';
const GAME_ID = 'invaders';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export default class SpaceInvaders {
  /**
   * @param {object}   opts
   * @param {function} opts.onFrame - called with {screen, hud, footer} HTML each repaint
   * @param {function} opts.onExit  - called when the player quits (ESC / Q)
   */
  constructor({onFrame, onExit} = {}) {
    this.onFrame = typeof onFrame === 'function' ? onFrame : () => {};
    this.onExit = typeof onExit === 'function' ? onExit : () => {};

    this.score = 0;
    this.wave = 1;
    this.hits = 0;      // bombs that landed on you; costs nothing but pride
    this.cleared = 0;   // waves shot down
    this.landed = 0;    // waves that reached the floor
    this.hitFlash = 0;  // ticks left of the impact glyph
    this.paused = false;
    this.player = {x: Math.floor(COLS / 2) - 1};
    this.lasers = [];
    this.bombs = [];
    this.ufos = [];
    this.ufoDir = 1;
    this.ufoSpeed = 9;
    this.tickCount = 0;
    this.graceTicks = 18; // ~1.6s before bombs start dropping

    this.onReplay = (e) => {
      if (e.detail && e.detail.id === GAME_ID) this.restart();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(GAME_REPLAY_EVENT, this.onReplay);
    }

    this.spawnUfos();
    this.interval = setInterval(() => this.tick(), 90);
    this.render();
  }

  spawnUfos() {
    this.ufos = [];
    const rows = 3, cols = 6;
    const spacing = 7;
    const xStart = Math.floor((COLS - (cols - 1) * spacing - 3) / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.ufos.push({x: xStart + c * spacing, y: 1 + r * 2, alive: true, exploding: 0, row: r});
      }
    }
  }

  onKey(e) {
    /* The old game-over branch is gone with game over itself. [R] used to
       live only in that branch, which would have left it dead: reachable
       by a key hint that never appeared, on a screen that never showed.
       It now restarts at any time. */
    switch (e.key) {
      case 'r': case 'R':
        this.restart(); e.preventDefault(); return;
      default: break;
    }
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A':
        this.player.x = Math.max(0, this.player.x - 2);
        e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D':
        this.player.x = Math.min(COLS - 3, this.player.x + 2);
        e.preventDefault(); break;
      case ' ': case 'ArrowUp': case 'w': case 'W':
        this.fire(); e.preventDefault(); break;
      case 'Escape': case 'q': case 'Q':
        this.quit(); e.preventDefault(); break;
      case 'p': case 'P':
        this.paused = !this.paused; e.preventDefault(); this.render(); break;
      default: break;
    }
  }

  fire() {
    if (this.lasers.length >= 3) return;
    this.lasers.push({x: this.player.x + 1, y: ROWS - 2});
  }

  quit() {
    this.stop();
    this.onExit();
  }

  stop() {
    clearInterval(this.interval);
    this.interval = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener(GAME_REPLAY_EVENT, this.onReplay);
    }
  }

  restart() {
    this.score = 0;
    this.wave = 1;
    this.hits = 0;
    this.cleared = 0;
    this.landed = 0;
    this.hitFlash = 0;
    this._endEmitted = false;
    this.player = {x: Math.floor(COLS / 2) - 1};
    this.lasers = [];
    this.bombs = [];
    this.ufoSpeed = 9;
    this.tickCount = 0;
    this.graceTicks = 18;
    this.spawnUfos();
    this.render();
  }

  /* Advance to a fresh wave, whether the last one was shot down or landed.
     Clears bombs so the new wave does not open under incoming fire, and
     restores the grace period so there is a beat before it resumes. */
  nextWave() {
    this.wave += 1;
    this.spawnUfos();
    this.ufoSpeed = Math.max(3, 9 - this.wave);
    this.bombs = [];
    this.graceTicks = 12;
    this.render();
  }

  tick() {
    if (this.paused) return;
    this.tickCount++;

    // lasers up every tick
    this.lasers.forEach((l) => { l.y -= 1; });
    this.lasers = this.lasers.filter((l) => l.y >= 0);

    // bombs down every 2 ticks
    if (this.tickCount % 2 === 0) {
      this.bombs.forEach((b) => { b.y += 1; });
      this.bombs = this.bombs.filter((b) => b.y < ROWS);
    }

    // UFOs march
    if (this.tickCount % this.ufoSpeed === 0) {
      const alive = this.ufos.filter((u) => u.alive);
      if (alive.length) {
        const minX = Math.min(...alive.map((u) => u.x));
        const maxX = Math.max(...alive.map((u) => u.x));
        if (this.ufoDir === 1 && maxX + 3 >= COLS) {
          this.ufoDir = -1;
          alive.forEach((u) => { u.y += 1; });
        } else if (this.ufoDir === -1 && minX <= 0) {
          this.ufoDir = 1;
          alive.forEach((u) => { u.y += 1; });
        } else {
          alive.forEach((u) => { u.x += this.ufoDir; });
        }
      }
    }

    // random bombs, after a short grace period so the player can settle in
    if (this.graceTicks > 0) {
      this.graceTicks--;
    } else {
      const aliveUfos = this.ufos.filter((u) => u.alive);
      const bombChance = 0.035 + (this.wave - 1) * 0.01;
      if (aliveUfos.length && this.bombs.length < 4 && Math.random() < bombChance) {
        const u = aliveUfos[Math.floor(Math.random() * aliveUfos.length)];
        this.bombs.push({x: u.x + 1, y: u.y + 1});
      }
    }

    // laser vs ufo
    this.lasers.forEach((l) => {
      this.ufos.forEach((u) => {
        if (!u.alive) return;
        if (l.y === u.y && l.x >= u.x && l.x <= u.x + 2) {
          u.alive = false;
          u.exploding = 2;
          l.dead = true;
          this.score += 10 * (3 - u.row);
          const remaining = this.ufos.filter((uu) => uu.alive).length;
          this.ufoSpeed = Math.max(2, 8 - Math.floor((18 - remaining) / 3));
        }
      });
    });
    this.lasers = this.lasers.filter((l) => !l.dead);

    this.ufos.forEach((u) => { if (u.exploding > 0) u.exploding -= 1; });

    /* Bombs vs player. You cannot die here.
       This is an easter egg in a cookie banner, not an arcade cabinet:
       ending someone's game with GAME OVER while they were only trying to
       set a cookie preference is a bad trade. A hit still lands and still
       reads as a hit, it just costs a moment of shield flash rather than a
       life. Bombs stay dangerous-looking and become harmless. */
    this.bombs.forEach((b) => {
      if (b.y === ROWS - 1 && b.x >= this.player.x && b.x <= this.player.x + 2) {
        b.dead = true;
        this.hitFlash = 4;   // ticks the player renders as an impact
        this.hits += 1;
      }
    });
    this.bombs = this.bombs.filter((b) => !b.dead);
    if (this.hitFlash > 0) this.hitFlash -= 1;

    /* UFOs reaching the bottom used to end the game outright, regardless of
       lives. Now the wave simply lands and a fresh one spawns, so the run
       continues. Without this the one unavoidable death would still be
       reachable by standing still. */
    if (this.ufos.some((u) => u.alive && u.y >= ROWS - 1)) {
      this.landed += 1;
      this.nextWave();
      return;
    }

    // wave clear
    if (this.ufos.every((u) => !u.alive && u.exploding === 0)) {
      this.cleared += 1;
      this.nextWave();

      /* Tell the shared GameModal the game was found, so it records
         discovery and score in its cross-site progress cookie.
         This used to fire on game over. Since there is no game over any
         more, clearing the first wave is the moment: without moving it the
         event would never fire at all and the game would stay permanently
         undiscovered in the modal, which is a silent regression rather than
         a visible one. Once per run. */
      if (!this._endEmitted && typeof window !== 'undefined') {
        this._endEmitted = true;
        window.dispatchEvent(new CustomEvent(GAME_END_EVENT, {
          detail: {
            id: GAME_ID,
            won: true,
            score: this.score,
            summary: `${this.score} pts · wave ${this.wave}`,
          },
        }));
      }
    }

    this.render();
  }

  render() {
    const grid = [];
    const meta = [];
    for (let y = 0; y < ROWS; y++) {
      grid.push(Array(COLS).fill(' '));
      meta.push(Array(COLS).fill(''));
    }
    const set = (y, x, c, t) => {
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) { grid[y][x] = c; meta[y][x] = t; }
    };

    this.ufos.forEach((u) => {
      if (u.alive) {
        set(u.y, u.x, '<', 'ufo'); set(u.y, u.x + 1, 'O', 'ufo'); set(u.y, u.x + 2, '>', 'ufo');
      } else if (u.exploding > 0) {
        set(u.y, u.x, '*', 'boom'); set(u.y, u.x + 1, '#', 'boom'); set(u.y, u.x + 2, '*', 'boom');
      }
    });

    this.lasers.forEach((l) => set(l.y, l.x, '|', 'laser'));
    this.bombs.forEach((b) => set(b.y, b.x, '*', 'bomb'));

    /* The ship, or a brief impact burst when something just hit it. The
       flash is the whole feedback for taking a hit now that it costs
       nothing, so without it bombs would land with no effect at all and
       the game would feel broken rather than forgiving. */
    if (this.hitFlash > 0) {
      set(ROWS - 1, this.player.x, '*', 'boom');
      set(ROWS - 1, this.player.x + 1, '#', 'boom');
      set(ROWS - 1, this.player.x + 2, '*', 'boom');
    } else {
      set(ROWS - 1, this.player.x, '<', 'player');
      set(ROWS - 1, this.player.x + 1, 'A', 'player');
      set(ROWS - 1, this.player.x + 2, '>', 'player');
    }

    /* Coalesce equal-styled runs into one span per run instead of one per
       character. A row is 48 cells but usually only a handful of runs. */
    let screen = '';
    for (let y = 0; y < ROWS; y++) {
      let line = '';
      let runT = '', runS = '';
      const flush = () => {
        if (!runS) return;
        line += runT ? `<span class="g-${runT}">${escapeHtml(runS)}</span>` : escapeHtml(runS);
        runS = '';
      };
      for (let x = 0; x < COLS; x++) {
        if (meta[y][x] === runT) runS += grid[y][x];
        else { flush(); runT = meta[y][x]; runS = grid[y][x]; }
      }
      flush();
      screen += `${line}\n`;
    }

    /* LIVES is gone, because there is nothing to count down. SHIELD says
       the same thing the three little ships used to say (you are fine)
       without implying a budget that can run out. HITS is there so the
       bombs still mean something. */
    const hud = `
      <span class="hud-label">SCORE</span> <span class="hud-val g-laser">${String(this.score).padStart(4, '0')}</span>
      <span class="hud-label">SHIELD</span> <span class="hud-val g-player">${escapeHtml('∞')}</span>
      <span class="hud-label">WAVE</span>  <span class="hud-val">${this.wave}</span>
      <span class="hud-label">HITS</span>  <span class="hud-val">${this.hits}</span>
      <span style="margin-left:auto" class="hud-label">conduction · space-invaders.exe</span>
    `;

    let footer;
    if (this.paused) {
      footer = '<span class="warn">-- paused -- press [P] to resume</span>';
    } else if (this.graceTicks > 0) {
      footer = '<span class="ok">-- READY --</span> <span class="cmt">defend the cookies. fire orange lasers at the cobalt UFOs.</span>';
    } else {
      footer = '<span class="cmt"># [← →] move &nbsp; [space] fire orange laser &nbsp; [P] pause &nbsp; [ESC] exit</span>';
    }

    this.onFrame({screen, hud, footer});
  }
}

export {COLS, ROWS, GAME_ID, GAME_END_EVENT};
