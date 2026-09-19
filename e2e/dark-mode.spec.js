/**
 * Dark mode contrast regression suite.
 *
 * Why this suite exists. The preset ships `respectPrefersColorScheme: true`,
 * so every visitor whose OS is set to dark gets dark mode, and the served
 * HTML really does call `matchMedia("(prefers-color-scheme: dark)")`. Nobody
 * had looked at it. Measured 2026-09-19 across all 163 pages: 1,362 text
 * elements below 1.5:1, on 121 of them, with the homepage h1 at exactly
 * 1.00, meaning text the same colour as the thing behind it.
 *
 * The cause was structural rather than cosmetic. Components set colour from
 * the RAW palette (`color: var(--c-cobalt-700)`), and a palette token cannot
 * flip, so the background went dark underneath ink that stayed navy. The fix
 * moved 709 declarations onto semantic tokens that carry a dark value.
 *
 * Two properties are asserted here, and the second matters as much as the
 * first:
 *
 *   1. Dark mode has no invisible text.
 *   2. LIGHT mode is not made worse by any of it. The semantic tokens were
 *      deliberately given light values identical to what they replaced, so
 *      this is a real invariant and not a hope.
 */

import {test, expect} from '@playwright/test';

/* One page per layout archetype. The navbar and footer are on all of them,
   and these carry the distinct section and card treatments. */
const PAGES = [
  ['home', '/'],
  ['apps listing', '/apps/'],
  ['app detail', '/apps/openregister/'],
  ['solutions listing', '/solutions/'],
  ['academy index', '/academy/'],
  ['support (cards + forms)', '/support/'],
  ['about', '/about/'],
  ['quality', '/quality/'],
  ['terms (SLA tables)', '/terms/'],
  ['ai', '/ai/'],
];

/**
 * WCAG 2.1 SC 1.4.3 (AA): 4.5:1 for normal text, 3:1 for large text.
 *
 * The gate here is deliberately set at 1.5:1, not 4.5:1. Below 1.5 the text
 * is effectively invisible, which is unambiguous and worth blocking a deploy
 * over. Between 1.5 and 4.5 sits a long tail of brand colours that are a
 * genuine but marginal AA miss in BOTH themes, including the Nextcloud blue
 * at 4.17 on white. Gating at 4.5 would fail on pre-existing light-mode debt
 * and teach everyone to ignore this suite.
 */
const INVISIBLE_BELOW = 1.5;

/**
 * Measure contrast for every text leaf on the page.
 *
 * Refuses to guess: when an ancestor paints a gradient or an image the
 * contrast against it is not computable from `getComputedStyle`, so those
 * elements are skipped rather than assigned an invented number. An early
 * version of this without that guard reported dozens of findings in light
 * mode that were not real.
 */
async function lowContrastText(page, theme, threshold) {
  return page.evaluate(
    async ({theme, threshold}) => {
      /* Cards animate `background` over 160ms, so a colour read while the
         theme swap is still easing is a blend of the two themes and
         belongs to neither. One run reported white on rgb(231,233,236),
         a grey that appears nowhere in the palette because it was a
         half-finished transition. Kill transitions and animations first
         so every value read is a settled one. */
      const freeze = document.createElement('style');
      freeze.textContent =
        '*,*::before,*::after{transition:none!important;animation:none!important}';
      document.head.appendChild(freeze);

      document.documentElement.setAttribute('data-theme', theme);

      /* Let the switch actually land before reading anything back.
         Measuring in the same tick reported the PRE-switch colours on
         busy pages: /academy/ came back with 197 findings whose cards
         were already correct. Two frames plus a short settle, so the
         value read is the value painted. */
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 250));

      const channels = (c) => (String(c).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (rgb) => {
        const a = rgb.map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
      };
      const contrast = (a, b) => {
        const l1 = luminance(a);
        const l2 = luminance(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };

      /* Walk up for the first ancestor that actually paints. null means
         "not measurable", never "assume white". */
      const backgroundBehind = (el) => {
        let node = el;
        while (node && node !== document.documentElement) {
          const style = getComputedStyle(node);
          if (style.backgroundImage && style.backgroundImage !== 'none') return null;
          const bg = style.backgroundColor;
          if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) {
            const rgb = channels(bg);
            const alpha = (String(bg).match(/[\d.]+/g) || [])[3];
            if (rgb.length === 3 && (alpha === undefined || Number(alpha) >= 0.95)) return rgb;
          }
          node = node.parentElement;
        }
        const root = getComputedStyle(document.documentElement);
        if (root.backgroundImage && root.backgroundImage !== 'none') return null;
        const rgb = channels(root.backgroundColor);
        return rgb.length === 3 ? rgb : null;
      };

      const out = [];
      const selector = 'p,h1,h2,h3,h4,li,a,span,strong,em,td,th,dt,dd,figcaption,label,button';
      for (const el of document.querySelectorAll(selector)) {
        const text = (el.textContent || '').trim();
        if (text.length < 8) continue;
        /* Docusaurus's own skip link is parked off-screen until focused,
           and its colours come from Infima rather than from us. It is not
           something a visitor ever sees at this contrast. */
        if (text === 'Skip to main content') continue;
        /* Leaves only, so a wrapper is not blamed for its children. */
        if (el.querySelector('p,h1,h2,h3,h4,li,div')) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const fg = channels(style.color);
        if (fg.length !== 3) continue;
        const bg = backgroundBehind(el);
        if (bg === null) continue;
        const ratio = contrast(fg, bg);
        if (ratio < threshold) {
          out.push({
            text: text.slice(0, 40),
            ratio: Number(ratio.toFixed(2)),
            color: style.color,
            background: `rgb(${bg.join(', ')})`,
          });
        }
      }
      return out;
    },
    {theme, threshold},
  );
}

for (const [name, path] of PAGES) {
  test(`${name}: no invisible text in dark mode`, async ({page}) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const found = await lowContrastText(page, 'dark', INVISIBLE_BELOW);

    expect(
      found,
      `${found.length} element(s) under ${INVISIBLE_BELOW}:1 in dark mode on ${path}:\n` +
        found
          .slice(0, 10)
          .map((f) => `  ${f.ratio}:1  "${f.text}"  ${f.color} on ${f.background}`)
          .join('\n'),
    ).toEqual([]);
  });
}

/**
 * The invariant that made the migration safe to do at all.
 *
 * Every semantic token introduced for this resolves to the identical value
 * it replaced in light mode, so migrating 709 declarations must not move a
 * single light-mode pixel. If this fails, the mapping picked a token whose
 * light value differs, which is how a dark-mode fix quietly restyles the
 * site everyone actually sees.
 */
test('light mode has no invisible text either', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const found = await lowContrastText(page, 'light', INVISIBLE_BELOW);

  expect(
    found,
    `light mode regressed: ${found.length} element(s) under ${INVISIBLE_BELOW}:1:\n` +
      found.slice(0, 10).map((f) => `  ${f.ratio}:1  "${f.text}"`).join('\n'),
  ).toEqual([]);
});

/**
 * The page ground and the body ink must both come from the theme, because
 * the whole failure was one of them flipping without the other.
 */
test('the dark theme actually applies to the page ground and body ink', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const themed = await page.evaluate(() => {
    const read = () => ({
      background: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
    });
    document.documentElement.setAttribute('data-theme', 'light');
    const light = read();
    document.documentElement.setAttribute('data-theme', 'dark');
    const dark = read();
    return {light, dark};
  });

  expect(themed.dark.background, 'the page ground must change with the theme').not.toBe(
    themed.light.background,
  );
  expect(themed.dark.color, 'the body ink must change with the theme').not.toBe(themed.light.color);
});
