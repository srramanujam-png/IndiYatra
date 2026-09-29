import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, DEFAULT_LANG_ID, DIFFICULTY_STARS } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { supabaseClient, loadUserLikes, insertLike, deleteLike, postComment, deleteComment, adminDeleteComment, editComment, reportComment, getSnippetQuestion, saveSnippetQuestion, getPairedContent, insertGenericLike, deleteGenericLike } from "../lib/auth";
import { containsProfanity, PROFANITY_MESSAGE } from "../lib/profanity";
import { track } from "../lib/track";
import SharePopover from "../components/SharePopover";
import { globalStyles } from "../styles/global";
import { DEFAULT_SNIPPET_SHARE_MSG, APP_URL, PLAYER, SIGNIN } from "../config/appStrings";
import { useViewTracking } from "../hooks/useViewTracking";

const BLUE = "var(--color-primary)";

const BADGE_META = {
  lesson: { emoji: "📖", label: "Lesson" },
  module: { emoji: "📚", label: "Module" },
  theme:  { emoji: "🏛️", label: "Theme" },
  level:  { emoji: "🎓", label: "Level" },
  course: { emoji: "🏆", label: "Course" },
};

const styles = `
  .player-wrap { min-height: 100vh; min-height: 100dvh; background: #FFFFFF; display: flex; flex-direction: column; }

  .player-top-bar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border);
    padding: 0 1.5rem; height: 54px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .player-back {
    display: flex; align-items: center; gap: 5px; background: none; border: none;
    cursor: pointer; font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem;
    font-weight: 500; color: var(--color-text-body); transition: color 0.2s; flex-shrink: 0;
  }
  .player-back:hover { color: ${SAFFRON}; }
  .player-lesson-name {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1rem; font-weight: 500;
    color: ${HERITAGE}; flex: 1; text-align: center;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .player-nav-links { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
  .player-nav-link {
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 8px;
    background: none; border: none; cursor: pointer;
    font-size: 1.125rem; color: var(--color-text-body); transition: background 0.12s, color 0.15s;
  }
  .player-nav-link:hover { background: var(--color-border-muted); color: ${SAFFRON}; }
  .player-progress { height: 3px; background: var(--color-border-muted); }
  .player-progress-fill { height: 100%; background: ${SAFFRON}; transition: width 0.4s ease; }

  .player-body {
    position: relative;
    flex: 1; max-width: 680px; width: 100%; margin: 0 auto;
    padding: 20px 1rem 24px;
    touch-action: pan-y;
    user-select: none;
  }
  /* Reserve room for the fixed bottom bar only when it is actually rendered */
  .player-wrap:has(.player-nav) .player-body { padding-bottom: 120px; }
  @media (min-width: 900px) {
    .player-body { max-width: 1120px; }
  }

  /* Card */
  .snip-card {
    background: white; border-radius: 12px; border: 1px solid var(--color-border);
    overflow: hidden;
  }

  /* ── Two-block two-column layout ── */
  /* TOP BLOCK: hook left (mobile order 1) | image right (mobile order 2) */
  .snip-top-block { display: flex; flex-direction: column; border-bottom: 1px solid var(--color-border); }
  .snip-top-left  { padding: 16px 20px 12px; order: 1; }
  .snip-top-right { order: 2; }

  /* BOTTOM BLOCK: explanation+citation left (mobile order 3) | key terms right (mobile order 4) */
  .snip-bottom-block { display: flex; flex-direction: column; }
  .snip-bottom-left  { padding: 20px 20px 16px; order: 1; border-bottom: 1px solid var(--color-border); }
  .snip-bottom-right { padding: 16px 20px 16px; order: 2; display: flex; flex-direction: column; gap: 12px; }

  /* Desktop: ONE row, two columns — left = hook + picture (stacked),
     right = explanation + key terms (stacked) — so the explanation sits
     beside the hook instead of below a 2×2 grid, with no scrolling needed. */
  @media (min-width: 900px) {
    .snip-flow { display: flex; align-items: stretch; }
    .snip-top-block {
      flex: 1 1 0; min-width: 0;
      border-bottom: none; border-right: 1px solid var(--color-border);
    }
    .snip-top-left  { padding: 28px 28px 20px; }
    .snip-top-right { padding: 0 28px 28px; }
    .snip-bottom-block { flex: 1 1 0; min-width: 0; }
    .snip-bottom-left  { padding: 28px 28px 16px; border-bottom: none; }
    .snip-bottom-right { padding: 0 28px 28px; }
  }
  @keyframes snippetFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .snip-enter-next { animation: snippetFadeIn 0.2s ease both; }
  .snip-enter-prev { animation: snippetFadeIn 0.2s ease both; }

  @keyframes swipeFadeOut {
    0%   { opacity: 1; }
    75%  { opacity: 1; }
    100% { opacity: 0; }
  }
  /* One-time hint: floats over the page so it takes no layout height */
  .swipe-hint {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 120;
    padding: 6px 14px; border-radius: 999px; background: rgba(20,20,20,0.75); color: #fff;
    font-size: 0.75rem; white-space: nowrap;
    pointer-events: none; font-family: 'Inter', system-ui, sans-serif;
    animation: swipeFadeOut 3.5s ease forwards;
  }
  @media (min-width: 900px) { .swipe-hint { display: none; } }

  /* Image */
  .snip-img {
    position: relative; width: 100%;
    background: transparent;
    display: flex; align-items: center; justify-content: center;
    max-height: min(300px, 32vh); overflow: hidden;
  }
  .snip-img img {
    display: block; width: 100%; max-height: min(300px, 32vh); object-fit: contain;
  }
  .snip-diff {
    position: absolute; bottom: 10px; right: 10px;
    background: rgba(0,0,0,0.50); color: white; border-radius: 999px;
    padding: 3px 10px; font-size: 0.6875rem; font-weight: 500; letter-spacing: 0.04em;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* No-image header band */
  .snip-header-band {
    position: relative; width: 100%; height: 160px;
    background: transparent;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .snip-header-ornament {
    font-size: 4.5rem; opacity: 0.15; user-select: none; pointer-events: none;
  }
  .snip-lang-badge {
    position: absolute; top: 10px; left: 10px;
    background: rgba(0,0,0,0.45); color: white; border-radius: 999px;
    padding: 7px 12px; font-size: 0.6875rem; font-weight: 500; letter-spacing: 0.04em;
    text-transform: capitalize; font-family: 'Inter', system-ui, sans-serif;
    border: none; cursor: pointer; display: flex; align-items: center; gap: 4px;
    transition: background 0.15s;
  }
  .snip-lang-badge:hover { background: rgba(0,0,0,0.65); }

  /* Language picker modal */
  .lang-picker-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 5vh 1rem 2rem; animation: fadeIn 0.2s ease; overflow-y: auto;
  }
  .lang-picker-card {
    background: white; border-radius: 16px; padding: 32px 28px;
    max-width: 380px; width: 100%;
    animation: fadeUp 0.35s ease both;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    margin: 0 auto;
  }
  .lang-picker-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.5rem; font-weight: 500;
    color: ${HERITAGE}; margin-bottom: 6px; text-align: center;
  }
  .lang-picker-sub {
    font-size: 0.9375rem; color: var(--color-text-body); margin-bottom: 20px; line-height: 1.6;
    font-family: 'Nunito Sans', system-ui, sans-serif; text-align: center;
  }
  .lang-picker-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .lang-picker-opt {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-border);
    background: white; cursor: pointer; text-align: left; width: 100%;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.9375rem; font-weight: 500;
    color: var(--color-text-main); transition: border-color 0.15s, background 0.15s;
  }
  .lang-picker-opt:hover { border-color: ${HERITAGE}; background: #F0F6FF; }
  .lang-picker-opt.active { border-color: ${HERITAGE}; background: #EEF5FF; color: ${HERITAGE}; }
  .lang-picker-checkmark { color: ${HERITAGE}; font-size: 1rem; }
  .lang-picker-cancel {
    display: block; width: 100%; padding: 12px 20px; border-radius: 12px; border: none;
    background: var(--color-border-muted); color: var(--color-text-body); cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    transition: background 0.15s; min-height: 44px;
  }
  .lang-picker-cancel:hover { background: var(--color-border); }

  /* Body */
  .snip-body { padding: 20px 24px 16px; }
  .snip-hook {
    font-family: 'Literata', serif; font-size: calc(1.625rem + 1pt); font-weight: 500;
    color: var(--color-text-main); line-height: 1.3; margin-bottom: 8px;
    letter-spacing: 0.01em; text-align: left;
  }
  .snip-divider { height: 1px; background: var(--color-border); margin: 20px 0; }

  .snip-empty    { text-align: center; padding: 48px 24px; font-family: 'Oswald', sans-serif; font-size: 1.25rem; color: var(--color-text-body); }

  /* Completion modal */
  .completion-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: flex-start; justify-content: center; padding: 5vh 1rem 2rem;
    animation: fadeIn 0.2s ease; overflow-y: auto;
  }
  .completion-card {
    background: white; border-radius: 16px; padding: 32px 28px;
    text-align: center; max-width: 380px; width: 100%;
    animation: fadeUp 0.35s ease both;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    margin: 0 auto;
  }
  .comp-emoji    { font-size: 2.25rem; margin-bottom: 8px; }
  .comp-title    { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.5rem; font-weight: 500; color: ${HERITAGE}; margin-bottom: 6px; }
  .comp-subtitle { font-size: 0.9375rem; color: var(--color-text-body); margin-bottom: 16px; line-height: 1.6; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comp-points {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: white; border: 1px solid ${SAFFRON}44; border-radius: 12px;
    padding: 12px 20px; margin-bottom: 16px;
  }
  .comp-points-icon  { font-size: 1.375rem; }
  .comp-points-value { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.75rem; font-weight: 600; color: ${SAFFRON}; line-height: 1; }
  .comp-points-label { font-size: 0.875rem; font-weight: 500; color: #b86000; font-family: 'Inter', system-ui, sans-serif; }
  .comp-badges {
    background: var(--color-border-muted); border: 1px solid var(--color-border); border-radius: 12px;
    padding: 12px 16px; margin-bottom: 16px; text-align: left;
  }
  .comp-badges-title { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${HERITAGE}; margin-bottom: 10px; font-family: 'Inter', system-ui, sans-serif; }
  .comp-badge-row { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
  .comp-badge-row:last-child { margin-bottom: 0; }
  .comp-badge-emoji { font-size: 1.25rem; flex-shrink: 0; }
  .comp-badge-text  { font-size: 0.9375rem; color: var(--color-text-main); line-height: 1.3; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comp-btn {
    display: block; width: 100%; padding: 12px 20px; border-radius: 12px; border: none;
    cursor: pointer; font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    margin-bottom: 8px; transition: all 0.2s;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .comp-next      { background: ${HERITAGE}; color: white; }
  .comp-next:hover { opacity: 0.9; transform: translateY(-1px); }
  .comp-primary   { background: ${SAFFRON}; color: white; }
  .comp-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .comp-quiz { background: var(--color-primary); color: white; border-color: var(--color-primary); }
  .comp-quiz:hover { background: #003E7E; border-color: #003E7E; opacity: 1; transform: translateY(-1px); }
  .comp-dashboard { background: white; color: ${HERITAGE}; border: 1px solid var(--color-border) !important; }
  .comp-dashboard:hover { background: var(--color-border-muted); }
  .comp-secondary { background: var(--color-border-muted); color: var(--color-text-body); font-size: 0.8125rem; }
  .comp-secondary:hover { background: var(--color-border); }

  /* Social strip */
  .snip-social {
    display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center;
    padding: 8px 12px 6px; border-top: 1px solid var(--color-border); margin-top: 10px; gap: 6px;
  }
  .snip-social-left  { display: flex; align-items: center; gap: 2px; justify-self: start; }
  .snip-social-right { display: flex; align-items: center; gap: 2px; justify-self: end; }
  .snip-social-counter {
    justify-self: center; font-family: 'Inter', system-ui, sans-serif; font-size: 0.8125rem;
    font-weight: 500; color: var(--color-text-body); background: var(--color-border-muted);
    padding: 4px 10px; border-radius: 999px; white-space: nowrap;
  }
  .snip-social-btn {
    display: flex; align-items: center; gap: 4px;
    background: none; border: none; padding: 8px; border-radius: 999px; min-height: 40px;
    font-size: 0.9375rem; color: var(--color-text-body);
    transition: color 0.2s, background 0.15s, transform 0.12s;
    font-family: 'Inter', system-ui, sans-serif; font-weight: 500;
  }
  .snip-social-btn:active { transform: scale(0.86); }
  .snip-like-btn          { cursor: pointer; }
  .snip-like-btn:hover    { color: var(--color-accent); }
  .snip-like-btn.active   { color: var(--color-accent); background: #FF8E0018; }
  .snip-like-btn.disabled { cursor: not-allowed; opacity: 0.5; }
  .snip-bm-btn         { cursor: pointer; }
  .snip-bm-btn:hover   { color: var(--color-accent); }
  .snip-bm-btn.active  { color: var(--color-accent); background: #FF8E0018; }
  .snip-bm-btn.disabled { cursor: not-allowed; opacity: 0.5; }
  .snip-comment-btn  { cursor: pointer; }
  .snip-comment-btn:hover { color: var(--color-accent); }
  .snip-share-btn    { cursor: pointer; }
  .snip-share-btn:hover { color: var(--color-accent); }
  .snip-social-icon  { font-size: 1.25rem; line-height: 1; display: flex; align-items: center; }
  .snip-social-icon svg { width: 1em; height: 1em; max-width: none; flex: none; display: block; }
  @media (min-width: 900px) {
    .snip-social-icon { font-size: 1.375rem; }
  }

  /* Comments sheet */
  .comments-overlay {
    position: fixed; inset: 0; z-index: 150;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  .comments-sheet {
    background: white; border-radius: 16px 16px 0 0;
    width: 100%; max-width: 680px; max-height: 70vh;
    display: flex; flex-direction: column; overflow: hidden;
    animation: slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both;
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .comments-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  }
  .comments-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.125rem; font-weight: 500; color: var(--color-text-main);
  }
  .comments-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.25rem; color: var(--color-text-body); padding: 4px; line-height: 1;
  }
  .comments-close:hover { color: var(--color-text-main); }
  .comments-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
  .comments-empty { text-align: center; padding: 32px; color: var(--color-text-body); font-size: 0.9375rem; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comments-signin { text-align: center; padding: 16px 0 8px; }
  .comments-signin-text { font-size: 0.9375rem; color: var(--color-text-body); margin-bottom: 10px; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comments-signin-btn {
    display: inline-block; padding: 10px 24px; border-radius: 12px;
    background: var(--color-accent); color: white; border: none;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    opacity: 0.4; cursor: not-allowed;
  }
  .comment-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .comment-avatar {
    width: 32px; height: 32px; border-radius: 50%; background: var(--color-border-muted);
    flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.875rem;
  }
  .comment-content { flex: 1; }
  .comment-author { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-main); margin-bottom: 2px; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comment-text { font-size: 0.9375rem; color: var(--color-text-body); line-height: 1.6; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comment-time { font-size: 0.6875rem; color: var(--color-text-body); margin-top: 3px; font-family: 'Inter', system-ui, sans-serif; }
  .comment-author-row { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
  .comment-actions { display: flex; align-items: center; gap: 6px; margin-left: 6px; }
  .comment-delete-btn { background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 0.9375rem; padding: 6px; line-height: 1; }
  .comment-delete-btn:hover { color: #e55; }
  .comment-edit-btn { background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 0.9375rem; padding: 6px; line-height: 1; }
  .comment-edit-btn:hover { color: var(--color-accent); }
  .comment-report-btn { background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 0.9375rem; padding: 6px; line-height: 1; }
  .comment-report-btn:hover { color: #e58e00; }
  .comment-report-btn.reported { color: #7BAE7F; cursor: default; }
  .comment-error { margin-top: 6px; font-size: 0.8125rem; color: #c0392b; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comment-edit-form { margin-top: 4px; }
  .comment-edit-actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
  .comment-edit-cancel-btn { background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 4px 12px; font-size: 0.875rem; cursor: pointer; color: var(--color-text-body); font-family: 'Inter', system-ui, sans-serif; }
  .comment-edit-cancel-btn:hover { background: var(--color-border-muted); }
  .comments-count { font-size: 0.875rem; color: var(--color-text-body); font-weight: 400; font-family: 'Inter', system-ui, sans-serif; }
  .comments-footer { border-top: 1px solid var(--color-border); padding: 12px 16px; background: #fff; }
  .comment-input {
    width: 100%; box-sizing: border-box;
    border: 1px solid var(--color-border); border-radius: 10px;
    padding: 10px 12px; font-size: 0.9375rem;
    font-family: 'Nunito Sans', system-ui, sans-serif;
    resize: none; outline: none;
    background: #FFFFFF; color: var(--color-text-main);
    transition: border-color 0.15s;
  }
  .comment-input:focus { border-color: var(--color-accent); }
  .comment-footer-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .comment-char-count { font-size: 0.75rem; color: var(--color-text-body); font-family: 'Inter', system-ui, sans-serif; }
  .comment-post-btn {
    background: var(--color-accent); color: #fff; border: none;
    border-radius: 8px; padding: 7px 18px;
    font-size: 0.875rem; font-weight: 500;
    cursor: pointer; transition: opacity 0.15s;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .comment-post-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .comment-post-btn:not(:disabled):hover { opacity: 0.88; }

  /* Snippet edit button */
  .snip-edit-btn { cursor: pointer; }
  .snip-edit-btn:hover { color: ${HERITAGE}; }

  /* Edit panel */
  .edit-panel-overlay {
    position: fixed; inset: 0; z-index: 155;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  .edit-panel-sheet {
    background: white; border-radius: 16px 16px 0 0;
    width: 100%; max-width: 680px; max-height: 85vh;
    display: flex; flex-direction: column; overflow: hidden;
    animation: slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both;
  }
  .edit-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
  }
  .edit-panel-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.125rem; font-weight: 500; color: var(--color-text-main);
  }
  .edit-panel-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.25rem; color: var(--color-text-body); padding: 4px; line-height: 1;
  }
  .edit-panel-close:hover { color: var(--color-text-main); }
  .edit-panel-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
  .edit-field-group { margin-bottom: 18px; }
  .edit-field-label {
    display: block; font-size: 0.6875rem; font-weight: 600;
    letter-spacing: 0.09em; text-transform: uppercase; color: ${HERITAGE};
    margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif;
  }
  .edit-field-input {
    width: 100%; box-sizing: border-box;
    border: 1px solid var(--color-border); border-radius: 10px;
    padding: 9px 12px; font-size: 0.9375rem;
    font-family: 'Nunito Sans', system-ui, sans-serif; color: var(--color-text-main);
    background: #FFFFFF; resize: vertical; outline: none;
    transition: border-color 0.15s;
  }
  .edit-field-input:focus { border-color: ${HERITAGE}; }
  .edit-panel-footer {
    border-top: 1px solid var(--color-border);
    padding: 12px 20px; background: white;
    display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  }
  .edit-panel-msg { font-size: 0.875rem; color: ${GREEN}; flex: 1; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .edit-panel-msg.err { color: #e55; }
  .edit-cancel-btn {
    padding: 9px 22px; border-radius: 12px; border: 1px solid var(--color-border);
    background: white; color: var(--color-text-body); cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    transition: background 0.15s;
  }
  .edit-cancel-btn:hover { background: var(--color-border-muted); }
  .edit-save-btn {
    padding: 9px 28px; border-radius: 12px; border: none;
    background: ${HERITAGE}; color: white; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    transition: opacity 0.15s;
  }
  .edit-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .edit-save-btn:not(:disabled):hover { opacity: 0.88; }

  /* ── Mobile cover mode ── */
  .snip-tap-hint { display: none; }
  @media (max-width: 899px) {
    .snip-bottom-block { display: none !important; }
    .snip-top-block { cursor: pointer; }
    .snip-tap-hint {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      margin: 14px 16px; padding: 6px 14px;
      border: 1px solid ${SAFFRON}66; border-radius: 999px; background: #FFF8EE;
      font-size: 0.8125rem; font-weight: 500; color: #B45309;
      font-family: 'Inter', system-ui, sans-serif;
      user-select: none; cursor: pointer;
    }
    .snip-tap-hint + .snip-social { margin-top: 0; }
  }

  /* ── Reveal sheet (mobile tap-to-reveal) ── */
  .reveal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 140;
    background: transparent; /* full-screen tap-catcher: tapping anywhere outside the sheet closes it */
  }
  .reveal-sheet {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 145;
    background: var(--color-sheet-tint); border-radius: 20px 20px 0 0;
    border-top: 2px solid var(--color-browse); box-shadow: 0 -10px 28px rgba(16,24,40,0.22);
    max-height: 78vh; max-height: 78dvh; min-height: 60vh; min-height: 60dvh;
    display: flex; flex-direction: column;
    animation: slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both;
    overflow: hidden;
    touch-action: pan-y;
  }
  @media (min-width: 900px) {
    .reveal-overlay, .reveal-sheet { display: none !important; }
  }

  /* ── Floating action bar shown while the reveal sheet is open ── */
  .snip-float-social {
    position: fixed; left: 10px; right: 10px; top: 64px; z-index: 150;
    background: var(--color-panel-tint); border: 1px solid var(--color-browse);
    border-radius: 16px; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    opacity: 0; pointer-events: none; transform: translateY(-6px);
    transition: opacity 0.22s ease, transform 0.22s ease;
  }
  .snip-float-social .snip-social-btn { color: var(--color-teal-ink); }
  .snip-float-social .snip-social-btn.active { color: var(--color-accent); }
  .snip-float-social .snip-social-counter { background: #fff; color: var(--color-teal-ink); }
  .snip-float-social.open { opacity: 1; pointer-events: auto; transform: translateY(0); }
  .snip-float-social .snip-social { border-top: none; margin-top: 0; padding: 4px 12px; }
  @media (min-width: 900px) {
    .snip-float-social { display: none !important; }
  }
  .reveal-sheet-grab { position: relative; flex-shrink: 0; touch-action: none; }
  .reveal-sheet-handle {
    width: 44px; height: 5px; background: var(--color-browse); border-radius: 3px;
    margin: 12px auto 0; flex-shrink: 0;
  }
  .reveal-sheet-close {
    position: absolute; top: 10px; right: 10px; width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    background: #fff; border: none; border-radius: 999px;
    color: var(--color-text-body); font-size: 1.25rem; cursor: pointer;
  }
  .reveal-sheet-close:hover { color: var(--color-text-body); background: var(--color-border-muted); }
  .reveal-sheet-body {
    flex: 1; overflow-y: auto; padding: 16px 20px calc(32px + env(safe-area-inset-bottom, 0px));
    overscroll-behavior: contain;
  }
  .reveal-sheet-body.sheet-body-noHead { padding-top: 22px; }

  @media (max-width: 480px) {
    .player-body { padding: 12px 0.75rem 16px; }
    .player-wrap:has(.player-nav) .player-body { padding-bottom: 84px; }
    .snip-hook { font-size: calc(1.25rem + 1pt); }
    .snip-top-left { padding: 10px 14px 8px; }
    .snip-bottom-left { padding: 14px 14px 12px; }
    .snip-bottom-right { padding: 12px 14px 14px; }
    .player-nav-links { display: none !important; }
    .snip-img { max-height: min(300px, 30vh); }
    .snip-img img { max-height: min(300px, 30vh); }
  }
`;

export default function SnippetPlayer({
  course, theme, module, lesson, levelId, settings,
  allLessons = [], earnedBadges = [],
  initialSnippetIndex = 0,
  playlistSnippetIds = null,
  onSnippetAdvance,
  onBackToLessons, backToLessonsLabel = "Back to Lessons", showRewards = true, onBackToLikes, onBackToDiscover = null, playlistKind = null, batchMode = false, playlistLabel = "", onHome, onDashboard, onLikes, onBookmarks, onDiscover, onComplete, onNextLesson,
  bookmarks = new Set(), onToggleBookmark,
  isAdmin = false,
  isCreator = false,
  userEditorialRole = null,
  snippetShareMsg = DEFAULT_SNIPPET_SHARE_MSG,
  lessonQuiz = null,
  onTakeQuiz = null,
  languages = [],
  onSaveSettings,
}) {
  const playlistMode       = !!(playlistSnippetIds && playlistSnippetIds.length > 0);
  const backToPlaylist      = onBackToDiscover || onBackToLikes;
  const LIKES_BATCH_SIZE    = 10; // My Likes / Most Liked / Surprise Mix pause for a checkpoint every N snippets
  const { user, profile, onSignIn } = useAuthContext();
  const [snippets,     setSnippets]     = useState([]);
  const [translations, setTranslations] = useState({});
  const [assets,       setAssets]       = useState({});
  const [current,      setCurrent]      = useState(initialSnippetIndex);
  const [loading,      setLoading]      = useState(true);
  const [done,         setDone]         = useState(false);
  const [totalPoints,  setTotalPoints]  = useState(0);
  const [snippetDir,   setSnippetDir]   = useState("next"); // 'next' | 'prev'
  const [liked,           setLiked]           = useState(new Set());
  const [likeCounts,      setLikeCounts]      = useState({});
  const [commentCounts,   setCommentCounts]   = useState({});
  const [showComments,    setShowComments]    = useState(false);
  const [commentsData,    setCommentsData]    = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsSnipId,  setCommentsSnipId]  = useState(null);
  const [sharePopoverId,  setSharePopoverId]  = useState(null); // snippet_id or null
  const [showLangPicker,  setShowLangPicker]  = useState(false);
  const [commentDraft,    setCommentDraft]    = useState("");
  const [commentPosting,  setCommentPosting]  = useState(false);
  const [commentError,    setCommentError]    = useState("");
  const [reportedIds,     setReportedIds]     = useState(() => new Set());
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editDraft,        setEditDraft]        = useState("");

  // Snippet inline edit state
  const [showEditPanel,       setShowEditPanel]       = useState(false);
  const [sheetOpen,          setSheetOpen]          = useState(false);
  const [sheetDragY,         setSheetDragY]         = useState(0);
  const [sheetDragged,       setSheetDragged]       = useState(false);
  const sheetGrabY = useRef(null);
  // Floating action bar (shown while the reveal sheet is open) — keeps the
  // hook visible above the dimmed area and the sheet resized to start right below it.
  const [sheetTopPx, setSheetTopPx] = useState(null);
  const hookBlockRef = useRef(null);
  const hookTextRef = useRef(null);
  const floatBarRef = useRef(null);
  const firstViewedRef = useRef(initialSnippetIndex); // swipe hint shows once, on the first snippet opened
  const [signinToast, setSigninToast] = useState("");
  const toastTimerRef = useRef(null);
  const [editSnipDraft,       setEditSnipDraft]       = useState({});
  const [editSaving,          setEditSaving]          = useState(false);
  const [editMsg,             setEditMsg]             = useState("");
  const [editQuestionLoading, setEditQuestionLoading] = useState(false);

  // Swipe tracking
  const touchStartX  = useRef(null);
  const touchStartY  = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let ids;
        if (playlistMode) {
          ids = playlistSnippetIds;
        } else {
          const mappings = await supabase(
            "lesson_snippet_mapping",
            `?select=snippet_id,order_index&lesson_id=eq.${lesson.lesson_id}&order=order_index`
          );
          if (!mappings || mappings.length === 0) {
            setSnippets([]);
            setLoading(false);
            return;
          }
          ids = mappings
            .sort((a, b) => a.order_index - b.order_index)
            .map(m => m.snippet_id);
        }

        const idFilter = `&snippet_id=in.(${ids.join(",")})`;

        const [cores, transList] = await Promise.all([
          supabase("snippet_core", `?select=*${idFilter}`),
          supabase("snippet_translations", `?select=*${idFilter}`),
        ]);

        // Fetch only the asset rows actually used by these snippets
        const assetIds = [...new Set((cores || []).map(c => c.asset_id).filter(Boolean))];
        const assetData = assetIds.length > 0
          ? await supabase("asset_library", `?select=*&asset_id=in.(${assetIds.join(",")})`)
          : [];

        const assetMap = {};
        (assetData || []).forEach(a => { assetMap[a.asset_id] = a; });

        // snippet_translations.language stores language IDs (e.g. "LANG_03"), not codes
        const prefLangId = settings.languageId;
        const transMap = {};
        (transList || []).forEach(t => {
          if (!transMap[t.snippet_id]) transMap[t.snippet_id] = {};
          transMap[t.snippet_id][t.language] = t;
        });
        const resolvedTrans = {};
        ids.forEach(id => {
          const opts = transMap[id] || {};
          // Prefer selected language; fall back to English (LANG_03) only
          resolvedTrans[id] = opts[prefLangId] || opts[DEFAULT_LANG_ID] || null;
        });

        const coreMap = {};
        (cores || []).forEach(c => { coreMap[c.snippet_id] = c; });
        // Only include snippets that have a translation in the selected (or fallback) language
        const ordered = ids.map(id => coreMap[id]).filter(s => s && resolvedTrans[s.snippet_id]);

        const points = ordered.reduce((sum, s) => sum + (s.snippet_value || 0), 0);

        setSnippets(ordered);
        setTranslations(resolvedTrans);
        setAssets(assetMap);
        setTotalPoints(points);

        // Seed like counts from snippet_core.like_count (trigger-maintained)
        const lc = {};
        ordered.forEach(s => { lc[s.snippet_id] = s.like_count || 0; });
        setLikeCounts(lc);

        // Comment counts — graceful, table may not exist yet
        try {
          const idList = ids.join(",");
          const commentsRaw = await supabase("snippet_comments", "?select=snippet_id&snippet_id=in.(" + idList + ")");
          const cc = {};
          (Array.isArray(commentsRaw) ? commentsRaw : []).forEach(r => { cc[r.snippet_id] = (cc[r.snippet_id] || 0) + 1; });
          setCommentCounts(cc);
        } catch (e) {
          console.log("Comments unavailable:", e.message);
        }

        // Load which snippets the current user has already liked
        if (user && !user.is_anonymous) {
          try {
            const { data: userLikes } = await loadUserLikes(user.id, ids);
            const likedSet = new Set((userLikes || []).map(r => r.snippet_id));
            setLiked(likedSet);
          } catch (e) {
            console.log("Could not load user likes:", e.message);
          }
        }
      } catch (e) {
        console.error("Snippet load error", e);
      }
      setLoading(false);
    }
    load();
  }, [lesson?.lesson_id, playlistSnippetIds, settings.languageId]);

  // Reset position and done-state whenever the lesson changes (e.g. Next Lesson)
  useEffect(() => {
    setCurrent(initialSnippetIndex);
    setDone(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.lesson_id]);

  // Reset state when lesson changes (next lesson nav)
  useEffect(() => {
    setCurrent(initialSnippetIndex);
    setDone(false);
    setSnippetDir("next");
    setSnippets([]);
    setTranslations({});
    setAssets({});
    setTotalPoints(0);
    setLikeCounts({});
    setCommentCounts({});
    setShowComments(false);
    setCommentsData([]);
    setCommentsSnipId(null);
    setLoading(true);
  }, [lesson?.lesson_id, playlistSnippetIds]);

  const total    = snippets.length;
  const snip     = snippets[current];

  // R3 view event — one per snippet actually shown (batched in track.js).
  useEffect(() => {
    if (snip?.snippet_id) track("view", { contentType: "snippet", contentId: snip.snippet_id });
  }, [snip?.snippet_id]);
  const trans    = snip ? (translations[snip.snippet_id] || {}) : {};
  const asset    = snip ? assets[snip.asset_id] : null;
  // Map language ID (e.g. "LANG_03") → display name (e.g. "English")
  const langName = trans.language
    ? (languages.find(l => l.language_id === trans.language)?.language || trans.language)
    : null;
  const isLast   = current === total - 1;
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

  const currentLessonIdx = !playlistMode && lesson ? allLessons.findIndex(l => l.lesson_id === lesson.lesson_id) : -1;
  const nextLesson = !playlistMode && currentLessonIdx >= 0 ? allLessons[currentLessonIdx + 1] : null;

  // Batch checkpoint helpers (Likes/Most Liked/Surprise Mix): how many
  // snippets viewed this session (relative to wherever the playlist
  // started), a plain (no-emoji) label for the "Continue Reading ___"
  // button, and the right "Back to ___" wording for this playlist kind.
  const batchViewedCount   = current - initialSnippetIndex;
  const shortPlaylistLabel = (playlistLabel || "").replace(/^[^\w]+/, "").trim() || "playlist";
  const batchBackLabel     = playlistKind === "surprise" ? "Back to Surprise" : "Back to Likes";

  function goNext() {
    setSheetOpen(false);
    if (loading) return;
    if (!isLast) {
      setSnippetDir("next");
      setCurrent(c => c + 1);
      window.scrollTo(0, 0);
      if (!playlistMode && onSnippetAdvance) onSnippetAdvance(lesson.lesson_id, current + 1);
      // Likes/Most Liked/Surprise Mix playlists pause with a checkpoint modal
      // every LIKES_BATCH_SIZE snippets *viewed this session* (relative to
      // wherever the playlist started, not the absolute array position),
      // even though the playlist isn't over yet.
      if (batchMode && (current - initialSnippetIndex + 1) % LIKES_BATCH_SIZE === 0) {
        window.scrollTo(0, 0);
        setDone(true);
      }
    } else {
      window.scrollTo(0, 0);
      setDone(true);
      if (!playlistMode && onComplete) onComplete(lesson.lesson_id, totalPoints, snippets.length);
    }
  }

  function goPrev() {
    setSheetOpen(false);
    if (loading || current === 0) return;
    setSnippetDir("prev");
    setCurrent(c => c - 1);
    window.scrollTo(0, 0);
    if (!playlistMode && onSnippetAdvance) onSnippetAdvance(lesson.lesson_id, current - 1);
  }

  async function toggleLike(snippetId) {
    if (!user || user.is_anonymous) return;
    const isLiked = liked.has(snippetId);
    track(isLiked ? "unlike" : "like", { contentType: "snippet", contentId: snippetId });

    // Optimistic update
    setLiked(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(snippetId) : next.add(snippetId);
      return next;
    });
    setLikeCounts(prev => ({
      ...prev,
      [snippetId]: Math.max(0, (prev[snippetId] || 0) + (isLiked ? -1 : 1)),
    }));

    // Persist to DB (fire-and-forget)
    if (isLiked) {
      deleteLike(user.id, snippetId).catch(e => console.log("Unlike failed:", e.message));
    } else {
      insertLike(
        user.id, snippetId,
        course?.course_id  || null,
        theme?.theme_id    || null,
        module?.module_id  || null,
        lesson?.lesson_id  || null,
      ).catch(e => console.log("Like failed:", e.message));
    }

    // Pairing: a snippet-linked quiz question mirrors this snippet's like state
    // (bidirectional pair; standalone questions and unpaired snippets are unaffected).
    getPairedContent("snippet", snippetId).then(pair => {
      if (!pair || pair.type !== "question") return;
      if (isLiked) {
        deleteGenericLike(user.id, "question", pair.id).catch(e => console.warn("deleteGenericLike (paired question):", e));
      } else {
        insertGenericLike(user.id, "question", pair.id).catch(e => console.warn("insertGenericLike (paired question):", e));
      }
    }).catch(e => console.warn("getPairedContent:", e));
  }

  async function openComments(snippetId) {
    setShowComments(true);
    setCommentsSnipId(snippetId);
    setCommentsLoading(true);
    setCommentsData([]);
    try {
      const data = await supabase(
        "snippet_comments",
        "?select=*&snippet_id=eq." + snippetId + "&order=created_at.asc"
      );
      setCommentsData(data || []);
    } catch (e) {
      console.log("Comments unavailable:", e.message);
      setCommentsData([]);
    }
    setCommentsLoading(false);
  }

  function closeComments() {
    setShowComments(false);
    setCommentsData([]);
    setCommentsSnipId(null);
    setCommentDraft("");
  }

  const canEdit = isAdmin || isCreator;

  function openEditPanel() {
    if (!snip) return;
    const t = translations[snip.snippet_id] || {};
    setEditSnipDraft({
      hook:             t.hook             || "",
      explanation:      t.explanation      || "",
      key_term:         t.key_term         || "",
      key_term_meaning: t.key_term_meaning || "",
      life_connection:  t.life_connection  || "",
      quiz_recap:       t.quiz_recap       || "",
      source_citation:  t.source_citation  || "",
      // Quiz question fields — populated by async fetch below
      question:         "",
      correct_option:   "",
      wrong_option_1:   "",
      wrong_option_2:   "",
      wrong_option_3:   "",
    });
    setEditMsg("");
    setShowEditPanel(true);
    // Async-fetch existing question for this snippet + language
    const langId = t.language || settings?.languageId || DEFAULT_LANG_ID;
    setEditQuestionLoading(true);
    getSnippetQuestion(snip.snippet_id, langId).then(({ data }) => {
      if (data) {
        setEditSnipDraft(prev => ({
          ...prev,
          question_id:    data.question_id    || null,
          question:       data.question       || "",
          correct_option: data.correct_option || "",
          wrong_option_1: data.wrong_option_1 || "",
          wrong_option_2: data.wrong_option_2 || "",
          wrong_option_3: data.wrong_option_3 || "",
        }));
      }
      setEditQuestionLoading(false);
    });
  }

  async function saveEditSnippet() {
    if (!snip || editSaving) return;
    setEditSaving(true);
    setEditMsg("");
    const t = translations[snip.snippet_id] || {};
    const langId = t.language || settings?.languageId || DEFAULT_LANG_ID;
    const payload = {
      snippet_id:       snip.snippet_id,
      language:         langId,
      hook:             editSnipDraft.hook,
      explanation:      editSnipDraft.explanation,
      key_term:         editSnipDraft.key_term,
      key_term_meaning: editSnipDraft.key_term_meaning,
      life_connection:  editSnipDraft.life_connection,
      quiz_recap:       editSnipDraft.quiz_recap,
      source_citation:  editSnipDraft.source_citation,
    };
    const { data, error } = await supabaseClient
      .from("snippet_translations")
      .upsert(payload, { onConflict: "snippet_id,language" })
      .select()
      .single();
    if (error) {
      setEditMsg("Save failed: " + error.message);
      setEditSaving(false);
      return;
    }
    // Update local translations state so the card re-renders immediately
    setTranslations(prev => ({ ...prev, [snip.snippet_id]: data }));

    // Save quiz question fields if at least the question text is filled
    const hasQuestion = !!(editSnipDraft.question && editSnipDraft.correct_option &&
      editSnipDraft.wrong_option_1 && editSnipDraft.wrong_option_2 && editSnipDraft.wrong_option_3);
    if (hasQuestion) {
      const { error: qErr } = await saveSnippetQuestion(snip.snippet_id, langId, {
        question_id:    editSnipDraft.question_id    || undefined,
        question:       editSnipDraft.question,
        correct_option: editSnipDraft.correct_option,
        wrong_option_1: editSnipDraft.wrong_option_1,
        wrong_option_2: editSnipDraft.wrong_option_2,
        wrong_option_3: editSnipDraft.wrong_option_3,
      });
      if (qErr) {
        setEditMsg("Translation saved, but question save failed: " + qErr.message);
        setEditSaving(false);
        return;
      }
    }

    setEditMsg("Saved!");
    setEditSaving(false);
    setTimeout(() => { setShowEditPanel(false); setEditMsg(""); }, 900);
  }

  async function postCommentHandler() {
    // Anonymous sessions cannot post — enforced server-side by RLS
    // (phase1_security_fixes.sql §3); this guard keeps the UI honest.
    if (!user || user.is_anonymous || !commentDraft.trim() || commentPosting) return;
    // Client-side profanity check (friendly message; DB trigger is the real gate)
    if (containsProfanity(commentDraft)) {
      setCommentError(PROFANITY_MESSAGE);
      return;
    }
    setCommentError("");
    setCommentPosting(true);
    const userName = profile?.display_name || user.email?.split("@")[0] || "Learner";
    const { data, error } = await postComment(user.id, commentsSnipId, commentDraft.trim(), userName);
    if (!error && data) {
      setCommentsData(prev => [data, ...prev]);
      setCommentCounts(prev => ({ ...prev, [commentsSnipId]: (prev[commentsSnipId] || 0) + 1 }));
      setCommentDraft("");
      setShowComments(false);
    } else if (error) {
      setCommentError(
        String(error.message || "").includes("COMMENT_BLOCKED")
          ? PROFANITY_MESSAGE
          : "Could not post your comment. Please try again."
      );
    }
    setCommentPosting(false);
  }

  async function reportCommentHandler(c) {
    if (!user || reportedIds.has(c.id)) return;
    setReportedIds(prev => new Set(prev).add(c.id));  // optimistic
    const { error } = await reportComment({
      commentId:  c.id,
      snippetId:  commentsSnipId,
      body:       c.body,
      authorName: c.user_name,
      authorId:   c.profile_id,
      reporterId: user.id,
    });
    // 23505 = already reported by this session — treat as success
    if (error && error.code !== "23505") {
      setReportedIds(prev => { const n = new Set(prev); n.delete(c.id); return n; });
    }
  }

  // ── View tracking (active reading time for recommendations) ───────────────────
  useViewTracking({
    userId:   user && !user.is_anonymous ? user.id : null,
    lessonId: !playlistMode ? lesson?.lesson_id : null,
    enabled:  !playlistMode,
  });

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (done) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "Escape") {
        if (sheetOpen)       { setSheetOpen(false); return; }
        if (showLangPicker)  { setShowLangPicker(false); return; }
        if (sharePopoverId)  { setSharePopoverId(null); return; }
        if (showComments)    { setShowComments(false); return; }
        if (showEditPanel)   { setShowEditPanel(false); return; }
        (playlistMode ? backToPlaylist : onBackToLessons)?.();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [current, total, done, loading, sheetOpen, showLangPicker, sharePopoverId, showComments, showEditPanel]);

  useEffect(() => {
    if (sheetOpen) { setSheetDragged(false); setSheetDragY(0); }
  }, [sheetOpen]);

  // ── Touch / Swipe handlers ──────────────────────────────────────────────────
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
      const atEnd   = isLast && dx < 0;
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
    else goPrev();
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
    if (dy > 90) setSheetOpen(false);
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
    if (sheetStartScroll.current <= 0 && dy > 90 && dy > Math.abs(dx) * 1.5) setSheetOpen(false);
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) setSheetOpen(false); // horizontal swipe closes
    setSheetDragY(0);
    onTouchEnd(e);
  }

  function showSigninToast(msg) {
    setSigninToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSigninToast(""), 2200);
  }

  // When the reveal sheet opens on mobile: push the hook block down just
  // enough to clear the floating action bar, then size the sheet + its dim
  // overlay to start right below the (now fully visible) hook — so the hook
  // is never covered or dimmed. Margin is set imperatively (no transition)
  // so the measurement right after it is exact, with no animation race.
  useLayoutEffect(() => {
    function layout() {
      if (!hookBlockRef.current) return;
      const isMobile = window.matchMedia("(max-width: 899px)").matches;
      if (sheetOpen && isMobile && floatBarRef.current) {
        const floatH = floatBarRef.current.getBoundingClientRect().height;
        const shift = Math.round(floatH) + 12;
        hookBlockRef.current.style.marginTop = shift + "px";
        // Sheet slides up to the bottom of the hook text, but is never shorter than 60% of the screen
        const hookEl = hookTextRef.current || hookBlockRef.current;
        const hookBottom = hookEl.getBoundingClientRect().bottom;
        const minTop = floatBarRef.current.getBoundingClientRect().bottom + 8;
        setSheetTopPx(Math.max(minTop, Math.min(hookBottom + 14, window.innerHeight * 0.40)));
      } else {
        hookBlockRef.current.style.marginTop = "";
        setSheetTopPx(null);
      }
    }
    layout();
    if (sheetOpen) {
      window.addEventListener("resize", layout);
      return () => window.removeEventListener("resize", layout);
    }
  }, [sheetOpen, current]);

  // Social strip — rendered on the card and at the bottom of the reveal sheet
  function renderSocialStrip() {
    const tap = () => { if (navigator.vibrate) navigator.vibrate(8); };
    return (
                <div className="snip-social">
                    <div className="snip-social-left">
                      <button
                        className={"snip-social-btn snip-like-btn" + (liked.has(snip.snippet_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                        onClick={e => { e.stopPropagation(); tap(); if (!user || user.is_anonymous) { showSigninToast(SIGNIN.likeTooltip); return; } toggleLike(snip.snippet_id); }}
                        title={!user || user.is_anonymous ? SIGNIN.likeTooltip : liked.has(snip.snippet_id) ? PLAYER.unlikeTooltip : "Like"}
                      >
                        <span className="snip-social-icon"><svg viewBox="0 0 24 24" fill={liked.has(snip.snippet_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
                        <span>{likeCounts[snip.snippet_id] || 0}</span>
                      </button>
                      <button
                        className={"snip-social-btn snip-bm-btn" + (bookmarks.has("snippet:" + snip.snippet_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                        title={!user || user.is_anonymous ? SIGNIN.bookmarkTooltip : bookmarks.has("snippet:" + snip.snippet_id) ? PLAYER.removeBookmark : PLAYER.addBookmark}
                        onClick={e => { e.stopPropagation(); tap(); if (!user || user.is_anonymous) { showSigninToast(SIGNIN.bookmarkTooltip); return; } if (onToggleBookmark) onToggleBookmark("snippet", String(snip.snippet_id), snip.hook || "Snippet"); }}
                      >
                        <span className="snip-social-icon"><svg viewBox="0 0 24 24" fill={bookmarks.has("snippet:" + snip.snippet_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span>
                      </button>
                    </div>
                    {total > 1 && <div className="snip-social-counter">{current + 1}/{total}</div>}
                    <div className="snip-social-right">
                      <button
                        className="snip-social-btn snip-comment-btn"
                        onClick={e => { e.stopPropagation(); tap(); openComments(snip.snippet_id); }}
                        title="Comments"
                      >
                        <span className="snip-social-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
                        <span>{commentCounts[snip.snippet_id] || 0}</span>
                      </button>
                      <button
                        className="snip-social-btn snip-share-btn"
                        title="Share this snippet" aria-label="Share this snippet"
                        onClick={e => { e.stopPropagation(); tap(); setSharePopoverId(snip.snippet_id); }}
                      >
                        <span className="snip-social-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                          </svg>
                        </span>
                      </button>
                      {canEdit && (
                        <button
                          className="snip-social-btn snip-edit-btn"
                          title="Edit snippet" aria-label="Edit snippet"
                          onClick={e => { e.stopPropagation(); openEditPanel(); }}
                        >
                          <span className="snip-social-icon"><i className="ti ti-pencil" /></span>
                        </button>
                      )}
                    </div>
                  </div>
    );
  }

  return (
    <>
      <style>{globalStyles + styles}</style>
      <div className="player-wrap">
        {signinToast && <div className="signin-toast">{signinToast}</div>}

        {/* Top bar */}
        <div className="player-top-bar">
          <button className="player-back" onClick={playlistMode ? backToPlaylist : onBackToLessons}>← Back</button>
          <div className="player-lesson-name">{playlistMode ? (playlistLabel || "♥ Likes Playlist") : lesson?.lesson_name}</div>
          <div className="player-nav-links">
            <button className="player-nav-link" onClick={onHome} title="Home"><i className="ti ti-home" /></button>
            <button className="player-nav-link" onClick={onDiscover} title="Discover"><i className="ti ti-search" /></button>
            <button className="player-nav-link" onClick={onDashboard} title="Dashboard"><i className="ti ti-chart-bar" /></button>
            <button className="player-nav-link" onClick={onLikes} title="Likes"><i className="ti ti-heart" /></button>
            <button className="player-nav-link" onClick={onBookmarks} title="Bookmarks"><i className="ti ti-bookmark" /></button>
          </div>
        </div>
        <div className="player-progress">
          <div className="player-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Body — swipe target */}
        <div
          className="player-body"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {loading ? (
            <div className="loading">Loading snippets…</div>
          ) : total === 0 ? (
            <div className="snip-card"><div className="snip-empty">No snippets available for this lesson yet.</div></div>
          ) : (
            <>
              {/* Floating action bar — shown while the reveal sheet is open (outside the card so
                  transforms/overflow on the card can never clip or misplace it) */}
              <div className={"snip-float-social" + (sheetOpen ? " open" : "")} ref={floatBarRef} onClick={e => e.stopPropagation()}>
                {renderSocialStrip()}
              </div>
              <div
                className={`snip-card snip-enter-${snippetDir}`}
                key={`${snip.snippet_id}-${snippetDir}`}
                style={{
                  ...(dragOffset !== 0 ? { transform: `translateX(${dragOffset}px)` } : {}),
                  transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
                }}
              >
                {/* Desktop: one row, two columns (left = hook+picture, right = explanation+key terms) */}
                <div className="snip-flow">
                {/* TOP BLOCK: hook + image cover — tap opens reveal sheet on mobile */}
                <div className="snip-top-block" ref={hookBlockRef} onClick={() => setSheetOpen(true)}>
                  <div className="snip-top-left" ref={hookTextRef}>
                    {trans.hook ? (
                      <div className="snip-hook fs-heading">{trans.hook}</div>
                    ) : !trans.explanation ? (
                      <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb", fontSize: 15 }}>
                        Content for this snippet is coming soon.
                      </div>
                    ) : null}
                  </div>
                  <div className="snip-top-right">
                    {asset ? (
                      <div className="snip-img">
                        <img
                          src={asset.file_path}
                          alt={asset.alt_text || ""}
                          onError={e => { e.target.style.display = "none"; }}
                        />
                        {trans.language && (
                          <button className="snip-lang-badge" onClick={e => { e.stopPropagation(); setShowLangPicker(true); }} title="Change language"><i className="ti ti-language" aria-hidden="true" />{langName}</button>
                        )}
                        {snip.difficulty_level && (
                          <div className="snip-diff">{DIFFICULTY_STARS[snip.difficulty_level]}</div>
                        )}
                      </div>
                    ) : (
                      <div className="snip-header-band">
                        <div className="snip-header-ornament">&#127963;</div>
                        {trans.language && (
                          <button className="snip-lang-badge" onClick={e => { e.stopPropagation(); setShowLangPicker(true); }} title="Change language"><i className="ti ti-language" aria-hidden="true" />{langName}</button>
                        )}
                        {snip.difficulty_level && (
                          <div className="snip-diff">{DIFFICULTY_STARS[snip.difficulty_level]}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM BLOCK: explanation + citation left | key term, life, refresher right */}
                {(trans.explanation || trans.key_term || trans.life_connection || trans.quiz_recap || trans.source_citation) && (
                  <div className="snip-bottom-block">
                    <div className="snip-bottom-left">
                      {trans.explanation && <div className="snip-explanation fs-body">{trans.explanation}</div>}
                      {trans.source_citation && <div className="snip-citation">{trans.source_citation}</div>}
                    </div>
                    {(trans.key_term || trans.life_connection || trans.quiz_recap) && (
                      <div className="snip-bottom-right">
                        {trans.key_term && (
                          <div className="snip-key-term">
                            <div className="snip-kt-label">Key Term</div>
                            <div className="snip-kt-word fs-body">{trans.key_term}</div>
                            {trans.key_term_meaning && <div className="snip-kt-meaning fs-body">{trans.key_term_meaning}</div>}
                          </div>
                        )}
                        {trans.life_connection && (
                          <div className="snip-life">
                            <div className="snip-life-label">Life Connection</div>
                            <div className="snip-life-text fs-body">{trans.life_connection}</div>
                          </div>
                        )}
                        {trans.quiz_recap && (
                          <div className="snip-quiz">
                            <div className="snip-quiz-label">Refresher Questions</div>
                            <div className="snip-quiz-text fs-body">{trans.quiz_recap}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </div>

                {/* Tap-to-read hint — mobile only, CSS hidden on desktop */}
                <div className="snip-tap-hint" onClick={() => setSheetOpen(true)}>
                  <i className="ti ti-chevrons-up" style={{fontSize:'0.9rem'}} /> Tap to read
                </div>

                {/* Social strip — full width, outside the grid */}
                {renderSocialStrip()}
              </div>

              {/* Swipe hint — only on mobile, fades after first swipe */}
              {total > 1 && current === firstViewedRef.current && (
                <div className="swipe-hint">
                  <span>← swipe to navigate →</span>
                </div>
              )}

              {/* ── Reveal sheet — mobile tap-to-read (CSS hidden on desktop) ── */}
              {sheetOpen && (
                <>
                  <div
                    className="reveal-overlay"
                    onClick={() => setSheetOpen(false)}
                  />
                  <div
                    className="reveal-sheet"
                    style={{
                      ...(sheetDragged ? { animation: "none" } : {}),
                      ...(sheetTopPx != null ? { top: sheetTopPx, maxHeight: "none", minHeight: 0 } : {}),
                      transform: `translateY(${sheetDragY}px)`,
                      transition: sheetDragY ? "none" : "transform 0.25s ease",
                    }}
                    onTouchStart={e => { e.stopPropagation(); onSheetTouchStart(e); }}
                    onTouchMove={e => { e.stopPropagation(); onSheetTouchMove(e); }}
                    onTouchEnd={e => { e.stopPropagation(); onSheetTouchEnd(e); }}
                    onClick={e => { if (e.target.closest("button, a, input, textarea")) return; setSheetOpen(false); }}
                  >
                    <div
                      className="reveal-sheet-grab"
                      onTouchStart={e => { e.stopPropagation(); onSheetGrabStart(e); }}
                      onTouchMove={e => { e.stopPropagation(); onSheetGrabMove(e); }}
                      onTouchEnd={e => { e.stopPropagation(); onSheetGrabEnd(e); }}
                    >
                      <div className="reveal-sheet-handle" />
                      <button className="reveal-sheet-close" aria-label="Close" onClick={() => setSheetOpen(false)}><i className="ti ti-x" /></button>
                    </div>
                    <div className="reveal-sheet-body sheet-body-noHead" ref={sheetBodyRef}>
                      {trans.explanation && <div className="snip-explanation fs-body">{trans.explanation}</div>}
                      {trans.source_citation && <div className="snip-citation">{trans.source_citation}</div>}
                      {(trans.key_term || trans.life_connection || trans.quiz_recap) && (
                        <div style={{display:'flex', flexDirection:'column', gap:'12px', marginTop: trans.explanation ? '16px' : '0'}}>
                          {trans.key_term && (
                            <div className="snip-key-term">
                              <div className="snip-kt-label">Key Term</div>
                              <div className="snip-kt-word fs-body">{trans.key_term}</div>
                              {trans.key_term_meaning && <div className="snip-kt-meaning fs-body">{trans.key_term_meaning}</div>}
                            </div>
                          )}
                          {trans.life_connection && (
                            <div className="snip-life">
                              <div className="snip-life-label">Life Connection</div>
                              <div className="snip-life-text fs-body">{trans.life_connection}</div>
                            </div>
                          )}
                          {trans.quiz_recap && (
                            <div className="snip-quiz">
                              <div className="snip-quiz-label">Refresher Questions</div>
                              <div className="snip-quiz-text fs-body">{trans.quiz_recap}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>


        {/* Bottom nav */}
        {!loading && total > 0 && (
          <div className={"player-nav" + (sheetOpen ? " nav-under-sheet" : "")}>
            <button className="pnav-btn pnav-prev" onClick={goPrev} disabled={current === 0}>← Prev</button>
            <button className={"pnav-btn " + (isLast ? "pnav-finish" : "pnav-next")} onClick={goNext}>
              {isLast ? "Finish ✓" : "Next →"}
            </button>
          </div>
        )}

        {/* Language picker */}
        {showLangPicker && (
          <div className="lang-picker-overlay" onClick={() => setShowLangPicker(false)}>
            <div className="lang-picker-card" onClick={e => e.stopPropagation()}>
              <div className="lang-picker-title">Reading language</div>
              <div className="lang-picker-sub">Snippets will load in your chosen language where available.</div>
              <div className="lang-picker-list">
                {languages.map(l => {
                  const isActive = settings?.languageId === l.language_id;
                  return (
                    <button
                      key={l.language_id}
                      className={"lang-picker-opt" + (isActive ? " active" : "")}
                      onClick={() => {
                        onSaveSettings && onSaveSettings({
                          ...settings,
                          languageId: l.language_id,
                          languageCode: l.language_code,
                          languageName: l.language,
                        });
                        setShowLangPicker(false);
                      }}
                    >
                      {l.language}
                      {isActive && <span className="lang-picker-checkmark">✓</span>}
                    </button>
                  );
                })}
              </div>
              <button className="lang-picker-cancel" onClick={() => setShowLangPicker(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Share popover */}
        {sharePopoverId && (() => {
          const shareSnip = snippets.find(s => s.snippet_id === sharePopoverId);
          const trans = shareSnip ? (translations[shareSnip.snippet_id] || {}) : {};
          const hook = trans.hook || shareSnip?.hook || "";
          // Deep link to the lesson this snippet belongs to (opens it from the start);
          // falls back to the site root when the lesson is unknown.
          const shareLessonId = lesson?.lesson_id ?? shareSnip?.lesson_id;
          const shareUrl = shareLessonId ? `${APP_URL}/#/lesson/${encodeURIComponent(shareLessonId)}` : APP_URL;
          // The saved message usually contains the site URL — point it at the deep link instead of repeating it.
          const msg = snippetShareMsg.split(APP_URL).join(shareUrl);
          return (
            <SharePopover
              open
              onClose={() => setSharePopoverId(null)}
              title="Share Snippet"
              subtitle={hook}
              text={(hook ? hook + "\n\n" : "") + msg}
              url={shareUrl}
              contentType="snippet"
              contentId={sharePopoverId}
            />
          );
        })()}

        {/* Comments sheet */}
        {showComments && (
          <div className="comments-overlay" onClick={closeComments}>
            <div className="comments-sheet" onClick={e => e.stopPropagation()}>
              <div className="comments-header">
                <div className="comments-title">Comments {commentsData.length > 0 && <span className="comments-count">({commentsData.length})</span>}</div>
                <button className="comments-close" onClick={closeComments}>&#x2715;</button>
              </div>
              <div className="comments-body">
                {commentsLoading ? (
                  <div className="comments-empty">Loading&#8230;</div>
                ) : commentsData.length === 0 ? (
                  <div className="comments-empty">No comments yet. Be the first!</div>
                ) : (
                  commentsData.map((c, i) => (
                    <div className="comment-row" key={c.id || i}>
                      <div className="comment-avatar">&#128100;</div>
                      <div className="comment-content">
                        <div className="comment-author-row">
                          {/* First name only — R1: don't broadcast children's full names */}
                          <span className="comment-author">{(c.user_name || "Learner").trim().split(/\s+/)[0]}</span>
                          <span className="comment-actions">
                            {user && c.profile_id !== user.id && (
                              <button
                                className={"comment-report-btn" + (reportedIds.has(c.id) ? " reported" : "")}
                                title={reportedIds.has(c.id) ? "Reported — thank you" : "Report comment"}
                                disabled={reportedIds.has(c.id)}
                                onClick={() => reportCommentHandler(c)}
                              >{reportedIds.has(c.id) ? "✓" : "⚑"}</button>
                            )}
                            {user && c.profile_id === user.id && editingCommentId !== c.id && (
                              <button className="comment-edit-btn" title="Edit comment" onClick={() => { setEditingCommentId(c.id); setEditDraft(c.body); }}>✏</button>
                            )}
                            {user && (c.profile_id === user.id || isAdmin) && (
                              <button className="comment-delete-btn" title="Delete comment" onClick={async () => {
                                const fn = isAdmin && c.profile_id !== user.id ? adminDeleteComment : deleteComment;
                                await fn(c.id);
                                setCommentsData(prev => prev.filter(x => x.id !== c.id));
                                setCommentCounts(prev => ({ ...prev, [commentsSnipId]: Math.max(0, (prev[commentsSnipId] || 1) - 1) }));
                                if (editingCommentId === c.id) setEditingCommentId(null);
                              }}>&#x2715;</button>
                            )}
                          </span>
                        </div>
                        {editingCommentId === c.id ? (
                          <div className="comment-edit-form">
                            <textarea
                              className="comment-input"
                              maxLength={500}
                              rows={2}
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              autoFocus
                            />
                            <div className="comment-edit-actions">
                              <span className="comment-char-count">{editDraft.length}/500</span>
                              <button className="comment-edit-cancel-btn" onClick={() => setEditingCommentId(null)}>Cancel</button>
                              <button
                                className="comment-post-btn"
                                style={{ padding: "5px 14px", fontSize: "0.875rem" }}
                                disabled={!editDraft.trim() || editDraft.trim() === c.body}
                                onClick={async () => {
                                  if (containsProfanity(editDraft)) {
                                    setCommentError(PROFANITY_MESSAGE);
                                    setEditingCommentId(null);
                                    return;
                                  }
                                  const { data, error } = await editComment(c.id, editDraft.trim());
                                  if (!error && data) {
                                    setCommentsData(prev => prev.map(x => x.id === c.id ? { ...x, body: data.body } : x));
                                  } else if (error && String(error.message || "").includes("COMMENT_BLOCKED")) {
                                    setCommentError(PROFANITY_MESSAGE);
                                  }
                                  setEditingCommentId(null);
                                }}
                              >Save</button>
                            </div>
                          </div>
                        ) : (
                          <div className="comment-text">{c.body}</div>
                        )}
                        <div className="comment-time">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Comment input footer */}
              <div className="comments-footer">
                {user && !user.is_anonymous ? (
                  <>
                    <textarea
                      className="comment-input"
                      placeholder="Add a comment…"
                      maxLength={500}
                      rows={2}
                      value={commentDraft}
                      onChange={e => { setCommentDraft(e.target.value); if (commentError) setCommentError(""); }}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postCommentHandler(); } }}
                    />
                    {commentError && <div className="comment-error">{commentError}</div>}
                    <div className="comment-footer-row">
                      <span className="comment-char-count">{commentDraft.length}/500</span>
                      <button
                        className="comment-post-btn"
                        onClick={postCommentHandler}
                        disabled={!commentDraft.trim() || commentPosting}
                      >{commentPosting ? "Posting…" : "Post"}</button>
                    </div>
                  </>
                ) : (
                  <div className="comments-signin">
                    <div className="comments-signin-text">Sign in with an account to comment</div>
                    <button className="comments-signin-btn" onClick={() => { closeComments(); onSignIn?.(); }}>Sign in</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inline snippet edit panel */}
        {showEditPanel && canEdit && snip && (
          <div className="edit-panel-overlay" onClick={() => setShowEditPanel(false)}>
            <div className="edit-panel-sheet" onClick={e => e.stopPropagation()}>
              <div className="edit-panel-header">
                <div className="edit-panel-title">Edit Snippet</div>
                <button className="edit-panel-close" onClick={() => setShowEditPanel(false)}>&#x2715;</button>
              </div>
              <div className="edit-panel-body">
                {[
                  { key: "hook",             label: "Hook (headline)",      rows: 2 },
                  { key: "explanation",      label: "Explanation",          rows: 5 },
                  { key: "key_term",         label: "Key Term",             rows: 1 },
                  { key: "key_term_meaning", label: "Key Term Meaning",     rows: 2 },
                  { key: "life_connection",  label: "Life Connection",      rows: 3 },
                  { key: "quiz_recap",       label: "Refresher Questions",  rows: 3 },
                  { key: "source_citation",  label: "Source / Citation",    rows: 1 },
                ].map(({ key, label, rows }) => (
                  <div className="edit-field-group" key={key}>
                    <label className="edit-field-label">{label}</label>
                    <textarea
                      className="edit-field-input"
                      rows={rows}
                      value={editSnipDraft[key] || ""}
                      onChange={e => setEditSnipDraft(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}

                {/* Quiz Question section */}
                <div style={{ borderTop: "1px solid var(--color-border)", margin: "18px 0 14px" }} />
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: HERITAGE, marginBottom: 12 }}>
                  Quiz Question <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--color-text-muted)" }}>— optional</span>
                </div>
                {editQuestionLoading ? (
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", padding: "8px 0" }}>Loading question…</div>
                ) : (
                  <>
                    {[
                      { key: "question",       label: "Question",        rows: 2 },
                      { key: "correct_option", label: "Correct Option",  rows: 1 },
                      { key: "wrong_option_1", label: "Wrong Option 1",  rows: 1 },
                      { key: "wrong_option_2", label: "Wrong Option 2",  rows: 1 },
                      { key: "wrong_option_3", label: "Wrong Option 3",  rows: 1 },
                    ].map(({ key, label, rows }) => (
                      <div className="edit-field-group" key={key}>
                        <label className="edit-field-label" style={{ color: key === "correct_option" ? "var(--color-secondary)" : undefined }}>
                          {label}
                        </label>
                        <textarea
                          className="edit-field-input"
                          rows={rows}
                          value={editSnipDraft[key] || ""}
                          onChange={e => setEditSnipDraft(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: -8, marginBottom: 8 }}>
                      All five question fields must be filled to save the question.
                    </div>
                  </>
                )}
              </div>
              <div className="edit-panel-footer">
                {editMsg && <span className={"edit-panel-msg" + (editMsg.startsWith("Save failed") ? " err" : "")}>{editMsg}</span>}
                <button className="edit-cancel-btn" onClick={() => setShowEditPanel(false)}>Cancel</button>
                <button className="edit-save-btn" onClick={saveEditSnippet} disabled={editSaving}>
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Completion modal */}
        {done && (
          <div className="completion-overlay">
            <div className="completion-card">
              {playlistMode ? (
                batchMode && !isLast ? (
                  <>
                    <div className="comp-emoji">{playlistKind === "surprise" ? "\u{1F3B2}" : "\u2665"}</div>
                    <div className="comp-title">Great progress!</div>
                    <div className="comp-subtitle">You've read <strong>{batchViewedCount}</strong> of <strong>{snippets.length}</strong> snippets in <strong>{playlistLabel || "this playlist"}</strong>.</div>
                    <button className="comp-btn comp-primary" onClick={backToPlaylist}>{batchBackLabel}</button>
                    <button className="comp-btn comp-secondary" onClick={() => setDone(false)}>Continue Reading {shortPlaylistLabel}</button>
                    <button className="comp-btn comp-dashboard" onClick={onDashboard}>Go to Dashboard</button>
                  </>
                ) : (
                  <>
                    <div className="comp-emoji">{playlistKind === "discover" ? "\u{1F9ED}" : playlistKind === "surprise" ? "\u{1F3B2}" : "\u2665"}</div>
                    <div className="comp-title">{playlistKind === "discover" ? PLAYER.discoverComplete : playlistKind === "surprise" ? PLAYER.surpriseComplete : PLAYER.likesComplete}</div>
                    <div className="comp-subtitle">You've reviewed all <strong>{snippets.length}</strong> snippet{snippets.length !== 1 ? "s" : ""} in <strong>{playlistLabel || "this playlist"}</strong>.</div>
                    <button className="comp-btn comp-primary" onClick={backToPlaylist}>{playlistKind === "discover" ? "Back to Discover" : playlistKind === "surprise" ? "Back to Surprise" : "Back to Likes"}</button>
                    <button className="comp-btn comp-secondary" onClick={() => { setCurrent(0); setDone(false); }}>Review Again</button>
                    <button className="comp-btn comp-dashboard" onClick={onDashboard}>Go to Dashboard</button>
                  </>
                )
              ) : (
                <>
                  <div className="comp-emoji">🎉</div>
                  <div className="comp-title">Lesson Complete!</div>
                  <div className="comp-subtitle">You've finished <strong>{lesson?.lesson_name}</strong>.</div>

                  {showRewards && (
                    <div className="comp-points">
                      <span className="comp-points-icon">🪙</span>
                      <span className="comp-points-value">+{totalPoints}</span>
                      <span className="comp-points-label">{PLAYER.dharmaPoints}</span>
                    </div>
                  )}

                  {earnedBadges.length > 0 && (
                    <div className="comp-badges">
                      <div className="comp-badges-title">Badges Earned</div>
                      {earnedBadges.map((b, i) => {
                        const meta = BADGE_META[b.type] || { emoji: "🏅", label: b.type };
                        return (
                          <div className="comp-badge-row" key={i}>
                            <span className="comp-badge-emoji">{meta.emoji}</span>
                            <span className="comp-badge-text"><strong>{meta.label}</strong> — {b.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {nextLesson && (
                    <button className="comp-btn comp-next" onClick={() => onNextLesson(nextLesson)}>
                      Next: {nextLesson.lesson_name} →
                    </button>
                  )}
                  {lessonQuiz && onTakeQuiz && (
                    <button className="comp-btn comp-quiz" onClick={onTakeQuiz}>
                      🎯 Take the Quiz
                    </button>
                  )}
                  <button className="comp-btn comp-primary" onClick={onBackToLessons}>{backToLessonsLabel}</button>
                  <button className="comp-btn comp-dashboard" onClick={onDashboard}>Go to Dashboard</button>
                  <button className="comp-btn comp-secondary" onClick={() => { setCurrent(0); setDone(false); }}>Review Again</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
