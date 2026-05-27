import { SAFFRON, HERITAGE, GREEN, PARCHMENT } from "../lib/supabase";

export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Alumni+Sans:wght@400;700;800&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Source Sans 3', sans-serif; background: ${PARCHMENT}; color: #1F1F1F; min-height: 100vh; }

  /* Shared header */
  .app-header {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,0,0,0.07);
    padding: 0 1.5rem; height: 64px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .header-logo img { max-height: 36px; max-width: 140px; width: auto; height: auto; cursor: pointer; }
  .header-nav { display: flex; gap: 1.5rem; align-items: center; }
  .header-right { display: flex; align-items: center; gap: 10px; }

  .register-btn {
    background: ${SAFFRON}; color: white; border: none; border-radius: 999px;
    padding: 7px 18px; font-family: 'Alumni Sans', sans-serif; font-size: 1rem;
    font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.2s; white-space: nowrap;
  }
  .register-btn:hover { opacity: 0.92; transform: translateY(-1px); }

  /* Breadcrumb */
  .breadcrumb {
    max-width: 720px; margin: 0 auto; padding: 14px 1.5rem 0;
    font-size: 0.8125rem; color: #6B6B6B; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .breadcrumb a { color: #6B6B6B; text-decoration: none; cursor: pointer; transition: color 0.2s; }
  .breadcrumb a:hover { color: ${SAFFRON}; }
  .breadcrumb .sep { color: #D1D5DB; }
  .breadcrumb .current { color: ${HERITAGE}; font-weight: 700; }

  /* Page hero */
  .page-hero { max-width: 720px; margin: 0 auto; padding: 24px 1.5rem 16px; }
  .page-title    { font-family: 'Alumni Sans', sans-serif; font-size: 2.375rem; font-weight: 800; color: #0A0A0A; margin-bottom: 4px; }
  .page-subtitle { font-size: 0.9375rem; color: #6B6B6B; }

  /* Settings drawer */
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
    padding: 20px 24px; border-bottom: 1px solid rgba(0,0,0,0.07);
    display: flex; align-items: center; justify-content: space-between;
  }
  .settings-drawer-title { font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; font-weight: 800; color: ${HERITAGE}; }
  .settings-close {
    background: none; border: none; cursor: pointer; font-size: 1.25rem; color: #aaa;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; transition: background 0.2s, color 0.2s;
  }
  .settings-close:hover { background: #f5f5f5; color: #333; }
  .settings-body { flex: 1; overflow-y: auto; padding: 24px; }
  .settings-section { margin-bottom: 28px; }
  .settings-label {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    color: #aaa; margin-bottom: 12px;
  }
  .lang-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .lang-option {
    padding: 9px 12px; border-radius: 10px; border: 1.5px solid rgba(0,0,0,0.10);
    background: white; cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: #555;
    transition: all 0.15s; text-align: left;
  }
  .lang-option:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .lang-option.active { border-color: ${SAFFRON}; background: ${SAFFRON}11; color: ${SAFFRON}; font-weight: 700; }
  .font-size-row { display: flex; gap: 8px; }
  .fs-option {
    flex: 1; padding: 10px; border-radius: 10px; border: 1.5px solid rgba(0,0,0,0.10);
    background: white; cursor: pointer; font-weight: 700; color: #555;
    transition: all 0.15s; text-align: center;
  }
  .fs-option:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .fs-option.active { border-color: ${SAFFRON}; background: ${SAFFRON}11; color: ${SAFFRON}; }

  /* Misc shared */
  .loading { text-align: center; padding: 60px 1rem; font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; color: ${SAFFRON}; }
  .empty   { text-align: center; padding: 40px 1rem; font-size: 0.9375rem; color: #6B6B6B; }
  .footer  { text-align: center; padding: 24px 1rem; font-size: 0.8125rem; color: #6B6B6B; border-top: 1px solid rgba(0,0,0,0.07); }

  /* Skeleton shimmer */
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .skel {
    background: linear-gradient(90deg, #EBEBEA 25%, #F5F5F4 50%, #EBEBEA 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 6px;
    display: block;
  }
  .skel-wrap {
    max-width: 900px; margin: 0 auto; padding: 20px 1.5rem 60px;
  }

  @keyframes fadeUp       { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn       { from { opacity:0; } to { opacity:1; } }
  @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }

  @media (max-width: 1024px) { .hdr-desktop { display: none !important; } }
  @media (min-width: 1025px) { .hdr-mobile  { display: none !important; } }

  @media (max-width: 480px) {
    .app-header { padding: 0 1rem; height: 56px; }
    .register-btn { padding: 6px 14px; font-size: 0.875rem; }
    .page-title { font-size: 1.625rem; }
    .breadcrumb { padding: 10px 1rem 0; font-size: 0.75rem; }
  }

  /* SHARED DESIGN SYSTEM v3 (Session 24 visual refresh) */
  .page-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem 100px; }

  .page-section {
    background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
    padding: 22px; margin-bottom: 20px;
    box-shadow: none;
  }
  .page-section.rail-saffron  { border-left: 3px solid ${SAFFRON};  border-radius: 0 14px 14px 0; }
  .page-section.rail-heritage { border-left: 3px solid ${HERITAGE}; border-radius: 0 14px 14px 0; }
  .page-section.rail-green    { border-left: 3px solid ${GREEN};    border-radius: 0 14px 14px 0; }

  .page-section-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 18px;
  }
  .page-section-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem;
    font-weight: 700; color: #0A0A0A; letter-spacing: 0.02em;
    display: inline-flex; align-items: center; gap: 8px;
    padding-bottom: 4px; border-bottom: 2px solid ${SAFFRON};
  }
  .page-section.rail-heritage .page-section-title { border-bottom-color: ${HERITAGE}; }
  .page-section.rail-green    .page-section-title { border-bottom-color: ${GREEN}; }
  .page-section-title::before { content: none; }
  .page-section-meta { font-size: 0.75rem; color: #6B6B6B; font-weight: 600; }

  /* Primary button */
  .btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: ${HERITAGE}; color: white; border: none; border-radius: 10px;
    padding: 12px 22px; font-family: 'Alumni Sans', sans-serif;
    font-size: 1rem; font-weight: 700; cursor: pointer; min-height: 44px;
    text-decoration: none; transition: opacity 0.2s;
    letter-spacing: 0.02em; white-space: nowrap;
  }
  .btn-primary:hover { box-shadow: none; opacity: 0.9; }
  .btn-saffron { background: ${SAFFRON} !important; }
  .btn-saffron:hover { box-shadow: none !important; opacity: 0.9 !important; }
  .btn-green { background: ${GREEN} !important; }
  .btn-green:hover { box-shadow: none !important; opacity: 0.9 !important; }

  /* Outline button */
  .btn-outline {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: transparent; color: ${HERITAGE}; border: 1.5px solid ${HERITAGE};
    border-radius: 10px; padding: 11px 22px; font-family: 'Alumni Sans', sans-serif;
    font-size: 1rem; font-weight: 700; cursor: pointer; min-height: 44px;
    text-decoration: none; transition: background 0.2s; white-space: nowrap;
  }
  .btn-outline:hover { background: ${HERITAGE}0A; }

  /* Shared responsive */
  @media (max-width: 768px) {
    .page-wrap { padding: 0 1rem 80px; }
    .page-section { padding: 18px 16px; }
  }
  @media (max-width: 480px) {
    .page-wrap { padding: 0 0.875rem 80px; }
    .page-section { border-radius: 12px; margin-bottom: 16px; }
    .page-section-title { font-size: 1.125rem; }
    .btn-primary, .btn-outline { font-size: 0.9375rem; padding: 11px 18px; }
  }
`;
