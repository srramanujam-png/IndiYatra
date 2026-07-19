import { useState, useEffect, useCallback } from "react";
import { SAFFRON, HERITAGE, GREEN, LEVEL_LABELS } from "../lib/supabase";
import { getCourseTree } from "../lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupTree(rows) {
  // Returns: { [level_id]: { label, title, themes: { [theme_id]: { title, sort, modules: { [module_id]: { name, sort, lessons: [...] } } } } } }
  const levels = {};
  for (const row of rows) {
    if (!levels[row.level_id]) {
      const meta = LEVEL_LABELS[row.level_id] || { label: row.level_id, classes: "" };
      levels[row.level_id] = { label: meta.label, classes: meta.classes, themes: {} };
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
      lesson_id:    row.lesson_id,
      lesson_name:  row.lesson_name,
      sort:         row.lesson_sort,
    });
  }
  // Sort lessons within each module
  for (const lvl of Object.values(levels)) {
    for (const thm of Object.values(lvl.themes)) {
      for (const mod of Object.values(thm.modules)) {
        mod.lessons.sort((a, b) => a.sort - b.sort);
      }
    }
  }
  return levels;
}

function lessonStatus(lessonId, completedLessons, lessonProgress) {
  if (completedLessons.has(lessonId)) return "done";
  if (lessonProgress.has(lessonId) && lessonProgress.get(lessonId) > 0) return "resume";
  return "none";
}

function moduleStatus(lessons, completedLessons) {
  if (!lessons.length) return "none";
  const done = lessons.filter(l => completedLessons.has(l.lesson_id)).length;
  if (done === lessons.length) return "done";
  if (done > 0) return "partial";
  return "none";
}

function themeStatus(modules, completedLessons) {
  const allLessons = Object.values(modules).flatMap(m => m.lessons);
  if (!allLessons.length) return "none";
  const done = allLessons.filter(l => completedLessons.has(l.lesson_id)).length;
  if (done === allLessons.length) return "done";
  if (done > 0) return "partial";
  return "none";
}

// Storage key for persisting open nodes
function storageKey(courseId) {
  return `iy_sidebar_open_${courseId}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status, size = 8 }) {
  const base = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "inline-block",
  };
  if (status === "done")    return <span style={{ ...base, background: GREEN }} />;
  if (status === "partial") return <span style={{ ...base, background: "transparent",
    border: `1.5px solid ${GREEN}`,
    backgroundImage: `linear-gradient(135deg, ${GREEN} 50%, transparent 50%)` }} />;
  return <span style={{ ...base, background: "transparent", border: `1.5px solid var(--color-text-muted)` }} />;
}

function ModuleDot({ status, size = 7 }) {
  const base = { width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "inline-block" };
  if (status === "done")    return <span style={{ ...base, background: HERITAGE }} />;
  if (status === "partial") return <span style={{ ...base, background: "transparent",
    border: `1.5px solid ${HERITAGE}`,
    backgroundImage: `linear-gradient(135deg, ${HERITAGE} 50%, transparent 50%)` }} />;
  return <span style={{ ...base, background: "transparent", border: `1.5px solid var(--color-text-muted)` }} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseSidebar({
  course,
  open,
  onClose,
  completedLessons = new Set(),
  lessonProgress   = new Map(),
  selectedLesson,
  selectedModule,
  selectedLevelId,
  onLessonSelect,
}) {
  const [tree,       setTree]       = useState({});
  const [loading,    setLoading]    = useState(false);
  const [openNodes,  setOpenNodes]  = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey(course?.course_id)) || "[]")); }
    catch { return new Set(); }
  });

  // Fetch tree when course changes
  useEffect(() => {
    if (!course?.course_id) return;
    setLoading(true);
    getCourseTree(course.course_id).then(({ data, error }) => {
      if (error) { console.warn("CourseSidebar tree error:", error); setLoading(false); return; }
      setTree(groupTree(data || []));
      setLoading(false);
    });
    // Restore open nodes from localStorage for this course
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(course.course_id)) || "[]");
      setOpenNodes(new Set(saved));
    } catch { setOpenNodes(new Set()); }
  }, [course?.course_id]);

  // Auto-expand the active level + theme + module when page changes
  useEffect(() => {
    if (!selectedLevelId) return;
    setOpenNodes(prev => {
      const next = new Set(prev);
      next.add(selectedLevelId);
      if (selectedModule?.theme_id) next.add(selectedModule.theme_id + "_" + selectedLevelId);
      if (selectedModule?.module_id) next.add(selectedModule.module_id);
      return next;
    });
  }, [selectedLevelId, selectedModule?.module_id]);

  // Persist open nodes
  const toggle = useCallback((key) => {
    setOpenNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(storageKey(course?.course_id), JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [course?.course_id]);

  const levelIds = Object.keys(tree).sort(); // LEVEL_001, LEVEL_002 … natural sort

  // ── Shared tree render ──
  const renderTree = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
      {loading && (
        <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</div>
      )}
      {!loading && levelIds.map(levelId => {
        const lvl        = tree[levelId];
        const levelOpen  = openNodes.has(levelId);
        const meta       = LEVEL_LABELS[levelId] || { label: levelId, classes: "" };
        const themeIds   = Object.keys(lvl.themes).sort((a, b) => lvl.themes[a].sort - lvl.themes[b].sort);
        const isActiveLevel = levelId === selectedLevelId;

        return (
          <div key={levelId}>
            {/* Level row */}
            <div
              onClick={() => toggle(levelId)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px 6px", cursor: "pointer",
                background: isActiveLevel ? `${HERITAGE}08` : "transparent",
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px",
                borderRadius: 999, whiteSpace: "nowrap",
                background: isActiveLevel ? `${HERITAGE}18` : "rgba(0,0,0,0.05)",
                color: isActiveLevel ? HERITAGE : "var(--color-text-muted)",
              }}>
                {meta.label}{meta.classes ? ` · ${meta.classes}` : ""}
              </span>
              <span style={{ flex: 1 }} />
              <i className={`ti ti-chevron-down`} aria-hidden="true"
                style={{ fontSize: 13, color: "var(--color-text-muted)", transition: "transform .2s",
                  transform: levelOpen ? "rotate(180deg)" : "none" }} />
            </div>

            {/* Themes */}
            {levelOpen && themeIds.map(themeId => {
              const thm        = lvl.themes[themeId];
              const themeKey   = themeId + "_" + levelId;
              const themeOpen  = openNodes.has(themeKey);
              const tStatus    = themeStatus(thm.modules, completedLessons);
              const moduleIds  = Object.keys(thm.modules).sort((a, b) => thm.modules[a].sort - thm.modules[b].sort);

              return (
                <div key={themeKey}>
                  {/* Theme row */}
                  <div
                    onClick={() => toggle(themeKey)}
                    style={{ display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 16px 6px 28px", cursor: "pointer" }}
                  >
                    <StatusDot status={tStatus} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text-main)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {thm.title}
                    </span>
                    <i className="ti ti-chevron-down" aria-hidden="true"
                      style={{ fontSize: 12, color: "var(--color-text-muted)", transition: "transform .2s",
                        transform: themeOpen ? "rotate(180deg)" : "none", flexShrink: 0 }} />
                  </div>

                  {/* Modules */}
                  {themeOpen && moduleIds.map(moduleId => {
                    const mod       = thm.modules[moduleId];
                    const modOpen   = openNodes.has(moduleId);
                    const mStatus   = moduleStatus(mod.lessons, completedLessons);
                    const isActiveMod = moduleId === selectedModule?.module_id;

                    return (
                      <div key={moduleId}>
                        {/* Module row */}
                        <div
                          onClick={() => toggle(moduleId)}
                          style={{ display: "flex", alignItems: "center", gap: 8,
                            padding: "5px 16px 5px 40px", cursor: "pointer",
                            background: isActiveMod ? `${HERITAGE}06` : "transparent" }}
                        >
                          <ModuleDot status={mStatus} />
                          <span style={{ flex: 1, fontSize: 12, color: "var(--color-text-main)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {mod.name}
                          </span>
                          <i className="ti ti-chevron-down" aria-hidden="true"
                            style={{ fontSize: 11, color: "var(--color-text-muted)", transition: "transform .2s",
                              transform: modOpen ? "rotate(180deg)" : "none", flexShrink: 0 }} />
                        </div>

                        {/* Lessons */}
                        {modOpen && mod.lessons.map(lesson => {
                          const lStatus   = lessonStatus(lesson.lesson_id, completedLessons, lessonProgress);
                          const isActive  = lesson.lesson_id === selectedLesson?.lesson_id;
                          return (
                            <div
                              key={lesson.lesson_id}
                              onClick={() => onLessonSelect && onLessonSelect(lesson, { module_id: moduleId, theme_id: themeId, ...mod }, thm, levelId)}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "6px 16px 6px 52px", cursor: "pointer", minHeight: 38,
                                background: isActive ? `${HERITAGE}12` : "transparent",
                              }}
                            >
                              {lStatus === "done"   && <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 14, color: GREEN, flexShrink: 0 }} />}
                              {lStatus === "resume" && <i className="ti ti-player-play"  aria-hidden="true" style={{ fontSize: 14, color: SAFFRON, flexShrink: 0 }} />}
                              {lStatus === "none"   && <i className="ti ti-circle"        aria-hidden="true" style={{ fontSize: 14, color: "var(--color-text-muted)", flexShrink: 0 }} />}
                              <span style={{
                                flex: 1, fontSize: 12, lineHeight: 1.3,
                                color: isActive ? HERITAGE : "var(--color-text-main)",
                                fontWeight: isActive ? 500 : 400,
                              }}>
                                {lesson.lesson_name}
                              </span>
                              {lStatus === "resume" && (
                                <span style={{ width: 6, height: 6, borderRadius: "50%",
                                  background: SAFFRON, flexShrink: 0 }} />
                              )}
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
      })}
    </div>
  );

  const legend = (
    <div style={{ display: "flex", gap: 12, padding: "8px 16px",
      borderTop: "0.5px solid rgba(0,0,0,0.07)", flexWrap: "wrap" }}>
      {[
        { color: GREEN,   label: "Done" },
        { color: SAFFRON, label: "In progress" },
        { color: "var(--color-text-muted)", label: "Not started", outline: true },
      ].map(({ color, label, outline }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, color: "var(--color-text-muted)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: outline ? "transparent" : color,
            border: outline ? `1.5px solid ${color}` : "none" }} />
          {label}
        </div>
      ))}
    </div>
  );

  // ── Desktop: fixed left panel ──────────────────────────────────────────────
  const desktopSidebar = (
    <div style={{
      position: "fixed", top: 0, left: 0, bottom: 0, width: 280,
      background: "white", borderRight: "0.5px solid rgba(0,0,0,0.07)",
      display: "flex", flexDirection: "column", zIndex: 200,
      transform: open ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 10px",
        borderBottom: "0.5px solid rgba(0,0,0,0.07)",
        display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 3 }}>Course</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-main)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {course?.course_name || ""}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          style={{ background: "none", border: "none", cursor: "pointer",
            fontSize: 18, color: "var(--color-text-muted)", padding: 4, borderRadius: 6, lineHeight: 1 }}>
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      </div>
      {renderTree()}
      {legend}
    </div>
  );

  // ── Mobile: bottom drawer ─────────────────────────────────────────────────
  const mobileDrawer = (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      pointerEvents: open ? "auto" : "none",
    }}>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.35)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.25s",
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        maxHeight: "82vh", background: "white",
        borderRadius: "16px 16px 0 0",
        borderTop: "0.5px solid rgba(0,0,0,0.07)",
        display: "flex", flexDirection: "column",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)" }} />
        </div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8,
          padding: "6px 16px 10px",
          borderBottom: "0.5px solid rgba(0,0,0,0.07)" }}>
          <i className="ti ti-layout-sidebar-right" aria-hidden="true"
            style={{ fontSize: 16, color: "var(--color-text-muted)" }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--color-text-main)" }}>
            {course?.course_name || ""}
          </span>
          <button onClick={onClose} aria-label="Close sidebar"
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 18, color: "var(--color-text-muted)", padding: 4 }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        {renderTree()}
        {legend}
      </div>
    </div>
  );

  if (!open && typeof window !== "undefined" && window.innerWidth < 768) return null;

  return (
    <>
      <style>{`
        @media (min-width: 769px) { .iy-sidebar-mobile { display: none !important; } }
        @media (max-width: 768px) { .iy-sidebar-desktop { display: none !important; } }
      `}</style>
      <div className="iy-sidebar-desktop">{desktopSidebar}</div>
      <div className="iy-sidebar-mobile">{mobileDrawer}</div>
    </>
  );
}
