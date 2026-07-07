# Voter Choice — Keystone Design Session · RAW SOURCE EXPORT
# Generated verbatim from the live canvas source. Complete, no elisions.
#
# ENTRY: "Voter Choice - Keystone Design Session.html" loads React 18.3.1 + Babel,
# then design-canvas.jsx (shared scaffold), all screen files, and canvas-app.jsx
# (the assembler that lays every artboard onto the pannable canvas).
#
# NOTES FOR THE SPLITTER:
#  - There is NO screens-funding.jsx and NO funding.css. Funding renders from
#    screens-results.jsx as <ResultsScreen palette="white" expand="funding" />
#    (artboard res-funding); its FunderBars / funder-panel styles live inside
#    screens.css (block ~line 426). Do not expect those two files — they don't exist.
#  - screens-scorecard.jsx IS included (renders the sc-sheet / <Scorecard/> artboard).
#  - Required CSS not in the original ask but included: home.css, whynow.css,
#    statics.css, intake.css, polis.css (one per section).
#  - screens.css contains the complete .screen[data-palette="white"] Bold Flag
#    token block (line 63) plus the scorecard ss-* styles.
#  - No .design-canvas.state.json sidecar and no __om-edit-overrides block exist,
#    so these source files ARE the latest rendered canvas state.
#
# HEADLINE VOICES (screens-home.jsx, HeadlineVoices):
#  - ★ Recommended · "Question + CTA"  = the copy wired into the HomeHero h1:
#      "How well are your elected officials really representing you? Get the scorecard."
#  - "Activation" (separate, NOT starred):
#      "Three people vote in your name. Today you check their work."
#  - "Provocation" (separate, NOT starred):
#      "Don't re-elect a stranger."
#
# ARTBOARD MAP:
#  design-canvas.jsx  -> shared canvas chrome for every artboard
#  canvas-app.jsx     -> assembler (all 10 sections)
#  screens-orientation.jsx -> ori-pick(★), ori-a, ori-b, ori-c
#  screens-results.jsx     -> res-main, res-funding, res-votes, res-allvotes, col-white, col-warm
#  screens-scorecard.jsx   -> sc-sheet
#  screens-candidates.jsx  -> cand-card, cand-a, cand-b, cand-c
#  screens-home.jsx        -> home-hero(★), home-voices
#  screens-whynow.jsx      -> wn-page
#  screens-statics.jsx     -> st-about, st-how, st-privacy, st-tip, st-loading
#  screens-intake.jsx      -> iq-ask, iq-propose, iq-locked, iq-edit, iq-delta
#  screens-polis.jsx       -> polis-entry, polis-stand, polis-report, polis-divided
#

=== FILE: Voter Choice - Keystone Design Session.html (part 1 of 1) ===
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Voter Choice — Keystone Design Session</title>
<template id="__bundler_thumbnail">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="oklch(0.42 0.125 258)"/>
    <rect x="30" y="30" width="40" height="28" rx="3" fill="oklch(0.987 0.007 86)"/>
    <rect x="30" y="62" width="40" height="8" rx="2" fill="oklch(0.52 0.185 27)"/>
    <text x="50" y="49" font-family="Georgia, serif" font-size="20" font-weight="600" fill="oklch(0.23 0.035 258)" text-anchor="middle">V</text>
  </svg>
</template>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="screens.css" />
<link rel="stylesheet" href="candidates.css" />
<link rel="stylesheet" href="home.css" />
<link rel="stylesheet" href="whynow.css" />
<link rel="stylesheet" href="statics.css" />
<link rel="stylesheet" href="intake.css" />
<link rel="stylesheet" href="polis.css" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: oklch(0.93 0.006 258); }
  #root { height: 100vh; }
</style>
</head>
<body>
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<script type="text/babel" src="design-canvas.jsx"></script>
<script type="text/babel" src="screens-orientation.jsx"></script>
<script type="text/babel" src="screens-results.jsx"></script>
<script type="text/babel" src="screens-scorecard.jsx"></script>
<script type="text/babel" src="screens-candidates.jsx"></script>
<script type="text/babel" src="screens-home.jsx"></script>
<script type="text/babel" src="screens-whynow.jsx"></script>
<script type="text/babel" src="screens-statics.jsx"></script>
<script type="text/babel" src="screens-intake.jsx"></script>
<script type="text/babel" src="screens-polis.jsx"></script>
<script type="text/babel" src="canvas-app.jsx"></script>
</body>
</html>
```

=== FILE: design-canvas.jsx (part 1 of 1) ===
```jsx
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Exports (to window): DesignCanvas, DCSection, DCArtboard, DCPostIt.
// Artboards are reorderable (grip-drag), deletable, labels/titles are
// inline-editable, and any artboard can be opened in a fullscreen focus
// overlay (←/→/Esc). State persists to a .design-canvas.state.json sidecar
// via the host bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>
//
// Artboards are static design frames, not scroll regions — never use
// height: 100% + overflow: auto/scroll on inner elements; size each artboard
// to fit its content (explicit pixel height, or let it grow).
/* END USAGE */

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = [
    '.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}',
    '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}',
    '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}',
    '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}',
    '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}',
    // isolation:isolate contains artboard content's z-indexes so a
    // z-indexed child (sticky navbar etc.) can't paint over .dc-header or
    // the .dc-menu popover that drops into the top of the card.
    '.dc-card{isolation:isolate;transition:box-shadow .15s,transform .15s}',
    '.dc-card *{scrollbar-width:none}',
    '.dc-card *::-webkit-scrollbar{display:none}',
    // Per-artboard header: grip + label on the left, delete/expand on the
    // right. Single flex row; when the artboard's on-screen width is too
    // narrow for both the label yields (ellipsis, then hidden entirely below
    // ~4ch via the container query) and the buttons stay on the row.
    '.dc-header{position:absolute;bottom:100%;left:-4px;margin-bottom:calc(4px * var(--dc-inv-zoom,1));z-index:2;',
    '  display:flex;align-items:center;container-type:inline-size}',
    '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px;flex:1 1 auto;min-width:0}',
    '.dc-grip{flex:0 0 auto;cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s,opacity .12s}',
    '.dc-grip:hover{background:rgba(0,0,0,.08)}',
    '.dc-grip:active{cursor:grabbing}',
    '.dc-labeltext{flex:1 1 auto;min-width:0;cursor:pointer;border-radius:4px;padding:3px 6px;',
    '  display:flex;align-items:center;transition:background .12s;overflow:hidden}',
    // Below ~4ch of label room: hide the label entirely, and drop the grip to
    // hover-only (same reveal rule as .dc-btns) so a narrow header is clean
    // until the card is moused.
    '@container (max-width: 110px){',
    '  .dc-labeltext{display:none}',
    '  .dc-grip{opacity:0}',
    '  [data-dc-slot]:hover .dc-grip{opacity:1}',
    '}',
    '.dc-labeltext:hover{background:rgba(0,0,0,.05)}',
    '.dc-labeltext .dc-editable{overflow:hidden;text-overflow:ellipsis;max-width:100%}',
    '.dc-labeltext .dc-editable:focus{overflow:visible;text-overflow:clip}',
    '.dc-btns{flex:0 0 auto;margin-left:auto;display:flex;gap:2px;opacity:0;transition:opacity .12s}',
    '[data-dc-slot]:hover .dc-btns,.dc-btns:has(.dc-menu){opacity:1}',
    '.dc-expand,.dc-kebab{width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;',
    '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center;',
    '  font:inherit;transition:background .12s,color .12s}',
    '.dc-expand:hover,.dc-kebab:hover{background:rgba(0,0,0,.06);color:#2a251f}',
    // Slot hosting an open menu floats above later siblings (which otherwise
    // paint on top — same z-index:auto, later DOM order) so the popup isn't
    // clipped by the next card.
    '[data-dc-slot]:has(.dc-menu){z-index:10}',
    '.dc-menu{position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border-radius:8px;',
    '  box-shadow:0 8px 28px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.05);padding:4px;min-width:160px;z-index:10}',
    '.dc-menu button{display:block;width:100%;padding:7px 10px;border:0;background:transparent;',
    '  border-radius:5px;font-family:inherit;font-size:13px;font-weight:500;line-height:1.2;',
    '  color:#29261b;cursor:pointer;text-align:left;transition:background .12s;white-space:nowrap}',
    '.dc-menu button:hover{background:rgba(0,0,0,.05)}',
    '.dc-menu hr{border:0;border-top:1px solid rgba(0,0,0,.08);margin:4px 2px}',
    '.dc-menu .dc-danger{color:#c96442}',
    '.dc-menu .dc-danger:hover{background:rgba(201,100,66,.1)}',
    // Chrome (titles / labels / buttons) counter-scales against the viewport
    // zoom so it stays a constant on-screen size. --dc-inv-zoom is set by
    // DCViewport on every transform update and inherits to all descendants —
    // any overlay inside the world (e.g. a TweaksPanel on an artboard) can use
    // it the same way.
    //
    // The header uses transform:scale (out-of-flow, so layout impact doesn't
    // matter) with its world-space width set to card-width / inv-zoom so that
    // after counter-scaling its on-screen width exactly matches the card's —
    // that's what lets the container query + text-overflow behave against the
    // card's visible edge at every zoom level.
    //
    // The section head uses CSS zoom instead of transform so its layout box
    // grows with the counter-scale, pushing the card row down — otherwise the
    // constant-screen-size title would overflow into the (shrinking) world-
    // space gap and overlap the artboard headers at low zoom.
    '.dc-header{width:calc((100% + 4px) / var(--dc-inv-zoom,1));',
    '  transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom left}',
    '.dc-sectionhead{zoom:var(--dc-inv-zoom,1)}',
  ].join('\n');
  document.head.appendChild(s);
}

const DCCtx = React.createContext(null);

// Recursively unwrap React.Fragment so <>…</> grouping doesn't hide
// DCSection/DCArtboard children from the type-based walks below.
function dcFlatten(children) {
  const out = [];
  React.Children.forEach(children, (c) => {
    if (c && c.type === React.Fragment) out.push(...dcFlatten(c.props.children));
    else out.push(c);
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, hidden
// artboards, focused artboard). Order/titles/labels/hidden persist to a
// .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';

function DesignCanvas({ children, minScale, maxScale, style }) {
  const [state, setState] = React.useState({ sections: {}, focus: null });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);

  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE)
      .then((r) => (r.ok ? r.json() : null))
      .then((saved) => {
        if (off || !saved || !saved.sections) return;
        skipNextWrite.current = true;
        setState((s) => ({ ...s, sections: saved.sections }));
      })
      .catch(() => {})
      .finally(() => { didRead.current = true; if (!off) setReady(true); });
    const t = setTimeout(() => { if (!off) setReady(true); }, 150);
    return () => { off = true; clearTimeout(t); };
  }, []);

  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) { skipNextWrite.current = false; return; }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({ sections: state.sections })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Fragments are flattened; wrapping in other
  // elements still opts out of focus/reorder.
  const registry = {};     // slotId -> { sectionId, artboard }
  const sectionMeta = {};  // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  dcFlatten(children).forEach((sec) => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const abs = [];
    dcFlatten(sec.props.children).forEach((ab) => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (aid) abs.push([aid, ab]);
    });
    // hidden is scoped to one source revision — when the agent regenerates
    // (artboard-ID set changes), prior deletes don't apply to new content.
    const srcKey = abs.map(([k]) => k).join('\x1f');
    const hidden = persisted.srcKey === srcKey ? (persisted.hidden || []) : [];
    const srcIds = [];
    abs.forEach(([aid, ab]) => {
      if (hidden.includes(aid)) return;
      registry[`${sid}/${aid}`] = { sectionId: sid, artboard: ab };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter((k) => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter((k) => !kept.includes(k))],
    };
  });

  const api = React.useMemo(() => ({
    state,
    section: (id) => state.sections[id] || {},
    patchSection: (id, p) => setState((s) => ({
      ...s,
      sections: { ...s.sections, [id]: { ...s.sections[id], ...(typeof p === 'function' ? p(s.sections[id] || {}) : p) } },
    })),
    setFocus: (slotId) => setState((s) => ({ ...s, focus: slotId })),
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') api.setFocus(null); };
    const onPd = (e) => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);

  return (
    <DCCtx.Provider value={api}>
      <DCViewport minScale={minScale} maxScale={maxScale} style={style}>{ready && children}</DCViewport>
      {state.focus && registry[state.focus] && (
        <DCFocusOverlay entry={registry[state.focus]} sectionMeta={sectionMeta} sectionOrder={sectionOrder} />
      )}
    </DCCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({ children, minScale = 0.1, maxScale = 8, style = {} }) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({ x: 0, y: 0, scale: 1 });
  // Persist viewport across reloads so the user lands back where they were
  // after an agent edit or browser refresh. The sandbox origin is already
  // per-project; pathname keeps multiple canvas files in one project apart.
  const tfKey = 'dc-viewport:' + location.pathname;
  const saveT = React.useRef(0);

  const lastPostedScale = React.useRef();
  const apply = React.useCallback(() => {
    const { x, y, scale } = tf.current;
    const el = worldRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    // Exposed for zoom-invariant chrome (labels, buttons, TweaksPanel).
    el.style.setProperty('--dc-inv-zoom', String(1 / scale));
    // Keep the host toolbar's % readout in sync with the canvas scale. Pan
    // ticks leave scale unchanged — skip the cross-frame post for those.
    if (lastPostedScale.current !== scale) {
      lastPostedScale.current = scale;
      window.parent.postMessage({ type: '__dc_zoom', scale }, '*');
    }
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      try { localStorage.setItem(tfKey, JSON.stringify(tf.current)); } catch {}
    }, 200);
  }, [tfKey]);

  React.useLayoutEffect(() => {
    const flush = () => {
      clearTimeout(saveT.current);
      try { localStorage.setItem(tfKey, JSON.stringify(tf.current)); } catch {}
    };
    let restored = false;
    try {
      const s = JSON.parse(localStorage.getItem(tfKey) || 'null');
      if (s && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.scale)) {
        tf.current = { x: s.x, y: s.y, scale: Math.min(maxScale, Math.max(minScale, s.scale)) };
        apply();
        restored = true;
      }
    } catch {}
    // Visibility backstop (one-shot): a persisted pan is only meaningful
    // relative to content that may have changed since it was saved. If the
    // restored transform leaves every section/artboard off-screen, restoring
    // it faithfully just strands the user — reset to origin instead.
    // Content renders after the sidecar read settles, so poll briefly until
    // real boxes exist; any user input cancels (they may be mid-pan).
    let checks = 0;
    let checkT = 0;
    let sawInput = false;
    let hiddenStreak = 0;
    const onInput = () => { sawInput = true; };
    const cleanupCheck = () => {
      window.removeEventListener('wheel', onInput, true);
      window.removeEventListener('pointerdown', onInput, true);
    };
    const checkVisible = () => {
      const vp = vpRef.current, world = worldRef.current;
      checks += 1;
      if (!vp || !world || sawInput || checks > 10) { cleanupCheck(); return; }
      const vr = vp.getBoundingClientRect();
      let sized = 0, visible = false;
      // Slots plus section-head titles: the [data-dc-section] wrapper (and
      // .dc-sectionhead) are full-width blocks whose boxes can stay
      // on-screen while everything real is stranded; the inline-block title
      // is text-sized and covers sections whose artboards were all deleted.
      world.querySelectorAll('[data-dc-slot], .dc-sectionhead .dc-editable').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        sized += 1;
        if (r.right > vr.left && r.left < vr.right && r.bottom > vr.top && r.top < vr.bottom) visible = true;
      });
      if (visible) { cleanupCheck(); return; }
      if (sized === 0) { hiddenStreak = 0; checkT = setTimeout(checkVisible, 400); return; } // not rendered yet
      // Two consecutive hidden reads before resetting — the sidecar read can
      // reorder/hide sections after first paint, transiently moving every
      // box; a single sample must not discard a healthy deliberate pan.
      hiddenStreak += 1;
      if (hiddenStreak < 2) { checkT = setTimeout(checkVisible, 400); return; }
      tf.current = { x: 0, y: 0, scale: 1 };
      apply();
      cleanupCheck();
    };
    if (restored) {
      window.addEventListener('wheel', onInput, true);
      window.addEventListener('pointerdown', onInput, true);
      checkT = setTimeout(checkVisible, 250);
    }
    // Flush on pagehide and unmount so a reload within the 200ms debounce
    // window doesn't drop the last pan/zoom.
    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(checkT);
      cleanupCheck();
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;

    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // --dc-inv-zoom consumers (.dc-sectionhead's CSS zoom, each section's
      // marginBottom) reflow on every scale change, vertically shifting the
      // world layout — so a world point mathematically pinned under the cursor
      // drifts as you zoom (content creeps up on zoom-in, down on zoom-out).
      // Anchor the DOM element under the cursor instead: record its screen Y,
      // apply the transform + --dc-inv-zoom, then cancel whatever vertical
      // drift the reflow introduced so it stays put on screen.
      let marker = null, markerY0 = 0;
      if (k !== 1) {
        const hit = document.elementFromPoint(cx, cy);
        marker = hit && hit.closest ? hit.closest('[data-dc-slot],[data-dc-section]') : null;
        if (marker) markerY0 = marker.getBoundingClientRect().top;
      }
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
      if (marker) {
        // A pure zoom around (cx, cy) maps screen Y → cy + (Y - cy) * k. Any
        // departure after the --dc-inv-zoom reflow is the layout drift.
        const drift = marker.getBoundingClientRect().top - (cy + (markerY0 - cy) * k);
        if (Math.abs(drift) > 0.1) { t.y -= drift; apply(); }
      }
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = (e) =>
      e.deltaMode !== 0 ||
      (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40);

    const onWheel = (e) => {
      // A deck-stage nested on the canvas owns plain scrolling — its
      // thumbnail rail must stay natively scrollable, and panning a
      // full-viewport fixed deck only strands it. The shadow DOM retargets
      // rail events to the deck-stage host, so closest() sees it. ctrl/meta
      // pinch stays ours: unprevented it would browser-zoom the page.
      if (!(e.ctrlKey || e.metaKey) && e.target && e.target.closest && e.target.closest('deck-stage')) return;
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if ((e.ctrlKey || e.metaKey) && !isMouseWheel(e)) {
        // trackpad pinch, or ctrl/cmd + smooth-scroll mouse. Notched
        // wheels fall through to the fixed-step branch below.
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = (e) => { e.preventDefault(); isGesturing = true; gsBase = tf.current.scale; };
    const onGestureChange = (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, (gsBase * e.scale) / tf.current.scale);
    };
    const onGestureEnd = (e) => { e.preventDefault(); isGesturing = false; };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = (e) => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || (e.button === 0 && onBg))) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX; drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };

    // Host-driven zoom (toolbar % menu). Zooms around viewport centre so the
    // visible midpoint stays fixed — matching the host's iframe-zoom feel.
    const onHostMsg = (e) => {
      const d = e.data;
      if (d && d.type === '__dc_set_zoom' && typeof d.scale === 'number') {
        const r = vp.getBoundingClientRect();
        zoomAt(r.left + r.width / 2, r.top + r.height / 2, d.scale / tf.current.scale);
      } else if (d && d.type === '__dc_probe') {
        // Host's [readyGen] reset asks whether a canvas is present; it
        // fires on the iframe's native 'load', which for canvases with
        // images/fonts is after our mount-time announce, so re-announce.
        // Clear the pan-tick guard so apply() re-posts the current scale
        // even if it's unchanged — the host just reset dcScale to 1.
        window.parent.postMessage({ type: '__dc_present' }, '*');
        lastPostedScale.current = undefined;
        apply();
      }
    };
    window.addEventListener('message', onHostMsg);
    // Announce canvas mode so the host toolbar proxies its % control here
    // instead of scaling the iframe element (which would just shrink the
    // viewport window of an infinite canvas). The apply() that follows emits
    // the initial __dc_zoom so the toolbar % is correct before first pinch.
    // lastPostedScale reset mirrors the __dc_probe handler: the layout
    // effect's restore-path apply() may already have posted the restored
    // scale (before __dc_present), so clear the guard to re-post it in order.
    window.parent.postMessage({ type: '__dc_present' }, '*');
    lastPostedScale.current = undefined;
    apply();

    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('gesturestart', onGestureStart, { passive: false });
    vp.addEventListener('gesturechange', onGestureChange, { passive: false });
    vp.addEventListener('gestureend', onGestureEnd, { passive: false });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('message', onHostMsg);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);

  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return (
    <div
      ref={vpRef}
      className="design-canvas"
      style={{
        height: '100vh', width: '100vw',
        background: DC.bg,
        overflow: 'hidden',
        overscrollBehavior: 'none',
        touchAction: 'none',
        position: 'relative',
        fontFamily: DC.font,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        ref={worldRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          transformOrigin: '0 0',
          willChange: 'transform',
          width: 'max-content', minWidth: '100%',
          minHeight: '100%',
          padding: '60px 0 80px',
        }}
      >
        <div style={{ position: 'absolute', inset: -6000, backgroundImage: gridSvg, backgroundSize: '120px 120px', pointerEvents: 'none', zIndex: -1 }} />
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({ id, title, subtitle, children, gap = 48 }) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(dcFlatten(children));
  const artboards = all.filter((c) => c && c.type === DCArtboard);
  const rest = all.filter((c) => !(c && c.type === DCArtboard));
  const sec = (ctx && sid && ctx.section(sid)) || {};
  // Must match DesignCanvas's srcKey computation exactly (it filters falsy
  // IDs), or onDelete persists a srcKey that DesignCanvas never recognizes.
  const allIds = artboards.map((a) => a.props.id ?? a.props.label).filter(Boolean);
  const srcKey = allIds.join('\x1f');
  const hidden = sec.srcKey === srcKey ? (sec.hidden || []) : [];
  const srcOrder = allIds.filter((k) => !hidden.includes(k));

  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter((k) => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter((k) => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);

  const byId = Object.fromEntries(artboards.map((a) => [a.props.id ?? a.props.label, a]));

  // marginBottom counter-scales so the on-screen gap between sections stays
  // constant — otherwise at low zoom the (world-space) gap collapses while
  // the screen-constant sectionhead below it doesn't, and the title reads as
  // belonging to the section above. paddingBottom below is just enough for
  // the 24px artboard-header (abs-positioned above each card) plus ~8px, so
  // the title sits tight against its own row at every zoom.
  return (
    <div data-dc-section={sid}
      style={{ marginBottom: 'calc(80px * var(--dc-inv-zoom, 1))', position: 'relative' }}>
      <div style={{ padding: '0 60px' }}>
        <div className="dc-sectionhead" style={{ paddingBottom: 36 }}>
          <DCEditable tag="div" value={sec.title ?? title}
            onChange={(v) => ctx && sid && ctx.patchSection(sid, { title: v })}
            style={{ fontSize: 28, fontWeight: 600, color: DC.title, letterSpacing: -0.4, marginBottom: 6, display: 'inline-block' }} />
          {subtitle && <div style={{ fontSize: 16, color: DC.subtitle }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap, padding: '0 60px', alignItems: 'flex-start', width: 'max-content' }}>
        {order.map((k) => (
          <DCArtboardFrame key={k} sectionId={sid} artboard={byId[k]} order={order}
            label={(sec.labels || {})[k] ?? byId[k].props.label}
            onRename={(v) => ctx && ctx.patchSection(sid, (x) => ({ labels: { ...x.labels, [k]: v } }))}
            onReorder={(next) => ctx && ctx.patchSection(sid, { order: next })}
            onDelete={() => ctx && ctx.patchSection(sid, (x) => ({
              hidden: [...(x.srcKey === srcKey ? (x.hidden || []) : []), k],
              srcKey,
            }))}
            onFocus={() => ctx && ctx.setFocus(`${sid}/${k}`)} />
        ))}
      </div>
      {rest}
    </div>
  );
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() { return null; }

// Per-artboard export (kind: 'png' | 'html'). Both paths share the same
// self-contained clone: computed styles baked in, @font-face / <img> /
// inline-style background-image urls inlined as data URIs. PNG wraps the
// clone in foreignObject→canvas at 3× the artboard's natural width×height
// (same pipeline the host uses for page captures); HTML wraps it in a
// minimal standalone document. Both are independent of viewport zoom.
async function dcExport(node, w, h, name, kind) {
  try { await document.fonts.ready; } catch {}
  const toDataURL = (url) => fetch(url).then((r) => r.blob()).then((b) => new Promise((res) => {
    const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(url); fr.readAsDataURL(b);
  })).catch(() => url);

  // Collect @font-face rules. ss.cssRules throws SecurityError on
  // cross-origin sheets (e.g. fonts.googleapis.com) — in that case fetch
  // the CSS text directly (those endpoints send ACAO:*) and regex-extract
  // the blocks. @import and @media/@supports are walked so nested
  // @font-face rules aren't missed.
  const fontRules = [], pending = [], seen = new Set();
  const scrapeCss = (href) => {
    if (seen.has(href)) return; seen.add(href);
    pending.push(fetch(href).then((r) => r.text()).then((css) => {
      for (const m of css.match(/@font-face\s*{[^}]*}/g) || []) fontRules.push({ css: m, base: href });
      for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/g))
        scrapeCss(new URL(m[1], href).href);
    }).catch(() => {}));
  };
  const walk = (rules, base) => {
    for (const r of rules) {
      if (r.type === CSSRule.FONT_FACE_RULE) fontRules.push({ css: r.cssText, base });
      else if (r.type === CSSRule.IMPORT_RULE && r.styleSheet) {
        const ibase = r.styleSheet.href || base;
        try { walk(r.styleSheet.cssRules, ibase); } catch { scrapeCss(ibase); }
      } else if (r.cssRules) walk(r.cssRules, base);
    }
  };
  for (const ss of document.styleSheets) {
    const base = ss.href || location.href;
    try { walk(ss.cssRules, base); } catch { if (ss.href) scrapeCss(ss.href); }
  }
  while (pending.length) await pending.shift();
  const fontCss = (await Promise.all(fontRules.map(async (rule) => {
    let out = rule.css, m; const re = /url\((['"]?)([^'")]+)\1\)/g;
    while ((m = re.exec(rule.css))) {
      if (m[2].indexOf('data:') === 0) continue;
      let abs; try { abs = new URL(m[2], rule.base).href; } catch { continue; }
      out = out.split(m[0]).join('url("' + await toDataURL(abs) + '")');
    }
    return out;
  }))).join('\n');

  const cloneStyled = (src) => {
    if (src.nodeType === 8 || (src.nodeType === 1 && src.tagName === 'SCRIPT')) return document.createTextNode('');
    const dst = src.cloneNode(false);
    if (src.nodeType === 1) {
      const cs = getComputedStyle(src); let txt = '';
      for (let i = 0; i < cs.length; i++) txt += cs[i] + ':' + cs.getPropertyValue(cs[i]) + ';';
      dst.setAttribute('style', txt + 'animation:none;transition:none;');
      if (src.tagName === 'CANVAS') try { const im = document.createElement('img'); im.src = src.toDataURL(); im.setAttribute('style', txt); return im; } catch {}
    }
    for (let c = src.firstChild; c; c = c.nextSibling) dst.appendChild(cloneStyled(c));
    return dst;
  };
  const clone = cloneStyled(node);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // Drop the card's own shadow/radius so the export is a flush w×h rect;
  // the artboard's own background (if any) is already in the computed style.
  clone.style.boxShadow = 'none'; clone.style.borderRadius = '0';

  const jobs = [];
  clone.querySelectorAll('img').forEach((el) => {
    const s = el.getAttribute('src');
    if (s && s.indexOf('data:') !== 0) jobs.push(toDataURL(el.src).then((d) => el.setAttribute('src', d)));
  });
  [clone, ...clone.querySelectorAll('*')].forEach((el) => {
    const bg = el.style.backgroundImage; if (!bg) return;
    let m; const re = /url\(["']?([^"')]+)["']?\)/g;
    while ((m = re.exec(bg))) {
      const tok = m[0], url = m[1];
      if (url.indexOf('data:') === 0) continue;
      jobs.push(toDataURL(url).then((d) => { el.style.backgroundImage = el.style.backgroundImage.split(tok).join('url("' + d + '")'); }));
    }
  });
  await Promise.all(jobs);

  const xml = new XMLSerializer().serializeToString(clone);
  const save = (blob, ext) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name + '.' + ext; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (kind === 'html') {
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + name + '</title>' +
      (fontCss ? '<style>' + fontCss + '</style>' : '') +
      '</head><body style="margin:0">' + xml + '</body></html>';
    return save(new Blob([html], { type: 'text/html' }), 'html');
  }

  // PNG: the SVG's own width/height must be the output resolution — an
  // <img>-loaded SVG rasterizes at its intrinsic size, so sizing it at 1×
  // and ctx.scale()-ing up would just upscale a 1× bitmap. viewBox maps the
  // w×h foreignObject onto the px·w × px·h SVG canvas so the browser renders
  // the HTML at full resolution.
  const px = 3;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * px + '" height="' + h * px +
    '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject width="' + w + '" height="' + h + '">' +
    (fontCss ? '<style><![CDATA[' + fontCss + ']]></style>' : '') + xml + '</foreignObject></svg>';
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res; img.onerror = () => rej(new Error('svg load failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const cv = document.createElement('canvas');
  cv.width = w * px; cv.height = h * px;
  cv.getContext('2d').drawImage(img, 0, 0);
  cv.toBlob((blob) => save(blob, 'png'), 'image/png');
}

function DCArtboardFrame({ sectionId, artboard, label, order, onRename, onReorder, onFocus, onDelete }) {
  const { id: rawId, label: rawLabel, width = 260, height = 480, children, style = {} } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);
  const cardRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  // ⋯ menu: close on any outside pointerdown. Two-click delete lives inside
  // the menu — first click arms the row, second commits; closing disarms.
  React.useEffect(() => {
    if (!menuOpen) { setConfirming(false); return; }
    const off = (e) => { if (!menuRef.current || !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [menuOpen]);

  const doExport = (kind) => {
    setMenuOpen(false);
    if (!cardRef.current) return;
    const name = String(label || id || 'artboard').replace(/[^\w\s.-]+/g, '_');
    dcExport(cardRef.current, width, height, name, kind)
      .catch((e) => console.error('[design-canvas] export failed:', e));
  };

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map((el) => ({ el, id: el.dataset.dcSlot, x: el.getBoundingClientRect().left }));
    const slotXs = homes.map((h) => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');

    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };

    const move = (ev) => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0, best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) { best = d; nearest = i; }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter((k) => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };

    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) { h.el.style.transition = 'none'; h.el.style.transform = ''; }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  return (
    <div ref={ref} data-dc-slot={id} style={{ position: 'relative', flexShrink: 0 }}>
      <div className="dc-header" data-omelette-chrome="" style={{ color: DC.label }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="dc-labelrow">
          <div className="dc-grip" onPointerDown={onGripDown} title="Drag to reorder">
            <svg width="9" height="13" viewBox="0 0 9 13" fill="currentColor"><circle cx="2" cy="2" r="1.1"/><circle cx="7" cy="2" r="1.1"/><circle cx="2" cy="6.5" r="1.1"/><circle cx="7" cy="6.5" r="1.1"/><circle cx="2" cy="11" r="1.1"/><circle cx="7" cy="11" r="1.1"/></svg>
          </div>
          <div className="dc-labeltext" onClick={onFocus} title="Click to focus">
            <DCEditable value={label} onChange={onRename} onClick={(e) => e.stopPropagation()}
              style={{ fontSize: 15, fontWeight: 500, color: DC.label, lineHeight: 1 }} />
          </div>
        </div>
        <div className="dc-btns">
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button className="dc-kebab" title="More" onClick={() => setMenuOpen((o) => !o)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="2.5" cy="6" r="1.1"/><circle cx="6" cy="6" r="1.1"/><circle cx="9.5" cy="6" r="1.1"/></svg>
            </button>
            {menuOpen && (
              <div className="dc-menu" onPointerDown={(e) => e.stopPropagation()}>
                <button onClick={() => doExport('png')}>Download PNG</button>
                <button onClick={() => doExport('html')}>Download HTML</button>
                <hr />
                <button className="dc-danger"
                  onClick={() => { if (confirming) { setMenuOpen(false); onDelete(); } else setConfirming(true); }}>
                  {confirming ? 'Click again to delete' : 'Delete'}
                </button>
              </div>
            )}
          </div>
          <button className="dc-expand" onClick={onFocus} title="Focus">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"/></svg>
          </button>
        </div>
      </div>
      <div ref={cardRef} className="dc-card"
        style={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)', overflow: 'hidden', width, height, background: '#fff', ...style }}>
        {children || <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13, fontFamily: DC.font }}>{id}</div>}
      </div>
    </div>
  );
}

// Inline rename — commits on blur or Enter.
function DCEditable({ value, onChange, style, tag = 'span', onClick }) {
  const T = tag;
  return (
    <T className="dc-editable" contentEditable suppressContentEditableWarning
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => onChange && onChange(e.currentTarget.textContent)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
      style={style}>{value}</T>
  );
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({ entry, sectionMeta, sectionOrder }) {
  const ctx = React.useContext(DCCtx);
  const { sectionId, artboard } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);

  const go = (d) => { const n = peers[(idx + d + peers.length) % peers.length]; if (n) ctx.setFocus(`${sectionId}/${n}`); };
  const goSection = (d) => {
    // Sections whose artboards are all deleted have slotIds:[] — step past
    // them to the next non-empty section so ↑/↓ doesn't dead-end.
    const n = sectionOrder.length;
    for (let i = 1; i < n; i++) {
      const ns = sectionOrder[(((secIdx + d * i) % n) + n) % n];
      const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
      if (first) { ctx.setFocus(`${ns}/${first}`); return; }
    }
  };

  React.useEffect(() => {
    const k = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); goSection(-1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); goSection(1); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });

  const { width = 260, height = 480, children } = artboard.props;
  const [vp, setVp] = React.useState({ w: window.innerWidth, h: window.innerHeight });
  React.useEffect(() => { const r = () => setVp({ w: window.innerWidth, h: window.innerHeight }); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));

  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({ dir, onClick }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ position: 'absolute', top: '50%', [dir]: 28, transform: 'translateY(-50%)',
        border: 'none', background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.9)',
        width: 44, height: 44, borderRadius: 22, fontSize: 18, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.18)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d={dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'} /></svg>
    </button>
  );

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(
    <div onClick={() => ctx.setFocus(null)}
      onWheel={(e) => e.preventDefault()}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(24,20,16,.6)', backdropFilter: 'blur(14px)',
        fontFamily: DC.font, color: '#fff' }}>

      {/* top bar: section dropdown (left) · close (right) */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72, display: 'flex', alignItems: 'flex-start', padding: '16px 20px 0', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDd((o) => !o)}
            style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', padding: '6px 8px',
              borderRadius: 6, textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>{meta.title}</span>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ opacity: .7 }}><path d="M2 4l3.5 3.5L9 4"/></svg>
            </span>
            {meta.subtitle && <span style={{ display: 'block', fontSize: 13, opacity: .6, fontWeight: 400, marginTop: 2 }}>{meta.subtitle}</span>}
          </button>
          {ddOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#2a251f', borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,.4)', padding: 4, minWidth: 200, zIndex: 10 }}>
              {sectionOrder.filter((sid) => sectionMeta[sid].slotIds.length).map((sid) => (
                <button key={sid} onClick={() => { setDd(false); const f = sectionMeta[sid].slotIds[0]; if (f) ctx.setFocus(`${sid}/${f}`); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent', color: '#fff',
                    padding: '8px 12px', borderRadius: 5, fontSize: 14, fontWeight: sid === sectionId ? 600 : 400, fontFamily: 'inherit' }}>
                  {sectionMeta[sid].title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => ctx.setFocus(null)}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,.7)', width: 32, height: 32,
            borderRadius: 16, fontSize: 20, cursor: 'pointer', lineHeight: 1, transition: 'background .12s' }}>×</button>
      </div>

      {/* card centered, label + index below — only the card itself stops
          propagation so any backdrop click (including the margins around
          the card) exits focus */}
      <div
        style={{ position: 'absolute', top: 64, bottom: 56, left: 100, right: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: width * scale, height: height * scale, position: 'relative' }}>
          <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff', borderRadius: 2, overflow: 'hidden',
            boxShadow: '0 20px 80px rgba(0,0,0,.4)' }}>
            {children || <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>{aid}</div>}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ fontSize: 14, fontWeight: 500, opacity: .85, textAlign: 'center' }}>
          {(sec.labels || {})[aid] ?? artboard.props.label}
          <span style={{ opacity: .5, marginLeft: 10, fontVariantNumeric: 'tabular-nums' }}>{idx + 1} / {peers.length}</span>
        </div>
      </div>

      <Arrow dir="left" onClick={() => go(-1)} />
      <Arrow dir="right" onClick={() => go(1)} />

      {/* dots */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
        {peers.map((p, i) => (
          <button key={p} onClick={() => ctx.setFocus(`${sectionId}/${p}`)}
            style={{ border: 'none', padding: 0, cursor: 'pointer', width: 6, height: 6, borderRadius: 3,
              background: i === idx ? '#fff' : 'rgba(255,255,255,.3)' }} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({ children, top, left, right, bottom, rotate = -2, width = 180 }) {
  return (
    <div style={{
      position: 'absolute', top, left, right, bottom, width,
      background: DC.postitBg, padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14, lineHeight: 1.4, color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5,
    }}>{children}</div>
  );
}

Object.assign(window, { DesignCanvas, DCSection, DCArtboard, DCPostIt });

```

=== FILE: canvas-app.jsx (part 1 of 1) ===
```jsx
/* Assembles the keystone design review onto the canvas. */
const { DesignCanvas, DCSection, DCArtboard, DCPostIt } = window;

function CanvasApp() {
  return (
    <DesignCanvas>

      <DCSection id="orientation" title="1 · The orientation screen — direction picked, now activated" subtitle="Teammates picked layout A (Guided Tour) as best of the three, and asked for the brighter red-white-blue / white-contrast energy of the activating style. Top card = the resolved pick.">
        <DCPostIt top={150} left={64} width={184}>RESOLVED: Guided-Tour layout on the Bold Flag white ground (same UI as results + scorecard), activated with a flag hairline + navy/red accents. The three originals stay below for reference. Nav: “Methodology” → “How it works” (the brand mark already returns home).</DCPostIt>
        <DCArtboard id="ori-pick" label="★ Recommended · Guided Tour, activated" width={1180} height={720}><OrientationActivated /></DCArtboard>
        <DCArtboard id="ori-a" label="A · Guided Tour (original, warm)" width={1180} height={720}><OrientationA /></DCArtboard>
        <DCArtboard id="ori-b" label="B · Mission Checklist" width={1180} height={720}><OrientationB /></DCArtboard>
        <DCArtboard id="ori-c" label="C · The Briefing" width={1180} height={720}><OrientationC /></DCArtboard>
      </DCSection>

      <DCSection id="results" title="2 · Recommended results layout — one panel, rail = progress" subtitle="One visible panel (center). The right rail IS the progress (Reviewing / Not yet / Reviewed) — no separate bar, no left issues panel.">
        <DCPostIt top={150} left={64} width={184}>Issues + jurisdiction moved into the slim context strip (voting logistics — polling place, dates, IDs — live on the scorecard, not here, so this page stays focused on assessing the rep). Funding is a glance summary that expands to the full FunderBars (named PACs + industry mix) — nothing’s dropped. Non-2026 senator greyed + excluded. “Print my scorecard” unlocks after the last seat.</DCPostIt>
        <DCArtboard id="res-main" label="Review surface — blind rep card + progress rail (Bold Flag)" width={1180} height={820}><ResultsScreen palette="white" /></DCArtboard>
        <DCPostIt top={150} left={1292} width={184}>MUXIN: the EXPANDED funding, now on Bold Flag. “Funders &amp; influence ▾” opens the full money trail — total + small/large/PAC mix + the industry breakdown. “PACs” carries a tooltip with the definition (hover/tap — shown open here). The honest “we can’t yet attribute these PACs” note sits at the FOOT. Comparison is vs. the median House campaign (no challenger needed).</DCPostIt>
        <DCArtboard id="res-funding" label="Funding expanded — the full money trail / FunderBars (Bold Flag)" width={1180} height={1128}><ResultsScreen palette="white" expand="funding" /></DCArtboard>
        <DCPostIt top={150} left={2520} width={184}>MUXIN: “what does it look like when you select a vote?” Tapping an issue opens the roll-call votes behind its score — the bill, how they voted (YEA/NAY), whether it matched your position, the one-line summary, date + source. The issue list stays intact above; the detail is its own clean panel below it.</DCPostIt>
        <DCArtboard id="res-votes" label="Select a vote — per-issue roll-call drilldown (Bold Flag)" width={1180} height={1212}><ResultsScreen palette="white" expand="votes" /></DCArtboard>
        <DCPostIt top={150} left={3748} width={184}>MUXIN: “see all votes — it’s a lot, shouldn’t appear by default, but available.” The full record opens over the dimmed surface: filter by With you / Against you / issue. Click any vote to expand what the bill actually does, the roll-call tally, its status, and how this rep voted — each links to the official roll-call.</DCPostIt>
        <DCArtboard id="res-allvotes" label="See all votes — full record sheet (it’s a lot — one tap away)" width={1180} height={980}><ResultsScreen palette="white" allVotes /></DCArtboard>
      </DCSection>

      <DCSection id="color" title="3 · Color & activation — Bold Flag confirmed" subtitle="Same screen, two grounds — kept here as the record of the call. Bold Flag (white ground, red-white-blue) is now THE palette and is applied across every screen above and below.">
        <DCPostIt top={150} left={64} width={184}>CONFIRMED: B · Bold Flag (white ground) — bolder red-white-blue, prints clean, and now the system the whole canvas runs on. A · Civic Activated (warm editorial paper) shown for the honest before/after.</DCPostIt>
        <DCArtboard id="col-white" label="★ B · Bold Flag (white ground)" width={760} height={600}><ResultsScreen palette="white" compact /></DCArtboard>
        <DCArtboard id="col-warm" label="A · Civic Activated (warm paper)" width={760} height={600}><ResultsScreen palette="warm" compact /></DCArtboard>
      </DCSection>

      <DCSection id="scorecard" title="4 · Scorecard — print-ready &amp; grayscale-safe" subtitle="White sheet · decisions lead · matches as % · keep vs replace differentiated by SHAPE + icon + text, so it survives a black-and-white printer.">
        <DCPostIt top={150} left={64} width={184}>Grayscale-safe: Keep = filled badge + ✓, Replace = outlined badge + ⇄, and the % carries a ✓ / ⚠ glyph — the read holds with no color. Address/logistics demoted to a footer strip. Non-2026 seat shown for context, excluded from decisions.</DCPostIt>
        <DCArtboard id="sc-sheet" label="Printable scorecard" width={780} height={900}><Scorecard /></DCArtboard>
      </DCSection>

      <DCSection id="candidates" title="5 · Design Candidates — what “Time to replace” opens" subtitle="The next big slice. The live prototype already has a successor chooser; this brings it onto the Bold Flag system and explores three directions for the moment a voter picks “replace.” Skim left→right; the building-block card is first.">
        <DCPostIt top={150} left={64} width={184}>UNIFIED CARD: House · Senate · President share one card — a provenance badge (filled “Roll-call record” vs dashed “Researched · cited”) carries the only real difference, so legislators and executives never get blended. This is the parity ask (House/Senate + President/VP) resolved in one system.</DCPostIt>
        <DCArtboard id="cand-card" label="Building block · one card, every seat (provenance badge)" width={1180} height={560}><CandidateParity /></DCArtboard>
        <DCPostIt top={150} left={1292} width={184}>THREE DIRECTIONS for what “replace” opens — same data, same Bold Flag system. A grows inline under the rep card (lowest friction, keeps you in the flow). B is a focused full-screen duel. C is a browsable shortlist that drives a focus pane. Switchers in B and C are live — click the challenger tabs / rows.</DCPostIt>
        <DCArtboard id="cand-a" label="A · Inline ranked chooser (evolves current code — incumbent pinned, blind-first, select = decision)" width={1180} height={860}><ReplaceInline /></DCArtboard>
        <DCArtboard id="cand-b" label="B · Dedicated head-to-head compare (full-screen duel · switch the challenger)" width={1180} height={720}><HeadToHead /></DCArtboard>
        <DCArtboard id="cand-c" label="C · Split — ranked shortlist → focused compare (click a name to focus)" width={1180} height={720}><SplitCompare /></DCArtboard>
      </DCSection>

      <DCSection id="home" title="6 · Homepage hero — activated &amp; de-cluttered" subtitle="Card b4cc1c9e. Applies the Bold Flag system to the front door, sharpens the CTA so it says what the site does, and previews the actual product instead of leading with stats.">
        <DCPostIt top={150} left={64} width={184}>DE-CLUTTER: the two fact snippets (6 hrs/day fundraising · 94% incumbents win) leave the hero — they belong on the new “Why Now?” page. The right column now PREVIEWS the product: a blind assessment card that becomes a printable scorecard, so the hero shows what you get. ADDRESS BOX simplified (card 1850349c): label + field + “Pull my representatives,” with the reassurance + steps folded under one “how it works · your data” line. ★ pick on the headline is the activation copy.</DCPostIt>
        <DCArtboard id="home-hero" label="★ Homepage hero — Bold Flag, product-preview right rail" width={1180} height={720}><HomeHero /></DCArtboard>
        <DCArtboard id="home-voices" label="Headline voices — pick the hook" width={1180} height={470}><HeadlineVoices /></DCArtboard>
      </DCSection>

      <DCSection id="whynow" title="7 · “Why Now?” page — the larger case" subtitle="Card 9031f1ce. The long-form editorial that makes the argument and gives the two hero fact snippets a proper home. Pairs with the “Why now” nav link. Adapted from the founder's framing.">
        <DCPostIt top={150} left={64} width={184}>STRUCTURE: three movements — the problem (money buys attention) → the moment (2026: every House seat + ⅓ of the Senate) → how the app answers it (judge the record, not the messaging). The two fact stats pulled off the hero (6 hrs/day · 94% re-elected) live here now. Open fullscreen to read top-to-bottom.</DCPostIt>
        <DCArtboard id="wn-page" label="Why Now? — full editorial page (scroll / open fullscreen)" width={1180} height={2880}><WhyNow /></DCArtboard>
      </DCSection>

      <DCSection id="statics" title="8 · Static pages — the editorial template, everywhere" subtitle="Cards b1a5f64a + c9891a1f + the “apply Why-Now style everywhere” directive. About / How it works / Privacy / Tip jar now share one editorial shell (masthead + kicker + prose), plus a Bold Flag loading state and the reorganized footer. Real copy from the live app.">
        <DCPostIt top={150} left={64} width={184}>ONE SHELL: every top-level page uses StaticPageVC — flag hairline, shared nav, left-aligned serif masthead, kicker, and a readable serif prose column. FOOTER reorg (b1a5f64a · c9891a1f): Privacy now sits right after About, trimmed to brand + “© 2026 Grey Bird LLC”, Tip jar + Support de-emphasized after a divider. The footer renders at the foot of each page.</DCPostIt>
        <DCArtboard id="st-about" label="About" width={1180} height={1360}><AboutVC /></DCArtboard>
        <DCArtboard id="st-how" label="How it works (was “Methodology”)" width={1180} height={1390}><HowItWorksVC /></DCArtboard>
        <DCArtboard id="st-privacy" label="Privacy" width={1180} height={1370}><PrivacyVC /></DCArtboard>
        <DCArtboard id="st-tip" label="Tip jar" width={1180} height={910}><TipJarVC /></DCArtboard>
        <DCArtboard id="st-loading" label="Loading state — Bold Flag" width={1180} height={720}><LoadingVC /></DCArtboard>
      </DCSection>

      <DCSection id="intake" title="9 · Defining your issues — end to end" subtitle="Cards 6cdedfa6 + ef8d602c + 9143a622. The full “what do you care about” flow on the Bold Flag system — cold open → AI proposes → bounded disambiguation → locked, then editing issues from the workspace → re-score. Read left→right.">
        <DCPostIt top={150} left={64} width={184}>The conversation stays primary: the cold open and every refine turn are free text where the voter shares what they care about in their own words. When something's genuinely ambiguous (“the economy,” “immigration”) the AI asks in-line and offers optional <b>quick replies</b> as a shortcut — never a forced multiple-choice. Every issue carries a JURISDICTION tag (who actually controls it). Editing from the candidate screen opens the same loop seeded with your issues, with its own composer → Apply re-scores and flags seats to Revisit (verdicts never touched).</DCPostIt>
        <DCArtboard id="iq-ask" label="1 · Cold open — the ask" width={1180} height={720}><IntakeAsk /></DCArtboard>
        <DCArtboard id="iq-propose" label="2 · AI proposes + asks in-conversation (free text first, quick replies optional)" width={1180} height={860}><IntakePropose /></DCArtboard>
        <DCArtboard id="iq-locked" label="3 · Locked — jurisdiction summary, ready to start" width={1180} height={800}><IntakeLocked /></DCArtboard>
        <DCArtboard id="iq-edit" label="4 · Edit issues from the workspace — seeded modal, converse or quick-reply" width={1180} height={1020}><EditIssues /></DCArtboard>
        <DCArtboard id="iq-delta" label="5 · Apply → re-scored, with Revisit flags (verdicts kept)" width={1180} height={680}><EditRescored /></DCArtboard>
      </DCSection>

      <DCSection id="polis" title="10 · Polis — the opinion map + “Where we agree” (not a nav tab)" subtitle="Card bc774728. Borrows pol.is directly — a PCA-style opinion MAP (voters who answer alike cluster into groups) paired with the consensus statements that BRIDGE those groups. Entry point is AFTER the scorecard, never before: we don't get between the voter and their printout.">
        <DCPostIt top={150} left={64} width={184}>PLACEMENT (resolved with the founder): the scorecard + print come FIRST, ungated — then Polis is an optional “one more thing,” fully skippable. ① CONTRIBUTE = react to a few statements. ② DISPLAY = the “Where America agrees” report (foot of Why Now + shareable). Borrowed from pol.is: an opinion-map scatter (“we don't all answer alike” → groups) leading into the consensus statements (“and yet these cleared every group”). Dots/percentages are illustrative.</DCPostIt>
        <DCArtboard id="polis-entry" label="⓪ Entry point — the optional invite once the scorecard's ready (after print, skippable)" width={1180} height={760}><PolisEntry /></DCArtboard>
        <DCArtboard id="polis-stand" label="① Contribute — BLIND voting (no running tally; disagreeing is never singled out)" width={1180} height={820}><PolisStand /></DCArtboard>
        <DCArtboard id="polis-report" label="②a Display — the honest report: map + common ground + what split" width={1180} height={2280}><PolisReport /></DCArtboard>
        <DCArtboard id="polis-divided" label="②b When there ISN'T common ground — the honest, neutral state" width={1180} height={1640}><PolisReport divided /></DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CanvasApp />);
```

=== FILE: screens-orientation.jsx (part 1 of 1) ===
```jsx
/* Shared chrome + ORIENTATION directions (A/B/C) — the keystone "guided entry". */
const { Fragment: Fr } = React;

function SCNav({ palette }) {
  return (
    <div className="sc-nav">
      <div className="sc-brand"><span className="mark">V</span> Voter Choice</div>
      <div className="sc-nav-links">
        <a>About</a>
        <a>Why now</a>
        <a>How it works</a>
        <a>Privacy</a>
        <span className="tip">Tip jar</span>
        <span className="sc-lang">EN <span className="lang-caret" aria-hidden="true">▾</span></span>
      </div>
    </div>
  );
}

/* ---------- A · GUIDED TOUR ----------
   A dedicated full-screen orientation card before any rep appears.
   This is the exact "tell me what's about to happen" ask. */
function OrientationA() {
  return (
    <div className="screen" data-palette="warm">
      <div className="ori">
        <SCNav />
        <div className="ori-body">
          <div className="ori-card">
            <div className="ori-ey"><span className="kick"><span className="star">★</span> Before you start · step 3 of 3</span></div>
            <h1>Here's how you'll <em>assess your delegation</em>.</h1>
            <p className="ori-lede">Three people in Washington answer to your address. You'll look at each one's record — then decide.</p>
            <div className="ori-steps">
              <div className="ori-step"><span className="n">1</span><div><div className="st-t">See the record, not the name</div><div className="st-d">For each seat: how they voted on your issues, how they're funded, and who's influencing them — shown blind, so you judge the record first.</div></div></div>
              <div className="ori-step"><span className="n">2</span><div><div className="st-t">Decide: worth keeping, or time to replace</div><div className="st-d">At the bottom of every card you make one call. If you'd replace them, you can compare the people running for the seat.</div></div></div>
              <div className="ori-step"><span className="n">3</span><div><div className="st-t">Print your scorecard</div><div className="st-d">Do this for everyone up for election, then take a printable scorecard to the polls.</div></div></div>
            </div>
            <div className="ori-cta">
              <button className="btn-primary">Start with your first seat <span aria-hidden="true">→</span></button>
              <span className="ori-meta">~4 min · 2 seats up in 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- B · MISSION CHECKLIST ----------
   Orientation framed as a 3-step plan, with the actual delegation
   previewed on the right so the scope is concrete and finite. */
function OrientationB() {
  return (
    <div className="screen" data-palette="warm">
      <div className="ori">
        <SCNav />
        <div className="mis-body">
          <div className="mis-left">
            <span className="kick"><span className="star">★</span> Your assignment</span>
            <h1>Three seats. One decision each.</h1>
            <p className="lede">You're about to hold your delegation to their record. Here's the whole job, start to finish — no surprises.</p>
            <div className="mis-plan">
              <div className="mis-row lead"><div className="ring">1</div><div><div className="mt">Review the record</div><div className="md">Votes on your issues · funding · influence — shown blind</div></div></div>
              <div className="mis-row"><div className="ring">2</div><div><div className="mt">Keep or replace</div><div className="md">One verdict per seat · compare challengers if you replace</div></div></div>
              <div className="mis-row"><div className="ring">3</div><div><div className="mt">Print your scorecard</div><div className="md">Take your decisions to the polls</div></div></div>
            </div>
            <button className="btn-primary">Begin — review seat 1 <span aria-hidden="true">→</span></button>
          </div>
          <div className="mis-right">
            <div className="rk">Up for your vote · Austin, TX 78701</div>
            <div className="mis-deleg">
              <div className="mis-seat"><span className="sx">HR</span><div><div className="so">U.S. House · TX-21</div><div className="sn">Your Representative</div></div><span className="snote">Up Nov 2026</span></div>
              <div className="mis-seat"><span className="sx">SE</span><div><div className="so">U.S. Senate · Class II</div><div className="sn">Senior Senator</div></div><span className="snote">Up Nov 2026</span></div>
              <div className="mis-seat muted"><span className="sx">SE</span><div><div className="so">U.S. Senate · Class I</div><div className="sn">Junior Senator</div></div><span className="snote">Not up · 2028</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- C · THE BRIEFING ----------
   Editorial front-page "briefing" — leans into the activation the
   feedback asked for, makes the larger case, then sends you in. */
function OrientationC() {
  return (
    <div className="screen" data-palette="white">
      <div className="brief">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="brief-mast">
          <div className="ml"><span>Vol. 2026 · No. 1</span><span>Austin, Texas</span><span>Nonpartisan · Free</span></div>
          <h1>Your Briefing</h1>
        </div>
        <div className="brief-body">
          <div className="brief-lead">
            <div className="dek-k">What you're about to do</div>
            <h2>Three people vote in your name. <em>Today you check their work.</em></h2>
            <p><span className="drop">You'll review each seat's record</span> — how they voted on the issues you chose, who funds them, who's running against them — shown blind, so the record speaks before the name does.</p>
            <p>At the bottom of every card, one call: <b>worth keeping</b>, or <b>time to replace</b>. Finish the seats up for election, then print a scorecard for the polls.</p>
            <button className="btn-primary">Read the first record <span aria-hidden="true">→</span></button>
          </div>
          <div className="brief-aside">
            <div className="brief-stat"><div className="bv">2</div><div className="bd">of your 3 seats are on the ballot this November</div><div className="bc">U.S. House · U.S. Senate</div></div>
            <div className="brief-rule"></div>
            <div className="brief-stat alt"><div className="bv">~4 min</div><div className="bd">to a printable, address-specific scorecard</div><div className="bc">No account · nothing stored</div></div>
          </div>
        </div>
        <div className="brief-foot">
          <span className="bf-note">Judged against: Healthcare access · Housing affordability · Government accountability</span>
          <button className="btn-ghost">Edit my issues</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- A · GUIDED TOUR — ACTIVATED (the resolved pick) ----------
   The layout teammates picked as "best of the three", on the Bold Flag
   white ground (same UI as results/scorecard), activated with a flag
   hairline + red-white-blue accents. NOT a blue stage. */
function OrientationActivated() {
  return (
    <div className="screen" data-palette="white">
      <div className="ori">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="ori-body">
          <div className="ori-card activated">
            <div className="ori-ey"><span className="kick"><span className="star">★</span> Before you start · step 3 of 3</span></div>
            <h1>Here's how you'll <em>hold your delegation to account</em>.</h1>
            <p className="ori-lede">Three people in Washington answer to your address. You'll look at each one's record — then decide.</p>
            <div className="ori-steps">
              <div className="ori-step"><span className="n">1</span><div><div className="st-t">See the record, not the name</div><div className="st-d">How they voted on your issues, how they're funded, who's influencing them — shown blind.</div></div></div>
              <div className="ori-step"><span className="n">2</span><div><div className="st-t">Decide: keep, or replace</div><div className="st-d">One call per seat. If you'd replace them, compare the people running.</div></div></div>
              <div className="ori-step"><span className="n">3</span><div><div className="st-t">Print your scorecard</div><div className="st-d">Finish the seats up for election, then take it to the polls.</div></div></div>
            </div>
            <div className="ori-cta">
              <button className="btn-primary">Start with your first seat <span aria-hidden="true">→</span></button>
              <span className="ori-meta">~4 min · 2 seats up in 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SCNav, OrientationA, OrientationB, OrientationC, OrientationActivated });
```

=== FILE: screens-results.jsx (part 1 of 1) ===
```jsx
/* RESULTS — the redesigned review surface.
   One visible panel (center rep card), the right rail doubles as
   progress (Reviewing now / Not yet / Reviewed) — no separate bar,
   no left issues panel. Issues + jurisdiction live in the slim
   context strip. Non-2026 seats are greyed and excluded.
   Parameterized so the same layout renders in either palette.

   [Δ Muxin review] Two detail surfaces added on the Bold Flag system:
     - FunderPanel  — the EXPANDED money trail (FunderBars): funding
       mix + named industries + named PACs. Lives behind the
       "Funders & influence ▾" affordance — progressive disclosure,
       nothing dropped.
     - VoteDrilldown / AllVotesSheet — what "selecting a vote" opens.
       An issue row expands to its contributing votes (how they voted,
       aligned or not, the one-line summary, the source); the full
       record across every issue lives in the "See all votes" sheet.
       It's a lot, so it never shows by default — one tap away. */
const { useState: useStateRes } = React;

/* ---- model (mirrors the live app's alignmentEntry + donor contract) ---- */
const REP_FUNDING = {
  total: "$4.2M",
  cycle: "2025–26 cycle",
  mix: { small: 15, large: 39, pac: 46 },
  peer: "≈3× the median House campaign",
  industries: [
    { label: "Energy & utilities", pct: 28, amt: "$1.18M" },
    { label: "Real estate", pct: 22, amt: "$920k" },
    { label: "Finance & banking", pct: 19, amt: "$790k" },
    { label: "Construction", pct: 11, amt: "$460k" },
    { label: "Defense", pct: 8, amt: "$340k" },
    { label: "All other", pct: 12, amt: "$510k" },
  ],
  /* PAC honesty (Muxin): we don't invent named issue-PACs. We name a PAC
     only when we can attribute it to a public agenda; otherwise we say so
     and point to the categorical industry view below. */
  pacAmt: "$1.9M",
  pacPct: 46,
  pacDef: "Political Action Committee — companies, unions, or advocacy groups that pool donations to back candidates. A high PAC share signals reliance on organized interests over individual voters.",
};

const VOTE_RECORD = [
  {
    issue: "Healthcare access", kept: 3, total: 4, align: "good",
    votes: [
      { bill: "HR 3421", title: "Insulin Price Cap Act", cast: "yea", with: true, date: "Jun 2025", note: "Backed the $35 monthly insulin copay cap for Medicare.", what: "Caps what Medicare enrollees pay for insulin at $35 per month and bars higher cost-sharing on covered insulin products.", tally: "Passed House 232–193", status: "Passed House · stalled in Senate" },
      { bill: "HR 812", title: "ACA Subsidy Extension", cast: "yea", with: true, date: "Jan 2025", note: "Voted to extend the expanded marketplace premium subsidies.", what: "Extends the enhanced ACA marketplace premium subsidies for three more years.", tally: "Passed House 220–209", status: "Signed into law" },
      { bill: "HR 1130", title: "Hospital Price Transparency Act", cast: "yea", with: true, date: "Sep 2024", note: "Supported requiring hospitals to publish real cash prices.", what: "Requires hospitals to publish actual cash and negotiated prices in a machine-readable file.", tally: "Passed House 401–19", status: "Passed House" },
      { bill: "HR 5", title: "Medicaid Block Grant Act", cast: "yea", with: false, date: "Mar 2024", note: "Voted to convert Medicaid funding into capped block grants.", what: "Converts federal Medicaid funding into capped per-state block grants.", tally: "Passed House 215–210", status: "Passed House · failed in Senate" },
    ],
  },
  {
    issue: "Housing affordability", kept: 2, total: 5, align: "bad",
    votes: [
      { bill: "HR 4350", title: "Low-Income Housing Tax Credit Expansion", cast: "yea", with: true, date: "May 2025", note: "Supported expanding the LIHTC for new affordable units.", what: "Expands the Low-Income Housing Tax Credit to finance more affordable rental units.", tally: "Passed House 228–197", status: "Passed House" },
      { bill: "HR 2880", title: "First-Time Homebuyer Credit", cast: "yea", with: true, date: "Nov 2024", note: "Backed a refundable credit for first-time buyers.", what: "Creates a refundable tax credit of up to $15k for qualifying first-time buyers.", tally: "Passed House 219–210", status: "Passed House" },
      { bill: "HR 2", title: "Renter Protection Act", cast: "nay", with: false, date: "Feb 2025", note: "Voted against federal eviction and rent-gouging protections.", what: "Sets federal anti-eviction and rent-gouging protections for federally backed units.", tally: "Failed 201–224", status: "Failed in the House" },
      { bill: "HR 999", title: "Zoning Reform Incentives", cast: "nay", with: false, date: "Aug 2024", note: "Opposed grants tied to easing restrictive local zoning.", what: "Ties federal transit grants to local zoning reforms that allow denser housing.", tally: "Failed 198–230", status: "Failed in the House" },
      { bill: "HR 1450", title: "Public Housing Repair Fund", cast: "nay", with: false, date: "Apr 2024", note: "Voted against the public-housing capital repair fund.", what: "Funds a backlog of capital repairs across the federal public-housing stock.", tally: "Failed 205–222", status: "Failed in the House" },
    ],
  },
  {
    issue: "Government accountability", kept: 2, total: 3, align: "bad",
    votes: [
      { bill: "HR 345", title: "Congressional Stock Trading Ban", cast: "nay", with: false, date: "Mar 2025", note: "Voted against the ban; actively trades individual equities.", what: "Bars members of Congress and their spouses from trading individual stocks.", tally: "Failed 199–228", status: "Failed in the House" },
      { bill: "HR 901", title: "Lobbying Transparency Act", cast: "yea", with: true, date: "Jul 2024", note: "Supported 48-hour lobbyist-contact disclosure.", what: "Requires lobbyists to disclose contacts with members within 48 hours.", tally: "Passed House 240–188", status: "Passed House" },
      { bill: "HRes 60", title: "Term-Limit Disclosure Resolution", cast: "yea", with: true, date: "Feb 2024", note: "Backed the non-binding term-limit disclosure resolution.", what: "Non-binding resolution urging members to disclose their position on term limits.", tally: "Agreed to 250–170", status: "Agreed to" },
    ],
  },
];
const VOTES_TOTAL = VOTE_RECORD.reduce((n, g) => n + g.total, 0);
const VOTES_KEPT = VOTE_RECORD.reduce((n, g) => n + g.kept, 0);

/* ---- one roll-call vote card — compact: bill + verdict on one line,
   the plain-language note + date/source on the next ---- */
function VoteCard({ v }) {
  return (
    <div className={"votecard " + (v.with ? "with" : "against")}>
      <div className="vc-top">
        <span className="vc-num">{v.bill}</span>
        <span className="vc-ttl">{v.title}</span>
        <span className={"vc-cast " + v.cast}>Voted {v.cast === "yea" ? "YEA" : "NAY"}</span>
        <span className={"vc-align " + (v.with ? "with" : "against")}>{v.with ? "✓ With you" : "✗ Against you"}</span>
      </div>
      <div className="vc-line">
        <p className="vc-note">{v.note}</p>
        <span className="vc-meta">{v.date} · <a className="vc-src">GovTrack ↗</a></span>
      </div>
    </div>
  );
}

/* ---- the expanded money trail (FunderBars on the Bold Flag system) ---- */
function FunderPanel() {
  const f = REP_FUNDING;
  return (
    <div className="funder-panel">
      <div className="fp-top">
        <div className="fp-tot">
          <span className="fp-amt">{f.total}</span>
          <span className="fp-lab">raised · {f.cycle}</span>
        </div>
        <span className="fp-peer">{f.peer}</span>
      </div>

      <div className="fp-mix">
        <div className="fp-mixbar">
          <i className="small" style={{ width: f.mix.small + "%" }}></i>
          <i className="large" style={{ width: f.mix.large + "%" }}></i>
          <i className="pac" style={{ width: f.mix.pac + "%" }}></i>
        </div>
        <div className="fp-legend">
          <span><i className="small"></i><b>{f.mix.small}%</b> Small donors <small>&lt;$200</small></span>
          <span><i className="large"></i><b>{f.mix.large}%</b> Large donors <small>≥$200</small></span>
          <span className="leg-pac"><i className="pac"></i><b>{f.mix.pac}%</b> <span className="pac-term tip-open" tabIndex={0}>PACs<span className="pac-tip" role="tooltip"><b>PAC</b>= {f.pacDef}</span></span> <small>groups &amp; lobbies</small></span>
        </div>
      </div>

      <div className="fp-block">
        <div className="fp-sub">Where the money comes from <span className="fp-sub-note">industry breakdown</span></div>
        <div className="fp-inds">
          {f.industries.map((it) => (
            <div className="fp-ind" key={it.label}>
              <span className="fi-name">{it.label}</span>
              <span className="fi-track"><i style={{ width: (it.pct / 28 * 100) + "%" }}></i></span>
              <span className="fi-amt">{it.amt}</span>
              <span className="fi-pct">{it.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* The honest “we can’t yet attribute these PACs” note sits at the foot;
         the PAC *definition* is a tooltip on the “PACs” legend term (Muxin). */}
      <div className="fp-pacblock">
        <div className="fp-pacnote">
          <span className="fp-pacnote-ic" aria-hidden="true">!</span>
          <p>About <b>{f.pacAmt}</b> ({f.pacPct}%) came from PACs, but we haven't yet identified specific issue-PACs behind that money. We only name a PAC when we can attribute it to a public agenda — the industry breakdown above is the categorical view.</p>
        </div>
      </div>

      <div className="fp-src">Source · FEC filings (OpenSecrets aggregation) · {f.cycle}</div>
    </div>
  );
}

/* ---- the "See all votes" full record — it's a lot, so it's one tap away ---- */
function AllVotesSheet({ onClose }) {
  return (
    <div className="avsheet-scrim">
      <div className="avsheet">
        <div className="av-head">
          <div className="av-htext">
            <div className="av-eyebrow">Full voting record</div>
            <h3>{VOTES_KEPT} of {VOTES_TOTAL} key votes matched your position</h3>
          </div>
          <button className="av-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="av-filters">
          <span className="avf active">All {VOTES_TOTAL}</span>
          <span className="avf">✓ With you {VOTES_KEPT}</span>
          <span className="avf">✗ Against you {VOTES_TOTAL - VOTES_KEPT}</span>
          <span className="avf-sep"></span>
          {VOTE_RECORD.map((g) => <span className="avf" key={g.issue}>{g.issue}</span>)}
        </div>
        <div className="av-body">
          {VOTE_RECORD.map((g) => (
            <div className="av-group" key={g.issue}>
              <div className="av-glab">
                <span className="avg-name">{g.issue}</span>
                <span className={"avg-frac " + g.align}>{g.kept}/{g.total} with you</span>
              </div>
              {g.votes.map((v) => {
                const open = v.bill === "HR 3421";
                return (
                  <React.Fragment key={v.bill}>
                    <div className={"av-row " + (v.with ? "with" : "against") + (open ? " open" : "")}>
                      <span className={"avr-flag " + (v.with ? "with" : "against")}>{v.with ? "✓" : "✗"}</span>
                      <span className="avr-bill"><b>{v.bill}</b> · {v.title}</span>
                      <span className={"avr-cast " + v.cast}>{v.cast === "yea" ? "YEA" : "NAY"}</span>
                      <span className="avr-date">{v.date}</span>
                      <span className="avr-chev">{open ? "▾" : "▸"}</span>
                    </div>
                    {open && (
                      <div className="av-detail">
                        <p className="avd-what">{v.what}</p>
                        <div className="avd-meta">
                          <span className="avd-pair"><span className="k">Roll call</span><span className="val">{v.tally}</span></span>
                          <span className="avd-pair"><span className="k">Status</span><span className="val">{v.status}</span></span>
                          <span className="avd-pair"><span className="k">Their vote</span><span className={"val " + (v.with ? "with" : "against")}>Voted {v.cast === "yea" ? "YEA" : "NAY"} · {v.with ? "with you" : "against you"}</span></span>
                        </div>
                        <a className="avd-link">View the official roll-call ↗</a>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
        <div className="av-foot">
          <span>Every vote links to the official roll-call.</span>
          <span className="av-src">Source · GovTrack · Congress.gov (CRS)</span>
        </div>
      </div>
    </div>
  );
}

function RepCardFull({ expand }) {
  const showFunding = expand === "funding";
  const showVotes = expand === "votes";
  return (
    <div className="rcard">
      <div className="rcard-strip">
        <span className="office">U.S. House · TX-21</span>
        <span className="dist">Your Representative · 4 terms</span>
        <span className="next">Up Nov 2026</span>
      </div>
      <div className="rcard-head">
        <div className="rcard-avatar">?</div>
        <div className="rcard-who">
          <div className="blind">This seat's incumbent</div>
          <div className="sub">Name &amp; party hidden — judge the record, not the person</div>
        </div>
        <button className="rcard-reveal">Reveal name</button>
      </div>

      <div className="align-band">
        <div className="align-top">
          <span className="at-lab">Voted with you</span>
          <span><span className="at-pct bad">58%</span><span className="at-frac">7 / 12 key votes</span></span>
        </div>
        <div className="align-rows">
          {showVotes ? (
            <React.Fragment>
              <div className="align-row sel">
                <span className="ai">Healthcare access</span>
                <span className="align-track"><i className="good" style={{ width: "75%" }}></i></span>
                <span className="av">3/4 <span className="caret">▾</span></span>
              </div>
              <div className="align-row"><span className="ai">Housing affordability</span><span className="align-track"><i className="bad" style={{ width: "40%" }}></i></span><span className="av">2/5 <span className="caret dim">▸</span></span></div>
              <div className="align-row"><span className="ai">Government accountability</span><span className="align-track"><i className="bad" style={{ width: "33%" }}></i></span><span className="av">2/3 <span className="caret dim">▸</span></span></div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div className="align-row"><span className="ai">Healthcare access</span><span className="align-track"><i className="good" style={{ width: "75%" }}></i></span><span className="av">3/4</span></div>
              <div className="align-row"><span className="ai">Housing affordability</span><span className="align-track"><i className="bad" style={{ width: "40%" }}></i></span><span className="av">2/5</span></div>
              <div className="align-row"><span className="ai">Government accountability</span><span className="align-track"><i className="bad" style={{ width: "33%" }}></i></span><span className="av">2/3</span></div>
            </React.Fragment>
          )}
        </div>
        {showVotes && <VoteDrilldown group={VOTE_RECORD[0]} />}
      </div>

      <div className="att-line"><span>Missed <b>11%</b> of floor votes this term — <b>above</b> the House median (6%)</span><span className="att-tag bad">Below average</span></div>

      {showFunding ? (
        <div className="money-line open">
          <div className="money-top">
            <span className="ml-lab">Funding</span>
            <span className="money-bars"><i className="small" style={{ width: "15%" }}></i><i className="large" style={{ width: "39%" }}></i><i className="pac" style={{ width: "46%" }}></i></span>
            <span className="ml-tot">$4.2M</span>
          </div>
          <div className="money-detail">
            <span className="md-who"><b>46% PAC-funded</b> · top: Energy, Real estate, Finance</span>
          </div>
          <FunderPanel />
        </div>
      ) : (
        <div className="money-line">
          <div className="money-top">
            <span className="ml-lab">Funding</span>
            <span className="money-bars"><i className="small" style={{ width: "15%" }}></i><i className="large" style={{ width: "39%" }}></i><i className="pac" style={{ width: "46%" }}></i></span>
            <span className="ml-tot">$4.2M</span>
          </div>
          <div className="money-detail">
            <span className="md-who"><b>46% PAC-funded</b> · top: Energy, Real estate, Finance</span>
          </div>
        </div>
      )}

      <div className="card-evidence">
        <button>See all 12 votes →</button>
        <button>{showFunding ? "Hide funders ▴" : "Funders & influence ▾"}</button>
      </div>

      <div className="verdicts">
        <button className="vbtn keep"><span className="ck">✓</span> Worth keeping</button>
        <button className="vbtn replace"><span className="ck"></span> Time to replace</button>
      </div>
      <div className="card-sources"><span className="lab">Sources</span><a>GovTrack</a><span>·</span><a>Congress.gov (CRS)</a><span>·</span><a>FEC</a><span>·</span><a>OpenSecrets</a></div>
    </div>
  );
}

/* ---- the per-issue drilldown — the votes behind one issue's score ---- */
function VoteDrilldown({ group }) {
  return (
    <div className="vote-drill">
      <div className="vd-head">
        <span className="vd-lab"><b>{group.issue}</b> · the {group.total} votes behind this score</span>
        <span className="vd-frac">{group.kept} matched · {group.total - group.kept} didn't</span>
      </div>
      <div className="vd-cards">
        {group.votes.map((v) => <VoteCard v={v} key={v.bill} />)}
      </div>
    </div>
  );
}

function RepCardCompact() {
  return (
    <div className="rcard">
      <div className="rcard-strip">
        <span className="office">U.S. House · TX-21</span>
        <span className="next">Up Nov 2026</span>
      </div>
      <div className="rcard-head">
        <div className="rcard-avatar">?</div>
        <div className="rcard-who"><div className="blind">This seat's incumbent</div><div className="sub">Judge the record, not the person</div></div>
      </div>
      <div className="align-band">
        <div className="align-top"><span className="at-lab">Voted with you</span><span><span className="at-pct bad">58%</span><span className="at-frac">7 / 12</span></span></div>
        <div className="align-rows">
          <div className="align-row"><span className="ai">Healthcare access</span><span className="align-track"><i className="good" style={{ width: "75%" }}></i></span><span className="av">3/4</span></div>
          <div className="align-row"><span className="ai">Housing affordability</span><span className="align-track"><i className="bad" style={{ width: "40%" }}></i></span><span className="av">2/5</span></div>
        </div>
      </div>
      <div className="verdicts">
        <button className="vbtn keep"><span className="ck">✓</span> Keep</button>
        <button className="vbtn replace"><span className="ck"></span> Replace</button>
      </div>
    </div>
  );
}

function ResultsRail({ compact }) {
  return (
    <div className="res-rail">
      <div className="rail-head">
        <div className="rh-t">Your delegation</div>
        <div className="rh-prog">
          <span className="rh-dots"><i className="active"></i><i></i></span>
          <span className="rh-count">0 of 2 decided</span>
        </div>
      </div>
      <div className="rail-list">
        <div className="rail-group-lab">Reviewing now</div>
        <div className="rseat active">
          <span className="ri">HR</span>
          <span className="rmeta"><span className="ro">U.S. House · TX-21</span><span className="rn">This seat</span></span>
          <span className="rstatus">Now</span>
        </div>
        <div className="rail-group-lab">Not yet reviewed</div>
        <div className="rseat">
          <span className="ri">SE</span>
          <span className="rmeta"><span className="ro">U.S. Senate · Class II</span><span className="rn">This seat</span></span>
          <span className="rstatus pending">Up next</span>
        </div>
        <div className="rail-group-lab">Not up for election</div>
        <div className="rseat notup">
          <span className="ri">SE</span>
          <span className="rmeta"><span className="ro">U.S. Senate · Class I</span><span className="rn">Junior Senator</span></span>
          <span className="rstatus pending">2028</span>
        </div>
      </div>
      <div className="rail-foot">
        <button className="btn-primary" disabled>Print my scorecard</button>
        <div className="rf-hint">Decide both seats to print · 0 of 2</div>
      </div>
    </div>
  );
}

function ResultsScreen({ palette = "warm", compact = false, expand = null, allVotes = false }) {
  return (
    <div className="screen" data-palette={palette}>
      <div className={"res" + (compact ? " compact" : "")}>
        {!compact && <SCNav />}
        <div className="res-context">
          <span className="rc-back">← Seats</span>
          {!compact && <span className="rc-addr">1100 Congress Ave, Austin, TX 78701</span>}
          <span className="rc-issues">
            <span className="rc-lab">Your issues</span>
            <span className="chip-issue">Healthcare access</span>
            <span className="chip-issue">Housing affordability</span>
            {!compact && <span className="chip-issue">Government accountability</span>}
            <span className="chip-issue edit">Edit</span>
          </span>
        </div>
        <div className="res-main">
          <div className="res-center">
            <div className="res-tier">
              <span className="tp">SEAT 1 OF 2</span>
              <div><h2>Your U.S. House seat <span className="lvl">FEDERAL</span></h2><p>One representative for TX-21. They vote on federal law — healthcare, housing, spending. Here's their record against your issues.</p></div>
            </div>
            {compact ? <RepCardCompact /> : <RepCardFull expand={expand} />}
          </div>
          <ResultsRail compact={compact} />
        </div>
      </div>
      {allVotes && <AllVotesSheet onClose={() => {}} />}
    </div>
  );
}

Object.assign(window, {
  ResultsScreen, RepCardFull, RepCardCompact, ResultsRail,
  FunderPanel, VoteCard, VoteDrilldown, AllVotesSheet,
});
```

=== FILE: screens-scorecard.jsx (part 1 of 1) ===
```jsx
/* SCORECARD — print-ready overhaul.
   White sheet, big headings, DECISIONS lead (not address/districts),
   keep vs replace clearly differentiated (color + icon + verdict pill),
   votes-matched shown as a %, logistics demoted to a footer strip,
   non-2026 seat excluded from the decisions. */
function Scorecard() {
  return (
    <div className="screen" data-palette="white">
      <div className="sheetwrap">
        <div className="sheet">
          <div className="pflag"><i></i><i></i></div>
          <div className="sheet-pad">
            <div className="sheet-mast">
              <div>
                <h1>My Scorecard</h1>
                <div className="mast-sub">Voter Choice · General Election · Nov 3, 2026</div>
              </div>
              <div className="mast-r"><b>Austin, TX</b><br />Precinct 0312<br />Travis County</div>
            </div>

            <div className="sheet-section-lab">My decisions · 2 seats up for election</div>

            <div className="dec">
              <div className="dec-badge replace">⇄</div>
              <div className="dec-main">
                <div className="dec-office">U.S. House · TX-21</div>
                <div className="dec-name"><span className="nm">Replace with J. Marqual</span> <span className="dec-verdict replace">Time to replace</span></div>
                <div className="dec-note">Replacing the incumbent (<b>58% match</b>) · challenger aligns <b>83%</b> on your issues</div>
              </div>
              <div className="dec-score"><div className="ds-pct bad">58%</div><div className="ds-lab">incumbent match</div></div>
            </div>

            <div className="dec">
              <div className="dec-badge keep">✓</div>
              <div className="dec-main">
                <div className="dec-office">U.S. Senate · Class II</div>
                <div className="dec-name"><span className="nm">Keep R. Delgado</span> <span className="dec-verdict keep">Worth keeping</span></div>
                <div className="dec-note">Voted with you on <b>9 of 11</b> key votes · small-donor funded</div>
              </div>
              <div className="dec-score"><div className="ds-pct good">82%</div><div className="ds-lab">votes matched you</div></div>
            </div>

            <div className="sheet-section-lab">Not on your ballot this year</div>
            <div className="dec notup">
              <div className="dec-badge">—</div>
              <div className="dec-main">
                <div className="dec-office">U.S. Senate · Class I</div>
                <div className="dec-name"><span className="nm">Junior Senator</span> <span className="dec-verdict" style={{ background: "oklch(0.95 0.006 260)", color: "oklch(0.50 0.026 260)" }}>Not up until 2028</span></div>
                <div className="dec-note">Shown for context · no decision needed this election</div>
              </div>
            </div>

            <div className="sheet-meta">
              <div className="cell"><div className="k">Registered address</div><div className="v">1100 Congress Ave, Austin, TX 78701</div></div>
              <div className="cell"><div className="k">Your districts</div><div className="v">U.S. House TX-21</div></div>
              <div className="cell"><div className="k">Bring (any one)</div><div className="v">TX driver license · TX ID · U.S. passport</div></div>
              <div className="cell"><div className="k">Early voting</div><div className="v">Oct 19 – Oct 30, 2026</div></div>
            </div>

            <div style={{ marginTop: "18px" }}>
              <div className="k" style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.54 0.026 260)", fontWeight: 600 }}>Judged against your issues</div>
              <div className="sheet-issues"><span className="pill">Healthcare access</span><span className="pill">Housing affordability</span><span className="pill">Government accountability</span></div>
            </div>

            <div className="sheet-foot">
              <span><b>Built with Voter Choice</b> · Free · nonpartisan · voterchoice.app · © 2026 Grey Bird LLC. All Rights Reserved.</span>
              <span>Generated Jun 16, 2026 · Ref VC-7K2Q09 · Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Scorecard });
```

=== FILE: screens-candidates.jsx (part 1 of 1) ===
```jsx
/* ====================================================
   DESIGN CANDIDATES — the "Time to replace" flow
   ----------------------------------------------------
   Brings the successor chooser (was redesign2-replace.jsx) onto the
   Bold Flag white ground, and explores THREE directions for what
   picking "Replace" opens:
     A · inline ranked chooser  (evolves the current approach)
     B · dedicated head-to-head compare screen
     C · split — ranked shortlist → focused compare
   Plus ONE unified candidate card: the provenance badge (roll-call
   vs researched) carries the House / Senate / President difference,
   so it's a single card system across seat types.
   Data is faithful to redesign2-data.jsx (TX-21 House race). Names
   are fictional. ==================================================== */
const { useState: useStateCd } = React;

function cdTone(p) { return p == null ? "na" : p >= 67 ? "good" : p >= 34 ? "mid" : "bad"; }

/* incumbent + challengers for the TX-21 U.S. House seat */
const REP = {
  name: "Theo Vance", role: "U.S. Rep. since 2019", office: "U.S. House · TX-21",
  align: 58, raised: "$4.2M", mix: { small: 15, large: 39, pac: 46 },
  issues: [
    { k: "Healthcare access", v: 75 },
    { k: "Housing affordability", v: 40 },
    { k: "Government accountability", v: 33 },
  ],
};
const CHS = [
  { id: "reyes", name: "Elena Reyes", pip: "dem", party: "Democrat", role: "Community-clinic director · first run",
    why: "Ran a nonprofit clinic for 12 years and says Washington stopped fighting for patients.",
    align: 83, raised: "$1.34M", mix: { small: 61, large: 31, pac: 8 }, conf: "high",
    issues: [{ k: "Healthcare access", v: 92 }, { k: "Housing affordability", v: 78 }, { k: "Government accountability", v: 80 }] },
  { id: "whitfield", name: "Sam Whitfield", pip: "ind", party: "Independent", role: "Small-business owner · first run",
    why: "No party and no PAC money — running on one promise: ban congressional stock trading.",
    align: 61, raised: "$95K", mix: { small: 88, large: 12, pac: 0 }, conf: "high",
    issues: [{ k: "Healthcare access", v: 50 }, { k: "Housing affordability", v: 50 }, { k: "Government accountability", v: 100 }] },
  { id: "dunne", name: "Garrett Dunne", pip: "rep", party: "Republican", role: "Former county sheriff",
    why: "26 years in law enforcement; running to the incumbent's right on border security.",
    align: 34, raised: "$410K", mix: { small: 22, large: 41, pac: 37 }, conf: "medium",
    issues: [{ k: "Healthcare access", v: 25 }, { k: "Housing affordability", v: 33 }, { k: "Government accountability", v: 40 }] },
];

function ProvBadge({ basis, conf }) {
  return basis === "roll-call"
    ? <span className="prov rollcall">Roll-call record</span>
    : <span className="prov researched">Researched · cited{conf ? " · " + conf : ""}</span>;
}

function MiniBars({ mix }) {
  return (
    <span className="cd-bars">
      <i className="small" style={{ width: mix.small + "%" }}></i>
      <i className="large" style={{ width: mix.large + "%" }}></i>
      <i className="pac" style={{ width: mix.pac + "%" }}></i>
    </span>
  );
}

/* =========================================================
   BUILDING BLOCK · unified candidate card across seat types
   ========================================================= */
function CandCard({ c }) {
  return (
    <div className={"cd-card" + (c.pick ? " is-pick" : "") + (c.blind ? " blind" : "")}>
      <div className="cd-seatlab"><span className="seat-t">{c.seat}</span><span>{c.when}</span></div>
      <div className="cd-head">
        <div className="cd-avatar">{c.blind ? "?" : c.initial}</div>
        <div className="cd-who">
          <div className="cd-name">
            {!c.blind && <span className={"pip " + c.pip}></span>}
            {c.blind ? "This seat's incumbent" : c.name}
            {c.pick && <span className="cd-pick-tag">Your pick</span>}
          </div>
          <div className="cd-role">{c.blind ? "Name & party hidden — judge the record" : c.role}</div>
        </div>
      </div>
      <div className="cd-prov-row"><ProvBadge basis={c.basis} conf={c.conf} /></div>

      <div className="cd-align">
        <div className="cd-align-top">
          <span className="lab">{c.basis === "roll-call" ? "Voted with you" : "Aligns with you"}</span>
          <span>
            <span className={"cd-pct tone-" + cdTone(c.align)}>{c.align}%</span>
            {c.delta != null && <span className={"cd-delta " + (c.delta > 0 ? "up" : "down")}>{(c.delta > 0 ? "+" : "") + c.delta} vs rep</span>}
          </span>
        </div>
        <div className="cd-issues">
          {c.issues.map((i, k) => (
            <div className="cd-irow" key={k}>
              <span className="ik">{i.k}</span>
              <span className="cd-track"><i className={"bar-" + cdTone(i.v)} style={{ width: i.v + "%" }}></i></span>
              <span className="iv">{i.v}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cd-money">
        <div className="cd-money-top">
          <span className="lab">Funding</span>
          <MiniBars mix={c.mix} />
          <span className="tot">{c.raised}</span>
        </div>
        <div className="cd-money-note"><b>{c.mix.pac}% PAC-funded</b> · {c.mix.small}% small-dollar</div>
      </div>

      <div className="cd-foot">
        <button className={"cd-select" + (c.ghost ? " ghost" : "")}>{c.cta}</button>
      </div>
    </div>
  );
}

function CandidateParity() {
  const cards = [
    { seat: "U.S. House · TX-21", when: "Up Nov 2026", initial: "T", pip: "rep", name: "Theo Vance",
      role: "U.S. Rep. since 2019", basis: "roll-call", align: 58, raised: "$4.2M",
      mix: { small: 15, large: 39, pac: 46 }, cta: "Review this seat", ghost: true,
      issues: [{ k: "Healthcare access", v: 75 }, { k: "Housing affordability", v: 40 }, { k: "Government accountability", v: 33 }] },
    { seat: "U.S. Senate · Class II", when: "Up Nov 2026", initial: "R", pip: "dem", name: "Rosa Delgado",
      role: "U.S. Senator since 2015", basis: "roll-call", align: 82, raised: "$22.9M", pick: true,
      mix: { small: 43, large: 41, pac: 16 }, cta: "✓ Worth keeping",
      issues: [{ k: "Healthcare access", v: 88 }, { k: "Housing affordability", v: 80 }, { k: "Government accountability", v: 78 }] },
    { seat: "U.S. President", when: "Up Nov 2026", initial: "D", pip: "ind", name: "Dana Whitmore",
      role: "Executive — no roll-call record", basis: "researched", conf: "high", align: 47, raised: "$210M",
      mix: { small: 38, large: 29, pac: 33 }, cta: "Review this seat", ghost: true,
      issues: [{ k: "Healthcare access", v: 50 }, { k: "Housing affordability", v: 50 }, { k: "Government accountability", v: 40 }] },
  ];
  return (
    <div className="screen" data-palette="white">
      <div className="cd-stage">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="cd-explain">
          <h2>One card, every seat.</h2>
          <p>House, Senate, and President share a single card. The <b>provenance badge</b> carries the only real difference — legislators are scored on a <b>roll-call record</b>, executives on <b>researched, cited positions</b> (never blended).</p>
        </div>
        <div className="cd-pair">
          {cards.map((c, i) => <CandCard key={i} c={c} />)}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DIRECTION A · inline ranked chooser (grows under the card)
   ========================================================= */
function ChallengerRow2({ ch, rank, open, picked }) {
  const delta = ch.align - REP.align;
  return (
    <div className={"ch2" + (open ? " open" : "") + (picked ? " is-pick" : "")}>
      <div className="ch2-row">
        <span className="ch2-rank">{rank}</span>
        <div className="ch2-id">
          <div className="ch2-name"><span className={"pip " + ch.pip}></span>{ch.name}{picked && <span className="pick-tag">Your pick</span>}</div>
          <div className="ch2-meta"><ProvBadge basis="researched" conf={ch.conf} /><span>{ch.role}</span></div>
        </div>
        <div className="ch2-scores">
          <div className="ch2-pct"><b className={"tone-" + cdTone(ch.align)}>{ch.align}%</b><span>aligned</span></div>
          <div className="ch2-vs"><span className={"d " + (delta > 0 ? "up" : "down")}>{(delta > 0 ? "+" : "") + delta}</span><small>vs. rep</small></div>
          <span className="ch2-chev">{open ? "▴" : "▾"}</span>
        </div>
      </div>
      {open && (
        <div className="ch2-detail">
          <p className="ch2-why">“{ch.why}”</p>
          <div className="h2h2-colhead"><span>Issue</span><span>Your rep</span><span>{ch.name.split(" ")[0]}</span><span>Δ</span></div>
          <div className="h2h2">
            {ch.issues.map((iss, i) => {
              const inc = REP.issues[i].v, d = iss.v - inc;
              return (
                <div className="h2h2-row" key={i}>
                  <span className="iss">{iss.k}</span>
                  <span className="h2h2-cell"><span className="mini inc"><i className={"bar-" + cdTone(inc)} style={{ width: inc + "%" }}></i></span><span className="v">{inc}</span></span>
                  <span className="h2h2-cell"><span className="mini"><i className={"bar-" + cdTone(iss.v)} style={{ width: iss.v + "%" }}></i></span><span className="v">{iss.v}</span></span>
                  <span className={"delta " + (d > 0 ? "up" : d < 0 ? "down" : "")}>{(d > 0 ? "+" : "") + d}</span>
                </div>
              );
            })}
          </div>
          <div className="ch2-selbar">
            <span className="ch2-selnote">Raised <b>{ch.raised}</b> · {ch.mix.small}% small-dollar · {ch.mix.pac}% PAC</span>
            <button className={"ch2-sel" + (picked ? " is-sel" : "")}>{picked ? "✓ Selected for this seat" : "Select for this seat →"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReplaceInline() {
  const ranked = [...CHS].sort((a, b) => b.align - a.align);
  return (
    <div className="screen" data-palette="white">
      <div className="rf2">
        <div className="rf2-scroll">
          <div className="rf2-banner">
            <span className="x">✕</span>
            <div>
              <div className="bt">You marked this seat “time to replace.”</div>
              <div className="bd">Here's who's running — scored the same way you scored your rep. Selecting someone records your pick.</div>
            </div>
            <button className="undo">Undo</button>
          </div>

          <div className="rf2-inc">
            <div>
              <div className="bar2beat">The bar to beat · your current rep</div>
              <div className="who">{REP.name}</div>
              <div className="meta">{REP.role} · {REP.mix.pac}% PAC-funded</div>
            </div>
            <div className="pct"><b className={"tone-" + cdTone(REP.align)}>{REP.align}%</b><span>on the record</span></div>
          </div>

          <div className="rf2-controls">
            <span className="sortlab">Sort by</span>
            <div className="rf2-seg"><button className="on">Best aligned</button><button>Funding independence</button><button>Funds raised</button></div>
            <span className="count">7 on the ballot · 4 long-shots hidden</span>
          </div>

          <div className="rf2-list">
            {ranked.map((ch, i) => (
              <ChallengerRow2 key={ch.id} ch={ch} rank={i + 1} open={i === 0} picked={i === 0} />
            ))}
          </div>
          <button className="rf2-more">Show all 7 ranked candidates →</button>

          <div className="rf2-confirm">
            <span className="tick">✓</span>
            <span className="t">Your pick to replace this seat: <b>Elena Reyes</b> (+25 vs. your rep). It's on your scorecard — change it anytime.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DIRECTION B · dedicated head-to-head compare screen
   ========================================================= */
function HeadToHead() {
  const [sel, setSel] = useStateCd("reyes");
  const ch = CHS.find((c) => c.id === sel);
  return (
    <div className="screen" data-palette="white">
      <div className="cmp">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="cmp-top">
          <div>
            <h2>Head-to-head</h2>
            <div className="ctx">U.S. House · TX-21 · your rep vs. who's running</div>
          </div>
          <div className="cmp-switch">
            {CHS.map((c) => (
              <button key={c.id} className={sel === c.id ? "on" : ""} onClick={() => setSel(c.id)}>
                <span className={"pip " + c.pip}></span>{c.name.split(" ")[1]}<span className="p">{c.align}%</span>
              </button>
            ))}
          </div>
        </div>

        <div className="cmp-grid">
          <div className="cmp-col inc">
            <div className="cmp-colhead">
              <div className="cmp-av">T</div>
              <div className="cmp-roleline">
                <div className="cmp-tag">The record you have</div>
                <div className="cmp-cname"><span className="pip rep"></span>{REP.name}</div>
                <div className="cmp-crole">{REP.role}</div>
              </div>
            </div>
            <div className="cmp-big"><b className={"tone-" + cdTone(REP.align)}>{REP.align}%</b><span className="lab">voted with you</span></div>
            <div className="cmp-prov-line"><ProvBadge basis="roll-call" /></div>
          </div>
          <div className="cmp-col ch">
            <div className="cmp-colhead">
              <div className="cmp-av">{ch.name[0]}</div>
              <div className="cmp-roleline">
                <div className="cmp-tag">Running to replace them</div>
                <div className="cmp-cname"><span className={"pip " + ch.pip}></span>{ch.name}</div>
                <div className="cmp-crole">{ch.role}</div>
              </div>
            </div>
            <div className="cmp-big"><b className={"tone-" + cdTone(ch.align)}>{ch.align}%</b><span className="lab">aligns with you</span></div>
            <div className="cmp-prov-line"><ProvBadge basis="researched" conf={ch.conf} /></div>
          </div>
        </div>

        <div className="cmp-ledger">
          <div className="cmp-ledgrid">
            <div className="cmp-lrow head"><span>Your rep</span><span></span><span style={{ textAlign: "center" }}>On your issues</span><span></span><span>{ch.name.split(" ")[0]}</span></div>
            {ch.issues.map((iss, i) => {
              const inc = REP.issues[i].v, d = iss.v - inc;
              return (
                <div className="cmp-lrow" key={i}>
                  <span className="cmp-iss-l">{inc}% · {REP.issues[i].k}</span>
                  <span className={"cmp-v tone-" + cdTone(inc)}>{inc}</span>
                  <span className="cmp-mid"><span className={"arrow " + (d > 0 ? "up" : d < 0 ? "down" : "even")}>{d > 0 ? "▲ +" + d : d < 0 ? "▼ " + d : "even"}</span></span>
                  <span className={"cmp-v tone-" + cdTone(iss.v)}>{iss.v}</span>
                  <span className="cmp-iss-r">{iss.v}% · {iss.k}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cmp-foot">
          <div className="cmp-fund">
            <div className="blk"><span className="v">{REP.mix.pac}% PAC</span><span className="k">your rep · {REP.raised}</span></div>
            <span style={{ fontFamily: "var(--mono)", fontSize: "11px" }}>vs</span>
            <div className="blk"><span className="v tone-good">{ch.mix.pac}% PAC</span><span className="k">{ch.name.split(" ")[0]} · {ch.raised} · {ch.mix.small}% small</span></div>
          </div>
          <div className="cmp-actions">
            <button className="cmp-keepbtn">Keep {REP.name.split(" ")[1]}</button>
            <button className="cmp-repbtn">Replace with {ch.name.split(" ")[1]} <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DIRECTION C · split — ranked shortlist → focused compare
   ========================================================= */
function SplitCompare() {
  const [sel, setSel] = useStateCd("reyes");
  const ranked = [...CHS].sort((a, b) => b.align - a.align);
  const ch = CHS.find((c) => c.id === sel);
  return (
    <div className="screen" data-palette="white">
      <div className="split">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <div className="split-head">
          <h2>Time to replace — who's running for this seat</h2>
          <p>Pick a challenger to compare head-to-head against your current rep.</p>
        </div>
        <div className="split-body">
          <div className="split-list">
            <div className="split-list-lab">On the ballot · ranked by alignment</div>
            <div className="split-items">
              {ranked.map((c, i) => {
                const d = c.align - REP.align;
                return (
                  <div className={"sl-item" + (sel === c.id ? " on" : "")} key={c.id} onClick={() => setSel(c.id)}>
                    <span className="sl-rank">{i + 1}</span>
                    <div className="sl-id">
                      <div className="sl-name"><span className={"pip " + c.pip}></span>{c.name}</div>
                      <div className="sl-meta">{c.party} · {c.raised}</div>
                    </div>
                    <div className="sl-pct"><b className={"tone-" + cdTone(c.align)}>{c.align}%</b><span className={d > 0 ? "up" : "down"}>{(d > 0 ? "+" : "") + d} vs rep</span></div>
                  </div>
                );
              })}
            </div>
            <div className="split-folded">+ 4 long-shots hidden · under $50k raised, no record</div>
            <div className="split-inc">
              <div className="l">The bar to beat</div>
              <div className="r"><span className="nm">{REP.name}</span><span className="pc">{REP.align}%</span></div>
            </div>
          </div>

          <div className="split-focus">
            <div className="sf-head">
              <div className="sf-av">{ch.name[0]}</div>
              <div className="sf-who">
                <div className="sf-name"><span className={"pip " + ch.pip}></span>{ch.name}</div>
                <div className="sf-role">{ch.party} · {ch.role}</div>
                <div style={{ marginTop: "7px" }}><ProvBadge basis="researched" conf={ch.conf} /></div>
              </div>
              <div className="sf-headpct"><b className={"tone-" + cdTone(ch.align)} style={{ color: ch.align >= REP.align ? "var(--keep)" : "var(--replace)" }}>{ch.align}%</b><div className="vs" style={{ color: ch.align >= REP.align ? "var(--keep)" : "var(--replace)" }}>{ch.align - REP.align > 0 ? "+" : ""}{ch.align - REP.align} vs your rep</div></div>
            </div>
            <p className="sf-why">“{ch.why}”</p>

            <div className="sf-sub">Head-to-head on your issues</div>
            <div className="sf-ledger">
              {ch.issues.map((iss, i) => {
                const inc = REP.issues[i].v, d = iss.v - inc;
                return (
                  <div className="sf-lrow" key={i}>
                    <span className="iss">{iss.k}</span>
                    <span className="sf-trk inc"><i className={"bar-" + cdTone(inc)} style={{ width: inc + "%" }}></i></span>
                    <span className="sf-incv">rep {inc}%</span>
                    <span className="sf-trk"><i className={"bar-" + cdTone(iss.v)} style={{ width: iss.v + "%" }}></i></span>
                    <span className={"sf-chv " + (d > 0 ? "tone-good" : "tone-bad")}>{(d > 0 ? "+" : "") + d}</span>
                  </div>
                );
              })}
            </div>

            <div className="sf-money">
              <span className="lab">Funding</span>
              <span className="sf-bars"><i className="small" style={{ width: ch.mix.small + "%" }}></i><i className="large" style={{ width: ch.mix.large + "%" }}></i><i className="pac" style={{ width: ch.mix.pac + "%" }}></i></span>
              <span className="tot">{ch.raised} · {ch.mix.pac}% PAC</span>
            </div>

            <div className="sf-foot">
              <button className="sf-select">Select {ch.name.split(" ")[0]} to replace this seat →</button>
              <button className="sf-chat">Ask about {ch.name.split(" ")[0]}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CandidateParity, ReplaceInline, HeadToHead, SplitCompare });
```

=== FILE: screens-home.jsx (part 1 of 1) ===
```jsx
/* ====================================================
   HOMEPAGE HERO — card b4cc1c9e (+ address simplify 1850349c)
   On the Bold Flag white ground. The two fact snippets are gone
   (they belong on the future "Why Now?" page); the CTA + lede now
   say plainly what the site does; the address box is simplified;
   and the right column previews the actual product.
   ==================================================== */

function HomeHero() {
  return (
    <div className="screen" data-palette="white">
      <div className="vh">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="vh-hero">
          <div className="vh-left">
            <span className="vh-eyebrow kick"><span className="star">★</span> Nov 3, 2026 · America's 250th election</span>
            <h1 className="vh-h1">How well are your elected officials really representing you? <em>Get the scorecard.</em></h1>
            <p className="vh-lede">Voter Choice shows you how your <b>senators and representative</b> actually voted on the issues <i>you</i> choose — and who funded them — then turns your verdicts into a <b>scorecard for the polls</b>.</p>

            <div className="vh-addr">
              <div className="vh-addr-lab">
                <span className="l">Your registered address <button className="why" type="button">?</button></span>
                <span className="priv">Stays on this device</span>
              </div>
              <div className="vh-addr-row">
                <input type="text" placeholder="1100 Congress Ave, Austin, TX 78701" defaultValue="" />
                <button className="vh-go">Pull my representatives <span aria-hidden="true">→</span></button>
              </div>
              <div className="vh-disclose">
                <span className="dt">Unsure? How it works · your data <span aria-hidden="true">▾</span></span>
                <div className="vh-steps">
                  <span className="vh-step"><span className="n">1</span> Pull your reps</span>
                  <span className="arw">›</span>
                  <span className="vh-step"><span className="n">2</span> Pick your issues</span>
                  <span className="arw">›</span>
                  <span className="vh-step"><span className="n">3</span> Check the record</span>
                  <span className="arw">›</span>
                  <span className="vh-step"><span className="n">4</span> Print &amp; vote</span>
                </div>
              </div>
            </div>
            <div className="vh-trust"><span>No account</span><span>No tracking</span><span>Address never stored</span></div>
          </div>

          <div className="vh-preview">
            <div className="vh-preview-cap">What you'll get</div>
            <div className="vh-stack">
              {/* scorecard sliver behind */}
              <div className="vh-sheet">
                <div className="pflag"><i></i><i></i></div>
                <div className="vh-sheet-pad">
                  <h5>My Scorecard</h5>
                  <div className="ss-sub">General Election · Nov 3, 2026</div>
                  <div className="ss-row">
                    <div className="ss-badge replace">⇄</div>
                    <div className="ss-tx"><div className="ss-o">U.S. House · TX-21</div><div className="ss-n">Replace</div></div>
                    <div className="ss-pct tone-bad">58%</div>
                  </div>
                  <div className="ss-row">
                    <div className="ss-badge keep">✓</div>
                    <div className="ss-tx"><div className="ss-o">U.S. Senate · Class II</div><div className="ss-n">Keep</div></div>
                    <div className="ss-pct tone-good">82%</div>
                  </div>
                </div>
              </div>
              {/* blind assessment card in front */}
              <div className="vh-rcard">
                <div className="vh-rstrip"><span className="o">U.S. House · TX-21</span><span className="up">Up Nov 2026</span></div>
                <div className="vh-rhead">
                  <div className="vh-rav">?</div>
                  <div className="vh-rwho"><div className="b">This seat's incumbent</div><div className="s">Judge the record, not the name</div></div>
                </div>
                <div className="vh-ralign">
                  <div className="vh-ratop"><span className="lab">Voted with you</span><span className="pct">58%</span></div>
                  <div className="vh-rbars">
                    <div className="vh-rbar"><span className="k">Healthcare access</span><span className="t"><i className="bar-good" style={{ width: "75%" }}></i></span></div>
                    <div className="vh-rbar"><span className="k">Housing affordability</span><span className="t"><i className="bar-bad" style={{ width: "40%" }}></i></span></div>
                  </div>
                </div>
                <div className="vh-rverd">
                  <span className="vh-vb keep">✓ Keep</span>
                  <span className="vh-vb replace">Replace</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- headline voices — the hero copy is high-stakes, so pick one ---- */
function HeadlineVoices() {
  return (
    <div className="screen" data-palette="white">
      <div className="hv">
        <div className="hv-lead">
          <h2>Headline voices — pick the hook</h2>
          <p>Same hero, three framings of what the site does. The recommended one is the activation copy already wired into the hero.</p>
        </div>
        <div className="hv-grid">
          <div className="hv-card pick">
            <div className="hv-tag"><span className="star">★</span> Recommended · Question + CTA</div>
            <h1 className="hv-h">How well are your elected officials really representing you? <em>Get the scorecard.</em></h1>
            <p className="hv-sub">Opens with the question every voter is already asking, then names the payoff. Direct, benefit-led, and nonpartisan.</p>
            <div className="hv-note"><b>Why it wins:</b> leads with the voter's own question and ends on a concrete CTA — the scorecard.</div>
          </div>
          <div className="hv-card">
            <div className="hv-tag">Activation</div>
            <h1 className="hv-h">Three people vote in your name. <em>Today you check their work.</em></h1>
            <p className="hv-sub">Names the stakes in plain language and makes it personal — “your name,” “their work.” The lede carries the mechanism.</p>
            <div className="hv-note"><b>Trade-off:</b> evocative, but says less about <i>what</i> you actually get.</div>
          </div>
          <div className="hv-card">
            <div className="hv-tag">Provocation</div>
            <h1 className="hv-h">Don't re-elect a <span className="red">stranger.</span></h1>
            <p className="hv-sub">Highest-energy, most memorable. Sharper edge — reframes the default (re-election) as the risk. Best if we want the boldest 250th-moment voice.</p>
            <div className="hv-note"><b>Trade-off:</b> more opinionated; test that it still reads nonpartisan.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeHero, HeadlineVoices });
```

=== FILE: screens-whynow.jsx (part 1 of 1) ===
```jsx
/* ====================================================
   "WHY NOW?" PAGE — card 9031f1ce
   Long-form editorial making the larger case, on the Bold Flag
   white ground. Copy adapted (not verbatim) from the founder's
   framing: the problem is money's grip on attention; the moment is
   2026; the answer is judging the record, not the messaging.
   Houses the two fact snippets pulled from the homepage hero.
   ==================================================== */

function WhyNow() {
  return (
    <div className="screen" data-palette="white">
      <div className="wn">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="wn-main">

          {/* masthead */}
          <div className="wn-mast">
            <span className="ey kick"><span className="star">★</span> The case · America's 250th election</span>
            <h1>Why <em>now</em></h1>
            <p className="dek">We hire Congress to do the work of governing so we can get back to our lives. This year, we get to decide who actually earned the job.</p>
          </div>

          {/* 1 · the problem */}
          <div className="wn-sec">
            <div className="wn-kicker">Here's why</div>
            <h2 className="wn-h2">Your representative spends more time raising money than reading bills.</h2>
            <div className="wn-cols">
              <div className="wn-body">
                <p><span className="lead-in">The job has quietly changed.</span> Members of Congress can spend up to <b>six hours of every working day</b> dialing for dollars — and how much they raise predicts whether they keep their seat better than anything they actually did with it.</p>
                <p>Guess whose calls get returned. The people with the most money to give — donors, PACs, and the handful of industries that can write the biggest checks — buy the one thing every campaign runs on: <b>your attention</b>, repeated until it sticks.</p>
                <p>When fundraising decides elections, representatives answer to their funders, not their constituents. That's the leak. The good news: it's plugged at one place money can't follow — <b>the ballot</b>.</p>
              </div>
              <div className="wn-stats">
                <div className="wn-stat">
                  <div className="v">6<small>hrs / day</small></div>
                  <div className="l">Average time a member of Congress spends fundraising, per call-time guidance shown to incoming freshmen.</div>
                  <div className="cite">Source · Issue One, 2024 · CBS 60 Minutes</div>
                </div>
                <div className="wn-stat red">
                  <div className="v">94<small>%</small></div>
                  <div className="l">of House incumbents who ran for re-election in 2024 won. Without a record check, every November is a coin flip.</div>
                  <div className="cite">Source · OpenSecrets · FEC filings</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2 · why now — the moment, on the brand ground */}
          <div className="wn-sec brand">
            <div className="wn-kicker">Why now</div>
            <h2 className="wn-h2">In November, every House seat and a third of the Senate is on the ballot. <em>We decide who keeps the job.</em></h2>
            <div className="wn-body">
              <p>2026 isn't a quiet midterm. It's the widest opening voters get — the moment the people who've been representing you have to come back and ask for the job again. Wouldn't you want to know who's actually been working on your behalf before you sign off?</p>
            </div>
            <div className="wn-ballot">
              <div className="cell"><div className="v">435</div><div className="l">U.S. House seats up — every single one.</div></div>
              <div className="cell"><div className="v gold">34</div><div className="l">U.S. Senate seats up — a third of the chamber.</div></div>
              <div className="cell"><div className="v">1</div><div className="l">scorecard you bring to the polls, built from your own verdicts.</div></div>
            </div>
          </div>

          {/* 3 · the friction insight — a pull quote */}
          <div className="wn-sec alt">
            <div className="wn-kicker">Why it's hard</div>
            <p className="wn-pull">A ballot asks more than anyone has time for. <em>What do most of us really know about property taxes in our county, or a procedural vote from two years ago?</em> So we fall back on shortcuts — party, yard signs, whatever ad ran the most. Shortcuts are exactly what the money buys.
              <span className="src">The friction is the whole game — so we cut it.</span>
            </p>
          </div>

          {/* 4 · how it works */}
          <div className="wn-sec">
            <div className="wn-kicker">Here's how it works</div>
            <h2 className="wn-h2">Judge them on what they <em>did</em> — not what they said.</h2>
            <div className="wn-steps">
              <div className="wn-step">
                <div className="n">1</div>
                <h3>Pull the record</h3>
                <p>For each of your members of Congress: how they voted, what they opposed, and who funded the campaign — straight from the public record.</p>
                <span className="tag">GovTrack · Congress.gov · FEC</span>
              </div>
              <div className="wn-step">
                <div className="n">2</div>
                <h3>Tell us what you value</h3>
                <p>A short conversation turns what's on your mind into the handful of issues you actually want them measured against.</p>
                <span className="tag">Your issues · your ranking</span>
              </div>
              <div className="wn-step">
                <div className="n">3</div>
                <h3>Get your verdict</h3>
                <p>We summarize each record against your values — shown blind, so the record speaks first — then turn your keep/replace calls into a printable scorecard for the polls.</p>
                <span className="tag">Blind-first · printable</span>
              </div>
            </div>
          </div>

          {/* closing CTA */}
          <div className="wn-cta">
            <h2>Politicians want one thing: to get re-elected.</h2>
            <p>Make that depend on the work — not the war chest. The leverage is yours, and it's on the ballot.</p>
            <button className="btn-primary">Pull my representatives <span aria-hidden="true">→</span></button>
            <div className="sub">No account · no tracking · your address never leaves your device</div>
          </div>

        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WhyNow });
```

=== FILE: screens-statics.jsx (part 1 of 1) ===
```jsx
/* ====================================================
   STATIC / TOP-LEVEL PAGES — editorial template rollout
   About · How it works · Privacy · Tip jar + Loading + footer.
   Copy lifted from the live delta (redesign2-shared.jsx /
   prototype-screens-c.jsx); re-skinned onto the Why-Now editorial
   system so the whole site reads as one publication.
   ==================================================== */

/* reorganized footer (b1a5f64a: Privacy after About · c9891a1f: trim to
   brand + © Grey Bird LLC; Support + Tip jar kept, de-emphasized) */
function VCFooter() {
  return (
    <footer className="vc-foot">
      <div className="vc-foot-brand">
        <span className="b"><span className="mark">V</span> Voter Choice</span>
        <span className="c">Free · nonpartisan · © 2026 Grey Bird LLC. All Rights Reserved.</span>
      </div>
      <nav className="vc-foot-links">
        <a>Privacy</a>
        <a>Terms</a>
      </nav>
    </footer>
  );
}

/* the shared editorial shell every static page now uses */
function StaticPageVC({ eyebrow, title, dek, children }) {
  return (
    <div className="screen" data-palette="white">
      <div className="sp">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="sp-body">
          <div className="sp-wrap">
            <div className="sp-back">← Back</div>
            <div className="sp-mast">
              <div className="sp-kicker">{eyebrow}</div>
              <h1>{title}</h1>
              {dek && <p className="dek">{dek}</p>}
            </div>
            <div className="sp-prose">{children}</div>
          </div>
        </div>
        <VCFooter />
      </div>
    </div>
  );
}

function AboutVC() {
  return (
    <StaticPageVC eyebrow="About Voter Choice" title="A free, non-partisan ballot research tool." dek="Built and operated by Grey Bird LLC — a small independent shop closing the gap between what a candidate says and what they actually did.">
      <p>We made Voter Choice because the distance between “what a candidate says in their ads” and “what they actually voted on” has widened every cycle. Voters deserve a tool that closes it.</p>
      <h2>What we do</h2>
      <p>For every race on your ballot we pull the <b>actual voting record</b> of incumbents (Congress.gov, state legislatures), the <b>funding picture</b> (FEC, OpenSecrets, state ethics commissions), and the <b>editorially-curated context</b> behind each vote. We score how each candidate aligns with the issues <i>you</i> told us matter — vote by vote.</p>
      <h2>What we don't do</h2>
      <ul>
        <li><b>No accounts.</b> No sign-up, no email, no password.</li>
        <li><b>No third-party analytics.</b> No ad pixels, no telemetry, no cross-site tracking.</li>
        <li><b>No endorsement.</b> We don't tell you who to vote for — we show you what they've done. The choice is yours.</li>
        <li><b>No data hoarding.</b> Your address, draft picks, and chat live in your browser. Close the tab without saving and it's gone.</li>
      </ul>
      <p>The one thing we deliberately keep: your <b>chosen issues</b> and your <b>state</b> — never your street address — retained de-identified and in aggregate to power <b>Polis</b>, our shared opinion map. Everything else stays on your device.</p>
      <h2>Who pays for this?</h2>
      <p>Server costs, the Anthropic API budget, and the editorial work behind our case files are funded by <b>Grey Bird LLC</b> and a small set of individual donors who explicitly do not buy a say in editorial.</p>
      <h2>Get in touch</h2>
      <p>Reach Grey Bird LLC at <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>. We answer.</p>
    </StaticPageVC>
  );
}

function HowItWorksVC() {
  return (
    <StaticPageVC eyebrow="How it works" title="How we score candidates." dek="Every number on a card traces to your own words and to an official source — never to a guess.">
      <div className="sp-step"><div className="n">1</div><div><h3>Issues come from you</h3><p>When you describe your concerns, we extract canonical issues and a directional stance (“favors lower drug prices”). You confirm, rename, or remove before any scoring happens. We don't pre-bake a list and check boxes against it.</p></div></div>
      <div className="sp-step"><div className="n">2</div><div><h3>Votes come from official roll-call data</h3><p>Federal from <a href="https://www.congress.gov/roll-call-votes" target="_blank" rel="noopener noreferrer">Congress.gov</a>, state from each legislature. For each issue our editors select 2–5 “case file” votes — the bills that most directly test it. No curated case file? The score reads <i>“thin record”</i> instead of guessing.</p></div></div>
      <div className="sp-step"><div className="n">3</div><div><h3>Donor data comes from FEC + state filings</h3><p>Federal from the <a href="https://www.fec.gov" target="_blank" rel="noopener noreferrer">FEC</a> and <a href="https://www.opensecrets.org" target="_blank" rel="noopener noreferrer">OpenSecrets</a>; state from ethics commissions. Named issue PACs are broken out only when they have a public, citable agenda.</p></div></div>
      <div className="sp-step"><div className="n">4</div><div><h3>“With you / against you” is your stance vs. the vote</h3><p>If you favor lower drug prices, a vote FOR Medicare price negotiation reads “WITH YOU”; a vote AGAINST reads “AGAINST YOU.” When the record is mixed, we show the raw vote — never a softened summary.</p></div></div>
      <h2>The AI's role</h2>
      <p>The AI's job is to <b>route and summarize</b>, not to invent. It pulls from our structured database of votes, donors, and narratives. It does not generate vote claims — if a vote isn't in our database, we don't show it.</p>
      <h2>Mistakes</h2>
      <p>We'll make them. When we do, we publish a correction and update the case file. Every claim links to a primary source so you can verify it yourself. Found one? Email <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>.</p>
    </StaticPageVC>
  );
}

function PrivacyVC() {
  return (
    <StaticPageVC eyebrow="Privacy policy" title="What stays here, what doesn't." dek="No analytics, no telemetry, no accounts. Most of what you do never leaves your browser.">
      <p className="sp-meta">Effective April 12, 2026 · Grey Bird LLC</p>
      <h2>Minimal data collection</h2>
      <p>We use no third-party analytics, ad pixels, accounts, or sign-ups. Across visits, your browser's localStorage keeps only your <b>language</b>, your <b>issues</b>, a <b>county-level location</b> (never your street address), and optionally a <b>bring-your-own Anthropic key</b>. Your <b>precise address</b> and <b>in-progress assessment</b> are kept only for the current tab and cleared when you close it.</p>
      <h2>Polis — the shared opinion map</h2>
      <p>When you add your views to <b>Polis</b> (our map of where voters stand), your <b>chosen issues</b> and <b>state-level location</b> are retained on our servers — <b>de-identified and shown only in aggregate</b>, never tied to your street address, name, or chat. It's the one place your data persists beyond your browser, and it exists only so the map can show how your priorities compare to your neighbors'.</p>
      <h2>Your address</h2>
      <p>If you enter a street address it may be used for autocomplete in your browser and is sent to the <b>Google Civic Information API</b> through our server for polling-place lookup. We do not intentionally log or store it on our servers, and we never include it in the AI prompt.</p>
      <h2>Chat conversations</h2>
      <p>Chat exists in browser memory while the page is open and is not intentionally stored or logged by our servers. Messages are sent to the <b>Anthropic API</b> for processing — don't type your name, exact address, phone, or email into chat. See <a href="https://www.anthropic.com/policies/privacy" target="_blank" rel="noopener noreferrer">Anthropic's privacy policy</a>.</p>
      <h2>What we cannot provide</h2>
      <p>We do not create or store a combined record of who you are, where you live, and what you said. If anyone asked us for “who said what and where they live,” we wouldn't have it to give. This doesn't bind infrastructure providers under their own policies.</p>
      <h2>Contact</h2>
      <p>Questions about this policy? <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>.</p>
    </StaticPageVC>
  );
}

function TipJarVC() {
  const amts = [
    { label: "$3", lead: false }, { label: "$5", lead: true }, { label: "$10", lead: false }, { label: "$25", lead: false },
  ];
  return (
    <StaticPageVC eyebrow="Tip jar" title="Keep the community AI budget alive." dek="No ads, no tracking, no data sales. Tips and small individual contributions are the only revenue.">
      <div className="sp-tips">
        {amts.map((a) => <a key={a.label} className={"sp-tip" + (a.lead ? " lead" : "")}>{a.label}</a>)}
      </div>
      <p className="sp-tipnote">One-time card payment · no account needed · Voter Choice never sees your card</p>
      <h2>Where it goes</h2>
      <ul>
        <li><b>Anthropic API spend</b> — the AI chat budget that runs out when too many voters use it at once.</li>
        <li><b>Server + hosting</b> — Vercel plus a small Redis instance for rate-limiting.</li>
      </ul>
      <p>Voter Choice is built by <b>Grey Bird LLC</b>. When the community budget runs out you can bring your own Anthropic key rather than pay us — we'd rather pause than monetize you.</p>
    </StaticPageVC>
  );
}

function LoadingVC() {
  const steps = [
    { t: "Geocoding address", s: "done" },
    { t: "Looking up your precinct", s: "done" },
    { t: "Pulling federal & state races", s: "active" },
    { t: "Loading donor history", s: "" },
  ];
  return (
    <div className="screen" data-palette="white">
      <div className="ldg">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="ldg-body">
          <div className="ldg-card">
            <div className="ldg-pulse"><i></i></div>
            <h2>Pulling your representatives.</h2>
            <div className="ldg-addr">1100 Congress Ave, Austin, TX 78701</div>
            <div className="ldg-steps">
              {steps.map((st, i) => (
                <div key={i} className={"ldg-step " + st.s}><span className="ck">{st.s === "done" ? "✓" : ""}</span><span>{st.t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VCFooter, StaticPageVC, AboutVC, HowItWorksVC, PrivacyVC, TipJarVC, LoadingVC });
```

=== FILE: screens-intake.jsx (part 1 of 1) ===
```jsx
/* ====================================================
   "DEFINING YOUR ISSUES" — end-to-end flow, new design
   Intake cold-open → AI proposes + BOUNDED disambiguation (one tap,
   not a back-and-forth) → locked with jurisdiction → then the seeded
   edit-issues modal and the re-score delta. Bold Flag white ground.
   ==================================================== */

/* shared bits */
function IqMsg({ who, children }) {
  return (
    <div className={"iq-msg " + who}>
      <div className="iq-who">{who === "user" ? "You" : "Voter Choice · AI"}</div>
      <div className="iq-bubble">{children}</div>
    </div>
  );
}

function IqRow({ rank, name, you, juris, added }) {
  return (
    <div className={"iq-row" + (added ? " added" : "")}>
      <span className="iq-grip">⋮⋮</span>
      <span className="iq-rank">{rank}</span>
      <span className="iq-name">{name}{added && <span className="iq-newtag" style={{ marginLeft: 8 }}>New</span>}{you && <span className="you">“{you}”</span>}</span>
      <span className="iq-acts"><button className="iq-act">✎</button><button className="iq-act">✕</button></span>
    </div>
  );
}

function IqComposer({ chips, placeholder, primary, lock }) {
  return (
    <div className="iq-foot">
      <div className="iq-foot-inner">
        {chips && chips.length > 0 && (
          <div className="iq-chips">{chips.map((c) => <button key={c} className="iq-chip">{c}</button>)}</div>
        )}
        {lock
          ? <button className="iq-send iq-lock btn-primary">{primary}</button>
          : (
            <div className="iq-composer">
              <textarea placeholder={placeholder}></textarea>
              <button className="iq-send">Send →</button>
            </div>
          )}
        <div className="iq-privacy"><span className="dot">●</span> Nothing leaves your browser until you lock these in</div>
      </div>
    </div>
  );
}

function IqShell({ step, children, foot }) {
  return (
    <div className="screen" data-palette="white">
      <div className="iq">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="iq-ctx"><span className="b">1100 Congress Ave, Austin, TX 78701 · your 3 members of Congress</span><span className="step">{step}</span></div>
        <div className="iq-stage"><div className="iq-conv">{children}</div></div>
        {foot}
      </div>
    </div>
  );
}

/* 1 · COLD OPEN — the ask */
function IntakeAsk() {
  return (
    <IqShell step="Step 1 of 3 · your issues" foot={<IqComposer placeholder="Things that have been on your mind — frustrations, hopes, fights you've watched in your community…" />}>
      <div className="iq-ask">
        <span className="ask-k kick"><span className="star">★</span> Before you meet your delegation</span>
        <h1>What should your representatives be <em>working on?</em></h1>
        <p>I've pulled your three members of Congress. Before I show you their records, tell me what you're judging them on — in your own words. As much or as little as you like.</p>
        <IqMsg who="ai">What's been on your mind this year that you wish Washington would actually do something about?</IqMsg>
      </div>
    </IqShell>
  );
}

/* 2 · PROPOSE + conversational disambiguation (quick replies, not a quiz) */
function IntakePropose() {
  return (
    <IqShell step="Step 1 of 3 · refine" foot={<IqComposer chips={["That's not quite right — let me explain", "Add something I forgot"]} placeholder="Tell me in your own words — what's biting hardest?" />}>
      <IqMsg who="user">Drug prices are insane, my rent keeps climbing, and honestly the economy in general.</IqMsg>
      <IqMsg who="ai">Got it — two clear ones are below. When you say <b>“the economy in general,”</b> what's biting hardest — the cost of everyday life, jobs and pay, taxes? <b>Tell me in your own words below</b>, or tap a quick reply if one fits.</IqMsg>

      <div className="iq-card">
        <div className="iq-card-head"><h4>Your issues so far</h4><span className="of">2 clear · 1 to pin down</span></div>
        <div className="iq-rows">
          <IqRow rank="1" name="Healthcare &amp; drug costs" you="drug prices are insane" juris="FEDERAL" />
          <IqRow rank="2" name="Housing &amp; rent affordability" you="my rent keeps climbing" juris="STATE" />
        </div>
      </div>

      <div className="iq-quick">
        <div className="iq-quick-lab">Quick replies</div>
        <div className="iq-opts">
          <button className="iq-opt">Cost of living &amp; inflation</button>
          <button className="iq-opt">Jobs &amp; wages</button>
          <button className="iq-opt">Taxes</button>
          <button className="iq-opt multi">All of it</button>
        </div>
      </div>
    </IqShell>
  );
}

/* 3 · LOCKED — jurisdiction summary + lock CTA */
function IntakeLocked() {
  return (
    <IqShell step="Step 1 of 3 · ready" foot={<IqComposer lock primary="Lock these in & meet your delegation →" />}>
      <IqMsg who="user">Cost of living &amp; inflation — that's the one.</IqMsg>
      <IqMsg who="ai">Perfect. Here's your final list. Re-rank or rename anything; otherwise you're ready to meet your delegation.</IqMsg>

      <div className="iq-card">
        <div className="iq-card-head"><h4>Your issues — make them yours.</h4><span className="of">3 issues · edit freely</span></div>
        <div className="iq-card-sub">Drag to re-rank · click a name to rename · remove anything that's not yours.</div>
        <div className="iq-rows">
          <IqRow rank="1" name="Healthcare &amp; drug costs" juris="FEDERAL" />
          <IqRow rank="2" name="Cost of living &amp; inflation" juris="FEDERAL" />
          <IqRow rank="3" name="Housing &amp; rent affordability" juris="STATE" />
        </div>
      </div>

      <div className="iq-locked">
        <span className="tick">✓</span>
        <div>
          <div className="lt">Your issues are set.</div>
          <div className="ls">These travel with every record we show you.</div>
        </div>
      </div>
    </IqShell>
  );
}

/* 4 · EDIT ISSUES from the workspace — seeded modal (with disambiguation) */
function EditIssues() {
  return (
    <div className="screen" data-palette="white">
      <div className="iq" style={{ position: "relative" }}>
        {/* dimmed workspace behind */}
        <div className="amd-back">
          <div className="flagbar"><i></i><i></i><i></i></div>
          <SCNav />
          <div className="res-context"><span className="rc-back">← Seats</span><span className="rc-issues"><span className="rc-lab">Your issues</span><span className="chip-issue">Healthcare &amp; drug costs</span><span className="chip-issue">Cost of living</span><span className="chip-issue edit">Edit</span></span></div>
          <div style={{ padding: "40px" }}><div className="rcard" style={{ maxWidth: 560, margin: "0 auto" }}><div className="rcard-head"><div className="rcard-avatar">?</div><div className="rcard-who"><div className="blind">This seat's incumbent</div></div></div></div></div>
        </div>

        <div className="amd-overlay">
          <div className="amd-modal">
            <div className="flagbar"><i></i><i></i><i></i></div>
            <div className="amd-head">
              <div>
                <div className="amd-eyebrow">Amend your issues</div>
                <h3>Re-rank, rename, add — or tell me what's changed.</h3>
              </div>
              <button className="amd-x">×</button>
            </div>
            <div className="amd-body">
              <p className="amd-lede">Your verdicts are kept. When you apply, I re-score every member against the new list and flag any whose alignment shifts past the noise floor.</p>

              <IqMsg who="user">Add immigration — it matters to me now.</IqMsg>

              <div className="iq-card">
                <div className="iq-card-head"><h4>Your issues</h4><span className="of">4 issues</span></div>
                <div className="iq-rows">
                  <IqRow rank="1" name="Healthcare &amp; drug costs" juris="FEDERAL" />
                  <IqRow rank="2" name="Cost of living &amp; inflation" juris="FEDERAL" />
                  <IqRow rank="3" name="Housing &amp; rent affordability" juris="STATE" />
                  <IqRow rank="4" name="Immigration &amp; border" juris="FEDERAL" added />
                </div>
              </div>

              <IqMsg who="ai">Added. <b>“Immigration”</b> covers a lot of ground — say a little about what you care about most, and I'll measure them on that. A quick reply works too.</IqMsg>
              <div className="iq-quick">
                <div className="iq-quick-lab">Quick replies</div>
                <div className="iq-opts">
                  <button className="iq-opt">Border security &amp; enforcement</button>
                  <button className="iq-opt">Legal immigration &amp; visas</button>
                  <button className="iq-opt">Asylum &amp; the courts</button>
                  <button className="iq-opt multi">Their overall record</button>
                </div>
              </div>
              <div className="amd-composer">
                <textarea placeholder="In your own words — what about immigration matters to you?"></textarea>
                <button className="iq-send">Send →</button>
              </div>
            </div>
            <div className="amd-foot">
              <button className="amd-cancel">Cancel — keep my current issues</button>
              <button className="amd-apply">Apply &amp; re-score →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 5 · RE-SCORE DELTA — what changed, with REVISIT flags */
function EditRescored() {
  return (
    <IqShell step="Re-scored · verdicts kept" foot={<IqComposer lock primary="Back to your delegation →" />}>
      <IqMsg who="user">Apply &amp; re-score.</IqMsg>
      <div className="iq-delta">
        <div className="iq-delta-head"><span className="k">Re-scored against 4 issues</span><h3>Two seats are worth another look.</h3></div>
        <div className="ad-list">
          <div className="ad-row significant">
            <div className="ad-race"><div className="ad-tag">Revisit</div><div className="ad-name">U.S. House · TX-21</div></div>
            <div className="ad-score"><span className="ad-old">58%</span><span className="ad-arrow down">↓</span><span className="ad-new down">41%</span></div>
            <button className="ad-revisit">Revisit →</button>
          </div>
          <div className="ad-row significant">
            <div className="ad-race"><div className="ad-tag">Revisit</div><div className="ad-name">U.S. Senate · Class II</div></div>
            <div className="ad-score"><span className="ad-old">82%</span><span className="ad-arrow up">↑</span><span className="ad-new up">86%</span></div>
            <button className="ad-revisit">Revisit →</button>
          </div>
        </div>
        <div className="ad-foot">Only members whose alignment moved more than 5 points (or gained / lost a scoreable record) get a <b>Revisit</b> flag. Your keep / replace verdicts are unchanged either way.</div>
      </div>
    </IqShell>
  );
}

Object.assign(window, { IntakeAsk, IntakePropose, IntakeLocked, EditIssues, EditRescored });
```

=== FILE: screens-polis.jsx (part 1 of 1) ===
```jsx
/* ====================================================
   POLIS — "Where we agree" (card bc774728)
   Two surfaces, no new nav tab:
     PolisStand   → post-decision CONTRIBUTE moment (earned, optional)
     PolisReport  → the "Where America agrees" DISPLAY/report that lives
                    at the foot of the Why-Now page and is shareable.
   The depolarizing read: party lines (D · R · I) CONVERGE on each
   statement. Figures are illustrative. ==================================== */

/* a convergence bar: D/R/I dots clustered on a shared 0–100 track */
function ConvBar({ d, r, i }) {
  const lo = Math.min(d, r, i);
  return (
    <div className="conv">
      <div className="conv-track"></div>
      <div className="conv-fill" style={{ width: lo + "%" }}></div>
      <span className="conv-dot d" style={{ left: d + "%" }}></span>
      <span className="conv-dot r" style={{ left: r + "%" }}></span>
      <span className="conv-dot i" style={{ left: i + "%" }}></span>
    </div>
  );
}

/* ---------- the pol.is-style OPINION MAP (borrowed directly) ----------
   Pol.is runs PCA on everyone's agree/disagree votes → a 2-D map where
   voters who answered alike sit together, forming opinion groups. We
   render that landscape (groups as soft fields + dots), drop a "You"
   marker, and let the consensus statements below read as the bridges
   across the groups. Dots are deterministically generated. */
function pmDots(cx, cy, n, spread, seed) {
  let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const out = [];
  for (let k = 0; k < n; k++) {
    const ang = rnd() * 6.283, r = Math.sqrt(rnd()) * spread;
    out.push({ x: Math.max(4, Math.min(96, cx + Math.cos(ang) * r)), y: Math.max(6, Math.min(94, cy + Math.sin(ang) * r * 0.82)) });
  }
  return out;
}
const PM_GROUPS = [
  { id: "a", label: "Group A", note: "lower taxes, secure border", pct: 38, cx: 30, cy: 42, n: 26, spread: 17, cls: "r" },
  { id: "b", label: "Group B", note: "lower drug costs, climate", pct: 37, cx: 70, cy: 38, n: 25, spread: 17, cls: "d" },
  { id: "c", label: "Group C", note: "anti-corruption first", pct: 25, cx: 50, cy: 72, n: 17, spread: 15, cls: "i" },
];
function PolisMap({ compact }) {
  return (
    <div className={"pm-wrap" + (compact ? " compact" : "")}>
      <div className="pm">
        {PM_GROUPS.map((g) => <div key={g.id} className={"pm-blob " + g.cls} style={{ left: g.cx + "%", top: g.cy + "%", width: g.spread * 2.4 + "%", height: g.spread * 2.0 + "%" }}></div>)}
        {PM_GROUPS.map((g) => pmDots(g.cx, g.cy, g.n, g.spread, g.cx * 1000 + g.cy).map((p, i) => (
          <span key={g.id + i} className={"pm-dot " + g.cls} style={{ left: p.x + "%", top: p.y + "%" }}></span>
        )))}
        {PM_GROUPS.map((g) => <span key={"l" + g.id} className="pm-glab" style={{ left: g.cx + "%", top: (g.cy - g.spread - 4) + "%" }}>{g.label} · {g.pct}%</span>)}
        <span className="pm-you" style={{ left: "44%", top: "55%" }}></span>
        <span className="pm-you-lab" style={{ left: "44%", top: "55%" }}>You</span>
      </div>
      {!compact && (
        <div className="pm-cap">
          <div className="pm-key">
            <span><i className="r"></i>Group A · 38%</span>
            <span><i className="d"></i>Group B · 37%</span>
            <span><i className="i"></i>Group C · 25%</span>
            <span className="you"><i></i>You</span>
          </div>
          <p>Each dot is a voter; people who answered alike sit together. We land in different camps — and yet the statements below cleared <b>all three</b>.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- CONTRIBUTE · optional, AFTER the scorecard ---------- */
function PolisStand() {
  return (
    <div className="screen" data-palette="white">
      <div className="ps">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="ps-body">
          <div className="ps-inner">
            <span className="ps-k kick"><span className="star">★</span> Your scorecard's ready · this part's optional</span>
            <h1 className="ps-h1">You judged them on the record — <em>not the party.</em></h1>
            <p className="ps-lede">Your scorecard is done and ready to print — this won't touch it. React to a few statements if you like. You answer blind — no running score — and at the end you'll see the full picture: where the groups line up, and where they don't.</p>

            <div className="ps-cards">
              <div className="ps-stmt">
                <p className="q">Members of Congress shouldn't trade individual stocks while in office.</p>
                <div className="ps-react">
                  <button className="ps-btn agree">Agree</button>
                  <button className="ps-btn disagree">Disagree</button>
                  <button className="ps-btn pass">Pass</button>
                </div>
              </div>

              <div className="ps-stmt voted">
                <p className="q">Campaigns depend too much on a handful of big donors.</p>
                <div className="ps-react">
                  <button className="ps-btn agree chosen">✓ You agreed</button>
                  <button className="ps-btn disagree">Disagree</button>
                  <button className="ps-btn pass">Change</button>
                </div>
                <div className="ps-recorded"><span className="rk">✓ Recorded</span> Thanks — that's in. No score, no reveal yet; you'll see the full picture at the end.</div>
              </div>

              <div className="ps-stmt voted">
                <p className="q">I'd rather judge my representative on their record than their party.</p>
                <div className="ps-react">
                  <button className="ps-btn agree">Agree</button>
                  <button className="ps-btn disagree chosen-no">✕ You disagreed</button>
                  <button className="ps-btn pass">Change</button>
                </div>
                <div className="ps-recorded"><span className="rk">✓ Recorded</span> Disagreeing is just as useful — it's in, and we never single you out for it.</div>
              </div>
            </div>
          </div>
        </div>
        <div className="ps-foot">
          <div className="ps-foot-inner">
            <button className="btn-primary">Done — show me the results →</button>
            <span className="prog">2 of 3 answered · anonymous · no running score</span>
            <button className="later">No thanks — back to my scorecard</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- DISPLAY · the honest "where you stand" report ----------
   Neutral by default: leads with the shape of opinion, not a feel-good
   claim. Shows common ground only where it genuinely cleared every group,
   and is honest when it didn't. `divided` renders the low-consensus state. */
function PolisReport({ divided = false }) {
  const rows = divided
    ? [
        { q: "Members of Congress shouldn't trade individual stocks.", src: "9,210 voters · this question", pct: 80, d: 83, r: 77, i: 81 },
      ]
    : [
        { q: "Members of Congress shouldn't trade individual stocks.", src: "12,480 voters · 2026 cycle", pct: 86, d: 88, r: 84, i: 87 },
        { q: "Campaigns depend too much on a handful of big donors.", src: "12,480 voters · 2026 cycle", pct: 79, d: 83, r: 74, i: 80 },
        { q: "I'd rather know my rep's record than their party.", src: "12,480 voters · 2026 cycle", pct: 71, d: 70, r: 69, i: 78 },
        { q: "My representative should hold in-person town halls.", src: "12,480 voters · 2026 cycle", pct: 82, d: 84, r: 79, i: 83 },
      ];
  return (
    <div className="screen" data-palette="white">
      <div className="pr">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="pr-wrap">
          <div className="pr-mast">
            <div className="pr-kicker">Where you stand · a Voter Choice finding</div>
            <h1>Here's where we actually <em>stand.</em></h1>
            <p className="pr-lede">No spin and no feel-good headline — just the shape of it. We map every answer honestly: some statements bridged every group, some genuinely split the room, and we show both. Depolarizing isn't pretending we agree — it's seeing each other clearly.</p>
          </div>

          <div className="pr-mapsec">
            <div className="pr-maphead"><span className="k">The landscape</span><h2>We don't all answer alike.</h2></div>
            <PolisMap />
          </div>

          <div className="pr-bridgehead">
            <span className="k">Common ground</span>
            <h2>{divided ? "This cycle, almost nothing bridged every group." : "A few statements cleared every group."}</h2>
            <p className="pr-threshold">A statement appears here only if <b>60%+ of every group</b> — D, R, and I — agreed. {divided ? "Just 1 of 9 cleared that bar this time." : "4 of 9 cleared it; the other 5 split, and we don't dress those up as agreement."}</p>
          </div>

          <div className="pr-list">
            {rows.map((row, k) => (
              <div className="pr-row" key={k}>
                <div className="pr-q">“{row.q}”<span className="src">{row.src}</span></div>
                <div className="pr-stat">
                  <div className="pr-pct">{row.pct}%<span className="ag">agree</span></div>
                  <div className="pr-conv"><ConvBar d={row.d} r={row.r} i={row.i} /></div>
                  <div className="pr-split">
                    <span className="chip d"><i></i>D {row.d}</span>
                    <span className="chip r"><i></i>R {row.r}</span>
                    <span className="chip i"><i></i>I {row.i}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pr-fault">
            <span className="k">Where it split</span>
            <h3>{divided ? "Mostly, the room divided — and that's real." : "And plenty didn't bridge."}</h3>
            <p>{divided
              ? "Eight of nine statements landed the groups far apart. We don't smooth that over or single anyone out — the map above is the honest picture. Here's one split, shown straight:"
              : "Five statements split along group lines. We don't recast those as consensus, and we never surface who voted which way — the map above already shows the shape. Honesty over a number that flatters us."}</p>
            {divided && (
              <div className="pr-row split">
                <div className="pr-q">“Federal spending should be cut across the board.”<span className="src">9,210 voters · this question</span></div>
                <div className="pr-stat">
                  <div className="pr-pct split">51<span className="ag">pt spread</span></div>
                  <div className="pr-conv"><ConvBar d={79} r={28} i={52} /></div>
                  <div className="pr-split">
                    <span className="chip d"><i></i>D 79</span>
                    <span className="chip r"><i></i>R 28</span>
                    <span className="chip i"><i></i>I 52</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pr-foot">
            <div className="meta"><b>Built from 12,480 voters</b> who finished their scorecard · refreshed monthly<br />Anonymous · no profile · you're a tally, never a name.</div>
            <button className="pr-share">Share this finding →</button>
          </div>
          <div className="pr-note">Figures illustrative for this design review. Convergence dots show where each group's agreement lands on a 0–100 scale.</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- ⓪ ENTRY POINT — the optional invite, shown once the scorecard's ready ---------- */
function PolisEntry() {
  return (
    <div className="screen" data-palette="white">
      <div className="ps">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="ps-body">
          <div className="ps-inner">
            <div className="pe-done">
              <span className="pe-check">✓</span>
              <div>
                <h1>Your scorecard's ready.</h1>
                <p>Both seats decided. Print it, bring it to the polls — you're set.</p>
              </div>
            </div>
            <div className="pe-actions">
              <button className="btn-primary">Print my scorecard →</button>
              <button className="pe-pdf">Save as PDF</button>
            </div>

            <div className="pe-invite">
              <div className="pe-map"><PolisMap compact /></div>
              <div className="pe-invite-body">
                <span className="k">Before you go · optional</span>
                <h3>See where you stand.</h3>
                <p>You just judged your delegation on the record, not the party. Thousands of others did too — see how your answers line up with everyone else's, where you bridge and where you don't. Anonymous, about a minute, and it never touches your scorecard.</p>
                <div className="pe-cta">
                  <button className="go">See where I stand <span aria-hidden="true">→</span></button>
                  <button className="no">No thanks — I'm done</button>
                  <span className="meta">~1 min · anonymous</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PolisStand, PolisReport, PolisEntry, PolisMap });
```

=== FILE: screens.css (part 1 of 1) ===
```css
/* ====================================================
   VOTER CHOICE · design-session screens
   Hi-fi static screens for the keystone design review.
   Built on the live app's real tokens (IBM Plex + Newsreader,
   warm-paper / civic / vote-red), extended with two candidate
   ACTIVATION palettes for the color comparison.
   ==================================================== */

/* ---- shared structural tokens ---- */
.screen {
  --sans: "IBM Plex Sans", system-ui, sans-serif;
  --serif: "Newsreader", Georgia, serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
  --rule: oklch(0.86 0.012 85);
  --rule-2: oklch(0.92 0.010 85);
  --shadow-card: 0 1px 0 oklch(0.86 0.012 85), 0 30px 60px -34px oklch(0.20 0.03 255 / 0.30);
  --shadow-soft: 0 1px 0 oklch(0.92 0.012 85), 0 12px 30px -22px oklch(0.20 0.03 255 / 0.18);

  font-family: var(--sans);
  background: var(--paper);
  color: var(--ink);
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}
.screen *, .screen *::before, .screen *::after { box-sizing: border-box; }

/* =========================================================
   PALETTE A — "Civic Activated" (warm paper retained)
   Keeps the editorial newsprint base the app already has, but
   swaps the subdued teal for a federal blue and lets red carry
   real weight. Restrained patriotism — credible, not loud.
   ========================================================= */
.screen[data-palette="warm"] {
  --paper:    oklch(0.966 0.011 86);
  --paper-2:  oklch(0.987 0.007 86);
  --ink:      oklch(0.23 0.035 258);
  --ink-2:    oklch(0.40 0.030 258);
  --ink-3:    oklch(0.56 0.022 258);
  --brand:    oklch(0.42 0.125 258);   /* federal blue — primary action */
  --brand-2:  oklch(0.34 0.115 258);
  --brand-soft: oklch(0.93 0.035 258);
  --keep:     oklch(0.46 0.095 162);   /* worth keeping */
  --keep-soft: oklch(0.92 0.035 162);
  --replace:  oklch(0.52 0.185 27);    /* time to replace */
  --replace-soft: oklch(0.93 0.045 27);
  --gold:     oklch(0.73 0.115 78);
  --tag-bg:   oklch(0.92 0.012 86);
}

/* =========================================================
   PALETTE B — "Bold Flag" (white ground)
   White background (prints clean — addresses the scorecard
   note), navy + flag red turned up. Reads as a ballot, more
   activating. Same structure, so the comparison is honest.
   ========================================================= */
.screen[data-palette="white"] {
  --paper:    oklch(1 0 0);
  --paper-2:  oklch(0.985 0.003 258);
  --ink:      oklch(0.20 0.035 260);
  --ink-2:    oklch(0.37 0.032 260);
  --ink-3:    oklch(0.54 0.026 260);
  --brand:    oklch(0.40 0.155 262);   /* bold navy-royal */
  --brand-2:  oklch(0.31 0.145 262);
  --brand-soft: oklch(0.94 0.040 262);
  --keep:     oklch(0.44 0.115 159);
  --keep-soft: oklch(0.93 0.045 159);
  --replace:  oklch(0.53 0.205 27);    /* flag red */
  --replace-soft: oklch(0.94 0.050 27);
  --gold:     oklch(0.72 0.125 76);
  --tag-bg:   oklch(0.95 0.006 260);
  --rule: oklch(0.88 0.006 260);
  --rule-2: oklch(0.93 0.005 260);
}

/* ---- default palette (warm) for un-tagged screens ---- */
.screen:not([data-palette]) {
  --paper: oklch(0.966 0.011 86); --paper-2: oklch(0.987 0.007 86);
  --ink: oklch(0.23 0.035 258); --ink-2: oklch(0.40 0.030 258); --ink-3: oklch(0.56 0.022 258);
  --brand: oklch(0.42 0.125 258); --brand-2: oklch(0.34 0.115 258); --brand-soft: oklch(0.93 0.035 258);
  --keep: oklch(0.46 0.095 162); --keep-soft: oklch(0.92 0.035 162);
  --replace: oklch(0.52 0.185 27); --replace-soft: oklch(0.93 0.045 27);
  --gold: oklch(0.73 0.115 78); --tag-bg: oklch(0.92 0.012 86);
}

/* ============ shared chrome ============ */
.sc-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 30px; border-bottom: 1px solid var(--rule-2); background: var(--paper);
}
.sc-brand { display: flex; align-items: center; gap: 10px; font-family: var(--serif); font-weight: 600; font-size: 19px; letter-spacing: -0.01em; color: var(--ink); white-space: nowrap; }
.sc-nav-links a, .sc-nav-links .tip, .sc-lang { white-space: nowrap; }
.sc-brand .mark {
  width: 24px; height: 24px; background: var(--brand); color: var(--paper-2);
  display: grid; place-items: center; border-radius: 5px; font-family: var(--serif); font-weight: 600; font-size: 14px;
  position: relative; overflow: hidden;
}
.sc-brand .mark::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: var(--replace); opacity: 0.9; }
.sc-nav-links { display: flex; align-items: center; gap: 26px; font-size: 13.5px; color: var(--ink-2); }
.sc-nav-links a { color: inherit; text-decoration: none; }
.sc-nav-links .tip { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; border: 1px solid var(--rule); padding: 6px 11px; border-radius: 999px; color: var(--brand); }
.sc-lang { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 11px; border: 1px solid var(--rule); border-radius: 999px; color: var(--ink-3); display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
.sc-lang .lang-caret { font-size: 9px; opacity: 0.8; }

.kick { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; color: var(--brand); white-space: nowrap; }
.kick .star { color: var(--replace); }

/* flag hairline used by some directions */
.flagbar { height: 4px; display: flex; }
.flagbar i { flex: 1; }
.flagbar i:nth-child(1) { background: var(--brand); }
.flagbar i:nth-child(2) { background: var(--paper); }
.flagbar i:nth-child(3) { background: var(--replace); }

/* ============ ORIENTATION A — Guided Tour ============ */
.ori { height: 100%; display: flex; flex-direction: column; }
.ori-body { flex: 1; display: grid; place-items: center; padding: 40px 32px; min-height: 0; }
.ori-card {
  width: 100%; max-width: 640px; background: var(--paper-2); border: 1px solid var(--rule);
  border-radius: 16px; box-shadow: var(--shadow-card); padding: 40px 44px 36px; position: relative; overflow: hidden;
}
.ori-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--brand) 0 38%, transparent 38% 62%, var(--replace) 62% 100%); }
.ori-ey { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; }
.ori-card h1 { font-family: var(--serif); font-weight: 600; font-size: 40px; line-height: 1.08; letter-spacing: -0.02em; margin: 0 0 14px; color: var(--ink); text-wrap: balance; }
.ori-card h1 em { font-style: italic; color: var(--brand); }
.ori-lede { font-family: var(--serif); font-size: 18.5px; line-height: 1.5; color: var(--ink-2); margin: 0 0 28px; max-width: 520px; }
.ori-steps { display: grid; gap: 2px; margin: 0 0 30px; border: 1px solid var(--rule-2); border-radius: 12px; overflow: hidden; }
.ori-step { display: grid; grid-template-columns: 34px 1fr; gap: 14px; padding: 15px 18px; background: var(--paper); align-items: start; }
.ori-step + .ori-step { border-top: 1px solid var(--rule-2); }
.ori-step .n { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--paper-2); background: var(--brand); width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; }
.ori-step:last-child .n { background: var(--replace); }
.ori-step .st-t { font-weight: 600; font-size: 14.5px; color: var(--ink); }
.ori-step .st-d { font-size: 13px; color: var(--ink-3); line-height: 1.45; margin-top: 2px; }
.ori-cta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.btn-primary {
  background: var(--brand); color: var(--paper-2); border: none; border-radius: 10px;
  font-family: var(--sans); font-weight: 600; font-size: 15px; padding: 14px 22px; min-height: 50px;
  display: inline-flex; align-items: center; gap: 10px; cursor: pointer; box-shadow: var(--shadow-soft);
}
.btn-primary:hover { background: var(--brand-2); }
.btn-primary { white-space: nowrap; }
.btn-ghost { background: none; border: none; color: var(--ink-3); font-size: 13.5px; font-family: var(--sans); cursor: pointer; white-space: nowrap; }
.ori-meta { font-family: var(--mono); font-size: 11px; color: var(--ink-3); letter-spacing: 0.02em; }

/* ============ ORIENTATION B — Mission Checklist ============ */
.mis-body { flex: 1; display: grid; grid-template-columns: 1.05fr 0.95fr; min-height: 0; }
.mis-left { padding: 48px 44px; display: flex; flex-direction: column; justify-content: center; background: var(--paper); }
.mis-left h1 { font-family: var(--serif); font-weight: 600; font-size: 38px; line-height: 1.1; letter-spacing: -0.02em; margin: 16px 0 14px; color: var(--ink); }
.mis-left .lede { font-family: var(--serif); font-size: 17px; color: var(--ink-2); line-height: 1.5; margin: 0 0 30px; max-width: 420px; }
.mis-plan { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
.mis-row { display: grid; grid-template-columns: 40px 1fr; gap: 14px; align-items: center; }
.mis-row .ring { width: 38px; height: 38px; border-radius: 50%; border: 2px solid var(--rule); display: grid; place-items: center; font-family: var(--mono); font-weight: 700; font-size: 14px; color: var(--ink-2); }
.mis-row.lead .ring { border-color: var(--brand); color: var(--brand); }
.mis-row .mt { font-weight: 600; font-size: 15px; color: var(--ink); }
.mis-row .md { font-size: 13px; color: var(--ink-3); }
.mis-right { background: var(--brand); color: oklch(0.97 0.01 258); padding: 44px 40px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
.mis-right::after { content: ""; position: absolute; right: -60px; top: -60px; width: 220px; height: 220px; border-radius: 50%; background: oklch(1 0 0 / 0.06); }
.mis-right .rk { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.8; margin-bottom: 18px; }
.mis-deleg { display: flex; flex-direction: column; gap: 10px; }
.mis-seat { display: flex; align-items: center; gap: 13px; background: oklch(1 0 0 / 0.10); border: 1px solid oklch(1 0 0 / 0.14); border-radius: 11px; padding: 13px 15px; }
.mis-seat > div { flex: 1; min-width: 0; }
.mis-seat .sx { width: 30px; height: 30px; border-radius: 8px; background: oklch(1 0 0 / 0.16); display: grid; place-items: center; font-family: var(--mono); font-size: 11px; font-weight: 700; flex-shrink: 0; }
.mis-seat .so { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.75; white-space: nowrap; }
.mis-seat .sn { font-family: var(--serif); font-size: 16px; font-weight: 600; white-space: nowrap; }
.mis-seat .snote { margin-left: auto; font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.7; flex-shrink: 0; white-space: nowrap; }
.mis-seat.muted { opacity: 0.55; }

/* ============ ORIENTATION C — The Briefing ============ */
.brief { height: 100%; display: flex; flex-direction: column; background: var(--paper); }
.brief-mast { text-align: center; padding: 22px 30px 16px; border-bottom: 2px solid var(--ink); }
.brief-mast .ml { font-family: var(--mono); font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink-3); display: flex; justify-content: space-between; }
.brief-mast .ml span { white-space: nowrap; }
.brief-mast h1 { font-family: var(--serif); font-weight: 600; font-size: 30px; letter-spacing: -0.01em; margin: 8px 0 6px; color: var(--ink); }
.brief-body { flex: 1; display: grid; grid-template-columns: 1.6fr 1fr; gap: 0; min-height: 0; }
.brief-lead { padding: 32px 36px; border-right: 1px solid var(--rule); display: flex; flex-direction: column; justify-content: center; }
.brief-lead .dek-k { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--replace); font-weight: 700; }
.brief-lead h2 { font-family: var(--serif); font-weight: 600; font-size: 38px; line-height: 1.08; letter-spacing: -0.02em; margin: 12px 0 16px; color: var(--ink); text-wrap: balance; }
.brief-lead h2 em { font-style: italic; color: var(--brand); }
.brief-lead p { font-size: 15px; color: var(--ink-2); line-height: 1.6; margin: 0 0 14px; max-width: 460px; }
.brief-lead p .drop { font-family: var(--serif); font-weight: 600; font-size: 17px; }
.brief-aside { padding: 28px 30px; display: flex; flex-direction: column; gap: 18px; justify-content: center; background: var(--paper-2); }
.brief-stat { }
.brief-stat .bv { font-family: var(--serif); font-weight: 600; font-size: 46px; line-height: 1; color: var(--ink); letter-spacing: -0.02em; }
.brief-stat.alt .bv { color: var(--replace); }
.brief-stat .bd { font-size: 13px; color: var(--ink-2); margin-top: 6px; line-height: 1.4; max-width: 260px; }
.brief-stat .bc { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); margin-top: 5px; }
.brief-rule { height: 1px; background: var(--rule); }
.brief-foot { padding: 16px 36px; border-top: 1px solid var(--rule); display: flex; align-items: center; justify-content: space-between; gap: 18px; background: var(--paper); }
.brief-foot .bf-note { font-size: 13px; color: var(--ink-3); }

/* ============ RESULTS — one panel + right-rail progress ============ */
.res { height: 100%; display: flex; flex-direction: column; }
.res-context {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 11px 30px; border-bottom: 1px solid var(--rule-2); background: var(--paper-2);
}
.res-context .rc-back { font-size: 12.5px; color: var(--brand); font-weight: 600; }
.res-context .rc-addr { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
.res-context .rc-issues { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.res-context .rc-lab { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
.chip-issue { font-size: 12px; background: var(--tag-bg); color: var(--ink-2); padding: 4px 10px; border-radius: 999px; border: 1px solid var(--rule-2); white-space: nowrap; }
.chip-issue.edit { color: var(--brand); border-color: var(--brand-soft); background: var(--brand-soft); cursor: pointer; }

.res-main { flex: 1; display: grid; grid-template-columns: 1fr 312px; min-height: 0; }
.res-center { overflow: hidden; padding: 26px 34px; display: flex; flex-direction: column; min-height: 0; }
.res-tier { display: flex; gap: 13px; align-items: baseline; padding-bottom: 13px; margin-bottom: 18px; border-bottom: 1px solid var(--rule); }
.res-tier .tp { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em; font-weight: 700; color: var(--brand); white-space: nowrap; padding-top: 3px; }
.res-tier h2 { font-family: var(--serif); font-size: 19px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 3px; color: var(--ink); }
.res-tier p { font-size: 13px; color: var(--ink-3); margin: 0; max-width: 540px; line-height: 1.45; }
.res-tier .lvl { font-family: var(--mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 999px; background: var(--brand-soft); color: var(--brand-2); margin-left: 8px; vertical-align: 2px; }

/* the rep card */
.rcard { border: 1px solid var(--rule); border-radius: 14px; background: var(--paper-2); box-shadow: var(--shadow-soft); overflow: hidden; }
.rcard-strip { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 11px 18px; border-bottom: 1px solid var(--rule-2); }
.rcard-strip .office { font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; background: var(--tag-bg); color: var(--ink-2); padding: 3px 8px; border-radius: 5px; }
.rcard-strip .dist { font-size: 12.5px; color: var(--ink-3); }
.rcard-strip .next { margin-left: auto; font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em; color: var(--replace); font-weight: 700; text-transform: uppercase; }
.rcard-head { display: flex; align-items: center; gap: 16px; padding: 18px 20px 14px; }
.rcard-avatar { width: 54px; height: 54px; border-radius: 12px; background: var(--brand-soft); border: 1px solid var(--rule-2); display: grid; place-items: center; font-family: var(--serif); font-weight: 600; font-size: 22px; color: var(--brand-2); flex-shrink: 0; }
.rcard-who { flex: 1; min-width: 0; }
.rcard-who .blind { font-family: var(--serif); font-size: 21px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; }
.rcard-who .sub { font-size: 12.5px; color: var(--ink-3); margin-top: 1px; }
.rcard-reveal { font-size: 12px; font-weight: 600; color: var(--brand); border: 1px solid var(--rule); background: var(--paper); border-radius: 8px; padding: 7px 12px; cursor: pointer; }

.align-band { margin: 4px 20px 0; padding: 13px 16px; border-radius: 11px; background: var(--paper); border: 1px solid var(--rule-2); }
.align-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.align-top > span { white-space: nowrap; display: inline-flex; align-items: baseline; }
.align-top .at-lab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
.align-top .at-pct { font-family: var(--serif); font-weight: 600; font-size: 30px; line-height: 1; }
.align-top .at-pct.good { color: var(--keep); }
.align-top .at-pct.bad { color: var(--replace); }
.align-top .at-frac { font-family: var(--mono); font-size: 11px; color: var(--ink-3); margin-left: 4px; }
.align-rows { margin-top: 12px; display: grid; gap: 8px; }
.align-row { display: grid; grid-template-columns: 1fr 96px 40px; gap: 12px; align-items: center; }
.align-row .ai { font-size: 13px; color: var(--ink-2); }
.align-track { height: 6px; border-radius: 999px; background: var(--rule-2); overflow: hidden; }
.align-track i { display: block; height: 100%; }
.align-track i.good { background: var(--keep); }
.align-track i.bad { background: var(--replace); }
.align-row .av { font-family: var(--mono); font-size: 11px; font-weight: 600; text-align: right; color: var(--ink-2); }

.att-line { display: flex; align-items: center; gap: 10px; margin: 12px 20px 0; padding: 10px 14px; border-radius: 10px; background: var(--paper); border: 1px solid var(--rule-2); font-size: 12.5px; color: var(--ink-2); }
.att-line b { color: var(--ink); }
.att-line .att-tag { margin-left: auto; font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; background: var(--keep-soft); color: var(--keep); }
.att-line .att-tag.bad { background: var(--replace-soft); color: var(--replace); }

.money-line { display: flex; align-items: center; gap: 12px; margin: 12px 20px 0; padding: 12px 14px; border-radius: 10px; background: var(--paper); border: 1px solid var(--rule-2); }
.money-line .ml-lab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
.money-bars { flex: 1; display: flex; height: 9px; border-radius: 999px; overflow: hidden; border: 1px solid var(--rule-2); }
.money-bars i.small { background: var(--keep); }
.money-bars i.large { background: var(--gold); }
.money-bars i.pac { background: var(--replace); }
.money-line .ml-tot { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink); }

.verdicts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 20px 18px; }
.vbtn { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 14px; border-radius: 11px; font-family: var(--sans); font-weight: 600; font-size: 14.5px; cursor: pointer; border: 1.5px solid; min-height: 52px; white-space: nowrap; }
.vbtn .ck { width: 19px; height: 19px; border-radius: 6px; border: 1.5px solid; display: grid; place-items: center; font-size: 12px; }
.vbtn.keep { background: var(--keep); border-color: var(--keep); color: oklch(0.98 0.01 162); box-shadow: var(--shadow-soft); }
.vbtn.keep .ck { border-color: oklch(1 0 0 / 0.6); color: var(--keep); background: oklch(0.98 0.01 162); }
.vbtn.replace { background: var(--paper); border-color: var(--replace); color: var(--replace); }
.vbtn.replace .ck { border-color: var(--replace); }
.card-sources { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; padding: 11px 20px 15px; border-top: 1px solid var(--rule-2); font-family: var(--mono); font-size: 10px; color: var(--ink-3); letter-spacing: 0.02em; }
.card-sources .lab { text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.card-sources a { color: var(--ink-2); text-decoration: underline; text-underline-offset: 2px; }

/* right rail = progress (no separate bar) */
.res-rail { border-left: 1px solid var(--rule); background: var(--paper-2); display: flex; flex-direction: column; min-height: 0; }
.rail-head { padding: 18px 20px 12px; border-bottom: 1px solid var(--rule-2); }
.rail-head .rh-t { font-family: var(--serif); font-size: 16px; font-weight: 600; color: var(--ink); }
.rail-head .rh-prog { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.rail-head .rh-dots { display: flex; gap: 5px; }
.rail-head .rh-dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--rule); }
.rail-head .rh-dots i.done { background: var(--keep); }
.rail-head .rh-dots i.active { background: var(--brand); box-shadow: 0 0 0 3px var(--brand-soft); }
.rail-head .rh-count { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
.rail-list { flex: 1; overflow: hidden; padding: 12px; display: flex; flex-direction: column; gap: 9px; min-height: 0; }
.rail-group-lab { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; padding: 4px 6px 2px; }
.rseat { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border-radius: 11px; border: 1px solid var(--rule-2); background: var(--paper); cursor: pointer; }
.rseat.active { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-soft); background: var(--paper-2); }
.rseat .ri { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; font-family: var(--mono); font-size: 11px; font-weight: 700; background: var(--tag-bg); color: var(--ink-2); }
.rseat.done .ri { background: var(--keep); color: oklch(0.98 0.01 162); }
.rseat.done.replace .ri { background: var(--replace); color: oklch(0.98 0.01 27); }
.rseat .rmeta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rseat .ro, .rseat .rn { display: block; }
.rseat .ro { font-family: var(--mono); font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
.rseat .rn { font-family: var(--serif); font-size: 14.5px; font-weight: 600; color: var(--ink); }
.rseat .rstatus { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.rseat.active .rstatus { color: var(--brand); }
.rseat .rstatus.pending { color: var(--ink-3); }
.rseat .rstatus.keep { color: var(--keep); }
.rseat .rstatus.replace { color: var(--replace); }
/* non-2026 greyed, de-emphasized */
.rseat.notup { background: var(--tag-bg); opacity: 0.78; cursor: default; }
.rseat.notup .ri { background: var(--rule); color: var(--ink-3); }
.rseat.notup .rn { color: var(--ink-2); }

.rail-foot { border-top: 1px solid var(--rule-2); padding: 14px; background: var(--paper-2); display: grid; gap: 9px; }
.rail-foot .btn-primary { width: 100%; justify-content: center; min-height: 46px; font-size: 14px; }
.rail-foot .btn-primary:disabled { background: var(--rule); color: var(--ink-3); box-shadow: none; cursor: default; }
.rail-foot .rf-hint { font-family: var(--mono); font-size: 10px; color: var(--ink-3); text-align: center; letter-spacing: 0.02em; }

/* compact results used inside the color-comparison artboards */
.res.compact .res-center { padding: 18px 20px; }
.res.compact .res-main { grid-template-columns: 1fr 232px; }
.res.compact .rcard-head { padding: 14px 16px 10px; }

/* ============ SCORECARD (print-ready) ============ */
.sheetwrap { height: 100%; overflow: hidden; background: oklch(0.90 0.008 260); padding: 26px; display: flex; justify-content: center; }
.sheet {
  width: 100%; max-width: 720px; background: oklch(1 0 0); color: oklch(0.20 0.035 260);
  border-radius: 4px; box-shadow: 0 24px 60px -28px oklch(0.20 0.03 255 / 0.55);
  padding: 0; overflow: hidden; font-size: 14px;
}
.sheet .pflag { height: 6px; display: flex; }
.sheet .pflag i { flex: 1; }
.sheet .pflag i:nth-child(1) { background: oklch(0.40 0.155 262); }
.sheet .pflag i:nth-child(2) { background: oklch(0.53 0.205 27); }
.sheet-pad { padding: 30px 38px 34px; }
.sheet-mast { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; border-bottom: 2px solid oklch(0.20 0.035 260); padding-bottom: 16px; }
.sheet-mast h1 { font-family: var(--serif); font-weight: 600; font-size: 34px; letter-spacing: -0.02em; margin: 0; line-height: 1; }
.sheet-mast .mast-sub { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: oklch(0.54 0.026 260); margin-top: 7px; }
.sheet-mast .mast-r { text-align: right; font-family: var(--mono); font-size: 10.5px; color: oklch(0.46 0.026 260); line-height: 1.5; }
.sheet-mast .mast-r b { font-size: 12px; color: oklch(0.20 0.035 260); }

/* decisions lead the sheet */
.sheet-section-lab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: oklch(0.40 0.15 262); font-weight: 700; margin: 24px 0 12px; display: flex; align-items: center; gap: 10px; }
.sheet-section-lab::after { content: ""; flex: 1; height: 1px; background: oklch(0.90 0.006 260); }
.dec { display: flex; align-items: center; gap: 16px; padding: 15px 0; border-bottom: 1px solid oklch(0.92 0.005 260); }
.dec-badge { width: 46px; height: 46px; border-radius: 11px; flex-shrink: 0; display: grid; place-items: center; font-size: 22px; color: oklch(1 0 0); }
.dec-badge.keep { background: oklch(0.44 0.115 159); }
.dec-badge.replace { background: oklch(0.53 0.205 27); }
.dec-main { flex: 1; min-width: 0; }
.dec-office { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: oklch(0.54 0.026 260); }
.dec-main { flex: 1; min-width: 0; }
.dec-name { font-family: var(--serif); font-size: 19px; font-weight: 600; color: oklch(0.20 0.035 260); margin-top: 2px; line-height: 1.3; }
.dec-name .nm { margin-right: 8px; }
.dec-name .dec-verdict { vertical-align: 2px; }
.dec-verdict { display: inline-block; font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.06em; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.dec-verdict.keep { background: oklch(0.93 0.045 159); color: oklch(0.36 0.10 159); }
.dec-verdict.replace { background: oklch(0.94 0.050 27); color: oklch(0.47 0.17 27); }
.dec-note { font-size: 12.5px; color: oklch(0.37 0.032 260); margin-top: 3px; }
.dec-note b { color: oklch(0.20 0.035 260); }
.dec-score { flex-shrink: 0; text-align: right; }
.dec-score .ds-pct { font-family: var(--serif); font-weight: 600; font-size: 30px; line-height: 1; }
.dec-score .ds-pct.good { color: oklch(0.44 0.115 159); }
.dec-score .ds-pct.bad { color: oklch(0.53 0.205 27); }
.dec-score .ds-lab { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.05em; text-transform: uppercase; color: oklch(0.54 0.026 260); margin-top: 3px; }
.dec.notup { opacity: 0.6; }
.dec.notup .dec-badge { background: oklch(0.85 0.006 260); color: oklch(0.46 0.026 260); }

.sheet-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 26px; background: oklch(0.92 0.005 260); border: 1px solid oklch(0.92 0.005 260); border-radius: 8px; overflow: hidden; }
.sheet-meta .cell { background: oklch(1 0 0); padding: 12px 14px; }
.sheet-meta .k { font-family: var(--mono); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: oklch(0.54 0.026 260); font-weight: 600; }
.sheet-meta .v { font-size: 12.5px; color: oklch(0.25 0.03 260); margin-top: 4px; line-height: 1.4; }
.sheet-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 22px; padding-top: 14px; border-top: 1px solid oklch(0.92 0.005 260); font-family: var(--mono); font-size: 10px; color: oklch(0.54 0.026 260); }
.sheet-foot b { color: oklch(0.20 0.035 260); font-family: var(--serif); font-size: 13px; }
.sheet-issues { font-size: 12.5px; color: oklch(0.37 0.032 260); margin-top: 4px; line-height: 1.6; }
.sheet-issues .pill { display: inline-block; background: oklch(0.95 0.006 260); border: 1px solid oklch(0.92 0.005 260); border-radius: 999px; padding: 2px 9px; margin: 0 4px 4px 0; font-size: 11.5px; }

/* a small annotation note shown under the print sheet */
.callout { position: absolute; font-family: var(--mono); }

/* generic helper: caption tags inside artboards */
.note-tag {
  position: absolute; z-index: 5; font-family: "IBM Plex Mono", monospace; font-size: 10px;
  letter-spacing: 0.04em; background: oklch(0.22 0.04 258); color: oklch(0.97 0.01 258);
  padding: 4px 8px; border-radius: 6px; line-height: 1.3; max-width: 220px; box-shadow: 0 6px 16px -8px oklch(0.2 0.03 255 / 0.5);
}
.note-tag::before { content: ""; position: absolute; width: 8px; height: 8px; background: inherit; transform: rotate(45deg); }

/* ============================================================
   ORIENTATION A — ACTIVATED (resolved pick)
   Bold Flag white ground + flag hairline. Just a touch bolder than
   the plain card: stronger top accent + heavier CTA. No blue stage.
   ============================================================ */
.ori .flagbar { flex: 0 0 auto; }
.ori-card.activated::before { height: 6px; }
.ori-card.activated h1 em { color: var(--brand); }
.ori-card.activated .ori-step:last-child .n { background: var(--replace); }
.ori-card.activated .btn-primary { font-weight: 700; }

/* ============================================================
   SCORECARD — black & white print safety
   Differentiate keep vs replace by SHAPE (filled vs outline) and
   ICON + TEXT, not hue alone — survives a grayscale printer.
   ============================================================ */
.dec-badge { border: 2px solid transparent; }
.dec-badge.keep { background: oklch(0.40 0.115 159); color: oklch(1 0 0); border-color: oklch(0.34 0.10 159); }
.dec-badge.replace { background: oklch(1 0 0); color: oklch(0.50 0.20 27); border: 2.5px solid oklch(0.50 0.20 27); font-weight: 700; }
.dec-verdict.keep { background: oklch(0.93 0.045 159); color: oklch(0.32 0.10 159); border: 1px solid oklch(0.62 0.10 159); }
.dec-verdict.replace { background: oklch(1 0 0); color: oklch(0.47 0.18 27); border: 1.5px solid oklch(0.55 0.18 27); }
/* the matched-% gets a leading glyph so the read survives grayscale */
.ds-pct.good::before { content: "\2713  "; font-size: 0.55em; vertical-align: 0.25em; }
.ds-pct.bad::before  { content: "\26A0  "; font-size: 0.5em; vertical-align: 0.3em; }

/* ============================================================
   REP CARD — funding as progressive disclosure (not removed)
   The glance summary stays; an explicit affordance reveals the
   full FunderBars: named PACs, industry mix, small/large/PAC.
   ============================================================ */
.money-line { flex-wrap: wrap; row-gap: 8px; cursor: pointer; }
.money-top { display: flex; align-items: center; gap: 12px; width: 100%; }
.money-top .money-bars { flex: 1; }
.money-detail { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 8px; margin-top: 2px; border-top: 1px dashed var(--rule-2); }
.money-detail .md-who { font-size: 12px; color: var(--ink-3); }
.money-detail .md-who b { color: var(--ink-2); font-weight: 600; }
.money-disclose { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--brand); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.money-disclose .chev { transition: transform 0.15s; }
.money-line.open { background: var(--paper-2); border-color: var(--rule); cursor: default; }

/* ============================================================
   CARD EVIDENCE ROW — shared between the review card and the
   candidate/compare card: "See all votes → · Funders & influence ▾"
   sits above the verdict block. One class, one source of truth.
   ============================================================ */
.card-evidence { display: flex; gap: 18px; padding-top: 11px; border-top: 1px dashed var(--rule-2); }
.card-evidence button { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--brand); background: none; border: none; cursor: pointer; padding: 0; }
.rcard .card-evidence { margin: 14px 20px 0; }

/* ============================================================
   FUNDER PANEL — the EXPANDED money trail (FunderBars).
   Behind the "Funders & influence ▾" affordance. Bold Flag system:
   funding-mix bar + legend, named industries, named PACs, source.
   ============================================================ */
.funder-panel { width: 100%; margin-top: 12px; padding-top: 14px; border-top: 1px solid var(--rule-2); display: grid; gap: 16px; }
.fp-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.fp-tot { display: flex; align-items: baseline; gap: 8px; }
.fp-tot .fp-amt { font-family: var(--serif); font-weight: 600; font-size: 28px; line-height: 1; color: var(--ink); letter-spacing: -0.01em; }
.fp-tot .fp-lab { font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); }
.fp-peer { font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: 0.02em; color: var(--replace); background: var(--replace-soft); padding: 4px 9px; border-radius: 999px; white-space: nowrap; }

.fp-mix { display: grid; gap: 9px; }
.fp-mixbar { display: flex; height: 13px; border-radius: 999px; overflow: hidden; border: 1px solid var(--rule-2); }
.fp-mixbar i { display: block; height: 100%; }
.fp-mixbar i.small { background: var(--keep); }
.fp-mixbar i.large { background: var(--gold); }
.fp-mixbar i.pac { background: var(--replace); }
.fp-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; color: var(--ink-2); }
.fp-legend span { display: inline-flex; align-items: baseline; gap: 6px; }
.fp-legend i { width: 9px; height: 9px; border-radius: 3px; align-self: center; }
.fp-legend i.small { background: var(--keep); }
.fp-legend i.large { background: var(--gold); }
.fp-legend i.pac { background: var(--replace); }
.fp-legend b { color: var(--ink); font-weight: 700; }
.fp-legend small { color: var(--ink-3); font-size: 10.5px; }
.fp-legend .leg-pac .pac-term { position: relative; color: var(--brand); font-weight: 600; border-bottom: 1px dotted var(--brand); cursor: help; outline: none; }
.fp-legend .leg-pac .pac-tip { position: absolute; left: -6px; top: calc(100% + 9px); width: 270px; background: var(--paper-2); color: var(--ink-2); border: 1px solid var(--rule); font-family: var(--sans); font-weight: 400; font-size: 11.5px; line-height: 1.5; letter-spacing: 0; text-transform: none; padding: 10px 13px; border-radius: 9px; box-shadow: 0 16px 36px -18px oklch(0.2 0.03 255 / 0.30); z-index: 30; opacity: 0; visibility: hidden; transform: translateY(-3px); transition: opacity 0.12s, transform 0.12s; pointer-events: none; }
.fp-legend .leg-pac .pac-tip b { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand); margin-right: 6px; }
.fp-legend .leg-pac .pac-tip::before { content: ""; position: absolute; left: 14px; top: -6px; width: 10px; height: 10px; background: var(--paper-2); border-left: 1px solid var(--rule); border-top: 1px solid var(--rule); transform: rotate(45deg); border-radius: 2px 0 0 0; }
.fp-legend .leg-pac .pac-term:hover .pac-tip,
.fp-legend .leg-pac .pac-term:focus .pac-tip,
.fp-legend .leg-pac .pac-term.tip-open .pac-tip { opacity: 1; visibility: visible; transform: translateY(0); }

.fp-block { display: grid; gap: 9px; }
.fp-sub { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); font-weight: 700; display: flex; align-items: baseline; gap: 8px; }
.fp-sub .fp-sub-note { font-weight: 500; letter-spacing: 0.04em; color: var(--ink-3); }
.fp-inds { display: grid; gap: 7px; }
.fp-ind { display: grid; grid-template-columns: 138px 1fr 56px 36px; gap: 10px; align-items: center; }
.fp-ind .fi-name { font-size: 12.5px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fp-ind .fi-track { height: 8px; border-radius: 999px; background: var(--rule-2); overflow: hidden; }
.fp-ind .fi-track i { display: block; height: 100%; background: var(--brand); border-radius: 999px; }
.fp-ind .fi-amt { font-family: var(--mono); font-size: 11px; color: var(--ink-2); text-align: right; }
.fp-ind .fi-pct { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--ink); text-align: right; }
.fp-pacs { display: flex; flex-wrap: wrap; gap: 8px; }
.fp-pac { font-size: 12px; color: var(--ink-2); background: var(--paper); border: 1px solid var(--rule-2); border-radius: 999px; padding: 6px 12px; display: inline-flex; align-items: baseline; gap: 8px; }
.fp-pac b { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--brand); }

/* PAC honesty note (Muxin) — lives at the FOOT so it doesn't break the read of
   the numbers above. The PAC *definition* is a tooltip on the legend term. */
.fp-pacblock { display: grid; gap: 9px; padding-top: 3px; }
.fp-pacnote { display: flex; gap: 10px; align-items: flex-start; background: var(--brand-soft); border-left: 3px solid var(--brand); border-radius: 9px; padding: 11px 13px; }
.fp-pacnote-ic { flex-shrink: 0; width: 19px; height: 19px; border-radius: 50%; background: var(--brand); color: var(--paper-2); font-family: var(--serif); font-weight: 700; font-size: 12px; display: grid; place-items: center; margin-top: 1px; }
.fp-pacnote p { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-2); }
.fp-pacnote p b { color: var(--ink); font-weight: 700; }
.fp-src { font-family: var(--mono); font-size: 10px; color: var(--ink-3); letter-spacing: 0.02em; padding-top: 2px; }

/* ============================================================
   VOTE DRILLDOWN — what "selecting a vote" opens.
   An issue row expands to the roll-call votes behind its score.
   ============================================================ */
.align-row.sel { background: var(--brand-soft); margin: 0 -8px; padding: 6px 8px; border-radius: 8px; }
.align-row .av .caret { font-size: 8px; color: var(--brand); margin-left: 3px; }
.align-row .av .caret.dim { color: var(--ink-3); }
.see-all { margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--rule-2); }
.see-all-btn { font-family: var(--mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--brand); background: none; border: none; cursor: pointer; padding: 0; }

.vote-drill { margin: 4px 0 6px; padding: 12px 13px; border-radius: 11px; background: var(--paper-2); border: 1px solid var(--brand-soft); box-shadow: inset 3px 0 0 var(--brand); }
.vd-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 9px; }
.vd-head .vd-lab { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); font-weight: 700; }
.vd-head .vd-lab b { color: var(--brand-2); }
.vd-head .vd-frac { font-family: var(--mono); font-size: 10px; color: var(--ink-3); }
.vd-cards { display: grid; gap: 7px; }

/* compact 2-line vote card — verdict on the title line, note + source below */
.votecard { padding: 9px 12px; border-radius: 9px; background: var(--paper); border: 1px solid var(--rule-2); border-left: 3px solid var(--keep); }
.votecard.against { border-left-color: var(--replace); }
.vc-top { display: flex; align-items: center; gap: 8px; }
.vc-top .vc-num { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--paper-2); background: var(--ink-2); padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
.vc-top .vc-ttl { font-weight: 600; font-size: 13px; color: var(--ink); margin-right: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vc-cast { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
.vc-cast.yea { background: var(--brand-soft); color: var(--brand-2); }
.vc-cast.nay { background: var(--tag-bg); color: var(--ink-2); }
.vc-align { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
.vc-align.with { background: var(--keep-soft); color: var(--keep); }
.vc-align.against { background: var(--replace-soft); color: var(--replace); }
.vc-line { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 4px; }
.vc-note { margin: 0; font-size: 12px; color: var(--ink-2); line-height: 1.4; }
.vc-meta { font-family: var(--mono); font-size: 10px; color: var(--ink-3); white-space: nowrap; flex-shrink: 0; }
.vc-meta .vc-src { color: var(--ink-3); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }

/* ============================================================
   ALL-VOTES SHEET — the full record. It's a lot, so it never
   shows by default; it opens over the dimmed review surface.
   ============================================================ */
.avsheet-scrim { position: absolute; inset: 0; background: oklch(0.20 0.035 260 / 0.42); display: grid; place-items: center; padding: 34px; z-index: 20; }
.avsheet { width: 100%; max-width: 600px; max-height: 100%; background: var(--paper-2); border-radius: 16px; box-shadow: 0 40px 90px -40px oklch(0.2 0.03 255 / 0.7); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--rule); }
.av-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 20px 22px 16px; border-bottom: 1px solid var(--rule-2); }
.av-head .av-eyebrow { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brand); font-weight: 700; }
.av-head h3 { font-family: var(--serif); font-size: 19px; font-weight: 600; color: var(--ink); margin: 5px 0 0; letter-spacing: -0.01em; }
.av-close { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--rule); background: var(--paper); color: var(--ink-2); font-size: 13px; cursor: pointer; flex-shrink: 0; }
.av-filters { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; padding: 12px 22px; border-bottom: 1px solid var(--rule-2); background: var(--paper); }
.avf { font-size: 11.5px; color: var(--ink-2); background: var(--paper-2); border: 1px solid var(--rule-2); border-radius: 999px; padding: 4px 11px; white-space: nowrap; cursor: pointer; }
.avf.active { background: var(--brand); color: var(--paper-2); border-color: var(--brand); font-weight: 600; }
.avf-sep { width: 1px; height: 18px; background: var(--rule); margin: 0 2px; }
.av-body { flex: 1; overflow-y: auto; padding: 8px 22px 14px; }
.av-group { margin-top: 14px; }
.av-glab { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 6px 0 8px; border-bottom: 1px solid var(--rule-2); margin-bottom: 4px; }
.av-glab .avg-name { font-weight: 600; font-size: 13.5px; color: var(--ink); }
.av-glab .avg-frac { font-family: var(--mono); font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.av-glab .avg-frac.good { background: var(--keep-soft); color: var(--keep); }
.av-glab .avg-frac.bad { background: var(--replace-soft); color: var(--replace); }
.av-row { display: grid; grid-template-columns: 18px 1fr auto auto 12px; gap: 11px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--rule-2); cursor: pointer; }
.av-row:last-child { border-bottom: none; }
.av-row.open { background: var(--brand-soft); margin: 0 -22px; padding: 10px 22px; border-bottom: none; }
.av-row .avr-chev { font-size: 8px; color: var(--ink-3); text-align: center; }
.av-row.open .avr-chev { color: var(--brand); }
.av-row .avr-flag { width: 18px; height: 18px; border-radius: 5px; display: grid; place-items: center; font-size: 10px; font-weight: 700; }
.av-row .avr-flag.with { background: var(--keep-soft); color: var(--keep); }
.av-row .avr-flag.against { background: var(--replace-soft); color: var(--replace); }
.av-row .avr-bill { font-size: 12.5px; color: var(--ink-2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.av-row .avr-bill b { color: var(--ink); font-weight: 600; }
.av-row .avr-cast { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 5px; }
.av-row .avr-cast.yea { background: var(--brand-soft); color: var(--brand-2); }
.av-row .avr-cast.nay { background: var(--tag-bg); color: var(--ink-2); }
.av-row .avr-date { font-family: var(--mono); font-size: 10px; color: var(--ink-3); white-space: nowrap; }

/* bill detail — what the bill is, opened by clicking a vote (Muxin) */
.av-detail { background: var(--brand-soft); margin: 0 -22px 4px; padding: 0 22px 14px; display: grid; gap: 11px; }
.av-detail .avd-what { margin: 0; font-size: 13px; line-height: 1.55; color: var(--ink); }
.av-detail .avd-meta { display: flex; flex-wrap: wrap; gap: 8px; }
.av-detail .avd-pair { display: inline-flex; flex-direction: column; gap: 2px; background: var(--paper-2); border: 1px solid var(--rule-2); border-radius: 8px; padding: 7px 11px; }
.av-detail .avd-pair .k { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; }
.av-detail .avd-pair .val { font-size: 12.5px; font-weight: 600; color: var(--ink); }
.av-detail .avd-pair .val.with { color: var(--keep); }
.av-detail .avd-pair .val.against { color: var(--replace); }
.av-detail .avd-link { font-family: var(--mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--brand); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; justify-self: start; }
.av-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 22px; border-top: 1px solid var(--rule-2); background: var(--paper); font-family: var(--mono); font-size: 10px; color: var(--ink-3); }
.av-foot .av-src { letter-spacing: 0.02em; }
```

=== FILE: candidates.css (part 1 of 1) ===
```css
/* ====================================================
   VOTER CHOICE · Design Candidates — the "Time to replace" flow
   New section for the keystone canvas. Built on the Bold Flag
   white ground (data-palette="white") + the same tokens as the
   results / scorecard screens. Three directions for what
   "Replace" opens, plus one unified candidate card whose
   PROVENANCE BADGE (roll-call vs researched) carries the
   House / Senate / President difference — one card system.
   ==================================================== */

/* ---------- provenance badge — the unifier ---------- */
.prov {
  font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; padding: 3px 8px 3px 7px; border-radius: 5px;
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; line-height: 1.4;
}
.prov::before { font-size: 9px; }
.prov.rollcall { background: var(--brand); color: var(--paper-2); border: 1.5px solid var(--brand); }
.prov.rollcall::before { content: "\25C6"; }            /* filled diamond */
.prov.researched { background: var(--paper-2); color: var(--brand-2); border: 1.5px dashed var(--brand); }
.prov.researched::before { content: "\25C7"; }          /* hollow diamond */

/* party pip */
.pip { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.pip.dem { background: oklch(0.45 0.16 262); }
.pip.rep { background: oklch(0.53 0.205 27); }
.pip.ind { background: oklch(0.66 0.10 78); }

/* small alignment tone helpers reused across all three directions */
.tone-good { color: var(--keep); }
.tone-mid  { color: var(--gold); }
.tone-bad  { color: var(--replace); }
.bar-good { background: var(--keep); }
.bar-mid  { background: var(--gold); }
.bar-bad  { background: var(--replace); }

/* =========================================================
   BUILDING BLOCK · unified candidate card (parity demo)
   ========================================================= */
.cd-stage { height: 100%; display: flex; flex-direction: column; }
.cd-stage .flagbar { flex: 0 0 auto; }
.cd-explain {
  padding: 16px 30px 0; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
}
.cd-explain h2 { font-family: var(--serif); font-size: 19px; font-weight: 600; letter-spacing: -0.01em; margin: 0; color: var(--ink); }
.cd-explain p { font-size: 13px; color: var(--ink-3); margin: 0; max-width: 560px; line-height: 1.45; }
.cd-pair { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; padding: 18px 30px 26px; min-height: 0; align-items: start; }

.cd-card {
  border: 1px solid var(--rule); border-radius: 14px; background: var(--paper-2);
  box-shadow: var(--shadow-soft); overflow: hidden; display: flex; flex-direction: column;
}
.cd-card.is-pick { border-color: var(--keep); box-shadow: 0 0 0 2px var(--keep-soft), var(--shadow-soft); }
.cd-seatlab {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
  font-weight: 700; color: var(--ink-3); padding: 9px 16px; border-bottom: 1px solid var(--rule-2);
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.cd-seatlab .seat-t { color: var(--brand-2); }
.cd-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px 12px; }
.cd-avatar {
  width: 44px; height: 44px; border-radius: 11px; flex-shrink: 0; display: grid; place-items: center;
  font-family: var(--serif); font-weight: 600; font-size: 18px; background: var(--brand-soft);
  color: var(--brand-2); border: 1px solid var(--rule-2);
}
.cd-card.blind .cd-avatar { background: var(--tag-bg); color: var(--ink-3); }
.cd-who { flex: 1; min-width: 0; }
.cd-name { font-family: var(--serif); font-size: 16.5px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; display: flex; align-items: center; gap: 7px; line-height: 1.15; }
.cd-role { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; line-height: 1.3; }

.cd-prov-row { padding: 0 16px 12px; }

.cd-align { margin: 0 16px; padding: 11px 14px; border-radius: 10px; background: var(--paper); border: 1px solid var(--rule-2); }
.cd-align-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.cd-align-top .lab { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
.cd-pct { font-family: var(--serif); font-weight: 600; font-size: 27px; line-height: 1; }
.cd-delta { font-family: var(--mono); font-size: 10px; font-weight: 700; margin-left: 7px; vertical-align: 3px; }
.cd-delta.up { color: var(--keep); }
.cd-delta.down { color: var(--replace); }
.cd-issues { margin-top: 10px; display: grid; gap: 7px; }
.cd-irow { display: grid; grid-template-columns: 1fr 70px 30px; gap: 10px; align-items: center; }
.cd-irow .ik { font-size: 12px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cd-track { height: 6px; border-radius: 999px; background: var(--rule-2); overflow: hidden; }
.cd-track i { display: block; height: 100%; }
.cd-irow .iv { font-family: var(--mono); font-size: 10.5px; font-weight: 600; text-align: right; color: var(--ink-2); }

.cd-money { margin: 12px 16px 0; padding: 11px 14px; border-radius: 10px; background: var(--paper); border: 1px solid var(--rule-2); }
.cd-money-top { display: flex; align-items: center; gap: 10px; }
.cd-money-top .lab { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; white-space: nowrap; }
.cd-bars { flex: 1; display: flex; height: 8px; border-radius: 999px; overflow: hidden; border: 1px solid var(--rule-2); }
.cd-bars i.small { background: var(--keep); }
.cd-bars i.large { background: var(--gold); }
.cd-bars i.pac { background: var(--replace); }
.cd-money-top .tot { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--ink); }
.cd-money-note { font-size: 11px; color: var(--ink-3); margin-top: 6px; }
.cd-money-note b { color: var(--ink-2); font-weight: 600; }

.cd-foot { margin-top: auto; padding: 13px 16px 15px; }
.cd-select {
  width: 100%; min-height: 44px; border-radius: 10px; font-family: var(--sans); font-weight: 600;
  font-size: 13.5px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--brand); color: var(--paper-2); border: 1.5px solid var(--brand); box-shadow: var(--shadow-soft);
}
.cd-select.ghost { background: var(--paper); color: var(--brand); }
.cd-card.is-pick .cd-select { background: var(--keep); border-color: var(--keep); }
.cd-pick-tag { font-family: var(--mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; background: var(--keep-soft); color: var(--keep); }

/* =========================================================
   DIRECTION A · inline ranked chooser (evolves redesign2-replace)
   ========================================================= */
.rf2 { height: 100%; display: flex; flex-direction: column; background: var(--paper); overflow: hidden; }
.rf2-scroll { flex: 1; overflow: hidden; padding: 22px 30px 26px; }
.rf2-banner {
  display: flex; align-items: center; gap: 13px; padding: 13px 16px; border-radius: 12px;
  background: var(--replace-soft); border: 1px solid oklch(0.80 0.10 27); margin-bottom: 18px;
}
.rf2-banner .x { width: 30px; height: 30px; border-radius: 8px; background: var(--paper-2); border: 2px solid var(--replace); color: var(--replace); display: grid; place-items: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
.rf2-banner .bt { font-family: var(--serif); font-size: 16px; font-weight: 600; color: var(--ink); }
.rf2-banner .bd { font-size: 12.5px; color: var(--ink-2); }
.rf2-banner .undo { margin-left: auto; font-size: 12px; font-weight: 600; color: var(--brand); border: 1px solid var(--rule); background: var(--paper-2); border-radius: 8px; padding: 7px 12px; cursor: pointer; white-space: nowrap; }

.rf2-inc {
  display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px;
  background: var(--paper-2); border: 1px solid var(--rule); margin-bottom: 14px;
}
.rf2-inc .bar2beat { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: var(--ink-3); }
.rf2-inc .who { font-family: var(--serif); font-size: 16px; font-weight: 600; color: var(--ink); }
.rf2-inc .meta { font-size: 11.5px; color: var(--ink-3); }
.rf2-inc .pct { margin-left: auto; text-align: right; }
.rf2-inc .pct b { font-family: var(--serif); font-weight: 600; font-size: 26px; line-height: 1; }
.rf2-inc .pct span { display: block; font-family: var(--mono); font-size: 9px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); margin-top: 2px; }

.rf2-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.rf2-controls .sortlab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
.rf2-seg { display: inline-flex; border: 1px solid var(--rule); border-radius: 9px; overflow: hidden; background: var(--paper-2); }
.rf2-seg button { font-family: var(--sans); font-size: 12px; font-weight: 600; padding: 7px 13px; border: none; background: none; color: var(--ink-3); cursor: pointer; }
.rf2-seg button.on { background: var(--brand); color: var(--paper-2); }
.rf2-controls .count { margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--ink-3); }

.rf2-list { display: flex; flex-direction: column; gap: 9px; }
.ch2 { border: 1px solid var(--rule); border-radius: 12px; background: var(--paper-2); overflow: hidden; }
.ch2.open { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-soft); }
.ch2.is-pick { border-color: var(--keep); box-shadow: 0 0 0 2px var(--keep-soft); }
.ch2-row { display: flex; align-items: center; gap: 13px; padding: 12px 15px; cursor: pointer; }
.ch2-rank { font-family: var(--serif); font-weight: 600; font-size: 17px; color: var(--ink-3); width: 18px; text-align: center; flex-shrink: 0; }
.ch2-id { flex: 1; min-width: 0; }
.ch2-name { font-family: var(--serif); font-size: 15.5px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 8px; line-height: 1.2; }
.ch2-name .pick-tag { font-family: var(--mono); font-size: 8px; font-weight: 700; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 999px; background: var(--keep-soft); color: var(--keep); white-space: nowrap; flex-shrink: 0; }
.ch2-meta { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ch2-scores { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.ch2-pct { text-align: right; }
.ch2-pct b { font-family: var(--serif); font-weight: 600; font-size: 21px; line-height: 1; }
.ch2-pct span { display: block; font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-top: 2px; }
.ch2-vs { text-align: right; width: 64px; }
.ch2-vs .d { font-family: var(--mono); font-size: 12px; font-weight: 700; }
.ch2-vs .d.up { color: var(--keep); }
.ch2-vs .d.down { color: var(--replace); }
.ch2-vs small { display: block; font-family: var(--mono); font-size: 8px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); }
.ch2-chev { width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--rule); background: var(--paper); color: var(--ink-3); display: grid; place-items: center; flex-shrink: 0; font-size: 11px; }

.ch2-detail { border-top: 1px solid var(--rule-2); padding: 14px 16px 16px; background: var(--paper); }
.ch2-why { font-family: var(--serif); font-style: italic; font-size: 14px; color: var(--ink-2); margin: 0 0 13px; line-height: 1.45; }
.ch2-sub { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; margin: 0 0 9px; }
.h2h2 { display: grid; gap: 7px; margin-bottom: 14px; }
.h2h2-row { display: grid; grid-template-columns: 150px 1fr 1fr 54px; gap: 12px; align-items: center; }
.h2h2-row .iss { font-size: 12.5px; color: var(--ink-2); }
.h2h2-cell { display: flex; align-items: center; gap: 8px; }
.h2h2-cell .mini { flex: 1; height: 6px; border-radius: 999px; background: var(--rule-2); overflow: hidden; }
.h2h2-cell .mini i { display: block; height: 100%; }
.h2h2-cell .mini.inc i { opacity: 0.55; }
.h2h2-cell .v { font-family: var(--mono); font-size: 10.5px; font-weight: 600; width: 30px; text-align: right; color: var(--ink-2); }
.h2h2-row .delta { font-family: var(--mono); font-size: 11px; font-weight: 700; text-align: right; }
.h2h2-row .delta.up { color: var(--keep); }
.h2h2-row .delta.down { color: var(--replace); }
.h2h2-colhead { display: grid; grid-template-columns: 150px 1fr 1fr 54px; gap: 12px; font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; margin-bottom: 6px; }
.h2h2-colhead span:last-child { text-align: right; }

.ch2-selbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 13px; border-top: 1px dashed var(--rule); margin-top: 4px; }
.ch2-selnote { font-size: 11.5px; color: var(--ink-3); }
.ch2-selnote b { color: var(--ink-2); }
.ch2-sel { min-height: 42px; padding: 0 18px; border-radius: 10px; font-family: var(--sans); font-weight: 600; font-size: 13.5px; cursor: pointer; background: var(--brand); color: var(--paper-2); border: 1.5px solid var(--brand); box-shadow: var(--shadow-soft); display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.ch2-sel.is-sel { background: var(--keep); border-color: var(--keep); }

.rf2-more { margin-top: 11px; width: 100%; padding: 11px; border-radius: 10px; border: 1px dashed var(--rule); background: var(--paper-2); color: var(--brand); font-family: var(--sans); font-weight: 600; font-size: 12.5px; cursor: pointer; }
.rf2-confirm { display: flex; align-items: center; gap: 11px; margin-top: 13px; padding: 13px 16px; border-radius: 12px; background: var(--keep-soft); border: 1px solid oklch(0.66 0.10 159); }
.rf2-confirm .tick { width: 26px; height: 26px; border-radius: 50%; background: var(--keep); color: var(--paper-2); display: grid; place-items: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.rf2-confirm span.t { font-size: 13px; color: var(--ink-2); }
.rf2-confirm span.t b { color: var(--ink); }

/* =========================================================
   DIRECTION B · dedicated head-to-head compare screen
   ========================================================= */
.cmp { height: 100%; display: flex; flex-direction: column; background: var(--paper); }
.cmp .flagbar { flex: 0 0 auto; }
.cmp-top { padding: 16px 34px 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.cmp-top h2 { font-family: var(--serif); font-size: 21px; font-weight: 600; letter-spacing: -0.01em; margin: 0; color: var(--ink); }
.cmp-top .ctx { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); margin-top: 4px; }
.cmp-switch { display: inline-flex; gap: 7px; }
.cmp-switch button { display: inline-flex; align-items: center; gap: 7px; font-family: var(--sans); font-size: 12.5px; font-weight: 600; padding: 8px 13px; border-radius: 999px; border: 1px solid var(--rule); background: var(--paper-2); color: var(--ink-2); cursor: pointer; }
.cmp-switch button.on { border-color: var(--brand); background: var(--brand-soft); color: var(--brand-2); box-shadow: 0 0 0 2px var(--brand-soft); }
.cmp-switch button .p { font-family: var(--mono); font-size: 10px; color: var(--ink-3); }

.cmp-grid { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 18px 34px 0; min-height: 0; }
.cmp-col { padding: 16px 20px; border: 1px solid var(--rule); }
.cmp-col.inc { border-radius: 14px 0 0 0; border-right: none; background: var(--paper-2); }
.cmp-col.ch { border-radius: 0 14px 0 0; background: var(--brand-soft); border-color: var(--brand); }
.cmp-colhead { display: flex; align-items: center; gap: 12px; }
.cmp-av { width: 46px; height: 46px; border-radius: 11px; display: grid; place-items: center; font-family: var(--serif); font-weight: 600; font-size: 19px; flex-shrink: 0; }
.cmp-col.inc .cmp-av { background: var(--tag-bg); color: var(--ink-3); }
.cmp-col.ch .cmp-av { background: var(--brand); color: var(--paper-2); }
.cmp-roleline { flex: 1; min-width: 0; }
.cmp-tag { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; }
.cmp-col.inc .cmp-tag { color: var(--ink-3); }
.cmp-col.ch .cmp-tag { color: var(--brand-2); }
.cmp-cname { font-family: var(--serif); font-size: 18px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 7px; line-height: 1.15; margin-top: 2px; }
.cmp-crole { font-size: 11.5px; color: var(--ink-3); margin-top: 1px; }
.cmp-big { display: flex; align-items: baseline; gap: 10px; margin: 14px 0 4px; }
.cmp-big b { font-family: var(--serif); font-weight: 600; font-size: 40px; line-height: 1; }
.cmp-big .lab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); }
.cmp-prov-line { margin-top: 6px; }

/* shared issue ledger spanning both columns */
.cmp-ledger { padding: 0 34px; }
.cmp-ledgrid { border: 1px solid var(--rule); border-top: none; border-radius: 0 0 14px 14px; overflow: hidden; }
.cmp-lrow { display: grid; grid-template-columns: 1fr 64px 80px 64px 1fr; align-items: center; gap: 10px; padding: 11px 20px; }
.cmp-lrow + .cmp-lrow { border-top: 1px solid var(--rule-2); }
.cmp-lrow.head { background: var(--paper-2); }
.cmp-lrow.head span { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; }
.cmp-iss-l { font-size: 13px; color: var(--ink-2); text-align: right; }
.cmp-iss-r { font-size: 13px; color: var(--ink); font-weight: 500; }
.cmp-v { font-family: var(--mono); font-size: 13px; font-weight: 700; text-align: center; }
.cmp-mid { display: flex; align-items: center; justify-content: center; }
.cmp-mid .arrow { font-family: var(--mono); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.cmp-mid .arrow.up { background: var(--keep-soft); color: var(--keep); }
.cmp-mid .arrow.down { background: var(--replace-soft); color: var(--replace); }
.cmp-mid .arrow.even { background: var(--tag-bg); color: var(--ink-3); }

.cmp-foot { margin-top: auto; padding: 18px 34px 22px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; border-top: 1px solid var(--rule-2); }
.cmp-fund { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 260px; font-size: 12px; color: var(--ink-3); }
.cmp-fund .blk { display: flex; flex-direction: column; gap: 4px; }
.cmp-fund .blk .v { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink); }
.cmp-fund .blk .k { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.06em; text-transform: uppercase; }
.cmp-actions { display: flex; gap: 11px; }
.cmp-keepbtn { min-height: 48px; padding: 0 18px; border-radius: 11px; font-family: var(--sans); font-weight: 600; font-size: 13.5px; cursor: pointer; border: 1.5px solid var(--rule); background: var(--paper-2); color: var(--ink-2); white-space: nowrap; }
.cmp-repbtn { min-height: 48px; padding: 0 22px; border-radius: 11px; font-family: var(--sans); font-weight: 700; font-size: 14px; cursor: pointer; border: 1.5px solid var(--replace); background: var(--replace); color: var(--paper-2); box-shadow: var(--shadow-soft); display: inline-flex; align-items: center; gap: 9px; white-space: nowrap; }

/* =========================================================
   DIRECTION C · split — ranked shortlist → focused compare
   ========================================================= */
.split { height: 100%; display: flex; flex-direction: column; background: var(--paper); }
.split .flagbar { flex: 0 0 auto; }
.split-head { padding: 15px 30px 14px; border-bottom: 1px solid var(--rule-2); }
.split-head h2 { font-family: var(--serif); font-size: 19px; font-weight: 600; margin: 0; color: var(--ink); letter-spacing: -0.01em; }
.split-head p { font-size: 12.5px; color: var(--ink-3); margin: 3px 0 0; }
.split-body { flex: 1; display: grid; grid-template-columns: 320px 1fr; min-height: 0; }
.split-list { border-right: 1px solid var(--rule); background: var(--paper-2); display: flex; flex-direction: column; min-height: 0; }
.split-list-lab { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; padding: 13px 16px 7px; }
.split-items { flex: 1; overflow: hidden; padding: 0 12px; display: flex; flex-direction: column; gap: 7px; }
.sl-item { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border-radius: 11px; border: 1px solid var(--rule-2); background: var(--paper); cursor: pointer; }
.sl-item.on { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-soft); background: var(--paper-2); }
.sl-rank { font-family: var(--serif); font-weight: 600; font-size: 15px; color: var(--ink-3); width: 14px; text-align: center; flex-shrink: 0; }
.sl-id { flex: 1; min-width: 0; }
.sl-name { font-family: var(--serif); font-size: 14.5px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 7px; line-height: 1.15; }
.sl-meta { font-size: 10.5px; color: var(--ink-3); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sl-pct { text-align: right; flex-shrink: 0; }
.sl-pct b { font-family: var(--serif); font-weight: 600; font-size: 16px; line-height: 1; white-space: nowrap; }
.sl-pct span { display: block; font-family: var(--mono); font-size: 8px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
.sl-pct span.up { color: var(--keep); }
.sl-pct span.down { color: var(--replace); }
.split-folded { font-family: var(--mono); font-size: 10px; color: var(--ink-3); padding: 9px 16px; border-top: 1px solid var(--rule-2); margin-top: 7px; }
.split-inc { margin: 0 12px 12px; padding: 11px 13px; border-radius: 11px; background: var(--tag-bg); border: 1px solid var(--rule-2); }
.split-inc .l { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; }
.split-inc .r { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 4px; }
.split-inc .nm { font-family: var(--serif); font-size: 14px; font-weight: 600; color: var(--ink-2); }
.split-inc .pc { font-family: var(--serif); font-weight: 600; font-size: 18px; color: var(--replace); }

.split-focus { padding: 20px 26px; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
.sf-head { display: flex; align-items: flex-start; gap: 14px; }
.sf-av { width: 50px; height: 50px; border-radius: 12px; background: var(--brand); color: var(--paper-2); display: grid; place-items: center; font-family: var(--serif); font-weight: 600; font-size: 21px; flex-shrink: 0; }
.sf-who { flex: 1; min-width: 0; }
.sf-name { font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; display: flex; align-items: center; gap: 9px; line-height: 1.1; }
.sf-role { font-size: 12.5px; color: var(--ink-3); margin-top: 3px; }
.sf-headpct { text-align: right; flex-shrink: 0; }
.sf-headpct b { font-family: var(--serif); font-weight: 600; font-size: 34px; line-height: 1; color: var(--keep); }
.sf-headpct .vs { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--keep); font-weight: 700; }
.sf-why { font-family: var(--serif); font-style: italic; font-size: 14.5px; color: var(--ink-2); line-height: 1.5; margin: 14px 0; padding-left: 13px; border-left: 3px solid var(--brand); }
.sf-sub { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; margin: 0 0 9px; }
.sf-ledger { display: grid; gap: 8px; margin-bottom: 16px; }
.sf-lrow { display: grid; grid-template-columns: 160px 1fr 50px 1fr 46px; align-items: center; gap: 10px; }
.sf-lrow .iss { font-size: 12.5px; color: var(--ink-2); }
.sf-trk { height: 7px; border-radius: 999px; background: var(--rule-2); overflow: hidden; position: relative; }
.sf-trk i { display: block; height: 100%; }
.sf-trk.inc i { opacity: 0.5; }
.sf-incv { font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--ink-3); text-align: center; }
.sf-chv { font-family: var(--mono); font-size: 11px; font-weight: 700; text-align: right; }
.sf-money { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 11px; background: var(--paper-2); border: 1px solid var(--rule-2); margin-bottom: 16px; }
.sf-money .lab { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; white-space: nowrap; }
.sf-bars { flex: 1; display: flex; height: 9px; border-radius: 999px; overflow: hidden; border: 1px solid var(--rule-2); }
.sf-bars i.small { background: var(--keep); } .sf-bars i.large { background: var(--gold); } .sf-bars i.pac { background: var(--replace); }
.sf-money .tot { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink); }
.sf-foot { margin-top: auto; display: flex; align-items: center; gap: 13px; }
.sf-select { flex: 1; min-height: 50px; border-radius: 11px; font-family: var(--sans); font-weight: 700; font-size: 14.5px; cursor: pointer; background: var(--replace); color: var(--paper-2); border: none; box-shadow: var(--shadow-soft); display: inline-flex; align-items: center; justify-content: center; gap: 9px; }
.sf-chat { min-height: 50px; padding: 0 16px; border-radius: 11px; border: 1px solid var(--rule); background: var(--paper-2); color: var(--ink-2); font-family: var(--sans); font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
```

=== FILE: home.css (part 1 of 1) ===
```css
/* ====================================================
   VOTER CHOICE · Homepage hero (card b4cc1c9e + 1850349c)
   Bold Flag white ground. De-cluttered: the two fact snippets
   move to the "Why Now?" page; the CTA states what the site does;
   the registered-address box is simplified (label + field + button,
   with the reassurance folded into a "how it works · your data"
   disclosure). The right column now PREVIEWS the product — a peek at
   the blind assessment that becomes a printable scorecard.
   ==================================================== */

.vh { height: 100%; display: flex; flex-direction: column; background: var(--paper); overflow: hidden; }
.vh .flagbar { flex: 0 0 auto; }
.vh-hero {
  flex: 1; display: grid; grid-template-columns: 1.06fr 0.94fr; gap: 44px;
  align-items: center; padding: 26px 54px; min-height: 0;
}
.vh-left { min-width: 0; }
.vh-eyebrow { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.vh-h1 {
  font-family: var(--serif); font-weight: 600; font-size: 40px; line-height: 1.08;
  letter-spacing: -0.02em; margin: 0 0 18px; color: var(--ink); text-wrap: balance; max-width: 600px;
}
.vh-h1 em { font-style: italic; color: var(--brand); }
.vh-h1 .red { color: var(--replace); font-style: normal; }
.vh-lede {
  font-family: var(--serif); font-size: 18px; line-height: 1.5; color: var(--ink-2);
  margin: 0 0 26px; max-width: 500px;
}
.vh-lede b { color: var(--ink); font-weight: 600; }

/* simplified address card */
.vh-addr {
  background: var(--paper-2); border: 1px solid var(--rule); border-radius: 14px;
  box-shadow: var(--shadow-card); padding: 18px 20px 16px; max-width: 520px;
}
.vh-addr-lab { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
.vh-addr-lab .l { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--ink); }
.vh-addr-lab .why { width: 17px; height: 17px; border-radius: 50%; border: 1px solid var(--rule); background: var(--paper); color: var(--ink-3); font-size: 10px; font-weight: 700; display: grid; place-items: center; cursor: pointer; }
.vh-addr-lab .priv { font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em; color: var(--keep); display: inline-flex; align-items: center; gap: 5px; }
.vh-addr-lab .priv::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--keep); }
.vh-addr-row { display: flex; gap: 9px; }
.vh-addr-row input {
  flex: 1; min-width: 0; font-family: var(--sans); font-size: 14px; color: var(--ink);
  padding: 13px 14px; border: 1px solid var(--rule); border-radius: 10px; background: var(--paper);
}
.vh-addr-row input::placeholder { color: var(--ink-3); }
.vh-go {
  flex-shrink: 0; background: var(--brand); color: var(--paper-2); border: none; border-radius: 10px;
  font-family: var(--sans); font-weight: 700; font-size: 14px; padding: 0 20px; min-height: 48px;
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: var(--shadow-soft); white-space: nowrap;
}
.vh-go:hover { background: var(--brand-2); }

/* the de-clutter: reassurance + steps tucked under one disclosure line */
.vh-disclose {
  margin-top: 13px; padding-top: 13px; border-top: 1px dashed var(--rule-2);
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.vh-disclose .dt { font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--brand); font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
.vh-steps { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-left: auto; }
.vh-step { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ink-3); }
.vh-step .n { font-family: var(--mono); font-size: 9px; font-weight: 700; width: 16px; height: 16px; border-radius: 5px; background: var(--tag-bg); color: var(--ink-2); display: grid; place-items: center; }
.vh-step .arw { color: var(--rule); }

.vh-trust { display: flex; gap: 16px; margin-top: 12px; }
.vh-trust span { font-family: var(--mono); font-size: 10px; color: var(--ink-3); display: inline-flex; align-items: center; gap: 5px; }
.vh-trust span::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--keep); }

/* ---------- right column · product preview ---------- */
.vh-preview { position: relative; min-width: 0; height: 100%; display: grid; place-items: center; }
.vh-preview-cap { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; white-space: nowrap; }
.vh-stack { position: relative; width: 392px; height: 432px; }

/* scorecard sliver behind */
.vh-sheet {
  position: absolute; right: -6px; top: 36px; width: 280px; background: oklch(1 0 0);
  border-radius: 6px; box-shadow: 0 24px 50px -26px oklch(0.20 0.03 255 / 0.5); overflow: hidden;
  transform: rotate(3deg); border: 1px solid var(--rule-2);
}
.vh-sheet .pflag { height: 5px; display: flex; }
.vh-sheet .pflag i { flex: 1; } .vh-sheet .pflag i:nth-child(1){ background: var(--brand);} .vh-sheet .pflag i:nth-child(2){ background: var(--replace);}
.vh-sheet-pad { padding: 14px 16px 16px; }
.vh-sheet h5 { font-family: var(--serif); font-size: 16px; font-weight: 600; margin: 0; color: var(--ink); }
.vh-sheet .ss-sub { font-family: var(--mono); font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); margin-top: 3px; }
.vh-sheet .ss-row { display: flex; align-items: center; gap: 9px; padding: 9px 0; border-top: 1px solid var(--rule-2); margin-top: 9px; }
.vh-sheet .ss-badge { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; font-size: 13px; flex-shrink: 0; }
.vh-sheet .ss-badge.keep { background: var(--keep); color: var(--paper-2); }
.vh-sheet .ss-badge.replace { background: var(--paper-2); border: 2px solid var(--replace); color: var(--replace); font-weight: 700; }
.vh-sheet .ss-tx { flex: 1; min-width: 0; }
.vh-sheet .ss-o { font-family: var(--mono); font-size: 8px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
.vh-sheet .ss-n { font-family: var(--serif); font-size: 13px; font-weight: 600; color: var(--ink); }
.vh-sheet .ss-pct { font-family: var(--serif); font-weight: 600; font-size: 16px; }

/* blind rep card in front */
.vh-rcard {
  position: absolute; left: 0; bottom: 0; width: 300px; background: var(--paper-2);
  border: 1px solid var(--rule); border-radius: 13px; box-shadow: 0 30px 60px -30px oklch(0.20 0.03 255 / 0.55);
  overflow: hidden; transform: rotate(-2deg);
}
.vh-rcard .vh-rstrip { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-bottom: 1px solid var(--rule-2); }
.vh-rcard .vh-rstrip .o { font-family: var(--mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: var(--tag-bg); color: var(--ink-2); padding: 2px 7px; border-radius: 4px; }
.vh-rcard .vh-rstrip .up { margin-left: auto; font-family: var(--mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--replace); }
.vh-rcard .vh-rhead { display: flex; align-items: center; gap: 11px; padding: 13px 14px 10px; }
.vh-rcard .vh-rav { width: 38px; height: 38px; border-radius: 9px; background: var(--tag-bg); display: grid; place-items: center; font-family: var(--serif); font-weight: 600; font-size: 18px; color: var(--ink-3); flex-shrink: 0; }
.vh-rcard .vh-rwho .b { font-family: var(--serif); font-size: 15px; font-weight: 600; color: var(--ink); line-height: 1.1; }
.vh-rcard .vh-rwho .s { font-size: 10.5px; color: var(--ink-3); margin-top: 1px; }
.vh-rcard .vh-ralign { margin: 0 14px; padding: 11px 13px; border-radius: 10px; background: var(--paper); border: 1px solid var(--rule-2); }
.vh-rcard .vh-ratop { display: flex; align-items: baseline; justify-content: space-between; }
.vh-rcard .vh-ratop .lab { font-family: var(--mono); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
.vh-rcard .vh-ratop .pct { font-family: var(--serif); font-weight: 600; font-size: 24px; color: var(--replace); line-height: 1; }
.vh-rcard .vh-rbars { margin-top: 10px; display: grid; gap: 6px; }
.vh-rcard .vh-rbar { display: grid; grid-template-columns: 1fr 64px; gap: 9px; align-items: center; }
.vh-rcard .vh-rbar .k { font-size: 10.5px; color: var(--ink-2); }
.vh-rcard .vh-rbar .t { height: 5px; border-radius: 999px; background: var(--rule-2); overflow: hidden; }
.vh-rcard .vh-rbar .t i { display: block; height: 100%; }
.vh-rcard .vh-rverd { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 14px 14px; }
.vh-rcard .vh-vb { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 9px; font-size: 11.5px; font-weight: 600; border: 1.5px solid; }
.vh-rcard .vh-vb.keep { background: var(--keep); border-color: var(--keep); color: var(--paper-2); }
.vh-rcard .vh-vb.replace { background: var(--paper); border-color: var(--replace); color: var(--replace); }

/* ---------- headline-voice comparison artboard ---------- */
.hv { height: 100%; background: var(--paper); padding: 26px 34px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; }
.hv-lead { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.hv-lead h2 { font-family: var(--serif); font-size: 19px; font-weight: 600; margin: 0; color: var(--ink); letter-spacing: -0.01em; }
.hv-lead p { font-size: 13px; color: var(--ink-3); margin: 0; }
.hv-grid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; min-height: 0; }
.hv-card { border: 1px solid var(--rule); border-radius: 13px; background: var(--paper-2); box-shadow: var(--shadow-soft); padding: 22px 22px 20px; display: flex; flex-direction: column; }
.hv-card.pick { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-soft), var(--shadow-soft); }
.hv-tag { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--ink-3); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
.hv-tag .star { color: var(--replace); }
.hv-card.pick .hv-tag { color: var(--brand); }
.hv-h { font-family: var(--serif); font-weight: 600; font-size: 28px; line-height: 1.05; letter-spacing: -0.02em; color: var(--ink); margin: 0 0 12px; text-wrap: balance; }
.hv-h em { font-style: italic; color: var(--brand); }
.hv-h .red { color: var(--replace); font-style: normal; }
.hv-sub { font-size: 12.5px; color: var(--ink-3); line-height: 1.45; margin: 0 0 auto; }
.hv-note { font-family: var(--mono); font-size: 10px; color: var(--ink-3); line-height: 1.4; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--rule-2); }
.hv-note b { color: var(--ink-2); }
```

=== FILE: whynow.css (part 1 of 1) ===
```css
/* ====================================================
   VOTER CHOICE · "Why Now?" page (card 9031f1ce)
   Long-form editorial on the Bold Flag white ground. Houses the two
   fact snippets pulled off the homepage hero and makes the larger
   case in three movements: the problem (money) → the moment (2026)
   → how the app answers it. Pairs with the "Why now" nav link.
   ==================================================== */

.wn { background: var(--paper); color: var(--ink); min-height: 100%; display: flex; flex-direction: column; }
/* this page is long-form — let its screen grow instead of clipping at 100% */
.screen:has(.wn) { height: auto; min-height: 100%; overflow: visible; }
.wn .flagbar { flex: 0 0 auto; }
.wn-main { width: 100%; }

/* ---- page masthead ---- */
.wn-mast { padding: 54px 0 40px; border-bottom: 2px solid var(--ink); margin: 0 90px; text-align: center; }
.wn-mast .ey { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.wn-mast h1 { font-family: var(--serif); font-weight: 600; font-size: 76px; line-height: 0.96; letter-spacing: -0.035em; margin: 0; color: var(--ink); }
.wn-mast h1 em { font-style: italic; color: var(--brand); }
.wn-mast .dek { font-family: var(--serif); font-size: 21px; line-height: 1.45; color: var(--ink-2); margin: 18px auto 0; max-width: 660px; text-wrap: balance; }

/* ---- section scaffold ---- */
.wn-sec { padding: 52px 90px; border-bottom: 1px solid var(--rule-2); }
.wn-sec.alt { background: var(--paper-2); }
.wn-sec.brand { background: var(--brand); color: oklch(0.96 0.02 262); border-bottom: none; }
.wn-kicker { font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; color: var(--replace); margin-bottom: 14px; display: flex; align-items: center; gap: 12px; }
.wn-kicker::before { content: ""; width: 26px; height: 2px; background: var(--replace); }
.wn-sec.brand .wn-kicker { color: var(--gold); }
.wn-sec.brand .wn-kicker::before { background: var(--gold); }
.wn-h2 { font-family: var(--serif); font-weight: 600; font-size: 42px; line-height: 1.06; letter-spacing: -0.02em; margin: 0 0 22px; color: var(--ink); text-wrap: balance; max-width: 880px; }
.wn-sec.brand .wn-h2 { color: oklch(0.99 0.01 262); max-width: 940px; }
.wn-h2 em { font-style: italic; color: var(--brand); }
.wn-sec.brand .wn-h2 em { color: var(--gold); font-style: normal; }

.wn-cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: 48px; align-items: start; }
.wn-body { font-size: 17.5px; line-height: 1.62; color: var(--ink-2); max-width: 620px; }
.wn-body p { margin: 0 0 16px; }
.wn-body p:last-child { margin-bottom: 0; }
.wn-body b { color: var(--ink); font-weight: 600; }
.wn-body .lead-in { font-variant: small-caps; letter-spacing: 0.03em; font-weight: 600; color: var(--ink); font-size: 0.92em; }
.wn-sec.brand .wn-body { color: oklch(0.92 0.02 262); }
.wn-sec.brand .wn-body b { color: oklch(1 0 0); }

/* ---- the two fact stats (rehomed from the hero) ---- */
.wn-stats { display: grid; gap: 18px; }
.wn-stat { border: 1px solid var(--rule); border-radius: 14px; background: var(--paper); padding: 22px 24px; box-shadow: var(--shadow-soft); }
.wn-stat.red { border-color: oklch(0.80 0.10 27); }
.wn-stat .v { font-family: var(--serif); font-weight: 600; font-size: 60px; line-height: 0.92; letter-spacing: -0.03em; color: var(--brand); }
.wn-stat.red .v { color: var(--replace); }
.wn-stat .v small { font-size: 22px; font-weight: 500; letter-spacing: 0; margin-left: 4px; color: var(--ink-3); }
.wn-stat .l { font-size: 14px; line-height: 1.5; color: var(--ink-2); margin-top: 12px; }
.wn-stat .cite { font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--rule-2); }

/* ---- pull quote ---- */
.wn-pull { font-family: var(--serif); font-weight: 500; font-size: 34px; line-height: 1.22; letter-spacing: -0.015em; color: var(--ink); max-width: 900px; margin: 0; text-wrap: balance; }
.wn-pull em { font-style: italic; color: var(--brand); }
.wn-pull .src { display: block; font-family: var(--mono); font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-top: 20px; }

/* ---- "why now" moment — big ballot facts on the brand ground ---- */
.wn-ballot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 36px; border: 1px solid oklch(1 0 0 / 0.16); border-radius: 14px; overflow: hidden; }
.wn-ballot .cell { padding: 26px 24px; }
.wn-ballot .cell + .cell { border-left: 1px solid oklch(1 0 0 / 0.16); }
.wn-ballot .v { font-family: var(--serif); font-weight: 600; font-size: 52px; line-height: 0.95; letter-spacing: -0.03em; color: oklch(1 0 0); }
.wn-ballot .v.gold { color: var(--gold); }
.wn-ballot .l { font-size: 13.5px; line-height: 1.45; color: oklch(0.90 0.02 262); margin-top: 10px; }

/* ---- how it works — three steps ---- */
.wn-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 8px; }
.wn-step { border: 1px solid var(--rule); border-radius: 14px; background: var(--paper); padding: 26px 24px; box-shadow: var(--shadow-soft); position: relative; overflow: hidden; }
.wn-step::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--brand); }
.wn-step:nth-child(2)::before { background: var(--gold); }
.wn-step:nth-child(3)::before { background: var(--replace); }
.wn-step .n { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--paper-2); background: var(--brand); width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; margin-bottom: 16px; }
.wn-step:nth-child(2) .n { background: var(--gold); color: var(--ink); }
.wn-step:nth-child(3) .n { background: var(--replace); }
.wn-step h3 { font-family: var(--serif); font-weight: 600; font-size: 22px; letter-spacing: -0.01em; margin: 0 0 8px; color: var(--ink); }
.wn-step p { font-size: 14.5px; line-height: 1.55; color: var(--ink-3); margin: 0; }
.wn-step .tag { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand); font-weight: 700; margin-top: 14px; display: inline-block; }

/* ---- closing CTA ---- */
.wn-cta { padding: 60px 90px; text-align: center; background: var(--paper-2); }
.wn-cta h2 { font-family: var(--serif); font-weight: 600; font-size: 40px; letter-spacing: -0.02em; margin: 0 0 12px; color: var(--ink); text-wrap: balance; }
.wn-cta p { font-size: 16px; color: var(--ink-2); margin: 0 auto 26px; max-width: 540px; }
.wn-cta .btn-primary { font-size: 16px; padding: 16px 26px; min-height: 56px; }
.wn-cta .sub { font-family: var(--mono); font-size: 11px; color: var(--ink-3); margin-top: 16px; letter-spacing: 0.02em; }
```

=== FILE: statics.css (part 1 of 1) ===
```css
/* ====================================================
   VOTER CHOICE · static / top-level pages (cards b1a5f64a, c9891a1f
   + "roll the editorial template everywhere")
   Applies the Why-Now editorial system (masthead + kicker + prose +
   grounds) to About / How it works / Privacy / Tip jar, plus a Bold
   Flag loading state and the reorganized footer. White ground.
   ==================================================== */

.sp { background: var(--paper); color: var(--ink); min-height: 100%; display: flex; flex-direction: column; }
.sp .flagbar { flex: 0 0 auto; }
.screen:has(.sp) { height: auto; min-height: 100%; overflow: visible; }
.sp-body { flex: 1; }
.sp-wrap { max-width: 840px; margin: 0 auto; padding: 0 40px; }

/* back affordance */
.sp-back { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--brand); margin: 28px 0 0; cursor: pointer; }

/* masthead (left-aligned doc variant of the Why-Now mast) */
.sp-mast { padding: 22px 0 26px; border-bottom: 2px solid var(--ink); margin-bottom: 34px; }
.sp-kicker { font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; color: var(--replace); margin-bottom: 14px; display: flex; align-items: center; gap: 12px; }
.sp-kicker::before { content: ""; width: 26px; height: 2px; background: var(--replace); }
.sp-mast h1 { font-family: var(--serif); font-weight: 600; font-size: 50px; line-height: 1.02; letter-spacing: -0.03em; margin: 0; color: var(--ink); text-wrap: balance; }
.sp-mast h1 em { font-style: italic; color: var(--brand); }
.sp-mast .dek { font-family: var(--serif); font-size: 19px; line-height: 1.45; color: var(--ink-2); margin: 16px 0 0; max-width: 640px; }

/* prose */
.sp-prose { padding-bottom: 50px; }
.sp-prose > p { font-family: var(--serif); font-size: 17px; line-height: 1.64; color: var(--ink-2); margin: 0 0 18px; }
.sp-prose > p b, .sp-prose li b { color: var(--ink); font-weight: 600; }
.sp-prose h2 { font-family: var(--serif); font-weight: 600; font-size: 25px; letter-spacing: -0.015em; color: var(--ink); margin: 34px 0 12px; padding-top: 2px; }
.sp-prose ul { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 10px; }
.sp-prose li { font-family: var(--serif); font-size: 16.5px; line-height: 1.55; color: var(--ink-2); padding-left: 26px; position: relative; }
.sp-prose li::before { content: ""; position: absolute; left: 6px; top: 11px; width: 7px; height: 7px; border-radius: 2px; background: var(--brand); transform: rotate(45deg); }
.sp-prose a { color: var(--brand); text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px; }
.sp-prose code { font-family: var(--mono); font-size: 0.86em; background: var(--tag-bg); padding: 1px 6px; border-radius: 5px; color: var(--ink); }
.sp-prose .sp-meta { font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin: 0 0 24px; }

/* step blocks reuse — a numbered editorial step inside prose */
.sp-step { display: grid; grid-template-columns: 38px 1fr; gap: 16px; padding: 18px 0; border-top: 1px solid var(--rule-2); }
.sp-step .n { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--paper-2); background: var(--brand); width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; }
.sp-step:nth-child(even) .n { background: var(--gold); color: var(--ink); }
.sp-step h3 { font-family: var(--serif); font-weight: 600; font-size: 19px; margin: 4px 0 6px; color: var(--ink); letter-spacing: -0.01em; }
.sp-step p { font-family: var(--serif); font-size: 16px; line-height: 1.55; color: var(--ink-2); margin: 0; }
.sp-step a { color: var(--brand); }

/* tip jar amounts */
.sp-tips { display: flex; gap: 12px; flex-wrap: wrap; margin: 4px 0 12px; }
.sp-tip { min-width: 96px; text-align: center; padding: 16px 22px; border-radius: 12px; border: 1.5px solid var(--rule); background: var(--paper-2); font-family: var(--serif); font-weight: 600; font-size: 22px; color: var(--ink); cursor: pointer; text-decoration: none; box-shadow: var(--shadow-soft); }
.sp-prose a.sp-tip { text-decoration: none; }
.sp-tip:hover { border-color: var(--brand); color: var(--brand); }
.sp-tip.lead { background: var(--brand); color: var(--paper-2); border-color: var(--brand); }
.sp-tipnote { font-family: var(--mono); font-size: 11px; color: var(--ink-3); margin: 0 0 8px; }

/* ---------- reorganized footer (b1a5f64a · c9891a1f) ---------- */
.vc-foot { border-top: 1px solid var(--rule); background: var(--paper-2); padding: 26px 54px; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.vc-foot-brand { display: flex; flex-direction: column; gap: 4px; }
.vc-foot-brand .b { display: flex; align-items: center; gap: 9px; font-family: var(--serif); font-weight: 600; font-size: 17px; color: var(--ink); white-space: nowrap; }
.vc-foot-brand .b .mark { width: 22px; height: 22px; background: var(--brand); color: var(--paper-2); display: grid; place-items: center; border-radius: 5px; font-family: var(--serif); font-weight: 600; font-size: 13px; position: relative; overflow: hidden; }
.vc-foot-brand .b .mark::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--replace); }
.vc-foot-brand .c { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.04em; color: var(--ink-3); }
.vc-foot-links { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.vc-foot-links a { font-size: 13px; color: var(--ink-2); text-decoration: none; cursor: pointer; }
.vc-foot-links a:hover { color: var(--brand); }
.vc-foot-links .sep { width: 1px; height: 12px; background: var(--rule); }

/* ---------- Bold Flag loading state ---------- */
.ldg { height: 100%; display: flex; flex-direction: column; background: var(--paper); }
.ldg .flagbar { flex: 0 0 auto; }
.ldg-body { flex: 1; display: grid; place-items: center; padding: 40px; min-height: 0; }
.ldg-card { width: 100%; max-width: 460px; background: var(--paper-2); border: 1px solid var(--rule); border-radius: 16px; box-shadow: var(--shadow-card); padding: 34px 36px; position: relative; overflow: hidden; }
.ldg-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--brand) 0 50%, var(--replace) 50% 100%); }
.ldg-pulse { width: 40px; height: 40px; border-radius: 11px; background: var(--brand-soft); border: 1px solid var(--rule-2); display: grid; place-items: center; margin-bottom: 18px; }
.ldg-pulse i { width: 14px; height: 14px; border-radius: 50%; background: var(--brand); }
.ldg-card h2 { font-family: var(--serif); font-weight: 600; font-size: 28px; letter-spacing: -0.02em; margin: 0 0 5px; color: var(--ink); }
.ldg-addr { font-family: var(--mono); font-size: 12px; color: var(--ink-3); margin-bottom: 22px; }
.ldg-steps { display: grid; gap: 12px; }
.ldg-step { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--ink-3); }
.ldg-step .ck { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--rule); flex-shrink: 0; display: grid; place-items: center; font-size: 11px; }
.ldg-step.done { color: var(--ink-2); }
.ldg-step.done .ck { background: var(--keep); border-color: var(--keep); color: var(--paper-2); }
.ldg-step.active { color: var(--ink); font-weight: 600; }
.ldg-step.active .ck { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-soft); }
```

=== FILE: intake.css (part 1 of 1) ===
```css
/* ====================================================
   VOTER CHOICE · "Defining your issues" — end-to-end flow
   (intake cold-open → propose + BOUNDED disambiguation → locked,
    then the seeded edit-issues modal → re-score delta)
   Cards 6cdedfa6 (≤2 clarifying Qs then lock), ef8d602c, 9143a622
   (jurisdiction inline). Bold Flag white ground. The disambiguation
   is resolved in ONE tap via chips — not an open-ended back-and-forth.
   ==================================================== */

.iq { height: 100%; display: flex; flex-direction: column; background: var(--paper); overflow: hidden; }
.iq .flagbar { flex: 0 0 auto; }
.iq-ctx { display: flex; align-items: center; gap: 12px; padding: 10px 30px; border-bottom: 1px solid var(--rule-2); background: var(--paper-2); }
.iq-ctx .b { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
.iq-ctx .step { margin-left: auto; font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--brand); }

.iq-stage { flex: 1; overflow: hidden; display: flex; justify-content: center; padding: 26px 30px; min-height: 0; }
.iq-conv { width: 100%; max-width: 760px; display: flex; flex-direction: column; min-height: 0; }

/* chat bubbles */
.iq-msg { margin-bottom: 16px; max-width: 92%; }
.iq-msg.user { margin-left: auto; text-align: right; }
.iq-who { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--ink-3); margin-bottom: 6px; }
.iq-msg.user .iq-who { color: var(--brand); }
.iq-bubble { font-family: var(--serif); font-size: 17px; line-height: 1.5; color: var(--ink); }
.iq-msg.ai .iq-bubble { color: var(--ink); }
.iq-msg.ai .iq-bubble b { color: var(--ink); font-weight: 600; }
.iq-msg.user .iq-bubble { display: inline-block; background: var(--brand-soft); border: 1px solid oklch(0.84 0.05 262); color: var(--brand-2); padding: 11px 16px; border-radius: 14px 14px 4px 14px; font-family: var(--sans); font-size: 14.5px; line-height: 1.45; text-align: left; max-width: 460px; }

/* the proposed-issues / editable card */
.iq-card { border: 1px solid var(--rule); border-radius: 14px; background: var(--paper-2); box-shadow: var(--shadow-soft); overflow: hidden; margin: 4px 0 14px; }
.iq-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 14px 18px 12px; border-bottom: 1px solid var(--rule-2); }
.iq-card-head h4 { font-family: var(--serif); font-size: 17px; font-weight: 600; margin: 0; color: var(--ink); }
.iq-card-head .of { font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); }
.iq-card-sub { font-size: 12px; color: var(--ink-3); padding: 9px 18px 4px; }
.iq-rows { padding: 6px 12px 12px; display: flex; flex-direction: column; gap: 7px; }
.iq-row { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border: 1px solid var(--rule-2); border-radius: 11px; background: var(--paper); }
.iq-row.added { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-soft); }
.iq-grip { color: var(--rule); font-size: 14px; cursor: grab; letter-spacing: -2px; }
.iq-rank { font-family: var(--serif); font-weight: 600; font-size: 15px; color: var(--ink-3); width: 16px; text-align: center; }
.iq-name { flex: 1; min-width: 0; font-size: 14.5px; font-weight: 500; color: var(--ink); }
.iq-name .you { font-family: var(--mono); font-size: 10px; color: var(--ink-3); display: block; margin-top: 2px; font-weight: 400; }
.iq-juris { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
.iq-juris.fed { background: var(--brand-soft); color: var(--brand-2); }
.iq-juris.state { background: oklch(0.93 0.05 78); color: oklch(0.46 0.10 70); }
.iq-act { width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--rule-2); background: var(--paper-2); color: var(--ink-3); display: grid; place-items: center; font-size: 12px; cursor: pointer; }
.iq-acts { display: flex; gap: 5px; }
.iq-newtag { font-family: var(--mono); font-size: 8px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--brand); background: var(--brand-soft); padding: 2px 6px; border-radius: 999px; }

/* ---- conversational QUICK REPLIES (optional shortcuts under the AI's
   question) — the conversation + composer stay the primary path; these
   are just tappable suggested replies, never a forced multiple-choice ---- */
.iq-quick { margin: 0 0 14px; padding-left: 2px; }
.iq-quick-lab { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; margin-bottom: 9px; display: flex; align-items: center; gap: 9px; }
.iq-quick-lab::after { content: ""; flex: 1; height: 1px; background: var(--rule-2); }

/* composer inside the edit modal, so amending stays a conversation */
.amd-conv { margin-top: 6px; }
.amd-composer { display: flex; gap: 9px; align-items: flex-end; margin-top: 12px; }
.amd-composer textarea { flex: 1; font-family: var(--sans); font-size: 13.5px; color: var(--ink); padding: 11px 13px; border: 1px solid var(--rule); border-radius: 10px; background: var(--paper); resize: none; min-height: 46px; line-height: 1.4; }
.amd-composer textarea::placeholder { color: var(--ink-3); }
.amd-composer .iq-send { min-height: 46px; }

/* ---- the BOUNDED disambiguation card (legacy, unused) ---- */
.iq-disam { border: 1.5px solid var(--gold); border-radius: 14px; background: oklch(0.99 0.012 86); box-shadow: var(--shadow-soft); padding: 16px 18px 16px; margin: 2px 0 14px; }
.iq-disam-k { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: oklch(0.55 0.12 70); display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }
.iq-disam-k::before { content: "?"; width: 16px; height: 16px; border-radius: 50%; background: var(--gold); color: var(--ink); display: grid; place-items: center; font-size: 11px; font-weight: 700; }
.iq-disam-q { font-family: var(--serif); font-size: 17px; line-height: 1.4; color: var(--ink); margin: 0 0 14px; }
.iq-disam-q b { font-weight: 600; }
.iq-opts { display: flex; flex-wrap: wrap; gap: 8px; }
.iq-opt { font-family: var(--sans); font-size: 13.5px; font-weight: 500; color: var(--ink); background: var(--paper-2); border: 1.5px solid var(--rule); border-radius: 999px; padding: 9px 16px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
.iq-opt:hover { border-color: var(--brand); color: var(--brand); }
.iq-opt.multi { border-style: dashed; color: var(--ink-2); }
.iq-opt .jt { font-family: var(--mono); font-size: 8px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); }
.iq-disam-alt { margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--rule-2); font-size: 12.5px; color: var(--ink-3); }
.iq-disam-alt a { color: var(--brand); font-weight: 600; cursor: pointer; }
.iq-disam-cap { font-family: var(--mono); font-size: 9px; letter-spacing: 0.04em; color: var(--ink-3); margin-top: 10px; }

/* locked summary + composer */
.iq-locked { display: flex; align-items: center; gap: 13px; padding: 14px 16px; border-radius: 13px; background: var(--keep-soft); border: 1px solid oklch(0.66 0.10 159); margin: 2px 0 14px; }
.iq-locked .tick { width: 28px; height: 28px; border-radius: 50%; background: var(--keep); color: var(--paper-2); display: grid; place-items: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.iq-locked .lt { font-family: var(--serif); font-size: 16px; font-weight: 600; color: var(--ink); }
.iq-locked .ls { font-family: var(--mono); font-size: 10.5px; color: var(--ink-2); margin-top: 1px; }
.iq-locked .jbreak { margin-left: auto; display: flex; gap: 6px; }

.iq-foot { flex: 0 0 auto; border-top: 1px solid var(--rule-2); background: var(--paper-2); padding: 14px 30px; }
.iq-foot-inner { max-width: 760px; margin: 0 auto; }
.iq-chips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 10px; }
.iq-chip { font-family: var(--sans); font-size: 12.5px; color: var(--ink-2); background: var(--paper); border: 1px solid var(--rule); border-radius: 999px; padding: 7px 13px; cursor: pointer; }
.iq-chip:hover { border-color: var(--brand); color: var(--brand); }
.iq-composer { display: flex; gap: 10px; align-items: flex-end; }
.iq-composer textarea, .iq-composer input { flex: 1; font-family: var(--sans); font-size: 14px; color: var(--ink); padding: 13px 15px; border: 1px solid var(--rule); border-radius: 11px; background: var(--paper); resize: none; min-height: 50px; line-height: 1.4; }
.iq-composer textarea::placeholder { color: var(--ink-3); }
.iq-send { background: var(--brand); color: var(--paper-2); border: none; border-radius: 11px; font-family: var(--sans); font-weight: 600; font-size: 14px; padding: 0 20px; min-height: 50px; cursor: pointer; white-space: nowrap; box-shadow: var(--shadow-soft); }
.iq-lock { width: 100%; justify-content: center; }
.iq-privacy { font-family: var(--mono); font-size: 10px; color: var(--ink-3); margin-top: 9px; text-align: center; }
.iq-privacy .dot { color: var(--keep); }

/* big cold-open ask */
.iq-ask { display: flex; flex-direction: column; justify-content: center; height: 100%; max-width: 700px; margin: 0 auto; }
.iq-ask .ask-k { margin-bottom: 16px; }
.iq-ask h1 { font-family: var(--serif); font-weight: 600; font-size: 38px; line-height: 1.08; letter-spacing: -0.02em; margin: 0 0 12px; color: var(--ink); text-wrap: balance; }
.iq-ask h1 em { font-style: italic; color: var(--brand); }
.iq-ask p { font-family: var(--serif); font-size: 17px; line-height: 1.5; color: var(--ink-2); margin: 0 0 24px; max-width: 560px; }

/* ============ EDIT-ISSUES MODAL (seeded) ============ */
.amd-back { position: absolute; inset: 0; background: var(--paper); overflow: hidden; }
.amd-back .res-context, .amd-back .res-tier, .amd-back .rcard, .amd-back .res-rail { filter: blur(2px); opacity: 0.5; }
.amd-overlay { position: absolute; inset: 0; background: oklch(0.20 0.03 260 / 0.42); display: grid; place-items: center; padding: 30px; }
.amd-modal { width: 100%; max-width: 620px; max-height: 100%; background: var(--paper); border-radius: 16px; box-shadow: 0 40px 80px -30px oklch(0.20 0.03 255 / 0.6); overflow: hidden; display: flex; flex-direction: column; }
.amd-modal .flagbar { flex: 0 0 auto; }
.amd-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 18px 22px 14px; border-bottom: 1px solid var(--rule-2); }
.amd-eyebrow { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; color: var(--brand); }
.amd-head h3 { font-family: var(--serif); font-size: 22px; font-weight: 600; letter-spacing: -0.01em; margin: 5px 0 0; color: var(--ink); }
.amd-x { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--rule); background: var(--paper-2); color: var(--ink-3); font-size: 17px; cursor: pointer; flex-shrink: 0; }
.amd-body { padding: 16px 22px; overflow: hidden; }
.amd-lede { font-size: 13px; color: var(--ink-3); line-height: 1.5; margin: 0 0 14px; }
.amd-foot { border-top: 1px solid var(--rule-2); padding: 14px 22px; display: flex; align-items: center; justify-content: space-between; gap: 14px; background: var(--paper-2); }
.amd-cancel { font-size: 13px; color: var(--ink-3); background: none; border: none; cursor: pointer; }
.amd-apply { background: var(--brand); color: var(--paper-2); border: none; border-radius: 10px; font-family: var(--sans); font-weight: 600; font-size: 14px; padding: 12px 20px; min-height: 46px; cursor: pointer; box-shadow: var(--shadow-soft); }

/* ============ re-score delta ============ */
.iq-delta { border: 1px solid var(--rule); border-radius: 14px; background: var(--paper-2); box-shadow: var(--shadow-soft); overflow: hidden; max-width: 700px; margin: 0 auto; }
.iq-delta-head { padding: 16px 20px; border-bottom: 1px solid var(--rule-2); }
.iq-delta-head .k { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: var(--brand); }
.iq-delta-head h3 { font-family: var(--serif); font-size: 19px; font-weight: 600; margin: 5px 0 0; color: var(--ink); }
.ad-list { padding: 8px 12px; display: flex; flex-direction: column; gap: 7px; }
.ad-row { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border: 1px solid var(--rule-2); border-radius: 11px; background: var(--paper); }
.ad-row.significant { border-color: var(--gold); }
.ad-race { flex: 1; min-width: 0; }
.ad-tag { font-family: var(--mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: oklch(0.55 0.12 70); }
.ad-name { font-family: var(--serif); font-size: 15px; font-weight: 600; color: var(--ink); margin-top: 1px; }
.ad-score { display: flex; align-items: center; gap: 9px; }
.ad-old { font-family: var(--mono); font-size: 12px; color: var(--ink-3); }
.ad-arrow { font-size: 14px; font-weight: 700; }
.ad-arrow.up { color: var(--keep); } .ad-arrow.down { color: var(--replace); }
.ad-new { font-family: var(--serif); font-weight: 600; font-size: 17px; }
.ad-new.up { color: var(--keep); } .ad-new.down { color: var(--replace); }
.ad-revisit { font-family: var(--sans); font-size: 12.5px; font-weight: 600; color: var(--brand); border: 1px solid var(--rule); background: var(--paper-2); border-radius: 8px; padding: 8px 13px; cursor: pointer; white-space: nowrap; }
.ad-foot { padding: 11px 20px 16px; font-size: 12px; color: var(--ink-3); line-height: 1.5; }
```

=== FILE: polis.css (part 1 of 1) ===
```css
/* ====================================================
   VOTER CHOICE · Polis — "Where we agree" (card bc774728)
   NOT a nav tab. Two surfaces:
     · CONTRIBUTE — the post-decision "Where you stand" moment
       (earned, optional, anonymous) where a voter reacts to a few
       statements right after finishing their scorecard.
     · DISPLAY — the "Where America agrees" finding/report, an
       editorial artifact for the foot of the Why-Now page + sharing.
   The depolarizing move: consensus statements whose party lines
   (D · R · I) CONVERGE — not a scatter. Bold Flag white ground.
   ==================================================== */

/* ---------- CONTRIBUTE · post-decision "Where you stand" ---------- */
.ps { height: 100%; display: flex; flex-direction: column; background: var(--paper); overflow: hidden; }
.ps .flagbar { flex: 0 0 auto; }
.ps-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; align-items: center; padding: 30px 30px 0; min-height: 0; }
.ps-inner { width: 100%; max-width: 720px; }
.ps-k { margin-bottom: 14px; }
.ps-h1 { font-family: var(--serif); font-weight: 600; font-size: 38px; line-height: 1.06; letter-spacing: -0.022em; margin: 0 0 12px; color: var(--ink); text-wrap: balance; }
.ps-h1 em { font-style: italic; color: var(--brand); }
.ps-lede { font-family: var(--serif); font-size: 17.5px; line-height: 1.5; color: var(--ink-2); margin: 0 0 24px; max-width: 600px; }

.ps-cards { display: flex; flex-direction: column; gap: 12px; }
.ps-stmt { border: 1px solid var(--rule); border-radius: 14px; background: var(--paper-2); box-shadow: var(--shadow-soft); padding: 18px 20px; }
.ps-stmt.voted { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-soft); }
.ps-stmt .q { font-family: var(--serif); font-size: 19px; font-weight: 500; line-height: 1.32; color: var(--ink); margin: 0 0 14px; }
.ps-react { display: flex; gap: 9px; }
.ps-btn { flex: 1; min-height: 46px; border-radius: 10px; font-family: var(--sans); font-weight: 600; font-size: 14px; cursor: pointer; border: 1.5px solid var(--rule); background: var(--paper); color: var(--ink-2); display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.ps-btn.agree:hover { border-color: var(--keep); color: var(--keep); }
.ps-btn.disagree:hover { border-color: var(--replace); color: var(--replace); }
.ps-btn.pass { flex: 0 0 auto; padding: 0 16px; color: var(--ink-3); }
.ps-btn.chosen { background: var(--keep); border-color: var(--keep); color: var(--paper-2); }
.ps-btn.chosen-no { background: var(--paper); border-color: var(--replace); color: var(--replace); }
.ps-recorded { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--rule-2); font-size: 12.5px; color: var(--ink-3); line-height: 1.5; }
.ps-recorded .rk { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--keep); margin-right: 7px; }

/* revealed result on a voted statement — the convergence read */
.ps-result { margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--rule-2); }
.ps-result .rtop { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.ps-result .rpct { font-family: var(--serif); font-weight: 600; font-size: 28px; line-height: 1; color: var(--keep); }
.ps-result .rlab { font-size: 13px; color: var(--ink-2); }
.ps-result .rlab b { color: var(--ink); }

/* convergence bar — D/R/I markers clustered on a shared track */
.conv { position: relative; height: 30px; margin: 4px 0 8px; }
.conv-track { position: absolute; top: 13px; left: 0; right: 0; height: 4px; border-radius: 999px; background: var(--rule-2); }
.conv-fill { position: absolute; top: 13px; left: 0; height: 4px; border-radius: 999px; background: oklch(0.86 0.06 159); }
.conv-dot { position: absolute; top: 6px; width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid var(--paper-2); transform: translateX(-50%); box-shadow: 0 2px 6px -1px oklch(0.2 0.03 255 / 0.35); }
.conv-dot.d { background: var(--brand); }
.conv-dot.r { background: var(--replace); }
.conv-dot.i { background: var(--gold); }
.conv-scale { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 9px; color: var(--ink-3); margin-top: 2px; }
.conv-key { display: flex; gap: 14px; margin-top: 9px; }
.conv-key span { font-family: var(--mono); font-size: 10px; color: var(--ink-2); display: inline-flex; align-items: center; gap: 6px; }
.conv-key i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.conv-key i.d { background: var(--brand); } .conv-key i.r { background: var(--replace); } .conv-key i.i { background: var(--gold); }

.ps-foot { flex: 0 0 auto; border-top: 1px solid var(--rule-2); background: var(--paper-2); padding: 16px 30px; }
.ps-foot-inner { max-width: 720px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
.ps-foot .btn-primary { min-height: 50px; }
.ps-foot .later { margin-left: auto; font-size: 13.5px; color: var(--ink-3); background: none; border: none; cursor: pointer; }
.ps-foot .prog { font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); }

/* ---------- DISPLAY · "Where America agrees" report ---------- */
.pr { background: var(--paper); min-height: 100%; display: flex; flex-direction: column; }
.pr .flagbar { flex: 0 0 auto; }
.screen:has(.pr) { height: auto; min-height: 100%; overflow: visible; }
.pr-wrap { max-width: 860px; margin: 0 auto; padding: 0 40px; width: 100%; }
.pr-mast { padding: 44px 0 28px; border-bottom: 2px solid var(--ink); margin-bottom: 30px; }
.pr-kicker { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; color: var(--replace); margin-bottom: 14px; display: flex; align-items: center; gap: 12px; }
.pr-kicker::before { content: ""; width: 26px; height: 2px; background: var(--replace); }
.pr-mast h1 { font-family: var(--serif); font-weight: 600; font-size: 52px; line-height: 1.0; letter-spacing: -0.03em; margin: 0; color: var(--ink); text-wrap: balance; }
.pr-mast h1 em { font-style: italic; color: var(--brand); }
.pr-lede { font-family: var(--serif); font-size: 19px; line-height: 1.5; color: var(--ink-2); margin: 16px 0 0; max-width: 660px; }

.pr-list { display: flex; flex-direction: column; }
.pr-row { padding: 24px 0; border-bottom: 1px solid var(--rule-2); display: grid; grid-template-columns: 1fr 300px; gap: 36px; align-items: center; }
.pr-q { font-family: var(--serif); font-size: 22px; font-weight: 500; line-height: 1.3; color: var(--ink); }
.pr-q .src { display: block; font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-top: 8px; }
.pr-stat { text-align: left; }
.pr-pct { font-family: var(--serif); font-weight: 600; font-size: 44px; line-height: 1; color: var(--keep); letter-spacing: -0.02em; }
.pr-pct .ag { font-family: var(--mono); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-left: 8px; }
.pr-conv { margin-top: 14px; }
.pr-split { display: flex; gap: 8px; margin-top: 10px; }
.pr-split .chip { font-family: var(--mono); font-size: 10px; font-weight: 600; padding: 4px 9px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
.pr-split .chip i { width: 7px; height: 7px; border-radius: 50%; }
.pr-split .chip.d { background: var(--brand-soft); color: var(--brand-2); } .pr-split .chip.d i { background: var(--brand); }
.pr-split .chip.r { background: var(--replace-soft); color: oklch(0.47 0.17 27); } .pr-split .chip.r i { background: var(--replace); }
.pr-split .chip.i { background: oklch(0.93 0.05 78); color: oklch(0.46 0.10 70); } .pr-split .chip.i i { background: var(--gold); }

.pr-foot { padding: 26px 0 44px; display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.pr-foot .meta { font-family: var(--mono); font-size: 11px; color: var(--ink-3); line-height: 1.6; }
.pr-foot .meta b { color: var(--ink-2); }
.pr-share { display: inline-flex; align-items: center; gap: 9px; background: var(--brand); color: var(--paper-2); border: none; border-radius: 10px; font-family: var(--sans); font-weight: 600; font-size: 14px; padding: 13px 20px; min-height: 48px; cursor: pointer; box-shadow: var(--shadow-soft); }
.pr-note { font-family: var(--mono); font-size: 10px; color: var(--ink-3); margin-top: 14px; }
.pr-threshold { font-family: var(--mono); font-size: 11px; line-height: 1.55; color: var(--ink-3); margin: 8px 0 0; max-width: 620px; }
.pr-threshold b { color: var(--ink-2); }
.pr-fault { margin-top: 34px; padding: 24px 26px; border: 1px solid var(--rule); border-radius: 16px; background: var(--paper-2); }
.pr-fault > .k { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; color: var(--ink-3); }
.pr-fault h3 { font-family: var(--serif); font-size: 23px; font-weight: 600; letter-spacing: -0.015em; margin: 7px 0 9px; color: var(--ink); }
.pr-fault > p { font-size: 14.5px; line-height: 1.6; color: var(--ink-2); margin: 0; max-width: 640px; }
.pr-fault .pr-row.split { border-bottom: none; margin-top: 14px; padding-bottom: 0; }
.pr-pct.split { color: var(--ink-3); }
.pr-pct.split .ag { color: var(--ink-3); }

/* ---------- pol.is-style OPINION MAP (the borrowed scatter) ---------- */
.pr-mapsec { margin: 30px 0 8px; }
.pr-maphead, .pr-bridgehead { margin: 26px 0 14px; }
.pr-maphead .k, .pr-bridgehead .k { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; color: var(--replace); }
.pr-maphead h2, .pr-bridgehead h2 { font-family: var(--serif); font-size: 28px; font-weight: 600; letter-spacing: -0.02em; margin: 6px 0 0; color: var(--ink); }
.pr-bridgehead { margin-top: 34px; padding-top: 28px; border-top: 1px solid var(--rule-2); }

.pm-wrap { width: 100%; }
.pm {
  position: relative; height: 400px; border: 1px solid var(--rule); border-radius: 16px;
  background:
    linear-gradient(var(--rule-2) 1px, transparent 1px) 0 0 / 100% 40px,
    linear-gradient(90deg, var(--rule-2) 1px, transparent 1px) 0 0 / 40px 100%,
    var(--paper-2);
  background-blend-mode: normal; overflow: hidden;
}
.pm-wrap.compact .pm { height: 220px; }
.pm-blob { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); opacity: 0.12; filter: blur(2px); }
.pm-blob.d { background: var(--brand); } .pm-blob.r { background: var(--replace); } .pm-blob.i { background: var(--gold); }
.pm-dot { position: absolute; width: 9px; height: 9px; border-radius: 50%; transform: translate(-50%, -50%); opacity: 0.62; box-shadow: 0 1px 2px oklch(0.2 0.03 255 / 0.25); }
.pm-dot.d { background: var(--brand); } .pm-dot.r { background: var(--replace); } .pm-dot.i { background: var(--gold); }
.pm-glab { position: absolute; transform: translate(-50%, -100%); font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-2); background: oklch(1 0 0 / 0.78); padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
.pm-you { position: absolute; width: 18px; height: 18px; border-radius: 50%; transform: translate(-50%, -50%); background: var(--ink); border: 3px solid var(--paper-2); box-shadow: 0 0 0 3px var(--ink), 0 3px 8px oklch(0.2 0.03 255 / 0.4); z-index: 3; }
.pm-you-lab { position: absolute; transform: translate(14px, -50%); font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--ink); background: var(--paper-2); border: 1px solid var(--ink); padding: 2px 8px; border-radius: 999px; z-index: 3; white-space: nowrap; }
.pm-cap { margin-top: 14px; }
.pm-key { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 10px; }
.pm-key span { font-family: var(--mono); font-size: 10.5px; color: var(--ink-2); display: inline-flex; align-items: center; gap: 6px; }
.pm-key i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.pm-key i.d { background: var(--brand); } .pm-key i.r { background: var(--replace); } .pm-key i.i { background: var(--gold); }
.pm-key .you i { background: var(--ink); }
.pm-cap p { font-family: var(--serif); font-size: 16px; line-height: 1.55; color: var(--ink-2); margin: 0; max-width: 640px; }
.pm-cap p b { color: var(--ink); font-weight: 600; }

/* ---------- ⓪ ENTRY POINT — the invite that appears once the scorecard's ready ---------- */
.pe-done { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
.pe-check { width: 38px; height: 38px; border-radius: 50%; background: var(--keep); color: var(--paper-2); display: grid; place-items: center; font-weight: 700; font-size: 18px; flex-shrink: 0; }
.pe-done h1 { font-family: var(--serif); font-weight: 600; font-size: 34px; line-height: 1.05; letter-spacing: -0.02em; margin: 0; color: var(--ink); }
.pe-done p { font-size: 15px; color: var(--ink-2); margin: 6px 0 0; }
.pe-actions { display: flex; gap: 11px; margin-bottom: 28px; }
.pe-actions .btn-primary { min-height: 50px; }
.pe-pdf { min-height: 50px; padding: 0 20px; border-radius: 10px; border: 1.5px solid var(--rule); background: var(--paper-2); color: var(--ink-2); font-family: var(--sans); font-weight: 600; font-size: 14px; cursor: pointer; }

.pe-invite { display: grid; grid-template-columns: 280px 1fr; gap: 26px; align-items: center; border: 1px solid var(--rule); border-radius: 16px; background: var(--paper-2); box-shadow: var(--shadow-soft); padding: 22px; position: relative; overflow: hidden; }
.pe-invite::before { content: ""; position: absolute; top: 0; left: 0; bottom: 0; width: 5px; background: linear-gradient(var(--brand), var(--replace)); }
.pe-map .pm { height: 168px; border-radius: 12px; }
.pe-map .pm-glab { display: none; }
.pe-invite-body { min-width: 0; }
.pe-invite-body .k { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: var(--brand); }
.pe-invite-body h3 { font-family: var(--serif); font-size: 25px; font-weight: 600; letter-spacing: -0.015em; margin: 7px 0 8px; color: var(--ink); }
.pe-invite-body p { font-size: 14.5px; line-height: 1.55; color: var(--ink-2); margin: 0 0 16px; max-width: 540px; }
.pe-cta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pe-cta .go { min-height: 48px; padding: 0 20px; border-radius: 10px; border: none; background: var(--brand); color: var(--paper-2); font-family: var(--sans); font-weight: 600; font-size: 14px; cursor: pointer; box-shadow: var(--shadow-soft); display: inline-flex; align-items: center; gap: 8px; }
.pe-cta .no { font-size: 13.5px; color: var(--ink-3); background: none; border: none; cursor: pointer; }
.pe-cta .meta { margin-left: auto; font-family: var(--mono); font-size: 10px; color: var(--ink-3); }
```

