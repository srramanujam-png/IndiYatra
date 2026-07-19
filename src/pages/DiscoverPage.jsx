import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, DEFAULT_LANG_ID } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { SkeletonDiscoverResults } from "../components/Skeletons";
import { EMPTY } from "../config/appStrings";
import { useEntityPreview } from "../components/EntityPreview";

const TYPE_META = {
  snippet: { label: "Snippet", icon: "✦", color: SAFFRON,  border: "#FF8E0033" },
  lesson:  { label: "Lesson",  icon: "\u{1F4D6}", color: GREEN,   border: "#00924A33" },
  module:  { label: "Module",  icon: "\u{1F4E6}", color: SAFFRON, border: "#FF8E0033" },
  course:  { label: "Course",  icon: "\u{1F393}", color: HERITAGE, border: "#00509E33" },
};

const TYPE_FILTERS = [
  { key: "all",     label: "All" },
  { key: "snippet", label: "Snippets" },
  { key: "lesson",  label: "Lessons" },
  { key: "module",  label: "Modules" },
  { key: "course",  label: "Courses" },
];

const styles = `
  .discover-hero {
    text-align: center; padding: 36px 1.5rem 28px;
    border-bottom: 1px solid var(--color-border);
  }
  .discover-hero h1 {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 2rem;
    font-weight: 700; color: var(--color-text-main); margin: 0 0 6px;
  }
  .discover-hero p {
    color: var(--color-text-body); font-size: 0.9375rem; margin: 0;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  /* Full-width term cloud */
  .discover-cloud-page {
    max-width: 1100px; margin: 0 auto; padding: 28px 1.5rem 120px;
  }
  .discover-zone-label {
    font-size: 0.6875rem; font-weight: 700; color: var(--color-text-muted);
    text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 12px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .discover-zone { margin-bottom: 28px; }

  /* Categories */
  .discover-cat-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .discover-cat-chip {
    padding: 7px 16px; border-radius: 999px;
    border: 1.5px solid ${HERITAGE}55; background: white;
    font-size: 0.875rem; font-weight: 600; color: ${HERITAGE};
    cursor: pointer; font-family: 'Nunito Sans', system-ui, sans-serif;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .discover-cat-chip:hover { background: ${HERITAGE}11; border-color: ${HERITAGE}; }
  .discover-cat-chip.active { background: ${HERITAGE}; color: white; border-color: ${HERITAGE}; }

  /* Tags word cloud */
  .discover-tag-cloud { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: baseline; }
  .discover-tag-btn {
    border: none; background: transparent; cursor: pointer; font-weight: 700;
    font-family: 'Nunito Sans', system-ui, sans-serif;
    line-height: 1.3; padding: 4px 2px;
    transition: opacity 0.15s, transform 0.15s;
  }
  .discover-tag-btn:hover { opacity: 0.7; transform: scale(1.06); }
  .discover-tag-btn.active {
    background: ${SAFFRON}; color: white !important;
    padding: 4px 12px; border-radius: 999px; opacity: 1;
  }

  /* ── Shared panel styles (desktop drawer + mobile sheet) ─── */
  .discover-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200;
    animation: backdropIn 0.25s ease;
  }
  @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }

  /* Panel header */
  .discover-panel-header {
    flex-shrink: 0; display: flex; align-items: center;
    justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--color-border-muted);
  }
  .discover-panel-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 1.25rem; font-weight: 700; color: var(--color-text-main);
  }
  .discover-panel-close {
    width: 34px; height: 34px; border-radius: 50%;
    border: none; background: var(--color-border-muted); cursor: pointer;
    font-size: 1rem; color: var(--color-text-body);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .discover-panel-close:hover { background: var(--color-border); }

  /* Panel body */
  .discover-panel-body {
    flex: 1; overflow-y: auto; padding: 16px 20px 48px;
    overscroll-behavior: contain;
  }

  /* Type filter */
  .discover-type-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .discover-type-pill {
    padding: 5px 13px; border-radius: 999px;
    border: 1.5px solid var(--color-border); background: white;
    font-size: 0.8125rem; font-weight: 600; color: var(--color-text-main);
    cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .discover-type-pill:hover { border-color: ${HERITAGE}; color: ${HERITAGE}; }
  .discover-type-pill.active { background: ${HERITAGE}; border-color: ${HERITAGE}; color: white; }

  .discover-results-header {
    font-size: 0.875rem; color: var(--color-text-body); margin-bottom: 16px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .discover-results-header strong { color: ${HERITAGE}; }

  /* Snippet cards */
  .discover-snippet-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px; margin-bottom: 24px;
  }
  .discover-snippet-card {
    background: white; border-radius: 12px; border: 1px solid var(--color-border);
    border-top: 3px solid ${SAFFRON}; padding: 14px 16px;
    cursor: pointer; transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    animation: fadeUp 0.3s ease both;
  }
  .discover-snippet-card:hover {
    transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.08);
    border-color: ${SAFFRON};
  }
  .discover-snippet-hook {
    font-size: 0.9375rem; font-weight: 600; color: var(--color-text-main);
    line-height: 1.55; margin-bottom: 10px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .discover-snippet-badge {
    font-size: 0.75rem; font-weight: 600; color: ${SAFFRON};
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Row cards */
  .discover-row-card {
    display: flex; align-items: center; justify-content: space-between;
    background: white; border-radius: 12px; border: 1px solid var(--color-border);
    padding: 12px 14px; margin-bottom: 8px; min-height: 48px;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
    animation: fadeUp 0.25s ease both;
  }
  .discover-row-card:hover { background: #FAFAFA; border-color: ${SAFFRON}44; }
  .discover-row-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .discover-row-icon { font-size: 1.125rem; flex-shrink: 0; width: 26px; text-align: center; }
  .discover-row-name {
    font-size: 0.9375rem; font-weight: 600; color: var(--color-text-main);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .discover-row-arrow { color: var(--color-text-body); font-size: 1.125rem; flex-shrink: 0; }

  .discover-group { margin-bottom: 24px; }
  .discover-group-label {
    font-size: 0.75rem; font-weight: 700; color: var(--color-text-body);
    text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .discover-empty {
    text-align: center; padding: 48px 24px; color: var(--color-text-body); max-width: 380px; margin: 0 auto;
  }
  .discover-empty-icon { font-size: 2.5rem; margin-bottom: 14px; }
  .discover-empty h3 {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem;
    color: var(--color-text-body); margin-bottom: 8px;
  }
  .discover-empty p { font-size: 0.9375rem; line-height: 1.6; font-family: 'Nunito Sans', system-ui, sans-serif; }

  /* ── Desktop: right-to-left slide-in drawer ───────────────── */
  @media (min-width: 769px) {
    .discover-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 70%; max-width: 900px; z-index: 201;
      background: white;
      box-shadow: -8px 0 40px rgba(0,0,0,0.15);
      display: flex; flex-direction: column;
      animation: drawerIn 0.3s cubic-bezier(0.32,0.72,0,1);
    }
    @keyframes drawerIn {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    /* Mobile sheet hidden on desktop */
    .discover-sheet { display: none !important; }
    .discover-sheet-handle { display: none !important; }
  }

  /* ── Mobile: bottom sheet ─────────────────────────────────── */
  @media (max-width: 768px) {
    .discover-cloud-page { padding: 20px 1rem 120px; }
    /* Drawer hidden on mobile */
    .discover-drawer { display: none !important; }

    .discover-sheet {
      position: fixed; left: 0; right: 0; bottom: 0;
      height: 78vh; z-index: 201;
      background: white;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
      display: flex; flex-direction: column;
      animation: sheetUp 0.3s cubic-bezier(0.32,0.72,0,1);
    }
    @keyframes sheetUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .discover-sheet-handle {
      flex-shrink: 0; display: flex; flex-direction: column;
      align-items: center; padding: 10px 16px 0;
    }
    .discover-sheet-handle-bar {
      width: 40px; height: 4px; border-radius: 2px;
      background: var(--color-border); margin-bottom: 10px;
    }
    .discover-snippet-grid { grid-template-columns: 1fr; }
    .discover-panel-body { padding: 14px 16px 48px; }
    .discover-panel-header { padding: 12px 16px; }
  }
`;

export default function DiscoverPage({
  settings, onBack, onOpenSettings, onHome, onDashboard, onResume,
  onLikes, onBookmarks, onDiscover, onForYou, onAllCourses, onNavigate, onPlaySnippet,
  isAdmin, onAdmin, userEditorialRole, onEditor,
  activePage, onSaveSettings, languages = [],
}) {
  const [terms, setTerms]               = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [typeFilter, setTypeFilter]     = useState("all");
  const [loading, setLoading]           = useState(false);
  const [results, setResults]           = useState({ snippets: [], lessons: [], modules: [], courses: [] });
  const [panelOpen, setPanelOpen]       = useState(false);
  const { openPreview } = useEntityPreview();

  const navOnHome = onHome || onBack;

  // ── Load taxonomy terms ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadTerms() {
      const [termsData, translData, mapData] = await Promise.all([
        supabase("taxonomy_terms", "?select=term_id,name,type&order=type,name"),
        supabase("taxonomy_term_translations",
          "?select=term_id,name&language_id=eq." + (settings?.languageId || "LANG_03")),
        supabase("content_taxonomy_mapping", "?select=term_id"),
      ]);
      const base = Array.isArray(termsData) ? termsData : [];
      const nameMap = {};
      base.forEach(t => { nameMap[t.term_id] = t.name; });
      if (Array.isArray(translData)) {
        translData.forEach(t => { if (t.name) nameMap[t.term_id] = t.name; });
      }
      const counts = {};
      if (Array.isArray(mapData)) {
        mapData.forEach(m => { counts[m.term_id] = (counts[m.term_id] || 0) + 1; });
      }
      const enriched = base
        .map(t => ({ ...t, displayName: nameMap[t.term_id] || t.name, count: counts[t.term_id] || 0 }))
        .filter(t => t.count > 0)
        .sort((a, b) => b.count - a.count);
      setTerms(enriched);
    }
    loadTerms();
  }, [settings?.languageId]);

  // ── Fetch content when term selected ─────────────────────────────────────
  useEffect(() => {
    if (!selectedTerm) {
      setResults({ snippets: [], lessons: [], modules: [], courses: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const mappings = await supabase("content_taxonomy_mapping",
          "?term_id=eq." + selectedTerm + "&select=entity_id,entity_type");
        const rows = Array.isArray(mappings) ? mappings : [];
        function ids(type) {
          return rows.filter(m => m.entity_type === type).map(m => m.entity_id);
        }
        const snippetIds = ids("snippet");
        const lessonIds  = ids("lesson");
        const moduleIds  = ids("module");
        const courseIds  = ids("course");
        const langCode   = settings?.languageId || DEFAULT_LANG_ID;
        const [snips, lessons, modules, courses] = await Promise.all([
          snippetIds.length
            ? supabase("snippet_translations",
                "?language=eq." + langCode +
                "&snippet_id=in.(" + snippetIds.join(",") + ")&select=snippet_id,hook")
            : Promise.resolve([]),
          lessonIds.length
            ? supabase("lessons",
                "?lesson_id=in.(" + lessonIds.join(",") + ")&select=lesson_id,lesson_name,module_id")
            : Promise.resolve([]),
          moduleIds.length
            ? supabase("modules",
                "?module_id=in.(" + moduleIds.join(",") + ")&select=module_id,module_name,level_id,theme_id,course_id")
            : Promise.resolve([]),
          courseIds.length
            ? supabase("courses",
                "?course_id=in.(" + courseIds.join(",") + ")&select=course_id,course_name")
            : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setResults({
            snippets: Array.isArray(snips)   ? snips   : [],
            lessons:  Array.isArray(lessons)  ? lessons : [],
            modules:  Array.isArray(modules)  ? modules : [],
            courses:  Array.isArray(courses)  ? courses : [],
          });
          setLoading(false);
        }
      } catch (e) {
        console.error("DiscoverPage load error:", e);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedTerm, settings?.languageId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const visible = {
    snippets: typeFilter === "all" || typeFilter === "snippet" ? results.snippets : [],
    lessons:  typeFilter === "all" || typeFilter === "lesson"  ? results.lessons  : [],
    modules:  typeFilter === "all" || typeFilter === "module"  ? results.modules  : [],
    courses:  typeFilter === "all" || typeFilter === "course"  ? results.courses  : [],
  };
  const totalVisible =
    visible.snippets.length + visible.lessons.length +
    visible.modules.length  + visible.courses.length;
  const totalAll =
    results.snippets.length + results.lessons.length +
    results.modules.length  + results.courses.length;

  const categories      = terms.filter(t => t.type === "category");
  const tags            = terms.filter(t => t.type === "tag");
  const selectedTermObj = terms.find(t => t.term_id === selectedTerm);

  function selectTerm(termId) {
    if (selectedTerm === termId) {
      closePanel();
    } else {
      setSelectedTerm(termId);
      setTypeFilter("all");
      setPanelOpen(true);
    }
  }

  function closePanel() {
    setPanelOpen(false);
    setSelectedTerm(null);
    setTypeFilter("all");
  }

  function handleSnippetClick(snippetId) {
    if (!onPlaySnippet) return;
    const ids = results.snippets.map(s => s.snippet_id);
    const idx = results.snippets.findIndex(s => s.snippet_id === snippetId);
    onPlaySnippet(ids, Math.max(0, idx), selectedTermObj?.displayName || "");
  }

  // ── Reusable panel content ────────────────────────────────────────────────
  function PanelContent() {
    if (loading) return <SkeletonDiscoverResults count={5} />;
    if (totalAll === 0) return (
      <div className="discover-empty">
        <div className="discover-empty-icon">&#x1F4AD;</div>
        <h3>{EMPTY.discoverTagged}</h3>
        <p>{EMPTY.discoverBody(selectedTermObj?.displayName)}</p>
      </div>
    );
    return (
      <>
        <div className="discover-type-filter">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              className={"discover-type-pill" + (typeFilter === f.key ? " active" : "")}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
              {f.key !== "all" && results[f.key + "s"]?.length > 0 &&
                " (" + results[f.key + "s"].length + ")"}
              {f.key === "all" && " (" + totalAll + ")"}
            </button>
          ))}
        </div>

        <div className="discover-results-header">
          {totalVisible} item{totalVisible !== 1 ? "s" : ""} tagged with{" "}
          <strong>{selectedTermObj?.displayName}</strong>
        </div>

        {visible.snippets.length > 0 && (
          <div className="discover-group">
            <div className="discover-group-label">
              {TYPE_META.snippet.icon} Snippets &mdash; tap to play as a playlist
            </div>
            <div className="discover-snippet-grid">
              {visible.snippets.map((s, i) => (
                <div
                  key={s.snippet_id}
                  className="discover-snippet-card"
                  style={{ animationDelay: i * 0.04 + "s" }}
                  onClick={() => openPreview({
                    type: "snippet", id: s.snippet_id, title: s.hook || "Snippet",
                    onPlay: () => handleSnippetClick(s.snippet_id), playLabel: "Play snippet",
                  })}
                >
                  <div className="discover-snippet-hook">{s.hook || s.snippet_id}</div>
                  <div className="discover-snippet-badge">&#x2726; Snippet</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {visible.lessons.length > 0 && (
          <div className="discover-group">
            <div className="discover-group-label">{TYPE_META.lesson.icon} Lessons</div>
            {visible.lessons.map((l, i) => (
              <div key={l.lesson_id} className="discover-row-card"
                style={{ borderColor: TYPE_META.lesson.border, animationDelay: i * 0.04 + "s" }}
                onClick={() => openPreview({
                  type: "lesson", id: l.lesson_id, title: l.lesson_name,
                  onPlay: () => onNavigate && onNavigate({
                    content_type: "lesson", content_id: l.lesson_id,
                    lesson_name: l.lesson_name, module_id: l.module_id,
                  }),
                  playLabel: "Open lesson",
                })}
              >
                <div className="discover-row-left">
                  <span className="discover-row-icon">{TYPE_META.lesson.icon}</span>
                  <span className="discover-row-name">{l.lesson_name}</span>
                </div>
                <span className="discover-row-arrow">&#x203A;</span>
              </div>
            ))}
          </div>
        )}

        {visible.modules.length > 0 && (
          <div className="discover-group">
            <div className="discover-group-label">{TYPE_META.module.icon} Modules</div>
            {visible.modules.map((m, i) => (
              <div key={m.module_id} className="discover-row-card"
                style={{ borderColor: TYPE_META.module.border, animationDelay: i * 0.04 + "s" }}
                onClick={() => openPreview({
                  type: "module", id: m.module_id, title: m.module_name,
                  onPlay: () => onNavigate && onNavigate({
                    content_type: "module", content_id: m.module_id,
                    module_id: m.module_id, module_name: m.module_name,
                    theme_id: m.theme_id, course_id: m.course_id,
                  }),
                  playLabel: "Open module",
                })}
              >
                <div className="discover-row-left">
                  <span className="discover-row-icon">{TYPE_META.module.icon}</span>
                  <span className="discover-row-name">{m.module_name}</span>
                </div>
                <span className="discover-row-arrow">&#x203A;</span>
              </div>
            ))}
          </div>
        )}

        {visible.courses.length > 0 && (
          <div className="discover-group">
            <div className="discover-group-label">{TYPE_META.course.icon} Courses</div>
            {visible.courses.map((c, i) => (
              <div key={c.course_id} className="discover-row-card"
                style={{ borderColor: TYPE_META.course.border, animationDelay: i * 0.04 + "s" }}
                onClick={() => openPreview({
                  type: "course", id: c.course_id, title: c.course_name,
                  onPlay: () => onNavigate && onNavigate({
                    content_type: "course", content_id: c.course_id,
                    course_id: c.course_id, course_name: c.course_name,
                  }),
                  playLabel: "Open course",
                })}
              >
                <div className="discover-row-left">
                  <span className="discover-row-icon">{TYPE_META.course.icon}</span>
                  <span className="discover-row-name">{c.course_name}</span>
                </div>
                <span className="discover-row-arrow">&#x203A;</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <style>{globalStyles + styles}</style>
      <PageHeader
        onHome={navOnHome}
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
        navLinks={[
          { label: "Home",        onClick: navOnHome               },
          { label: "Courses", onClick: onAllCourses            },
          { label: "For You",     onClick: onForYou                },
          { label: "Dashboard",   onClick: onDashboard             },
          { label: "Discover",    onClick: onDiscover || (() => {}) },
        ]}
      />

      <div className="discover-hero">
        <h1>&#x1F9ED; Discover</h1>
        <p>Browse India&#x2019;s heritage by topic</p>
      </div>

      {/* ── Full-width term cloud ──────────────────────────────────────── */}
      <div className="discover-cloud-page">
        {categories.length > 0 && (
          <div className="discover-zone">
            <div className="discover-zone-label">Categories</div>
            <div className="discover-cat-row">
              {categories.map(t => (
                <button
                  key={t.term_id}
                  className={"discover-cat-chip" + (selectedTerm === t.term_id ? " active" : "")}
                  onClick={() => selectTerm(t.term_id)}
                >
                  {t.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="discover-zone">
            <div className="discover-zone-label">Tags</div>
            <div className="discover-tag-cloud">
              {tags.map(t => {
                const c = t.count;
                const fontSize = c >= 40 ? "1.75rem"
                               : c >= 20 ? "1.375rem"
                               : c >= 10 ? "1.0625rem"
                               : c >=  5 ? "0.9375rem"
                               : "0.8125rem";
                const color = selectedTerm === t.term_id ? "white"
                            : c >= 20 ? SAFFRON
                            : c >=  6 ? HERITAGE
                            : GREEN;
                return (
                  <button
                    key={t.term_id}
                    className={"discover-tag-btn" + (selectedTerm === t.term_id ? " active" : "")}
                    style={{ fontSize, color }}
                    onClick={() => selectTerm(t.term_id)}
                  >
                    {t.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Overlay panel (drawer on desktop, sheet on mobile) ─────────── */}
      {panelOpen && selectedTerm && (
        <>
          <div className="discover-backdrop" onClick={closePanel} />

          {/* Desktop drawer — slides in from right */}
          <div className="discover-drawer">
            <div className="discover-panel-header">
              <span className="discover-panel-title">{selectedTermObj?.displayName}</span>
              <button className="discover-panel-close" onClick={closePanel}>&#x2715;</button>
            </div>
            <div className="discover-panel-body">
              <PanelContent />
            </div>
          </div>

          {/* Mobile sheet — slides up from bottom */}
          <div className="discover-sheet">
            <div className="discover-sheet-handle">
              <div className="discover-sheet-handle-bar" />
            </div>
            <div className="discover-panel-header">
              <span className="discover-panel-title">{selectedTermObj?.displayName}</span>
              <button className="discover-panel-close" onClick={closePanel}>&#x2715;</button>
            </div>
            <div className="discover-panel-body">
              <PanelContent />
            </div>
          </div>
        </>
      )}
    </>
  );
}
