#!/usr/bin/env node
/**
 * scripts/lint-color-roles.mjs
 *
 * Catch, at authoring time, the colour mistake that a runtime sweep can only
 * catch after it ships.
 *
 * THE INVARIANT
 *
 *   Within one declaration block or inline style object, ink and surface must
 *   be either BOTH theme-aware or BOTH fixed. Never one of each.
 *
 * Why that is the right line. A semantic token (`--conduction-color-*`) has a
 * different value per theme; a raw palette token (`--c-*`), a hex or a named
 * colour has one value forever. Mixing them means one theme is always wrong,
 * and which theme is wrong depends on which half you fixed:
 *
 *   fixed surface + theme-aware ink   the ink flips out from under a surface
 *                                     that cannot follow. Measured 2026-09-20:
 *                                     white on gold at 2.58:1 and white on
 *                                     mint at 3.62:1, on 23 pages.
 *   theme-aware surface + fixed ink   the classic dark-mode failure: the
 *                                     surface goes dark under navy text.
 *                                     1,362 elements under 1.5:1 in the first
 *                                     audit.
 *
 * A block with a fixed ink and NO surface of its own is also flagged, because
 * it inherits whatever surface an ancestor provides and that surface is free
 * to flip. That is how 32 declarations of
 * `color: 'var(--c-cobalt-500, #6f7da3)'` came to render at 1.73:1 in dark.
 * If the ancestor's surface really is fixed, say so with an opt-out.
 *
 * OPT-OUT
 *
 *   Put `a11y-fixed-surface` in a comment on the line above, or anywhere in
 *   the same JSX style object. Use it where an ancestor paints a surface that
 *   cannot flip, e.g. text inside a permanently-cobalt hero. It is deliberately
 *   a phrase and not a bare eslint-style pragma so it reads as a claim someone
 *   made, and `git grep a11y-fixed-surface` lists every such claim.
 *
 * WHAT THIS DOES NOT DO
 *
 *   It cannot know a token's contrast against a surface set three components
 *   up. That is what `scripts/a11y-sweep.mjs` and `e2e/a11y.spec.js` are for.
 *   This is the cheap half: the half a person can fix while writing the line.
 *
 *   npm run lint:colors            check
 *   npm run lint:colors -- --self-test   prove the checks can fail
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'i18n', 'academy'];
const EXTS = new Set(['.css', '.mdx', '.jsx', '.js']);
const OPT_OUT = 'a11y-fixed-surface';

/**
 * Brand accent colours, whose whole job is to be a fixed ink.
 *
 * The advisory rule flags a fixed colour with no surface of its own, because
 * it inherits a surface that is free to flip. That is the right default, and
 * for these particular values it is noise: the design system defines them as
 * accents with a named role ("coral = KNVB-orange accent for highlights",
 * "gold = the Conduction Certified mark only"), and an accent that followed
 * the theme would stop being the brand.
 *
 * 126 of the 163 advisory findings on 2026-09-22 were these, which is enough
 * noise to make the other 37 invisible. The full 661-route runtime sweep
 * reports zero contrast failures for any of them, so this is not hiding a
 * known defect; if one of these ever does land on a surface it cannot read
 * against, the sweep and the gate catch it as a contrast finding, which is
 * the layer that measures rather than guesses.
 *
 * Listed by value so the exception stays narrow and reviewable. A greyscale
 * or cobalt ink is deliberately NOT here: those are the ones picked to suit
 * whatever surface the author happened to be looking at.
 */
const BRAND_ACCENT_INK = [
  '--c-orange-knvb', '--c-coral-500', '--c-coral-600',
  '--c-mint-500', '--c-mint-300',
  '--c-amber-500', '--c-gold-500', '--c-gold-300',
  '--c-nextcloud-blue', '--c-nextcloud-cyan', '--c-commonground-yellow',
  '--c-red-vermillion', '--c-terracotta-500', '--c-lavender-500', '--c-forest-500',
];
const isBrandAccent = (v) => BRAND_ACCENT_INK.some((t) => v.includes(t));

/** A colour value is theme-aware only if it comes from the semantic layer. */
const isThemeAware = (v) => /var\(\s*--conduction-color-/.test(v);
/** Fixed: a raw palette token, a hex, a named colour, or an rgb()/hsl() literal. */
const isFixed = (v) =>
  /var\(\s*--c-/.test(v) ||
  /#[0-9a-fA-F]{3,8}\b/.test(v) ||
  /\b(?:rgba?|hsla?)\s*\(/.test(v) ||
  /\b(?:white|black)\b/.test(v);
/* `transparent`, `inherit`, `currentColor` and `none` are neither: they defer
   to something else, which is exactly the safe thing to do. */
const isDeferred = (v) => /\b(?:transparent|inherit|currentColor|unset|revert|initial|none)\b/i.test(v);

/**
 * Split a block body into declarations.
 *
 * CSS separates with `;`, a JS style object with `,`, and both allow commas
 * INSIDE a value (`rgba(1,2,3)`, `linear-gradient(...)`). Splitting a JS
 * object on a naive regex made the background's value swallow the rest of the
 * object, including the colour, so a mixed block looked consistent and the
 * MDX self-test case stayed silent. Walk the string instead, tracking paren
 * depth and quotes.
 */
function declarations(body, sep) {
  const out = [];
  let buf = '';
  let depth = 0;
  let quote = null;
  for (const ch of body) {
    if (quote) {
      if (ch === quote) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; buf += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf);
  return out;
}

/* `color` but not `border-color`, `background-color`, `outline-color`, and in
   a JS object also `backgroundColor`. The property boundary matters: `color:`
   is a substring of `border-color:`, which silently rewrote 58 declarations
   during an earlier migration. */
const INK = /(?:^|[^-\w.])(?:color)\s*:\s*(.+)$/is;
const SURFACE = /(?:^|[^-\w.])(?:background|background-color|backgroundColor)\s*:\s*(.+)$/is;

function roleValues(body, sep) {
  let ink;
  let surface;
  for (const raw of declarations(body, sep)) {
    const d = raw.trim();
    if (!d) continue;
    const i = d.match(INK);
    if (i && ink === undefined) ink = i[1].trim().replace(/^['"`]|['"`],?$/g, '').trim();
    const s2 = d.match(SURFACE);
    if (s2 && surface === undefined) surface = s2[1].trim().replace(/^['"`]|['"`],?$/g, '').trim();
  }
  return {ink, surface};
}

/**
 * Split a file into candidate blocks: CSS rule bodies and JSX style objects.
 * Crude on purpose. A missed block is a missed warning, never a wrong one,
 * and the runtime sweep is the backstop.
 */
function blocks(text, file) {
  const out = [];
  if (file.endsWith('.css')) {
    for (const m of text.matchAll(/\{([^{}]*)\}/g)) {
      out.push({body: m[1], index: m.index});
    }
  } else {
    /* JSX inline styles: style={{ ... }} and bare object literals that carry
       a colour role, e.g. `const pill = {background: ..., color: ...}`. */
    for (const m of text.matchAll(/\{\{([^{}]*)\}\}|=\s*\{([^{}]*)\}/g)) {
      out.push({body: m[1] ?? m[2] ?? '', index: m.index});
    }
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function check(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  /* A file-level opt-out, for a component that paints one fixed shell and
     draws everything inside it: a terminal pane, an error page. Putting the
     phrase in the file's header comment says "every ink in here sits on a
     surface I control and that does not flip", which is a claim about the
     file rather than about one block. It only counts in the header, so it
     cannot be dropped in halfway down to silence something inconvenient. */
  if (lines.slice(0, 40).join('\n').includes(OPT_OUT)) return [];
  const findings = [];
  for (const {body, index} of blocks(text, file)) {
    if (body.includes(OPT_OUT)) continue;
    const line = lineOf(text, index);
    /* An opt-out on the line above the block, or on the block's own line. */
    const near = [lines[line - 2], lines[line - 1]].filter(Boolean).join('\n');
    if (near.includes(OPT_OUT)) continue;

    const {ink, surface} = roleValues(body, file.endsWith('.css') ? ';' : ',');
    if (!ink || isDeferred(ink)) continue;

    const inkAware = isThemeAware(ink);
    const inkFixed = !inkAware && isFixed(ink);
    if (!inkAware && !inkFixed) continue;

    if (surface && !isDeferred(surface)) {
      const surfAware = isThemeAware(surface);
      const surfFixed = !surfAware && isFixed(surface);
      if (inkAware && surfFixed) {
        findings.push({file, line, kind: 'ink-flips-surface-cannot',
          detail: `color ${ink} follows the theme, background ${surface} cannot`});
      } else if (inkFixed && surfAware) {
        findings.push({file, line, kind: 'surface-flips-ink-cannot',
          detail: `background ${surface} follows the theme, color ${ink} cannot`});
      }
    } else if (inkFixed && !isBrandAccent(ink)) {
      findings.push({file, line, kind: 'fixed-ink-inherited-surface',
        detail: `color ${ink} cannot follow the theme and this block sets no surface of its own`});
    }
  }
  return findings;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (EXTS.has(path.extname(e.name))) acc.push(full);
  }
  return acc;
}

/* ---------------- self-test: every rule must be able to fire ------------- */
if (process.argv.includes('--self-test')) {
  const tmp = fs.mkdtempSync('/tmp/lint-color-roles-');
  const cases = [
    ['ink-flips-surface-cannot', 'a.css', '.x { background: var(--c-gold-500); color: var(--conduction-color-text-strong); }'],
    ['surface-flips-ink-cannot', 'b.css', '.y { background: var(--conduction-color-surface-card); color: var(--c-cobalt-500); }'],
    ['fixed-ink-inherited-surface', 'c.css', '.z { color: var(--c-cobalt-500, #6f7da3); }'],
    ['ink-flips-surface-cannot', 'd.mdx', '<span style={{background: var(--c-mint-500), color: var(--conduction-color-text-strong)}}>x</span>'],
  ];
  let bad = 0;
  for (const [kind, name, src] of cases) {
    const f = path.join(tmp, name);
    fs.writeFileSync(f, src);
    const hit = check(f).some((x) => x.kind === kind);
    console.log(`${hit ? 'FIRED ' : 'SILENT'} ${kind.padEnd(30)} ${name}`);
    if (!hit) bad++;
  }
  /* Negative controls: correct code must stay quiet, or the rule is noise. */
  const quiet = [
    ['both fixed', 'e.css', '.a { background: var(--c-gold-500); color: var(--c-cobalt-900); }'],
    ['both theme-aware', 'f.css', '.b { background: var(--conduction-color-surface-card); color: var(--conduction-color-text-body); }'],
    ['inherit defers', 'g.css', '.c { color: inherit; }'],
    ['opted out', 'h.css', '/* a11y-fixed-surface: the hero is cobalt in both themes */\n.d { color: var(--c-cobalt-100); }'],
  ];
  for (const [label, name, src] of quiet) {
    const f = path.join(tmp, name);
    fs.writeFileSync(f, src);
    const n = check(f).length;
    console.log(`${n === 0 ? 'quiet ' : 'NOISY '} ${label.padEnd(30)} ${name}${n ? '  -> ' + JSON.stringify(check(f)) : ''}`);
    if (n !== 0) bad++;
  }
  fs.rmSync(tmp, {recursive: true, force: true});
  console.log('');
  console.log(`SELF-TEST ${bad === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(bad === 0 ? 0 : 1);
}

const STRICT = process.argv.includes('--strict');
/* Two tiers, because a check that reports 167 things on the day it lands gets
   switched off.

   BLOCKING is the pair that is wrong by construction: one half of the block
   follows the theme and the other cannot, so one theme is always broken. No
   judgement needed, and no false positives in practice.

   ADVISORY is fixed ink with no surface of its own. Often fine (a terminal
   pane, a permanently-cobalt hero), sometimes the exact bug that put 32
   declarations at 1.73:1 in dark. It needs a person to look at the ancestor,
   so it prints and does not fail. Work the list down with `--strict`, and
   mark the deliberate ones with an a11y-fixed-surface comment. */
const BLOCKING = new Set(['ink-flips-surface-cannot', 'surface-flips-ink-cannot']);

const files = ROOTS.flatMap((r) => walk(r));
const findings = files.flatMap(check);
const blocking = findings.filter((f) => BLOCKING.has(f.kind));
const advisory = findings.filter((f) => !BLOCKING.has(f.kind));

const report = (title, list, cap) => {
  if (!list.length) return;
  const byKind = {};
  for (const f of list) (byKind[f.kind] = byKind[f.kind] || []).push(f);
  console.log(`\n${title}`);
  for (const [kind, sub] of Object.entries(byKind)) {
    console.log(`  ${kind}: ${sub.length} on ${new Set(sub.map((f) => f.file)).size} file(s)`);
    for (const f of sub.slice(0, cap)) console.log(`    ${f.file}:${f.line}  ${f.detail}`);
    if (sub.length > cap) console.log(`    ... and ${sub.length - cap} more`);
  }
};

report('BLOCKING - one half follows the theme, the other cannot:', blocking, 40);
report(STRICT ? 'ALSO BLOCKING (--strict):' : 'ADVISORY - fixed ink, surface comes from an ancestor:', advisory, STRICT ? Number.MAX_SAFE_INTEGER : 5);

console.log('');
const fail = blocking.length + (STRICT ? advisory.length : 0);
if (fail) {
  console.error(`${fail} colour-role problem(s) across ${new Set([...blocking, ...(STRICT ? advisory : [])].map((f) => f.file)).size} file(s).`);
  console.error('Ink and surface must both follow the theme or both be fixed. Where an');
  console.error(`ancestor paints a surface that cannot flip, say so with an "${OPT_OUT}" comment.`);
  process.exit(1);
}
console.log(`No blocking colour-role problems in ${files.length} files.` +
  (advisory.length ? ` ${advisory.length} advisory, run with --strict to see them all.` : ''));
