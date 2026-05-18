import { useState } from "react";
import { SAFFRON, HERITAGE } from "../lib/supabase";

export default function SettingsDrawer({ settings, languages, onSave, onClose }) {
  const [draft, setDraft] = useState(settings);

  function apply(patch) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onSave(next);
    document.body.dataset.fs = next.fontSize;
  }

  return (
    <div className="settings-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-drawer">
        <div className="settings-drawer-header">
          <div className="settings-drawer-title">Settings</div>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-label">Language</div>
            <div className="lang-grid">
              {languages.map(l => (
                <button
                  key={l.language_id}
                  className={`lang-option ${draft.languageId === l.language_id ? "active" : ""}`}
                  onClick={() => apply({ languageId: l.language_id, languageCode: l.language_code, languageName: l.language })}
                >
                  {l.language}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-section">
            <div className="settings-label">Text Size</div>
            <div className="font-size-row">
              {[
                { key: "sm", label: "Small",  size: "13px" },
                { key: "md", label: "Medium", size: "15px" },
                { key: "lg", label: "Large",  size: "18px" },
              ].map(f => (
                <button
                  key={f.key}
                  className={`fs-option ${draft.fontSize === f.key ? "active" : ""}`}
                  style={{ fontSize: f.size }}
                  onClick={() => apply({ fontSize: f.key })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
