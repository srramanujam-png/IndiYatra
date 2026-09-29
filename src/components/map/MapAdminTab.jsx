// src/components/map/MapAdminTab.jsx — Admin > Map
// Edits the versioned map configuration (milestone unlocks, labels, temples, plant rules).
// Learner data, tokens and badges are NOT edited here (see the Tokens / Badges tabs).
//
// The 21 map images are pre-rendered from this configuration by `npm run map:plates:db`.
// Every save bumps map_config_meta.revision; if it differs from the revision the deployed plates were built
// from, a persistent banner tells the admin to regenerate them.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseClient } from "../../lib/auth";
import { mapAssetUrl } from "../../lib/map/mapData";

const SUBS = ["Milestones", "Rivers & ranges", "Temples", "Plants"];
const STYLES = ["river", "snow", "grassy", "dry", "mixed"];
const CMD = "npm run map:plates:db";

const CSS = `
  .mapadm-banner { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: .9rem; line-height: 1.45; }
  .mapadm-banner.stale { background: #fff7e6; border: 1.5px solid #ffb84d; color: #6b4200; }
  .mapadm-banner.fresh { background: #f0fdf4; border: 1.5px solid #86d3a3; color: #14532d; }
  .mapadm-banner b { font-weight: 700; }
  .mapadm-banner code { background: rgba(0,0,0,.07); padding: 2px 6px; border-radius: 5px; font-family: var(--font-mono); font-size: .82rem; }
  .mapadm-btn { padding: 7px 14px; border-radius: 8px; border: 1.5px solid var(--color-primary); background: #fff; color: var(--color-primary); font-weight: 700; font-size: .85rem; cursor: pointer; }
  .mapadm-btn.primary { background: var(--color-primary); color: #fff; }
  .mapadm-btn:disabled { opacity: .45; cursor: not-allowed; }
  .mapadm-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
  .mapadm-table th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--color-text-muted); padding: 6px 8px; border-bottom: 1.5px solid rgba(0,0,0,.08); }
  .mapadm-table td { padding: 8px; border-bottom: 1px solid rgba(0,0,0,.06); vertical-align: top; }
  .mapadm-chips { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .mapadm-chip { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 4px 2px 10px; font-size: .78rem; font-weight: 600; border: 1px solid; }
  .mapadm-chip.river { background: #eaf3fb; border-color: #9cc4e4; color: #1f5f99; }
  .mapadm-chip.mountain { background: #eef3e4; border-color: #b7c79a; color: #4a5a2a; }
  .mapadm-chip.temple { background: #fff1de; border-color: #ffc27a; color: #8a4b00; }
  .mapadm-chip button { border: 0; background: transparent; cursor: pointer; font-size: 15px; line-height: 1; color: inherit; padding: 0 4px; }
  .mapadm-note { font-size: .8rem; color: var(--color-text-muted); margin: 0 0 12px; }
  .mapadm-pending { display: inline-block; font-size: .7rem; font-weight: 700; color: #8a4b00; background: rgba(255,142,0,.14); border-radius: 999px; padding: 1px 8px; }
  .mapadm-actions { display: flex; gap: 8px; margin: 14px 0; flex-wrap: wrap; align-items: center; }
  @media (max-width: 800px) { .mapadm-table { display: block; overflow-x: auto; } }
`;

export default function MapAdminTab() {
  const [sub, setSub] = useState("Milestones");
  const [cfg, setCfg] = useState(null);
  const [plates, setPlates] = useState({ state: "checking", version: null });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [draft, setDraft] = useState(null);       // milestone drafts (unsaved)
  const [copied, setCopied] = useState(false);

  const say = (text, ok = true) => setMsg({ text, ok });

  const loadPlates = useCallback(async () => {
    try {
      const r = await fetch(mapAssetUrl("plates/manifest.json"), { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const m = await r.json();
      setPlates({ state: "loaded", version: m.configVersion, builtAt: m.builtAt, provisional: m.provisionalGeography });
    } catch { setPlates({ state: "missing", version: null }); }
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabaseClient.rpc("get_map_config");
    if (error) return say(`Could not load map configuration: ${error.message}`, false);
    setCfg(data);
    setDraft(data.milestones.map((m) => ({ index: m.index, threshold: m.threshold, title: m.title, note: m.note || "",
      ids: [...m.riverIds, ...m.mountainIds, ...m.templeIds] })));
  }, []);

  useEffect(() => { let live = true; Promise.resolve().then(() => { if (live) { load(); loadPlates(); } }); return () => { live = false; }; }, [load, loadPlates]);

  const stale = cfg && plates.state !== "checking" && plates.version !== cfg.version;
  const featureById = useMemo(() => cfg?.features || {}, [cfg]);
  const templeById = useMemo(() => Object.fromEntries((cfg?.temples || []).map((t) => [t.id, t])), [cfg]);
  const kindOf = (id) => (id.startsWith("temple") ? "temple" : featureById[id]?.type || "river");
  const nameOf = (id) => (id.startsWith("temple") ? templeById[id]?.name || `${id} (unnamed)` : featureById[id]?.name || id);

  const assigned = useMemo(() => new Set((draft || []).flatMap((m) => m.ids)), [draft]);
  const unassigned = useMemo(() => {
    if (!cfg) return [];
    return [...Object.keys(cfg.features), ...cfg.temples.map((t) => t.id)].filter((id) => !assigned.has(id));
  }, [cfg, assigned]);
  const dirty = useMemo(() => {
    if (!cfg || !draft) return false;
    return JSON.stringify(draft.map((m) => [m.index, m.title, m.note, [...m.ids].sort()])) !==
      JSON.stringify(cfg.milestones.map((m) => [m.index, m.title, m.note || "", [...m.riverIds, ...m.mountainIds, ...m.templeIds].sort()]));
  }, [cfg, draft]);

  const editMs = (idx, fn) => setDraft((d) => d.map((m) => (m.index === idx ? fn(m) : m)));

  async function saveMilestones() {
    setBusy(true); setMsg(null);
    const payload = draft.map((m) => ({ index: m.index, title: m.title, note: m.note,
      featureIds: m.ids.filter((id) => !id.startsWith("temple")), templeIds: m.ids.filter((id) => id.startsWith("temple")) }));
    const { error } = await supabaseClient.rpc("admin_save_map_milestones", { p_milestones: payload });
    setBusy(false);
    if (error) return say(`Save failed: ${error.message}`, false);
    say("Milestones saved. Regenerate the map images so learners see the change."); setHelp(true); await load();
  }

  async function saveRow(table, key, keyVal, fields, label) {
    setBusy(true); setMsg(null);
    const { error } = await supabaseClient.from(table).update(fields).eq(key, keyVal);
    setBusy(false);
    if (error) return say(`${label}: save failed — ${error.message}`, false);
    say(`${label} saved. Regenerate the map images if this changes what is drawn or labelled.`); await load();
  }

  function copyCmd() {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
    try { navigator.clipboard.writeText(CMD).then(done, done); } catch { done(); }
  }

  if (!cfg || !draft) return <div className="page-section"><style>{CSS}</style>{msg ? <div className="crud-msg err">{msg.text}</div> : "Loading map configuration…"}</div>;

  return (
    <div className="page-section">
      <style>{CSS}</style>
      <div className="page-section-head"><div className="page-section-title">Yatra Map</div>
        <div className="page-section-meta">config {cfg.version}</div></div>

      {/* ── reminder: pre-rendered images vs configuration ── */}
      {plates.state !== "checking" && (
        <div className={`mapadm-banner ${stale || plates.state === "missing" ? "stale" : "fresh"}`} role="status">
          <div style={{ flex: 1, minWidth: 220 }}>
            {plates.state === "missing"
              ? <><b>Map images not found.</b> The 21 pre-rendered map images have not been deployed yet.</>
              : stale
                ? <><b>Map images are out of date.</b> The configuration changed after the images were last generated (images built from <code>{plates.version}</code>, current <code>{cfg.version}</code>). Learners still see the old unlock layout until you regenerate and redeploy.</>
                : <><b>Map images are up to date.</b> Built from <code>{plates.version}</code>{plates.builtAt ? ` on ${new Date(plates.builtAt).toLocaleString()}` : ""}.</>}
            {plates.provisional && <div style={{ marginTop: 4 }}>⚠ Geography is <b>provisional</b> (official Survey of India outline still pending).</div>}
          </div>
          <button className="mapadm-btn primary" type="button" onClick={() => setHelp((h) => !h)}>{stale || plates.state === "missing" ? "Regenerate images…" : "How to regenerate"}</button>
          <button className="mapadm-btn" type="button" onClick={() => { setPlates((p) => ({ ...p, state: "checking" })); loadPlates(); }}>Re-check</button>
        </div>
      )}
      {help && (
        <div className="mapadm-banner stale" style={{ flexDirection: "column" }}>
          <div><b>Regenerating the map images</b> (takes about a minute):</div>
          <ol style={{ margin: "0 0 0 18px", padding: 0 }}>
            <li>In the project folder run <code>{CMD}</code> — it reads this configuration from the database and rewrites <code>public/map/v1/plates/</code>.</li>
            <li>Commit and deploy the changed files.</li>
            <li>Come back here and press <b>Re-check</b> — the banner turns green when the deployed images match.</li>
          </ol>
          <div><button className="mapadm-btn" type="button" onClick={copyCmd}>{copied ? "Copied ✓" : "Copy command"}</button></div>
        </div>
      )}
      {msg && <div className={`crud-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}

      <div className="admin-sub-tabs">
        {SUBS.map((s) => <button key={s} type="button" className={"admin-sub-btn" + (sub === s ? " active" : "")} onClick={() => setSub(s)}>{s}</button>)}
      </div>

      {/* ── milestones ── */}
      {sub === "Milestones" && (
        <>
          <p className="mapadm-note">Each 5% step unlocks the rivers, mountain ranges and temples listed. An item can unlock at only one milestone, and every milestone needs at least one. Progress = dharma seeds earned ÷ dharma seeds available.</p>
          <table className="mapadm-table">
            <thead><tr><th>%</th><th>Title</th><th>Unlocks</th><th>Add</th></tr></thead>
            <tbody>
              {draft.map((m) => (
                <tr key={m.index}>
                  <td><b>{m.threshold}%</b></td>
                  <td><input className="crud-input" value={m.title} aria-label={`Title for ${m.threshold}%`} onChange={(e) => editMs(m.index, (x) => ({ ...x, title: e.target.value }))} /></td>
                  <td>
                    <div className="mapadm-chips">
                      {m.ids.length === 0 && <span className="mapadm-pending">nothing assigned</span>}
                      {m.ids.map((id) => (
                        <span key={id} className={`mapadm-chip ${kindOf(id)}`}>{nameOf(id)}
                          <button type="button" aria-label={`Remove ${nameOf(id)} from ${m.threshold}%`} onClick={() => editMs(m.index, (x) => ({ ...x, ids: x.ids.filter((i) => i !== id) }))}>×</button></span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <select className="crud-select" value="" aria-label={`Add to ${m.threshold}%`} disabled={!unassigned.length}
                      onChange={(e) => e.target.value && editMs(m.index, (x) => ({ ...x, ids: [...x.ids, e.target.value] }))}>
                      <option value="">{unassigned.length ? "+ add…" : "all assigned"}</option>
                      <optgroup label="Rivers">{unassigned.filter((id) => kindOf(id) === "river").map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}</optgroup>
                      <optgroup label="Mountain ranges">{unassigned.filter((id) => kindOf(id) === "mountain").map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}</optgroup>
                      <optgroup label="Temples">{unassigned.filter((id) => kindOf(id) === "temple").map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}</optgroup>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mapadm-actions">
            <button className="mapadm-btn primary" type="button" disabled={!dirty || busy} onClick={saveMilestones}>{busy ? "Saving…" : "Save milestones"}</button>
            <button className="mapadm-btn" type="button" disabled={!dirty || busy} onClick={load}>Discard changes</button>
            {dirty && <span className="mapadm-pending">unsaved changes</span>}
          </div>
        </>
      )}

      {/* ── labels ── */}
      {sub === "Rivers & ranges" && (
        <>
          <p className="mapadm-note">Names and text learners see on hover and tap. The drawn shapes come from the geography files and are not edited here.</p>
          <table className="mapadm-table">
            <thead><tr><th>ID</th><th>Name</th><th>Hover label</th><th>Tap card text</th><th>Style</th><th /></tr></thead>
            <tbody>{Object.entries(cfg.features).map(([id, f]) => <FeatureRow key={id} id={id} f={f} busy={busy}
              onSave={(fields) => saveRow("map_features", "feature_id", id, fields, f.name)} />)}</tbody>
          </table>
        </>
      )}

      {/* ── temples ── */}
      {sub === "Temples" && (
        <>
          <p className="mapadm-note">A temple appears on the map only when it has a name and BOTH latitude and longitude (decimal degrees, India: lat 5–38, lon 60–100) and is enabled. Empty slots stay hidden — no placeholder sites are ever shown.</p>
          <table className="mapadm-table">
            <thead><tr><th>Slot</th><th>Name</th><th>Latitude</th><th>Longitude</th><th>Hover label</th><th>Tap card text</th><th>On</th><th /></tr></thead>
            <tbody>{cfg.temples.map((t) => <TempleRow key={t.id} t={t} busy={busy} onSave={(fields) => saveRow("map_temples", "temple_id", t.id, fields, t.name || t.id)} onError={(m) => say(m, false)} />)}</tbody>
          </table>
        </>
      )}

      {/* ── plant rules ── */}
      {sub === "Plants" && (
        <>
          <p className="mapadm-note">One plant is drawn for every token earned (counts come from the learner's own award records). Token types are fixed by the awarding system; you can adjust drawing size and order.</p>
          <table className="mapadm-table">
            <thead><tr><th>Completion</th><th>Token</th><th>Plant</th><th>Size (×)</th><th>Draw order</th><th /></tr></thead>
            <tbody>{cfg.plantRules.map((r) => <PlantRow key={r.event} r={r} busy={busy} onSave={(fields) => saveRow("map_plant_rules", "event_type", r.event, fields, r.species)} />)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}

function FeatureRow({ id, f, busy, onSave }) {
  const [v, setV] = useState({ name: f.name || "", hover: f.hover || "", tap: f.tap || "", style: f.style });
  const changed = v.name !== (f.name || "") || v.hover !== (f.hover || "") || v.tap !== (f.tap || "") || v.style !== f.style;
  const styles = f.type === "river" ? ["river"] : STYLES.filter((s) => s !== "river");
  return (
    <tr>
      <td><code>{id}</code></td>
      <td><input className="crud-input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label={`${id} name`} /></td>
      <td><input className="crud-input" value={v.hover} onChange={(e) => setV({ ...v, hover: e.target.value })} aria-label={`${id} hover label`} /></td>
      <td><input className="crud-input" value={v.tap} onChange={(e) => setV({ ...v, tap: e.target.value })} aria-label={`${id} tap text`} /></td>
      <td><select className="crud-select" value={v.style} disabled={f.type === "river"} onChange={(e) => setV({ ...v, style: e.target.value })} aria-label={`${id} style`}>{styles.map((s) => <option key={s}>{s}</option>)}</select></td>
      <td><button className="mapadm-btn" type="button" disabled={!changed || busy || !v.name.trim()}
        onClick={() => onSave({ display_name: v.name.trim(), hover_label: v.hover.trim() || null, tap_text: v.tap.trim() || null, style_key: v.style })}>Save</button></td>
    </tr>
  );
}

function TempleRow({ t, busy, onSave, onError }) {
  const [v, setV] = useState({ name: t.name || "", lat: t.lat ?? "", lon: t.lon ?? "", hover: t.hover || "", tap: t.tap || "", on: !!t.enabled });
  const changed = v.name !== (t.name || "") || String(v.lat) !== String(t.lat ?? "") || String(v.lon) !== String(t.lon ?? "") || v.hover !== (t.hover || "") || v.tap !== (t.tap || "") || v.on !== !!t.enabled;
  const hasLat = String(v.lat).trim() !== "", hasLon = String(v.lon).trim() !== "";
  const ready = v.name.trim() && hasLat && hasLon;
  function save() {
    const lat = hasLat ? Number(v.lat) : null, lon = hasLon ? Number(v.lon) : null;
    if (hasLat !== hasLon) return onError(`${t.id}: enter both latitude and longitude, or neither.`);
    if (hasLat && (Number.isNaN(lat) || Number.isNaN(lon) || lat < 5 || lat > 38 || lon < 60 || lon > 100)) return onError(`${t.id}: coordinates must be decimal degrees within India (lat 5–38, lon 60–100).`);
    if (v.on && !ready) return onError(`${t.id}: a temple needs a name and both coordinates before it can be switched on.`);
    onSave({ site_name: v.name.trim() || null, latitude: lat, longitude: lon, hover_label: v.hover.trim() || null, tap_text: v.tap.trim() || null, enabled: v.on && !!ready });
  }
  return (
    <tr>
      <td><code>{t.id}</code>{!ready && <div><span className="mapadm-pending">content needed</span></div>}</td>
      <td><input className="crud-input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label={`${t.id} name`} /></td>
      <td><input className="crud-input" inputMode="decimal" value={v.lat} onChange={(e) => setV({ ...v, lat: e.target.value })} aria-label={`${t.id} latitude`} style={{ width: 90 }} /></td>
      <td><input className="crud-input" inputMode="decimal" value={v.lon} onChange={(e) => setV({ ...v, lon: e.target.value })} aria-label={`${t.id} longitude`} style={{ width: 90 }} /></td>
      <td><input className="crud-input" value={v.hover} onChange={(e) => setV({ ...v, hover: e.target.value })} aria-label={`${t.id} hover label`} /></td>
      <td><input className="crud-input" value={v.tap} onChange={(e) => setV({ ...v, tap: e.target.value })} aria-label={`${t.id} tap text`} /></td>
      <td><input type="checkbox" checked={v.on} disabled={!ready} onChange={(e) => setV({ ...v, on: e.target.checked })} aria-label={`${t.id} enabled`} /></td>
      <td><button className="mapadm-btn" type="button" disabled={!changed || busy} onClick={save}>Save</button></td>
    </tr>
  );
}

function PlantRow({ r, busy, onSave }) {
  const [v, setV] = useState({ scale: r.scale, order: r.order });
  const changed = Number(v.scale) !== Number(r.scale) || Number(v.order) !== Number(r.order);
  const ok = Number(v.scale) > 0 && Number(v.scale) <= 5 && Number.isInteger(Number(v.order)) && Number(v.order) > 0;
  return (
    <tr>
      <td>{r.event}</td><td><code>{r.tokenType}</code></td><td>{r.species}</td>
      <td><input className="crud-input" style={{ width: 80 }} inputMode="decimal" value={v.scale} onChange={(e) => setV({ ...v, scale: e.target.value })} aria-label={`${r.species} size`} /></td>
      <td><input className="crud-input" style={{ width: 70 }} inputMode="numeric" value={v.order} onChange={(e) => setV({ ...v, order: e.target.value })} aria-label={`${r.species} draw order`} /></td>
      <td><button className="mapadm-btn" type="button" disabled={!changed || !ok || busy} onClick={() => onSave({ scale: Number(v.scale), display_order: Number(v.order) })}>Save</button></td>
    </tr>
  );
}
