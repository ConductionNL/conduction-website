#!/usr/bin/env node
/**
 * scripts/validate-ai-baseline.mjs
 *
 * Hard-fail validation that the AI-crawler baseline is intact in the
 * production build. Run after `npx docusaurus build` (CI invokes it via
 * .github/workflows/documentation.yml, see also npm script
 * `validate:ai-baseline`).
 *
 * Checks (any failure exits non-zero):
 *
 *   robots.txt      Exists, has Sitemap line, has User-agent: * Allow: /,
 *                   names at least one AI training and one AI search bot.
 *   llms.txt        Exists, body > 1 KB (placeholder content is shorter).
 *   sitemap.xml     Exists, has >= 50 <loc> entries.
 *   nl/sitemap.xml  Same, for the Dutch locale build.
 *   homepage        Has >= 2 application/ld+json blocks, all valid JSON.
 *                   Has og:image, og:type, twitter:site, twitter:card
 *                   meta tags. og:image URL resolves to an actual file
 *                   in the build output (so LinkedIn/Slack/AI previews
 *                   don't render a 404).
 *   /apps/openregister  Has SoftwareApplication JSON-LD with
 *                   applicationCategory + operatingSystem (regression
 *                   marker for the DetailHero schema emission shipped
 *                   in @conduction/docusaurus-preset).
 *
 * Adding a check: append to the CHECKS array. Each check is a function
 * (buildDir) -> {ok: boolean, msg: string}. Keep messages specific so
 * a failing CI annotation tells the reader what to fix without
 * re-running locally.
 */

import {readFileSync, existsSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';

const buildDir = resolve(process.argv[2] || 'build');

if (!existsSync(buildDir)) {
  console.error(`✗ build directory not found: ${buildDir}`);
  console.error(`  Run \`npx docusaurus build\` first.`);
  process.exit(2);
}

const results = [];

function check(name, fn) {
  try {
    const r = fn();
    results.push({name, ok: r.ok, msg: r.msg});
  } catch (e) {
    results.push({name, ok: false, msg: `threw: ${e.message}`});
  }
}

function readBuild(p) {
  return readFileSync(join(buildDir, p), 'utf8');
}

/* robots.txt */
check('robots.txt exists and is non-empty', () => {
  const path = join(buildDir, 'robots.txt');
  if (!existsSync(path)) return {ok: false, msg: 'missing'};
  const size = statSync(path).size;
  if (size < 50) return {ok: false, msg: `too small (${size} bytes)`};
  return {ok: true, msg: `${size} bytes`};
});

check('robots.txt has Sitemap line', () => {
  const body = readBuild('robots.txt');
  const matches = body.match(/^Sitemap:\s+https?:\/\//gm) || [];
  if (matches.length === 0) return {ok: false, msg: 'no Sitemap: line'};
  return {ok: true, msg: `${matches.length} sitemap line(s)`};
});

check('robots.txt allows AI search bots', () => {
  const body = readBuild('robots.txt');
  const needed = ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'];
  const missing = needed.filter(ua => !body.includes(`User-agent: ${ua}`));
  if (missing.length) return {ok: false, msg: `missing User-agent entries for: ${missing.join(', ')}`};
  return {ok: true, msg: needed.join(', ')};
});

check('robots.txt has at least User-agent: * Allow: /', () => {
  const body = readBuild('robots.txt');
  if (!/^User-agent:\s*\*\s*$/m.test(body)) return {ok: false, msg: 'no User-agent: * block'};
  if (!/^Allow:\s*\/\s*$/m.test(body)) return {ok: false, msg: 'no Allow: / line'};
  return {ok: true, msg: 'default-allow present'};
});

/* llms.txt */
check('llms.txt exists and has content', () => {
  const path = join(buildDir, 'llms.txt');
  if (!existsSync(path)) return {ok: false, msg: 'missing'};
  const size = statSync(path).size;
  if (size < 1024) return {ok: false, msg: `under 1 KB (${size} bytes) - likely placeholder`};
  return {ok: true, msg: `${size} bytes`};
});

/* Sitemaps */
function sitemapLocCount(p) {
  const body = readBuild(p);
  return (body.match(/<loc>/g) || []).length;
}

check('sitemap.xml has at least 50 URLs', () => {
  const path = join(buildDir, 'sitemap.xml');
  if (!existsSync(path)) return {ok: false, msg: 'missing'};
  const n = sitemapLocCount('sitemap.xml');
  if (n < 50) return {ok: false, msg: `only ${n} URLs`};
  return {ok: true, msg: `${n} URLs`};
});

check('nl/sitemap.xml has at least 50 URLs', () => {
  const path = join(buildDir, 'nl/sitemap.xml');
  if (!existsSync(path)) return {ok: false, msg: 'missing'};
  const n = sitemapLocCount('nl/sitemap.xml');
  if (n < 50) return {ok: false, msg: `only ${n} URLs`};
  return {ok: true, msg: `${n} URLs`};
});

/* JSON-LD blocks */
function extractJsonLdBlocks(html) {
  /* Docusaurus emits JSON-LD via two paths with different attribute
     ordering: top-level headTags renders <script type="..."> first,
     and Helmet (used by <Head> from inside React components) prefixes
     data-rh="true". Match either ordering. */
  const out = [];
  const re = /<script\b[^>]*\btype="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}

check('homepage has >= 2 JSON-LD blocks, all valid JSON', () => {
  const html = readBuild('index.html');
  const blocks = extractJsonLdBlocks(html);
  if (blocks.length < 2) return {ok: false, msg: `only ${blocks.length} block(s)`};
  for (const [i, b] of blocks.entries()) {
    try {JSON.parse(b);} catch (e) {
      return {ok: false, msg: `block ${i} invalid JSON: ${e.message}`};
    }
  }
  return {ok: true, msg: `${blocks.length} blocks, all valid`};
});

check('homepage JSON-LD includes Organization and WebSite', () => {
  const html = readBuild('index.html');
  const types = extractJsonLdBlocks(html).map(b => {
    try {return JSON.parse(b)['@type'];} catch {return null;}
  });
  const want = ['Organization', 'WebSite'];
  const missing = want.filter(t => !types.includes(t));
  if (missing.length) return {ok: false, msg: `missing @type: ${missing.join(', ')}`};
  return {ok: true, msg: types.join(' + ')};
});

/* Social cards */
function metaTag(html, key) {
  const re = new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]+content="([^"]+)"`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

check('homepage has og:image, og:type, twitter:site, twitter:card', () => {
  const html = readBuild('index.html');
  const checks = {
    'og:image': metaTag(html, 'og:image'),
    'og:type': metaTag(html, 'og:type'),
    'twitter:site': metaTag(html, 'twitter:site'),
    'twitter:card': metaTag(html, 'twitter:card'),
  };
  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return {ok: false, msg: `missing: ${missing.join(', ')}`};
  return {ok: true, msg: 'all four present'};
});

check('og:image URL resolves to a file in the build', () => {
  const html = readBuild('index.html');
  const url = metaTag(html, 'og:image');
  if (!url) return {ok: false, msg: 'no og:image meta'};
  /* Strip the host prefix the build embeds (https://www.conduction.nl/) */
  const path = url.replace(/^https?:\/\/[^/]+\//, '');
  const local = join(buildDir, path);
  if (!existsSync(local)) return {ok: false, msg: `og:image refers to ${url}, not found at ${local}`};
  const size = statSync(local).size;
  if (size < 1024) return {ok: false, msg: `og:image file suspiciously small (${size} bytes)`};
  return {ok: true, msg: `${path} (${size} bytes)`};
});

/* Per-app SoftwareApplication regression marker */
check('/apps/openregister has SoftwareApplication JSON-LD', () => {
  const path = join(buildDir, 'apps/openregister/index.html');
  if (!existsSync(path)) return {ok: false, msg: 'page not built'};
  const html = readFileSync(path, 'utf8');
  const blocks = extractJsonLdBlocks(html);
  let found = null;
  for (const b of blocks) {
    try {
      const obj = JSON.parse(b);
      if (obj['@type'] === 'SoftwareApplication') {found = obj; break;}
    } catch {}
  }
  if (!found) return {ok: false, msg: 'no SoftwareApplication block'};
  const needed = ['name', 'applicationCategory', 'operatingSystem'];
  const missing = needed.filter(k => !found[k]);
  if (missing.length) return {ok: false, msg: `SoftwareApplication missing fields: ${missing.join(', ')}`};
  return {ok: true, msg: `${found.applicationCategory}/${found.operatingSystem}`};
});

/* Report */
let failed = 0;
for (const {name, ok, msg} of results) {
  const icon = ok ? '✓' : '✗';
  console.log(`${icon} ${name} - ${msg}`);
  if (!ok) failed++;
}
console.log('');
if (failed) {
  console.error(`${failed} of ${results.length} checks failed.`);
  console.error('AI-crawler baseline regressed. Fix the failures above before merging.');
  process.exit(1);
} else {
  console.log(`All ${results.length} AI-baseline checks passed.`);
}
