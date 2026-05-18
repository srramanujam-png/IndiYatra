import { useState, useEffect } from "react";
import { SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { supabaseClient } from "../lib/auth";
import { useAuthContext } from "../contexts/AuthContext";

const PURPLE = "#7B2D8B";
const GOLD   = "#D4A017";

const styles = `
  /* ── Layout ── */
  .dash-wrap { max-width: 860px; margin: 0 auto; padding: 0 1.5rem 100px; }

  /* ── Course chip ── */
  .dash-course-chip {
    display: inline-block; padding: 3px 14px; border-radius: 999px;
    background: ${SAFFRON}15; color: ${SAFFRON}; font-size: 0.75rem;
    font-weight: 700; letter-spacing: 0.04em; margin-bottom: 10px;
  }

  /* ── Welcome title ── */
  .dash-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 2.125rem; font-weight: 800;
    color: #1a1a2e; margin-bottom: 18px; line-height: 1.1;
  }

  /* ── Action bar ── */
  .dash-action-bar {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    background: white; border: 1px solid #E8D5B0; border-radius: 14px;
    padding: 12px 18px; margin-bottom: 28px;
  }
  .dash-resume-btn {
    display: flex; align-items: center; gap: 8px;
    background: ${SAFFRON}; color: white; border: none; border-radius: 999px;
    padding: 9px 22px; font-family: 'Alumni Sans', sans-serif;
    font-size: 0.9375rem; font-weight: 700; cursor: pointer;
    transition: box-shadow 0.2s; flex-shrink: 0;
  }
  .dash-resume-btn:hover { box-shadow: 0 4px 16px ${SAFFRON}55; }
  .dash-action-sep { width: 1px; height: 28px; background: #e8d5b0; flex-shrink: 0; }
  .dash-quick-pills { display: flex; gap: 8px; flex-wrap: wrap; }
  .dash-pill-wrap { position: relative; }
  .dash-pill {
    display: flex; align-items: center; gap: 6px;
    border: 1px solid #e0d4bc; border-radius: 999px; padding: 5px 12px;
    font-size: 0.75rem; color: #666; background: #fafaf8; cursor: pointer;
    transition: border-color 0.2s, color 0.2s; white-space: nowrap;
  }
  .dash-pill:hover, .dash-pill.open { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .dash-dropdown-backdrop { position: fixed; inset: 0; z-index: 199; }
  .dash-dropdown {
    position: absolute; top: calc(100% + 6px); left: 0; z-index: 200;
    background: white; border: 1px solid #E8D5B0; border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 150px;
    overflow: hidden; padding: 4px 0;
  }
  .dash-dropdown-item {
    padding: 9px 16px; font-size: 0.8125rem; color: #444; cursor: pointer;
    transition: background 0.15s; display: flex; align-items: center; gap: 8px;
  }
  .dash-dropdown-item:hover { background: ${SAFFRON}12; }
  .dash-dropdown-item.active { color: ${SAFFRON}; font-weight: 700; }

  /* ── Stat cards grid ── */
  .dash-stats {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 12px; margin-bottom: 20px;
  }
  .stat-card {
    background: white; border-radius: 14px; border: 1px solid #E8D5B0;
    padding: 16px 14px; position: relative; overflow: hidden;
    transition: transform 0.18s, box-shadow 0.18s;
  }
  .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .stat-card-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .stat-icon { font-size: 1.25rem; margin-bottom: 8px; line-height: 1; }
  .stat-label {
    font-size: 0.625rem; font-weight: 700; letter-spacing: 0.07em;
    text-transform: uppercase; color: #bbb; margin-bottom: 5px;
  }
  .stat-value {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.625rem;
    font-weight: 800; line-height: 1; margin-bottom: 4px;
  }
  .stat-sub  { font-size: 0.6875rem; color: #aaa; line-height: 1.3; }
  .stat-link { font-size: 0.6875rem; color: ${HERITAGE}; cursor: pointer; }
  .stat-link:hover { text-decoration: underline; }

  /* ── Section card ── */
  .dash-section {
    background: white; border-radius: 16px; border: 1px solid #E8D5B0;
    padding: 22px 24px; margin-bottom: 20px;
    box-shadow: 0 2px 10px rgba(255,142,0,0.04);
  }
  .dash-section-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 18px;
  }
  .dash-section-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.3125rem;
    font-weight: 700; color: ${HERITAGE};
  }
  .dash-section-meta { font-size: 0.75rem; color: #aaa; font-weight: 600; }

  /* ── Streak heatmap ── */
  .streak-grid { display: flex; gap: 3px; flex-wrap: wrap; }
  .streak-cell { width: 13px; height: 13px; border-radius: 3px; flex-shrink: 0; }
  .streak-legend {
    display: flex; align-items: center; gap: 6px;
    margin-top: 10px; font-size: 0.6875rem; color: #bbb;
  }
  .streak-legend-cell { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
  .streak-summary { font-size: 0.8125rem; color: #777; margin-top: 8px; }
  .streak-summary strong { color: #1a1a2e; }

  /* ── Course progress table ── */
  .prog-table { width: 100%; border-collapse: collapse; }
  .prog-table th {
    font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #bbb; padding: 0 0 10px; text-align: left;
  }
  .prog-table th:not(:first-child) { text-align: center; }
  .prog-table td { padding: 10px 0; border-top: 1px solid #f5ede0; vertical-align: middle; }
  .prog-theme-name { font-size: 0.875rem; font-weight: 700; color: ${SAFFRON}; }
  .prog-bar-wrap { display: flex; align-items: center; gap: 6px; justify-content: center; }
  .prog-bar { height: 5px; width: 80px; background: #f0e8d8; border-radius: 3px; overflow: hidden; flex-shrink: 0; }
  .prog-bar-fill { height: 100%; border-radius: 3px; }
  .prog-pct { font-size: 0.6875rem; font-weight: 700; min-width: 28px; text-align: right; }
  .prog-counts { font-size: 0.625rem; color: #ccc; text-align: right; }

  /* ── Activity table ── */
  .act-table { width: 100%; border-collapse: collapse; }
  .act-table th {
    font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #bbb; padding: 0 0 10px;
    text-align: right;
  }
  .act-table th:first-child { text-align: left; }
  .act-table td {
    padding: 9px 0; border-top: 1px solid #f5ede0;
    font-size: 0.8125rem; text-align: right; color: #777;
  }
  .act-table td:first-child { text-align: left; }
  .act-day   { font-weight: 700; color: #1a1a2e; }
  .act-today { color: ${SAFFRON}; }
  .act-date  { font-size: 0.6875rem; color: #bbb; margin-left: 5px; }
  .act-total td { font-weight: 700; color: #1a1a2e; border-top: 2px solid #e8d5b0 !important; }
  .act-nonzero { font-weight: 700; color: ${HERITAGE} !important; }

  /* ── Badges ── */
  .badge-level-label {
    font-size: 0.625rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #bbb; margin-bottom: 10px;
  }
  .badge-theme-group { margin-bottom: 16px; }
  .badge-theme-label {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 10px;
  }
  .badge-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .badge-item { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 52px; }
  .badge-circle {
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.0625rem; transition: transform 0.18s; cursor: default;
  }
  .badge-circle.earned {
    border: 2px solid ${SAFFRON}; background: ${SAFFRON}14;
  }
  .badge-circle.earned:hover { transform: scale(1.12); }
  .badge-circle.locked {
    border: 2px solid #e0d4bc; background: #fafaf8; opacity: 0.45;
  }
  .badge-name { font-size: 0.5625rem; color: #aaa; text-align: center; line-height: 1.3; }

  /* ── Share card ── */
  .share-inner { display: flex; gap: 24px; align-items: flex-start; }
  .share-preview {
    flex: 1; min-width: 0;
    background: linear-gradient(135deg, ${SAFFRON}10, ${HERITAGE}08);
    border: 1.5px dashed ${SAFFRON}44; border-radius: 14px; padding: 18px 22px;
  }
  .share-preview-logo {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.125rem; font-weight: 800;
    color: ${HERITAGE}; margin-bottom: 14px;
  }
  .share-stat-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 12px; }
  .share-stat { text-align: center; }
  .share-stat-val {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.625rem;
    font-weight: 800; line-height: 1;
  }
  .share-stat-lbl { font-size: 0.625rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
  .share-footer-txt { font-size: 0.6875rem; color: #bbb; margin-top: 4px; }
  .share-actions { display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; min-width: 140px; }
  .share-btn {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    border-radius: 999px; padding: 9px 18px;
    font-family: 'Alumni Sans', sans-serif; font-size: 0.8125rem; font-weight: 700;
    cursor: not-allowed; opacity: 0.55; white-space: nowrap;
    border: 1.5px solid; background: transparent; transition: opacity 0.2s;
  }
  .share-btn-wa   { border-color: #25D366; color: #25D366; }
  .share-btn-tw   { border-color: #1DA1F2; color: #1DA1F2; }
  .share-btn-copy { border-color: ${HERITAGE}; color: ${HERITAGE}; }
  .share-coming { font-size: 0.625rem; color: #bbb; text-align: center; font-style: italic; margin-top: 2px; }


  /* ── Languages ── */
  .lang-chips { display: flex; gap: 10px; flex-wrap: wrap; }
  .lang-chip {
    display: flex; align-items: center; gap: 12px;
    background: #fafaf8; border: 1px solid #E8D5B0;
    border-radius: 12px; padding: 10px 18px;
    transition: border-color 0.2s, transform 0.18s;
  }
  .lang-chip:hover { border-color: ${HERITAGE}; transform: translateY(-2px); }
  .lang-chip-flag { font-size: 1.25rem; line-height: 1; }
  .lang-chip-name {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.0625rem;
    font-weight: 700; color: #1a1a2e;
  }
  .lang-chip-count {
    font-size: 0.6875rem; font-weight: 700; padding: 2px 9px;
    border-radius: 999px; background: ${HERITAGE}15;
    color: ${HERITAGE}; white-space: nowrap;
  }
  .lang-zero { opacity: 0.38; }
  .lang-note { font-size: 0.75rem; color: #bbb; margin-top: 12px; font-style: italic; }
  /* ── Responsive ── */
  @media (max-width: 768px) {
    .dash-wrap   { padding: 0 1rem 80px; }
    .dash-section { padding: 16px; }
    .dash-stats  { grid-template-columns: repeat(3, 1fr); }
    .share-inner { flex-direction: column; }
    .prog-bar    { width: 56px; }
  }
  @media (max-width: 480px) {
    .dash-stats  { grid-template-columns: repeat(2, 1fr); }
    .dash-title  { font-size: 1.75rem; }
    .stat-value  { font-size: 1.375rem; }
  }
`;

// ─── Data helpers ─────────────────────────────────────────────────────────────
function pct(done, total) { return total > 0 ? Math.round((done / total) * 100) : 0; }

function streakColor(level) {
  if (level === 0) return "#f0e8d8";
  if (level === 1) return SAFFRON + "55";
  if (level === 2) return SAFFRON + "99";
  return SAFFRON;
}

/**
 * Builds a 60-element array (index 0 = 60 days ago, 59 = today)
 * of activity levels 0–3 from lesson_completions rows.
 */
function buildStreakFromCompletions(completions) {
  const counts = {};
  const now = new Date();
  completions.forEach(c => {
    if (!c.completed_at) return;
    const diffDays = Math.floor((now - new Date(c.completed_at)) / 86400000);
    if (diffDays >= 0 && diffDays < 60) {
      const i = 59 - diffDays;
      counts[i] = (counts[i] || 0) + 1;
    }
  });
  return Array.from({ length: 60 }, (_, i) => {
    const n = counts[i] || 0;
    if (n === 0) return 0;
    if (n <= 2)  return 1;
    if (n <= 5)  return 2;
    return 3;
  });
}

/** Returns last-7-days activity rows derived from lesson_completions. */
function buildActivityFromCompletions(completions) {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const rows    = completions.filter(
      c => c.completed_at && c.completed_at.slice(0, 10) === dateStr
    );
    const label = i === 0 ? "Today"
      : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    return {
      day:     label,
      date:    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      lessons: rows.length,
      dharma:  rows.reduce((s, c) => s + (c.points_earned || 0), 0),
      today:   i === 0,
    };
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage({ course, settings, onBack, onOpenSettings, onResume, languages = [], onSaveSettings, onLikes }) {
  const auth    = useAuthContext();
  const user    = auth?.user;
  const profile = auth?.profile;

  const [completions,    setCompletions]    = useState([]);
  const [lessonProgress, setLessonProgress] = useState([]);
  const [totalLessons,   setTotalLessons]   = useState(0);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [likesCount,     setLikesCount]     = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch this user's completions + in-progress lesson positions
        if (user && !user.is_anonymous) {
          const [{ data: compData }, { data: progData }, { count: likesTotal }] = await Promise.all([
            supabaseClient
              .from("lesson_completions")
              .select("lesson_id, points_earned, completed_at, snippet_count")
              .eq("profile_id", user.id),
            supabaseClient
              .from("lesson_progress")
              .select("lesson_id, snippet_index")
              .eq("profile_id", user.id),
            supabaseClient
              .from("snippet_likes")
              .select("*", { count: "exact", head: true })
              .eq("profile_id", user.id),
          ]);
          setCompletions(compData || []);
          setLessonProgress(progData || []);
          setLikesCount(likesTotal || 0);
        }
        // Fetch total lesson count (public table)
        const { count } = await supabaseClient
          .from("lessons")
          .select("*", { count: "exact", head: true });
        setTotalLessons(count || 0);
      } catch (e) {
        console.warn("DashboardPage fetchData:", e);
      }
    }
    fetchData();
  }, [user?.id]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const displayName      = profile?.display_name
    || (user?.email ? user.email.split("@")[0] : "Traveller");
  const totalDharma      = completions.reduce((s, c) => s + (c.points_earned || 0), 0);
  const lessonsCompleted = completions.length;
  // Snippets from fully completed lessons + snippets viewed in any in-progress lesson
  const snippetsViewed   = completions.reduce((s, c) => s + (c.snippet_count || 0), 0)
                         + lessonProgress.reduce((s, p) => s + (p.snippet_index + 1), 0);
  const streakData       = buildStreakFromCompletions(completions);
  const activityData     = buildActivityFromCompletions(completions);

  const activeDays = streakData.filter(l => l > 0).length;
  let bestStreak = 0, cur = 0;
  for (const l of streakData) {
    if (l > 0) { cur++; if (cur > bestStreak) bestStreak = cur; } else { cur = 0; }
  }

  const STATS = [
    {
      key: "dharma",  icon: "✦",  label: "Dharma Points",
      value: String(totalDharma), sub: null, accent: SAFFRON,
    },
    {
      key: "lessons", icon: "📖", label: "Lessons Completed",
      value: totalLessons ? `${lessonsCompleted}/${totalLessons}` : String(lessonsCompleted),
      sub: null, accent: GREEN,
    },
    { key: "badges",    icon: "🏆", label: "Badges Earned",   value: "—", sub: "Coming soon", accent: GOLD    },
    { key: "snippets",  icon: "📚", label: "Snippets Viewed", value: String(snippetsViewed), sub: null, accent: HERITAGE },
    { key: "bookmarks", icon: "♥",  label: "Snippets Liked",  value: likesCount !== null ? likesCount.toLocaleString() : "—", sub: likesCount !== null ? "snippets liked" : "—", accent: PURPLE },
  ];

  const FONT_OPTIONS = [
    { key: 'sm', label: 'Small' },
    { key: 'md', label: 'Medium' },
    { key: 'lg', label: 'Large' },
  ];
  function applySettings(patch) {
    if (!onSaveSettings) return;
    const next = { ...settings, ...patch };
    const sizes = { sm: '13px', md: '16px', lg: '19px' };
    document.body.dataset.fs = next.fontSize;
    document.documentElement.style.fontSize = sizes[next.fontSize] || '16px';
    onSaveSettings(next);
    setActiveDropdown(null);
  }

  return (
    <>
      <style>{globalStyles + styles}</style>
      <PageHeader
        onHome={onBack}
        onOpenSettings={onOpenSettings}
        navLinks={[
          { label: "Home",      onClick: onBack },
          { label: "Discover",  onClick: () => {} },
          { label: "Dashboard", onClick: () => {} },
          { label: "Likes",     onClick: onLikes },
        ]}
      />

      <div className="breadcrumb">
        <a onClick={onBack}>Home</a>
        <span className="sep">›</span>
        <a onClick={onBack}>{course?.course_name || "Heritage of Bharat"}</a>
        <span className="sep">›</span>
        <span className="current">Dashboard</span>
      </div>

      <div className="dash-wrap">

        {/* ── Welcome ── */}
        <div className="dash-course-chip">{course?.course_name || "Heritage of Bharat"}</div>
        <div className="dash-title">Welcome back, {displayName} 👋</div>
        <div className="dash-action-bar">
          <button className="dash-resume-btn" onClick={onResume}>
            ⟳ Resume Yatra
          </button>
          <div className="dash-action-sep" />
          <div className="dash-quick-pills">
            {activeDropdown && <div className="dash-dropdown-backdrop" onClick={() => setActiveDropdown(null)} />}

            <div className="dash-pill-wrap">
              <div className={`dash-pill${activeDropdown === 'lang' ? ' open' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'lang' ? null : 'lang')}>
                🌐 {settings.languageName || 'English'}
              </div>
              {activeDropdown === 'lang' && (
                <div className="dash-dropdown">
                  {languages.map(l => (
                    <div key={l.language_id}
                      className={`dash-dropdown-item${settings.languageId === l.language_id ? ' active' : ''}`}
                      onClick={() => applySettings({ languageId: l.language_id, languageCode: l.language_code, languageName: l.language })}>
                      {settings.languageId === l.language_id ? '✓ ' : ''}{l.language}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dash-pill-wrap">
              <div className={`dash-pill${activeDropdown === 'font' ? ' open' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'font' ? null : 'font')}>
                T {settings.fontSize === 'sm' ? 'Small' : settings.fontSize === 'lg' ? 'Large' : 'Medium'}
              </div>
              {activeDropdown === 'font' && (
                <div className="dash-dropdown">
                  {FONT_OPTIONS.map(f => (
                    <div key={f.key}
                      className={`dash-dropdown-item${settings.fontSize === f.key ? ' active' : ''}`}
                      onClick={() => applySettings({ fontSize: f.key })}>
                      {f.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="dash-stats">
          {STATS.map(s => (
            <div className="stat-card" key={s.key}>
              <div className="stat-card-accent" style={{ background: s.accent }} />
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
              {s.sub && <div className="stat-sub">{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* ── Streak Heatmap ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="dash-section-title">🔥 Learning Streak</div>
            <div className="dash-section-meta">Last 60 days</div>
          </div>
          <div className="streak-grid">
            {streakData.map((level, i) => (
              <div
                key={i}
                className="streak-cell"
                style={{ background: streakColor(level) }}
                title={
                  level === 0 ? "No activity"
                  : level === 1 ? "Light activity"
                  : level === 2 ? "Moderate activity"
                  : "Heavy activity"
                }
              />
            ))}
          </div>
          <div className="streak-legend">
            <span>Less</span>
            {[0, 1, 2, 3].map(l => (
              <div key={l} className="streak-legend-cell" style={{ background: streakColor(l) }} />
            ))}
            <span>More</span>
          </div>
          <div className="streak-summary">
            <strong>{activeDays} active {activeDays === 1 ? "day" : "days"}</strong> in the last
            60 days · Best streak: <strong>{bestStreak} {bestStreak === 1 ? "day" : "days"}</strong>
          </div>
        </div>

        {/* ── Course Progress by Theme — coming soon ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="dash-section-title">Course Progress by Theme</div>
            <div className="dash-section-meta" style={{ fontStyle: "italic" }}>Coming soon</div>
          </div>
          <div style={{ padding: "10px 0 4px", color: "#bbb", fontSize: "14px", fontStyle: "italic" }}>
            Theme-level progress breakdown is coming soon.
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="dash-section-title">Recent Activity</div>
            <div className="dash-section-meta">Last 7 days</div>
          </div>
          <table className="act-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Day</th>
                <th>Lessons Completed</th>
                <th>Dharma Earned</th>
              </tr>
            </thead>
            <tbody>
              {activityData.map(a => (
                <tr key={a.date}>
                  <td>
                    <span className={"act-day" + (a.today ? " act-today" : "")}>{a.day}</span>
                    <span className="act-date">{a.date}</span>
                  </td>
                  <td className={a.lessons > 0 ? "act-nonzero" : ""}>{a.lessons}</td>
                  <td className={a.dharma  > 0 ? "act-nonzero" : ""}>{a.dharma}</td>
                </tr>
              ))}
              <tr className="act-total">
                <td>7-day total</td>
                <td>{activityData.reduce((s, a) => s + a.lessons, 0)}</td>
                <td>{activityData.reduce((s, a) => s + a.dharma,  0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Earned Badges — coming soon ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="dash-section-title">🏆 Earned Badges</div>
            <div className="dash-section-meta" style={{ fontStyle: "italic" }}>Coming soon</div>
          </div>
          <div style={{ padding: "10px 0 4px", color: "#bbb", fontSize: "14px", fontStyle: "italic" }}>
            Badge tracking is coming soon.
          </div>
        </div>

        {/* ── Languages Explored — coming soon ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="dash-section-title">🌐 Languages Explored</div>
            <div className="dash-section-meta" style={{ fontStyle: "italic" }}>Coming soon</div>
          </div>
          <div style={{ padding: "10px 0 4px", color: "#bbb", fontSize: "14px", fontStyle: "italic" }}>
            Language exploration tracking is coming soon.
          </div>
        </div>

        {/* ── Share Your Yatra ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="dash-section-title">📤 Share Your Yatra</div>
            <div className="dash-section-meta">Coming soon</div>
          </div>
          <div className="share-inner">
            <div className="share-preview">
              <div className="share-preview-logo">🪔 IndiYatra · Heritage of Bharat</div>
              <div className="share-stat-row">
                <div className="share-stat">
                  <div className="share-stat-val" style={{ color: SAFFRON }}>{totalDharma}</div>
                  <div className="share-stat-lbl">Dharma Pts</div>
                </div>
                <div className="share-stat">
                  <div className="share-stat-val" style={{ color: GREEN }}>{lessonsCompleted}</div>
                  <div className="share-stat-lbl">Lessons</div>
                </div>
              </div>
              <div className="share-footer-txt">indiyatra.in · Join my heritage learning journey!</div>
            </div>
            <div className="share-actions">
              <button className="share-btn share-btn-wa" disabled title="Coming soon">
                💬 WhatsApp
              </button>
              <button className="share-btn share-btn-tw" disabled title="Coming soon">
                𝕏 Twitter / X
              </button>
              <button className="share-btn share-btn-copy" disabled title="Coming soon">
                🔗 Copy Link
              </button>
              <div className="share-coming">Sharing unlocks after sign-in</div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
