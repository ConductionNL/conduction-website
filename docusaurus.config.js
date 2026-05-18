/**
 * conduction.nl, the Conduction company hub.
 *
 * Single Docusaurus build that also serves the connext.conduction.nl and
 * commonground.conduction.nl vanity entry points (Cloudflare 301-redirects
 * to /connext and /commonground paths, with locale awareness via the
 * Accept-Language header). The navbar logo + title swap based on pathname
 * (see src/theme/Navbar/Logo).
 *
 * Deployed to https://www.conduction.nl via GitHub Pages from the build
 * output (see .github/workflows/documentation.yml + static/CNAME).
 *
 * Built on @conduction/docusaurus-preset for brand defaults; everything
 * site-specific (URL, navbar items, footer, plugins, locale set) is
 * passed in here.
 */

const {createConfig} = require('@conduction/docusaurus-preset');

/* Structured data emitted on every page via top-level `headTags`. These
   are static JSON-LD blocks that don't need hydration — AI crawlers
   without a JS engine (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot)
   read them straight from the SSG HTML. Organization carries the legal-
   entity facts; WebSite ties URLs to the Organization via @id. Per-app
   SoftwareApplication schemas are emitted by the /apps/<slug> pages
   themselves (TODO, tracked separately). */
const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://www.conduction.nl/#org',
  name: 'Conduction B.V.',
  alternateName: 'Conduction',
  url: 'https://www.conduction.nl/',
  logo: 'https://www.conduction.nl/img/brand/avatar-conduction-gold-on-white.svg',
  foundingDate: '2019',
  description:
    'Dutch open-source software company building EUPL-1.2 apps for the Nextcloud workspace.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Lauriergracht 14h',
    postalCode: '1016 RR',
    addressLocality: 'Amsterdam',
    addressCountry: 'NL',
  },
  email: 'info@conduction.nl',
  telephone: '+31-85-303-6840',
  taxID: 'NL860784241B01',
  vatID: 'NL860784241B01',
  identifier: {
    '@type': 'PropertyValue',
    propertyID: 'KvK',
    value: '76741850',
  },
  sameAs: [
    'https://github.com/ConductionNL',
    'https://www.linkedin.com/company/conduction/',
  ],
};

const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://www.conduction.nl/#website',
  url: 'https://www.conduction.nl/',
  name: 'Conduction',
  publisher: {'@id': 'https://www.conduction.nl/#org'},
  inLanguage: ['en', 'nl'],
};

const config = createConfig({
  title: 'Conduction',
  tagline: 'Open-source apps voor de Nextcloud-werkplek.',
  /* Must match static/CNAME (www.conduction.nl) — GitHub Pages serves
     only on the CNAME host and 301-redirects the apex to it. Using the
     bare apex here made every canonical/og:url/sitemap entry point at
     conduction.nl, adding an apex→www hop on top of whatever the
     Cloudflare vanity worker already does — a redirect-loop amplifier
     on connext./commonground. (trailingSlash is true, set by the
     preset, so the worker must target https://www.conduction.nl/connext/
     — with the www and the trailing slash — not /connext.) */
  url: 'https://www.conduction.nl',
  baseUrl: '/',

  organizationName: 'ConductionNL',
  projectName: 'conduction-website',

  /* Two locales, English default. URL shape:
       /                 → English (canonical)
       /nl/              → Nederlands
     The Cloudflare Worker on connext/commonground vanity domains picks
     the locale from Accept-Language and 301-redirects accordingly. */
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'nl'],
    localeConfigs: {
      en: {label: 'English',    htmlLang: 'en-GB', direction: 'ltr'},
      nl: {label: 'Nederlands', htmlLang: 'nl-NL', direction: 'ltr'},
    },
  },

  /* Override the preset's classic preset to drop docs. Blog plugin is
     scoped to /academy/ and renders the academy section: blogs, guides,
     case studies, webinars, tutorials. Posts live in academy/<slug>/.
     The swizzles in src/theme/BlogListPage and src/theme/BlogPostPage
     replace Docusaurus's defaults with the academy components.
     /blog/* legacy paths redirect to /academy/* via static stubs in
     static/blog/. */
  presets: [
    [
      'classic',
      {
        docs: false,
        blog: {
          path: 'academy',
          routeBasePath: '/academy',
          showReadingTime: true,
          blogTitle: 'Conduction Academy',
          blogDescription: 'Blogs, guides, case studies, webinars, tutorials. One feed, all open-source.',
          postsPerPage: 'ALL',
          blogSidebarCount: 0,
          feedOptions: {
            type: ['rss', 'atom'],
            title: 'Conduction Academy',
            description: 'New blogs, guides, case studies, webinars, and tutorials from Conduction.',
            copyright: `Conduction B.V. © ${new Date().getFullYear()}`,
          },
        },
        theme: {
          customCss: [require.resolve('./src/css/site.css')],
        },
        /* Built-in @docusaurus/plugin-sitemap (loaded via the classic
           preset). Each locale outputs its own sitemap.xml (en at /,
           nl at /nl/) — both are advertised in static/robots.txt so AI
           crawlers without locale-suffix discovery still see Dutch
           pages. /academy/tags/* is excluded because tag pages are
           thin and confuse AI summarisers more than they help SEO.
           ignorePatterns matches route paths *after* the locale prefix
           is applied, so we list both forms. */
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/academy/tags/**', '/nl/academy/tags/**'],
          filename: 'sitemap.xml',
        },
      },
    ],
  ],

  /* Brand top-navbar pattern: five left-side section links + locale
     dropdown + Partners ghost + Install primary CTA on the right.
     Title text is set here as the default ("Conduction"); the swizzled
     theme/Navbar/Logo overrides it on /connext/* and /commonground/*. */
  navbar: {
    title: 'Conduction',
    items: [
      {to: '/apps',      label: 'Apps',      position: 'left'},
      {to: '/solutions', label: 'Solutions', position: 'left'},
      {to: '/academy',   label: 'Academy',   position: 'left'},
      {to: '/support',   label: 'Support',   position: 'left'},
      {to: '/about',     label: 'About',     position: 'left'},
      {type: 'localeDropdown', position: 'right'},
      {to: '/install',   label: 'Install',   position: 'right', cta: true},
    ],
  },

  /* Brand footer link grid + Conduction tells in the copyright row.
     Body copy here is the default Conduction face; the brand-strip
     pass on the shared MDX pages is tracked separately. */
  footer: {
    links: [
      {
        title: 'Apps',
        items: [
          {label: 'OpenCatalogi',  href: 'https://opencatalogi.conduction.nl/'},
          {label: 'OpenRegister',  href: 'https://openregister.conduction.nl/'},
          {label: 'OpenConnector', href: 'https://openconnector.conduction.nl/'},
          {label: 'DocuDesk',      href: 'https://docudesk.conduction.nl/'},
          {label: 'MyDash',        href: 'https://mydash.conduction.nl/'},
        ],
      },
      {
        title: 'Solutions',
        items: [
          {label: 'WOO compliance',  to: '/solutions/woo'},
          {label: 'Software catalog',to: '/solutions/software-catalog'},
          {label: 'Support',         to: '/support'},
          {label: 'ConNext',         to: '/connext'},
          {label: 'Common Ground',   to: '/commonground'},
        ],
      },
      {
        title: 'Resources',
        items: [
          {label: 'Partners',       to: '/partners'},
          {label: 'Build an app',   to: '/build'},
          {label: 'Blogs',          to: '/academy?type=blog'},
          {label: 'Guides',         to: '/academy?type=guide'},
          {label: 'Tutorials',      to: '/academy?type=tutorial'},
          {label: 'Webinars',       to: '/academy?type=webinar'},
        ],
      },
      {
        title: 'Conduction',
        items: [
          {label: 'About',          to: '/about'},
          {label: 'Open source',    to: '/about#opensource'},
          {label: 'Team',           to: '/about#team'},
          {label: 'Case studies',   to: '/academy?type=case-study'},
          {label: 'ISO',            to: '/iso'},
          {label: 'Identity',       href: 'https://identity.conduction.nl/'},
        ],
      },
    ],
    copyright: `Conduction B.V. · KvK 76741850 · BTW NL860784241B01 · IBAN NL51 ABNA 0868951550 · Lauriergracht 14h, 1016 RR Amsterdam · © ${new Date().getFullYear()}`,
  },

  /* OpenCatalogi content plugin slot, wired in via env once it exists. */
  plugins: [
    // [
    //   '@conduction/docusaurus-plugin-opencatalogi',
    //   {
    //     apiUrl: process.env.OPENCATALOGI_URL || 'http://localhost:8080/index.php/apps/openregister/api',
    //     register: 'www-content',
    //     schema: 'page',
    //     locales: ['en', 'nl'],
    //   },
    // ],
  ],
});

/* AI-crawler discoverability extras, applied after createConfig() so the
   preset stays unaware of them. Three things wired here:
     1. headTags[] — Organization + WebSite JSON-LD on every page. SSG-
        rendered so non-JS crawlers see them in raw HTML.
     2. themeConfig.image — default og:image (1200x630 PNG). Used as the
        OpenGraph card on every page that doesn't set its own image.
     3. themeConfig.metadata — adds twitter:site, ensures og:type=website
        baseline (page-level frontmatter can override). */
config.headTags = [
  {
    tagName: 'script',
    attributes: {type: 'application/ld+json'},
    innerHTML: JSON.stringify(ORGANIZATION_JSONLD),
  },
  {
    tagName: 'script',
    attributes: {type: 'application/ld+json'},
    innerHTML: JSON.stringify(WEBSITE_JSONLD),
  },
];

config.themeConfig.image = 'img/og-conduction.png';
config.themeConfig.metadata = [
  ...(config.themeConfig.metadata || []),
  {name: 'twitter:site', content: '@ConductionNL'},
  {name: 'twitter:card', content: 'summary_large_image'},
  {property: 'og:type', content: 'website'},
];

module.exports = config;
