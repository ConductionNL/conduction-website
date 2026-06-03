/**
 * solutions-catalog.js
 * --------------------
 * Single source of truth for the Conduction solutions list. Both
 * /solutions (filterable directory) and /partners/<slug> (sidecard
 * "solutions they ship" chips) read from here, so the two surfaces
 * stay in sync as solutions are added.
 *
 * Each entry's slug = the last path segment of href. The slug is the
 * key partner-catalog uses to declare which solutions a partner ships,
 * and the same key /solutions/<slug>.mdx routes to.
 */

import React from 'react';

export const SOLUTIONS = [
  {
    slug: 'openwoo',
    href: '/solutions/openwoo', sector: 'public', sectorLabel: 'Public sector',
    title: 'OpenWoo. Wet open overheid, by Friday.',
    shortTitle: 'OpenWoo',
    outcome: <>Live OpenWoo-portal at your hosted <span className="next-blue">Nextcloud</span>. Each Wet open overheid-categorie becomes a register, every register publishes through OpenCatalogi, every connector ingests from your DMS.</>,
    builtOn: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'], goals: ['compliance'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><path d="M12 3l9 4v5c0 5-4 8-9 9-5-1-9-4-9-9V7l9-4z"/><path d="M9 12l2 2 4-4"/></svg>,
  },
  {
    slug: 'zaakafhandeling',
    href: '/solutions/zaakafhandeling', sector: 'public', sectorLabel: 'Public sector',
    title: <>ZaakAfhandelApp on <span className="next-blue">Nextcloud</span>.</>,
    shortTitle: 'Zaakafhandeling',
    outcome: <>Four apps, one case management system. Citizen CRM, case workflow, and automation on the <span className="next-blue">Nextcloud</span> your team already logs into.</>,
    builtOn: ['OpenRegister', 'PipelinQ', 'Procest', 'Windmill'], goals: ['workflow'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><path d="M9 11V7a3 3 0 0 1 6 0v4"/><rect x="5" y="11" width="14" height="10" rx="2"/></svg>,
  },
  {
    slug: 'archief',
    href: '/solutions/archief', sector: 'public', sectorLabel: 'Public sector',
    title: 'Archive transfer to e-Depot, automated',
    shortTitle: 'Archive',
    outcome: <>OpenRegister stores your live data, OpenConnector moves records on schedule to your e-Depot. NEN-2082 mapped, eIDAS-AdES sealed.</>,
    builtOn: ['OpenRegister', 'OpenConnector'], goals: ['compliance'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><path d="M3 4h18v4H3z"/><path d="M5 8v12h14V8"/><path d="M9 12h6"/></svg>,
  },
  {
    slug: 'anonimiseren',
    href: '/solutions/anonimiseren', sector: ['public', 'mkb'], sectorLabel: 'Public & SMB',
    title: 'Anonymize before you publish.',
    shortTitle: 'Anonymize',
    outcome: <>Privacy-by-design pipeline on <span className="next-blue">Nextcloud</span>. DocuDesk and OpenRegister detect and redact records and documents before they leave your organization. Presidio under the hood, GDPR-explainable.</>,
    builtOn: ['DocuDesk', 'OpenRegister', 'Presidio'], goals: ['compliance'], status: 'pilot',
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M9 8h6"/></svg>,
  },
  {
    slug: 'openanonymiser',
    href: '/solutions/openanonymiser', sector: ['public', 'mkb'], sectorLabel: 'Public & SMB',
    title: 'OpenAnonymiser. Strip PII before it ships.',
    shortTitle: 'OpenAnonymiser',
    outcome: <>Dutch-first PII detection on <span className="next-blue">Nextcloud</span>. Detects persons, addresses, IBANs, BSNs, and case numbers in any document or register field. Ships as a Nextcloud ExApp, CPU (Light) and GPU builds, Presidio under the hood.</>,
    builtOn: ['OpenAnonymiser', 'DocuDesk', 'OpenRegister', 'OpenCatalogi'], goals: ['compliance'], status: 'beta',
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M9 8h6"/></svg>,
  },
  {
    slug: 'mkb-workspace',
    href: '/solutions/mkb-workspace', sector: 'mkb', sectorLabel: 'MKB',
    title: 'MKB workspace in two minutes.',
    shortTitle: 'MKB workspace',
    outcome: <>Files, calendar, talk, dashboards, your full open-source workspace on <span className="next-blue">Nextcloud</span>, with LaunchPad on top.</>,
    builtOn: ['LaunchPad', 'OpenRegister'], goals: ['reporting'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  },
];

/** Look up a solution by its slug. Returns undefined if not found. */
export function solutionBySlug(slug) {
  return SOLUTIONS.find(s => s.slug === slug);
}

/** Resolve a list of slugs to full solution entries, dropping unknowns. */
export function solutionsBySlugs(slugs = []) {
  return slugs.map(solutionBySlug).filter(Boolean);
}
