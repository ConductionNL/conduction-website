/**
 * The checks behind the mobile and dark-mode review, in one place.
 *
 * Both the Playwright gate (`a11y.spec.js`) and the full-site sweep
 * (`scripts/a11y-sweep.mjs`) run this exact function, so the gate can never
 * drift from the thing that measured the site. `a11y-selftest.spec.js` runs
 * it against a page built to break every check, because a check that has
 * never been seen failing is not evidence of anything: two instruments
 * during this work returned a confident zero because they were broken
 * rather than because the site was clean.
 *
 * Runs inside the browser. Exported as a plain function so
 * `page.evaluate(RUN_CHECKS, {theme, ...})` serialises it.
 */
export const RUN_CHECKS = async ({theme}) => {
  /* Colours and boxes both settle late, and each of these produced
     confident findings that were not real:
       - reading in the same tick as the theme switch returns PRE-switch
         values on a busy page (197 phantom findings on /academy/),
       - a card mid-transition is a blend belonging to neither theme
         (white on rgb(231,233,236), a grey that is nowhere in the palette),
       - text whose digits are still ticking is measured at a width it will
         not keep (the footer HUD read as clipped, then did not reproduce).
     Kill CSS animation, switch, wait two frames, then wait for the page's
     own text and overflow extent to stop changing. Bounded, because a page
     with a live counter never settles and still has to be measured. */
  const freeze = document.createElement('style');
  freeze.textContent =
    '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.appendChild(freeze);
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 250));

  const fingerprint = () => {
    let widest = 0;
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollWidth > el.clientWidth) widest += el.scrollWidth - el.clientWidth;
    }
    return `${document.body.innerText.length}:${Math.round(widest)}`;
  };
  let last = fingerprint();
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 300));
    const now = fingerprint();
    if (now === last) break;
    last = now;
  }

  const out = [];
  const vw = document.documentElement.clientWidth;
  const add = (check, severity, text, detail, extra = {}) =>
    out.push({check, severity, text: String(text).slice(0, 60), detail, ...extra});

  /* ---------------- colour ---------------- */
  const ch = (c) => (String(c).match(/[-\d.]+/g) || []).slice(0, 3).map(Number);
  /* Alpha is not decoration. `color: rgba(255,255,255,0.55)` is painted as a
     blend with what is behind it; treating it as white reports a ratio the
     reader never gets. This site has 14 of those plus translucent panel
     fills, and uncomposited they all scored as passes. */
  const alphaOf = (c) => {
    const p = String(c).match(/[-\d.]+/g) || [];
    return p.length >= 4 ? Number(p[3]) : 1;
  };
  const over = (fg, a, bg) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
  const lum = (rgb) => {
    const a = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const contrast = (a, b) => {
    const l1 = lum(a);
    const l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const opaque = (bg) => {
    if (!bg || /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return null;
    const rgb = ch(bg);
    return rgb.length === 3 && alphaOf(bg) >= 0.999 ? rgb : null;
  };
  const translucent = (bg) => {
    if (!bg || /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return null;
    const rgb = ch(bg);
    const a = alphaOf(bg);
    return rgb.length === 3 && a > 0.001 && a < 0.999 ? {rgb, a} : null;
  };
  /* A gradient is measurable: take every colour stop and judge the text
     against the worst of them. Skipping gradients is how an earlier sweep
     reported zero on surfaces it never looked at. */
  const gradientStops = (img) => {
    if (!img || img === 'none' || !/gradient/.test(img)) return null;
    const stops = [];
    for (const m of img.matchAll(/rgba?\(([-\d.\s,%]+)\)/g)) {
      const parts = (m[1].match(/[-\d.]+/g) || []).map(Number);
      if (parts.length >= 3 && (parts[3] === undefined || parts[3] >= 0.95)) {
        stops.push(parts.slice(0, 3));
      }
    }
    return stops.length ? stops : null;
  };

  /** Walks up through shadow hosts as well as parents, compositing any
   *  translucent layers it passes onto whatever finally paints. */
  const behind = (el) => {
    const veils = [];
    const finish = (kind, colors) => ({
      kind,
      colors: colors.map((base) => {
        let c = base;
        for (let i = veils.length - 1; i >= 0; i--) c = over(veils[i].rgb, veils[i].a, c);
        return c;
      }),
    });
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') {
        const stops = gradientStops(s.backgroundImage);
        return stops ? finish('gradient', stops) : {kind: 'image', colors: []};
      }
      const solid = opaque(s.backgroundColor);
      if (solid) return finish('solid', [solid]);
      const veil = translucent(s.backgroundColor);
      if (veil) veils.push(veil);
      n = n.parentElement || (n.getRootNode() instanceof ShadowRoot ? n.getRootNode().host : null);
    }
    const root = getComputedStyle(document.documentElement);
    if (root.backgroundImage && root.backgroundImage !== 'none') {
      const stops = gradientStops(root.backgroundImage);
      return stops ? finish('gradient', stops) : {kind: 'image', colors: []};
    }
    const solid = opaque(root.backgroundColor);
    return solid ? finish('solid', [solid]) : {kind: 'image', colors: []};
  };

  /**
   * Is this element actually rendered to a reader?
   *
   * `Element.checkVisibility()` is the browser's own answer and it is the
   * one to ask. Inferring it from display, visibility and opacity misses a
   * case this site has on eight pages: content inside a CLOSED `<details>`
   * keeps a full layout box, because `::details-content` hides it with
   * `content-visibility`, and reports `display: block`, `visibility:
   * visible`, `opacity: 1` and even `content-visibility: visible` on the
   * child itself. Measured on /quality/ 2026-09-19, where 6 of 7 accordions
   * are closed: every collapsed answer was counted as on-screen, and their
   * boxes pile up at nearly the same coordinates, which the overlap check
   * then reported as a broken layout. checkVisibility() returns false for
   * all of them.
   */
  const seen = (el, s) => {
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    if (typeof el.checkVisibility === 'function') {
      return el.checkVisibility({
        contentVisibilityAuto: true,
        opacityProperty: true,
        visibilityProperty: true,
      });
    }
    return true;
  };
  const ownText = (el) =>
    [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
  /* Parked off-screen until focused, by design, and styled by Infima. */
  const SKIP = ['Skip to main content', 'Ga naar hoofdinhoud'];

  const els = (() => {
    const acc = [];
    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        acc.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(document);
    return acc;
  })();

  /* ---------------- 1. zoom (SC 1.4.4) ---------------- */
  const vpc = (document.querySelector('meta[name="viewport"]') || {}).content || '';
  if (/user-scalable\s*=\s*(no|0)/i.test(vpc)) add('zoom-disabled', 'serious', vpc, 'pinch zoom is switched off');
  const maxScale = (vpc.match(/maximum-scale\s*=\s*([\d.]+)/i) || [])[1];
  if (maxScale && Number(maxScale) < 5) add('zoom-capped', 'serious', vpc, `maximum-scale=${maxScale}, under the 5x floor`);

  /* ---------------- 2. contrast at the real AA bars ---------------- */
  const TEXT = 'p,h1,h2,h3,h4,h5,h6,li,a,span,strong,em,b,i,td,th,dt,dd,figcaption,label,button,blockquote,code,summary,legend,option';
  for (const el of els) {
    if (!el.matches || !el.matches(TEXT)) continue;
    const text = ownText(el);
    if (text.length < 4 || SKIP.includes(text)) continue;
    const s = getComputedStyle(el);
    if (!seen(el, s)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const fg = ch(s.color);
    if (fg.length !== 3) continue;
    const size = parseFloat(s.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    const required = large ? 3 : 4.5;
    const bg = behind(el);
    if (bg.kind === 'image') {
      add('contrast-unmeasurable', 'info', text, 'text sits on a background image');
      continue;
    }
    const fgA = alphaOf(s.color);
    let worst = Infinity;
    let worstBg = null;
    for (const c of bg.colors) {
      const k = contrast(fgA >= 0.999 ? fg : over(fg, fgA, c), c);
      if (k < worst) { worst = k; worstBg = c; }
    }
    if (!isFinite(worst)) continue;
    const ratio = Number(worst.toFixed(2));
    const meta = {color: s.color, background: `rgb(${worstBg.join(',')})`, required, fontSize: size, bgKind: bg.kind};
    if (ratio < 1.5) add('contrast-invisible', 'critical', text, `${ratio}:1`, meta);
    else if (ratio < 3) add('contrast-severe', 'serious', text, `${ratio}:1 needs ${required}:1`, meta);
    else if (ratio < required) add('contrast-aa', 'moderate', text, `${ratio}:1 needs ${required}:1`, meta);
    if (size && size < 12) add('tiny-text', 'moderate', text, `${size.toFixed(1)}px`);
  }

  /* ---------------- 3. reachability, all content ---------------- */
  const CONTROL = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]';
  for (const el of els) {
    if (!el.matches) continue;
    const isControl = el.matches(CONTROL);
    const text = ownText(el);
    const isMedia = el.matches('img, svg, video, canvas, picture, table, pre');
    if (!isControl && !isMedia && text.length < 8) continue;
    if (SKIP.includes((el.textContent || '').trim())) continue;
    if (el.closest && el.closest('[id$="navbar-drawer"][hidden]')) continue;
    const s = getComputedStyle(el);
    if (!seen(el, s)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    /* Lying outside the viewport is only a fault when nothing can scroll to
       it. An `auto`/`scroll` ancestor means the reader can reach it; a
       component's own `hidden`/`clip` is a deliberate mask (the marquee, the
       card track). Reaching html/body means the only thing holding it is the
       site-wide `overflow-x: clip`, and nothing will ever reveal it. */
    let n = el.parentElement;
    let byPage = true;
    while (n && n !== document.documentElement) {
      if (getComputedStyle(n).overflowX !== 'visible') { byPage = n === document.body; break; }
      n = n.parentElement || (n.getRootNode() instanceof ShadowRoot ? n.getRootNode().host : null);
    }
    if (!byPage) continue;
    add(
      isControl ? 'offscreen-control' : 'offscreen-content',
      isControl ? 'critical' : 'serious',
      text || el.tagName.toLowerCase(),
      `x=${Math.round(r.left)}..${Math.round(r.right)} vw=${vw}`,
      {tag: el.tagName.toLowerCase()},
    );
  }

  /* ---------------- 4. target size, SC 2.5.8 ---------------- */
  const boxes = [];
  for (const el of els.filter((e) => e.matches && e.matches(CONTROL))) {
    const s = getComputedStyle(el);
    if (!seen(el, s)) continue;
    if (el.closest && el.closest('[id$="navbar-drawer"][hidden]')) continue;
    if (SKIP.includes((el.textContent || '').trim())) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const label = (el.textContent || '').trim() || el.getAttribute('aria-label') || el.tagName.toLowerCase();
    boxes.push({el, r, label});
    /* The standard exempts a link sitting in a sentence, where shrinking the
       target would mean reflowing the prose around it. */
    if (el.tagName === 'A' && s.display.startsWith('inline') && el.parentElement && ownText(el.parentElement).length > 0) continue;
    if (r.width < 24 || r.height < 24) {
      add('target-size', 'moderate', label, `${Math.round(r.width)}x${Math.round(r.height)}, needs 24x24`);
    }
  }

  /* ---------------- 5. crowded tap targets ---------------- */
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].r;
      const b = boxes[j].r;
      if (boxes[i].el.contains(boxes[j].el) || boxes[j].el.contains(boxes[i].el)) continue;
      if (a.width >= 44 && a.height >= 44 && b.width >= 44 && b.height >= 44) continue;
      const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
      const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
      if (dx === 0 && dy === 0) continue;
      const d = Math.hypot(dx, dy);
      if (d < 8) add('target-spacing', 'moderate', `${boxes[i].label} / ${boxes[j].label}`, `${Math.round(d)}px apart`);
    }
  }

  /* ---------------- 6. overlapping text, the broken-layout tell ------- */
  const leaves = els
    .filter((el) => el.matches && el.matches('p,h1,h2,h3,h4,li,td,th,figcaption,label') && ownText(el).length >= 8 && seen(el, getComputedStyle(el)))
    .map((el) => ({el, r: el.getBoundingClientRect()}))
    .filter((x) => x.r.width && x.r.height);
  for (let i = 0; i < leaves.length; i++) {
    const a = leaves[i].r;
    for (let j = i + 1; j < leaves.length; j++) {
      if (leaves[i].el.contains(leaves[j].el) || leaves[j].el.contains(leaves[i].el)) continue;
      const b = leaves[j].r;
      const ow = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ow <= 1 || oh <= 1) continue;
      const frac = (ow * oh) / Math.min(a.width * a.height, b.width * b.height);
      if (frac > 0.25) {
        add('text-overlap', 'serious', `${ownText(leaves[i].el).slice(0, 25)} / ${ownText(leaves[j].el).slice(0, 25)}`, `${Math.round(frac * 100)}% overlap`);
      }
    }
  }

  /* ---------------- 7. text clipped where it sits ---------------- */
  for (const el of els) {
    if (!el.matches || el === document.body || el === document.documentElement) continue;
    const s = getComputedStyle(el);
    if (!seen(el, s)) continue;
    const hx = s.overflowX === 'hidden' || s.overflowX === 'clip';
    const hy = s.overflowY === 'hidden' || s.overflowY === 'clip';
    if (!hx && !hy) continue;
    const t = (el.textContent || '').trim();
    if (t.length < 8) continue;
    const cutX = hx && el.scrollWidth > el.clientWidth + 2;
    const cutY = hy && el.scrollHeight > el.clientHeight + 2;
    if (!cutX && !cutY) continue;
    if (el.className && /marquee|track|ticker|carousel|slider/i.test(String(el.className))) continue;
    if (s.textOverflow === 'ellipsis') continue;
    add('clipped-text', 'moderate', t, cutX ? `${el.scrollWidth}px in a ${el.clientWidth}px box` : `${el.scrollHeight}px in a ${el.clientHeight}px box`);
  }

  /* ---------------- 8. non-text contrast, SC 1.4.11 ---------------- */
  for (const el of els) {
    if (!el.matches || !el.matches('input:not([type="hidden"]), select, textarea')) continue;
    const s = getComputedStyle(el);
    if (!seen(el, s)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if ((parseFloat(s.borderTopWidth) || 0) === 0) continue;
    /* The border carries alpha as often as the text does: this site draws
       fields on tinted panels with `border: 1px solid rgba(255,255,255,0.18)`.
       Taking only opaque borders skipped those entirely, which is the same
       leniency the contrast check had before alpha was composited. */
    const borderRaw = ch(s.borderTopColor);
    if (borderRaw.length !== 3) continue;
    const borderA = alphaOf(s.borderTopColor);
    if (borderA <= 0.001) continue;
    const bg = behind(el.parentElement || el);
    if (bg.kind === 'image' || !bg.colors.length) continue;
    let worst = Infinity;
    for (const c of bg.colors) {
      /* The border is painted over the field's own background where it has
         one, and over the surface behind it where it does not. */
      const under = opaque(s.backgroundColor) || c;
      const painted = borderA >= 0.999 ? borderRaw : over(borderRaw, borderA, under);
      worst = Math.min(worst, contrast(painted, c));
    }
    if (worst < 3) {
      add('nontext-contrast', 'serious', el.getAttribute('name') || el.getAttribute('placeholder') || el.tagName.toLowerCase(), `field border ${worst.toFixed(2)}:1, needs 3:1`);
    }
  }

  return out;
};
