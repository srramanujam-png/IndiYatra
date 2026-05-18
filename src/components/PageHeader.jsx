import { useState, useEffect, useRef } from "react";
import { logoUrl } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";

const SAFFRON_VAL = "#FF8E00";

const avatarStyles = `
  .auth-avatar-wrap { position: relative; }
  .auth-avatar-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: ${SAFFRON_VAL}; color: #fff;
    font-size: 12px; font-weight: 700; letter-spacing: 0.05em;
    border: none; cursor: pointer; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: opacity 0.15s;
    overflow: hidden; padding: 0;
  }
  .auth-avatar-btn.guest {
    background: #bbb;
  }
  .auth-avatar-btn:hover { opacity: 0.85; }
  .auth-avatar-btn img {
    width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
  }
  .auth-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: #fff; border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.14);
    min-width: 170px; overflow: hidden; z-index: 500;
    animation: ddDown 0.18s ease both;
  }
  @keyframes ddDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .auth-dd-label {
    display: block; width: 100%; padding: 10px 16px 6px;
    font-size: 11px; font-weight: 700; color: #aaa;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .auth-dd-item {
    display: block; width: 100%; padding: 11px 16px;
    background: none; border: none; text-align: left;
    font-size: 14px; color: #1a1a1a; cursor: pointer;
    transition: background 0.12s;
  }
  .auth-dd-item:hover { background: #f5f5f5; }
  .auth-dd-item.danger { color: #c00; }
  .auth-dd-item.highlight { color: ${SAFFRON_VAL}; font-weight: 600; }
  .auth-dd-divider { height: 1px; background: #eee; margin: 2px 0; }
`;

export default function PageHeader({ onHome, onOpenSettings, navLinks = [] }) {
  const auth = useAuthContext();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const wrapRef = useRef(null);

  const user    = auth?.user;
  const profile = auth?.profile;
  const isGuest = user?.is_anonymous === true;

  const avatarUrl = (!imgError && !isGuest && profile?.avatar_url) ? profile.avatar_url : null;
  const rawLabel  = isGuest
    ? "GUEST"
    : (profile?.display_name || (user?.email ? user.email.split("@")[0] : ""));
  const avatarLabel = isGuest ? "G" : (rawLabel.slice(0, 5).toUpperCase() || "?");

  useEffect(() => {
    setImgError(false);
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <>
      <style>{avatarStyles}</style>
      <header className="app-header">
        <div className="header-logo" onClick={onHome}>
          <img src={logoUrl} alt="IndiYatra" onError={e => { e.target.style.display = "none"; }} />
        </div>
        <nav className="header-nav">
          {navLinks.map((l, i) => (
            <a key={i} onClick={l.onClick}>{l.label}</a>
          ))}
        </nav>
        <div className="header-right">
          <button className="header-settings-btn" onClick={onOpenSettings} title="Settings">&#x2699;</button>
          {user ? (
            <div className="auth-avatar-wrap" ref={wrapRef}>
              <button
                className={"auth-avatar-btn" + (isGuest ? " guest" : "")}
                onClick={() => setOpen(o => !o)}
                title={isGuest ? "Guest — click to sign in" : (profile?.display_name || user.email)}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt={avatarLabel} onError={() => setImgError(true)} />
                  : avatarLabel
                }
              </button>
              {open && (
                <div className="auth-dropdown">
                  {isGuest ? (
                    <>
                      <span className="auth-dd-label">Browsing as Guest</span>
                      <button
                        className="auth-dd-item highlight"
                        onClick={() => { setOpen(false); auth.onSignIn(); }}
                      >
                        &#x2728; Create Account / Sign In
                      </button>
                      <div className="auth-dd-divider" />
                      <button
                        className="auth-dd-item danger"
                        onClick={() => { setOpen(false); auth.onSignOut(); }}
                      >
                        Leave Guest Session
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="auth-dd-item"
                        onClick={() => { setOpen(false); auth.onProfile(); }}
                      >
                        Profile
                      </button>
                      <div className="auth-dd-divider" />
                      <button
                        className="auth-dd-item danger"
                        onClick={() => { setOpen(false); auth.onSignOut(); }}
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button className="register-btn" onClick={() => auth?.onSignIn?.()}>Sign In</button>
          )}
        </div>
      </header>
    </>
  );
}
