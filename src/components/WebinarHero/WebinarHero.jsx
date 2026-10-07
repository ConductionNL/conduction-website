/**
 * <WebinarHero />
 *
 * Academy detail-page header for webinar posts. Same layout as the
 * preset <ContentDetailHero /> (crumb, title, 16:9 cover, summary,
 * tags, byline) but the cover region holds the webinar's YouTube
 * recording instead of a hex thumbnail or cover image — the video is
 * the point of a webinar page, so it takes the hero slot.
 *
 * Reuses the preset primitives (Pill, AuthorByline) so the chrome
 * matches ContentDetailHero exactly; only the cover differs.
 */

import React from 'react';
import {
  Pill,
  AuthorByline,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_BULLET_COLOR,
} from '@conduction/docusaurus-preset/components';
import styles from './WebinarHero.module.css';

export default function WebinarHero({
  crumb,
  contentType,
  contentTypeLabel,
  tags = [],
  title,
  summary,
  author,
  date,
  dateLabel,
  duration,
  locale,
  videoEmbedUrl,
  videoTitle,
  className,
}) {
  const composed = [styles.hero, className].filter(Boolean).join(' ');

  const typeLabel = contentTypeLabel
    || (contentType && CONTENT_TYPE_LABELS[contentType])
    || null;
  const typeBullet = contentType
    ? CONTENT_TYPE_BULLET_COLOR[contentType]
    : undefined;

  return (
    <section className={composed}>
      {Array.isArray(crumb) && crumb.length > 0 && (
        <div className={styles.crumb}>
          {crumb.map((c, i) => {
            const last = i === crumb.length - 1;
            const sep = !last
              ? <span className={styles.sep} aria-hidden="true">/</span>
              : null;
            if (typeof c === 'string') {
              return <React.Fragment key={i}>{c}{sep}</React.Fragment>;
            }
            return (
              <React.Fragment key={i}>
                {c.href
                  ? <a href={c.href}>{c.label}</a>
                  : <span>{c.label}</span>}
                {sep}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {title && <h1 className={styles.title}>{title}</h1>}

      <div className={styles.cover}>
        <span className={styles.watermark} aria-hidden="true" />
        {videoEmbedUrl && (
          <iframe
            className={styles.coverVideo}
            src={videoEmbedUrl}
            title={videoTitle || title || 'Webinar recording'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>

      {summary && <p className={styles.summary}>{summary}</p>}

      {(typeLabel || tags.length > 0) && (
        <div className={styles.tags}>
          {typeLabel && (
            <Pill bullet bulletColor={typeBullet}>{typeLabel}</Pill>
          )}
          {tags.map((t, i) => (
            <Pill key={i} bullet bulletColor="var(--c-cobalt-300)">{t}</Pill>
          ))}
        </div>
      )}

      {(author || date || duration) && (
        <div className={styles.meta}>
          {(author || date) && (
            <AuthorByline
              name={author && author.name}
              avatarSrc={author && author.avatarSrc}
              initials={author && author.initials}
              date={date}
              dateLabel={dateLabel}
              locale={locale}
            />
          )}
          {duration && <span className={styles.duration}>{duration}</span>}
        </div>
      )}
    </section>
  );
}
