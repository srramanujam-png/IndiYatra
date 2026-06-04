import { useState, useEffect, useRef } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, DEFAULT_LANG_ID, DIFFICULTY_STARS } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { supabaseClient, loadUserLikes, insertLike, deleteLike, postComment, deleteComment, adminDeleteComment, editComment, getSnippetQuestion, saveSnippetQuestion } from "../lib/auth";
import { globalStyles } from "../styles/global";
import { DEFAULT_SNIPPET_SHARE_MSG, APP_URL, PLAYER, SIGNIN } from "../config/appStrings";

const BLUE = "#00509E";

const BADGE_META = {
  lesson: { emoji: "📖", label: "Lesson" },
  module: { emoji: "📚", label: "Module" },
  theme:  { emoji: "🏛️", label: "Theme" },
  level:  { emoji: "🎓", label: "Level" },
  course: { emoji: "🏆", label: "Course" },
};

const styles = `
  .player-wrap { min-height: 100vh; background: #FFFFFF; display: flex; flex-direction: column; }

  .player-top-bar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid #E5E7EB;
    padding: 0 1.5rem; height: 54px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .player-back {
    display: flex; align-items: center; gap: 5px; background: none; border: none;
    cursor: pointer; font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem;
    font-weight: 500; color: #4A5565; transition: color 0.2s; flex-shrink: 0;
  }
  .player-back:hover { color: ${SAFFRON}; }
  .player-lesson-name {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1rem; font-weight: 500;
    color: ${HERITAGE}; flex: 1; text-align: center;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .player-count { font-size: 0.8125rem; color: #4A5565; font-weight: 500; flex-shrink: 0; font-family: 'Inter', system-ui, sans-serif; }
  .player-nav-links { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
  .player-nav-link {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 8px;
    background: none; border: none; cursor: pointer;
    font-size: 1.125rem; color: #4A5565; transition: background 0.12s, color 0.15s;
  }
  .player-nav-link:hover { background: #F3F4F6; color: ${SAFFRON}; }
  .player-progress { height: 3px; background: #F3F4F6; }
  .player-progress-fill { height: 100%; background: ${SAFFRON}; transition: width 0.4s ease; }

  .player-body {
    flex: 1; max-width: 680px; width: 100%; margin: 0 auto;
    padding: 20px 1rem 120px;
    touch-action: pan-y;
    user-select: none;
  }
  @media (min-width: 900px) {
    .player-body { max-width: 1120px; }
  }

  /* Card */
  .snip-card {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    overflow: hidden;
  }

  /* ── Desktop two-column layout ── */
  .snip-2col { display: block; }
  /* Mobile: hook needs padding since it's no longer inside snip-body */
  .snip-left-col .snip-hook { padding: 16px 20px 12px; }
  @media (min-width: 900px) {
    .snip-2col { display: grid; grid-template-columns: 42% 58%; }
    .snip-left-col {
      border-right: 1px solid #E5E7EB;
      display: flex; flex-direction: column;
    }
    .snip-left-col .snip-img {
      border-radius: 0; flex-shrink: 0;
      max-height: 400px; justify-content: center; background: white;
    }
    .snip-left-col .snip-img img {
      width: auto; max-width: 100%; max-height: 400px; object-fit: contain;
      -webkit-mask-image: none; mask-image: none;
    }
    .snip-left-col .snip-header-band { border-radius: 0; flex-shrink: 0; }
    .snip-left-col .snip-hook {
      padding: 20px 24px 16px; border-bottom: 1px solid #E5E7EB; border-top: none;
    }
    .snip-right-col { padding: 20px 24px 16px; }
  }
  @keyframes snippetFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .snip-enter-next { animation: snippetFadeIn 0.2s ease both; }
  .snip-enter-prev { animation: snippetFadeIn 0.2s ease both; }

  @keyframes swipeFadeOut {
    0%   { opacity: 0.4; }
    75%  { opacity: 0.4; }
    100% { opacity: 0; }
  }
  .swipe-hint {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin-top: 12px; font-size: 0.75rem; color: #4A5565;
    pointer-events: none; font-family: 'Inter', system-ui, sans-serif;
    animation: swipeFadeOut 3.5s ease forwards;
  }

  /* Image */
  .snip-img {
    position: relative; width: 100%;
    background: transparent;
    display: flex; align-items: center; justify-content: center;
    max-height: 340px; border-radius: 10px 10px 0 0; overflow: hidden;
  }
  .snip-img img {
    display: block; width: 100%; max-height: 340px; object-fit: contain;
    -webkit-mask-image: linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%);
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
    overflow: hidden; border-radius: 10px 10px 0 0;
  }
  .snip-header-ornament {
    font-size: 4.5rem; opacity: 0.15; user-select: none; pointer-events: none;
  }
  .snip-lang-badge {
    position: absolute; top: 10px; left: 10px;
    background: rgba(0,0,0,0.45); color: white; border-radius: 999px;
    padding: 3px 10px; font-size: 0.6875rem; font-weight: 500; letter-spacing: 0.04em;
    text-transform: capitalize; font-family: 'Inter', system-ui, sans-serif;
  }

  /* Body */
  .snip-body { padding: 20px 24px 16px; }
  .snip-hook {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.625rem; font-weight: 500;
    color: ${HERITAGE}; line-height: 1.3; margin-bottom: 16px;
    letter-spacing: 0.01em; text-align: left;
  }
  .snip-explanation {
    font-size: 1rem; color: #4A5565; line-height: 1.85; margin-bottom: 20px;
    text-align: justify; font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .snip-divider { height: 1px; background: #E5E7EB; margin: 20px 0; }

  .snip-key-term {
    background: white; border-left: 3px solid ${SAFFRON};
    border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-kt-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif; }
  .snip-kt-word  { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem; font-weight: 500; color: ${HERITAGE}; margin-bottom: 4px; }
  .snip-kt-meaning { font-size: 1rem; color: #4A5565; line-height: 1.6; font-family: 'Nunito Sans', system-ui, sans-serif; }

  .snip-life {
    background: #F0FAF4; border-left: 4px solid ${GREEN};
    border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-life-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${GREEN}; margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif; }
  .snip-life-text  { font-size: 1rem; color: #2a4a2a; line-height: 1.7; font-family: 'Nunito Sans', system-ui, sans-serif; }

  .snip-quiz {
    background: #EEF5FF; border-left: 4px solid ${BLUE};
    border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-quiz-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${BLUE}; margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif; }
  .snip-quiz-text  { font-size: 1rem; color: #1a2a4a; line-height: 1.7; font-family: 'Nunito Sans', system-ui, sans-serif; }

  .snip-citation { font-size: 0.75rem; color: #4A5565; font-style: italic; text-align: right; margin-top: 8px; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .snip-empty    { text-align: center; padding: 48px 24px; font-family: 'Oswald', sans-serif; font-size: 1.25rem; color: #4A5565; }

  /* Bottom nav */
  .player-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
    background: #FFFFFF; border-top: 1px solid #E5E7EB; padding: 12px 1.5rem;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .pnav-btn {
    display: flex; align-items: center; gap: 6px; border-radius: 12px; padding: 10px 20px;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .pnav-prev { border-color: #E5E7EB; background: white; color: #4A5565; }
  .pnav-prev:hover:not(:disabled) { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .pnav-prev:disabled { opacity: 0.3; cursor: not-allowed; }
  .pnav-next   { background: ${SAFFRON}; color: white; border-color: ${SAFFRON}; }
  .pnav-next:hover { opacity: 0.9; transform: translateY(-1px); }
  .pnav-finish { background: ${GREEN}; color: white; border-color: ${GREEN}; }
  .pnav-finish:hover { opacity: 0.9; transform: translateY(-1px); }

  .pnav-dots { display: flex; gap: 6px; align-items: center; }
  .pnav-dot  { width: 8px; height: 8px; border-radius: 50%; background: #E5E7EB; transition: all 0.25s; cursor: pointer; }
  .pnav-dot:hover { background: ${SAFFRON}88; }
  .pnav-dot.active { background: ${SAFFRON}; transform: scale(1.35); }
  .pnav-dot.done   { background: ${GREEN}; }

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
  .comp-emoji    { font-size: 3rem; margin-bottom: 12px; }
  .comp-title    { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.75rem; font-weight: 500; color: ${HERITAGE}; margin-bottom: 6px; }
  .comp-subtitle { font-size: 0.9375rem; color: #4A5565; margin-bottom: 16px; line-height: 1.6; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comp-points {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: white; border: 1px solid ${SAFFRON}44; border-radius: 12px;
    padding: 12px 20px; margin-bottom: 16px;
  }
  .comp-points-icon  { font-size: 1.375rem; }
  .comp-points-value { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 2rem; font-weight: 700; color: ${SAFFRON}; line-height: 1; }
  .comp-points-label { font-size: 0.875rem; font-weight: 500; color: #b86000; font-family: 'Inter', system-ui, sans-serif; }
  .comp-badges {
    background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 12px 16px; margin-bottom: 16px; text-align: left;
  }
  .comp-badges-title { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${HERITAGE}; margin-bottom: 10px; font-family: 'Inter', system-ui, sans-serif; }
  .comp-badge-row { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
  .comp-badge-row:last-child { margin-bottom: 0; }
  .comp-badge-emoji { font-size: 1.25rem; flex-shrink: 0; }
  .comp-badge-text  { font-size: 0.9375rem; color: #101828; line-height: 1.3; font-family: 'Nunito Sans', system-ui, sans-serif; }
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
  .comp-quiz { background: #00509E; color: white; border-color: #00509E; }
  .comp-quiz:hover { background: #003E7E; border-color: #003E7E; opacity: 1; transform: translateY(-1px); }
  .comp-dashboard { background: white; color: ${HERITAGE}; border: 1px solid #E5E7EB !important; }
  .comp-dashboard:hover { background: #F3F4F6; }
  .comp-secondary { background: #F3F4F6; color: #4A5565; font-size: 0.8125rem; }
  .comp-secondary:hover { background: #E5E7EB; }

  /* Social strip */
  .snip-social {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 24px 6px; border-top: 1px solid #E5E7EB; margin-top: 16px; gap: 8px;
  }
  .snip-social-left  { display: flex; align-items: center; gap: 10px; }
  .snip-social-right { display: flex; align-items: center; gap: 14px; }
  .snip-social-btn {
    display: flex; align-items: center; gap: 6px;
    background: none; border: none; padding: 6px 0;
    font-size: 0.9375rem; color: #4A5565; transition: color 0.2s;
    font-family: 'Inter', system-ui, sans-serif; font-weight: 500;
  }
  .snip-like-btn          { cursor: pointer; }
  .snip-like-btn:hover    { color: #FF8E00; }
  .snip-like-btn.active   { color: #FF8E00; }
  .snip-like-btn.disabled { cursor: not-allowed; opacity: 0.5; }
  .snip-bm-btn         { cursor: pointer; }
  .snip-bm-btn:hover   { color: #FF8E00; }
  .snip-bm-btn.active  { color: #FF8E00; background: #FF8E0018; border-radius: 8px; }
  .snip-bm-btn.disabled { cursor: not-allowed; opacity: 0.5; }
  .snip-comment-btn  { cursor: pointer; }
  .snip-comment-btn:hover { color: #FF8E00; }
  .snip-share-btn    { cursor: pointer; }
  .snip-share-btn:hover { color: #FF8E00; }
  .snip-social-icon  { font-size: 1.125rem; line-height: 1; display: flex; align-items: center; }
  @media (min-width: 900px) {
    .snip-social-icon { font-size: 1.375rem; }
  }
  .snip-social-sep   { color: #E5E7EB; font-size: 1rem; }

  /* Share popover */
  .share-popover-overlay {
    position: fixed; inset: 0; z-index: 160;
    background: rgba(0,0,0,0.35); backdrop-filter: blur(2px);
    display: flex; align-items: flex-end;
    animation: fadeIn 0.15s ease;
  }
  .share-popover {
    background: white; border-radius: 16px 16px 0 0; width: 100%;
    padding: 20px 24px 32px;
    animation: slideUp 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.10);
  }
  .share-popover-handle {
    width: 40px; height: 4px; background: #E5E7EB; border-radius: 2px;
    margin: 0 auto 16px;
  }
  .share-popover-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.125rem; font-weight: 500;
    color: #101828; margin-bottom: 6px;
  }
  .share-popover-hook {
    font-size: 0.875rem; color: #4A5565; margin-bottom: 18px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .share-popover-btns { display: flex; flex-direction: column; gap: 10px; }
  .share-pop-btn {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 18px; border-radius: 12px; border: 1px solid;
    background: white; cursor: pointer; font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.9375rem; font-weight: 500;
    transition: opacity 0.15s; text-decoration: none;
    min-height: 48px;
  }
  .share-pop-btn:hover { opacity: 0.82; }
  .share-pop-btn-wa   { border-color: #25D366; color: #25D366; }
  .share-pop-btn-tw   { border-color: #101828; color: #101828; }
  .share-pop-btn-copy { border-color: #00509E; color: #00509E; }
  .share-pop-btn-copy.copied { border-color: #00924A; color: #00924A; }
  .share-pop-cancel {
    margin-top: 8px; padding: 12px; border-radius: 12px; border: none;
    background: #F3F4F6; color: #4A5565; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.9375rem; font-weight: 500;
    width: 100%; transition: background 0.15s; min-height: 44px;
  }
  .share-pop-cancel:hover { background: #E5E7EB; }

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
    padding: 16px 20px; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;
  }
  .comments-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.125rem; font-weight: 500; color: #101828;
  }
  .comments-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.25rem; color: #4A5565; padding: 4px; line-height: 1;
  }
  .comments-close:hover { color: #101828; }
  .comments-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
  .comments-empty { text-align: center; padding: 32px; color: #4A5565; font-size: 0.9375rem; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comments-signin { text-align: center; padding: 16px 0 8px; }
  .comments-signin-text { font-size: 0.9375rem; color: #4A5565; margin-bottom: 10px; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comments-signin-btn {
    display: inline-block; padding: 10px 24px; border-radius: 12px;
    background: #FF8E00; color: white; border: none;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    opacity: 0.4; cursor: not-allowed;
  }
  .comment-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .comment-avatar {
    width: 32px; height: 32px; border-radius: 50%; background: #F3F4F6;
    flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.875rem;
  }
  .comment-content { flex: 1; }
  .comment-author { font-size: 0.8125rem; font-weight: 700; color: #101828; margin-bottom: 2px; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comment-text { font-size: 0.9375rem; color: #4A5565; line-height: 1.6; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .comment-time { font-size: 0.6875rem; color: #4A5565; margin-top: 3px; font-family: 'Inter', system-ui, sans-serif; }
  .comment-author-row { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
  .comment-actions { display: flex; align-items: center; gap: 2px; margin-left: 4px; }
  .comment-delete-btn { background: none; border: none; cursor: pointer; color: #E5E7EB; font-size: 0.75rem; padding: 0 2px; line-height: 1; }
  .comment-delete-btn:hover { color: #e55; }
  .comment-edit-btn { background: none; border: none; cursor: pointer; color: #E5E7EB; font-size: 0.75rem; padding: 0 2px; line-height: 1; }
  .comment-edit-btn:hover { color: #FF8E00; }
  .comment-edit-form { margin-top: 4px; }
  .comment-edit-actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
  .comment-edit-cancel-btn { background: none; border: 1px solid #E5E7EB; border-radius: 8px; padding: 4px 12px; font-size: 0.875rem; cursor: pointer; color: #4A5565; font-family: 'Inter', system-ui, sans-serif; }
  .comment-edit-cancel-btn:hover { background: #F3F4F6; }
  .comments-count { font-size: 0.875rem; color: #4A5565; font-weight: 400; font-family: 'Inter', system-ui, sans-serif; }
  .comments-footer { border-top: 1px solid #E5E7EB; padding: 12px 16px; background: #fff; }
  .comment-input {
    width: 100%; box-sizing: border-box;
    border: 1px solid #E5E7EB; border-radius: 10px;
    padding: 10px 12px; font-size: 0.9375rem;
    font-family: 'Nunito Sans', system-ui, sans-serif;
    resize: none; outline: none;
    background: #FFFFFF; color: #101828;
    transition: border-color 0.15s;
  }
  .comment-input:focus { border-color: #FF8E00; }
  .comment-footer-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .comment-char-count { font-size: 0.75rem; color: #4A5565; font-family: 'Inter', system-ui, sans-serif; }
  .comment-post-btn {
    background: #FF8E00; color: #fff; border: none;
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
    padding: 16px 20px; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;
  }
  .edit-panel-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.125rem; font-weight: 500; color: #101828;
  }
  .edit-panel-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.25rem; color: #4A5565; padding: 4px; line-height: 1;
  }
  .edit-panel-close:hover { color: #101828; }
  .edit-panel-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
  .edit-field-group { margin-bottom: 18px; }
  .edit-field-label {
    display: block; font-size: 0.6875rem; font-weight: 600;
    letter-spacing: 0.09em; text-transform: uppercase; color: ${HERITAGE};
    margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif;
  }
  .edit-field-input {
    width: 100%; box-sizing: border-box;
    border: 1px solid #E5E7EB; border-radius: 10px;
    padding: 9px 12px; font-size: 0.9375rem;
    font-family: 'Nunito Sans', system-ui, sans-serif; color: #101828;
    background: #FFFFFF; resize: vertical; outline: none;
    transition: border-color 0.15s;
  }
  .edit-field-input:focus { border-color: ${HERITAGE}; }
  .edit-panel-footer {
    border-top: 1px solid #E5E7EB;
    padding: 12px 20px; background: white;
    display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  }
  .edit-panel-msg { font-size: 0.875rem; color: ${GREEN}; flex: 1; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .edit-panel-msg.err { color: #e55; }
  .edit-cancel-btn {
    padding: 9px 22px; border-radius: 12px; border: 1px solid #E5E7EB;
    background: white; color: #4A5565; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    transition: background 0.15s;
  }
  .edit-cancel-btn:hover { background: #F3F4F6; }
  .edit-save-btn {
    padding: 9px 28px; border-radius: 12px; border: none;
    background: ${HERITAGE}; color: white; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 500;
    transition: opacity 0.15s;
  }
  .edit-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .edit-save-btn:not(:disabled):hover { opacity: 0.88; }

  @media (max-width: 480px) {
    .player-body { padding: 12px 0.75rem 115px; }
    .snip-hook { font-size: 1.375rem; }
    .snip-explanation { font-size: 0.9375rem; }
    .snip-body { padding: 16px 14px 12px; }
    .pnav-btn  { padding: 8px 16px; font-size: 0.8125rem; }
    .player-nav { padding: 10px 1rem; bottom: 0; }
    .player-nav-links { display: none !important; }
    .snip-img { max-height: 300px; }
    .snip-img img { max-height: 300px; }
  }
`;

export default function SnippetPlayer({
  course, theme, module, lesson, levelId, settings,
  allLessons = [], earnedBadges = [],
  initialSnippetIndex = 0,
  playlistSnippetIds = null,
  onSnippetAdvance,
  onBackToLessons, onBackToLikes, onBackToDiscover = null, playlistLabel = "", onHome, onDashboard, onLikes, onBookmarks, onDiscover, onComplete, onNextLesson,
  bookmarks = new Set(), onToggleBookmark,
  isAdmin = false,
  isCreator = false,
  userEditorialRole = null,
  snippetShareMsg = DEFAULT_SNIPPET_SHARE_MSG,
  lessonQuiz = null,
  onTakeQuiz = null,
}) {
  const playlistMode       = !!(playlistSnippetIds && playlistSnippetIds.length > 0);
  const backToPlaylist      = onBackToDiscover || onBackToLikes;
  const isDiscoverPlaylist  = !!onBackToDiscover;
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
  const [shareCopied,     setShareCopied]     = useState(false);
  const [commentDraft,    setCommentDraft]    = useState("");
  const [commentPosting,  setCommentPosting]  = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editDraft,        setEditDraft]        = useState("");

  // Snippet inline edit state
  const [showEditPanel,       setShowEditPanel]       = useState(false);
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
  const trans    = snip ? (translations[snip.snippet_id] || {}) : {};
  const asset    = snip ? assets[snip.asset_id] : null;
  const isLast   = current === total - 1;
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

  const currentLessonIdx = !playlistMode && lesson ? allLessons.findIndex(l => l.lesson_id === lesson.lesson_id) : -1;
  const nextLesson = !playlistMode && currentLessonIdx >= 0 ? allLessons[currentLessonIdx + 1] : null;

  function goNext() {
    if (loading) return;
    if (!isLast) {
      setSnippetDir("next");
      setCurrent(c => c + 1);
      window.scrollTo(0, 0);
      if (!playlistMode && onSnippetAdvance) onSnippetAdvance(lesson.lesson_id, current + 1);
    } else {
      window.scrollTo(0, 0);
      setDone(true);
      if (!playlistMode && onComplete) onComplete(lesson.lesson_id, totalPoints, snippets.length);
    }
  }

  function goPrev() {
    if (loading || current === 0) return;
    setSnippetDir("prev");
    setCurrent(c => c - 1);
    window.scrollTo(0, 0);
    if (!playlistMode && onSnippetAdvance) onSnippetAdvance(lesson.lesson_id, current - 1);
  }

  async function toggleLike(snippetId) {
    if (!user || user.is_anonymous) return;
    const isLiked = liked.has(snippetId);

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
    if (!user || !commentDraft.trim() || commentPosting) return;
    setCommentPosting(true);
    const userName = profile?.display_name || (user.is_anonymous ? "Guest" : (user.email?.split("@")[0] || "Learner"));
    const { data, error } = await postComment(user.id, commentsSnipId, commentDraft.trim(), userName);
    if (!error && data) {
      setCommentsData(prev => [data, ...prev]);
      setCommentCounts(prev => ({ ...prev, [commentsSnipId]: (prev[commentsSnipId] || 0) + 1 }));
      setCommentDraft("");
      setShowComments(false);
    }
    setCommentPosting(false);
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (done) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "Escape")     (playlistMode ? backToPlaylist : onBackToLessons)?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [current, total, done, loading]);

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
    const dx = e.changedTouches[0].clientX - (touchStartX.current || 0);
    touchStartX.current = null;
    touchStartY.current = null;
    setDragOffset(0);
    setIsDragging(false);
    if (Math.abs(dx) < 60) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  return (
    <>
      <style>{globalStyles + styles}</style>
      <div className="player-wrap">

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
              <div
                className={`snip-card snip-enter-${snippetDir}`}
                key={`${snip.snippet_id}-${snippetDir}`}
                style={{
                  ...(dragOffset !== 0 ? { transform: `translateX(${dragOffset}px)` } : {}),
                  transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
                }}
              >
                {/* Two-column wrapper (grid on desktop, block on mobile) */}
                <div className="snip-2col">

                  {/* LEFT COLUMN — hook on top, image below */}
                  <div className="snip-left-col">
                    {trans.hook && (
                      <div className="snip-hook fs-heading">{trans.hook}</div>
                    )}
                    {asset ? (
                      <div className="snip-img">
                        <img
                          src={asset.file_path}
                          alt={asset.alt_text || ""}
                          onError={e => { e.target.style.display = "none"; }}
                        />
                        {trans.language && (
                          <div className="snip-lang-badge">{trans.language}</div>
                        )}
                        {snip.difficulty_level && (
                          <div className="snip-diff">{DIFFICULTY_STARS[snip.difficulty_level]}</div>
                        )}
                      </div>
                    ) : (
                      <div className="snip-header-band">
                        <div className="snip-header-ornament">&#127963;</div>
                        {trans.language && (
                          <div className="snip-lang-badge">{trans.language}</div>
                        )}
                        {snip.difficulty_level && (
                          <div className="snip-diff">{DIFFICULTY_STARS[snip.difficulty_level]}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN — explanation + all content blocks */}
                  <div className="snip-right-col snip-body">
                    {trans.explanation && <div className="snip-explanation fs-body">{trans.explanation}</div>}

                    {(trans.key_term || trans.life_connection || trans.quiz_recap) && (
                      <div className="snip-divider" />
                    )}

                    {trans.key_term && (
                      <div className="snip-key-term">
                        <div className="snip-kt-label">Key Term</div>
                        <div className="snip-kt-word">{trans.key_term}</div>
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

                    {trans.source_citation && <div className="snip-citation">{trans.source_citation}</div>}

                    {!trans.hook && !trans.explanation && (
                      <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb", fontSize: 15 }}>
                        Content for this snippet is coming soon.
                      </div>
                    )}
                  </div>
                </div>{/* end snip-2col */}

                {/* Social strip — full width, outside the grid */}
                <div className="snip-social">
                    <div className="snip-social-left">
                      <button
                        className={"snip-social-btn snip-like-btn" + (liked.has(snip.snippet_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                        onClick={e => { e.stopPropagation(); toggleLike(snip.snippet_id); }}
                        disabled={!user || user.is_anonymous}
                        title={!user || user.is_anonymous ? SIGNIN.likeTooltip : liked.has(snip.snippet_id) ? PLAYER.unlikeTooltip : "Like"}
                      >
                        <span className="snip-social-icon">{liked.has(snip.snippet_id) ? "♥" : "♡"}</span>
                        <span>{likeCounts[snip.snippet_id] || 0}</span>
                      </button>
                      <span className="snip-social-sep">&#183;</span>
                      <button
                        className="snip-social-btn snip-comment-btn"
                        onClick={e => { e.stopPropagation(); openComments(snip.snippet_id); }}
                        title="Comments"
                      >
                        <span className="snip-social-icon">&#128172;</span>
                        <span>{commentCounts[snip.snippet_id] || 0}</span>
                      </button>
                    </div>
                    <div className="snip-social-right">
                      <button
                        className={"snip-social-btn snip-bm-btn" + (bookmarks.has("snippet:" + snip.snippet_id) ? " active" : "") + (!user || user.is_anonymous ? " disabled" : "")}
                        title={!user || user.is_anonymous ? SIGNIN.bookmarkTooltip : bookmarks.has("snippet:" + snip.snippet_id) ? PLAYER.removeBookmark : PLAYER.addBookmark}
                        onClick={() => { if (onToggleBookmark) onToggleBookmark("snippet", String(snip.snippet_id), snip.hook || "Snippet"); }}
                      >
                        <span className="snip-social-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill={bookmarks.has("snippet:" + snip.snippet_id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></span>
                      </button>
                      <button
                        className="snip-social-btn snip-share-btn"
                        title="Share this snippet"
                        onClick={e => { e.stopPropagation(); setShareCopied(false); setSharePopoverId(snip.snippet_id); }}
                      >
                        <span className="snip-social-icon">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                          </svg>
                        </span>
                        <span>Share</span>
                      </button>
                      {canEdit && (
                        <button
                          className="snip-social-btn snip-edit-btn"
                          title="Edit snippet"
                          onClick={e => { e.stopPropagation(); openEditPanel(); }}
                        >
                          <span className="snip-social-icon"><i className="ti ti-pencil" /></span>
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
              </div>

              {/* Swipe hint — only on mobile, fades after first swipe */}
              {total > 1 && (
                <div className="swipe-hint">
                  <span>← swipe to navigate →</span>
                </div>
              )}
            </>
          )}
        </div>


        {/* Bottom nav */}
        {!loading && total > 0 && (
          <div className="player-nav">
            <button className="pnav-btn pnav-prev" onClick={goPrev} disabled={current === 0}>← Prev</button>
            <div className="pnav-dots">
              {snippets.slice(0, Math.min(total, 10)).map((_, i) => (
                <div
                  key={i}
                  className={"pnav-dot" + (i === current ? " active" : i < current ? " done" : "")}
                  onClick={() => {
                    if (i === current) return;
                    setSnippetDir(i > current ? "next" : "prev");
                    setCurrent(i);
                    window.scrollTo(0, 0);
                  }}
                  title={"Snippet " + (i + 1)}
                />
              ))}
              {total > 10 && <span style={{ fontSize: 11, color: "#aaa" }}>+{total - 10}</span>}
            </div>
            <button className={"pnav-btn " + (isLast ? "pnav-finish" : "pnav-next")} onClick={goNext}>
              {isLast ? "Finish ✓" : "Next →"}
            </button>
          </div>
        )}

        {/* Share popover */}
        {sharePopoverId && (() => {
          const shareSnip = snippets.find(s => s.snippet_id === sharePopoverId);
          const trans = shareSnip ? (translations[shareSnip.snippet_id] || {}) : {};
          const hook = trans.hook || shareSnip?.hook || "";
          const shareText = (hook ? hook + "\n\n" : "") + snippetShareMsg;
          const shareUrl  = APP_URL;
          const waHref  = "https://wa.me/?text=" + encodeURIComponent(shareText + "\n" + shareUrl);
          const twHref  = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(shareUrl);
          return (
            <div className="share-popover-overlay" onClick={() => setSharePopoverId(null)}>
              <div className="share-popover" onClick={e => e.stopPropagation()}>
                <div className="share-popover-handle" />
                <div className="share-popover-title">Share Snippet</div>
                {hook && <div className="share-popover-hook">{hook}</div>}
                <div className="share-popover-btns">
                  <a
                    className="share-pop-btn share-pop-btn-wa"
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSharePopoverId(null)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.854L.057 23.75a.5.5 0 0 0 .614.612l5.96-1.46A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.028-1.385l-.36-.214-3.732.914.944-3.635-.234-.374A9.817 9.817 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
                    WhatsApp
                  </a>
                  <a
                    className="share-pop-btn share-pop-btn-tw"
                    href={twHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSharePopoverId(null)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Post on X
                  </a>
                  <button
                    className={"share-pop-btn share-pop-btn-copy" + (shareCopied ? " copied" : "")}
                    onClick={() => {
                      navigator.clipboard.writeText(shareText + "\n" + shareUrl).then(() => {
                        setShareCopied(true);
                        setTimeout(() => { setShareCopied(false); setSharePopoverId(null); }, 1800);
                      });
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    {shareCopied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
                <button className="share-pop-cancel" onClick={() => setSharePopoverId(null)}>Cancel</button>
              </div>
            </div>
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
                          <span className="comment-author">{c.user_name || "Learner"}</span>
                          <span className="comment-actions">
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
                                  const { data, error } = await editComment(c.id, editDraft.trim());
                                  if (!error && data) {
                                    setCommentsData(prev => prev.map(x => x.id === c.id ? { ...x, body: data.body } : x));
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
                {user ? (
                  <>
                    <textarea
                      className="comment-input"
                      placeholder="Add a comment…"
                      maxLength={500}
                      rows={2}
                      value={commentDraft}
                      onChange={e => setCommentDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postCommentHandler(); } }}
                    />
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
                    <div className="comments-signin-text">Sign in or continue as Guest to comment</div>
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
                <div style={{ borderTop: "1px solid #E5E7EB", margin: "18px 0 14px" }} />
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: HERITAGE, marginBottom: 12 }}>
                  Quiz Question <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#9CA3AF" }}>— optional</span>
                </div>
                {editQuestionLoading ? (
                  <div style={{ color: "#9CA3AF", fontSize: "0.875rem", padding: "8px 0" }}>Loading question…</div>
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
                        <label className="edit-field-label" style={{ color: key === "correct_option" ? "#00924A" : undefined }}>
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
                    <div style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: -8, marginBottom: 8 }}>
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
                <>
                  <div className="comp-emoji">{isDiscoverPlaylist ? "\u{1F9ED}" : "\u2665"}</div>
                  <div className="comp-title">{isDiscoverPlaylist ? PLAYER.discoverComplete : PLAYER.likesComplete}</div>
                  <div className="comp-subtitle">You've reviewed all <strong>{snippets.length}</strong> snippet{snippets.length !== 1 ? "s" : ""} in <strong>{playlistLabel || "this playlist"}</strong>.</div>
                  <button className="comp-btn comp-primary" onClick={backToPlaylist}>{isDiscoverPlaylist ? "Back to Discover" : "Back to Likes"}</button>
                  <button className="comp-btn comp-secondary" onClick={() => { setCurrent(0); setDone(false); }}>Review Again</button>
                  <button className="comp-btn comp-dashboard" onClick={onDashboard}>Go to Dashboard</button>
                </>
              ) : (
                <>
                  <div className="comp-emoji">🎉</div>
                  <div className="comp-title">Lesson Complete!</div>
                  <div className="comp-subtitle">You've finished <strong>{lesson?.lesson_name}</strong>.</div>

                  <div className="comp-points">
                    <span className="comp-points-icon">🪙</span>
                    <span className="comp-points-value">+{totalPoints}</span>
                    <span className="comp-points-label">{PLAYER.dharmaPoints}</span>
                  </div>

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
                  <button className="comp-btn comp-primary" onClick={onBackToLessons}>Back to Lessons</button>
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
