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
 * tier values: 'partner' | 'certified' | 'strategic'.
 * apps:        free-form list of app or service names the partner
 *              ships, used as a facet on /partners.
 *
 * Summaries stay in Dutch when the partner's market is Dutch — the
 * audience that filters by an MKB hosting partner is the same audience
 * that reads the source language. The English page reuses the same
 * objects rather than translating partner-side copy.
 */

import React from 'react';

export const PARTNERS = [
  {
    href: '/partners/acato',
    tier: 'strategic',
    name: 'Acato',
    logo: '/img/partners/acato.png',
    summary: <>Nederlandse open-source specialist uit Almere. Bouwt en host <span className="next-blue">Nextcloud</span>-omgevingen voor gemeenten en zorginstellingen, met focus op AVG-compliance en NLDS. Strategisch partner op hosting, stack-implementatie en gezamenlijke roadmap.</>,
    apps: ['OpenRegister', 'OpenCatalogi', 'DocuDesk'],
    solutions: ['woo', 'archief', 'software-catalog'],
  },
  {
    tier: 'certified',
    name: 'Centric',
    logo: '/img/partners/centric.png',
    summary: <>Eén van Nederlands grootste software-leveranciers voor de publieke sector. Officieel <span className="next-blue">Nextcloud</span>-distributeur. Centric-klanten krijgen Conduction-apps geïntegreerd in hun bestaande Centric-omgeving.</>,
    apps: ['Nextcloud', 'OpenZaak', 'OpenRegister', 'DocuDesk'],
    solutions: ['zaakafhandeling', 'archief'],
  },
  {
    href: '/partners/procolix',
    tier: 'certified',
    name: 'Procolix',
    logo: '/img/partners/procolix.png',
    summary: <>Nederlandse hoster en leverancier van proces- en zaakmanagement-software. Officieel <span className="next-blue">Nextcloud</span>-distributeur. Certified op DocuDesk en OpenConnector voor procesintegraties bij gemeenten en uitvoeringsorganisaties.</>,
    apps: ['Nextcloud', 'DocuDesk', 'OpenConnector'],
    solutions: ['zaakafhandeling', 'archief', 'legacy-erp'],
  },
  {
    tier: 'certified',
    name: 'The Goodcloud',
    logo: '/img/partners/goodcloud.png',
    summary: <>Nederlandse <span className="next-blue">Nextcloud</span>-hoster voor MKB en non-profits. Officieel Nextcloud-distributeur. Levert beheerde omgevingen met Conduction-apps pre-installed, privacy-eerst hosting in NL.</>,
    apps: ['Nextcloud', 'OpenRegister', 'MyDash'],
    solutions: ['mkb-workspace'],
  },
  {
    tier: 'partner',
    name: 'BCT',
    logo: '/img/partners/bct.png',
    summary: <>Nederlandse leverancier van document- en zaaksysteem-software voor de overheid. BCT-implementaties praten via OpenConnector met de Conduction-registers.</>,
    apps: ['OpenConnector', 'DocuDesk', 'OpenZaak'],
    solutions: ['zaakafhandeling', 'archief', 'legacy-erp'],
  },
  {
    tier: 'partner',
    name: 'Open Gemeenten',
    logo: '/img/partners/open-gemeenten.png',
    summary: <>Coöperatieve community van gemeenten die samen open-source software ontwikkelen en delen. Levert OpenZaak-implementaties bij aangesloten gemeenten en draagt patches terug naar upstream.</>,
    apps: ['OpenZaak', 'OpenRegister', 'OpenCatalogi'],
    solutions: ['zaakafhandeling', 'software-catalog'],
  },
  {
    tier: 'partner',
    name: 'Exxellence',
    logo: '/img/partners/exxellence.png',
    summary: <>Nederlandse softwarebouwer gespecialiseerd in zaakafhandeling en burger-portaal-toepassingen. Reference-deploys op OpenZaak v4.x bij meerdere middelgrote gemeenten.</>,
    apps: ['OpenZaak', 'DocuDesk'],
    solutions: ['zaakafhandeling'],
  },
  {
    href: '/partners/yard',
    tier: 'partner',
    name: 'YARD',
    logo: '/img/partners/yard.png',
    summary: <>Digital design- en development-bureau uit Utrecht. Ontwerpt en bouwt klantgerichte digitale producten op <span className="next-blue">Nextcloud</span> voor gemeenten en publieke organisaties.</>,
    apps: ['MyDash', 'OpenCatalogi'],
    solutions: ['software-catalog', 'mkb-workspace'],
  },
  {
    tier: 'partner',
    name: 'iO',
    logo: '/img/partners/io.webp',
    summary: <>Internationaal digital agency met Nederlandse vestiging in Amsterdam. Integreert Conduction-apps in bredere klantreis-trajecten voor publieke en semi-publieke organisaties.</>,
    apps: ['OpenConnector', 'MyDash'],
    solutions: ['legacy-erp', 'mkb-workspace'],
  },
  {
    tier: 'partner',
    name: 'Shift2',
    logo: '/img/partners/shift2.png',
    summary: <>Nederlands development-bureau gespecialiseerd in <span className="next-blue">Nextcloud</span> en open source. Implementeert Conduction-stacks bij MKB-klanten en gemeenten in midden-Nederland.</>,
    apps: ['OpenRegister', 'MyDash'],
    solutions: ['mkb-workspace'],
  },
  {
    tier: 'partner',
    name: 'Sendent',
    logo: '/img/partners/sendent.png',
    summary: <>Nederlandse leverancier die Microsoft Outlook en Teams koppelt aan <span className="next-blue">Nextcloud</span>. Levert support op MyDash voor klanten die hun e-mail- en bestandsstroom binnen de eigen Nextcloud-omgeving willen houden.</>,
    apps: ['MyDash'],
    solutions: ['mkb-workspace'],
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
  body: 'Join as Partner, Certified, or Strategic. Conduction trains your team, you handle the rollouts. The apps stay open source, the relationship stays direct.',
  ctaLabel: 'Apply through Support',
};
