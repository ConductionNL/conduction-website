/**
 * Mobile layout regression suite.
 *
 * Runs in the `mobile` project only (390x844, the iPhone 13 viewport).
 *
 * Why this suite exists. In September 2026 an audit of all 163 pages
 * found that every one of them put 23 links outside the viewport: the
 * navbar had no drawer below its breakpoint, and the footer's five
 * `fr` columns needed 773px. Nothing caught it, because the site sets
 * `overflow-x: clip` on html and body to stop decorative panels
 * dragging the page sideways. That rule works, and it also turns any
 * layout overflow into content that is silently unreachable rather
 * than a visible scrollbar. There was no symptom to notice.
 *
 * So the assertion here is deliberately about REACHABILITY, not about
 * overflow. Decoration is allowed to bleed past the viewport, and does
 * (the canal illustration in the footer, the marquee on app pages).
 * A link or a button never is: if a control's box lies outside the
 * viewport on a phone, a visitor cannot tap it, and `clip` means they
 * cannot even scroll to it.
 */

import {test, expect} from '@playwright/test';

/* One page per layout archetype rather than all 163: the navbar and
   footer are shared by every page, and these cover each distinct body
   layout that carries its own column rules. */
const PAGES = [
  ['home', '/'],
  ['apps listing (filter rail + card grid)', '/apps/'],
  ['app detail (body + aside)', '/apps/openregister/'],
  ['solutions listing', '/solutions/'],
  ['solution detail', '/solutions/openwoo/'],
  ['academy index', '/academy/'],
  ['academy article', '/academy/spec-driven-development/'],
  ['support (forms)', '/support/'],
  ['sidecars listing', '/sidecars/'],
  ['partners', '/partners/'],
  ['partner detail', '/partners/acato/'],
  ['connext', '/connext/'],
  ['quality', '/quality/'],
  ['contact', '/contact/'],
  ['install', '/install/'],
  ['about', '/about/'],
];

/**
 * Controls that a visitor cannot get to.
 *
 * Lying outside the viewport is not by itself a fault, so the test
 * asks what is doing the clipping before it complains:
 *
 *   - nearest overflow ancestor is `auto` or `scroll`: the control is
 *     inside its own scrollable region (a code block, a wide table,
 *     the platform diagram). Reachable, so allowed.
 *   - nearest overflow ancestor is `hidden` or `clip` on some
 *     component: that component is deliberately masking, which is how
 *     the logo marquee and the app-card track work. Allowed.
 *   - nothing clips it until html or body: the only thing holding it
 *     is the site-wide `overflow-x: clip`. Nothing can scroll to it
 *     and nothing will ever reveal it. That is the failure.
 *
 * Skipped: zero-sized and hidden elements, the closed navbar drawer,
 * and the skip-to-content link, which is parked off-screen on purpose
 * and moves into view when focused.
 */
async function offscreenControls(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    const selector = 'a[href], button, input, select, textarea, [role="button"]';
    for (const el of document.querySelectorAll(selector)) {
      if (el.closest('#navbar-drawer[hidden]')) continue;
      if ((el.textContent || '').trim() === 'Skip to main content') continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      /* A 1px tolerance absorbs sub-pixel rounding on fractional
         layouts; anything beyond that is a real miss. */
      if (r.right <= vw + 1 && r.left >= -1) continue;

      let node = el.parentElement;
      let clippedByPage = true;
      while (node && node !== document.documentElement) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX !== 'visible') {
          /* Some component owns the clipping, so it is intentional. */
          clippedByPage = node === document.body;
          break;
        }
        node = node.parentElement;
      }
      if (!clippedByPage) continue;

      out.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 40) || el.getAttribute('aria-label') || '(no label)',
        left: Math.round(r.left),
        right: Math.round(r.right),
        viewportWidth: vw,
      });
    }
    return out;
  });
}

for (const [name, path] of PAGES) {
  test(`${name}: every control is reachable on a phone`, async ({page}) => {
    await page.goto(path);
    /* The footer illustration and the app-page marquee are built by
       script after load and shift layout as they mount. */
    await page.waitForLoadState('networkidle');

    const offscreen = await offscreenControls(page);
    expect(
      offscreen,
      `${offscreen.length} control(s) lie outside the 390px viewport on ${path}:\n` +
        offscreen.map((o) => `  ${o.tag} "${o.text}" at x=${o.left}..${o.right}`).join('\n'),
    ).toEqual([]);
  });
}

test('the navbar drawer opens and exposes every navigation item', async ({page}) => {
  await page.goto('/');

  const toggle = page.locator('button[aria-controls="navbar-drawer"]');
  await expect(toggle, 'the drawer toggle should be visible on a phone').toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  /* Closed: the drawer must be out of the accessibility tree, not just
     visually hidden, or its links stay in the tab order behind the
     page. */
  await expect(page.locator('#navbar-drawer')).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  const drawer = page.locator('#navbar-drawer');
  await expect(drawer).toBeVisible();

  /* Support and About are the two items that used to fall off the bar,
     so they are named here rather than counted. */
  await expect(drawer.getByRole('link', {name: 'Support'})).toBeVisible();
  await expect(drawer.getByRole('link', {name: 'About'})).toBeVisible();

  /* Escape closes it and hands focus back, so a keyboard user is not
     stranded inside the panel. */
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the drawer closes when a link inside it is followed', async ({page}) => {
  await page.goto('/');
  await page.locator('button[aria-controls="navbar-drawer"]').click();
  await page.locator('#navbar-drawer').getByRole('link', {name: 'About'}).click();
  await expect(page).toHaveURL(/\/about\/?$/);
  await expect(page.locator('#navbar-drawer')).toBeHidden();
});

test('every footer link sits inside the viewport', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const strays = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const footer = document.querySelector('footer');
    if (!footer) return ['no footer element found'];
    return [...footer.querySelectorAll('a[href]')]
      .filter((a) => {
        const r = a.getBoundingClientRect();
        return (r.width || r.height) && (r.right > vw + 1 || r.left < -1);
      })
      .map((a) => `${(a.textContent || '').trim().slice(0, 30)} @ ${Math.round(a.getBoundingClientRect().right)}px`);
  });

  expect(strays, `footer links outside the viewport: ${strays.join(', ')}`).toEqual([]);
});

/**
 * Touch target size.
 *
 * The gate is WCAG 2.2 SC 2.5.8 (AA), which requires 24x24 CSS px.
 * It is deliberately not 44px: 44 is SC 2.5.5 (AAA) and the size the
 * primary controls here aim for, but tag chips and inline badges sit
 * legitimately between the two, and a suite that failed on those would
 * be reporting a preference rather than a defect.
 *
 * Inline links inside running prose are exempt under 2.5.8 itself.
 */
const AA_MIN_TARGET_PX = 24;

for (const path of ['/apps/', '/support/', '/']) {
  test(`${path}: controls meet the ${AA_MIN_TARGET_PX}px AA target size`, async ({page}) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const small = await page.evaluate((min) => {
      const out = [];
      for (const el of document.querySelectorAll('a[href], button, input, select, [role="button"]')) {
        if (el.closest('#navbar-drawer[hidden]')) continue;
        if ((el.textContent || '').trim() === 'Skip to main content') continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        if (style.display === 'inline' && el.closest('p, li')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        /* A checkbox stays small by design; its row is the target the
           visitor actually hits, so measure that instead. */
        const target = el.type === 'checkbox' || el.type === 'radio' ? el.closest('li') || el : el;
        const tr = target.getBoundingClientRect();
        if (tr.height < min || tr.width < min) {
          out.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 24)}" ${Math.round(tr.width)}x${Math.round(tr.height)}`);
        }
      }
      return out;
    }, AA_MIN_TARGET_PX);

    expect(small, `controls under ${AA_MIN_TARGET_PX}px: ${small.join(' | ')}`).toEqual([]);
  });
}
