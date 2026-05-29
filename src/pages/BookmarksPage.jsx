import { useState, useEffect } from "react";
import { supabaseClient } from "../lib/auth";
import { SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import { useAuthContext } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import { SkeletonBookmarkList } from "../components/Skeletons";
import { APP_FOOTER, SIGNIN, EMPTY } from "../config/appStrings";

const BM_ICON = (size = 28, color = "#FF8E00") => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color}
    strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);

const TYPE_META = {
  course:  { label: "Course",   icon: "🎓", color: HERITAGE  },
  theme:   { label: "Theme",    icon: "🗺",  color: HERITAGE  },
  module:  { label: "Module",   icon: "📦", color: SAFFRON   },
  lesson:  { label: "Lesson",   icon: "📖", color: GREEN     },
  snippet: { label: "Snippet",  icon: "✦",  color: SAFFRON   },
};

const styles = `
  .bmp-hero {
    text-align: center; padding: 40px 1.5rem 28px;
    border-bottom: 1px solid #E5E7EB;
  }
  .bmp-hero h1 {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 2rem; font-weight: 700;
    color: #101828; margin-bottom: 6px;
  }
  .bmp-hero p { color: #4A5565; font-size: 0.9375rem; font-family: 'Nunito Sans', system-ui, sans-serif; }

  .bmp-filters {
    max-width: 1100px; margin: 0 auto; padding: 20px 1.5rem 0;
    display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
  }
  .bmp-filter-label { font-size: 0.8125rem; font-weight: 600; color: #4A5565; font-family: 'Inter', system-ui, sans-serif; }
  .bmp-filter-select {
    padding: 6px 12px; border-radius: 999px; border: 1.5px solid #E5E7EB;
    background: white; font-size: 0.8125rem; font-weight: 600; color: #101828;
    cursor: pointer; outline: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 28px; font-family: 'Inter', system-ui, sans-serif;
  }
  .bmp-filter-select:focus { border-color: ${SAFFRON}; }
  .bmp-clear  { font-size: 0.8125rem; color: ${SAFFRON}; cursor: pointer; font-weight: 600; margin-left: 4px; font-family: 'Inter', system-ui, sans-serif; }
  .bmp-clear:hover { text-decoration: underline; }
  .bmp-count  { font-size: 0.8125rem; color: #4A5565; margin-left: auto; font-family: 'Inter', system-ui, sans-serif; }

  .bmp-list {
    max-width: 1100px; margin: 0 auto; padding: 24px 1.5rem 80px;
    display: flex; flex-direction: column; gap: 12px;
  }

  .bmp-card { cursor: pointer; }
  .bmp-card {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    display: flex; align-items: center; gap: 0;
    overflow: hidden; animation: fadeUp 0.35s ease both;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .bmp-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); transform: translateX(3px); }

  .bmp-card-bar  { width: 5px; flex-shrink: 0; align-self: stretch; }
  .bmp-card-icon { font-size: 1.375rem; padding: 0 14px; flex-shrink: 0; }
  .bmp-card-body { flex: 1; min-width: 0; padding: 14px 0; }
  .bmp-card-name {
    font-family: 'Nunito Sans', system-ui, sans-serif; font-size: 1.0625rem; font-weight: 700;
    color: #101828; line-height: 1.2; margin-bottom: 4px;
  }
  .bmp-card-breadcrumb { font-size: 0.75rem; color: #4A5565; line-height: 1.5; font-family: 'Inter', system-ui, sans-serif; }
  .bmp-card-breadcrumb span { color: ${HERITAGE}; font-weight: 600; }
  .bmp-card-meta { font-size: 0.6875rem; color: #4A5565; margin-top: 4px; font-family: 'Inter', system-ui, sans-serif; }

  .bmp-card-right { display: flex; align-items: center; gap: 8px; padding: 0 16px; flex-shrink: 0; }
  .bmp-type-badge {
    font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.05em;
    padding: 3px 9px; border-radius: 999px; white-space: nowrap;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .bmp-remove-btn {
    background: none; border: none; cursor: pointer; font-size: 1rem;
    color: #4A5565; padding: 8px; border-radius: 8px;
    transition: color 0.15s, background 0.15s;
    line-height: 1; min-width: 36px; min-height: 36px;
    display: flex; align-items: center; justify-content: center;
  }
  .bmp-remove-btn:hover { color: #e05252; background: #e0525210; }

  .bmp-empty {
    text-align: center; padding: 80px 24px; color: #4A5565;
    max-width: 400px; margin: 0 auto;
  }
  .bmp-empty .empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .bmp-empty h3 { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem; color: #4A5565; margin-bottom: 8px; }
  .bmp-empty p  { font-size: 0.9375rem; line-height: 1.6; font-family: 'Nunito Sans', system-ui, sans-serif; }

  .bmp-signin {
    text-align: center; padding: 80px 24px;
  }
  .bmp-signin .empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .bmp-signin h3 { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem; color: ${HERITAGE}; margin-bottom: 8px; }
  .bmp-signin p  { font-size: 0.9375rem; color: #4A5565; margin-bottom: 24px; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .bmp-signin-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 12px 28px; border-radius: 12px; min-height: 44px;
    background: ${SAFFRON}; color: white; font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.9375rem; font-weight: 500; cursor: pointer; border: none;
    letter-spacing: 0.01em; transition: opacity 0.2s;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .bmp-signin-btn:hover { opacity: 0.9; }

  @media (max-width: 768px) {
    .bmp-list { padding: 16px 1rem 80px; }
    .bmp-filters { padding: 16px 1rem 0; }
  }
  @media (max-width: 600px) {
    .bmp-card-name { font-size: 1rem; }
    .bmp-type-badge { display: none; }
    .bmp-signin-btn { width: 100%; }
    .bmp-card-icon { display: none; }
  }
`;

export default function BookmarksPage({
  settings, onBack, onOpenSettings, onDashboard, onLikes, onBookmarks, onDiscover, onResume,
  onToggleBookmark,
  onNavigate,
  isAdmin, onAdmin, userEditorialRole, onEditor,
  activePage, onSaveSettings, languages = [],
}) {
  const { user, onSignIn } = useAuthContext();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterType,   setFilterType]   = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterTheme,  setFilterTheme]  = useState("all");
  const [filterModule, setFilterModule] = useState("all");

  const isGuest = !user || user.is_anonymous;

  useEffect(() => {
    if (isGuest) { setLoading(false); return; }
    async function load() {
      try {
        const { data } = await supabaseClient.rpc("get_user_bookmarks");
        setItems(data || []);
      } catch (e) {
        console.error("BookmarksPage load failed:", e.message);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  // ── Filter option lists ──────────────────────────────────────────────────
  const typeFiltered = filterType === "all" ? items : items.filter(i => i.content_type === filterType);

  const courses = [...new Map(
    typeFiltered.filter(i => i.course_id).map(i => [i.course_id, i.course_name])
  ).entries()];

  const themes = [...new Map(
    typeFiltered
      .filter(i => i.theme_id && (filterCourse === "all" || i.course_id === filterCourse))
      .map(i => [i.theme_id, i.theme_title])
  ).entries()];

  const modules = [...new Map(
    typeFiltered
      .filter(i => i.module_id
        && (filterCourse === "all" || i.course_id === filterCourse)
        && (filterTheme  === "all" || i.theme_id  === filterTheme))
      .map(i => [i.module_id, i.module_name])
  ).entries()];

  const filtered = typeFiltered.filter(i =>
    (filterCourse === "all" || i.course_id === filterCourse) &&
    (filterTheme  === "all" || i.theme_id  === filterTheme)  &&
    (filterModule === "all" || i.module_id === filterModule)
  );

  const hasFilters = filterType !== "all" || filterCourse !== "all" || filterTheme !== "all" || filterModule !== "all";
  const showFilters = items.length > 1 && (
    courses.length > 1 || themes.length > 1 || modules.length > 1 || true /* always show type if >0 */
  );

  function clearFilters() {
    setFilterType("all");
    setFilterCourse("all");
    setFilterTheme("all");
    setFilterModule("all");
  }

  function handleRemove(item) {
    // Optimistically remove from local list immediately
    setItems(prev => prev.filter(i => !(i.content_type === item.content_type && i.content_id === item.content_id)));
    if (onToggleBookmark) onToggleBookmark(item.content_type, item.content_id, item.item_name);
  }

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
        navLinks={[
          { label: "Home",      onClick: onBack      },
          { label: "Discover",  onClick: onDiscover },
          { label: "Dashboard", onClick: onDashboard },
          { label: "Likes",     onClick: onLikes     },
          { label: "Bookmarks", onClick: onBookmarks },
        ]}
      />

      <div className="bmp-hero">
        <h1><span style={{verticalAlign:"middle",marginRight:8,display:"inline-flex"}}>{BM_ICON(26)}</span>My Bookmarks</h1>
        <p>
          {isGuest
            ? SIGNIN.bookmarks
            : loading
              ? ""
              : `${items.length} item${items.length !== 1 ? "s" : ""} saved`}
        </p>
      </div>

      {isGuest ? (
        <div className="bmp-signin">
          <div className="empty-icon">{BM_ICON(44)}</div>
          <h3>Your bookmarks live here</h3>
          <p>{SIGNIN.bookmarksBody}</p>
          <button className="bmp-signin-btn" onClick={onSignIn}>Sign in</button>
        </div>
      ) : loading ? (
        <SkeletonBookmarkList count={4} />
      ) : items.length === 0 ? (
        <div className="bmp-empty">
          <div className="empty-icon">{BM_ICON(44)}</div>
          <h3>{EMPTY.bookmarks}</h3>
          <p>Tap the bookmark icon on any lesson, module, theme or snippet while browsing to save it here.</p>
        </div>
      ) : (
        <>
          {showFilters && (
            <div className="bmp-filters">
              <span className="bmp-filter-label">Filter by</span>

              <select className="bmp-filter-select" value={filterType}
                onChange={e => { setFilterType(e.target.value); setFilterCourse("all"); setFilterTheme("all"); setFilterModule("all"); }}>
                <option value="all">All types</option>
                <option value="course">Courses</option>
                <option value="theme">Themes</option>
                <option value="module">Modules</option>
                <option value="lesson">Lessons</option>
                <option value="snippet">Snippets</option>
              </select>

              {courses.length > 1 && (
                <select className="bmp-filter-select" value={filterCourse}
                  onChange={e => { setFilterCourse(e.target.value); setFilterTheme("all"); setFilterModule("all"); }}>
                  <option value="all">All courses</option>
                  {courses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              )}

              {themes.length > 1 && (
                <select className="bmp-filter-select" value={filterTheme}
                  onChange={e => { setFilterTheme(e.target.value); setFilterModule("all"); }}>
                  <option value="all">All themes</option>
                  {themes.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                </select>
              )}

              {modules.length > 1 && (filterType === "all" || filterType === "lesson") && (
                <select className="bmp-filter-select" value={filterModule}
                  onChange={e => setFilterModule(e.target.value)}>
                  <option value="all">All modules</option>
                  {modules.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              )}

              {hasFilters && (
                <span className="bmp-clear" onClick={clearFilters}>✕ Clear</span>
              )}
              <span className="bmp-count">{filtered.length} of {items.length}</span>
            </div>
          )}

          <div className="bmp-list">
            {filtered.map((item, i) => {
              const meta = TYPE_META[item.content_type] || TYPE_META.lesson;
              return (
                <div key={item.id} className="bmp-card" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => onNavigate && onNavigate(item)}>
                  {/* Colour bar */}
                  <div className="bmp-card-bar" style={{ background: meta.color }} />

                  {/* Type icon */}
                  <div className="bmp-card-icon">{meta.icon}</div>

                  {/* Body */}
                  <div className="bmp-card-body">
                    <div className="bmp-card-name">{item.item_name}</div>
                    <div className="bmp-card-breadcrumb">
                      {item.course_name && <><span>{item.course_name}</span></>}
                      {item.theme_title && item.content_type !== "theme" && <> › {item.theme_title}</>}
                      {item.module_name && item.content_type === "lesson" && <> › {item.module_name}</>}
                    </div>
                    <div className="bmp-card-meta">Saved {formatDate(item.saved_at)}</div>
                  </div>

                  {/* Right: type badge + remove */}
                  <div className="bmp-card-right">
                    <span className="bmp-type-badge"
                      style={{ background: meta.color + "18", color: meta.color }}>
                      {meta.label}
                    </span>
                    <button
                      className="bmp-remove-btn"
                      title="Remove bookmark"
                      onClick={e => { e.stopPropagation(); handleRemove(item); }}
                    >✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <footer className="footer">{APP_FOOTER(new Date().getFullYear())}</footer>
    </>
  );
}
