/**
 * INTERIM · apps-registry descriptions + AppCrossLinks description rendering.
 *
 * The preset's apps-registry has no `description` or `tags` fields, and its
 * AppCrossLinks card renders only the app name, leaving the "About this app"
 * box empty next to the glyph. Both fixes belong in the design-system preset;
 * until a release ships them, this plugin (same mechanism as
 * hermiq-glyph-interim.js) swaps in site copies:
 *
 *   - src/data/apps-registry-interim.js       registry + description/tags
 *   - src/components/AppCrossLinksInterim.jsx  renders reg.description
 *
 * Every consumer that imports the preset registry (BlogListPage app chips,
 * DetailHero JSON-LD, partner cards) transparently gets the interim data,
 * so the site has ONE app config file while the override is active.
 *
 * REMOVE this plugin, its config entry and both interim files when bumping
 * @conduction/docusaurus-preset to a version that ships registry
 * descriptions and renders them in AppCrossLinks.
 */

const path = require('path');
const webpack = require('webpack');

module.exports = function appsRegistryInterim() {
  return {
    name: 'apps-registry-interim',
    configureWebpack() {
      return {
        plugins: [
          new webpack.NormalModuleReplacementPlugin(
            /data[\\/]apps-registry\.js$/,
            path.resolve(__dirname, '..', 'src', 'data', 'apps-registry-interim.js'),
          ),
          new webpack.NormalModuleReplacementPlugin(
            /AppCrossLinks[\\/]AppCrossLinks\.jsx$/,
            path.resolve(__dirname, '..', 'src', 'components', 'AppCrossLinksInterim.jsx'),
          ),
        ],
      };
    },
  };
};
