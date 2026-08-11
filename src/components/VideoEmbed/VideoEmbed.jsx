/**
 * <VideoEmbed />
 *
 * In-body 16:9 YouTube embed for academy posts, with an optional
 * caption underneath. Where <WebinarHero /> puts the recording in the
 * hero slot because the video *is* the page, this one sits inline in
 * the prose as supporting evidence for the paragraph around it.
 *
 * Shares WebinarHero's cover/coverVideo geometry so both embeds have
 * the same corner radius, ratio and dark backdrop.
 *
 * Accepts either a watch URL, a youtu.be short link, an /embed/ URL,
 * or a bare video id. An unrecognised url renders nothing rather than
 * an empty black box.
 */

import React from 'react';
import styles from './VideoEmbed.module.css';

/**
 * Extract a YouTube video id from a watch / youtu.be / embed URL, or
 * pass through a value that is already a bare id.
 * Mirrors youTubeId() in src/theme/BlogPostPage/index.jsx.
 */
function youTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  if (m) return m[1];
  return /^[\w-]{6,}$/.test(url) ? url : null;
}

export default function VideoEmbed({url, title, caption, start}) {
  const id = youTubeId(url);
  if (!id) return null;

  const src =
    `https://www.youtube-nocookie.com/embed/${id}` +
    (start ? `?start=${encodeURIComponent(start)}` : '');

  return (
    <figure className={styles.figure}>
      <div className={styles.frame}>
        <iframe
          className={styles.video}
          src={src}
          title={title || 'Video'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
