/**
 * INTERIM · Hermiq app glyph override.
 *
 * The canonical Hermiq glyph (MDI "creation", the AI sparkles) landed in
 * design-system commit e03a790 (docusaurus-preset/src/data/app-glyphs.json
 * + the identity brand kit), but the preset cannot currently publish to
 * npm: release-npm.yml fails with ENEEDAUTH because npm trusted publishing
 * is not configured for ConductionNL/design-system (see the workflow's
 * header comment). Until a release ≥3.30.0 is installable, the AppGlyph
 * component in the installed preset has no "hermiq" entry and renders an
 * empty hex on every AppCrossLinks card that names hermiq.
 *
 * This plugin swaps the preset's app-glyphs.json for a verbatim copy of
 * the design-system file that already carries the hermiq entry
 * (src/data/app-glyphs-interim.json).
 *
 * REMOVE this plugin, its config entry, and src/data/app-glyphs-interim.json
 * when bumping @conduction/docusaurus-preset to a version that ships the
 * hermiq glyph.
 */

const path = require('path');
const webpack = require('webpack');

module.exports = function hermiqGlyphInterim() {
  return {
    name: 'hermiq-glyph-interim',
    configureWebpack() {
      return {
        plugins: [
          new webpack.NormalModuleReplacementPlugin(
            /app-glyphs\.json$/,
            path.resolve(__dirname, '..', 'src', 'data', 'app-glyphs-interim.json'),
          ),
        ],
      };
    },
  };
};
