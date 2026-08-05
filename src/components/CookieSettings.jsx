/**
 * CookieSettings — the "your current choice" panel on /privacy#cookies.
 *
 * Shows what the visitor has consented to and gives them a way back to
 * the consent banner. Talks to window.ConductionCookieCli, which
 * <CookieCli /> registers from an effect in src/theme/Root.js.
 *
 * Hydration: the stored choice lives in localStorage, which the server
 * render cannot see. Reading it during render would emit server HTML
 * that disagrees with the first client render, so state starts as
 * `undefined` ("not read yet") and an effect settles it. The server and
 * the first client paint therefore agree on the neutral text.
 *
 * The API only exists while CookieCli is mounted; if it is missing we
 * disable the control and say so rather than rendering a dead button.
 *
 * Strings are props so the Dutch page at
 * i18n/nl/docusaurus-plugin-content-pages/privacy.mdx can pass its own
 * copy — this site translates pages by duplicating the MDX, not through
 * the i18n message catalogue.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {COOKIE_CHOICE_EVENT} from '@theme/Root';

export default function CookieSettings({
  heading = 'Your current choice',
  checking = 'Checking your stored preferences…',
  noChoice = 'You haven’t made a choice yet, so only essential cookies are in use.',
  buttonLabel = 'Change your cookie choices',
  unavailable = 'The consent banner couldn’t be reached. Clearing this site’s data in your browser also resets your choice.',
  allowedLabel = 'allowed',
  declinedLabel = 'declined',
}) {
  /* undefined = not read yet (server + first paint), null = read, nothing stored */
  const [choice, setChoice] = useState(undefined);
  const [available, setAvailable] = useState(true);

  const refresh = useCallback(() => {
    const api = typeof window !== 'undefined' ? window.ConductionCookieCli : undefined;
    if (!api) return false;
    setAvailable(true);
    setChoice(api.get());
    return true;
  }, []);

  /* window.ConductionCookieCli is registered by an effect inside
     <CookieCli />, which Root renders *after* {children}. React flushes
     effects in tree order, so on a full page load this panel's effect
     runs first and the global does not exist yet. Deciding "unavailable"
     from that first look shipped a permanently disabled button on every
     direct visit to /privacy — the banner worked fine, the control next
     to it did not. So poll briefly instead of concluding on attempt one,
     and only give up (and say so) once it is clear nothing will arrive. */
  useEffect(() => {
    if (refresh()) return undefined;

    let cancelled = false;
    let attempts = 0;
    let timer;
    const poll = () => {
      if (cancelled) return;
      if (refresh()) return;
      if (attempts++ >= 40) { // ~2s at 50ms
        setAvailable(false);
        setChoice(null);
        return;
      }
      timer = setTimeout(poll, 50);
    };
    timer = setTimeout(poll, 50);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [refresh]);

  /* Re-read whenever the banner records a choice. Without this the panel
     and the banner disagree on screen at the same time: answer the banner
     while standing on /privacy and this panel would still claim no choice
     had been made until the next reload. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onChoice = () => refresh();
    window.addEventListener(COOKIE_CHOICE_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_CHOICE_EVENT, onChoice);
  }, [refresh]);

  const reopen = useCallback(() => {
    const api = typeof window !== 'undefined' ? window.ConductionCookieCli : undefined;
    if (!api) { setAvailable(false); return; }
    api.reset();
    refresh();
  }, [refresh]);

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
        onClick={reopen}
        disabled={!available}
        style={{padding: '10px 18px', background: 'var(--c-blue-cobalt)', color: 'white', border: 'none', borderRadius: 'var(--radius-md, 6px)', fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: available ? 'pointer' : 'not-allowed', opacity: available ? 1 : 0.5}}
      >
        {buttonLabel}
      </button>

      {!available && <p style={{margin: '10px 0 0', fontSize: 13, opacity: 0.75}}>{unavailable}</p>}
    </div>
  );
}
