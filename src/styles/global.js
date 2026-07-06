import { SAFFRON, HERITAGE, GREEN } from "../lib/supabase";

export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito Sans', system-ui, sans-serif; background: #FFFFFF; color: #4A5565; min-height: 100vh; }

  /* ── Shared header ── */
  .app-header {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid #E5E7EB;
    padding: 0 1.5rem; height: 64px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .header-logo img { max-height: 36px; max-width: 140px; width: auto; height: auto; cursor: pointer; }
  .header-nav { display: flex; gap: 1.5rem; align-items: center; }
  .header-right { display: flex; align-items: center; gap: 10px; }

  .register-btn {
    background: ${SAFFRON}; color: white; border: none; border-radius: 12px;
    padding: 10px 16px; font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem;
    font-weight: 500; cursor: pointer; transition: opacity 0.2s, transform 0.2s; white-space: nowrap;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .register-btn:hover { opacity: 0.92; transform: translateY(-1px); }

  /* ── Breadcrumb ── */
  .breadcrumb {
    max-width: 1100px; margin: 0 auto; padding: 14px 1.5rem 0;
    font-size: 0.8125rem; color: #4A5565; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .breadcrumb a { color: #4A5565; text-decoration: none; cursor: pointer; transition: color 0.2s; }
  .breadcrumb a:hover { color: ${SAFFRON}; }
  .breadcrumb .sep { color: #E5E7EB; }
  .breadcrumb .current { color: ${HERITAGE}; font-weight: 600; }

  /* ── Page hero ── */
  .page-hero { max-width: 1100px; margin: 0 auto; padding: 24px 1.5rem 16px; }
  .page-title    { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 2rem; font-weight: 500; color: #101828; margin-bottom: 4px; }
  .page-subtitle { font-size: 0.9375rem; color: #4A5565; font-family: 'Nunito Sans', system-ui, sans-serif; }

  /* ── Settings drawer ── */
  .settings-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.45); backdrop-filter: blur(3px);
    display: flex; justify-content: flex-end;
    animation: fadeIn 0.2s ease;
  }
  .settings-drawer {
    width: 320px; max-width: 90vw; background: white; height: 100%;
    display: flex; flex-direction: column;
    box-shadow: -8px 0 40px rgba(0,0,0,0.2);
    animation: slideInRight 0.25s ease;
  }
  .settings-drawer-header {
    padding: 20px 24px; border-bottom: 1px solid #E5E7EB;
    display: flex; align-items: center; justify-content: space-between;
  }
  .settings-drawer-title { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem; font-weight: 500; color: ${HERITAGE}; }
  .settings-close {
    background: none; border: none; cursor: pointer; font-size: 1.25rem; color: #4A5565;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; transition: background 0.2s, color 0.2s;
  }
  .settings-close:hover { background: #F3F4F6; color: #101828; }
  .settings-body { flex: 1; overflow-y: auto; padding: 24px; }
  .settings-section { margin-bottom: 28px; }
  .settings-label {
    font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    color: #4A5565; margin-bottom: 12px; font-family: 'Inter', system-ui, sans-serif;
  }
  .lang-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .lang-option {
    padding: 9px 12px; border-radius: 12px; border: 1px solid #E5E7EB;
    background: white; cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: #4A5565;
    font-family: 'Nunito Sans', system-ui, sans-serif;
    transition: all 0.15s; text-align: left;
  }
  .lang-option:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .lang-option.active { border-color: ${SAFFRON}; background: ${SAFFRON}11; color: ${SAFFRON}; font-weight: 700; }
  .font-size-row { display: flex; gap: 8px; }
  .fs-option {
    flex: 1; padding: 10px; border-radius: 12px; border: 1px solid #E5E7EB;
    background: white; cursor: pointer; font-weight: 700; color: #4A5565;
    font-family: 'Nunito Sans', system-ui, sans-serif;
    transition: all 0.15s; text-align: center;
  }
  .fs-option:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .fs-option.active { border-color: ${SAFFRON}; background: ${SAFFRON}11; color: ${SAFFRON}; }

  /* ── Misc shared ── */
  .loading { text-align: center; padding: 60px 1rem; font-family: 'Oswald', sans-serif; font-size: 1.25rem; color: ${SAFFRON}; }
  .empty   { text-align: center; padding: 40px 1rem; font-size: 0.9375rem; color: #4A5565; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .footer  { text-align: center; padding: 24px 1rem; font-size: 0.8125rem; color: #4A5565; border-top: 1px solid #E5E7EB; font-family: 'Nunito Sans', system-ui, sans-serif; }

  /* ── Skeleton shimmer ── */
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .skel {
    background: linear-gradient(90deg, #F3F4F6 25%, #FFFFFF 50%, #F3F4F6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 6px;
    display: block;
  }
  .skel-wrap {
    max-width: 1100px; margin: 0 auto; padding: 20px 1.5rem 60px;
  }

  @keyframes fadeUp       { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn       { from { opacity:0; } to { opacity:1; } }
  @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }

  /* base display for mobile-only elements; desktop media query overrides to none */
  .hdr-mobile { display: flex; align-items: center; }
  @media (max-width: 1024px) { .hdr-desktop { display: none !important; } }
  @media (min-width: 1025px) { .hdr-mobile  { display: none !important; } }

  @media (max-width: 480px) {
    .app-header { padding: 0 1rem; height: 56px; }
    .register-btn { padding: 8px 14px; font-size: 0.8125rem; }
    .page-title { font-size: 1.5rem; }
    .breadcrumb { padding: 10px 1rem 0; font-size: 0.75rem; }
  }

  /* ── SHARED DESIGN SYSTEM — page layout ── */
  .page-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem 100px; }

  .page-section {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    padding: 24px; margin-bottom: 20px;
  }
  .page-section.alt-bg { background: #B5D7D5; }
  .page-section.rail-saffron  { border-left: 3px solid ${SAFFRON};  border-radius: 0 12px 12px 0; }
  .page-section.rail-heritage { border-left: 3px solid ${HERITAGE}; border-radius: 0 12px 12px 0; }
  .page-section.rail-green    { border-left: 3px solid ${GREEN};    border-radius: 0 12px 12px 0; }

  .page-section-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 18px;
  }
  .page-section-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem;
    font-weight: 500; color: #101828; letter-spacing: 0.01em;
    display: inline-flex; align-items: center; gap: 8px;
    padding-bottom: 4px; border-bottom: 2px solid ${SAFFRON};
  }
  .page-section.rail-heritage .page-section-title { border-bottom-color: ${HERITAGE}; }
  .page-section.rail-green    .page-section-title { border-bottom-color: ${GREEN}; }
  .page-section-title::before { content: none; }
  .page-section-meta { font-size: 0.75rem; color: #4A5565; font-weight: 600; font-family: 'Inter', system-ui, sans-serif; }

  /* ── Primary button ── */
  .btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: ${HERITAGE}; color: white; border: none; border-radius: 12px;
    padding: 12px 20px; font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.875rem; font-weight: 500; cursor: pointer; min-height: 44px;
    text-decoration: none; transition: opacity 0.2s;
    letter-spacing: 0.01em; white-space: nowrap;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-saffron { background: ${SAFFRON} !important; }
  .btn-saffron:hover { opacity: 0.9 !important; }
  .btn-green { background: ${GREEN} !important; }
  .btn-green:hover { opacity: 0.9 !important; }

  /* ── Outline button ── */
  .btn-outline {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: transparent; color: ${HERITAGE}; border: 1px solid ${HERITAGE};
    border-radius: 12px; padding: 12px 20px; font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.875rem; font-weight: 500; cursor: pointer; min-height: 44px;
    text-decoration: none; transition: background 0.2s; white-space: nowrap;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .btn-outline:hover { background: ${HERITAGE}0A; }

  /* ── Compact nav button ── */
  .btn-compact {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    border-radius: 12px; padding: 10px 16px; font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.875rem; font-weight: 500; cursor: pointer; min-height: 40px;
    white-space: nowrap; transition: opacity 0.2s;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }

  /* ── Shared responsive ── */
  @media (max-width: 768px) {
    .page-wrap { padding: 0 1rem 80px; }
    .page-section { padding: 18px 16px; }
  }
  @media (max-width: 480px) {
    .page-wrap { padding: 0 0.875rem 80px; }
    .page-section { border-radius: 12px; margin-bottom: 16px; }
    .page-section-title { font-size: 1.125rem; }
    .btn-primary, .btn-outline { font-size: 0.8125rem; padding: 10px 16px; }
  }

  /* ── Shared snippet-style content blocks (SnippetPlayer + QuizPlayer) ── */
  .snip-explanation {
    font-size: 1.125rem; color: #4A5565; line-height: 1.85; margin-bottom: 20px;
    text-align: justify; font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .snip-key-term {
    background: #FFF8EE; border-left: 4px solid ${SAFFRON};
    border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-kt-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${SAFFRON}; margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif; }
  .snip-kt-word  { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem; font-weight: 700; color: ${SAFFRON}; margin-bottom: 4px; }
  .snip-kt-meaning { font-size: 1.125rem; color: #4A5565; line-height: 1.6; font-family: 'Nunito Sans', system-ui, sans-serif; }

  .snip-life {
    background: #F0FAF4; border-left: 4px solid ${GREEN};
    border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-life-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${GREEN}; margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif; }
  .snip-life-text  { font-size: 1.125rem; color: #2a4a2a; line-height: 1.7; font-family: 'Nunito Sans', system-ui, sans-serif; }

  .snip-quiz {
    background: #EEF5FF; border-left: 4px solid ${HERITAGE};
    border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 14px;
  }
  .snip-quiz-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${HERITAGE}; margin-bottom: 6px; font-family: 'Inter', system-ui, sans-serif; }
  .snip-quiz-text  { font-size: 1.125rem; color: #1a2a4a; line-height: 1.7; font-family: 'Nunito Sans', system-ui, sans-serif; }

  .snip-citation { font-size: 0.75rem; color: #4A5565; font-style: italic; text-align: left; margin-top: 16px; padding-top: 12px; border-top: 1px solid #E5E7EB; font-family: 'Nunito Sans', system-ui, sans-serif; }

  /* Bottom nav */
  .player-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
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
  .pnav-dot  { width: 18px; height: 18px; border: 5px solid transparent; background-clip: padding-box; border-radius: 50%; background-color: #E5E7EB; transition: all 0.25s; cursor: pointer; }
  .pnav-dot:hover { background: ${SAFFRON}88; }
  .pnav-dot.active { background: ${SAFFRON}; transform: scale(1.35); }
  .pnav-dot.done   { background: ${GREEN}; }
  .pnav-center-finish { background: white; color: ${GREEN}; border-color: #E5E7EB; }
  .pnav-center-finish:hover { border-color: ${GREEN}; color: ${GREEN}; }

  .signin-toast {
    position: fixed; bottom: 84px; left: 50%; transform: translateX(-50%);
    background: rgba(20,20,20,0.92); color: white; border-radius: 999px;
    padding: 10px 18px; font-size: 0.875rem; font-weight: 500;
    font-family: 'Inter', system-ui, sans-serif; z-index: 400;
    animation: fadeIn 0.2s ease; white-space: nowrap; pointer-events: none;
  }

  @media (max-width: 480px) {
    .pnav-btn  { padding: 8px 16px; font-size: 0.8125rem; }
    .player-nav { padding: 10px 1rem; bottom: 0; }
  }

  /* ── Font size setting (Settings → Font Size sets body[data-fs]) ──
     Base (medium) sizes live on the elements; small/large override via .fs-body/.fs-heading */
  body[data-fs="small"] .fs-body    { font-size: 1rem !important; }
  body[data-fs="large"] .fs-body    { font-size: 1.3125rem !important; }
  body[data-fs="small"] .fs-heading { font-size: 1.375rem !important; }
  body[data-fs="large"] .fs-heading { font-size: 1.875rem !important; }
`;
