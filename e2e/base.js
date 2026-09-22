/**
 * The test base every spec imports instead of `@playwright/test`.
 *
 * ONE REASON TO EXIST: a test must not emit analytics.
 *
 * The production build carries the Portaliq traffic client, because that is
 * the point of it — the deploy workflow builds with PORTALIQ_TRAFFIC_ORIGIN
 * set and a guard fails the deploy if the script is missing. The e2e suite
 * then runs against that same build, so every test that loads a page was
 * posting a real `page_view` to the live collector.
 *
 * That is not hypothetical. Measured 2026-09-22, hours after measurement was
 * switched on: 46 of the 58 events recorded against the ConductionNl portal
 * came from `localhost:4173`, which is this suite's own preview server. The
 * first day of the site's analytics was three quarters test traffic, and CI
 * would have added a fresh batch on every deploy across three projects.
 *
 * Aborting the collector is better than pointing the build at a dead origin:
 * the page under test stays byte-for-byte what deploys, including the script
 * tag the guard checks for, and only the beacon is dropped.
 *
 * The settings fetch is left alone deliberately. It is a GET that records
 * nothing, and letting it succeed keeps the client on its real code path, so
 * a client that throws on a page would still fail this suite.
 */

import {test as base, expect} from '@playwright/test';

/** The collector, as the traffic client addresses it. */
const COLLECTOR = /\/api\/traffic(\?|$)/;

export const test = base.extend({
	page: async ({page}, use) => {
		await page.route(COLLECTOR, (route) => route.abort());
		await use(page);
	},
});

export {expect};
