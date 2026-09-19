/**
 * TEMPORARY Navbar swizzle — mobile navigation.
 *
 * @conduction/docusaurus-preset 3.37.0 ships a navbar with no mobile
 * treatment at all: below 900px its own stylesheet only sets
 * `flex-wrap: wrap`, so all five section links, the locale dropdown
 * and the Install CTA reflow onto stacked rows on a phone (its CSS
 * carries the matching "TODO: hamburger menu" note). The fix lives
 * upstream in design-system/docusaurus-preset; this file carries it on
 * conduction.nl until a preset release with the mobile navbar is
 * published and this site is bumped to it.
 *
 * DELETE THIS DIRECTORY when package.json moves to the preset version
 * that includes the navbar drawer. Nothing here is site-specific by
 * intent — it is the upstream component, minus the pieces that cannot
 * cross the package boundary (see below).
 *
 * Differences from the upstream component, forced by the preset's
 * `exports` map — `src/theme/brand.jsx` and the icon primitives are
 * not exported subpaths, so they cannot be imported from a consuming
 * site:
 *
 *   • SUB_BRANDS (ConNext / Common Ground wordmarks) is inlined below.
 *   • The hamburger and close glyphs are inlined below.
 *   • The `custom-github`, `custom-apiDocs` and `custom-versionPill`
 *     item types are NOT handled: they need the preset's icon set and
 *     this site's navbar config uses none of them. An item of those
 *     types falls through to the plain-link branch. If one is ever
 *     added to docusaurus.config.js while this swizzle is in place,
 *     that is the reason it renders bare.
 *
 * Everything else — desktop layout, wordmark rules, home-link
 * behaviour, active states — is byte-for-byte the upstream logic, so
 * removing this directory restores exactly what the preset renders.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useThemeConfig} from '@docusaurus/theme-common';
import {translate} from '@docusaurus/Translate';
import LocaleDropdownNavbarItem from '@theme/NavbarItem/LocaleDropdownNavbarItem';
import styles from './styles.module.css';

/**
 * Width at which the navbar swaps the inline link row for the
 * hamburger + drawer. Kept in sync by hand with the `@media` block in
 * styles.module.css — the JS needs it too, to close a drawer that is
 * still open when the viewport grows back past the breakpoint, which
 * would otherwise leave a full-screen overlay stuck over a desktop
 * layout with no visible way out.
 */
const MOBILE_BREAKPOINT = 900;

/**
 * Sub-brand wordmarks. Mirrors the preset's src/theme/brand.jsx — the
 * hub hosts ConNext and Common Ground vanity sections at /connext and
 * /commonground (plus their /nl twins), and the navbar wordmark
 * switches to the sub-brand's mark while the visitor is inside one.
 */
const SUB_BRANDS = [
  {
    name: 'connext',
    match: /^(?:\/nl)?\/connext(?:\/|$)/,
    home: '/connext',
    label: 'ConNext',
    wordmark: (
      <>
        Con<span className="next-blue">Next</span>
      </>
    ),
  },
  {
    name: 'commonground',
    match: /^(?:\/nl)?\/commonground(?:\/|$)/,
    home: '/commonground',
    label: 'Common Ground+',
    wordmark: (
      <>
        <span className="cg-plus-common">Common</span>{' '}
        <span className="cg-yellow">Ground</span>
        <span className="cg-plus-plus">+</span>
      </>
    ),
  },
];

function brandFor(pathname, title) {
  for (const b of SUB_BRANDS) {
    if (b.match.test(pathname)) return {...b, source: 'path'};
  }
  if (title) {
    for (const b of SUB_BRANDS) {
      if (b.label === title) return {...b, source: 'title'};
    }
  }
  return null;
}

/* Hamburger + close, 24×24 stroke glyphs sharing one 2px weight so the
   button keeps the same optical mass when it swaps one for the other. */
const MENU_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </svg>
);

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

/** Shared active-route test for internal links (navbar row + drawer). */
function isActiveRoute(to, location) {
  return !!to && (location?.pathname === to ||
                  location?.pathname?.startsWith(to + '/'));
}

/** Navbar-row rendering of one themeConfig.navbar item. */
function NavItem({item, location}) {
  if (item.type === 'localeDropdown') {
    return (
      <div className={styles.localeWrapper}>
        <LocaleDropdownNavbarItem mobile={false} {...item} />
      </div>
    );
  }

  /* External link, no React-router prefetch */
  if (item.href && !item.to) {
    const isCta = item.cta === true;
    return (
      <a
        href={item.href}
        className={isCta ? styles.cta : styles.ghost}
        target={item.href.startsWith('http') ? '_blank' : undefined}
        rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {item.label}{isCta && ' →'}
      </a>
    );
  }

  /* Internal route */
  if (item.to) {
    const isCta = item.cta === true;
    const isActive = isActiveRoute(item.to, location);
    return (
      <Link
        to={item.to}
        className={
          isCta
            ? styles.cta
            : `${styles.link} ${isActive ? styles.linkActive : ''}`
        }
      >
        {item.label}{isCta && ' →'}
      </Link>
    );
  }

  return null;
}

/**
 * Drawer rendering of the same item: section links become full-width
 * rows, CTAs become full-width buttons at the foot of the panel, and
 * the locale switcher uses Docusaurus's own collapsible mobile
 * dropdown.
 *
 * `onNavigate` closes the drawer. Internal <Link>s need it explicitly:
 * the route effect in Navbar() closes on a pathname change, but a link
 * to the page you are already on changes nothing to react to.
 */
function DrawerItem({item, location, onNavigate}) {
  if (item.type === 'localeDropdown') {
    /* Docusaurus's mobile dropdown renders an <li> and relies on
       Infima's `menu__*` classes, so it needs a <ul class="menu__list">
       to sit in. `onClick` is forwarded to the locale entries so
       picking a language closes the drawer. */
    return (
      <ul className={`menu__list ${styles.drawerLocale}`}>
        <LocaleDropdownNavbarItem mobile {...item} onClick={onNavigate} />
      </ul>
    );
  }

  const isCta = item.cta === true;

  if (item.href && !item.to) {
    return (
      <a
        href={item.href}
        className={isCta ? styles.drawerCta : styles.drawerGhost}
        target={item.href.startsWith('http') ? '_blank' : undefined}
        rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        onClick={onNavigate}
      >
        {item.label}{isCta && ' →'}
      </a>
    );
  }

  if (item.to) {
    const isActive = isActiveRoute(item.to, location);
    return (
      <Link
        to={item.to}
        className={
          isCta
            ? styles.drawerCta
            : `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`
        }
        aria-current={isActive && !isCta ? 'page' : undefined}
        onClick={onNavigate}
      >
        {item.label}{isCta && ' →'}
      </Link>
    );
  }

  return null;
}

export default function Navbar() {
  const {navbar} = useThemeConfig();
  const location = useLocation();
  const items = navbar.items || [];
  const brand = brandFor(location.pathname, navbar.title);

  /* Drawer state. Starts closed on server and client alike so the
     first client render matches the SSR'd HTML; anything derived from
     `window` here would hydrate-mismatch. */
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef(null);
  const drawerRef = useRef(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  /* Close on route change. A <Link> inside the drawer swaps the page
     underneath without unmounting the navbar, so without this the
     panel would stay parked over the page the visitor just asked for. */
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  /* While open: lock the page behind the panel, close on Escape, and
     keep Tab inside it. The overlay is opaque and full-screen, so a
     focus ring wandering onto the page behind would be invisible — a
     keyboard visitor would be tabbing through links they cannot see. */
  useEffect(() => {
    if (!menuOpen) return undefined;

    const {body} = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        burgerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    /* Grow past the breakpoint with the panel open (rotation, a
       widened desktop window) and the hamburger that opened it is gone
       — drop the overlay rather than trapping the visitor under it. */
    const media = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT + 1}px)`);
    const onMediaChange = (event) => { if (event.matches) closeMenu(); };

    document.addEventListener('keydown', onKeyDown);
    media.addEventListener('change', onMediaChange);
    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      media.removeEventListener('change', onMediaChange);
    };
  }, [menuOpen, closeMenu]);

  const wordmark = brand ? brand.wordmark : navbar.title;

  /* Path-match: keep the visitor in the sub-brand section on logo click.
     Title-match (the site's primary brand IS a sub-brand): logo goes to
     site root since the section IS the site. */
  const homeHref = brand?.source === 'path' ? brand.home : '/';

  /* `useBaseUrl` resolves the src against the site's configured
     baseUrl — without it, a relative `img/logo.svg` resolves against
     the current page's path and 404s on every sub-route. */
  const logoSrcRaw = navbar.logo?.src;
  const logoSrc = useBaseUrl(logoSrcRaw || '');
  const logoAlt = navbar.logo?.alt || translate(
    {id: 'preset.navbar.logoAlt', message: '{title} avatar', description: 'Default alt text for the navbar logo. {title} is the site title.'},
    {title: navbar.title},
  );

  /* Items default to the left unless they explicitly carry
     position="right". */
  const RIGHT_TYPES = new Set(['localeDropdown']);
  const leftItems = items.filter(i => i.position !== 'right' && !RIGHT_TYPES.has(i.type));
  const rightItems = items.filter(i => i.position === 'right' || RIGHT_TYPES.has(i.type));

  /* The drawer orders the right-hand chrome differently from the
     navbar row: the Install CTA and other action links become
     full-width buttons under the thumb, while the locale switcher
     drops into a quieter strip below them. */
  const META_TYPES = new Set(['localeDropdown']);
  const drawerActions = rightItems.filter(i => !META_TYPES.has(i.type));
  const drawerMeta = rightItems.filter(i => META_TYPES.has(i.type));

  const logo = logoSrcRaw ? (
    <img
      src={logoSrc}
      alt={logoAlt}
      className={styles.wordmarkIcon}
      width="32"
      height="32"
    />
  ) : null;

  return (
    /* `navbar` (Docusaurus's framework class) is added alongside the
       brand styles.nav so the internal scroll-anchor offset query
       `document.querySelector('.navbar').clientHeight` resolves. */
    <>
      <nav className={`navbar ${styles.nav}`} role="navigation" aria-label="Main">
        <div className={styles.left}>
          <Link to={homeHref} className={styles.wordmark}>
            {logo}
            <span className={styles.wordmarkText}>{wordmark}</span>
          </Link>
          <div className={styles.links}>
            {leftItems.map((item, i) => (
              <NavItem key={i} item={item} location={location} />
            ))}
          </div>
        </div>
        <div className={styles.ctas}>
          {rightItems.map((item, i) => (
            <NavItem key={i} item={item} location={location} />
          ))}
        </div>
        <button
          ref={burgerRef}
          type="button"
          className={styles.burger}
          aria-label={translate({id: 'preset.navbar.menu.open', message: 'Open menu', description: 'Accessible label for the button that opens the mobile navigation drawer'})}
          aria-expanded={menuOpen}
          aria-controls="conduction-navbar-drawer"
          onClick={() => setMenuOpen(true)}
        >
          <span className={styles.burgerGlyph} aria-hidden="true">{MENU_ICON}</span>
        </button>
      </nav>

      {menuOpen && (
        /* Sibling of <nav>, not a child: the nav is a sticky, z-indexed
           stacking context, and a fixed overlay nested inside it would
           be confined to that context — layered against the navbar's
           own neighbours instead of over the whole page. */
        <div
          id="conduction-navbar-drawer"
          ref={drawerRef}
          className={styles.drawer}
          role="dialog"
          aria-modal="true"
          aria-label={translate({id: 'preset.navbar.menu.label', message: 'Site menu', description: 'Accessible label for the mobile navigation drawer'})}
        >
          <div className={styles.drawerHeader}>
            <Link to={homeHref} className={styles.wordmark} onClick={closeMenu}>
              {logo}
              <span className={styles.wordmarkText}>{wordmark}</span>
            </Link>
            {/* Focus lands here on open: the first stop inside the
                panel, and the way straight back out for anyone who
                opened it by accident. */}
            <button
              type="button"
              className={styles.burger}
              aria-label={translate({id: 'preset.navbar.menu.close', message: 'Close menu', description: 'Accessible label for the button that closes the mobile navigation drawer'})}
              onClick={() => { closeMenu(); burgerRef.current?.focus(); }}
              autoFocus
            >
              <span className={styles.burgerGlyph} aria-hidden="true">{CLOSE_ICON}</span>
            </button>
          </div>

          <div className={styles.drawerBody}>
            {leftItems.length > 0 && (
              <div className={styles.drawerLinks}>
                {leftItems.map((item, i) => (
                  <DrawerItem key={i} item={item} location={location} onNavigate={closeMenu} />
                ))}
              </div>
            )}

            {drawerActions.length > 0 && (
              <div className={styles.drawerActions}>
                {drawerActions.map((item, i) => (
                  <DrawerItem key={i} item={item} location={location} onNavigate={closeMenu} />
                ))}
              </div>
            )}

            {drawerMeta.length > 0 && (
              <div className={styles.drawerMeta}>
                {drawerMeta.map((item, i) => (
                  <DrawerItem key={i} item={item} location={location} onNavigate={closeMenu} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
