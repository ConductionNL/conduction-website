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

module.exports = createConfig({
  title: 'Conduction',
  tagline: 'Open-source apps voor de Nextcloud-werkplek.',
  url: 'https://conduction.nl',
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
          {label: 'Way of Work',    href: 'https://docs.conduction.nl/WayOfWork/way-of-work/'},
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
