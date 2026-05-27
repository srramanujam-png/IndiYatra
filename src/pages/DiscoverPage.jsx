import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, DEFAULT_LANG_CODE } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { SkeletonDiscoverResults } from "../components/Skeletons";

// Colour per content type — brand colours only
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
    border-bottom: 1px solid rgba(0,0,0,0.07);
  }
  .discover-hero h1 {
    font-family: 'Alumni Sans', sans-serif; font-size: 2rem;
    font-weight: 800; color: ${HERITAGE}; margin: 0 0 6px;
  }
  .discover-hero p { color: #1F1F1F; font-size: 0.9375rem; margin: 0; }

  .discover-pills-wrap {
    max-width: 1100px; margin: 0 auto; padding: 24px 1.5rem 0;
  }
  .discover-pill-group-label {
    font-size: 0.75rem; font-weight: 700; color: #6B6B6B;
    text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px;
  }
  .discover-pill-row {
    display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
  }
  .discover-pill {
    padding: 9px 18px; border-radius: 999px; min-height: 40px;
    border: 1.5px solid rgba(0,0,0,0.10); background: white;
    font-size: 0.9375rem; font-weight: 600; color: #1F1F1F;
    cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s;
    font-family: 'Source Sans 3', sans-serif; display: inline-flex; align-items: center;
  }
  .discover-pill:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .discover-pill.active {
    background: ${SAFFRON}; border-color: ${SAFFRON}; color: white;
  }

  .discover-type-filter {
    max-width: 1100px; margin: 0 auto; padding: 16px 1.5rem 0;
    display: flex; gap: 8px; flex-wrap: wrap;
  }
  .discover-type-pill {
    padding: 5px 14px; border-radius: 999px;
    border: 1.5px solid rgba(0,0,0,0.10); background: white;
    font-size: 0.8125rem; font-weight: 600; color: #1F1F1F;
    cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .discover-type-pill:hover { border-color: ${HERITAGE}; color: ${HERITAGE}; }
  .discover-type-pill.active {
    background: ${HERITAGE}; border-color: ${HERITAGE}; color: white;
  }

  .discover-body {
    max-width: 1100px; margin: 0 auto; padding: 24px 1.5rem 100px;
  }
  .discover-results-header {
    font-size: 0.875rem; color: #6B6B6B; margin-bottom: 18px;
  }
  .discover-results-header strong { color: ${HERITAGE}; }

  /* Snippet cards — grid */
  .discover-snippet-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px; margin-bottom: 24px;
  }
  .discover-snippet-card {
    background: white; border-radius: 14px;
    border: 1px solid rgba(0,0,0,0.07);
    border-top: 3px solid ${SAFFRON};
    padding: 16px 18px;
    cursor: pointer; transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    animation: fadeUp 0.3s ease both;
  }
  .discover-snippet-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.11);
    border-color: ${SAFFRON};
  }
  .discover-snippet-hook {
    font-size: 0.9375rem; font-weight: 600; color: #0A0A0A;
    line-height: 1.5; margin-bottom: 10px;
    display: -webkit-box; -webkit-line-clamp: 3;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .discover-snippet-badge {
    font-size: 0.75rem; font-weight: 700; color: ${SAFFRON};
  }

  /* Row cards — lessons, modules, courses */
  .discover-row-card {
    display: flex; align-items: center; justify-content: space-between;
    background: white; border-radius: 12px; border: 1px solid rgba(0,0,0,0.07);
    padding: 14px 16px; margin-bottom: 8px; min-height: 52px;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
    animation: fadeUp 0.25s ease both;
  }
  .discover-row-card:hover { background: rgba(0,0,0,0.02); border-color: ${SAFFRON}44; }
  .discover-row-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .discover-row-icon {
    font-size: 1.125rem; flex-shrink: 0; width: 28px; text-align: center;
  }
  .discover-row-name {
    font-size: 0.9375rem; font-weight: 600; color: #0A0A0A;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .discover-row-arrow { color: #6B6B6B; font-size: 1.125rem; flex-shrink: 0; }

  .discover-group { margin-bottom: 28px; }
  .discover-group-label {
    font-size: 0.75rem; font-weight: 700; color: #6B6B6B;
    text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px;
  }

  .discover-loading {
    text-align: center; padding: 60px; color: #6B6B6B; font-size: 1rem;
  }
  .discover-empty {
    text-align: center; padding: 60px 24px; color: #6B6B6B;
    max-width: 400px; margin: 0 auto;
  }
  .discover-empty-icon { font-size: 2.5rem; margin-bottom: 14px; }
  .discover-empty h3 {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem;
    color: #6B6B6B; margin-bottom: 8px;
  }
  .discover-empty p { font-size: 0.9375rem; color: #6B6B6B; line-height: 1.6; }
  @media (max-width: 768px) {
    .discover-pills-wrap, .discover-type-filter, .discover-body { padding-left: 1rem; padding-right: 1rem; }
    .discover-snippet-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
  }
  @media (max-width: 600px) {
    .discover-snippet-grid { grid-template-columns: 1fr; }
    .discover-pill { font-size: 0.875rem; padding: 8px 14px; }
    .discover-body { padding-bottom: 80px; }
  }

  .discover-prompt {
    text-align: center; padding: 48px 24px; color: #6B6B6B;
  }
  .discover-prompt-icon { font-size: 2.5rem; margin-bottom: 12px; }
  .discover-prompt p { font-size: 0.9375rem; }
`;

export default function DiscoverPage({
  settings, onBack, onOpenSettings, onHome, onDashboard, onResume,
  onLikes, onBookmarks, onDiscover, onNavigate, onPlaySnippet,
  isAdmin, onAdmin, userEditorialRole, onEditor,
  activePage, onSaveSettings, languages = [],
}) {
  const [terms, setTerms]               = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [typeFilter, setTypeFilter]     = useState("all");
  const [loading, setLoading]           = useState(false);
  const [rawMappings, setRawMappings]   = useState([]);
  const [results, setResults]           = useState({ snippets: [], lessons: [], modules: [], courses: [] });

  const navOnHome = onHome || onBack;

  // ── Load taxonomy terms (+ translations if available) ──────────────────────
  useEffect(() => {
    async function loadTerms() {
      const [termsData, translData] = await Promise.all([
        supabase("taxonomy_terms", "?select=term_id,name,type&order=type,name"),
        supabase("taxonomy_term_translations",
          "?select=term_id,name&language_id=eq." + (settings?.languageId || "LANG_03")),
      ]);
      const base = Array.isArray(termsData) ? termsData : [];
      // Build name map — English first, override with translation if present
      const nameMap = {};
      base.forEach(t => { nameMap[t.term_id] = t.name; });
      if (Array.isArray(translData)) {
        translData.forEach(t => { if (t.name) nameMap[t.term_id] = t.name; });
      }
      setTerms(base.map(t => ({ ...t, displayName: nameMap[t.term_id] || t.name })));
    }
    loadTerms();
  }, [settings?.languageId]);

  // ── When a term is selected, load all its entity mappings ─────────────────
  useEffect(() => {
    if (!selectedTerm) { setRawMappings([]); setResults({ snippets: [], lessons: [], modules: [], courses: [] }); return; }
    let cancelled = false;
    async function loadMappings() {
      setLoading(true);
      const data = await supabase("content_taxonomy_mapping",
        "?term_id=eq." + selectedTerm + "&select=entity_id,entity_type");
      if (!cancelled) {
        setRawMappings(Array.isArray(data) ? data : []);
      }
    }
    loadMappings();
    return () => { cancelled = true; };
  }, [selectedTerm]);

  // ── Fetch detail records once we have mappings ─────────────────────────────
  useEffect(() => {
    if (!rawMappings.length) {
      setResults({ snippets: [], lessons: [], modules: [], courses: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;

    function ids(type) {
      return rawMappings.filter(m => m.entity_type === type).map(m => m.entity_id);
    }

    async function fetchDetails() {
      const snippetIds = ids("snippet");
      const lessonIds  = ids("lesson");
      const moduleIds  = ids("module");
      const courseIds  = ids("course");

      const langCode = settings?.languageCode || DEFAULT_LANG_CODE;

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
          lessons:  Array.isArray(lessons)  ? lessons  : [],
          modules:  Array.isArray(modules)  ? modules  : [],
          courses:  Array.isArray(courses)  ? courses  : [],
        });
        setLoading(false);
      }
    }
    fetchDetails();
    return () => { cancelled = true; };
  }, [rawMappings, settings?.languageCode]);

  // ── Compute visible results based on typeFilter ───────────────────────────
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

  // ── Pills grouped by type ─────────────────────────────────────────────────
  const categories = terms.filter(t => t.type === "Category");
  const tags       = terms.filter(t => t.type === "Tag");

  const selectedTermObj = terms.find(t => t.term_id === selectedTerm);

  function selectTerm(termId) {
    if (selectedTerm === termId) {
      setSelectedTerm(null);
      setTypeFilter("all");
    } else {
      setSelectedTerm(termId);
      setTypeFilter("all");
    }
  }

  // ── Snippet playlist handler ───────────────────────────────────────────────
  function handleSnippetClick(snippetId) {
    if (!onPlaySnippet) return;
    const ids = results.snippets.map(s => s.snippet_id);
    const idx = results.snippets.findIndex(s => s.snippet_id === snippetId);
    onPlaySnippet(ids, Math.max(0, idx), selectedTermObj?.displayName || "");
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
          { label: "Home",      onClick: navOnHome },
          { label: "Discover",  onClick: onDiscover || (() => {}) },
          { label: "Dashboard", onClick: onDashboard },
          { label: "Likes",     onClick: onLikes },
          { label: "Bookmarks", onClick: onBookmarks },
        ]}
      />

      <div className="discover-hero">
        <h1>&#x1F9ED; Discover</h1>
        <p>Browse India&#x2019;s heritage by topic</p>
      </div>

      {/* ── Term pills ──────────────────────────────────────────────────── */}
      <div className="discover-pills-wrap">
        {categories.length > 0 && (
          <>
            <div className="discover-pill-group-label">Categories</div>
            <div className="discover-pill-row">
              {categories.map(t => (
                <button
                  key={t.term_id}
                  className={"discover-pill" + (selectedTerm === t.term_id ? " active" : "")}
                  onClick={() => selectTerm(t.term_id)}
                >
                  {t.displayName}
                </button>
              ))}
            </div>
          </>
        )}
        {tags.length > 0 && (
          <>
            <div className="discover-pill-group-label">Tags</div>
            <div className="discover-pill-row">
              {tags.map(t => (
                <button
                  key={t.term_id}
                  className={"discover-pill" + (selectedTerm === t.term_id ? " active" : "")}
                  onClick={() => selectTerm(t.term_id)}
                >
                  {t.displayName}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Type filter (shown only when a term is selected and has results) */}
      {selectedTerm && !loading && totalAll > 0 && (
        <div className="discover-type-filter">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              className={"discover-type-pill" + (typeFilter === f.key ? " active" : "")}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
              {f.key !== "all" && results[f.key + "s"] !== undefined &&
                results[f.key + "s"].length > 0 &&
                " (" + results[f.key + "s"].length + ")"
              }
              {f.key === "all" && " (" + totalAll + ")"}
            </button>
          ))}
        </div>
      )}

      {/* ── Results body ────────────────────────────────────────────────── */}
      <div className="discover-body">
        {!selectedTerm ? (
          <div className="discover-prompt">
            <div className="discover-prompt-icon">&#x1F3F7;</div>
            <p>Select a topic pill above to explore tagged content</p>
          </div>
        ) : loading ? (
          <SkeletonDiscoverResults count={5} />
        ) : totalAll === 0 ? (
          <div className="discover-empty">
            <div className="discover-empty-icon">&#x1F4AD;</div>
            <h3>Nothing tagged yet</h3>
            <p>
              No content has been tagged with &ldquo;{selectedTermObj?.displayName}&rdquo; yet.
              Tags can be added in the Supabase content_taxonomy_mapping table.
            </p>
          </div>
        ) : (
          <>
            <div className="discover-results-header">
              Showing <strong>{totalVisible}</strong> item{totalVisible !== 1 ? "s" : ""} tagged
              with <strong>{selectedTermObj?.displayName}</strong>
            </div>

            {/* Snippets */}
            {visible.snippets.length > 0 && (
              <div className="discover-group">
                <div className="discover-group-label">
                  {TYPE_META.snippet.icon} Snippets &mdash; tap any card to play all as a playlist
                </div>
                <div className="discover-snippet-grid">
                  {visible.snippets.map((s, i) => (
                    <div
                      key={s.snippet_id}
                      className="discover-snippet-card"
                      style={{ animationDelay: i * 0.04 + "s" }}
                      onClick={() => handleSnippetClick(s.snippet_id)}
                    >
                      <div className="discover-snippet-hook">{s.hook || s.snippet_id}</div>
                      <div className="discover-snippet-badge">&#x2726; Snippet</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lessons */}
            {visible.lessons.length > 0 && (
              <div className="discover-group">
                <div className="discover-group-label">
                  {TYPE_META.lesson.icon} Lessons
                </div>
                {visible.lessons.map((l, i) => (
                  <div
                    key={l.lesson_id}
                    className="discover-row-card"
                    style={{
                      borderColor: TYPE_META.lesson.border,
                      animationDelay: i * 0.04 + "s",
                    }}
                    onClick={() => onNavigate && onNavigate({
                      content_type: "lesson",
                      content_id:   l.lesson_id,
                      lesson_name:  l.lesson_name,
                      module_id:    l.module_id,
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

            {/* Modules */}
            {visible.modules.length > 0 && (
              <div className="discover-group">
                <div className="discover-group-label">
                  {TYPE_META.module.icon} Modules
                </div>
                {visible.modules.map((m, i) => (
                  <div
                    key={m.module_id}
                    className="discover-row-card"
                    style={{
                      borderColor: TYPE_META.module.border,
                      animationDelay: i * 0.04 + "s",
                    }}
                    onClick={() => onNavigate && onNavigate({
                      content_type: "module",
                      content_id:   m.module_id,
                      module_id:    m.module_id,
                      module_name:  m.module_name,
                      theme_id:     m.theme_id,
                      course_id:    m.course_id,
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

            {/* Courses */}
            {visible.courses.length > 0 && (
              <div className="discover-group">
                <div className="discover-group-label">
                  {TYPE_META.course.icon} Courses
                </div>
                {visible.courses.map((c, i) => (
                  <div
                    key={c.course_id}
                    className="discover-row-card"
                    style={{
                      borderColor: TYPE_META.course.border,
                      animationDelay: i * 0.04 + "s",
                    }}
                    onClick={() => onNavigate && onNavigate({
                      content_type: "course",
                      content_id:   c.course_id,
                      course_id:    c.course_id,
                      course_name:  c.course_name,
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
        )}
      </div>

      <footer className="footer">
        &copy; {new Date().getFullYear()} IndiYatra · Heritage for Every Child
      </footer>
    </>
  );
}
