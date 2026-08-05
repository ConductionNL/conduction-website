/**
 * Root — app-wide wrapper (Docusaurus swizzle target).
 *
 * Mounts <CookieCli /> once for the whole site. Root is the only theme
 * component that survives client-side navigation, which matters twice
 * over here: the banner must not re-animate on every route change, and
 * CookieCli registers window.ConductionCookieCli from an effect whose
 * cleanup deletes it again on unmount. Mounting anywhere that remounts
 * per route would leave the "change your choices" control on /privacy
 * calling into an undefined global half the time.
 *
 * CookieCli renders null once a choice is stored, so this costs an
 * empty wrapper on every subsequent visit and nothing else.
 *
 * Categories are passed explicitly rather than inherited from the
 * component's defaults. Two reasons: `marketing` (a default category)
 * is wrong for this site — we set no marketing cookies — and the usage
 * example in the design-system docs ships `analytics` with
 * defaultOn: true, which is the opposite of what consent requires.
 * Listing them here makes the opt-in posture reviewable in one place:
 * everything that is not strictly required starts off.
 */

import React, {useCallback} from 'react';
import {CookieCli} from '@conduction/docusaurus-preset/components';

/* Broadcast every saved choice. CookieCli owns the state and writes it
   to localStorage, but localStorage fires no event in the tab that wrote
   it — so the "your current choice" panel on /privacy sat there showing
   "no choice yet" while the banner three lines below it had just been
   answered. CookieSettings listens for this instead. */
export const COOKIE_CHOICE_EVENT = 'conduction:cookie-choice';

/* Order matters: the banner binds number keys 1..n to these in order,
   so the [1] [2] [3] hints in the terminal UI map onto this array. */
const COOKIE_CATEGORIES = [
  {key: 'essential',   label: 'essential',   tag: 'required', required: true, defaultOn: true},
  {key: 'analytics',   label: 'analytics',   tag: 'opt-in',   defaultOn: false},
  {key: 'preferences', label: 'preferences', tag: 'opt-in',   defaultOn: false},
];

export default function Root({children}) {
  const announce = useCallback((selection) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(COOKIE_CHOICE_EVENT, {detail: selection}));
  }, []);

  return (
    <>
      {children}
      <CookieCli siteHost="conduction.nl" categories={COOKIE_CATEGORIES} onAccept={announce} />
    </>
  );
}
