import { useState, useEffect, useRef } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, DEFAULT_LANG_CODE, DIFFICULTY_STARS } from "../lib/supabase";
import { globalStyles } from "../styles/global";

const BLUE = "#00509E";

const BADGE_META = {
  lesson: { emoji: "📖", label: "Lesson" },
  module: { emoji: "📚", label: "Module" },
  theme:  { emoji: "🏛️", label: "Theme" },
  level:  { emoji: "🎓", label: "Level" },
  course: { emoji: "🏆", label: "Course" },
};

const styles = `
  .player-wrap { min-height: 100vh; background: #FFFDF5; display: flex; flex-direction: column; }

  .player-top-bar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,253,245,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid ${SAFFRON}33;
    padding: 0 1.5rem; height: 54px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .player-back {
    display: flex; align-items: center; gap: 5px; background: none; border: none;
    cursor: pointer; font-family: 'Alumni Sans', sans-serif; font-size: 16px;
    font-weight: 700; color: #888; transition: color 0.2s; flex-shrink: 0;
  }
  .player-back:hover { color: ${SAFFRON}; }
  .player-lesson-name {
    font-family: 'Alumni Sans', sans-serif; font-size: 16px; font-weight: 700;
    color: ${HERITAGE}; flex: 1; text-align: center;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .player-count { font-size: 14px; color: #aaa; font-weight: 600; flex-shrink: 0; }
  .player-progress { height: 3px; background: #f0e8d8; }
  .player-progress-fill { height: 100%; background: ${SAFFRON}; transition: width 0.4s ease; }

  .player-body {
    flex: 1; max-width: 680px; width: 100%; margin: 0 auto;
    padding: 24px 1.5rem 120px;
    touch-action: pan-y; /* allow vertical scroll, handle horizontal ourselves */
    user-select: none;
  }

  /* Card */
  .snip-card {
    background: white; border-radius: 20px; border: 1px solid #E8D5B0;
    box-shadow: 0 4px 24px rgba(255,142,0,0.08); overflow: hidden;
    will-change: transform;
  }
  @keyframes slideInFromRight {
    from { opacity: 0; transform: translateX(48px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInFromLeft {
    from { opacity: 0; transform: translateX(-48px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .snip-enter-next { animation: slideInFromRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both; }
  .snip-enter-prev { animation: slideInFromLeft  0.28s cubic-bezier(0.25,0.46,0.45,0.94) both; }

  /* Swipe hint indicators */
  .swipe-hint {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin-top: 12px; opacity: 0.4; font-size: 12px; color: #aaa;
    pointer-events: none;
  }

  /* Image */
  .snip-img {
    position: relative; width: 100%;
    background: #f5efe4; display: flex; align-items: center; justify-content: center;
    overflow: hidden; min-height: 80px;
  }
  .snip-img img { display: block; max-width: 100%; height: auto; object-fit: contain; }
  .snip-diff {
    position: absolute; bottom: 10px; right: 10px;
    background: rgba(0,0,0,0.50); color: white; border-radius: 999px;
    padding: 3px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
  }

  /* Body */
  .snip-body { padding: 24px 24px 20px; }
  .snip-hook {
    font-family: 'Alumni Sans', sans-serif; font-size: 26px; font-weight: 800;
    color: ${HERITAGE}; line-height: 1.25; margin-bottom: 16px;
    letter-spacing: -0.01em; text-align: left;
  }
  .snip-explanation {
    font-size: 17px; color: #2a2a2a; line-height: 1.85; margin-bottom: 20px;
    text-align: justify;
  }
  .snip-divider { height: 1px; background: #eee; margin: 20px 0; }

  .snip-key-term {
    background: #FFF8ED; border-left: 4px solid ${SAFFRON};
    border-radius: 0 14px 14px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-kt-label { font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 6px; }
  .snip-kt-word  { font-family: 'Alumni Sans', sans-serif; font-size: 22px; font-weight: 800; color: ${HERITAGE}; margin-bottom: 4px; }
  .snip-kt-meaning { font-size: 16px; color: #555; line-height: 1.55; }

  .snip-life {
    background: #F0FAF4; border-left: 4px solid ${GREEN};
    border-radius: 0 14px 14px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-life-label { font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${GREEN}; margin-bottom: 6px; }
  .snip-life-text  { font-size: 16px; color: #2a4a2a; line-height: 1.65; }

  .snip-quiz {
    background: #EEF5FF; border-left: 4px solid ${BLUE};
    border-radius: 0 14px 14px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-quiz-label { font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${BLUE}; margin-bottom: 6px; }
  .snip-quiz-text  { font-size: 16px; color: #1a2a4a; line-height: 1.65; }

  .snip-citation { font-size: 12px; color: #ccc; font-style: italic; text-align: right; margin-top: 8px; }
  .snip-empty    { text-align: center; padding: 48px 24px; font-family: 'Alumni Sans', sans-serif; font-size: 20px; color: #bbb; }

  /* Bottom nav */
  .player-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
    background: rgba(255,253,245,0.97); backdrop-filter: blur(12px);
    border-top: 1px solid #e8d5b0; padding: 14px 1.5rem;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .pnav-btn {
    display: flex; align-items: center; gap: 6px; border-radius: 999px; padding: 11px 24px;
    font-family: 'Alumni Sans', sans-serif; font-size: 16px; font-weight: 700;
    cursor: pointer; transition: all 0.2s; border: 2px solid transparent;
  }
  .pnav-prev { border-color: #e0d4bc; background: white; color: #888; }
  .pnav-prev:hover:not(:disabled) { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .pnav-prev:disabled { opacity: 0.3; cursor: not-allowed; }
  .pnav-next   { background: ${SAFFRON}; color: white; border-color: ${SAFFRON}; box-shadow: 0 4px 16px rgba(255,142,0,0.3); }
  .pnav-next:hover { box-shadow: 0 6px 22px rgba(255,142,0,0.45); transform: translateY(-1px); }
  .pnav-finish { background: ${GREEN}; color: white; border-color: ${GREEN}; box-shadow: 0 4px 16px rgba(0,146,74,0.3); }
  .pnav-finish:hover { box-shadow: 0 6px 22px rgba(0,146,74,0.45); transform: translateY(-1px); }

  .pnav-dots { display: flex; gap: 6px; align-items: center; }
  .pnav-dot  { width: 8px; height: 8px; border-radius: 50%; background: #e0d4bc; transition: all 0.25s; cursor: pointer; }
  .pnav-dot:hover { background: ${SAFFRON}88; }
  .pnav-dot.active { background: ${SAFFRON}; transform: scale(1.35); }
  .pnav-dot.done   { background: ${GREEN}; }

  /* Keyboard hint */
  .keyboard-hint {
    position: fixed; bottom: 80px; right: 1.5rem;
    font-size: 11px; color: #ccc; display: flex; gap: 6px; align-items: center;
    pointer-events: none;
  }
  .key-badge {
    background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px;
    padding: 1px 5px; font-family: monospace; font-size: 11px; color: #888;
  }

  /* Completion modal */
  .completion-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 1rem;
    animation: fadeIn 0.2s ease;
    overflow-y: auto;
  }
  .completion-card {
    background: white; border-radius: 24px; padding: 32px 28px;
    text-align: center; max-width: 380px; width: 100%;
    animation: fadeUp 0.35s ease both;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    margin: auto;
  }
  .comp-emoji    { font-size: 48px; margin-bottom: 12px; }
  .comp-title    { font-family: 'Alumni Sans', sans-serif; font-size: 28px; font-weight: 800; color: ${HERITAGE}; margin-bottom: 6px; }
  .comp-subtitle { font-size: 14px; color: #888; margin-bottom: 16px; line-height: 1.5; }
  .comp-points {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: linear-gradient(135deg, #FFF8ED, #FFF3E0);
    border: 1.5px solid ${SAFFRON}44; border-radius: 16px;
    padding: 12px 20px; margin-bottom: 16px;
  }
  .comp-points-icon  { font-size: 22px; }
  .comp-points-value { font-family: 'Alumni Sans', sans-serif; font-size: 34px; font-weight: 800; color: ${SAFFRON}; line-height: 1; }
  .comp-points-label { font-size: 14px; font-weight: 600; color: #b86000; }
  .comp-badges {
    background: #F8F4FF; border: 1px solid #E0D4F0; border-radius: 14px;
    padding: 12px 16px; margin-bottom: 16px; text-align: left;
  }
  .comp-badges-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #7B2D8B; margin-bottom: 10px; }
  .comp-badge-row { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
  .comp-badge-row:last-child { margin-bottom: 0; }
  .comp-badge-emoji { font-size: 20px; flex-shrink: 0; }
  .comp-badge-text  { font-size: 14px; color: #333; line-height: 1.3; }
  .comp-btn {
    display: block; width: 100%; padding: 12px; border-radius: 999px; border: none;
    cursor: pointer; font-family: 'Alumni Sans', sans-serif; font-size: 16px; font-weight: 700;
    margin-bottom: 8px; transition: all 0.2s;
  }
  .comp-next      { background: ${HERITAGE}; color: white; box-shadow: 0 4px 16px rgba(0,80,158,0.25); }
  .comp-next:hover { box-shadow: 0 6px 22px rgba(0,80,158,0.4); transform: translateY(-1px); }
  .comp-primary   { background: ${SAFFRON}; color: white; box-shadow: 0 4px 16px rgba(255,142,0,0.3); }
  .comp-primary:hover   { box-shadow: 0 6px 22px rgba(255,142,0,0.45); transform: translateY(-1px); }
  .comp-dashboard { background: white; color: ${HERITAGE}; border: 1.5px solid ${HERITAGE}44; }
  .comp-dashboard:hover { background: ${HERITAGE}0d; }
  .comp-secondary { background: #f5f5f5; color: #999; font-size: 14px; }
  .comp-secondary:hover { background: #eee; }

  @media (max-width: 480px) {
    .player-body { padding: 16px 1rem 115px; }
    .snip-hook { font-size: 22px; }
    .snip-explanation { font-size: 15px; }
    .snip-body { padding: 18px 16px 14px; }
    .pnav-btn  { padding: 10px 18px; font-size: 15px; }
    .player-nav { padding: 10px 1rem; }
    .keyboard-hint { display: none; }
  }
`;

export default function SnippetPlayer({
  course, theme, module, lesson, levelId, settings,
  allLessons = [], earnedBadges = [],
  onBackToLessons, onDashboard, onComplete, onNextLesson
}) {
  const [snippets,     setSnippets]     = useState([]);
  const [translations, setTranslations] = useState({});
  const [assets,       setAssets]       = useState({});
  const [current,      setCurrent]      = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [done,         setDone]         = useState(false);
  const [totalPoints,  setTotalPoints]  = useState(0);
  const [snippetDir,   setSnippetDir]   = useState("next"); // 'next' | 'prev'

  // Swipe tracking
  const touchStartX  = useRef(null);
  const touchStartY  = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const mappings = await supabase(
          "lesson_snippet_mapping",
          `?select=snippet_id,order_index&lesson_id=eq.${lesson.lesson_id}&order=order_index`
        );
        if (!mappings || mappings.length === 0) {
          setSnippets([]);
          setLoading(false);
          return;
        }

        const ids = mappings.map(m => m.snippet_id);
        const idFilter = `&snippet_id=in.(${ids.join(",")})`;

        const [cores, transList, assetData] = await Promise.all([
          supabase("snippet_core", `?select=*${idFilter}`),
          supabase("snippet_translations", `?select=*${idFilter}`),
          supabase("asset_library", "?select=*"),
        ]);

        const assetMap = {};
        (assetData || []).forEach(a => { assetMap[a.asset_id] = a; });

        const prefCode = settings.languageCode;
        const transMap = {};
        (transList || []).forEach(t => {
          if (!transMap[t.snippet_id]) transMap[t.snippet_id] = {};
          transMap[t.snippet_id][t.language] = t;
        });
        const resolvedTrans = {};
        ids.forEach(id => {
          const opts = transMap[id] || {};
          resolvedTrans[id] = opts[prefCode] || opts[DEFAULT_LANG_CODE] || Object.values(opts)[0] || null;
        });

        const coreMap = {};
        (cores || []).forEach(c => { coreMap[c.snippet_id] = c; });
        const ordered = mappings
          .sort((a, b) => a.order_index - b.order_index)
          .map(m => coreMap[m.snippet_id])
          .filter(Boolean);

        const points = ordered.reduce((sum, s) => sum + (s.snippet_value || 0), 0);

        setSnippets(ordered);
        setTranslations(resolvedTrans);
        setAssets(assetMap);
        setTotalPoints(points);
      } catch (e) {
        console.error("Snippet load error", e);
      }
      setLoading(false);
    }
    load();
  }, [lesson.lesson_id, settings.languageCode]);

  // Reset state when lesson changes (next lesson nav)
  useEffect(() => {
    setCurrent(0);
    setDone(false);
    setSnippetDir("next");
    setSnippets([]);
    setTranslations({});
    setAssets({});
    setTotalPoints(0);
    setLoading(true);
  }, [lesson.lesson_id]);

  const total    = snippets.length;
  const snip     = snippets[current];
  const trans    = snip ? (translations[snip.snippet_id] || {}) : {};
  const asset    = snip ? assets[snip.asset_id] : null;
  const isLast   = current === total - 1;
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

  const currentLessonIdx = allLessons.findIndex(l => l.lesson_id === lesson.lesson_id);
  const nextLesson = currentLessonIdx >= 0 ? allLessons[currentLessonIdx + 1] : null;

  function goNext() {
    if (loading) return;
    if (!isLast) {
      setSnippetDir("next");
      setCurrent(c => c + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setDone(true);
      if (onComplete) onComplete(lesson.lesson_id, totalPoints);
    }
  }

  function goPrev() {
    if (loading || current === 0) return;
    setSnippetDir("prev");
    setCurrent(c => c - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (done) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "Escape")     onBackToLessons();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [current, total, done, loading]);

  // ── Touch / Swipe handlers ──────────────────────────────────────────────────
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(false);
  }

  function onTouchMove(e) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Only handle horizontal swipes (not vertical scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      setIsDragging(true);
      // Resistance at edges
      const atStart = current === 0 && dx > 0;
      const atEnd   = isLast && dx < 0;
      const resistance = (atStart || atEnd) ? 0.15 : 0.38;
      setDragOffset(dx * resistance);
    }
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - (touchStartX.current || 0);
    touchStartX.current = null;
    touchStartY.current = null;
    setDragOffset(0);
    setIsDragging(false);
    if (Math.abs(dx) < 60) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  return (
    <>
      <style>{globalStyles + styles}</style>
      <div className="player-wrap">

        {/* Top bar */}
        <div className="player-top-bar">
          <button className="player-back" onClick={onBackToLessons}>← Back</button>
          <div className="player-lesson-name">{lesson.lesson_name}</div>
          <div className="player-count">{total > 0 ? `${current + 1} / ${total}` : ""}</div>
        </div>
        <div className="player-progress">
          <div className="player-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Body — swipe target */}
        <div
          className="player-body"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {loading ? (
            <div className="loading">Loading snippets…</div>
          ) : total === 0 ? (
            <div className="snip-card"><div className="snip-empty">No snippets available for this lesson yet.</div></div>
          ) : (
            <>
              <div
                className={`snip-card snip-enter-${snippetDir}`}
                key={`${snip.snippet_id}-${snippetDir}`}
                style={{
                  transform: `translateX(${dragOffset}px)`,
                  transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
                }}
              >
                {/* Image */}
                {asset && (
                  <div className="snip-img">
                    <img
                      src={asset.file_path}
                      alt={asset.alt_text || ""}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                    {snip.difficulty_level && (
                      <div className="snip-diff">{DIFFICULTY_STARS[snip.difficulty_level]}</div>
                    )}
                  </div>
                )}

                <div className="snip-body">
                  {trans.hook && <div className="snip-hook fs-heading">{trans.hook}</div>}
                  {trans.explanation && <div className="snip-explanation fs-body">{trans.explanation}</div>}

                  {(trans.key_term || trans.life_connection || trans.quiz_recap) && (
                    <div className="snip-divider" />
                  )}

                  {trans.key_term && (
                    <div className="snip-key-term">
                      <div className="snip-kt-label">Key Term</div>
                      <div className="snip-kt-word">{trans.key_term}</div>
                      {trans.key_term_meaning && <div className="snip-kt-meaning fs-body">{trans.key_term_meaning}</div>}
                    </div>
                  )}

                  {trans.life_connection && (
                    <div className="snip-life">
                      <div className="snip-life-label">Life Connection</div>
                      <div className="snip-life-text fs-body">{trans.life_connection}</div>
                    </div>
                  )}

                  {trans.quiz_recap && (
                    <div className="snip-quiz">
                      <div className="snip-quiz-label">Refresher Questions</div>
                      <div className="snip-quiz-text fs-body">{trans.quiz_recap}</div>
                    </div>
                  )}

                  {trans.source_citation && <div className="snip-citation">{trans.source_citation}</div>}

                  {!trans.hook && !trans.explanation && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb", fontSize: 15 }}>
                      Content for this snippet is coming soon.
                    </div>
                  )}
                </div>
              </div>

              {/* Swipe hint — only on mobile, fades after first swipe */}
              {total > 1 && (
                <div className="swipe-hint">
                  <span>← swipe to navigate →</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Keyboard hint — desktop only */}
        {!loading && total > 0 && (
          <div className="keyboard-hint">
            <span className="key-badge">←</span>
            <span className="key-badge">→</span>
            <span style={{ marginLeft: 4 }}>navigate</span>
            <span style={{ marginLeft: 8 }} className="key-badge">Esc</span>
            <span style={{ marginLeft: 4 }}>back</span>
          </div>
        )}

        {/* Bottom nav */}
        {!loading && total > 0 && (
          <div className="player-nav">
            <button className="pnav-btn pnav-prev" onClick={goPrev} disabled={current === 0}>← Prev</button>
            <div className="pnav-dots">
              {snippets.slice(0, Math.min(total, 10)).map((_, i) => (
                <div
                  key={i}
                  className={`pnav-dot ${i === current ? "active" : i < current ? "done" : ""}`}
                  onClick={() => {
                    if (i === current) return;
                    setSnippetDir(i > current ? "next" : "prev");
                    setCurrent(i);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  title={`Snippet ${i + 1}`}
                />
              ))}
              {total > 10 && <span style={{ fontSize: 11, color: "#aaa" }}>+{total - 10}</span>}
            </div>
            <button className={`pnav-btn ${isLast ? "pnav-finish" : "pnav-next"}`} onClick={goNext}>
              {isLast ? "Finish ✓" : "Next →"}
            </button>
          </div>
        )}

        {/* Completion modal */}
        {done && (
          <div className="completion-overlay">
            <div className="completion-card">
              <div className="comp-emoji">🎉</div>
              <div className="comp-title">Lesson Complete!</div>
              <div className="comp-subtitle">You've finished <strong>{lesson.lesson_name}</strong>.</div>

              <div className="comp-points">
                <span className="comp-points-icon">🪙</span>
                <span className="comp-points-value">+{totalPoints}</span>
                <span className="comp-points-label">Dharma Points</span>
              </div>

              {earnedBadges.length > 0 && (
                <div className="comp-badges">
                  <div className="comp-badges-title">Badges Earned</div>
                  {earnedBadges.map((b, i) => {
                    const meta = BADGE_META[b.type] || { emoji: "🏅", label: b.type };
                    return (
                      <div className="comp-badge-row" key={i}>
                        <span className="comp-badge-emoji">{meta.emoji}</span>
                        <span className="comp-badge-text"><strong>{meta.label}</strong> — {b.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {nextLesson && (
                <button className="comp-btn comp-next" onClick={() => onNextLesson(nextLesson)}>
                  Next: {nextLesson.lesson_name} →
                </button>
              )}
              <button className="comp-btn comp-primary" onClick={onBackToLessons}>Back to Lessons</button>
              <button className="comp-btn comp-dashboard" onClick={onDashboard}>Go to Dashboard</button>
              <button className="comp-btn comp-secondary" onClick={() => { setCurrent(0); setDone(false); }}>Review Again</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
