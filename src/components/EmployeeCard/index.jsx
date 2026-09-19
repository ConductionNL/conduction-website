/**
 * <EmployeeCard /> — site-local, temporarily.
 *
 * Same API and markup as @conduction/docusaurus-preset's EmployeeCard. The
 * only difference is the contact-icon set: the published preset (3.27.1)
 * carries four hand-drawn glyphs and no way to add a fifth, so /about could
 * not show Bluesky or Mastodon at all — an unknown icon name falls back to
 * rendering the label as text.
 *
 * DELETE THIS once the site depends on a preset that carries the full set,
 * and point both about.mdx imports back at the preset.
 *
 * All six icons come from Font Awesome Free 7 via npm, so this repo hosts no
 * brand-owned artwork and redistributes nothing that is not ours to pass on.
 * The icons are CC BY 4.0; the attribution that licence requires lives in
 * ICONS.md beside this file and must stay with it.
 *
 * Everything renders black. Four of the six are trademarks and every owner
 * restricts the colours their mark may take — black is the only value all
 * four permit. See ICONS.md for each policy, quoted.
 */

import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faEnvelope, faPhone} from '@fortawesome/free-solid-svg-icons';
import {faGithub, faLinkedin, faBluesky, faMastodon} from '@fortawesome/free-brands-svg-icons';
import styles from './styles.module.css';

const ICONS = {
  mail: faEnvelope,
  phone: faPhone,
  github: faGithub,
  linkedin: faLinkedin,
  bluesky: faBluesky,
  mastodon: faMastodon,
};

function Icon({name, label}) {
  if (!ICONS[name]) return label || null;
  return <FontAwesomeIcon className={styles.icon} icon={ICONS[name]} />;
}

/* Every contact link leaves the site, so it opens in a new tab — except
   `mailto:` and `tel:`, which hand off to another app and would leave an
   empty tab behind. `rel` is required with `target="_blank"`: without it the
   opened page gets a `window.opener` handle back into ours. */
const externalProps = (href = '') =>
  /^https?:\/\//i.test(href) ? {target: '_blank', rel: 'noopener noreferrer'} : {};

export function TeamGrid({columns = 3, children, className}) {
  const composed = [styles.grid, styles['cols-' + columns], className].filter(Boolean).join(' ');
  return <div className={composed}>{children}</div>;
}

export default function EmployeeCard({
  variant = 'compact',
  name,
  role,
  initials,
  photo,
  avatarColor,
  bio,
  apps = [],
  links = [],
  className,
}) {
  /* Call sites pass root-absolute photo paths (`/img/team/x.svg`). Those only
     resolve while baseUrl is `/`: `docusaurus start --locale nl` serves the
     whole site under `/nl/`, and an un-prefixed path then misses the static
     mount and comes back as the SPA's HTML fallback — a broken avatar on
     every Dutch card. useBaseUrl is a no-op in production, where baseUrl is
     `/` for both locales. */
  const photoUrl = useBaseUrl(photo || '/');

  const avatar = (cls) => (
    <div className={cls} style={!photo ? {background: avatarColor || 'var(--c-blue-cobalt)'} : undefined}>
      {photo ? <img src={photoUrl} alt={name} /> : initials}
    </div>
  );

  if (variant === 'photo') {
    return (
      <div className={[styles.cardPhoto, className].filter(Boolean).join(' ')}>
        {avatar(styles.avatarLarge)}
        {name && <div className={styles.name}>{name}</div>}
        {role && <div className={styles.role}>{role}</div>}
        {bio && <p className={styles.bio}>{bio}</p>}
        {links.length > 0 && (
          <div className={styles.contacts}>
            {links.map((l, i) => (
              <a key={i} href={l.href} aria-label={l.label} {...externalProps(l.href)}>
                <Icon name={l.icon} label={l.label} />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={[styles.cardDetail, className].filter(Boolean).join(' ')}>
        {avatar(styles.avatarLarge)}
        <div>
          {name && <div className={styles.name}>{name}</div>}
          {role && <div className={styles.role}>{role}</div>}
        </div>
        {bio && <p className={styles.bio}>{bio}</p>}
        {apps.length > 0 && (
          <div>
            <div className={styles.appsLabel}>Apps I work on</div>
            <div className={styles.appsList}>
              {apps.map((a, i) => <span key={i} className={styles.appPill}>{a}</span>)}
            </div>
          </div>
        )}
        {links.length > 0 && (
          <div className={styles.contactsInline}>
            {links.map((l, i) => (
              <a key={i} href={l.href} {...externalProps(l.href)}><Icon name={l.icon} label={l.label} />{l.label}</a>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* default: compact */
  const Tag = links.length > 0 && links[0].href ? 'a' : 'div';
  return (
    <Tag
      href={Tag === 'a' ? links[0].href : undefined}
      {...(Tag === 'a' ? externalProps(links[0].href) : {})}
      className={[styles.cardCompact, className].filter(Boolean).join(' ')}
    >
      {avatar(styles.avatar)}
      <div className={styles.info}>
        {name && <div className={styles.name}>{name}</div>}
        {role && <div className={styles.role}>{role}</div>}
      </div>
      {links.length > 0 && (
        <div className={styles.linksRow}>
          {links.map((l, i) => (
            <a key={i} href={l.href} aria-label={l.label} {...externalProps(l.href)}>
              <Icon name={l.icon} label={l.label} />
            </a>
          ))}
        </div>
      )}
    </Tag>
  );
}
