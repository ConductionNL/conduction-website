/**
 * CookieSettings — the "your current choice" panel on /privacy#cookies.
 *
 * Shows what the visitor has consented to and gives them a way to change
 * it by opening the consent banner.
 *
 * It reads localStorage directly rather than going through
 * window.ConductionCookieCli. That API only exists while <CookieCli /> is
 * mounted, and since the banner became on-demand it is absent most of the
 * time. Reading the store directly also removes a race this component
 * used to have: it once concluded "unavailable" on its first look, before
 * the banner had registered its API, and shipped a permanently disabled
 * button on every direct visit to /privacy.
 *
 * Hydration: localStorage is invisible to the server render. Reading it
 * during render would emit server HTML that disagrees with the first
 * client render, so state starts as `undefined` ("not read yet") and an
 * effect settles it. Server and first client paint agree on neutral text.
 *
 * Strings are props so the Dutch page at
 * i18n/nl/docusaurus-plugin-content-pages/privacy.mdx can pass its own
 * copy — this site translates pages by duplicating the MDX, not through
 * the i18n message catalogue.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {COOKIE_CHOICE_EVENT, COOKIE_OPEN_EVENT} from '@theme/Root';

/* Must match STORAGE_KEY inside the preset's CookieCli. */
const STORAGE_KEY = 'conduction:cookie-cli';

function readStored() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null; // private mode, quota, or corrupt JSON
  }
}

export default function CookieSettings({
  heading = 'Your current choice',
  checking = 'Checking your stored preferences…',
  noChoice = 'You haven’t made a choice yet, so only essential cookies are in use.',
  buttonLabel = 'Change your cookie choices',
  allowedLabel = 'allowed',
  declinedLabel = 'declined',
}) {
  /* undefined = not read yet (server + first paint), null = read, nothing stored */
  const [choice, setChoice] = useState(undefined);

  const refresh = useCallback(() => setChoice(readStored()), []);

  useEffect(() => { refresh(); }, [refresh]);

  /* Re-read whenever the banner records a choice, so the panel and the
     banner never disagree on screen at the same time. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onChoice = () => refresh();
    window.addEventListener(COOKIE_CHOICE_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_CHOICE_EVENT, onChoice);
  }, [refresh]);

  const openBanner = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(COOKIE_OPEN_EVENT));
  }, []);

  /* `_ts` is CookieCli's own write timestamp, not a consent category. */
  const rows = choice
    ? Object.keys(choice)
        .filter((key) => key !== '_ts')
        .map((key) => [key, choice[key] ? allowedLabel : declinedLabel])
    : [];

  return (
    <div style={{marginTop: 28, padding: '22px 24px', background: 'var(--c-cobalt-50)', border: '1px solid var(--c-cobalt-100)', borderRadius: 8}}>
      <div style={{fontFamily: 'var(--conduction-typography-font-family-code)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--c-orange-knvb)', marginBottom: 10}}>
        {heading}
      </div>

      {choice === undefined && <p style={{margin: '0 0 14px', fontSize: 14}}>{checking}</p>}
      {choice === null && <p style={{margin: '0 0 14px', fontSize: 14}}>{noChoice}</p>}

      {rows.length > 0 && (
        <dl style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px 24px', margin: '0 0 16px'}}>
          {rows.map(([name, verdict]) => (
            <div key={name} style={{background: 'white', padding: '10px 12px', borderRadius: 4, border: '1px solid var(--c-cobalt-100)', display: 'flex', justifyContent: 'space-between', gap: 12}}>
              <dt style={{fontFamily: 'var(--conduction-typography-font-family-code)', fontSize: 12, fontWeight: 700, color: 'var(--c-cobalt-700)'}}>{name}</dt>
              <dd style={{margin: 0, fontFamily: 'var(--conduction-typography-font-family-code)', fontSize: 12, color: 'var(--c-cobalt-900)'}}>{verdict}</dd>
            </div>
          ))}
        </dl>
      )}

      <button
        type="button"
        onClick={openBanner}
        style={{padding: '10px 18px', background: 'var(--c-blue-cobalt)', color: 'white', border: 'none', borderRadius: 'var(--radius-md, 6px)', fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer'}}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
