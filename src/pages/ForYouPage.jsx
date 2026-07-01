import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { supabaseClient } from "../lib/auth";
import { globalStyles } from "../styles/global";
import { useAuthContext } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import RecommendationsRail from "../components/RecommendationsRail";

// ── Thumb palettes (cycles by card index) ──────────────────────────────────────
const THUMB_PALETTES = [
  { bg: "#EEF5FF", icon: "🏛️" },
  { bg: "#FFF3E8", icon: "🪔" },
  { bg: "#E8F8F0", icon: "🌿" },
  { bg: "#F3EEFF", icon: "🎨" },
  { bg: "#FFF8E1", icon: "🏺" },
  { bg: "#E8F4FD", icon: "🌊" },
  { bg: "#FFF0F0", icon: "🎭" },
  { bg: "#F0FFF4", icon: "🌸" },
];

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = `
  /* ── Resume Yatra card ── */
  .fy-resume {
    background: white;
    border: 1px solid #E5E7EB;
    border-left: 3px solid ${SAFFRON};
    border-radius: 0 12px 12px 0;
    padding: 20px 24px;
    margin-bottom: 20px;
    display: flex; align-items: center; gap: 24px;
  }
  .fy-resume-body { flex: 1; min-width: 0; }
  .fy-resume-label {
    font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 4px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-resume-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 1.25rem; font-weight: 500; color: #101828;
    margin-bottom: 10px; line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fy-progress-wrap {
    height: 4px; background: #F3F4F6; border-radius: 2px; margin-bottom: 8px;
  }
  .fy-progress-fill {
    height: 4px; background: ${SAFFRON}; border-radius: 2px; transition: width 0.4s;
  }
  .fy-resume-meta {
    font-size: 0.75rem; color: #4A5565;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-resume-btn {
    background: ${SAFFRON}; color: white; border: none; border-radius: 12px;
    padding: 12px 24px; font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.875rem; font-weight: 500; cursor: pointer; white-space: nowrap;
    min-height: 44px; flex-shrink: 0; transition: opacity 0.2s;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29,41,61,0.02);
  }
  .fy-resume-btn:hover { opacity: 0.9; }

  /* ── Lesson carousel ── */
  .fy-carousel {
    display: flex; gap: 12px;
    overflow-x: auto; overflow-y: visible;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding-bottom: 2px;
  }
  .fy-carousel::-webkit-scrollbar { display: none; }

  /* ── Lesson card ── */
  .fy-card {
    flex: 0 0 172px; scroll-snap-align: start;
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    overflow: hidden; cursor: pointer;
    transition: border-color 0.15s, transform 0.18s;
    display: flex; flex-direction: column;
  }
  .fy-card:hover  { border-color: ${SAFFRON}80; transform: translateY(-2px); }
  .fy-card:active { transform: translateY(0); }

  .fy-thumb {
    height: 90px; width: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.875rem; position: relative; flex-shrink: 0;
  }
  .fy-thumb-tag {
    position: absolute; bottom: 6px; left: 6px; right: 6px;
    font-size: 0.5625rem; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; color: white;
    background: rgba(0,0,0,0.45); border-radius: 4px;
    padding: 2px 6px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .fy-card-body { padding: 10px 12px 12px; flex: 1; display: flex; flex-direction: column; }
  .fy-card-name {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.8125rem; font-weight: 700; color: #101828;
    line-height: 1.4; margin-bottom: 6px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .fy-card-meta { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: auto; }
  .fy-chip {
    font-size: 0.5625rem; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; border-radius: 999px; padding: 2px 7px;
    white-space: nowrap; font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-chip-saffron { background: ${SAFFRON}15; color: ${SAFFRON}; }
  .fy-chip-heritage { background: ${HERITAGE}12; color: ${HERITAGE}; }
  .fy-chip-green    { background: ${GREEN}12;    color: ${GREEN};    }

  /* ── List items (My Likes / My Bookmarks) ── */
  .fy-list { display: flex; flex-direction: column; gap: 8px; }
  .fy-list-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px; background: #F9FAFB;
    border-radius: 10px; border: 1px solid #E5E7EB;
    cursor: pointer; transition: background 0.15s, border-color 0.15s;
  }
  .fy-list-item:hover { background: white; border-color: ${SAFFRON}40; }
  .fy-list-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 1.125rem;
  }
  .fy-list-body { flex: 1; min-width: 0; }
  .fy-list-title {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.9375rem; font-weight: 700; color: #101828;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fy-list-sub {
    font-size: 0.75rem; color: #4A5565; margin-top: 2px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-list-arrow { font-size: 1rem; color: #D1D5DB; flex-shrink: 0; }

  /* ── My Likes horizontal layout ── */
  .fy-likes-row {
    display: flex; gap: 12px; align-items: stretch;
  }
  .fy-play-all {
    flex-shrink: 0; width: 108px; min-height: 108px;
    background: ${SAFFRON}; border-radius: 12px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 4px; cursor: pointer; padding: 12px; text-align: center;
    transition: opacity 0.2s; border: none;
  }
  .fy-play-all:hover { opacity: 0.9; }
  .fy-play-all-icon { font-size: 1.75rem; line-height: 1; }
  .fy-play-all-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.75rem; font-weight: 600; color: white;
  }
  .fy-play-all-count {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.625rem; color: rgba(255,255,255,0.82);
  }
  .fy-likes-scroll {
    flex: 1; overflow-x: auto; display: flex; gap: 10px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .fy-likes-scroll::-webkit-scrollbar { display: none; }
  .fy-like-card {
    flex: 0 0 148px; scroll-snap-align: start;
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    padding: 12px; cursor: pointer;
    display: flex; flex-direction: column; gap: 5px;
    transition: border-color 0.15s, transform 0.15s;
  }
  .fy-like-card:hover { border-color: ${SAFFRON}60; transform: translateY(-1px); }
  .fy-like-card-icon { font-size: 1.25rem; line-height: 1; }
  .fy-like-card-name {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 0.875rem; font-weight: 500; color: ${HERITAGE};
    line-height: 1.3;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .fy-like-card-sub {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.6875rem; color: #4A5565; line-height: 1.4;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fy-like-card-when {
    margin-top: auto;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.625rem; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; color: ${SAFFRON};
  }

  /* ── Sign-in CTA ── */
  .fy-signin {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    padding: 48px 32px; text-align: center; margin-bottom: 20px;
  }
  .fy-signin-icon { font-size: 3rem; margin-bottom: 16px; }
  .fy-signin-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.5rem;
    font-weight: 500; color: #101828; margin-bottom: 8px;
  }
  .fy-signin-sub {
    font-size: 0.9375rem; color: #4A5565; line-height: 1.6;
    max-width: 380px; margin: 0 auto 24px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .fy-signin-btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  /* ── Skeleton ── */
  .fy-skel-row { display: flex; gap: 12px; }
  .fy-skel-card {
    flex: 0 0 172px; border-radius: 12px; height: 162px;
    background: linear-gradient(90deg, #F3F4F6 25%, #FFFFFF 50%, #F3F4F6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
  .fy-skel-list {
    height: 62px; border-radius: 10px; margin-bottom: 8px;
    background: linear-gradient(90deg, #F3F4F6 25%, #FFFFFF 50%, #F3F4F6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .fy-resume { flex-direction: column; align-items: stretch; gap: 14px; padding: 18px 16px; }
    .fy-resume-title { font-size: 1.0625rem; }
    .fy-resume-btn { text-align: center; }
    .fy-card { flex: 0 0 148px; }
    .fy-thumb { height: 80px; }
  }
`;

// ── Shared section header ──────────────────────────────────────────────────────
function SectionHead({ title, color = SAFFRON, count, onSeeAll }) {
  return (
    <div className="page-section-head">
      <div className="page-section-title" style={{ borderBottomColor: color }}>
        {title}
        {count != null && (
          <span className="page-section-meta" style={{ marginLeft: 8, borderBottom: "none" }}>
            {count}
          </span>
        )}
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "0.8125rem", fontWeight: 600, color: SAFFRON,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          See all →
        </button>
      )}
    </div>
  );
}

// ── Lesson carousel card ───────────────────────────────────────────────────────
function LessonCard({ lesson, index, chipLabel, chipCount, chipColor, onClick }) {
  const pal = THUMB_PALETTES[index % THUMB_PALETTES.length];
  const chipClass =
    chipColor === "heritage" ? "fy-chip fy-chip-heritage" :
    chipColor === "green"    ? "fy-chip fy-chip-green"    :
                               "fy-chip fy-chip-saffron";
  return (
    <div className="fy-card" onClick={onClick} title={lesson.lesson_name}>
      <div className="fy-thumb" style={{ background: pal.bg }}>
        <span>{pal.icon}</span>
        {lesson.theme_title && (
          <div className="fy-thumb-tag">{lesson.theme_title}</div>
        )}
      </div>
      <div className="fy-card-body">
        <div className="fy-card-name">{lesson.lesson_name}</div>
        <div className="fy-card-meta">
          {chipLabel && (
            <span className={chipClass}>{chipLabel}</span>
          )}
          {chipCount != null && chipCount > 0 && (
            <span className="fy-chip fy-chip-heritage">
              {chipCount >= 1000
                ? (chipCount / 1000).toFixed(1) + "k"
                : chipCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Carousel skeleton ──────────────────────────────────────────────────────────
function CarouselSkeleton() {
  return (
    <div className="fy-skel-row">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="fy-skel-card" />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ForYouPage({
  settings,
  onOpenSettings,
  onSaveSettings,
  languages = [],
  onBack,
  onDashboard,
  onForYou,
  onAllCourses,
  onLikes,
  onBookmarks,
  onDiscover,
  isAdmin,
  onAdmin,
  userEditorialRole,
  onEditor,
  activePage,
  onResume,
  lessonProgress,      // Map<lesson_id, snippet_index>
  onPlaySnippet,       // (snippetIds, startIndex) → void
  onNavigate,          // (bookmarkItem) → void
  onOpenLesson,        // (lesson_id) → void
}) {
  const { user, profile, onSignIn } = useAuthContext();
  const isGuest = !user || user.is_anonymous;

  // ── State ──────────────────────────────────────────────────────────────────
  const [resumeLesson,  setResumeLesson]  = useState(null);
  const [likedLessons,  setLikedLessons]  = useState([]);
  const [savedLessons,  setSavedLessons]  = useState([]);
  const [myLikes,           setMyLikes]           = useState([]);
  const [allLikedSnippetIds, setAllLikedSnippetIds] = useState([]);
  const [myBookmarks,   setMyBookmarks]   = useState([]);

  const [loadingResume, setLoadingResume] = useState(true);
  const [loadingLiked,  setLoadingLiked]  = useState(true);
  const [loadingSaved,  setLoadingSaved]  = useState(true);
  const [loadingLikes,  setLoadingLikes]  = useState(true);
  const [loadingBm,     setLoadingBm]     = useState(true);

  // ── Helper: fetch lesson metadata for a list of lesson_ids ────────────────
  async function fetchLessonMeta(lessonIds) {
    if (!lessonIds.length) return [];
    const [lessons, modules, themes] = await Promise.all([
      supabase("lessons", `?select=lesson_id,lesson_name,module_id&lesson_id=in.(${lessonIds.join(",")})`),
      // modules fetched after lessons — need module_ids first
      Promise.resolve(null),
      Promise.resolve(null),
    ]);
    const saLessons = Array.isArray(lessons) ? lessons : [];
    const moduleIds = [...new Set(saLessons.map(l => l.module_id).filter(Boolean))];
    if (!moduleIds.length) return saLessons.map(l => ({ ...l, theme_title: "", course_name: "" }));
    const [mods, crses] = await Promise.all([
      supabase("modules", `?select=module_id,theme_id,course_id&module_id=in.(${moduleIds.join(",")})`),
      Promise.resolve(null),
    ]);
    const saMods = Array.isArray(mods) ? mods : [];
    const themeIds = [...new Set(saMods.map(m => m.theme_id).filter(Boolean))];
    const thms = themeIds.length
      ? await supabase("themes", `?select=theme_id,title&theme_id=in.(${themeIds.join(",")})`)
      : [];
    // Build lookup maps
    const modMap   = {};  saMods.forEach(m => { modMap[m.module_id]   = m; });
    const themeMap = {};  (Array.isArray(thms) ? thms : []).forEach(t => { themeMap[t.theme_id] = t.title; });
    return saLessons.map(l => {
      const mod = modMap[l.module_id] || {};
      return {
        ...l,
        theme_title: themeMap[mod.theme_id] || "",
      };
    });
  }

  // ── Resume Yatra ─────────────────────────────────────────────────────────
  // Query lesson_progress directly — more reliable than profile.last_visited_route
  // which is only set via certain nav paths and may not yet be loaded.
  useEffect(() => {
    if (isGuest || !user?.id) { setLoadingResume(false); return; }
    async function load() {
      try {
        // Most recently updated in-progress lesson
        const { data: progRows } = await supabaseClient
          .from("lesson_progress")
          .select("lesson_id, snippet_index, updated_at")
          .eq("profile_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (!progRows?.length) { setLoadingResume(false); return; }
        const { lesson_id, snippet_index } = progRows[0];

        // Lesson name + snippet count in parallel
        const [lessons, mapping] = await Promise.all([
          supabase("lessons", `?select=lesson_id,lesson_name,module_id&lesson_id=eq.${lesson_id}`),
          supabase("lesson_snippet_mapping", `?select=snippet_id&lesson_id=eq.${lesson_id}`),
        ]);
        const lesson = Array.isArray(lessons) ? lessons[0] : null;
        const total  = Array.isArray(mapping) ? mapping.length : 0;
        if (!lesson || total === 0) { setLoadingResume(false); return; }

        // Theme title via module
        const mods = lesson.module_id
          ? await supabase("modules", `?select=module_id,theme_id&module_id=eq.${lesson.module_id}`)
          : [];
        const mod = Array.isArray(mods) ? mods[0] : null;
        const thms = mod?.theme_id
          ? await supabase("themes", `?select=title&theme_id=eq.${mod.theme_id}`)
          : [];
        const themeTitle = Array.isArray(thms) && thms[0]?.title ? thms[0].title : "";

        setResumeLesson({
          lesson_id,
          lesson_name:    lesson.lesson_name || "Your last lesson",
          theme_title:    themeTitle,
          snippet_index,
          total_snippets: total,
        });
      } catch (e) {
        console.warn("ForYouPage resume:", e);
      }
      setLoadingResume(false);
    }
    load();
  }, [isGuest, user?.id]);

  // ── Most Liked Lessons ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        // 1. Top liked snippets
        const snips = await supabase(
          "snippet_core",
          "?select=snippet_id,like_count&order=like_count.desc&like_count=gt.0&limit=40"
        );
        if (!Array.isArray(snips) || !snips.length) { setLoadingLiked(false); return; }
        const likeMap = {};
        snips.forEach(s => { likeMap[s.snippet_id] = s.like_count || 0; });
        // 2. Map snippets → lessons
        const snippetIds = snips.map(s => s.snippet_id);
        const mapping = await supabase(
          "lesson_snippet_mapping",
          `?select=lesson_id,snippet_id&snippet_id=in.(${snippetIds.join(",")})`
        );
        if (!Array.isArray(mapping)) { setLoadingLiked(false); return; }
        // 3. Aggregate likes per lesson, pick top 6
        const lessonLikes = {};
        mapping.forEach(m => {
          lessonLikes[m.lesson_id] = (lessonLikes[m.lesson_id] || 0) + (likeMap[m.snippet_id] || 0);
        });
        const topIds = Object.entries(lessonLikes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([id]) => id);
        if (!topIds.length) { setLoadingLiked(false); return; }
        // 4. Fetch lesson + theme metadata
        const meta = await fetchLessonMeta(topIds);
        // 5. Merge like counts and preserve sort order
        const result = topIds.map(id => {
          const m = meta.find(l => l.lesson_id === id);
          if (!m) return null;
          return { ...m, like_count: lessonLikes[id] || 0 };
        }).filter(Boolean);
        setLikedLessons(result);
      } catch (e) {
        console.warn("ForYouPage likedLessons:", e);
      }
      setLoadingLiked(false);
    }
    load();
  }, []);

  // ── Most Saved Lessons ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        // 1. All snippet bookmarks — count by content_id
        const bms = await supabase(
          "bookmarks",
          "?select=content_id&content_type=eq.snippet"
        );
        if (!Array.isArray(bms) || !bms.length) { setLoadingSaved(false); return; }
        const counts = {};
        bms.forEach(b => { counts[b.content_id] = (counts[b.content_id] || 0) + 1; });
        // Top 30 snippet_ids by save count
        const topSnipIds = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30)
          .map(([id]) => id);
        // 2. Map snippets → lessons
        const mapping = await supabase(
          "lesson_snippet_mapping",
          `?select=lesson_id,snippet_id&snippet_id=in.(${topSnipIds.join(",")})`
        );
        if (!Array.isArray(mapping)) { setLoadingSaved(false); return; }
        // 3. Aggregate saves per lesson, pick top 6
        const lessonSaves = {};
        mapping.forEach(m => {
          lessonSaves[m.lesson_id] = (lessonSaves[m.lesson_id] || 0) + (counts[m.snippet_id] || 0);
        });
        const topIds = Object.entries(lessonSaves)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([id]) => id);
        if (!topIds.length) { setLoadingSaved(false); return; }
        // 4. Fetch lesson + theme metadata
        const meta = await fetchLessonMeta(topIds);
        const result = topIds.map(id => {
          const m = meta.find(l => l.lesson_id === id);
          if (!m) return null;
          return { ...m, save_count: lessonSaves[id] || 0 };
        }).filter(Boolean);
        setSavedLessons(result);
      } catch (e) {
        console.warn("ForYouPage savedLessons:", e);
      }
      setLoadingSaved(false);
    }
    load();
  }, []);

  // ── My Likes (preview — top 4 unique lessons) ─────────────────────────────
  useEffect(() => {
    if (isGuest) { setLoadingLikes(false); return; }
    async function load() {
      try {
        const { data } = await supabaseClient.rpc("get_user_likes");
        const rows = Array.isArray(data) ? data : [];
        // All snippet IDs for "Play all" button
        setAllLikedSnippetIds(rows.map(r => r.snippet_id).filter(Boolean));
        // Deduplicate by lesson_id, keep most recent (preview cards)
        const seen = new Set();
        const preview = [];
        for (const row of rows) {
          if (row.lesson_id && !seen.has(row.lesson_id)) {
            seen.add(row.lesson_id);
            preview.push(row);
          }
          if (preview.length >= 4) break;
        }
        setMyLikes(preview);
      } catch (e) {
        console.warn("ForYouPage myLikes:", e);
      }
      setLoadingLikes(false);
    }
    load();
  }, [isGuest, user?.id]);

  // ── My Bookmarks (preview — top 4) ───────────────────────────────────────
  useEffect(() => {
    if (isGuest) { setLoadingBm(false); return; }
    async function load() {
      try {
        const { data } = await supabaseClient.rpc("get_user_bookmarks");
        const rows = Array.isArray(data) ? data : [];
        // Show lessons and snippets only in the preview
        const preview = rows
          .filter(b => b.content_type === "lesson" || b.content_type === "snippet")
          .slice(0, 4);
        setMyBookmarks(preview);
      } catch (e) {
        console.warn("ForYouPage myBookmarks:", e);
      }
      setLoadingBm(false);
    }
    load();
  }, [isGuest, user?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatRelative(ts) {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7)  return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  // ── Progress % for Resume Yatra ───────────────────────────────────────────
  // snippet_index is 0-based; clamp to [1, total] so bar is never empty
  const resumePct = resumeLesson
    ? Math.min(100, Math.round(
        (Math.max(1, resumeLesson.snippet_index + 1) / resumeLesson.total_snippets) * 100
      ))
    : 0;

  const navLinks = [
    { label: "Home",        onClick: onBack                  },
    { label: "All Courses", onClick: onAllCourses            },
    { label: "For You",     onClick: onForYou  || (() => {}) },
    { label: "Dashboard",   onClick: onDashboard             },
    { label: "Discover",    onClick: onDiscover              },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyles + styles}</style>

      <PageHeader
        onHome={onBack}
        onOpenSettings={onOpenSettings}
        onResume={onResume}
        isAdmin={isAdmin}
        onAdmin={onAdmin}
        userEditorialRole={userEditorialRole}
        onEditor={onEditor}
        activePage={activePage}
        settings={settings}
        onSaveSettings={onSaveSettings}
        languages={languages}
        navLinks={navLinks}
      />

      <div className="breadcrumb">
        <a onClick={onBack}>Home</a>
        <span className="sep">›</span>
        <span className="current">For You</span>
      </div>

      <div className="page-hero">
        <div className="page-title">✦ For You</div>
        <div className="page-subtitle">
          {isGuest
            ? "Sign in to unlock personalised recommendations, your likes, and bookmarks."
            : "Picked for you based on your interests and activity."}
        </div>
      </div>

      <div className="page-wrap">

        {/* ── Resume Yatra ── */}
        {!loadingResume && resumeLesson && (
          <div className="fy-resume">
            <div className="fy-resume-body">
              <div className="fy-resume-label">▶ Resume yatra</div>
              <div className="fy-resume-title">{resumeLesson.lesson_name}</div>
              <div className="fy-progress-wrap">
                <div
                  className="fy-progress-fill"
                  style={{ width: `${resumePct}%` }}
                />
              </div>
              <div className="fy-resume-meta">
                Snippet {resumeLesson.snippet_index + 1} of {resumeLesson.total_snippets}
                {resumeLesson.theme_title ? ` · ${resumeLesson.theme_title}` : ""}
              </div>
            </div>
            <button className="fy-resume-btn" onClick={onResume}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Recommendations Rail (only for signed-in users) ── */}
        {/* RecommendationsRail renders its own .rec-rail card — no extra wrapper needed */}
        {!isGuest && (
          <RecommendationsRail
            userId={user.id}
            onOpenLesson={onOpenLesson}
            limit={8}
          />
        )}

        {/* ── Sign-in CTA (anonymous users) ── */}
        {isGuest && (
          <div className="fy-signin">
            <div className="fy-signin-icon">✦</div>
            <div className="fy-signin-title">Your personal heritage journey</div>
            <div className="fy-signin-sub">
              Create a free account to get personalised lesson recommendations,
              track your progress, and save your favourite snippets.
            </div>
            <div class="fy-signin-btns">
              <button className="btn-primary btn-saffron" onClick={onSignIn}>
                Create free account
              </button>
              <button className="btn-outline" onClick={onSignIn}>
                Sign in
              </button>
            </div>
          </div>
        )}

        {/* ── Most Liked by Others ── */}
        <div className="page-section rail-heritage">
          <SectionHead
            title="Most liked by others"
            color={HERITAGE}
          />
          {loadingLiked ? (
            <CarouselSkeleton />
          ) : likedLessons.length === 0 ? (
            <p style={{ fontSize: "0.9375rem", color: "#4A5565", fontStyle: "italic", fontFamily: "'Nunito Sans',system-ui,sans-serif" }}>
              No data yet — be the first to explore!
            </p>
          ) : (
            <div className="fy-carousel">
              {likedLessons.map((lesson, idx) => (
                <LessonCard
                  key={lesson.lesson_id}
                  lesson={lesson}
                  index={idx}
                  chipLabel={lesson.like_count >= 1000
                    ? (lesson.like_count / 1000).toFixed(1) + "k likes"
                    : lesson.like_count + " likes"}
                  chipColor="heritage"
                  onClick={() => onOpenLesson?.(lesson.lesson_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Most Saved by Others ── */}
        <div className="page-section rail-green">
          <SectionHead
            title="Most saved by others"
            color={GREEN}
          />
          {loadingSaved ? (
            <CarouselSkeleton />
          ) : savedLessons.length === 0 ? (
            <p style={{ fontSize: "0.9375rem", color: "#4A5565", fontStyle: "italic", fontFamily: "'Nunito Sans',system-ui,sans-serif" }}>
              No bookmarks yet — come back soon!
            </p>
          ) : (
            <div className="fy-carousel">
              {savedLessons.map((lesson, idx) => (
                <LessonCard
                  key={lesson.lesson_id}
                  lesson={lesson}
                  index={idx + 3}
                  chipLabel={lesson.save_count >= 1000
                    ? (lesson.save_count / 1000).toFixed(1) + "k saves"
                    : lesson.save_count + " saves"}
                  chipColor="green"
                  onClick={() => onOpenLesson?.(lesson.lesson_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── My Likes (signed-in only) ── */}
        {!isGuest && (
          <div className="page-section rail-saffron">
            <SectionHead
              title="My likes"
              color={SAFFRON}
              onSeeAll={onLikes}
            />
            {loadingLikes ? (
              <div className="fy-likes-row">
                <div className="skel" style={{ flexShrink: 0, width: 108, height: 108, borderRadius: 12 }} />
                <div className="fy-likes-scroll">
                  {[0,1,2].map(i => <div key={i} className="fy-skel-card" style={{ flex: "0 0 148px", height: 108 }} />)}
                </div>
              </div>
            ) : myLikes.length === 0 ? (
              <p style={{ fontSize: "0.9375rem", color: "#4A5565", fontStyle: "italic", fontFamily: "'Nunito Sans',system-ui,sans-serif" }}>
                You haven't liked any snippets yet. Tap ♥ while reading to save your favourites.
              </p>
            ) : (
              <div className="fy-likes-row">

                {/* Fixed "Play all" card */}
                <button
                  className="fy-play-all"
                  onClick={() => allLikedSnippetIds.length > 0 && onPlaySnippet?.(allLikedSnippetIds, 0)}
                  title="Play all my likes"
                >
                  <div className="fy-play-all-icon">▶</div>
                  <div className="fy-play-all-label">Play all</div>
                  {allLikedSnippetIds.length > 0 && (
                    <div className="fy-play-all-count">{allLikedSnippetIds.length} snippets</div>
                  )}
                </button>

                {/* Scrollable lesson cards — each opens the lesson in lesson mode */}
                <div className="fy-likes-scroll">
                  {myLikes.map((item, idx) => {
                    const pal = THUMB_PALETTES[idx % THUMB_PALETTES.length];
                    return (
                      <div
                        key={item.lesson_id + idx}
                        className="fy-like-card"
                        onClick={() => onOpenLesson?.(item.lesson_id)}
                      >
                        <div className="fy-like-card-icon">{pal.icon}</div>
                        <div className="fy-like-card-name">{item.lesson_name || item.hook || "Liked lesson"}</div>
                        <div className="fy-like-card-sub">{item.theme_title || item.course_name || ""}</div>
                        {item.liked_at && (
                          <div className="fy-like-card-when">♥ {formatRelative(item.liked_at)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── My Bookmarks (signed-in only) ── */}
        {!isGuest && (
          <div className="page-section">
            <SectionHead
              title="My bookmarks"
              color={SAFFRON}
              onSeeAll={onBookmarks}
            />
            {loadingBm ? (
              <>
                <div className="fy-skel-list" />
                <div className="fy-skel-list" />
                <div className="fy-skel-list" />
              </>
            ) : myBookmarks.length === 0 ? (
              <p style={{ fontSize: "0.9375rem", color: "#4A5565", fontStyle: "italic", fontFamily: "'Nunito Sans',system-ui,sans-serif" }}>
                No bookmarks yet. Bookmark lessons and snippets to save them for later.
              </p>
            ) : (
              <div className="fy-list">
                {myBookmarks.map((item, idx) => {
                  const pal = THUMB_PALETTES[(idx + 4) % THUMB_PALETTES.length];
                  const typeMeta = {
                    lesson:  { icon: "📖", label: "Lesson"  },
                    snippet: { icon: "✦",  label: "Snippet" },
                  }[item.content_type] || { icon: "📌", label: "Saved" };
                  return (
                    <div
                      key={item.content_id + idx}
                      className="fy-list-item"
                      onClick={() => onNavigate?.(item)}
                    >
                      <div className="fy-list-icon" style={{ background: pal.bg }}>
                        {typeMeta.icon}
                      </div>
                      <div className="fy-list-body">
                        <div className="fy-list-title">
                          {item.content_name || item.lesson_name || "Saved item"}
                        </div>
                        <div className="fy-list-sub">
                          {typeMeta.label}
                          {item.theme_title ? ` · ${item.theme_title}` : ""}
                          {item.created_at ? ` · ${formatRelative(item.created_at)}` : ""}
                        </div>
                      </div>
                      <i className="ti ti-chevron-right fy-list-arrow" aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
