import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { SkeletonBadges } from "../components/Skeletons";
import { supabaseClient } from "../lib/auth";
import { useAuthContext } from "../contexts/AuthContext";
import { DEFAULT_SHARE_MSG, FOREST_TOKENS as FOREST_TOKEN_DEFS } from "../config/appStrings";

// Off-brand colours removed — using brand constants only

const styles = `
  /* ── Layout ── */

  /* ── Welcome Hero Band ── */
  .dash-hero {
    background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 14px;
    padding: 24px 20px; margin-bottom: 24px;
    box-shadow: none;
  }

  /* ── Course chip ── */
  .dash-course-chip {
    display: inline-block; padding: 3px 14px; border-radius: 999px;
    background: ${SAFFRON}15; color: ${SAFFRON}; font-size: 0.75rem;
    font-weight: 700; letter-spacing: 0.04em; margin-bottom: 10px;
  }

  /* ── Welcome title ── */
  .dash-subtitle {
    font-size: 0.9375rem; color: #6B6B6B; margin-top: 2px; margin-bottom: 0;
    font-family: 'Source Sans 3', sans-serif; font-weight: 400;
  }
  .dash-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 2.125rem; font-weight: 800;
    color: #0A0A0A; margin-bottom: 18px; line-height: 1.1;
  }

  /* ── Scope pill (Option C) ── */
  .dash-scope-wrap {
    position: relative; display: inline-block; margin-top: 14px;
  }
  .dash-scope-pill {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 7px 14px; border-radius: 10px; cursor: pointer;
    font-size: 0.8125rem; font-weight: 600; white-space: nowrap;
    color: #1F1F1F; background: white;
    border: 1.5px solid rgba(0,0,0,0.10);
    transition: border-color 0.2s, color 0.2s, background 0.2s;
    min-height: 36px;
  }
  .dash-scope-pill:hover, .dash-scope-pill.open {
    border-color: ${SAFFRON}; color: ${SAFFRON}; background: ${SAFFRON}08;
  }
  .dash-scope-pill-icon { font-size: 1rem; line-height: 1; }
  .dash-scope-pill-chevron { font-size: 0.6875rem; color: #6B6B6B; margin-left: 2px; }
  .dash-scope-pill.open .dash-scope-pill-chevron { color: ${SAFFRON}; }
  .dash-dropdown-backdrop { position: fixed; inset: 0; z-index: 199; }
  .dash-dropdown {
    position: absolute; top: calc(100% + 6px); left: 0; z-index: 200;
    background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 12px;
    box-shadow: none; min-width: 160px;
    overflow: hidden; padding: 4px 0;
  }
  .dash-dropdown-item {
    padding: 11px 16px; font-size: 0.875rem; color: #1F1F1F; cursor: pointer;
    transition: background 0.15s; display: flex; align-items: center; gap: 8px;
    min-height: 44px;
  }
  .dash-dropdown-item:hover { background: ${SAFFRON}12; }
  .dash-dropdown-item.active { color: ${SAFFRON}; font-weight: 700; }

  /* ── Stat cards grid ── */
  .dash-stats {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 12px; margin-bottom: 24px;
  }
  .stat-card {
    background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
    padding: 18px 14px; position: relative; overflow: hidden;
    transition: transform 0.18s, box-shadow 0.18s;
    box-shadow: none;
  }
  .stat-card:hover { box-shadow: none; border-color: rgba(0,0,0,0.12); }
  .stat-ghost { background: transparent; border: 1px dashed rgba(0,0,0,0.06) !important; box-shadow: none !important; pointer-events: none; }
  .stat-ghost:hover { transform: none !important; box-shadow: none !important; }
  .stat-card-accent { display: none; }
  .stat-icon { font-size: 1.375rem; margin-bottom: 10px; line-height: 1; }
  .stat-label {
    font-size: 0.625rem; font-weight: 700; letter-spacing: 0.07em;
    text-transform: uppercase; color: #6B6B6B; margin-bottom: 5px;
  }
  .stat-value {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.75rem;
    font-weight: 800; line-height: 1; margin-bottom: 4px;
  }
  .stat-sub  { font-size: 0.6875rem; color: #6B6B6B; line-height: 1.3; }
  .stat-link { font-size: 0.6875rem; color: ${HERITAGE}; cursor: pointer; }
  .stat-link:hover { text-decoration: underline; }

  /* ── Section card ── */
  .dash-section {
    background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
    padding: 22px 22px; margin-bottom: 24px;
    box-shadow: none;
  }
  .dash-section-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 18px;
  }
  .dash-section-meta { font-size: 0.75rem; color: #6B6B6B; font-weight: 600; }

  /* ── Streak heatmap ── */
  .streak-grid { display: flex; gap: 3px; flex-wrap: wrap; }
  .streak-cell { width: 13px; height: 13px; border-radius: 3px; flex-shrink: 0; }
  .streak-legend {
    display: flex; align-items: center; gap: 6px;
    margin-top: 10px; font-size: 0.6875rem; color: #6B6B6B;
  }
  .streak-legend-cell { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
  .streak-summary { font-size: 0.875rem; color: #1F1F1F; margin-top: 10px; }
  .streak-summary strong { color: #0A0A0A; }

  /* ── Course progress table ── */
  .prog-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .prog-table { width: 100%; border-collapse: collapse; }
  .prog-table th {
    font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #6B6B6B; padding: 0 0 10px; text-align: left;
  }
  .prog-table th:not(:first-child) { text-align: center; }
  .prog-table td { padding: 12px 0; border-top: 1px solid rgba(0,0,0,0.07); vertical-align: middle; }
  .prog-theme-name { font-size: 0.9375rem; font-weight: 700; color: ${SAFFRON}; text-align: left; }
  .prog-bar-wrap { display: flex; align-items: center; gap: 6px; justify-content: center; }
  .prog-bar { height: 6px; width: 80px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden; flex-shrink: 0; }
  .prog-bar-fill { height: 100%; border-radius: 3px; }
  .prog-pct { font-size: 0.6875rem; font-weight: 700; min-width: 28px; text-align: right; }
  .prog-counts { font-size: 0.625rem; color: #6B6B6B; text-align: right; }

  /* ── Activity table ── */
  .act-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .act-table { width: 100%; border-collapse: collapse; }
  .act-table th {
    font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #6B6B6B; padding: 0 0 10px;
    text-align: right;
  }
  .act-table th:first-child { text-align: left; }
  .act-table td {
    padding: 11px 0; border-top: 1px solid rgba(0,0,0,0.07);
    font-size: 0.875rem; text-align: right; color: #1F1F1F;
  }
  .act-table td:first-child { text-align: left; }
  .act-day   { font-weight: 700; color: #0A0A0A; font-size: 0.9375rem; }
  .act-today { color: ${SAFFRON}; }
  .act-date  { font-size: 0.75rem; color: #6B6B6B; margin-left: 5px; }
  .act-total td { font-weight: 700; color: #0A0A0A; border-top: 2px solid rgba(0,0,0,0.12) !important; }
  .act-nonzero { font-weight: 700; color: ${HERITAGE} !important; }

  /* ── Badges ── */
  .badge-level-label {
    font-size: 0.625rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #6B6B6B; margin-bottom: 10px;
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
    border: 2px solid ${SAFFRON}; background: white;
  }
  .badge-circle.earned:hover { transform: scale(1.12); }
  .badge-circle.locked {
    border: 2px solid rgba(0,0,0,0.08); background: white; opacity: 0.4;
  }
  .badge-name { font-size: 0.5625rem; color: #6B6B6B; text-align: center; line-height: 1.3; }

  /* ── Share card ── */
  .share-inner { display: flex; gap: 24px; align-items: flex-start; }
  .share-preview {
    flex: 1; min-width: 0;
    background: white;
    border: 1px solid rgba(0,0,0,0.07); border-radius: 14px; padding: 18px 22px;
  }
  .share-preview-logo {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.125rem; font-weight: 800;
    color: ${GREEN}; margin-bottom: 14px;
  }
  .share-stat-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 12px; }
  .share-stat { text-align: center; }
  .share-stat-val {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.625rem;
    font-weight: 800; line-height: 1; color: ${GREEN};
  }
  .share-stat-lbl { font-size: 0.625rem; color: #6B6B6B; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
  .share-footer-txt { font-size: 0.6875rem; color: #6B6B6B; margin-top: 4px; }
  .share-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; align-items: center; }
  .share-btn-row { display: flex; gap: 10px; align-items: center; }
  .share-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; min-height: 44px; min-width: 44px;
    border-radius: 50%; padding: 0;
    font-size: 1.25rem; line-height: 1;
    cursor: not-allowed; opacity: 0.45;
    border: 1.5px solid ${GREEN}; color: ${GREEN};
    background: white; transition: opacity 0.2s, background 0.2s, color 0.2s;
  }
  .share-btn .ti { font-size: 1.25rem; line-height: 1; }
  .share-btn.active { cursor: pointer; opacity: 1; }
  .share-btn.active:hover { background: ${GREEN}; color: white; }
  .share-btn.copied { background: ${GREEN}; color: white; }
  .share-coming { font-size: 0.6875rem; color: #6B6B6B; text-align: center; font-style: italic; margin-top: 2px; }

  /* ── Share settings panel ── */
  .share-settings {
    background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.07); border-radius: 12px;
    padding: 14px 16px; margin-bottom: 16px;
  }
  .share-settings-label {
    font-size: 0.6875rem; font-weight: 700; color: #6B6B6B;
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;
  }
  .share-textarea {
    width: 100%; min-height: 68px; border: 1px solid rgba(0,0,0,0.10); border-radius: 8px;
    padding: 9px 12px; font-family: 'Source Sans 3', sans-serif; font-size: 0.875rem;
    color: #1F1F1F; background: white; resize: vertical; line-height: 1.5;
    box-sizing: border-box;
  }
  .share-textarea:focus { outline: none; border-color: ${SAFFRON}; }
  .share-tokens { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 10px; }
  .share-token {
    font-size: 0.6875rem; background: ${SAFFRON}12; color: ${SAFFRON};
    border: 1px solid ${SAFFRON}33; border-radius: 999px; padding: 2px 10px;
    cursor: pointer; font-weight: 700; user-select: none;
  }
  .share-token:hover { background: ${SAFFRON}22; }
  .share-settings-row { display: flex; justify-content: flex-end; gap: 8px; }
  .share-save-btn {
    background: ${SAFFRON}; color: white; border: none; border-radius: 999px;
    padding: 6px 18px; font-size: 0.8125rem; font-weight: 700; cursor: pointer;
  }
  .share-save-btn:hover { opacity: 0.9; }
  .share-reset-btn {
    background: transparent; color: #6B6B6B; border: 1px solid rgba(0,0,0,0.10);
    border-radius: 999px; padding: 6px 14px; font-size: 0.8125rem; cursor: pointer;
  }
  .share-reset-btn:hover { color: #1F1F1F; border-color: rgba(0,0,0,0.20); }
  .share-gear {
    background: none; border: none; cursor: pointer; font-size: 0.9375rem;
    color: #6B6B6B; padding: 2px 4px; border-radius: 6px; transition: color 0.2s; line-height: 1;
  }
  .share-gear:hover, .share-gear.open { color: ${SAFFRON}; }
  .share-msg-text {
    font-size: 0.8125rem; color: #1F1F1F; line-height: 1.5; margin-top: 4px;
    font-style: italic;
  }



  /* ── Forest tokens ── */
  .forest-grid {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 12px; margin-bottom: 14px;
  }
  .forest-token {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 14px;
    padding: 16px 8px; transition: border-color 0.2s, transform 0.18s;
  }
  .forest-token:hover { border-color: rgba(0,0,0,0.18); transform: translateY(-2px); }
  .forest-token-icon  { font-size: 1.75rem; line-height: 1; }
  .forest-token-count {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.75rem;
    font-weight: 800; color: #0A0A0A; line-height: 1;
  }
  .forest-token-count.zero { color: #6B6B6B; }
  .forest-token-label { font-size: 0.75rem; font-weight: 700; color: #1F1F1F; }
  .forest-token-sub   { font-size: 0.5625rem; color: #6B6B6B; text-align: center; }
  .forest-dharma {
    display: flex; align-items: center; gap: 8px;
    background: white; border: 1px solid ${SAFFRON};
    border-radius: 999px; padding: 6px 16px; width: fit-content;
    font-size: 0.8125rem; font-weight: 700; color: ${SAFFRON};
  }
  .forest-empty {
    font-size: 0.8125rem; color: #6B6B6B; font-style: italic; padding: 8px 0;
  }

  /* ── Badge cards ── */
  .badge-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 14px; }
  .badge-card {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 14px;
    padding: 20px 14px;
    transition: border-color 0.2s, transform 0.18s;
  }
  .badge-card.earned {
    border-color: ${SAFFRON}; background: rgba(255,142,0,0.06);
    box-shadow: 0 2px 12px rgba(255,142,0,0.13);
  }
  .badge-card.earned:hover { transform: translateY(-3px); }
  .badge-card.locked { opacity: 0.45; }
  .badge-card-icon { font-size: 2.25rem; line-height: 1; }
  .badge-card-name {
    font-family: 'Alumni Sans', sans-serif; font-size: 1rem;
    font-weight: 700; color: #0A0A0A; text-align: center;
  }
  .badge-card-desc {
    font-size: 0.5625rem; color: #6B6B6B; text-align: center; line-height: 1.4;
  }
  .badge-card-earned-tag {
    font-size: 0.5rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: ${SAFFRON}; background: rgba(255,142,0,0.12);
    border-radius: 999px; padding: 2px 8px;
  }
  .badge-card-locked-tag {
    font-size: 0.5rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #6B6B6B;
  }
  /* ── Responsive ── */
  @media (max-width: 768px) {
    .dash-section { padding: 18px 16px; }
    .dash-stats   { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .share-inner  { flex-direction: column; }
    .prog-bar     { width: 56px; }
    .forest-grid  { grid-template-columns: repeat(3, 1fr); }
    .badge-cards  { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
  }
  @media (max-width: 600px) {
    /* Hero stacks on mobile */
    .dash-hero { padding: 18px 16px; border-radius: 14px; }
    /* Progress table → stacked bars */
    .prog-table-wrap { display: none; }
    .prog-stack      { display: block; }
    /* Activity table → stacked pills */
    .act-table-wrap  { display: none; }
    .act-stack       { display: block; }
    /* Forest sub-labels illegible at this size */
    .forest-token-sub { display: none; }
    /* Share message text slightly smaller */
    .share-msg-text  { font-size: 0.8125rem; }
  }
  @media (max-width: 480px) {
    .dash-title  { font-size: 1.5rem; }
    .dash-stats  { grid-template-columns: repeat(3, 1fr); }
    .stat-value  { font-size: 1.5rem; }
    /* Streak — smaller cells so all 60 fit in one row */
    .streak-cell { width: 11px; height: 11px; }
    /* Activity table: also hide Snippets column at tiny screens */
    .act-table th:nth-child(4), .act-table td:nth-child(4) { display: none; }
    /* Forest — 3 col */
    .forest-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .forest-token { padding: 14px 6px; }
    .forest-token-icon  { font-size: 1.5rem; }
    .forest-token-count { font-size: 1.5rem; }
    /* Share icon buttons stay as circles, centered */
    .share-actions { min-width: 0; width: 100%; align-items: center; }
  }

  /* ── Activity stacked view (≤600px) ── */
  .act-stack { display: none; }
  .act-stack-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0; border-top: 1px solid rgba(0,0,0,0.07);
    flex-wrap: wrap; gap: 6px;
  }
  .act-stack-day { font-weight: 700; color: #0A0A0A; font-size: 0.9375rem; }
  .act-stack-day.today { color: ${SAFFRON}; }
  .act-stack-date { font-size: 0.75rem; color: #6B6B6B; margin-left: 5px; }
  .act-stack-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .act-pill {
    font-size: 0.75rem; font-weight: 700; border-radius: 999px;
    padding: 3px 10px; white-space: nowrap;
  }
  .act-pill-lesson { background: rgba(0,146,74,0.10); color: #00924A; }
  .act-pill-dharma { background: rgba(255,142,0,0.10); color: ${SAFFRON}; }
  .act-pill-none   { background: rgba(0,0,0,0.05); color: #6B6B6B; }

  /* ── Progress stacked view (≤600px) ── */
  .prog-stack { display: none; }
  .prog-stack-row { padding: 12px 0; border-top: 1px solid rgba(0,0,0,0.07); }
  .prog-stack-name { font-size: 0.9375rem; font-weight: 700; color: #0A0A0A; margin-bottom: 6px; }
  .prog-stack-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .prog-stack-bar {
    flex: 1; height: 7px; background: rgba(0,0,0,0.06);
    border-radius: 4px; overflow: hidden;
  }
  .prog-stack-fill { height: 100%; border-radius: 4px; }
  .prog-stack-pct { font-size: 0.75rem; font-weight: 700; min-width: 32px; text-align: right; }
`;

// ─── Data helpers ─────────────────────────────────────────────────────────────
function pct(done, total) { return total > 0 ? Math.round((done / total) * 100) : 0; }

function streakColor(level) {
  if (level === 0) return "#EBEBEA";
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

/** Returns last-7-days activity rows derived from lesson_completions, lesson_progress, and user_tokens. */
function buildActivityFromCompletions(completions, lessonProgress, rawTokensData) {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const rows    = completions.filter(
      c => c.completed_at && c.completed_at.slice(0, 10) === dateStr
    );
    const progRows = (lessonProgress || []).filter(
      p => p.updated_at && p.updated_at.slice(0, 10) === dateStr
    );
    const plantRows = (rawTokensData || []).filter(
      t => t.token_type !== "dharma" && t.awarded_at && t.awarded_at.slice(0, 10) === dateStr
    );
    const label = i === 0 ? "Today"
      : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    return {
      day:      label,
      date:     d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      lessons:  rows.length,
      dharma:   rows.reduce((s, c) => s + (c.points_earned || 0), 0),
      snippets: rows.reduce((s, c) => s + (c.snippet_count || 0), 0)
                + progRows.reduce((s, p) => s + (p.snippet_index + 1), 0),
      plants:   plantRows.length,
      today:    i === 0,
    };
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage({ course, settings, onBack, onOpenSettings, onResume, languages = [], onSaveSettings, onLikes, onBookmarks, onDiscover, isAdmin, onAdmin, userEditorialRole, onEditor, activePage }) {
  const auth    = useAuthContext();
  const user    = auth?.user;
  const profile = auth?.profile;

  const [completions,    setCompletions]    = useState([]);
  const [lessonProgress, setLessonProgress] = useState([]);
  const [totalLessons,   setTotalLessons]   = useState(0);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [rawLikes,       setRawLikes]       = useState([]);
  const [scope,          setScope]          = useState("all"); // "all" | course_id string
  const [rawThemes,      setRawThemes]      = useState([]);
  const [rawModules,     setRawModules]     = useState([]);
  const [rawLessons,     setRawLessons]     = useState([]);
  const [rawLevels,      setRawLevels]      = useState([]);
  const [rawCourses,     setRawCourses]     = useState([]);
  const [rawMapping,     setRawMapping]     = useState([]); // {lesson_id, snippet_id}
  const [forestTokens,   setForestTokens]   = useState({});
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set());
  const [allBadges,      setAllBadges]      = useState([]);
  const [rawTokensData,  setRawTokensData]  = useState([]);
  // DEFAULT_SHARE_MSG imported from appStrings
  const [shareMessage,    setShareMessage]   = useState(() => localStorage.getItem("indiyatra_share_message") || DEFAULT_SHARE_MSG);
  const [shareMsgDraft,   setShareMsgDraft]  = useState(shareMessage);
  const [showShareSettings, setShowShareSettings] = useState(false);
  const [copyDone,        setCopyDone]        = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch this user's completions + in-progress lesson positions
        if (user && !user.is_anonymous) {
          const [{ data: compData }, { data: progData }, { data: likesData }, { data: tokenData }, { data: earnedData }] = await Promise.all([
            supabaseClient
              .from("lesson_completions")
              .select("lesson_id, course_id, points_earned, completed_at, snippet_count")
              .eq("profile_id", user.id),
            supabaseClient
              .from("lesson_progress")
              .select("lesson_id, snippet_index, updated_at")
              .eq("profile_id", user.id),
            supabaseClient
              .from("snippet_likes")
              .select("lesson_id")
              .eq("profile_id", user.id),
            supabaseClient
              .from("user_tokens")
              .select("token_type, quantity, awarded_at")
              .eq("profile_id", user.id),
            supabaseClient
              .from("user_badges")
              .select("badge_id")
              .eq("profile_id", user.id),
          ]);
          setCompletions(compData || []);
          setLessonProgress(progData || []);
          setRawLikes(likesData || []);
          const tmap = {};
          (tokenData || []).forEach(r => { tmap[r.token_type] = (tmap[r.token_type] || 0) + (r.quantity || 1); });
          setForestTokens(tmap);
          setRawTokensData(tokenData || []);
          setEarnedBadgeIds(new Set((earnedData || []).map(b => b.badge_id)));
        }
        // Fetch all public structural data in parallel
        // Public structural data — use anon supabase() helper (matches CoursePage pattern)
        const [lessonCount, themesData, modulesData, lessonsData, coursesData, mappingData, badgesData] = await Promise.all([
          supabase("lessons", "?select=lesson_id"),
          supabase("themes",  "?select=*&order=theme_id"),
          supabase("modules",  "?select=module_id,theme_id,level_id,course_id"),
          supabase("lessons",  "?select=lesson_id,module_id"),
          supabase("courses",  "?select=course_id,course_name,snippet_count&order=course_id"),
          supabase("lesson_snippet_mapping", "?select=lesson_id"),
          supabase("badges", "?select=*&is_active=eq.true&order=sort_order"),
        ]);
        // safeArray: supabase() returns error objects on failure (truthy but not arrays)
        const sa = v => Array.isArray(v) ? v : [];
        setTotalLessons(sa(lessonCount).length);
        setRawThemes(sa(themesData));
        setRawModules(sa(modulesData));
        setRawLessons(sa(lessonsData));
        setRawCourses(sa(coursesData));
        setRawMapping(sa(mappingData));
        setAllBadges(sa(badgesData));
      } catch (e) {
        console.warn("DashboardPage fetchData:", e);
      }
    }
    fetchData();
  }, [user?.id]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const displayName = profile?.display_name
    || (user?.email
        ? (() => {
            const alpha = user.email.split("@")[0].split(/[^a-zA-Z]/)[0] || user.email.split("@")[0];
            const short = alpha.slice(0, 5);
            return short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
          })()
        : "Traveller");

  // ── Progress helpers ────────────────────────────────────────────────────────

  // Build lookup maps from raw structural data
  const snippetSet      = new Set(rawMapping.map(m => m.lesson_id)); // lessons that have snippets
  const moduleByLesson  = {};  // lesson_id → module_id
  rawLessons.forEach(l => { moduleByLesson[l.lesson_id] = l.module_id; });
  const themeByModule   = {};  // module_id → theme_id
  const courseByModule  = {};  // module_id → course_id  (direct — course_id now on modules)
  const themeTitleMap   = {};  // theme_id → theme_title (from rawThemes)
  rawModules.forEach(m => {
    themeByModule[m.module_id]  = m.theme_id;
    courseByModule[m.module_id] = m.course_id;
  });
  rawThemes.forEach(t => { if (t.theme_id && t.title) themeTitleMap[t.theme_id] = t.title; });

  // lesson_id → { themeId, courseId }  (only lessons with snippets)
  const lessonMeta = {};
  rawLessons.forEach(l => {
    if (!snippetSet.has(l.lesson_id)) return;
    const modId   = l.module_id;
    lessonMeta[l.lesson_id] = {
      themeId:  themeByModule[modId],
      courseId: courseByModule[modId],
    };
  });

  // snippets per lesson
  const snippetsPerLesson = {};
  rawMapping.forEach(m => {
    snippetsPerLesson[m.lesson_id] = (snippetsPerLesson[m.lesson_id] || 0) + 1;
  });

  // completed lesson set + completions by courseId
  const completedSet   = new Set(completions.map(c => c.lesson_id));
  // snippets viewed: completed lessons (snippet_count) + in-progress (snippet_index+1)
  const inProgSnippets = {};  // lesson_id → viewed count
  lessonProgress.forEach(p => { inProgSnippets[p.lesson_id] = p.snippet_index + 1; });

  // ── "This Course" view: Progress by Theme ────────────────────────────────
  // modules.course_id is now populated — filter directly.
  // Iterates lessonMeta (not rawThemes) so it works even if rawThemes fetch fails.
  function buildThemeProgress() {
    const courseId = _courseId; // set by scope selector; null means "all courses"
    // Seed tmap from rawModules — captures ALL themes in this course,
    // including those whose lessons have no snippets yet (will show 0% progress)
    const tmap = {};
    rawModules.forEach(m => {
      if (courseId && m.course_id !== courseId) return;
      if (!m.theme_id || tmap[m.theme_id]) return;
      tmap[m.theme_id] = {
        label: rawThemes.find(t => t.theme_id === m.theme_id)?.title || themeTitleMap[m.theme_id] || m.theme_id,
        modTotal: 0, modDone: 0,
        lesTotal: 0, lesDone: 0,
        snpTotal: 0, snpDone: 0,
      };
    });

    // Modules per theme — filtered to this course
    rawModules.forEach(m => {
      if (courseId && m.course_id !== courseId) return;
      const t = tmap[m.theme_id];
      if (!t) return;
      t.modTotal++;
      const modLessons = rawLessons.filter(l => l.module_id === m.module_id && snippetSet.has(l.lesson_id));
      const modComplete = modLessons.length > 0 && modLessons.every(l => completedSet.has(l.lesson_id));
      if (modComplete) t.modDone++;
    });

    // Lessons + snippets per theme
    Object.entries(lessonMeta).forEach(([lesId, meta]) => {
      if (courseId && meta.courseId !== courseId) return;
      const t = tmap[meta.themeId];
      if (!t) return;
      t.lesTotal++;
      t.snpTotal += snippetsPerLesson[lesId] || 0;
      if (completedSet.has(lesId)) {
        t.lesDone++;
        t.snpDone += completions.find(c => c.lesson_id === lesId)?.snippet_count || 0;
      } else if (inProgSnippets[lesId]) {
        t.snpDone += inProgSnippets[lesId];
      }
    });

    // Sort by theme_id order from rawThemes if available, else by theme_id string
    const order = rawThemes.length > 0 ? rawThemes.map(t => t.theme_id) : Object.keys(tmap).sort();
    return Object.entries(tmap)
      .map(([themeId, data]) => ({ id: themeId, ...data }))
      .filter(t => t.modTotal > 0)  // show all themes that have modules
      .sort((a, b) => {
        const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
        if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
  }

  // ── "All Courses" view: Progress by Course ────────────────────────────────
  // modules.course_id is now reliable — all totals and done counts use it directly.
  function buildCourseProgress() {
    if (rawCourses.length === 0) return [];
    const cmap = {};
    rawCourses.forEach(c => {
      cmap[c.course_id] = {
        label: c.course_name,
        themTotal: 0, themDone: 0,
        lesTotal: 0,  lesDone: 0,
        snpTotal: c.snippet_count || 0, snpDone: 0,
      };
    });
    // Total themes per course — themes that have at least one module in this course
    const themesByCourse = {};
    rawModules.forEach(m => {
      if (!m.course_id || !cmap[m.course_id]) return;
      if (!themesByCourse[m.course_id]) themesByCourse[m.course_id] = new Set();
      themesByCourse[m.course_id].add(m.theme_id);
    });
    Object.entries(themesByCourse).forEach(([cId, themes]) => {
      if (cmap[cId]) cmap[cId].themTotal = themes.size;
    });
    // Total + done lessons per course — via lessonMeta.courseId (now accurate)
    Object.entries(lessonMeta).forEach(([lesId, meta]) => {
      const row = cmap[meta.courseId];
      if (!row) return;
      row.lesTotal++;
      row.snpTotal += snippetsPerLesson[lesId] || 0;
      if (completedSet.has(lesId)) {
        row.lesDone++;
        row.snpDone += completions.find(c => c.lesson_id === lesId)?.snippet_count || 0;
      } else if (inProgSnippets[lesId]) {
        row.snpDone += inProgSnippets[lesId];
      }
    });
    // Explored themes per course
    const exploredThemesByCourse = {};
    Object.entries(lessonMeta).forEach(([lesId, meta]) => {
      if (!completedSet.has(lesId) || !meta.courseId || !meta.themeId) return;
      if (!exploredThemesByCourse[meta.courseId]) exploredThemesByCourse[meta.courseId] = new Set();
      exploredThemesByCourse[meta.courseId].add(meta.themeId);
    });
    Object.entries(exploredThemesByCourse).forEach(([cId, themes]) => {
      if (cmap[cId]) cmap[cId].themDone = themes.size;
    });
    return rawCourses
      .map(c => ({ id: c.course_id, ...cmap[c.course_id] }))
      .filter(c => c && c.lesTotal > 0);
  }

  // ── Scope-aware derived values ──────────────────────────────────────────────
  const _courseId = scope !== "all" ? scope : null; // null means show all courses

  // _courseLessonIds: built from rawModules + rawLessons. May be empty on initial
  // render because public data (rawModules) loads after user data (completions) —
  // two sequential awaits in fetchData. Guard all uses with _hasLessonIds.
  const _courseModuleIds = new Set(
    rawModules
      .filter(m => !_courseId || !m.course_id || m.course_id === _courseId)
      .map(m => m.module_id)
  );
  const _courseLessonIds = new Set(
    rawLessons
      .filter(l => _courseModuleIds.has(l.module_id))
      .map(l => l.lesson_id)
  );
  const _hasLessonIds = _courseLessonIds.size > 0;

  // completions carry course_id on each row — filter directly, no rawModules dependency.
  // Rows with null course_id (saved before the column existed) count as "this course".
  const scopedCompletions = scope !== "all" && _courseId
    ? completions.filter(c => !c.course_id || c.course_id === _courseId)
    : completions;

  // lesson_progress and likes have no course_id column — use _courseLessonIds.
  // Fall back to unfiltered until rawModules loads (_hasLessonIds guard).
  const scopedProgress = scope !== "all" && _courseId && _hasLessonIds
    ? lessonProgress.filter(p => _courseLessonIds.has(p.lesson_id))
    : lessonProgress;
  const scopedLikesCount = (user && !user.is_anonymous)
    ? (scope !== "all" && _courseId && _hasLessonIds
        ? rawLikes.filter(l => _courseLessonIds.has(l.lesson_id)).length
        : rawLikes.length)
    : null;
  const courseLessonTotal = scope !== "all" && _hasLessonIds
    ? _courseLessonIds.size : totalLessons;

  const totalDharma      = scopedCompletions.reduce((s, c) => s + (c.points_earned || 0), 0);
  const lessonsCompleted = scopedCompletions.length;
  const snippetsViewed   = scopedCompletions.reduce((s, c) => s + (c.snippet_count || 0), 0)
                         + scopedProgress.reduce((s, p) => s + (p.snippet_index + 1), 0);
  const streakData       = buildStreakFromCompletions(scopedCompletions);
  const activityData     = buildActivityFromCompletions(scopedCompletions, scopedProgress, rawTokensData);

  const activeDays = streakData.filter(l => l > 0).length;
  let bestStreak = 0, cur = 0;
  for (const l of streakData) {
    if (l > 0) { cur++; if (cur > bestStreak) bestStreak = cur; } else { cur = 0; }
  }
  let currentStreak = 0;
  const streakStart = streakData[59] > 0 ? 59 : 58;
  for (let i = streakStart; i >= 0; i--) {
    if (streakData[i] > 0) currentStreak++;
    else break;
  }
  const subtitleText = currentStreak >= 2
    ? `🔥 ${currentStreak}-day streak — keep it going!`
    : currentStreak === 1
    ? `🔥 Streak started — come back tomorrow!`
    : activeDays > 0
    ? `You've been active ${activeDays} day${activeDays === 1 ? '' : 's'} this month`
    : 'Continue your learning journey';

  const progressRows = scope !== "all" ? buildThemeProgress() : buildCourseProgress();
  const overallLesDone  = progressRows.reduce((s, r) => s + r.lesDone,  0);
  const overallLesTotal = progressRows.reduce((s, r) => s + r.lesTotal, 0);
  const overallPct      = pct(overallLesDone, overallLesTotal);

  const STATS = [
    {
      key: "dharma",  icon: <i className="ti ti-diamond" style={{color: SAFFRON}} />,  label: "Dharma Points",
      value: String(totalDharma), sub: null, accent: SAFFRON,
    },
    {
      key: "lessons", icon: <i className="ti ti-book-2" style={{color: GREEN}} />, label: "Lessons Completed",
      value: courseLessonTotal ? `${lessonsCompleted}/${courseLessonTotal}` : String(lessonsCompleted),
      sub: null, accent: GREEN,
    },
    {
      key: "badges", icon: <i className="ti ti-trophy" style={{color: SAFFRON}} />, label: "Badges Earned",
      value: allBadges.length > 0 ? `${earnedBadgeIds.size}/${allBadges.length}` : "—",
      sub: null, accent: SAFFRON,
    },
    { key: "snippets",  icon: <i className="ti ti-book-2" style={{color: HERITAGE}} />, label: "Snippets Viewed", value: String(snippetsViewed), sub: null, accent: HERITAGE },
    { key: "bookmarks", icon: <i className="ti ti-heart" style={{color: HERITAGE}} />, label: "Snippets Liked",  value: scopedLikesCount !== null ? scopedLikesCount.toLocaleString() : "—", sub: null, accent: HERITAGE, onClick: onLikes },
  ];

  const FOREST_TOKENS = FOREST_TOKEN_DEFS.filter(t => t.type !== "dharma");
  const totalPlants = FOREST_TOKENS.reduce((s, t) => s + (forestTokens[t.type] || 0), 0);
  const dharmaTokens = forestTokens["dharma"] || 0;

  function renderShareText(tmpl) {
    return (tmpl || DEFAULT_SHARE_MSG)
      .replace("{dharma}",  String(totalDharma))
      .replace("{lessons}", String(lessonsCompleted))
      .replace("{name}",    displayName);
  }
  function handleShareSave() {
    localStorage.setItem("indiyatra_share_message", shareMsgDraft);
    setShareMessage(shareMsgDraft);
    setShowShareSettings(false);
  }
  function handleShareReset() {
    setShareMsgDraft(DEFAULT_SHARE_MSG);
  }
  function handleCopyLink() {
    navigator.clipboard.writeText("https://indiyatra.in").then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }
  const shareText = renderShareText(shareMessage);
  const canShare  = !!(user && !user.is_anonymous);

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
          { label: "Dashboard", onClick: () => {} },
          { label: "Likes",      onClick: onLikes },
          { label: "Bookmarks", onClick: onBookmarks },
        ]}
      />

      <div className="breadcrumb">
        <a onClick={onBack}>Home</a>
        <span className="sep">›</span>
        <span className="current">Dashboard</span>
      </div>

      <div className="page-wrap">

        {/* ── Welcome Hero ── */}
        <div className="dash-hero">
          <div className="dash-title">Welcome back, {displayName}</div>
          <div className="dash-subtitle">{subtitleText}</div>
          {activeDropdown && <div className="dash-dropdown-backdrop" onClick={() => setActiveDropdown(null)} />}
          <div className="dash-scope-wrap">
            <div className={`dash-scope-pill${activeDropdown === 'scope' ? ' open' : ''}`}
              onClick={() => setActiveDropdown(activeDropdown === 'scope' ? null : 'scope')}>
              <i className="ti ti-books dash-scope-pill-icon" />
              {scope === "all"
                ? "All Courses"
                : (rawCourses.find(c => c.course_id === scope)?.course_name || "All Courses")}
              <span className="dash-scope-pill-chevron">▾</span>
            </div>
            {activeDropdown === 'scope' && (
              <div className="dash-dropdown">
                <div
                  className={`dash-dropdown-item${scope === "all" ? " active" : ""}`}
                  onClick={() => { setScope("all"); setActiveDropdown(null); }}>
                  {scope === "all" ? "✓ " : ""}All Courses
                </div>
                {rawCourses.map(c => (
                  <div key={c.course_id}
                    className={`dash-dropdown-item${scope === c.course_id ? " active" : ""}`}
                    onClick={() => { setScope(c.course_id); setActiveDropdown(null); }}>
                    {scope === c.course_id ? "✓ " : ""}{c.course_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>{/* end .dash-hero */}

        {/* ── Stat cards ── */}
        <div className="dash-stats">
          {STATS.map(s => (
            <div
              className="stat-card"
              key={s.key}
              onClick={s.onClick}
              style={s.onClick ? { cursor: "pointer" } : undefined}
            >
              <div className="stat-card-accent" style={{ background: s.accent }} />
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: HERITAGE }}>{s.value}</div>
              {s.sub && <div className="stat-sub">{s.sub}</div>}
              {s.onClick && <div className="stat-link">View all →</div>}
            </div>
          ))}
          {/* Ghost card — balances the 3-column grid on mobile (2 rows of 3) */}
          <div className="stat-card stat-ghost" aria-hidden="true" />
        </div>

        {/* ── Streak Heatmap ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="page-section-title"><i className="ti ti-flame" style={{color: "#FF8E00", marginRight: 6}} />Learning Streak</div>
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

        {/* ── Course Progress (scope-aware) ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="page-section-title">
              {scope !== "all" ? "Course Progress by Theme" : "Progress by Course"}
            </div>
            <div className="dash-section-meta">{overallPct}% explored</div>
          </div>

          {progressRows.length === 0 ? (
            <div style={{ color: "#bbb", fontSize: "0.8125rem", padding: "8px 0", fontStyle: "italic" }}>
              No progress data yet — complete a lesson to see your stats here.
            </div>
          ) : (
            <div className="prog-table-wrap"><table className="prog-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>
                    {scope !== "all" ? "Theme" : "Course"}
                  </th>
                  <th>{scope !== "all" ? "Modules" : "Themes"}</th>
                  <th>Lessons</th>
                  <th>Snippets</th>
                </tr>
              </thead>
              <tbody>
                {progressRows.map(row => {
                  const col1Done  = scope !== "all" ? row.modDone  : row.themDone;
                  const col1Total = scope !== "all" ? row.modTotal : row.themTotal;
                  const col1Pct   = pct(col1Done, col1Total);
                  const lesPct    = pct(row.lesDone,  row.lesTotal);
                  const snpPct    = pct(row.snpDone,  row.snpTotal);
                  const barColor  = (p) => p === 100 ? GREEN : SAFFRON;
                  return (
                    <tr key={row.id}>
                      <td className="prog-theme-name">{row.label}</td>
                      <td>
                        <div className="prog-bar-wrap">
                          <div className="prog-bar">
                            <div className="prog-bar-fill" style={{ width: col1Pct + "%", background: barColor(col1Pct) }} />
                          </div>
                          <span className="prog-pct" style={{ color: barColor(col1Pct) }}>{col1Pct}%</span>
                          <span className="prog-counts">({col1Done}/{col1Total})</span>
                        </div>
                      </td>
                      <td>
                        <div className="prog-bar-wrap">
                          <div className="prog-bar">
                            <div className="prog-bar-fill" style={{ width: lesPct + "%", background: barColor(lesPct) }} />
                          </div>
                          <span className="prog-pct" style={{ color: barColor(lesPct) }}>{lesPct}%</span>
                          <span className="prog-counts">({row.lesDone}/{row.lesTotal})</span>
                        </div>
                      </td>
                      <td>
                        <div className="prog-bar-wrap">
                          <div className="prog-bar">
                            <div className="prog-bar-fill" style={{ width: snpPct + "%", background: barColor(snpPct) }} />
                          </div>
                          <span className="prog-pct" style={{ color: barColor(snpPct) }}>{snpPct}%</span>
                          <span className="prog-counts">({row.snpDone}/{row.snpTotal})</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
          {/* Stacked view — shown at ≤600px via CSS */}
          {progressRows.length > 0 && (
            <div className="prog-stack">
              {progressRows.map(row => {
                const lesPct   = pct(row.lesDone, row.lesTotal);
                const barColor = lesPct === 100 ? GREEN : SAFFRON;
                return (
                  <div className="prog-stack-row" key={row.id}>
                    <div className="prog-stack-name">{row.label}</div>
                    <div className="prog-stack-bar-wrap">
                      <div className="prog-stack-bar">
                        <div className="prog-stack-fill" style={{ width: lesPct + "%", background: barColor }} />
                      </div>
                      <span className="prog-stack-pct" style={{ color: barColor }}>{lesPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="page-section-title">Recent Activity</div>
            <div className="dash-section-meta">Last 7 days</div>
          </div>
          <div className="act-table-wrap"><table className="act-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Day</th>
                <th>Lessons</th>
                <th>Dharma</th>
                <th>Snippets Viewed</th>
                <th>Plants Sown 🌿</th>
              </tr>
            </thead>
            <tbody>
              {activityData.map(a => (
                <tr key={a.date}>
                  <td>
                    <span className={"act-day" + (a.today ? " act-today" : "")}>{a.day}</span>
                    <span className="act-date">{a.date}</span>
                  </td>
                  <td className={a.lessons  > 0 ? "act-nonzero" : ""}>{a.lessons}</td>
                  <td className={a.dharma   > 0 ? "act-nonzero" : ""}>{a.dharma}</td>
                  <td className={a.snippets > 0 ? "act-nonzero" : ""}>{a.snippets}</td>
                  <td className={a.plants   > 0 ? "act-nonzero" : ""}>{a.plants}</td>
                </tr>
              ))}
              <tr className="act-total">
                <td>7-day total</td>
                <td>{activityData.reduce((s, a) => s + a.lessons,  0)}</td>
                <td>{activityData.reduce((s, a) => s + a.dharma,   0)}</td>
                <td>{activityData.reduce((s, a) => s + a.snippets, 0)}</td>
                <td>{activityData.reduce((s, a) => s + a.plants,   0)}</td>
              </tr>
            </tbody>
          </table></div>
          {/* Stacked view — shown at ≤600px via CSS */}
          <div className="act-stack">
            {activityData.map(a => (
              <div className="act-stack-row" key={a.date}>
                <div>
                  <span className={"act-stack-day" + (a.today ? " today" : "")}>{a.day}</span>
                  <span className="act-stack-date">{a.date}</span>
                </div>
                <div className="act-stack-pills">
                  {a.lessons === 0 && a.dharma === 0 ? (
                    <span className="act-pill act-pill-none">No activity</span>
                  ) : (
                    <>
                      {a.lessons > 0 && <span className="act-pill act-pill-lesson">{a.lessons} lesson{a.lessons !== 1 ? "s" : ""}</span>}
                      {a.dharma  > 0 && <span className="act-pill act-pill-dharma">{a.dharma} pts</span>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Your Forest ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="page-section-title"><i className="ti ti-trees" style={{color: "#00924A", marginRight: 6}} />Your Forest</div>
            <div className="dash-section-meta">{totalPlants} plant{totalPlants !== 1 ? "s" : ""} grown</div>
          </div>
          {totalPlants === 0 && dharmaTokens === 0 ? (
            <div className="forest-empty">Complete your first lesson to start growing your forest.</div>
          ) : (
            <>
              <div className="forest-grid">
                {FOREST_TOKENS.map(t => {
                  const count = forestTokens[t.type] || 0;
                  return (
                    <div className="forest-token" key={t.type}>
                      <div className="forest-token-icon">{t.icon}</div>
                      <div className={"forest-token-count" + (count === 0 ? " zero" : "")}>{count}</div>
                      <div className="forest-token-label">{t.label}</div>
                      <div className="forest-token-sub">{t.sub}</div>
                    </div>
                  );
                })}
              </div>
              {dharmaTokens > 0 && (
                <div className="forest-dharma">✦ {dharmaTokens.toLocaleString()} dharma seeds gathered</div>
              )}
            </>
          )}
        </div>

        {/* ── Earned Badges ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="page-section-title"><i className="ti ti-trophy" style={{color: "#FF8E00", marginRight: 6}} />Earned Badges</div>
            <div className="dash-section-meta">{earnedBadgeIds.size}/{allBadges.length} earned</div>
          </div>
          {allBadges.length === 0 ? (
            <SkeletonBadges count={3} />
          ) : (
            <div className="badge-cards">
              {allBadges.map(badge => {
                const isEarned = earnedBadgeIds.has(badge.badge_id);
                return (
                  <div key={badge.badge_id} className={"badge-card" + (isEarned ? " earned" : " locked")} title={badge.description || ""}>
                    <div className="badge-card-icon">{badge.badge_icon}</div>
                    <div className="badge-card-name">{badge.badge_name}</div>
                    <div className="badge-card-desc">{badge.description}</div>
                    {isEarned
                      ? <div className="badge-card-earned-tag">✓ Earned</div>
                      : <div className="badge-card-locked-tag">Locked</div>
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>

{/* ── Share Your Yatra ── */}
        <div className="dash-section">
          <div className="dash-section-head">
            <div className="page-section-title"><i className="ti ti-share" style={{color: "#00509E", marginRight: 6}} />Share Your Yatra</div>
            <button
              className={"share-gear" + (showShareSettings ? " open" : "")}
              title="Customise share message"
              onClick={() => { setShareMsgDraft(shareMessage); setShowShareSettings(v => !v); }}>
              ⚙
            </button>
          </div>

          {/* Settings panel */}
          {showShareSettings && (
            <div className="share-settings">
              <div className="share-settings-label">Customise your message</div>
              <textarea
                className="share-textarea"
                value={shareMsgDraft}
                onChange={e => setShareMsgDraft(e.target.value)}
              />
              <div className="share-tokens">
                <span>Insert:</span>
                {["{dharma}", "{lessons}", "{name}"].map(tok => (
                  <span key={tok} className="share-token"
                    onClick={() => setShareMsgDraft(d => d + " " + tok)}>
                    {tok}
                  </span>
                ))}
              </div>
              <div className="share-settings-row">
                <button className="share-reset-btn" onClick={handleShareReset}>Reset</button>
                <button className="share-save-btn" onClick={handleShareSave}>Save</button>
              </div>
            </div>
          )}

          <div className="share-inner">
            <div className="share-preview">
              <div className="share-preview-logo">IndiYatra · Heritage of Bharat</div>
              <div className="share-stat-row">
                <div className="share-stat">
                  <div className="share-stat-val">{totalDharma}</div>
                  <div className="share-stat-lbl">Dharma Pts</div>
                </div>
                <div className="share-stat">
                  <div className="share-stat-val">{lessonsCompleted}</div>
                  <div className="share-stat-lbl">Lessons</div>
                </div>
              </div>
              <div className="share-msg-text">{shareText}</div>
            </div>
            <div className="share-actions">
              <div className="share-btn-row">
                <button
                  className={"share-btn share-btn-wa" + (canShare ? " active" : "")}
                  disabled={!canShare}
                  aria-label="Share on WhatsApp"
                  title="Share on WhatsApp"
                  onClick={canShare ? () => window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank") : undefined}>
                  <i className="ti ti-brand-whatsapp" aria-hidden="true" />
                </button>
                <button
                  className={"share-btn share-btn-tw" + (canShare ? " active" : "")}
                  disabled={!canShare}
                  aria-label="Share on X"
                  title="Share on X"
                  onClick={canShare ? () => window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText), "_blank") : undefined}>
                  <i className="ti ti-brand-x" aria-hidden="true" />
                </button>
                <button
                  className={"share-btn share-btn-copy" + (canShare ? " active" : "") + (copyDone ? " copied" : "")}
                  disabled={!canShare}
                  aria-label={copyDone ? "Copied" : "Copy link"}
                  title={copyDone ? "Copied" : "Copy link"}
                  onClick={canShare ? handleCopyLink : undefined}>
                  <i className={"ti " + (copyDone ? "ti-check" : "ti-link")} aria-hidden="true" />
                </button>
              </div>
              {!canShare && <div className="share-coming">Sign in to share</div>}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
