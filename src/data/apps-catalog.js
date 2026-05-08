/**
 * apps-catalog.js
 * ---------------
 * The single source of truth for what /apps and the home-page
 * AppsPreview render. Joins live download / version / store data
 * from `data/app-downloads.json` (refreshed weekday mornings by
 * `.github/workflows/app-downloads.yml`) with hand-curated display
 * metadata (taglines, icons, website categories) keyed by the app's
 * GitHub repo slug.
 *
 * Structure:
 *
 *   PRESENTATION   = id → {tagline, icon, categories, href, hidden?, sortKey?}
 *   downloadsJson  = generated, see scripts/app_downloads.py
 *   getApps()      = merged list for AppsGrid / AppsPreview, sorted by
 *                    install count descending; entries that aren't in
 *                    the store and have no downloads are filtered out
 *                    so scaffold repos (app-template, app_versions)
 *                    don't surface on the public site.
 *
 * Adding a new app: drop a row into PRESENTATION below. The next
 * GitHub-Actions refresh will fill in the live numbers automatically.
 */

import React from 'react';
import downloadsJson from '../../data/app-downloads.json';

/* Hand-curated display metadata. Keys are the GitHub repo slug
   (matches `apps[].id` in app-downloads.json). Names and `href`
   (productHref) here are also mirrored in the apps-registry shipped
   from @conduction/docusaurus-preset/data/apps-registry, which is the
   URL-only source of truth consumed by <AppCrossLinks/> and the
   academy product filter. When you add or rename an app, update
   both. */
const PRESENTATION = {
  opencatalogi: {
    name: 'OpenCatalogi',
    tagline: 'Public software catalog. Every app, dataset, API in your organisation, searchable in one place.',
    href: '/apps/opencatalogi',
    categories: ['Data'],
    icon: <svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg>,
  },
  openregister: {
    name: 'OpenRegister',
    tagline: 'Schemas, registers, structured data objects, the typed-data backbone for every app.',
    href: '/apps/openregister',
    categories: ['Data'],
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16"/></svg>,
  },
  openconnector: {
    name: 'OpenConnector',
    tagline: <>Connect <span className="next-blue">Nextcloud</span> to anything, REST, SOAP, GraphQL, file drops, message queues.</>,
    href: '/apps/openconnector',
    categories: ['Connectors'],
    icon: <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 12h9M9 12l9-6M9 12l9 6"/></svg>,
  },
  docudesk: {
    name: 'DocuDesk',
    tagline: 'Auto-classify, anonymise, and route inbound documents. Drop them in a folder, get them filed.',
    href: '/apps/docudesk',
    categories: ['Documents'],
    icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  },
  mydash: {
    name: 'MyDash',
    tagline: 'Personal and team dashboards built from your registers, no separate BI tool, no extra login.',
    href: '/apps/mydash',
    categories: ['Dashboards'],
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  },
  openwoo: {
    name: 'OpenWoo',
    tagline: 'WOO-compliant publication flow. Active disclosure, queryable archive, citation-stable URLs.',
    href: '/apps/openwoo',
    categories: ['Processes'],
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
  },
  zaakafhandelapp: {
    name: 'ZaakAfhandelApp',
    tagline: 'Citizen-facing case-status portal. ZGW APIs, archief koppelvlakken, audit trail.',
    href: '/apps/zaakafhandelapp',
    categories: ['Processes'],
    icon: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>,
  },
  pipelinq: {
    name: 'PipelinQ',
    tagline: 'CRM with quotes, contacts, and deal-flow. Built on registers, no separate sales database.',
    href: '/apps/pipelinq',
    categories: ['Processes'],
    icon: <svg viewBox="0 0 24 24"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>,
  },
  procest: {
    name: 'Procest',
    tagline: 'Case-management for VTH and citizen processes. Workflow engine plus typed registers.',
    href: '/apps/procest',
    categories: ['Processes'],
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  },
  decidesk: {
    name: 'DeciDesk',
    tagline: 'Decision-support and board management. Agenda, dossiers, motions, voting, audit.',
    href: '/apps/decidesk',
    categories: ['Processes'],
    icon: <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>,
  },
  softwarecatalog: {
    name: 'SoftwareCatalog',
    tagline: 'IT-asset management, software inventory, licenses, contracts, dependencies.',
    href: '/apps/softwarecatalog',
    categories: ['Data'],
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  },
  larpingapp: {
    name: 'LarpingApp',
    tagline: 'Workflow and process orchestration for live-action role-play events. Visual designer, audit-logged.',
    href: '/apps/larpingapp',
    categories: ['Processes'],
    icon: <svg viewBox="0 0 24 24"><path d="M3 12h6l3-7 3 14 3-7h3"/></svg>,
  },
  nldesign: {
    name: 'NLDesign',
    tagline: 'Drop-in NLDS theme for Nextcloud, with the Conduction component variants on top.',
    href: '/apps/nldesign',
    categories: ['Documents'],
    icon: <svg viewBox="0 0 24 24"><path d="M4 4h16v6H4z"/><path d="M4 14h7v6H4z"/><path d="M14 14h6v6h-6z"/></svg>,
  },
};

/* Categories the website filters by, in the order the chips render. */
export const APP_CATEGORIES = ['All', 'Data', 'Processes', 'Connectors', 'Documents', 'AI', 'Dashboards'];

/* Pick a status label from the version string. The Nextcloud app
   store leaves the latest_version as-is, so "0.7.9-beta.8" reads as
   beta and "1.6.0" reads as stable. Falls back to GitHub's tag when
   store metadata is missing. */
function statusFor(record) {
  const ver = (record.store && record.store.latest_version) || (record.github && record.github.latest_release) || '';
  const v = ver.toLowerCase();
  if (!ver) return 'COMING SOON';
  if (v.includes('beta') || v.includes('alpha') || v.includes('rc')) return 'BETA';
  if (v.startsWith('0.') || v.startsWith('v0.')) return 'BETA';
  return 'STABLE';
}

/* Format the version into a short label "v1.6 · 5,740 installs". */
function versionLabel(record) {
  const raw = (record.store && record.store.latest_version) || (record.github && record.github.latest_release) || '';
  const stripped = raw.replace(/^v/, '').replace(/-(beta|alpha|rc).*$/i, '');
  const short = stripped.split('.').slice(0, 2).join('.');
  const dl = record.github && record.github.downloads;
  const dlLabel = dl && dl > 0 ? `${dl.toLocaleString('en-US')} installs` : null;
  return [short && `v${short}`, dlLabel].filter(Boolean).join(' · ');
}

/* Joined catalogue: hand-curated metadata + live numbers. Apps not in
   PRESENTATION (scaffolds, library repos, ExApp wrappers) are dropped
   so the public surface stays curated. */
export function getApps() {
  const seen = new Set();
  const out = [];
  for (const record of downloadsJson.apps) {
    const meta = PRESENTATION[record.id];
    if (!meta) continue;
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    out.push({
      ...meta,
      status: statusFor(record),
      version: versionLabel(record),
      downloads: (record.github && record.github.downloads) || 0,
    });
  }
  /* Apps in PRESENTATION but not in the JSON yet (e.g. brand-new repos
     before the next workflow run) — surface them with COMING SOON. */
  for (const id of Object.keys(PRESENTATION)) {
    if (seen.has(id)) continue;
    out.push({
      ...PRESENTATION[id],
      status: 'COMING SOON',
      version: '',
      downloads: 0,
    });
  }
  /* Sort: stable apps with most installs first, beta apps next, coming-
     soon last. Keeps the page anchored on what's actually shippable. */
  const statusRank = {STABLE: 0, BETA: 1, 'COMING SOON': 2};
  out.sort((a, b) => {
    const r = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    if (r !== 0) return r;
    return (b.downloads || 0) - (a.downloads || 0);
  });
  return out;
}

/* Convenience: the totals strip ("12 apps in the store · 22,400 installs"). */
export function getCatalogTotals() {
  const apps = getApps();
  const installs = apps.reduce((n, a) => n + (a.downloads || 0), 0);
  return {
    apps: apps.filter(a => a.status !== 'COMING SOON').length,
    installs,
    generatedAt: downloadsJson.generated_at,
  };
}
