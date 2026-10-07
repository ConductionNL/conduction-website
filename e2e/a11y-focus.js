/**
 * Focus visibility (WCAG 2.2 SC 2.4.11 Focus Appearance, SC 1.4.11 Non-text
 * Contrast).
 *
 * This was in the plan for the September review and never shipped, so every
 * "clean" result so far said nothing about keyboard users. A control that
 * looks identical focused and unfocused is unusable without a mouse, and no
 * amount of contrast or reachability checking sees it.
 *
 * Asks two things of each control, in the order that matters:
 *
 *   1. Does anything change at all when it takes focus? Compared across
 *      outline, box-shadow, border, background and text colour. `outline:
 *      none` with nothing put back is the classic failure and it is what this
 *      catches first.
 *   2. If an outline is what changed, does it have 3:1 against what it sits
 *      on? An indicator nobody can see is the same as no indicator.
 *
 * Runs separately from the main checks because it has to focus each control
 * one at a time, which is slow: it samples rather than exhausts, and reports
 * how many it looked at so a small number cannot be mistaken for a clean
 * page.
 */
export const FOCUS_CHECK = async ({limit = 40}) => {
  const out = [];
  const ch = (c) => (String(c).match(/[-\d.]+/g) || []).slice(0, 3).map(Number);
  const alphaOf = (c) => { const p = String(c).match(/[-\d.]+/g) || []; return p.length >= 4 ? Number(p[3]) : 1; };
  const lum = (rgb) => {
    const a = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const contrast = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const behind = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const bg = s.backgroundColor;
      if (bg && alphaOf(bg) >= 0.999 && !/rgba\(0, 0, 0, 0\)/.test(bg)) return ch(bg);
      n = n.parentElement;
    }
    const r = ch(getComputedStyle(document.documentElement).backgroundColor);
    return r.length === 3 ? r : null;
  };

  /* Compare what is PAINTED, not the property list. Chromium's UA sheet moves
     `outline-offset` from 0px to 1px on `a:focus` even when the author has set
     `outline: none`, so a raw property dump sees a change where a reader sees
     nothing, and the stripped-focus fixture went unreported. An outline with
     style `none` or zero width draws nothing and must read as nothing; offset
     is meaningless without a visible outline, so it is not compared at all.
     Same for a border of zero width. */
  const painted = (s) => {
    const outline = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)
      ? `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`
      : 'none';
    const border = parseFloat(s.borderTopWidth) > 0
      ? `${s.borderStyle} ${s.borderWidth} ${s.borderColor}`
      : 'none';
    return [outline, s.boxShadow, border, s.backgroundColor, s.color, s.textDecorationLine].join('|');
  };
  const snapshot = painted;

  const controls = [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      if (typeof el.checkVisibility === 'function' &&
          !el.checkVisibility({contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true})) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

  const sampled = controls.slice(0, limit);
  const active = document.activeElement;
  for (const el of sampled) {
    const before = snapshot(getComputedStyle(el));
    el.focus({preventScroll: true});
    await new Promise((r) => requestAnimationFrame(r));
    const s = getComputedStyle(el);
    const after = snapshot(s);
    const label = (el.textContent || '').trim().slice(0, 40) || el.getAttribute('aria-label') || el.tagName.toLowerCase();

    if (before === after) {
      out.push({check: 'focus-invisible', severity: 'serious', text: label,
        detail: 'nothing changes when this takes focus'});
    } else {
      /* An indicator can be more than one ring. This site draws a brand
         outline plus a halo of the opposite luminance behind it, precisely
         because no single colour clears 3:1 on every surface. The criterion
         is met if ANY part of the indicator is visible, so take the best of
         them; judging the outline alone reports failures that a reader does
         not experience. */
      const parts = [];
      if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) {
        parts.push({what: 'ring', color: s.outlineColor, rgb: ch(s.outlineColor)});
      }
      for (const m of String(s.boxShadow).matchAll(/rgba?\([^)]*\)/g)) {
        parts.push({what: 'halo', color: m[0], rgb: ch(m[0])});
      }
      const bg = behind(el);
      const usable = parts.filter((p) => p.rgb.length === 3);
      if (bg && usable.length) {
        let best = null;
        for (const p of usable) {
          const r = contrast(p.rgb, bg);
          if (!best || r > best.ratio) best = {...p, ratio: r};
        }
        if (best.ratio < 3) {
          out.push({check: 'focus-contrast', severity: 'serious', text: label,
            detail: `focus indicator ${best.ratio.toFixed(2)}:1 at best (${usable.length} ring(s)), needs 3:1`,
            color: best.color, background: `rgb(${bg.join(',')})`});
        }
      }
    }
    el.blur();
  }
  if (active && active.focus) active.focus({preventScroll: true});

  return {findings: out, sampled: sampled.length, total: controls.length};
};
