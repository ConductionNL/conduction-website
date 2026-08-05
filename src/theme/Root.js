/**
 * Root — app-wide wrapper (Docusaurus swizzle target).
 *
 * Owns the cookie consent banner. The banner is **on demand only**: it
 * never appears by itself, not even on a first visit. It opens when the
 * visitor asks for it, from the "Cookies" link in the footer or from the
 * settings panel on /privacy#cookies.
 *
 * That is defensible here because the site sets nothing that needs
 * consent. The only things stored are the visitor's own choice and a
 * display preference. An unprompted consent wall would be asking
 * permission for something we do not do. The cookie policy itself lives
 * on /privacy#cookies; there is deliberately no separate cookie page.
 *
 * Two details worth keeping:
 *
 * 1. The banner is *mounted* only while open. CookieCli hides itself once
 *    a choice is stored, so a permanently mounted instance would render
 *    nothing anyway, and mounting on demand keeps the DOM and the
 *    accessibility tree clean.
 *
 * 2. Each open remounts it under a fresh `key`. CookieCli initialises its
 *    checkbox state once, and its own reset() clears localStorage without
 *    clearing that state — so a reused instance reopens showing whatever
 *    was ticked last time rather than what is actually stored. That is how
 *    `analytics` appeared pre-ticked despite defaulting to off. Remounting
 *    forces it to re-read storage, so the boxes always reflect the real
 *    saved choice, or the essential-only defaults when nothing is saved.
 */

import React, {useState, useCallback, useEffect} from 'react';
import {CookieCli} from '@conduction/docusaurus-preset/components';

/* Ask for the banner. Dispatched by the footer link and by the settings
   panel on /privacy; listened for here. */
export const COOKIE_OPEN_EVENT = 'conduction:cookie-open';

/* Announce a saved choice so the panel on /privacy can re-read it.
   localStorage fires no event in the tab that wrote it, so without this
   the panel and the banner disagree on screen at the same time. */
export const COOKIE_CHOICE_EVENT = 'conduction:cookie-choice';

/* Order matters: the banner binds number keys 1..n to these in order,
   so the [1] [2] [3] hints in the terminal UI map onto this array.
   Everything that is not strictly required starts off. Marketing is
   absent on purpose — we set no marketing or advertising cookies. */
const COOKIE_CATEGORIES = [
  {key: 'essential',   label: 'essential',   tag: 'required', required: true, defaultOn: true},
  {key: 'analytics',   label: 'analytics',   tag: 'opt-in',   defaultOn: false},
  {key: 'preferences', label: 'preferences', tag: 'opt-in',   defaultOn: false},
];

/* The footer link is rendered by the preset's Footer from themeConfig, so
   we cannot attach a handler to it there. Match it by destination
   instead. Both locales point at their own /privacy, and trailingSlash
   puts the slash before the fragment, so match the fragment alone. */
function isCookieLink(anchor) {
  return (anchor.getAttribute('href') || '').endsWith('#cookies');
}

export default function Root({children}) {
  const [openCount, setOpenCount] = useState(0);
  const [open, setOpen] = useState(false);

  const openBanner = useCallback(() => {
    setOpenCount((n) => n + 1);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onOpen = () => openBanner();
    window.addEventListener(COOKIE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_OPEN_EVENT, onOpen);
  }, [openBanner]);

  /* Intercept clicks on any "Cookies" link so it opens the banner instead
     of navigating. Delegated from the document, because the footer is
     re-rendered on every route change. Modified clicks (new tab, middle
     click) are left alone so the link still behaves like a link.

     Capture phase is required, not a preference. The footer renders
     Docusaurus <Link>s, whose router handler is bound on React's root
     container — below `document` in the tree, so it runs first in the
     bubble phase and has already navigated by the time a bubbling
     listener sees the event. Capturing runs us before it. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    function onClick(e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target.closest && e.target.closest('a[href]');
      if (!anchor || !isCookieLink(anchor)) return;
      e.preventDefault();
      e.stopPropagation();
      openBanner();
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [openBanner]);

  /* Force the freshly mounted banner visible.
     CookieCli hides itself whenever a choice is already stored, so once
     the visitor has answered once, mounting it again renders nothing at
     all — reopening from the footer would look broken. Its reset() sets
     decided=false, which reveals it.
     Order is safe: child effects run before the parent's, so CookieCli
     has registered the API and read storage by the time this runs.
     Note reset() also clears the stored choice. That is acceptable here:
     the banner offers no dismiss, so the visitor answers it again, and
     abandoning it leaves the essential-only default, which is what the
     site behaves as anyway. The checkboxes still show the previous
     choice, because the instance read storage on mount. */
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const api = window.ConductionCookieCli;
    if (api) api.reset();
  }, [open, openCount]);

  const announce = useCallback((selection) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COOKIE_CHOICE_EVENT, {detail: selection}));
    }
    /* CookieCli hides itself after a save; drop it so the next open
       remounts cleanly rather than reusing a hidden instance. */
    setOpen(false);
  }, []);

  return (
    <>
      {children}
      {open && (
        <CookieCli
          key={openCount}
          siteHost="conduction.nl"
          categories={COOKIE_CATEGORIES}
          onAccept={announce}
        />
      )}
    </>
  );
}
