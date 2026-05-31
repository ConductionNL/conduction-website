/**
 * partners-catalog.js
 * -------------------
 * Single source of truth for the Conduction partner directory.
 * Both /support (partner directory section) and /partners (filterable
 * directory page) import from here so the two surfaces never drift.
 *
 * Add a partner: append to PARTNERS_DATA. Required: name, tier,
 * summaryEn, summaryNl, apps. Add href when a /partners/<slug> detail
 * page exists. Add logo when we have permission to display it.
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
 * Locale: every visible-string field is paired as `<field>En` /
 * `<field>Nl`. The `usePartners()` hook resolves them based on the
 * current Docusaurus locale, so EN pages render English summaries and
 * NL pages render Dutch summaries from the same source. Consume via
 * the hook, not the raw PARTNERS_DATA export, so the right summary is
 * picked at render time.
 */

import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const PARTNERS_DATA = [
  // --------------------------------------------------------------
  // Certified — top tier, joint roadmap, tender-eligible
  // --------------------------------------------------------------
  {
    href: '/partners/acato',
    tier: 'certified',
    name: 'Acato',
    logo: '/img/partners/acato.svg',
    summaryEn: <>Digital agency from Almere. Builds accessible websites and web apps for municipalities and government organisations, focused on WCAG 2.2 AA and NLDS. Delivers the Conduction OpenWoo solution on OpenCatalogi, OpenRegister, and OpenConnector.</>,
    summaryNl: <>Digital agency uit Almere. Bouwt toegankelijke websites en webapplicaties voor gemeenten en overheidsorganisaties, met focus op WCAG 2.2 AA en NLDS. Levert de Conduction Woo-solution op OpenCatalogi, OpenRegister en OpenConnector.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['openwoo'],
  },

  // --------------------------------------------------------------
  // Service — SLA with Conduction, third-line support
  // --------------------------------------------------------------
  {
    tier: 'service',
    name: 'Shift2',
    logo: '/img/partners/shift2.png',
    summaryEn: <>Dutch software builder for municipalities, water boards, and provinces, part of the Conxillium group. Ships CMS, civil affairs, and forms, plus the Conduction OpenWoo solution on OpenCatalogi, OpenRegister, and OpenConnector.</>,
    summaryNl: <>Nederlandse softwarebouwer voor gemeenten, waterschappen en provincies, onderdeel van de Conxillium-groep. Levert CMS, burgerzaken en formulieren, en daarnaast de Conduction Woo-solution op OpenCatalogi, OpenRegister en OpenConnector.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['openwoo'],
  },

  // --------------------------------------------------------------
  // Host — ships our apps, no SLA with Conduction
  // --------------------------------------------------------------
  {
    tier: 'host',
    name: 'Centric',
    logo: '/img/partners/centric.png',
    summaryEn: <>One of the Netherlands' largest IT suppliers for municipalities and the public sector. Partners with <span className="next-blue">Nextcloud</span> on sovereign workspaces and hosts DocuDesk inside that programme.</>,
    summaryNl: <>Een van Nederlands grootste IT-leveranciers voor gemeenten en de publieke sector. Werkt samen met <span className="next-blue">Nextcloud</span> aan soevereine werkplekken en host DocuDesk binnen dat traject.</>,
    apps: ['Nextcloud', 'DocuDesk'],
    solutions: [],
  },
  {
    href: '/partners/procolix',
    tier: 'host',
    name: 'Procolix',
    logo: '/img/partners/procolix.png',
    summaryEn: <>Dutch managed-<span className="next-blue">Nextcloud</span> hoster from Dordrecht. Delivers managed Nextcloud environments on dedicated EU infrastructure, open source by default.</>,
    summaryNl: <>Nederlandse managed-<span className="next-blue">Nextcloud</span>-hoster uit Dordrecht. Levert beheerde Nextcloud-omgevingen op eigen EU-infrastructuur, open-source als uitgangspunt.</>,
    apps: ['Nextcloud'],
    solutions: [],
  },
  {
    tier: 'host',
    name: 'The Goodcloud',
    logo: '/img/partners/goodcloud.png',
    summaryEn: <>Dutch managed-<span className="next-blue">Nextcloud</span> hoster. Privacy-first, no tracking, data in the Netherlands. For SMBs, non-profits, and privacy-conscious organisations.</>,
    summaryNl: <>Nederlandse managed-<span className="next-blue">Nextcloud</span>-hoster. Privacy-eerst, geen tracking, data in Nederland. Voor MKB, non-profits en privacybewuste organisaties.</>,
    apps: ['Nextcloud'],
    solutions: [],
  },
  {
    tier: 'host',
    name: 'BCT',
    logo: '/img/partners/bct.png',
    summaryEn: <>Dutch supplier of information- and document-management software (Corsa, Verix). Delivers the Conduction OpenWoo solution to organisations that want their information governance in order.</>,
    summaryNl: <>Nederlandse leverancier van informatie- en documentmanagement-software (Corsa, Verix). Levert de Conduction Woo-solution aan organisaties die hun informatie-governance op orde willen krijgen.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['openwoo'],
  },
  {
    tier: 'host',
    name: 'Open Gemeenten',
    logo: '/img/partners/open-gemeenten.png',
    summaryEn: <>Open-source platform for municipal websites. Serves more than 30 municipalities with accessible sites (WCAG, internet.nl). Also delivers the Conduction OpenWoo solution.</>,
    summaryNl: <>Open-source platform voor gemeentelijke websites. Bedient ruim 30 gemeenten met toegankelijke sites (WCAG, internet.nl). Levert daarnaast de Conduction Woo-solution.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['openwoo'],
  },
  {
    tier: 'host',
    name: 'xxllnc',
    logo: '/img/partners/exxellence.png',
    summaryEn: <>Dutch supplier of case-management software for municipalities (xxllnc Zaken, plus apps for taxes and the social domain). Also delivers the Conduction OpenWoo solution.</>,
    summaryNl: <>Nederlandse leverancier van zaakgericht-werken-software voor gemeenten (xxllnc Zaken, plus apps voor belastingen en het sociaal domein). Levert daarnaast de Conduction Woo-solution.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['openwoo'],
  },
  {
    href: '/partners/yard',
    tier: 'host',
    name: 'YARD',
    logo: '/img/partners/yard.png',
    summaryEn: <>Digital agency from Utrecht for municipalities, healthcare, and knowledge organisations. Open-source-oriented, more than 80 projects. Delivers the Conduction OpenWoo solution.</>,
    summaryNl: <>Digital agency uit Utrecht voor gemeenten, zorg en kennisorganisaties. Open-source-georiënteerd, ruim 80 projecten. Levert de Conduction Woo-solution.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['openwoo'],
  },
  {
    tier: 'host',
    name: 'iO',
    logo: '/img/partners/io.webp',
    summaryEn: <>Belgian-Dutch digital agency with offices in Amsterdam and Rotterdam. Builds customer-facing digital platforms and delivers the Conduction OpenWoo solution to public and semi-public organisations.</>,
    summaryNl: <>Belgisch-Nederlands digital agency met kantoren in Amsterdam en Rotterdam. Bouwt klantgerichte digitale platforms en levert de Conduction Woo-solution aan publieke en semi-publieke organisaties.</>,
    apps: ['OpenCatalogi', 'OpenRegister', 'OpenConnector'],
    solutions: ['openwoo'],
  },
  {
    tier: 'host',
    name: 'Sendent',
    logo: '/img/partners/sendent.png',
    summaryEn: <>Dutch supplier that connects Microsoft Outlook and Teams to <span className="next-blue">Nextcloud</span>. Provides support on LaunchPad for customers who want to keep their mail and file flows inside their own Nextcloud environment.</>,
    summaryNl: <>Nederlandse leverancier die Microsoft Outlook en Teams koppelt aan <span className="next-blue">Nextcloud</span>. Levert support op LaunchPad voor klanten die hun mail- en bestandsstroom binnen de eigen Nextcloud-omgeving willen houden.</>,
    apps: ['LaunchPad'],
    solutions: [],
  },
];

/**
 * Resolve the locale-keyed fields on each partner record to the
 * current Docusaurus locale. Returns a new array of partner objects
 * with `summary` set (instead of `summaryEn`/`summaryNl`).
 */
function localizePartners(locale) {
  return PARTNERS_DATA.map((p) => ({
    ...p,
    summary: locale === 'nl' ? p.summaryNl : p.summaryEn,
  }));
}

/** Hook: returns the partner list with locale-resolved summaries. */
export function usePartners() {
  const {i18n} = useDocusaurusContext();
  return localizePartners(i18n.currentLocale);
}

/** Hook: which partners ship a given solution slug. */
export function usePartnersBySolution(slug) {
  return usePartners().filter((p) => (p.solutions || []).includes(slug));
}

/** Hook: which partners ship a given app name. */
export function usePartnersByApp(name) {
  return usePartners().filter((p) => (p.apps || []).includes(name));
}

/** Look up a partner by name, returning the locale-keyed record
 *  (still carries summaryEn + summaryNl). Useful inside an MDX export
 *  where hooks can't run; use with `usePartnerSummary(p)` below to
 *  resolve the summary at render time. */
export function partnerByName(name) {
  return PARTNERS_DATA.find((p) => p.name === name);
}

/** Hook: resolve `partner.summary` to the current locale on a raw
 *  PARTNERS_DATA record. Pairs with `partnerByName()` so per-page MDX
 *  exports can stay simple and the localised summary is selected when
 *  rendering. */
export function usePartnerSummary(partner) {
  const {i18n} = useDocusaurusContext();
  if (!partner) return null;
  return i18n.currentLocale === 'nl' ? partner.summaryNl : partner.summaryEn;
}

export const totalPartners = PARTNERS_DATA.length;

const BECOME_PARTNER_DATA = {
  href: '/support#become-a-partner',
  eyebrowEn: 'Become a partner',
  eyebrowNl: 'Word partner',
  titleEn: 'Ship Conduction to your customers.',
  titleNl: 'Lever Conduction aan je klanten.',
  bodyEn: 'Three tiers: Host (ship our apps), Service (SLA + third-line support), Certified (trained, joint roadmap, tender-eligible). The apps stay open source, the relationship stays direct.',
  bodyNl: 'Drie niveaus: Host (lever onze apps), Service (SLA + derdelijns support), Certified (getraind, gezamenlijke roadmap, aanbestedings-eligible). De apps blijven open source, het contact blijft direct.',
  ctaLabelEn: 'Apply through Support',
  ctaLabelNl: 'Aanmelden via Support',
};

/** Hook: returns the "become a partner" call-to-action with locale-
 *  resolved copy. */
export function useBecomePartner() {
  const {i18n} = useDocusaurusContext();
  const nl = i18n.currentLocale === 'nl';
  return {
    href: BECOME_PARTNER_DATA.href,
    eyebrow: nl ? BECOME_PARTNER_DATA.eyebrowNl : BECOME_PARTNER_DATA.eyebrowEn,
    title: nl ? BECOME_PARTNER_DATA.titleNl : BECOME_PARTNER_DATA.titleEn,
    body: nl ? BECOME_PARTNER_DATA.bodyNl : BECOME_PARTNER_DATA.bodyEn,
    ctaLabel: nl ? BECOME_PARTNER_DATA.ctaLabelNl : BECOME_PARTNER_DATA.ctaLabelEn,
  };
}
