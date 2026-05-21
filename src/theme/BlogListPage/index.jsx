/**
 * Academy BlogListPage swizzle.
 *
 * Replaces Docusaurus's default theme-classic BlogListPage with the
 * academy landing layout: <FeaturedCard/> for the most-recent post,
 * <ContentTypeFilter/> for the content-type chip row, a second
 * <ContentTypeFilter/> reused as the product chip row, then
 * <ContentCardGrid/> for the remaining posts and <NewsletterCta/> at
 * the bottom. Filters are driven by `?type=` and `?app=` so chip
 * selections survive reload and copy-paste, and the URL stays clean.
 *
 * The product chip row is the same component as the type row, just
 * wired to APP_LABELS / APP_SLUGS from the shared apps-registry. Only
 * apps with at least one post are shown to keep the row readable.
 *
 * SSR-safe: when window is not available (Docusaurus's first render),
 * we fall back to the unfiltered view via <BrowserOnly/>.
 */

import React, {useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import {
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {usePluginData} from '@docusaurus/useGlobalData';
import Translate, {translate} from '@docusaurus/Translate';
import {
  FeaturedCard,
  ContentTypeFilter,
  CONTENT_TYPES,
  NewsletterCta,
  Section,
  ContentCard,
  ContentCardGrid,
  ModuleCard,
} from '@conduction/docusaurus-preset/components';
import {
  APPS_REGISTRY,
  APP_LABELS,
} from '@conduction/docusaurus-preset/data/apps-registry';

const TYPE_SET = new Set(CONTENT_TYPES);
const APP_SET = new Set(Object.keys(APPS_REGISTRY));

function readQuery(search, knownModules, knownSeries) {
  try {
    const params = new URLSearchParams(search);
    const t = params.get('type');
    const a = params.get('app');
    const m = params.get('module');
    const s = params.get('series');
    return {
      type:   t && TYPE_SET.has(t)              ? t : null,
      app:    a && APP_SET.has(a)               ? a : null,
      module: m && knownModules && knownModules.has(m) ? m : null,
      series: s && knownSeries && knownSeries.has(s)   ? s : null,
    };
  } catch (_) {
    return {type: null, app: null, module: null, series: null};
  }
}

const SERIES_LABEL_OVERRIDES = {
  'hydra-tutorial':         'Hydra',
  'openspec-tutorial':      'OpenSpec',
  'deskdesk-tutorial':      'DeskDesk',
  'claude-skills-tutorial': 'Claude Skills',
  'woo-tutorial':           'Woo',
};

function seriesLabelFor(slug) {
  if (SERIES_LABEL_OVERRIDES[slug]) return SERIES_LABEL_OVERRIDES[slug];
  return slug
    .replace(/-tutorial$/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function defaultIconFor(contentType) {
  const stroke = {strokeWidth: 1.6, fill: 'none', stroke: 'currentColor'};
  switch (contentType) {
    case 'guide':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z" />
          <path d="M4 16a4 4 0 0 1 4-4h12" />
        </svg>
      );
    case 'case-study':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          <rect x="3" y="7" width="18" height="13" rx="1" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      );
    case 'webinar':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tutorial':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h10" />
          <path d="M19 14v6" /><path d="M16 17l3 3 3-3" />
        </svg>
      );
    case 'blog':
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
  }
}

function panelToneFor(contentType) {
  switch (contentType) {
    case 'guide':      return 'cobalt-dark';
    case 'case-study': return 'mint';
    case 'webinar':    return 'orange';
    case 'tutorial':   return 'cobalt-dark';
    case 'blog':
    default:           return 'cobalt-deep';
  }
}

function postToCardProps(post, moduleSize) {
  const meta = post.content.metadata;
  const fm = meta.frontMatter || {};
  const author = meta.authors && meta.authors[0];
  return {
    href: meta.permalink,
    contentType: fm.contentType,
    title: meta.title || fm.title,
    summary: fm.summary || meta.description,
    author: author ? {name: author.name, avatarSrc: author.imageURL} : null,
    date: meta.date,
    tags: (meta.tags || []).slice(0, 3).map((t) => t.label || t),
    thumbnail: {
      icon: defaultIconFor(fm.contentType),
      panelTone: panelToneFor(fm.contentType),
    },
    durationMinutes:  fm.durationMinutes,
    audience:         fm.audience || [],
    module:           fm.module,
    modulePosition:   fm.modulePosition,
    moduleTotalParts: fm.module && moduleSize ? moduleSize : undefined,
    moduleTitle:      fm.moduleTitle,
  };
}

function postToFeaturedProps(post, moduleSize) {
  const card = postToCardProps(post, moduleSize);
  const fm = post.content.metadata.frontMatter || {};
  return {
    href: card.href,
    eyebrow: translate(
      {
        id: 'theme.academy.featuredEyebrow',
        message: 'Featured {type}',
        description: 'Eyebrow on the featured academy card. {type} is the content type slug (blog, guide, case-study, webinar, tutorial)',
      },
      {type: fm.contentType || 'post'},
    ),
    title: card.title,
    lede: card.summary,
    ctaLabel: translate({
      id: 'theme.academy.featuredCta',
      message: 'Read more',
      description: 'CTA label on the featured academy card',
    }),
    author: card.author,
    date: card.date,
    thumbnail: {icon: defaultIconFor(fm.contentType)},
    contentType:      fm.contentType,
    durationMinutes:  fm.durationMinutes,
    audience:         fm.audience || [],
    module:           fm.module,
    modulePosition:   fm.modulePosition,
    moduleTotalParts: fm.module && moduleSize ? moduleSize : undefined,
    moduleTitle:      fm.moduleTitle,
  };
}

function postApps(post) {
  return post.content.metadata.frontMatter?.apps || [];
}

function countsByType(posts) {
  const counts = {};
  for (const post of posts) {
    const ct = post.content.metadata.frontMatter?.contentType;
    if (ct) counts[ct] = (counts[ct] || 0) + 1;
  }
  return counts;
}

function countsByApp(posts) {
  const counts = {};
  for (const post of posts) {
    for (const slug of postApps(post)) {
      if (APP_SET.has(slug)) counts[slug] = (counts[slug] || 0) + 1;
    }
  }
  return counts;
}

function postSeries(post) {
  return post.content.metadata.frontMatter?.series || null;
}

function countsBySeries(posts) {
  const counts = {};
  for (const post of posts) {
    const series = postSeries(post);
    if (series) counts[series] = (counts[series] || 0) + 1;
  }
  return counts;
}

function AcademyLandingInner({items}) {
  /* Module groupings from the academy-modules Docusaurus plugin.
     Empty object when the plugin is missing so the page still renders
     individual cards rather than throwing. */
  const moduleData = usePluginData('academy-modules') || {};
  const modules    = moduleData.modules || {};
  const moduleSlugs = useMemo(() => Object.keys(modules), [modules]);
  const knownModules = useMemo(() => new Set(moduleSlugs), [moduleSlugs]);

  /* All distinct series slugs found in frontmatter — used to validate
     the ?series= query param so an unknown slug can't get stuck. */
  const knownSeries = useMemo(() => {
    const set = new Set();
    for (const post of items) {
      const s = postSeries(post);
      if (s) set.add(s);
    }
    return set;
  }, [items]);

  const [active, setActive] = useState(() =>
    readQuery(typeof window !== 'undefined' ? window.location.search : '', knownModules, knownSeries)
  );

  useEffect(() => {
    const onPop = () => setActive(readQuery(window.location.search, knownModules, knownSeries));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [knownModules, knownSeries]);

  /* Type counts always reflect the full feed (so the user sees how many
     blogs vs guides exist regardless of the active app filter). App
     counts are computed against the type-filtered feed so the numbers
     match what each chip will show after a click. */
  const typeCounts = useMemo(() => countsByType(items), [items]);
  const itemsAfterType = useMemo(
    () => active.type
      ? items.filter((p) => p.content.metadata.frontMatter?.contentType === active.type)
      : items,
    [items, active.type],
  );
  const appCounts = useMemo(() => countsByApp(itemsAfterType), [itemsAfterType]);

  /* Apps row only shows app slugs that have at least one post in the
     current type-filtered feed. Keeps the row from dragging into a
     long secondary list of zero-count apps. */
  const visibleAppSlugs = useMemo(
    () => Object.keys(APP_LABELS).filter((slug) => appCounts[slug] > 0),
    [appCounts],
  );

  const itemsAfterApp = active.app
    ? itemsAfterType.filter((p) => postApps(p).includes(active.app))
    : itemsAfterType;

  /* Series row counts: how many posts each series contributes to the
     type/app-filtered universe. Hide series with 0 members so the row
     shortens as the user filters. */
  const seriesCounts = useMemo(() => countsBySeries(itemsAfterApp), [itemsAfterApp]);

  const visibleSeriesSlugs = useMemo(
    () => [...knownSeries].filter((s) => seriesCounts[s] > 0),
    [knownSeries, seriesCounts],
  );

  const seriesLabels = useMemo(() => {
    const labels = {};
    for (const slug of knownSeries) labels[slug] = seriesLabelFor(slug);
    return labels;
  }, [knownSeries]);

  const itemsAfterSeries = active.series
    ? itemsAfterApp.filter((p) => postSeries(p) === active.series)
    : itemsAfterApp;

  /* Apply the module filter last so the type/app/series filters always
     narrow the universe first. If the user picks a specific module,
     we drop into the "module focus" view: only that module's parts
     show, no composite collapsing. */
  const filtered = active.module
    ? itemsAfterSeries.filter((p) => p.content.metadata.frontMatter?.module === active.module)
    : itemsAfterSeries;

  /* Module pill row counts: how many member posts each module
     contributes to the type/app/series-filtered universe. Hide modules
     with 0 members so the row shortens as the user filters. */
  const moduleCounts = useMemo(() => {
    const counts = {};
    for (const post of itemsAfterSeries) {
      const slug = post.content.metadata.frontMatter?.module;
      if (slug && knownModules.has(slug)) counts[slug] = (counts[slug] || 0) + 1;
    }
    return counts;
  }, [itemsAfterSeries, knownModules]);

  const visibleModuleSlugs = useMemo(
    () => moduleSlugs.filter((s) => moduleCounts[s] > 0),
    [moduleSlugs, moduleCounts],
  );

  const moduleLabels = useMemo(() => {
    const labels = {};
    for (const slug of moduleSlugs) labels[slug] = modules[slug]?.title || slug;
    return labels;
  }, [moduleSlugs, modules]);

  /* Composite collapsing: when no module-related filter is active and
     a module has 2+ parts in the current universe, replace those parts
     with a single ModuleCard. We collapse only on the unfiltered (no
     module) view because picking a type/app may already narrow a
     module to 1 visible part — collapsing that into a composite reads
     as misleading. */
  const composedItems = useMemo(() => {
    if (active.module) return filtered;

    const seenModules = new Set();
    const result = [];
    for (const post of filtered) {
      const slug = post.content.metadata.frontMatter?.module;
      const partsInUniverse = slug ? moduleCounts[slug] : 0;
      if (slug && partsInUniverse >= 2 && knownModules.has(slug)) {
        if (seenModules.has(slug)) continue;
        seenModules.add(slug);
        result.push({__module: slug});
      } else {
        result.push(post);
      }
    }
    return result;
  }, [filtered, moduleCounts, knownModules, active.module]);

  const setQueryParam = (key, value) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.pushState({}, '', url.toString());
  };

  const handleTypeChange = (next) => {
    setQueryParam('type', next);
    /* Clear app and series filters when the type changes if their
       active values no longer have posts in the new type. Keeps the UI
       honest when a user moves between content types. */
    setActive((prev) => {
      const newItems = next
        ? items.filter((p) => p.content.metadata.frontMatter?.contentType === next)
        : items;
      const stillHasApp = prev.app && newItems.some((p) => postApps(p).includes(prev.app));
      const nextApp = stillHasApp ? prev.app : null;
      if (!stillHasApp) setQueryParam('app', null);
      const stillHasSeries = prev.series && newItems.some((p) => postSeries(p) === prev.series);
      const nextSeries = stillHasSeries ? prev.series : null;
      if (!stillHasSeries) setQueryParam('series', null);
      return {...prev, type: next, app: nextApp, series: nextSeries};
    });
  };

  const handleAppChange = (next) => {
    setQueryParam('app', next);
    setActive((prev) => ({...prev, app: next}));
  };

  const handleSeriesChange = (next) => {
    setQueryParam('series', next);
    setActive((prev) => ({...prev, series: next}));
  };

  const handleModuleChange = (next) => {
    setQueryParam('module', next);
    setActive((prev) => ({...prev, module: next}));
  };

  /* Featured slot picks the most-recent non-module post from the
     composed list. When the user is in module-focus mode (active.module)
     we don't surface a Featured tile — the parts list is the focus. */
  const featured = !active.module && composedItems.length > 0 && !composedItems[0].__module
    ? composedItems[0]
    : null;
  const restItems = featured ? composedItems.slice(1) : composedItems;

  return (
    <>
      {featured && (
        <FeaturedCard {...postToFeaturedProps(featured, featured.content.metadata.frontMatter?.module && moduleCounts[featured.content.metadata.frontMatter.module])} />
      )}

      <div style={{height: 64}} />

      <ContentTypeFilter
        value={active.type}
        onChange={handleTypeChange}
        counts={typeCounts}
        allCount={items.length}
      />

      {visibleAppSlugs.length > 0 && (
        <>
          <div style={{height: 12}} />
          <ContentTypeFilter
            value={active.app}
            onChange={handleAppChange}
            types={visibleAppSlugs}
            labels={APP_LABELS}
            counts={appCounts}
            allLabel="All apps"
            allCount={itemsAfterType.length}
          />
        </>
      )}

      {visibleSeriesSlugs.length > 0 && (
        <>
          <div style={{height: 12}} />
          <ContentTypeFilter
            value={active.series}
            onChange={handleSeriesChange}
            types={visibleSeriesSlugs}
            labels={seriesLabels}
            counts={seriesCounts}
            allLabel="All series"
            allCount={itemsAfterApp.length}
          />
        </>
      )}

      {visibleModuleSlugs.length > 0 && (
        <>
          <div style={{height: 12}} />
          <ContentTypeFilter
            value={active.module}
            onChange={handleModuleChange}
            types={visibleModuleSlugs}
            labels={moduleLabels}
            counts={moduleCounts}
            allLabel="All modules"
            allCount={itemsAfterApp.length}
          />
        </>
      )}

      <div style={{height: 32}} />

      {filtered.length === 0 ? (
        <div style={{
          padding: '48px 0',
          textAlign: 'center',
          color: 'var(--c-cobalt-400)',
          fontSize: 16,
        }}>
          <Translate
            id="theme.academy.emptyState"
            description="Empty-state message shown when filters return no posts. {viewAll} is a link to the unfiltered academy index."
            values={{
              viewAll: <a href="/academy/"><Translate id="theme.academy.viewAll" description="Link text inside the empty-state message">View everything</Translate></a>,
            }}>
            {'Nothing yet for this combination. {viewAll}'}
          </Translate>
        </div>
      ) : restItems.length > 0 ? (
        <ContentCardGrid columns={2}>
          {restItems.map((item, i) => {
            if (item.__module) {
              const mod = modules[item.__module];
              if (!mod) return null;
              return (
                <ModuleCard
                  key={`mod-${item.__module}`}
                  href={mod.permalink}
                  title={mod.title}
                  lede={mod.lede}
                  parts={mod.parts.length}
                  totalMinutes={mod.totalMinutes}
                  latestDate={mod.latestDate}
                  curator={mod.curator}
                  audience={mod.audience}
                  contentTypes={mod.contentTypes}
                />
              );
            }
            const slug = item.content.metadata.frontMatter?.module;
            const moduleSize = slug && moduleCounts[slug];
            return (
              <ContentCard
                key={item.content.metadata.permalink || i}
                {...postToCardProps(item, moduleSize)}
              />
            );
          })}
        </ContentCardGrid>
      ) : null}
    </>
  );
}

function AcademyLandingFallback({items}) {
  if (items.length === 0) return null;
  const [featured, ...rest] = items;
  return (
    <>
      <FeaturedCard {...postToFeaturedProps(featured)} />
      <div style={{height: 64}} />
      {rest.length > 0 && (
        <ContentCardGrid columns={2}>
          {rest.map((post, i) => (
            <ContentCard key={post.content.metadata.permalink || i} {...postToCardProps(post)} />
          ))}
        </ContentCardGrid>
      )}
    </>
  );
}

export default function BlogListPage(props) {
  const {items, metadata} = props;
  const sorted = useMemo(
    () => items.slice().sort((a, b) => {
      const da = new Date(a.content.metadata.date).getTime();
      const db = new Date(b.content.metadata.date).getTime();
      return db - da;
    }),
    [items],
  );

  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogListPage,
      )}
    >
      <Layout
        title={metadata?.blogTitle || 'Conduction Academy'}
        description={metadata?.blogDescription}
      >
        <main className="marketing-page">
          <article style={{margin: 0, padding: 0}}>
            <Section spacing="default">
              <BrowserOnly fallback={<AcademyLandingFallback items={sorted} />}>
                {() => <AcademyLandingInner items={sorted} />}
              </BrowserOnly>

              <div style={{height: 96}} />

              <NewsletterCta
                title={translate({
                  id: 'theme.academy.newsletter.title',
                  message: 'New posts in your inbox, monthly.',
                  description: 'Newsletter section title at the bottom of the academy landing page',
                })}
                lede={translate({
                  id: 'theme.academy.newsletter.lede',
                  message: 'One mail a month. New guides, case studies, and webinars. No spam, unsubscribe any time.',
                  description: 'Newsletter section lede paragraph',
                })}
                placeholder={translate({
                  id: 'theme.academy.newsletter.placeholder',
                  message: 'you@company.com',
                  description: 'Placeholder text inside the newsletter email input',
                })}
                submitLabel={translate({
                  id: 'theme.academy.newsletter.submit',
                  message: 'Subscribe',
                  description: 'Submit button label on the newsletter form',
                })}
                fineprint={translate({
                  id: 'theme.academy.newsletter.fineprint',
                  message: 'We mail from info@conduction.nl. No list reselling.',
                  description: 'Small-print line below the newsletter form',
                })}
              />
            </Section>
          </article>
        </main>
      </Layout>
    </HtmlClassNameProvider>
  );
}
