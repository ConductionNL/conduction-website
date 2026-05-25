/**
 * @conduction/docusaurus-preset/data/sidecars-registry
 *
 * URL-only registry of every public Conduction ExApp sidecar.
 * Sidecars are Nextcloud-installable wrappers around an existing
 * third-party service (n8n, Keycloak, Ollama, the Common Ground
 * registers). They live next to the apps-registry, not inside it,
 * because they are not apps we build, they are apps we wrap.
 *
 * The shape mirrors apps-registry so cross-link components can treat
 * a sidecar and an app uniformly:
 *
 *   1. /sidecars/<slug>                product detail page
 *   2. https://docs.conduction.nl/<slug>    documentation site
 *   3. /academy?app=<slug>             academy posts filtered by app
 *
 * Adding a new sidecar: add an entry here plus a product page at
 *   conduction-website/src/pages/sidecars/<slug>.mdx
 */

export const SIDECARS_REGISTRY = {
  openklant:       {slug: 'openklant',       name: 'OpenKlant',       productHref: '/sidecars/openklant',       docsHref: 'https://docs.conduction.nl/openklant',       academyHref: '/academy?app=openklant'},
  openzaak:        {slug: 'openzaak',        name: 'OpenZaak',        productHref: '/sidecars/openzaak',        docsHref: 'https://docs.conduction.nl/openzaak',        academyHref: '/academy?app=openzaak'},
  valtimo:         {slug: 'valtimo',         name: 'Valtimo',         productHref: '/sidecars/valtimo',         docsHref: 'https://docs.conduction.nl/valtimo',         academyHref: '/academy?app=valtimo'},
  'n8n-nextcloud': {slug: 'n8n-nextcloud',   name: 'n8n',             productHref: '/sidecars/n8n',             docsHref: 'https://docs.conduction.nl/n8n',             academyHref: '/academy?app=n8n'},
  keycloak:        {slug: 'keycloak',        name: 'Keycloak',        productHref: '/sidecars/keycloak',        docsHref: 'https://docs.conduction.nl/keycloak',        academyHref: '/academy?app=keycloak'},
  ollama:          {slug: 'ollama',          name: 'Ollama',          productHref: '/sidecars/ollama',          docsHref: 'https://docs.conduction.nl/ollama',          academyHref: '/academy?app=ollama'},
  'open-webui':    {slug: 'open-webui',      name: 'Open WebUI',      productHref: '/sidecars/open-webui',      docsHref: 'https://docs.conduction.nl/open-webui',      academyHref: '/academy?app=open-webui'},
};

export const SIDECAR_SLUGS = Object.keys(SIDECARS_REGISTRY);

export const SIDECAR_LABELS = SIDECAR_SLUGS.reduce((acc, slug) => {
  acc[slug] = SIDECARS_REGISTRY[slug].name;
  return acc;
}, {});

/** Resolve a slug to its sidecar registry entry; returns undefined for unknown slugs. */
export function getSidecar(slug) {
  return SIDECARS_REGISTRY[slug];
}

/** Resolve an array of slugs, dropping any that aren't in the registry. */
export function getSidecars(slugs = []) {
  return slugs.map(getSidecar).filter(Boolean);
}
