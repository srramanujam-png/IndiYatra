import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, LEVEL_LABELS, VISIBILITY_BADGE } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { SkeletonModuleList } from "../components/Skeletons";

const styles = `
  .theme-banner { max-width: 1200px; margin: 0 auto 28px; padding: 0 1.5rem; }
  .theme-banner-inner {
    border-radius: 14px; padding: 14px 20px;
    background: rgba(0,80,158,0.05);
    border: 1px solid rgba(0,80,158,0.12); display: flex; align-items: center; gap: 16px;
  }
  .theme-banner-accent { width: 5px; height: 40px; border-radius: 3px; background: ${SAFFRON}; flex-shrink: 0; }
  .theme-banner-body   { flex: 1; min-width: 0; }
  .theme-banner-title  { font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem; font-weight: 700; color: ${HERITAGE}; }
  .theme-banner-desc   { font-size: 0.8125rem; color: #1F1F1F; margin-top: 2px; }
  .theme-banner-count  {
    flex-shrink: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em;
    padding: 3px 10px; border-radius: 999px; background: ${SAFFRON}15; color: ${SAFFRON};
  }

  .modules-content { max-width: 720px; margin: 0 auto; padding: 0 1.5rem 80px; }

  .module-row {
    display: flex; align-items: center; gap: 16px;
    background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
    padding: 16px 20px; margin-bottom: 12px; cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    animation: fadeUp 0.35s ease both; box-shadow: 0 2px 10px rgba(255,142,0,0.05);
    overflow: hidden;
  }
  .module-row:hover { transform: translateX(4px); box-shadow: 0 6px 24px rgba(255,142,0,0.12); border-color: ${SAFFRON}66; }
  .module-row.complete { border-color: ${GREEN}44; background: rgba(0,146,74,0.04); }
  .module-row.complete:hover { border-color: ${GREEN}88; transform: translateX(4px); }
  .module-row.progress { border-color: ${SAFFRON}44; }

  .module-row-thumb {
    width: 64px; height: 64px; border-radius: 12px; overflow: hidden;
    background: #EBEBEA; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .module-row-thumb img { width: 100%; height: 100%; object-fit: cover; }

  .module-row-info { flex: 1; min-width: 0; }
  .module-row-number { font-size: 0.6875rem; color: #6B6B6B; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 3px; }
  .module-row-name   { font-family: 'Alumni Sans', sans-serif; font-size: 1.1875rem; font-weight: 700; color: #0A0A0A; line-height: 1.2; margin-bottom: 4px; }
  .module-row-desc   { font-size: 0.75rem; color: #6B6B6B; line-height: 1.4; margin-bottom: 5px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
  .module-row-right  { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .vis-badge-right   { border-radius: 999px; padding: 2px 9px; font-size: 0.625rem; font-weight: 700; white-space: nowrap; }

  .module-row-progress { height: 4px; background: rgba(0,0,0,0.06); border-radius: 2px; margin-bottom: 4px; overflow: hidden; max-width: 160px; }
  .module-row-progress-fill { height: 100%; border-radius: 2px; }
  .module-row-count { font-size: 0.75rem; color: #6B6B6B; }

  .module-row-cta {
    flex-shrink: 0; border-radius: 999px; padding: 7px 16px;
    font-family: 'Alumni Sans', sans-serif; font-size: 0.8125rem;
    font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .module-cta-explore { border: 1.5px solid ${SAFFRON}; color: ${SAFFRON}; background: transparent; }
  .module-cta-explore:hover { background: ${SAFFRON}; color: white; }
  .module-cta-resume  { border: 1.5px solid ${SAFFRON}; background: ${SAFFRON}; color: white; }
  .module-cta-resume:hover { box-shadow: 0 4px 12px rgba(255,142,0,0.3); }
  .module-cta-review  { border: 1.5px solid ${GREEN}; color: ${GREEN}; background: transparent; }
  .module-cta-review:hover { background: ${GREEN}; color: white; }
  .module-row.locked {
    opacity: 0.4; cursor: not-allowed;
  }
  .module-row.locked:hover {
    transform: none !important; box-shadow: none !important;
  }
  .module-lock-badge {
    font-size: 0.8125rem; color: #6B6B6B; white-space: nowrap; flex-shrink: 0;
  }
  .bm-btn {
    flex-shrink: 0; background: none; border: none; cursor: pointer;
    font-size: 1.125rem; line-height: 1; padding: 4px 6px; border-radius: 8px;
    color: #6B6B6B; transition: color 0.15s, transform 0.15s;
  }
  .bm-btn:hover { color: #FF8E00; transform: scale(1.15); }
  .bm-btn.saved { color: #FF8E00; }

  .modules-section-label {
    max-width: 720px; margin: 0 auto 12px; padding: 0 1.5rem;
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  }

  @media (max-width: 768px) {
    .modules-content { padding: 0 1rem 60px; }
    .theme-banner { padding: 0 1rem; margin-bottom: 20px; }
    .module-row { padding: 12px 14px; gap: 12px; }
    .modules-section-label { padding: 0 1rem; }
    .theme-banner-count { display: none; }
  }
  @media (max-width: 480px) {
    .module-row-thumb { width: 48px; height: 48px; border-radius: 8px; }
    .module-row-name { font-size: 1rem; }
    .module-row-cta { padding: 6px 12px; font-size: 0.75rem; }
  }
`;

function getState(done, total) {
  if (total === 0) return "none";
  if (done >= total) return "complete";
  if (done > 0) return "progress";
  return "none";
}

export default function ModulesPage({ course, theme, levelId, settings, completedLessons = new Set(), onModuleClick, onBack, onBackToCourse, onOpenSettings, onDashboard, onLikes, onBookmarks, onDiscover, onResume, bookmarks = new Set(), onToggleBookmark, userEditorialRole, onEditor, isAdmin, onAdmin, activePage, onSaveSettings, languages = [] }) {
  const [modules, setModules]       = useState([]);
  const [assets, setAssets]         = useState({});
  const [lessonsByModule, setLessonsByModule] = useState({});
  const [loading, setLoading]       = useState(true);
  const levelMeta = LEVEL_LABELS[levelId] || { label: "All Levels", color: SAFFRON };

  useEffect(() => {
    async function load() {
      const [mods, assetData] = await Promise.all([
        supabase("modules", `?select=*&level_id=eq.${levelId}&theme_id=eq.${theme.theme_id}&order=sort_order`),
        supabase("asset_library", "?select=*"),
      ]);
      const assetMap = {};
      (assetData || []).forEach(a => { assetMap[a.asset_id] = a; });
      setModules(mods || []);
      setAssets(assetMap);

      // Fetch only lessons that have at least one snippet mapped
      if (mods && mods.length > 0) {
        const modIds = mods.map(m => m.module_id).join(",");
        const [lessons, mappings] = await Promise.all([
          supabase("lessons", `?select=lesson_id,module_id&module_id=in.(${modIds})`),
          supabase("lesson_snippet_mapping", `?select=lesson_id`),
        ]);
        const lessonsWithSnippets = new Set((mappings || []).map(m => m.lesson_id));
        const grouped = {};
        (lessons || []).forEach(l => {
          if (!lessonsWithSnippets.has(l.lesson_id)) return; // skip empty lessons
          if (!grouped[l.module_id]) grouped[l.module_id] = [];
          grouped[l.module_id].push(l.lesson_id);
        });
        setLessonsByModule(grouped);
      }
      setLoading(false);
    }
    load();
  }, [levelId, theme.theme_id]);

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
        navLinks={[{ label: "Home", onClick: onBack }, { label: "Discover", onClick: onDiscover }, { label: "Dashboard", onClick: onDashboard }, { label: "Likes", onClick: onLikes }, { label: "Bookmarks", onClick: onBookmarks }]}
      />

      <div className="breadcrumb">
        <a onClick={onBack}>Home</a><span className="sep">›</span>
        <a onClick={onBackToCourse}>{course?.course_name || "Bharat Heritage"}</a><span className="sep">›</span>
        <span style={{ color: levelMeta.color, fontWeight: 700, cursor: "pointer" }} onClick={onBackToCourse}>
          {levelMeta.label}
        </span>
        <span className="sep">›</span>
        <span className="current">{theme.title}</span>
      </div>

      <div className="page-hero">
        <div className="page-title">{theme.title}</div>
        <div className="page-subtitle">Explore modules in this theme · {levelMeta.label}</div>
      </div>

      <div className="theme-banner">
        <div className="theme-banner-inner">
          <div className="theme-banner-accent" />
          <div className="theme-banner-body">
            <div className="theme-banner-title">{theme.title}</div>
            <div className="theme-banner-desc">{theme.description || "Explore the modules below."}</div>
          </div>
          {!loading && modules.length > 0 && (
            <div className="theme-banner-count">{modules.length} module{modules.length !== 1 ? "s" : ""}</div>
          )}
        </div>
      </div>

      {!loading && modules.length > 0 && (
        <div className="modules-section-label" style={{ color: levelMeta.color }}>
          {modules.length} Module{modules.length !== 1 ? "s" : ""} · {theme.title}
        </div>
      )}

      <div className="modules-content">
        {loading ? <SkeletonModuleList count={4} />
        : modules.length === 0 ? <div className="empty">No modules found for this theme and level.</div>
        : (
          <div>
            {modules.map((mod, i) => {
              const asset   = assets[mod.asset_id];
              const vis     = VISIBILITY_BADGE[mod.visibility] || VISIBILITY_BADGE.PUBLIC;
              const lessons = lessonsByModule[mod.module_id] || [];
              const total   = lessons.length;
              const done    = lessons.filter(id => completedLessons.has(id)).length;
              const state   = getState(done, total);
              const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
              const ctaClass = state === "complete" ? "review" : state === "progress" ? "resume" : "explore";
              const ctaLabel = state === "complete" ? "Review ✓" : state === "progress" ? "Resume →" : "Explore →";
              const prevLessons = i > 0 ? (lessonsByModule[modules[i - 1].module_id] || []) : [];
              const isLocked = course?.sequential_unlock && i > 0
                && prevLessons.length > 0
                && !prevLessons.every(id => completedLessons.has(id));

              return (
                <div
                  className={`module-row ${state} ${isLocked ? "locked" : ""}`}
                  key={mod.module_id}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={isLocked ? undefined : () => onModuleClick(mod)}
                >
                  {/* Thumbnail */}
                  <div className="module-row-thumb">
                    {asset
                      ? <img src={asset.file_path} alt={asset.alt_text || mod.module_name} onError={e => { e.target.src = logoUrl; }} />
                      : <span style={{ fontSize: 24 }}>🪔</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="module-row-info">
                    <div className="module-row-number">{mod.module_number}</div>
                    <div className="module-row-name">{mod.module_name}</div>
                    {mod.description && (
                      <div className="module-row-desc">{mod.description}</div>
                    )}
                    {state !== "none" && total > 0 && (
                      <div className="module-row-progress">
                        <div className="module-row-progress-fill"
                          style={{ width: `${pct}%`, background: state === "complete" ? GREEN : SAFFRON }} />
                      </div>
                    )}
                    <div className="module-row-count">
                      {total > 0 ? (state === "complete" ? `${total} lessons ✓` : `${done}/${total} lessons`) : ""}
                    </div>
                  </div>

                  {/* Right: vis badge + CTA stacked */}
                  <div className="module-row-right">
                    <span className="vis-badge-right" style={{ background: vis.bg, color: vis.color }}>{vis.label}</span>
                    {isLocked
                      ? <span className="module-lock-badge">🔒 Locked</span>
                      : (
                        <>
                          <button
                            className={"bm-btn" + (bookmarks.has("module:" + mod.module_id) ? " saved" : "")}
                            title={bookmarks.has("module:" + mod.module_id) ? "Remove bookmark" : "Bookmark module"}
                            onClick={e => { e.stopPropagation(); onToggleBookmark && onToggleBookmark("module", mod.module_id, mod.module_name); }}
                          ><svg width="20" height="20" viewBox="0 0 24 24" fill={bookmarks.has("module:" + mod.module_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>
                          <button
                            className={`module-row-cta module-cta-${ctaClass}`}
                            onClick={e => { e.stopPropagation(); onModuleClick(mod); }}
                          >
                            {ctaLabel}
                          </button>
                        </>
                      )
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
