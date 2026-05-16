import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, LEVEL_LABELS } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";

const styles = `
  .level-tabs {
    max-width: 720px; margin: 0 auto; padding: 0 1.5rem 24px;
    display: flex; gap: 12px; flex-wrap: wrap;
    border-bottom: 1px solid #f0e8d8;
  }
  .level-tab {
    display: flex; flex-direction: column; align-items: flex-start;
    padding: 14px 24px; border-radius: 16px; border: 2px solid #e0d4bc;
    background: white; cursor: pointer; transition: all 0.2s; min-width: 170px;
  }
  .level-tab:hover { border-color: ${SAFFRON}; transform: translateY(-2px); }
  .level-tab.complete { border-color: ${GREEN}55 !important; background: #F6FBF8; }
  .level-tab-name    { font-family: 'Alumni Sans', sans-serif; font-size: 20px; font-weight: 700; line-height: 1; }
  .level-tab-classes { font-size: 13px; color: #888; margin-top: 4px; }
  .level-tab-count   {
    font-size: 12px; font-weight: 600; margin-top: 8px;
    padding: 2px 10px; border-radius: 999px; background: #f5f5f5; color: #666;
  }
  .level-tab.active .level-tab-count { color: white; }
  .level-tab:not(.active):hover .level-tab-count { background: #eee4d4; color: #555; }

  .content { max-width: 720px; margin: 0 auto; padding: 0 1.5rem 80px; }

  .theme-row {
    display: flex; align-items: center; gap: 16px;
    background: white; border-radius: 14px; border: 1px solid #E8D5B0;
    padding: 16px 20px; margin-bottom: 12px; cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    animation: fadeUp 0.35s ease both; box-shadow: 0 2px 10px rgba(255,142,0,0.05);
    overflow: hidden;
  }
  .theme-row:hover { transform: translateX(4px); box-shadow: 0 6px 24px rgba(255,142,0,0.12); border-color: ${SAFFRON}66; }
  .theme-row.complete { border-color: ${GREEN}44; background: #F6FBF8; }
  .theme-row.complete:hover { border-color: ${GREEN}88; }
  .theme-row.progress { border-color: ${SAFFRON}44; }

  .theme-row-thumb {
    width: 72px; height: 72px; border-radius: 12px; overflow: hidden;
    background: #f0e8d8; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .theme-row-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; }

  .theme-row-info { flex: 1; min-width: 0; }
  .theme-row-title { font-family: 'Alumni Sans', sans-serif; font-size: 20px; font-weight: 700; color: #1a1a2e; line-height: 1.2; margin-bottom: 4px; }
  .theme-row-desc  { font-size: 13px; color: #888; line-height: 1.4; margin-bottom: 6px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

  .theme-row-progress { height: 4px; background: #f0e8d8; border-radius: 2px; margin-bottom: 4px; overflow: hidden; }
  .theme-row-progress-fill { height: 100%; border-radius: 2px; }
  .theme-row-count { font-size: 12px; color: #aaa; font-weight: 600; }

  .theme-row-cta {
    flex-shrink: 0; border-radius: 999px; padding: 7px 16px;
    font-family: 'Alumni Sans', sans-serif; font-size: 13px;
    font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .theme-cta-explore { border: 1.5px solid ${SAFFRON}; color: ${SAFFRON}; background: transparent; }
  .theme-cta-explore:hover { background: ${SAFFRON}; color: white; }
  .theme-cta-resume  { border: 1.5px solid ${SAFFRON}; background: ${SAFFRON}; color: white; }
  .theme-cta-resume:hover { box-shadow: 0 4px 12px rgba(255,142,0,0.3); }
  .theme-cta-review  { border: 1.5px solid ${GREEN}; color: ${GREEN}; background: transparent; }
  .theme-cta-review:hover { background: ${GREEN}; color: white; }

  .theme-section-label {
    max-width: 720px; margin: 16px auto 12px; padding: 0 1.5rem;
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  }

  @media (max-width: 768px) {
    .level-tabs { padding: 0 1rem 20px; gap: 10px; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
    .level-tab  { min-width: 150px; padding: 10px 16px; flex-shrink: 0; }
    .content { padding: 0 1rem 60px; }
    .theme-row { padding: 12px 14px; gap: 12px; }
    .theme-row-thumb { width: 56px; height: 56px; }
    .theme-section-label { padding: 0 1rem; margin: 12px auto 10px; }
  }
  @media (max-width: 480px) {
    .level-tab  { min-width: 130px; }
    .level-tab-name { font-size: 17px; }
    .theme-row-title { font-size: 17px; }
    .theme-row-cta { padding: 6px 12px; font-size: 12px; }
  }
`;

function getState(done, total) {
  if (total === 0) return "none";
  if (done >= total) return "complete";
  if (done > 0) return "progress";
  return "none";
}

export default function CoursePage({ course, settings, completedLessons = new Set(), onThemeClick, onBack, onOpenSettings }) {
  const [levels, setLevels]       = useState([]);
  const [themes, setThemes]       = useState([]);
  const [modules, setModules]     = useState([]);
  const [assets, setAssets]       = useState({});
  const [lessonsByModule, setLessonsByModule] = useState({});
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const [lvls, thms, mods, assetData] = await Promise.all([
        supabase("levels", "?select=*&order=level_number"),
        supabase("themes", "?select=*&order=theme_id"),
        supabase("modules", "?select=*&order=module_name"),
        supabase("asset_library", "?select=*"),
      ]);
      const assetMap = {};
      (assetData || []).forEach(a => { assetMap[a.asset_id] = a; });
      setLevels(lvls || []);
      setThemes(thms || []);
      setModules(mods || []);
      setAssets(assetMap);
      if (lvls && lvls.length > 0) setSelectedLevel(lvls[0].level_id);

      // Fetch all lessons grouped by module — only those with snippets
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
  }, []);

  // Compute completion for a theme (given level)
  function themeStats(themeId, levelId) {
    const themeMods = modules.filter(m => m.level_id === levelId && m.theme_id === themeId);
    const total = themeMods.reduce((s, m) => s + (lessonsByModule[m.module_id]?.length || 0), 0);
    const done  = themeMods.reduce((s, m) => s + (lessonsByModule[m.module_id] || []).filter(id => completedLessons.has(id)).length, 0);
    return { total, done };
  }

  // Compute completion for a level
  function levelStats(levelId) {
    const levelMods = modules.filter(m => m.level_id === levelId);
    const total = levelMods.reduce((s, m) => s + (lessonsByModule[m.module_id]?.length || 0), 0);
    const done  = levelMods.reduce((s, m) => s + (lessonsByModule[m.module_id] || []).filter(id => completedLessons.has(id)).length, 0);
    return { total, done };
  }

  const activeThemes = themes.filter(t =>
    modules.some(m => m.level_id === selectedLevel && m.theme_id === t.theme_id)
  );
  const levelMeta = LEVEL_LABELS[selectedLevel] || { label: "", color: SAFFRON };

  return (
    <>
      <style>{globalStyles + styles}</style>
      <PageHeader
        onHome={onBack}
        onOpenSettings={onOpenSettings}
        navLinks={[{ label: "Home", onClick: onBack }, { label: "Discover", onClick: () => {} }]}
      />

      <div className="breadcrumb">
        <a onClick={onBack}>Home</a>
        <span className="sep">›</span>
        <span className="current">{course?.course_name || "Bharat Heritage"}</span>
        {selectedLevel && (
          <>
            <span className="sep">›</span>
            <span style={{ color: levelMeta.color, fontWeight: 700 }}>{levelMeta.label}</span>
          </>
        )}
      </div>

      <div className="page-hero">
        <div className="page-title">{course?.course_name || "Bharat Heritage"}</div>
        <div className="page-subtitle">Pick a level, then choose a theme to explore</div>
      </div>

      {loading ? <div className="loading">Loading…</div> : (
        <>
          {/* Level Tabs */}
          <div className="level-tabs">
            {levels.map(level => {
              const meta     = LEVEL_LABELS[level.level_id] || { label: level.title, classes: "", color: SAFFRON };
              const modCount = modules.filter(m => m.level_id === level.level_id).length;
              const { total, done } = levelStats(level.level_id);
              const lState   = getState(done, total);
              const isActive = selectedLevel === level.level_id;
              return (
                <div
                  key={level.level_id}
                  className={`level-tab ${isActive ? "active" : ""} ${lState === "complete" ? "complete" : ""}`}
                  style={{
                    borderColor: lState === "complete" ? GREEN : isActive ? meta.color : "#e0d4bc",
                    boxShadow: isActive ? `inset 4px 0 0 ${meta.color}, 0 4px 16px ${meta.color}22` : "none",
                  }}
                  onClick={() => setSelectedLevel(level.level_id)}
                >
                  <div className="level-tab-name" style={{ color: lState === "complete" ? GREEN : meta.color }}>
                    {lState === "complete" ? "✓ " : ""}{meta.label}
                  </div>
                  <div className="level-tab-classes">{meta.classes}</div>
                  <div className="level-tab-count" style={isActive ? { background: lState === "complete" ? GREEN : meta.color } : {}}>
                    {lState === "complete" ? `${modCount} modules ✓` : lState === "progress" ? `${done}/${total} lessons` : `${modCount} modules`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Theme Section Label */}
          {selectedLevel && (
            <div className="theme-section-label" style={{ color: levelMeta.color }}>
              {activeThemes.length} Theme{activeThemes.length !== 1 ? "s" : ""} · {levelMeta.label}
            </div>
          )}

          {/* Theme List */}
          <div className="content">
            {activeThemes.length === 0
              ? <div className="empty">No themes found for this level.</div>
              : (
                <div>
                  {activeThemes.map((theme, ti) => {
                    const asset    = assets[theme.asset_id];
                    const modCount = modules.filter(m => m.level_id === selectedLevel && m.theme_id === theme.theme_id).length;
                    const { total, done } = themeStats(theme.theme_id, selectedLevel);
                    const state    = getState(done, total);
                    const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
                    const ctaClass = state === "complete" ? "review" : state === "progress" ? "resume" : "explore";
                    const ctaLabel = state === "complete" ? "Review ✓" : state === "progress" ? "Resume →" : "Explore →";

                    return (
                      <div
                        className={`theme-row ${state}`}
                        key={theme.theme_id}
                        style={{ animationDelay: `${ti * 0.06}s` }}
                        onClick={() => onThemeClick({ theme, levelId: selectedLevel })}
                      >
                        {/* Thumbnail */}
                        <div className="theme-row-thumb">
                          {asset
                            ? <img src={asset.file_path} alt={asset.alt_text || theme.title} onError={e => { e.target.src = logoUrl; }} />
                            : <span style={{ fontSize: 28 }}>🪔</span>
                          }
                        </div>

                        {/* Info */}
                        <div className="theme-row-info">
                          <div className="theme-row-title">
                            {state === "complete" ? "✓ " : ""}{theme.title}
                          </div>
                          <div className="theme-row-desc">{theme.description || "Explore modules in this theme"}</div>
                          {state !== "none" && total > 0 && (
                            <div className="theme-row-progress">
                              <div className="theme-row-progress-fill"
                                style={{ width: `${pct}%`, background: state === "complete" ? GREEN : SAFFRON }} />
                            </div>
                          )}
                          <div className="theme-row-count">
                            {total > 0
                              ? state === "complete" ? `${total} lessons ✓` : `${done}/${total} lessons`
                              : `${modCount} module${modCount !== 1 ? "s" : ""}`}
                          </div>
                        </div>

                        {/* CTA */}
                        <button
                          className={`theme-row-cta theme-cta-${ctaClass}`}
                          onClick={e => { e.stopPropagation(); onThemeClick({ theme, levelId: selectedLevel }); }}
                        >
                          {ctaLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        </>
      )}
    </>
  );
}
