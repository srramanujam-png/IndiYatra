import { useState, useEffect } from "react";
import { track } from "../lib/track";

// Shared share sheet for the Snippet and Quiz players.
//   text : full message. If it does not already contain `url`, the url is appended.
//   url  : deep link to the shared item (falls back to the site root at call site).
// Channels: native phone share sheet (when the browser has one), WhatsApp, X, copy.

const styles = `
  .sp-overlay {
    position: fixed; inset: 0; z-index: 260;
    background: rgba(0,0,0,0.35); backdrop-filter: blur(2px);
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.15s ease;
  }
  .sp-sheet {
    background: white; border-radius: 16px 16px 0 0; width: 100%; max-width: 680px;
    padding: 20px 24px calc(32px + env(safe-area-inset-bottom, 0px));
    animation: spSlideUp 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.10);
  }
  @keyframes spSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .sp-handle { width: 40px; height: 4px; background: var(--color-border); border-radius: 2px; margin: 0 auto 16px; }
  .sp-title { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.125rem; font-weight: 500; color: var(--color-text-main); margin-bottom: 6px; }
  .sp-sub { font-size: 0.875rem; color: var(--color-text-body); margin-bottom: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .sp-btns { display: flex; flex-direction: column; gap: 10px; }
  .sp-btn {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 13px 18px; border-radius: 12px; border: 1px solid; background: white; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.9375rem; font-weight: 500;
    transition: opacity 0.15s; text-decoration: none; min-height: 48px;
  }
  .sp-btn:hover { opacity: 0.82; }
  .sp-native { border-color: var(--color-accent); color: var(--color-accent); }
  .sp-wa   { border-color: #25D366; color: #25D366; }
  .sp-tw   { border-color: var(--color-text-main); color: var(--color-text-main); }
  .sp-copy { border-color: var(--color-primary); color: var(--color-primary); }
  .sp-copy.copied { border-color: var(--color-secondary); color: var(--color-secondary); }
  .sp-copy.failed { border-color: #DC2626; color: #DC2626; }
  .sp-cancel {
    margin-top: 8px; padding: 12px; border-radius: 12px; border: none; width: 100%; min-height: 44px;
    background: var(--color-border-muted); color: var(--color-text-body); cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; font-size: 0.9375rem; font-weight: 500;
  }
  .sp-cancel:hover { background: var(--color-border); }
`;

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export default function SharePopover({ open, onClose, title = "Share", subtitle = "", text, url, contentType, contentId }) {
  const [state, setState] = useState("idle"); // idle | copied | failed
  useEffect(() => { if (open) setState("idle"); }, [open]);
  if (!open) return null;

  const fullText = text && text.includes(url) ? text : (text ? text + "\n" : "") + url;
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const log = channel => track("share", { contentType, contentId, meta: { channel } });

  async function nativeShare() {
    log("native");
    try { await navigator.share({ title: subtitle || title, text: fullText }); onClose(); }
    catch { /* user dismissed the phone sheet — stay open */ }
  }
  async function copy() {
    log("copy");
    const ok = await copyText(fullText);
    setState(ok ? "copied" : "failed");
    if (ok) setTimeout(onClose, 1500);
  }

  return (
    <>
      <style>{styles}</style>
      <div className="sp-overlay" onClick={onClose}>
        <div className="sp-sheet" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
          <div className="sp-handle" />
          <div className="sp-title">{title}</div>
          {subtitle && <div className="sp-sub">{subtitle}</div>}
          <div className="sp-btns">
            {canNative && (
              <button className="sp-btn sp-native" onClick={nativeShare}>
                <i className="ti ti-share-3" style={{ fontSize: 20 }} /> Share via…
              </button>
            )}
            <a className="sp-btn sp-wa" href={"https://wa.me/?text=" + encodeURIComponent(fullText)} target="_blank" rel="noopener noreferrer"
               onClick={() => { log("whatsapp"); onClose(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.854L.057 23.75a.5.5 0 0 0 .614.612l5.96-1.46A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.028-1.385l-.36-.214-3.732.914.944-3.635-.234-.374A9.817 9.817 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
              WhatsApp
            </a>
            <a className="sp-btn sp-tw" href={"https://twitter.com/intent/tweet?text=" + encodeURIComponent(fullText)} target="_blank" rel="noopener noreferrer"
               onClick={() => { log("twitter"); onClose(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Post on X
            </a>
            <button className={"sp-btn sp-copy" + (state === "copied" ? " copied" : state === "failed" ? " failed" : "")} onClick={copy}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              {state === "copied" ? "Copied!" : state === "failed" ? "Couldn't copy — long-press the text to copy" : "Copy link"}
            </button>
          </div>
          <button className="sp-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>
  );
}
