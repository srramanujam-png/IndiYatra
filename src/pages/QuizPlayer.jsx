import { useState, useEffect, useRef, useCallback } from "react";
import { SAFFRON, HERITAGE, GREEN, DEFAULT_LANG_ID } from "../lib/supabase";
import { supabaseClient, saveQuizAttempt, getAttemptCount, saveSnippetQuestion, saveStandaloneQuestion } from "../lib/auth";
import PageHeader from "../components/PageHeader";
import { globalStyles } from "../styles/global";
import { APP_URL } from "../config/appStrings";

const BLUE = HERITAGE;
const RED  = "#DC2626";

// Shuffle an array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const styles = `
  .qp-wrap { min-height: 100vh; background: #FAFAF7; display: flex; flex-direction: column; }

  /* ── Top bar ── */
  .qp-topbar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid #E5E7EB;
    padding: 0 1.5rem; height: 54px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .qp-back {
    display: flex; align-items: center; gap: 5px; background: none; border: none;
    cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #4A5565;
    transition: color 0.2s; flex-shrink: 0;
  }
  .qp-back:hover { color: ${SAFFRON}; }
  .qp-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.0625rem; font-weight: 700;
    color: ${BLUE}; flex: 1; text-align: center;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .qp-counter { font-size: 0.8125rem; color: #4A5565; font-weight: 600; flex-shrink: 0; }

  /* ── Segmented progress bar ── */
  .qp-progress-segs {
    display: flex; gap: 4px; padding: 8px 1.5rem;
    background: white; border-bottom: 1px solid #F3F4F6;
  }
  .qp-progress-seg {
    flex: 1; height: 4px; border-radius: 999px; background: #E5E7EB;
    transition: background 0.3s;
  }
  .qp-progress-seg.done    { background: ${SAFFRON}; }
  .qp-progress-seg.current { background: ${SAFFRON}; opacity: 0.45; }

  /* ── Quiz timer bar (top-level) ── */
  .qp-quiz-timer {
    background: #FFF3E0; padding: 6px 1.5rem;
    display: flex; align-items: center; gap: 10px; font-size: 0.8125rem; color: #B45309; font-weight: 600;
  }
  .qp-quiz-timer-bar { flex: 1; height: 6px; background: #FEE0A0; border-radius: 999px; overflow: hidden; }
  .qp-quiz-timer-fill { height: 100%; background: ${SAFFRON}; transition: width 0.5s linear; border-radius: 999px; }

  /* ── Body ── */
  .qp-body { flex: 1; max-width: 1120px; width: 100%; margin: 0 auto; padding: 28px 1.5rem 120px; }

  /* ── Question timer (per-question) ── */
  .qp-q-timer {
    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
    font-size: 0.8125rem; font-weight: 700; color: #B45309;
  }
  .qp-q-timer-bar { flex: 1; height: 8px; background: #FEE0A0; border-radius: 999px; overflow: hidden; }
  .qp-q-timer-fill { height: 100%; background: ${SAFFRON}; transition: width 0.25s linear; border-radius: 999px; }
  .qp-q-timer-fill.urgent { background: ${RED}; }

  /* ── Unified two-column panel ── */
  .qp-main {
    display: grid; grid-template-columns: 1fr 340px; gap: 0;
    background: white; border-radius: 14px; border: 1px solid #E5E7EB;
    overflow: hidden; animation: qpFadeIn 0.2s ease both;
  }
  @keyframes qpFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
  @media (max-width: 899px) {
    .qp-main { grid-template-columns: 1fr; }
    .qp-right-col { order: -1; border-left: none; border-bottom: 1px solid #E5E7EB; }
  }

  /* ── Left column (question card — no own border) ── */
  .qp-card { overflow: hidden; }

  .qp-card-body { padding: 20px 20px 4px; }

  .qp-q-num {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
    color: ${SAFFRON}; margin-bottom: 8px;
  }
  .qp-question {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; font-weight: 700;
    color: #0A0A0A; line-height: 1.4; margin-bottom: 8px;
  }

  /* ── Options ── */
  .qp-options { display: flex; flex-direction: column; gap: 10px; padding: 12px 20px 16px; }
  .qp-option {
    border: 2px solid #E5E7EB; border-radius: 10px; padding: 13px 16px;
    cursor: pointer; display: flex; align-items: center; gap: 12px;
    transition: border-color 0.15s, background 0.15s; background: white;
    font-size: 1.125rem; font-weight: 500; color: #1F1F1F; text-align: left;
  }
  .qp-option:hover:not(.locked) { border-color: ${SAFFRON}; background: #FFF8EE; }
  .qp-option:disabled { pointer-events: none; } /* let taps pass through to open the explanation sheet */
  .qp-option.selected  { border-color: ${SAFFRON}; background: #FFF8EE; }
  .qp-option.correct   { border-color: ${GREEN};   background: #EDFBF3; color: #065F3E; }
  .qp-option.wrong     { border-color: ${RED};     background: #FEF2F2; color: #7F1D1D; }
  .qp-option.locked    { cursor: default; }
  .qp-option-marker {
    flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 700; background: #F3F4F6; color: #6B6B6B;
    transition: background 0.15s, color 0.15s;
  }
  .qp-option.correct .qp-option-marker  { background: ${GREEN}; color: white; }
  .qp-option.wrong   .qp-option-marker  { background: ${RED};   color: white; }
  .qp-option.selected:not(.correct):not(.wrong) .qp-option-marker { background: ${SAFFRON}; color: white; }

  /* ── Inline nav row — 4 equal pills ── */
  .qp-inline-nav {
    display: flex; align-items: stretch; gap: 8px;
    padding: 12px 16px 16px; border-top: 1px solid #F3F4F6;
  }
  .qp-nav-pill {
    flex: 1; min-width: 0; border-radius: 10px; padding: 9px 6px;
    border: 2px solid #E5E7EB; background: white; color: #4A5565;
    cursor: pointer; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 3px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .qp-nav-pill .pill-icon { font-size: 1rem; line-height: 1; }
  .qp-nav-pill .pill-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap; }
  .qp-nav-pill:hover:not(:disabled) { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .qp-nav-pill:disabled { opacity: 0.3; cursor: not-allowed; }
  .qp-nav-pill.nav-primary { background: ${BLUE}; border-color: ${BLUE}; color: white; }
  .qp-nav-pill.nav-primary:hover:not(:disabled) { background: #003E7E; border-color: #003E7E; }
  .qp-nav-pill.nav-finish { background: ${SAFFRON}; border-color: ${SAFFRON}; color: white; }
  .qp-nav-pill.nav-finish:hover:not(:disabled) { background: #E07E00; border-color: #E07E00; }

  /* ── Right column (image — shares panel border) ── */
  .qp-right-col {
    border-left: 1px solid #E5E7EB;
    display: flex; flex-direction: column;
  }
  .qp-right-col-img {
    flex: 1; width: 100%; display: flex; align-items: center; justify-content: center;
    background: white; min-height: 200px;
  }
  .qp-right-col-img img { width: 100%; max-height: 480px; object-fit: contain; display: block; }
  .qp-right-col-empty {
    flex: 1; width: 100%; min-height: 200px; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: #F9F9F7; color: #9CA3AF; font-size: 0.8125rem; gap: 8px;
  }
  @keyframes qpScrollPrompt {
    0%   { opacity: 0; transform: translateY(-6px); }
    20%  { opacity: 1; transform: translateY(0); }
    70%  { opacity: 1; }
    85%  { opacity: 0.55; }
    92%  { opacity: 1; }
    100% { opacity: 0.7; }
  }
  .qp-scroll-prompt {
    padding: 10px 14px; text-align: center;
    font-size: 0.8125rem; font-weight: 600; color: ${SAFFRON};
    display: flex; align-items: center; justify-content: center; gap: 6px;
    animation: qpScrollPrompt 2.2s ease forwards;
    border-top: 1px solid #F3F4F6;
    background: none; border-left: none; border-right: none; border-bottom: none;
    cursor: pointer; width: 100%; text-decoration: none;
  }
  .qp-scroll-prompt:hover { color: #E07E00; }

  /* ── Explanation panel — flash on reveal ── */
  @keyframes qpExplainFlash {
    0%   { background: #FEF3C7; box-shadow: 0 0 0 3px ${SAFFRON}50; }
    55%  { background: #FEF3C7; box-shadow: 0 0 0 3px ${SAFFRON}20; }
    100% { background: #F5F1EB; box-shadow: none; }
  }
  .qp-explain-section {
    margin-top: 20px; background: #F5F1EB; border-radius: 14px; padding: 24px 28px;
    animation: qpExplainFlash 1.4s ease both;
    scroll-margin-top: 80px;
  }
  .qp-explain-label {
    font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
    color: #0A0A0A; margin-bottom: 12px;
  }
  .qp-explain-text { font-size: 0.9375rem; color: #1F1F1F; line-height: 1.8; margin-bottom: 14px; }
  .qp-explain-source { font-size: 0.8125rem; color: #6B6B6B; font-style: italic; margin-top: 10px; }

  /* ── Shared reveal blocks (used in explain panel + review) ── */
  .qp-reveal-block { margin-bottom: 10px; }
  .qp-reveal-block-label { font-size: 0.75rem; font-weight: 700; color: #6B6B6B; text-transform: uppercase; letter-spacing: 0.05em; }
  .qp-reveal-block-value { font-size: 0.875rem; color: #1F1F1F; margin-top: 2px; line-height: 1.6; }

  /* ── Explanation sheet — mobile slide-up, matches snippet reveal sheet ── */
  @keyframes qpSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .qp-sheet-overlay {
    position: fixed; inset: 0; z-index: 140;
    background: rgba(0,0,0,0.35);
    animation: fadeIn 0.2s ease;
  }
  .qp-sheet {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 145;
    background: white; border-radius: 20px 20px 0 0;
    max-height: 78vh;
    display: flex; flex-direction: column;
    animation: qpSlideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both;
    overflow: hidden;
    touch-action: pan-y;
  }
  .qp-sheet-grab { position: relative; flex-shrink: 0; touch-action: none; }
  .qp-sheet-handle {
    width: 40px; height: 4px; background: #E5E7EB; border-radius: 2px;
    margin: 12px auto 0; flex-shrink: 0;
  }
  .qp-sheet-close {
    position: absolute; top: 10px; right: 10px; width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; border-radius: 999px;
    color: #9CA3AF; font-size: 1.25rem; cursor: pointer;
  }
  .qp-sheet-close:hover { color: #4A5565; background: #F3F4F6; }
  .qp-sheet-header {
    padding: 14px 56px 14px 20px; flex-shrink: 0;
    border-bottom: 1px solid #E5E7EB;
    display: flex; align-items: center; gap: 8px;
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 1.25rem; font-weight: 500; line-height: 1.3;
  }
  .qp-sheet-header.correct { color: ${GREEN}; }
  .qp-sheet-header.wrong   { color: ${RED}; }
  .qp-sheet-body {
    flex: 1; overflow-y: auto; padding: 16px 20px 32px;
    overscroll-behavior: contain;
  }
  .qp-sheet-finish {
    display: block; width: 100%; margin-top: 16px; padding: 13px;
    border-radius: 999px; border: none; background: ${GREEN}; color: white;
    font-size: 1rem; font-weight: 700; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .qp-sp-desktop { display: flex; align-items: center; gap: 6px; }
  .qp-sp-mobile  { display: none; align-items: center; gap: 6px; }
  @media (min-width: 900px) {
    .qp-sheet-overlay, .qp-sheet { display: none !important; }
  }
  @media (max-width: 899px) {
    .qp-explain-section { display: none; }
    .qp-sp-desktop { display: none; }
    .qp-sp-mobile  { display: flex; }
  }

  /* ── Unanswered indicator ── */
  .qp-unanswered-badge {
    margin-bottom: 16px; padding: 10px 14px; border-radius: 8px;
    background: #FFF3E0; border: 1px solid #FED7AA;
    font-size: 0.8125rem; color: #92400E; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
  }

  /* ── Confirmation overlay ── */
  .qp-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .qp-confirm-card {
    background: white; border-radius: 16px; padding: 28px 24px; max-width: 380px; width: 100%;
    text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  .qp-confirm-icon { font-size: 2.5rem; margin-bottom: 12px; }
  .qp-confirm-title { font-family: 'Alumni Sans', sans-serif; font-size: 1.5rem; font-weight: 700; color: #0A0A0A; margin-bottom: 8px; }
  .qp-confirm-body  { font-size: 0.9375rem; color: #4A5565; margin-bottom: 24px; line-height: 1.6; }
  .qp-confirm-btns  { display: flex; flex-direction: column; gap: 10px; }
  .qp-confirm-btn   { border-radius: 999px; padding: 12px; font-size: 0.9375rem; font-weight: 700; cursor: pointer; border: 2px solid transparent; }
  .qp-confirm-btn.primary { background: ${BLUE}; color: white; border-color: ${BLUE}; }
  .qp-confirm-btn.cancel  { background: white; color: #4A5565; border-color: #E5E7EB; }

  /* ── Score screen ── */
  .qp-score-wrap { max-width: 680px; margin: 0 auto; padding: 32px 1rem 120px; }
  .qp-score-card {
    background: white; border-radius: 16px; border: 1px solid #E5E7EB;
    padding: 32px 24px; text-align: center; margin-bottom: 24px;
  }
  .qp-score-emoji { font-size: 3rem; margin-bottom: 12px; }
  .qp-score-title { font-family: 'Alumni Sans', sans-serif; font-size: 2rem; font-weight: 700; color: #0A0A0A; margin-bottom: 4px; }
  .qp-score-subtitle { font-size: 0.9375rem; color: #4A5565; margin-bottom: 20px; }
  .qp-score-numbers {
    display: flex; justify-content: center; gap: 28px; margin-bottom: 16px;
  }
  .qp-score-stat { text-align: center; }
  .qp-score-stat-num { font-family: 'Alumni Sans', sans-serif; font-size: 2.5rem; font-weight: 700; line-height: 1; }
  .qp-score-stat-lbl { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6B6B6B; margin-top: 2px; }
  .qp-score-stat-num.correct  { color: ${GREEN}; }
  .qp-score-stat-num.wrong    { color: ${RED}; }
  .qp-score-stat-num.skipped  { color: #D97706; }

  .qp-pass-badge {
    display: inline-block; border-radius: 999px; padding: 5px 20px; font-size: 0.875rem; font-weight: 700;
    letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px;
  }
  .qp-pass-badge.pass { background: #EDFBF3; color: #065F3E; border: 1.5px solid ${GREEN}; }
  .qp-pass-badge.fail { background: #FEF2F2; color: #7F1D1D; border: 1.5px solid ${RED}; }

  .qp-score-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
  .qp-score-btn {
    border-radius: 999px; padding: 13px; font-size: 1rem; font-weight: 700;
    cursor: pointer; border: 2px solid transparent;
  }
  .qp-score-btn.primary  { background: ${SAFFRON}; color: white; border-color: ${SAFFRON}; }
  .qp-score-btn.secondary { background: white; color: ${BLUE}; border-color: ${BLUE}; }
  .qp-score-btn.ghost    { background: white; color: #4A5565; border-color: #E5E7EB; }

  /* ── Answer review ── */
  .qp-review-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem; font-weight: 700;
    color: #0A0A0A; margin-bottom: 16px; padding: 0 4px;
  }
  .qp-review-item {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    margin-bottom: 14px; overflow: hidden;
  }
  .qp-review-header {
    padding: 14px 16px 10px; border-bottom: 1px solid #F3F4F6;
    display: flex; align-items: flex-start; gap: 12px;
  }
  .qp-review-icon { font-size: 1.125rem; flex-shrink: 0; margin-top: 2px; }
  .qp-review-q    { font-size: 0.9375rem; font-weight: 600; color: #0A0A0A; line-height: 1.45; }
  .qp-review-answers { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
  .qp-review-ans-row  { font-size: 0.875rem; line-height: 1.5; }
  .qp-review-ans-label { font-weight: 700; color: #6B6B6B; }
  .qp-review-ans-val.correct { color: ${GREEN}; font-weight: 600; }
  .qp-review-ans-val.wrong   { color: ${RED};   font-weight: 600; }
  .qp-review-ans-val.skipped { color: #D97706;  font-weight: 600; }
  .qp-review-explanation {
    padding: 10px 16px 14px; border-top: 1px solid #F3F4F6;
    font-size: 0.875rem; color: #4A5565; line-height: 1.7;
  }

  .qp-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; font-size: 1rem; color: #6B6B6B; }
  .qp-error   { max-width: 480px; margin: 80px auto; text-align: center; color: ${RED}; font-size: 0.9375rem; padding: 1rem; }

  /* ── Social strip (explain panel footer + score screen) ── */
  .qp-social {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0 2px; border-top: 1px solid #E5E7EB; margin-top: 16px; gap: 8px;
  }
  .qp-social-left  { display: flex; align-items: center; gap: 10px; }
  .qp-social-right { display: flex; align-items: center; gap: 14px; }
  .qp-social-btn {
    display: flex; align-items: center; gap: 6px;
    background: none; border: none; padding: 10px 6px;
    font-size: 0.9375rem; color: #4A5565; transition: color 0.2s;
    font-family: 'Inter', system-ui, sans-serif; font-weight: 500; cursor: pointer;
  }
  .qp-social-btn:hover:not(:disabled)  { color: ${SAFFRON}; }
  .qp-social-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .qp-social-btn.active   { color: ${SAFFRON}; }
  .qp-social-btn.copied   { color: ${GREEN}; }
  .qp-social-icon { font-size: 1.125rem; line-height: 1; display: flex; align-items: center; }

  /* ── Thin nav pills at bottom of explanation ── */
  .qp-explain-nav {
    display: flex; gap: 8px; margin-top: 18px; padding-top: 14px;
    border-top: 1px solid #E5E7EB;
  }
  .qp-explain-pill {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
    padding: 7px 10px; border-radius: 999px;
    border: 1.5px solid #E5E7EB; background: white;
    font-size: 0.8125rem; font-weight: 600; color: #4A5565;
    cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .qp-explain-pill:hover:not(:disabled) { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .qp-explain-pill:disabled { opacity: 0.32; cursor: not-allowed; }
  .qp-explain-pill.pill-finish { background: ${SAFFRON}; border-color: ${SAFFRON}; color: white; }
  .qp-explain-pill.pill-finish:hover:not(:disabled) { background: #E07E00; border-color: #E07E00; }

  /* ── Edit button (admin/creator only) ── */
  .qp-edit-btn {
    display: flex; align-items: center; gap: 5px; background: none; border: none;
    cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: #9CA3AF;
    padding: 4px 6px; border-radius: 6px; transition: color 0.15s, background 0.15s;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .qp-edit-btn:hover { color: ${HERITAGE}; background: #F3F4F6; }

  /* ── Edit slide-in panel ── */
  .qp-edit-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300;
    animation: qpFadeIn 0.18s ease both;
  }
  .qp-edit-panel {
    position: fixed; top: 0; right: 0; height: 100vh; width: min(580px, 100vw);
    background: #fff; z-index: 301; display: flex; flex-direction: column;
    box-shadow: -4px 0 32px rgba(0,0,0,0.14);
    animation: qpSlideIn 0.22s ease both;
  }
  @keyframes qpSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .qp-edit-header {
    padding: 16px 20px; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
  }
  .qp-edit-header-title { font-family: 'Alumni Sans', sans-serif; font-size: 1.125rem; font-weight: 700; color: #0A0A0A; }
  .qp-edit-header-sub   { font-size: 0.75rem; color: #9CA3AF; margin-top: 1px; }
  .qp-edit-close {
    background: none; border: none; cursor: pointer; font-size: 1.125rem;
    color: #9CA3AF; padding: 4px 8px; border-radius: 6px;
  }
  .qp-edit-close:hover { color: #0A0A0A; background: #F3F4F6; }
  .qp-edit-body { flex: 1; overflow-y: auto; padding: 18px 20px; }
  .qp-edit-section-label {
    font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
    color: ${SAFFRON}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid #F3F4F6;
  }
  .qp-edit-field { margin-bottom: 14px; }
  .qp-edit-field label {
    display: block; font-size: 0.8125rem; font-weight: 600; color: #374151;
    text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .qp-edit-field textarea, .qp-edit-field input {
    width: 100%; box-sizing: border-box;
    border: 1.5px solid #E5E7EB; border-radius: 8px; padding: 8px 11px;
    font-size: 0.9375rem; font-family: 'Nunito Sans', system-ui, sans-serif;
    background: white; resize: vertical; outline: none; transition: border-color 0.15s;
    color: #1F1F1F;
  }
  .qp-edit-field textarea:focus, .qp-edit-field input:focus { border-color: ${HERITAGE}; }
  .qp-edit-divider { border: none; border-top: 1px solid #E5E7EB; margin: 18px 0 16px; }
  .qp-edit-footer {
    padding: 12px 20px; border-top: 1px solid #E5E7EB; flex-shrink: 0;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .qp-edit-msg { font-size: 0.875rem; flex: 1; }
  .qp-edit-msg.ok  { color: #00924A; }
  .qp-edit-msg.err { color: #DC2626; }
  .qp-edit-save-btn {
    padding: 9px 24px; border-radius: 10px; border: none;
    background: ${HERITAGE}; color: white; cursor: pointer;
    font-size: 0.9375rem; font-weight: 700; font-family: 'Inter', system-ui, sans-serif;
    transition: opacity 0.15s;
  }
  .qp-edit-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .qp-edit-save-btn:not(:disabled):hover { opacity: 0.88; }
  .qp-edit-cancel-btn {
    padding: 9px 18px; border-radius: 10px; border: 1.5px solid #E5E7EB;
    background: white; color: #4A5565; cursor: pointer;
    font-size: 0.9375rem; font-weight: 600; font-family: 'Inter', system-ui, sans-serif;
  }
  .qp-edit-cancel-btn:hover { background: #F3F4F6; }
`;

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function QuizPlayer({
  quiz,
  questions: rawQuestions = [],
  lesson,
  settings,
  user,
  onBack,
  onDashboard,
  onRetake,
  onSignIn,
  onHome,
  onDiscover,
  onLikes,
  onBookmarks,
  activePage,
  onSaveSettings,
  languages = [],
  bookmarks = new Set(),
  onToggleBookmark,
  likes = new Set(),
  onToggleLike,
  isAdmin = false,
  isCreator = false,
}) {
  const canEdit = isAdmin || isCreator;
  const isTimed = !!(quiz?.question_time_limit);
  const quizTimeLimit = quiz?.time_limit || null; // overall quiz seconds

  // ── Shuffle questions + options on mount ─────────────────────────────────
  const [questions] = useState(() => {
    // Pool selection: always random; shuffle_questions controls display order
    let qs = [...rawQuestions];
    if (quiz?.question_pool_size && quiz.question_pool_size < qs.length) {
      qs = shuffle(qs).slice(0, quiz.question_pool_size);
    } else if (quiz?.shuffle_questions) {
      qs = shuffle(qs);
    }
    return qs.map(q => ({
      ...q,
      _options: shuffle([
        { label: q.correct_option, isCorrect: true },
        { label: q.wrong_option_1, isCorrect: false },
        { label: q.wrong_option_2, isCorrect: false },
        { label: q.wrong_option_3, isCorrect: false },
      ])
    }));
  });

  const [current,     setCurrent]   = useState(0);
  // answers: Map<index, { chosen: string|null, isCorrect: bool|null, revealed: bool }>
  const [answers,     setAnswers]   = useState(() => new Map());
  const [phase,       setPhase]     = useState("quiz"); // 'quiz' | 'confirm_finish' | 'score'
  const [saving,      setSaving]    = useState(false);
  const [scoreData,   setScoreData] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [explainSheet, setExplainSheet] = useState(false); // mobile slide-up sheet
  const sheetTimerRef = useRef(null);

  // Swipe state (same as SnippetPlayer)
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [sheetDragged, setSheetDragged] = useState(false);
  const sheetGrabY = useRef(null);
  const [signinToast, setSigninToast] = useState("");
  const toastTimerRef = useRef(null);

  // Edit panel state
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editDraft,     setEditDraft]     = useState({});
  const [editSaving,    setEditSaving]    = useState(false);
  const [editMsg,       setEditMsg]       = useState("");

  // ── Attempt count (max_attempts enforcement) ──────────────────────────────
  const [attemptCount, setAttemptCount] = useState(user && quiz ? null : 0);
  useEffect(() => {
    if (!user || !quiz) return;
    getAttemptCount(user.id, quiz.quiz_id).then(({ count }) => setAttemptCount(count));
  }, []);

  // Timers
  const [qTimeLeft,    setQTimeLeft]    = useState(quiz?.question_time_limit || 0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(quizTimeLimit || 0);
  const qTimerRef    = useRef(null);
  const quizTimerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const explainRef   = useRef(null);

  // Scroll so question+options stay visible and explanation peeks in at the bottom
  useEffect(() => {
    const currentAns = answers.get(current);
    if (currentAns && currentAns.chosen !== null && explainRef.current) {
      setTimeout(() => {
        const rect = explainRef.current.getBoundingClientRect();
        // Only scroll if explanation is below the fold
        if (rect.top > window.innerHeight * 0.78) {
          // Position explanation title at ~82% down — question/options stay visible above
          const target = window.scrollY + rect.top - window.innerHeight * 0.82;
          window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
        }
      }, 120);
    }
  }, [answers, current]);

  useEffect(() => {
    if (explainSheet) { setSheetDragged(false); setSheetDragY(0); }
  }, [explainSheet]);

  // Close the mobile explanation sheet (and any pending open timer) when the question changes
  useEffect(() => {
    setExplainSheet(false);
    return () => clearTimeout(sheetTimerRef.current);
  }, [current]);

  const total = questions.length;
  const q     = questions[current];
  const ans   = answers.get(current);
  const isAnswered  = !!ans;
  const isUnanswered = !ans;

  // ── Question timer ────────────────────────────────────────────────────────
  const clearQTimer = useCallback(() => {
    if (qTimerRef.current) { clearInterval(qTimerRef.current); qTimerRef.current = null; }
  }, []);

  const startQTimer = useCallback(() => {
    if (!isTimed || isAnswered) return;
    clearQTimer();
    setQTimeLeft(quiz.question_time_limit);
    qTimerRef.current = setInterval(() => {
      setQTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(qTimerRef.current);
          qTimerRef.current = null;
          // Record as unanswered (null)
          setAnswers(m => {
            const next = new Map(m);
            if (!next.has(current)) next.set(current, { chosen: null, isCorrect: null, revealed: true });
            return next;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isTimed, isAnswered, quiz, current, clearQTimer]);

  useEffect(() => {
    if (phase !== "quiz") { clearQTimer(); return; }
    startQTimer();
    return clearQTimer;
  }, [current, phase]);

  // ── Quiz-level timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!quizTimeLimit || phase !== "quiz") return;
    quizTimerRef.current = setInterval(() => {
      setQuizTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(quizTimerRef.current);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (quizTimerRef.current) clearInterval(quizTimerRef.current); };
  }, [phase]);

  // ── Answer a question ─────────────────────────────────────────────────────
  function selectOption(optionLabel, isCorrect) {
    if (isAnswered) return;
    clearQTimer();
    setAnswers(m => {
      const next = new Map(m);
      next.set(current, { chosen: optionLabel, isCorrect, revealed: true });
      return next;
    });
    // Mobile: lag so the user sees their choice + the correct answer, then slide up the explanation
    if (window.matchMedia("(max-width: 899px)").matches) {
      clearTimeout(sheetTimerRef.current);
      sheetTimerRef.current = setTimeout(() => setExplainSheet(true), isCorrect ? 1500 : 2200);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function goNext() {
    if (current < total - 1) { setCurrent(c => c + 1); }
  }
  function goPrev() {
    if (isTimed) return; // disabled in timed mode
    if (current > 0) { setCurrent(c => c - 1); }
  }

  // ── Touch / Swipe handlers — same behavior as SnippetPlayer ────────────────
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(false);
  }

  function onTouchMove(e) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Only handle horizontal swipes (not vertical scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      setIsDragging(true);
      // Resistance at edges
      const atStart = current === 0 && dx > 0;
      const atEnd   = current === total - 1 && dx < 0;
      const resistance = (atStart || atEnd) ? 0.15 : 0.38;
      setDragOffset(dx * resistance);
    }
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - (touchStartX.current ?? e.changedTouches[0].clientX);
    const dy = e.changedTouches[0].clientY - (touchStartY.current ?? e.changedTouches[0].clientY);
    touchStartX.current = null;
    touchStartY.current = null;
    setDragOffset(0);
    setIsDragging(false);
    if (Math.abs(dx) < 60) return;
    // Ignore mostly-vertical gestures (fast scrolls) — only clearly horizontal swipes navigate
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) goNext();
    else {
      if (isTimed && current > 0) { showSigninToast("No going back in timed mode"); return; }
      goPrev();
    }
  }

  // Mobile: once answered, a tap anywhere on the question area opens the explanation sheet
  function onCardTap(e) {
    if (!isAnswered || ans?.chosen === null) return;
    if (!window.matchMedia("(max-width: 899px)").matches) return;
    if (e.target.closest("button")) return; // real buttons keep their own behavior
    clearTimeout(sheetTimerRef.current);
    setExplainSheet(true);
  }

  // Drag down on the sheet handle/header to dismiss
  function onSheetGrabStart(e) {
    sheetGrabY.current = e.touches[0].clientY;
    setSheetDragged(true);
  }
  function onSheetGrabMove(e) {
    if (sheetGrabY.current === null) return;
    setSheetDragY(Math.max(0, e.touches[0].clientY - sheetGrabY.current));
  }
  function onSheetGrabEnd(e) {
    const dy = e.changedTouches[0].clientY - (sheetGrabY.current ?? e.changedTouches[0].clientY);
    sheetGrabY.current = null;
    if (dy > 90) setExplainSheet(false);
    setSheetDragY(0);
  }

  // Drag-down anywhere on the sheet dismisses it (when its body is scrolled to top)
  const sheetBodyRef = useRef(null);
  const sheetStartScroll = useRef(0);
  function onSheetTouchStart(e) {
    sheetStartScroll.current = sheetBodyRef.current ? sheetBodyRef.current.scrollTop : 0;
    sheetGrabY.current = e.touches[0].clientY;
    setSheetDragged(true);
    onTouchStart(e);
  }
  function onSheetTouchMove(e) {
    const dy = e.touches[0].clientY - (sheetGrabY.current ?? e.touches[0].clientY);
    const dx = e.touches[0].clientX - (touchStartX.current ?? e.touches[0].clientX);
    if (sheetStartScroll.current <= 0 && dy > 0 && dy > Math.abs(dx)) setSheetDragY(dy);
    onTouchMove(e);
  }
  function onSheetTouchEnd(e) {
    const dy = e.changedTouches[0].clientY - (sheetGrabY.current ?? e.changedTouches[0].clientY);
    const dx = e.changedTouches[0].clientX - (touchStartX.current ?? e.changedTouches[0].clientX);
    sheetGrabY.current = null;
    if (sheetStartScroll.current <= 0 && dy > 90 && dy > Math.abs(dx) * 1.5) setExplainSheet(false);
    setSheetDragY(0);
    onTouchEnd(e);
  }

  function showSigninToast(msg) {
    setSigninToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSigninToast(""), 2200);
  }
  function requestFinish() {
    const unansweredCount = questions.reduce((n, _, i) => n + (answers.has(i) ? 0 : 1), 0);
    if (unansweredCount > 0) {
      setPhase("confirm_finish");
    } else {
      finishQuiz();
    }
  }
  function finishQuiz() {
    clearQTimer();
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);

    let correct = 0, wrong = 0, skipped = 0, totalPoints = 0, earnedPoints = 0;
    const answersArr = questions.map((q, i) => {
      const a = answers.get(i);
      const pts = q.points || 1;
      totalPoints += pts;
      if (!a || a.chosen === null) {
        skipped++;
        return { question_id: q.question_id, question_type: q.question_type, chosen_option: null, correct_option: q.correct_option, is_correct: null, points_awarded: 0 };
      }
      if (a.isCorrect) { correct++; earnedPoints += pts; }
      else { wrong++; }
      return { question_id: q.question_id, question_type: q.question_type, chosen_option: a.chosen, correct_option: q.correct_option, is_correct: a.isCorrect, points_awarded: a.isCorrect ? pts : 0 };
    });

    const passPct = quiz?.pass_percent;
    const passed  = passPct != null ? (earnedPoints / totalPoints * 100) >= passPct : null;

    setScoreData({ correct, wrong, skipped, total, totalPoints, earnedPoints, answersArr, passed });
    setPhase("score");

    // Save attempt
    if (user) {
      setAttemptCount(c => (c ?? 0) + 1); // increment eagerly so score screen reflects new count
      setSaving(true);
      saveQuizAttempt(user.id, quiz.quiz_id, earnedPoints, totalPoints, answersArr)
        .finally(() => setSaving(false));
    }
  }

  // ── Edit panel ────────────────────────────────────────────────────────────
  function openEditPanel() {
    if (!q) return;
    setEditDraft({
      // Snippet translation fields (populated for Type 1 from question obj)
      hook:             q.hook             || "",
      explanation:      q.explanation      || "",
      key_term:         q.key_term         || "",
      key_term_meaning: q.key_term_meaning || "",
      life_connection:  q.life_connection  || "",
      quiz_recap:       q.quiz_recap       || "",
      source_citation:  q.source_citation  || "",
      // Question fields
      question:         q.question         || "",
      correct_option:   q.correct_option   || "",
      wrong_option_1:   q.wrong_option_1   || "",
      wrong_option_2:   q.wrong_option_2   || "",
      wrong_option_3:   q.wrong_option_3   || "",
    });
    setEditMsg("");
    setShowEditPanel(true);
  }

  async function saveEdit() {
    if (editSaving || !q) return;
    setEditSaving(true);
    setEditMsg("");
    const langId = q.language || settings?.languageId || DEFAULT_LANG_ID;
    let failed = false;

    if (q.question_type === "snippet" && q.snippet_id) {
      // Save snippet translation
      const { error: tErr } = await supabaseClient
        .from("snippet_translations")
        .upsert({
          snippet_id:       q.snippet_id,
          language:         langId,
          hook:             editDraft.hook,
          explanation:      editDraft.explanation,
          key_term:         editDraft.key_term,
          key_term_meaning: editDraft.key_term_meaning,
          life_connection:  editDraft.life_connection,
          quiz_recap:       editDraft.quiz_recap,
          source_citation:  editDraft.source_citation,
        }, { onConflict: "snippet_id,language" });
      if (tErr) { setEditMsg("Translation save failed: " + tErr.message); failed = true; }

      // Save question row
      if (!failed) {
        const { error: qErr } = await saveSnippetQuestion(q.snippet_id, langId, {
          question:       editDraft.question,
          correct_option: editDraft.correct_option,
          wrong_option_1: editDraft.wrong_option_1,
          wrong_option_2: editDraft.wrong_option_2,
          wrong_option_3: editDraft.wrong_option_3,
        });
        if (qErr) { setEditMsg("Question save failed: " + qErr.message); failed = true; }
      }
    } else if (q.question_type === "standalone" && q.question_id) {
      const { error: stErr } = await saveStandaloneQuestion(q.question_id, {
        question:         editDraft.question,
        correct_option:   editDraft.correct_option,
        wrong_option_1:   editDraft.wrong_option_1,
        wrong_option_2:   editDraft.wrong_option_2,
        wrong_option_3:   editDraft.wrong_option_3,
        explanation:      editDraft.explanation,
        key_term:         editDraft.key_term,
        key_term_meaning: editDraft.key_term_meaning,
        life_connection:  editDraft.life_connection,
        source_citation:  editDraft.source_citation,
      });
      if (stErr) { setEditMsg("Save failed: " + stErr.message); failed = true; }
    }

    setEditSaving(false);
    if (!failed) {
      setEditMsg("Saved!");
      setTimeout(() => { setShowEditPanel(false); setEditMsg(""); }, 800);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getOptionClass(opt) {
    if (!isAnswered) return ans?.chosen === opt.label ? "selected" : "";
    const a = answers.get(current);
    if (!a || a.chosen === null) return ""; // unanswered (timer)
    if (opt.isCorrect) return "correct locked";
    if (a.chosen === opt.label) return "wrong locked";
    return "locked";
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }

  // Share the quiz
  function handleShareQuiz() {
    const text = `${quiz?.title || "IndiYatra Quiz"}\n\n${APP_URL}`;
    navigator.clipboard.writeText(text).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  // Scroll so explanation peeks in at the bottom while options stay visible
  function scrollToExplain() {
    if (!explainRef.current) return;
    const rect = explainRef.current.getBoundingClientRect();
    // Position the explanation title at ~82% down — same as auto-scroll
    const target = window.scrollY + rect.top - window.innerHeight * 0.82;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }

  // Explanation content — snippet-style blocks (inline panel on desktop + mobile sheet)
  function renderExplainBlocks() {
    return (
      <>
        {q.explanation
          ? <div className="snip-explanation fs-body">{q.explanation}</div>
          : <div className="snip-explanation" style={{ color: "#9CA3AF", fontStyle: "italic" }}>No explanation available.</div>
        }
        {q.key_term && (
          <div className="snip-key-term">
            <div className="snip-kt-label">Key Term</div>
            <div className="snip-kt-word">{q.key_term}</div>
            {q.key_term_meaning && <div className="snip-kt-meaning fs-body">{q.key_term_meaning}</div>}
          </div>
        )}
        {q.life_connection && (
          <div className="snip-life">
            <div className="snip-life-label">Life Connection</div>
            <div className="snip-life-text fs-body">{q.life_connection}</div>
          </div>
        )}
        {q.quiz_recap && (
          <div className="snip-quiz">
            <div className="snip-quiz-label">Refresher Questions</div>
            <div className="snip-quiz-text fs-body">{q.quiz_recap}</div>
          </div>
        )}
        {q.source_citation && <div className="snip-citation">{q.source_citation}</div>}
      </>
    );
  }

  // Social strip — rendered in the inline panel (desktop) and the mobile sheet
  function renderSocialStrip() {
    const qKey = q?.question_key != null ? String(q.question_key) : null;
    return (
      <>
            {/* Social strip */}
            <div className="qp-social">
              <div className="qp-social-left">
                {qKey && (
                  <>
                    <button
                      className={"qp-social-btn" + (likes.has("question:" + qKey) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                      title={!user || user.is_anonymous ? "Sign in to like" : likes.has("question:" + qKey) ? "Unlike this question" : "Like this question"}
                      onClick={() => { if (!user || user.is_anonymous) { showSigninToast("Sign in to like questions"); return; } onToggleLike?.("question", qKey, "Question"); }}
                    >
                      <span className="qp-social-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={likes.has("question:" + qKey) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6c-1.7-1.6-4.4-1.6-6 .1L12 7.5 9.2 4.7c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.1L12 19l8.8-8.2c1.7-1.7 1.7-4.4 0-6.1z"/></svg>
                      </span>
                    </button>
                    <button
                      className={"qp-social-btn" + (bookmarks.has("question:" + qKey) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                      title={!user || user.is_anonymous ? "Sign in to bookmark" : bookmarks.has("question:" + qKey) ? "Remove bookmark" : "Bookmark this question"}
                      onClick={() => { if (!user || user.is_anonymous) { showSigninToast("Sign in to bookmark questions"); return; } onToggleBookmark?.("question", qKey, "Question"); }}
                    >
                      <span className="qp-social-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarks.has("question:" + qKey) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      </span>
                    </button>
                  </>
                )}
              </div>
              <div className="qp-social-right">
                <button
                  className={"qp-social-btn" + (likes.has("quiz:" + quiz?.quiz_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                  title={!user || user.is_anonymous ? "Sign in to like" : likes.has("quiz:" + quiz?.quiz_id) ? "Unlike this quiz" : "Like this quiz"}
                  onClick={() => { if (!user || user.is_anonymous) { showSigninToast("Sign in to like quizzes"); return; } onToggleLike?.("quiz", String(quiz?.quiz_id), quiz?.title || "Quiz"); }}
                >
                  <span className="qp-social-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={likes.has("quiz:" + quiz?.quiz_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6c-1.7-1.6-4.4-1.6-6 .1L12 7.5 9.2 4.7c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.1L12 19l8.8-8.2c1.7-1.7 1.7-4.4 0-6.1z"/></svg>
                  </span>
                </button>
                <button
                  className={"qp-social-btn" + (bookmarks.has("quiz:" + quiz?.quiz_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                  title={!user || user.is_anonymous ? "Sign in to bookmark" : bookmarks.has("quiz:" + quiz?.quiz_id) ? "Remove bookmark" : "Bookmark this quiz"}
                  onClick={() => { if (!user || user.is_anonymous) { showSigninToast("Sign in to bookmark quizzes"); return; } onToggleBookmark?.("quiz", String(quiz?.quiz_id), quiz?.title || "Quiz"); }}
                >
                  <span className="qp-social-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarks.has("quiz:" + quiz?.quiz_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </span>
                </button>
                <button
                  className={"qp-social-btn" + (shareCopied ? " copied" : "")}
                  onClick={handleShareQuiz}
                  title={shareCopied ? "Copied!" : "Share quiz"}
                >
                  <span className="qp-social-icon">
                    {shareCopied
                      ? <i className="ti ti-check" />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    }
                  </span>
                  <span>{shareCopied ? "Copied!" : "Share"}</span>
                </button>
              </div>
            </div>
      </>
    );
  }

  // ── Loading attempt count ─────────────────────────────────────────────────
  if (attemptCount === null) {
    return (
      <div className="qp-wrap">
        <style>{globalStyles}{styles}</style>
        <div className="qp-loading">Loading…</div>
      </div>
    );
  }

  // ── Max attempts reached ──────────────────────────────────────────────────
  if (quiz?.max_attempts && attemptCount >= quiz.max_attempts) {
    return (
      <div className="qp-wrap">
        <style>{globalStyles}{styles}</style>
        <div className="qp-topbar">
          <button className="qp-back" onClick={onBack}><i className="ti ti-arrow-left" /> Back</button>
          <div className="qp-title">{quiz.title}</div>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, padding:"2rem 1rem" }}>
          <div className="qp-score-card" style={{ maxWidth:360 }}>
            <div className="qp-score-emoji">🔒</div>
            <div className="qp-score-title">Max Attempts Reached</div>
            <div className="qp-score-subtitle">
              You've used all {quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? "s" : ""} for this quiz.
            </div>
            <div className="qp-score-actions">
              <button className="qp-score-btn secondary" onClick={onBack}>Back to Lessons</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || total === 0) {
    return (
      <div className="qp-wrap">
        <style>{globalStyles}{styles}</style>
        <div className="qp-loading">No questions available for this quiz.</div>
      </div>
    );
  }

  // ── Score Screen ──────────────────────────────────────────────────────────
  if (phase === "score" && scoreData) {
    const { correct, wrong, skipped, passed } = scoreData;
    const emoji = correct === total ? "🏆" : correct >= total / 2 ? "👍" : "📖";

    return (
      <div className="qp-wrap">
        <style>{globalStyles}{styles}</style>
        <div className="qp-topbar">
          <button className="qp-back" onClick={onBack}>
            <i className="ti ti-arrow-left" /> Back
          </button>
          <div className="qp-title">{quiz.title}</div>
          <div style={{ width: 60 }} />
        </div>

        <div className="qp-score-wrap">
        {signinToast && <div className="signin-toast">{signinToast}</div>}
          <div className="qp-score-card">
            <div className="qp-score-emoji">{emoji}</div>
            <div className="qp-score-title">Quiz Complete!</div>
            <div className="qp-score-subtitle">{quiz.title}</div>

            {passed !== null && (
              <>
                <div className={`qp-pass-badge ${passed ? "pass" : "fail"}`}>
                  {passed ? "✓ Passed" : "✗ Not Passed"}
                </div>
                <div style={{ fontSize:"0.8125rem", color:"#6B6B6B", marginBottom:16 }}>
                  {Math.round(scoreData.earnedPoints / scoreData.totalPoints * 100)}% scored
                  {quiz.pass_percent ? ` · ${quiz.pass_percent}% to pass` : ""}
                </div>
              </>
            )}
            {quiz.max_attempts && (
              <div style={{ fontSize:"0.8125rem", color:"#6B6B6B", marginBottom:8 }}>
                Attempt {Math.min(attemptCount, quiz.max_attempts)} of {quiz.max_attempts}
              </div>
            )}

            <div className="qp-score-numbers">
              <div className="qp-score-stat">
                <div className="qp-score-stat-num correct">{correct}</div>
                <div className="qp-score-stat-lbl">Correct</div>
              </div>
              <div className="qp-score-stat">
                <div className="qp-score-stat-num wrong">{wrong}</div>
                <div className="qp-score-stat-lbl">Wrong</div>
              </div>
              {skipped > 0 && (
                <div className="qp-score-stat">
                  <div className="qp-score-stat-num skipped">{skipped}</div>
                  <div className="qp-score-stat-lbl">Skipped</div>
                </div>
              )}
              <div className="qp-score-stat">
                <div className="qp-score-stat-num" style={{ color: BLUE }}>{total}</div>
                <div className="qp-score-stat-lbl">Total</div>
              </div>
            </div>

            {/* Social strip on score screen */}
            <div className="qp-social" style={{justifyContent:"center", gap:24, borderTop:"1px solid #E5E7EB", paddingTop:16}}>
              <button
                className={"qp-social-btn" + (likes.has("quiz:" + quiz?.quiz_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                title={!user || user.is_anonymous ? "Sign in to like" : "Like this quiz"}
                onClick={() => { if (!user || user.is_anonymous) { showSigninToast("Sign in to like quizzes"); return; } onToggleLike?.("quiz", String(quiz?.quiz_id), quiz?.title || "Quiz"); }}
              >
                <span className="qp-social-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={likes.has("quiz:" + quiz?.quiz_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6c-1.7-1.6-4.4-1.6-6 .1L12 7.5 9.2 4.7c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.1L12 19l8.8-8.2c1.7-1.7 1.7-4.4 0-6.1z"/></svg>
                </span>
                <span>Like</span>
              </button>
              <button
                className={"qp-social-btn" + (bookmarks.has("quiz:" + quiz?.quiz_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                title={!user || user.is_anonymous ? "Sign in to bookmark" : "Bookmark this quiz"}
                onClick={() => { if (!user || user.is_anonymous) { showSigninToast("Sign in to bookmark quizzes"); return; } onToggleBookmark?.("quiz", String(quiz?.quiz_id), quiz?.title || "Quiz"); }}
              >
                <span className="qp-social-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarks.has("quiz:" + quiz?.quiz_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </span>
                <span>Save</span>
              </button>
              <button
                className={"qp-social-btn" + (shareCopied ? " copied" : "")}
                onClick={handleShareQuiz}
                title={shareCopied ? "Copied!" : "Share quiz"}
              >
                <span className="qp-social-icon">
                  {shareCopied
                    ? <i className="ti ti-check" />
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  }
                </span>
                <span>{shareCopied ? "Copied!" : "Share"}</span>
              </button>
            </div>

            <div className="qp-score-actions">
              {onRetake && !(quiz.max_attempts && attemptCount >= quiz.max_attempts) && (
                <button className="qp-score-btn primary" onClick={onRetake}>
                  Retake Quiz
                </button>
              )}
              <button className="qp-score-btn secondary" onClick={onBack}>
                Back to Lessons
              </button>
              <button className="qp-score-btn ghost" onClick={onDashboard}>
                Go to Dashboard
              </button>
            </div>
          </div>

          {/* Answer review */}
          <div className="qp-review-title">Answer Review</div>
          {questions.map((qItem, i) => {
            const a = scoreData.answersArr[i];
            const isCorrect  = a.is_correct === true;
            const isWrong    = a.is_correct === false;
            const isSkipped  = a.is_correct === null;
            const icon = isCorrect ? "✅" : isWrong ? "❌" : "⏭️";

            return (
              <div className="qp-review-item" key={qItem.question_id || i}>
                <div className="qp-review-header">
                  <div className="qp-review-icon">{icon}</div>
                  <div className="qp-review-q">Q{i + 1}. {qItem.question}</div>
                </div>
                <div className="qp-review-answers">
                  {isSkipped ? (
                    <div className="qp-review-ans-row">
                      <span className="qp-review-ans-label">Status: </span>
                      <span className="qp-review-ans-val skipped">Not answered</span>
                    </div>
                  ) : (
                    <>
                      <div className="qp-review-ans-row">
                        <span className="qp-review-ans-label">Your answer: </span>
                        <span className={`qp-review-ans-val ${isCorrect ? "correct" : "wrong"}`}>{a.chosen_option}</span>
                      </div>
                      {!isCorrect && (
                        <div className="qp-review-ans-row">
                          <span className="qp-review-ans-label">Correct answer: </span>
                          <span className="qp-review-ans-val correct">{a.correct_option}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {(qItem.explanation || qItem.key_term || qItem.life_connection || qItem.quiz_recap || qItem.source_citation) && (
                  <div className="qp-review-explanation">
                    {qItem.explanation && <p style={{margin:"0 0 8px"}}>{qItem.explanation}</p>}
                    {qItem.key_term && <p style={{margin:"0 0 4px",fontSize:"0.8125rem"}}><strong>Key Term:</strong> {qItem.key_term}{qItem.key_term_meaning ? ` — ${qItem.key_term_meaning}` : ""}</p>}
                    {qItem.life_connection && <p style={{margin:"0 0 4px",fontSize:"0.8125rem"}}><strong>Life Connection:</strong> {qItem.life_connection}</p>}
                    {qItem.quiz_recap && <p style={{margin:"0 0 4px",fontSize:"0.8125rem"}}><strong>Refresher:</strong> {qItem.quiz_recap}</p>}
                    {qItem.source_citation && <p style={{margin:"0",fontSize:"0.75rem",color:"#6B6B6B"}}>{qItem.source_citation}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Quiz player ───────────────────────────────────────────────────────────
  const qTimePct    = isTimed && quiz.question_time_limit ? (qTimeLeft / quiz.question_time_limit) * 100 : 100;
  const quizTimePct = quizTimeLimit ? (quizTimeLeft / quizTimeLimit) * 100 : 100;
  const isUrgent    = isTimed && qTimeLeft <= 5;

  return (
    <div className="qp-wrap">
      <style>{globalStyles}{styles}</style>

      {/* Top bar */}
      <div className="qp-topbar">
        <button className="qp-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <div className="qp-title">{quiz.title} ({current + 1}/{total})</div>
        <div style={{ width: 60 }} />
      </div>

      {/* Segmented progress bar */}
      <div className="qp-progress-segs">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`qp-progress-seg${i < current ? " done" : i === current ? " current" : ""}`}
          />
        ))}
      </div>

      {/* Quiz-level timer bar */}
      {quizTimeLimit > 0 && (
        <div className="qp-quiz-timer">
          <i className="ti ti-clock" />
          <span>{formatTime(quizTimeLeft)} remaining</span>
          <div className="qp-quiz-timer-bar">
            <div className="qp-quiz-timer-fill" style={{ width: `${quizTimePct}%` }} />
          </div>
        </div>
      )}

      <div
        className="qp-body"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {signinToast && <div className="signin-toast">{signinToast}</div>}

        {/* Per-question timer */}
        {isTimed && !isAnswered && (
          <div className="qp-q-timer">
            <i className="ti ti-hourglass" />
            <span>{qTimeLeft}s</span>
            <div className="qp-q-timer-bar">
              <div className={`qp-q-timer-fill${isUrgent ? " urgent" : ""}`} style={{ width: `${qTimePct}%` }} />
            </div>
          </div>
        )}

        {/* Unanswered (timer expired) indicator */}
        {isAnswered && ans?.chosen === null && (
          <div className="qp-unanswered-badge">
            <i className="ti ti-clock-x" /> Time expired — this question was not answered
          </div>
        )}

        {/* Two-column layout */}
        <div
          className="qp-main"
          key={current}
          onClick={onCardTap}
          style={{
            ...(dragOffset !== 0 ? { transform: `translateX(${dragOffset}px)` } : {}),
            transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
          }}
        >

          {/* Left column: question card + options + inline nav */}
          <div className="qp-card">
            <div className="qp-card-body">
              <div className="qp-q-num" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Question {current + 1}</span>
                {canEdit && (
                  <button className="qp-edit-btn" onClick={openEditPanel} title="Edit this question">
                    <i className="ti ti-pencil" /> Edit
                  </button>
                )}
              </div>
              <div className="qp-question fs-heading">{q.question}</div>
            </div>

            {/* Options */}
            <div className="qp-options">
              {q._options.map((opt, oi) => (
                <button
                  key={opt.label}
                  className={`qp-option fs-body ${getOptionClass(opt)}`}
                  onClick={() => selectOption(opt.label, opt.isCorrect)}
                  disabled={isAnswered}
                >
                  <span className="qp-option-marker">{OPTION_LABELS[oi]}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right column: image */}
          <div className="qp-right-col">
            {q.asset?.file_path ? (
              <div className="qp-right-col-img">
                <img src={q.asset.file_path} alt={q.asset.alt_text || ""} />
              </div>
            ) : (
              <div className="qp-right-col-empty">
                <i className="ti ti-photo" style={{ fontSize: "2rem" }} />
                <span>No image</span>
              </div>
            )}
            {isAnswered && ans?.chosen !== null && (
              <button
                className="qp-scroll-prompt"
                key={current}
                onClick={() => window.matchMedia("(max-width: 899px)").matches ? setExplainSheet(true) : scrollToExplain()}
              >
                <span className="qp-sp-desktop"><i className="ti ti-arrow-down" /> Scroll below for explanation</span>
                <span className="qp-sp-mobile"><i className="ti ti-chevrons-up" /> Tap to read</span>
              </button>
            )}
          </div>
        </div>

        {/* Explanation panel — full width, flashes in after answering */}
        {isAnswered && ans?.chosen !== null && (
          <div className="qp-explain-section" ref={explainRef}>
            <div className="qp-explain-label">Question Reference and Explanation</div>
            {renderExplainBlocks()}

            {renderSocialStrip()}


          </div>
        )}

        {/* Explanation sheet — mobile slide-up (matches snippet tap-to-read) */}
        {explainSheet && isAnswered && ans?.chosen !== null && (
          <>
            <div className="qp-sheet-overlay" onClick={() => setExplainSheet(false)} />
            <div
              className="qp-sheet"
              style={{
                ...(sheetDragged ? { animation: "none" } : {}),
                transform: `translateY(${sheetDragY}px)`,
                transition: sheetDragY ? "none" : "transform 0.25s ease",
              }}
              onTouchStart={e => { e.stopPropagation(); onSheetTouchStart(e); }}
              onTouchMove={e => { e.stopPropagation(); onSheetTouchMove(e); }}
              onTouchEnd={e => { e.stopPropagation(); onSheetTouchEnd(e); }}
            >
              <div
                className="qp-sheet-grab"
                onTouchStart={e => { e.stopPropagation(); onSheetGrabStart(e); }}
                onTouchMove={e => { e.stopPropagation(); onSheetGrabMove(e); }}
                onTouchEnd={e => { e.stopPropagation(); onSheetGrabEnd(e); }}
              >
                <div className="qp-sheet-handle" />
                <button className="qp-sheet-close" aria-label="Close" onClick={() => setExplainSheet(false)}><i className="ti ti-x" /></button>
                <div className={"qp-sheet-header " + (ans.isCorrect ? "correct" : "wrong")}>
                  {ans.isCorrect
                    ? <><i className="ti ti-circle-check" /> Correct!</>
                    : <><i className="ti ti-circle-x" /> Correct answer: {q.correct_option}</>}
                </div>
              </div>
              <div className="qp-sheet-body" ref={sheetBodyRef}>
                {renderExplainBlocks()}
                {renderSocialStrip()}
                {current === total - 1 && (
                  <button className="qp-sheet-finish" onClick={requestFinish}>Finish Quiz ✓</button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed bottom nav — same pattern as SnippetPlayer */}
      <div className="player-nav">
        <button className="pnav-btn pnav-prev" onClick={goPrev} disabled={current === 0 || isTimed}>← Prev</button>
        {current < total - 1
          ? <button className="pnav-btn pnav-center-finish" onClick={requestFinish}><i className="ti ti-flag-3" style={{ fontSize: 13 }} /> Finish</button>
          : <span />}
        {current === total - 1
          ? <button className="pnav-btn pnav-finish" onClick={requestFinish}>Finish ✓</button>
          : <button className="pnav-btn pnav-next" onClick={goNext}>Next →</button>}
      </div>

      {/* Edit panel (admin/creator) */}
      {showEditPanel && canEdit && q && (
        <>
          <div className="qp-edit-overlay" onClick={() => setShowEditPanel(false)} />
          <div className="qp-edit-panel">
            <div className="qp-edit-header">
              <div>
                <div className="qp-edit-header-title">Edit Question</div>
                <div className="qp-edit-header-sub">
                  {q.question_type === "snippet" ? "Type 1 — snippet-linked" : "Type 2 — standalone"}
                  {q.snippet_id ? ` · ${q.snippet_id}` : ""}
                </div>
              </div>
              <button className="qp-edit-close" onClick={() => setShowEditPanel(false)}>✕</button>
            </div>

            <div className="qp-edit-body">
              {/* Question fields — always shown */}
              <div className="qp-edit-section-label">Quiz Question</div>
              {[
                { key: "question",       label: "Question",        rows: 3 },
                { key: "correct_option", label: "Correct Option ✓", rows: 2, green: true },
                { key: "wrong_option_1", label: "Wrong Option 1",  rows: 2 },
                { key: "wrong_option_2", label: "Wrong Option 2",  rows: 2 },
                { key: "wrong_option_3", label: "Wrong Option 3",  rows: 2 },
              ].map(({ key, label, rows, green }) => (
                <div className="qp-edit-field" key={key}>
                  <label style={green ? { color: "#00924A" } : undefined}>{label}</label>
                  <textarea
                    rows={rows}
                    value={editDraft[key] || ""}
                    onChange={e => setEditDraft(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}

              {/* Snippet translation fields — Type 1 or Type 2 with explanation */}
              <hr className="qp-edit-divider" />
              <div className="qp-edit-section-label">
                {q.question_type === "snippet" ? "Snippet Content" : "Explanation & Context"}
              </div>
              {[
                ...(q.question_type === "snippet" ? [
                  { key: "hook",             label: "Hook (headline)",     rows: 2 },
                ] : []),
                { key: "explanation",      label: "Explanation",         rows: 5 },
                { key: "key_term",         label: "Key Term",            rows: 1 },
                { key: "key_term_meaning", label: "Key Term Meaning",    rows: 2 },
                { key: "life_connection",  label: "Life Connection",     rows: 3 },
                ...(q.question_type === "snippet" ? [
                  { key: "quiz_recap",     label: "Refresher Questions", rows: 2 },
                ] : []),
                { key: "source_citation",  label: "Source / Citation",   rows: 1 },
              ].map(({ key, label, rows }) => (
                <div className="qp-edit-field" key={key}>
                  <label>{label}</label>
                  <textarea
                    rows={rows}
                    value={editDraft[key] || ""}
                    onChange={e => setEditDraft(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="qp-edit-footer">
              {editMsg && (
                <span className={"qp-edit-msg " + (editMsg === "Saved!" ? "ok" : "err")}>{editMsg}</span>
              )}
              <button className="qp-edit-cancel-btn" onClick={() => setShowEditPanel(false)}>Cancel</button>
              <button className="qp-edit-save-btn" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Finish confirmation overlay */}
      {phase === "confirm_finish" && (
        <div className="qp-overlay">
          <div className="qp-confirm-card">
            <div className="qp-confirm-icon">⚠️</div>
            <div className="qp-confirm-title">Submit Quiz?</div>
            <div className="qp-confirm-body">
              You have <strong>{questions.reduce((n, _, i) => n + (answers.has(i) ? 0 : 1), 0)}</strong> unanswered question(s).
              Unanswered questions will not count towards your score.
            </div>
            <div className="qp-confirm-btns">
              <button className="qp-confirm-btn primary" onClick={finishQuiz}>
                Submit Anyway
              </button>
              <button className="qp-confirm-btn cancel" onClick={() => setPhase("quiz")}>
                Go Back &amp; Answer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
