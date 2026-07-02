import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { SkeletonBadges } from "../components/Skeletons";
import { supabaseClient } from "../lib/auth";
import { useAuthContext } from "../contexts/AuthContext";
import { APP_URL, APP_SHARE_LOGO, PLAYER, DEFAULT_SHARE_MSG, DEFAULT_SHARE_MSG_WITH_SCORE, DEFAULT_SHARE_MSG_NO_SCORE, FOREST_TOKENS as FOREST_TOKEN_DEFS } from "../config/appStrings";
import RecommendationsRail from "../components/RecommendationsRail";

// Off-brand colours removed — using brand constants only

const styles = `
  /* ── Welcome Hero Band ── */
  .dash-hero {
    background: white; border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 24px 20px; margin-bottom: 24px;
    display: flex; align-items: stretch; gap: 0;
  }
  .dash-hero-left { flex: 1 1 0; min-width: 0; }
  .dash-hero-right {
    display: none;
    border-left: 1px solid #F3F4F6; padding-left: 28px; margin-left: 28px;
    flex-direction: column; justify-content: center; flex-shrink: 0;
  }
  .dash-nav-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px;
  }
  @media (min-width: 900px) { .dash-hero-right { display: flex; } }
  .dash-nav-label {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .dash-nav-link {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.875rem; color: #374151; text-decoration: none;
    font-family: 'Nunito Sans', system-ui, sans-serif; font-weight: 600;
    padding: 5px 0; border-radius: 6px; transition: color 0.15s; cursor: pointer;
    background: none; border: none;
  }
  .dash-nav-link:hover { color: #FF8E00; }
  .dash-nav-link i { font-size: 1rem; width: 18px; text-align: center; }

  /* ── Course chip ── */
  .dash-course-chip {
    display: inline-block; padding: 3px 14px; border-radius: 999px;
    background: ${SAFFRON}15; color: ${SAFFRON}; font-size: 0.75rem;
    font-weight: 600; letter-spacing: 0.04em; margin-bottom: 10px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* ── Welcome title ── */
  .dash-subtitle {
    font-size: 0.9375rem; color: #4A5565; margin-top: 2px; margin-bottom: 0;
    font-family: 'Nunito Sans', system-ui, sans-serif; font-weight: 400;
  }
  .dash-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 2rem; font-weight: 700;
    color: #101828; margin-bottom: 18px; line-height: 1.25;
  }

  /* ── Scope pill ── */
  .dash-scope-wrap {
    position: relative; display: inline-block; margin-top: 14px;
  }
  .dash-scope-pill {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 7px 14px; border-radius: 12px; cursor: pointer;
    font-size: 0.8125rem; font-weight: 500; white-space: nowrap;
    color: #101828; background: white;
    border: 1px solid #E5E7EB;
    font-family: 'Inter', system-ui, sans-serif;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
    min-height: 36px;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .dash-scope-pill:hover, .dash-scope-pill.open {
    border-color: ${SAFFRON}; color: ${SAFFRON}; background: ${SAFFRON}08;
  }
  .dash-scope-pill-icon { font-size: 1rem; line-height: 1; }
  .dash-scope-pill-chevron { font-size: 1rem; color: #4A5565; margin-left: 4px; line-height: 1; }
  .dash-scope-pill.open .dash-scope-pill-chevron { color: ${SAFFRON}; }
  .dash-scope-hint {
    font-size: 0.75rem; color: #9CA3AF; margin-top: 7px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .dash-dropdown-backdrop { position: fixed; inset: 0; z-index: 199; }
  .dash-dropdown {
    position: absolute; top: calc(100% + 6px); left: 0; z-index: 200;
    background: white; border: 1px solid #E5E7EB; border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08); min-width: 160px;
    overflow: hidden; padding: 4px 0;
  }
  .dash-dropdown-item {
    padding: 11px 16px; font-size: 0.875rem; color: #101828; cursor: pointer;
    font-family: 'Nunito Sans', system-ui, sans-serif;
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
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    padding: 18px 14px; position: relative; overflow: hidden;
    transition: transform 0.18s, border-color 0.18s;
    text-align: center;
  }
  .stat-card:hover { border-color: #B5D7D5; transform: translateY(-2px); }
  .stat-ghost { background: transparent; border: 1px dashed #F3F4F6 !important; pointer-events: none; }
  .stat-ghost:hover { transform: none !important; }
  .stat-icon { font-size: 1.375rem; margin-bottom: 10px; line-height: 1; color: ${HERITAGE}; }
  .stat-label {
    display: flex; flex-direction: column; align-items: center; gap: 1px;
    font-size: 0.625rem; font-weight: 600; letter-spacing: 0.07em;
    text-transform: uppercase; color: #4A5565; margin-bottom: 5px;
    line-height: 1.1; font-family: 'Inter', system-ui, sans-serif;
  }
  .stat-label-word { display: block; line-height: 1.1; }
  .stat-value {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.75rem;
    font-weight: 700; line-height: 1; margin-bottom: 4px; color: ${HERITAGE};
  }
  .stat-sub  { font-size: 0.6875rem; color: #4A5565; line-height: 1.3; }
  .stat-link { font-size: 0.6875rem; color: ${HERITAGE}; cursor: pointer; font-family: 'Inter', system-ui, sans-serif; }
  .stat-link:hover { text-decoration: underline; }

  /* ── Section card ── */
  .dash-section {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    padding: 24px; margin-bottom: 24px;
  }
  .dash-section-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 18px;
  }
  .dash-section-meta { font-size: 0.75rem; color: #4A5565; font-weight: 600; font-family: 'Inter', system-ui, sans-serif; }

  /* ── Streak heatmap ── */
  .streak-grid { display: flex; gap: 3px; flex-wrap: wrap; }
  .streak-cell { width: 13px; height: 13px; border-radius: 3px; flex-shrink: 0; }
  .streak-legend {
    display: flex; align-items: center; gap: 6px;
    margin-top: 10px; font-size: 0.6875rem; color: #4A5565;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .streak-legend-cell { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
  .streak-summary { font-size: 0.9375rem; color: #4A5565; margin-top: 10px; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .streak-summary strong { color: #101828; }

  /* ── Course progress table ── */
  .prog-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .prog-table { width: 100%; border-collapse: collapse; }
  .prog-table th {
    font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: #4A5565; padding: 0 0 10px; text-align: left;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .prog-table th:not(:first-child) { text-align: center; }
  .prog-table td { padding: 12px 0; border-top: 1px solid #E5E7EB; vertical-align: middle; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .prog-theme-name { font-size: 0.9375rem; font-weight: 700; color: ${SAFFRON}; text-align: left; }
  .prog-bar-wrap { display: flex; align-items: center; gap: 6px; justify-content: center; }
  .prog-bar { height: 6px; width: 80px; background: #F3F4F6; border-radius: 3px; overflow: hidden; flex-shrink: 0; }
  .prog-bar-fill { height: 100%; border-radius: 3px; }
  .prog-pct { font-size: 0.6875rem; font-weight: 700; min-width: 28px; text-align: right; font-family: 'Inter', system-ui, sans-serif; }
  .prog-counts { font-size: 0.625rem; color: #4A5565; text-align: right; }

  /* ── Activity table ── */
  .act-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .act-table { width: 100%; border-collapse: collapse; }
  .act-table th {
    font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: #4A5565; padding: 0 0 10px;
    text-align: right; font-family: 'Inter', system-ui, sans-serif;
  }
  .act-table th:first-child { text-align: left; }
  .act-table td {
    padding: 11px 0; border-top: 1px solid #E5E7EB;
    font-size: 0.9375rem; text-align: right; color: #4A5565;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .act-table td:first-child { text-align: left; }
  .act-day   { font-weight: 700; color: #101828; font-size: 0.9375rem; }
  .act-today { color: ${SAFFRON}; }
  .act-date  { font-size: 0.75rem; color: #4A5565; margin-left: 5px; }
  .act-total td { font-weight: 700; color: #101828; border-top: 2px solid #E5E7EB !important; }
  .act-nonzero { font-weight: 700; color: ${HERITAGE} !important; }

  /* ── Activity bar charts (mobile) ── */
  .act-charts { display: none; grid-template-columns: 1fr 1fr; gap: 16px 12px; }
  .act-chart-head {
    display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;
  }
  .act-chart-label {
    font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.07em; color: #4A5565; font-family: 'Inter', system-ui, sans-serif;
  }
  .act-chart-total {
    font-family: 'Oswald', sans-serif; font-size: 1.125rem; font-weight: 700; color: ${HERITAGE};
    line-height: 1;
  }
  .act-chart-bars {
    display: flex; align-items: flex-end; gap: 3px; height: 52px;
  }
  .act-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; }
  .act-bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .act-bar-fill {
    width: 100%; border-radius: 3px 3px 0 0; min-height: 2px;
  }
  .act-bar-day {
    font-size: 0.5625rem; color: #C4C9D4; font-weight: 600;
    font-family: 'Inter', system-ui, sans-serif; line-height: 1;
  }
  .act-bar-day.today { color: ${SAFFRON}; }

  /* ── Quiz Performance table ── */
  .qperf-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .qperf-table th {
    font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: #4A5565; padding: 0 0 10px;
    text-align: right; font-family: 'Inter', system-ui, sans-serif;
  }
  .qperf-table th:first-child { text-align: left; }
  .qperf-table td {
    padding: 11px 0; border-top: 1px solid #E5E7EB;
    text-align: right; color: #4A5565; font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.875rem;
  }
  .qperf-table td:first-child { text-align: left; font-weight: 600; color: #101828; }
  .qperf-num { font-weight: 700; color: ${HERITAGE}; font-family: 'Oswald', sans-serif; font-size: 1rem; }
  .qperf-num.dim { color: #aaa; font-weight: 400; font-size: 0.875rem; font-family: 'Nunito Sans', sans-serif; }
  .qperf-score {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 3px 10px; border-radius: 999px;
    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.03em;
    line-height: 1; white-space: nowrap;
  }
  .qperf-score.good { background: #EDFBF3; color: #065F3E; }
  .qperf-score.ok   { background: #FFF3E0; color: #92400E; }
  .qperf-score.low  { background: #FEF2F2; color: #7F1D1D; }
  .qperf-score.none { background: #F3F4F6; color: #9CA3AF; }
  .qperf-rank { font-size: 0.8125rem; color: #4A5565; }
  .qperf-rank strong { color: ${HERITAGE}; font-family: 'Oswald', sans-serif; font-size: 1rem; font-weight: 700; }

  /* ── Quiz perf mobile stack ── */
  .qperf-stack { display: none; }
  .qperf-stack-row {
    padding: 12px 0; border-top: 1px solid #E5E7EB;
    display: flex; flex-direction: column; gap: 6px;
  }
  .qperf-stack-row:first-child { border-top: none; }
  .qperf-stack-name { font-weight: 700; color: #101828; font-size: 0.9375rem; }
  .qperf-stack-stats {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  }
  .qperf-stack-item {
    font-size: 0.75rem; color: #4A5565;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .qperf-stack-item span { font-weight: 700; color: ${HERITAGE}; font-family: 'Oswald', sans-serif; font-size: 0.9rem; }

  /* ── Badges ── */
  .badge-level-label {
    font-size: 0.625rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: #4A5565; margin-bottom: 10px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .badge-theme-group { margin-bottom: 16px; }
  .badge-theme-label {
    font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.05em;
    text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 10px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .badge-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .badge-item { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 52px; }
  .badge-circle {
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.0625rem; transition: transform 0.18s; cursor: default;
  }
  .badge-circle.earned { border: 2px solid ${SAFFRON}; background: white; }
  .badge-circle.earned:hover { transform: scale(1.12); }
  .badge-circle.locked { border: 2px solid #E5E7EB; background: white; opacity: 0.4; }
  .badge-name { font-size: 0.5625rem; color: #4A5565; text-align: center; line-height: 1.3; font-family: 'Nunito Sans', system-ui, sans-serif; }

  /* ── Share card ── */
  .share-section-head {
    flex-wrap: nowrap; gap: 8px; margin-bottom: 16px; align-items: center;
  }
  .share-section-head .page-section-title {
    flex: 0 1 auto; min-width: 0; white-space: nowrap;
    font-size: 1.125rem; margin-right: 4px;
  }
  .share-head-toolbar {
    display: flex; align-items: center; gap: 4px; margin-left: auto; flex-shrink: 0;
  }
  .share-inner { display: block; }
  .share-preview {
    width: 100%; box-sizing: border-box;
    background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px 22px;
  }
  .share-preview-logo {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.125rem; font-weight: 500;
    color: ${GREEN}; margin-bottom: 14px;
  }
  .share-stat-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; justify-content: space-evenly; }
  .share-stat { text-align: center; }
  .share-stat-val {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.625rem;
    font-weight: 700; line-height: 1; color: ${GREEN};
  }
  .share-stat-lbl { font-size: 0.625rem; color: #4A5565; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; font-family: 'Inter', system-ui, sans-serif; }
  .share-footer-txt { font-size: 0.6875rem; color: #4A5565; margin-top: 4px; }
  .share-toolbar-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; min-height: 30px; min-width: 30px;
    border-radius: 50%; padding: 0;
    cursor: not-allowed; opacity: 0.45;
    border: 1px solid ${GREEN}; color: ${GREEN};
    background: white; transition: opacity 0.2s, background 0.2s, color 0.2s, border-color 0.2s;
  }
  .share-toolbar-btn .ti { font-size: 0.9375rem; line-height: 1; }
  .share-toolbar-btn.active { cursor: pointer; opacity: 1; }
  .share-toolbar-btn.active:hover { background: ${GREEN}; color: white; }
  .share-toolbar-btn.copied { background: ${GREEN}; color: white; }
  .share-toolbar-btn.share-edit {
    border-color: #E5E7EB; color: #4A5565; cursor: pointer; opacity: 1;
  }
  .share-toolbar-btn.share-edit:hover,
  .share-toolbar-btn.share-edit.open {
    color: ${SAFFRON}; border-color: ${SAFFRON}; background: ${SAFFRON}08;
  }
  .share-coming { font-size: 0.6875rem; color: #4A5565; text-align: right; font-style: italic; margin-top: 8px; }

  /* ── Share settings panel ── */
  .share-settings {
    background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 14px 16px; margin-bottom: 16px;
  }
  .share-settings-label {
    font-size: 0.6875rem; font-weight: 600; color: #4A5565;
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .share-textarea {
    width: 100%; min-height: 68px; border: 1px solid #E5E7EB; border-radius: 8px;
    padding: 9px 12px; font-family: 'Nunito Sans', system-ui, sans-serif; font-size: 0.9375rem;
    color: #101828; background: white; resize: vertical; line-height: 1.5;
    box-sizing: border-box;
  }
  .share-textarea:focus { outline: none; border-color: ${SAFFRON}; }
  .share-tokens { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 10px; }
  .share-token {
    font-size: 0.6875rem; background: ${SAFFRON}12; color: ${SAFFRON};
    border: 1px solid ${SAFFRON}33; border-radius: 999px; padding: 2px 10px;
    cursor: pointer; font-weight: 600; user-select: none;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .share-token:hover { background: ${SAFFRON}22; }
  .share-settings-row { display: flex; justify-content: flex-end; gap: 8px; }
  .share-save-btn {
    background: ${SAFFRON}; color: white; border: none; border-radius: 12px;
    padding: 6px 18px; font-size: 0.8125rem; font-weight: 500; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .share-save-btn:hover { opacity: 0.9; }
  .share-reset-btn {
    background: transparent; color: #4A5565; border: 1px solid #E5E7EB;
    border-radius: 12px; padding: 6px 14px; font-size: 0.8125rem; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .share-reset-btn:hover { color: #101828; border-color: #B5D7D5; }
  .share-score-toggle {
    display: inline-flex; align-items: center; gap: 8px; margin-bottom: 10px;
    font-size: 0.8125rem; color: #6B7280; font-family: 'Inter', system-ui, sans-serif;
    cursor: pointer; user-select: none;
  }
  .share-score-toggle input[type="checkbox"] { display: none; }
  .share-toggle-track {
    position: relative; width: 36px; height: 20px; border-radius: 10px;
    background: #D1D5DB; transition: background 0.2s; flex-shrink: 0;
  }
  .share-toggle-track::after {
    content: ''; position: absolute; top: 3px; left: 3px;
    width: 14px; height: 14px; border-radius: 50%;
    background: white; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .share-score-toggle input:checked + .share-toggle-track { background: #FF8E00; }
  .share-score-toggle input:checked + .share-toggle-track::after { transform: translateX(16px); }
  .share-msg-text {
    font-size: 0.9375rem; color: #4A5565; line-height: 1.6; margin-top: 4px;
    font-style: italic; font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  /* ── Forest tokens ── */
  .forest-grid {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 12px; margin-bottom: 14px;
  }
  .forest-token {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: white; border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 16px 8px; transition: border-color 0.2s, transform 0.18s;
  }
  .forest-token:hover { border-color: #B5D7D5; transform: translateY(-2px); }
  .forest-token-icon  { font-size: 1.75rem; line-height: 1; }
  .forest-token-count {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.75rem;
    font-weight: 700; color: #101828; line-height: 1;
  }
  .forest-token-count.zero { color: #4A5565; }
  .forest-token-label { font-size: 0.75rem; font-weight: 700; color: #101828; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .forest-token-sub   { font-size: 0.5625rem; color: #4A5565; text-align: center; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .forest-dharma {
    display: flex; align-items: center; gap: 8px;
    background: white; border: 1px solid ${SAFFRON};
    border-radius: 12px; padding: 6px 16px; width: fit-content;
    font-size: 0.8125rem; font-weight: 600; color: ${SAFFRON};
    font-family: 'Inter', system-ui, sans-serif;
  }
  .forest-empty {
    font-size: 0.9375rem; color: #4A5565; font-style: italic; padding: 8px 0;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  /* ── Badge cards ── */
  .badge-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 14px; }
  .badge-card {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: white; border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 20px 14px; transition: border-color 0.2s, transform 0.18s;
  }
  .badge-card.earned {
    border-color: ${SAFFRON}; background: rgba(255,142,0,0.04);
  }
  .badge-card.earned:hover { transform: translateY(-3px); }
  .badge-card.locked { opacity: 0.45; }
  .badge-card-icon { font-size: 2.25rem; line-height: 1; }
  .badge-card-name {
    font-family: 'Nunito Sans', system-ui, sans-serif; font-size: 0.9375rem;
    font-weight: 700; color: #101828; text-align: center;
  }
  .badge-card-desc {
    font-size: 0.5625rem; color: #4A5565; text-align: center; line-height: 1.4;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .badge-card-earned-tag {
    font-size: 0.5rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: ${SAFFRON}; background: rgba(255,142,0,0.12);
    border-radius: 999px; padding: 2px 8px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .badge-card-locked-tag {
    font-size: 0.5rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: #4A5565;
    font-family: 'Inter', system-ui, sans-serif;
  }
  /* ── Leaderboard ── */
  .lb-show-btn {
    display: flex; align-items: center; gap: 6px;
    background: none; border: 1.5px solid #E5E7EB; border-radius: 10px;
    padding: 7px 16px; font-size: 0.8125rem; font-weight: 600;
    color: #4A5565; cursor: pointer; transition: border-color 0.15s, color 0.15s;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .lb-show-btn:hover, .lb-show-btn.open {
    border-color: ${SAFFRON}; color: ${SAFFRON};
  }
  .lb-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 4px; }
  .lb-table { width: 100%; border-collapse: collapse; }
  .lb-table th {
    font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: #4A5565; padding: 0 0 10px;
    font-family: 'Inter', system-ui, sans-serif; text-align: right;
  }
  .lb-table th:first-child { text-align: center; width: 36px; }
  .lb-table th:nth-child(2) { text-align: left; }
  .lb-table td {
    padding: 11px 0; border-top: 1px solid #E5E7EB;
    font-size: 0.9375rem; text-align: right; color: #4A5565;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .lb-table td:first-child { text-align: center; font-size: 0.8125rem; font-weight: 700; color: #4A5565; width: 36px; }
  .lb-table td:nth-child(2) { text-align: left; font-weight: 700; color: #101828; }
  .lb-row-me td { background: ${SAFFRON}08; }
  .lb-row-me td:nth-child(2) { color: ${SAFFRON}; }
  .lb-rank-medal { font-size: 1rem; }
  .lb-empty {
    font-size: 0.9375rem; color: #4A5565; font-style: italic;
    padding: 16px 0; font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .lb-note {
    font-size: 0.6875rem; color: #4A5565; margin-top: 12px;
    font-family: 'Inter', system-ui, sans-serif; font-style: italic;
  }

  /* ── Activity stacked view (≤600px) ── */
  .act-stack { display: none; }
  .act-stack-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0; border-top: 1px solid #E5E7EB;
    flex-wrap: wrap; gap: 6px;
  }
  .act-stack-day { font-weight: 700; color: #101828; font-size: 0.9375rem; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .act-stack-day.today { color: ${SAFFRON}; }
  .act-stack-date { font-size: 0.75rem; color: #4A5565; margin-left: 5px; }
  .act-stack-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .act-pill {
    font-size: 0.75rem; font-weight: 600; border-radius: 999px;
    padding: 3px 10px; white-space: nowrap;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .act-pill-lesson { background: rgba(0,146,74,0.10); color: #00924A; }
  .act-pill-dharma { background: rgba(255,142,0,0.10); color: ${SAFFRON}; }
  .act-pill-none   { background: #F3F4F6; color: #4A5565; }

  /* ── Progress stacked view (≤600px) ── */
  .prog-stack { display: none; }
  .prog-stack-row { padding: 12px 0; border-top: 1px solid #E5E7EB; }
  .prog-stack-name { font-size: 0.9375rem; font-weight: 700; color: #101828; margin-bottom: 6px; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .prog-stack-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .prog-stack-bar { flex: 1; height: 7px; background: #F3F4F6; border-radius: 4px; overflow: hidden; }
  .prog-stack-fill { height: 100%; border-radius: 4px; }
  .prog-stack-pct { font-size: 0.75rem; font-weight: 700; min-width: 32px; text-align: right; font-family: 'Inter', system-ui, sans-serif; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .dash-section { padding: 18px 16px; }
    .dash-stats   { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .prog-bar     { width: 56px; }
    .forest-grid  { grid-template-columns: repeat(3, 1fr); }
    .badge-cards  { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
  }
  @media (max-width: 600px) {
    .dash-hero { padding: 18px 16px; border-radius: 12px; }
    .prog-table-wrap { display: none; }
    .prog-stack      { display: block; }
    .act-table-wrap  { display: none; }
    .act-stack       { display: none; }
    .act-charts      { display: grid; }
    .forest-token-sub { display: none; }
    .share-msg-text  { font-size: 0.875rem; }
    .qperf-table     { display: none; }
    .qperf-stack     { display: block; }
  }
  @media (max-width: 480px) {
    .dash-title  { font-size: 1.625rem; }
    .dash-stats  { grid-template-columns: repeat(3, 1fr); }
    .stat-value  { font-size: 1.5rem; }
    .streak-cell { width: 11px; height: 11px; }
    .act-table th:nth-child(4), .act-table td:nth-child(4) { display: none; }
    .forest-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .forest-token { padding: 14px 6px; }
    .forest-token-icon  { font-size: 1.5rem; }
    .forest-token-count { font-size: 1.5rem; }
    .share-section-head .page-section-title { font-size: 1rem; }
    .share-head-toolbar { gap: 3px; }
    .share-toolbar-btn { width: 28px; height: 28px; min-width: 28px; min-height: 28px; }
    .share-toolbar-btn .ti { font-size: 0.875rem; }
  }
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
    // Exclude progress rows for lessons that were also completed today — prevents double-counting
    const completedTodayIds = new Set(rows.map(c => c.lesson_id));
    return {
      day:      label,
      date:     d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      lessons:  rows.length,
      dharma:   rows.reduce((s, c) => s + (c.points_earned || 0), 0),
      snippets: rows.reduce((s, c) => s + (c.snippet_count || 0), 0)
                + progRows
                    .filter(p => !completedTodayIds.has(p.lesson_id))
                    .reduce((s, p) => s + (p.snippet_index + 1), 0),
      plants:   plantRows.length,
      today:    i === 0,
    };
  });
}

// ─── Gauge chart helper ──────────────────────────────────────────────────────
function GaugeChart({ pct, label, sub, color }) {
  const cx = 50, cy = 56, r = 42, sw = 9;
  const p  = Math.max(0, Math.min(100, pct || 0));
  // Arc from (cx-r, cy) clockwise through top to end point
  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  let   fillPath  = null;
  if (p > 0 && p < 100) {
    const ang = Math.PI * (1 - p / 100);
    const ex  = (cx + r * Math.cos(ang)).toFixed(2);
    const ey  = (cy - r * Math.sin(ang)).toFixed(2);
    fillPath  = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  } else if (p === 100) {
    fillPath = trackPath; // full arc
  }
  const fillColor  = p === 0 ? "#E5E7EB" : p === 100 ? GREEN : color;
  const textColor  = p === 0 ? "#9CA3AF" : fillColor;
  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 100 62" style={{ width: "100%", maxWidth: 140, display: "block", margin: "0 auto" }}>
        <path d={trackPath} fill="none" stroke="#F3F4F6" strokeWidth={sw} strokeLinecap="round" />
        {fillPath && <path d={fillPath} fill="none" stroke={fillColor} strokeWidth={sw} strokeLinecap="round" />}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={textColor}
          fontSize="17" fontWeight="700" fontFamily="'Oswald','Arial Narrow',sans-serif">
          {p}%
        </text>
      </svg>
      <div style={{
        fontSize: "0.75rem", fontWeight: 700, color: "#101828",
        fontFamily: "'Nunito Sans',system-ui,sans-serif",
        lineHeight: 1.3, marginTop: 2, padding: "0 4px",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }} title={label}>{label}</div>
      {sub && <div style={{ fontSize: "0.625rem", color: "#6B6B6B", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage({ course, settings, onBack, onOpenSettings, onResume, languages = [], onSaveSettings, onLikes, onBookmarks, onDiscover, onForYou, onAllCourses, isAdmin, onAdmin, userEditorialRole, onEditor, activePage }) {
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
  const [leaderboard,        setLeaderboard]        = useState(null);   // null = not yet loaded
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);

  // ── Quiz performance ──────────────────────────────────────────────────────
  const [rawQuizSets,      setRawQuizSets]      = useState([]);
  const [rawQuizQuestions, setRawQuizQuestions] = useState([]);
  const [rawUserAttempts,  setRawUserAttempts]  = useState([]);
  const [quizRanks,        setQuizRanks]        = useState([]);

  const [includeScore,    setIncludeScore]   = useState(() => localStorage.getItem("indiyatra_share_include_score") !== "false");
  const [shareMessage,    setShareMessage]   = useState(() => localStorage.getItem("indiyatra_share_message") || DEFAULT_SHARE_MSG);
  const [shareMsgDraft,   setShareMsgDraft]  = useState(shareMessage);
  const [showShareSettings, setShowShareSettings] = useState(false);
  const [copyDone,        setCopyDone]        = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch this user's completions + in-progress lesson positions
        if (user && !user.is_anonymous) {
          const [{ data: compData }, { data: progData }, { data: likesData }, { data: tokenData }, { data: earnedData }, { data: attemptsData }] = await Promise.all([
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
            supabaseClient
              .from("quiz_attempts")
              .select("quiz_id, score, max_score, answers, completed_at")
              .eq("profile_id", user.id)
              .not("completed_at", "is", null)
              .order("completed_at", { ascending: false }),
          ]);
          setCompletions(compData || []);
          setLessonProgress(progData || []);
          setRawLikes(likesData || []);
          const tmap = {};
          (tokenData || []).forEach(r => { tmap[r.token_type] = (tmap[r.token_type] || 0) + (r.quantity || 1); });
          setForestTokens(tmap);
          setRawTokensData(tokenData || []);
          setEarnedBadgeIds(new Set((earnedData || []).map(b => b.badge_id)));
          setRawUserAttempts(attemptsData || []);
          // Ranks fetched separately so a missing RPC never blocks the rest of the data
          supabaseClient.rpc("get_quiz_ranks", { p_profile_id: user.id })
            .then(({ data }) => setQuizRanks(data || []))
            .catch(() => setQuizRanks([]));
        }
        // Fetch all public structural data in parallel
        // Public structural data — use anon supabase() helper (matches CoursePage pattern)
        const [lessonCount, themesData, modulesData, lessonsData, coursesData, mappingData, badgesData, quizSetsData, quizQuestionsData] = await Promise.all([
          supabase("lessons", "?select=lesson_id"),
          supabase("themes",  "?select=*&order=theme_id"),
          supabase("modules",  "?select=module_id,theme_id,level_id,course_id"),
          supabase("lessons",  "?select=lesson_id,module_id"),
          supabase("courses",  "?select=course_id,course_name,snippet_count&order=course_id"),
          supabase("lesson_snippet_mapping", "?select=lesson_id"),
          supabase("badges", "?select=*&is_active=eq.true&order=sort_order"),
          supabase("quiz_sets", "?select=quiz_id,lesson_id&is_published=eq.true"),
          supabase("quiz_questions", "?select=quiz_id,question_key&question_key=not.is.null"),
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
        setRawQuizSets(sa(quizSetsData));
        setRawQuizQuestions(sa(quizQuestionsData));
      } catch (e) {
        console.warn("DashboardPage fetchData:", e);
      }
    }
    fetchData();
  }, [user?.id]);

  // Re-fetch quiz attempts + ranks every time the user returns to the dashboard
  // (the main fetchData only runs on mount, so stale data persists after a quiz)
  useEffect(() => {
    if (!user || user.is_anonymous || activePage !== "dashboard") return;
    supabaseClient
      .from("quiz_attempts")
      .select("quiz_id, score, max_score, answers, completed_at")
      .eq("profile_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .then(({ data }) => setRawUserAttempts(data || []));
    supabaseClient.rpc("get_quiz_ranks", { p_profile_id: user.id })
      .then(({ data }) => setQuizRanks(data || []))
      .catch(() => {});
  }, [activePage, user?.id]);

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

  // ── "Courses" view: Progress by Course ────────────────────────────────
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
      .filter(m => !_courseId || m.course_id === _courseId)
      .map(m => m.module_id)
  );
  const _courseLessonIds = new Set(
    rawLessons
      .filter(l => _courseModuleIds.has(l.module_id))
      .map(l => l.lesson_id)
  );
  const _hasLessonIds = _courseLessonIds.size > 0;

  // completions carry course_id on each row — filter directly.
  // Legacy rows with null course_id are attributed via lesson_id membership in _courseLessonIds
  // rather than being included in every course (the old !c.course_id catch-all caused 7/5 bugs).
  const scopedCompletions = scope !== "all" && _courseId
    ? completions.filter(c =>
        c.course_id === _courseId ||
        (!c.course_id && _hasLessonIds && _courseLessonIds.has(c.lesson_id)))
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
  // Only add progress rows for lessons that are NOT yet completed — prevents double-counting
  // (lesson_progress rows persist even after a lesson is completed).
  const scopedCompletedIds = new Set(scopedCompletions.map(c => c.lesson_id));
  const snippetsViewed   = scopedCompletions.reduce((s, c) => s + (c.snippet_count || 0), 0)
                         + scopedProgress
                             .filter(p => !scopedCompletedIds.has(p.lesson_id))
                             .reduce((s, p) => s + (p.snippet_index + 1), 0);
  const streakData       = buildStreakFromCompletions(scopedCompletions);
  const activityData     = buildActivityFromCompletions(scopedCompletions, scopedProgress, rawTokensData);

  // ── Quiz performance derived values ────────────────────────────────────────
  // Last attempt per quiz (rawUserAttempts is already ordered desc by completed_at)
  const lastAttemptByQuiz = {};
  rawUserAttempts.forEach(a => { if (!lastAttemptByQuiz[a.quiz_id]) lastAttemptByQuiz[a.quiz_id] = a; });

  // Unique question_keys per quiz (quiz_questions already has UNIQUE(quiz_id, question_key))
  const questionsPerQuiz = {};
  rawQuizQuestions.forEach(qq => { questionsPerQuiz[qq.quiz_id] = (questionsPerQuiz[qq.quiz_id] || 0) + 1; });

  // lesson_id → { courseId, themeId } for all lessons (not just snippet-mapped ones)
  const quizLessonMeta = {};
  rawLessons.forEach(l => {
    const modId = l.module_id;
    quizLessonMeta[l.lesson_id] = { courseId: courseByModule[modId], themeId: themeByModule[modId] };
  });

  // Rank lookup: "course:id" or "theme:id" → { user_rank, total_users }
  const rankMap = {};
  quizRanks.forEach(r => { rankMap[`${r.scope_type}:${r.scope_id}`] = r; });

  function ordinalSuffix(n) {
    const v = n % 100;
    return n + (["th","st","nd","rd"][(v - 20) % 10] || ["th","st","nd","rd"][v] || "th");
  }

  function buildQuizPerfByCourse() {
    const cmap = {};
    rawCourses.forEach(c => { cmap[c.course_id] = { id: c.course_id, name: c.course_name, totalQuizzes: 0, triedQuizzes: 0, totalQuestions: 0, triedQuestions: 0, totalScore: 0, totalMaxScore: 0 }; });
    rawQuizSets.forEach(qs => {
      const meta = quizLessonMeta[qs.lesson_id];
      const row  = meta?.courseId ? cmap[meta.courseId] : null;
      if (!row) return;
      row.totalQuizzes++;
      row.totalQuestions += questionsPerQuiz[qs.quiz_id] || 0;
      const att = lastAttemptByQuiz[qs.quiz_id];
      if (att) {
        row.triedQuizzes++;
        row.triedQuestions += (att.answers || []).filter(a => a.chosen_option !== null).length;
        row.totalScore    += att.score     || 0;
        row.totalMaxScore += att.max_score || 0;
      }
    });
    return rawCourses
      .map(c => {
        const row = cmap[c.course_id];
        if (!row || row.totalQuizzes === 0) return null;
        const scorePct  = row.totalMaxScore > 0 ? Math.round(row.totalScore / row.totalMaxScore * 100) : null;
        const rankEntry = rankMap[`course:${c.course_id}`];
        return { ...row, scorePct, rank: rankEntry?.user_rank ?? null, totalUsers: rankEntry?.total_users ?? null };
      }).filter(Boolean);
  }

  function buildQuizPerfByTheme() {
    const courseId = _courseId;
    const tmap = {};
    rawThemes.forEach(t => { tmap[t.theme_id] = { id: t.theme_id, name: t.title, totalQuizzes: 0, triedQuizzes: 0, totalQuestions: 0, triedQuestions: 0, totalScore: 0, totalMaxScore: 0 }; });
    rawQuizSets.forEach(qs => {
      const meta = quizLessonMeta[qs.lesson_id];
      if (!meta?.themeId || !tmap[meta.themeId]) return;
      if (courseId && meta.courseId !== courseId) return;
      const row = tmap[meta.themeId];
      row.totalQuizzes++;
      row.totalQuestions += questionsPerQuiz[qs.quiz_id] || 0;
      const att = lastAttemptByQuiz[qs.quiz_id];
      if (att) {
        row.triedQuizzes++;
        row.triedQuestions += (att.answers || []).filter(a => a.chosen_option !== null).length;
        row.totalScore    += att.score     || 0;
        row.totalMaxScore += att.max_score || 0;
      }
    });
    const order = rawThemes.map(t => t.theme_id);
    return Object.values(tmap)
      .filter(t => t.totalQuizzes > 0)
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
      .map(t => {
        const scorePct  = t.totalMaxScore > 0 ? Math.round(t.totalScore / t.totalMaxScore * 100) : null;
        const rankEntry = rankMap[`theme:${t.id}`];
        return { ...t, scorePct, rank: rankEntry?.user_rank ?? null, totalUsers: rankEntry?.total_users ?? null };
      });
  }

  const quizPerfRows = scope !== "all" ? buildQuizPerfByTheme() : buildQuizPerfByCourse();

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

  const dharmaTokens = forestTokens["dharma"] || 0;
  const STATS = [
    {
      key: "dharma",  icon: <i className="ti ti-diamond" />,  label: PLAYER.dharmaPoints,
      value: dharmaTokens.toLocaleString(), sub: null,
    },
    {
      key: "lessons", icon: <i className="ti ti-book-2" />, label: "Lessons Completed",
      value: courseLessonTotal ? `${lessonsCompleted}/${courseLessonTotal}` : String(lessonsCompleted),
      sub: null,
    },
    {
      key: "badges", icon: <i className="ti ti-trophy" />, label: "Badges Earned",
      value: allBadges.length > 0 ? `${earnedBadgeIds.size}/${allBadges.length}` : "—",
      sub: null,
    },
    { key: "snippets",  icon: <i className="ti ti-book-2" />, label: "Snippets Viewed", value: String(snippetsViewed), sub: null },
    { key: "bookmarks", icon: <i className="ti ti-heart" />, label: "Snippets Liked",  value: scopedLikesCount !== null ? scopedLikesCount.toLocaleString() : "—", sub: null, onClick: onLikes },
  ];

  const FOREST_TOKENS = FOREST_TOKEN_DEFS.filter(t => t.type !== "dharma");
  const totalPlants = FOREST_TOKENS.reduce((s, t) => s + (forestTokens[t.type] || 0), 0);

  const quizzesAttempted = Object.keys(lastAttemptByQuiz).length;
  const allLastAttempts  = Object.values(lastAttemptByQuiz);
  const _totalScore    = allLastAttempts.reduce((s, a) => s + (a.score || 0), 0);
  const _totalMaxScore = allLastAttempts.reduce((s, a) => s + (a.max_score || 0), 0);
  const avgScorePct    = _totalMaxScore > 0 ? Math.round(_totalScore / _totalMaxScore * 100) : null;
  const avgScoreText   = avgScorePct !== null ? `${avgScorePct}%` : "—";

  function renderShareText(tmpl) {
    return (tmpl || DEFAULT_SHARE_MSG)
      .replace("{name}",      displayName)
      .replace("{snippets}",  String(snippetsViewed))
      .replace("{lessons}",   String(lessonsCompleted))
      .replace("{quizzes}",   String(quizzesAttempted))
      .replace("{score}",     avgScoreText)
      .replace("{dharma}",    String(dharmaTokens))
      .replace("{trees}",     String(totalPlants));
  }
  function handleShareSave() {
    localStorage.setItem("indiyatra_share_message", shareMsgDraft);
    setShareMessage(shareMsgDraft);
    setShowShareSettings(false);
  }
  function handleShareReset() {
    setShareMsgDraft(includeScore ? DEFAULT_SHARE_MSG_WITH_SCORE : DEFAULT_SHARE_MSG_NO_SCORE);
  }
  function handleToggleScore(val) {
    setIncludeScore(val);
    localStorage.setItem("indiyatra_share_include_score", String(val));
    const newDefault = val ? DEFAULT_SHARE_MSG_WITH_SCORE : DEFAULT_SHARE_MSG_NO_SCORE;
    setShareMsgDraft(newDefault);
    setShareMessage(newDefault);
    localStorage.setItem("indiyatra_share_message", newDefault);
  }
  function handleCopyLink() {
    navigator.clipboard.writeText(APP_URL).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }
  function handleCopyShare() {
    const text = renderShareText(shareMessage);
    navigator.clipboard.writeText(text + "\n\n" + APP_URL).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }
  async function handleShowLeaderboard() {
    if (leaderboardVisible && leaderboard !== null) {
      setLeaderboardVisible(false);
      return;
    }
    setLeaderboardVisible(true);
    if (leaderboard !== null) return; // cached from earlier in session
    setLeaderboardLoading(true);
    try {
      const myId = user && !user.is_anonymous ? user.id : null;
      const args = {
        ...(  _courseId ? { p_course_id:  _courseId } : {}),
        ...(myId        ? { p_profile_id: myId }       : {}),
      };
      const { data, error } = await supabaseClient.rpc("get_leaderboard", args);
      if (error) throw error;
      setLeaderboard(data || []);
    } catch (e) {
      console.warn("get_leaderboard:", e);
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  // When the scope pill changes, reset the leaderboard so the next
  // Show press re-fetches with the correct course filter.
  useEffect(() => {
    setLeaderboard(null);
    setLeaderboardVisible(false);
  }, [scope]);

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
          { label: "Home",        onClick: onBack         },
          { label: "Courses", onClick: onAllCourses   },
          { label: "For You",     onClick: onForYou       },
          { label: "Dashboard",   onClick: () => {}       },
          { label: "Discover",    onClick: onDiscover     },
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
          <div className="dash-hero-left">
          <div className="dash-title">Welcome back, {displayName}</div>
          <div className="dash-subtitle">{subtitleText}</div>
          {activeDropdown && <div className="dash-dropdown-backdrop" onClick={() => setActiveDropdown(null)} />}
          <div className="dash-scope-wrap">
            <div className={`dash-scope-pill${activeDropdown === 'scope' ? ' open' : ''}`}
              onClick={() => setActiveDropdown(activeDropdown === 'scope' ? null : 'scope')}>
              <i className="ti ti-books dash-scope-pill-icon" />
              {scope === "all"
                ? "Courses"
                : (rawCourses.find(c => c.course_id === scope)?.course_name || "Courses")}
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
          <div className="dash-scope-hint">Filter your dashboard by a specific course</div>
          </div>
          </div>{/* end .dash-hero-left */}
          <div className="dash-hero-right">
            <div className="dash-nav-label">Jump to</div>
            <div className="dash-nav-grid">
              <a className="dash-nav-link" href="#sec-streak"><i className="ti ti-flame" style={{color:"#FF8E00"}} />Learning Streak</a>
              <a className="dash-nav-link" href="#sec-progress"><i className="ti ti-chart-line" style={{color:"#00509E"}} />Progress</a>
              <a className="dash-nav-link" href="#sec-activity"><i className="ti ti-activity" style={{color:"#00509E"}} />Recent Activity</a>
              <a className="dash-nav-link" href="#sec-forest"><i className="ti ti-trees" style={{color:"#00924A"}} />Your Forest</a>
              <a className="dash-nav-link" href="#sec-quiz"><i className="ti ti-chart-bar" style={{color:"#00509E"}} />Quiz Performance</a>
              <a className="dash-nav-link" href="#sec-share"><i className="ti ti-share" style={{color:"#FF8E00"}} />Share Your Yatra</a>
            </div>
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
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-label">
                {s.label.split(" ").map(word => (
                  <span key={word} className="stat-label-word">{word}</span>
                ))}
              </div>
              <div className="stat-value">{s.value}</div>
              {s.sub && <div className="stat-sub">{s.sub}</div>}
              {s.onClick && <div className="stat-link">View all →</div>}
            </div>
          ))}
          {/* Ghost card — balances the 3-column grid on mobile (2 rows of 3) */}
          <div className="stat-card stat-ghost" aria-hidden="true" />
        </div>

        {/* ── Recommendations Rail ── */}
        <RecommendationsRail
          userId={user && !user.is_anonymous ? user.id : null}
          onOpenLesson={onResume}
        />

        {/* ── Streak Heatmap ── */}
        <div id="sec-streak" className="dash-section">
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
        <div id="sec-progress" className="dash-section">
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
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "16px 8px",
            }}>
              {progressRows.map(row => {
                const lesPct = pct(row.lesDone, row.lesTotal);
                return (
                  <GaugeChart
                    key={row.id}
                    pct={lesPct}
                    color={SAFFRON}
                    label={row.label}
                    sub={`${row.lesDone}/${row.lesTotal} lessons`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div id="sec-activity" className="dash-section">
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
          {/* Bar charts — shown at ≤600px via CSS */}
          {(() => {
            const chartDays = [...activityData].reverse(); // oldest → newest left to right
            const METRICS = [
              { key: "lessons",  label: "Lessons",       color: HERITAGE },
              { key: "dharma",   label: "Dharma",        color: SAFFRON  },
              { key: "snippets", label: "Snippets",      color: GREEN    },
              { key: "plants",   label: "Plants 🌿",     color: "#00924A"},
            ];
            return (
              <div className="act-charts">
                {METRICS.map(m => {
                  const vals   = chartDays.map(a => a[m.key]);
                  const maxVal = Math.max(...vals, 1);
                  const total  = vals.reduce((s, v) => s + v, 0);
                  return (
                    <div key={m.key}>
                      <div className="act-chart-head">
                        <span className="act-chart-label">{m.label}</span>
                        <span className="act-chart-total" style={{ color: m.color }}>{total}</span>
                      </div>
                      <div className="act-chart-bars">
                        {chartDays.map(a => (
                          <div className="act-bar-col" key={a.date}>
                            <div className="act-bar-track">
                              <div
                                className="act-bar-fill"
                                style={{
                                  height: `${Math.max((a[m.key] / maxVal) * 100, a[m.key] > 0 ? 8 : 0)}%`,
                                  background: a.today ? m.color : m.color + "66",
                                }}
                              />
                            </div>
                            <div className={"act-bar-day" + (a.today ? " today" : "")}>
                              {a.today ? "•" : a.date.split(" ")[1]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* ── Your Forest ── */}
        <div id="sec-forest" className="dash-section">
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
                      <div className={`forest-token-count${count === 0 ? " zero" : ""}`}>{count}</div>
                      <div className="forest-token-label">{t.label}</div>
                      {t.sub && <div className="forest-token-sub">{t.sub}</div>}
                    </div>
                  );
                })}
              </div>
              {dharmaTokens > 0 && (
                <div className="forest-dharma">
                  <i className="ti ti-diamond" style={{marginRight:6}} />
                  {dharmaTokens.toLocaleString()} Dharma Seeds
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Quiz Performance ── */}
        {quizPerfRows.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-head" id="sec-quiz">
              <div className="page-section-title">
                <i className="ti ti-chart-bar" style={{color: HERITAGE, marginRight: 6}} />
                Quiz Performance
              </div>
              <div className="dash-section-meta">
                {quizPerfRows.reduce((s, r) => s + r.triedQuizzes, 0)} attempted
              </div>
            </div>
            <table className="qperf-table">
              <thead>
                <tr>
                  <th>{scope !== "all" ? "Theme" : "Course"}</th>
                  <th>Tried</th>
                  <th>Score</th>
                  <th>Rank</th>
                </tr>
              </thead>
              <tbody>
                {quizPerfRows.map(row => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      <span className="qperf-num">{row.triedQuizzes}</span>
                      <span style={{color:"#9CA3AF"}}> / {row.totalQuizzes}</span>
                    </td>
                    <td>
                      {row.scorePct !== null
                        ? <span className={`qperf-score ${row.scorePct >= 70 ? "good" : row.scorePct >= 40 ? "ok" : "low"}`}>{row.scorePct}%</span>
                        : <span className="qperf-score none">—</span>
                      }
                    </td>
                    <td>
                      {row.rank
                        ? <span className="qperf-rank"><strong>{ordinalSuffix(row.rank)}</strong>{row.totalUsers ? ` / ${row.totalUsers}` : ""}</span>
                        : <span className="qperf-num dim">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="qperf-stack">
              {quizPerfRows.map(row => (
                <div className="qperf-stack-row" key={row.id}>
                  <div className="qperf-stack-name">{row.name}</div>
                  <div className="qperf-stack-stats">
                    <span className="qperf-stack-item">Tried: <span>{row.triedQuizzes}/{row.totalQuizzes}</span></span>
                    {row.scorePct !== null && (
                      <span className={`qperf-score ${row.scorePct >= 70 ? "good" : row.scorePct >= 40 ? "ok" : "low"}`}>{row.scorePct}%</span>
                    )}
                    {row.rank && (
                      <span className="qperf-stack-item">Rank: <span>{ordinalSuffix(row.rank)}</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Share Your Yatra ── */}
        <div id="sec-share" className="dash-section">
          <div className="dash-section-head share-section-head">
            <div className="page-section-title">
              <i className="ti ti-share" style={{color: SAFFRON, marginRight: 6}} />
              Share Your Yatra
            </div>
            <div className="share-head-toolbar">
              <button
                className={"share-toolbar-btn share-edit" + (showShareSettings ? " open" : "")}
                onClick={() => setShowShareSettings(v => !v)}
                title="Edit message"
              >
                <i className="ti ti-pencil" />
              </button>
              <button
                className={"share-toolbar-btn" + (canShare ? " active" : "") + (copyDone ? " copied" : "")}
                onClick={canShare ? handleCopyShare : undefined}
                title={canShare ? (copyDone ? "Copied!" : "Copy message") : "Sign in to share"}
              >
                <i className={copyDone ? "ti ti-check" : "ti ti-copy"} />
              </button>
              {canShare && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText + "\n\n" + APP_URL)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-toolbar-btn active"
                  style={{textDecoration:"none", display:"inline-flex", alignItems:"center", justifyContent:"center"}}
                  title="Share on WhatsApp"
                >
                  <i className="ti ti-brand-whatsapp" />
                </a>
              )}
            </div>
          </div>

          {showShareSettings && (
            <div className="share-settings">
              <div className="share-settings-label">Customise your message</div>
              <textarea
                className="share-textarea"
                value={shareMsgDraft}
                onChange={e => setShareMsgDraft(e.target.value)}
                rows={4}
              />
              <div className="share-tokens">
                {["{name}","{snippets}","{lessons}","{quizzes}","{score}","{dharma}","{trees}"].map(tok => (
                  <span key={tok} className="share-token" onClick={() => setShareMsgDraft(d => d + tok)}>{tok}</span>
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
              <div className="share-preview-logo">🪷 IndiYatra</div>
              <label className="share-score-toggle">
                <input
                  type="checkbox"
                  checked={includeScore}
                  onChange={e => handleToggleScore(e.target.checked)}
                />
                <span className="share-toggle-track" />
                Include quiz score
              </label>
              <div className="share-stat-row">
                <div className="share-stat">
                  <div className="share-stat-val">{snippetsViewed}</div>
                  <div className="share-stat-lbl">Stories Read</div>
                </div>
                <div className="share-stat">
                  <div className="share-stat-val">{lessonsCompleted}</div>
                  <div className="share-stat-lbl">Lessons Done</div>
                </div>
                {quizzesAttempted > 0 && (
                  <div className="share-stat">
                    <div className="share-stat-val">{quizzesAttempted}</div>
                    <div className="share-stat-lbl">Quizzes Tried</div>
                  </div>
                )}
                {includeScore && avgScorePct !== null && (
                  <div className="share-stat">
                    <div className="share-stat-val">{avgScorePct}%</div>
                    <div className="share-stat-lbl">Avg Score</div>
                  </div>
                )}
                {dharmaTokens > 0 && (
                  <div className="share-stat">
                    <div className="share-stat-val">{dharmaTokens.toLocaleString()}</div>
                    <div className="share-stat-lbl">Dharma Seeds</div>
                  </div>
                )}
                {totalPlants > 0 && (
                  <div className="share-stat">
                    <div className="share-stat-val">{totalPlants}</div>
                    <div className="share-stat-lbl">Thriving Trees</div>
                  </div>
                )}
              </div>
              <div className="share-msg-text">{shareText}</div>
              <div className="share-footer-txt">{APP_URL}</div>
            </div>
          </div>
          {!canShare && (
            <div className="share-coming">Sign in to share your Yatra</div>
          )}
        </div>

      </div>{/* end .page-wrap */}
    </>
  );
}
