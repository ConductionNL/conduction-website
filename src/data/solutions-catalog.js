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
    slug: 'woo',
    href: '/solutions/woo', sector: 'public', sectorLabel: 'Publieke sector',
    title: 'WOO compliance, by Friday.',
    shortTitle: 'WOO compliance',
    outcome: <>Live WOO portal at your hosted <span className="next-blue">Nextcloud</span>. Every law category becomes a register, every register publishes through OpenCatalogi, every connector ingests from your DMS.</>,
    builtOn: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'], goals: ['compliance'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><path d="M12 3l9 4v5c0 5-4 8-9 9-5-1-9-4-9-9V7l9-4z"/><path d="M9 12l2 2 4-4"/></svg>,
  },
  {
    slug: 'zaakafhandeling',
    href: '/solutions/zaakafhandeling', sector: 'public', sectorLabel: 'Publieke sector',
    title: <>ZaakAfhandelApp on <span className="next-blue">Nextcloud</span>.</>,
    shortTitle: 'Zaakafhandeling',
    outcome: <>Vier apps, één zaakafhandeling. Burger-CRM, zaakworkflow en automatisering op de <span className="next-blue">Nextcloud</span> waar je team al inlogt.</>,
    builtOn: ['OpenRegister', 'PipelinQ', 'Procest', 'Windmill'], goals: ['workflow'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><path d="M9 11V7a3 3 0 0 1 6 0v4"/><rect x="5" y="11" width="14" height="10" rx="2"/></svg>,
  },
  {
    slug: 'archief',
    href: '/solutions/archief', sector: 'public', sectorLabel: 'Publieke sector',
    title: 'Archief naar e-Depot, automatisch.',
    shortTitle: 'Archief',
    outcome: 'OpenRegister bewaart je actuele data, OpenConnector zet records bewaartermijn-driven over naar je e-Depot. NEN-2082 gemapt, eIDAS-AdES verzegeld.',
    builtOn: ['OpenRegister', 'OpenConnector'], goals: ['compliance'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><path d="M3 4h18v4H3z"/><path d="M5 8v12h14V8"/><path d="M9 12h6"/></svg>,
  },
  {
    slug: 'software-catalog',
    href: '/solutions/software-catalog', sector: 'public', sectorLabel: 'Publieke sector',
    title: 'Software catalog for the gemeente.',
    shortTitle: 'Software catalog',
    outcome: 'A public software catalogue, apps, datasets, APIs your organisation uses, searchable in one place, federated to data.overheid.nl.',
    builtOn: ['OpenCatalogi', 'OpenRegister'], goals: ['integration'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/></svg>,
  },
  {
    slug: 'mkb-workspace',
    href: '/solutions/mkb-workspace', sector: 'mkb', sectorLabel: 'MKB',
    title: 'MKB workspace in two minutes.',
    shortTitle: 'MKB workspace',
    outcome: <>Files, calendar, talk, dashboards, your full open-source workspace on <span className="next-blue">Nextcloud</span>, with MyDash on top.</>,
    builtOn: ['MyDash', 'OpenRegister'], goals: ['reporting'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  },
  {
    slug: 'legacy-erp',
    href: '/solutions/legacy-erp', sector: 'mkb', sectorLabel: 'MKB',
    title: 'One legacy ERP, every modern tool.',
    shortTitle: 'Legacy ERP bridge',
    outcome: 'OpenConnector pulls from your ERP, fills typed registers, exposes an API to whatever your team uses today.',
    builtOn: ['OpenConnector', 'OpenRegister'], goals: ['integration'], status: 'pilot',
    icon: <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 12h9M9 12l9-6M9 12l9 6"/></svg>,
  },
  {
    slug: 'nen-7510',
    href: '/solutions/nen-7510', sector: 'health', sectorLabel: 'Zorg',
    title: 'NEN-7510 + zorgmail in one stack.',
    shortTitle: 'NEN-7510',
    outcome: <>A zorg-instelling-ready <span className="next-blue">Nextcloud</span>. NEN-7510 audit, zorgmail integration, DocuDesk to anonymise inbound zorgcorrespondentie.</>,
    builtOn: ['DocuDesk', 'OpenRegister'], goals: ['compliance'], status: 'production',
    icon: <svg viewBox="0 0 24 24"><path d="M12 2L2 7v6c0 5 3 9 10 11 7-2 10-6 10-11V7L12 2z"/><path d="M9 12h6M12 9v6"/></svg>,
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
