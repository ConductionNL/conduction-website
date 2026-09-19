/**
 * Hidden mini-games for academy posts.
 *
 * A post can set `heroGame: <name>` in its frontmatter to hang a
 * mini-game off the featured hero. Mirrors ./heroVisuals: one
 * registry, an unknown name warns at build time and the hero simply
 * has no game.
 *
 * Registered here rather than in the MDX because the hero is rendered
 * by the page layout, outside the post body, and the game belongs with
 * the way in: you type the word while the top of the post is under
 * your nose, so what comes out should be there too, not somewhere you
 * have to scroll back to.
 *
 * The preset is imported as a namespace and every entry checks its
 * components before using them, for the same reason ./heroVisuals
 * does: a game usually lands in the preset one release ahead of the
 * site, and the site should keep building until the bump.
 */

import React from 'react';
import * as presetComponents from '@conduction/docusaurus-preset/components';

const GAMES = {
  /* La Frankendesk: the monster it is named after goes for a run. It
     comes out when you type what Victor shouts when it works. */
  'monster-run': () => {
    const {HiddenGame, MonsterRun} = presetComponents;
    if (!HiddenGame || !MonsterRun) return null;
    return (
      <HiddenGame id="monster-run" unlock={{kind: 'type', word: 'alive'}}>
        <MonsterRun />
      </HiddenGame>
    );
  },
};

export function gameFor(name) {
  if (!name) return null;
  const entry = GAMES[name];
  if (!entry) return null;
  return entry();
}

export function isKnownGame(name) {
  return Boolean(GAMES[name]);
}
