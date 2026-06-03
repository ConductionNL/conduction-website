/**
 * <PartnersForApp /> and <PartnersForSolution />
 *
 * Thin site-side wrappers around the preset's <PartnersFor> section.
 * The MDX pages call these with just a slug; the wrappers resolve the
 * partner list from `partners-catalog.js` (single source of truth) and
 * pick locale-keyed copy from the current Docusaurus locale.
 *
 * Pages drop one line directly below their "What it does" Section:
 *
 *   import {PartnersForApp} from '@site/src/components/PartnersFor';
 *   <PartnersForApp slug="openregister" />
 *
 *   import {PartnersForSolution} from '@site/src/components/PartnersFor';
 *   <PartnersForSolution slug="openwoo" />
 *
 * When the catalog has no partners for the subject the section still
 * renders, collapsed to just the BecomePartner CTA cell, so every
 * product surface keeps recruiting partners.
 */

import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {PartnersFor} from '@conduction/docusaurus-preset/components';
import {getApp} from '@conduction/docusaurus-preset/data/apps-registry';
import {usePartnersByApp, usePartnersBySolution, useBecomePartner} from '@site/src/data/partners-catalog';
import {solutionBySlug} from '@site/src/data/solutions-catalog';

function localizedCopy({locale, kind, subject}) {
  const nl = locale === 'nl';
  if (kind === 'app') {
    return {
      eyebrow: 'Partners',
      title: nl ? `Partners die ${subject} leveren` : `Partners shipping ${subject}`,
      lede: nl
        ? `Implementatie-, hosting- en integratiepartners die ${subject} bij hun klanten uitrollen. Kies de partner met wie je al werkt, of een waarvan de stack bij die van jou past.`
        : `Implementation, hosting, and integration partners that deliver ${subject} to their customers. Pick the partner you already work with, or one whose stack matches yours.`,
    };
  }
  return {
    eyebrow: 'Partners',
    title: nl ? `Partners die ${subject} leveren` : `Partners delivering ${subject}`,
    lede: nl
      ? `Implementatie-, hosting- en integratiepartners die ${subject} bij hun klanten uitrollen. De apps en de data-flow blijven hetzelfde.`
      : `Implementation, hosting, and integration partners that deliver ${subject} to their customers. The apps and the data flow stay the same.`,
  };
}

export function PartnersForApp({slug, name, ...rest}) {
  const {i18n} = useDocusaurusContext();
  const app = getApp(slug);
  const subject = name || (app && app.name) || slug;
  const partners = usePartnersByApp(subject);
  const becomePartner = useBecomePartner();
  const copy = localizedCopy({locale: i18n.currentLocale, kind: 'app', subject});
  return (
    <PartnersFor
      eyebrow={copy.eyebrow}
      title={copy.title}
      lede={copy.lede}
      partners={partners}
      becomePartner={becomePartner}
      {...rest}
    />
  );
}

export function PartnersForSolution({slug, name, ...rest}) {
  const {i18n} = useDocusaurusContext();
  const solution = solutionBySlug(slug);
  const subject = name || (solution && solution.shortTitle) || slug;
  const partners = usePartnersBySolution(slug);
  const becomePartner = useBecomePartner();
  const copy = localizedCopy({locale: i18n.currentLocale, kind: 'solution', subject});
  return (
    <PartnersFor
      eyebrow={copy.eyebrow}
      title={copy.title}
      lede={copy.lede}
      partners={partners}
      becomePartner={becomePartner}
      {...rest}
    />
  );
}
