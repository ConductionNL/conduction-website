/**
 * sidecars-catalog.js
 * -------------------
 * Hand-curated display metadata for ExApp sidecars. Mirrors the shape
 * of apps-catalog.js but lives in its own file so the /apps grid
 * stays focused on apps we build, not apps we wrap.
 *
 * Keys are the GitHub repo slug (matches `apps[].id` in
 * `data/app-downloads.json`). URLs are mirrored in the sidecars-
 * registry shipped from `@conduction/docusaurus-preset/data/sidecars-
 * registry`; when you add or rename a sidecar update both.
 *
 * Adding a new sidecar: drop a row into PRESENTATION below plus a
 * product page at `src/pages/sidecars/<slug>.mdx`.
 */

import React from 'react';
import downloadsJson from '../../data/app-downloads.json';

const PRESENTATION = {
  openklant: {
    name: 'OpenKlant',
    tagline: 'Sidecar that wraps the OpenKlant citizen-contact register. ZGW-compatible, installed from Nextcloud.',
    href: '/sidecars/openklant',
    categories: ['Registers'],
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  },
  openzaak: {
    name: 'OpenZaak',
    tagline: 'Sidecar for the OpenZaak case-management API. Koppelvlakken voor ZGW, vanuit Nextcloud.',
    href: '/sidecars/openzaak',
    categories: ['Registers'],
    icon: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>,
  },
  valtimo: {
    name: 'Valtimo',
    tagline: 'Sidecar for the Valtimo BPMN engine. Workflow orchestration alongside the registers.',
    href: '/sidecars/valtimo',
    categories: ['Workflow'],
    icon: <svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v6a3 3 0 0 0 3 3h6"/></svg>,
  },
  'n8n-nextcloud': {
    name: 'n8n',
    tagline: 'Sidecar for n8n. Visual workflow automation, installed as a Nextcloud app.',
    href: '/sidecars/n8n',
    categories: ['Workflow'],
    icon: <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3M12 7v3M12 14v3"/></svg>,
  },
  keycloak: {
    name: 'Keycloak',
    tagline: 'Sidecar for Keycloak. Self-hosted identity and single sign-on next to Nextcloud.',
    href: '/sidecars/keycloak',
    categories: ['Identity'],
    icon: <svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="4"/><path d="M13 12h8M17 12v4M21 12v3"/></svg>,
  },
  ollama: {
    name: 'Ollama',
    tagline: 'Sidecar for Ollama. Local LLM inference served from the Nextcloud workspace.',
    href: '/sidecars/ollama',
    categories: ['AI'],
    icon: <svg viewBox="0 0 24 24"><path d="M12 3l9 5v8l-9 5-9-5V8z"/><circle cx="12" cy="12" r="2"/></svg>,
  },
  'open-webui': {
    name: 'Open WebUI',
    tagline: 'Sidecar for Open WebUI. Chat-style UI for local models, inside Nextcloud.',
    href: '/sidecars/open-webui',
    categories: ['AI'],
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 9h2M7 13h6"/></svg>,
  },
};

export const SIDECAR_CATEGORIES = ['All', 'Registers', 'Workflow', 'Identity', 'AI'];

function statusFor(record) {
  const ver = (record.store && record.store.latest_version) || (record.github && record.github.latest_release) || '';
  const v = ver.toLowerCase();
  if (!ver) return 'COMING SOON';
  if (v.includes('beta') || v.includes('alpha') || v.includes('rc')) return 'BETA';
  if (v.startsWith('0.') || v.startsWith('v0.')) return 'BETA';
  return 'STABLE';
}

function versionLabel(record) {
  const raw = (record.store && record.store.latest_version) || (record.github && record.github.latest_release) || '';
  const stripped = raw.replace(/^v/, '').replace(/-(beta|alpha|rc).*$/i, '');
  const short = stripped.split('.').slice(0, 2).join('.');
  const dl = record.github && record.github.downloads;
  const dlLabel = dl && dl > 0 ? `${dl.toLocaleString('en-US')} installs` : null;
  return [short && `v${short}`, dlLabel].filter(Boolean).join(' · ');
}

export function getSidecars() {
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
  for (const id of Object.keys(PRESENTATION)) {
    if (seen.has(id)) continue;
    out.push({
      ...PRESENTATION[id],
      status: 'COMING SOON',
      version: '',
      downloads: 0,
    });
  }
  const statusRank = {STABLE: 0, BETA: 1, 'COMING SOON': 2};
  out.sort((a, b) => {
    const r = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    if (r !== 0) return r;
    return (b.downloads || 0) - (a.downloads || 0);
  });
  return out;
}
