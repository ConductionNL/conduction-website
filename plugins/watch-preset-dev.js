/**
 * DEV ONLY · Watch the installed preset so edits to it hot-reload.
 *
 * Every mini-game, and most of the site's components, live in
 * @conduction/docusaurus-preset — the design-system monorepo. While
 * working on one we edit it there and copy the changed files into
 * node_modules/@conduction/docusaurus-preset so it can be tried on the
 * running site before a release.
 *
 * Webpack never noticed. `docusaurus start` sets
 *
 *   watchOptions.ignored = /node_modules\/(?!@docusaurus)/
 *
 * (@docusaurus/core/lib/webpack/client.js), and watchpack normalises
 * backslashes to forward slashes before testing the regex, so the rule
 * bites on Windows too. Every copy therefore needed a full server
 * restart, which also reopens a browser tab.
 *
 * Plugin configureWebpack() hooks run after those watch options are
 * built (getStartClientConfig in commands/start/webpack.js), so this
 * puts @conduction back on the watch list. Docusaurus itself is kept
 * un-ignored, exactly as before.
 *
 * Watching alone was not enough, and the way it failed is worth
 * recording. A rebuild fired on every copy, and the output never
 * changed. Two defaults conspire:
 *
 *   - snapshot.managedPaths defaults to this project's node_modules
 *     (webpack/lib/config/defaults.js). Anything under it is taken to
 *     be owned by a package manager, so webpack validates it by the
 *     package's version rather than by its contents — and the preset's
 *     version does not move when we copy a file into it.
 *   - cache.type is 'filesystem' (@docusaurus/core/lib/webpack/base.js),
 *     so that verdict is written to node_modules/.cache/webpack and
 *     survives every restart.
 *
 * snapshot.unmanagedPaths is checked first and short-circuits the
 * managed test (FileSystemInfo.checkManaged), so naming @conduction
 * there puts it back on ordinary content hashing.
 *
 * Note for anyone editing this file: it is not one of webpack's
 * buildDependencies (only docusaurus.config.js is), so a change here
 * does not evict that cache. Clear node_modules/.cache/webpack by hand
 * if this plugin's behaviour ever looks stuck.
 *
 * Scope: the dev server only. In a production build there is no
 * watcher, and the hook returns nothing rather than leaving a stray
 * watchOptions in the config.
 *
 * The cost is that webpack now walks @conduction on every rebuild. One
 * package is cheap; if dev ever feels sluggish, this is a suspect.
 *
 * This plugin is a convenience, not a dependency: dropping it only
 * brings the restart back.
 */

module.exports = function watchPresetDev() {
  return {
    name: 'watch-preset-dev',
    configureWebpack(config, isServer) {
      if (isServer || process.env.NODE_ENV !== 'development') return {};
      return {
        /* Replace rather than merge: two regexes cannot be combined,
           and webpack-merge would otherwise keep Docusaurus's. */
        mergeStrategy: {'watchOptions.ignored': 'replace'},
        watchOptions: {
          ignored: /node_modules\/(?!@docusaurus|@conduction)/,
        },
        /* Appends to webpack's empty default, so nothing is lost. */
        snapshot: {
          unmanagedPaths: [/[\\/]node_modules[\\/]@conduction[\\/]/],
        },
      };
    },
  };
};
