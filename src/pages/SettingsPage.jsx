import { useState, useEffect } from "react";
import { DEFAULT_SHARE_MSG, DEFAULT_SNIPPET_SHARE_MSG } from "../config/appStrings";
import { updateDisplayName, updateShareMessage, updateSnippetShareMessage } from "../lib/auth";
import { SAFFRON, HERITAGE, GREEN, PARCHMENT } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";

// DEFAULT_SHARE_MSG from appStrings
// DEFAULT_SNIPPET_SHARE_MSG from appStrings
const styles = `
  .settings-body {
    max-width: 640px; margin: 0 auto; padding: 28px 1.5rem 80px;
  }
  .settings-card {
    background: white; border-radius: 14px; padding: 22px;
    margin-bottom: 24px; box-shadow: none;
    border: 1px solid rgba(0,0,0,0.07);
  }
  .settings-card-label {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #aaa; margin-bottom: 16px;
  }
  .settings-field-label {
    display: block; font-size: 0.875rem; color: #555; margin-bottom: 6px;
  }
  .settings-input {
    width: 100%; border: 1.5px solid #e8d5b0; border-radius: 10px;
    padding: 10px 14px; font-family: 'Source Sans 3', sans-serif; font-size: 1rem;
    color: #0A0A0A; outline: none; transition: border-color 0.2s; background: white;
    box-sizing: border-box;
  }
  .settings-input:focus { border-color: ${SAFFRON}; }
  .settings-input:disabled { background: #f9f5ef; color: #aaa; cursor: not-allowed; }
  .settings-textarea {
    width: 100%; border: 1.5px solid #e8d5b0; border-radius: 10px;
    padding: 10px 14px; font-family: 'Source Sans 3', sans-serif; font-size: 0.9375rem;
    color: #0A0A0A; outline: none; transition: border-color 0.2s; background: white;
    resize: vertical; min-height: 80px; line-height: 1.5; box-sizing: border-box;
  }
  .settings-textarea:focus { border-color: ${SAFFRON}; }
  .settings-save-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
  .settings-save-btn {
    background: ${SAFFRON}; color: white; border: none; border-radius: 10px;
    padding: 10px 24px; font-family: 'Alumni Sans', sans-serif; font-size: 1rem;
    font-weight: 700; cursor: pointer; min-height: 44px; letter-spacing: 0.02em;
    transition: box-shadow 0.2s; white-space: nowrap;
  }
  .settings-save-btn:hover { box-shadow: 0 4px 16px ${SAFFRON}55; }
  .settings-save-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
  .settings-status { font-size: 0.875rem; }
  .settings-status.saved { color: ${GREEN}; }
  .settings-status.error { color: #c0392b; }
  .settings-status.saving { color: #aaa; }
  .settings-lang-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .settings-lang-btn {
    padding: 12px 12px; border-radius: 10px; border: 1.5px solid #e8d5b0;
    background: white; cursor: pointer; font-size: 0.9375rem; font-weight: 600;
    color: #555; transition: all 0.15s; text-align: left;
    display: flex; flex-direction: column; gap: 2px; min-height: 48px;
  }
  .settings-lang-btn:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .settings-lang-btn.active { border-color: ${SAFFRON}; background: ${SAFFRON}11; color: ${SAFFRON}; }
  .settings-lang-native { font-size: 0.8125rem; opacity: 0.7; }
  .settings-fs-row { display: flex; gap: 8px; }
  .settings-fs-btn {
    flex: 1; padding: 12px; border-radius: 10px; border: 1.5px solid #e8d5b0;
    background: white; cursor: pointer; font-weight: 700; color: #555;
    transition: all 0.15s; text-align: center; min-height: 48px; font-size: 1rem;
  }
  .settings-fs-btn:hover { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .settings-fs-btn.active { border-color: ${SAFFRON}; background: ${SAFFRON}11; color: ${SAFFRON}; }
  .settings-hint { font-size: 0.8125rem; color: #aaa; margin-top: 8px; line-height: 1.4; }
  .settings-guest-note {
    background: #fff8ed; border: 1.5px solid #ffe0a0; border-radius: 10px;
    padding: 12px 14px; font-size: 0.875rem; color: #a06800; margin-bottom: 16px;
  }
  .settings-code {
    background: #f5f0e8; padding: 1px 5px; border-radius: 4px; font-size: 0.8125rem;
  }
  .settings-reset-btn {
    background: none; border: none; font-size: 0.8125rem; color: #aaa;
    cursor: pointer; padding: 0;
  }
  .settings-reset-btn:hover { color: ${SAFFRON}; }
  @media (max-width: 768px) {
    .settings-body { padding: 20px 1rem 80px; }
    .settings-card { padding: 18px 16px; }
  }
  @media (max-width: 480px) {
    .settings-body { padding: 16px 0.875rem 60px; }
    .settings-lang-grid { grid-template-columns: 1fr 1fr; }
    .settings-save-btn { width: 100%; justify-content: center; }
  }
`;

export default function SettingsPage({
  settings,
  onSaveSettings,
  onBack,
  onHome,
  onDashboard,
  onLikes,
  onBookmarks,
  onDiscover,
  onOpenSettings,
  onResume,
  languages,
  refreshProfile,
  user,
  profile,
  isAdmin, userEditorialRole, onEditor,
  onAdmin,
  activePage,
}) {
  /* ── Local state ──────────────────────────────────────────────── */
  const [displayName,        setDisplayName]        = useState("");
  const [shareMsg,           setShareMsg]           = useState("");
  const [snippetShareMsg,    setSnippetShareMsg]    = useState("");
  const [nameStatus,         setNameStatus]         = useState(null);
  const [msgStatus,          setMsgStatus]          = useState(null);
  const [snippetMsgStatus,   setSnippetMsgStatus]   = useState(null);
  const [shareMsgLoaded,     setShareMsgLoaded]     = useState(false);
  const [snippetMsgLoaded,   setSnippetMsgLoaded]   = useState(false);

  /* ── Hydrate ──────────────────────────────────────────────────── */
  useEffect(() => {
    setDisplayName(profile?.display_name || user?.email?.split("@")[0] || "");
  }, [profile, user]);

  useEffect(() => {
    if (shareMsgLoaded) return;
    const fromProfile = profile?.share_message;
    const fromStorage = localStorage.getItem("indiyatra_share_message");
    setShareMsg(fromProfile || fromStorage || DEFAULT_SHARE_MSG);
    setShareMsgLoaded(true);
  }, [profile, shareMsgLoaded]);

  useEffect(() => {
    if (snippetMsgLoaded) return;
    const fromProfile = profile?.snippet_share_message;
    const fromStorage = localStorage.getItem("indiyatra_snippet_share_message");
    setSnippetShareMsg(fromProfile || fromStorage || DEFAULT_SNIPPET_SHARE_MSG);
    setSnippetMsgLoaded(true);
  }, [profile, snippetMsgLoaded]);

  /* ── Handlers ─────────────────────────────────────────────────── */
  function selectLanguage(lang) {
    onSaveSettings({
      languageId:   lang.language_id,
      languageCode: lang.language_code,
      languageName: lang.language,
    });
  }

  function selectFontSize(size) {
    onSaveSettings({ fontSize: size });
  }

  async function saveDisplayName() {
    if (!user?.id) return;
    setNameStatus("saving");
    const { error } = await updateDisplayName(user.id, displayName.trim());
    if (error) {
      setNameStatus("error");
    } else {
      setNameStatus("saved");
      if (refreshProfile) refreshProfile();
      setTimeout(() => setNameStatus(null), 2500);
    }
  }

  async function saveShareMessage() {
    const trimmed = shareMsg.trim() || DEFAULT_SHARE_MSG;
    setMsgStatus("saving");
    localStorage.setItem("indiyatra_share_message", trimmed);
    if (user?.id) {
      const { error } = await updateShareMessage(user.id, trimmed);
      if (error) { setMsgStatus("error"); return; }
      if (refreshProfile) refreshProfile();
    }
    setMsgStatus("saved");
    setTimeout(() => setMsgStatus(null), 2500);
  }

  async function saveSnippetShareMessage() {
    const trimmed = snippetShareMsg.trim() || DEFAULT_SNIPPET_SHARE_MSG;
    setSnippetMsgStatus("saving");
    localStorage.setItem("indiyatra_snippet_share_message", trimmed);
    if (user?.id) {
      const { error } = await updateSnippetShareMessage(user.id, trimmed);
      if (error) { setSnippetMsgStatus("error"); return; }
      if (refreshProfile) refreshProfile();
    }
    setSnippetMsgStatus("saved");
    setTimeout(() => setSnippetMsgStatus(null), 2500);
  }

  /* ── Derived ──────────────────────────────────────────────────── */
  const isGuest    = !user?.id || user?.is_anonymous;
  const activeSize = settings?.fontSize || "medium";
  const activeLang = settings?.languageId;

  const navLinks = [
    { label: "Home",      onClick: onHome },
    { label: "Discover",  onClick: onDiscover },
    { label: "Dashboard", onClick: onDashboard },
    { label: "Likes",     onClick: onLikes },
    { label: "Bookmarks", onClick: onBookmarks },
  ];

  return (
    <>
      <style>{globalStyles + styles}</style>

      <PageHeader
        onHome={onHome}
        onOpenSettings={onOpenSettings}
        onResume={onResume}
        isAdmin={isAdmin}
        onAdmin={onAdmin}
        userEditorialRole={userEditorialRole}
        onEditor={onEditor}
        activePage={activePage}
        settings={settings}
        onSaveSettings={onSaveSettings}
        languages={languages}
        navLinks={navLinks}
      />

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a onClick={onHome}>Home</a>
        <span className="sep">/</span>
        <span className="current">Settings</span>
      </div>

      {/* Hero */}
      <div className="page-hero">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Personalise your IndiYatra experience.</div>
      </div>

      <div className="settings-body">

        {/* ── Your Profile ── */}
        <div className="settings-card">
          <div className="settings-card-label">Your Profile</div>
          {isGuest && (
            <div className="settings-guest-note">
              👤 You're browsing as a guest. Sign in to save your display name across devices.
            </div>
          )}
          <label className="settings-field-label">Display Name</label>
          <input
            className="settings-input"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            disabled={isGuest}
          />
          {!isGuest && (
            <div className="settings-save-row">
              <button
                className="settings-save-btn"
                onClick={saveDisplayName}
                disabled={nameStatus === "saving"}
              >
                {nameStatus === "saving" ? "Saving…" : "Save Name"}
              </button>
              {nameStatus === "saved" && <span className="settings-status saved">✓ Saved</span>}
              {nameStatus === "error"  && <span className="settings-status error">Error — try again</span>}
            </div>
          )}
        </div>

        {/* ── Language ── */}
        <div className="settings-card">
          <div className="settings-card-label">Language</div>
          <div className="settings-lang-grid">
            {(languages || []).map(lang => (
              <button
                key={lang.language_id}
                className={"settings-lang-btn" + (activeLang === lang.language_id ? " active" : "")}
                onClick={() => selectLanguage(lang)}
              >
                <span>{lang.language}</span>
                {lang.native_name && (
                  <span className="settings-lang-native">{lang.native_name}</span>
                )}
              </button>
            ))}
          </div>
          <p className="settings-hint">Language saves automatically. Content will reload in your chosen language.</p>
        </div>

        {/* ── Text Size ── */}
        <div className="settings-card">
          <div className="settings-card-label">Text Size</div>
          <div className="settings-fs-row">
            {[
              { key: "small",  label: "A",  style: { fontSize: "0.875rem" } },
              { key: "medium", label: "A",  style: { fontSize: "1rem"     } },
              { key: "large",  label: "A",  style: { fontSize: "1.25rem"  } },
            ].map(({ key, label, style }) => (
              <button
                key={key}
                className={"settings-fs-btn" + (activeSize === key ? " active" : "")}
                style={style}
                onClick={() => selectFontSize(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="settings-hint">Text size saves automatically and applies to snippet content.</p>
        </div>

        {/* ── Share Message ── */}
        <div className="settings-card">
          <div className="settings-card-label">Share Message</div>
          <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: 10, lineHeight: 1.5 }}>
            Customise the message shared when you invite friends. Use{" "}
            <code className="settings-code">{"{dharma}"}</code>{" "}
            and{" "}
            <code className="settings-code">{"{lessons}"}</code>{" "}
            as placeholders.
          </p>
          <textarea
            className="settings-textarea"
            value={shareMsg}
            onChange={e => setShareMsg(e.target.value)}
            rows={4}
            maxLength={300}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span className="settings-hint" style={{ margin: 0 }}>{shareMsg.length}/300 characters</span>
            <button
              className="settings-reset-btn"
              onClick={() => setShareMsg(DEFAULT_SHARE_MSG)}
            >
              Reset to default
            </button>
          </div>
          <div className="settings-save-row">
            <button
              className="settings-save-btn"
              onClick={saveShareMessage}
              disabled={msgStatus === "saving"}
            >
              {msgStatus === "saving" ? "Saving…" : "Save Message"}
            </button>
            {msgStatus === "saved" && <span className="settings-status saved">✓ Saved</span>}
            {msgStatus === "error"  && <span className="settings-status error">Error — try again</span>}
          </div>
          {isGuest && (
            <p className="settings-hint" style={{ marginTop: 10 }}>
              Saved locally on this device. Sign in to sync across devices.
            </p>
          )}
        </div>

        {/* ── Snippet Share Message ── */}
        <div className="settings-card">
          <div className="settings-card-label">Snippet Share Message</div>
          <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: 10, lineHeight: 1.5 }}>
            Customise the message shared when you share a snippet with friends.
          </p>
          <textarea
            className="settings-textarea"
            value={snippetShareMsg}
            onChange={e => setSnippetShareMsg(e.target.value)}
            rows={4}
            maxLength={300}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span className="settings-hint" style={{ margin: 0 }}>{snippetShareMsg.length}/300 characters</span>
            <button
              className="settings-reset-btn"
              onClick={() => setSnippetShareMsg(DEFAULT_SNIPPET_SHARE_MSG)}
            >
              Reset to default
            </button>
          </div>
          <div className="settings-save-row">
            <button
              className="settings-save-btn"
              onClick={saveSnippetShareMessage}
              disabled={snippetMsgStatus === "saving"}
            >
              {snippetMsgStatus === "saving" ? "Saving…" : "Save Message"}
            </button>
            {snippetMsgStatus === "saved" && <span className="settings-status saved">✓ Saved</span>}
            {snippetMsgStatus === "error"  && <span className="settings-status error">Error — try again</span>}
          </div>
          {isGuest && (
            <p className="settings-hint" style={{ marginTop: 10 }}>
              Saved locally on this device. Sign in to sync across devices.
            </p>
          )}
        </div>

      </div>
    </>
  );
}
