/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

import React from 'react';
import Content from '@theme-original/NotFound/Content';

/**
 * The 404 page, carrying the marker that stops it being counted as a visit.
 *
 * WHY
 *
 * The Portaliq traffic client cannot see an HTTP status. It runs inside a
 * page that has already been served, so a 404 and a real page look identical
 * to it and both are recorded as `page_view`. The client's own answer is a
 * DOM marker: it watches for `data-portaliq-status="404"` and records
 * `page_not_found` instead. Nothing rendered it, so that branch never ran.
 *
 * Measured on this site, 2026-09-22. Of 162 stored traffic events, 34 were
 * malformed paths from one visitor in a two minute burst, and they ranked
 * SECOND in the top-pages table at 17 views each, above /apps/. The report
 * presented a mangled URL as one of the most visited pages on the site.
 *
 * NOT COUNTED, BUT STILL STORED. `page_not_found` events stay in the
 * register and the rollup aggregates them into its `notFound` dimension,
 * which is what turns junk traffic into a list of broken links worth fixing.
 *
 * WHY HERE AND NOT IN THE PLUGIN
 *
 * The obvious home is @conduction/docusaurus-plugin-portaliq, so every
 * Conduction site gets it. It does not work there. Docusaurus builds theme
 * aliases as `createThemeAliases([ThemeFallbackDir, ...pluginThemes],
 * [userTheme])`, and `@theme-init` keeps whichever theme registered the
 * component FIRST. A plugin's theme is ordered among the plugins, so
 * `@theme-init` can resolve to the plugin's own component: the build then
 * dies on /404.html with `RangeError: Maximum call stack size exceeded`,
 * and `@theme/NotFound/Content` resolves to the classic theme anyway, so
 * the marker would never render. A site swizzle is applied last and
 * `@theme-original` is unambiguous, which is what this file relies on.
 *
 * The path is deliberately not an attribute: that needs `window` at render
 * time and costs a hydration mismatch. The event carries `pagePath` and
 * `pageLocation`, and the rollup reads both as fallbacks.
 *
 * @param {object} props Whatever the theme passes the original.
 * @returns {JSX.Element} The original 404 content, marked.
 */
export default function NotFoundContent(props) {
  return (
    <>
      <div data-portaliq-status="404" hidden />
      <Content {...props} />
    </>
  );
}
