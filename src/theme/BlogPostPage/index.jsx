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
import {HtmlClassNameProvider, ThemeClassNames} from '@docusaurus/theme-common';
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
} from '@conduction/docusaurus-preset/components';
import styles from './styles.module.css';

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
      icon: defaultIconFor(fm.contentType),
      panelTone: panelToneFor(fm.contentType),
    },
  };
}

function BlogPostPageContent({children}) {
  const {metadata} = useBlogPost();
  const {frontMatter, nextItem, prevItem} = metadata;

  const author = metadata.authors && metadata.authors[0];
  const heroProps = {
    crumb: [
      {label: 'Academy', href: '/academy/'},
      frontMatter.contentType
        ? {label: frontMatter.contentType, href: '/academy/?type=' + frontMatter.contentType}
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
    cover: {
      icon: defaultIconFor(frontMatter.contentType),
      tone: 'cobalt',
    },
  };

  const related = [postMetaToCardProps(prevItem), postMetaToCardProps(nextItem)]
    .filter(Boolean);

  return (
    <Section spacing="default">
      <ContentDetailHero {...heroProps} />

      <div className={`content-detail-body ${styles.body}`}>
        {children}
      </div>

      {Array.isArray(frontMatter.apps) && frontMatter.apps.length > 0 && (
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
            viewAllHref="/academy/"
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
