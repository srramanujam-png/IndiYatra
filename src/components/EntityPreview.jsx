import { createContext, useContext, useState, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────
// Standard entity card infrastructure — Course / Theme / Module / Lesson /
// Quiz / Snippet.
//
// This is the single, app-wide mechanism for "tap a card's body (anywhere
// outside its own CTA) → a lightweight preview popup opens, showing image,
// category, title, description, like/bookmark, progress and a Play (or
// Play + Quiz, for Lessons) button that performs the exact same action the
// underlying tab's own CTA would have performed."
//
// Usage from any page:
//   import { useEntityPreview } from "../components/EntityPreview";
//   const { openPreview } = useEntityPreview();
//   ...
//   <div onClick={() => openPreview({
//     type: "lesson", id: lesson.lesson_id,
//     title: lesson.lesson_name, crumb: `${theme.title} › ${mod.module_name}`,
//     desc: lesson.description, image: lesson.cover_image_url,
//     pct: null, // lessons don't carry a %; course/theme/module do
//     liked: likes.has(`lesson:${lesson.lesson_id}`),
//     bookmarked: bookmarks.has(`lesson:${lesson.lesson_id}`),
//     onToggleLike: () => onToggleLike("lesson", lesson.lesson_id, lesson.lesson_name),
//     onToggleBookmark: () => onToggleBookmark("lesson", lesson.lesson_id, lesson.lesson_name),
//     onPlay: () => onLessonClick(lesson),                 // same action as the row's own CTA
//     onQuiz: quiz ? () => onQuizClick(lesson, quiz) : null, // Lessons only
//   })}>
//     ...existing row markup, unchanged...
//     <button onClick={e => { e.stopPropagation(); onLessonClick(lesson); }}>Learn</button>
//   </div>
//
// Note on likes: per-item "N people liked this" counts only exist today for
// Snippets (snippet_core.like_count is already fetched app-wide). Course and
// Theme have no `likes` support at all in the schema (bookmark-only, by
// design — see supabase/likes_and_pairing_schema.sql). Module/Lesson/Quiz
// support liking (toggle) but there is no existing per-item count query
// (only community top-10 leaderboards), so their chip shows the icon/toggle
// without a number until a dedicated count RPC is added. Passing a
// `likeCount`/`bookmarkCount` number always renders it when you have one.

const EntityPreviewContext = createContext(null);

export function EntityPreviewProvider({ children }) {
  const [entity, setEntity] = useState(null);
  const scrollYRef = useRef(0);

  const openPreview = useCallback((e) => {
    if (!e || !e.type || e.id == null) return;
    scrollYRef.current = window.scrollY;
    setEntity(e);
  }, []);

  const closePreview = useCallback(() => {
    setEntity(null);
    // Overlay only — nothing should have moved, but enforce it explicitly
    // (matches the approved mockup's "close returns you to where you were").
    requestAnimationFrame(() => window.scrollTo(0, scrollYRef.current));
  }, []);

  return (
    <EntityPreviewContext.Provider value={{ entity, openPreview, closePreview }}>
      {children}
      <EntityPreviewPopup />
    </EntityPreviewContext.Provider>
  );
}

export function useEntityPreview() {
  const ctx = useContext(EntityPreviewContext);
  if (!ctx) throw new Error("useEntityPreview() must be used inside <EntityPreviewProvider>");
  return ctx;
}

// ── Which entity types support liking / bookmarking (matches the DB schema
//    exactly — see supabase/likes_and_pairing_schema.sql / bookmarks_schema.sql.
//    Course/Theme are bookmark-only by design; nothing here changes that. ──
export const SUPPORTS_LIKE = {
  course: false, theme: false, module: true, lesson: true, quiz: true, snippet: true,
};
export const SUPPORTS_BOOKMARK = {
  course: true, theme: true, module: true, lesson: true, quiz: true, snippet: true,
};

const TYPE_LABELS = {
  course: "Course", theme: "Theme", module: "Module", lesson: "Lesson", quiz: "Quiz", snippet: "Snippet",
};

// 0–30 grey · 31–60 saffron · 61–80 blue · 81–100 green
export function previewGaugeColor(pct) {
  if (pct > 80) return "#00924A";
  if (pct > 60) return "#00509E";
  if (pct > 30) return "#FF8E00";
  return "#B7B7B2";
}

// ── Small reusable pieces, used both inside cards on every page and inside
//    the popup itself, so the visual language stays identical everywhere. ──

export function ProgressBadge({ pct, size = 34, style }) {
  if (pct == null) return null;
  const strokeW = size * 0.1;
  const r = (size - strokeW) / 2, c = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = circumference * (1 - clamped / 100);
  const color = previewGaugeColor(clamped);
  const faceInset = strokeW;
  const faceSize = size - faceInset * 2;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }} title={`${clamped}% complete`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#E9E9E6" strokeWidth={strokeW} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dash} />
      </svg>
      <div style={{
        position: "absolute", top: faceInset, left: faceInset, width: faceSize, height: faceSize,
        borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 800, fontSize: size * 0.28, color: "#101828" }}>{clamped}%</span>
      </div>
    </div>
  );
}

const HEART_PATH = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
const BOOKMARK_PATH = "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z";

function Chip({ active, onClick, path, count, label }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick && onClick(); }}
      aria-label={label}
      title={label}
      style={{
        display: "flex", alignItems: "center", gap: 3, border: "none",
        background: active ? "rgba(255,142,0,0.14)" : "#F3F4F6",
        color: active ? "#FF8E00" : "#4A5565",
        borderRadius: 999, padding: "3px 7px", cursor: "pointer",
        fontFamily: "'Inter', system-ui, sans-serif", fontSize: 10, fontWeight: 700,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" fill={active ? "currentColor" : "none"}>
        <path d={path} />
      </svg>
      {count != null && <span>{count}</span>}
    </button>
  );
}

// Renders like + bookmark chips for a given entity type, auto-hiding
// "like" for types that don't support it (Course/Theme).
export function EntitySocialChips({ type, liked, bookmarked, likeCount, bookmarkCount, onToggleLike, onToggleBookmark, style }) {
  const showLike = SUPPORTS_LIKE[type];
  const showBookmark = SUPPORTS_BOOKMARK[type];
  if (!showLike && !showBookmark) return null;
  return (
    <div style={{ display: "flex", gap: 4, ...style }}>
      {showLike && <Chip active={!!liked} onClick={onToggleLike} path={HEART_PATH} count={likeCount} label="Like" />}
      {showBookmark && <Chip active={!!bookmarked} onClick={onToggleBookmark} path={BOOKMARK_PATH} count={bookmarkCount} label="Bookmark" />}
    </div>
  );
}

// ── The popup itself ──
function EntityPreviewPopup() {
  const { entity, closePreview } = useEntityPreview();
  if (!entity) return null;
  const { type, title, crumb, desc, image, pct, liked, bookmarked, likeCount, bookmarkCount,
          onToggleLike, onToggleBookmark, onPlay, onQuiz, playLabel, quizLabel } = entity;

  function runPlay() { closePreview(); onPlay && onPlay(); }
  function runQuiz() { closePreview(); onQuiz && onQuiz(); }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) closePreview(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(16,24,40,0.55)", backdropFilter: "blur(1.5px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 24,
      }}
    >
      <div style={{
        width: "100%", maxWidth: 360, background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB",
        overflow: "hidden", position: "relative", boxShadow: "0 20px 48px rgba(16,24,40,0.28)",
      }}>
        <button
          onClick={closePreview}
          aria-label="Close"
          style={{
            position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%",
            background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,0,0,0.08)",
            color: "#101828", cursor: "pointer", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >✕</button>

        {(SUPPORTS_LIKE[type] || SUPPORTS_BOOKMARK[type]) && (
          <div style={{ position: "absolute", top: 12, left: 12, zIndex: 5, display: "flex", gap: 8 }}>
            {SUPPORTS_LIKE[type] && (
              <PopupChip active={!!liked} onClick={() => onToggleLike && onToggleLike()} path={HEART_PATH} count={likeCount} label="Like" />
            )}
            {SUPPORTS_BOOKMARK[type] && (
              <PopupChip active={!!bookmarked} onClick={() => onToggleBookmark && onToggleBookmark()} path={BOOKMARK_PATH} count={bookmarkCount} label="Bookmark" />
            )}
          </div>
        )}

        <div style={{
          height: 172, width: "100%", position: "relative",
          backgroundImage: image ? `url('${image}')` : undefined,
          backgroundSize: "cover", backgroundPosition: "center",
          background: image ? undefined : "linear-gradient(135deg, rgba(0,80,158,0.14), rgba(255,142,0,0.10))",
        }}>
          <span style={{
            position: "absolute", bottom: 12, left: 16, zIndex: 2,
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.07em",
            textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, color: "#fff", background: "rgba(16,24,40,0.55)",
          }}>{TYPE_LABELS[type] || type}</span>
          {pct != null && (
            <ProgressBadge pct={pct} size={42} style={{ position: "absolute", bottom: 10, right: 14, zIndex: 3 }} />
          )}
        </div>

        <div style={{ padding: "18px 20px 20px" }}>
          {crumb && <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, color: "#4A5565", marginBottom: 6 }}>{crumb}</div>}
          <div style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif", fontSize: 19, fontWeight: 700, color: "#101828", lineHeight: 1.25, marginBottom: 8 }}>{title}</div>
          {desc && <div style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif", fontSize: 14, color: "#4A5565", lineHeight: 1.5, marginBottom: 18 }}>{desc}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            {onPlay && (
              <button onClick={runPlay} style={ctaBtnStyle(true)}>
                <PlayIcon /> {playLabel || "Open"}
              </button>
            )}
            {/* Lessons only: a second, distinct CTA for the lesson's quiz */}
            {onQuiz && (
              <button onClick={runQuiz} style={ctaBtnStyle(false)}>
                <QuizIcon /> {quizLabel || "Quiz"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PopupChip({ active, onClick, path, count, label }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick && onClick(); }}
      aria-label={label} title={label}
      style={{
        height: 34, padding: "0 10px", borderRadius: 999, background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)", border: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 5,
        fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, fontWeight: 700,
        color: active ? "#FF8E00" : "#4A5565", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" fill={active ? "currentColor" : "none"}>
        <path d={path} />
      </svg>
      {count != null && <span>{count}</span>}
    </button>
  );
}

function ctaBtnStyle(primary) {
  return {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: 13.5,
    color: primary ? "#fff" : "#00509E",
    background: primary ? "#00509E" : "rgba(0,80,158,0.08)",
    border: "none", borderRadius: 12, padding: "12px 16px", cursor: "pointer",
  };
}

function PlayIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
}
function QuizIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.2.9-1.2 1.7" />
      <circle cx="12" cy="16.7" r="0.6" fill="currentColor" />
    </svg>
  );
}
