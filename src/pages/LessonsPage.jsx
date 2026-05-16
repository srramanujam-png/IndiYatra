import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, LEVEL_LABELS } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";

const styles = `
  .module-banner { max-width: 860px; margin: 0 auto 24px; padding: 0 1.5rem; }
  .module-banner-inner {
    border-radius: 16px; padding: 14px 20px;
    background: linear-gradient(135deg, ${SAFFRON}0d, ${HERITAGE}0a);
    border: 1px solid ${SAFFRON}2a; display: flex; align-items: center; gap: 16px;
  }
  .module-banner-accent  { width: 5px; height: 40px; border-radius: 3px; background: ${HERITAGE}; flex-shrink: 0; }
  .module-banner-body    { flex: 1; min-width: 0; }
  .module-banner-number  { font-size: 11px; color: #aaa; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; }
  .module-banner-title   { font-family: 'Alumni Sans', sans-serif; font-size: 19px; font-weight: 700; color: ${HERITAGE}; }
  .module-banner-count   {
    flex-shrink: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
    padding: 3px 10px; border-radius: 999px; background: ${HERITAGE}12; color: ${HERITAGE};
  }

  .lessons-content { max-width: 860px; margin: 0 auto; padding: 0 1.5rem 80px; }
  .lesson-row {
    display: flex; align-items: center; gap: 16px;
    background: white; border-radius: 14px; border: 1px solid #E8D5B0;
    padding: 16px 20px; margin-bottom: 12px; cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    animation: fadeUp 0.35s ease both; box-shadow: 0 2px 10px rgba(255,142,0,0.05);
  }
  .lesson-row:hover { transform: translateX(4px); box-shadow: 0 6px 24px rgba(255,142,0,0.12); border-color: ${SAFFRON}66; }
  .lesson-row.completed { border-color: ${GREEN}44; background: #F6FBF8; border-left: 3px solid ${GREEN}; }
  .lesson-row.completed:hover { border-color: ${GREEN}88; transform: translateX(4px); }
  .lesson-num {
    flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Alumni Sans', sans-serif; font-size: 17px; font-weight: 800;
    color: white; background: ${SAFFRON};
  }
  .lesson-num.done { background: ${GREEN}; }
  .lesson-divider { width: 1px; height: 36px; background: #e8d5b0; flex-shrink: 0; }
  .lesson-info { flex: 1; min-width: 0; }
  .lesson-title { font-family: 'Alumni Sans', sans-serif; font-size: 19px; font-weight: 700; color: #1a1a2e; margin-bottom: 3px; line-height: 1.2; }
  .lesson-meta  { font-size: 12px; color: #aaa; }
  .lesson-cta {
    flex-shrink: 0; border: 1.5px solid ${SAFFRON}; color: ${SAFFRON}; border-radius: 999px;
    padding: 6px 16px; font-family: 'Alumni Sans', sans-serif; font-size: 13px;
    font-weight: 700; cursor: pointer; background: transparent;
    transition: background 0.2s, color 0.2s; white-space: nowrap;
  }
  .lesson-cta:hover { background: ${SAFFRON}; color: white; }
  .lesson-cta.done { border-color: ${GREEN}; color: ${GREEN}; }
  .lesson-cta.done:hover { background: ${GREEN}; color: white; }

  @media (max-width: 768px) {
    .lessons-content { padding: 0 1rem 60px; }
    .module-banner   { padding: 0 1rem; margin-bottom: 18px; }
    .lesson-row { padding: 14px; gap: 12px; }
  }
  @media (max-width: 480px) {
    .lesson-divider { display: none; }
    .lesson-title { font-size: 16px; }
    .lesson-cta { padding: 5px 12px; font-size: 12px; }
  }
`;

export default function LessonsPage({ course, theme, module, levelId, settings, completedLessons = new Set(), onLessonClick, onBack, onBackToCourse, onBackToModules, onOpenSettings, onLessonsLoaded }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const levelMeta = LEVEL_LABELS[levelId] || { label: "All Levels", color: SAFFRON };

  useEffect(() => {
    async function load() {
      const data = await supabase("lessons", `?select=*&module_id=eq.${module.module_id}&order=lesson_number`);
      setLessons(data || []);
      if (onLessonsLoaded) onLessonsLoaded(data || []);
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
        navLinks={[{ label: "Home", onClick: onBack }, { label: "Discover", onClick: () => {} }]}
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
        {loading ? <div className="loading">Loading lessons…</div>
        : lessons.length === 0 ? <div className="empty">No lessons found for this module yet.</div>
        : lessons.map((lesson, i) => {
          const isComplete = completedLessons.has(lesson.lesson_id);
          return (
          <div className={`lesson-row ${isComplete ? "completed" : ""}`}
            key={lesson.lesson_id} style={{ animationDelay: `${i * 0.05}s` }}
            onClick={() => onLessonClick(lesson)}>
            <div className={`lesson-num${isComplete ? " done" : ""}`}>
              {isComplete ? "✓" : i + 1}
            </div>
            <div className="lesson-divider" />
            <div className="lesson-info">
              <div className="lesson-title">{lesson.lesson_name}</div>
              {lesson.lesson_description && (
                <div className="lesson-meta">{lesson.lesson_description}</div>
              )}
            </div>
            <button className={`lesson-cta${isComplete ? " done" : ""}`}
              onClick={e => { e.stopPropagation(); onLessonClick(lesson); }}>
              {isComplete ? "Review" : "Start"}
            </button>
          </div>
        );})}
      </div>
    </>
  );
}
