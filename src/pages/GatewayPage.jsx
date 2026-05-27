import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, logoUrl, DEFAULT_LANG_CODE, DIFFICULTY_STARS } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { globalStyles } from "../styles/global";

const styles = `
  .gw-wrap { min-height: 100vh; background: #F8F8F6; display: flex; flex-direction: column; align-items: center; }
  .gw-header {
    width: 100%; max-width: 520px; padding: 14px 20px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .gw-wordmark { font-family: 'Alumni Sans', sans-serif; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.01em; }
  .gw-indi  { color: #FF8E00; }
  .gw-yatra { color: #00509E; }
  .gw-signin-btn {
    border: 1.5px solid #FF8E00; color: #FF8E00; background: none;
    border-radius: 20px; padding: 6px 16px; font-size: 0.875rem;
    font-weight: 600; cursor: pointer; font-family: 'Source Sans 3', sans-serif;
    transition: background 0.15s, color 0.15s;
  }
  .gw-signin-btn:hover { background: #FF8E00; color: #fff; }

  /* Hero / Snippet preview */
  .gw-hero { width: 100%; max-width: 520px; padding: 0 16px 8px; }
  .gw-pill {
    display: inline-flex; align-items: center; gap: 6px;
    background: #FFF3E0; color: #FF8E00; border-radius: 20px;
    padding: 4px 14px; font-size: 0.8125rem; font-weight: 700;
    letter-spacing: 0.03em; margin-bottom: 12px;
    font-family: 'Source Sans 3', sans-serif;
  }
  .gw-snip-card {
    background: #fff; border-radius: 14px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.09); overflow: hidden;
  }
  .gw-snip-img { overflow: hidden; background: #f0ebe0; }
  .gw-snip-img img { width: 100%; height: auto; display: block; }
  .gw-snip-img-placeholder {
    min-height: 160px;
    display: flex; align-items: center; justify-content: center;
    background: white;
  }
  .gw-placeholder-icon { font-size: 3rem; color: #FF8E00; opacity: 0.4; }
  .gw-snip-body { padding: 16px 18px 18px; text-align: left; }
  .gw-hook {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem;
    font-weight: 700; color: #0A0A0A; line-height: 1.4; margin: 0 0 12px;
    text-align: left;
  }
  .gw-key-term {
    display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap;
    background: #FFFDF5; border-radius: 10px; padding: 10px 12px;
    border-left: 3px solid #FF8E00; margin-bottom: 10px;
  }
  .gw-key-term-word { font-weight: 700; color: #FF8E00; font-size: 0.9375rem; }
  .gw-key-term-sep  { color: #aaa; font-size: 0.9375rem; }
  .gw-key-term-meaning { color: #333; font-size: 0.9375rem; line-height: 1.45; flex: 1; min-width: 120px; }
  .gw-explanation {
    font-size: 0.9375rem; color: #333; line-height: 1.6;
    margin: 0 0 4px; font-family: 'Source Sans 3', sans-serif;
  }
  .gw-divider { height: 1px; background: #f0ebe0; margin: 14px 0; }
  .gw-section { margin-bottom: 14px; }
  .gw-section-label {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #FF8E00; margin-bottom: 5px;
    font-family: 'Source Sans 3', sans-serif;
  }
  .gw-kt-word   { font-weight: 700; color: #0A0A0A; font-size: 1rem; margin-bottom: 3px; }
  .gw-kt-meaning { font-size: 0.9375rem; color: #555; line-height: 1.5; }
  .gw-section-text { font-size: 0.9375rem; color: #444; line-height: 1.6; font-family: 'Source Sans 3', sans-serif; }
  .gw-citation  { font-size: 0.75rem; color: #aaa; border-top: 1px solid #f0ebe0; padding-top: 10px; margin-top: 4px; font-style: italic; }
  .gw-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .gw-stars { color: #D4A017; font-size: 0.875rem; }

  /* Skeleton */
  .gw-snip-loading { pointer-events: none; }
  .gw-skel {
    background: linear-gradient(90deg, #ede5d8 25%, #f7f0e6 50%, #ede5d8 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 6px;
  }
  .gw-skel-img  { height: 200px; border-radius: 0; }
  .gw-skel-line { height: 16px; margin: 16px 18px 8px; }
  .gw-skel-long { width: calc(100% - 36px); }
  .gw-skel-med  { width: 55%; }

  /* Show another */
  .gw-another-btn {
    background: none; border: none; cursor: pointer;
    color: #00509E; font-size: 0.9375rem; font-weight: 600;
    padding: 10px 0 4px; font-family: 'Source Sans 3', sans-serif;
    opacity: 0.85; display: block; margin: 0 auto;
  }
  .gw-another-btn:hover { opacity: 1; text-decoration: underline; }

  /* Choices */
  .gw-choices-wrap { width: 100%; max-width: 520px; padding: 10px 16px 32px; }
  .gw-choices-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.125rem;
    font-weight: 700; color: #0A0A0A; margin-bottom: 12px; text-align: center;
    letter-spacing: 0.01em;
  }
  .gw-choices-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .gw-choice-card {
    background: #fff; border: none; border-radius: 14px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    padding: 14px 14px 12px;
    display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
    cursor: pointer; text-align: left;
    border-left: 4px solid var(--card-accent, #FF8E00);
    transition: box-shadow 0.15s, transform 0.1s;
    font-family: 'Source Sans 3', sans-serif;
  }
  .gw-choice-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.13); transform: translateY(-1px); }
  .gw-choice-card:active { transform: translateY(0); }
  .gw-choice-full { grid-column: 1 / -1; }
  .gw-choice-icon  { font-size: 1.375rem; margin-bottom: 4px; }
  .gw-choice-title { font-size: 0.9375rem; font-weight: 700; color: #0A0A0A; line-height: 1.2; }
  .gw-choice-sub   { font-size: 0.8125rem; color: #6B6B6B; line-height: 1.3; margin-top: 2px; }

  @media (max-width: 400px) {
    .gw-hook { font-size: 1.125rem; }
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
}) {
  const { onSignIn } = useAuthContext();
  const [snippet,     setSnippet]     = useState(null);
  const [asset,       setAsset]       = useState(null);
  const [translation, setTranslation] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [snippetPool, setSnippetPool] = useState([]);

  useEffect(() => { loadInitialData(); }, []);

  async function loadInitialData() {
    const [topSnippets, allIds] = await Promise.all([
      supabase("snippet_core", "?select=snippet_id,asset_id,difficulty_level,like_count&order=like_count.desc&limit=1"),
      supabase("snippet_core", "?select=snippet_id&order=like_count.desc&limit=60"),
    ]);
    const ids = (allIds || []).map(s => s.snippet_id);
    const pool = ids.slice(1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setSnippetPool(pool);
    if (topSnippets && topSnippets.length > 0) {
      await loadSnippetDetail(topSnippets[0]);
    }
    setLoading(false);
  }

  async function loadSnippetDetail(core) {
    const [transData, assetData] = await Promise.all([
      supabase("snippet_translations", `?select=hook,explanation,key_term,key_term_meaning,life_connection,quiz_recap,source_citation&snippet_id=eq.${core.snippet_id}&language=eq.eng&limit=1`),
      core.asset_id
        ? supabase("asset_library", `?select=file_path,alt_text&asset_id=eq.${core.asset_id}&limit=1`)
        : Promise.resolve([]),
    ]);
    const trans = Array.isArray(transData) && transData.length > 0 ? transData[0] : null;
    setSnippet(core);
    setTranslation(trans);
    setAsset(Array.isArray(assetData) && assetData.length > 0 ? assetData[0] : null);
  }

  function showAnother() {
    // Launch the full swipe playlist starting from the current snippet
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

  const CHOICES = [
    { icon: "📚", title: "Follow a Course",        sub: "Structured learning, step by step",   action: onCourseFlow,        color: HERITAGE  },
    { icon: "🧭", title: "Explore Your Interests", sub: "Browse themes and topics",             action: onExploreInterests,  color: "#7B2D8B" },
    { icon: "❤️",  title: "Most Liked",             sub: "Community’s favourite snippets",  action: handleMostLiked,     color: "#E53935" },
    { icon: "🔖", title: "Most Saved",             sub: "Most bookmarked by learners",          action: handleMostSaved,     color: "#D4A017" },
    { icon: "🎲", title: "Surprise Me",            sub: "Random snippets, keep exploring",     action: handleSurpriseMe,    color: SAFFRON   },
  ];

  return (
    <>
      <style>{globalStyles + styles}</style>
      <div className="gw-wrap">

        <div className="gw-header">
          <div className="gw-wordmark">
            <span className="gw-indi">Indi</span><span className="gw-yatra">Yatra</span>
          </div>
          <button className="gw-signin-btn" onClick={() => onSignIn?.()}>Sign In</button>
        </div>

        <div className="gw-hero">
          <div className="gw-pill">✶ Featured Snippet</div>

          {loading ? (
            <div className="gw-snip-card gw-snip-loading">
              <div className="gw-skel gw-skel-img" />
              <div className="gw-skel gw-skel-line gw-skel-long" />
              <div className="gw-skel gw-skel-line gw-skel-med" />
              <div style={{ height: 24 }} />
            </div>
          ) : (
            <div className="gw-snip-card">
              <div className={"gw-snip-img" + (asset ? "" : " gw-snip-img-placeholder")}>
                {asset
                  ? <img src={asset.file_path} alt={asset.alt_text || ""} onError={e => { e.target.style.display = "none"; }} />
                  : <span className="gw-placeholder-icon">✶</span>
                }
              </div>
              <div className="gw-snip-body">
                <p className="gw-hook">{translation?.hook || "Discover the stories of Bharat."}</p>

                {translation?.explanation && (
                  <p className="gw-explanation">{translation.explanation}</p>
                )}

                {(translation?.key_term || translation?.life_connection || translation?.quiz_recap) && (
                  <div className="gw-divider" />
                )}

                {translation?.key_term && (
                  <div className="gw-section">
                    <div className="gw-section-label">Key Term</div>
                    <div className="gw-kt-word">{translation.key_term}</div>
                    {translation.key_term_meaning && (
                      <div className="gw-kt-meaning">{translation.key_term_meaning}</div>
                    )}
                  </div>
                )}

                {translation?.life_connection && (
                  <div className="gw-section">
                    <div className="gw-section-label">Life Connection</div>
                    <div className="gw-section-text">{translation.life_connection}</div>
                  </div>
                )}

                {translation?.quiz_recap && (
                  <div className="gw-section">
                    <div className="gw-section-label">Refresher Questions</div>
                    <div className="gw-section-text">{translation.quiz_recap}</div>
                  </div>
                )}

                {translation?.source_citation && (
                  <div className="gw-citation">{translation.source_citation}</div>
                )}

                {snippet?.difficulty_level > 0 && (
                  <div className="gw-meta">
                    <span className="gw-stars">{DIFFICULTY_STARS[snippet.difficulty_level] || ""}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && snippetPool.length > 0 && (
            <button className="gw-another-btn" onClick={showAnother}>Swipe through more snippets →</button>
          )}
        </div>

        <div className="gw-choices-wrap">
          <div className="gw-choices-title">How would you like to explore?</div>
          <div className="gw-choices-grid">
            {CHOICES.map((c, i) => (
              <button
                key={i}
                className={"gw-choice-card" + (i === CHOICES.length - 1 ? " gw-choice-full" : "")}
                onClick={c.action}
                style={{ "--card-accent": c.color }}
              >
                <span className="gw-choice-icon">{c.icon}</span>
                <span className="gw-choice-title">{c.title}</span>
                <span className="gw-choice-sub">{c.sub}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
