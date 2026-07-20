import { useEffect } from "react";
import { HERITAGE, SAFFRON, GREEN, LEVEL_LABELS } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import ModuleGauge from "../components/ModuleGauge";
import { useCourseTree } from "../hooks/useCourseTree";
import { levelNumber, levelShortLabel, moduleProgress, lessonStatus } from "../lib/courseTree";
import { useEntityPreview } from "../components/EntityPreview";
import { ErrorState } from "../components/ErrorState";

// Teal — brandbook accent reserved for course-browsing chrome (matches HomePage course cards)
const TEAL    = "var(--color-browse)";
const TEAL_BG = "#EDF6F6";
const TEAL_BD = "#C2E4E2";

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  /* Page gutter — same left/right margin scale as the shared .page-wrap
     used elsewhere in the app (src/styles/global.js), so Courses lines up
     with every other page instead of running its own numbers. */
  .ac-page-wrap { max-width: 1200px; margin: 0 auto; padding: 0 1.25rem; }
  @media (max-width: 768px) { .ac-page-wrap { padding: 0 1rem; } }
  @media (max-width: 480px) { .ac-page-wrap { padding: 0 0.875rem; } }

  .ac-headline { padding: 14px 0 10px; }
  .ac-headline-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.375rem; font-weight: 700;
    color: ${HERITAGE};
  }
  .ac-headline-path {
    font-family: 'Nunito Sans', system-ui, sans-serif; font-size: 0.8125rem; color: var(--color-text-body);
    margin-top: 2px;
  }
  .ac-crumb { cursor: pointer; }
  .ac-crumb:hover { color: ${TEAL}; text-decoration: underline; }
  .ac-crumb-current { color: var(--color-text-body); cursor: default; }
  .ac-crumb-sep { color: var(--color-text-muted); padding: 0 2px; }

  .ac-body {
    display: flex;
    height: calc(100dvh - 64px - 66px);
    min-height: 420px;
    border: 1px solid ${TEAL_BD}; border-radius: 14px; overflow: hidden;
  }

  /* ── Sidebar: Course → Level (tabs) → Theme ── */
  .ac-sidebar {
    width: 132px; flex-shrink: 0; min-height: 0; overflow-y: auto;
    overscroll-behavior: contain; background: #fff;
    border-right: 1px solid ${TEAL_BD};
  }
  .ac-course-row {
    padding: 12px 10px; cursor: pointer; user-select: none;
    font-family: 'Nunito Sans', system-ui, sans-serif; font-weight: 700; font-size: 0.8125rem;
    color: var(--color-text-main);
    word-wrap: break-word; overflow-wrap: break-word;
  }
  .ac-course-row.open {
    background: ${TEAL_BG}; color: ${TEAL};
  }
  .ac-level-tabs {
    display: flex; justify-content: center; gap: 6px;
    padding: 8px 4px; border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .ac-level-tab {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; user-select: none; line-height: 1; text-align: center;
    font-family: 'Inter', system-ui, sans-serif;
    background: rgba(0,0,0,0.05); color: var(--color-text-body); border: 1.5px solid transparent;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .ac-level-tab-label { font-size: 0.34375rem; font-weight: 700; letter-spacing: 0.01em; text-transform: uppercase; }
  .ac-level-tab-num   { font-size: 0.6875rem; font-weight: 800; margin-top: 1px; }
  .ac-level-tab.active { background: ${TEAL}; color: #fff; border-color: ${TEAL}; }
  .ac-theme-row {
    padding: 8px 10px 8px 18px; cursor: pointer; user-select: none;
    font-family: 'Nunito Sans', system-ui, sans-serif; font-size: 0.75rem; color: var(--color-text-body);
    word-wrap: break-word; overflow-wrap: break-word;
  }
  .ac-theme-row.active {
    background: ${TEAL_BG}; color: ${TEAL}; font-weight: 700;
  }
  .ac-sidebar-empty { padding: 20px 12px; font-size: 0.75rem; color: var(--color-text-muted); }

  /* ── Main pane: single merged Module → Lesson feed ── */
  .ac-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
  .ac-feed-pane {
    flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
    padding: 8px;
    scrollbar-width: none; -ms-overflow-style: none; /* Firefox / old Edge */
  }
  .ac-feed-pane::-webkit-scrollbar { display: none; } /* Chrome / Safari */
  .ac-empty {
    display: flex; align-items: center; justify-content: center; height: 100%;
    color: var(--color-text-muted); font-size: 0.8125rem; text-align: center; padding: 20px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  .unified-module-block {
    padding: 10px; border-radius: 12px; overflow: hidden; margin-bottom: 14px;
    border: 1px solid rgba(0,0,0,0.06); background-color: #fff;
  }
  .unified-module-block.module-target {
    border-radius: 12px; border: 2px solid ${SAFFRON}; box-shadow: 0 0 0 3px ${SAFFRON}22;
  }
  .ac-module-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .ac-module-name {
    flex: 1; min-width: 0;
    font-family: 'Nunito Sans', system-ui, sans-serif; font-weight: 700; font-size: 0.9375rem;
    color: var(--color-text-main); line-height: 1.25;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ac-module-subrow { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  .ac-module-meta {
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.6875rem; color: var(--color-text-main);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ac-module-social { flex-shrink: 0; display: flex; gap: 8px; }

  .bm-btn, .like-btn {
    flex-shrink: 0; background: none; border: none; cursor: pointer;
    font-size: 1.125rem; line-height: 1; padding: 4px; border-radius: 8px;
    color: var(--color-text-muted); transition: color 0.15s, transform 0.15s;
    display: flex; align-items: center; justify-content: center;
  }
  .bm-btn:hover { color: var(--color-text-main); transform: scale(1.15); }
  .bm-btn.saved { color: var(--color-text-main); }
  .like-btn:hover { color: var(--color-text-main); transform: scale(1.15); }
  .like-btn.liked { color: var(--color-text-main); }

  .ac-lesson-card {
    background: #FFFFFF; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px;
    padding: 8px; margin-bottom: 6px; animation: acFadeUp 0.25s ease both;
  }
  .ac-lesson-card:last-child { margin-bottom: 0; }
  .ac-lesson-card.resume-target { border: 2px solid ${SAFFRON}; box-shadow: 0 0 0 3px ${SAFFRON}22; }
  @keyframes acFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .ac-lesson-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  /* Lesson number / done-tick — plain text, no circle/background, so it
     reads as a simple status marker next to the lesson name rather than
     a thumbnail-shaped icon. */
  .ac-lesson-num {
    flex-shrink: 0; min-width: 18px; text-align: center;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.8125rem; font-weight: 700;
    color: var(--color-text-main);
  }
  .ac-lesson-num.done { color: ${GREEN}; font-size: 1rem; font-weight: 800; }
  .ac-lesson-title {
    flex: 1; min-width: 0;
    font-family: 'Nunito Sans', system-ui, sans-serif; font-weight: 700; font-size: 0.9375rem;
    color: var(--color-text-main); line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ac-continue-tag {
    flex-shrink: 0; background: ${SAFFRON}; color: #fff; font-size: 0.625rem; font-weight: 700;
    padding: 3px 9px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; margin-left: 6px;
  }
  /* Resume-point play button — same glyph/colour as the header's "Resume
     Yatra" action, so the two read as the same affordance. */
  .ac-continue-play {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; border-radius: 50%; margin-left: 6px;
    background: none; border: none; cursor: pointer; color: ${SAFFRON};
    transition: background 0.12s;
  }
  .ac-continue-play:hover { background: var(--color-border-muted); }
  .ac-lesson-actions { display: flex; align-items: center; gap: 4px; flex-wrap: nowrap; }
  .ac-lesson-social { display: flex; gap: 0; margin-right: auto; flex-shrink: 0; }
  .ac-btn-read {
    flex-shrink: 0;
    background: ${SAFFRON}; color: #fff; border: none; border-radius: 999px;
    padding: 6px 12px; font-family: 'Inter', system-ui, sans-serif; font-size: 0.75rem;
    font-weight: 600; cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
  }
  .ac-btn-read:hover { opacity: 0.88; }
  .ac-btn-quiz {
    flex-shrink: 0;
    background: ${HERITAGE}; color: #fff; border: none; border-radius: 999px;
    padding: 6px 12px; font-family: 'Inter', system-ui, sans-serif; font-size: 0.75rem;
    font-weight: 600; cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
  }
  .ac-btn-quiz:hover { opacity: 0.88; }
  .ac-btn-quiz:disabled { background: var(--color-border); color: var(--color-text-muted); cursor: not-allowed; }

  @media (min-width: 640px) {
    .ac-sidebar { width: 200px; }
    .ac-body { border-radius: 16px; }
    .ac-feed-pane { padding: 16px; }
    .unified-module-block { padding: 16px; }
    .ac-lesson-card { padding: 12px 14px; }
  }
  @media (min-width: 900px) {
    .ac-sidebar { width: 250px; }
  }
  @media (max-width: 768px) {
    .ac-body { height: calc(100dvh - 64px - 66px - 64px); }
  }
  /* Narrow phones — the sidebar's fixed 132px eats a big share of the
     screen, so give the Read/Quiz pills a little more room to breathe. */
  @media (max-width: 400px) {
    .ac-sidebar { width: 112px; }
    .ac-btn-read, .ac-btn-quiz { padding: 5px 10px; font-size: 0.6875rem; }
  }

  /* ── Desktop: sidebar + 2-column module feed (more compact use of the
     extra width instead of one long single-column list) ── */
  @media (min-width: 1024px) {
    .ac-feed-pane {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      align-content: start; gap: 14px 18px;
    }
    .ac-empty { grid-column: 1 / -1; }
    .unified-module-block { margin-bottom: 0; }
  }
`;

// ─── Main component ───────────────────────────────────────────────────────────

export default function AllCoursesPage({
  profile,
  completedLessons = new Set(),
  lessonProgress   = new Map(),
  onLessonSelect,
  onQuizClick,
  onBack,
  settings,
  onOpenSettings,
  onDashboard,
  onLikes,
  onBookmarks,
  onDiscover, onForYou, onAllCourses,
  onResume,
  userEditorialRole,
  onEditor,
  isAdmin,
  onAdmin,
  activePage,
  onSaveSettings,
  languages = [],
  likes = new Set(),
  bookmarks = new Set(),
  onToggleLike,
  onToggleBookmark,
  courseTreeSeed, // { course_id, level_id, theme_id, module_id } — pre-open on a specific
                  // module (used when arriving here via a Module click from ForYouPage)
}) {
  const {
    courses, tree, storyCounts, lessonImages, quizMap, loading, load,
    openCourseId, openLevelId, selCourseId, selLevelId, selThemeId, resumeLessonId, resumeModuleId,
    toggleCourse, selectLevelTab, selectTheme, goToCourse, goToLevel, registerLessonRef, registerModuleRef,
  } = useCourseTree(profile, courseTreeSeed);
  const { openPreview } = useEntityPreview();

  // Lesson-row thumbnail — real snippet image when the lesson has one
  // (lessonImages, from useCourseTree), otherwise a stable per-lesson
  // placeholder photo so the circular photo+progress treatment always has
  // something to show until real lesson cover images exist.
  function lessonThumb(lessonId) {
    return lessonImages[lessonId] || `https://picsum.photos/seed/${lessonId}/96/96`;
  }

  // Same play glyph as the header's "Resume Yatra" button (PageHeader's IcPlay).
  function PlaySVG() {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24">
        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
      </svg>
    );
  }

  // Module card background — the module's own cover photo, tiled across the
  // full card height (module header + all its lesson rows) and washed out
  // with a translucent white layer so it reads as a light background, not
  // a dark photo. Falls back to a stable per-module placeholder so every
  // card gets a tile even before real cover images are uploaded.
  function moduleBgStyle(moduleId, imageUrl) {
    const img = imageUrl || `https://picsum.photos/seed/module-${moduleId}/240/240`;
    return {
      backgroundImage: `linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6)), url(${img})`,
      backgroundRepeat: "no-repeat, repeat",
      backgroundSize: "100% 100%, 130px 130px",
    };
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCourse = courses.find(c => c.course_id === selCourseId);
  const activeLevelMeta = selLevelId ? (LEVEL_LABELS[selLevelId] || { label: selLevelId }) : null;
  const activeTheme = (selCourseId && selLevelId && selThemeId)
    ? tree[selCourseId]?.levels[selLevelId]?.themes[selThemeId]
    : null;

  const levelPathPart = (selLevelId && activeLevelMeta) ? `${levelShortLabel(selLevelId)} - ${activeLevelMeta.label}` : null;
  const pathParts = [activeCourse?.course_name, levelPathPart, activeTheme?.title].filter(Boolean);

  const moduleIds = activeTheme
    ? Object.keys(activeTheme.modules).sort((a, b) => activeTheme.modules[a].sort - activeTheme.modules[b].sort)
    : [];

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
          { label: "Home",      onClick: onBack       },
          { label: "Courses",   onClick: onAllCourses },
          { label: "For You",   onClick: onForYou     },
          { label: "Dashboard", onClick: onDashboard  },
          { label: "Discover",  onClick: onDiscover   },
        ]}
      />

      <div className="ac-page-wrap">
      <div className="ac-headline">
        <div className="ac-headline-title">All Courses</div>
        <div className="ac-headline-path">
          {pathParts.length > 0 ? (
            <>
              <span className="ac-crumb" onClick={() => goToCourse(selCourseId)}>{activeCourse?.course_name}</span>
              {levelPathPart && (
                <>
                  <span className="ac-crumb-sep">/</span>
                  <span className="ac-crumb" onClick={() => goToLevel(selCourseId, selLevelId)}>{levelPathPart}</span>
                </>
              )}
              {activeTheme && (
                <>
                  <span className="ac-crumb-sep">/</span>
                  <span className="ac-crumb-current">{activeTheme.title}</span>
                </>
              )}
            </>
          ) : "Select a course to begin browsing"}
        </div>
      </div>

      <div className="ac-body">
        {/* ── Sidebar: Course → Level (tabs) → Theme ── */}
        <div className="ac-sidebar">
          {loading ? (
            <div className="ac-sidebar-empty">Loading…</div>
          ) : courses.error ? (
            /* 2.8: a failed fetch is NOT "no courses" */
            <ErrorState compact title="Couldn't load courses" onRetry={load} />
          ) : courses.length === 0 ? (
            <div className="ac-sidebar-empty">No courses found.</div>
          ) : courses.map(course => {
            const crs = tree[course.course_id];
            const isCourseOpen = openCourseId === course.course_id;
            const levelIds = crs ? Object.keys(crs.levels).sort() : [];
            const activeLevelId = isCourseOpen ? (openLevelId && levelIds.includes(openLevelId) ? openLevelId : levelIds[0]) : null;
            const themeIds = (isCourseOpen && activeLevelId) ? Object.keys(crs.levels[activeLevelId].themes)
              .sort((a, b) => crs.levels[activeLevelId].themes[a].sort - crs.levels[activeLevelId].themes[b].sort) : [];
            return (
              <div key={course.course_id}>
                <div
                  className={"ac-course-row" + (isCourseOpen ? " open" : "")}
                  onClick={() => toggleCourse(course.course_id)}
                >
                  {course.course_name}
                </div>
                {isCourseOpen && levelIds.length > 0 && (
                  <div className="ac-level-tabs">
                    {levelIds.map(lid => {
                      const meta = LEVEL_LABELS[lid] || { label: lid };
                      return (
                        <div
                          key={lid}
                          className={"ac-level-tab" + (activeLevelId === lid ? " active" : "")}
                          onClick={() => selectLevelTab(lid)}
                          title={meta.label}
                        >
                          <span className="ac-level-tab-label">Level</span>
                          <span className="ac-level-tab-num">{levelNumber(lid) ?? lid}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {isCourseOpen && activeLevelId && themeIds.map(tid => {
                  const isActiveTheme = selCourseId === course.course_id && selLevelId === activeLevelId && selThemeId === tid;
                  return (
                    <div
                      key={tid}
                      className={"ac-theme-row" + (isActiveTheme ? " active" : "")}
                      onClick={() => selectTheme(course.course_id, activeLevelId, tid)}
                    >
                      {crs.levels[activeLevelId].themes[tid].title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── Main pane: merged Module → Lesson feed ── */}
        <div className="ac-main">
          <div className="ac-feed-pane">
            {loading ? (
              <div className="ac-empty">Loading…</div>
            ) : !activeTheme ? (
              <div className="ac-empty">Pick a theme from the sidebar to see its modules and lessons.</div>
            ) : moduleIds.length === 0 ? (
              <div className="ac-empty">No modules found for this theme yet.</div>
            ) : moduleIds.map(mid => {
              const mod = activeTheme.modules[mid];
              const { pct } = moduleProgress(mod.lessons, completedLessons);
              const stories = mod.lessons.reduce((sum, l) => sum + (storyCounts[l.lesson_id] || 0), 0);
              const modParam    = { module_id: mid, theme_id: selThemeId, module_name: mod.name };
              const themeParam  = { theme_id: selThemeId, title: activeTheme.title };
              const courseParam = { course_id: selCourseId, course_name: activeCourse?.course_name };
              const isModuleTarget = resumeModuleId === mid;
              const openModulePreview = () => openPreview({
                type: "module",
                id: mid,
                title: mod.name,
                crumb: activeTheme.title,
                desc: mod.description || "",
                image: mod.image_url,
                pct,
                liked: likes.has("module:" + mid),
                bookmarked: bookmarks.has("module:" + mid),
                onToggleLike: () => onToggleLike && onToggleLike("module", mid, mod.name),
                onToggleBookmark: () => onToggleBookmark && onToggleBookmark("module", mid, mod.name),
                // Module has no page of its own — this CTA used to jump into
                // the module's first lesson, which was a surprising place to
                // land. It now just closes the pop-up (EntityPreviewPopup's
                // runPlay() already calls closePreview() before this runs),
                // returning you to the Course page exactly as it was.
                onPlay: () => {},
                playLabel: "Browse module",
              });
              return (
                <div
                  className={"ac-module-section unified-module-block" + (isModuleTarget ? " module-target" : "")}
                  key={mid}
                  ref={registerModuleRef(mid)}
                  style={moduleBgStyle(mid, mod.image_url)}
                >
                  <div className="ac-module-header" onClick={openModulePreview} style={{ cursor: "pointer" }}>
                    <ModuleGauge pct={pct} size={40} />
                    <div className="ac-module-name">{mod.name}</div>
                    {isModuleTarget && <span className="ac-continue-tag">Opened</span>}
                  </div>
                  <div className="ac-module-subrow">
                    <div className="ac-module-meta">
                      {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""} · {stories} stor{stories !== 1 ? "ies" : "y"}
                    </div>
                    <div className="ac-module-social">
                      <button
                        className={"like-btn" + (likes.has("module:" + mid) ? " liked" : "")}
                        title={likes.has("module:" + mid) ? "Unlike" : "Like module"}
                        onClick={e => { e.stopPropagation(); onToggleLike && onToggleLike("module", mid, mod.name); }}
                      ><svg width="19" height="19" viewBox="0 0 24 24" fill={likes.has("module:" + mid) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6c-1.7-1.6-4.4-1.6-6 .1L12 7.5 9.2 4.7c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.1L12 19l8.8-8.2c1.7-1.7 1.7-4.4 0-6.1z"/></svg></button>
                      <button
                        className={"bm-btn" + (bookmarks.has("module:" + mid) ? " saved" : "")}
                        title={bookmarks.has("module:" + mid) ? "Remove bookmark" : "Bookmark module"}
                        onClick={e => { e.stopPropagation(); onToggleBookmark && onToggleBookmark("module", mid, mod.name); }}
                      ><svg width="19" height="19" viewBox="0 0 24 24" fill={bookmarks.has("module:" + mid) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>
                    </div>
                  </div>
                  {mod.lessons.length === 0 ? (
                    <div className="ac-empty" style={{ height: "auto", padding: "8px 0 16px" }}>No lessons found for this module yet.</div>
                  ) : mod.lessons.map((lesson, i) => {
                    const status = lessonStatus(lesson.lesson_id, completedLessons, lessonProgress);
                    const quiz = quizMap[lesson.lesson_id];
                    const isResumeTarget = resumeLessonId === lesson.lesson_id;
                    const openLessonPreview = () => openPreview({
                      type: "lesson",
                      id: lesson.lesson_id,
                      title: lesson.lesson_name,
                      crumb: `${activeTheme.title} › ${mod.name}`,
                      desc: lesson.description || "",
                      image: lessonThumb(lesson.lesson_id),
                      pct: null,
                      liked: likes.has("lesson:" + lesson.lesson_id),
                      bookmarked: bookmarks.has("lesson:" + lesson.lesson_id),
                      onToggleLike: () => onToggleLike && onToggleLike("lesson", lesson.lesson_id, lesson.lesson_name),
                      onToggleBookmark: () => onToggleBookmark && onToggleBookmark("lesson", lesson.lesson_id, lesson.lesson_name),
                      onPlay: () => onLessonSelect && onLessonSelect(lesson, modParam, themeParam, selLevelId, courseParam),
                      playLabel: "Read",
                      onQuiz: quiz ? () => onQuizClick && onQuizClick(lesson, quiz, modParam, themeParam, selLevelId, courseParam) : null,
                      quizLabel: "Quiz",
                    });
                    return (
                      <div
                        className={"ac-lesson-card" + (isResumeTarget ? " resume-target" : "")}
                        key={lesson.lesson_id}
                        style={{ animationDelay: `${i * 0.03}s`, cursor: "pointer" }}
                        ref={registerLessonRef(lesson.lesson_id)}
                        onClick={openLessonPreview}
                      >
                        <div className="ac-lesson-top">
                          <div className={"ac-lesson-num" + (status === "done" ? " done" : "")}>
                            {status === "done" ? "✓" : i + 1}
                          </div>
                          <div className="ac-lesson-title">
                            {lesson.lesson_name}
                          </div>
                          {isResumeTarget && (
                            <button
                              className="ac-continue-play"
                              title="Resume"
                              onClick={e => { e.stopPropagation(); onLessonSelect && onLessonSelect(lesson, modParam, themeParam, selLevelId, courseParam); }}
                            >
                              <PlaySVG />
                            </button>
                          )}
                        </div>
                        <div className="ac-lesson-actions">
                          <div className="ac-lesson-social">
                            <button
                              className={"like-btn" + (likes.has("lesson:" + lesson.lesson_id) ? " liked" : "")}
                              title={likes.has("lesson:" + lesson.lesson_id) ? "Unlike" : "Like lesson"}
                              onClick={e => { e.stopPropagation(); onToggleLike && onToggleLike("lesson", lesson.lesson_id, lesson.lesson_name); }}
                            ><svg width="18" height="18" viewBox="0 0 24 24" fill={likes.has("lesson:" + lesson.lesson_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6c-1.7-1.6-4.4-1.6-6 .1L12 7.5 9.2 4.7c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.1L12 19l8.8-8.2c1.7-1.7 1.7-4.4 0-6.1z"/></svg></button>
                            <button
                              className={"bm-btn" + (bookmarks.has("lesson:" + lesson.lesson_id) ? " saved" : "")}
                              title={bookmarks.has("lesson:" + lesson.lesson_id) ? "Remove bookmark" : "Bookmark lesson"}
                              onClick={e => { e.stopPropagation(); onToggleBookmark && onToggleBookmark("lesson", lesson.lesson_id, lesson.lesson_name); }}
                            ><svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarks.has("lesson:" + lesson.lesson_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>
                          </div>
                          <button className="ac-btn-read"
                            onClick={e => { e.stopPropagation(); onLessonSelect && onLessonSelect(lesson, modParam, themeParam, selLevelId, courseParam); }}>
                            Read
                          </button>
                          <button className="ac-btn-quiz" disabled={!quiz}
                            title={quiz ? "Take quiz" : "No quiz available"}
                            onClick={e => { e.stopPropagation(); quiz && onQuizClick && onQuizClick(lesson, quiz, modParam, themeParam, selLevelId, courseParam); }}>
                            Quiz
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
