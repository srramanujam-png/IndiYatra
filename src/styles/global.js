import { SAFFRON, HERITAGE, GREEN, PARCHMENT } from "../lib/supabase";

export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Alumni+Sans:wght@400;700;800&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Source Sans 3', sans-serif; background: ${PARCHMENT}; color: #1a1a2e; min-height: 100vh; }

  /* Shared header */
  .app-header {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,253,245,0.97); backdrop-filter: blur(12px);
    border-bottom: 2.5px solid ${SAFFRON};
    padding: 0 1.5rem; height: 64px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .header-logo img { height: 36px; cursor: pointer; }
  .header-nav { display: flex; gap: 1.5rem; align-items: center; }
  .header-nav a {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.125rem; font-weight: 700;
    color: #1a1a2e; text-decoration: none; position: relative; padding-bottom: 2px;
    transition: color 0.2s; cursor: pointer;
  }
  .header-nav a::after { content:''; position:absolute; bottom:0; left:0; width:0; height:2px; background:${SAFFRON}; transition:width 0.25s; }
  .header-nav a:hover { color: ${SAFFRON}; }
  .header-nav a:hover::after { width: 100%; }
  .header-right { display: flex; align-items: center; gap: 10px; }
  .header-settings-btn {
    background: none; border: 1.5px solid #e0d4bc; border-radius: 50%;
    width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: border-color 0.2s, background 0.2s; font-size: 1rem; color: #888;
  }
  .header-settings-btn:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; background: ${SAFFRON}11; }
  .register-btn {
    background: ${SAFFRON}; color: white; border: none; border-radius: 999px;
    padding: 7px 18px; font-family: 'Alumni Sans', sans-serif; font-size: 1rem;
    font-weight: 700; cursor: pointer; transition: box-shadow 0.2s, transform 0.2s; white-space: nowrap;
  }
  .register-btn:hover { box-shadow: 0 0 16px rgba(255,142,0,0.5); transform: translateY(-1px); }

  /* Breadcrumb */
  .breadcrumb {
    max-width: 720px; margin: 0 auto; padding: 14px 1.5rem 0;
    font-size: 0.8125rem; color: #999; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .breadcrumb a { color: #999; text-decoration: none; cursor: pointer; transition: color 0.2s; }
  .breadcrumb a:hover { color: ${SAFFRON}; }
  .breadcrumb .sep { color: #ccc; }
  .breadcrumb .current { color: ${HERITAGE}; font-weight: 700; }

  /* Page hero */
  .page-hero { max-width: 720px; margin: 0 auto; padding: 24px 1.5rem 16px; }
  .page-title    { font-family: 'Alumni Sans', sans-serif; font-size: 2.375rem; font-weight: 800; color: ${HERITAGE}; margin-bottom: 4px; }
  .page-subtitle { font-size: 0.9375rem; color: #888; }

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
    padding: 20px 24px; border-bottom: 1px solid #f0e8d8;
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
    padding: 9px 12px; border-radius: 10px; border: 1.5px solid #e8d5b0;
    background: white; cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: #555;
    transition: all 0.15s; text-align: left;
  }
  .lang-option:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .lang-option.active { border-color: ${SAFFRON}; background: ${SAFFRON}11; color: ${SAFFRON}; font-weight: 700; }
  .font-size-row { display: flex; gap: 8px; }
  .fs-option {
    flex: 1; padding: 10px; border-radius: 10px; border: 1.5px solid #e8d5b0;
    background: white; cursor: pointer; font-weight: 700; color: #555;
    transition: all 0.15s; text-align: center;
  }
  .fs-option:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .fs-option.active { border-color: ${SAFFRON}; background: ${SAFFRON}11; color: ${SAFFRON}; }

  /* Misc shared */
  .loading { text-align: center; padding: 60px 1rem; font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; color: ${SAFFRON}; }
  .empty   { text-align: center; padding: 40px 1rem; font-size: 0.9375rem; color: #999; }
  .footer  { text-align: center; padding: 24px 1rem; font-size: 0.8125rem; color: #999; border-top: 1px solid #eee; }

  @keyframes fadeUp       { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn       { from { opacity:0; } to { opacity:1; } }
  @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }

  @media (max-width: 768px) { .header-nav { display: none; } }
  @media (max-width: 480px) {
    .app-header { padding: 0 1rem; height: 56px; }
    .header-logo img { height: 28px; }
    .register-btn { padding: 6px 14px; font-size: 0.875rem; }
    .page-title { font-size: 1.625rem; }
    .breadcrumb { padding: 10px 1rem 0; font-size: 0.75rem; }
  }
`;
