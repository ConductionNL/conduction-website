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

/* AI-crawler baseline (Organization + WebSite JSON-LD, og:image,
   twitter meta, FAQPage schema from <FAQ>, SoftwareApplication schema
   from <DetailHero>) comes from @conduction/docusaurus-preset >= 3.4.0
   automatically. We override only the bits that are specific to this
   site (robots.txt + llms.txt in static/, the sitemap config below
   because we pass our own classic-preset overrides). */
module.exports = createConfig({
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

  /* Keep the canal-footer's Privacy / Terms / ISO links on relative
     routes. The preset's default ships absolute https://www.conduction.nl/*
     URLs so per-app subdomain footers don't 404, but this IS the
     marketing site that hosts those pages, so a relative link is the
     cleaner UX (no needless cross-host hop). */
  legalLinks: {
    privacy: '/privacy',
    terms: '/terms',
    iso: '/quality',
  },

  /* Search Console / Bing Webmaster / etc. verification tokens are
     filled by ops once the property has been claimed; the preset
     emits a meta tag for each token present. Leave keys absent until
     a real token is available, otherwise a stale placeholder ends up
     in the production HTML. */
  // searchConsoleVerification: {
  //   google: '...',
  //   bing:   '...',
  // },

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
          {label: 'OpenWoo',         to: '/solutions/openwoo'},
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
          {label: 'Way of Work',    href: 'https://docs.conduction.nl/WayOfWork/way-of-work/'},
          {label: 'Quality',        to: '/quality'},
          {label: 'Identity',       href: 'https://identity.conduction.nl/'},
        ],
      },
    ],
    copyright: `Conduction B.V. · KvK 76741850 · BTW NL860784241B01 · IBAN NL51 ABNA 0868951550 · Lauriergracht 14h, 1016 RR Amsterdam · © ${new Date().getFullYear()}`,
  },

  /* OpenCatalogi content plugin slot, wired in via env once it exists. */
  plugins: [
    /* academy-modules: scans academy/*\/index.mdx frontmatter and emits
       module → ordered parts global data. Consumed by BlogListPage
       (composite ModuleCards + module pill row) and per-module MDX
       index pages at /academy/modules/{slug}. */
    [
      require.resolve('./plugins/academy-modules'),
      {contentDir: 'academy', routeBasePath: '/academy'},
    ],
    // [
    //   '@conduction/docusaurus-plugin-opencatalogi',
    //   {
    //     apiUrl: process.env.OPENCATALOGI_URL || 'http://localhost:8080/index.php/apps/openregister/api',
    //     register: 'www-content',
    //     schema: 'page',
    //     locales: ['en', 'nl'],
    //   },
    // ],
    /* Reclaim SEO equity from URLs Google has in its index from the
       pre-Docusaurus / pre-subdomain layout. The plugin emits one
       static HTML page per `from` with a <meta http-equiv="refresh">
       and a `<link rel="canonical">` to the `to` target, which Google
       treats as a 301 signal. Only the URLs in this list have current
       equivalents worth redirecting; the rest (componenten catalogue,
       WP placeholders, retired training pages) are let to 404 naturally. */
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          /* Old Dutch "about us" slug. The English /about/ route is
             the canonical replacement; NL translation pass will land
             /nl/about/ later. */
          {from: '/over-ons', to: '/about/'},
          /* The OpenConnector page used to live on the apex; everything
             moved to its own subdomain in the 2026-02 split. Send the
             two indexed entry points to the canonical app site. */
          {from: '/openconnector', to: 'https://openconnector.conduction.nl/'},
          {from: '/openconnector/support', to: 'https://openconnector.conduction.nl/support/'},
          /* OpenWoo brand rename: /solutions/woo conflated the law (Wet
             open overheid) with the product. The page lives at
             /solutions/openwoo since the fold-openwoo-into-fleet change;
             keep inbound links working from anywhere that already shipped
             the old URL (presentations, partner pages, press). The `nl`
             locale doesn't emit page-route variants for src/pages/*.mdx
             so /nl/solutions/openwoo doesn't exist as a target — same
             pattern as the /over-ons → /about/ entry above. */
          {from: '/solutions/woo', to: '/solutions/openwoo'},
          /* /iso renamed to /quality (2026-05-19): the page was about
             ISO 9001 + 27001 only, but we now treat ISO as one tool inside
             a broader quality story (pentest-tools.com, GitHub workflow,
             policy statements). The NL page lives at /nl/quality (same
             slug as EN; the page title is localised to "Kwaliteit").
             Only the EN /iso redirect is emitted here — /nl/iso 404s
             gracefully because there are no inbound links to it. */
          {from: '/iso', to: '/quality'},
        ],
      },
    ],
  ],
});
