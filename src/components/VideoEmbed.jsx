/**
 * <VideoEmbed /> — responsive YouTube/Vimeo embed for academy posts.
 *
 * Real footage often beats a chart: a cleaning robot in a supermarket says
 * more than an adoption curve. Use inside an `hfaw-split` right column to
 * sit beside text, or full-width as its own beat.
 *
 *   import VideoEmbed from '@site/src/components/VideoEmbed';
 *   <VideoEmbed
 *     url="https://www.youtube.com/watch?v=8-ESlUGAwGU"
 *     title="Amazon's warehouse robots"
 *     caption="A million robots on the floor. Line items, not demo reels."
 *   />
 *
 * YouTube renders via youtube-nocookie.com (no tracking cookies before
 * play); Vimeo via player.vimeo.com with dnt=1. Unknown hosts render a
 * plain link instead of an iframe, so a typo never ships a broken frame.
 */

import React from 'react';

function embedSrcFor(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.pathname.startsWith('/embed/')
      ? u.pathname.split('/')[2]
      : u.pathname.startsWith('/shorts/')
        ? u.pathname.split('/')[2]
        : u.searchParams.get('v');
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'vimeo.com') {
    const id = u.pathname.slice(1).split('/')[0];
    return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}?dnt=1` : null;
  }
  if (host === 'player.vimeo.com') {
    return `${u.origin}${u.pathname}?dnt=1`;
  }
  return null;
}

export default function VideoEmbed({url, title, caption}) {
  const src = embedSrcFor(url);
  if (!src) {
    return (
      <p>
        <a href={url} target="_blank" rel="noopener noreferrer">{title || url}</a>
      </p>
    );
  }
  return (
    <figure style={{margin: '2rem 0'}}>
      <div style={{position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 12, background: 'var(--ifm-color-emphasis-100)'}}>
        <iframe
          src={src}
          title={title || 'Embedded video'}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0}}
        />
      </div>
      {caption && (
        <figcaption style={{fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)', marginTop: 8, textAlign: 'center'}}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
