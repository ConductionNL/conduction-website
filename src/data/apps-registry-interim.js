/**
 * @conduction/docusaurus-preset/data/apps-registry
 *
 * URL-only registry of every public Conduction app. Single source of
 * truth for cross-linking between the three surfaces a visitor lands
 * on while learning about an app:
 *
 *   1. /apps/<slug>                  product detail page
 *   2. https://<slug>.conduction.nl  documentation site (each app's
 *      docs are served from its own per-app subdomain, built from the
 *      app's own repo)
 *   3. /academy?app=<slug>           academy posts filtered by app
 *
 * The registry is consumed by:
 *   - <AppCrossLinks/>          renders the three links per app.
 *   - <ProductFilter/>          renders the chip row on /academy.
 *   - sites/www/src/data/apps-catalog.js   the live Conduction.nl
 *     site adds icons, taglines, and category metadata on top of
 *     this registry, so display data and URLs stay in lockstep.
 *
 * Adding a new app: add an entry here. The url shape is conventional:
 *   - productHref:  /apps/<slug>
 *   - docsHref:     https://<slug>.conduction.nl
 *   - academyHref:  /academy?app=<slug>
 * Override any of the three when an app deviates from the convention
 * (none today; the convention holds).
 */

/* INTERIM site copy of the preset apps-registry (see plugins/apps-registry-interim.js):
   adds `description` + `tags` per app until the preset registry ships those fields.
   Edit descriptions and tags HERE — this file is the site's app config while the
   override is active. Descriptions are one line, shown under the app name in
   AppCrossLinks cards; review wording per app before relying on it in sales copy. */
export const APPS_REGISTRY = {
  opencatalogi:    {slug: 'opencatalogi',    name: 'OpenCatalogi',     category: 'Data',        description: 'Publish and harvest open catalogi: Woo, DCAT and software listings on open standards.',            tags: ['data', 'publishing', 'woo'],           productHref: '/apps/opencatalogi',    docsHref: 'https://opencatalogi.conduction.nl',    academyHref: '/academy?app=opencatalogi'},
  openregister:    {slug: 'openregister',    name: 'OpenRegister',     category: 'Data',        description: 'The register and object layer: schemas, objects, audit trails and access rules under your control.', tags: ['data', 'registers', 'foundation'],     productHref: '/apps/openregister',    docsHref: 'https://openregister.conduction.nl',    academyHref: '/academy?app=openregister'},
  openconnector:   {slug: 'openconnector',   name: 'OpenConnector',    category: 'Connectors',  description: 'Connect registers to external APIs and systems with sources, mappings and synchronisations.',       tags: ['integration', 'sync'],                 productHref: '/apps/openconnector',   docsHref: 'https://openconnector.conduction.nl',   academyHref: '/academy?app=openconnector'},
  docudesk:        {slug: 'docudesk',        name: 'DocuDesk',         category: 'Documents',   description: 'Generate, anonymise and manage documents next to your data.',                                       tags: ['documents'],                           productHref: '/apps/docudesk',        docsHref: 'https://docudesk.conduction.nl',        academyHref: '/academy?app=docudesk'},
  launchpad:       {slug: 'launchpad',       name: 'LaunchPad',        category: 'Dashboards',  description: 'A personal start screen with the apps, links and widgets of your organisation.',                    tags: ['dashboard'],                           productHref: '/apps/launchpad',       docsHref: 'https://launchpad.conduction.nl',       academyHref: '/academy?app=launchpad'},
  zaakafhandelapp: {slug: 'zaakafhandelapp', name: 'ZaakAfhandelApp',  category: 'Processes',   description: 'Case handling for gemeenten on the Common Ground zaakregister.',                                    tags: ['zaken', 'gemeenten'],                  productHref: '/apps/zaakafhandelapp', docsHref: 'https://zaakafhandelapp.conduction.nl', academyHref: '/academy?app=zaakafhandelapp'},
  pipelinq:        {slug: 'pipelinq',        name: 'PipelinQ',         category: 'Processes',   description: 'Sales and pipeline management on your own registers.',                                              tags: ['sales', 'crm'],                        productHref: '/apps/pipelinq',        docsHref: 'https://pipelinq.conduction.nl',        academyHref: '/academy?app=pipelinq'},
  procest:         {slug: 'procest',         name: 'Procest',          category: 'Processes',   description: 'Model and run your processes as data.',                                                             tags: ['processes'],                           productHref: '/apps/procest',         docsHref: 'https://procest.conduction.nl',         academyHref: '/academy?app=procest'},
  decidesk:        {slug: 'decidesk',        name: 'DeciDesk',         category: 'Processes',   description: 'Meetings, agendas and decisions, minuted and traceable.',                                           tags: ['meetings', 'governance'],              productHref: '/apps/decidesk',        docsHref: 'https://decidesk.conduction.nl',        academyHref: '/academy?app=decidesk'},
  softwarecatalog: {slug: 'softwarecatalog', name: 'SoftwareCatalog',  category: 'Data',        description: 'The software catalogue of your organisation: applications, contracts and dependencies.',            tags: ['catalogue', 'assets'],                 productHref: '/apps/softwarecatalog', docsHref: 'https://softwarecatalog.conduction.nl', academyHref: '/academy?app=softwarecatalog'},
  larpingapp:      {slug: 'larpingapp',      name: 'LarpingApp',       category: 'Processes',   description: 'Characters, events and props for larp organisers.',                                                 tags: ['events'],                              productHref: '/apps/larpingapp',      docsHref: 'https://larpingapp.conduction.nl',      academyHref: '/academy?app=larpingapp'},
  nldesign:        {slug: 'nldesign',        name: 'NLDesign',         category: 'Documents',   description: 'NL Design System theming for every app on your Nextcloud.',                                         tags: ['theming', 'nldesignsystem'],           productHref: '/apps/nldesign',        docsHref: 'https://nldesign.conduction.nl',        academyHref: '/academy?app=nldesign'},
  shillinq:        {slug: 'shillinq',        name: 'Shillinq',         category: 'Processes',   description: 'Invoicing and billing on your own registers.',                                                      tags: ['billing'],                             productHref: '/apps/shillinq',        docsHref: 'https://shillinq.conduction.nl',        academyHref: '/academy?app=shillinq'},
  openbuild:       {slug: 'openbuild',       name: 'OpenBuild',        category: 'Processes',   description: 'Describe a process and get a working Nextcloud app on your own registers.',                         tags: ['builder', 'ai'],                       productHref: '/apps/openbuild',       docsHref: 'https://openbuild.conduction.nl',       academyHref: '/academy?app=openbuild'},
  doriath:         {slug: 'doriath',         name: 'Doriath',          category: 'Connectors',  description: 'API gateway and integration management for your Nextcloud.',                                        tags: ['integration', 'gateway'],              productHref: '/apps/doriath',         docsHref: 'https://doriath.conduction.nl',         academyHref: '/academy?app=doriath'},
  'app-versions':  {slug: 'app-versions',    name: 'App Versions',     category: 'Data',        description: 'Track which app versions run where across your fleet.',                                             tags: ['fleet', 'operations'],                 productHref: '/apps/app-versions',    docsHref: 'https://app-versions.conduction.nl',    academyHref: '/academy?app=app-versions'},
  hermiq:          {slug: 'hermiq',          name: 'Hermiq',           category: 'AI',          description: 'The AI runner: open-weight models on your own hardware, inside your own audit trail.',              tags: ['ai', 'sovereign', 'llm'],              productHref: '/apps/hermiq',          docsHref: 'https://hermiq.conduction.nl',          academyHref: '/academy?app=hermiq'},
  hrmq:            {slug: 'hrmq',            name: 'HRMQ',             category: 'Processes',   description: 'HR processes on your own registers.',                                                               tags: ['hr'],                                  productHref: '/apps/hrmq',            docsHref: 'https://hrmq.conduction.nl',            academyHref: '/academy?app=hrmq'},
  openanonymiser:  {slug: 'openanonymiser',  name: 'OpenAnonymiser',   category: 'Documents',   description: 'Detect and anonymise personal data in documents.',                                                  tags: ['privacy', 'avg'],                      productHref: '/apps/openanonymiser',  docsHref: 'https://openanonymiser.conduction.nl',  academyHref: '/academy?app=openanonymiser'},
  planix:          {slug: 'planix',          name: 'Planix',           category: 'Processes',   description: 'Planning and scheduling on your own registers.',                                                    tags: ['planning'],                            productHref: '/apps/planix',          docsHref: 'https://planix.conduction.nl',          academyHref: '/academy?app=planix'},
  portaliq:        {slug: 'portaliq',        name: 'Portaliq',         category: 'Processes',   description: 'Public forms and citizen portals on your registers.',                                               tags: ['forms', 'portal'],                     productHref: '/apps/portaliq',        docsHref: 'https://portaliq.conduction.nl',        academyHref: '/academy?app=portaliq'},
  scholiq:         {slug: 'scholiq',         name: 'Scholiq',          category: 'Processes',   description: 'School administration on your own registers.',                                                      tags: ['education'],                           productHref: '/apps/scholiq',         docsHref: 'https://scholiq.conduction.nl',         academyHref: '/academy?app=scholiq'},
};

/**
 * Map an apps-catalog category to a schema.org applicationCategory.
 * Used by <DetailHero> when emitting SoftwareApplication JSON-LD for
 * AI crawlers. Defaults to BusinessApplication for any unknown
 * category, since every Conduction app fits BusinessApplication in
 * the absence of better signal.
 */
export const SCHEMA_APPLICATION_CATEGORY = {
  Data:        'BusinessApplication',
  Processes:   'BusinessApplication',
  Connectors:  'DeveloperApplication',
  Documents:   'BusinessApplication',
  Dashboards:  'BusinessApplication',
  AI:          'BusinessApplication',
};

/** Resolve an appId to its schema.org applicationCategory. */
export function applicationCategoryFor(slug) {
  const entry = APPS_REGISTRY[slug];
  if (!entry) return 'BusinessApplication';
  return SCHEMA_APPLICATION_CATEGORY[entry.category] || 'BusinessApplication';
}

export const APP_SLUGS = Object.keys(APPS_REGISTRY);

/** Build a label map keyed by slug, suitable for <ContentTypeFilter labels=…/>. */
export const APP_LABELS = APP_SLUGS.reduce((acc, slug) => {
  acc[slug] = APPS_REGISTRY[slug].name;
  return acc;
}, {});

/** Resolve a slug to its registry entry; returns undefined for unknown slugs. */
export function getApp(slug) {
  return APPS_REGISTRY[slug];
}

/** Resolve an array of slugs, dropping any that aren't in the registry. */
export function getApps(slugs = []) {
  return slugs.map(getApp).filter(Boolean);
}

/**
 * Resolve a display-name (e.g. "OpenCatalogi", "DocuDesk", "LaunchPad")
 * to its product page href, or undefined when the name is not in the
 * registry. Used by partner cards / sidecards to turn the apps-shipped
 * chip row into a clickable link list. Names like "Nextcloud" that
 * aren't ours fall through and the consumer renders a plain span.
 *
 * Match is case-insensitive on both name and slug so consumers can
 * pass either form ("OpenCatalogi", "opencatalogi", or "OpenCATALOGI")
 * without each adding their own normalisation.
 */
export function appHrefByName(name) {
  if (!name) return undefined;
  const target = String(name).toLowerCase();
  for (const slug of APP_SLUGS) {
    const entry = APPS_REGISTRY[slug];
    if (slug === target || entry.name.toLowerCase() === target) {
      return entry.productHref;
    }
  }
  return undefined;
}
