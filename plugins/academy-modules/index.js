/**
 * academy-modules — Docusaurus plugin that exposes module groupings.
 *
 * Scans every `academy/<dated-slug>/index.mdx` frontmatter at build time,
 * groups posts by their `module` frontmatter, sorts members by
 * `modulePosition`, and writes the result to `globalData` so the
 * BlogListPage swizzle and per-module MDX index pages can render
 * composite cards and ordered TOCs without re-parsing markdown.
 *
 * The blog plugin itself only exposes a thin posts array to global
 * data (permalink, date, title). We need the full frontmatter — and
 * we only need it once per build, not per-render — so a tiny custom
 * plugin is the lowest-noise way to get it.
 *
 * Consumed by:
 *   - src/theme/BlogListPage (composite ModuleCards + module pill row)
 *   - <ModulePage module="..."> on per-module MDX index pages
 *
 * Output shape exposed via `usePluginData('academy-modules')`:
 *
 *   {
 *     modules: {
 *       'deskdesk-tutorial': {
 *         slug: 'deskdesk-tutorial',
 *         title: 'Build a Nextcloud app on the Conduction stack',
 *         lede: 'A four-part path from blank Nextcloud to a published app …',
 *         parts: [
 *           {
 *             slug: 'deskdesk-tutorial-1-scaffold',
 *             permalink: '/academy/deskdesk-tutorial-1-scaffold',
 *             title: 'Build a Nextcloud app on the Conduction stack — Part 1: Scaffold',
 *             summary: 'Clone the Conduction app template …',
 *             contentType: 'tutorial',
 *             durationMinutes: 20,
 *             audience: ['developer'],
 *             apps: ['openregister'],
 *             modulePosition: 1,
 *           },
 *           ...
 *         ],
 *         totalMinutes: 95,
 *         audience: ['developer'],
 *         apps: ['openregister', 'openconnector'],
 *         contentTypes: ['tutorial'],
 *       },
 *       ...
 *     },
 *     postModuleIndex: {
 *       '/academy/deskdesk-tutorial-1-scaffold': 'deskdesk-tutorial',
 *       ...
 *     },
 *   }
 *
 * Permalinks mirror the blog plugin's default: when frontmatter has an
 * explicit `slug:`, the post is served at `${routeBasePath}/${slug}`
 * (routeBasePath defaults to `/academy` in this site). When no slug is
 * set, Docusaurus derives one from the filename; we replicate that
 * fallback to keep things simple. If the site ever changes
 * routeBasePath, pass it via plugin options.
 */

const fs = require('fs');
const path = require('path');

const SLUG_RE      = /^\s*slug:\s*([^\s#]+)\s*$/m;
const TITLE_RE     = /^\s*title:\s*(?:"([^"]+)"|'([^']+)'|(.+?))\s*$/m;
const SUMMARY_RE   = /^\s*summary:\s*(?:"([^"]+)"|'([^']+)'|(.+?))\s*$/m;
const TYPE_RE      = /^\s*contentType:\s*([a-z-]+)\s*$/m;
const DURATION_RE  = /^\s*durationMinutes:\s*(\d+)\s*$/m;
const MODULE_RE    = /^\s*module:\s*([a-z0-9-]+)\s*$/m;
const MOD_POS_RE   = /^\s*modulePosition:\s*(\d+)\s*$/m;
const MOD_TITLE_RE = /^\s*moduleTitle:\s*(?:"([^"]+)"|'([^']+)'|(.+?))\s*$/m;
const MOD_LEDE_RE  = /^\s*moduleLede:\s*(?:"([^"]+)"|'([^']+)'|(.+?))\s*$/m;
const DATE_RE      = /^\s*date:\s*([0-9-]+)\s*$/m;

/* `audience: [developer, mkb]` or `apps: [openregister, openconnector]`.
   We only ever emit single-line flow-array YAML in the academy
   frontmatter, so a regex covers all current and likely-future entries. */
function arrayField(frontmatter, key) {
  const re = new RegExp('^\\s*' + key + ':\\s*\\[([^\\]]*)\\]\\s*$', 'm');
  const m  = frontmatter.match(re);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function pickQuoted(match) {
  if (!match) return undefined;
  return match[1] || match[2] || match[3];
}

function extractFrontmatter(mdxPath) {
  const raw = fs.readFileSync(mdxPath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = match[1];

  return {
    slug:           pickQuoted(fm.match(SLUG_RE)),
    title:          pickQuoted(fm.match(TITLE_RE)),
    summary:        pickQuoted(fm.match(SUMMARY_RE)),
    contentType:    pickQuoted(fm.match(TYPE_RE)),
    durationMinutes: fm.match(DURATION_RE) ? parseInt(fm.match(DURATION_RE)[1], 10) : undefined,
    module:         pickQuoted(fm.match(MODULE_RE)),
    modulePosition: fm.match(MOD_POS_RE) ? parseInt(fm.match(MOD_POS_RE)[1], 10) : undefined,
    moduleTitle:    pickQuoted(fm.match(MOD_TITLE_RE)),
    moduleLede:     pickQuoted(fm.match(MOD_LEDE_RE)),
    date:           pickQuoted(fm.match(DATE_RE)),
    audience:       arrayField(fm, 'audience'),
    apps:           arrayField(fm, 'apps'),
    authors:        arrayField(fm, 'authors'),
  };
}

/* Lightweight authors.yml parser. The academy authors file is a flat
   `key: \n  name: ... \n  image_url: ...` shape; we don't need a full
   YAML lib for it. Falls back to {} if the file is missing. */
function loadAuthors(authorsPath) {
  if (!fs.existsSync(authorsPath)) return {};
  const raw = fs.readFileSync(authorsPath, 'utf8');
  const out = {};
  let current = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line || line.startsWith('#')) continue;
    const top = line.match(/^([a-z0-9_-]+):\s*$/i);
    if (top) {
      current = top[1];
      out[current] = {};
      continue;
    }
    const kv = line.match(/^\s{2}([a-z_]+):\s*(.*)$/);
    if (kv && current) {
      out[current][kv[1]] = kv[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

function kebabToSentence(slug) {
  if (!slug) return '';
  return slug
    .split('-')
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

module.exports = function academyModulesPlugin(_context, options) {
  const contentDir   = options && options.contentDir   ? options.contentDir   : 'academy';
  const routeBasePath = options && options.routeBasePath ? options.routeBasePath : '/academy';

  return {
    name: 'academy-modules',

    async loadContent() {
      const siteDir = _context.siteDir;
      const absDir  = path.join(siteDir, contentDir);
      if (!fs.existsSync(absDir)) return {modules: {}, postModuleIndex: {}};

      const entries = fs.readdirSync(absDir, {withFileTypes: true})
        .filter((e) => e.isDirectory())
        .map((e) => path.join(absDir, e.name, 'index.mdx'))
        .filter((p) => fs.existsSync(p));

      const authorsMap = loadAuthors(path.join(absDir, 'authors.yml'));

      const posts = entries
        .map((p) => extractFrontmatter(p))
        .filter((fm) => fm && fm.module && fm.modulePosition);

      const byModule = {};
      for (const post of posts) {
        const slug = post.module;
        if (!byModule[slug]) {
          byModule[slug] = {
            slug,
            title: null,
            lede:  null,
            parts: [],
          };
        }
        const permalink = post.slug
          ? `${routeBasePath}/${post.slug}`
          : null;

        byModule[slug].parts.push({
          slug:            post.slug,
          permalink,
          title:           post.title,
          summary:         post.summary,
          contentType:     post.contentType,
          durationMinutes: post.durationMinutes,
          audience:        post.audience || [],
          apps:            post.apps || [],
          modulePosition:  post.modulePosition,
          date:            post.date,
          authors:         post.authors || [],
        });

        /* moduleTitle / moduleLede may live on any part (we ask
           editors to put them on position 1), so absorb the first
           occurrence we encounter. */
        if (!byModule[slug].title && post.moduleTitle) {
          byModule[slug].title = post.moduleTitle;
        }
        if (!byModule[slug].lede && post.moduleLede) {
          byModule[slug].lede = post.moduleLede;
        }
      }

      for (const slug of Object.keys(byModule)) {
        const mod = byModule[slug];
        mod.parts.sort((a, b) => a.modulePosition - b.modulePosition);

        if (!mod.title) mod.title = kebabToSentence(slug);
        if (!mod.lede && mod.parts[0]) mod.lede = mod.parts[0].summary || '';

        mod.totalMinutes  = mod.parts.reduce((sum, p) => sum + (p.durationMinutes || 0), 0);
        mod.audience      = unique(mod.parts.flatMap((p) => p.audience));
        mod.apps          = unique(mod.parts.flatMap((p) => p.apps));
        mod.contentTypes  = unique(mod.parts.map((p) => p.contentType));
        mod.permalink     = `${routeBasePath}/modules/${slug}`;

        /* Latest part's date drives the module card's date line — the
           module's "most recent activity" reads more truthfully than its
           kickoff date once parts trickle in over weeks. */
        mod.latestDate = mod.parts
          .map((p) => p.date)
          .filter(Boolean)
          .sort()
          .pop() || null;

        /* Curator = the author of part 1. If part 1 has multiple authors
           we take the first; if part 1 has none, we leave the slot empty
           and the card skips the avatar row. */
        const curatorKey = mod.parts[0] && mod.parts[0].authors && mod.parts[0].authors[0];
        const curatorYml = curatorKey && authorsMap[curatorKey];
        mod.curator = curatorYml
          ? {
              key:      curatorKey,
              name:     curatorYml.name || curatorKey,
              imageURL: curatorYml.image_url || null,
            }
          : null;
      }

      const postModuleIndex = {};
      for (const slug of Object.keys(byModule)) {
        for (const part of byModule[slug].parts) {
          if (part.permalink) postModuleIndex[part.permalink] = slug;
        }
      }

      return {modules: byModule, postModuleIndex};
    },

    async contentLoaded({content, actions}) {
      const {setGlobalData} = actions;
      setGlobalData(content);
    },
  };
};
