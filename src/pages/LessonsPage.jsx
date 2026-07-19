import { useState, useEffect } from "react";
import { getQuizzesForLessons } from "../lib/auth";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, LEVEL_LABELS } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { SkeletonLessonList } from "../components/Skeletons";
import { useEntityPreview } from "../components/EntityPreview";

const styles = `
  .module-banner { max-width: 860px; margin: 0 auto 24px; padding: 0 1.5rem; }
  .module-banner-inner {
    border-radius: 14px; padding: 14px 20px;
    background: rgba(255,142,0,0.05);
    border: 1px solid rgba(255,142,0,0.15); display: flex; align-items: center; gap: 16px;
  }
  .module-banner-accent  { width: 5px; height: 40px; border-radius: 3px; background: ${HERITAGE}; flex-shrink: 0; }
  .module-banner-body    { flex: 1; min-width: 0; }
  .module-banner-number  { font-size: 0.6875rem; color: #6B6B6B; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; }
  .module-banner-title   { font-family: 'Alumni Sans', sans-serif; font-size: 1.1875rem; font-weight: 700; color: ${HERITAGE}; }
  .module-banner-count   {
    flex-shrink: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em;
    padding: 3px 10px; border-radius: 999px; background: ${HERITAGE}12; color: ${HERITAGE};
  }

  .lessons-content { max-width: 860px; margin: 0 auto; padding: 0 1.5rem 80px; }
  .lesson-row {
    display: flex; align-items: center; gap: 16px;
    background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
    padding: 16px 20px; margin-bottom: 12px; cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    animation: fadeUp 0.35s ease both; box-shadow: 0 2px 10px rgba(255,142,0,0.05);
  }
  .lesson-row:hover { transform: translateX(4px); box-shadow: 0 6px 24px rgba(255,142,0,0.12); border-color: ${SAFFRON}66; }
  .lesson-row.completed { border-color: ${GREEN}44; background: rgba(0,146,74,0.04); border-left: 3px solid ${GREEN}; }
  .lesson-row.completed:hover { border-color: ${GREEN}88; transform: translateX(4px); }
  .lesson-num {
    flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Alumni Sans', sans-serif; font-size: 1.0625rem; font-weight: 800;
    color: white; background: ${SAFFRON};
  }
  .lesson-num.done { background: ${GREEN}; }
  .lesson-divider { width: 1px; height: 36px; background: rgba(0,0,0,0.10); flex-shrink: 0; }
  .lesson-thumb {
    width: 52px; height: 52px; border-radius: 10px; overflow: hidden;
    background: #EBEBEA; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .lesson-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .lesson-info { flex: 1; min-width: 0; }
  .lesson-title { font-family: 'Alumni Sans', sans-serif; font-size: 1.1875rem; font-weight: 700; color: #0A0A0A; margin-bottom: 3px; line-height: 1.2; }
  .lesson-meta  { font-size: 0.75rem; color: #6B6B6B; }
  .lesson-cta {
    flex-shrink: 0; border: 1.5px solid ${SAFFRON}; color: ${SAFFRON}; border-radius: 999px;
    padding: 6px 16px; font-family: 'Alumni Sans', sans-serif; font-size: 0.8125rem;
    font-weight: 700; cursor: pointer; background: transparent;
    transition: background 0.2s, color 0.2s; white-space: nowrap;
  }
  .lesson-cta:hover { background: ${SAFFRON}; color: white; }
  .lesson-cta.done { border-color: ${GREEN}; color: ${GREEN}; }
  .lesson-cta.done:hover { background: ${GREEN}; color: white; }
  .lesson-row.locked {
    opacity: 0.4; cursor: not-allowed;
  }
  .lesson-row.locked:hover {
    transform: none !important; box-shadow: none !important;
  }
  .lesson-cta-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .lesson-cta-quiz {
    flex-shrink: 0; border: 1.5px solid #00509E; color: #00509E; border-radius: 999px;
    padding: 6px 14px; font-family: 'Alumni Sans', sans-serif; font-size: 0.8125rem;
    font-weight: 700; cursor: pointer; background: transparent;
    transition: background 0.2s, color 0.2s; white-space: nowrap;
  }
  .lesson-cta-quiz:hover { background: #00509E; color: white; }
  .lesson-cta-quiz:disabled { opacity: 0.3; cursor: not-allowed; border-color: #9CA3AF; color: #9CA3AF; }
  @media (max-width: 480px) {
    .lesson-cta-quiz { padding: 5px 10px; font-size: 0.75rem; }
    .lesson-cta-group { gap: 4px; }
  }
  .lesson-lock { flex-shrink: 0; font-size: 0.9rem; color: #6B6B6B; }
  .bm-btn, .like-btn {
    flex-shrink: 0; background: none; border: none; cursor: pointer;
    font-size: 1.125rem; line-height: 1; padding: 4px 6px; border-radius: 8px;
    color: #6B6B6B; transition: color 0.15s, transform 0.15s;
  }
  .bm-btn:hover { color: #FF8E00; transform: scale(1.15); }
  .bm-btn.saved { color: #FF8E00; }
  .like-btn:hover { color: #D85A30; transform: scale(1.15); }
  .like-btn.liked { color: #D85A30; }
  .lesson-row-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .lesson-row-actions { display: flex; gap: 2px; }

  @media (max-width: 768px) {
    .lessons-content { padding: 0 1rem 60px; }
    .module-banner   { padding: 0 1rem; margin-bottom: 18px; }
    .lesson-row { padding: 14px; gap: 12px; }
  }
  @media (max-width: 480px) {
    .lesson-divider { display: none; }
    .lesson-title { font-size: 1rem; }
    .lesson-cta { padding: 5px 12px; font-size: 0.75rem; }
  }
`;

export default function LessonsPage({ course, theme, module, levelId, settings, completedLessons = new Set(), onLessonClick, onQuizClick, onBack, onBackToCourse, onBackToModules, onOpenSettings, onLessonsLoaded, onDashboard, onLikes, onBookmarks, onDiscover, onForYou, onAllCourses, onResume, bookmarks = new Set(), onToggleBookmark, likes = new Set(), onToggleLike, userEditorialRole, onEditor, isAdmin, onAdmin, activePage, onSaveSettings, languages = [] }) {
  const [lessons, setLessons] = useState([]);
  const [assets, setAssets] = useState({});
  const [loading, setLoading] = useState(true);
  const [quizMap,  setQuizMap]  = useState({});   // lesson_id → quiz_sets row
  const levelMeta = LEVEL_LABELS[levelId] || { label: "All Levels", color: SAFFRON };
  const { openPreview } = useEntityPreview();

  useEffect(() => {
    async function load() {
      const [data, assetData] = await Promise.all([
        supabase("lessons", `?select=*&module_id=eq.${module.module_id}&order=sort_order`),
        supabase("asset_library", "?select=*"),
      ]);
      const loaded = data || [];
      setLessons(loaded);
      const assetMap = {};
      (assetData || []).forEach(a => { assetMap[a.asset_id] = a; });
      setAssets(assetMap);
      if (onLessonsLoaded) onLessonsLoaded(loaded);
      if (loaded.length > 0) {
        const ids = loaded.map(l => l.lesson_id);
        const { data: qmap } = await getQuizzesForLessons(ids);
        setQuizMap(qmap || {});
      }
      setLoading(false);
    }
    load();
  }, [module.module_id]);

  return (
    <>
      <style>{globalStyles + styles}</style>
      <PageHeader
        onHome={onBack}
        onOpenSettings={onOpenSettings}
        onResume={onResume}
        userEditorialRole={userEditorialRole}
        onEditor={onEditor}
        isAdmin={isAdmin}
        onAdmin={onAdmin}
        activePage={activePage}
        settings={settings}
        onSaveSettings={onSaveSettings}
        languages={languages}
        navLinks={[{ label: "Home", onClick: onBack }, { label: "Courses", onClick: onAllCourses }, { label: "For You", onClick: onForYou }, { label: "Dashboard", onClick: onDashboard }, { label: "Discover", onClick: onDiscover }]}
      />

      <div className="breadcrumb">
        <a onClick={onBack}>Home</a><span className="sep">›</span>
        <a onClick={onBackToCourse}>{course?.course_name || "Bharat Heritage"}</a><span className="sep">›</span>
        <span style={{ color: levelMeta.color, fontWeight: 700, cursor: "pointer" }} onClick={onBackToCourse}>
          {levelMeta.label}
        </span>
        <span className="sep">›</span>
        <a onClick={onBackToModules}>{theme?.title}</a><span className="sep">›</span>
        <span className="current">{module.module_name}</span>
      </div>

      <div className="page-hero">
        <div className="page-title">{module.module_name}</div>
        <div className="page-subtitle">{module.description || "Work through each lesson in order to complete this module."}</div>
      </div>

      <div className="module-banner">
        <div className="module-banner-inner">
          <div className="module-banner-accent" />
          <div className="module-banner-body">
            <div className="module-banner-number">{module.module_number}</div>
            <div className="module-banner-title">{module.module_name}</div>
          </div>
          {!loading && lessons.length > 0 && (
            <div className="module-banner-count">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</div>
          )}
        </div>
      </div>

      <div className="lessons-content">
        {loading ? <SkeletonLessonList count={5} />
        : lessons.length === 0 ? <div className="empty">No lessons found for this module yet.</div>
        : lessons.map((lesson, i) => {
          const isComplete = completedLessons.has(lesson.lesson_id);
          const isLocked = course?.sequential_unlock && i > 0 && !completedLessons.has(lessons[i - 1].lesson_id);
          const asset = assets[lesson.asset_id];
          const quiz = quizMap[lesson.lesson_id];
          const openThisPreview = () => openPreview({
            type: "lesson",
            id: lesson.lesson_id,
            title: lesson.lesson_name,
            crumb: `${theme?.title || ""}${theme?.title ? " › " : ""}${module.module_name}`,
            desc: lesson.lesson_description || "",
            image: asset?.file_path,
            pct: null,
            liked: likes.has("lesson:" + lesson.lesson_id),
            bookmarked: bookmarks.has("lesson:" + lesson.lesson_id),
            onToggleLike: () => onToggleLike && onToggleLike("lesson", lesson.lesson_id, lesson.lesson_name),
            onToggleBookmark: () => onToggleBookmark && onToggleBookmark("lesson", lesson.lesson_id, lesson.lesson_name),
            onPlay: () => onLessonClick(lesson),
            playLabel: isComplete ? "Review" : "Learn",
            // Lessons get a second, distinct CTA for their quiz (only when one exists)
            onQuiz: quiz ? () => onQuizClick(lesson, quiz) : null,
            quizLabel: "Quiz",
          });
          return (
          <div className={`lesson-row ${isComplete ? "completed" : ""} ${isLocked ? "locked" : ""}`}
            key={lesson.lesson_id} style={{ animationDelay: `${i * 0.05}s` }}
            onClick={isLocked ? undefined : openThisPreview}>
            <div className={`lesson-num${isComplete ? " done" : ""}`}>
              {isComplete ? "✓" : i + 1}
            </div>
            <div className="lesson-divider" />
            <div className="lesson-thumb">
              {asset
                ? <img src={asset.file_path} alt={asset.alt_text || lesson.lesson_name} onError={e => { e.target.src = logoUrl; }} />
                : <span style={{ fontSize: 20 }}>📖</span>
              }
            </div>
            <div className="lesson-info">
              <div className="lesson-title">{lesson.lesson_name}</div>
              {lesson.lesson_description && (
                <div className="lesson-meta">{lesson.lesson_description}</div>
              )}
            </div>
            {isLocked
              ? <span className="lesson-lock">🔒</span>
              : (
                <div className="lesson-row-right">
                  <div className="lesson-row-actions">
                    <button
                      className={"like-btn" + (likes.has("lesson:" + lesson.lesson_id) ? " liked" : "")}
                      title={likes.has("lesson:" + lesson.lesson_id) ? "Unlike" : "Like lesson"}
                      onClick={e => { e.stopPropagation(); onToggleLike && onToggleLike("lesson", lesson.lesson_id, lesson.lesson_name); }}
                    ><svg width="19" height="19" viewBox="0 0 24 24" fill={likes.has("lesson:" + lesson.lesson_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6c-1.7-1.6-4.4-1.6-6 .1L12 7.5 9.2 4.7c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.1L12 19l8.8-8.2c1.7-1.7 1.7-4.4 0-6.1z"/></svg></button>
                    <button
                      className={"bm-btn" + (bookmarks.has("lesson:" + lesson.lesson_id) ? " saved" : "")}
                      title={bookmarks.has("lesson:" + lesson.lesson_id) ? "Remove bookmark" : "Bookmark lesson"}
                      onClick={e => { e.stopPropagation(); onToggleBookmark && onToggleBookmark("lesson", lesson.lesson_id, lesson.lesson_name); }}
                    ><svg width="19" height="19" viewBox="0 0 24 24" fill={bookmarks.has("lesson:" + lesson.lesson_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>
                  </div>
                  <div className="lesson-cta-group">
                    <button className={`lesson-cta${isComplete ? " done" : ""}`}
                      onClick={e => { e.stopPropagation(); onLessonClick(lesson); }}>
                      {isComplete ? "Review" : "Learn"}
                    </button>
                    <button
                      className="lesson-cta-quiz"
                      disabled={!quizMap[lesson.lesson_id]}
                      title={quizMap[lesson.lesson_id] ? "Take quiz for this lesson" : "No quiz available yet"}
                      onClick={e => { e.stopPropagation(); if (quizMap[lesson.lesson_id] && onQuizClick) onQuizClick(lesson, quizMap[lesson.lesson_id]); }}>
                      Quiz
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        );})}
      </div>
    </>
  );
}
