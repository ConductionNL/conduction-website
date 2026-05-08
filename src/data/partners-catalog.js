/**
 * partners-catalog.js
 * -------------------
 * Single source of truth for the Conduction partner directory.
 * Both /support (partner directory section) and /partners (filterable
 * directory page) import from here so the two surfaces never drift.
 *
 * Add a partner: append to PARTNERS. Required: name, tier, summary,
 * apps. Add href when a /partners/<slug> detail page exists. Add
 * logo when we have permission to display it.
 *
 * Tier slugs (low → high):
 *   - host       Hosts our open-source apps for their customers. May
 *                resell Nextcloud-supported variants through their
 *                own channels. No SLA with Conduction. No direct line
 *                to our support, no input on the roadmap, not eligible
 *                to respond to public tenders with our products.
 *   - service    Has an SLA with Conduction. Their team can call us
 *                directly for third-line support, named contacts,
 *                input on bug priority and feature requests.
 *   - certified  Trained and certified by Conduction. Joint roadmap.
 *                Eligible to respond to public tenders alongside us.
 *
 * apps:        free-form list of app or service names the partner
 *              ships, used as a facet on /partners.
 * solutions:   free-form list of solution slugs (matching
 *              /solutions/<slug>) the partner delivers, used both as
 *              a facet on /partners and for the reverse lookup below.
 *
 * Summaries stay in Dutch when the partner's market is Dutch — the
 * audience that filters by an MKB hosting partner is the same audience
 * that reads the source language. The English page reuses the same
 * objects rather than translating partner-side copy.
 */

import React from 'react';

export const PARTNERS = [
  // --------------------------------------------------------------
  // Certified — top tier, joint roadmap, tender-eligible
  // --------------------------------------------------------------
  {
    href: '/partners/acato',
    tier: 'certified',
    name: 'Acato',
    logo: '/img/partners/acato.png',
    summary: <>Digital agency uit Almere. Bouwt toegankelijke websites en webapplicaties voor gemeenten en overheidsorganisaties, met focus op WCAG 2.2 AA en NLDS. Levert de Conduction Woo-solution op OpenCatalogi, OpenRegister en OpenConnector.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['woo'],
  },

  // --------------------------------------------------------------
  // Service — SLA with Conduction, third-line support
  // --------------------------------------------------------------
  {
    tier: 'service',
    name: 'Shift2',
    logo: '/img/partners/shift2.png',
    summary: <>Nederlandse softwarebouwer voor gemeenten, waterschappen en provincies, onderdeel van de Conxillium-groep. Levert CMS, burgerzaken en formulieren, en daarnaast de Conduction Woo-solution op OpenCatalogi, OpenRegister en OpenConnector.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['woo'],
  },

  // --------------------------------------------------------------
  // Host — ships our apps, no SLA with Conduction
  // --------------------------------------------------------------
  {
    tier: 'host',
    name: 'Centric',
    logo: '/img/partners/centric.png',
    summary: <>Een van Nederlands grootste IT-leveranciers voor gemeenten en de publieke sector. Werkt samen met <span className="next-blue">Nextcloud</span> aan soevereine werkplekken en host DocuDesk binnen dat traject.</>,
    apps: ['Nextcloud', 'DocuDesk'],
    solutions: [],
  },
  {
    href: '/partners/procolix',
    tier: 'host',
    name: 'Procolix',
    logo: '/img/partners/procolix.png',
    summary: <>Nederlandse managed-<span className="next-blue">Nextcloud</span>-hoster uit Dordrecht. Levert beheerde Nextcloud-omgevingen op eigen EU-infrastructuur, open-source als uitgangspunt.</>,
    apps: ['Nextcloud'],
    solutions: [],
  },
  {
    tier: 'host',
    name: 'The Goodcloud',
    logo: '/img/partners/goodcloud.png',
    summary: <>Nederlandse managed-<span className="next-blue">Nextcloud</span>-hoster. Privacy-eerst, geen tracking, data in Nederland. Voor MKB, non-profits en privacybewuste organisaties.</>,
    apps: ['Nextcloud'],
    solutions: [],
  },
  {
    tier: 'host',
    name: 'BCT',
    logo: '/img/partners/bct.png',
    summary: <>Nederlandse leverancier van informatie- en documentmanagement-software (Corsa, Verix). Levert de Conduction Woo-solution aan organisaties die hun informatie-governance op orde willen krijgen.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['woo'],
  },
  {
    tier: 'host',
    name: 'Open Gemeenten',
    logo: '/img/partners/open-gemeenten.png',
    summary: <>Open-source platform voor gemeentelijke websites. Bedient ruim 30 gemeenten met toegankelijke sites (WCAG, internet.nl). Levert daarnaast de Conduction Woo-solution.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['woo'],
  },
  {
    tier: 'host',
    name: 'xxllnc',
    logo: '/img/partners/exxellence.png',
    summary: <>Nederlandse leverancier van zaakgericht-werken-software voor gemeenten (xxllnc Zaken, plus apps voor belastingen en het sociaal domein). Levert daarnaast de Conduction Woo-solution.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['woo'],
  },
  {
    href: '/partners/yard',
    tier: 'host',
    name: 'YARD',
    logo: '/img/partners/yard.png',
    summary: <>Digital agency uit Utrecht voor gemeenten, zorg en kennisorganisaties. Open-source-georiënteerd, ruim 80 projecten. Levert de Conduction Woo-solution.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['woo'],
  },
  {
    tier: 'host',
    name: 'iO',
    logo: '/img/partners/io.webp',
    summary: <>Belgisch-Nederlands digital agency met kantoren in Amsterdam en Rotterdam. Bouwt klantgerichte digitale platforms en levert de Conduction Woo-solution aan publieke en semi-publieke organisaties.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['woo'],
  },
  {
    tier: 'host',
    name: 'Sendent',
    logo: '/img/partners/sendent.png',
    summary: <>Nederlandse leverancier die Microsoft Outlook en Teams koppelt aan <span className="next-blue">Nextcloud</span>. Levert support op MyDash voor klanten die hun mail- en bestandsstroom binnen de eigen Nextcloud-omgeving willen houden.</>,
    apps: ['MyDash'],
    solutions: [],
  },
];

/** Reverse lookup: which partners ship a given solution slug. */
export function partnersBySolution(slug) {
  return PARTNERS.filter(p => (p.solutions || []).includes(slug));
}

/** Reverse lookup: which partners ship a given app name. */
export function partnersByApp(name) {
  return PARTNERS.filter(p => (p.apps || []).includes(name));
}

export const totalPartners = PARTNERS.length;

export const BECOME_PARTNER = {
  href: '/support#become-a-partner',
  eyebrow: 'Become a partner',
  title: 'Ship Conduction to your customers.',
  body: 'Three tiers: Host (ship our apps), Service (SLA + third-line support), Certified (trained, joint roadmap, tender-eligible). The apps stay open source, the relationship stays direct.',
  ctaLabel: 'Apply through Support',
};
