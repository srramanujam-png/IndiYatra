import { useState, useEffect, useRef } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, DEFAULT_LANG_CODE, DIFFICULTY_STARS } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { loadUserLikes, insertLike, deleteLike } from "../lib/auth";
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
    cursor: pointer; font-family: 'Alumni Sans', sans-serif; font-size: 1rem;
    font-weight: 700; color: #888; transition: color 0.2s; flex-shrink: 0;
  }
  .player-back:hover { color: ${SAFFRON}; }
  .player-lesson-name {
    font-family: 'Alumni Sans', sans-serif; font-size: 1rem; font-weight: 700;
    color: ${HERITAGE}; flex: 1; text-align: center;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .player-count { font-size: 0.875rem; color: #aaa; font-weight: 600; flex-shrink: 0; }
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
  }
  @keyframes snippetFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .snip-enter-next { animation: snippetFadeIn 0.2s ease both; }
  .snip-enter-prev { animation: snippetFadeIn 0.2s ease both; }

  /* Swipe hint indicators */
  @keyframes swipeFadeOut {
    0%   { opacity: 0.4; }
    75%  { opacity: 0.4; }
    100% { opacity: 0; }
  }
  .swipe-hint {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin-top: 12px; font-size: 0.75rem; color: #aaa;
    pointer-events: none;
    animation: swipeFadeOut 3.5s ease forwards;
  }

  /* Image — full bleed, mask on img only so overlay badges are unaffected */
  .snip-img {
    position: relative; width: 100%;
    background: white;
    display: flex; align-items: center; justify-content: center;
    max-height: 340px;
  }
  .snip-img img {
    display: block; width: 100%; max-height: 340px; object-fit: contain;
    -webkit-mask-image: linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%);
  }
  .snip-diff {
    position: absolute; bottom: 10px; right: 10px;
    background: rgba(0,0,0,0.50); color: white; border-radius: 999px;
    padding: 3px 10px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.04em;
  }

  /* No-image header band */
  .snip-header-band {
    position: relative; width: 100%; height: 160px;
    background: linear-gradient(135deg, #FFF8ED 0%, #FFE8B8 60%, #FFD580 100%);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .snip-header-ornament {
    font-size: 4.5rem; opacity: 0.15; user-select: none; pointer-events: none;
  }
  .snip-lang-badge {
    position: absolute; top: 10px; left: 10px;
    background: rgba(0,0,0,0.45); color: white; border-radius: 999px;
    padding: 3px 10px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.04em;
    text-transform: capitalize;
  }

  /* Body */
  .snip-body { padding: 24px 24px 20px; }
  .snip-hook {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.625rem; font-weight: 800;
    color: ${HERITAGE}; line-height: 1.25; margin-bottom: 16px;
    letter-spacing: -0.01em; text-align: left;
  }
  .snip-explanation {
    font-size: 1.0625rem; color: #2a2a2a; line-height: 1.85; margin-bottom: 20px;
    text-align: justify;
  }
  .snip-divider { height: 1px; background: #eee; margin: 20px 0; }

  .snip-key-term {
    background: #FFF8ED; border-left: 4px solid ${SAFFRON};
    border-radius: 0 14px 14px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-kt-label { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 6px; }
  .snip-kt-word  { font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; font-weight: 800; color: ${HERITAGE}; margin-bottom: 4px; }
  .snip-kt-meaning { font-size: 1rem; color: #555; line-height: 1.55; }

  .snip-life {
    background: #F0FAF4; border-left: 4px solid ${GREEN};
    border-radius: 0 14px 14px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-life-label { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${GREEN}; margin-bottom: 6px; }
  .snip-life-text  { font-size: 1rem; color: #2a4a2a; line-height: 1.65; }

  .snip-quiz {
    background: #EEF5FF; border-left: 4px solid ${BLUE};
    border-radius: 0 14px 14px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-quiz-label { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: ${BLUE}; margin-bottom: 6px; }
  .snip-quiz-text  { font-size: 1rem; color: #1a2a4a; line-height: 1.65; }

  .snip-citation { font-size: 0.75rem; color: #ccc; font-style: italic; text-align: right; margin-top: 8px; }
  .snip-empty    { text-align: center; padding: 48px 24px; font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem; color: #bbb; }

  /* Bottom nav */
  .player-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
    background: rgba(255,253,245,0.97); backdrop-filter: blur(12px);
    border-top: 1px solid #e8d5b0; padding: 14px 1.5rem;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .pnav-btn {
    display: flex; align-items: center; gap: 6px; border-radius: 999px; padding: 11px 24px;
    font-family: 'Alumni Sans', sans-serif; font-size: 1rem; font-weight: 700;
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
  .comp-emoji    { font-size: 3rem; margin-bottom: 12px; }
  .comp-title    { font-family: 'Alumni Sans', sans-serif; font-size: 1.75rem; font-weight: 800; color: ${HERITAGE}; margin-bottom: 6px; }
  .comp-subtitle { font-size: 0.875rem; color: #888; margin-bottom: 16px; line-height: 1.5; }
  .comp-points {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: linear-gradient(135deg, #FFF8ED, #FFF3E0);
    border: 1.5px solid ${SAFFRON}44; border-radius: 16px;
    padding: 12px 20px; margin-bottom: 16px;
  }
  .comp-points-icon  { font-size: 1.375rem; }
  .comp-points-value { font-family: 'Alumni Sans', sans-serif; font-size: 2.125rem; font-weight: 800; color: ${SAFFRON}; line-height: 1; }
  .comp-points-label { font-size: 0.875rem; font-weight: 600; color: #b86000; }
  .comp-badges {
    background: #F8F4FF; border: 1px solid #E0D4F0; border-radius: 14px;
    padding: 12px 16px; margin-bottom: 16px; text-align: left;
  }
  .comp-badges-title { font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #7B2D8B; margin-bottom: 10px; }
  .comp-badge-row { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
  .comp-badge-row:last-child { margin-bottom: 0; }
  .comp-badge-emoji { font-size: 1.25rem; flex-shrink: 0; }
  .comp-badge-text  { font-size: 0.875rem; color: #333; line-height: 1.3; }
  .comp-btn {
    display: block; width: 100%; padding: 12px; border-radius: 999px; border: none;
    cursor: pointer; font-family: 'Alumni Sans', sans-serif; font-size: 1rem; font-weight: 700;
    margin-bottom: 8px; transition: all 0.2s;
  }
  .comp-next      { background: ${HERITAGE}; color: white; box-shadow: 0 4px 16px rgba(0,80,158,0.25); }
  .comp-next:hover { box-shadow: 0 6px 22px rgba(0,80,158,0.4); transform: translateY(-1px); }
  .comp-primary   { background: ${SAFFRON}; color: white; box-shadow: 0 4px 16px rgba(255,142,0,0.3); }
  .comp-primary:hover   { box-shadow: 0 6px 22px rgba(255,142,0,0.45); transform: translateY(-1px); }
  .comp-dashboard { background: white; color: ${HERITAGE}; border: 1.5px solid ${HERITAGE}44; }
  .comp-dashboard:hover { background: ${HERITAGE}0d; }
  .comp-secondary { background: #f5f5f5; color: #999; font-size: 0.875rem; }
  .comp-secondary:hover { background: #eee; }


  /* Social strip */
  .snip-social {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 24px 6px; border-top: 1px solid #f0e8d8; margin-top: 16px; gap: 8px;
  }
  .snip-social-left  { display: flex; align-items: center; gap: 10px; }
  .snip-social-right { display: flex; align-items: center; gap: 14px; }
  .snip-social-btn {
    display: flex; align-items: center; gap: 6px;
    background: none; border: none; padding: 6px 0;
    font-size: 1rem; color: #bbb; transition: color 0.2s;
    font-family: 'Source Sans 3', sans-serif;
  }
  .snip-like-btn          { cursor: pointer; }
  .snip-like-btn:hover    { color: #FF8E00; }
  .snip-like-btn.active   { color: #FF8E00; }
  .snip-like-btn.disabled { cursor: not-allowed; opacity: 0.5; }
  .snip-comment-btn  { cursor: not-allowed; opacity: 0.5; }
  .snip-share-btn    { cursor: not-allowed; opacity: 0.4; }
  .snip-social-icon  { font-size: 1.125rem; line-height: 1; display: flex; align-items: center; }
  .snip-social-sep   { color: #e0d4bc; font-size: 1rem; }

  /* Comments sheet */
  .comments-overlay {
    position: fixed; inset: 0; z-index: 150;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
    display: flex; align-items: flex-end;
    animation: fadeIn 0.2s ease;
  }
  .comments-sheet {
    background: white; border-radius: 24px 24px 0 0; width: 100%; max-height: 70vh;
    display: flex; flex-direction: column; overflow: hidden;
    animation: slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both;
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .comments-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid #f0e8d8; flex-shrink: 0;
  }
  .comments-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem; font-weight: 700; color: #333;
  }
  .comments-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.25rem; color: #aaa; padding: 4px; line-height: 1;
  }
  .comments-close:hover { color: #555; }
  .comments-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
  .comments-empty { text-align: center; padding: 32px; color: #bbb; font-size: 0.9375rem; }
  .comments-signin { text-align: center; padding: 16px 0 8px; }
  .comments-signin-text { font-size: 0.875rem; color: #aaa; margin-bottom: 10px; }
  .comments-signin-btn {
    display: inline-block; padding: 10px 24px; border-radius: 999px;
    background: #FF8E00; color: white; border: none;
    font-family: 'Alumni Sans', sans-serif; font-size: 0.9375rem; font-weight: 700;
    opacity: 0.4; cursor: not-allowed;
  }
  .comment-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .comment-avatar {
    width: 32px; height: 32px; border-radius: 50%; background: #f0e8d8;
    flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.875rem;
  }
  .comment-content { flex: 1; }
  .comment-author { font-size: 0.8125rem; font-weight: 700; color: #333; margin-bottom: 2px; }
  .comment-text { font-size: 0.875rem; color: #555; line-height: 1.5; }
  .comment-time { font-size: 0.6875rem; color: #bbb; margin-top: 3px; }

  @media (max-width: 480px) {
    .player-body { padding: 16px 1rem 115px; }
    .snip-hook { font-size: 1.375rem; }
    .snip-explanation { font-size: 0.9375rem; }
    .snip-body { padding: 18px 16px 14px; }
    .pnav-btn  { padding: 10px 18px; font-size: 0.9375rem; }
    .player-nav { padding: 10px 1rem; }
    .snip-img { max-height: 300px; }
    .snip-img img { max-height: 300px; }
  }
`;

export default function SnippetPlayer({
  course, theme, module, lesson, levelId, settings,
  allLessons = [], earnedBadges = [],
  initialSnippetIndex = 0,
  playlistSnippetIds = null,
  onSnippetAdvance,
  onBackToLessons, onBackToLikes, onDashboard, onComplete, onNextLesson
}) {
  const playlistMode = !!(playlistSnippetIds && playlistSnippetIds.length > 0);
  const { user }        = useAuthContext();
  const [snippets,     setSnippets]     = useState([]);
  const [translations, setTranslations] = useState({});
  const [assets,       setAssets]       = useState({});
  const [current,      setCurrent]      = useState(initialSnippetIndex);
  const [loading,      setLoading]      = useState(true);
  const [done,         setDone]         = useState(false);
  const [totalPoints,  setTotalPoints]  = useState(0);
  const [snippetDir,   setSnippetDir]   = useState("next"); // 'next' | 'prev'
  const [liked,           setLiked]           = useState(new Set());
  const [likeCounts,      setLikeCounts]      = useState({});
  const [commentCounts,   setCommentCounts]   = useState({});
  const [showComments,    setShowComments]    = useState(false);
  const [commentsData,    setCommentsData]    = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsSnipId,  setCommentsSnipId]  = useState(null);

  // Swipe tracking
  const touchStartX  = useRef(null);
  const touchStartY  = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let ids;
        if (playlistMode) {
          ids = playlistSnippetIds;
        } else {
          const mappings = await supabase(
            "lesson_snippet_mapping",
            `?select=snippet_id,order_index&lesson_id=eq.${lesson.lesson_id}&order=order_index`
          );
          if (!mappings || mappings.length === 0) {
            setSnippets([]);
            setLoading(false);
            return;
          }
          ids = mappings
            .sort((a, b) => a.order_index - b.order_index)
            .map(m => m.snippet_id);
        }

        const idFilter = `&snippet_id=in.(${ids.join(",")})`;

        const [cores, transList] = await Promise.all([
          supabase("snippet_core", `?select=*${idFilter}`),
          supabase("snippet_translations", `?select=*${idFilter}`),
        ]);

        // Fetch only the asset rows actually used by these snippets
        const assetIds = [...new Set((cores || []).map(c => c.asset_id).filter(Boolean))];
        const assetData = assetIds.length > 0
          ? await supabase("asset_library", `?select=*&asset_id=in.(${assetIds.join(",")})`)
          : [];

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
        const ordered = ids.map(id => coreMap[id]).filter(Boolean);

        const points = ordered.reduce((sum, s) => sum + (s.snippet_value || 0), 0);

        setSnippets(ordered);
        setTranslations(resolvedTrans);
        setAssets(assetMap);
        setTotalPoints(points);

        // Seed like counts from snippet_core.like_count (trigger-maintained)
        const lc = {};
        ordered.forEach(s => { lc[s.snippet_id] = s.like_count || 0; });
        setLikeCounts(lc);

        // Comment counts — graceful, table may not exist yet
        try {
          const idList = ids.join(",");
          const commentsRaw = await supabase("snippet_comments", "?select=snippet_id&snippet_id=in.(" + idList + ")");
          const cc = {};
          (commentsRaw || []).forEach(r => { cc[r.snippet_id] = (cc[r.snippet_id] || 0) + 1; });
          setCommentCounts(cc);
        } catch (e) {
          console.log("Comments unavailable:", e.message);
        }

        // Load which snippets the current user has already liked
        if (user && !user.is_anonymous) {
          try {
            const { data: userLikes } = await loadUserLikes(user.id, ids);
            const likedSet = new Set((userLikes || []).map(r => r.snippet_id));
            setLiked(likedSet);
          } catch (e) {
            console.log("Could not load user likes:", e.message);
          }
        }
      } catch (e) {
        console.error("Snippet load error", e);
      }
      setLoading(false);
    }
    load();
  }, [lesson?.lesson_id, playlistSnippetIds, settings.languageCode]);

  // Reset position and done-state whenever the lesson changes (e.g. Next Lesson)
  useEffect(() => {
    setCurrent(initialSnippetIndex);
    setDone(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.lesson_id]);

  // Reset state when lesson changes (next lesson nav)
  useEffect(() => {
    setCurrent(initialSnippetIndex);
    setDone(false);
    setSnippetDir("next");
    setSnippets([]);
    setTranslations({});
    setAssets({});
    setTotalPoints(0);
    setLikeCounts({});
    setCommentCounts({});
    setShowComments(false);
    setCommentsData([]);
    setCommentsSnipId(null);
    setLoading(true);
  }, [lesson?.lesson_id, playlistSnippetIds]);

  const total    = snippets.length;
  const snip     = snippets[current];
  const trans    = snip ? (translations[snip.snippet_id] || {}) : {};
  const asset    = snip ? assets[snip.asset_id] : null;
  const isLast   = current === total - 1;
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

  const currentLessonIdx = !playlistMode && lesson ? allLessons.findIndex(l => l.lesson_id === lesson.lesson_id) : -1;
  const nextLesson = !playlistMode && currentLessonIdx >= 0 ? allLessons[currentLessonIdx + 1] : null;

  function goNext() {
    if (loading) return;
    if (!isLast) {
      setSnippetDir("next");
      setCurrent(c => c + 1);
      window.scrollTo(0, 0);
      if (!playlistMode && onSnippetAdvance) onSnippetAdvance(lesson.lesson_id, current + 1);
    } else {
      window.scrollTo(0, 0);
      setDone(true);
      if (!playlistMode && onComplete) onComplete(lesson.lesson_id, totalPoints, snippets.length);
    }
  }

  function goPrev() {
    if (loading || current === 0) return;
    setSnippetDir("prev");
    setCurrent(c => c - 1);
    window.scrollTo(0, 0);
    if (!playlistMode && onSnippetAdvance) onSnippetAdvance(lesson.lesson_id, current - 1);
  }

  async function toggleLike(snippetId) {
    if (!user || user.is_anonymous) return;
    const isLiked = liked.has(snippetId);

    // Optimistic update
    setLiked(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(snippetId) : next.add(snippetId);
      return next;
    });
    setLikeCounts(prev => ({
      ...prev,
      [snippetId]: Math.max(0, (prev[snippetId] || 0) + (isLiked ? -1 : 1)),
    }));

    // Persist to DB (fire-and-forget)
    if (isLiked) {
      deleteLike(user.id, snippetId).catch(e => console.log("Unlike failed:", e.message));
    } else {
      insertLike(
        user.id, snippetId,
        course?.course_id  || null,
        theme?.theme_id    || null,
        module?.module_id  || null,
        lesson?.lesson_id  || null,
      ).catch(e => console.log("Like failed:", e.message));
    }
  }

  async function openComments(snippetId) {
    setShowComments(true);
    setCommentsSnipId(snippetId);
    setCommentsLoading(true);
    setCommentsData([]);
    try {
      const data = await supabase(
        "snippet_comments",
        "?select=*&snippet_id=eq." + snippetId + "&order=created_at.desc"
      );
      setCommentsData(data || []);
    } catch (e) {
      console.log("Comments unavailable:", e.message);
      setCommentsData([]);
    }
    setCommentsLoading(false);
  }

  function closeComments() {
    setShowComments(false);
    setCommentsData([]);
    setCommentsSnipId(null);
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (done) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "Escape")     (playlistMode ? onBackToLikes : onBackToLessons)?.();
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
          <button className="player-back" onClick={playlistMode ? onBackToLikes : onBackToLessons}>← Back</button>
          <div className="player-lesson-name">{playlistMode ? "♥ Likes Playlist" : lesson?.lesson_name}</div>
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
                  ...(dragOffset !== 0 ? { transform: `translateX(${dragOffset}px)` } : {}),
                  transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
                }}
              >
                {/* Image / header band */}
                {asset ? (
                  <div className="snip-img">
                    <img
                      src={asset.file_path}
                      alt={asset.alt_text || ""}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                    {trans.language && (
                      <div className="snip-lang-badge">{trans.language}</div>
                    )}
                    {snip.difficulty_level && (
                      <div className="snip-diff">{DIFFICULTY_STARS[snip.difficulty_level]}</div>
                    )}
                  </div>
                ) : (
                  <div className="snip-header-band">
                    <div className="snip-header-ornament">&#127963;</div>
                    {trans.language && (
                      <div className="snip-lang-badge">{trans.language}</div>
                    )}
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

                  {/* Social strip */}
                  <div className="snip-social">
                    <div className="snip-social-left">
                      <button
                        className={"snip-social-btn snip-like-btn" + (liked.has(snip.snippet_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                        onClick={e => { e.stopPropagation(); toggleLike(snip.snippet_id); }}
                        disabled={!user || user.is_anonymous}
                        title={!user || user.is_anonymous ? "Sign in to like" : liked.has(snip.snippet_id) ? "Unlike" : "Like"}
                      >
                        <span className="snip-social-icon">{liked.has(snip.snippet_id) ? "♥" : "♡"}</span>
                        <span>{likeCounts[snip.snippet_id] || 0}</span>
                      </button>
                      <span className="snip-social-sep">&#183;</span>
                      <button
                        className="snip-social-btn snip-comment-btn"
                        disabled
                        title="Comments unlock after sign-in"
                      >
                        <span className="snip-social-icon">&#128172;</span>
                        <span>{commentCounts[snip.snippet_id] || 0}</span>
                      </button>
                    </div>
                    <div className="snip-social-right">
                      <button className="snip-social-btn snip-share-btn" disabled title="Sharing unlocks after sign-in">
                        <span className="snip-social-icon">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                          </svg>
                        </span>
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
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


        {/* Bottom nav */}
        {!loading && total > 0 && (
          <div className="player-nav">
            <button className="pnav-btn pnav-prev" onClick={goPrev} disabled={current === 0}>← Prev</button>
            <div className="pnav-dots">
              {snippets.slice(0, Math.min(total, 10)).map((_, i) => (
                <div
                  key={i}
                  className={"pnav-dot" + (i === current ? " active" : i < current ? " done" : "")}
                  onClick={() => {
                    if (i === current) return;
                    setSnippetDir(i > current ? "next" : "prev");
                    setCurrent(i);
                    window.scrollTo(0, 0);
                  }}
                  title={"Snippet " + (i + 1)}
                />
              ))}
              {total > 10 && <span style={{ fontSize: 11, color: "#aaa" }}>+{total - 10}</span>}
            </div>
            <button className={"pnav-btn " + (isLast ? "pnav-finish" : "pnav-next")} onClick={goNext}>
              {isLast ? "Finish ✓" : "Next →"}
            </button>
          </div>
        )}

        {/* Comments sheet */}
        {showComments && (
          <div className="comments-overlay" onClick={closeComments}>
            <div className="comments-sheet" onClick={e => e.stopPropagation()}>
              <div className="comments-header">
                <div className="comments-title">Comments</div>
                <button className="comments-close" onClick={closeComments}>&#x2715;</button>
              </div>
              <div className="comments-body">
                {commentsLoading ? (
                  <div className="comments-empty">Loading&#8230;</div>
                ) : commentsData.length === 0 ? (
                  <>
                    <div className="comments-empty">No comments yet. Be the first!</div>
                    <div className="comments-signin">
                      <div className="comments-signin-text">Sign in to leave a comment</div>
                      <button className="comments-signin-btn" disabled>Sign in to comment</button>
                    </div>
                  </>
                ) : (
                  <>
                    {commentsData.map((c, i) => (
                      <div className="comment-row" key={i}>
                        <div className="comment-avatar">&#128100;</div>
                        <div className="comment-content">
                          <div className="comment-author">{c.user_name || "Learner"}</div>
                          <div className="comment-text">{c.body}</div>
                          <div className="comment-time">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</div>
                        </div>
                      </div>
                    ))}
                    <div className="comments-signin">
                      <button className="comments-signin-btn" disabled>Sign in to comment</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completion modal */}
        {done && (
          <div className="completion-overlay">
            <div className="completion-card">
              {playlistMode ? (
                <>
                  <div className="comp-emoji">♥</div>
                  <div className="comp-title">End of Likes Playlist</div>
                  <div className="comp-subtitle">You've reviewed all <strong>{snippets.length}</strong> liked snippet{snippets.length !== 1 ? "s" : ""}.</div>
                  <button className="comp-btn comp-primary" onClick={onBackToLikes}>Back to Likes</button>
                  <button className="comp-btn comp-secondary" onClick={() => { setCurrent(0); setDone(false); }}>Review Again</button>
                  <button className="comp-btn comp-dashboard" onClick={onDashboard}>Go to Dashboard</button>
                </>
              ) : (
                <>
                  <div className="comp-emoji">🎉</div>
                  <div className="comp-title">Lesson Complete!</div>
                  <div className="comp-subtitle">You've finished <strong>{lesson?.lesson_name}</strong>.</div>

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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
