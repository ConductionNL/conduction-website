/**
 * Hero glyph vocabulary.
 *
 * The academy hero renders one line-art glyph inside a hex thumbnail. Until
 * now that glyph came from the post's `contentType`, so all 52 tutorials
 * shared one icon and every blog post shared another. This module gives each
 * post a topical glyph instead, selected per post with `heroIcon:` in the
 * frontmatter (see the hero configuration block in ./index.jsx).
 *
 * All glyphs are 24x24, stroke-only, drawn on the same 1.6 stroke with round
 * caps and joins so they sit together as one set. They inherit `currentColor`
 * from the hex, so they work on every tone without per-glyph colour.
 *
 * Adding one: keep it to a handful of paths. These render large (xl hex) but
 * also appear small in the related-posts cards, so anything fussier than
 * three or four strokes turns to mud at the small size.
 *
 * `contentType` names (blog, tutorial, guide, case-study, webinar) are
 * deliberately NOT in this map — ./index.jsx falls back to its contentType
 * icons when `heroIcon` is absent or unrecognised, which keeps every post
 * that sets nothing rendering exactly what it rendered before.
 */

import React from 'react';

/* Shared stroke geometry. Round caps/joins are what make a set of otherwise
   unrelated shapes read as one family. */
const STROKE = {
  strokeWidth: 1.6,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** Wrap path children in the shared 24x24 stroke frame. */
function glyph(children) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>{children}</svg>;
}

/* A filled dot, for eyes and palette wells. Overrides the frame's no-fill. */
function dot(cx, cy, r = 1) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
}

export const HERO_GLYPHS = {
  /* ---- editorial / opinion ------------------------------------------- */

  /** Two ears, a muzzle, two eyes. For the two-wolves governance piece. */
  wolf: glyph(<>
    <path d="M5.5 4.5l2.6 4.2" />
    <path d="M18.5 4.5l-2.6 4.2" />
    <path d="M8.1 8.7h7.8l1.6 5.1-5.5 5.7-5.5-5.7z" />
    {dot(10, 12.4, 0.7)}
    {dot(14, 12.4, 0.7)}
    <path d="M12 15.4v1.4" />
  </>),

  /** A chess knight: the horse the automobile replaced. */
  horse: glyph(<>
    <path d="M7 20.5h10" />
    <path d="M9.2 20.5c0-3.2.6-4.6 2.3-6.2" />
    <path d="M8.4 6.2L6.2 10l3.1 1.1" />
    <path d="M8.4 6.2c3.2-2.1 8.3-.9 9.2 4.2.5 3-.6 5.9-2.3 7.6" />
    {dot(10.4, 8.2, 0.7)}
  </>),

  /** Two overlapping coins. Money, budgets, the spending race. */
  coins: glyph(<>
    <circle cx="9.5" cy="10" r="5.8" />
    <path d="M14 5.4a5.8 5.8 0 0 1 0 13.2" />
    <path d="M9.5 7.4v5.2" />
    <path d="M11.1 8.6H8.7a1.3 1.3 0 0 0 0 2.6h1.6a1.3 1.3 0 0 1 0 2.6H7.9" />
  </>),

  /** A key: ownership, and who holds it. */
  key: glyph(<>
    <circle cx="7.5" cy="12" r="4" />
    <path d="M11.5 12H21" />
    <path d="M17.5 12v3.2" />
    <path d="M20.2 12v2.2" />
  </>),

  /** Shield with a check. Security. */
  shield: glyph(<>
    <path d="M12 3l8 2.8v6.1c0 4.6-3.2 8-8 9.1-4.8-1.1-8-4.5-8-9.1V5.8z" />
    <path d="M9 12.2l2.1 2.1 4-4.2" />
  </>),

  /** Two lobes and a stem. Intelligence, the singularity. */
  brain: glyph(<>
    <path d="M12 6.4v13.1" />
    <path d="M12 6.4a3.3 3.3 0 0 0-6.2-1.5A2.9 2.9 0 0 0 4 9.6a3 3 0 0 0 1.1 4.2 2.9 2.9 0 0 0 3.2 4.6 3.3 3.3 0 0 0 3.7.9" />
    <path d="M12 6.4a3.3 3.3 0 0 1 6.2-1.5A2.9 2.9 0 0 1 20 9.6a3 3 0 0 1-1.1 4.2 2.9 2.9 0 0 1-3.2 4.6 3.3 3.3 0 0 1-3.7.9" />
  </>),

  /** Sun over a horizon. The hopeful turn. */
  sunrise: glyph(<>
    <path d="M12 3.5v3" />
    <path d="M5.4 9.4l2.1 2.1" />
    <path d="M18.6 9.4l-2.1 2.1" />
    <path d="M3 18.5h18" />
    <path d="M7 18.5a5 5 0 0 1 10 0" />
    <path d="M5.5 21.5h4M14.5 21.5h4" />
  </>),

  /** Stacked planes. A platform, not a suite. */
  layers: glyph(<>
    <path d="M12 3.2l8.8 4.6L12 12.4 3.2 7.8z" />
    <path d="M3.2 12.4L12 17l8.8-4.6" />
    <path d="M3.2 16.6L12 21.2l8.8-4.6" />
  </>),

  /** A cog. The engine that keeps running. */
  engine: glyph(<>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.6v2.6M12 17.8v2.6M3.6 12h2.6M17.8 12h2.6" />
    <path d="M6.1 6.1l1.9 1.9M16 16l1.9 1.9M17.9 6.1L16 8M8 16l-1.9 1.9" />
  </>),

  /** Two arrows trading places. Replacing one stack with another. */
  swap: glyph(<>
    <path d="M3.5 8.5h15" />
    <path d="M15 5l3.5 3.5L15 12" />
    <path d="M20.5 15.5h-15" />
    <path d="M9 12l-3.5 3.5L9 19" />
  </>),

  /** An open door with an arrow through it. Kicking big tech to the curb. */
  door: glyph(<>
    <path d="M14 3.5h5.5v17H14" />
    <path d="M3.5 12h8.5" />
    <path d="M8.5 8l4 4-4 4" />
  </>),

  /** A house with a rack inside. Self-hosting at home. */
  homeServer: glyph(<>
    <path d="M3 10.2L12 3l9 7.2" />
    <path d="M5.2 9v11.5h13.6V9" />
    <rect x="8.4" y="12.6" width="7.2" height="3.2" rx="0.9" />
    {dot(10.2, 14.2, 0.55)}
    <path d="M8.4 18.5h7.2" />
  </>),

  /** A funnel. Draining noise down to signal. */
  funnel: glyph(<>
    <path d="M3.2 4.2h17.6l-6.8 8v7.4l-4 2.2v-9.6z" />
  </>),

  /** A flag. Something new is live. */
  flag: glyph(<>
    <path d="M5.5 21V3.4" />
    <path d="M5.5 4h11.8l-2.2 3.8 2.2 3.8H5.5" />
  </>),

  /* ---- platform / tooling -------------------------------------------- */

  /** A power plug. Connecting a server or an MCP endpoint. */
  plug: glyph(<>
    <path d="M9 3v5M15 3v5" />
    <path d="M6.4 8h11.2v3.1a5.6 5.6 0 0 1-11.2 0z" />
    <path d="M12 16.7V21" />
  </>),

  /** Four blocks, one being added. Assembling an app. */
  blocks: glyph(<>
    <rect x="3.2" y="3.2" width="7.6" height="7.6" rx="1.2" />
    <rect x="13.2" y="3.2" width="7.6" height="7.6" rx="1.2" />
    <rect x="3.2" y="13.2" width="7.6" height="7.6" rx="1.2" />
    <path d="M17 13.2v7.6M13.2 17h7.6" />
  </>),

  /** A shipping container. Docker, and running things locally. */
  container: glyph(<>
    <rect x="2.6" y="6.8" width="18.8" height="10.4" rx="1.4" />
    <path d="M7.2 6.8v10.4M12 6.8v10.4M16.8 6.8v10.4" />
  </>),

  /** A page with lines. Publications and open government documents. */
  document: glyph(<>
    <path d="M6 3.2h8.2l4.8 4.8v12.8H6z" />
    <path d="M14.2 3.2v4.8H19" />
    <path d="M9 13h7M9 16.6h7" />
  </>),

  /** A storefront awning. Publishing to the app store. */
  store: glyph(<>
    <path d="M3.4 3.8h17.2l1.4 4.3a3 3 0 0 1-5.7 1.2 3 3 0 0 1-5.6 0 3 3 0 0 1-5.7-1.2z" />
    <path d="M5.2 10.6v9.6h13.6v-9.6" />
    <path d="M10 20.2v-5.4h4v5.4" />
  </>),

  /** Three nodes around a hub. A cluster. */
  cluster: glyph(<>
    <circle cx="12" cy="4.8" r="2.2" />
    <circle cx="4.8" cy="17.6" r="2.2" />
    <circle cx="19.2" cy="17.6" r="2.2" />
    <path d="M12 7v3.6" />
    <path d="M11 11.4l-4.8 4.6M13 11.4l4.8 4.6" />
  </>),

  /** Three stages in a row. A pipeline. */
  pipeline: glyph(<>
    <circle cx="5" cy="12" r="2.4" />
    <circle cx="12" cy="12" r="2.4" />
    <circle cx="19" cy="12" r="2.4" />
    <path d="M7.4 12h2.2M14.4 12h2.2" />
  </>),

  /** A clipboard of checked requirements. Specs. */
  spec: glyph(<>
    <rect x="4.8" y="3.6" width="14.4" height="17" rx="2" />
    <path d="M9.2 3.6V2.4h5.6v1.2" />
    <path d="M8.4 10l1.5 1.5 3-3" />
    <path d="M8.4 15.6l1.5 1.5 3-3" />
    <path d="M14.8 10h2.2M14.8 15.6h2.2" />
  </>),

  /** A jigsaw piece. A skill that snaps into an agent. */
  puzzle: glyph(<>
    <path d="M4 4.4h5.6a2.2 2.2 0 1 1 4.4 0h5.6V10a2.2 2.2 0 1 0 0 4.4v5.6h-5.6a2.2 2.2 0 1 0-4.4 0H4v-5.6a2.2 2.2 0 1 0 0-4.4z" />
  </>),

  /** A terminal window with a prompt. Workstation setup. */
  terminal: glyph(<>
    <rect x="3" y="4.2" width="18" height="15.6" rx="2" />
    <path d="M3 8.4h18" />
    <path d="M7 12.4l2.6 2.6L7 17.6" />
    <path d="M12.6 17.6h4.4" />
  </>),

  /** A cylinder stack. Registers and stored data. */
  database: glyph(<>
    <ellipse cx="12" cy="5.8" rx="7" ry="2.8" />
    <path d="M5 5.8v12.4c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V5.8" />
    <path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8" />
  </>),

  /** Books on a shelf. A published catalog. */
  catalog: glyph(<>
    <rect x="3.2" y="4" width="4.6" height="16" rx="1" />
    <rect x="9.4" y="4" width="4.6" height="16" rx="1" />
    <path d="M16.4 5.4l4 1.1-3.4 13-1.9-.5z" />
  </>),

  /** Two endpoints joined by a routed line. Pulling data across. */
  connector: glyph(<>
    <circle cx="5.4" cy="5.8" r="2.5" />
    <circle cx="18.6" cy="18.2" r="2.5" />
    <path d="M7.9 5.8h5.7a4 4 0 0 1 4 4v5.9" />
    <path d="M15.4 13.6l2.2 2.2 2.2-2.2" />
  </>),

  /** A tiled widget grid. Personal dashboards. */
  dashboard: glyph(<>
    <rect x="3.2" y="3.2" width="8" height="6.2" rx="1.2" />
    <rect x="13" y="3.2" width="7.8" height="11" rx="1.2" />
    <rect x="3.2" y="11.4" width="8" height="9.4" rx="1.2" />
    <rect x="13" y="16.2" width="7.8" height="4.6" rx="1.2" />
  </>),

  /** A torn receipt. Invoicing. */
  invoice: glyph(<>
    <path d="M6 3.2h12v17.6l-2.4-1.4-2.4 1.4-2.4-1.4-2.4 1.4L6 20.8z" />
    <path d="M9 8h6M9 11.6h6M9 15.2h3.5" />
  </>),

  /** A wand with a spark. Building without writing code. */
  wand: glyph(<>
    <path d="M3.6 20.4L14.8 9.2" />
    <path d="M13.2 7.6l3.2 3.2" />
    <path d="M18.2 2.6l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" />
  </>),

  /** Two people. A community that meets. */
  community: glyph(<>
    <circle cx="9" cy="7.8" r="3.1" />
    <path d="M3.4 19.4a5.6 5.6 0 0 1 11.2 0" />
    <path d="M16.2 5.4a3.1 3.1 0 0 1 0 5.4" />
    <path d="M17.6 19.4a5.6 5.6 0 0 0-2.3-4.5" />
  </>),

  /** A factory roofline. An app factory. */
  factory: glyph(<>
    <path d="M3 20.6V10.2l5.6 3.6V10.2l5.6 3.6V6l5.8 3.8v10.8z" />
    <path d="M2.4 20.6h19.2" />
  </>),

  /** Code braces. Apps from a single declaration. */
  manifest: glyph(<>
    <path d="M9.4 3.4c-2.1 0-2.1 3.1-2.1 4.7S6.2 10.4 4.6 10.4c1.6 0 2.7 1 2.7 2.6v4.6c0 2.1 0 3.1 2.1 3.1" />
    <path d="M14.6 3.4c2.1 0 2.1 3.1 2.1 4.7s1.1 2.3 2.7 2.3c-1.6 0-2.7 1-2.7 2.6v4.6c0 2.1 0 3.1-2.1 3.1" />
  </>),

  /** A safe with a dial. A zero-knowledge vault. */
  vault: glyph(<>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 7.8V6.4M12 17.6v-1.4M7.8 12H6.4M17.6 12h-1.4" />
  </>),

  /** A robot head. Autonomous agents. */
  robot: glyph(<>
    <rect x="4.2" y="8" width="15.6" height="11.4" rx="2.4" />
    <path d="M12 4.6V8" />
    <circle cx="12" cy="3.4" r="1.3" />
    {dot(9.2, 12.6, 1.1)}
    {dot(14.8, 12.6, 1.1)}
    <path d="M9.6 16.2h4.8" />
  </>),

  /** A painter's palette. Theming and design systems. */
  palette: glyph(<>
    <path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.4 0 2.1-.9 2.1-1.9 0-.8-.6-1.4-.6-2.1 0-.8.7-1.4 1.6-1.4h1.3a4.2 4.2 0 0 0 4.2-4.2c0-4.4-3.9-8-8.6-8z" />
    {dot(8.2, 9.2, 1.05)}
    {dot(12, 7.2, 1.05)}
    {dot(15.9, 9.6, 1.05)}
  </>),

  /** A flask. Evals and measurement. */
  flask: glyph(<>
    <path d="M9.4 3.2v6.4L4.9 18a2.1 2.1 0 0 0 1.8 3.2h10.6a2.1 2.1 0 0 0 1.8-3.2l-4.5-8.4V3.2" />
    <path d="M8.2 3.2h7.6" />
    <path d="M7.1 14.4h9.8" />
  </>),
};

export const HERO_GLYPH_NAMES = Object.keys(HERO_GLYPHS);

/**
 * Look up a glyph by name. Returns null for an absent or unknown name so the
 * caller can fall back to the contentType icon and warn.
 */
export function glyphFor(name) {
  if (!name || typeof name !== 'string') return null;
  return HERO_GLYPHS[name] || null;
}
