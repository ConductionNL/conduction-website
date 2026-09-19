import React, {useState, useEffect} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

/**
 * Whether the configured endpoint can actually be POSTed to from the page the
 * visitor is on. This can only be answered in the browser: the failure mode
 * depends on the *page's* protocol, which the static build does not know.
 *
 * An https page cannot POST to an http endpoint — the browser blocks it as
 * mixed content — and `localhost` is the visitor's own machine, not ours.
 * Either way the request can only fail, so we must not pretend to accept the
 * form. That is exactly what shipping the dev-default endpoint to production
 * did: every visitor to conduction.nl saw the email fallback below, because
 * PIPELINQ_ENQUIRY_ENDPOINT was never set in the deploy workflow.
 *
 * @param {string|undefined} endpoint Configured enquiry-intake URL.
 * @return {boolean} true when a submit could plausibly reach a server.
 */
function isEndpointUsable(endpoint) {
  if (!endpoint) return false;
  try {
    const url = new URL(endpoint, window.location.href);
    return !(window.location.protocol === 'https:' && url.protocol !== 'https:');
  } catch {
    return false;
  }
}

/**
 * EnquiryForm — wraps a plain <form> and submits it to Pipelinq's public
 * intake endpoint, which stores it as an `enquiry` object.
 *
 * It does NOT post to OpenRegister's generic object API, and it used to. That
 * matters for a reason the URL does not show: OpenRegister cannot scope WHICH
 * properties a public create may set, so posting straight at the object API
 * let a visitor set the enquiry's own `status` and `handledBy`. Pipelinq's
 * endpoint whitelists the nine fields a submitter may send and owns the rest.
 *
 * The request is sent as `application/x-www-form-urlencoded` on purpose: that
 * is a CORS "simple request", so the browser skips the preflight OPTIONS that
 * would otherwise need its own route. The endpoint reflects the Origin back so
 * this cross-origin POST can read the result.
 *
 * Field mapping: `firstName`/`lastName` join into `contactName`, `company` and
 * `organisation` both become `organisation`, `email` becomes `contactEmail`,
 * `phone` becomes `contactPhone`, and `message` is kept verbatim. Every other
 * non-empty field is appended to the message body as a "Label: value" line, so
 * nothing the visitor typed is lost.
 *
 * @param {string}   source       Intake source tag. Must be on Pipelinq's allowlist.
 * @param {Function} buildTitle   (fields) => string, the enquiry title.
 * @param {string}   successText  Message shown after a successful submit.
 */
export default function EnquiryForm({source, buildTitle, successText, children, ...formProps}) {
  const {siteConfig, i18n} = useDocusaurusContext();
  const endpoint = siteConfig.customFields?.pipelinqEnquiryEndpoint;
  const [state, setState] = useState('idle'); // idle | sending | success | error

  // Assume usable for the server render and the first client render so the two
  // agree — resolving this during render instead would hydrate a different tree
  // than the server emitted. The effect then settles it once `window` exists.
  const [usable, setUsable] = useState(true);
  useEffect(() => setUsable(isEndpointUsable(endpoint)), [endpoint]);

  const KNOWN = new Set(['firstName', 'lastName', 'company', 'email', 'phone', 'organisation', 'message', 'website']);
  const LABELS = {
    sector: 'Sector', apps: 'Apps', tier: 'Tier', deployments: 'Production deployments',
    reference: 'Reference', country: 'Country',
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (state === 'sending') return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    const contactName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    const organisation = data.organisation || data.company || '';

    // Fold any extra fields into the message so nothing is dropped.
    const extras = Object.keys(data)
      .filter((k) => !KNOWN.has(k) && data[k])
      .map((k) => `${LABELS[k] || k}: ${data[k]}`);
    const message = [data.message, extras.length ? extras.join('\n') : '']
      .filter(Boolean).join('\n\n');

    const payload = new URLSearchParams();
    payload.set('source', source || 'website-contact');
    payload.set('title', buildTitle ? buildTitle(data) : (contactName || organisation || 'Website enquiry'));
    if (contactName) payload.set('contactName', contactName);
    if (data.email) payload.set('contactEmail', data.email);
    if (data.phone) payload.set('contactPhone', data.phone);
    if (organisation) payload.set('organisation', organisation);
    if (message) payload.set('message', message);
    // Context the visitor did not have to type, and which tells sales what they
    // were reading and which language to answer in.
    payload.set('pageUrl', typeof window !== 'undefined' ? window.location.href : '');
    payload.set('locale', i18n?.currentLocale || '');
    // The honeypot travels as the submitter typed it, which for a human is
    // empty. Pipelinq refuses a non-empty one.
    payload.set('website', data.website || '');

    setState('sending');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: payload.toString(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState('success');
      form.reset();
    } catch (err) {
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div {...formProps}>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--conduction-typography-font-family-code)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--c-orange-knvb)', marginBottom: 12}}>
          <span style={{width: 10, height: 12, clipPath: 'var(--hex-pointy-top)', background: 'var(--c-orange-knvb)'}}></span>
          Received
        </div>
        <h3 style={{fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1.2}}>Thanks, we've got it.</h3>
        <p style={{fontSize: 14, lineHeight: 1.55, margin: 0, opacity: 0.8}}>
          {successText || "We'll be in touch shortly."}
        </p>
      </div>
    );
  }

  // No usable endpoint (e.g. deployed without PIPELINQ_ENQUIRY_ENDPOINT, so the
  // build fell back to the localhost dev default). Say so up front and offer a
  // route that works, rather than accepting the form and failing on submit.
  if (!usable) {
    return (
      <form {...formProps} onSubmit={(e) => e.preventDefault()}>
        {children}
        <p style={{fontSize: 13, lineHeight: 1.55, margin: '12px 0 0', opacity: 0.8}}>
          Online submission isn't available right now. Please email{' '}
          <a href="mailto:info@conduction.nl" style={{color: 'inherit', fontWeight: 600}}>info@conduction.nl</a>{' '}
          and we'll pick it up from there.
        </p>
      </form>
    );
  }

  return (
    <form {...formProps} onSubmit={onSubmit}>
      {children}
      {/* Honeypot. Hidden from people, left empty by them, filled by bots that
          complete every input they find. Not `display:none`: some bots skip
          those, so it is taken out of flow and out of the tab order instead. */}
      <div aria-hidden="true" style={{position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden'}}>
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state === 'error' && (
        <p role="alert" style={{fontSize: 13, color: 'var(--c-orange-knvb)', margin: '12px 0 0', fontWeight: 600}}>
          Something went wrong sending your request. Please try again or email info@conduction.nl.
        </p>
      )}
    </form>
  );
}
