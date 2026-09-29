// src/components/map/DashboardMap.jsx
// Quick "Your Yatra Map" section for the dashboard.
//
// Loads ONLY: the compact state RPC, the tiny manifest, the ONE plate for the learner's current
// milestone, the sprite atlas and the placement slots. Vector geography (geo.json) is fetched only if
// the learner opens the detailed map. Seeds / dhruva grass / plants are painted in one Canvas layer.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMapState, loadQuickMap } from "../../lib/map/mapData";
import { buildPlantList, hitTest, summaryText, toMapUnits, unlockedIds } from "../../lib/map/mapMath";
import { drawMala, drawVegetation, sizeCanvas } from "../../lib/map/drawMap";
import { MAP_CSS } from "./mapStyles";

const MapDetail = lazy(() => import("./MapDetail"));

const DEFAULT_FRAME = { W: 1000, H: 961 };
const KIND_LABEL = { river: "River", mountain: "Mountain range", temple: "Temple" };

function SpriteIcon({ sprites, name }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c || !sprites?.keys?.[name]) return;
    c.width = 44; c.height = 44;
    const ctx = c.getContext("2d"); ctx.clearRect(0, 0, 44, 44);
    const [sx, sy] = sprites.keys[name]; ctx.drawImage(sprites.atlas, sx, sy, sprites.cell, sprites.cell, 0, 0, 44, 44);
  }, [sprites, name]);
  return <canvas ref={ref} aria-hidden="true" />;
}

/**
 * Props
 *  stateOverride  – skip the RPC and use this state (preview harness, tests)
 *  refreshKey     – change it to refetch (e.g. when the learner returns to the dashboard)
 */
export default function DashboardMap({ stateOverride = null, refreshKey = 0 }) {
  const [state, setState] = useState(stateOverride);
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(null);
  const [tries, setTries] = useState(0);
  const [tip, setTip] = useState(null);        // { x, y, text }   (map units)
  const [card, setCard] = useState(null);      // { id? , kind, title, text }
  const [detail, setDetail] = useState(false);
  const [width, setWidth] = useState(0);

  const stageRef = useRef(null), canvasRef = useRef(null);

  // ── load state + shared art ──
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const s = stateOverride || await fetchMapState();
        if (!live) return;
        setState(s);
        const a = await loadQuickMap(s);
        if (live) setAssets(a);
      } catch (e) { if (live) setError(e); }
    })();
    return () => { live = false; };
  }, [stateOverride, refreshKey, tries]);

  const manifest = assets?.manifest;
  const frame = useMemo(() => manifest?.frame || DEFAULT_FRAME, [manifest]);
  const unlocked = useMemo(() => (manifest && state ? unlockedIds(manifest, state.milestoneIndex) : []), [manifest, state]);
  const plants = useMemo(() => (assets && state ? buildPlantList(state.plantCounts, assets.candidates, manifest.plantRules, assets.candidates.unit) : []), [assets, state, manifest]);

  // ── responsive canvas ──
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el); setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [assets]);

  // ── paint the dynamic layer (only when state/size changes — not on every hover) ──
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !assets || !state || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssH = (width * frame.H) / frame.W;
    sizeCanvas(canvas, width, cssH, dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const s = (width * dpr) / frame.W; ctx.setTransform(s, 0, 0, s, 0, 0);
    const t0 = performance.now();
    const n = drawVegetation(ctx, {
      atlas: assets.sprites.atlas, sprites: assets.sprites, growth: assets.candidates.growth, unit: assets.candidates.unit,
      progress: state.status === "ok" ? Number(state.progressPercent) : 0, plants,
    });
    drawMala(ctx, { mala: assets.candidates.mala, unit: assets.candidates.unit, progress: state.status === "ok" ? Number(state.progressPercent) : 0 });
    canvas.dataset.instances = String(n); canvas.dataset.paintMs = (performance.now() - t0).toFixed(1);
  }, [assets, state, plants, width, frame]);

  // ── hover / tap ──
  const tolUnits = useCallback((rect) => (14 * frame.W) / rect.width, [frame]);
  const featureAt = useCallback((e) => {
    const rect = stageRef.current.getBoundingClientRect();
    const [x, y] = toMapUnits(e.clientX, e.clientY, rect, frame);
    return hitTest(manifest.hotspots, unlocked, x, y, tolUnits(rect));
  }, [manifest, unlocked, frame, tolUnits]);

  const showCard = useCallback((id) => {
    const h = manifest.hotspots[id]; if (!h) return;
    setCard((c) => (c?.id === id ? null : { id, kind: KIND_LABEL[h.type] || "", title: h.name, text: h.tap }));   // second tap dismisses
    setTip(null);
  }, [manifest]);

  const onMove = (e) => {
    if (!manifest || e.pointerType === "touch") return;
    const id = featureAt(e);
    stageRef.current.classList.toggle("hit", !!id);
    if (!id) return setTip(null);
    const h = manifest.hotspots[id]; setTip({ x: h.anchor[0], y: h.anchor[1], text: h.hover });
  };
  const onLeave = () => { setTip(null); stageRef.current?.classList.remove("hit"); };
  const onClick = (e) => {
    if (!manifest) return;
    if (e.target.closest?.(".ymap-card,.ymap-hot")) return;
    const id = featureAt(e);
    if (id) showCard(id); else setCard(null);
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setCard(null); setTip(null); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── badges (max 12): first half / second half feed the two strips/columns ──
  const badges = state?.badges || [];
  const half = Math.ceil(badges.length / 2);
  const badgeBtn = (b) => (
    <button key={b.badgeId} type="button" className={`ymap-badge${b.earned ? " earned" : ""}`}
      data-tip={`${b.name} · ${b.earned ? "Earned" : "Locked"}`}
      aria-label={`${b.name} badge — ${b.earned ? "earned" : "locked"}`}
      onClick={() => setCard((c) => (c?.id === b.badgeId ? null : { id: b.badgeId, kind: b.earned ? "Badge · earned" : "Badge · locked", title: b.name, text: b.description || (b.earned ? "You have earned this badge." : "Keep learning to earn this badge.") }))}>
      <span className="ico" aria-hidden="true">{b.icon}</span>
    </button>
  );

  if (error) return (
    <div className="ymap"><style>{MAP_CSS}</style>
      <div className="ymap-err" role="alert">We couldn't load your Yatra map right now.
        <div><button className="ymap-btn" onClick={() => { setError(null); setTries((t) => t + 1); }}>Try again</button></div></div></div>
  );

  const ready = !!(assets && state);
  const pct = state?.status === "ok" ? Number(state.progressPercent) : null;
  const pctText = pct === null ? "—" : `${pct >= 99.995 ? 100 : pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`;
  const px = (v, axis) => `${(v / (axis === "x" ? frame.W : frame.H)) * 100}%`;

  return (
    <div className="ymap">
      <style>{MAP_CSS}</style>
      <div className="ymap-head">
        <div className="ymap-meta">
          {ready ? (<><strong>{pctText}</strong> of your journey · milestone <strong>{state.milestoneIndex}</strong> of 20</>) : "Loading your map…"}
        </div>
        {manifest?.provisionalGeography && (
          <span className="ymap-prov" title={manifest.geographyNote}><i className="ti ti-alert-triangle" aria-hidden="true" /> Provisional geography — official outline pending</span>
        )}
      </div>

      <div className="ymap-body">
        <div className="ymap-badges a" role="group" aria-label="Character badges">{badges.slice(0, half).map(badgeBtn)}</div>

        <div className="ymap-stage" ref={stageRef} style={{ aspectRatio: `${frame.W} / ${frame.H}` }}
          onPointerMove={onMove} onPointerLeave={onLeave} onClick={onClick}>
          {!ready && <span className="skel ymap-skel" aria-hidden="true" />}
          {ready && <img className="ymap-plate" src={assets.plate.src} alt="" draggable="false" decoding="async" />}
          <canvas ref={canvasRef} className="ymap-canvas" aria-hidden="true" />

          {/* keyboard / screen-reader targets: one per REVEALED feature (hidden ones have none) */}
          {ready && unlocked.map((id) => {
            const h = manifest.hotspots[id]; if (!h) return null;
            return (
              <button key={id} type="button" className="ymap-hot" style={{ left: px(h.anchor[0], "x"), top: px(h.anchor[1], "y") }}
                aria-label={`${h.name} — ${KIND_LABEL[h.type] || ""}. ${h.hover}`}
                onFocus={() => setTip({ x: h.anchor[0], y: h.anchor[1], text: h.hover })} onBlur={() => setTip(null)}
                onMouseEnter={() => setTip({ x: h.anchor[0], y: h.anchor[1], text: h.hover })} onMouseLeave={() => setTip(null)}
                onClick={() => showCard(id)} />
            );
          })}

          {tip && <div className="ymap-tip" role="tooltip" style={{ left: px(tip.x, "x"), top: px(tip.y, "y") }}>{tip.text}</div>}
          {card && (
            <div className="ymap-card" role="dialog" aria-label={card.title}>
              <button className="x" type="button" aria-label="Close" onClick={() => setCard(null)}>×</button>
              <div className="kind">{card.kind}</div><h4>{card.title}</h4><p>{card.text}</p>
            </div>
          )}
        </div>

        <div className="ymap-badges b" role="group" aria-label="More character badges">{badges.slice(half).map(badgeBtn)}</div>
      </div>

      {ready && (
        <>
          <div className="ymap-legend" aria-hidden="true">
            {manifest.plantRules.slice().sort((a, b) => a.order - b.order).map((r) => (
              <span className="ymap-chip" key={r.assetKey}><SpriteIcon sprites={assets.sprites} name={r.assetKey} /><b>{state.plantCounts?.[r.tokenType] ?? 0}</b> {r.species}</span>
            ))}
          </div>
          <p className="ymap-summary" aria-live="polite">{summaryText(state, manifest, unlocked)}</p>
          <div className="ymap-actions">
            <button type="button" className="ymap-btn" onClick={() => setDetail(true)}><i className="ti ti-zoom-in" aria-hidden="true" /> Open detailed map</button>
          </div>
        </>
      )}

      {detail && ready && (
        <Suspense fallback={null}>
          <MapDetail state={state} assets={assets} unlocked={unlocked} plants={plants} onClose={() => setDetail(false)} />
        </Suspense>
      )}
    </div>
  );
}
