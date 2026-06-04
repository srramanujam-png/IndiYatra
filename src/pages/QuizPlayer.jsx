import { useState, useEffect, useRef, useCallback } from "react";
import { supabaseClient, SAFFRON, HERITAGE, GREEN, DEFAULT_LANG_ID } from "../lib/supabase";
import { saveQuizAttempt, getAttemptCount, saveSnippetQuestion, saveStandaloneQuestion } from "../lib/auth";
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
  .qp-body { flex: 1; max-width: 1120px; width: 100%; margin: 0 auto; padding: 28px 1.5rem 48px; }

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
  @media (max-width: 900px) {
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
    font-size: 0.9375rem; font-weight: 500; color: #1F1F1F; text-align: left;
  }
  .qp-option:hover:not(.locked) { border-color: ${SAFFRON}; background: #FFF8EE; }
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
    background: none; border: none; padding: 5px 0;
    font-size: 0.9375rem; color: #4A5565; transition: color 0.2s;
    font-family: 'Inter', system-ui, sans-serif; font-weight: 500; cursor: pointer;
  }
  .qp-social-btn:hover:not(:disabled)  { color: ${SAFFRON}; }
  .qp-social-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .qp-social-btn.active   { color: ${SAFFRON}; }
  .qp-social-btn.copied   { color: ${GREEN}; }
  .qp-social-icon { font-size: 1.125rem; line-height: 1; display: flex; align-items: center; }

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

  // Scroll explanation into view whenever an answer is revealed
  useEffect(() => {
    const currentAns = answers.get(current);
    if (currentAns && currentAns.chosen !== null && explainRef.current) {
      setTimeout(() => {
        explainRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    }
  }, [answers, current]);

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
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function goNext() {
    if (current < total - 1) { setCurrent(c => c + 1); }
  }
  function goPrev() {
    if (isTimed) return; // disabled in timed mode
    if (current > 0) { setCurrent(c => c - 1); }
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
      setTimeout(() => setShareCopied(false),