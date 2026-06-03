import { useState, useEffect, useRef } from "react";
import { SAFFRON, HERITAGE, GREEN, LEVEL_LABELS } from "../lib/supabase";
import { getCourseTree } from "../lib/auth";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";

// ─── Tree grouping ────────────────────────────────────────────────────────────

function groupTree(rows) {
  const levels = {};
  for (const row of rows) {
    if (!levels[row.level_id]) {
      const meta = LEVEL_LABELS[row.level_id] || { label: row.level_id, classes: "" };
      levels[row.level_id] = { label: meta.label, classes: meta.classes, color: meta.color || HERITAGE, themes: {} };
    }
    const lvl = levels[row.level_id];
    if (!lvl.themes[row.theme_id]) {
      lvl.themes[row.theme_id] = { title: row.theme_title, sort: row.theme_sort, modules: {} };
    }
    const thm = lvl.themes[row.theme_id];
    if (!thm.modules[row.module_id]) {
      thm.modules[row.module_id] = { name: row.module_name, sort: row.module_sort, lessons: [] };
    }
    thm.modules[row.module_id].lessons.push({
      lesson_id: row.lesson_id,
      lesson_name: row.lesson_name,
      sort: row.lesson_sort,
    });
  }
  for (const lvl of Object.values(levels)) {
    for (const thm of Object.values(lvl.themes)) {
      for (const mod of Object.values(thm.modules)) {
        mod.lessons.sort((a, b) => a.sort - b.sort);
      }
    }
  }
  return levels;
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

function lessonStatus(id, completedLessons, lessonProgress) {
  if (completedLessons.has(id)) return "done";
  if (lessonProgress.has(id) && lessonProgress.get(id) > 0) return "resume";
  return "none";
}

function rollupModule(lessons, completedLessons) {
  if (!lessons.length) return "none";
  const done = lessons.filter(l => completedLessons.has(l.lesson_id)).length;
  if (done === lessons.length) return "done";
  if (done > 0) return "partial";
  return "none";
}

function rollupTheme(modules, completedLessons) {
  const all = Object.values(modules).flatMap(m => m.lessons);
  if (!all.length) return "none";
  const done = all.filter(l => completedLessons.has(l.lesson_id)).length;
  if (done === all.length) return "done";
  if (done > 0) return "partial";
  return "none";
}

function progressFraction(lessons, completedLessons) {
  if (!lessons.length) return { done: 0, total: 0, pct: 0 };
  const done = lessons.filter(l => completedLessons.has(l.lesson_id)).length;
  return { done, total: lessons.length, pct: Math.round((done / lessons.length) * 100) };
}

// ─── Shared dot components ────────────────────────────────────────────────────

function StatusDot({ status, size = 8, baseColor = GREEN }) {
  const s = { width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "inline-block" };
  if (status === "done")    return <span style={{ ...s, background: baseColor }} />;
  if (status === "partial") return <span style={{ ...s, border: `1.5px solid ${baseColor}`,
    backgroundImage: `linear-gradient(135deg,${baseColor} 50%,transparent 50%)` }} />;
  return <span style={{ ...s, border: "1.5px solid #BBBBB8" }} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  .nav-page { display: flex; min-height: calc(100vh - 120px); }

  /* ── Desktop tree column ── */
  .nav-tree-col {
    width: 288px; min-width: 288px; border-right: 0.5px solid rgba(0,0,0,0.07);
    background: #fff; display: flex; flex-direction: column; overflow-y: auto;
  }
  .nav-course-hdr {
    padding: 14px 16px 12px;
    border-bottom: 0.5px solid rgba(0,0,0,0.07);
  }
  .nav-course-name { font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem; font-weight: 700; color: #0A0A0A; }
  .nav-course-meta { font-size: 0.6875rem; color: #6B6B6B; margin-top: 2px; }
  .nav-level-row {
    display: flex; align-items: center; gap: 8px; padding: 8px 16px;
    cursor: pointer; user-select: none;
  }
  .nav-level-row:hover { background: rgba(0,0,0,0.02); }
  .nav-level-row.active { background: rgba(0,80,158,0.05); }
  .nav-level-chip {
    font-size: 11px; font-weight: 600; padding: 3px 10px;
    border-radius: 999px; white-space: nowrap;
  }
  .nav-theme-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 16px 6px 28px; cursor: pointer;
  }
  .nav-theme-row:hover { background: rgba(0,0,0,0.02); }
  .nav-theme-row.active { background: rgba(0,80,158,0.05); }
  .nav-theme-name { font-size: 12px; font-weight: 500; color: #0A0A0A; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-mod-row {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 16px 5px 40px; cursor: pointer;
  }
  .nav-mod-row:hover { background: rgba(0,0,0,0.02); }
  .nav-mod-row.active { background: rgba(0,80,158,0.05); }
  .nav-mod-name { font-size: 12px; color: #1F1F1F; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-les-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 16px 6px 52px; cursor: pointer; min-height: 36px;
  }
  .nav-les-row:hover { background: rgba(0,0,0,0.02); }
  .nav-les-row.active { background: rgba(0,80,158,0.08); }
  .nav-les-name { font-size: 12px; flex: 1; color: #1F1F1F; line-height: 1.3; }
  .nav-les-row.active .nav-les-name { color: ${HERITAGE}; font-weight: 500; }
  .nav-ch { font-size: 12px; color: #BBBBB8; transition: transform .18s; flex-shrink: 0; }
  .nav-ch.open { transform: rotate(180deg); }

  /* ── Detail panel ── */
  .nav-detail-col { flex: 1; background: #FAFAF7; padding: 28px 32px; overflow-y: auto; }
  .nav-empty { display: flex; align-items: center; justify-content: center;
    height: 100%; color: #6B6B6B; font-size: 13px; }
  .nd-eyebrow { font-size: 11px; color: #6B6B6B; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
  .nd-title { font-family: 'Alumni Sans', sans-serif; font-size: 1.75rem; font-weight: 700; color: #0A0A0A; margin-bottom: 4px; line-height: 1.1; }
  .nd-sub { font-size: 0.8125rem; color: #6B6B6B; margin-bottom: 16px; }
  .nd-stat-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .nd-stat { background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px;
    padding: 10px 16px; min-width: 100px; }
  .nd-stat-val { font-size: 1.25rem; font-weight: 700; color: ${HERITAGE}; }
  .nd-stat-lbl { font-size: 0.6875rem; color: #6B6B6B; margin-top: 1px; }
  .nd-prog-wrap { height: 5px; background: rgba(0,0,0,0.07); border-radius: 3px; margin-bottom: 20px; overflow: hidden; }
  .nd-prog-fill { height: 100%; border-radius: 3px; background: ${HERITAGE}; transition: width .3s; }
  .nd-cta {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${SAFFRON}; color: white; border: none; border-radius: 999px;
    padding: 9px 22px; font-family: 'Alumni Sans', sans-serif; font-size: 0.9375rem;
    font-weight: 700; cursor: pointer; margin-bottom: 28px;
    transition: box-shadow .2s;
  }
  .nd-cta:hover { box-shadow: 0 4px 14px rgba(255,142,0,0.35); }
  .nd-section-title {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: #6B6B6B; margin-bottom: 10px;
  }
  .nd-card {
    background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px;
    padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: center;
    gap: 12px; cursor: pointer; transition: border-color .15s, transform .15s;
    animation: fadeUp 0.25s ease both;
  }
  .nd-card:hover { border-color: ${SAFFRON}55; transform: translateX(3px); }
  .nd-card-icon { font-size: 20px; flex-shrink: 0; }
  .nd-card-info { flex: 1; min-width: 0; }
  .nd-card-name { font-family: 'Alumni Sans', sans-serif; font-size: 1.0625rem; font-weight: 700; color: #0A0A0A; }
  .nd-card-meta { font-size: 0.75rem; color: #6B6B6B; margin-top: 2px; }
  .nd-card-prog { height: 3px; background: rgba(0,0,0,0.07); border-radius: 2px; margin-top: 6px; overflow: hidden; max-width: 180px; }
  .nd-card-prog-fill { height: 100%; border-radius: 2px; }
  .nd-card-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .nd-card-pct { font-size: 0.75rem; font-weight: 700; color: ${HERITAGE}; }
  .nd-card-cta { font-size: 0.75rem; font-weight: 700; color: ${SAFFRON}; white-space: nowrap; }
  .nd-card-cta.done { color: ${GREEN}; }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .nav-page { flex-direction: column; min-height: unset; }
    .nav-tree-col { width: 100%; min-width: unset; border-right: none;
      border-bottom: 0.5px solid rgba(0,0,0,0.07); overflow-y: unset; }
    .nav-detail-col { padding: 16px; }
    .nd-title { font-size: 1.375rem; }
    .nd-card { padding: 10px 14px; }
  }
  @media (min-width: 769px) {
    .nav-mobile-breadcrumb { display: none !important; }
    .nav-tree-col { max-height: calc(100vh - 120px); position: sticky; top: 0; }
  }
  @media (max-width: 768px) {
    .nav-tree-col { position: static; }
  }
`;

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseNavigatorPage({
  course,
  completedLessons = new Set(),
  lessonProgress   = new Map(),
  initialSelection = null,
  onLessonSelect,
  onBack,
  onBackToCourse,
  settings,
  onOpenSettings,
  onDashboard,
  onLikes,
  onBookmarks,
  onDiscover,
  onResume,
  userEditorialRole,
  onEditor,
  isAdmin,
  onAdmin,
  activePage,
  onSaveSettings,
  languages = [],
}) {
  const [tree,    setTree]    = useState({});
  const [loading, setLoading] = useState(true);

  // Desktop selection state
  const [selLevelId,  setSelLevelId]  = useState(null);
  const [selThemeId,  setSelThemeId]  = useState(null);
  const [selModuleId, setSelModuleId] = useState(null);
  const [selLessonId, setSelLessonId] = useState(null);

  // Mobile drill-down: 'levels' | 'themes' | 'modules' | 'lessons'
  const [mobileDepth, setMobileDepth] = useState("levels");
  const detailRef = useRef(null);

  useEffect(() => {
    if (!course?.course_id) return;
    setLoading(true);
    getCourseTree(course.course_id).then(({ data, error }) => {
      if (error) { console.warn("Navigator tree error:", error); setLoading(false); return; }
      const grouped = groupTree(data || []);
      setTree(grouped);
      if (initialSelection?.levelId) {
        // Restore the selection from Resume Yatra / back-from-player
        setSelLevelId(initialSelection.levelId);
        if (initialSelection.themeId)  setSelThemeId(initialSelection.themeId);
        if (initialSelection.moduleId) setSelModuleId(initialSelection.moduleId);
        if (initialSelection.lessonId) setSelLessonId(initialSelection.lessonId);
        // Mobile: drop straight to lessons depth if we have a module
        if (initialSelection.moduleId) setMobileDepth("lessons");
        else if (initialSelection.themeId) setMobileDepth("modules");
        else setMobileDepth("themes");
      } else {
        // Default: auto-select first level
        const firstLevel = Object.keys(grouped).sort()[0];
        if (firstLevel) setSelLevelId(firstLevel);
      }
      setLoading(false);
    });
  }, [course?.course_id]);

  // Mobile: scroll to detail when depth changes
  useEffect(() => {
    if (mobileDepth !== "levels" && detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, [mobileDepth, selLevelId, selThemeId, selModuleId]);

  const levelIds = Object.keys(tree).sort();

  // ── Desktop: tree clicks ──
  function desktopClickLevel(id) {
    setSelLevelId(id); setSelThemeId(null); setSelModuleId(null); setSelLessonId(null);
  }
  function desktopClickTheme(tid, lid) {
    setSelLevelId(lid); setSelThemeId(tid); setSelModuleId(null); setSelLessonId(null);
  }
  function desktopClickModule(mid, tid, lid) {
    setSelLevelId(lid); setSelThemeId(tid); setSelModuleId(mid); setSelLessonId(null);
  }
  function desktopClickLesson(lesson, mid, tid, lid) {
    setSelLessonId(lesson.lesson_id);
    const mod = tree[lid]?.themes[tid]?.modules[mid];
    const thm = tree[lid]?.themes[tid];
    onLessonSelect && onLessonSelect(lesson, { module_id: mid, theme_id: tid, module_name: mod?.name }, { theme_id: tid, title: thm?.title }, lid);
  }

  // ── Mobile: drill-down clicks ──
  function mobileClickLevel(id) {
    setSelLevelId(id); setSelThemeId(null); setSelModuleId(null);
    setMobileDepth("themes");
  }
  function mobileClickTheme(tid) {
    setSelThemeId(tid); setSelModuleId(null);
    setMobileDepth("modules");
  }
  function mobileClickModule(mid) {
    setSelModuleId(mid);
    setMobileDepth("lessons");
  }
  function mobileClickLesson(lesson) {
    const lid = selLevelId, tid = selThemeId, mid = selModuleId;
    const mod = tree[lid]?.themes[tid]?.modules[mid];
    const thm = tree[lid]?.themes[tid];
    onLessonSelect && onLessonSelect(lesson, { module_id: mid, theme_id: tid, module_name: mod?.name }, { theme_id: tid, title: thm?.title }, lid);
  }
  function mobileDrillBack() {
    if (mobileDepth === "lessons")  { setMobileDepth("modules");  return; }
    if (mobileDepth === "modules")  { setMobileDepth("themes");   return; }
    if (mobileDepth === "themes")   { setMobileDepth("levels");   return; }
  }

  // ── Detail panel content (desktop) ──
  function renderDetail() {
    if (loading) return <div className="nav-empty">Loading…</div>;
    if (!selLevelId) return <div className="nav-empty">Select a level to begin</div>;

    const lvl = tree[selLevelId];
    if (!lvl) return null;
    const levelMeta = LEVEL_LABELS[selLevelId] || { label: selLevelId, classes: "" };

    // Level selected — show themes
    if (!selThemeId) {
      const themeIds = Object.keys(lvl.themes).sort((a, b) => lvl.themes[a].sort - lvl.themes[b].sort);
      const allLessons = themeIds.flatMap(tid => Object.values(lvl.themes[tid].modules).flatMap(m => m.lessons));
      const { done, total, pct } = progressFraction(allLessons, completedLessons);
      return (
        <>
          <div className="nd-eyebrow">{course?.course_name}</div>
          <div className="nd-title">{levelMeta.label}</div>
          <div className="nd-sub">{levelMeta.classes} · {themeIds.length} theme{themeIds.length !== 1 ? "s" : ""}</div>
          {total > 0 && (
            <>
              <div className="nd-stat-row">
                <div className="nd-stat"><div className="nd-stat-val">{done}/{total}</div><div className="nd-stat-lbl">Lessons done</div></div>
                <div className="nd-stat"><div className="nd-stat-val">{pct}%</div><div className="nd-stat-lbl">Progress</div></div>
              </div>
              <div className="nd-prog-wrap"><div className="nd-prog-fill" style={{ width: `${pct}%` }} /></div>
            </>
          )}
          <div className="nd-section-title">Themes in this level</div>
          {themeIds.map((tid, i) => {
            const thm = lvl.themes[tid];
            const tLessons = Object.values(thm.modules).flatMap(m => m.lessons);
            const { done: td, total: tt, pct: tp } = progressFraction(tLessons, completedLessons);
            const tStatus = rollupTheme(thm.modules, completedLessons);
            return (
              <div key={tid} className="nd-card" style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => desktopClickTheme(tid, selLevelId)}>
                <StatusDot status={tStatus} size={10} />
                <div className="nd-card-info">
                  <div className="nd-card-name">{thm.title}</div>
                  <div className="nd-card-meta">{Object.keys(thm.modules).length} modules</div>
                  {tt > 0 && <div className="nd-card-prog"><div className="nd-card-prog-fill" style={{ width: `${tp}%`, background: tStatus === "done" ? GREEN : HERITAGE }} /></div>}
                </div>
                <div className="nd-card-right">
                  {tt > 0 && <span className="nd-card-pct">{tp}%</span>}
                  <i className="ti ti-chevron-right" aria-hidden="true" style={{ fontSize: 14, color: "#BBBBB8" }} />
                </div>
              </div>
            );
          })}
        </>
      );
    }

    const thm = lvl.themes[selThemeId];
    if (!thm) return null;

    // Theme selected — show modules
    if (!selModuleId) {
      const moduleIds = Object.keys(thm.modules).sort((a, b) => thm.modules[a].sort - thm.modules[b].sort);
      const tLessons = moduleIds.flatMap(mid => thm.modules[mid].lessons);
      const { done, total, pct } = progressFraction(tLessons, completedLessons);
      return (
        <>
          <div className="nd-eyebrow">{levelMeta.label} · {course?.course_name}</div>
          <div className="nd-title">{thm.title}</div>
          <div className="nd-sub">{moduleIds.length} module{moduleIds.length !== 1 ? "s" : ""}</div>
          {total > 0 && (
            <>
              <div className="nd-stat-row">
                <div className="nd-stat"><div className="nd-stat-val">{done}/{total}</div><div className="nd-stat-lbl">Lessons done</div></div>
                <div className="nd-stat"><div className="nd-stat-val">{pct}%</div><div className="nd-stat-lbl">Progress</div></div>
              </div>
              <div className="nd-prog-wrap"><div className="nd-prog-fill" style={{ width: `${pct}%` }} /></div>
            </>
          )}
          <div className="nd-section-title">Modules</div>
          {moduleIds.map((mid, i) => {
            const mod = thm.modules[mid];
            const { done: md, total: mt, pct: mp } = progressFraction(mod.lessons, completedLessons);
            const mStatus = rollupModule(mod.lessons, completedLessons);
            return (
              <div key={mid} className="nd-card" style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => desktopClickModule(mid, selThemeId, selLevelId)}>
                <StatusDot status={mStatus} size={10} baseColor={HERITAGE} />
                <div className="nd-card-info">
                  <div className="nd-card-name">{mod.name}</div>
                  <div className="nd-card-meta">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}</div>
                  {mt > 0 && <div className="nd-card-prog"><div className="nd-card-prog-fill" style={{ width: `${mp}%`, background: mStatus === "done" ? GREEN : HERITAGE }} /></div>}
                </div>
                <div className="nd-card-right">
                  {mt > 0 && <span className="nd-card-pct">{mp}%</span>}
                  <i className="ti ti-chevron-right" aria-hidden="true" style={{ fontSize: 14, color: "#BBBBB8" }} />
                </div>
              </div>
            );
          })}
        </>
      );
    }

    const mod = thm.modules[selModuleId];
    if (!mod) return null;

    // Module selected — show lessons + CTA
    const { done, total, pct } = progressFraction(mod.lessons, completedLessons);
    const firstIncomplete = mod.lessons.find(l => !completedLessons.has(l.lesson_id));
    const resumeLesson = firstIncomplete || mod.lessons[0];
    const ctaLabel = done === total && total > 0 ? "Review module" : done > 0 ? "Resume" : "Start module";

    return (
      <>
        <div className="nd-eyebrow">{thm.title} · {levelMeta.label}</div>
        <div className="nd-title">{mod.name}</div>
        <div className="nd-sub">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}</div>
        {total > 0 && (
          <>
            <div className="nd-stat-row">
              <div className="nd-stat"><div className="nd-stat-val">{done}/{total}</div><div className="nd-stat-lbl">Lessons done</div></div>
              <div className="nd-stat"><div className="nd-stat-val">{pct}%</div><div className="nd-stat-lbl">Progress</div></div>
            </div>
            <div className="nd-prog-wrap"><div className="nd-prog-fill" style={{ width: `${pct}%` }} /></div>
          </>
        )}
        {resumeLesson && (
          <button className="nd-cta" onClick={() => desktopClickLesson(resumeLesson, selModuleId, selThemeId, selLevelId)}>
            <i className="ti ti-player-play" aria-hidden="true" style={{ fontSize: 15 }} />
            {ctaLabel}
          </button>
        )}
        <div className="nd-section-title">Lessons</div>
        {mod.lessons.map((lesson, i) => {
          const lStatus = lessonStatus(lesson.lesson_id, completedLessons, lessonProgress);
          const isActive = lesson.lesson_id === selLessonId;
          return (
            <div key={lesson.lesson_id} className="nd-card" style={{ animationDelay: `${i * 0.04}s`,
              borderColor: isActive ? `${HERITAGE}44` : undefined }}
              onClick={() => desktopClickLesson(lesson, selModuleId, selThemeId, selLevelId)}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: lStatus === "done" ? `${GREEN}15` : lStatus === "resume" ? `${SAFFRON}15` : "rgba(0,0,0,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {lStatus === "done"   && <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 15, color: GREEN }} />}
                {lStatus === "resume" && <i className="ti ti-player-play"  aria-hidden="true" style={{ fontSize: 14, color: SAFFRON }} />}
                {lStatus === "none"   && <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6B6B" }}>{i + 1}</span>}
              </div>
              <div className="nd-card-info">
                <div className="nd-card-name">{lesson.lesson_name}</div>
              </div>
              <span className={`nd-card-cta${lStatus === "done" ? " done" : ""}`}>
                {lStatus === "done" ? "Review" : lStatus === "resume" ? "Resume →" : "Start →"}
              </span>
            </div>
          );
        })}
      </>
    );
  }

  // ── Mobile detail section ──
  function renderMobileDetail() {
    if (loading || mobileDepth === "levels") return null;

    const lvl = tree[selLevelId];
    if (!lvl) return null;
    const levelMeta = LEVEL_LABELS[selLevelId] || { label: selLevelId, classes: "" };

    // Back pill + breadcrumb
    const backLabel =
      mobileDepth === "themes"  ? "All levels" :
      mobileDepth === "modules" ? levelMeta.label :
      mobileDepth === "lessons" ? (lvl.themes[selThemeId]?.title || "") : "";

    let items = [];

    if (mobileDepth === "themes") {
      const themeIds = Object.keys(lvl.themes).sort((a, b) => lvl.themes[a].sort - lvl.themes[b].sort);
      items = themeIds.map(tid => {
        const thm = lvl.themes[tid];
        const tLessons = Object.values(thm.modules).flatMap(m => m.lessons);
        const { pct } = progressFraction(tLessons, completedLessons);
        const tStatus = rollupTheme(thm.modules, completedLessons);
        return (
          <div key={tid} className="nd-card" onClick={() => mobileClickTheme(tid)}>
            <StatusDot status={tStatus} size={9} />
            <div className="nd-card-info">
              <div className="nd-card-name">{thm.title}</div>
              <div className="nd-card-meta">{Object.keys(thm.modules).length} modules</div>
            </div>
            <div className="nd-card-right">
              {tLessons.length > 0 && <span className="nd-card-pct">{pct}%</span>}
              <i className="ti ti-chevron-right" aria-hidden="true" style={{ fontSize: 14, color: "#BBBBB8" }} />
            </div>
          </div>
        );
      });
    }

    if (mobileDepth === "modules" && selThemeId) {
      const thm = lvl.themes[selThemeId];
      const moduleIds = Object.keys(thm.modules).sort((a, b) => thm.modules[a].sort - thm.modules[b].sort);
      items = moduleIds.map(mid => {
        const mod = thm.modules[mid];
        const { pct } = progressFraction(mod.lessons, completedLessons);
        const mStatus = rollupModule(mod.lessons, completedLessons);
        return (
          <div key={mid} className="nd-card" onClick={() => mobileClickModule(mid)}>
            <StatusDot status={mStatus} size={9} baseColor={HERITAGE} />
            <div className="nd-card-info">
              <div className="nd-card-name">{mod.name}</div>
              <div className="nd-card-meta">{mod.lessons.length} lessons</div>
            </div>
            <div className="nd-card-right">
              {mod.lessons.length > 0 && <span className="nd-card-pct">{pct}%</span>}
              <i className="ti ti-chevron-right" aria-hidden="true" style={{ fontSize: 14, color: "#BBBBB8" }} />
            </div>
          </div>
        );
      });
    }

    if (mobileDepth === "lessons" && selThemeId && selModuleId) {
      const mod = lvl.themes[selThemeId]?.modules[selModuleId];
      if (mod) {
        items = mod.lessons.map((lesson, i) => {
          const lStatus = lessonStatus(lesson.lesson_id, completedLessons, lessonProgress);
          return (
            <div key={lesson.lesson_id} className="nd-card" onClick={() => mobileClickLesson(lesson)}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: lStatus === "done" ? `${GREEN}15` : lStatus === "resume" ? `${SAFFRON}15` : "rgba(0,0,0,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {lStatus === "done"   && <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 14, color: GREEN }} />}
                {lStatus === "resume" && <i className="ti ti-player-play"  aria-hidden="true" style={{ fontSize: 13, color: SAFFRON }} />}
                {lStatus === "none"   && <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6B6B" }}>{i + 1}</span>}
              </div>
              <div className="nd-card-info">
                <div className="nd-card-name">{lesson.lesson_name}</div>
              </div>
              <span className={`nd-card-cta${lStatus === "done" ? " done" : ""}`}>
                {lStatus === "done" ? "Review" : lStatus === "resume" ? "Resume →" : "Start →"}
              </span>
            </div>
          );
        });
      }
    }

    return (
      <div ref={detailRef} className="nav-detail-col">
        <button onClick={mobileDrillBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            cursor: "pointer", fontSize: 13, color: HERITAGE, fontWeight: 600, marginBottom: 16, padding: 0 }}>
          <i className="ti ti-arrow-left" aria-hidden="true" style={{ fontSize: 15 }} />
          {backLabel}
        </button>
        {items}
      </div>
    );
  }

  // ── Desktop tree ──
  function renderDesktopTree() {
    return levelIds.map(lid => {
      const lvl = tree[lid];
      const isLevelActive = selLevelId === lid;
      const meta = LEVEL_LABELS[lid] || { label: lid, classes: "" };
      const chipBg   = lid === "LEVEL_001" ? "#E6F1FB" : lid === "LEVEL_002" ? "#EAF3DE" : "#FAEEDA";
      const chipColor = lid === "LEVEL_001" ? "#185FA5" : lid === "LEVEL_002" ? "#3B6D11" : "#854F0B";
      const themeIds = Object.keys(lvl.themes).sort((a, b) => lvl.themes[a].sort - lvl.themes[b].sort);

      return (
        <div key={lid}>
          <div className={`nav-level-row${isLevelActive ? " active" : ""}`}
            onClick={() => desktopClickLevel(lid)}>
            <span className="nav-level-chip" style={{ background: chipBg, color: chipColor }}>
              {meta.label}{meta.classes ? ` · ${meta.classes}` : ""}
            </span>
            <i className={`ti ti-chevron-down nav-ch${isLevelActive ? " open" : ""}`} aria-hidden="true" />
          </div>
          {isLevelActive && themeIds.map(tid => {
            const thm = lvl.themes[tid];
            const isThemeActive = selThemeId === tid;
            const tStatus = rollupTheme(thm.modules, completedLessons);
            const moduleIds = Object.keys(thm.modules).sort((a, b) => thm.modules[a].sort - thm.modules[b].sort);
            return (
              <div key={tid}>
                <div className={`nav-theme-row${isThemeActive ? " active" : ""}`}
                  onClick={() => desktopClickTheme(tid, lid)}>
                  <StatusDot status={tStatus} />
                  <span className="nav-theme-name">{thm.title}</span>
                  <i className={`ti ti-chevron-down nav-ch${isThemeActive ? " open" : ""}`} aria-hidden="true" />
                </div>
                {isThemeActive && moduleIds.map(mid => {
                  const mod = thm.modules[mid];
                  const isModActive = selModuleId === mid;
                  const mStatus = rollupModule(mod.lessons, completedLessons);
                  return (
                    <div key={mid}>
                      <div className={`nav-mod-row${isModActive ? " active" : ""}`}
                        onClick={() => desktopClickModule(mid, tid, lid)}>
                        <StatusDot status={mStatus} size={7} baseColor={HERITAGE} />
                        <span className="nav-mod-name">{mod.name}</span>
                        <i className={`ti ti-chevron-down nav-ch${isModActive ? " open" : ""}`} style={{ fontSize: 11 }} aria-hidden="true" />
                      </div>
                      {isModActive && mod.lessons.map(lesson => {
                        const lStatus = lessonStatus(lesson.lesson_id, completedLessons, lessonProgress);
                        const isActive = selLessonId === lesson.lesson_id;
                        return (
                          <div key={lesson.lesson_id}
                            className={`nav-les-row${isActive ? " active" : ""}`}
                            onClick={() => desktopClickLesson(lesson, mid, tid, lid)}>
                            {lStatus === "done"   && <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 13, color: GREEN, flexShrink: 0 }} />}
                            {lStatus === "resume" && <i className="ti ti-player-play"  aria-hidden="true" style={{ fontSize: 13, color: SAFFRON, flexShrink: 0 }} />}
                            {lStatus === "none"   && <i className="ti ti-circle"        aria-hidden="true" style={{ fontSize: 13, color: "#BBBBB8", flexShrink: 0 }} />}
                            <span className="nav-les-name">{lesson.lesson_name}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    });
  }

  // ── Mobile tree (compressed drill-down) ──
  function renderMobileTree() {
    if (mobileDepth !== "levels") {
      // Compressed: show selected path as back-navigable pills
      const lvl = tree[selLevelId];
      const meta = LEVEL_LABELS[selLevelId] || { label: selLevelId, classes: "" };
      const chipBg    = selLevelId === "LEVEL_001" ? "#E6F1FB" : selLevelId === "LEVEL_002" ? "#EAF3DE" : "#FAEEDA";
      const chipColor = selLevelId === "LEVEL_001" ? "#185FA5" : selLevelId === "LEVEL_002" ? "#3B6D11" : "#854F0B";
      return (
        <div style={{ padding: "10px 14px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span onClick={() => { setMobileDepth("levels"); setSelThemeId(null); setSelModuleId(null); }}
            style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
              background: chipBg, color: chipColor, cursor: "pointer" }}>
            {meta.label}
          </span>
          {selThemeId && lvl?.themes[selThemeId] && (
            <>
              <i className="ti ti-chevron-right" aria-hidden="true" style={{ fontSize: 11, color: "#BBBBB8" }} />
              <span onClick={() => { setMobileDepth("themes"); setSelModuleId(null); }}
                style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                  background: "rgba(0,0,0,0.06)", color: "#1F1F1F", cursor: "pointer" }}>
                {lvl.themes[selThemeId].title}
              </span>
            </>
          )}
          {selModuleId && lvl?.themes[selThemeId]?.modules[selModuleId] && (
            <>
              <i className="ti ti-chevron-right" aria-hidden="true" style={{ fontSize: 11, color: "#BBBBB8" }} />
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                background: "rgba(0,0,0,0.06)", color: "#1F1F1F" }}>
                {lvl.themes[selThemeId].modules[selModuleId].name}
              </span>
            </>
          )}
        </div>
      );
    }

    // Level list
    return levelIds.map(lid => {
      const meta = LEVEL_LABELS[lid] || { label: lid, classes: "" };
      const chipBg    = lid === "LEVEL_001" ? "#E6F1FB" : lid === "LEVEL_002" ? "#EAF3DE" : "#FAEEDA";
      const chipColor = lid === "LEVEL_001" ? "#185FA5" : lid === "LEVEL_002" ? "#3B6D11" : "#854F0B";
      return (
        <div key={lid} onClick={() => mobileClickLevel(lid)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
            borderBottom: "0.5px solid rgba(0,0,0,0.07)", cursor: "pointer" }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
            background: chipBg, color: chipColor }}>
            {meta.label}{meta.classes ? ` · ${meta.classes}` : ""}
          </span>
          <span style={{ flex: 1 }} />
          <i className="ti ti-chevron-right" aria-hidden="true" style={{ fontSize: 14, color: "#BBBBB8" }} />
        </div>
      );
    });
  }

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
        navLinks={[
          { label: "Home", onClick: onBack },
          { label: "Discover", onClick: onDiscover },
          { label: "Dashboard", onClick: onDashboard },
          { label: "Likes", onClick: onLikes },
          { label: "Bookmarks", onClick: onBookmarks },
        ]}
      />
      <div className="breadcrumb">
        <a onClick={onBack}>Home</a>
        <span className="sep">›</span>
        <span className="current">{course?.course_name || "Course Navigator"}</span>
      </div>

      <div className="nav-page">
        {/* Tree column */}
        <div className="nav-tree-col">
          <div className="nav-course-hdr">
            <div className="nav-course-name">{course?.course_name}</div>
            {!loading && (
              <div className="nav-course-meta">
                {Object.keys(tree).length} level{Object.keys(tree).length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
          {loading
            ? <div style={{ padding: "20px 16px", fontSize: 13, color: "#6B6B6B" }}>Loading…</div>
            : (
              <>
                {/* Desktop tree */}
                <div style={{ display: "none" }} className="desktop-only-tree">
                  {renderDesktopTree()}
                </div>
                {/* Mobile tree / breadcrumb pills */}
                <div className="mobile-only-tree">
                  {renderMobileTree()}
                </div>
                {/* Desktop tree (shown via CSS) */}
                <style>{`
                  @media (min-width: 769px) {
                    .desktop-only-tree { display: block !important; }
                    .mobile-only-tree  { display: none   !important; }
                  }
                  @media (max-width: 768px) {
                    .desktop-only-tree { display: none   !important; }
                    .mobile-only-tree  { display: block  !important; }
                  }
                `}</style>
              </>
            )
          }
        </div>

        {/* Detail panel — desktop only via CSS */}
        <div className="nav-detail-col desktop-detail">
          <style>{`.desktop-detail { display: none; } @media (min-width: 769px) { .desktop-detail { display: block !important; } }`}</style>
          {renderDetail()}
        </div>

        {/* Mobile detail below tree */}
        <div className="mobile-detail" style={{ display: "none" }}>
          <style>{`@media (max-width: 768px) { .mobile-detail { display: block !important; } }`}</style>
          {renderMobileDetail()}
        </div>
      </div>
    </>
  );
}
