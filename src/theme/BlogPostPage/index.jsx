/**
 * Academy BlogPostPage swizzle.
 *
 * Replaces Docusaurus's default theme-classic BlogPostPage with the
 * academy detail layout: <ContentDetailHero/> at the top with the
 * frontmatter, the post body in a centred article, then the standard
 * BlogPostPaginator's prev/next pair surfaced through <RelatedPosts/>
 * + <ContentCard/> for the "Keep learning…" footer. No TOC sidebar
 * (the brand Navbar swizzle does not expose the .navbar selector
 * the default TOC hook requires, and the academy detail layout reads
 * better as a single column anyway).
 *
 * The default swizzle in node_modules/@docusaurus/theme-classic/lib/
 * theme/BlogPostPage/ is the source of the rest of the chrome
 * (metadata, structured data, blog-post provider). We keep that
 * scaffolding and replace only the content portion.
 */

import React from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {HtmlClassNameProvider, ThemeClassNames, useColorMode} from '@docusaurus/theme-common';
import {
  BlogPostProvider,
  useBlogPost,
} from '@docusaurus/plugin-content-blog/client';
import Layout from '@theme/Layout';
import BlogPostPageMetadata from '@theme/BlogPostPage/Metadata';
import BlogPostPageStructuredData from '@theme/BlogPostPage/StructuredData';
import {
  ContentDetailHero,
  ContentCard,
  RelatedPosts,
  Section,
  AppCrossLinks,
  FeaturedCard,
} from '@conduction/docusaurus-preset/components';

/* ai-content-disclosure copy, per kind and locale. Kept in sync with the
   preset's AiDisclosure component (which the academy layout replaces with
   a byline-subtle mark linking to /ai). */
const AI_MARK_COPY = {
  en: {
    generated: 'This page was generated with AI. Read what that means and how Conduction uses AI.',
    modified:
      'This page was partially modified with AI. Read what that means and how Conduction uses AI.',
    assisted:
      'This page was written using AI assistance, for example for spelling and research. Read what that means and how Conduction uses AI.',
  },
  nl: {
    generated:
      'Deze pagina is gegenereerd met AI. Lees wat dat betekent en hoe Conduction AI gebruikt.',
    modified:
      'Deze pagina is gedeeltelijk aangepast met AI. Lees wat dat betekent en hoe Conduction AI gebruikt.',
    assisted:
      'Deze pagina is geschreven met hulp van AI, bijvoorbeeld voor spelling en onderzoek. Lees wat dat betekent en hoe Conduction AI gebruikt.',
  },
};

import WebinarHero from '@site/src/components/WebinarHero/WebinarHero';
import {glyphFor} from './heroGlyphs';
import styles from './styles.module.css';

/**
 * Extract a YouTube video id from a watch / youtu.be / embed URL.
 * Returns null when the URL is missing or not a recognised YouTube link.
 */
function youTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  return m ? m[1] : null;
}

/**
 * Resolve the hero glyph for a post.
 *
 * A `heroIcon` naming an entry in ./heroGlyphs wins. The five contentType
 * names still resolve, so `heroIcon: tutorial` keeps working. Anything else
 * warns at build time and falls back to the contentType icon, which means a
 * typo shows the old generic glyph rather than an empty hex.
 */
function heroIconFor(heroIcon, contentType, permalink) {
  const named = glyphFor(heroIcon);
  if (named) return named;
  if (heroIcon && !CONTENT_TYPE_ICONS.includes(heroIcon)) {
    warnUnknown('heroIcon', heroIcon, permalink, contentType || 'blog');
  }
  return defaultIconFor(heroIcon && CONTENT_TYPE_ICONS.includes(heroIcon)
    ? heroIcon
    : contentType);
}

const CONTENT_TYPE_ICONS = ['guide', 'case-study', 'webinar', 'tutorial', 'blog'];

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

/* Configurable post hero.
 *
 * The header at the top of an academy detail page used to be hardcoded off
 * `contentType`. It is now selectable per post through frontmatter, with the
 * old contentType mapping kept as the default — a post that sets none of
 * these keys renders exactly what it rendered before.
 *
 *   hero:         featured | detail | webinar | none
 *   heroTone:     cobalt | cobalt-dark | cobalt-deep | cobalt-50 | mint | orange
 *   heroIcon:     a name from ./heroGlyphs (wolf, pipeline, vault, …), or one
 *                 of the contentType icons (guide | case-study | webinar |
 *                 tutorial | blog)
 *   heroImage:    site-absolute path or absolute URL; replaces the hex icon
 *   heroImageAlt: alt text for heroImage (decorative when omitted)
 *   heroEyebrow:  overrides the eyebrow label on the `featured` variant
 *   heroAccent:   orange | cobalt — `featured` variant only
 *
 * Unrecognised values warn at build time and fall back to the default, the
 * same contract the `ai` key follows above.
 */
const HERO_VARIANTS = ['featured', 'detail', 'webinar', 'none'];
const HERO_TONES = [
  'cobalt', 'cobalt-dark', 'cobalt-deep', 'cobalt-50', 'mint', 'orange',
];
const HERO_ACCENTS = ['orange', 'cobalt'];

/**
 * Warn once about an unrecognised frontmatter value and return the fallback.
 */
function warnUnknown(key, value, permalink, fallback) {
  if (typeof console !== 'undefined') {
    console.warn(
      `Unknown "${key}" frontmatter value "${value}" on ${permalink}; falling back to "${fallback}".`,
    );
  }
  return fallback;
}

/**
 * Resolve which hero a post renders.
 *
 * Explicit `hero:` wins; otherwise the historical contentType mapping applies
 * (a webinar with a usable YouTube URL gets the video hero, opinion pieces get
 * the featured card, everything else the detail hero). `webinar` degrades to
 * `detail` when no YouTube id can be extracted, so a mistyped videoUrl shows
 * a normal header rather than an empty player.
 */
function resolveHeroVariant(frontMatter, videoId, permalink) {
  const requested = frontMatter.hero;
  let variant;
  if (requested === undefined || requested === null) {
    variant = (frontMatter.contentType === 'webinar' && videoId) ? 'webinar'
      : frontMatter.contentType === 'opinion' ? 'featured'
        : 'detail';
  } else if (HERO_VARIANTS.includes(requested)) {
    variant = requested;
  } else {
    variant = warnUnknown('hero', requested, permalink, 'detail');
  }
  return variant === 'webinar' && !videoId ? 'detail' : variant;
}

/**
 * Map a Docusaurus blog post metadata object onto ContentCard props.
 * Used for the prev/next paginator on the bottom of detail pages.
 */
function postMetaToCardProps(meta) {
  if (!meta) return null;
  const fm = meta.frontMatter || {};
  return {
    href: meta.permalink,
    contentType: fm.contentType,
    title: meta.title || fm.title,
    summary: fm.summary || meta.description,
    author: meta.authors && meta.authors[0]
      ? {name: meta.authors[0].name, avatarSrc: meta.authors[0].imageURL}
      : null,
    date: meta.date,
    tags: (meta.tags || []).slice(0, 2).map((t) => t.label || t),
    thumbnail: {
      /* Same glyph the post's own hero uses, so a card and the page it links
         to agree. No warning here — the post's own page already emits one. */
      icon: glyphFor(fm.heroIcon) || defaultIconFor(fm.contentType),
      panelTone: panelToneFor(fm.contentType),
    },
  };
}

function BlogPostPageContent({children}) {
  const {metadata} = useBlogPost();
  const {frontMatter, nextItem, prevItem} = metadata;

  /* ai-content-disclosure (EU AI Act art. 50): this academy layout renders
     the MDX children directly and never mounts BlogPostItem/Content, so the
     preset's disclosure wrapper cannot fire here; a byline-subtle mark is
     mounted in this swizzle instead, linking to the /ai page. Same contract
     as the preset's resolveAiFrontmatter (which ./components does not
     export): absent key stays silent, an unrecognised value warns at build
     time and renders nothing. */
  const aiKind = ['generated', 'modified', 'assisted'].includes(frontMatter.ai)
    ? frontMatter.ai
    : null;
  if (frontMatter.ai && !aiKind && typeof console !== 'undefined') {
    console.warn(
      `Unknown "ai" frontmatter value "${frontMatter.ai}" on ${metadata.permalink}; AI disclosure not rendered.`,
    );
  }
  const {i18n} = useDocusaurusContext();
  const aiLocale = (i18n && i18n.currentLocale) || 'en';
  const aiCopy = aiKind
    ? (AI_MARK_COPY[aiLocale] || AI_MARK_COPY.en)[aiKind]
    : null;
  /* The Commission's own mark, in its black/white transparent treatments.
     A brand-grey hexagon was tried here and reverted: at byline size the
     grey-on-white container plus knocked-out letterforms lost too much
     contrast to read. The official mark is darker, higher-contrast and
     already familiar, which is the whole point of a disclosure. */
  /* ONE <img>, chosen in JS rather than two rendered and one hidden in CSS.
     The previous approach shipped both treatments and hid one with a
     `display: none` that lost on specificity to the sizing rule below it, so
     both rendered. That is not merely a duplicate: the file names mislead.
     `*-black-transparent.svg` is a half-opacity BLACK disc with WHITE
     letters, while `*-white-transparent.svg` is a half-opacity white disc
     with near-black (#1d1d1b) letters — so on a light page the "white" mark
     shows up as a second set of dark AI letters beside the first. Rendering
     one element makes the failure structurally impossible. */
  const {colorMode} = useColorMode();
  const aiIconBase =
    {generated: 'ai-generated', modified: 'ai-modified', assisted: 'ai'}[aiKind] || 'ai';
  const aiTreatment = colorMode === 'dark' ? 'white' : 'black';
  const aiIcon = useBaseUrl(`/img/ai-disclosure/${aiIconBase}-${aiTreatment}-transparent.svg`);
  const aiPageHref = useBaseUrl('/ai');

  const academyHref = useBaseUrl('/academy/');
  const academyTypeHref = useBaseUrl(
    '/academy/' + (frontMatter.contentType ? '?type=' + frontMatter.contentType : ''),
  );

  /* Hero configuration, resolved before heroProps so the cover can be built
     from it. useBaseUrl is a hook, so it runs unconditionally and gets a
     harmless placeholder when no heroImage is set; it passes absolute URLs
     through untouched. */
  const heroImageSrc = useBaseUrl(frontMatter.heroImage || '/');
  const heroTone = frontMatter.heroTone === undefined
    ? 'cobalt'
    : HERO_TONES.includes(frontMatter.heroTone)
      ? frontMatter.heroTone
      : warnUnknown('heroTone', frontMatter.heroTone, metadata.permalink, 'cobalt');
  const heroAccent = frontMatter.heroAccent === undefined
    ? 'orange'
    : HERO_ACCENTS.includes(frontMatter.heroAccent)
      ? frontMatter.heroAccent
      : warnUnknown('heroAccent', frontMatter.heroAccent, metadata.permalink, 'orange');
  const heroCover = frontMatter.heroImage
    ? {src: heroImageSrc, alt: frontMatter.heroImageAlt || ''}
    : {
      icon: heroIconFor(frontMatter.heroIcon, frontMatter.contentType, metadata.permalink),
      tone: heroTone,
    };

  const author = metadata.authors && metadata.authors[0];
  const heroProps = {
    crumb: [
      {label: 'Academy', href: academyHref},
      frontMatter.contentType
        ? {label: frontMatter.contentType, href: academyTypeHref}
        : null,
      metadata.title,
    ].filter(Boolean),
    contentType: frontMatter.contentType,
    tags: (metadata.tags || []).map((t) => t.label || t),
    title: metadata.title || frontMatter.title,
    summary: frontMatter.summary || metadata.description,
    author: author ? {name: author.name, avatarSrc: author.imageURL} : null,
    date: metadata.date,
    duration: metadata.readingTime
      ? Math.max(1, Math.round(metadata.readingTime)) + ' min read'
      : null,
    cover: heroCover,
  };

  const webinarVideoId = youTubeId(frontMatter.videoUrl);
  const heroVariant = resolveHeroVariant(
    frontMatter,
    webinarVideoId,
    metadata.permalink,
  );

  const related = [postMetaToCardProps(prevItem), postMetaToCardProps(nextItem)]
    .filter(Boolean);

  return (
    <Section spacing="default">
      {heroVariant === 'webinar' && (
        <WebinarHero
          {...heroProps}
          videoEmbedUrl={`https://www.youtube.com/embed/${webinarVideoId}`}
          videoTitle={heroProps.title}
        />
      )}
      {heroVariant === 'featured' && (
        <FeaturedCard
          eyebrow={frontMatter.heroEyebrow ?? frontMatter.contentType}
          title={heroProps.title}
          lede={heroProps.summary}
          ctaLabel=""
          author={heroProps.author}
          date={heroProps.date}
          contentType={frontMatter.contentType}
          durationMinutes={frontMatter.durationMinutes}
          thumbnail={heroProps.cover}
          accent={heroAccent}
        />
      )}
      {heroVariant === 'detail' && <ContentDetailHero {...heroProps} />}

      <div className={`content-detail-body ${styles.body}`}>
        {aiKind && (
          <a href={aiPageHref} className={styles.aiMark}>
            <img src={aiIcon} alt="" className={styles.aiMarkIcon} />
            <span>{aiCopy}</span>
          </a>
        )}
        {children}
      </div>

      {/* Posts with an endnotes "## Sources" section set `appsCta: inline`
          and mount <AppCrossLinks> themselves just above that heading, so
          the app CTAs sit after the reading content and the sources render
          beneath them as endnotes. For everything else the block is
          appended here, after the whole body. */}
      {Array.isArray(frontMatter.apps) && frontMatter.apps.length > 0
        && frontMatter.appsCta !== 'inline' && (
        <div style={{marginTop: 64}}>
          <AppCrossLinks
            variant="inline"
            apps={frontMatter.apps}
            surface="academy"
            heading={frontMatter.apps.length === 1
              ? 'Continue with this app'
              : 'Continue with these apps'}
          />
        </div>
      )}

      {related.length > 0 && (
        <div style={{marginTop: 96}}>
          <RelatedPosts
            title="Keep learning…"
            viewAllHref={academyHref}
            viewAllLabel="View all"
            columns={2}
          >
            {related.map((p, i) => <ContentCard key={p.href || i} {...p} />)}
          </RelatedPosts>
        </div>
      )}
    </Section>
  );
}

export default function BlogPostPage(props) {
  const BlogPostContent = props.content;
  return (
    <BlogPostProvider content={props.content} isBlogPostPage>
      <HtmlClassNameProvider
        className={clsx(
          ThemeClassNames.wrapper.blogPages,
          ThemeClassNames.page.blogPostPage,
        )}>
        <BlogPostPageMetadata />
        <BlogPostPageStructuredData />
        <Layout>
          <main className="marketing-page">
            <article style={{margin: 0, padding: 0}}>
              <BlogPostPageContent>
                <BlogPostContent />
              </BlogPostPageContent>
            </article>
          </main>
        </Layout>
      </HtmlClassNameProvider>
    </BlogPostProvider>
  );
}
