// src/components/map/DashboardMap.jsx
// Quick "Your Yatra Map" section for the dashboard.
//
// Loads ONLY: the compact state RPC, the tiny manifest, the ONE plate for the learner's current
// milestone, the sprite atlas and the placement slots. Vector geography (geo.json) is fetched only if
// the learner opens the detailed map. Seeds / dhruva grass / plants are painted in one Canvas layer.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMapCard, fetchMapState, loadQuickMap } from "../../lib/map/mapData";
import { buildPlantList, formatPercent, hitTest, summaryText, toMapUnits, unlockedIds } from "../../lib/map/mapMath";
import { buildLawn, easeOutCubic, paintScene, sizeCanvas } from "../../lib/map/drawMap";
import ProgressCard from "./ProgressCard";
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
 *  courseId       – null = whole platform; a course id = that course only (follows the dashboard's course selector)
 *  stateOverride / cardOverride – skip the RPCs and use these (preview harness, tests)
 *  refreshKey     – change it to refetch (e.g. when the learner returns to the dashboard)
 *  seenKey        – per-learner key used to remember what they have already seen unveiled (so only NEW things animate in)
 */
export default function DashboardMap({ stateOverride = null, cardOverride = undefined, courseId = null, refreshKey = 0, seenKey = "anon" }) {
  const [state, setState] = useState(stateOverride);
  const [card, setCardData] = useState(cardOverride ?? null);
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(null);
  const [tries, setTries] = useState(0);
  const [tip, setTip] = useState(null);        // { x, y, text }   (map units)
  const [popup, setCard] = useState(null);      // { id? , kind, title, text }
  const [detail, setDetail] = useState(false);
  const [width, setWidth] = useState(0);

  const stageRef = useRef(null), canvasRef = useRef(null), lawnRef = useRef({ key: "", canvas: null }), animRef = useRef({ reveal: {}, born: {} }), sceneRef = useRef(null);

  // ── load state + shared art ──
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [s, cd] = await Promise.all([stateOverride || fetchMapState(courseId), cardOverride !== undefined ? cardOverride : fetchMapCard(courseId)]);
        if (!live) return;
        setState(s); setCardData(cd);
        const a = await loadQuickMap(s);
        if (live) setAssets(a);
      } catch (e) { if (live) setError(e); }
    })();
    return () => { live = false; };
  }, [stateOverride, cardOverride, courseId, refreshKey, tries]);

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

  // ── live layer: cached lawn + animated rivers / plants / mala on ONE canvas ──
  const progress = state?.status === "ok" ? Number(state.progressPercent) : 0;
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // remember what the learner has already seen, so only NEWLY unveiled rivers / newly earned plants animate in
  useEffect(() => {
    if (!assets || !state || state.status !== "ok") return;
    const key = `ymap:seen:${seenKey}:${courseId || "all"}`, now = performance.now() / 1000;
    let prev = null; try { prev = JSON.parse(localStorage.getItem(key)); } catch { /* storage unavailable: no animation history */ }
    const reveal = {}, born = {};
    if (prev && !reduced) {
      for (let m = (prev.m | 0) + 1; m <= state.milestoneIndex; m++) for (const id of assets.manifest.milestones?.[m - 1]?.riverIds || []) reveal[id] = now + 0.3 + Math.min(m - prev.m - 1, 5) * 0.4;      // a big jump reveals everything within ~2.5 s
      const rules = Object.fromEntries((assets.manifest.plantRules || []).map((r) => [r.tokenType, r.assetKey]));
      let i = 0;
      for (const [tok, cnt] of Object.entries(state.plantCounts || {})) for (let n = prev.plants?.[tok] | 0; n < (cnt | 0); n++) if (rules[tok]) born[`${rules[tok]}:${n}`] = now + 0.2 + Math.min(i++, 30) * 0.05;
    }
    animRef.current = { reveal, born };
    try { localStorage.setItem(key, JSON.stringify({ m: state.milestoneIndex, plants: state.plantCounts || {} })); } catch { /* ignore */ }
  }, [assets, state, seenKey, courseId, reduced]);

  const paint = useCallback((t, still) => {
    const canvas = canvasRef.current, sc = sceneRef.current; if (!canvas || !sc || !sc.lawnReady) return 0;
    const ctx = canvas.getContext("2d"), s = canvas.width / sc.frame.W;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(s, 0, 0, s, 0, 0);
    const reveal = {}; for (const [id, st] of Object.entries(animRef.current.reveal)) reveal[id] = Math.max(0, Math.min(1, easeOutCubic(Math.min(1, (t - st) / 1.8))));
    const started = performance.now();
    const n = paintScene(ctx, { lawn: lawnRef.current.canvas, frame: sc.frame, hotspots: sc.hotspots, unlocked: sc.unlocked, sprites: sc.sprites, plants: sc.plants,
      mala: sc.mala, unit: sc.unit, progress: sc.progress, t, reveal, born: animRef.current.born, still });
    canvas.dataset.instances = String(n); canvas.dataset.paintMs = (performance.now() - started).toFixed(1);
    return n;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !assets || !state || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    sizeCanvas(canvas, width, (width * frame.H) / frame.W, dpr);
    const lawnKey = `${canvas.width}|${progress.toFixed(3)}|${unlocked.join(",")}`;
    if (lawnRef.current.key !== lawnKey) {
      lawnRef.current = { key: lawnKey, canvas: buildLawn({ growth: assets.candidates.growth, unit: assets.candidates.unit, progress, indiaD: assets.india?.outline?.d, hotspots: manifest.hotspots, unlocked, relief: manifest.relief, W: frame.W, H: frame.H, widthPx: canvas.width }) };
    }
    sceneRef.current = { lawnReady: true, frame, hotspots: manifest.hotspots, unlocked, sprites: assets.sprites, plants, mala: assets.candidates.mala, unit: assets.candidates.unit, progress };
    paint(performance.now() / 1000, reduced);
  }, [assets, state, plants, width, frame, unlocked, manifest, progress, paint, reduced]);

  // animation loop: only while the map is on screen and the tab is visible; ~30 fps; off entirely for "reduce motion"
  useEffect(() => {
    if (!assets || reduced) return undefined;
    let raf = 0, last = 0, onScreen = true;
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }) : null;
    if (io && stageRef.current) io.observe(stageRef.current);
    const tick = (ms) => {
      raf = requestAnimationFrame(tick);
      if (!onScreen || document.hidden || ms - last < 33) return;
      last = ms; paint(ms / 1000, false);
      const c = canvasRef.current; if (c) c.dataset.frames = String((Number(c.dataset.frames) || 0) + 1);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io?.disconnect(); };
  }, [assets, reduced, paint]);

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

  // wide screens: all badges on one semicircular arc in the sea, bottom-left of the map (phones keep the strips)
  const ARC_CX = 19.5, ARC_CY = 90.5, ARC_R = 16;   // in stage-width units (cqw)
  const arcStyle = (i, n) => {
    const step = n <= 1 ? 0 : Math.min(180 / 11, 180 / (n - 1)), t = 90 + ((n - 1) / 2 - i) * step, a = (t * Math.PI) / 180;
    return { left: `${ARC_CX + ARC_R * Math.cos(a)}cqw`, top: `${ARC_CY - ARC_R * Math.sin(a)}cqw` };
  };

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
        <div className="ymap-badges a strip" role="group" aria-label="Character badges">{badges.slice(0, half).map(badgeBtn)}</div>

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

          {ready && badges.length > 0 && (
            <div className="ymap-arc" role="group" aria-label="Character badges">
              {badges.map((b, i) => (
                <span key={b.badgeId} className="ymap-arc-slot" style={arcStyle(i, badges.length)}>{badgeBtn(b)}</span>
              ))}
            </div>
          )}
          {ready && pct !== null && <div className="ymap-pct" aria-hidden="true">{formatPercent(pct)}% Completed<small>{courseId ? (card?.course?.name || "this course") : "across all courses"}</small></div>}
          {ready && <ProgressCard card={card} state={state} manifest={manifest} variant="overlay" scoped={!!courseId} />}
          {tip && <div className="ymap-tip" role="tooltip" style={{ left: px(tip.x, "x"), top: px(tip.y, "y") }}>{tip.text}</div>}
          {popup && (
            <div className="ymap-card" role="dialog" aria-label={popup.title}>
              <button className="x" type="button" aria-label="Close" onClick={() => setCard(null)}>×</button>
              <div className="kind">{popup.kind}</div><h4>{popup.title}</h4><p>{popup.text}</p>
            </div>
          )}
        </div>

        <div className="ymap-badges b strip" role="group" aria-label="More character badges">{badges.slice(half).map(badgeBtn)}</div>
      </div>

      {ready && <ProgressCard card={card} state={state} manifest={manifest} variant="below" scoped={!!courseId} />}
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
