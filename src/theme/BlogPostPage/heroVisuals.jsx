/**
 * Hero visuals for academy posts.
 *
 * A post can set `heroVisual: <name>` in its frontmatter to put a
 * component in the featured hero's right-hand column instead of the
 * hex glyph. Mirrors ./heroGlyphs: one registry, an unknown name
 * warns at build time and falls back to the glyph.
 *
 * Registered here rather than in the MDX because the hero is rendered
 * by the page layout, outside the post body.
 *
 * The preset is imported as a namespace and every entry checks its
 * component before using it. A visual usually lands in the preset one
 * release ahead of the site; the guard means the site keeps building
 * against the published preset and simply shows the glyph until the
 * bump, instead of failing the build on an undefined element.
 */

import React from 'react';
import * as presetComponents from '@conduction/docusaurus-preset/components';

const VISUALS = {
  /* La Frankendesk: one Nextcloud, stock on one side of the stitch
     and wearing La Suite's tokens on the other. */
  'theme-seam-lasuite': () => {
    const {ThemeSeamMock} = presetComponents;
    if (!ThemeSeamMock) return null;
    return <ThemeSeamMock app="openregister" theme="lasuite" size="sm" />;
  },
};

export function visualFor(name) {
  if (!name) return null;
  const entry = VISUALS[name];
  if (!entry) return null;
  return entry();
}

export function isKnownVisual(name) {
  return Boolean(VISUALS[name]);
}
