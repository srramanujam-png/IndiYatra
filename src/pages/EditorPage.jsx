import { useState, useEffect, useCallback, useMemo } from "react";
import PageHeader from "../components/PageHeader";
import { globalStyles } from "../styles/global";
import {
  loadAllDrafts, loadMyDrafts, loadReviewQueue,
  assignDraft, updateDraftStatus, loadDraftEvents,
  getEditorialStaff,
  loadDraftContent, loadExistingTaxonomy, loadTaxonomyTerms,
  uploadSnippetImage, loadSnippetAsset,
  saveDraftData, submitDraft, publishDraft,
  loadSnippetsForAssignment, loadLessonsForAssignment,
  checkActiveDrafts,
  loadContentRoles, assignContentRole, revokeContentRole,
  loadAllContentRoleAssignments, deleteAssignment,
} from "../lib/auth";
import { supabase } from "../lib/supabase";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  unassigned:      { label: "Unassigned",       bg: "#F8F8F6", color: "#1F1F1F"     },
  assigned:        { label: "Assigned",          bg: "#EEF5FF", color: "#1a56c9" },
  in_draft:        { label: "In Draft",          bg: "white", color: "#FF8E00" },
  submitted:       { label: "Submitted",         bg: "#F3E5F5", color: "#6a1b8a" },
  needs_revision:  { label: "Needs Revision",    bg: "#FFF3CD", color: "#856404" },
  approved:        { label: "Approved",          bg: "#E8F5E9", color: "#1a7a3a" },
  published:       { label: "Published",         bg: "#E8F5E9", color: "#00509E" },
  rejected:        { label: "Rejected",          bg: "#FFEBEE", color: "#c62828" },
};

const EDITOR_STYLES = `
  .editor-page { max-width: 900px; margin: 0 auto; padding: 24px 16px 80px; }

  .ep-hero {
    background: #00509E;
    border-radius: 14px; padding: 24px 28px; color: #fff;
    margin-bottom: 28px;
  }
  .ep-hero h1 {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.75rem;
    font-weight: 800; margin: 0 0 4px; letter-spacing: 0.01em;
  }
  .ep-hero p { opacity: 0.8; font-size: 0.9375rem; margin: 0; }
  .ep-role-badge {
    display: inline-block; background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.35); border-radius: 999px;
    padding: 3px 14px; font-size: 0.8125rem; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 10px;
  }

  .ep-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; margin-bottom: 28px; }
  .ep-stat {
    background: #fff; border-radius: 12px; border: 1px solid rgba(0,0,0,0.10);
    padding: 14px 16px; text-align: center;
  }
  .ep-stat-num { font-family: 'Alumni Sans', sans-serif; font-size: 1.875rem; font-weight: 800; color: #FF8E00; line-height: 1; }
  .ep-stat-lbl { font-size: 0.75rem; color: #6B6B6B; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

  .ep-section { margin-bottom: 32px; }
  .ep-section-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem;
    font-weight: 800; color: #0A0A0A; margin: 0 0 14px;
    border-left: 4px solid #FF8E00; padding-left: 12px;
  }

  /* Assignment form */
  .ep-form {
    background: #fff; border-radius: 14px; border: 1px solid rgba(0,0,0,0.10);
    padding: 22px 24px; margin-bottom: 24px;
  }
  .ep-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 560px) { .ep-form-grid { grid-template-columns: 1fr; } }
  .ep-field { display: flex; flex-direction: column; gap: 5px; }
  .ep-field label { font-size: 0.8125rem; font-weight: 700; color: #1F1F1F; text-transform: uppercase; letter-spacing: 0.05em; }
  .ep-field input,
  .ep-field select,
  .ep-field textarea {
    border: 1.5px solid #ddd; border-radius: 8px; padding: 9px 12px;
    font-size: 0.9375rem; font-family: 'Source Sans 3', sans-serif;
    background: white; transition: border-color 0.15s; outline: none;
  }
  .ep-field input:focus,
  .ep-field select:focus,
  .ep-field textarea:focus { border-color: #FF8E00; background: #fff; }
  .ep-field textarea { resize: vertical; min-height: 68px; }
  .ep-form-actions { margin-top: 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

  .ep-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 22px; border-radius: 999px; border: none;
    font-size: 0.9375rem; font-weight: 700; cursor: pointer;
    transition: opacity 0.15s, transform 0.12s;
  }
  .ep-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .ep-btn:active { transform: translateY(0); }
  .ep-btn-primary   { background: #FF8E00; color: #fff; }
  .ep-btn-secondary { background: #f0f0f0; color: #333; }
  .ep-btn-heritage  { background: #00509E; color: #fff; }
  .ep-btn-sm { padding: 6px 14px; font-size: 0.8125rem; border-radius: 999px; border: none; font-weight: 700; cursor: pointer; transition: opacity 0.12s; }
  .ep-btn-sm:hover { opacity: 0.82; }
  .ep-btn-approve  { background: #E8F5E9; color: #1a7a3a; }
  .ep-btn-reject   { background: #FFEBEE; color: #c62828; }
  .ep-btn-sendback { background: white; color: #b86000; }
  .ep-btn-publish  { background: #00509E; color: #fff; }

  /* Tables */
  .ep-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(0,0,0,0.10); }
  .ep-table { width: 100%; border-collapse: collapse; background: #fff; }
  .ep-table th {
    padding: 11px 14px; text-align: left; font-size: 0.75rem;
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    color: #6B6B6B; background: white; border-bottom: 1px solid rgba(0,0,0,0.10); white-space: nowrap;
  }
  .ep-table td { padding: 12px 14px; font-size: 0.9rem; border-bottom: 1px solid #f0ece5; vertical-align: middle; }
  .ep-table tr:last-child td { border-bottom: none; }
  .ep-table tr:hover td { background: #fffdf7; }

  .ep-status-badge {
    display: inline-block; padding: 3px 10px; border-radius: 999px;
    font-size: 0.75rem; font-weight: 700; white-space: nowrap;
  }
  .ep-content-type {
    display: inline-block; padding: 2px 8px; border-radius: 6px;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    background: #EEF5FF; color: #1a56c9;
  }
  .ep-content-type.lesson { background: white; color: #b86000; }

  .ep-empty { text-align: center; padding: 48px 24px; color: #aaa; font-size: 1rem; }
  .ep-empty-icon { font-size: 2.5rem; margin-bottom: 8px; }

  /* ── Slide-in panels (log + edit form) ─────────────────── */
  .ep-panel {
    position: fixed; top: 0; right: 0; height: 100vh; background: #fff; z-index: 800;
    box-shadow: -4px 0 32px rgba(0,0,0,0.12);
    display: flex; flex-direction: column;
    animation: slideInRight 0.25s ease both;
  }
  .ep-panel-sm { width: min(420px, 100vw); }
  .ep-panel-lg { width: min(640px, 100vw); }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  .ep-panel-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 799;
    animation: fadeIn 0.2s ease both;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .ep-panel-header {
    padding: 18px 20px; border-bottom: 1.5px solid #eee;
    display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-shrink: 0;
  }
  .ep-panel-header-text h3 { font-family: 'Alumni Sans', sans-serif; font-size: 1.125rem; font-weight: 800; color: #0A0A0A; margin: 0 0 2px; }
  .ep-panel-header-text p  { font-size: 0.8125rem; color: #6B6B6B; margin: 0; }
  .ep-panel-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6B6B6B; flex-shrink: 0; padding: 2px 6px; }
  .ep-panel-body { flex: 1; overflow-y: auto; padding: 20px; }
  .ep-panel-footer {
    padding: 14px 20px; border-top: 1.5px solid #eee; flex-shrink: 0;
    display: flex; gap: 10px; flex-wrap: wrap;
  }

  /* Edit form specifics */
  .ep-edit-field { margin-bottom: 16px; }
  .ep-edit-field label {
    display: block; font-size: 0.8125rem; font-weight: 700; color: #1F1F1F;
    text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px;
  }
  .ep-edit-field .ep-hint { font-size: 0.75rem; color: #aaa; font-weight: 400; text-transform: none; letter-spacing: 0; }
  .ep-edit-field input,
  .ep-edit-field textarea {
    width: 100%; box-sizing: border-box;
    border: 1.5px solid #ddd; border-radius: 8px; padding: 9px 12px;
    font-size: 0.9375rem; font-family: 'Source Sans 3', sans-serif;
    background: white; transition: border-color 0.15s; outline: none; resize: vertical;
  }
  .ep-edit-field input:focus,
  .ep-edit-field textarea:focus { border-color: #FF8E00; background: #fff; }
  .ep-edit-field textarea.short { min-height: 56px; }
  .ep-edit-field textarea.tall  { min-height: 100px; }
  .ep-section-divider { border: none; border-top: 1.5px solid #f0ece5; margin: 20px 0; }

  /* Taxonomy picker */
  .ep-tax-section h4 { font-size: 0.875rem; font-weight: 700; color: #0A0A0A; margin: 0 0 6px; }
  .ep-tax-group { margin-bottom: 12px; }
  .ep-tax-group-label { font-size: 0.75rem; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .ep-tax-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .ep-tax-pill {
    padding: 4px 12px; border-radius: 999px; font-size: 0.8125rem; font-weight: 600;
    cursor: pointer; border: 1.5px solid; transition: all 0.12s;
    user-select: none;
  }
  .ep-tax-pill.existing { background: #E8F5E9; border-color: #a5d6a7; color: #1a7a3a; cursor: default; }
  .ep-tax-pill.selected { background: #FF8E00; border-color: #FF8E00; color: #fff; }
  .ep-tax-pill.available { background: white; border-color: rgba(0,0,0,0.12); color: #1F1F1F; }
  .ep-tax-pill.available:hover { border-color: #FF8E00; color: #FF8E00; }
  .ep-tax-note { font-size: 0.75rem; color: #aaa; margin-top: 6px; }

  /* ── Centred modal (activity log) ──────────────────────────── */
  .ep-modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 900;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    animation: fadeIn 0.18s ease both;
  }
  .ep-modal {
    background: #fff; border-radius: 14px; width: min(460px, 100%);
    max-height: 80vh; display: flex; flex-direction: column;
    box-shadow: 0 8px 40px rgba(0,0,0,0.22);
    animation: scaleUp 0.18s ease both;
  }
  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .ep-modal-header {
    padding: 18px 20px 14px; border-bottom: 1.5px solid #eee;
    display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
  }
  .ep-modal-header h3 { font-family: 'Alumni Sans', sans-serif; font-size: 1.125rem; font-weight: 800; color: #0A0A0A; margin: 0; }
  .ep-modal-body { flex: 1; overflow-y: auto; padding: 20px; }
  .ep-modal-footer {
    padding: 12px 20px; border-top: 1.5px solid #eee; flex-shrink: 0;
    display: flex; justify-content: flex-end;
  }

  /* Toast */
  .ep-toast {
    position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
    background: #00509E; color: #fff; padding: 10px 22px;
    border-radius: 999px; font-size: 0.875rem; font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25); z-index: 9999;
    animation: fadeUp 0.2s ease both; white-space: nowrap; pointer-events: none;
  }
  @keyframes fadeUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }

  /* Event log */
  .ep-event { display: flex; gap: 12px; margin-bottom: 14px; }
  .ep-event-dot { width: 10px; height: 10px; border-radius: 50%; background: #FF8E00; margin-top: 5px; flex-shrink: 0; }
  .ep-event-action { font-weight: 700; font-size: 0.875rem; color: #0A0A0A; }
  .ep-event-meta   { font-size: 0.8rem; color: #6B6B6B; margin-top: 2px; }
  .ep-event-comment { font-size: 0.875rem; color: #1F1F1F; margin-top: 3px; font-style: italic; }
`;

// ── Shared components ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, bg: "#eee", color: "#1F1F1F" };
  return <span className="ep-status-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

function EmptyState({ msg }) {
  return <div className="ep-empty"><div className="ep-empty-icon">📋</div><div>{msg}</div></div>;
}

function ContentTypeTag({ type }) {
  return (
    <span className={"ep-content-type" + (type === "lesson" ? " lesson" : "")}>
      {type === "lesson" ? "Lesson" : "Snippet"}
    </span>
  );
}

// ── CsTag — content status badge ─────────────────────────────────────────────
// Shows Full / Partial (n/total) / None for a content item in the assignment browser.
function CsTag({ item }) {
  if (item.content_status === "full")
    return <span style={{background:"#E8F5E9",color:"#1a7a3a",fontSize:"0.7rem",padding:"2px 8px",borderRadius:"999px",fontWeight:700,whiteSpace:"nowrap"}}>Full ({item.total_fields}/{item.total_fields})</span>;
  if (item.content_status === "partial")
    return <span style={{background:"white",color:"#FF8E00",fontSize:"0.7rem",padding:"2px 8px",borderRadius:"999px",fontWeight:700,whiteSpace:"nowrap"}}>Partial ({item.filled_count}/{item.total_fields})</span>;
  return <span style={{background:"rgba(0,0,0,0.05)",color:"#6B6B6B",fontSize:"0.7rem",padding:"2px 8px",borderRadius:"999px",fontWeight:700,whiteSpace:"nowrap",border:"1px solid rgba(0,0,0,0.10)"}}>None</span>;
}

// ── SubRoleBadge — pill showing the caller's sub_role for this draft ────────
function SubRoleBadge({ role }) {
  const cfg = SUB_ROLE_CFG.find(r => r.id === role);
  if (!cfg) return <span style={{ color: "#aaa", fontSize: "0.8rem" }}>—</span>;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      fontSize: "0.75rem", fontWeight: 700,
      padding: "3px 10px", borderRadius: "999px",
      whiteSpace: "nowrap", letterSpacing: "0.01em"
    }}>
      {cfg.name}
    </span>
  );
}

// ── SUB_ROLE_CFG — per-content sub-role definitions ─────────────────────────
const SUB_ROLE_CFG = [
  { id: "editor",     name: "Editor",     color: "#1a56c9", bg: "#EEF5FF", desc: "Write and submit drafts for this content" },
  { id: "verifier",   name: "Verifier",   color: "#6a1b8a", bg: "#F3E5F5", desc: "Review and approve submitted drafts" },
  { id: "supervisor", name: "Supervisor", color: "#1a7a3a", bg: "#E8F5E9", desc: "Assign, manage and publish this content" },
];

// ── EventLogPanel ─────────────────────────────────────────────────────────────
function EventLogPanel({ draftId, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import("../lib/auth").then(({ loadDraftEvents }) =>
      loadDraftEvents(draftId).then(({ data }) => { setEvents(data || []); setLoading(false); })
    );
  }, [draftId]);

  function fmtDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="ep-modal-backdrop" onClick={onClose}>
      <div className="ep-modal" onClick={e => e.stopPropagation()}>
        <div className="ep-modal-header">
          <h3>Activity Log</h3>
          <button className="ep-panel-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="ep-modal-body">
          {loading && <p style={{ color: "#aaa", textAlign: "center", paddingTop: 32 }}>Loading&#8230;</p>}
          {!loading && events.length === 0 && <p style={{ color: "#aaa", textAlign: "center", paddingTop: 32 }}>No events yet.</p>}
          {events.map(ev => (
            <div className="ep-event" key={ev.id}>
              <div className="ep-event-dot" />
              <div>
                <div className="ep-event-action">{ev.action}</div>
                <div className="ep-event-meta">{fmtDate(ev.created_at)}</div>
                {ev.comment && <div className="ep-event-comment">&#8220;{ev.comment}&#8221;</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="ep-modal-footer">
          <button className="ep-btn ep-btn-secondary" style={{ padding:"8px 28px" }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── DraftEditForm ─────────────────────────────────────────────────────────────
// Slide-in panel for editors to fill in draft_data.
// Handles both snippet_translation and lesson content types.
function DraftEditForm({ draft, onClose, onSaved, showToast }) {
  const isSnippet = draft.content_type === "snippet_translation";
  const entityType = isSnippet ? "snippet" : "lesson";

  const isEnglish = draft.language_id === "LANG_01";

  // Form state — pre-fill from existing draft_data if present
  const saved = draft.draft_data || {};
  const [fields, setFields] = useState({
    hook:              saved.hook              || "",
    explanation:       saved.explanation       || "",
    key_term:          saved.key_term          || "",
    key_term_meaning:  saved.key_term_meaning  || "",
    life_connection:   saved.life_connection   || "",
    quiz_recap:        saved.quiz_recap        || "",
    source_citation:   saved.source_citation   || "",
    lesson_name:       saved.lesson_name       || "",
    lesson_description:saved.lesson_description|| "",
  });

  // Taxonomy state
  const [allTerms,      setAllTerms]      = useState([]);  // all taxonomy_terms
  const [existingTags,  setExistingTags]  = useState([]); // already tagged
  const [selectedTags,  setSelectedTags]  = useState(saved.taxonomy_additions || []); // new additions in this draft

  // Image state (English / LANG_01 only)
  const [imageUrl,      setImageUrl]      = useState(saved.image_file_path || "");
  const [imageAlt,      setImageAlt]      = useState(saved.image_alt_text  || "");
  const [imageAttrib,   setImageAttrib]   = useState(saved.image_attribution || "");
  const [imageUploading, setImageUploading] = useState(false);
  const [existingImage, setExistingImage] = useState(null); // { file_path, alt_text, attribution }

  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load live content + taxonomy on mount
  useEffect(() => {
    async function load() {
      // Pre-fill with live content if draft_data is empty
      const [contentRes, existingRes, termsRes] = await Promise.all([
        loadDraftContent(draft.content_type, draft.content_id, draft.language_id),
        loadExistingTaxonomy(draft.content_id, entityType),
        loadTaxonomyTerms(),
      ]);

      // Only overwrite form if no draft_data already saved
      if (contentRes.data && Object.keys(saved).length === 0) {
        const c = contentRes.data;
        setFields(f => ({
          ...f,
          hook:               c.hook               || "",
          explanation:        c.explanation        || "",
          key_term:           c.key_term           || "",
          key_term_meaning:   c.key_term_meaning   || "",
          life_connection:    c.life_connection    || "",
          quiz_recap:         c.quiz_recap         || "",
          source_citation:    c.source_citation    || "",
          lesson_name:        c.lesson_name        || "",
          lesson_description: c.lesson_description || "",
        }));
      }

      setExistingTags(existingRes.data || []);
      setAllTerms(termsRes.data       || []);

      // Load existing image for English snippets
      if (isEnglish && draft.content_type === "snippet_translation") {
        const { data: asset } = await loadSnippetAsset(draft.content_id);
        if (asset) setExistingImage(asset);
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  function setField(key, val) {
    setFields(f => ({ ...f, [key]: val }));
  }

  function toggleTag(termId) {
    setSelectedTags(prev =>
      prev.includes(termId) ? prev.filter(t => t !== termId) : [...prev, termId]
    );
  }

  // Client-side resize: shrink to 400px height, preserve aspect ratio
  async function resizeImageTo400Height(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const targetH = 400;
        const ratio   = targetH / img.naturalHeight;
        const targetW = Math.round(img.naturalWidth * ratio);
        const canvas  = document.createElement("canvas");
        canvas.width  = targetW;
        canvas.height = targetH;
        canvas.getContext("2d").drawImage(img, 0, 0, targetW, targetH);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("toBlob failed")),
          "image/jpeg", 0.88);
      };
      img.onerror = reject;
      img.src = objUrl;
    });
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const resized = await resizeImageTo400Height(file);
      const { url, error } = await uploadSnippetImage(resized, draft.content_id);
      if (error) { showToast("Upload failed — " + (error.message || "unknown")); return; }
      setImageUrl(url);
      showToast("Image uploaded ✓");
    } catch (err) {
      showToast("Image resize failed — " + err.message);
    } finally {
      setImageUploading(false);
    }
  }

  function buildDraftData() {
    const base = isSnippet
      ? {
          hook:              fields.hook,
          explanation:       fields.explanation,
          key_term:          fields.key_term,
          key_term_meaning:  fields.key_term_meaning,
          life_connection:   fields.life_connection,
          quiz_recap:        fields.quiz_recap,
          source_citation:   fields.source_citation,
        }
      : {
          lesson_name:        fields.lesson_name,
          lesson_description: fields.lesson_description,
        };
    if (selectedTags.length > 0) base.taxonomy_additions = selectedTags;
    // Include image if English snippet and an image has been uploaded
    if (isEnglish && isSnippet && imageUrl) {
      base.image_file_path   = imageUrl;
      base.image_alt_text    = imageAlt;
      base.image_attribution = imageAttrib;
    }
    return base;
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await saveDraftData(draft.id, buildDraftData());
    setSaving(false);
    if (error) { showToast("Save failed: " + (error.message || "unknown error")); return; }
    showToast("Draft saved ✓");
    onSaved();
  }

  async function handleSubmit() {
    setSubmitting(true);
    const { error } = await submitDraft(draft.id, buildDraftData());
    setSubmitting(false);
    if (error) { showToast("Submit failed: " + (error.message || "unknown error")); return; }
    showToast("Submitted for review ✓");
    onSaved();
    onClose();
  }

  // Group taxonomy terms by type for the picker
  const termsByType = {};
  allTerms.forEach(t => {
    if (!termsByType[t.type]) termsByType[t.type] = [];
    termsByType[t.type].push(t);
  });

  const subtitle = isSnippet
    ? `${draft.content_id} · ${draft.language_id || "—"}`
    : `${draft.content_id}`;

  return (
    <>
      <div className="ep-panel-overlay" onClick={onClose} />
      <div className="ep-panel ep-panel-lg">
        <div className="ep-panel-header">
          <div className="ep-panel-header-text">
            <h3>{isSnippet ? "Edit Snippet Translation" : "Edit Lesson"}</h3>
            <p style={{ fontFamily: "monospace" }}>{subtitle}</p>
          </div>
          <button className="ep-panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="ep-panel-body">
          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center", paddingTop: 40 }}>Loading content…</p>
          ) : (
            <>
              {isSnippet ? (
                <>
                  <div className="ep-edit-field">
                    <label>Hook <span className="ep-hint">— headline shown to the learner</span></label>
                    <textarea className="short" value={fields.hook}
                      onChange={e => setField("hook", e.target.value)}
                      placeholder="Enter the hook / headline text…" />
                  </div>
                  <div className="ep-edit-field">
                    <label>Explanation <span className="ep-hint">— main body text</span></label>
                    <textarea className="tall" value={fields.explanation}
                      onChange={e => setField("explanation", e.target.value)}
                      placeholder="Main explanation paragraph…" />
                  </div>
                  <div className="ep-edit-field">
                    <label>Key Term</label>
                    <input type="text" value={fields.key_term}
                      onChange={e => setField("key_term", e.target.value)}
                      placeholder="e.g. Dharma" />
                  </div>
                  <div className="ep-edit-field">
                    <label>Key Term Meaning</label>
                    <textarea className="short" value={fields.key_term_meaning}
                      onChange={e => setField("key_term_meaning", e.target.value)}
                      placeholder="Definition of the key term…" />
                  </div>
                  <div className="ep-edit-field">
                    <label>Life Connection <span className="ep-hint">— how this relates to daily life</span></label>
                    <textarea className="tall" value={fields.life_connection}
                      onChange={e => setField("life_connection", e.target.value)}
                      placeholder="Connect this concept to everyday experience…" />
                  </div>
                  <div className="ep-edit-field">
                    <label>Quiz Recap</label>
                    <textarea className="short" value={fields.quiz_recap}
                      onChange={e => setField("quiz_recap", e.target.value)}
                      placeholder="Short recap or quiz prompt…" />
                  </div>
                  <div className="ep-edit-field">
                    <label>Source Citation</label>
                    <input type="text" value={fields.source_citation}
                      onChange={e => setField("source_citation", e.target.value)}
                      placeholder="e.g. Mahabharata 12.110.11" />
                  </div>
                </>
              ) : (
                <>
                  <div className="ep-edit-field">
                    <label>Lesson Name</label>
                    <input type="text" value={fields.lesson_name}
                      onChange={e => setField("lesson_name", e.target.value)}
                      placeholder="Lesson title…" />
                  </div>
                  <div className="ep-edit-field">
                    <label>Lesson Description</label>
                    <textarea className="tall" value={fields.lesson_description}
                      onChange={e => setField("lesson_description", e.target.value)}
                      placeholder="Short description shown below the lesson title…" />
                  </div>
                </>
              )}

              {/* Image section — English snippets only */}
              {isSnippet && isEnglish && (
                <>
                  <hr className="ep-section-divider" />
                  <div className="ep-edit-field">
                    <label>Snippet Image
                      <span className="ep-hint"> — English only · resized to 400 px height on upload</span>
                    </label>

                    {/* Preview: uploaded (priority) or existing */}
                    {(imageUrl || existingImage?.file_path) && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "0.75rem", color: "#6B6B6B", marginBottom: 6 }}>
                          {imageUrl ? "New image (will publish with draft):" : "Current live image:"}
                        </div>
                        <img
                          src={imageUrl || existingImage?.file_path}
                          alt={imageAlt || existingImage?.alt_text || "snippet image"}
                          style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 8, objectFit: "cover", border: "1px solid #e5e7eb" }}
                        />
                      </div>
                    )}

                    {/* File picker — hidden input, styled label */}
                    <label style={{
                      display: "inline-block", cursor: imageUploading ? "not-allowed" : "pointer",
                      background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8,
                      padding: "7px 16px", fontSize: "0.875rem", color: "#1F1F1F",
                      opacity: imageUploading ? 0.6 : 1, marginBottom: 10,
                    }}>
                      {imageUploading ? "Uploading…" : imageUrl ? "Replace Image" : "Choose Image"}
                      <input type="file" accept="image/*" onChange={handleImageSelect}
                        disabled={imageUploading} style={{ display: "none" }} />
                    </label>

                    <input type="text" value={imageAlt}
                      onChange={e => setImageAlt(e.target.value)}
                      placeholder="Alt text — brief description for accessibility…"
                      style={{ display: "block", width: "100%", marginBottom: 8,
                        padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8,
                        fontSize: "0.9rem", boxSizing: "border-box" }} />
                    <input type="text" value={imageAttrib}
                      onChange={e => setImageAttrib(e.target.value)}
                      placeholder="Attribution / credit (e.g. Archaeological Survey of India)…"
                      style={{ display: "block", width: "100%",
                        padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8,
                        fontSize: "0.9rem", boxSizing: "border-box" }} />

                    <div className="ep-tax-note" style={{ marginTop: 8 }}>
                      Image is uploaded immediately and saved with the draft. It is applied to the live snippet when the supervisor publishes.
                    </div>
                  </div>
                </>
              )}

              <hr className="ep-section-divider" />

              {/* Taxonomy picker */}
              <div className="ep-tax-section">
                <h4>Taxonomy Tags</h4>
                {existingTags.length > 0 && (
                  <div className="ep-tax-group">
                    <div className="ep-tax-group-label">Already Tagged</div>
                    <div className="ep-tax-pills">
                      {existingTags.map(tid => {
                        const term = allTerms.find(t => t.term_id === tid);
                        return (
                          <span key={tid} className="ep-tax-pill existing" title="Already applied to this content">
                            ✓ {term?.name || tid}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {Object.keys(termsByType).length > 0 && (
                  <div className="ep-tax-group">
                    <div className="ep-tax-group-label">Add Tags</div>
                    {Object.entries(termsByType).map(([type, terms]) => (
                      <div key={type} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: "0.75rem", color: "#bbb", marginBottom: 4 }}>{type}</div>
                        <div className="ep-tax-pills">
                          {terms
                            .filter(t => !existingTags.includes(t.term_id))
                            .map(t => (
                              <span
                                key={t.term_id}
                                className={"ep-tax-pill " + (selectedTags.includes(t.term_id) ? "selected" : "available")}
                                onClick={() => toggleTag(t.term_id)}
                              >
                                {selectedTags.includes(t.term_id) ? "✓ " : "+ "}{t.name}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))}
                    <div className="ep-tax-note">
                      Selected tags will be applied to live content when the supervisor publishes.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ep-panel-footer">
          <button className="ep-btn ep-btn-secondary" onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button className="ep-btn ep-btn-heritage" onClick={handleSubmit} disabled={loading || submitting}>
            {submitting ? "Submitting…" : "Submit for Review ↑"}
          </button>
          <button className="ep-btn ep-btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>
  );
}


// ── SupervisorView ────────────────────────────────────────────────────────────
function SupervisorView({ languages, showToast }) {
  const [activeTab,    setActiveTab]    = useState("assign");
  const [drafts,       setDrafts]       = useState([]);
  const [staff,        setStaff]        = useState([]);
  const [dataLoading,  setDataLoading]  = useState(true);

  // ── Assign Tasks tab ──────────────────────────────────────────────────────
  const [contentType,    setContentType]    = useState("snippet_translation");
  const [langFilter,     setLangFilter]     = useState("");
  const [contentFilter,  setContentFilter]  = useState("all");
  const [showFilter,     setShowFilter]     = useState("unassigned");
  const [searchQ,        setSearchQ]        = useState("");
  const [items,          setItems]          = useState([]);
  const [itemsLoading,   setItemsLoading]   = useState(false);
  const [selected,       setSelected]       = useState(new Set());
  const [assignEditor,   setAssignEditor]   = useState("");
  const [assignDue,      setAssignDue]      = useState("");
  const [assignNotes,    setAssignNotes]    = useState("");
  const [assigning,      setAssigning]      = useState(false);
  const [conflicts,      setConflicts]      = useState([]);
  const [showConflict,   setShowConflict]   = useState(false);

  // ── All Tasks tab ─────────────────────────────────────────────────────────
  const [taskStatus,   setTaskStatus]   = useState("all");
  const [taskEditor,   setTaskEditor]   = useState("");
  const [taskSearch,   setTaskSearch]   = useState("");
  const [taskType,     setTaskType]     = useState("all");     // "all" | "snippet_translation" | "lesson"
  const [taskLang,     setTaskLang]     = useState("");        // language_id filter
  const [taskRole,     setTaskRole]     = useState("all");     // "all" | "editor" | "verifier" | "supervisor"
  const [selectedTasks,setSelectedTasks]= useState(new Set()); // selected draft ids
  const [deletingTasks,setDeletingTasks]= useState(false);
  const [contentRoles, setContentRoles] = useState([]);        // all content_role_assignments
  const [logDraftId,   setLogDraftId]   = useState(null);

  // ── Role for combined assignment (draft + content role in one action) ───────
  const [assignSubRole, setAssignSubRole] = useState("editor");

  const loadSharedData = useCallback(() => {
    setDataLoading(true);
    Promise.all([loadAllDrafts(), getEditorialStaff(), loadAllContentRoleAssignments()]).then(([d, s, cr]) => {
      setDrafts(d.data        || []);
      setStaff(s.data         || []);
      setContentRoles(cr.data || []);
      setDataLoading(false);
    });
  }, []);

  useEffect(() => { loadSharedData(); }, [loadSharedData]);

  // Fetch content items when type or language changes
  useEffect(() => {
    if (contentType === "snippet_translation" && !langFilter) { setItems([]); return; }
    setItemsLoading(true);
    setSelected(new Set());
    const p = contentType === "snippet_translation"
      ? loadSnippetsForAssignment(langFilter)
      : loadLessonsForAssignment();
    p.then(({ data }) => { setItems(data || []); setItemsLoading(false); });
  }, [contentType, langFilter]);

  // Set of content_ids that already have active (non-terminal) drafts
  const activeDraftIds = useMemo(() => {
    let list = drafts.filter(d => !["published","rejected"].includes(d.status));
    if (contentType === "snippet_translation" && langFilter)
      list = list.filter(d => d.language_id === langFilter);
    return new Set(list.map(d => d.content_id));
  }, [drafts, contentType, langFilter]);

  // Filtered content list for the browser
  const filteredItems = useMemo(() => {
    let list = items;
    if (contentFilter !== "all") list = list.filter(i => i.content_status === contentFilter);
    if (showFilter === "unassigned") {
      list = list.filter(i => !activeDraftIds.has(i.snippet_id || i.lesson_id));
    }
    const q = searchQ.trim().toLowerCase();
    if (q) {
      list = list.filter(i => {
        const id   = (i.snippet_id || i.lesson_id || "").toLowerCase();
        const hook = (i.preview_hook || "").toLowerCase();
        return id.includes(q) || hook.includes(q);
      });
    }
    return list;
  }, [items, contentFilter, showFilter, searchQ, activeDraftIds]);

  function getItemId(item) { return item.snippet_id || item.lesson_id; }

  function toggleSelect(id) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleSelectAll() {
    setSelected(prev =>
      prev.size === filteredItems.length ? new Set() : new Set(filteredItems.map(getItemId))
    );
  }

  async function handleAssign(force) {
    if (!assignEditor) { showToast("Please select a user"); return; }
    if (selected.size === 0) { showToast("Please select at least one item"); return; }
    const ids = [...selected];
    if (!force) {
      const { data: cfData } = await checkActiveDrafts(ids, contentType, contentType === "snippet_translation" ? langFilter : null);
      const cfIds = (cfData || []).map(c => c.content_id);
      if (cfIds.length > 0) { setConflicts(cfIds); setShowConflict(true); return; }
    }
    setAssigning(true);
    let errs = 0;
    const langId = contentType === "snippet_translation" ? langFilter : null;
    for (const id of ids) {
      const { error: draftErr } = await assignDraft({
        contentType, contentId: id,
        languageId: langId,
        assignedTo: assignEditor,
        dueDate:    assignDue   || null,
        notes:      assignNotes.trim() || null,
      });
      if (draftErr) { errs++; continue; }
      // Also grant the content-level sub-role for this item
      const { error: roleErr } = await assignContentRole(assignEditor, contentType, id, langId, assignSubRole);
      if (roleErr) {
        console.error("[handleAssign] assignContentRole failed for", id, roleErr);
        errs++;
      }
    }
    setAssigning(false);
    setSelected(new Set()); setConflicts([]); setShowConflict(false);
    const roleName = SUB_ROLE_CFG.find(r => r.id === assignSubRole)?.name || assignSubRole;
    showToast(errs
      ? `Assigned with ${errs} error(s) — check console`
      : `${ids.length} task(s) assigned as ${roleName} ✓`);
    loadSharedData();
    // Refresh item list so active-draft filter updates
    if (contentType === "snippet_translation" && langFilter) {
      setItemsLoading(true);
      loadSnippetsForAssignment(langFilter).then(({ data }) => { setItems(data || []); setItemsLoading(false); });
    } else if (contentType === "lesson") {
      setItemsLoading(true);
      loadLessonsForAssignment().then(({ data }) => { setItems(data || []); setItemsLoading(false); });
    }
  }

  // Stats
  const counts = {
    total:     drafts.length,
    assigned:  drafts.filter(d => d.status === "assigned").length,
    in_draft:  drafts.filter(d => d.status === "in_draft").length,
    submitted: drafts.filter(d => ["submitted","needs_revision","approved"].includes(d.status)).length,
    published: drafts.filter(d => d.status === "published").length,
  };

  // All Tasks tab — derived data
  const today = new Date();

  // sub_role is now returned directly by get_all_drafts() via a JOIN —
  // no separate lookup table needed.
  function getDraftRole(d) {
    return d.sub_role || null;
  }

  const filteredDrafts = useMemo(() => {
    let list = drafts;
    if (taskStatus === "overdue") {
      list = list.filter(d => d.due_date && new Date(d.due_date) < today && !["published","rejected"].includes(d.status));
    } else if (taskStatus !== "all") {
      list = list.filter(d => d.status === taskStatus);
    }
    if (taskType !== "all")  list = list.filter(d => d.content_type === taskType);
    if (taskLang)            list = list.filter(d => d.language_id === taskLang);
    if (taskEditor)          list = list.filter(d => d.assigned_to === taskEditor);
    if (taskRole !== "all") {
      list = list.filter(d => (d.sub_role || null) === taskRole);
    }
    if (taskSearch.trim()) list = list.filter(d => d.content_id.toLowerCase().includes(taskSearch.toLowerCase()));
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, taskStatus, taskType, taskLang, taskEditor, taskRole, taskSearch]);

  const overdueCount = useMemo(() =>
    drafts.filter(d => d.due_date && new Date(d.due_date) < today && !["published","rejected"].includes(d.status)).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [drafts]);

  async function handleDeleteSelected() {
    if (selectedTasks.size === 0) return;
    if (!window.confirm(`Delete ${selectedTasks.size} assignment(s)? This cannot be undone.`)) return;
    setDeletingTasks(true);
    let errs = 0;
    for (const draftId of selectedTasks) {
      const draft = drafts.find(d => d.id === draftId);
      if (!draft) continue;
      const { error } = await deleteAssignment(draft);
      if (error) errs++;
    }
    setDeletingTasks(false);
    setSelectedTasks(new Set());
    showToast(errs ? `Deleted with ${errs} error(s)` : `${selectedTasks.size} assignment(s) deleted ✓`);
    loadSharedData();
  }

  async function handlePublish(draftId) {
    const { error } = await publishDraft(draftId);
    if (error) { showToast("Publish failed: " + (error.message || "unknown error")); return; }
    showToast("Published to live content ✓");
    loadSharedData();
  }

  async function handleReject(draftId) {
    const { error } = await updateDraftStatus(draftId, "rejected");
    if (error) { showToast("Could not reject"); return; }
    showToast("Rejected");
    loadSharedData();
  }

  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Roles tab — deduplicated user list from staff
  const uniqueUsers = useMemo(() => {
    const seen = new Set();
    return staff.filter(s => { if (seen.has(s.profile_id)) return false; seen.add(s.profile_id); return true; });
  }, [staff]);

  const selectedEditorName = uniqueUsers.find(u => u.profile_id === assignEditor)?.display_name || "";

  // Tab button style helper
  function tabStyle(key) {
    return {
      flex:1, padding:"10px 12px", border:"none",
      borderRight: key !== "all" ? "1px solid rgba(0,0,0,0.10)" : "none",
      background: activeTab === key ? "#00509E" : "white",
      color: activeTab === key ? "#fff" : "#1F1F1F",
      fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
    };
  }

  // Filter label style
  const lblStyle = { fontSize:"0.7rem", fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 };
  const selStyle = { padding:"6px 10px", fontSize:"0.8125rem", borderRadius:8, border:"1.5px solid #ddd", background:"#fff", outline:"none" };

  return (
    <>
      {/* Stats bar */}
      <div className="ep-stats">
        {[["Total",counts.total],["Assigned",counts.assigned],["In Draft",counts.in_draft],["In Review",counts.submitted],["Published",counts.published]].map(([lbl,n]) => (
          <div className="ep-stat" key={lbl}>
            <div className="ep-stat-num">{n}</div>
            <div className="ep-stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:0, marginBottom:24, border:"1px solid rgba(0,0,0,0.10)", borderRadius:10, overflow:"hidden" }}>
        <button style={tabStyle("assign")} onClick={() => setActiveTab("assign")}>Assign Tasks</button>
        <button style={tabStyle("all")}    onClick={() => setActiveTab("all")}>All Tasks</button>
      </div>

      {/* ═══ ASSIGN TASKS TAB ════════════════════════════════════════════════ */}
      {activeTab === "assign" && (
        <div className="ep-section">

          {/* Filter bar */}
          <div style={{ background:"white", border:"1px solid rgba(0,0,0,0.10)", borderRadius:10, padding:"12px 16px", marginBottom:14, display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <span style={lblStyle}>Type</span>
              <select style={selStyle} value={contentType} onChange={e => { setContentType(e.target.value); setSelected(new Set()); }}>
                <option value="snippet_translation">Snippets</option>
                <option value="lesson">Lessons</option>
              </select>
            </div>
            {contentType === "snippet_translation" && (
              <div style={{ display:"flex", flexDirection:"column" }}>
                <span style={lblStyle}>Language</span>
                <select style={selStyle} value={langFilter} onChange={e => setLangFilter(e.target.value)}>
                  <option value="">— Select language —</option>
                  {languages.map(l => <option key={l.language_id} value={l.language_id}>{l.language}</option>)}
                </select>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column" }}>
              <span style={lblStyle}>Content</span>
              <select style={selStyle} value={contentFilter} onChange={e => setContentFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="full">Full</option>
                <option value="partial">Partial</option>
                <option value="none">None</option>
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <span style={lblStyle}>Show</span>
              <select style={selStyle} value={showFilter} onChange={e => setShowFilter(e.target.value)}>
                <option value="unassigned">Unassigned only</option>
                <option value="all">All content</option>
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", flex:1, minWidth:130 }}>
              <span style={lblStyle}>Search</span>
              <input type="text" placeholder="ID or keyword..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                style={{ ...selStyle, width:"100%", boxSizing:"border-box" }} />
            </div>
          </div>

          {/* Content browser */}
          {contentType === "snippet_translation" && !langFilter ? (
            <div className="ep-empty"><div className="ep-empty-icon">&#127760;</div><div>Select a language above to browse snippets</div></div>
          ) : itemsLoading ? (
            <p style={{ color:"#aaa", textAlign:"center", padding:32 }}>Loading content...</p>
          ) : filteredItems.length === 0 ? (
            <EmptyState msg="No content matches your filters." />
          ) : (
            <div className="ep-table-wrap" style={{ marginBottom:12 }}>
              <table className="ep-table">
                <thead>
                  <tr>
                    <th style={{ width:36 }}>
                      <input type="checkbox"
                        checked={filteredItems.length > 0 && selected.size === filteredItems.length}
                        onChange={toggleSelectAll}
                        title="Select / deselect all" />
                    </th>
                    <th>Content ID</th>
                    <th>Preview (English hook)</th>
                    <th>Type</th>
                    <th>{contentType === "snippet_translation" ? (languages.find(l => l.language_id === langFilter)?.language || langFilter) + " content" : "Content status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const id = getItemId(item);
                    const isSelected = selected.has(id);
                    return (
                      <tr key={id} onClick={() => toggleSelect(id)}
                        style={{ cursor:"pointer", background: isSelected ? "#F0F6FF" : undefined }}>
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(id)} />
                        </td>
                        <td style={{ fontFamily:"monospace", fontSize:"0.8125rem", color:"#1F1F1F", whiteSpace:"nowrap" }}>{id}</td>
                        <td style={{ fontSize:"0.8125rem", color:"#1F1F1F", maxWidth:220 }}>
                          {item.preview_hook
                            ? item.preview_hook.slice(0, 65) + (item.preview_hook.length > 65 ? "..." : "")
                            : <span style={{ color:"#ccc", fontStyle:"italic" }}>No English hook</span>}
                        </td>
                        <td><ContentTypeTag type={contentType} /></td>
                        <td><CsTag item={item} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selection bar + assignment form */}
          {filteredItems.length > 0 && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", background:"#EEF5FF", border:"1.5px solid #b5d4f4", borderRadius:10, marginBottom:14, flexWrap:"wrap" }}>
                <span style={{ fontSize:"0.875rem", color:"#1a56c9", fontWeight:700 }}>
                  {selected.size} item{selected.size !== 1 ? "s" : ""} selected
                </span>
                <span style={{ fontSize:"0.8125rem", color:"#6B6B6B" }}>of {filteredItems.length} shown</span>
                <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                  <button className="ep-btn-sm ep-btn-secondary" onClick={toggleSelectAll}>
                    {selected.size === filteredItems.length ? "Deselect all" : "Select all"}
                  </button>
                  {selected.size > 0 && (
                    <button className="ep-btn-sm ep-btn-secondary" onClick={() => setSelected(new Set())}>Clear</button>
                  )}
                </div>
              </div>

              {/* Conflict warning */}
              {showConflict && conflicts.length > 0 && (
                <div style={{ background:"#FFF3CD", border:"1.5px solid #ffc107", borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                  <div style={{ fontWeight:700, color:"#856404", marginBottom:6 }}>
                    &#9888; {conflicts.length} item{conflicts.length !== 1 ? "s" : ""} already {conflicts.length === 1 ? "has" : "have"} an active draft
                  </div>
                  <div style={{ fontSize:"0.8125rem", color:"#856404", marginBottom:10 }}>
                    Reassigning will move the draft to the new editor. Existing draft content is preserved but the assignee changes:
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                    {conflicts.map(id => (
                      <span key={id} style={{ fontFamily:"monospace", fontSize:"0.75rem", background:"#fff3b0", padding:"2px 8px", borderRadius:6 }}>{id}</span>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="ep-btn ep-btn-primary" style={{ padding:"7px 18px", fontSize:"0.8125rem" }}
                      onClick={() => handleAssign(true)}>Reassign anyway</button>
                    <button className="ep-btn ep-btn-secondary" style={{ padding:"7px 18px", fontSize:"0.8125rem" }}
                      onClick={() => { setShowConflict(false); setConflicts([]); }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Assignment details — user + role + optional fields in one card */}
              <div className="ep-form">
                <div style={{ fontWeight:700, color:"#0A0A0A", fontSize:"0.875rem", marginBottom:14 }}>
                  Assign {selected.size} item{selected.size !== 1 ? "s" : ""}
                  {contentType === "snippet_translation" && langFilter && (
                    <span style={{ fontWeight:400, color:"#6B6B6B", fontSize:"0.8125rem" }}>
                      {" "}&#8212; <strong>{languages.find(l => l.language_id === langFilter)?.language || langFilter}</strong>
                    </span>
                  )}
                </div>
                <div className="ep-form-grid">
                  <div className="ep-field">
                    <label>Assign to</label>
                    <select value={assignEditor} onChange={e => setAssignEditor(e.target.value)}>
                      <option value="">&#8212; Select user &#8212;</option>
                      {uniqueUsers.map(u => <option key={u.profile_id} value={u.profile_id}>{u.display_name}</option>)}
                    </select>
                  </div>
                  <div className="ep-field">
                    <label>Role</label>
                    <select value={assignSubRole} onChange={e => setAssignSubRole(e.target.value)}>
                      {SUB_ROLE_CFG.map(sr => (
                        <option key={sr.id} value={sr.id}>{sr.name} — {sr.desc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ep-field">
                    <label>Due date (optional)</label>
                    <input type="date" value={assignDue} onChange={e => setAssignDue(e.target.value)} />
                  </div>
                  <div className="ep-field" style={{ gridColumn:"1 / -1" }}>
                    <label>Notes (optional)</label>
                    <textarea placeholder="Any specific instructions..." value={assignNotes}
                      onChange={e => setAssignNotes(e.target.value)} style={{ minHeight:52 }} />
                  </div>
                </div>
                <div className="ep-form-actions">
                  <button className="ep-btn ep-btn-primary"
                    disabled={assigning || selected.size === 0}
                    onClick={() => handleAssign(false)}>
                    {assigning
                      ? "Assigning..."
                      : selected.size > 0
                        ? `Assign ${selected.size} task${selected.size !== 1 ? "s" : ""}${selectedEditorName ? " to " + selectedEditorName : ""}${assignSubRole ? " as " + (SUB_ROLE_CFG.find(r => r.id === assignSubRole)?.name || "") : ""}`
                        : "Select items above"}
                  </button>
                  {uniqueUsers.length === 0 && (
                    <span style={{ fontSize:"0.8125rem", color:"#e55" }}>
                      No creators found &#8212; assign ROLE_07 (Creator) in Supabase first.
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ ALL TASKS TAB ═══════════════════════════════════════════════════ */}
      {activeTab === "all" && (
        <div className="ep-section">

          {/* Status pills */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:12 }}>
            {[
              ["all","All"],
              ["assigned","Assigned"],
              ["in_draft","In Draft"],
              ["submitted","In Review"],
              ["approved","Approved"],
              ["published","Published"],
              ["overdue", overdueCount > 0 ? "Overdue (" + overdueCount + ")" : "Overdue"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTaskStatus(key)} style={{
                padding:"5px 14px", borderRadius:999, border:"none", fontSize:"0.8125rem", fontWeight:700, cursor:"pointer",
                background: taskStatus === key
                  ? (key === "overdue" ? "#c62828" : "#00509E")
                  : (key === "overdue" && overdueCount > 0 ? "#FFEBEE" : "#f0f0f0"),
                color: taskStatus === key ? "#fff" : (key === "overdue" && overdueCount > 0 ? "#c62828" : "#555"),
              }}>{label}</button>
            ))}
          </div>

          {/* Secondary filters */}
          <div style={{ background:"white", border:"1px solid rgba(0,0,0,0.10)", borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <span style={lblStyle}>Type</span>
              <select style={selStyle} value={taskType} onChange={e => { setTaskType(e.target.value); setTaskLang(""); }}>
                <option value="all">All types</option>
                <option value="snippet_translation">Snippets</option>
                <option value="lesson">Lessons</option>
              </select>
            </div>
            {taskType === "snippet_translation" && (
              <div style={{ display:"flex", flexDirection:"column" }}>
                <span style={lblStyle}>Language</span>
                <select style={selStyle} value={taskLang} onChange={e => setTaskLang(e.target.value)}>
                  <option value="">All languages</option>
                  {languages.map(l => <option key={l.language_id} value={l.language_id}>{l.language}</option>)}
                </select>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column" }}>
              <span style={lblStyle}>Role assigned</span>
              <select style={selStyle} value={taskRole} onChange={e => setTaskRole(e.target.value)}>
                <option value="all">All roles</option>
                {SUB_ROLE_CFG.map(sr => <option key={sr.id} value={sr.id}>{sr.name}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <span style={lblStyle}>Assigned to</span>
              <select style={selStyle} value={taskEditor} onChange={e => setTaskEditor(e.target.value)}>
                <option value="">All users</option>
                {uniqueUsers.map(u => <option key={u.profile_id} value={u.profile_id}>{u.display_name}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", flex:1, minWidth:120 }}>
              <span style={lblStyle}>Search</span>
              <input type="text" placeholder="Content ID..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)}
                style={{ ...selStyle, width:"100%", boxSizing:"border-box" }} />
            </div>
          </div>

          {/* Selection action bar */}
          {selectedTasks.size > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", background:"#FFF3CD", border:"1.5px solid #ffc107", borderRadius:10, marginBottom:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:"0.875rem", color:"#856404", fontWeight:700 }}>
                {selectedTasks.size} task{selectedTasks.size !== 1 ? "s" : ""} selected
              </span>
              <button
                className="ep-btn-sm ep-btn-reject"
                style={{ marginLeft:"auto", padding:"6px 16px", borderRadius:8 }}
                disabled={deletingTasks}
                onClick={handleDeleteSelected}>
                {deletingTasks ? "Deleting..." : `Delete ${selectedTasks.size} assignment${selectedTasks.size !== 1 ? "s" : ""}`}
              </button>
              <button className="ep-btn-sm ep-btn-secondary" onClick={() => setSelectedTasks(new Set())}>Clear</button>
            </div>
          )}

          {dataLoading ? (
            <p style={{ color:"#aaa", textAlign:"center", padding:32 }}>Loading...</p>
          ) : filteredDrafts.length === 0 ? (
            <EmptyState msg="No tasks match your filters." />
          ) : (
            <div className="ep-table-wrap">
              <table className="ep-table">
                <thead><tr>
                  <th style={{ width:36 }}>
                    <input type="checkbox"
                      checked={filteredDrafts.length > 0 && selectedTasks.size === filteredDrafts.length}
                      onChange={() => setSelectedTasks(prev =>
                        prev.size === filteredDrafts.length ? new Set() : new Set(filteredDrafts.map(d => d.id))
                      )} />
                  </th>
                  <th>Content</th><th>Type</th><th>Language</th>
                  <th>Assigned To</th><th>Role</th><th>Status</th><th>Due</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredDrafts.map(d => {
                    const isOverdue  = d.due_date && new Date(d.due_date) < today;
                    const role       = getDraftRole(d);
                    const roleCfg    = SUB_ROLE_CFG.find(r => r.id === role);
                    const isSelected = selectedTasks.has(d.id);
                    return (
                      <tr key={d.id} style={{ background: isSelected ? "#FFFBF0" : undefined }}>
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected}
                            onChange={() => setSelectedTasks(prev => {
                              const s = new Set(prev);
                              s.has(d.id) ? s.delete(d.id) : s.add(d.id);
                              return s;
                            })} />
                        </td>
                        <td style={{ fontFamily:"monospace", fontSize:"0.8125rem", color:"#1F1F1F" }}>
                          {d.content_id}
                          {d.notes && (
                            <div style={{ fontSize:"0.75rem", color:"#aaa", marginTop:2 }} title={d.notes}>
                              &#128221; {d.notes.slice(0,40)}{d.notes.length > 40 ? "..." : ""}
                            </div>
                          )}
                        </td>
                        <td><ContentTypeTag type={d.content_type} /></td>
                        <td style={{ fontSize:"0.8125rem", color:"#1F1F1F" }}>{d.language_id || "&#8212;"}</td>
                        <td style={{ fontSize:"0.875rem" }}>{d.editor_name || "&#8212;"}</td>
                        <td>
                          {roleCfg
                            ? <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:999, fontSize:"0.75rem", fontWeight:700, background:roleCfg.bg, color:roleCfg.color }}>{roleCfg.name}</span>
                            : <span style={{ color:"#ccc", fontSize:"0.75rem" }}>&#8212;</span>}
                        </td>
                        <td><StatusBadge status={d.status} /></td>
                        <td style={{ fontSize:"0.8125rem", color: isOverdue ? "#c62828" : "#666", fontWeight: isOverdue ? 700 : 400 }}>
                          {isOverdue && "&#9888; "}{fmtDate(d.due_date)}
                        </td>
                        <td>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            {d.status === "approved" && (
                              <button className="ep-btn-sm ep-btn-publish" onClick={() => handlePublish(d.id)}>&#10003; Publish</button>
                            )}
                            <button className="ep-btn-sm ep-btn-reject" onClick={() => handleReject(d.id)} title="Reject">&#10005;</button>
                            <button className="ep-btn-sm ep-btn-secondary" onClick={() => setLogDraftId(d.id)} title="Activity log">&#128203;</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {logDraftId && <EventLogPanel draftId={logDraftId} onClose={() => setLogDraftId(null)} />}
    </>
  );
}


// ── EditorView ────────────────────────────────────────────────────────────────
function EditorView({ showToast }) {
  const [drafts,  setDrafts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDraft,   setEditDraft]   = useState(null); // draft object being edited
  const [logDraftId,  setLogDraftId]  = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    loadMyDrafts().then(({ data }) => { setDrafts(data || []); setLoading(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // When editor clicks Start, transition to in_draft and open the edit form
  async function handleStart(draft) {
    if (draft.status === "assigned") {
      const { error } = await updateDraftStatus(draft.id, "in_draft", "Editor started work");
      if (error) { showToast("Could not update status"); return; }
    }
    // Reload so form gets the freshest draft_data
    const fresh = await loadMyDrafts();
    const updated = (fresh.data || []).find(d => d.id === draft.id) || draft;
    setDrafts(fresh.data || []);
    setEditDraft(updated);
  }

  function fmtDue(d) {
    if (!d) return null;
    const dt = new Date(d);
    const overdue = dt < new Date();
    return <span style={{ color: overdue ? "#c62828" : "#666", fontWeight: overdue ? 700 : 400 }}>
      {overdue ? "⚠ " : ""}{dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
    </span>;
  }

  return (
    <>
      <div className="ep-section">
        <div className="ep-section-title">My Tasks</div>
        {loading ? <p style={{ color: "#aaa", textAlign: "center", padding: 32 }}>Loading…</p>
        : drafts.length === 0 ? <EmptyState msg="No tasks assigned to you yet." />
        : (
          <div className="ep-table-wrap">
            <table className="ep-table">
              <thead><tr>
                <th>Content</th><th>Type</th><th>Language</th>
                <th>Role</th><th>Status</th><th>Due</th><th>Notes</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {drafts.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "#1F1F1F" }}>{d.content_id}</td>
                    <td><ContentTypeTag type={d.content_type} /></td>
                    <td style={{ fontSize: "0.8125rem", color: "#1F1F1F" }}>{d.language_id || "—"}</td>
                    <td><SubRoleBadge role={d.sub_role} /></td>
                    <td><StatusBadge status={d.status} /></td>
                    <td style={{ fontSize: "0.8125rem" }}>{fmtDue(d.due_date)}</td>
                    <td style={{ fontSize: "0.8125rem", color: "#6B6B6B", maxWidth: 130 }}>
                      {d.notes ? d.notes.slice(0,55)+(d.notes.length>55?"…":"") : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["assigned","in_draft","needs_revision"].includes(d.status) && (
                          <button className="ep-btn-sm ep-btn-approve" onClick={() => handleStart(d)}>
                            {d.status === "assigned" ? "▶ Start" : "✎ Edit"}
                          </button>
                        )}
                        <button className="ep-btn-sm ep-btn-secondary" onClick={() => setLogDraftId(d.id)}>📋</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editDraft && (
        <DraftEditForm
          draft={editDraft}
          onClose={() => setEditDraft(null)}
          onSaved={() => { loadData(); }}
          showToast={showToast}
        />
      )}
      {logDraftId && <EventLogPanel draftId={logDraftId} onClose={() => setLogDraftId(null)} />}
    </>
  );
}

// ── VerifierView ──────────────────────────────────────────────────────────────
function VerifierView({ showToast }) {
  const [drafts,  setDrafts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [logDraftId, setLogDraftId] = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    loadReviewQueue().then(({ data }) => { setDrafts(data || []); setLoading(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAction(draftId, newStatus, comment) {
    const { error } = await updateDraftStatus(draftId, newStatus, comment);
    if (error) { showToast("Could not update status"); return; }
    const msgs = { approved: "Approved ✓", needs_revision: "Sent back for revision" };
    showToast(msgs[newStatus] || "Updated");
    loadData();
  }

  return (
    <>
      <div className="ep-section">
        <div className="ep-section-title">Review Queue</div>
        {loading ? <p style={{ color: "#aaa", textAlign: "center", padding: 32 }}>Loading…</p>
        : drafts.length === 0 ? <EmptyState msg="No items waiting for review." />
        : (
          <div className="ep-table-wrap">
            <table className="ep-table">
              <thead><tr>
                <th>Content</th><th>Type</th><th>Language</th><th>Editor</th>
                <th>Role</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {drafts.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "#1F1F1F" }}>{d.content_id}</td>
                    <td><ContentTypeTag type={d.content_type} /></td>
                    <td style={{ fontSize: "0.8125rem", color: "#1F1F1F" }}>{d.language_id || "—"}</td>
                    <td style={{ fontSize: "0.875rem" }}>{d.editor_name || "—"}</td>
                    <td><SubRoleBadge role={d.sub_role} /></td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {d.status === "submitted" && (
                          <>
                            <button className="ep-btn-sm ep-btn-approve"
                              onClick={() => handleAction(d.id, "approved", "Verifier approved")}>✓ Approve</button>
                            <button className="ep-btn-sm ep-btn-sendback"
                              onClick={() => handleAction(d.id, "needs_revision", "Verifier requested revisions")}>↺ Revise</button>
                          </>
                        )}
                        <button className="ep-btn-sm ep-btn-secondary" onClick={() => setLogDraftId(d.id)}>📋</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {logDraftId && <EventLogPanel draftId={logDraftId} onClose={() => setLogDraftId(null)} />}
    </>
  );
}

// ── Main EditorPage ───────────────────────────────────────────────────────────
export default function EditorPage({
  settings, onOpenSettings, onSaveSettings, onHome, onDashboard, onLikes, onBookmarks, onDiscover,
  onAdmin, isAdmin, onResume, bookmarks, onToggleBookmark,
  userEditorialRole, onEditor,
  languages = [],
  onBack,
  activePage,
}) {
  const [toast, setToast] = useState("");
  const toastRef = { current: null };

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(""), 2400);
  }

  // Prioritise explicit editorial role; fall back to supervisor for admin users
  // with no editorial role. This prevents editors from seeing the supervisor view
  // (because is_admin() returns true for ALL non-learner roles in this app).
  const role = userEditorialRole || (isAdmin ? "supervisor" : "editor");
  const roleMeta = {
    supervisor: { label: "Supervisor" },
    verifier:   { label: "Verifier"   },
    editor:     { label: "Editor"     },
  };
  const rm = roleMeta[role] || roleMeta.editor;

  const navLinks = [
    { label: "Home",      onClick: onHome      },
    { label: "Dashboard", onClick: onDashboard },
    { label: "Discover",  onClick: onDiscover  },
    { label: "Likes",     onClick: onLikes     },
    { label: "Bookmarks", onClick: onBookmarks },
  ];

  return (
    <>
      <style>{globalStyles}</style>
      <style>{EDITOR_STYLES}</style>
      <PageHeader
        navLinks={navLinks}
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
      />

      <div className="editor-page">
        <div className="ep-hero">
          <div className="ep-role-badge">{rm.label}</div>
          <h1>Editorial Workspace</h1>
          <p>
            {role === "supervisor" && "Assign tasks, track progress, and publish approved content."}
            {role === "verifier"   && "Review submitted drafts and recommend them for approval."}
            {role === "editor"     && "View your assigned tasks and work on translations and edits."}
          </p>
        </div>

        {role === "supervisor" && <SupervisorView languages={languages} showToast={showToast} />}
        {role === "verifier"   && <VerifierView showToast={showToast} />}
        {role === "editor"     && <EditorView   showToast={showToast} />}
      </div>

      {toast && <div className="ep-toast">{toast}</div>}
    </>
  );
}
