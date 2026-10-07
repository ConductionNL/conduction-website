/**
 * <CookieCli />
 *
 * Terminal-styled cookie consent banner. Mirrors the kit's
 * preview/components/cookie-cli.html: black terminal panel with green
 * prompt, IBM Plex Mono throughout, four cookie categories shown as
 * [1] [2] [3] [4] options, three action buttons.
 *
 * Persists choice in localStorage under a configurable key. Won't
 * re-render after a decision unless the page calls window
 * .ConductionCookieCli.reset().
 *
 * Per huisstijl: terminal dark IS the accent here. The Plex Mono
 * caption and the [1] [2] keys read as a Conduction tell.
 *
 * Usage in MDX (or anywhere in the app):
 *
 *   <CookieCli
 *     siteHost="conduction.nl"
 *     categories={[
 *       {key: 'essential',   label: 'essential',   tag: 'required', required: true, defaultOn: true},
 *       {key: 'analytics',   label: 'analytics',   tag: 'opt-in',   defaultOn: true},
 *       {key: 'preferences', label: 'preferences', tag: 'opt-in'},
 *       {key: 'marketing',   label: 'marketing',   tag: 'opt-in'},
 *     ]}
 *     onAccept={(selected) => { /* track or fire telemetry *\/ }}
 *   />
 *
 * The component reads + writes the selection from localStorage
 * automatically; <onAccept/> is called with the resolved selection
 * on every save.
 */

import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import styles from './CookieCli.module.css';
import SpaceInvaders from './spaceInvaders';
import {runCommand} from './shell';

const STORAGE_KEY = 'conduction:cookie-cli';

const DEFAULT_CATEGORIES = [
  {key: 'essential',   label: 'essential',   tag: 'required', required: true, defaultOn: true},
  {key: 'analytics',   label: 'analytics',   tag: 'opt-in',   defaultOn: false},
  {key: 'preferences', label: 'preferences', tag: 'opt-in',   defaultOn: false},
  {key: 'marketing',   label: 'marketing',   tag: 'opt-in',   defaultOn: false},
];

function readStored() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeStored(selection) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...selection,
      _ts: Date.now(),
    }));
  } catch (e) {
    /* localStorage may be disabled (private mode, quota); fail open */
  }
}

export default function CookieCli({
  siteHost = 'conduction.nl',
  categories = DEFAULT_CATEGORIES,
  onAccept,
  className,
}) {
  const isBrowser = useIsBrowser();

  const initial = useMemo(() => {
    const fromStore = readStored();
    if (fromStore) return fromStore;
    const fresh = {};
    for (const c of categories) fresh[c.key] = !!c.defaultOn;
    return fresh;
  }, [categories]);

  const [selected, setSelected] = useState(initial);
  const [decided, setDecided] = useState(() => readStored() != null);

  /* Sync local state to localStorage if the dataset arrived from
     storage on a fresh mount. Skipped on SSR to keep hydration stable. */
  useEffect(() => {
    if (!isBrowser) return;
    const stored = readStored();
    if (stored) {
      setSelected(stored);
      setDecided(true);
    }
  }, [isBrowser]);

  /* Expose a window.ConductionCookieCli.reset() so the privacy page
     can re-show the prompt when a user wants to change their choice. */
  useEffect(() => {
    if (!isBrowser) return;
    window.ConductionCookieCli = {
      reset: () => {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {/* */}
        setDecided(false);
      },
      get: () => readStored(),
    };
    return () => { delete window.ConductionCookieCli; };
  }, [isBrowser]);

  const toggle = useCallback((cat) => {
    if (cat.required) return;
    setSelected((prev) => ({...prev, [cat.key]: !prev[cat.key]}));
  }, []);

  const save = useCallback((finalSelection) => {
    writeStored(finalSelection);
    setSelected(finalSelection);
    setDecided(true);
    if (typeof onAccept === 'function') onAccept(finalSelection);
  }, [onAccept]);

  const acceptAll = useCallback(() => {
    const all = {};
    for (const c of categories) all[c.key] = true;
    save(all);
  }, [categories, save]);

  const saveCurrent = useCallback(() => save(selected), [save, selected]);

  const rejectNonEssential = useCallback(() => {
    const minimal = {};
    for (const c of categories) minimal[c.key] = !!c.required;
    save(minimal);
  }, [categories, save]);

  /* ---- the shell, and the game hiding in it ---- */

  const [buffer, setBuffer] = useState('');
  const [history, setHistory] = useState([]); // [{cmd, lines}]
  const [mode, setMode] = useState('shell');  // 'shell' | 'game'
  const gameRef = useRef(null);
  const screenRef = useRef(null);
  const hudRef = useRef(null);
  const footerRef = useRef(null);
  const promptRef = useRef(null);

  const emit = useCallback((cmd, lines) => {
    setHistory((prev) => [...prev, {cmd, lines}]);
  }, []);

  const exitGame = useCallback(() => {
    if (gameRef.current) gameRef.current.stop();
    gameRef.current = null;
    setMode('shell');
    emit(null, [{text: '# thanks for playing. back to your regularly scheduled cookies.', tone: 'cmt'}]);
  }, [emit]);

  const startGame = useCallback(() => {
    emit(null, [
      {text: 'Loading game.exe ...', tone: 'cmt'},
      {text: '[OK] CONDUCTION SPACE INVADERS v0.1', tone: 'ok'},
    ]);
    setMode('game');
  }, [emit]);

  /* Construct the engine once the game surface is actually on screen.
     Building it in the click handler would hand it refs that are still
     null, because the panel it draws into has not rendered yet. */
  useEffect(() => {
    if (mode !== 'game' || gameRef.current) return undefined;
    gameRef.current = new SpaceInvaders({
      onFrame: ({screen, hud, footer}) => {
        if (screenRef.current) screenRef.current.innerHTML = screen;
        if (hudRef.current) hudRef.current.innerHTML = hud;
        if (footerRef.current) footerRef.current.innerHTML = footer;
      },
      onExit: exitGame,
    });
    return () => {
      if (gameRef.current) { gameRef.current.stop(); gameRef.current = null; }
    };
  }, [mode, exitGame]);

  const submit = useCallback((line) => {
    const result = runCommand(line);
    if (result.clear) { setHistory([]); return; }
    emit(line, result.lines);
    if (result.effect === 'game') startGame();
  }, [emit, startGame]);

  /* One key handler for both modes.
     In game mode every key belongs to the game. In shell mode the rule is
     the kit specimen's, exactly: digits pick cookie options while the
     prompt is empty, and everything else types.

     There used to be [A] [S] [R] accelerators here, live whenever the
     prompt was empty. They quietly ate the first letter of any command
     starting with those letters, which made `sudo` and `rm` unreachable:
     typing `sudo` answered the consent dialog and closed the banner
     instead. A shell that silently refuses a third of the alphabet is
     worse than one with no shortcuts, and the three actions are buttons
     you can click or tab to. */
  useEffect(() => {
    if (!isBrowser || decided) return undefined;

    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (mode === 'game') {
        if (gameRef.current) gameRef.current.onKey(e);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const line = buffer;
        setBuffer('');
        submit(line);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setBuffer((b) => b.slice(0, -1));
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setBuffer('');
        return;
      }

      /* Digits toggle only from an empty prompt, so a filename or a version
         number can still be typed. */
      if (buffer.length === 0) {
        const idx = parseInt(e.key, 10);
        if (!Number.isNaN(idx) && idx >= 1 && idx <= categories.length) {
          e.preventDefault();
          toggle(categories[idx - 1]);
          return;
        }
      }

      if (e.key.length === 1) {
        e.preventDefault();
        setBuffer((b) => b + e.key);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isBrowser, decided, mode, buffer, submit, toggle, categories]);

  /* Keep the prompt in view as output accumulates. */
  useEffect(() => {
    if (promptRef.current) promptRef.current.scrollIntoView({block: 'nearest'});
  }, [history, mode]);

  /* Hide the banner once the user has made a decision; the prompt
     reappears via window.ConductionCookieCli.reset(). */
  if (!isBrowser || decided) return null;

  return (
    <div className={[styles.term, className].filter(Boolean).join(' ')} role="dialog" aria-label="Cookie consent">
      <div className={styles.bar}>
        <div className={styles.dots}>
          <span className={[styles.dot, styles.dotR].join(' ')} />
          <span className={[styles.dot, styles.dotY].join(' ')} />
          <span className={[styles.dot, styles.dotG].join(' ')} />
        </div>
        <div className={styles.title}>
          {'— '}<b>{siteHost}</b>{' · cookie-consent — bash —'}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.prompt}>
          <span className={styles.user}>you</span>
          <span className={styles.sigil}>@</span>
          <span className={styles.host}>{siteHost}</span>
          <span className={styles.sigil}>:</span>
          <span className={styles.path}>~</span>
          <span className={styles.sigil}>$</span>{' '}
          <span className={styles.cmd}>cat ./cookies.toml</span>
        </div>
        <p className={styles.comment}># Pick what you're OK with. Essential cookies are required.</p>

        <ul className={styles.opts} style={mode === 'game' ? {display: 'none'} : undefined}>
          {categories.map((c, i) => {
            const on = !!selected[c.key] || !!c.required;
            return (
              <li
                key={c.key}
                className={on ? styles.optOn : null}
                onClick={() => toggle(c)}
                role="button"
                tabIndex={c.required ? -1 : 0}
                aria-pressed={on}
                style={c.required ? {cursor: 'default'} : undefined}
              >
                <span className={styles.optKey}>[{i + 1}]</span>
                <span className={styles.optCheck}>{on ? '✓' : '☐'}</span>
                <span className={styles.optLabel}>{c.label}</span>
                {c.tag && <span className={styles.optTag}>{c.tag}</span>}
              </li>
            );
          })}
        </ul>

        {/* Scrollback. Command output is plain text with a tone class; the
            game is the only thing that writes HTML, and it escapes its own
            content in spaceInvaders.js. */}
        {history.length > 0 && (
          <div className={styles.scrollback}>
            {history.map((block, i) => (
              <div key={i} className={styles.outBlock}>
                {block.cmd != null && (
                  <div className={styles.prompt}>
                    <span className={styles.user}>you</span>
                    <span className={styles.sigil}>@</span>
                    <span className={styles.host}>{siteHost}</span>
                    <span className={styles.sigil}>:</span>
                    <span className={styles.path}>~</span>
                    <span className={styles.sigil}>$</span>{' '}
                    <span className={styles.cmd}>{block.cmd}</span>
                  </div>
                )}
                {block.lines.length > 0 && (
                  <pre className={styles.out}>
                    {block.lines.map((l, j) => (
                      <div key={j} className={l.tone ? styles[`tone_${l.tone}`] : undefined}>{l.text}</div>
                    ))}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        {mode === 'game' ? (
          <div className={styles.game}>
            <div className={styles.gameHud} ref={hudRef} />
            <pre className={styles.gameScreen} ref={screenRef} />
            <div className={styles.gameFooter} ref={footerRef} />
          </div>
        ) : (
          <>
            {/* The live prompt. Typing is captured on window rather than in an
                <input>, because the banner is not focused when it appears and
                we do not want to steal focus from the page to make a joke
                work. The hidden input keeps mobile keyboards reachable. */}
            <div
              className={styles.prompt}
              ref={promptRef}
              title="you can type here ;)"
              style={{cursor: 'text'}}
              onClick={() => { if (promptRef.current) promptRef.current.querySelector('input')?.focus(); }}
            >
              <span className={styles.user}>you</span>
              <span className={styles.sigil}>@</span>
              <span className={styles.host}>{siteHost}</span>
              <span className={styles.sigil}>:</span>
              <span className={styles.path}>~</span>
              <span className={styles.sigil}>$</span>{' '}
              <span className={styles.cmd}>{buffer}</span>
              <span className={styles.cursor} aria-hidden="true" />
              <input
                type="text"
                value={buffer}
                onChange={() => {}}
                className={styles.hiddenInput}
                aria-label="Terminal input. Type help for commands."
                tabIndex={-1}
              />
            </div>

            <div className={styles.actions}>
              <button type="button" className={[styles.btn, styles.btnPrimary].join(' ')} onClick={acceptAll}>
                <span className={styles.btnKey}>A</span>Accept all
              </button>
              <button type="button" className={styles.btn} onClick={saveCurrent}>
                <span className={styles.btnKey}>S</span>Save selection
              </button>
              <button type="button" className={styles.btn} onClick={rejectNonEssential}>
                <span className={styles.btnKey}>R</span>Reject non-essential
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
