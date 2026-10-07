/**
 * <PageHeading /> — the level-one heading a page is missing.
 *
 * Several pages open on a <SectionHead>, which renders an <h2>, so the
 * document has no <h1> at all. Screen-reader users navigate by heading
 * level and start at level one; search engines weight h1. A document whose
 * highest heading is an h2 is a real defect (WCAG 1.3.1 Info and
 * Relationships), not a stylistic quirk.
 *
 * This renders the heading visually hidden rather than on screen. The
 * alternative, promoting each page's first SectionHead to an h1, needs a
 * `level` prop on that component, which lives in @conduction/docusaurus-preset
 * and cannot be released right now. Adding a *visible* h1 instead would
 * change the design of a dozen public pages, which is a decision for a
 * designer rather than a side effect of an accessibility fix.
 *
 * So the visuals stay exactly as they are and the document gains the
 * heading it always should have had. When SectionHead grows a heading
 * level, replace these with that and delete this component.
 *
 * The text should match what the page visually presents as its title, so
 * the hidden heading and the visible one tell the same story.
 *
 * Not `display: none` and not `visibility: hidden`: both remove the element
 * from the accessibility tree, which would defeat the entire point. The
 * clip-rect pattern below keeps it available to assistive technology while
 * taking no visual space.
 */

import React from 'react';

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function PageHeading({children}) {
  return <h1 style={visuallyHidden}>{children}</h1>;
}
