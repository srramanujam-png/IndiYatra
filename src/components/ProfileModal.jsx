import { useState } from "react";
import { updateDisplayName } from "../lib/auth";
import { useAuthContext } from "../contexts/AuthContext";

const SAFFRON_VAL   = "#FF8E00";
const HERITAGE_VAL  = "#00509E";

const styles = `
  .pm-overlay {
    position: fixed; inset: 0; z-index: 1001;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .pm-modal {
    background: #FFFFFF; border-radius: 16px;
    width: 100%; max-width: 400px; padding: 32px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.15); border: 1px solid #E5E7EB;
    position: relative;
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
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 24px; font-weight: 700; color: ${HERITAGE_VAL};
  }
  .pm-close {
    background: none; border: none; cursor: pointer;
    font-size: 20px; color: #4A5565;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; transition: background 0.15s;
  }
  .pm-close:hover { background: #F3F4F6; }
  .pm-label { font-size: 13px; font-weight: 600; color: #4A5565; margin-bottom: 6px; display: block; font-family: 'Inter', system-ui, sans-serif; }
  .pm-hint  { font-size: 12px; color: #4A5565; margin-top: 6px; line-height: 1.4; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .pm-input {
    width: 100%; padding: 10px 14px; border-radius: 10px;
    border: 1.5px solid #E5E7EB; background: #fff;
    font-size: 15px; color: #101828; outline: none;
    box-sizing: border-box; transition: border-color 0.15s;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .pm-input:focus { border-color: ${SAFFRON_VAL}; }
  .pm-input-group { margin-bottom: 20px; }
  .pm-role {
    background: #EEF4FF; border-radius: 8px; padding: 10px 14px;
    font-size: 14px; color: ${HERITAGE_VAL}; margin-bottom: 20px;
    display: flex; align-items: center; gap: 8px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .pm-role-label { font-weight: 700; }
  .pm-save {
    width: 100%; padding: 13px; border-radius: 12px;
    background: ${SAFFRON_VAL}; color: #fff; font-size: 15px; font-weight: 500;
    border: none; cursor: pointer; transition: opacity 0.15s;
    font-family: 'Inter', system-ui, sans-serif;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .pm-save:hover { opacity: 0.9; }
  .pm-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .pm-error   { color: #c00;    font-size: 13px; margin-top: 10px; text-align: center; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .pm-success { color: #006600; font-size: 13px; margin-top: 10px; text-align: center; font-family: 'Nunito Sans', system-ui, sans-serif; }
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
