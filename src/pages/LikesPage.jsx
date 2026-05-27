import { useState, useEffect } from "react";
import { supabaseClient } from "../lib/auth";
import { supabase, SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import { useAuthContext } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import { SkeletonLikeGrid } from "../components/Skeletons";

const styles = `
  .likes-hero {
    text-align: center; padding: 40px 1.5rem 28px;
    border-bottom: 1px solid rgba(0,0,0,0.07);
  }
  .likes-hero h1 {
    font-family: 'Alumni Sans', sans-serif; font-size: 2rem; font-weight: 800;
    color: ${HERITAGE}; margin-bottom: 6px;
  }
  .likes-hero p { color: #1F1F1F; font-size: 0.9375rem; }

  .likes-filters {
    max-width: 1100px; margin: 0 auto; padding: 20px 1.5rem 0;
    display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
  }
  .likes-filter-label { font-size: 0.8125rem; font-weight: 600; color: #6B6B6B; }
  .likes-filter-select {
    padding: 6px 12px; border-radius: 999px; border: 1.5px solid rgba(0,0,0,0.10);
    background: white; font-size: 0.8125rem; font-weight: 600; color: #1F1F1F;
    cursor: pointer; outline: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 28px;
  }
  .likes-filter-select:focus { border-color: ${SAFFRON}; }
  .likes-clear { font-size: 0.8125rem; color: ${SAFFRON}; cursor: pointer; font-weight: 600; margin-left: 4px; }
  .likes-clear:hover { text-decoration: underline; }
  .likes-count { font-size: 0.8125rem; color: #6B6B6B; margin-left: auto; }

  .likes-grid {
    max-width: 1100px; margin: 0 auto; padding: 24px 1.5rem 80px;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px;
  }
  .like-card {
    background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
    box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden;
    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
    animation: fadeUp 0.4s ease both;
  }
  .like-card:hover { transform: translateY(-4px); box-shadow: none; }
  .like-card-img { position: relative; height: 140px; overflow: hidden; background: #EBEBEA; }
  .like-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
  .like-card:hover .like-card-img img { transform: scale(1.05); }
  .like-card-img-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55)); }
  .like-card-body { padding: 14px 16px 16px; }
  .like-card-hook {
    font-size: 0.875rem; font-weight: 600; color: #0A0A0A;
    line-height: 1.45; margin-bottom: 10px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .like-card-breadcrumb {
    font-size: 0.75rem; color: #6B6B6B; line-height: 1.5; margin-bottom: 10px;
  }
  .like-card-breadcrumb span { color: ${HERITAGE}; font-weight: 600; }
  .like-card-footer { display: flex; align-items: center; justify-content: space-between; }
  .like-card-count { font-size: 0.8125rem; color: #6B6B6B; display: flex; align-items: center; gap: 4px; }
  .like-card-date { font-size: 0.75rem; color: #6B6B6B; }

  .likes-empty {
    text-align: center; padding: 80px 24px; color: #6B6B6B;
    max-width: 400px; margin: 0 auto;
  }
  .likes-empty .empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .likes-empty h3 { font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; color: #6B6B6B; margin-bottom: 8px; }
  .likes-empty p { font-size: 0.9375rem; line-height: 1.6; }

  .likes-signin {
    text-align: center; padding: 80px 24px;
  }
  .likes-signin .empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .likes-signin h3 { font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; color: ${HERITAGE}; margin-bottom: 8px; }
  .likes-signin p { font-size: 0.9375rem; color: #1F1F1F; margin-bottom: 24px; }
  @media (max-width: 768px) {
    .likes-grid { padding: 16px 1rem 80px; gap: 14px; }
    .likes-filters { padding: 16px 1rem 0; }
  }
  @media (max-width: 600px) {
    .likes-grid { grid-template-columns: 1fr; }
    .likes-signin-btn { width: 100%; }
  }
  .likes-signin-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 12px 28px; border-radius: 10px; min-height: 44px;
    background: ${SAFFRON}; color: white; font-family: 'Alumni Sans', sans-serif;
    font-size: 1rem; font-weight: 700; cursor: pointer; border: none;
    letter-spacing: 0.02em; transition: box-shadow 0.2s;
  }
  .likes-signin-btn:hover { box-shadow: 0 4px 16px ${SAFFRON}55; }
`;

export default function LikesPage({ settings, onBack, onOpenSettings, onResume, onDashboard, onLikes, onBookmarks, onDiscover, onPlaySnippet, isAdmin, onAdmin, userEditorialRole, onEditor, activePage, onSaveSettings, languages = [] }) {
  const { user, onSignIn } = useAuthContext();
  const [likes,    setLikes]    = useState([]);
  const [assets,   setAssets]   = useState({});
  const [loading,  setLoading]  = useState(true);

  const [filterCourse, setFilterCourse] = useState("all");
  const [filterTheme,  setFilterTheme]  = useState("all");
  const [filterModule, setFilterModule] = useState("all");

  const isGuest = !user || user.is_anonymous;

  useEffect(() => {
    if (isGuest) { setLoading(false); return; }
    async function load() {
      try {
        const { data } = await supabaseClient.rpc("get_user_likes");
        const rows = data || [];

        setLikes(rows);

        // Fetch assets for all snippet images
        const assetIds = [...new Set(rows.map(r => r.asset_id).filter(Boolean))];
        if (assetIds.length > 0) {
          const assetData = await supabase("asset_library", `?select=asset_id,file_path&asset_id=in.(${assetIds.join(",")})`);
          const map = {};
          (assetData || []).forEach(a => { map[a.asset_id] = a.file_path; });
          setAssets(map);
        }
      } catch (e) {
        console.error("Failed to load likes:", e.message);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  // Build filter options from loaded data
  const courses = [...new Map(likes.filter(l => l.course_id).map(l => [l.course_id, l.course_name])).entries()];
  const themes  = [...new Map(likes.filter(l => l.theme_id  && (filterCourse === "all" || l.course_id === filterCourse)).map(l => [l.theme_id, l.theme_title])).entries()];
  const modules = [...new Map(likes.filter(l => l.module_id && (filterCourse === "all" || l.course_id === filterCourse) && (filterTheme === "all" || l.theme_id === filterTheme)).map(l => [l.module_id, l.module_name])).entries()];

  const filtered = likes.filter(l =>
    (filterCourse === "all" || l.course_id === filterCourse) &&
    (filterTheme  === "all" || l.theme_id  === filterTheme)  &&
    (filterModule === "all" || l.module_id === filterModule)
  );

  function clearFilters() {
    setFilterCourse("all");
    setFilterTheme("all");
    setFilterModule("all");
  }

  function formatDate(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
          { label: "Home",      onClick: onBack },
          { label: "Discover",  onClick: onDiscover },
          { label: "Dashboard", onClick: onDashboard },
          { label: "Likes",      onClick: onLikes },
          { label: "Bookmarks", onClick: onBookmarks },
        ]}
      />

      <div className="likes-hero">
        <h1>♥ My Likes</h1>
        <p>{isGuest ? "Sign in to see your liked snippets" : loading ? "" : `${likes.length} snippet${likes.length !== 1 ? "s" : ""} liked`}</p>
      </div>

      {isGuest ? (
        <div className="likes-signin">
          <div className="empty-icon">♡</div>
          <h3>Your likes live here</h3>
          <p>Sign in to like snippets as you learn and revisit them anytime.</p>
          <button className="likes-signin-btn" onClick={onSignIn}>Sign in</button>
        </div>
      ) : loading ? (
        <SkeletonLikeGrid count={6} />
      ) : likes.length === 0 ? (
        <div className="likes-empty">
          <div className="empty-icon">♡</div>
          <h3>No likes yet</h3>
          <p>Tap the ♡ on any snippet while learning to save it here.</p>
        </div>
      ) : (
        <>
          {(courses.length > 1 || themes.length > 1 || modules.length > 1) && (
            <div className="likes-filters">
              <span className="likes-filter-label">Filter by</span>

              {courses.length > 1 && (
                <select className="likes-filter-select" value={filterCourse}
                  onChange={e => { setFilterCourse(e.target.value); setFilterTheme("all"); setFilterModule("all"); }}>
                  <option value="all">All courses</option>
                  {courses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              )}

              {themes.length > 1 && (
                <select className="likes-filter-select" value={filterTheme}
                  onChange={e => { setFilterTheme(e.target.value); setFilterModule("all"); }}>
                  <option value="all">All themes</option>
                  {themes.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                </select>
              )}

              {modules.length > 1 && (
                <select className="likes-filter-select" value={filterModule}
                  onChange={e => setFilterModule(e.target.value)}>
                  <option value="all">All modules</option>
                  {modules.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              )}

              {(filterCourse !== "all" || filterTheme !== "all" || filterModule !== "all") && (
                <span className="likes-clear" onClick={clearFilters}>✕ Clear</span>
              )}
              <span className="likes-count">{filtered.length} of {likes.length}</span>
            </div>
          )}

          <div className="likes-grid">
            {filtered.map((like, i) => (
              <div
                key={like.snippet_id}
                className="like-card"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => {
                  if (onPlaySnippet) {
                    const ids = filtered.map(l => l.snippet_id);
                    const idx = filtered.findIndex(l => l.snippet_id === like.snippet_id);
                    onPlaySnippet(ids, idx);
                  }
                }}
              >
                <div className="like-card-img">
                  {assets[like.asset_id] && (
                    <img src={assets[like.asset_id]} alt="" />
                  )}
                  <div className="like-card-img-overlay" />
                </div>
                <div className="like-card-body">
                  <div className="like-card-hook">{like.hook || "Snippet content"}</div>
                  <div className="like-card-breadcrumb">
                    <span>{like.course_name}</span>
                    {like.theme_title  && <> › {like.theme_title}</>}
                    {like.module_name  && <> › {like.module_name}</>}
                    {like.lesson_name  && <> › {like.lesson_name}</>}
                  </div>
                  <div className="like-card-footer">
                    <span className="like-card-count">♥ {like.like_count || 0}</span>
                    <span className="like-card-date">{formatDate(like.liked_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <footer className="footer">© {new Date().getFullYear()} IndiYatra · Heritage for Every Child</footer>
    </>
  );
}
