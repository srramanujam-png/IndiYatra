// Styles for the India progress map (quick dashboard section + detailed view).
// Uses the app's design tokens (src/index.css); SAFFRON/HERITAGE mirror --color-accent / --color-primary.
export const MAP_CSS = `
  .ymap { --ymap-badge: 52px; }
  .ymap-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  .ymap-meta { font-family: var(--font-ui); font-size: var(--text-sm); color: var(--color-text-body); }
  .ymap-meta strong { color: var(--color-text-main); font-weight: 700; }
  .ymap-prov {
    display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-ui); font-size: var(--text-xs); font-weight: 600;
    color: #8a4b00; background: rgba(255,142,0,0.12); border: 1px solid rgba(255,142,0,0.35); border-radius: var(--radius-pill); padding: 3px 10px;
  }

  /* layout: badges in two side columns on wide screens, compact strips above/below on phones */
  .ymap-body { display: grid; gap: 12px; align-items: center; justify-content: center;
    grid-template-columns: var(--ymap-badge) minmax(0, 760px) var(--ymap-badge); grid-template-areas: "a stage b"; }
  .ymap-badges { display: flex; gap: 8px; }
  .ymap-badges.a { grid-area: a; flex-direction: column; align-items: center; justify-content: center; }
  .ymap-badges.b { grid-area: b; flex-direction: column; align-items: center; justify-content: center; }
  .ymap-stage { grid-area: stage; position: relative; width: 100%; border-radius: var(--radius); overflow: hidden; background: #E7ECEE;
    border: 1px solid var(--color-border); touch-action: manipulation; }
  .ymap-plate, .ymap-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .ymap-plate { object-fit: fill; user-select: none; -webkit-user-drag: none; }
  .ymap-canvas { pointer-events: none; }
  .ymap-skel { position: absolute; inset: 0; }

  .ymap-hot { position: absolute; width: 28px; height: 28px; margin: -14px 0 0 -14px; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: pointer; }
  .ymap-hot:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 0; background: rgba(0,80,158,0.12); }
  .ymap-stage.hit { cursor: pointer; }

  .ymap-tip {
    position: absolute; z-index: 3; pointer-events: none; transform: translate(-50%, -125%); white-space: nowrap;
    background: var(--color-text-main); color: #fff; font-family: var(--font-ui); font-size: var(--text-xs); font-weight: 600;
    padding: 5px 9px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,24,40,.25);
  }
  .ymap-card {
    position: absolute; z-index: 4; left: 50%; bottom: 10px; transform: translateX(-50%); width: min(92%, 340px);
    background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: 0 10px 30px rgba(16,24,40,.22);
    padding: 12px 14px 12px 14px; font-family: var(--font-body);
  }
  .ymap-card h4 { margin: 0 0 2px; font-family: var(--font-heading); font-size: 1.05rem; color: var(--color-text-main); font-weight: 600; }
  .ymap-card .kind { font-family: var(--font-ui); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: .04em; color: var(--color-text-muted); }
  .ymap-card p { margin: 6px 0 0; font-size: var(--text-sm); color: var(--color-text-body); line-height: 1.45; }
  .ymap-card button.x { position: absolute; top: 6px; right: 6px; width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; color: var(--color-text-muted); font-size: 18px; line-height: 1; }
  .ymap-card button.x:hover { background: var(--color-border-muted); }

  .ymap-badge {
    width: var(--ymap-badge); height: var(--ymap-badge); border-radius: 50%; flex: 0 0 auto; display: grid; place-items: center; position: relative;
    font-size: calc(var(--ymap-badge) * 0.5); line-height: 1; cursor: pointer; padding: 0;
    background: #fff; border: 2px solid var(--color-border); transition: transform .15s, border-color .15s, box-shadow .15s;
  }
  .ymap-badge .ico { filter: grayscale(1) opacity(.55); transition: filter .2s; }
  .ymap-badge.earned { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(255,142,0,0.16); }
  .ymap-badge.earned .ico { filter: none; }
  .ymap-badge:hover, .ymap-badge:focus-visible { transform: translateY(-2px); }
  .ymap-badge:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 2px; }
  .ymap-badge::after {
    content: attr(data-tip); position: absolute; z-index: 6; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); white-space: nowrap; pointer-events: none;
    background: var(--color-text-main); color: #fff; font-family: var(--font-ui); font-size: var(--text-xs); font-weight: 600; padding: 5px 9px; border-radius: 8px; opacity: 0; transition: opacity .12s;
  }
  .ymap-badge:hover::after, .ymap-badge:focus-visible::after { opacity: 1; }
  .ymap-badges.a .ymap-badge::after { left: calc(100% + 8px); bottom: auto; top: 50%; transform: translateY(-50%); }
  .ymap-badges.b .ymap-badge::after { left: auto; right: calc(100% + 8px); bottom: auto; top: 50%; transform: translateY(-50%); }

  .ymap-summary { margin: 14px auto 0; max-width: 820px; font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-text-body); line-height: 1.55; }
  .ymap-actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
  .ymap-btn { font-family: var(--font-ui); font-size: var(--text-sm); font-weight: 600; color: var(--color-primary); background: #fff; border: 1px solid var(--color-primary); border-radius: var(--radius-pill); padding: 8px 16px; cursor: pointer; min-height: 40px; }
  .ymap-btn:hover { background: rgba(0,80,158,0.06); }
  .ymap-legend { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }
  .ymap-chip { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-body);
    background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-pill); padding: 3px 10px 3px 4px; }
  .ymap-chip canvas { width: 22px; height: 22px; }
  .ymap-chip b { color: var(--color-text-main); font-weight: 700; }
  .ymap-err { padding: 16px; text-align: center; color: var(--color-text-body); font-family: var(--font-body); }
  .ymap-err button { margin-top: 8px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

  @media (max-width: 699px) {
    .ymap { --ymap-badge: 40px; }
    .ymap-body { grid-template-columns: 1fr; grid-template-areas: "a" "stage" "b"; gap: 8px; }
    .ymap-badges.a, .ymap-badges.b { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 6px; }
    .ymap-card { bottom: 8px; }
    .ymap-badges.a .ymap-badge::after, .ymap-badges.b .ymap-badge::after { left: 50%; right: auto; top: auto; bottom: calc(100% + 8px); transform: translateX(-50%); }
  }
  @media (max-width: 379px) { .ymap { --ymap-badge: 34px; } }

  /* detailed view */
  .ymd { position: fixed; inset: 0; z-index: 1200; background: rgba(16,24,40,.72); display: flex; flex-direction: column; }
  .ymd-bar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #fff; border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
  .ymd-bar h3 { margin: 0; font-family: var(--font-heading); font-size: 1.1rem; font-weight: 600; color: var(--color-text-main); margin-right: auto; }
  .ymd-ctl { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--color-border); background: #fff; font-size: 20px; cursor: pointer; color: var(--color-text-main); }
  .ymd-ctl:hover { background: var(--color-border-muted); }
  .ymd-view { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #E7ECEE; touch-action: none; cursor: grab; }
  .ymd-view.drag { cursor: grabbing; }
  .ymd-view canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .ymd-note { padding: 8px 14px; background: #fff; border-top: 1px solid var(--color-border); font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-body); }
`;
