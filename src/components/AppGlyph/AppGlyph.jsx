import React from 'react';
import styles from './AppGlyph.module.css';

/**
 * Local stand-in for the preset's (currently unpublished) AppGlyph.
 *
 * Paints a token-coloured monogram per Conduction app so the marketing
 * surfaces (/connext, /apps, apps-catalog) build against the published
 * `@conduction/docusaurus-preset`. The preset declares AppGlyph in its
 * dev branch but has not shipped it in any released version (3.22.0 /
 * 3.22.1-beta.1 both omit it), which made the imported symbol resolve
 * to `undefined` and crashed the static render of /connext.
 *
 * Drop this component and re-import AppGlyph from
 * `@conduction/docusaurus-preset/components` once it ships in a stable
 * preset release.
 */

const MONOGRAMS = {
  openregister: 'OR',
  opencatalogi: 'OC',
  openconnector: 'ON',
  docudesk: 'DD',
  nldesign: 'ND',
  launchpad: 'LP',
  'app-versions': 'AV',
  zaakafhandelapp: 'ZA',
  doriath: 'DO',
  pipelinq: 'PQ',
  procest: 'PR',
  decidesk: 'DK',
  shillinq: 'SH',
  larpingapp: 'LA',
  softwarecatalog: 'SC',
  scholiq: 'SK',
  openbuild: 'OB',
  openanonymiser: 'OA',
  hrmq: 'HR',
  planix: 'PX',
  hermiq: 'HQ',
  portaliq: 'PL',
};

function monogram(app) {
  if (MONOGRAMS[app]) return MONOGRAMS[app];
  const parts = String(app).split(/[-_\s]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(app).slice(0, 2).toUpperCase();
}

// Stable hue derived from the slug so each app keeps a consistent colour.
function hueFor(app) {
  let h = 7;
  for (const ch of String(app)) {
    h = (h * 31 + ch.charCodeAt(0)) % 360;
  }
  return h;
}

export default function AppGlyph({ app = '', size = 'sm', className, title }) {
  const label = title || app || 'app';
  return (
    <span
      className={[styles.glyph, styles[size] || styles.sm, className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--g-hue': hueFor(app) }}
      role="img"
      aria-label={label}
      title={label}
    >
      {monogram(app)}
    </span>
  );
}
