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
    grid-template-columns: minmax(0, 760px); grid-template-areas: "stage"; }
  .ymap-badges.strip { display: none; }
  .ymap-arc { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
  .ymap-arc-slot { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; }
  .ymap-arc .ymap-badge { --ymap-badge: 4.2cqw; border-width: 1.5px; background: rgba(255,255,255,.96); box-shadow: 0 2px 6px rgba(16,24,40,.18); }
  .ymap-arc .ymap-badge.earned { box-shadow: 0 0 0 2px rgba(255,142,0,.25), 0 2px 6px rgba(16,24,40,.18); }
  .ymap-arc-slot:nth-child(-n+3) .ymap-badge::after { left: 0; transform: none; }
  .ymap-badges { display: flex; gap: 8px; }
  .ymap-badges.a { grid-area: a; flex-direction: column; align-items: center; justify-content: center; }
  .ymap-badges.b { grid-area: b; flex-direction: column; align-items: center; justify-content: center; }
  .ymap-stage { container-type: inline-size; grid-area: stage; position: relative; width: 100%; border-radius: var(--radius); overflow: hidden; background: #E7ECEE;
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

  /* big "x% Completed" printed on the Tibetan plateau (empty space north of the Himalaya) */
  .ymap-pct { position: absolute; left: 64%; top: 17.5%; transform: translate(-50%, -50%); pointer-events: none; white-space: nowrap; text-align: center;
    font-family: var(--font-heading); font-weight: 600; letter-spacing: .05em; color: #2F6B3A; opacity: .88;
    font-size: 3.6vw; font-size: clamp(12px, 4.3cqw, 44px); text-shadow: 0 1px 0 rgba(255,255,255,.9), 0 0 10px rgba(255,255,255,.7); }
  .ymap-pct small { display: block; font-size: .34em; letter-spacing: .16em; text-transform: uppercase; opacity: .8; margin-top: .1em; font-family: var(--font-ui); font-weight: 700; }

  /* progress card: in the Bay of Bengal (east of Tamil Nadu / Andhra coast) on wide screens, below the map on phones */
  .ymap-card2 { display: block; background: rgba(255,255,255,.94); border: 1px solid var(--color-border); border-radius: 16px;
    padding: 10px 14px 10px 10px; box-shadow: 0 6px 20px rgba(16,24,40,.16); font-family: var(--font-body); color: var(--color-text-main); }
  .ymap-card2.overlay { position: absolute; z-index: 2; left: 52.5%; top: 68%; width: 30%; font-size: 12px; font-size: clamp(9px, 1.62cqw, 14px); padding: .8em 1em; border-radius: 1.3em; }
  .ymap-card2.below { display: none; margin: 12px auto 0; max-width: 520px; }
  .ymap-card2 .body { flex: 1; min-width: 0; }
  .ymap-card2 .ttl { font-weight: 700; font-size: 13.5px; line-height: 1.25; } .ymap-card2.overlay .ttl { font-size: 1.12em; }
  .ymap-card2.overlay .sub, .ymap-card2.overlay .next { font-size: 1em; }
  .ymap-card2 .sub { font-size: 12px; color: var(--color-text-muted); line-height: 1.3; margin-top: 2px; }
  .ymap-card2 .bar { height: 6px; border-radius: 3px; background: #E6E4DA; margin-top: 6px; overflow: hidden; }
  .ymap-card2 .bar i { display: block; height: 100%; background: #2F8F46; }
  .ymap-card2 .next { margin-top: 7px; padding-top: 6px; border-top: 1px solid var(--color-border-muted); font-size: 12.5px; line-height: 1.35; }
  .ymap-card2 .next em { font-style: normal; color: var(--color-primary); font-weight: 700; }

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
    .ymap-card2.overlay { display: none; }
    .ymap-card2.below { display: flex; }
    .ymap-body { grid-template-columns: 1fr; grid-template-areas: "a" "stage" "b"; gap: 8px; }
    .ymap-arc { display: none; }
    .ymap-badges.strip { display: flex; }
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
