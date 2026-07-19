import { useState, useEffect } from "react";
import { supabase, fetchContentThumbs, SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { supabaseClient, getTopLikedItems, getTopSavedItems, loadUserLikesByType } from "../lib/auth";
import { globalStyles } from "../styles/global";
import { useAuthContext } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import { useRecommendations } from "../hooks/useRecommendations";
import { useEntityPreview } from "../components/EntityPreview";

// ── Sidebar rail — fixed order of the 8 tabs, each backed by one photo tile.
// Real per-tab curated photos don't exist yet, so each key starts out mapped
// to a seeded placeholder and gets swapped for a real asset_library image (if
// any exist) once fetched — see sidebarThumbs state in the main component.
const SIDEBAR_SECTIONS = ["resume", "interest", "liked", "bookmarked", "surprise", "latest", "mylikes", "mybookmarks"];
function sidebarPlaceholder(key) {
  return `https://picsum.photos/seed/sidebar-${key}/160/160`;
}

// ── Thumb palettes (cycles by card index) ──────────────────────────────────────
const THUMB_PALETTES = [
  { bg: "#EEF5FF", icon: "🏛️" },
  { bg: "#FFF3E8", icon: "🪔" },
  { bg: "#E8F8F0", icon: "🌿" },
  { bg: "#F3EEFF", icon: "🎨" },
  { bg: "#FFF8E1", icon: "🏺" },
  { bg: "#E8F4FD", icon: "🌊" },
  { bg: "#FFF0F0", icon: "🎭" },
  { bg: "#F0FFF4", icon: "🌸" },
];

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = `
  /* ── Resume Yatra card ── */
  .fy-resume {
    background: white;
    border: 1px solid #E5E7EB;
    border-left: 3px solid ${SAFFRON};
    border-radius: 0 12px 12px 0;
    padding: 20px 24px;
    margin-bottom: 20px;
    display: flex; align-items: center; gap: 24px;
  }
  .fy-resume-body { flex: 1; min-width: 0; }
  .fy-resume-label {
    font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 4px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-resume-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 1.25rem; font-weight: 500; color: #101828;
    margin-bottom: 10px; line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fy-progress-wrap {
    height: 4px; background: #F3F4F6; border-radius: 2px; margin-bottom: 8px;
  }
  .fy-progress-fill {
    height: 4px; background: ${SAFFRON}; border-radius: 2px; transition: width 0.4s;
  }
  .fy-resume-meta {
    font-size: 0.75rem; color: #4A5565;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-resume-btn {
    background: ${SAFFRON}; color: white; border: none; border-radius: 12px;
    padding: 12px 24px; font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.875rem; font-weight: 500; cursor: pointer; white-space: nowrap;
    min-height: 44px; flex-shrink: 0; transition: opacity 0.2s;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29,41,61,0.02);
  }
  .fy-resume-btn:hover { opacity: 0.9; }

  /* ── Lesson carousel ── */
  .fy-carousel {
    display: flex; gap: 12px;
    overflow-x: auto; overflow-y: visible;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding-bottom: 2px;
  }
  .fy-carousel::-webkit-scrollbar { display: none; }

  /* ── Lesson card ── */
  .fy-card {
    flex: 0 0 172px; scroll-snap-align: start; overflow: hidden;
    display: flex; flex-direction: column;
  }

  .fy-thumb {
    height: 90px; width: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.875rem; position: relative; flex-shrink: 0;
  }
  .fy-thumb-tag {
    position: absolute; bottom: 6px; left: 6px; right: 6px;
    font-size: 0.5625rem; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; color: white;
    background: rgba(0,0,0,0.45); border-radius: 4px;
    padding: 2px 6px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .fy-card-body { padding: 10px 12px 12px; flex: 1; display: flex; flex-direction: column; }
  .fy-card-name {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.8125rem; font-weight: 700; color: #101828;
    line-height: 1.4; margin-bottom: 6px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .fy-card-meta { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: auto; }
  .fy-chip {
    font-size: 0.5625rem; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; border-radius: 999px; padding: 2px 7px;
    white-space: nowrap; font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-chip-saffron { background: ${SAFFRON}15; color: ${SAFFRON}; }
  .fy-chip-heritage { background: ${HERITAGE}12; color: ${HERITAGE}; }
  .fy-chip-green    { background: ${GREEN}12;    color: ${GREEN};    }

  /* ── List items (My Likes / My Bookmarks) ── */
  .fy-list { display: flex; flex-direction: column; gap: 8px; }
  .fy-list-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 1.125rem;
  }
  .fy-list-body { flex: 1; min-width: 0; }
  .fy-list-title {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.9375rem; font-weight: 700; color: #101828;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fy-list-sub {
    font-size: 0.75rem; color: #4A5565; margin-top: 2px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-list-arrow { font-size: 1rem; color: #D1D5DB; flex-shrink: 0; }

  /* ── My Likes horizontal layout ── */
  .fy-likes-row {
    display: flex; gap: 12px; align-items: stretch;
  }
  .fy-play-all {
    flex-shrink: 0; width: 108px; min-height: 108px;
    background: ${SAFFRON}; border-radius: 12px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 4px; cursor: pointer; padding: 12px; text-align: center;
    transition: opacity 0.2s; border: none;
  }
  .fy-play-all:hover { opacity: 0.9; }
  .fy-play-all-icon { font-size: 1.75rem; line-height: 1; }
  .fy-play-all-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.75rem; font-weight: 600; color: white;
  }
  .fy-play-all-count {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.625rem; color: rgba(255,255,255,0.82);
  }
  .fy-likes-scroll {
    flex: 1; overflow-x: auto; display: flex; gap: 10px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .fy-likes-scroll::-webkit-scrollbar { display: none; }
  .fy-like-card {
    flex: 0 0 148px; scroll-snap-align: start;
    padding: 12px; display: flex; flex-direction: column; gap: 5px;
  }
  .fy-like-card-icon { font-size: 1.25rem; line-height: 1; }
  .fy-like-card-name {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 0.875rem; font-weight: 500; color: ${HERITAGE};
    line-height: 1.3;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .fy-like-card-sub {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.6875rem; color: #4A5565; line-height: 1.4;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fy-like-card-when {
    margin-top: auto;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.625rem; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; color: ${SAFFRON};
  }

  /* ── Sign-in CTA ── */
  .fy-signin {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    padding: 48px 32px; text-align: center; margin-bottom: 20px;
  }
  .fy-signin-icon { font-size: 3rem; margin-bottom: 16px; }
  .fy-signin-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.5rem;
    font-weight: 500; color: #101828; margin-bottom: 8px;
  }
  .fy-signin-sub {
    font-size: 0.9375rem; color: #4A5565; line-height: 1.6;
    max-width: 380px; margin: 0 auto 24px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .fy-signin-btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  /* ── Skeleton ── */
  .fy-skel-row { display: flex; gap: 12px; }
  .fy-skel-card {
    flex: 0 0 172px; border-radius: 12px; height: 162px;
    background: linear-gradient(90deg, #F3F4F6 25%, #FFFFFF 50%, #F3F4F6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
  .fy-skel-list {
    height: 62px; border-radius: 10px; margin-bottom: 8px;
    background: linear-gradient(90deg, #F3F4F6 25%, #FFFFFF 50%, #F3F4F6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .fy-resume { flex-direction: column; align-items: stretch; gap: 14px; padding: 18px 16px; }
    .fy-resume-title { font-size: 1.0625rem; }
    .fy-resume-btn { text-align: center; }
    .fy-card { flex: 0 0 148px; }
    .fy-thumb { height: 80px; }
  }

  /* ══════════════════════════════════════════════════════════════════════
     Sidebar layout — photo-tile rail + a single content panel. Used at
     every breakpoint (mobile through desktop); each tab is a full-bleed
     photo (duotone-tinted toward brand saffron/heritage, never green) with
     the icon+label overlaid in white — no plain icon-circle fallback at
     any width, so the rail stays colourful even on narrow phones.
     ══════════════════════════════════════════════════════════════════════ */
  .fy-layout {
    display: flex; align-items: stretch;
    border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;
    max-width: 1000px; margin: 0 auto;
  }

  /* ── Photo-tile rail ── */
  .fy-sb {
    width: 108px; flex-shrink: 0; background: #FAFAF8;
    border-right: 1px solid #E5E7EB; padding: 8px 6px;
  }
  @media (min-width: 480px) { .fy-sb { width: 124px; } }
  @media (min-width: 768px) { .fy-sb { width: 140px; } }
  .fy-sb-btn {
    position: relative; overflow: hidden; border-radius: 10px;
    display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end;
    gap: 2px; width: 100%; min-height: 64px; margin-bottom: 6px;
    border: none; cursor: pointer; text-align: left; padding: 8px;
    transition: transform 0.15s;
  }
  .fy-sb-btn:last-child { margin-bottom: 0; }
  .fy-sb-btn:hover { transform: scale(1.03); }
  .fy-sb-photo {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; display: block; filter: grayscale(1) contrast(1.05);
  }
  /* Duotone tint — grayscale photo × saffron→heritage gradient on multiply,
     so any placeholder photo (regardless of its own colours) reads as
     on-brand and never shows green. */
  .fy-sb-tint {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, ${SAFFRON}9E, ${HERITAGE}9E);
    mix-blend-mode: multiply;
  }
  /* Scrim so the white icon/label stay legible over any photo. */
  .fy-sb-scrim {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0.05) 65%);
  }
  .fy-sb-icon {
    position: relative; z-index: 1; font-size: 1.0625rem; line-height: 1; color: #fff;
  }
  .fy-sb-btn.active { box-shadow: inset 0 0 0 2px ${SAFFRON}; }
  .fy-sb-btn.active .fy-sb-tint {
    background: linear-gradient(135deg, ${SAFFRON}4D, ${SAFFRON}14);
  }
  .fy-sb-label {
    position: relative; z-index: 1;
    font-size: 0.625rem; font-weight: 700; letter-spacing: 0.01em; color: #fff;
    line-height: 1.15; font-family: 'Inter', system-ui, sans-serif;
    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
  }
  .fy-sb-divider { height: 1px; background: #E5E7EB; margin: 6px 2px; }

  /* ── Wider rail on desktop: taller tiles, bigger icon/label ── */
  @media (min-width: 1024px) {
    .fy-sb { width: 232px; padding: 14px 10px; }
    .fy-sb-btn { min-height: 84px; padding: 10px 12px; margin-bottom: 8px; }
    .fy-sb-icon { font-size: 1.25rem; }
    .fy-sb-label { font-size: 0.8125rem; }
  }

  /* ── Content panel ── */
  .fy-panel { flex: 1; min-width: 0; background: #FAFAF7; padding: 8px; }
  .fy-panel-head {
    font-size: 0.625rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    color: #9CA3AF; margin-bottom: 10px; font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-panel-empty {
    color: #9CA3AF; font-size: 0.8125rem; text-align: center; padding: 40px 16px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  /* ── Section list card (Based on Interest / Most Liked / Most Bookmarked) ── */
  .fy-sec-card {
    gap: 10px; padding: 10px 12px; margin-bottom: 8px;
  }
  .fy-sec-thumb {
    width: 38px; height: 38px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 1.0625rem;
  }
  .fy-sec-info { flex: 1; min-width: 0; }
  .fy-sec-name {
    font-family: 'Nunito Sans', system-ui, sans-serif; font-size: 0.8125rem; font-weight: 700;
    color: #101828; line-height: 1.3;
  }
  .fy-sec-sub { font-size: 0.6875rem; color: #4A5565; margin-top: 2px; font-family: 'Inter', system-ui, sans-serif; }

  .bm-btn, .like-btn {
    flex-shrink: 0; background: none; border: none; cursor: pointer;
    font-size: 1.125rem; line-height: 1; padding: 6px; border-radius: 8px;
    color: #6B6B6B; transition: color 0.15s, transform 0.15s;
    display: flex; align-items: center; justify-content: center;
  }
  .bm-btn:hover { color: ${SAFFRON}; transform: scale(1.15); }
  .bm-btn.saved { color: ${SAFFRON}; }
  .like-btn:hover { color: #D85A30; transform: scale(1.15); }
  .like-btn.liked { color: #D85A30; }

  /* ── Item row — Most Liked / Most Bookmarked / My Likes / My Bookmarks.
     Neutral row card (matches ModulesPage/LessonsPage: white, subtle border,
     no colored accent bar) with a circular play-button thumb on the left. ── */
  .fy-item-list { display: flex; flex-direction: column; gap: 10px; }
  .fy-item-card {
    display: flex; align-items: center; gap: 12px;
    background: #fff; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
    padding: 12px 14px; cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    box-shadow: 0 2px 10px rgba(255,142,0,0.05);
  }
  .fy-item-card:hover {
    transform: translateX(4px);
    box-shadow: 0 6px 20px rgba(255,142,0,0.12);
    border-color: rgba(255,142,0,0.4);
  }
  .fy-item-thumb-col {
    flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .fy-item-thumb {
    position: relative; overflow: hidden;
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    background: ${SAFFRON}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .fy-item-thumb-img {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; display: block;
  }
  /* Translucent scrim over the photo so the play icon stays legible on any
     image — same treatment as AllCoursesPage's lesson-row circle. */
  .fy-item-thumb-overlay {
    position: absolute; inset: 0; z-index: 1;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.34);
  }
  .fy-item-thumb svg { margin-left: 1px; }
  .fy-item-card:hover .fy-item-thumb { transform: scale(1.08); box-shadow: 0 4px 14px rgba(255,142,0,0.35); }
  .fy-item-body { flex: 1; min-width: 0; }
  .fy-item-name {
    font-family: 'Nunito Sans', system-ui, sans-serif; font-size: 0.875rem; font-weight: 700;
    color: #101828; line-height: 1.3;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fy-item-sub {
    font-size: 0.75rem; color: #4A5565; margin-top: 3px; font-family: 'Inter', system-ui, sans-serif;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  /* Type label — vertical (bottom-to-top) strip between the thumb and the
     title, replacing the old horizontal pill that sat stacked under the
     thumb. Stretches to the row's own height (whatever the title+sub sets
     it to) rather than adding height of its own. */
  .fy-item-type-label {
    flex-shrink: 0; align-self: stretch; width: 16px;
    display: flex; align-items: center; justify-content: center;
    writing-mode: vertical-rl; transform: rotate(180deg);
    font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
    white-space: nowrap; border-radius: 6px; font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-badge-module { background: #FFF1DC; color: #B5610B; }
  .fy-badge-lesson { background: #E1F5E8; color: #1B7A3F; }
  .fy-badge-story  { background: #E6F1FB; color: #185FA5; }
  /* Indicator (heart/bookmark toggle or count chip) — a single compact
     element on the right, vertically centered with the row. Kept separate
     from the thumb column so that column never grows past thumb+indicator
     regardless of what the indicator is. */
  .fy-item-right { flex-shrink: 0; display: flex; align-items: center; }
  .fy-item-count {
    font-size: 0.75rem; font-weight: 700; color: #4A5565;
    display: flex; align-items: center; gap: 4px; white-space: nowrap; font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-item-count.like svg { color: #D85A30; }
  .fy-item-count.bm svg   { color: ${SAFFRON}; }

  /* ── Type filter — compact dropdown (All types / Modules / Lessons / Stories) ── */
  .fy-filter-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .fy-filter-label {
    font-size: 0.6875rem; font-weight: 700; color: #4A5565; text-transform: uppercase; letter-spacing: 0.05em;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .fy-filter-select {
    padding: 6px 28px 6px 12px; border-radius: 999px; border: 1.5px solid #E5E7EB;
    background: #fff; font-size: 0.75rem; font-weight: 700; color: #101828;
    cursor: pointer; outline: none; appearance: none; font-family: 'Inter', system-ui, sans-serif;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B7280'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center;
    transition: border-color 0.15s;
  }
  .fy-filter-select:focus, .fy-filter-select:hover { border-color: ${SAFFRON}; }

  /* ── Interest tags strip under "Based on your interests" ── */
  .fy-interest-tags { margin-top: 14px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .fy-interest-label { font-size: 0.75rem; color: #4A5565; font-family: 'Inter', system-ui, sans-serif; white-space: nowrap; }
  .fy-interest-tag {
    font-size: 0.75rem; font-weight: 600; color: ${HERITAGE};
    background: ${HERITAGE}0F; border-radius: 999px; padding: 2px 9px; font-family: 'Inter', system-ui, sans-serif;
  }

  /* ── Desktop: content panel switches its item lists to 2 columns, and
     the overall layout widens a little to give those columns room — more
     compact use of desktop width instead of one long single-column list.
     Placed last so it wins the cascade over the unconditional base rules
     for .fy-panel / .fy-item-list defined earlier in this stylesheet. ── */
  @media (min-width: 1024px) {
    .fy-layout { max-width: 1200px; }
    .fy-panel { padding: 14px; }
    .fy-item-list {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 14px;
    }
  }
`;

// ── Item type metadata (module / lesson / story) — mirrors the 3-way filter
// used on My Likes / My Bookmarks. Quiz and Question rows are intentionally
// folded into Lesson/Story respectively (they mirror the same like/bookmark
// state via pairing) so they never appear as separate entries here.
const ITEM_TYPE_META = {
  module: { label: "Module", badgeClass: "fy-badge-module" },
  lesson: { label: "Lesson", badgeClass: "fy-badge-lesson" },
  story:  { label: "Story",  badgeClass: "fy-badge-story"  },
};

function PlaySVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function HeartSVG({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6c-1.7-1.6-4.4-1.6-6 .1L12 7.5 9.2 4.7c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.1L12 19l8.8-8.2c1.7-1.7 1.7-4.4 0-6.1z" />
    </svg>
  );
}

function BookmarkSVG({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── One row in Most Liked / Most Bookmarked / My Likes / My Bookmarks /
// Based on Interest / Latest ────────────────────────────────────────────
// Layout, left to right: thumb (+ indicator stacked under it, if any) →
// vertical Module/Lesson/Story type label (only when showBadge) → title/sub,
// which get the rest of the row's width. The type label reads bottom-to-top
// and stretches to whatever height the title+sub set, so showing it never
// adds height of its own — it used to be a horizontal pill stacked under the
// thumb, which did add height; moving it here is what shrinks the row.
// The only crowding case left is "All types" on My Likes/My Bookmarks/Most
// Liked/Most Bookmarked, where a type label AND a heart/bookmark toggle both
// need to show — there the toggle moves to a small column on the right
// instead of stacking under the thumb.
// Stable placeholder for any item whose real photo isn't known yet (or
// doesn't exist) — seeded by type+id so the same item always gets the same
// placeholder, mirroring AllCoursesPage's lessonThumb() fallback.
function placeholderThumb(type, id) {
  return `https://picsum.photos/seed/${type}-${id}/96/96`;
}

// Circular play-button thumb — a real photo (module/lesson cover, or the
// snippet's own editorial image for stories) with a translucent scrim and
// the play icon on top, so the photo and the "this plays" affordance are
// both visible at once. `thumbSrc` is the real URL if one's been resolved
// (may be null while still loading, or if the item genuinely has no cover
// yet) — undefined/null both fall back to the seeded placeholder. If a real
// URL 404s, swap to the placeholder rather than showing a broken image.
function ItemThumb({ type, id, thumbSrc }) {
  const fallback = placeholderThumb(type, id);
  const [src, setSrc] = useState(thumbSrc || fallback);
  useEffect(() => { setSrc(thumbSrc || fallback); }, [thumbSrc, fallback]);
  return (
    <div className="fy-item-thumb">
      <img className="fy-item-thumb-img" src={src} alt="" onError={() => setSrc(fallback)} />
      <span className="fy-item-thumb-overlay"><PlaySVG /></span>
    </div>
  );
}

function ItemRow({ type, id, name, sub, showBadge, indicator, rightIndicator, onClick, thumbSrc, desc, pct, liked, bookmarked, onToggleLike, onToggleBookmark }) {
  const meta = ITEM_TYPE_META[type] || ITEM_TYPE_META.lesson;
  const crowded = (showBadge && indicator) || rightIndicator;
  const { openPreview } = useEntityPreview();
  // "story" is ForYouPage's internal name for a Snippet — the shared preview
  // component/DB schema both use "snippet".
  const previewType = type === "story" ? "snippet" : type;
  function openThisPreview() {
    openPreview({
      type: previewType, id, title: name, sub, crumb: sub, desc, image: thumbSrc, pct,
      liked, bookmarked, onToggleLike, onToggleBookmark,
      onPlay: onClick, playLabel: meta.label ? `Open ${meta.label}` : "Open",
    });
  }
  return (
    <div className="fy-item-card unified-row-card" onClick={openThisPreview}>
      {/* Type label — vertical, bottom-to-top, sitting to the left of the
          thumb instead of stacked as a pill under it. Frees up the thumb
          column to just be the thumb, so the row's height tracks the
          title+sub instead of thumb+badge+indicator stacked three deep. */}
      {showBadge && (
        <span className={"fy-item-type-label " + meta.badgeClass}>{meta.label}</span>
      )}
      <div className="fy-item-thumb-col">
        <ItemThumb type={type} id={id} thumbSrc={thumbSrc} />
        {indicator && !crowded ? indicator : null}
      </div>
      <div className="fy-item-body">
        <div className="fy-item-name">{name}</div>
        {sub ? <div className="fy-item-sub">{sub}</div> : null}
      </div>
      {crowded ? <div className="fy-item-right">{indicator}</div> : null}
    </div>
  );
}

// ── Compact type-filter dropdown shared by My Likes / My Bookmarks ─────────────
function TypeFilterBar({ value, onChange, counts }) {
  return (
    <div className="fy-filter-bar">
      <span className="fy-filter-label">Show</span>
      <select className="fy-filter-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="all">All types ({counts.all})</option>
        <option value="module">🗂️ Modules ({counts.module})</option>
        <option value="lesson">📖 Lessons ({counts.lesson})</option>
        <option value="story">✦ Stories ({counts.story})</option>
      </select>
    </div>
  );
}

// ── "Based on your interests" panel — same row-list format as the other
// sidebar panels (play-thumb + name + sub + right-side chip), sourced from
// the same get_recommendations RPC that RecommendationsRail.jsx uses
// (RecommendationsRail itself is left untouched — DashboardPage still uses
// its grid-card layout).
function BasedOnInterestPanel({ userId, onOpenLesson, bookmarks = new Set(), onToggleBookmark }) {
  const { recommendations, loading, error } = useRecommendations({ userId, limit: 8 });
  const hasData = !loading && recommendations.length > 0;
  const isEmpty = !loading && !error && recommendations.length === 0;

  // Recommendations are always lessons — fetch their cover_image_url (falls
  // back to the seeded placeholder inside ItemThumb if unset/unfetched yet).
  const [lessonThumbs, setLessonThumbs] = useState({});
  useEffect(() => {
    const ids = [...new Set(recommendations.map(r => r.lesson_id).filter(id => lessonThumbs["lesson:" + id] === undefined))];
    if (ids.length === 0) return;
    let cancelled = false;
    fetchContentThumbs({ lessonIds: ids }).then(map => {
      if (!cancelled) setLessonThumbs(prev => ({ ...prev, ...map }));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations]);

  const interestTags = [
    ...new Set(
      recommendations
        .filter(r => r.tag_overlap > 0)
        .flatMap(r => r.tag_names || [])
        .slice(0, 10)
    ),
  ].slice(0, 5);

  return (
    <>
      <div className="fy-panel-head">Based on your interests</div>
      {loading ? (
        <div className="fy-skel-list" />
      ) : isEmpty ? (
        <div className="fy-panel-empty">Complete a few lessons and we'll personalise this for you.</div>
      ) : hasData ? (
        <>
          <div className="fy-item-list">
            {recommendations.map(rec => {
              const isSaved = bookmarks.has("lesson:" + rec.lesson_id);
              return (
              <ItemRow
                key={rec.lesson_id}
                type="lesson"
                id={rec.lesson_id}
                thumbSrc={lessonThumbs["lesson:" + rec.lesson_id]}
                name={rec.lesson_name}
                sub={[
                  rec.tag_overlap > 0 ? `${rec.tag_overlap} match${rec.tag_overlap !== 1 ? "es" : ""}` : null,
                  rec.theme_title,
                  rec.course_name,
                ].filter(Boolean).join(" › ")}
                onClick={() => onOpenLesson?.(rec.lesson_id, "interest")}
                rightIndicator
                indicator={
                  <button
                    className={"bm-btn" + (isSaved ? " saved" : "")}
                    title={isSaved ? "Remove bookmark" : "Bookmark"}
                    onClick={e => { e.stopPropagation(); onToggleBookmark && onToggleBookmark("lesson", rec.lesson_id, rec.lesson_name); }}
                  >
                    <BookmarkSVG active={isSaved} />
                  </button>
                }
              />
              );
            })}
          </div>

          {interestTags.length > 0 && (
            <div className="fy-interest-tags">
              <span className="fy-interest-label">Based on your interest in</span>
              {interestTags.map(tag => (
                <span key={tag} className="fy-interest-tag">{tag}</span>
              ))}
            </div>
          )}
        </>
      ) : null}
    </>
  );
}

// ── Shared section header ──────────────────────────────────────────────────────
function SectionHead({ title, color = SAFFRON, count, onSeeAll }) {
  return (
    <div className="page-section-head">
      <div className="page-section-title" style={{ borderBottomColor: color }}>
        {title}
        {count != null && (
          <span className="page-section-meta" style={{ marginLeft: 8, borderBottom: "none" }}>
            {count}
          </span>
        )}
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "0.8125rem", fontWeight: 600, color: SAFFRON,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          See all →
        </button>
      )}
    </div>
  );
}

// ── Lesson carousel card ───────────────────────────────────────────────────────
function LessonCard({ lesson, index, chipLabel, chipCount, chipColor, onClick }) {
  const pal = THUMB_PALETTES[index % THUMB_PALETTES.length];
  const chipClass =
    chipColor === "heritage" ? "fy-chip fy-chip-heritage" :
    chipColor === "green"    ? "fy-chip fy-chip-green"    :
                               "fy-chip fy-chip-saffron";
  const { openPreview } = useEntityPreview();
  function openThisPreview() {
    openPreview({
      type: "lesson", id: lesson.lesson_id, title: lesson.lesson_name,
      crumb: lesson.theme_title || "", onPlay: onClick, playLabel: "Open",
    });
  }
  return (
    <div className="fy-card unified-grid-card" onClick={openThisPreview} title={lesson.lesson_name}>
      <div className="fy-thumb" style={{ background: pal.bg }}>
        <span>{pal.icon}</span>
        {lesson.theme_title && (
          <div className="fy-thumb-tag">{lesson.theme_title}</div>
        )}
      </div>
      <div className="fy-card-body">
        <div className="fy-card-name">{lesson.lesson_name}</div>
        <div className="fy-card-meta">
          {chipLabel && (
            <span className={chipClass}>{chipLabel}</span>
          )}
          {chipCount != null && chipCount > 0 && (
            <span className="fy-chip fy-chip-heritage">
              {chipCount >= 1000
                ? (chipCount / 1000).toFixed(1) + "k"
                : chipCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Carousel skeleton ──────────────────────────────────────────────────────────
function CarouselSkeleton() {
  return (
    <div className="fy-skel-row">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="fy-skel-card" />
      ))}
    </div>
  );
}

// ── Compact list row (Based on Interest / Most Liked / Most Bookmarked panels) ──
function SectionRow({ icon, bg, name, sub, chipLabel, chipColor, onClick }) {
  const chipStyle =
    chipColor === "heritage" ? { background: `${HERITAGE}15`, color: HERITAGE } :
    chipColor === "green"    ? { background: `${GREEN}15`,    color: GREEN    } :
                                { background: `${SAFFRON}15`, color: SAFFRON };
  return (
    <div className="fy-sec-card unified-row-card" onClick={onClick}>
      <div className="fy-sec-thumb" style={{ background: bg }}>{icon}</div>
      <div className="fy-sec-info">
        <div className="fy-sec-name">{name}</div>
        <div className="fy-sec-sub">{sub}</div>
      </div>
      {chipLabel && (
        <span className="fy-chip" style={{ ...chipStyle, flexShrink: 0 }}>{chipLabel}</span>
      )}
    </div>
  );
}


// ── Main component ─────────────────────────────────────────────────────────────
export default function ForYouPage({
  settings,
  onOpenSettings,
  onSaveSettings,
  languages = [],
  onBack,
  onDashboard,
  onForYou,
  onAllCourses,
  onLikes,
  onBookmarks,
  onDiscover,
  isAdmin,
  onAdmin,
  userEditorialRole,
  onEditor,
  activePage,
  onResume,
  onPlaySnippet,       // (snippetIds, startIndex, sourceTag?) → void — sourceTag: "mylikes" | "mostliked"
  onNavigate,          // (bookmarkItem, fromSection?) → void — fromSection only matters for
                       // content_type "snippet" ("mybookmarks" | "bookmarked"); ignored otherwise
  onOpenLesson,        // (lesson_id, fromSection?) → void — fromSection: which rail tab to
                       // reopen on return ("mylikes" | "liked" | "bookmarked" | "latest" | "interest")
  onSurpriseMe,        // (origin) → void — plays a random snippet mix (shared with GatewayPage's Surprise Me)
  likes = new Set(),
  bookmarks = new Set(),
  onToggleLike,
  onToggleBookmark,
  initialSection = "resume", // which rail tab to open on mount — App.jsx sets this to
                              // "mylikes"/"liked" when returning here from a likes playlist
}) {
  const { user, profile, onSignIn } = useAuthContext();
  const isGuest = !user || user.is_anonymous;

  // ── State ──────────────────────────────────────────────────────────────────
  const [resumeLesson,  setResumeLesson]  = useState(null);
  const [likedItems,    setLikedItems]    = useState([]); // {type: module|lesson|story, id, name, sub, count}
  const [savedItems,    setSavedItems]    = useState([]); // same shape
  const [myLikesItems,      setMyLikesItems]      = useState([]); // {type: module|lesson|story, id, name, sub, when, ...}
  const [allLikedSnippetIds, setAllLikedSnippetIds] = useState([]);
  const [myBookmarkItems,   setMyBookmarkItems]   = useState([]); // same shape as myLikesItems
  const [likedTypeFilter, setLikedTypeFilter] = useState("all");
  const [savedTypeFilter, setSavedTypeFilter] = useState("all");
  const [likesTypeFilter, setLikesTypeFilter] = useState("all");
  const [bmTypeFilter,    setBmTypeFilter]    = useState("all");
  // "Latest" sidebar section — latest modules + latest lessons merged into
  // one true-recency-ordered list (see useEffect below). Lazy-loaded on
  // first open.
  const [latestItems, setLatestItems] = useState([]); // {type, id, name, sub, created_at, raw?}
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [latestLoaded,  setLatestLoaded]  = useState(false);

  const [loadingResume, setLoadingResume] = useState(true);
  const [loadingLiked,  setLoadingLiked]  = useState(true);
  const [loadingSaved,  setLoadingSaved]  = useState(true);
  const [loadingLikes,  setLoadingLikes]  = useState(true);
  const [loadingBm,     setLoadingBm]     = useState(true);

  // ── Sidebar layout state — which panel is showing ─────────────────────────
  const [activeSection, setActiveSection] = useState(initialSection);

  // ── Sidebar photo tiles — one placeholder photo per tab, seeded so it's
  // stable across renders. Swapped for real asset_library images (if any
  // exist) on mount; if asset_library has none/errors, the seeded
  // placeholders (initial state) just stay put — every tile always has
  // *something* to show, never a blank/broken image.
  const [sidebarThumbs, setSidebarThumbs] = useState(() => {
    const map = {};
    SIDEBAR_SECTIONS.forEach(key => { map[key] = sidebarPlaceholder(key); });
    return map;
  });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rows = await supabase("asset_library", "?select=asset_id,file_path&asset_type=eq.IMAGE&order=asset_id&limit=8");
        const files = (Array.isArray(rows) ? rows : []).map(r => r.file_path).filter(Boolean);
        if (!files.length || cancelled) return;
        setSidebarThumbs(prev => {
          const next = { ...prev };
          SIDEBAR_SECTIONS.forEach((key, i) => { next[key] = files[i % files.length]; });
          return next;
        });
      } catch (e) {
        console.warn("ForYouPage sidebarThumbs:", e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Resume Yatra ─────────────────────────────────────────────────────────
  // Query lesson_progress directly — more reliable than profile.last_visited_route
  // which is only set via certain nav paths and may not yet be loaded.
  useEffect(() => {
    if (isGuest || !user?.id) { setLoadingResume(false); return; }
    async function load() {
      try {
        // Most recently updated in-progress lesson
        const { data: progRows } = await supabaseClient
          .from("lesson_progress")
          .select("lesson_id, snippet_index, updated_at")
          .eq("profile_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (!progRows?.length) { setLoadingResume(false); return; }
        const { lesson_id, snippet_index } = progRows[0];

        // Lesson name + snippet count in parallel
        const [lessons, mapping] = await Promise.all([
          supabase("lessons", `?select=lesson_id,lesson_name,module_id&lesson_id=eq.${lesson_id}`),
          supabase("lesson_snippet_mapping", `?select=snippet_id&lesson_id=eq.${lesson_id}`),
        ]);
        const lesson = Array.isArray(lessons) ? lessons[0] : null;
        const total  = Array.isArray(mapping) ? mapping.length : 0;
        if (!lesson || total === 0) { setLoadingResume(false); return; }

        // Theme title via module
        const mods = lesson.module_id
          ? await supabase("modules", `?select=module_id,theme_id&module_id=eq.${lesson.module_id}`)
          : [];
        const mod = Array.isArray(mods) ? mods[0] : null;
        const thms = mod?.theme_id
          ? await supabase("themes", `?select=title&theme_id=eq.${mod.theme_id}`)
          : [];
        const themeTitle = Array.isArray(thms) && thms[0]?.title ? thms[0].title : "";

        setResumeLesson({
          lesson_id,
          lesson_name:    lesson.lesson_name || "Your last lesson",
          theme_title:    themeTitle,
          snippet_index,
          total_snippets: total,
        });
      } catch (e) {
        console.warn("ForYouPage resume:", e);
      }
      setLoadingResume(false);
    }
    load();
  }, [isGuest, user?.id]);

  // ── Most Liked — community-wide, across module + lesson + story. Quiz and
  // question are excluded server-side (they mirror their paired lesson/story).
  useEffect(() => {
    async function load() {
      try {
        const { data } = await getTopLikedItems(10);
        const rows = Array.isArray(data) ? data : [];
        setLikedItems(rows.map(r => ({
          type:  r.content_type,
          id:    r.content_id,
          name:  r.name || "Untitled",
          sub:   r.sub || "",
          count: Number(r.item_count || 0),
        })));
      } catch (e) {
        console.warn("ForYouPage likedItems:", e);
      }
      setLoadingLiked(false);
    }
    load();
  }, []);

  // ── Most Bookmarked — community-wide, across module + lesson + story. Same
  // quiz/question exclusion as above.
  useEffect(() => {
    async function load() {
      try {
        const { data } = await getTopSavedItems(10);
        const rows = Array.isArray(data) ? data : [];
        setSavedItems(rows.map(r => ({
          type:  r.content_type,
          id:    r.content_id,
          name:  r.name || "Untitled",
          sub:   r.sub || "",
          count: Number(r.item_count || 0),
        })));
      } catch (e) {
        console.warn("ForYouPage savedItems:", e);
      }
      setLoadingSaved(false);
    }
    load();
  }, []);

  // ── My Likes — module + lesson (generic `likes` table) + snippet ("stories",
  // from the pre-existing get_user_likes RPC). Quiz/Question rows are dropped:
  // they're mirrors of their paired Lesson/Story (pairing cascades the same
  // like state to both), so showing them separately would just be duplicates.
  useEffect(() => {
    if (isGuest) { setLoadingLikes(false); return; }
    async function load() {
      try {
        const [{ data: snippetRows }, { data: typedRows }] = await Promise.all([
          supabaseClient.rpc("get_user_likes"),
          loadUserLikesByType().then(r => r).catch(() => ({ data: [] })),
        ]);
        const sRows = Array.isArray(snippetRows) ? snippetRows : [];
        const tRows = Array.isArray(typedRows) ? typedRows : [];

        // All liked snippet IDs, for the "Play all" button
        setAllLikedSnippetIds(sRows.map(r => r.snippet_id).filter(Boolean));

        const storyItems = sRows.map(r => ({
          type: "story",
          id: r.snippet_id,
          name: r.hook || "Snippet",
          sub: r.lesson_name || r.theme_title || r.course_name || "",
          when: r.liked_at,
          lesson_id: r.lesson_id,
        }));
        const moduleLessonItems = tRows
          .filter(r => r.content_type === "module" || r.content_type === "lesson")
          .map(r => ({
            type: r.content_type,
            id: r.content_id,
            name: r.item_name || "Untitled",
            sub: [r.theme_title, r.module_name].filter(Boolean).join(" › "),
            when: r.liked_at,
            raw: r, // full row (content_type/content_id/theme_id/module_id/…) for onNavigate
          }));

        const combined = [...moduleLessonItems, ...storyItems]
          .sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));
        setMyLikesItems(combined);
      } catch (e) {
        console.warn("ForYouPage myLikes:", e);
      }
      setLoadingLikes(false);
    }
    load();
  }, [isGuest, user?.id]);

  // ── My Bookmarks — module + lesson + snippet ("stories"). Same mirror-drop
  // rule as My Likes: quiz/question rows are hidden since they duplicate the
  // paired lesson/story entry.
  useEffect(() => {
    if (isGuest) { setLoadingBm(false); return; }
    async function load() {
      try {
        const { data } = await supabaseClient.rpc("get_user_bookmarks");
        const rows = Array.isArray(data) ? data : [];
        const items = rows
          .filter(b => b.content_type === "module" || b.content_type === "lesson" || b.content_type === "snippet")
          .map(b => ({
            type: b.content_type === "snippet" ? "story" : b.content_type,
            id: b.content_id,
            name: b.item_name || "Untitled",
            sub: b.content_type === "snippet"
              ? (b.lesson_name || b.theme_title || b.course_name || "")
              : [b.theme_title, b.module_name].filter(Boolean).join(" › "),
            when: b.saved_at,
            raw: b,
          }));
        setMyBookmarkItems(items);
      } catch (e) {
        console.warn("ForYouPage myBookmarks:", e);
      }
      setLoadingBm(false);
    }
    load();
  }, [isGuest, user?.id]);

  // ── Latest — latest modules + latest lessons, merged into ONE list ordered
  // by true created_at recency (not modules-then-lessons in two separate
  // sections). Lazy-loaded the first time the user opens the "Latest" rail
  // section (avoids fetching on every page load, mirroring the old
  // courseTree.load()-on-first-open pattern).
  useEffect(() => {
    if (activeSection !== "latest" || latestLoaded) return;
    setLatestLoaded(true);
    setLoadingLatest(true);
    async function load() {
      try {
        const [mods, lessons] = await Promise.all([
          supabase("modules", "?select=module_id,module_name,theme_id,created_at&order=created_at.desc&limit=6"),
          supabase("lessons", "?select=lesson_id,lesson_name,module_id,created_at&order=created_at.desc&limit=6"),
        ]);
        const modRows    = Array.isArray(mods) ? mods : [];
        const lessonRows = Array.isArray(lessons) ? lessons : [];

        // Enrich latest modules with theme_title
        const modThemeIds = [...new Set(modRows.map(m => m.theme_id).filter(Boolean))];
        const modThemes = modThemeIds.length
          ? await supabase("themes", `?select=theme_id,title&theme_id=in.(${modThemeIds.join(",")})`)
          : [];
        const themeTitleById = {};
        (Array.isArray(modThemes) ? modThemes : []).forEach(t => { themeTitleById[t.theme_id] = t.title; });

        const moduleItems = modRows.map(m => ({
          type: "module",
          id: m.module_id,
          name: m.module_name,
          sub: themeTitleById[m.theme_id] || "",
          created_at: m.created_at,
          raw: {
            module_id: m.module_id, module_name: m.module_name,
            theme_id: m.theme_id, theme_title: themeTitleById[m.theme_id] || "",
            content_type: "module", content_id: m.module_id,
          },
        }));

        // Enrich latest lessons with theme_title via module → theme join
        // (mirrors the Resume Yatra effect's enrichment pattern above).
        const lessonModuleIds = [...new Set(lessonRows.map(l => l.module_id).filter(Boolean))];
        const lessonMods = lessonModuleIds.length
          ? await supabase("modules", `?select=module_id,theme_id&module_id=in.(${lessonModuleIds.join(",")})`)
          : [];
        const themeIdByModuleId = {};
        (Array.isArray(lessonMods) ? lessonMods : []).forEach(m => { themeIdByModuleId[m.module_id] = m.theme_id; });

        const lessonThemeIds = [...new Set(Object.values(themeIdByModuleId).filter(Boolean))];
        const lessonThemes = lessonThemeIds.length
          ? await supabase("themes", `?select=theme_id,title&theme_id=in.(${lessonThemeIds.join(",")})`)
          : [];
        const lessonThemeTitleById = {};
        (Array.isArray(lessonThemes) ? lessonThemes : []).forEach(t => { lessonThemeTitleById[t.theme_id] = t.title; });

        const lessonItems = lessonRows.map(l => ({
          type: "lesson",
          id: l.lesson_id,
          name: l.lesson_name,
          sub: lessonThemeTitleById[themeIdByModuleId[l.module_id]] || "",
          created_at: l.created_at,
        }));

        const merged = [...moduleItems, ...lessonItems]
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setLatestItems(merged);
      } catch (e) {
        console.warn("ForYouPage latest:", e);
      }
      setLoadingLatest(false);
    }
    load();
  }, [activeSection, latestLoaded]);

  // ── Item thumbnails — real module/lesson cover photos + story (snippet)
  // images, batched by id across every rail list below (Most Liked, Most
  // Bookmarked, Latest, My Likes, My Bookmarks — Based on Interest fetches
  // its own, since its lessons come from a separate hook). Keyed "type:id" →
  // url|null; ItemThumb falls back to a seeded placeholder for null/unknown.
  const [itemImages, setItemImages] = useState({});
  function getThumb(type, id) {
    return itemImages[type + ":" + id];
  }
  useEffect(() => {
    const moduleIds = new Set(), lessonIds = new Set(), storyIds = new Set();
    function collect(items) {
      items.forEach(i => {
        const key = i.type + ":" + i.id;
        if (itemImages[key] !== undefined) return;
        if (i.type === "module") moduleIds.add(i.id);
        else if (i.type === "lesson") lessonIds.add(i.id);
        else if (i.type === "story") storyIds.add(i.id);
      });
    }
    collect(likedItems);
    collect(savedItems);
    collect(myLikesItems);
    collect(myBookmarkItems);
    collect(latestItems);

    if (moduleIds.size === 0 && lessonIds.size === 0 && storyIds.size === 0) return;
    let cancelled = false;
    fetchContentThumbs({
      moduleIds: [...moduleIds],
      lessonIds: [...lessonIds],
      storyIds: [...storyIds],
    }).then(map => {
      if (!cancelled) setItemImages(prev => ({ ...prev, ...map }));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likedItems, savedItems, myLikesItems, myBookmarkItems, latestItems]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatRelative(ts) {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7)  return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function typeCounts(items) {
    return {
      all:    items.length,
      module: items.filter(i => i.type === "module").length,
      lesson: items.filter(i => i.type === "lesson").length,
      story:  items.filter(i => i.type === "story").length,
    };
  }
  function filterByType(items, filter) {
    return filter === "all" ? items : items.filter(i => i.type === filter);
  }

  // ── Progress % for Resume Yatra ───────────────────────────────────────────
  // snippet_index is 0-based; clamp to [1, total] so bar is never empty
  const resumePct = resumeLesson
    ? Math.min(100, Math.round(
        (Math.max(1, resumeLesson.snippet_index + 1) / resumeLesson.total_snippets) * 100
      ))
    : 0;

  const navLinks = [
    { label: "Home",        onClick: onBack                  },
    { label: "Courses", onClick: onAllCourses            },
    { label: "For You",     onClick: onForYou  || (() => {}) },
    { label: "Dashboard",   onClick: onDashboard             },
    { label: "Discover",    onClick: onDiscover              },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
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
        navLinks={navLinks}
      />

      <div className="breadcrumb">
        <a onClick={onBack}>Home</a>
        <span className="sep">›</span>
        <span className="current">For You</span>
      </div>

      <div className="page-hero" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <div className="page-subtitle">
          {isGuest
            ? "Sign in to unlock personalised recommendations, your likes, and bookmarks."
            : "Picked for you based on your interests and activity."}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Sidebar layout — compact icon rail + single content panel.
          Serves every breakpoint; the rail widens on desktop (see CSS).
          ══════════════════════════════════════════════════════════════ */}
      <div className="page-wrap">
        <div className="fy-layout">

          {/* ── Icon rail ──────────────────────────────────────────────
              Order: Resume → Based on Interest → Most Liked → Most
              Bookmarked → Surprise → Latest → My Likes → My Bookmarks.
              (The inline "All Courses" drawer was removed — use the
              "Courses" link in the top nav instead.) */}
          <div className="fy-sb">
            <button
              className={"fy-sb-btn" + (activeSection === "resume" ? " active" : "")}
              onClick={() => setActiveSection("resume")}
            >
              <img className="fy-sb-photo" src={sidebarThumbs.resume} alt="" />
              <span className="fy-sb-tint" />
              <span className="fy-sb-scrim" />
              <span className="fy-sb-icon">▶</span>
              <span className="fy-sb-label">Resume</span>
            </button>

            <div className="fy-sb-divider" />

            <button
              className={"fy-sb-btn" + (activeSection === "interest" ? " active" : "")}
              onClick={() => setActiveSection("interest")}
            >
              <img className="fy-sb-photo" src={sidebarThumbs.interest} alt="" />
              <span className="fy-sb-tint" />
              <span className="fy-sb-scrim" />
              <span className="fy-sb-icon">✦</span>
              <span className="fy-sb-label">Based on Interest</span>
            </button>

            <button
              className={"fy-sb-btn" + (activeSection === "liked" ? " active" : "")}
              onClick={() => setActiveSection("liked")}
            >
              <img className="fy-sb-photo" src={sidebarThumbs.liked} alt="" />
              <span className="fy-sb-tint" />
              <span className="fy-sb-scrim" />
              <span className="fy-sb-icon">♥</span>
              <span className="fy-sb-label">Most Liked</span>
            </button>

            <button
              className={"fy-sb-btn" + (activeSection === "bookmarked" ? " active" : "")}
              onClick={() => setActiveSection("bookmarked")}
            >
              <img className="fy-sb-photo" src={sidebarThumbs.bookmarked} alt="" />
              <span className="fy-sb-tint" />
              <span className="fy-sb-scrim" />
              <span className="fy-sb-icon">🔖</span>
              <span className="fy-sb-label">Most Bookmarked</span>
            </button>

            <button
              className={"fy-sb-btn" + (activeSection === "surprise" ? " active" : "")}
              onClick={() => setActiveSection("surprise")}
            >
              <img className="fy-sb-photo" src={sidebarThumbs.surprise} alt="" />
              <span className="fy-sb-tint" />
              <span className="fy-sb-scrim" />
              <span className="fy-sb-icon">🎲</span>
              <span className="fy-sb-label">Surprise</span>
            </button>

            <button
              className={"fy-sb-btn" + (activeSection === "latest" ? " active" : "")}
              onClick={() => setActiveSection("latest")}
            >
              <img className="fy-sb-photo" src={sidebarThumbs.latest} alt="" />
              <span className="fy-sb-tint" />
              <span className="fy-sb-scrim" />
              <span className="fy-sb-icon">🆕</span>
              <span className="fy-sb-label">Latest</span>
            </button>

            <div className="fy-sb-divider" />

            <button
              className={"fy-sb-btn" + (activeSection === "mylikes" ? " active" : "")}
              onClick={() => setActiveSection("mylikes")}
            >
              <img className="fy-sb-photo" src={sidebarThumbs.mylikes} alt="" />
              <span className="fy-sb-tint" />
              <span className="fy-sb-scrim" />
              <span className="fy-sb-icon">❤️</span>
              <span className="fy-sb-label">My Likes</span>
            </button>

            <button
              className={"fy-sb-btn" + (activeSection === "mybookmarks" ? " active" : "")}
              onClick={() => setActiveSection("mybookmarks")}
            >
              <img className="fy-sb-photo" src={sidebarThumbs.mybookmarks} alt="" />
              <span className="fy-sb-tint" />
              <span className="fy-sb-scrim" />
              <span className="fy-sb-icon">📌</span>
              <span className="fy-sb-label">My Bookmarks</span>
            </button>

          </div>

          {/* ── Content panel ── */}
          <div className="fy-panel">

            {/* Resume */}
            {activeSection === "resume" && (
              isGuest ? (
                <div className="fy-signin" style={{ marginBottom: 0 }}>
                  <div className="fy-signin-icon">✦</div>
                  <div className="fy-signin-title">Your personal heritage journey</div>
                  <div className="fy-signin-sub">
                    Create a free account to get personalised lesson recommendations,
                    track your progress, and save your favourite snippets.
                  </div>
                  <div className="fy-signin-btns">
                    <button className="btn-primary btn-saffron" onClick={onSignIn}>Create free account</button>
                    <button className="btn-outline" onClick={onSignIn}>Sign in</button>
                  </div>
                </div>
              ) : loadingResume ? (
                <div className="fy-skel-list" />
              ) : resumeLesson ? (
                <>
                  <div className="fy-panel-head">Continue where you left off</div>
                  <div className="fy-resume" style={{ marginBottom: 0 }}>
                    <div className="fy-resume-body">
                      <div className="fy-resume-label">▶ Resume yatra</div>
                      <div className="fy-resume-title">{resumeLesson.lesson_name}</div>
                      <div className="fy-progress-wrap">
                        <div className="fy-progress-fill" style={{ width: `${resumePct}%` }} />
                      </div>
                      <div className="fy-resume-meta">
                        Snippet {resumeLesson.snippet_index + 1} of {resumeLesson.total_snippets}
                        {resumeLesson.theme_title ? ` · ${resumeLesson.theme_title}` : ""}
                      </div>
                    </div>
                    <button className="fy-resume-btn" onClick={onResume}>Continue →</button>
                  </div>
                </>
              ) : (
                <div className="fy-panel-empty">No lesson in progress yet. Head to Courses (top menu) to start one!</div>
              )
            )}

            {/* Based on Your Interest */}
            {activeSection === "interest" && (
              isGuest ? (
                <div className="fy-signin" style={{ marginBottom: 0 }}>
                  <div className="fy-signin-icon">✦</div>
                  <div className="fy-signin-title">Personalised for you</div>
                  <div className="fy-signin-sub">Sign in to unlock recommendations based on your interests and activity.</div>
                  <div className="fy-signin-btns">
                    <button className="btn-primary btn-saffron" onClick={onSignIn}>Create free account</button>
                    <button className="btn-outline" onClick={onSignIn}>Sign in</button>
                  </div>
                </div>
              ) : (
                <BasedOnInterestPanel userId={user.id} onOpenLesson={onOpenLesson} bookmarks={bookmarks} onToggleBookmark={onToggleBookmark} />
              )
            )}

            {/* Most Liked by Others — community-wide across module + lesson +
                story (quiz/question excluded server-side as mirrors). */}
            {activeSection === "liked" && (
              <>
                <div className="fy-panel-head">Most liked by others</div>
                {loadingLiked ? (
                  <div className="fy-skel-list" />
                ) : likedItems.length === 0 ? (
                  <div className="fy-panel-empty">No data yet — be the first to explore!</div>
                ) : (
                  <>
                    <TypeFilterBar value={likedTypeFilter} onChange={setLikedTypeFilter} counts={typeCounts(likedItems)} />
                    <div className="fy-item-list">
                      {filterByType(likedItems, likedTypeFilter).map(item => (
                        <ItemRow
                          key={item.type + ":" + item.id}
                          type={item.type}
                          id={item.id}
                          thumbSrc={getThumb(item.type, item.id)}
                          name={item.name}
                          sub={item.sub}
                          showBadge={likedTypeFilter === "all"}
                          onClick={() => {
                            if (item.type === "lesson") onOpenLesson?.(item.id, "liked");
                            else if (item.type === "story") {
                              // Full "Most Liked" story playlist, already ranked by like
                              // count descending — start at the clicked snippet.
                              const storyIds = likedItems.filter(i => i.type === "story").map(i => i.id);
                              const idx = storyIds.indexOf(item.id);
                              onPlaySnippet?.(storyIds, idx >= 0 ? idx : 0, "mostliked");
                            }
                            else onNavigate?.({ content_type: "module", content_id: item.id }, "liked");
                          }}
                          indicator={
                            <span className="fy-item-count like">
                              <HeartSVG active />
                              {item.count >= 1000 ? (item.count / 1000).toFixed(1) + "k" : item.count}
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Most Bookmarked by Others — same coverage as above. */}
            {activeSection === "bookmarked" && (
              <>
                <div className="fy-panel-head">Most bookmarked by others</div>
                {loadingSaved ? (
                  <div className="fy-skel-list" />
                ) : savedItems.length === 0 ? (
                  <div className="fy-panel-empty">No bookmarks yet — come back soon!</div>
                ) : (
                  <>
                    <TypeFilterBar value={savedTypeFilter} onChange={setSavedTypeFilter} counts={typeCounts(savedItems)} />
                    <div className="fy-item-list">
                      {filterByType(savedItems, savedTypeFilter).map(item => (
                        <ItemRow
                          key={item.type + ":" + item.id}
                          type={item.type}
                          id={item.id}
                          thumbSrc={getThumb(item.type, item.id)}
                          name={item.name}
                          sub={item.sub}
                          showBadge={savedTypeFilter === "all"}
                          onClick={() => {
                            if (item.type === "lesson") onOpenLesson?.(item.id, "bookmarked");
                            else if (item.type === "story") {
                              // Same treatment as My Bookmarks: open the snippet's parent
                              // lesson at that position, rather than a single-snippet
                              // playlist. Community-wide, so no completion rewards —
                              // see suppressLessonRewards in handleBookmarkNavigate.
                              onNavigate?.({ content_type: "snippet", content_id: item.id }, "bookmarked");
                            }
                            else onNavigate?.({ content_type: "module", content_id: item.id }, "bookmarked");
                          }}
                          indicator={
                            <span className="fy-item-count bm">
                              <BookmarkSVG active />
                              {item.count >= 1000 ? (item.count / 1000).toFixed(1) + "k" : item.count}
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Surprise — plays a random snippet mix. onSurpriseMe is the shared
                handler lifted to App.jsx (shuffles snippet_core ids, takes 20),
                also used by GatewayPage's "Surprise Me" card. Passing "for-you"
                tells App.jsx to return here (Surprise tab active) afterward,
                instead of back to Gateway/home. */}
            {activeSection === "surprise" && (
              <>
                <div className="fy-panel-head">Surprise me</div>
                <div className="fy-panel-empty" style={{ padding: "24px 16px" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 12 }}>🎲</div>
                  <div style={{ marginBottom: 16 }}>
                    A random mix of stories from across every course — same shuffle used on the welcome screen.
                  </div>
                  <button
                    className="fy-resume-btn"
                    style={{ margin: "0 auto" }}
                    onClick={() => onSurpriseMe && onSurpriseMe("for-you")}
                  >
                    🎲 Play Surprise Mix
                  </button>
                </div>
              </>
            )}

            {/* Latest — latest modules + latest lessons, merged into one list
                by true created_at recency (see useEffect above; lazy-loaded
                on first open). Each row's vertical Module/Lesson label
                (showBadge) tells the two apart now that they're interleaved
                instead of split into separate sections. */}
            {activeSection === "latest" && (
              <>
                <div className="fy-panel-head">Latest</div>
                {loadingLatest ? (
                  <div className="fy-skel-list" />
                ) : latestItems.length === 0 ? (
                  <div className="fy-panel-empty">Coming soon.</div>
                ) : (
                  <div className="fy-item-list">
                    {latestItems.map(item => {
                      const isSaved = bookmarks.has(item.type + ":" + item.id);
                      return (
                        <ItemRow
                          key={item.type + ":" + item.id}
                          type={item.type}
                          id={item.id}
                          thumbSrc={getThumb(item.type, item.id)}
                          name={item.name}
                          sub={item.sub}
                          showBadge
                          onClick={() => {
                            if (item.type === "lesson") onOpenLesson?.(item.id, "latest");
                            else onNavigate?.(item.raw);
                          }}
                          rightIndicator
                          indicator={
                            <button
                              className={"bm-btn" + (isSaved ? " saved" : "")}
                              title={isSaved ? "Remove bookmark" : "Bookmark"}
                              onClick={e => { e.stopPropagation(); onToggleBookmark && onToggleBookmark(item.type, item.id, item.name); }}
                            >
                              <BookmarkSVG active={isSaved} />
                            </button>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* My Likes — module + lesson rows get an interactive like toggle;
                story (snippet) rows show a static filled heart since snippet
                likes live in a separate table and aren't safe to toggle
                generically (see snippet_likes vs the generic likes table). */}
            {activeSection === "mylikes" && (
              isGuest ? (
                <div className="fy-signin" style={{ marginBottom: 0 }}>
                  <div className="fy-signin-icon">❤️</div>
                  <div className="fy-signin-title">Your liked content</div>
                  <div className="fy-signin-sub">Sign in to see everything you've liked, all in one place.</div>
                  <div className="fy-signin-btns">
                    <button className="btn-primary btn-saffron" onClick={onSignIn}>Create free account</button>
                    <button className="btn-outline" onClick={onSignIn}>Sign in</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="fy-panel-head">My Likes</div>
                  {loadingLikes ? (
                    <div className="fy-skel-list" />
                  ) : myLikesItems.length === 0 ? (
                    <div className="fy-panel-empty">Nothing liked yet — tap the heart on any module, lesson, or story.</div>
                  ) : (
                    <>
                      <TypeFilterBar value={likesTypeFilter} onChange={setLikesTypeFilter} counts={typeCounts(myLikesItems)} />
                      <div className="fy-item-list">
                        {filterByType(myLikesItems, likesTypeFilter).map(item => {
                          const isStory = item.type === "story";
                          const isLiked = !isStory && likes.has(item.type + ":" + item.id);
                          return (
                            <ItemRow
                              key={item.type + ":" + item.id}
                              type={item.type}
                              id={item.id}
                              thumbSrc={getThumb(item.type, item.id)}
                              name={item.name}
                              sub={item.sub}
                              showBadge={likesTypeFilter === "all"}
                              onClick={() => {
                                if (isStory) {
                                  const idx = allLikedSnippetIds.indexOf(item.id);
                                  onPlaySnippet && onPlaySnippet(allLikedSnippetIds, idx >= 0 ? idx : 0, "mylikes");
                                } else if (item.type === "lesson") {
                                  // Route through onOpenLesson (same path as Most Liked/Most
                                  // Bookmarked) instead of onNavigate, which previously sent
                                  // lesson clicks here to the Navigator page instead of back
                                  // to My Likes.
                                  onOpenLesson?.(item.id, "mylikes");
                                } else {
                                  // Module — opens All Courses at that module (see case
                                  // "module" in handleBookmarkNavigate); doesn't return here.
                                  onNavigate?.(item.raw, "mylikes");
                                }
                              }}
                              indicator={
                                isStory ? (
                                  <span className="fy-item-count like"><HeartSVG active /></span>
                                ) : (
                                  <button
                                    className={"like-btn" + (isLiked ? " liked" : "")}
                                    title={isLiked ? "Unlike" : "Like"}
                                    onClick={e => { e.stopPropagation(); onToggleLike && onToggleLike(item.type, item.id, item.name); }}
                                  >
                                    <HeartSVG active={isLiked} />
                                  </button>
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )
            )}

            {/* My Bookmarks — bookmarks are generic across all content types
                (including snippet), so every row gets an interactive toggle. */}
            {activeSection === "mybookmarks" && (
              isGuest ? (
                <div className="fy-signin" style={{ marginBottom: 0 }}>
                  <div className="fy-signin-icon">📌</div>
                  <div className="fy-signin-title">Your bookmarks</div>
                  <div className="fy-signin-sub">Sign in to save modules, lessons, and stories for later.</div>
                  <div className="fy-signin-btns">
                    <button className="btn-primary btn-saffron" onClick={onSignIn}>Create free account</button>
                    <button className="btn-outline" onClick={onSignIn}>Sign in</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="fy-panel-head">My Bookmarks</div>
                  {loadingBm ? (
                    <div className="fy-skel-list" />
                  ) : myBookmarkItems.length === 0 ? (
                    <div className="fy-panel-empty">Nothing bookmarked yet — tap the bookmark icon on any module, lesson, or story.</div>
                  ) : (
                    <>
                      <TypeFilterBar value={bmTypeFilter} onChange={setBmTypeFilter} counts={typeCounts(myBookmarkItems)} />
                      <div className="fy-item-list">
                        {filterByType(myBookmarkItems, bmTypeFilter).map(item => {
                          const realType = item.type === "story" ? "snippet" : item.type;
                          const isSaved = bookmarks.has(realType + ":" + item.id);
                          return (
                            <ItemRow
                              key={realType + ":" + item.id}
                              type={item.type}
                              id={item.id}
                              thumbSrc={getThumb(item.type, item.id)}
                              name={item.name}
                              sub={item.sub}
                              showBadge={bmTypeFilter === "all"}
                              onClick={() => {
                                if (item.type === "lesson") {
                                  // Same fix as My Likes: route lesson clicks through
                                  // onOpenLesson instead of onNavigate, which previously
                                  // sent them to the Navigator page via
                                  // handleBookmarkNavigate's case "lesson".
                                  onOpenLesson?.(item.id, "mybookmarks");
                                } else if (item.type === "story") {
                                  // Opens the snippet's parent lesson at that snippet's
                                  // position (case "snippet" in handleBookmarkNavigate) —
                                  // the "mybookmarks" tag brings it back here on completion.
                                  onNavigate?.(item.raw, "mybookmarks");
                                } else {
                                  // Module — opens All Courses at that module; doesn't
                                  // return here (see case "module" in App.jsx).
                                  onNavigate?.(item.raw, "mybookmarks");
                                }
                              }}
                              indicator={
                                <button
                                  className={"bm-btn" + (isSaved ? " saved" : "")}
                                  title={isSaved ? "Remove bookmark" : "Bookmark"}
                                  onClick={e => { e.stopPropagation(); onToggleBookmark && onToggleBookmark(realType, item.id, item.name); }}
                                >
                                  <BookmarkSVG active={isSaved} />
                                </button>
                              }
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )
            )}

          </div>
        </div>
      </div>
    </>
  );
}
