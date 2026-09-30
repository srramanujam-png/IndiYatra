// src/components/map/DashboardMap.jsx
// Quick "Your Yatra Map" section for the dashboard.
//
// Loads ONLY: the compact state RPC, the tiny manifest, the ONE plate for the learner's current
// milestone, the sprite atlas and the placement slots. Vector geography (geo.json) is fetched only if
// the learner opens the detailed map. Seeds / dhruva grass / plants are painted in one Canvas layer.
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fetchMapCard, fetchMapState, loadPlate, loadQuickMap } from "../../lib/map/mapData";
import { buildPlantList, celebrationFor, formatPercent, hitTest, introSeconds, introStage, summaryText, toMapUnits, unlockedIds } from "../../lib/map/mapMath";
import { buildLawn, createLawnReveal, easeOutCubic, paintScene, sizeCanvas } from "../../lib/map/drawMap";
import ProgressCard from "./ProgressCard";
import { MAP_CSS } from "./mapStyles";

const MapDetail = lazy(() => import("./MapDetail"));

const DEFAULT_FRAME = { W: 1000, H: 961 };
// Phones: crop the frame to India (the full frame is mostly Pakistan / Tibet / Myanmar sea) so the country fills the width.
// View = the part of the 1000-unit frame that is shown; the badge garland is an ellipse in the same units, tucked round the peninsula.
const NARROW_QUERY = "(max-width: 699px)";
const VIEW_FULL = null;
const VIEW_NARROW = { x0: 125, y0: 45, w: 800, h: 916 };
const ARC_WIDE = { cx: 420, cy: 570, rx: 365, ry: 365, from: 172, to: 8, maxStep: 15 };     // degrees: 90 = straight below the centre
const ARC_NARROW = { cx: 485, cy: 575, rx: 315, ry: 345, from: 168, to: 12, maxStep: 15 };
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
 *  compact        – map only (no header, legend, summary or buttons): used inside the lesson-time milestone popup
 *  prevOverride   – { m, plants } to compare against instead of the remembered record (the popup passes the state from BEFORE the lesson;
 *                   null = "no history"). The remembered record is still updated so the dashboard does not replay it.
 */
export default function DashboardMap({ stateOverride = null, cardOverride = undefined, courseId = null, refreshKey = 0, seenKey = "anon", compact = false, prevOverride = undefined }) {
  const [state, setState] = useState(stateOverride);
  const [card, setCardData] = useState(cardOverride ?? null);
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(null);
  const [tries, setTries] = useState(0);
  const [tip, setTip] = useState(null);        // { x, y, text }   (map units)
  const [popup, setCard] = useState(null);      // { id? , kind, title, text }
  const [detail, setDetail] = useState(false);
  const [width, setWidth] = useState(0);
  // intro animation: null = not playing, else the stage 0..4 (0 base map · 1 lawn · 2 rivers/ranges/temples/plants · 3 badges · 4 progress pill)
  const [stage, setStage] = useState(null);
  const [plate0, setPlate0] = useState(null);
  const [pctFrac, setPctFrac] = useState(1);

  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(NARROW_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW_QUERY); if (!mq) return undefined;
    const on = () => setNarrow(mq.matches); on();
    mq.addEventListener?.("change", on); return () => mq.removeEventListener?.("change", on);
  }, []);

  const stageRef = useRef(null), worldRef = useRef(null), canvasRef = useRef(null), lawnRef = useRef({ key: "", canvas: null }), animRef = useRef({ reveal: {}, born: {} }), sceneRef = useRef(null), lastStageRef = useRef(null), celebRef = useRef(null), seenSigRef = useRef("");

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
  const view = useMemo(() => (narrow ? VIEW_NARROW : VIEW_FULL) || { x0: 0, y0: 0, w: frame.W, h: frame.H }, [narrow, frame]);
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

  // celebration card: dismissible, and closes itself after 10 s
  const showCelebration = useCallback((c) => {
    setCard({ id: "celebrate", celebrate: true, ...c });
    setTimeout(() => setCard((cur) => (cur?.id === "celebrate" ? null : cur)), 10000);
  }, []);

  // remember what the learner has already seen, so only NEWLY unveiled rivers / newly earned plants animate in.
  // First sight of the map (with progress) or a newly reached 5% milestone also plays the ~5 s intro; new module / theme / level / course
  // completions and milestones trigger a small celebration card once the intro (if any) has finished.
  useLayoutEffect(() => {
    if (!assets || !state || state.status !== "ok") return;
    const key = `ymap:seen:${seenKey}:${courseId || "all"}`, now = performance.now() / 1000;
    const sig = `${key}|${state.milestoneIndex}|${JSON.stringify(state.plantCounts || {})}`;
    if (seenSigRef.current === sig) return;                     // already handled this exact state (StrictMode re-run, harmless refetch)
    seenSigRef.current = sig;
    let prev = null; try { prev = JSON.parse(localStorage.getItem(key)); } catch { /* storage unavailable: no animation history */ }
    if (prevOverride !== undefined) prev = prevOverride;
    const reveal = {}, born = {};
    const secs = reduced ? 0 : introSeconds(prev, state.milestoneIndex), play = secs > 0;     // every visit animates: 5 s new milestone / first sight, 3 s otherwise
    if (prev && !reduced && !play) {
      const rules = Object.fromEntries((assets.manifest.plantRules || []).map((r) => [r.tokenType, r.assetKey]));
      let i = 0;
      for (const [tok, cnt] of Object.entries(state.plantCounts || {})) for (let n = prev.plants?.[tok] | 0; n < (cnt | 0); n++) if (rules[tok]) born[`${rules[tok]}:${n}`] = now + 0.2 + Math.min(i++, 30) * 0.05;
    }
    animRef.current = { reveal, born, intro: play ? { t0: null, done: false, k: secs / 5 } : null };
    lastStageRef.current = null;
    if (play) {
      setStage(0); setPctFrac(0);
      if (state.milestoneIndex > 0) loadPlate(0, `${assets.manifest.configVersion}.${assets.manifest.plateScale || 1}`).then(setPlate0).catch(() => {});
    } else { setStage(null); setPctFrac(1); }
    celebRef.current = prev && !reduced ? celebrationFor(prev, state, assets.manifest) : null;
    if (!play && celebRef.current) { const c = celebRef.current; celebRef.current = null; setTimeout(() => showCelebration(c), 700); }
    try { localStorage.setItem(key, JSON.stringify({ m: state.milestoneIndex, plants: state.plantCounts || {} })); } catch { /* ignore */ }
  }, [assets, state, seenKey, courseId, reduced, showCelebration, prevOverride]);

  // ── intro timeline (driven from the animation loop) ──
  const finishIntro = useCallback(() => {
    const I = animRef.current.intro; if (!I || I.done) return;
    I.done = true; animRef.current.reveal = {}; animRef.current.born = {};
    lastStageRef.current = null; setStage(null); setPctFrac(1);
    const c = celebRef.current; celebRef.current = null;
    if (c) setTimeout(() => showCelebration(c), 500);
  }, [showCelebration]);
  const advanceIntro = useCallback((nowSec, onScreen) => {
    const I = animRef.current.intro, sc = sceneRef.current; if (!I || I.done || !sc?.lawnReady) return;
    if (I.t0 == null) {                                          // wait until the map is actually on screen, then start the clock
      if (!onScreen) return;
      I.t0 = nowSec; const reveal = {}, born = {};
      let r = 0; for (const id of sc.unlocked) if (sc.hotspots[id]?.type === "river") reveal[id] = nowSec + (1.9 + (r++) * 0.09) * I.k;
      const list = sc.plants || []; list.forEach((p, i) => { born[`${p.key}:${p.n}`] = nowSec + (2.2 + (i / Math.max(1, list.length)) * 0.9) * I.k; });
      animRef.current.reveal = reveal; animRef.current.born = born;
    }
    const e = (nowSec - I.t0) / I.k, st = introStage(e);          // e = time on the 5 s timeline, whatever the real duration
    if (st >= 5) { finishIntro(); return; }
    if (lastStageRef.current !== st) { lastStageRef.current = st; setStage(st); }
    if (st === 4) setPctFrac(easeOutCubic(Math.min(1, (e - 4.0) / 0.9)));
  }, [finishIntro]);

  const paint = useCallback((t, still) => {
    const canvas = canvasRef.current, sc = sceneRef.current; if (!canvas || !sc || !sc.lawnReady) return 0;
    const ctx = canvas.getContext("2d"), s = canvas.width / sc.frame.W;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(s, 0, 0, s, 0, 0);
    const I = animRef.current.intro, kk = I && !I.done ? I.k : 1;
    const reveal = {}; for (const [id, st] of Object.entries(animRef.current.reveal)) reveal[id] = Math.max(0, Math.min(1, easeOutCubic(Math.min(1, (t - st) / (1.8 * kk)))));
    let intro = null;
    if (I && !I.done) {
      if (I.t0 == null) return 0;                                 // intro pending (map not on screen yet): the live layer stays empty
      if (!lawnRef.current.reveal && lawnRef.current.canvas) lawnRef.current.reveal = createLawnReveal({ lawn: lawnRef.current.canvas, growth: sc.growth, unit: sc.unit, progress: sc.progress, W: sc.frame.W });
      const e = (t - I.t0) / I.k, c01 = (v) => Math.max(0, Math.min(1, v));
      intro = { lawn: c01((e - 0.6) / 1.3), temples: c01((e - 2.3) / 0.7), mala: easeOutCubic(c01((e - 4.0) / 0.9)) };
    }
    const started = performance.now();
    const n = paintScene(ctx, { lawn: lawnRef.current.canvas, lawnReveal: lawnRef.current.reveal, intro, frame: sc.frame, hotspots: sc.hotspots, unlocked: sc.unlocked, sprites: sc.sprites, plants: sc.plants,
      mala: sc.mala, unit: sc.unit, progress: sc.progress, t, reveal, born: animRef.current.born, still });
    canvas.dataset.instances = String(n); canvas.dataset.paintMs = (performance.now() - started).toFixed(1);
    return n;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !assets || !state || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const worldW = (width * frame.W) / view.w;                       // the canvas covers the whole frame; the stage shows the `view` window of it
    sizeCanvas(canvas, worldW, (worldW * frame.H) / frame.W, dpr);
    const lawnKey = `${canvas.width}|${progress.toFixed(3)}|${unlocked.join(",")}`;
    if (lawnRef.current.key !== lawnKey) {
      const lawn = buildLawn({ growth: assets.candidates.growth, unit: assets.candidates.unit, progress, indiaD: assets.india?.outline?.d, hotspots: manifest.hotspots, unlocked, relief: manifest.relief, W: frame.W, H: frame.H, widthPx: canvas.width });
      lawnRef.current = { key: lawnKey, canvas: lawn, reveal: animRef.current.intro && !animRef.current.intro.done ? createLawnReveal({ lawn, growth: assets.candidates.growth, unit: assets.candidates.unit, progress, W: frame.W }) : null };
    }
    sceneRef.current = { lawnReady: true, growth: assets.candidates.growth, frame, hotspots: manifest.hotspots, unlocked, sprites: assets.sprites, plants, mala: assets.candidates.mala, unit: assets.candidates.unit, progress };
    paint(performance.now() / 1000, reduced);
  }, [assets, state, plants, width, frame, view, unlocked, manifest, progress, paint, reduced]);

  // animation loop: only while the map is on screen and the tab is visible; ~30 fps; off entirely for "reduce motion"
  useEffect(() => {
    if (!assets || reduced) return undefined;
    let raf = 0, last = 0, onScreen = true;
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }) : null;
    if (io && stageRef.current) io.observe(stageRef.current);
    const tick = (ms) => {
      raf = requestAnimationFrame(tick);
      if (!onScreen || document.hidden || ms - last < 33) return;
      last = ms; advanceIntro(ms / 1000, onScreen); paint(ms / 1000, false);
      const c = canvasRef.current; if (c) c.dataset.frames = String((Number(c.dataset.frames) || 0) + 1);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io?.disconnect(); };
  }, [assets, reduced, paint, advanceIntro]);

  // ── hover / tap ──
  const tolUnits = useCallback((rect) => (14 * frame.W) / rect.width, [frame]);
  const featureAt = useCallback((e) => {
    const rect = worldRef.current.getBoundingClientRect();
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
    if (animRef.current.intro && !animRef.current.intro.done) { finishIntro(); return; }   // tap / click skips the intro
    const id = featureAt(e);
    if (id) showCard(id); else setCard(null);
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setCard(null); setTip(null); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── badges (max 12): ONE garland on an arc in the sea that wraps the peninsula from the Arabian Sea, under Kanyakumari, into the Bay of Bengal
  // (matches the mala theme). Phones use a tighter, flatter ellipse inside the cropped view. The first badge sits at the west end and earned
  // badges fill toward the east, like the mala grows round the coast. Positions are % of the whole frame (the arc lives inside the world layer).
  const badges = state?.badges || [];
  const badgeBtn = (b) => (
    <button key={b.badgeId} type="button" className={`ymap-badge${b.earned ? " earned" : ""}`} style={{ "--d": `${badges.indexOf(b) * 0.07}s` }}
      data-tip={`${b.name} · ${b.earned ? "Earned" : "Locked"}`}
      aria-label={`${b.name} badge — ${b.earned ? "earned" : "locked"}`}
      onClick={() => setCard((c) => (c?.id === b.badgeId ? null : { id: b.badgeId, kind: b.earned ? "Badge · earned" : "Badge · locked", title: b.name, text: b.description || (b.earned ? "You have earned this badge." : "Keep learning to earn this badge.") }))}>
      <span className="ico" aria-hidden="true">{b.icon}</span>
    </button>
  );
  const arc = narrow ? ARC_NARROW : ARC_WIDE;
  const arcStyle = (i, n) => {
    const step = n <= 1 ? 0 : Math.min(arc.maxStep, (arc.from - arc.to) / (n - 1)), mid = (arc.from + arc.to) / 2;
    const a = ((mid + ((n - 1) / 2 - i) * step) * Math.PI) / 180;
    return { left: `${((arc.cx + arc.rx * Math.cos(a)) / frame.W) * 100}%`, top: `${((arc.cy + arc.ry * Math.sin(a)) / frame.H) * 100}%` };
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
    <div className="ymap" data-intro={stage ?? undefined}>
      <style>{MAP_CSS}</style>
      {!compact && <div className="ymap-head">
        <div className="ymap-meta">
          {ready ? (<><strong>{pctText}</strong> of your journey · milestone <strong>{state.milestoneIndex}</strong> of 20</>) : "Loading your map…"}
        </div>
        {manifest?.provisionalGeography && (
          <span className="ymap-prov" title={manifest.geographyNote}><i className="ti ti-alert-triangle" aria-hidden="true" /> Provisional geography — official outline pending</span>
        )}
      </div>}

      <div className="ymap-body">
        <div className="ymap-stage" ref={stageRef} style={{ aspectRatio: `${view.w} / ${view.h}` }}
          onPointerMove={onMove} onPointerLeave={onLeave} onClick={onClick}>
          {!ready && <span className="skel ymap-skel" aria-hidden="true" />}
          <div className="ymap-world" ref={worldRef} style={{ width: `${(frame.W / view.w) * 100}%`, height: `${(frame.H / view.h) * 100}%`, left: `${(-view.x0 / view.w) * 100}%`, top: `${(-view.y0 / view.h) * 100}%` }}>
          {ready && stage !== null && plate0 && <img className="ymap-plate base0" src={plate0.src} alt="" draggable="false" decoding="async" />}
          {ready && <img className="ymap-plate top" src={assets.plate.src} alt="" draggable="false" decoding="async" />}
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
          {ready && pct !== null && <div className="ymap-pct" aria-hidden="true">{formatPercent(stage === 4 ? Math.round(pct * pctFrac) : pct)}% Completed<small>{courseId ? (card?.course?.name || "this course") : "across all courses"}</small></div>}
          {tip && <div className="ymap-tip" role="tooltip" style={{ left: px(tip.x, "x"), top: px(tip.y, "y") }}>{tip.text}</div>}
          </div>{/* end .ymap-world */}
          {ready && <ProgressCard card={card} state={state} manifest={manifest} variant="overlay" scoped={!!courseId} />}
          {popup && (
            <div className={`ymap-card${popup.celebrate ? " celebrate" : ""}`} role="dialog" aria-label={popup.title}>
              <button className="x" type="button" aria-label="Close" onClick={() => setCard(null)}>×</button>
              <div className="kind">{popup.kind}</div><h4>{popup.title}</h4><p>{popup.text}</p>
            </div>
          )}
        </div>
      </div>

      {ready && <ProgressCard card={card} state={state} manifest={manifest} variant="below" scoped={!!courseId} />}
      {ready && !compact && (
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
