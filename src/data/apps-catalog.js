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
import AppGlyph from '@site/src/components/AppGlyph';
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
    icon: <AppGlyph app="opencatalogi" />,
  },
  openregister: {
    name: 'OpenRegister',
    tagline: 'Schemas, registers, structured data objects, the typed-data backbone for every app.',
    href: '/apps/openregister',
    categories: ['Data'],
    icon: <AppGlyph app="openregister" />,
  },
  openconnector: {
    name: 'OpenConnector',
    tagline: <>Connect <span className="next-blue">Nextcloud</span> to anything, REST, SOAP, GraphQL, file drops, message queues.</>,
    href: '/apps/openconnector',
    categories: ['Connectors'],
    icon: <AppGlyph app="openconnector" />,
  },
  docudesk: {
    name: 'DocuDesk',
    tagline: 'Auto-classify, anonymise, and route inbound documents. Drop them in a folder, get them filed.',
    href: '/apps/docudesk',
    categories: ['Documents'],
    icon: <AppGlyph app="docudesk" />,
  },
  openanonymiser: {
    name: 'OpenAnonymiser',
    tagline: 'Dutch-first PII detection as a Nextcloud ExApp. Finds persons, addresses, IBANs, BSNs, case numbers in any text. CPU (Light) and GPU builds, Presidio under the hood.',
    href: 'https://openanonymiser.conduction.nl',
    categories: ['Documents'],
    icon: <AppGlyph app="openanonymiser" />,
  },
  launchpad: {
    name: 'LaunchPad',
    tagline: 'Personal and team dashboards built from your registers, no separate BI tool, no extra login.',
    href: '/apps/launchpad',
    categories: ['Dashboards'],
    icon: <AppGlyph app="launchpad" />,
  },
  zaakafhandelapp: {
    name: 'ZaakAfhandelApp',
    tagline: 'Citizen-facing case-status portal. ZGW APIs, archive interfaces, audit trail.',
    href: '/apps/zaakafhandelapp',
    categories: ['Processes'],
    icon: <AppGlyph app="zaakafhandelapp" />,
  },
  pipelinq: {
    name: 'PipelinQ',
    tagline: 'CRM with quotes, contacts, and deal-flow. Built on registers, no separate sales database.',
    href: '/apps/pipelinq',
    categories: ['Processes'],
    icon: <AppGlyph app="pipelinq" />,
  },
  procest: {
    name: 'Procest',
    tagline: 'Case-management for VTH and citizen processes. Workflow engine plus typed registers.',
    href: '/apps/procest',
    categories: ['Processes'],
    icon: <AppGlyph app="procest" />,
  },
  decidesk: {
    name: 'DeciDesk',
    tagline: 'Decision-support and board management. Agenda, dossiers, motions, voting, audit.',
    href: '/apps/decidesk',
    categories: ['Processes'],
    icon: <AppGlyph app="decidesk" />,
  },
  softwarecatalog: {
    name: 'SoftwareCatalog',
    tagline: 'IT-asset management, software inventory, licenses, contracts, dependencies.',
    href: '/apps/softwarecatalog',
    categories: ['Data'],
    icon: <AppGlyph app="softwarecatalog" />,
  },
  larpingapp: {
    name: 'LarpingApp',
    tagline: 'Workflow and process orchestration for live-action role-play events. Visual designer, audit-logged.',
    href: '/apps/larpingapp',
    categories: ['Processes'],
    icon: <AppGlyph app="larpingapp" />,
  },
  scholiq: {
    name: 'Scholiq',
    tagline: 'Learning record + LMS. Courses, enrolments, certificates, compliance training.',
    href: '/apps/scholiq',
    categories: ['Processes'],
    icon: <AppGlyph app="scholiq" />,
  },
  nldesign: {
    name: 'NLDesign',
    tagline: 'Drop-in NLDS theme for Nextcloud, with the Conduction component variants on top.',
    href: '/apps/nldesign',
    categories: ['Documents'],
    icon: <AppGlyph app="nldesign" />,
  },
  shillinq: {
    name: 'Shillinq',
    tagline: 'Business administration on Nextcloud. Invoices, contracts, procurement on shared registers.',
    href: '/apps/shillinq',
    categories: ['Processes'],
    icon: <AppGlyph app="shillinq" />,
  },
  openbuild: {
    name: 'OpenBuild',
    tagline: 'Citizen-developer app builder. Compose Nextcloud apps from registers, connectors, workflows, no PHP.',
    href: '/apps/openbuild',
    categories: ['Processes'],
    icon: <AppGlyph app="openbuild" />,
  },
  doriath: {
    name: 'Doriath',
    tagline: 'Self-hosted password and secrets vault. Per-user, per-team, audited. In development.',
    href: '/apps/doriath',
    categories: ['Connectors'],
    icon: <AppGlyph app="doriath" />,
  },
  'app-versions': {
    name: 'App Versions',
    tagline: 'Pin and roll back any Nextcloud app version. Multi-source picker, audit-trailed. In development.',
    href: '/apps/app-versions',
    categories: ['Data'],
    icon: <AppGlyph app="app-versions" />,
  },
};

/* Categories the website filters by, in the order the chips render. */
export const APP_CATEGORIES = ['All', 'Data', 'Processes', 'Connectors', 'Documents', 'AI', 'Dashboards'];

/* Site-wide app-count constants — the single source of truth for "we ship N apps".
   APP_COUNT is the size of the PRESENTATION map (every Conduction app, including
   in-development ones). Use this in copy instead of hardcoding a digit or word,
   so the headline number stays in sync with the registry. INTEGRATED_COUNT is the
   number of third-party tools we surface in the External-tools shelf on /connext;
   ECOSYSTEM_COUNT is the headline "apps in the diagram" total used as the page
   title. Update INTEGRATED_COUNT whenever the shelf changes. */
export const APP_COUNT = Object.keys(PRESENTATION).length;
export const INTEGRATED_COUNT = 14;
export const ECOSYSTEM_COUNT = APP_COUNT + INTEGRATED_COUNT;

/* Combined GitHub (legacy) + Codeberg (live) download total across every
   app, straight from the generated totals block. This is the number the
   homepage StatsStrip renders. Sourced from the website's own local JSON
   because the preset's `totalDownloads` export can't read the data file
   once the package is installed into a consumer site (the import path
   resolves outside the package and falls back to 0). */
export const TOTAL_DOWNLOADS = (downloadsJson.totals && downloadsJson.totals.downloads) || 0;

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
  const dl = record.downloads_total != null
    ? record.downloads_total
    : (record.github && record.github.downloads);
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
      downloads: record.downloads_total != null
        ? record.downloads_total
        : ((record.github && record.github.downloads) || 0),
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

/* Convenience: the totals strip ("N apps in the store · M installs"). */
export function getCatalogTotals() {
  const apps = getApps();
  const installs = apps.reduce((n, a) => n + (a.downloads || 0), 0);
  return {
    apps: apps.filter(a => a.status !== 'COMING SOON').length,
    installs,
    generatedAt: downloadsJson.generated_at,
  };
}
