/**
 * Put a page into its "everything open" state before measuring it.
 *
 * The sweep measures a page as it loads, and that is not the page. Measured
 * on /quality/ 2026-09-20: badge markup that the colour-role lint flagged
 * rendered ZERO times, because it lives in a Showcase panel for an item that
 * is not defaultOpen. Collapsed accordions, unselected tabs, closed menus and
 * anything behind a disclosure are all invisible to a load-time sweep, and a
 * clean result from one says nothing about them.
 *
 * This opens what can be opened, generically, rather than scripting each
 * component:
 *
 *   - every <details> gets `open`
 *   - every [aria-expanded="false"] is clicked
 *   - every [role="tab"] that is not selected is clicked, one at a time
 *   - Showcase-style list items are clicked, since they carry no ARIA
 *
 * It is deliberately best-effort. A control that does not respond is skipped,
 * never retried, and the run continues: a missed state is a missed finding,
 * which is the same risk the sweep already carries, whereas a thrown error
 * would cost the whole route.
 *
 * Returns what it did, so a finding can say which state produced it and a
 * page that opened nothing can be told apart from a page with nothing to open.
 */
export const REVEAL_ALL = async () => {
  const opened = {details: 0, expanded: 0, tabs: 0, listItems: 0};
  const settle = () => new Promise((r) => setTimeout(r, 120));

  for (const d of document.querySelectorAll('details:not([open])')) {
    d.setAttribute('open', '');
    opened.details++;
  }

  /* Click, do not just flip the attribute: these are React components whose
     rendering follows their own state, and setting aria-expanded by hand
     changes the attribute without rendering the panel. */
  for (const el of [...document.querySelectorAll('[aria-expanded="false"]')]) {
    try { el.click(); opened.expanded++; await settle(); } catch { /* not clickable */ }
  }

  for (const el of [...document.querySelectorAll('[role="tab"]')]) {
    if (el.getAttribute('aria-selected') === 'true') continue;
    try { el.click(); opened.tabs++; await settle(); } catch { /* not clickable */ }
  }

  /* Showcase and similar: a vertical list where clicking an item swaps the
     panel beside it. They carry no tab/disclosure ARIA, so they are found
     structurally: a clickable item inside a list that sits next to a panel.
     Each is opened in turn and the page is measured after each, by the
     caller, because only one panel exists at a time. */
  const candidates = [...document.querySelectorAll('[class*="item"], [class*="Item"]')]
    .filter((el) => el.matches('li, button, [role="button"], div[tabindex], a:not([href])') ||
                    el.querySelector('button, [role="button"]'));
  for (const el of candidates.slice(0, 40)) {
    const target = el.matches('button, [role="button"]') ? el : el.querySelector('button, [role="button"]') || el;
    try { target.click(); opened.listItems++; await settle(); } catch { /* not clickable */ }
  }

  await new Promise((r) => setTimeout(r, 400));
  return opened;
};
