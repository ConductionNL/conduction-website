/**
 * Conduction-flavoured top-level error fallback.
 *
 * Wraps the same dyke-break scene we use in ErrorPageContent. The
 * difference between the two boundaries: ErrorPageContent fires when
 * something crashes INSIDE the page Layout (the common case — almost
 * every route is inside Layout); this <Error /> fires when something
 * crashes around or above Layout (router setup, top-level providers).
 * Routing both to the same visual + copy means a crash anywhere on the
 * site lands the visitor on the dyke, not on Docusaurus's stock
 * "Page Error" page.
 *
 * Implementation cribs the structure from the upstream theme-fallback
 * Error: we keep the RouteContextProvider + secondary ErrorBoundary so
 * Layout itself can crash without dropping the user into a white page.
 * Only the visible <ErrorDisplay /> swaps for our dyke component.
 */

import React from 'react';
import Head from '@docusaurus/Head';
import ErrorBoundary from '@docusaurus/ErrorBoundary';
import Translate, {translate} from '@docusaurus/Translate';
import Layout from '@theme/Layout';
import ErrorPageContent from '@theme/ErrorPageContent';
/* Internal: the upstream theme-fallback Error wraps its content in
   RouteContextProvider so theme-classic doesn't crash from missing
   route context when Layout queries useRouteContext. Mirroring that
   from the original implementation. The path is internal, but stable
   since Docusaurus 3.0. */
import {RouteContextProvider} from '@docusaurus/core/lib/client/routeContext';

/* Minimal safe fallback. If Layout itself crashes, we lose the navbar
   + footer chrome but still want the dyke copy. We can't import the
   full ErrorPageContent here (it may have been what crashed Layout in
   the first place), so render an inline stripped-down version. */
function BareErrorDisplay({error, tryAgain}) {
  const message = error && (error.message || String(error)) || 'Unknown error';
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '48px 24px',
      fontFamily: 'system-ui, sans-serif',
      background: '#f4f7fb',
      color: '#0a2540',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#f47b20', margin: '0 0 12px',
      }}>
        <Translate id="theme.error.eyebrow" description="Eyebrow above the error-page heading; idiom about plugging a leak">
          Finger in the dyke
        </Translate>
      </p>
      <h1 style={{fontSize: 32, fontWeight: 700, margin: '0 0 16px'}}>
        <Translate id="theme.error.title" description="Main heading on the error fallback page">
          Oh, no. Something broke.
        </Translate>
      </h1>
      <p style={{fontSize: 16, color: '#3d4f6e', maxWidth: 480, margin: '0 0 24px', lineHeight: 1.5}}>
        <Translate id="theme.error.body" description="Reassurance paragraph below the error heading">
          We are dispatching a team with duct tape right now. Please try again in a moment, or take a different route.
        </Translate>
      </p>
      <button type="button" onClick={tryAgain} style={{
        background: '#0a2540', color: 'white', border: 'none',
        padding: '12px 24px', borderRadius: 999, fontSize: 15,
        fontWeight: 600, cursor: 'pointer',
      }}>
        <Translate id="theme.error.retry" description="Label of the retry button on the error page">
          Try again
        </Translate>
      </button>
      <details style={{marginTop: 32, fontFamily: 'monospace', fontSize: 11, color: '#3d4f6e', maxWidth: 640}}>
        <summary style={{cursor: 'pointer'}}>
          <Translate id="theme.error.details" description="Disclosure label above the raw error message">
            What technically went wrong
          </Translate>
        </summary>
        <pre style={{whiteSpace: 'pre-wrap', textAlign: 'left', marginTop: 12}}>{message}</pre>
      </details>
    </div>
  );
}

export default function Error({error, tryAgain}) {
  return (
    <RouteContextProvider value={{
      plugin: {name: 'docusaurus-core-error-boundary', id: 'default'},
    }}>
      <ErrorBoundary fallback={() => <BareErrorDisplay error={error} tryAgain={tryAgain} />}>
        <Head>
          <title>{translate({
            id: 'theme.error.pageTitle',
            message: 'Something broke · Conduction',
            description: 'HTML <title> on the error fallback page',
          })}</title>
        </Head>
        <Layout>
          <ErrorPageContent error={error} tryAgain={tryAgain} />
        </Layout>
      </ErrorBoundary>
    </RouteContextProvider>
  );
}
