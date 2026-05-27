import { useState } from "react";
import { updateDisplayName } from "../lib/auth";
import { useAuthContext } from "../contexts/AuthContext";

const SAFFRON_VAL   = "#FF8E00";
const HERITAGE_VAL  = "#00509E";
const PARCHMENT_VAL = "#FFFDF5";

const styles = `
  .pm-overlay {
    position: fixed; inset: 0; z-index: 1001;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .pm-modal {
    background: ${PARCHMENT_VAL}; border-radius: 20px;
    width: 100%; max-width: 400px; padding: 32px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.22); position: relative;
    animation: authSlideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both;
  }
  @keyframes authSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pm-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px;
  }
  .pm-title {
    font-family: 'Alumni Sans', sans-serif;
    font-size: 24px; font-weight: 800; color: ${HERITAGE_VAL};
  }
  .pm-close {
    background: none; border: none; cursor: pointer;
    font-size: 20px; color: #6B6B6B;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; transition: background 0.15s;
  }
  .pm-close:hover { background: rgba(0,0,0,0.06); }
  .pm-label { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; display: block; }
  .pm-hint  { font-size: 12px; color: #6B6B6B; margin-top: 6px; line-height: 1.4; }
  .pm-input {
    width: 100%; padding: 10px 14px; border-radius: 10px;
    border: 1.5px solid #e0e0e0; background: #fff;
    font-size: 15px; color: #1a1a1a; outline: none;
    box-sizing: border-box; transition: border-color 0.15s;
  }
  .pm-input:focus { border-color: ${SAFFRON_VAL}; }
  .pm-input-group { margin-bottom: 20px; }
  .pm-role {
    background: #EEF4FF; border-radius: 8px; padding: 10px 14px;
    font-size: 14px; color: ${HERITAGE_VAL}; margin-bottom: 20px;
    display: flex; align-items: center; gap: 8px;
  }
  .pm-role-label { font-weight: 700; }
  .pm-save {
    width: 100%; padding: 13px; border-radius: 10px;
    background: ${SAFFRON_VAL}; color: #fff; font-size: 16px; font-weight: 700;
    border: none; cursor: pointer; transition: opacity 0.15s;
  }
  .pm-save:hover { opacity: 0.88; }
  .pm-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .pm-error   { color: #c00;    font-size: 13px; margin-top: 10px; text-align: center; }
  .pm-success { color: #006600; font-size: 13px; margin-top: 10px; text-align: center; }
`;

export default function ProfileModal({ onClose, onSaved }) {
  const auth = useAuthContext();
  const user    = auth?.user;
  const profile = auth?.profile;

  const defaultName = profile?.display_name
    || (user?.email ? user.email.split("@")[0].slice(0, 5) : "");

  const [name, setName]       = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);

  async function handleSave() {
    if (!name.trim()) { setError("Display name cannot be empty."); return; }
    setLoading(true);
    setError("");
    try {
      const { error: err } = await updateDisplayName(user.id, name);
      if (err) {
        setError(err.message);
      } else {
        setSaved(true);
        if (onSaved) onSaved();
        setTimeout(() => onClose(), 900);
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      console.error("handleSave:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="pm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="pm-modal">
          <div className="pm-header">
            <div className="pm-title">Your Profile</div>
            <button className="pm-close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="pm-input-group">
            <label className="pm-label">Display Name</label>
            <input
              className="pm-input"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setSaved(false); setError(""); }}
              placeholder="Your display name"
              maxLength={30}
            />
            <div className="pm-hint">
              Shown on leaderboards. Defaults to the first 5 letters of your email.
            </div>
          </div>

          <div className="pm-role">
            <span>Role:</span>
            <span className="pm-role-label">Student</span>
          </div>

          <button className="pm-save" onClick={handleSave} disabled={loading || !user}>
            {loading ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </button>
          {error   && <div className="pm-error">{error}</div>}
          {saved   && <div className="pm-success">Profile updated!</div>}
        </div>
      </div>
    </>
  );
}
