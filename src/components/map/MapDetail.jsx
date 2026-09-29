// src/components/map/MapDetail.jsx — detailed map (lazy-loaded chunk).
// Fetches the vector geography ONLY when opened, then renders everything on one Canvas with pan / zoom:
// drag or arrow keys to pan, wheel / pinch / +− to zoom, hover or tap for labels, Esc to close.
import { useCallback, useEffect, useRef, useState } from "react";
import { loadGeo } from "../../lib/map/mapData";
import { drawGeography, drawLabels, drawVegetation, sizeCanvas } from "../../lib/map/drawMap";
import { hitTest } from "../../lib/map/mapMath";
import { MAP_CSS } from "./mapStyles";

const MIN_K = 1, MAX_K = 9;

export default function MapDetail({ state, assets, unlocked, plants, onClose }) {
  const [geo, setGeo] = useState(null);
  const [err, setErr] = useState(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const [hover, setHover] = useState(null);
  const [card, setCard] = useState(null);
  const [drag, setDrag] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const wrap = useRef(null), canvas = useRef(null), closeBtn = useRef(null);
  const pointers = useRef(new Map()), last = useRef(null);
  const manifest = assets.manifest, frame = manifest.frame;

  useEffect(() => { loadGeo().then(setGeo).catch(setErr); closeBtn.current?.focus(); }, []);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // "contain" fit of the frame in the viewport, times the user zoom
  const fit = size.w && size.h ? Math.min(size.w / frame.W, size.h / frame.H) : 1;
  const clampView = useCallback((v) => {
    const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
    const cw = frame.W * fit * k, ch = frame.H * fit * k, m = 60;
    const offX = (size.w - frame.W * fit) / 2, offY = (size.h - frame.H * fit) / 2;
    // translation is in screen px relative to the fitted origin
    const tx = Math.min(m - offX, Math.max(size.w - cw - offX - m, v.tx));
    const ty = Math.min(m - offY, Math.max(size.h - ch - offY - m, v.ty));
    return { k, tx: cw <= size.w ? (size.w - cw) / 2 - offX : tx, ty: ch <= size.h ? (size.h - ch) / 2 - offY : ty };
  }, [frame, fit, size]);

  const zoomAt = useCallback((factor, cx, cy) => {
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor)), f = k / v.k;
      return clampView({ k, tx: cx - (cx - v.tx) * f, ty: cy - (cy - v.ty) * f });
    });
  }, [clampView]);

  // ── draw ──
  useEffect(() => {
    const c = canvas.current; if (!c || !geo || !size.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    sizeCanvas(c, size.w, size.h, dpr);
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#E7ECEE"; ctx.fillRect(0, 0, c.width, c.height);
    const offX = (size.w - frame.W * fit) / 2, offY = (size.h - frame.H * fit) / 2, s = fit * view.k * dpr;
    ctx.setTransform(s, 0, 0, s, (offX + view.tx) * dpr, (offY + view.ty) * dpr);
    const temples = unlocked.map((id) => manifest.hotspots[id]).filter((h) => h?.type === "temple").map((h) => h.anchor);
    drawGeography(ctx, { geo, unlocked, temples, k: view.k });
    drawVegetation(ctx, { atlas: assets.sprites.atlas, sprites: assets.sprites, growth: assets.candidates.growth, unit: assets.candidates.unit,
      progress: state.status === "ok" ? Number(state.progressPercent) : 0, plants });
    drawLabels(ctx, { hotspots: manifest.hotspots, unlocked, k: view.k, hover });
  }, [geo, size, view, fit, frame, unlocked, plants, assets, state, manifest, hover]);

  // screen point → map units under the current view
  const toMap = useCallback((clientX, clientY) => {
    const r = wrap.current.getBoundingClientRect();
    const offX = (size.w - frame.W * fit) / 2, offY = (size.h - frame.H * fit) / 2;
    return [((clientX - r.left) - offX - view.tx) / (fit * view.k), ((clientY - r.top) - offY - view.ty) / (fit * view.k)];
  }, [size, frame, fit, view]);
  const pick = (e) => { const [x, y] = toMap(e.clientX, e.clientY); return hitTest(manifest.hotspots, unlocked, x, y, 14 / (fit * view.k)); };

  const onPointerDown = (e) => { wrap.current.setPointerCapture?.(e.pointerId); pointers.current.set(e.pointerId, [e.clientX, e.clientY]); last.current = { x: e.clientX, y: e.clientY, moved: 0 }; setDrag(true); };
  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) { if (e.pointerType !== "touch") { const id = pick(e); if (id !== hover) setHover(id); } return; }
    const pts = pointers.current; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) {                                   // pinch
      const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (last.current.pinch) { const r = wrap.current.getBoundingClientRect(); zoomAt(d / last.current.pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); }
      last.current.pinch = d; last.current.moved += 10; return;
    }
    const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; last.current.moved += Math.abs(dx) + Math.abs(dy);
    setView((v) => clampView({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  };
  const onPointerUp = (e) => {
    const wasTap = last.current && last.current.moved < 6 && pointers.current.size === 1;
    pointers.current.delete(e.pointerId); if (!pointers.current.size) { setDrag(false); if (last.current) last.current.pinch = 0; }
    if (wasTap) {
      const id = pick(e), h = id && manifest.hotspots[id];
      setCard((c) => (h && c?.id !== id ? { id, title: h.name, kind: h.type, text: h.tap } : null));
    }
  };
  const onWheel = (e) => { e.preventDefault?.(); const r = wrap.current.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); };
  useEffect(() => {                                        // passive:false so preventDefault works
    const el = wrap.current; if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel);
  });

  const onKey = (e) => {
    const step = 60;
    if (e.key === "Escape") return onClose();
    if (e.key === "+" || e.key === "=") zoomAt(1.3, size.w / 2, size.h / 2);
    else if (e.key === "-") zoomAt(1 / 1.3, size.w / 2, size.h / 2);
    else if (e.key === "0") setView(clampView({ k: 1, tx: 0, ty: 0 }));
    else if (e.key === "ArrowLeft") setView((v) => clampView({ ...v, tx: v.tx + step }));
    else if (e.key === "ArrowRight") setView((v) => clampView({ ...v, tx: v.tx - step }));
    else if (e.key === "ArrowUp") setView((v) => clampView({ ...v, ty: v.ty + step }));
    else if (e.key === "ArrowDown") setView((v) => clampView({ ...v, ty: v.ty - step }));
    else return;
    e.preventDefault();
  };

  return (
    <div className="ymd" role="dialog" aria-modal="true" aria-label="Detailed India map" onKeyDown={onKey}>
      <style>{MAP_CSS}</style>
      <div className="ymd-bar">
        <h3>Your Yatra Map — detail</h3>
        <button className="ymd-ctl" type="button" aria-label="Zoom in" onClick={() => zoomAt(1.4, size.w / 2, size.h / 2)}>+</button>
        <button className="ymd-ctl" type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4, size.w / 2, size.h / 2)}>−</button>
        <button className="ymd-ctl" type="button" aria-label="Reset view" onClick={() => setView(clampView({ k: 1, tx: 0, ty: 0 }))}>⤢</button>
        <button className="ymd-ctl" type="button" aria-label="Close detailed map" ref={closeBtn} onClick={onClose}>×</button>
      </div>
      <div ref={wrap} className={`ymd-view${drag ? " drag" : ""}`} tabIndex={0} aria-label="Map. Arrow keys pan, plus and minus zoom."
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}>
        <canvas ref={canvas} aria-hidden="true" />
        {!geo && !err && <span className="skel ymap-skel" aria-hidden="true" />}
        {err && <div className="ymap-err" role="alert">Detailed geography could not be loaded.</div>}
        {card && (
          <div className="ymap-card" role="dialog" aria-label={card.title}>
            <button className="x" type="button" aria-label="Close" onClick={() => setCard(null)}>×</button>
            <div className="kind">{card.kind}</div><h4>{card.title}</h4><p>{card.text}</p>
          </div>
        )}
      </div>
      <div className="ymd-note">
        {manifest.provisionalGeography ? "Provisional geography — the official Survey of India outline is pending. " : ""}
        Sources: {manifest.attribution?.join(" · ")}
      </div>
    </div>
  );
}
