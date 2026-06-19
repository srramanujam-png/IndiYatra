import { useState, useEffect, useRef } from "react";
import { logoUrl } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { APP_NAME } from "../config/appStrings";

const SAFFRON  = "#FF8E00";
const HERITAGE = "#00509E";
const PURPLE   = "#00509E";

/* ── Base SVG props for stroke icons ─────────────────────────── */
const S = {
  width: 20, height: 20, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
};

/* ── Individual SVG icons ─────────────────────────────────────── */
const IcHome = () => (
  <svg {...S}>
    <path d="M3 9.5l9-7.5 9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z M9 21v-8h6v8" />
  </svg>
);
const IcSearch = () => (
  <svg {...S}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-5-5" />
  </svg>
);
const IcChart = () => (
  <svg width={20} height={20} viewBox="0 0 24 24">
    <rect x="3"    y="12" width="4.5" height="9"  rx="1" fill="currentColor" />
    <rect x="9.75" y="7"  width="4.5" height="14" rx="1" fill="currentColor" />
    <rect x="16.5" y="3"  width="4.5" height="18" rx="1" fill="currentColor" />
  </svg>
);
const IcHeart = () => (
  <svg {...S}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);
const IcBookmark = () => (
  <svg {...S}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);
/* Side-view skeleton key — reads clearly at 20px (bow + shaft + teeth) */
const IcKey = () => (
  <svg {...S}>
    <circle cx="7.5" cy="12" r="3.75" fill="currentColor" stroke="none" />
    <path d="M11.25 12h10.75" />
    <path d="M20 12v2.25M17 12v1.75" />
  </svg>
);
const IcPencil = () => (
  <svg {...S}>
    <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);
const IcPlay = () => (
  <svg {...S}>
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
  </svg>
);

/* Label -> icon component */
const LABEL_IC = {
  Home:      IcHome,
  Discover:  IcSearch,
  Dashboard: IcChart,
  Likes:     IcHeart,
  Bookmarks: IcBookmark,
};

const FONT_OPTIONS = [
  { key: "sm", label: "Small" },
  { key: "md", label: "Medium" },
  { key: "lg", label: "Large" },
];

/* ── Styles ──────────────────────────────────────────────────── */
const headerStyles = `
  /* ── Logo constraints ─────────────────────────────────────── */
  .header-logo img {
    max-height: 36px; max-width: 140px; width: auto; height: auto;
  }

  /* ── Profile dropdown (shared desktop + mobile) ──────────── */
  .auth-avatar-wrap { position: relative; }
  .auth-avatar-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: #FF8E00; color: #fff;
    font-size: 12px; font-weight: 700; letter-spacing: 0.05em;
    border: none; cursor: pointer; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: opacity 0.15s; overflow: hidden; padding: 0;
  }
  .auth-avatar-btn.guest { background: #bbb; }
  .auth-avatar-btn:hover { opacity: 0.85; }
  .auth-avatar-btn img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .prof-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: #fff; border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    min-width: 240px; z-index: 500; border: 1px solid #E5E7EB;
    animation: ddDown 0.18s ease both;
    overflow: hidden;
  }
  @keyframes ddDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .prof-dd-name {
    padding: 14px 16px 4px;
    font-size: 13px; font-weight: 700; color: #101828;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .prof-dd-name span { display: block; font-size: 11px; font-weight: 500; color: #4A5565; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.06em; font-family: 'Inter', system-ui, sans-serif; }
  .prof-dd-item {
    display: block; width: 100%; padding: 10px 16px;
    background: none; border: none; text-align: left;
    font-size: 14px; color: #101828; cursor: pointer; transition: background 0.12s;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .prof-dd-item:hover { background: #F3F4F6; }
  .prof-dd-item.danger { color: #c00; }
  .prof-dd-item.highlight { color: #FF8E00; font-weight: 600; }
  .prof-dd-divider { height: 1px; background: #E5E7EB; margin: 4px 0; }
  .prof-dd-section { padding: 8px 16px 10px; }
  .prof-dd-section-label {
    font-size: 11px; font-weight: 600; color: #4A5565;
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
    display: block; font-family: 'Inter', system-ui, sans-serif;
  }
  .prof-font-btns { display: flex; gap: 6px; }
  .prof-font-btn {
    flex: 1; padding: 5px 0; border-radius: 8px; border: 1.5px solid #E5E7EB;
    background: none; font-size: 13px; color: #4A5565; cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .prof-font-btn:hover { border-color: #FF8E00; color: #FF8E00; }
  .prof-font-btn.active { background: #FF8E00; border-color: #FF8E00; color: #fff; font-weight: 700; }
  .prof-lang-list { display: flex; flex-direction: column; gap: 1px; max-height: 160px; overflow-y: auto; }
  .prof-lang-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 0; background: none; border: none;
    text-align: left; font-size: 14px; color: #101828; cursor: pointer;
    font-family: 'Nunito Sans', system-ui, sans-serif; border-radius: 6px; transition: color 0.12s;
  }
  .prof-lang-btn:hover { color: #FF8E00; }
  .prof-lang-btn.active { color: #FF8E00; font-weight: 700; }
  .prof-lang-check { width: 14px; font-size: 12px; flex-shrink: 0; }


  /* ── Desktop nav — icon + text links ─────────────────────── */
  .hdr-nav-link {
    display: flex; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    padding: 5px 9px; border-radius: 8px;
    font-size: 13px; font-weight: 500; color: #4A5565;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap; font-family: 'Inter', system-ui, sans-serif;
  }
  .hdr-nav-link:hover { background: #F3F4F6; color: #101828; }
  .hdr-nav-link.active { color: #FF8E00; }
  .hdr-nav-link.active svg { color: #FF8E00; }
  @media (min-width: 1025px) and (max-width: 1280px) {
    .hdr-nav-link  { padding: 5px 6px; font-size: 12px; }
    .hdr-nav-resume, .hdr-nav-admin, .hdr-nav-editor { padding: 5px 6px; font-size: 12px; }
  }
  .hdr-nav-sep {
    width: 1px; height: 22px; background: #E5E7EB;
    margin: 0 2px; flex-shrink: 0;
  }
  .hdr-nav-resume {
    display: flex; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    padding: 5px 9px; border-radius: 8px;
    font-size: 13px; font-weight: 700; color: #FF8E00;
    transition: background 0.12s;
    white-space: nowrap;
  }
  .hdr-nav-resume:hover { background: #fff5e6; }
  .hdr-nav-admin {
    display: flex; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    padding: 5px 9px; border-radius: 8px;
    font-size: 13px; font-weight: 700; color: #00509E;
    transition: background 0.12s;
    white-space: nowrap;
  }
  .hdr-nav-admin:hover { background: #e8f0fa; }
  .hdr-nav-editor {
    display: flex; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    padding: 5px 9px; border-radius: 8px;
    font-size: 13px; font-weight: 700; color: #00509E;
    transition: background 0.12s;
    white-space: nowrap;
  }
  .hdr-nav-editor:hover { background: rgba(0,80,158,0.07); }

  /* ── Mobile icon buttons ──────────────────────────────────── */
  .mob-icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: none; border: none; cursor: pointer;
    transition: background 0.12s;
    flex-shrink: 0;
  }
  .mob-icon-btn:hover { background: #F3F4F6; }
  .mob-icon-btn.saffron { color: #FF8E00; }
  .mob-icon-btn.blue    { color: #00509E; }
  .mob-icon-btn.purple  { color: #00509E; }
  .mob-header-icons { display: flex; align-items: center; gap: 2px; }

  /* ── Bottom tab bar ───────────────────────────────────────── */
  .btm-nav {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #fff; border-top: 1px solid #E5E7EB;
    display: flex; align-items: flex-start; justify-content: space-around;
    padding: 6px 0 calc(6px + env(safe-area-inset-bottom, 0px));
    z-index: 200;
  }
  .btm-tab {
    flex: 1; background: none; border: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center;
    padding: 0; min-height: 44px;
  }
  .btm-tab-inner {
    display: flex; flex-direction: column; align-items: center;
    gap: 2px; padding: 5px 14px; border-radius: 999px;
    border: 1.5px solid transparent;
    transition: background 0.12s, border-color 0.12s;
  }
  .btm-tab-inner svg { color: #4A5565; transition: color 0.12s; }
  .btm-tab:hover .btm-tab-inner:not(.active) { border-color: #FF8E00; }
  .btm-tab:hover .btm-tab-inner:not(.active) svg { color: #FF8E00; }
  .btm-tab:hover .btm-tab-inner:not(.active) .btm-label { color: #FF8E00; }
  .btm-tab-inner.active { background: #FF8E00; border-color: #FF8E00; }
  .btm-tab-inner.active svg { color: #fff; }
  .btm-tab-inner.active .btm-label { color: #fff; }
  .btm-label {
    font-size: 10px; font-weight: 600; color: #4A5565; line-height: 1;
    transition: color 0.12s; font-family: 'Inter', system-ui, sans-serif;
  }

  /* ── Mobile avatar chip ───────────────────────────────────── */
  .mob-av-wrap { position: relative; margin-left: 3px; }
  .mob-av {
    width: 32px; height: 32px; border-radius: 50%;
    background: #FF8E00; color: #fff;
    font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; border: none; cursor: pointer; padding: 0;
    transition: opacity 0.15s; flex-shrink: 0;
  }
  .mob-av.guest { background: #bbb; }
  .mob-av:hover { opacity: 0.85; }
  .mob-av img { width: 100%; height: 100%; object-fit: cover; }
`;

/* ── Page -> active tab map ───────────────────────────────────── */
const PAGE_TO_TAB = {
  home: "Home", course: "Home", modules: "Home", lessons: "Home", player: "Home",
  discover: "Discover",
  dashboard: "Dashboard",
  likes: "Likes",
  bookmarks: "Bookmarks",
};

/* ── Shared profile dropdown content ─────────────────────────── */
function ProfileDropdown({ onClose, auth, settings, onSaveSettings, languages, onOpenSettings, isGuest, rawLabel }) {
  const s = settings || {};
  const langs = languages || [];

  const handleFont = (key) => {
    onSaveSettings && onSaveSettings({ ...s, fontSize: key });
  };
  const handleLang = (l) => {
    onSaveSettings && onSaveSettings({ ...s, languageId: l.language_id, languageCode: l.language_code, languageName: l.language });
  };

  return (
    <div className="prof-dropdown">
      {/* ── Name ── */}
      <div className="prof-dd-name">
        <span>{isGuest ? "Guest" : "Signed in as"}</span>
        {isGuest ? "Browsing as Guest" : rawLabel}
      </div>
      {!isGuest && (
        <button className="prof-dd-item"
          onClick={() => { onClose(); auth.onProfile(); }}>
          Edit Profile
        </button>
      )}

      <div className="prof-dd-divider" />

      {/* ── Font Size ── */}
      <div className="prof-dd-section">
        <span className="prof-dd-section-label">Text Size</span>
        <div className="prof-font-btns">
          {FONT_OPTIONS.map(f => (
            <button key={f.key}
              className={"prof-font-btn" + (s.fontSize === f.key ? " active" : "")}
              onClick={() => handleFont(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="prof-dd-divider" />

      {/* ── Language ── */}
      {langs.length > 0 && (
        <>
          <div className="prof-dd-section">
            <span className="prof-dd-section-label">Language</span>
            <div className="prof-lang-list">
              {langs.map(l => (
                <button key={l.language_id}
                  className={"prof-lang-btn" + (s.languageId === l.language_id ? " active" : "")}
                  onClick={() => handleLang(l)}>
                  <span className="prof-lang-check">{s.languageId === l.language_id ? "✓" : ""}</span>
                  {l.language}
                </button>
              ))}
            </div>
          </div>
          <div className="prof-dd-divider" />
        </>
      )}

      {/* ── Settings ── */}
      <button className="prof-dd-item"
        onClick={() => { onClose(); onOpenSettings && onOpenSettings(); }}>
        Settings
      </button>

      <div className="prof-dd-divider" />

      {/* ── Sign out / Guest actions ── */}
      {isGuest ? (
        <>
          <button className="prof-dd-item highlight"
            onClick={() => { onClose(); auth.onSignIn(); }}>
            &#x2728; Create Account / Sign In
          </button>
          <button className="prof-dd-item danger"
            onClick={() => { onClose(); auth.onSignOut(); }}>
            Leave Guest Session
          </button>
        </>
      ) : (
        <button className="prof-dd-item danger"
          onClick={() => { onClose(); auth.onSignOut(); }}>
          Sign Out
        </button>
      )}
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────── */
export default function PageHeader({
  onHome, onOpenSettings, navLinks = [], onResume,
  isAdmin, onAdmin, userEditorialRole, onEditor,
  activePage = "",
  settings, onSaveSettings, languages = [],
}) {
  const auth = useAuthContext();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [mobDdOpen,  setMobDdOpen]  = useState(false);
  const [imgError,   setImgError]   = useState(false);
  const avatarWrapRef = useRef(null);
  const mobAvatarRef  = useRef(null);

  const user    = auth?.user;
  const profile = auth?.profile;
  const isGuest = user?.is_anonymous === true;

  const avatarUrl   = (!imgError && !isGuest && profile?.avatar_url) ? profile.avatar_url : null;
  const rawLabel    = isGuest
    ? "Guest"
    : (profile?.display_name || (user?.email ? user.email.split("@")[0] : ""));
  const avatarLabel = isGuest ? "G" : (rawLabel.slice(0, 2).toUpperCase() || "?");
  const activeTab   = PAGE_TO_TAB[activePage] || "";

  /* hasResume: only for logged-in users with a saved route */
  const hasResume = !!(onResume && !isGuest && profile?.last_visited_route);

  useEffect(() => { setImgError(false); }, [profile?.avatar_url]);

  /* Desktop dropdown: close on outside click */
  useEffect(() => {
    if (!avatarOpen) return;
    const onDown = e => {
      if (avatarWrapRef.current && !avatarWrapRef.current.contains(e.target))
        setAvatarOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [avatarOpen]);

  /* Mobile dropdown: close on outside click */
  useEffect(() => {
    if (!mobDdOpen) return;
    const onDown = e => {
      if (mobAvatarRef.current && !mobAvatarRef.current.contains(e.target))
        setMobDdOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mobDdOpen]);

  const dropdownProps = { auth, settings, onSaveSettings, languages, onOpenSettings, isGuest, rawLabel };

  return (
    <>
      <style>{headerStyles}</style>

      <header className="app-header">

        {/* Logo */}
        <div className="header-logo" onClick={onHome} style={{ cursor: "pointer" }}>
          <img src={logoUrl} alt={APP_NAME}
            onError={e => { e.target.style.display = "none"; }} />
        </div>

        {/* ── Desktop: icon+text nav links ───────────────────── */}
        <nav className="header-nav hdr-desktop" style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, overflowX: "hidden" }}>
          {navLinks.map((l, i) => {
            const Ic = LABEL_IC[l.label];
            const isActive = l.label === activeTab;
            return (
              <button key={i}
                className={"hdr-nav-link" + (isActive ? " active" : "")}
                onClick={l.onClick}
                type="button"
                title={l.label}
              >
                {Ic && <Ic />}
                <span className="hdr-nav-text">{l.label}</span>
              </button>
            );
          })}

          {/* Divider + conditional action links */}
          {(hasResume || (isAdmin && onAdmin) || (userEditorialRole && onEditor)) && (
            <span className="hdr-nav-sep" />
          )}

          {hasResume && (
            <button className="hdr-nav-resume" onClick={onResume} type="button" title="Resume Yatra">
              <IcPlay />
              <span className="hdr-nav-text">Resume Yatra</span>
            </button>
          )}

          {isAdmin && onAdmin && (
            <button className="hdr-nav-admin" onClick={onAdmin} type="button" title="Admin">
              <i className="ti ti-key" style={{fontSize:20}} />
              <span className="hdr-nav-text">Admin</span>
            </button>
          )}

          {userEditorialRole && onEditor && (
            <button className="hdr-nav-editor" onClick={onEditor} type="button" title="Editor">
              <i className="ti ti-pencil" style={{fontSize:20}} />
            </button>
          )}
        </nav>

        {/* ── Desktop: avatar ─────────────────────────────────── */}
        <div className="header-right hdr-desktop">
          {user ? (
            <div className="auth-avatar-wrap" ref={avatarWrapRef}>
              <button
                className={"auth-avatar-btn" + (isGuest ? " guest" : "")}
                onClick={() => setAvatarOpen(o => !o)}
                title={isGuest ? "Guest" : (profile?.display_name || user.email)}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt={avatarLabel}
                      onError={() => setImgError(true)} />
                  : avatarLabel}
              </button>
              {avatarOpen && (
                <ProfileDropdown {...dropdownProps} onClose={() => setAvatarOpen(false)} />
              )}
            </div>
          ) : (
            <button className="register-btn"
              onClick={() => auth?.onSignIn?.()}>
              Sign In
            </button>
          )}
        </div>

        {/* ── Mobile: logo already rendered above, then icon btns + avatar ── */}
        <div className="hdr-mobile" style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>

          {/* Conditional icon buttons */}
          {(hasResume || (isAdmin && onAdmin) || (userEditorialRole && onEditor)) && (
            <div className="mob-header-icons">
              {hasResume && (
                <button className="mob-icon-btn saffron" onClick={onResume} type="button" title="Resume Yatra">
                  <IcPlay />
                </button>
              )}
              {isAdmin && onAdmin && (
                <button className="mob-icon-btn blue" onClick={onAdmin} type="button" title="Admin">
                  <i className="ti ti-key" style={{fontSize:20}} />
                </button>
              )}
              {userEditorialRole && onEditor && (
                <button className="mob-icon-btn purple" onClick={onEditor} type="button" title="Editor">
                  <i className="ti ti-pencil" style={{fontSize:20}} />
                </button>
              )}
            </div>
          )}

          {/* Avatar chip */}
          <div className="mob-av-wrap" ref={mobAvatarRef}>
            {user ? (
              <button
                className={"mob-av" + (isGuest ? " guest" : "")}
                onClick={() => setMobDdOpen(o => !o)}
                title={isGuest ? "Guest" : rawLabel}
                type="button"
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt={avatarLabel}
                      onError={() => setImgError(true)} />
                  : avatarLabel}
              </button>
            ) : (
              <button className="mob-av guest"
                onClick={() => auth?.onSignIn?.()}
                title="Sign In" type="button">
                ?
              </button>
            )}
            {mobDdOpen && (
              <ProfileDropdown {...dropdownProps} onClose={() => setMobDdOpen(false)} />
            )}
          </div>
        </div>

      </header>

      {/* ── Bottom tab bar — mobile/tablet only ──────────────── */}
      <nav className="btm-nav hdr-mobile" aria-label="Main navigation">
        {navLinks.map((l, i) => {
          const Ic = LABEL_IC[l.label];
          if (!Ic) return null;
          const isActive = l.label === activeTab;
          return (
            <button key={i} className="btm-tab" onClick={l.onClick}
              type="button" aria-label={l.label}>
              <span className={"btm-tab-inner" + (isActive ? " active" : "")}>
                <Ic />
                <span className="btm-label">{l.label}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
