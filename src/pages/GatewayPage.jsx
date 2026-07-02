import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, DIFFICULTY_STARS, DEFAULT_LANG_CODE } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import { GATEWAY, FALLBACK } from "../config/appStrings";
import PageHeader from "../components/PageHeader";

const RED = "#E53935";

const ACCENT_MAP = { HERITAGE, GREEN, SAFFRON, RED };

const styles = `
  .gw-wrap {
    min-height: 100vh; background: #FFFFFF;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  /* ── Hero ─────────────────────────────────────────── */
  .gw-hero {
    max-width: 1100px; margin: 0 auto;
    padding: 40px 1.5rem 24px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: stretch;
  }

  /* Welcome pill */
  .gw-pill {
    display: inline-flex; align-items: center; gap: 6px;
    border: 1.5px solid ${SAFFRON}; color: ${SAFFRON};
    border-radius: 999px; padding: 4px 16px;
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.07em;
    text-transform: uppercase; margin-bottom: 14px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .gw-pill i { font-size: 12px; }

  /* Headline */
  .gw-headline {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 2.5rem; font-weight: 700;
    color: #FF8E00; line-height: 1.15; margin-bottom: 14px;
  }

  /* Subtitle */
  .gw-subtitle {
    font-size: 1rem; color: #4A5565; line-height: 1.65;
    margin-bottom: 28px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  /* Feature highlights (desktop left col / mobile bottom) */
  .gw-features { display: flex; flex-direction: column; gap: 14px; }
  .gw-feature { display: flex; align-items: flex-start; gap: 12px; }
  .gw-feature-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    background: #F9FAFB; border: 1px solid #E5E7EB;
    display: flex; align-items: center; justify-content: center;
  }
  .gw-feature-icon i { font-size: 18px; }
  .gw-feature-body {}
  .gw-feature-title {
    font-size: 0.9375rem; font-weight: 700; color: #101828;
    margin-bottom: 2px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .gw-feature-desc {
    font-size: 0.875rem; color: #4A5565; line-height: 1.45;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  /* ── Snippet card (right col) ──────────────────────── */
  .gw-snip-outer {
    border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;
    background: #fff;
  }
  .gw-snip-img {
    background: #F3F4F6; border-bottom: 1px solid #E5E7EB;
    display: flex; align-items: center; justify-content: center;
    height: 180px; overflow: hidden;
  }
  .gw-snip-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gw-snip-img-placeholder i { font-size: 48px; color: ${SAFFRON}; opacity: 0.25; }
  .gw-scroll-hint {
    display: flex; align-items: center; justify-content: flex-end; gap: 4px;
    padding: 4px 14px 0;
    font-size: 0.7rem; color: #4A5565; font-family: 'Inter', system-ui, sans-serif;
  }
  .gw-scroll-hint i { font-size: 11px; }
  .gw-snip-scroll {
    height: 300px; overflow-y: auto;
    scrollbar-width: thin; scrollbar-color: #E5E7EB transparent;
  }
  .gw-snip-scroll::-webkit-scrollbar { width: 4px; }
  .gw-snip-scroll::-webkit-scrollbar-track { background: transparent; }
  .gw-snip-scroll::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
  .gw-snip-body { padding: 14px 18px 18px; }
  .gw-snip-tag {
    display: block; font-size: 0.6875rem; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase; color: ${SAFFRON};
    margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif;
  }
  .gw-snip-hook {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 1.125rem; font-weight: 500; color: #101828;
    line-height: 1.35; margin-bottom: 10px;
  }
  .gw-snip-explanation {
    font-size: 0.9375rem; color: #4A5565; line-height: 1.7; margin-bottom: 12px;
  }
  .gw-snip-divider { height: 1px; background: #E5E7EB; margin: 12px 0; }
  .gw-snip-section-label {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 5px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .gw-snip-key-block {
    border-left: 3px solid ${SAFFRON}; padding: 8px 12px;
    background: #FEF7FF; margin-bottom: 12px; border-radius: 0 6px 6px 0;
  }
  .gw-snip-key-word { font-weight: 700; color: #101828; font-size: 0.9375rem; margin-bottom: 2px; }
  .gw-snip-key-meaning { font-size: 0.875rem; color: #4A5565; line-height: 1.45; }
  .gw-snip-section-text { font-size: 0.875rem; color: #4A5565; line-height: 1.65; margin-bottom: 12px; }
  .gw-snip-citation {
    font-size: 0.75rem; color: #4A5565; font-style: italic;
    border-top: 1px solid #E5E7EB; padding-top: 10px; margin-top: 4px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .gw-snip-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .gw-snip-stars { color: ${SAFFRON}; font-size: 0.875rem; }

  /* Skeleton */
  .gw-skel {
    background: linear-gradient(90deg, #F3F4F6 25%, #FFFFFF 50%, #F3F4F6 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 6px;
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .gw-skel-img  { height: 180px; border-radius: 0; }
  .gw-skel-line { height: 14px; margin: 14px 18px 8px; }
  .gw-skel-long { width: calc(100% - 36px); }
  .gw-skel-med  { width: 55%; }

  /* Swipe link */
  .gw-swipe-btn {
    display: block; width: 100%; text-align: center;
    background: none; border: none; cursor: pointer;
    color: ${HERITAGE}; font-size: 0.9rem; font-weight: 600;
    padding: 10px 0; font-family: 'Inter', system-ui, sans-serif;
  }
  .gw-swipe-btn:hover { text-decoration: underline; }

  /* ── Choices ───────────────────────────────────────── */
  .gw-choices-wrap {
    max-width: 1100px; margin: 0 auto;
    padding: 0 1.5rem 48px;
  }
  .gw-choices-title {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #4A5565;
    margin-bottom: 14px;
  }
  .gw-choices-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
    margin-bottom: 12px;
  }
  .gw-choice-card {
    background: #fff; border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 16px 14px 14px;
    display: flex; flex-direction: column; gap: 6px;
    cursor: pointer; text-align: left;
    border-left: 3px solid var(--card-accent, ${SAFFRON});
    transition: box-shadow 0.15s;
  }
  .gw-choice-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
  .gw-choice-icon { font-size: 1.25rem; color: var(--card-accent, ${SAFFRON}); }
  .gw-choice-title {
    font-size: 0.9375rem; font-weight: 700; color: #101828; line-height: 1.2;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .gw-choice-sub {
    font-size: 0.8125rem; color: #4A5565; line-height: 1.35;
    font-family: 'Inter', system-ui, sans-serif;
  }
  /* Surprise me — full width */
  .gw-surprise-card {
    width: 100%; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 14px 20px; display: flex; align-items: center;
    justify-content: space-between; cursor: pointer;
    border-left: 3px solid ${SAFFRON};
    transition: box-shadow 0.15s;
  }
  .gw-surprise-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
  .gw-surprise-left { display: flex; align-items: center; gap: 12px; }
  .gw-surprise-icon { font-size: 1.25rem; color: ${SAFFRON}; }
  .gw-surprise-title {
    font-size: 0.9375rem; font-weight: 700; color: #101828;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .gw-surprise-sub {
    font-size: 0.8125rem; color: #4A5565;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .gw-surprise-cta {
    display: flex; align-items: center; gap: 6px;
    color: ${SAFFRON}; font-size: 0.875rem; font-weight: 700;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .gw-surprise-cta i { font-size: 20px; }

  /* ── Mobile features section (below surprise me) ───── */
  .gw-mobile-features {
    display: none;
    max-width: 1100px; margin: 0 auto;
    padding: 0 1.5rem 40px;
  }
  .gw-mobile-features-title {
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #4A5565;
    margin-bottom: 12px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* ── Responsive ────────────────────────────────────── */
  @media (max-width: 1024px) {
    .gw-hero {
      grid-template-columns: 1fr;
      padding: 24px 1rem 16px;
      gap: 20px;
    }
    .gw-headline { font-size: 1.75rem; }
    .gw-features { display: none; }
    .gw-snip-scroll { height: 220px; }
    .gw-choices-wrap { padding: 0 1rem 24px; }
    .gw-choices-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
    .gw-mobile-features { display: block; }
  }
  @media (max-width: 480px) {
    .gw-headline { font-size: 1.5rem; }
    .gw-choice-card { padding: 12px 10px 10px; }
  }
`;

export default function GatewayPage({
  settings,
  onCourseFlow,
  onExploreInterests,
  onPlayMostLiked,
  onPlayMostSaved,
  onSurpriseMe,
  // commonProps passed through from App.jsx
  onHome, onDashboard, onLikes, onBookmarks, onDiscover, onForYou, onAllCourses,
  onAdmin, onEditor, onResume, onOpenSettings, isAdmin, isCreator, userEditorialRole,
  activePage, onSaveSettings, languages, bookmarks, onToggleBookmark,
}) {
  const [snippet,     setSnippet]     = useState(null);
  const [asset,       setAsset]       = useState(null);
  const [translation, setTranslation] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [snippetPool, setSnippetPool] = useState([]);

  useEffect(() => { loadInitialData(); }, []);

  async function loadInitialData() {
    // Try editorially curated featured_snippets first
    const featured = await supabase(
      "featured_snippets",
      "?select=display_order,snippet_id,snippet_core(snippet_id,asset_id,difficulty_level,like_count)&order=display_order.asc&limit=10"
    );
    const featList = Array.isArray(featured) ? featured.sort((a, b) => a.display_order - b.display_order) : [];

    if (featList.length > 0) {
      const heroCore = featList[0].snippet_core;
      const pool = featList.slice(1).map(f => f.snippet_id).filter(Boolean);
      setSnippetPool(pool);
      if (heroCore) await loadSnippetDetail(heroCore);
    } else {
      // Fallback: top snippets by like_count
      const [topSnippets, allIds] = await Promise.all([
        supabase("snippet_core", "?select=snippet_id,asset_id,difficulty_level,like_count&order=like_count.desc&limit=10"),
        supabase("snippet_core", "?select=snippet_id&order=like_count.desc&limit=60"),
      ]);
      const ids = (allIds || []).map(s => s.snippet_id);
      const pool = ids.slice(1);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      setSnippetPool(pool);
      for (const candidate of (topSnippets || [])) {
        const hasData = await loadSnippetDetail(candidate);
        if (hasData) break;
      }
    }
    setLoading(false);
  }

  async function loadSnippetDetail(core) {
    const [transData, assetData] = await Promise.all([
      supabase("snippet_translations", `?select=hook,explanation,key_term,key_term_meaning,life_connection,quiz_recap,source_citation,language&snippet_id=eq.${core.snippet_id}`),
      core.asset_id
        ? supabase("asset_library", `?select=file_path,alt_text&asset_id=eq.${core.asset_id}&limit=1`)
        : Promise.resolve([]),
    ]);
    // Pick best translation: user lang → eng → first available (mirrors SnippetPlayer logic)
    const list = Array.isArray(transData) ? transData : [];
    const byLang = {};
    list.forEach(t => { byLang[t.language] = t; });
    const trans = byLang[DEFAULT_LANG_CODE] || Object.values(byLang)[0] || null;
    setSnippet(core);
    setTranslation(trans);
    setAsset(Array.isArray(assetData) && assetData.length > 0 ? assetData[0] : null);
    return trans !== null;
  }

  function showAnother() {
    const ids = [snippet?.snippet_id, ...snippetPool].filter(Boolean);
    onSurpriseMe(ids);
  }

  async function handleMostLiked() {
    const data = await supabase("snippet_core", "?select=snippet_id&order=like_count.desc&limit=20&like_count=gt.0");
    const ids = (Array.isArray(data) ? data : []).map(s => s.snippet_id);
    onPlayMostLiked(ids);
  }

  async function handleMostSaved() {
    const data = await supabase("bookmarks", "?select=content_id&content_type=eq.snippet");
    const counts = {};
    if (Array.isArray(data)) {
      data.forEach(r => { counts[r.content_id] = (counts[r.content_id] || 0) + 1; });
    }
    const ids = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);
    onPlayMostSaved(ids.length > 0 ? ids : []);
  }

  async function handleSurpriseMe() {
    const data = await supabase("snippet_core", "?select=snippet_id&limit=60");
    const ids = (Array.isArray(data) ? data : []).map(s => s.snippet_id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    onSurpriseMe(ids.slice(0, 20));
  }

  const CHOICE_ACTIONS = [onCourseFlow, onExploreInterests, handleMostLiked, handleMostSaved];

  return (
    <>
      <style>{globalStyles + styles}</style>
      <div className="gw-wrap">

        <PageHeader
          activePage={activePage || "home"}
          onHome={onHome}
          onOpenSettings={onOpenSettings}
          onDashboard={onDashboard}
          onLikes={onLikes}
          onBookmarks={onBookmarks}
          onDiscover={onDiscover}
          onAdmin={onAdmin}
          onEditor={onEditor}
          onResume={onResume}
          isAdmin={isAdmin}
          isCreator={isCreator}
          userEditorialRole={userEditorialRole}
          onSaveSettings={onSaveSettings}
          languages={languages || []}
          settings={settings}
          navLinks={[
            { label: "Home",        onClick: onHome         },
            { label: "Courses", onClick: onAllCourses   },
            { label: "For You",     onClick: onForYou       },
            { label: "Dashboard",   onClick: onDashboard    },
            { label: "Discover",    onClick: onDiscover     },
          ]}
        />

        {/* ── Hero ── */}
        <div className="gw-hero">

          {/* Left col: welcome + headline + subtitle + desktop features */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="gw-pill">
              <i className="ti ti-sparkles" aria-hidden="true" />
              {GATEWAY.welcomePill}
            </div>
            <h1 className="gw-headline">{GATEWAY.heroHeadline}</h1>
            <p className="gw-subtitle">{GATEWAY.heroSubtitle}</p>

            <div className="gw-features" style={{ marginTop: "auto", paddingTop: "20px" }}>
              {GATEWAY.features.map((f, i) => (
                <div className="gw-feature" key={i}>
                  <div className="gw-feature-icon" style={{ color: [SAFFRON, HERITAGE, GREEN][i] }}>
                    <i className={`ti ${f.icon}`} aria-hidden="true" />
                  </div>
                  <div className="gw-feature-body">
                    <div className="gw-feature-title">{f.title}</div>
                    <div className="gw-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right col: scrollable snippet */}
          <div>
            <div className="gw-snip-outer">
              {loading ? (
                <>
                  <div className="gw-skel gw-skel-img" />
                  <div className="gw-skel gw-skel-line gw-skel-long" />
                  <div className="gw-skel gw-skel-line gw-skel-med" />
                  <div style={{ height: 24 }} />
                </>
              ) : (
                <>
                  <div className="gw-snip-img">
                    {asset
                      ? <img src={asset.file_path} alt={asset.alt_text || ""} onError={e => { e.target.style.display = "none"; }} />
                      : <div className="gw-snip-img-placeholder"><i className="ti ti-photo" aria-hidden="true" /></div>
                    }
                  </div>
                  <div className="gw-scroll-hint">
                    <i className="ti ti-arrows-vertical" aria-hidden="true" />
                    scroll inside
                  </div>
                  <div className="gw-snip-scroll">
                    <div className="gw-snip-body">
                      <span className="gw-snip-tag">
                        <i className="ti ti-sparkles" aria-hidden="true" /> {GATEWAY.featuredTag}
                      </span>
                      <p className="gw-snip-hook">{translation?.hook || FALLBACK.snippetHook}</p>

                      {translation?.explanation && (
                        <p className="gw-snip-explanation">{translation.explanation}</p>
                      )}

                      {(translation?.key_term || translation?.life_connection || translation?.quiz_recap) && (
                        <div className="gw-snip-divider" />
                      )}

                      {translation?.key_term && (
                        <div>
                          <div className="gw-snip-section-label">Key Term</div>
                          <div className="gw-snip-key-block">
                            <div className="gw-snip-key-word">{translation.key_term}</div>
                            {translation.key_term_meaning && (
                              <div className="gw-snip-key-meaning">{translation.key_term_meaning}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {translation?.life_connection && (
                        <div>
                          <div className="gw-snip-section-label">Life Connection</div>
                          <p className="gw-snip-section-text">{translation.life_connection}</p>
                        </div>
                      )}

                      {translation?.quiz_recap && (
                        <div>
                          <div className="gw-snip-section-label">Refresher Questions</div>
                          <p className="gw-snip-section-text">{translation.quiz_recap}</p>
                        </div>
                      )}

                      {translation?.source_citation && (
                        <div className="gw-snip-citation">{translation.source_citation}</div>
                      )}

                      {snippet?.difficulty_level > 0 && (
                        <div className="gw-snip-meta">
                          <span className="gw-snip-stars">{DIFFICULTY_STARS[snippet.difficulty_level] || ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {!loading && snippetPool.length > 0 && (
              <button className="gw-swipe-btn" onClick={showAnother}>
                {GATEWAY.swipeMore}
              </button>
            )}
          </div>
        </div>

        {/* ── Choice cards ── */}
        <div className="gw-choices-wrap">
          <div className="gw-choices-title">{GATEWAY.exploreTitle}</div>

          <div className="gw-choices-grid">
            {GATEWAY.choices.map((c, i) => (
              <button
                key={i}
                className="gw-choice-card"
                onClick={CHOICE_ACTIONS[i]}
                style={{ "--card-accent": ACCENT_MAP[c.accentVar] || SAFFRON }}
              >
                <i className={`ti ${c.icon} gw-choice-icon`} aria-hidden="true" />
                <span className="gw-choice-title">{c.title}</span>
                <span className="gw-choice-sub">{c.sub}</span>
              </button>
            ))}
          </div>

          <button className="gw-surprise-card" onClick={handleSurpriseMe}>
            <div className="gw-surprise-left">
              <i className="ti ti-dice-3 gw-surprise-icon" aria-hidden="true" />
              <div>
                <div className="gw-surprise-title">{GATEWAY.surpriseTitle}</div>
                <div className="gw-surprise-sub">{GATEWAY.surpriseSub}</div>
              </div>
            </div>
            <div className="gw-surprise-cta">
              <i className="ti ti-arrow-right" aria-hidden="true" />
              {GATEWAY.surpriseCta}
            </div>
          </button>
        </div>

        {/* ── Feature highlights — mobile only (below surprise me) ── */}
        <div className="gw-mobile-features">
          <div className="gw-mobile-features-title">Why IndiYatra?</div>
          <div className="gw-features" style={{ display: "flex" }}>
            {GATEWAY.features.map((f, i) => (
              <div className="gw-feature" key={i}>
                <div className="gw-feature-icon" style={{ color: [SAFFRON, HERITAGE, GREEN][i] }}>
                  <i className={`ti ${f.icon}`} aria-hidden="true" />
                </div>
                <div className="gw-feature-body">
                  <div className="gw-feature-title">{f.title}</div>
                  <div className="gw-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
