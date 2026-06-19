import { useState, useEffect, useRef } from "react";
import { FOREST_TOKEN_TYPES } from "../config/appStrings";
import * as XLSX from "xlsx";
import { supabase, SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import {
  supabaseClient,
  adminGetUsers, adminGetBadgeCounts, adminGetTokens,
  adminToggleBadge, adminUpdateBadge, adminAddBadge, adminDeleteBadge,
  adminAwardToken,
  adminImportSnippetsFull, adminDryRunImport, adminImportQuestions, getNextQuestionKey,
  adminGetTokensRaw, adminUpdateTokenRow, adminDeleteTokenRow, adminSaveOrder,
  adminGetTokenCatalogue, adminAddTokenType, adminUpdateTokenType, adminDeleteTokenType,
  adminAddTerm, adminUpdateTerm, adminDeleteTerm,
} from "../lib/auth";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";

const TABS = ["Overview", "Users", "Tokens", "Content", "Taxonomy", "Badges", "Featured", "Order", "Import"];
const CONTENT_SUBS = ["Levels", "Courses", "Themes", "Modules", "Lessons", "Snippets"];
const TOKEN_TYPES = FOREST_TOKEN_TYPES;  // from appStrings

const styles = `
  .admin-tabs {
    max-width: 1100px; margin: 0 auto; padding: 20px 1.25rem 0;
    display: flex; gap: 4px; border-bottom: 2px solid rgba(0,0,0,0.07); flex-wrap: wrap;
  }
  .admin-tab-btn {
    padding: 10px 20px; font-family: 'Alumni Sans', sans-serif;
    font-size: 1rem; font-weight: 700; border: none; background: none;
    cursor: pointer; color: #6B6B6B; border-bottom: 3px solid transparent;
    margin-bottom: -2px; transition: color 0.15s, border-color 0.15s;
    letter-spacing: 0.02em; white-space: nowrap;
  }
  .admin-tab-btn:hover { color: ${SAFFRON}; }
  .admin-tab-btn.active { color: ${SAFFRON}; border-bottom-color: ${SAFFRON}; }
  .admin-sub-tabs {
    display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 20px;
    border-bottom: 1.5px solid rgba(0,0,0,0.07); padding-bottom: 0;
  }
  .admin-sub-btn {
    padding: 7px 16px; font-size: 0.875rem; font-weight: 700;
    border: none; background: none; cursor: pointer; color: #aaa;
    border-bottom: 2.5px solid transparent; margin-bottom: -1.5px;
    transition: color 0.15s, border-color 0.15s; font-family: 'Alumni Sans', sans-serif;
    letter-spacing: 0.02em;
  }
  .admin-sub-btn:hover { color: ${HERITAGE}; }
  .admin-sub-btn.active { color: ${HERITAGE}; border-bottom-color: ${HERITAGE}; }
  .admin-stat-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px; margin-bottom: 24px;
  }
  .admin-stat-card {
    background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
    padding: 18px 20px; box-shadow: none;
  }
  .admin-stat-val { font-family: 'Alumni Sans', sans-serif; font-size: 2rem; font-weight: 800; color: ${HERITAGE}; line-height: 1; }
  .admin-stat-lbl { font-size: 0.8125rem; color: #6B6B6B; margin-top: 4px; font-weight: 600; }
  .admin-table-wrap { overflow-x: auto; }
  .admin-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .admin-table th {
    text-align: left; padding: 10px 14px; font-size: 0.75rem; font-weight: 700;
    color: #aaa; text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1.5px solid rgba(0,0,0,0.07); white-space: nowrap;
  }
  .admin-table td { padding: 11px 14px; border-bottom: 1px solid #f5efe4; vertical-align: middle; color: #0A0A0A; }
  .admin-table tr:last-child td { border-bottom: none; }
  .admin-table tr:hover td { background: #FAFAF7; }
  .role-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .role-pill.admin { background: ${SAFFRON}22; color: #b86000; border: 1px solid ${SAFFRON}44; }
  .role-pill.learner { background: #f0f0f0; color: #6B6B6B; border: 1px solid #e0e0e0; }
  .admin-search { padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e0d4bc; font-size: 0.9375rem; width: 280px; outline: none; font-family: 'Source Sans 3', sans-serif; color: #0A0A0A; transition: border-color 0.15s; }
  .admin-search:focus { border-color: ${SAFFRON}; }
  .icon-btn { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; font-size: 0.875rem; transition: background 0.15s; color: #aaa; line-height: 1; }
  .icon-btn:hover { background: #f5f0e8; color: #555; }
  .icon-btn.danger:hover { background: #fff0f0; color: #c00; }
  .crud-form-row { background: #FAFAF7; border-bottom: 1px solid rgba(0,0,0,0.07); }
  .crud-form-row td { padding: 12px 14px; }
  .crud-input { padding: 7px 10px; border-radius: 8px; border: 1.5px solid #e0d4bc; font-size: 0.875rem; font-family: 'Source Sans 3', sans-serif; color: #0A0A0A; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; }
  .crud-input:focus { border-color: ${SAFFRON}; }
  .crud-select { padding: 7px 10px; border-radius: 8px; border: 1.5px solid #e0d4bc; font-size: 0.875rem; background: white; color: #0A0A0A; outline: none; transition: border-color 0.15s; }
  .crud-select:focus { border-color: ${SAFFRON}; }
  .crud-textarea { padding: 7px 10px; border-radius: 8px; border: 1.5px solid #e0d4bc; font-size: 0.875rem; font-family: 'Source Sans 3', sans-serif; color: #0A0A0A; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; resize: vertical; min-height: 64px; }
  .crud-textarea:focus { border-color: ${SAFFRON}; }
  .crud-msg { padding: 8px 14px; border-radius: 8px; font-size: 0.875rem; margin-bottom: 12px; }
  .crud-msg.ok  { background: #f0fdf4; color: ${GREEN}; }
  .crud-msg.err { background: #fff0f0; color: #c00; }
  .tax-type-label { font-size: 0.75rem; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.07em; margin: 20px 0 10px; }
  .tax-term-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.07); background: white; margin-bottom: 8px; }
  .tax-term-id  { font-size: 0.6875rem; color: #bbb; font-weight: 600; min-width: 72px; }
  .tax-term-name { flex: 1; font-size: 0.9375rem; font-weight: 600; color: #0A0A0A; }
  .tax-term-count { font-size: 0.75rem; color: #aaa; min-width: 80px; text-align: right; }
  .tax-edit-input { flex: 1; padding: 5px 10px; border-radius: 8px; border: 1.5px solid ${SAFFRON}; font-size: 0.9375rem; font-family: 'Source Sans 3', sans-serif; outline: none; color: #0A0A0A; }
  .tax-add-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 16px; background: #FAFAF7; border-radius: 12px; border: 1.5px dashed rgba(0,0,0,0.10); margin-top: 20px; }
  .tax-add-input { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #e0d4bc; font-size: 0.875rem; font-family: 'Source Sans 3', sans-serif; outline: none; color: #0A0A0A; transition: border-color 0.15s; }
  .tax-add-input:focus { border-color: ${SAFFRON}; }
  .tax-type-select { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #e0d4bc; font-size: 0.875rem; background: white; color: #0A0A0A; outline: none; cursor: pointer; }
  .badge-admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .badge-admin-card { background: white; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07); padding: 16px; transition: box-shadow 0.15s;  }
  .badge-admin-card.inactive { opacity: 0.5; }
  .badge-cat-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px; }
  .badge-cat-pill.progression { background: ${HERITAGE}18; color: ${HERITAGE}; }
  .badge-cat-pill.volume { background: ${GREEN}18; color: ${GREEN}; }
  .badge-cat-pill.streak { background: white; color: #b86000; }
  .badge-cat-pill.daily { background: rgba(0,80,158,0.08); color: #00509E; }
  .badge-icon-big { font-size: 1.75rem; line-height: 1; margin-bottom: 6px; display: block; }
  .badge-admin-name { font-family: 'Alumni Sans', sans-serif; font-size: 1rem; font-weight: 700; color: #0A0A0A; margin-bottom: 2px; }
  .badge-admin-criteria { font-size: 0.75rem; color: #6B6B6B; margin-bottom: 10px; line-height: 1.4; }
  .badge-admin-earned { font-size: 0.6875rem; color: #aaa; margin-bottom: 10px; }
  .badge-toggle-wrap { display: flex; align-items: center; gap: 8px; }
  .toggle-switch { position: relative; width: 36px; height: 20px; cursor: pointer; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
  .toggle-track { position: absolute; inset: 0; border-radius: 999px; background: #ddd; transition: background 0.2s; }
  .toggle-switch input:checked + .toggle-track { background: ${GREEN}; }
  .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: white; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .toggle-switch input:checked ~ .toggle-thumb { transform: translateX(16px); }
  .toggle-label { font-size: 0.75rem; font-weight: 600; color: #6B6B6B; }
  .token-icon { font-size: 1rem; }
  .admin-denied { text-align: center; padding: 80px 24px; }
  .admin-denied h2 { font-family: 'Alumni Sans', sans-serif; font-size: 1.5rem; color: #c00; margin-bottom: 8px; }
  .admin-denied p { font-size: 0.9375rem; color: #6B6B6B; }
  @media (max-width: 600px) {
    .admin-tabs { padding: 16px 1rem 0; }
    .admin-tab-btn { padding: 8px 12px; font-size: 0.875rem; }
    .badge-admin-grid { grid-template-columns: 1fr 1fr; }
    .admin-search { width: 100%; }
  }
`;

export default function AdminPage({
  settings, onOpenSettings, onSaveSettings, onHome, onDashboard, onLikes,
  onBookmarks, onDiscover, onResume, bookmarks, onToggleBookmark,
  isAdmin, onAdmin, userEditorialRole, onEditor,
  activePage, languages = [],
}) {
  const [activeTab,    setActiveTab]    = useState("Overview");
  const [contentSub,   setContentSub]   = useState("Levels");

  // ── Overview ────────────────────────────────────────────────────────────────
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [courses,   setCourses]   = useState([]);
  const [modCount,  setModCount]  = useState(0);
  const [lesCount,  setLesCount]  = useState(0);
  const [snipCount, setSnipCount] = useState(0);
  const [courseStats, setCourseStats] = useState([]);

  // ── Users ────────────────────────────────────────────────────────────────────
  const [usersLoading, setUsersLoading] = useState(false);
  const [users,      setUsers]      = useState(null);
  const [userSearch, setUserSearch] = useState("");

  // ── Tokens ───────────────────────────────────────────────────────────────────
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokens,        setTokens]        = useState(null);

  // ── Content ──────────────────────────────────────────────────────────────────
  const [contentData,    setContentData]    = useState({});
  const [contentLoading, setContentLoading] = useState(false);
  const [contentMsg,     setContentMsg]     = useState({ text: "", ok: true });
  const [editId,         setEditId]         = useState(null);
  const [editData,       setEditData]       = useState({});
  const [showAdd,        setShowAdd]        = useState(false);
  const [addData,        setAddData]        = useState({});
  const [langs,          setLangs]          = useState([]);
  const [snipLang,       setSnipLang]       = useState("en");

  // ── Taxonomy ─────────────────────────────────────────────────────────────────
  const [taxLoading,  setTaxLoading]  = useState(false);
  const [terms,       setTerms]       = useState([]);
  const [termCounts,  setTermCounts]  = useState({});
  const [editTermId,  setEditTermId]  = useState(null);
  const [editName,    setEditName]    = useState("");
  const [newTermName, setNewTermName] = useState("");
  const [newTermType, setNewTermType] = useState("category");
  const [taxMsg,      setTaxMsg]      = useState("");

  // ── Badges ───────────────────────────────────────────────────────────────────
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badges,       setBadges]       = useState([]);
  const [badgeCounts,  setBadgeCounts]  = useState({});
  const [badgeMsg,     setBadgeMsg]     = useState("");
  const [editBadgeId,  setEditBadgeId]  = useState(null);
  const [editBadgeData,setEditBadgeData]= useState({});
  const [showAddBadge, setShowAddBadge] = useState(false);
  const [addBadgeData, setAddBadgeData] = useState({});
  // ── Grant Token ──────────────────────────────────────────────────────────────
  const [grantUser,    setGrantUser]    = useState("");
  const [grantType,    setGrantType]    = useState("tulsi");
  const [grantQty,     setGrantQty]     = useState(1);
  const [grantMsg,     setGrantMsg]     = useState("");

  // ── Featured Snippets ────────────────────────────────────────────────────────
  const [featLoading,   setFeatLoading]   = useState(false);
  const [featSlots,     setFeatSlots]     = useState(Array(10).fill(null));
  const [featSearch,    setFeatSearch]    = useState("");
  const [featResults,   setFeatResults]   = useState([]);
  const [featSearching, setFeatSearching] = useState(false);
  const [featMsg,       setFeatMsg]       = useState("");
  const [featTargetSlot,setFeatTargetSlot]= useState(null);

  // ── Order tab ─────────────────────────────────────────────────────────────
  const [orderPanel,   setOrderPanel]   = useState("courses");
  const [orderCourses, setOrderCourses] = useState([]);
  const [orderThemes,  setOrderThemes]  = useState([]);
  const [orderModules, setOrderModules] = useState([]);
  const [orderLessons, setOrderLessons] = useState([]);
  const [orderFilter,  setOrderFilter]  = useState({ course:"", level:"", theme:"", module:"" });
  const [orderDragIdx, setOrderDragIdx] = useState(null);
  const [orderSaving,  setOrderSaving]  = useState(false);
  const [orderMsg,     setOrderMsg]     = useState("");
  const [orderLoading, setOrderLoading] = useState(false);

  // ── Content filters + drag ───────��─────────────────────────────────────────────
  const [refData,        setRefData]        = useState({ levels: [], themes: [], modules: [], lessons: [] });
  const [moduleFilter,   setModuleFilter]   = useState({ course: "", level: "", theme: "" });
  const [lessonFilter,   setLessonFilter]   = useState({ module: "" });
  const [snippetFilter,  setSnippetFilter]  = useState({ lesson: "" });
  const [dragId,         setDragId]         = useState(null);
  const [dragOverId,     setDragOverId]     = useState(null);
  const [dragSaving,     setDragSaving]     = useState(false);

  // ── Token rows (raw) ────────────��────────────────────────────────────────────
  const [tokenRowsRaw,    setTokenRowsRaw]    = useState(null);
  const [tokenRowsLoading,setTokenRowsLoading]= useState(false);
  const [editTokenId,     setEditTokenId]     = useState(null);
  const [editTokenData,   setEditTokenData]   = useState({});
  const [tokenMsg,        setTokenMsg]        = useState("");

  // ── Token Catalogue ──────────────────────────────────────────────────────────
  const [tokenCatalogue,      setTokenCatalogue]      = useState([]);
  const [catLoading,          setCatLoading]          = useState(false);
  const [editCatType,         setEditCatType]         = useState(null);
  const [editCatData,         setEditCatData]         = useState({});
  const [showAddCat,          setShowAddCat]          = useState(false);
  const [addCatData,          setAddCatData]          = useState({});
  const [catMsg,              setCatMsg]              = useState("");

  // ── Import ────────────────────────────────��──────────────────────────────────
  const [importFile,      setImportFile]      = useState(null);
  const [nextSnippetKey,  setNextSnippetKey]  = useState(null);
  const [nextQuestionKey, setNextQuestionKey] = useState(null);
  const [importSheets,  setImportSheets]  = useState(null);   // { Snippets: [...], Lessons: [...], Mapping: [...] }
  const [importRunning, setImportRunning] = useState(false);
  const [importMsg,     setImportMsg]     = useState("");
  const [importResults, setImportResults] = useState(null);
  const [validateRunning, setValidateRunning] = useState(false);
  const [validateResults, setValidateResults] = useState(null);
  const [validated,       setValidated]       = useState(false);
  const importInputRef = useRef(null);

  // ── Load overview on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    async function load() {
      const [courseData, modData, lesData, snipData, langData] = await Promise.all([
        supabase("courses",      "?select=course_id,course_name,course_number&order=course_number"),
        supabase("modules",      "?select=module_id,course_id"),
        supabase("lessons",      "?select=lesson_id,module_id"),
        supabase("snippet_core", "?select=snippet_id"),
        supabase("languages",    "?select=language_id,language&order=language"),
      ]);
      const mods = modData || [];
      const lesArr = lesData || [];
      const modsByCourse = {};
      mods.forEach(m => { modsByCourse[m.course_id] = (modsByCourse[m.course_id] || 0) + 1; });
      const modToCourse = {};
      mods.forEach(m => { modToCourse[m.module_id] = m.course_id; });
      const lesByCourse = {};
      lesArr.forEach(l => {
        const cid = modToCourse[l.module_id];
        if (cid) lesByCourse[cid] = (lesByCourse[cid] || 0) + 1;
      });
      const cs = (courseData || []).map(c => ({ ...c, modules: modsByCourse[c.course_id] || 0, lessons: lesByCourse[c.course_id] || 0 }));
      setCourses(courseData || []);
      setModCount(mods.length);
      setLesCount(lesArr.length);
      setSnipCount((snipData || []).length);
      setCourseStats(cs);
      setLangs(langData || []);
      setOverviewLoading(false);
    }
    load();
  }, [isAdmin]);

  // ── Tab switch loader ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "Users"    && users === null)   loadUsers();
    if (activeTab === "Tokens"   && tokenRowsRaw === null)  loadTokens();
    if (activeTab === "Tokens"   && tokenCatalogue.length === 0) loadTokenCatalogue();
    if (activeTab === "Taxonomy" && terms.length === 0) loadTaxonomy();
    if (activeTab === "Badges"   && badges.length === 0) loadBadges();
    if (activeTab === "Featured" && !featLoading && featSlots.every(s => s === null)) loadFeatured();
    if (activeTab === "Order")   { loadOrderPanel("courses"); loadOrderPanel("themes"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  // Load filter reference data once when Content tab is first opened
  useEffect(() => {
    if (!isAdmin || activeTab !== "Content" || refData.levels.length) return;
    Promise.all([
      supabase("levels",  "?select=level_id,title&order=title"),
      supabase("themes",  "?select=theme_id,title&order=title"),
      supabase("modules", "?select=module_id,module_name&order=module_name"),
      supabase("lessons", "?select=lesson_id,lesson_name&order=lesson_name"),
    ]).then(([l, t, m, les]) =>
      setRefData({ levels: l || [], themes: t || [], modules: m || [], lessons: les || [] })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "Content") return;
    loadContent(contentSub);
    setEditId(null); setShowAdd(false); setAddData({}); setEditData({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSub, activeTab, isAdmin]);

  // ── Load helpers ─────────────────────────────────────────────────────────────
  async function loadUsers() {
    setUsersLoading(true);
    const { data } = await adminGetUsers();
    setUsers(data || []);
    setUsersLoading(false);
  }

  async function loadTokens() {
    setTokenRowsLoading(true);
    const { data } = await adminGetTokensRaw();
    setTokenRowsRaw(data || []);
    setTokenRowsLoading(false);
  }

  async function loadTokenCatalogue() {
    setCatLoading(true);
    const { data } = await adminGetTokenCatalogue();
    setTokenCatalogue(data || []);
    setCatLoading(false);
  }

  async function handleSaveCatEdit(tokenType) {
    const { error } = await adminUpdateTokenType(tokenType, editCatData);
    if (error) { setCatMsg("Update failed: " + error.message); return; }
    setCatMsg("Saved ✓");
    setEditCatType(null);
    setEditCatData({});
    loadTokenCatalogue();
    setTimeout(() => setCatMsg(""), 3000);
  }

  async function handleDeleteCatToken(tokenType) {
    if (!confirm(`Delete token type "${tokenType}"? This cannot be undone.`)) return;
    const { error } = await adminDeleteTokenType(tokenType);
    if (error) { setCatMsg("Delete failed: " + error.message); return; }
    setCatMsg("Deleted ✓");
    loadTokenCatalogue();
    setTimeout(() => setCatMsg(""), 3000);
  }

  async function handleAddCatToken() {
    if (!addCatData.token_type || !addCatData.token_name) { setCatMsg("token_type and token_name are required"); return; }
    const row = { sort_order: 0, is_active: true, ...addCatData };
    const { error } = await adminAddTokenType(row);
    if (error) { setCatMsg("Add failed: " + error.message); return; }
    setCatMsg("Added ✓");
    setShowAddCat(false);
    setAddCatData({});
    loadTokenCatalogue();
    setTimeout(() => setCatMsg(""), 3000);
  }

  async function loadTaxonomy() {
    setTaxLoading(true);
    const [termData, mapData] = await Promise.all([
      supabase("taxonomy_terms", "?select=term_id,name,type&order=type,name"),
      supabase("content_taxonomy_mapping", "?select=term_id"),
    ]);
    const counts = {};
    (mapData || []).forEach(m => { counts[m.term_id] = (counts[m.term_id] || 0) + 1; });
    setTerms(termData || []);
    setTermCounts(counts);
    setTaxLoading(false);
  }

  async function loadBadges() {
    setBadgesLoading(true);
    const [{ data: bd }, { data: cd }] = await Promise.all([
      supabaseClient.from("badges").select("*").order("sort_order"),
      adminGetBadgeCounts(),
    ]);
    const counts = {};
    (cd || []).forEach(r => { counts[r.badge_id] = r.earned_count; });
    setBadges(bd || []);
    setBadgeCounts(counts);
    setBadgesLoading(false);
  }

  async function loadContent(sub, fMod, fLes, fSnip) {
    // Use passed-in filters, falling back to current state (for programmatic calls)
    const mf = fMod  !== undefined ? fMod  : moduleFilter;
    const lf = fLes  !== undefined ? fLes  : lessonFilter;
    const sf = fSnip !== undefined ? fSnip : snippetFilter;
    setContentLoading(true);

    if (sub === "Levels") {
      setContentData(prev => ({ ...prev, Levels: [] }));
      const d = await supabase("levels", "?select=*&order=level_number");
      setContentData(prev => ({ ...prev, Levels: d || [] }));
    } else if (sub === "Courses") {
      const d = await supabase("courses", "?select=*&order=course_number");
      setContentData(prev => ({ ...prev, Courses: d || [] }));
    } else if (sub === "Themes") {
      const d = await supabase("themes", "?select=*&order=theme_id");
      setContentData(prev => ({ ...prev, Themes: d || [] }));
    } else if (sub === "Modules") {
      let q = "?select=*&order=module_number";
      if (mf.course) q += "&course_id=eq." + mf.course;
      if (mf.level)  q += "&level_id=eq."  + mf.level;
      if (mf.theme)  q += "&theme_id=eq."  + mf.theme;
      const d = await supabase("modules", q);
      setContentData(prev => ({ ...prev, Modules: d || [] }));
    } else if (sub === "Lessons") {
      let q = "?select=*&order=lesson_number";
      if (lf.module) q += "&module_id=eq." + lf.module;
      const d = await supabase("lessons", q);
      setContentData(prev => ({ ...prev, Lessons: d || [] }));
    } else if (sub === "Snippets") {
      if (sf.lesson) {
        // Load snippets ordered by lesson_snippet_mapping.order_index for this lesson
        const mapping = await supabase("lesson_snippet_mapping",
          "?select=snippet_id,order_index&lesson_id=eq." + sf.lesson + "&order=order_index");
        const ids = (mapping || []).map(m => m.snippet_id);
        if (ids.length) {
          const snipData = await supabase("snippet_core", "?select=*&snippet_id=in.(" + ids.join(",") + ")");
          const trans    = await supabase("snippet_translations",
            "?snippet_id=in.(" + ids.join(",") + ")&language=eq." + snipLang + "&select=snippet_id,hook,explanation,key_term");
          const transMap = {}, orderMap = {};
          (trans   || []).forEach(t => { transMap[t.snippet_id] = t; });
          (mapping || []).forEach(m => { orderMap[m.snippet_id] = m.order_index ?? 999; });
          const rows = (snipData || [])
            .map(s => ({ ...s, _trans: transMap[s.snippet_id] || {}, _order_index: orderMap[s.snippet_id] }))
            .sort((a, b) => a._order_index - b._order_index);
          setContentData(prev => ({ ...prev, Snippets: rows }));
        } else {
          setContentData(prev => ({ ...prev, Snippets: [] }));
        }
      } else {
        const data = await supabase("snippet_core", "?select=*&order=snippet_id&limit=200");
        const ids  = (data || []).map(s => s.snippet_id).join(",");
        const trans = ids ? await supabase("snippet_translations",
          "?snippet_id=in.(" + ids + ")&language=eq." + snipLang + "&select=snippet_id,hook,explanation,key_term") : [];
        const transMap = {};
        (trans || []).forEach(t => { transMap[t.snippet_id] = t; });
        setContentData(prev => ({ ...prev, Snippets: (data || []).map(s => ({ ...s, _trans: transMap[s.snippet_id] || {} })) }));
      }
    }
    setContentLoading(false);
  }


  // ── Featured Snippets functions ──────────────────────────────────────────────
  async function loadFeatured() {
    setFeatLoading(true);
    setFeatMsg("");
    try {
      const rows = await supabase(
        "featured_snippets",
        "?select=display_order,snippet_id,snippet_core(snippet_id,asset_id,difficulty_level,like_count)&order=display_order.asc&limit=10"
      );
      const slots = Array(10).fill(null);
      if (Array.isArray(rows)) {
        rows.forEach(r => { if (r.display_order >= 1 && r.display_order <= 10) slots[r.display_order - 1] = r; });
      } else {
        setFeatMsg("featured_snippets table not found — run supabase/sort_order.sql and supabase/featured_snippets.sql in the Supabase SQL editor first.");
      }
      setFeatSlots(slots);
    } catch (e) {
      setFeatMsg("Error loading featured snippets: " + e.message);
    }
    setFeatLoading(false);
  }

  async function searchFeatSnip() {
    if (!featSearch.trim()) return;
    setFeatSearching(true);
    const q = "?select=snippet_id,asset_id,like_count&asset_id=not.is.null&order=like_count.desc&limit=20";
    const results = await supabase("snippet_core", q);
    // Filter by search term against translations
    setFeatResults(results || []);
    setFeatSearching(false);
  }

  async function assignFeatSlot(slot, snippetId) {
    const { error } = await supabaseClient.from("featured_snippets").upsert(
      { display_order: slot, snippet_id: snippetId, set_by: (await supabaseClient.auth.getUser()).data?.user?.id },
      { onConflict: "display_order" }
    );
    if (error) { setFeatMsg("Failed: " + error.message); return; }
    setFeatMsg("Slot " + slot + " updated.");
    loadFeatured();
  }

  async function clearFeatSlot(slot) {
    const { error } = await supabaseClient.from("featured_snippets").delete().eq("display_order", slot);
    if (error) { setFeatMsg("Failed: " + error.message); return; }
    setFeatMsg("Slot " + slot + " cleared.");
    loadFeatured();
  }

  async function moveFeatSlot(slot, dir) {
    const targetSlot = slot + dir;
    if (targetSlot < 1 || targetSlot > 10) return;
    const a = featSlots[slot - 1];
    const b = featSlots[targetSlot - 1];
    if (!a) return;
    if (b) {
      await supabaseClient.from("featured_snippets").upsert(
        [{ display_order: slot, snippet_id: b.snippet_id }, { display_order: targetSlot, snippet_id: a.snippet_id }],
        { onConflict: "display_order" }
      );
    } else {
      await supabaseClient.from("featured_snippets").delete().eq("display_order", slot);
      await supabaseClient.from("featured_snippets").upsert(
        { display_order: targetSlot, snippet_id: a.snippet_id },
        { onConflict: "display_order" }
      );
    }
    loadFeatured();
  }

  // ── Order tab functions ──────────────────────────────────────────────────
  async function loadOrderPanel(panel, filter) {
    const f = filter || orderFilter;
    setOrderLoading(true); setOrderMsg("");
    if (panel === "courses") {
      const d = await supabase("courses", "?select=course_id,course_name,sort_order&order=sort_order");
      setOrderCourses(d || []);
    } else if (panel === "themes") {
      const d = await supabase("themes", "?select=theme_id,title,sort_order&order=sort_order");
      setOrderThemes(d || []);
    } else if (panel === "modules") {
      let q = "?select=module_id,module_name,sort_order&order=sort_order";
      if (f.course) q += "&course_id=eq." + f.course;
      if (f.level)  q += "&level_id=eq."  + f.level;
      if (f.theme)  q += "&theme_id=eq."  + f.theme;
      const d = await supabase("modules", q);
      setOrderModules(d || []);
    } else if (panel === "lessons") {
      let q = "?select=lesson_id,lesson_name,sort_order&order=sort_order";
      if (f.module) q += "&module_id=eq." + f.module;
      const d = await supabase("lessons", q);
      setOrderLessons(d || []);
    }
    setOrderLoading(false);
  }

  async function saveOrder(panel, items) {
    setOrderSaving(true); setOrderMsg("");
    const idField = { courses:"course_id", themes:"theme_id", modules:"module_id", lessons:"lesson_id" }[panel];
    let failed = 0;
    for (let i = 0; i < items.length; i++) {
      const { error } = await supabaseClient.from(panel).update({ sort_order: i + 1 }).eq(idField, items[i][idField]);
      if (error) failed++;
    }
    setOrderMsg(failed === 0 ? "Order saved." : failed + " update(s) failed.");
    setOrderSaving(false);
  }

  function orderMove(panel, idx, dir) {
    const lists = { courses:orderCourses, themes:orderThemes, modules:orderModules, lessons:orderLessons };
    const sets  = { courses:setOrderCourses, themes:setOrderThemes, modules:setOrderModules, lessons:setOrderLessons };
    const next = [...(lists[panel] || [])];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    sets[panel](next);
    saveOrder(panel, next);
  }

  function orderDrop(panel, toIdx) {
    if (orderDragIdx === null || orderDragIdx === toIdx) { setOrderDragIdx(null); return; }
    const lists = { courses:orderCourses, themes:orderThemes, modules:orderModules, lessons:orderLessons };
    const sets  = { courses:setOrderCourses, themes:setOrderThemes, modules:setOrderModules, lessons:setOrderLessons };
    const next = [...(lists[panel] || [])];
    const [moved] = next.splice(orderDragIdx, 1);
    next.splice(toIdx, 0, moved);
    sets[panel](next);
    setOrderDragIdx(null);
    saveOrder(panel, next);
  }

  // ── Content CRUD helpers ─────────────────────────────────────────────────────
  function showMsg(text, ok = true) {
    setContentMsg({ text, ok });
    setTimeout(() => setContentMsg({ text: "", ok: true }), 3000);
  }

  function getTable(sub) {
    return { Levels: "levels", Courses: "courses", Themes: "themes", Modules: "modules", Lessons: "lessons", Snippets: "snippet_core" }[sub];
  }

  function getPK(sub) {
    return { Levels: "level_id", Courses: "course_id", Themes: "theme_id", Modules: "module_id", Lessons: "lesson_id", Snippets: "snippet_id" }[sub];
  }

  async function handleSaveEdit() {
    const table = getTable(contentSub);
    const pk = getPK(contentSub);
    const { [pk]: _, _trans, ...fields } = editData;
    const { error } = await supabaseClient.from(table).update(fields).eq(pk, editId);
    if (error) { showMsg("Save failed: " + error.message, false); return; }
    if (contentSub === "Snippets" && editData._trans) {
      const tFields = { hook: editData._trans.hook, explanation: editData._trans.explanation, key_term: editData._trans.key_term };
      await supabaseClient.from("snippet_translations").upsert({ snippet_id: editId, language: snipLang, ...tFields }, { onConflict: "snippet_id,language" });
    }
    setContentData(prev => {
      const list = (prev[contentSub] || []).map(r => r[pk] === editId ? { ...r, ...fields, ...(contentSub === "Snippets" ? { _trans: { ...(r._trans || {}), ...(editData._trans || {}) } } : {}) } : r);
      return { ...prev, [contentSub]: list };
    });
    setEditId(null); setEditData({});
    showMsg("Saved.");
  }

  async function handleAdd() {
    const table = getTable(contentSub);
    const pk = getPK(contentSub);
    if (!addData[pk]?.trim()) { showMsg("ID is required.", false); return; }
    const { _trans, ...coreData } = addData;
    const { error } = await supabaseClient.from(table).insert(coreData);
    if (error) { showMsg("Add failed: " + error.message, false); return; }
    if (contentSub === "Snippets" && _trans) {
      await supabaseClient.from("snippet_translations").insert({ snippet_id: addData[pk], language: snipLang, ..._trans });
    }
    showMsg("Added.");
    setShowAdd(false); setAddData({});
    loadContent(contentSub);
  }

  async function handleDelete(id) {
    const table = getTable(contentSub);
    const pk = getPK(contentSub);
    if (!window.confirm(`Delete "${id}"? This cannot be undone.`)) return;
    const { error } = await supabaseClient.from(table).delete().eq(pk, id);
    if (error) { showMsg("Delete failed: " + error.message, false); return; }
    setContentData(prev => ({ ...prev, [contentSub]: (prev[contentSub] || []).filter(r => r[pk] !== id) }));
    showMsg("Deleted.");
  }

  // ── Drag-and-drop reorder handler ───────────────────────────────────────────
  async function handleDrop(targetId) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const pk = getPK(contentSub);
    const rows = (contentData[contentSub] || []).slice();
    const fromIdx = rows.findIndex(r => r[pk] === dragId);
    const toIdx   = rows.findIndex(r => r[pk] === targetId);
    if (fromIdx === -1 || toIdx === -1) { setDragId(null); setDragOverId(null); return; }
    const [moved] = rows.splice(fromIdx, 1);
    rows.splice(toIdx, 0, moved);
    setContentData(prev => ({ ...prev, [contentSub]: rows }));
    setDragId(null); setDragOverId(null);
    setDragSaving(true);
    let type, items;
    if (contentSub === "Modules") {
      type = "modules"; items = rows.map((r, i) => ({ module_id: r.module_id, module_number: i + 1 }));
    } else if (contentSub === "Lessons") {
      type = "lessons"; items = rows.map((r, i) => ({ lesson_id: r.lesson_id, lesson_number: i + 1 }));
    } else {
      type = "snippets"; items = rows.map((r, i) => ({ snippet_id: r.snippet_id, order_index: i + 1 }));
    }
    const { errors } = await adminSaveOrder(type, items, snippetFilter.lesson);
    setDragSaving(false);
    showMsg(errors.length ? "Reorder failed: " + errors[0] : "Order saved ✓");
  }

  // ── Token edit/delete handlers ───────────────────────────────────────────────
  async function handleSaveTokenEdit(id) {
    const fields = {
      token_type:  editTokenData.token_type,
      quantity:    parseInt(editTokenData.quantity, 10) || 0,
      source_type: editTokenData.source_type || null,
      source_id:   editTokenData.source_id   || null,
    };
    const { error } = await adminUpdateTokenRow(id, fields);
    if (error) { setTokenMsg("Save failed: " + error.message); return; }
    setTokenRowsRaw(prev => (prev || []).map(r => r.id === id ? { ...r, ...fields } : r));
    setEditTokenId(null); setEditTokenData({});
    setTokenMsg("Saved."); setTimeout(() => setTokenMsg(""), 2000);
  }

  async function handleDeleteToken(id) {
    if (!window.confirm("Delete this token record? Cannot be undone.")) return;
    const { error } = await adminDeleteTokenRow(id);
    if (error) { setTokenMsg("Delete failed: " + error.message); return; }
    setTokenRowsRaw(prev => (prev || []).filter(r => r.id !== id));
    setTokenMsg("Deleted."); setTimeout(() => setTokenMsg(""), 2000);
  }

  // ── Taxonomy handlers ────────────────────────────────────────────────────────
  async function saveTaxEdit(termId) {
    if (!editName.trim()) return;
    const { error } = await adminUpdateTerm(termId, editName.trim());
    if (error) { setTaxMsg("Save failed: " + error.message); return; }
    setTerms(prev => prev.map(t => t.term_id === termId ? { ...t, name: editName.trim() } : t));
    setEditTermId(null);
    setTaxMsg("Updated."); setTimeout(() => setTaxMsg(""), 2000);
  }
  async function deleteTerm(term) {
    const cnt = termCounts[term.term_id] || 0;
    if (!window.confirm(cnt > 0 ? `"${term.name}" has ${cnt} mapping(s). Delete anyway?` : `Delete "${term.name}"?`)) return;
    const { error } = await adminDeleteTerm(term.term_id);
    if (error) { setTaxMsg("Delete failed: " + error.message); return; }
    setTerms(prev => prev.filter(t => t.term_id !== term.term_id));
    setTaxMsg("Deleted."); setTimeout(() => setTaxMsg(""), 2000);
  }
  async function addTerm(e) {
    e.preventDefault();
    if (!newTermName.trim()) return;
    const termId = "TERM_" + String(Date.now()).slice(-6);
    const { error } = await adminAddTerm(termId, newTermName.trim(), newTermType);
    if (error) { setTaxMsg("Add failed: " + error.message); return; }
    setTerms(prev => [...prev, { term_id: termId, name: newTermName.trim(), type: newTermType }]);
    setNewTermName("");
    setTaxMsg("Added."); setTimeout(() => setTaxMsg(""), 2000);
  }

  // ── Badge handlers ──────────────────────────────────────────────────────────
  async function toggleBadge(badge) {
    const newVal = !badge.is_active;
    setBadges(prev => prev.map(b => b.badge_id === badge.badge_id ? { ...b, is_active: newVal } : b));
    const { error } = await adminToggleBadge(badge.badge_id, newVal);
    if (error) {
      setBadges(prev => prev.map(b => b.badge_id === badge.badge_id ? { ...b, is_active: badge.is_active } : b));
      setBadgeMsg("Toggle failed: " + error.message); setTimeout(() => setBadgeMsg(""), 3000);
    }
  }

  async function saveBadge() {
    const { badge_id, earned_count, ...fields } = editBadgeData;
    fields.criteria_value = parseInt(fields.criteria_value, 10) || 0;
    fields.sort_order      = parseInt(fields.sort_order, 10)     || 0;
    const { error } = await adminUpdateBadge(editBadgeId, fields);
    if (error) { setBadgeMsg("Save failed: " + error.message); return; }
    setBadges(prev => prev.map(b => b.badge_id === editBadgeId ? { ...b, ...fields } : b));
    setEditBadgeId(null); setEditBadgeData({});
    setBadgeMsg("Saved."); setTimeout(() => setBadgeMsg(""), 2500);
  }

  async function addBadge() {
    if (!addBadgeData.badge_id?.trim()) { setBadgeMsg("Badge ID required."); return; }
    const row = {
      ...addBadgeData,
      criteria_value: parseInt(addBadgeData.criteria_value, 10) || 0,
      sort_order:      parseInt(addBadgeData.sort_order, 10)     || 99,
      is_active:       addBadgeData.is_active !== false,
    };
    const { error } = await adminAddBadge(row);
    if (error) { setBadgeMsg("Add failed: " + error.message); return; }
    setBadges(prev => [...prev, row]);
    setShowAddBadge(false); setAddBadgeData({});
    setBadgeMsg("Added."); setTimeout(() => setBadgeMsg(""), 2500);
  }

  async function deleteBadge(badge) {
    if (!window.confirm(`Delete badge "${badge.badge_name}"? This cannot be undone.`)) return;
    const { error } = await adminDeleteBadge(badge.badge_id);
    if (error) { setBadgeMsg("Delete failed: " + error.message); return; }
    setBadges(prev => prev.filter(b => b.badge_id !== badge.badge_id));
    setBadgeMsg("Deleted."); setTimeout(() => setBadgeMsg(""), 2500);
  }

  async function handleAwardToken() {
    if (!grantUser) { setGrantMsg("Select a user."); return; }
    const { error } = await adminAwardToken(grantUser, grantType, grantQty);
    if (error) { setGrantMsg("Award failed: " + error.message); return; }
    setGrantMsg(`Awarded ${grantQty} × ${grantType} token(s) ✓`);
    setTimeout(() => setGrantMsg(""), 3000);
    loadTokens();
  }

  // ── Import handlers ──────────────────────────────────────────────────────────
  async function fetchNextSnippetKey() {
    const { data } = await supabaseClient
      .from("snippet_core")
      .select("import_key")
      .order("import_key", { ascending: false })
      .limit(1);
    const maxKey = data?.[0]?.import_key ?? 0;
    setNextSnippetKey(maxKey + 1);
  }

  async function fetchNextQuestionKey() {
    const next = await getNextQuestionKey();
    setNextQuestionKey(next);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportSheets(null);
    setImportResults(null);
    setImportMsg("");
    setValidateResults(null);
    setValidated(false);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        // Accept a sheet named "Snippets", or fall back to the first sheet
        const sheetName = wb.SheetNames.includes("Snippets") ? "Snippets" : wb.SheetNames[0];
        if (!sheetName) { setImportMsg("The file has no sheets."); return; }
        const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
        // Normalise header names: trim, lowercase, spaces → underscores
        const rows = rawRows.map(r => {
          const out = {};
          for (const [k, v] of Object.entries(r))
            out[k.trim().toLowerCase().replace(/\s+/g, "_")] = v;
          return out;
        });
        if (!rows.length) { setImportMsg("Sheet is empty."); return; }
        setImportSheets({ Snippets: rows });
      } catch (err) {
        setImportMsg("Could not parse file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImportAll() {
    const rows = importSheets?.Snippets || [];
    if (!rows.length) return;
    setImportRunning(true);
    setImportResults(null);
    setImportMsg("");

    // Step 1: snippets first (creates snippet_ids needed by question import)
    const snippetRows = rows.filter(r => String(r.english_hook || "").trim());
    let combined = { errors: [] };
    if (snippetRows.length) {
      const stats = await adminImportSnippetsFull(snippetRows);
      Object.assign(combined, stats);
      combined.errors = stats.errors || [];
    }

    // Step 2: questions (any row with a question_key and question text)
    const qStats = await adminImportQuestions(rows);
    combined.questionsCreated = qStats.questionsCreated;
    combined.questionsUpdated = qStats.questionsUpdated;
    combined.questionsSkipped = qStats.questionsSkipped;
    combined.errors = [...(combined.errors || []), ...(qStats.errors || [])];

    setImportResults(combined);
    setImportMsg(combined.errors.length
      ? "Import finished with " + combined.errors.length + " error(s) — see details below."
      : "Import complete ✓");
    setImportRunning(false);
  }

  async function handleValidate() {
    const rows = importSheets?.Snippets || [];
    // Only rows with english_hook contain snippet data to validate;
    // question-only rows (have question_key but no english_hook) skip snippet validation.
    const snippetRows = rows.filter(r => String(r.english_hook || "").trim());
    if (!snippetRows.length) {
      // Questions-only re-import — auto-pass
      setValidateResults({ counts: { ok: 0, warn: 0, error: 0, total: 0 }, rowIssues: [], resolutions: {} });
      setValidated(true);
      return;
    }
    setValidateRunning(true);
    setValidateResults(null);
    setValidated(false);
    const results = await adminDryRunImport(snippetRows);
    setValidateResults(results);
    setValidated(results.counts.error === 0);
    setValidateRunning(false);
  }

  async function downloadTemplate() {
    // Single merged sheet: snippet fields + question fields in each row.
    // A row may have snippet data only, question data only, or both.
    const COLS = [
      // ── Snippet fields ─────────────────────────────────────────────────────
      "snippet_key",         // stable integer — dedup key for snippets
      "english_hook",        // required for snippet rows
      "difficulty_level",
      "snippet_value",
      "picture_url","picture_alt","picture_attribution",
      "language",
      "hook","explanation","key_term","key_term_meaning",
      "life_connection","refresher_question","source_reference",
      "lesson","module","theme","level","course","order_index",
      // ── Question fields ────────────────────────────────────────────────────
      "question_key",        // stable integer — dedup key for questions (shared namespace across Type 1 + 2)
      "question",
      "hint",                // optional — leave blank if none
      "option_1",            // CORRECT answer
      "option_2","option_3","option_4",  // wrong answers
    ];
    const EXAMPLE = [
      "1",                   // snippet_key
      "The stone chariot stands at Hampi","3","10",
      "https://example.com/hampi.jpg","Stone Chariot at Hampi","Archaeological Survey of India",
      "English",
      "The stone chariot stands at Hampi",
      "The stone chariot is a famous monument in Hampi.",
      "Chariot","A vehicle used in ancient India",
      "Architecture connects us to our past.",
      "What is the stone chariot made of?","Source: ASI records",
      "Hampi Heritage","Architecture Module","Sacred Geography","Preparatory","Heritage Course","1",
      "1",                   // question_key
      "What material is the stone chariot at Hampi carved from?",
      "Think about ancient Indian architecture",
      "Granite","Sandstone","Limestone","Marble",
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([COLS, EXAMPLE]), "Snippets");

    // Reference sheet — fetch live data
    try {
      const [langR, levelR, courseR] = await Promise.all([
        supabaseClient.from("languages").select("language").order("language"),
        supabaseClient.from("levels").select("title").order("title"),
        supabaseClient.from("courses").select("course_name").order("course_name"),
      ]);
      const refRows = [
        ["Field", "Notes"],
        [],
        ["── Lookup values ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────", ""],
        ["language",       (langR.data  || []).map(r => r.language).join(", ")],
        ["level",          (levelR.data || []).map(r => r.title).join(", ")],
        ["course",         (courseR.data|| []).map(r => r.course_name).join(", ")],
        [],
        ["── Snippet fields ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────", ""],
        ["snippet_key",      "Stable integer. Dedup key for snippets. Required for snippet rows. Use 'Check next snippet_key' in the import tab."],
        ["english_hook",     "English version of the hook — required for snippet rows. Used to identify the snippet conceptually."],
        ["difficulty_level", "1  2  3  4  5  (1 = easiest, 5 = hardest)"],
        ["snippet_value",    "Dharma points awarded for this snippet (number)"],
        ["order_index",      "Position of this snippet within the lesson (1, 2, 3, …)"],
        ["picture_url",      "Direct public URL to the image (https://…). Leave blank if none. On re-import, replaces the existing image."],
        ["picture_alt",      "Alt text / caption for the image"],
        ["picture_attribution", "Credit line, e.g. Archaeological Survey of India"],
        [],
        ["module",  "Free text. If it does not exist it will be created and linked to the theme/level/course above."],
        ["theme",   "Free text. If it does not exist it will be created."],
        ["lesson",  "Free text. If it does not exist it will be created and linked to the module above."],
        [],
        ["── Question fields ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────", ""],
        ["question_key", "Stable integer. Dedup/upsert key for questions. Shared namespace across Type 1 and Type 2. Use 'Check next question_key' in the import tab."],
        ["question",     "The question text shown to the learner."],
        ["option_1",     "CORRECT answer — always put the right answer here."],
        ["option_2–4",   "Wrong answers — all three required, none can be blank."],
        ["hint",         "Optional hint shown to learner on request (may carry a score penalty). Leave blank if none."],
        [],
        ["── Re-import behaviour ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────", ""],
        ["Snippets",   "If snippet_key already exists: non-empty cells overwrite the existing value. Blank cells are ignored."],
        ["Questions",  "If question_key already exists: all question fields are overwritten with the new values."],
        [],
        ["Note", "Spelling variations in any lookup field are tolerated (fuzzy matching). Unrecognised language names are the only hard error — validate the file in the Admin Import tab before importing."],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(refRows), "Reference");
    } catch (_) { /* Reference sheet is optional — proceed without it */ }

    XLSX.writeFile(wb, "indiyatra_import_template.xlsx");
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const filteredUsers = (users || []).filter(u => !userSearch || (u.display_name || "").toLowerCase().includes(userSearch.toLowerCase()));
  const categories = terms.filter(t => t.type === "category");
  const tags = terms.filter(t => t.type === "tag");
  const navLinks = [
    { label: "Home",      onClick: onHome },
    { label: "Discover",  onClick: onDiscover },
    { label: "Dashboard", onClick: onDashboard },
    { label: "Likes",     onClick: onLikes },
    { label: "Bookmarks", onClick: onBookmarks },
  ];

  // ── Content sub-tab columns config ───────────────────────────────────────────
  function getColumns(sub) {
    if (sub === "Levels")   return ["level_id","title","level_number"];
    if (sub === "Courses")  return ["course_id","course_name","course_number","description","sequential_unlock"];
    if (sub === "Themes")   return ["theme_id","title","description"];
    if (sub === "Modules")  return ["module_id","module_name","module_number","course_id","level_id","theme_id","visibility","description"];
    if (sub === "Lessons")  return ["lesson_id","lesson_name","lesson_number","module_id","lesson_description"];
    if (sub === "Snippets") return ["snippet_id","difficulty_level","snippet_value","_hook"];
    return [];
  }

  function getDisplayCols(sub) {
    if (sub === "Levels")   return ["level_id","title","level_number"];
    if (sub === "Courses")  return ["course_id","course_name","course_number","sequential_unlock"];
    if (sub === "Themes")   return ["theme_id","title"];
    if (sub === "Modules")  return ["module_id","module_name","course_id","level_id","visibility"];
    if (sub === "Lessons")  return ["lesson_id","lesson_name","module_id"];
    if (sub === "Snippets") return ["snippet_id","difficulty_level","snippet_value","hook"];
    return [];
  }

  function cellVal(row, col, sub) {
    if (sub === "Snippets" && col === "hook") return row._trans?.hook || "—";
    if (typeof row[col] === "boolean") return row[col] ? "Yes" : "No";
    const v = row[col];
    if (v === null || v === undefined) return "—";
    return String(v).slice(0, 60) + (String(v).length > 60 ? "…" : "");
  }

  function colLabel(col) {
    return col.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderEditForm(sub, row, pk, extraCols = 0) {
    const cols = getColumns(sub);
    return (
      <tr className="crud-form-row" key={"edit-" + row[pk]}>
        <td colSpan={getDisplayCols(sub).length + 1 + extraCols}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
            {cols.map(col => {
              if (col === "_hook") return null;
              const isId = col === pk;
              const val = editData[col] !== undefined ? editData[col] : (row[col] ?? "");
              return (
                <div key={col}>
                  <label style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, display: "block", marginBottom: 3 }}>{colLabel(col)}</label>
                  {typeof row[col] === "boolean" ? (
                    <select className="crud-select" value={String(editData[col] !== undefined ? editData[col] : row[col])} onChange={e => setEditData(d => ({ ...d, [col]: e.target.value === "true" }))}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : col.includes("description") || col.includes("explanation") || col === "snippet_value" ? (
                    <textarea className="crud-textarea" value={val} readOnly={isId} onChange={e => !isId && setEditData(d => ({ ...d, [col]: e.target.value }))} />
                  ) : (
                    <input className="crud-input" value={val} readOnly={isId} style={isId ? { background: "#f5f0e8", color: "#aaa" } : {}} onChange={e => !isId && setEditData(d => ({ ...d, [col]: e.target.value }))} />
                  )}
                </div>
              );
            })}
            {sub === "Snippets" && (
              <>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, display: "block", marginBottom: 3 }}>Hook ({snipLang})</label>
                  <textarea className="crud-textarea" value={editData._trans?.hook ?? (row._trans?.hook || "")} onChange={e => setEditData(d => ({ ...d, _trans: { ...(d._trans || {}), hook: e.target.value } }))} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, display: "block", marginBottom: 3 }}>Explanation ({snipLang})</label>
                  <textarea className="crud-textarea" value={editData._trans?.explanation ?? (row._trans?.explanation || "")} onChange={e => setEditData(d => ({ ...d, _trans: { ...(d._trans || {}), explanation: e.target.value } }))} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, display: "block", marginBottom: 3 }}>Key Term ({snipLang})</label>
                  <input className="crud-input" value={editData._trans?.key_term ?? (row._trans?.key_term || "")} onChange={e => setEditData(d => ({ ...d, _trans: { ...(d._trans || {}), key_term: e.target.value } }))} />
                </div>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ padding: "7px 18px", minHeight: 36, fontSize: "0.875rem" }} onClick={handleSaveEdit}>Save</button>
            <button className="btn-outline" style={{ padding: "7px 18px", minHeight: 36, fontSize: "0.875rem" }} onClick={() => { setEditId(null); setEditData({}); }}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  function renderAddForm(sub, pk, extraCols = 0) {
    const cols = getColumns(sub);
    return (
      <tr className="crud-form-row">
        <td colSpan={getDisplayCols(sub).length + 1 + extraCols}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
            {cols.map(col => {
              if (col === "_hook") return null;
              const val = addData[col] ?? "";
              const isBoolean = col === "sequential_unlock";
              return (
                <div key={col}>
                  <label style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, display: "block", marginBottom: 3 }}>{colLabel(col)}{col === pk ? " *" : ""}</label>
                  {isBoolean ? (
                    <select className="crud-select" value={String(val || "false")} onChange={e => setAddData(d => ({ ...d, [col]: e.target.value === "true" }))}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  ) : col.includes("description") || col.includes("explanation") || col === "snippet_value" ? (
                    <textarea className="crud-textarea" placeholder={col} value={val} onChange={e => setAddData(d => ({ ...d, [col]: e.target.value }))} />
                  ) : (
                    <input className="crud-input" placeholder={col === pk ? "Required" : col} value={val} onChange={e => setAddData(d => ({ ...d, [col]: e.target.value }))} />
                  )}
                </div>
              );
            })}
            {sub === "Snippets" && (
              <>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, display: "block", marginBottom: 3 }}>Hook ({snipLang})</label>
                  <textarea className="crud-textarea" value={addData._trans?.hook || ""} onChange={e => setAddData(d => ({ ...d, _trans: { ...(d._trans || {}), hook: e.target.value } }))} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "#aaa", fontWeight: 700, display: "block", marginBottom: 3 }}>Explanation ({snipLang})</label>
                  <textarea className="crud-textarea" value={addData._trans?.explanation || ""} onChange={e => setAddData(d => ({ ...d, _trans: { ...(d._trans || {}), explanation: e.target.value } }))} />
                </div>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ padding: "7px 18px", minHeight: 36, fontSize: "0.875rem" }} onClick={handleAdd}>Add</button>
            <button className="btn-outline" style={{ padding: "7px 18px", minHeight: 36, fontSize: "0.875rem" }} onClick={() => { setShowAdd(false); setAddData({}); }}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyles + styles}</style>
      <PageHeader onHome={onHome} onOpenSettings={onOpenSettings} onResume={onResume} isAdmin={isAdmin} onAdmin={onAdmin} userEditorialRole={userEditorialRole} onEditor={onEditor} activePage={activePage} settings={settings} onSaveSettings={onSaveSettings} languages={languages} navLinks={navLinks} />

      {!isAdmin ? (
        <div className="admin-denied"><h2>Access Denied</h2><p>You need an admin role to view this page.</p></div>
      ) : (
        <>
          <div style={{ padding:'32px 2rem 0', maxWidth:1440, margin:'0 auto' }}>
            <h1 style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'2rem', color:'#101828', margin:'0 0 6px' }}>Admin Dashboard</h1>
            <p style={{ fontFamily:"'Nunito Sans',sans-serif", fontSize:'0.9375rem', color:'#4A5565', margin:0 }}>Manage content, users, tokens, and platform settings.</p>
          </div>

          <div className="admin-tabs">
            {TABS.map(t => <button key={t} className={"admin-tab-btn" + (activeTab === t ? " active" : "")} onClick={() => setActiveTab(t)}>{t}</button>)}
          </div>

          <div className="page-wrap">

            {/* ── OVERVIEW ─────────────────────────────────────────────── */}
            {activeTab === "Overview" && (
              overviewLoading ? <p style={{ color: "#aaa", padding: "40px 0" }}>Loading…</p> : <>
                <div className="admin-stat-grid">
                  {[["Courses", courses.length], ["Modules", modCount], ["Lessons", lesCount], ["Snippets", snipCount]].map(([l, v]) => (
                    <div key={l} className="admin-stat-card">
                      <div className="admin-stat-val">{v}</div>
                      <div className="admin-stat-lbl">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="page-section">
                  <div className="page-section-head"><div className="page-section-title">Per-Course Breakdown</div></div>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Course</th><th>Modules</th><th>Lessons</th></tr></thead>
                      <tbody>{courseStats.map(c => <tr key={c.course_id}><td style={{ fontWeight: 600 }}>{c.course_name}</td><td>{c.modules}</td><td>{c.lessons}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── USERS ────────────────────────────────────────────────── */}
            {activeTab === "Users" && (
              <div className="page-section">
                <div className="page-section-head">
                  <div className="page-section-title">Registered Users</div>
                  {users && <div className="page-section-meta">{users.length} total</div>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <input className="admin-search" placeholder="Search by name…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                {usersLoading ? <p style={{ color: "#aaa" }}>Loading…</p> : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Name</th><th>Role</th><th>Joined</th><th>Lessons</th><th>Dharma</th></tr></thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.profile_id}>
                            <td style={{ fontWeight: 600 }}>{u.display_name || <span style={{ color: "#bbb" }}>—</span>}</td>
                            <td><span className={"role-pill " + (u.role_id !== "ROLE_04" ? "admin" : "learner")}>{u.role_name}</span></td>
                            <td style={{ color: "#6B6B6B" }}>{fmtDate(u.created_at)}</td>
                            <td>{u.lessons_completed}</td>
                            <td>{u.dharma_points.toLocaleString()}</td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#aaa", padding: "32px" }}>No users found</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TOKENS ───────────────────────────────────────────────── */}
            {activeTab === "Tokens" && (
              <div className="page-section">

                {/* ── Token Catalogue ─────────────────────────────────────── */}
                <div style={{ marginBottom: 32 }}>
                  <div className="page-section-head" style={{ marginBottom: 10 }}>
                    <div className="page-section-title">Token Catalogue</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {tokenCatalogue.length > 0 && <div className="page-section-meta">{tokenCatalogue.length} types</div>}
                      <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                        onClick={() => { setShowAddCat(v => !v); setAddCatData({}); setCatMsg(""); }}>
                        {showAddCat ? "Cancel" : "+ Add Type"}
                      </button>
                    </div>
                  </div>
                  {catMsg && <div className={"crud-msg " + (catMsg.includes("fail") ? "err" : "ok")} style={{ marginBottom: 10 }}>{catMsg}</div>}
                  {catLoading ? <p style={{ color: "#aaa" }}>Loading catalogue…</p> : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Icon</th><th>Token Type</th><th>Name</th><th>Earn Trigger</th>
                            <th>Description</th><th>Order</th><th>Active</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tokenCatalogue.map(row => (
                            editCatType === row.token_type ? (
                              <tr key={row.token_type} style={{ background: "#fffbf0" }}>
                                <td>
                                  <input value={editCatData.token_icon || ""} onChange={e => setEditCatData(p => ({ ...p, token_icon: e.target.value }))}
                                    style={{ width: 48, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "1.1rem", textAlign: "center" }} />
                                </td>
                                <td style={{ fontSize: "0.8rem", color: "#6B6B6B" }}>{row.token_type}</td>
                                <td>
                                  <input value={editCatData.token_name || ""} onChange={e => setEditCatData(p => ({ ...p, token_name: e.target.value }))}
                                    style={{ width: 120, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                                </td>
                                <td>
                                  <input value={editCatData.earn_trigger || ""} onChange={e => setEditCatData(p => ({ ...p, earn_trigger: e.target.value }))}
                                    style={{ width: 100, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                                </td>
                                <td>
                                  <input value={editCatData.description || ""} onChange={e => setEditCatData(p => ({ ...p, description: e.target.value }))}
                                    style={{ width: 200, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                                </td>
                                <td>
                                  <input type="number" value={editCatData.sort_order ?? 0} onChange={e => setEditCatData(p => ({ ...p, sort_order: +e.target.value }))}
                                    style={{ width: 60, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                                </td>
                                <td>
                                  <input type="checkbox" checked={!!editCatData.is_active} onChange={e => setEditCatData(p => ({ ...p, is_active: e.target.checked }))} />
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  <button className="icon-btn" title="Save" onClick={() => handleSaveCatEdit(row.token_type)}>✓</button>
                                  <button className="icon-btn" title="Cancel" onClick={() => { setEditCatType(null); setEditCatData({}); }}>✕</button>
                                </td>
                              </tr>
                            ) : (
                              <tr key={row.token_type}>
                                <td style={{ fontSize: "1.3rem", textAlign: "center" }}>{row.token_icon || "🪙"}</td>
                                <td>
                                  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: "#f5f0e8", fontSize: "0.8rem", fontWeight: 700, color: "#7a5a2a" }}>
                                    {row.token_type}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{row.token_name}</td>
                                <td style={{ color: "#6B6B6B", fontSize: "0.8rem" }}>{row.earn_trigger || "—"}</td>
                                <td style={{ color: "#6B6B6B", fontSize: "0.8rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.description || "—"}</td>
                                <td style={{ color: "#aaa", fontSize: "0.8rem" }}>{row.sort_order}</td>
                                <td>{row.is_active ? <span style={{ color: GREEN, fontWeight: 700 }}>✓</span> : <span style={{ color: "#ccc" }}>–</span>}</td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  <button className="icon-btn" title="Edit" onClick={() => {
                                    setEditCatType(row.token_type);
                                    setEditCatData({ token_icon: row.token_icon, token_name: row.token_name, earn_trigger: row.earn_trigger || "", description: row.description || "", sort_order: row.sort_order, is_active: row.is_active });
                                  }}>✏</button>
                                  <button className="icon-btn danger" title="Delete" onClick={() => handleDeleteCatToken(row.token_type)}>🗑</button>
                                </td>
                              </tr>
                            )
                          ))}
                          {tokenCatalogue.length === 0 && !catLoading && (
                            <tr><td colSpan={8} style={{ textAlign: "center", color: "#aaa", padding: "24px" }}>No token types defined</td></tr>
                          )}
                          {showAddCat && (
                            <tr style={{ background: "#f0faf5" }}>
                              <td>
                                <input value={addCatData.token_icon || ""} onChange={e => setAddCatData(p => ({ ...p, token_icon: e.target.value }))}
                                  placeholder="🪙" style={{ width: 48, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "1.1rem", textAlign: "center" }} />
                              </td>
                              <td>
                                <input value={addCatData.token_type || ""} onChange={e => setAddCatData(p => ({ ...p, token_type: e.target.value }))}
                                  placeholder="e.g. pearl" style={{ width: 100, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                              </td>
                              <td>
                                <input value={addCatData.token_name || ""} onChange={e => setAddCatData(p => ({ ...p, token_name: e.target.value }))}
                                  placeholder="Name" style={{ width: 120, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                              </td>
                              <td>
                                <input value={addCatData.earn_trigger || ""} onChange={e => setAddCatData(p => ({ ...p, earn_trigger: e.target.value }))}
                                  placeholder="lesson/module/…" style={{ width: 100, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                              </td>
                              <td>
                                <input value={addCatData.description || ""} onChange={e => setAddCatData(p => ({ ...p, description: e.target.value }))}
                                  placeholder="Description" style={{ width: 200, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                              </td>
                              <td>
                                <input type="number" value={addCatData.sort_order ?? 0} onChange={e => setAddCatData(p => ({ ...p, sort_order: +e.target.value }))}
                                  style={{ width: 60, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem" }} />
                              </td>
                              <td>
                                <input type="checkbox" defaultChecked onChange={e => setAddCatData(p => ({ ...p, is_active: e.target.checked }))} />
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <button className="icon-btn" title="Add" onClick={handleAddCatToken}>✓</button>
                                <button className="icon-btn" title="Cancel" onClick={() => { setShowAddCat(false); setAddCatData({}); }}>✕</button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Grant New Token panel */}
                <div style={{ marginTop: 24, background: "white", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontFamily: "'Alumni Sans', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#0A0A0A", marginBottom: 12 }}>Grant New Token</div>
                  {grantMsg && <div className={"crud-msg " + (grantMsg.includes("failed") ? "err" : "ok")} style={{ marginBottom: 10 }}>{grantMsg}</div>}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B6B6B" }}>User</label>
                      <select className="crud-select" value={grantUser} onChange={e => setGrantUser(e.target.value)} style={{ minWidth: 160 }}>
                        <option value="">Select user…</option>
                        {(users || []).map(u => <option key={u.id} value={u.id}>{u.display_name || u.id.slice(0,8)}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B6B6B" }}>Token type</label>
                      <select className="crud-select" value={grantType} onChange={e => setGrantType(e.target.value)}>
                        {tokenCatalogue.length > 0
                          ? tokenCatalogue.map(t => <option key={t.token_type} value={t.token_type}>{t.token_icon} {t.token_name}</option>)
                          : ["tulsi","ashoka","lotus","peepal","banyan","dharma"].map(t => <option key={t} value={t}>{t}</option>)
                        }
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B6B6B" }}>Qty</label>
                      <input type="number" min={1} max={999} value={grantQty} onChange={e => setGrantQty(e.target.value)}
                        style={{ width: 70, padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.9rem" }} />
                    </div>
                    <button className="btn-primary" style={{ padding: "8px 20px", minHeight: 38, alignSelf: "flex-end" }} onClick={handleAwardToken}>Award</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── CONTENT ──────────────────────────────────────────────── */}
            {activeTab === "Content" && (
              <div className="page-section">
                <div className="page-section-head">
                  <div className="page-section-title">Content Management</div>
                  {contentSub === "Snippets" && langs.length > 0 && (
                    <select className="crud-select" value={snipLang} onChange={e => { setSnipLang(e.target.value); loadContent("Snippets"); }}>
                      {langs.map(l => <option key={l.language_id} value={l.language_id}>{l.language}</option>)}
                    </select>
                  )}
                </div>
                <div className="admin-sub-tabs">
                  {CONTENT_SUBS.map(s => <button key={s} className={"admin-sub-btn" + (contentSub === s ? " active" : "")} onClick={() => setContentSub(s)}>{s}</button>)}
                </div>

                {contentMsg.text && <div className={"crud-msg " + (contentMsg.ok ? "ok" : "err")}>{contentMsg.text}</div>}

                {/* ── Filter bars ── */}
                {contentSub === "Modules" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6B6B6B" }}>Filter:</span>
                    <select className="crud-select" value={moduleFilter.course} onChange={e => { const f={...moduleFilter,course:e.target.value}; setModuleFilter(f); loadContent("Modules",f,lessonFilter,snippetFilter); }}>
                      <option value="">All Courses</option>
                      {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                    </select>
                    <select className="crud-select" value={moduleFilter.level} onChange={e => { const f={...moduleFilter,level:e.target.value}; setModuleFilter(f); loadContent("Modules",f,lessonFilter,snippetFilter); }}>
                      <option value="">All Levels</option>
                      {refData.levels.map(l => <option key={l.level_id} value={l.level_id}>{l.title}</option>)}
                    </select>
                    <select className="crud-select" value={moduleFilter.theme} onChange={e => { const f={...moduleFilter,theme:e.target.value}; setModuleFilter(f); loadContent("Modules",f,lessonFilter,snippetFilter); }}>
                      <option value="">All Themes</option>
                      {refData.themes.map(t => <option key={t.theme_id} value={t.theme_id}>{t.title}</option>)}
                    </select>
                    {(moduleFilter.course||moduleFilter.level||moduleFilter.theme) && (
                      <button style={{ fontSize:"0.78rem",padding:"3px 10px",background:"none",border:"1px solid #ccc",borderRadius:6,cursor:"pointer",color:"#666" }}
                        onClick={() => { const f={course:"",level:"",theme:""}; setModuleFilter(f); loadContent("Modules",f,lessonFilter,snippetFilter); }}>Clear</button>
                    )}
                  </div>
                )}
                {contentSub === "Lessons" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6B6B6B" }}>Filter:</span>
                    <select className="crud-select" value={lessonFilter.module} onChange={e => { const f={module:e.target.value}; setLessonFilter(f); loadContent("Lessons",moduleFilter,f,snippetFilter); }}>
                      <option value="">All Modules</option>
                      {refData.modules.map(m => <option key={m.module_id} value={m.module_id}>{m.module_name}</option>)}
                    </select>
                    {lessonFilter.module && (
                      <button style={{ fontSize:"0.78rem",padding:"3px 10px",background:"none",border:"1px solid #ccc",borderRadius:6,cursor:"pointer",color:"#666" }}
                        onClick={() => { const f={module:""}; setLessonFilter(f); loadContent("Lessons",moduleFilter,f,snippetFilter); }}>Clear</button>
                    )}
                  </div>
                )}
                {contentSub === "Snippets" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6B6B6B" }}>Filter:</span>
                    <select className="crud-select" value={snippetFilter.lesson} onChange={e => { const f={lesson:e.target.value}; setSnippetFilter(f); loadContent("Snippets",moduleFilter,lessonFilter,f); }}>
                      <option value="">All Snippets (by ID)</option>
                      {refData.lessons.map(l => <option key={l.lesson_id} value={l.lesson_id}>{l.lesson_name}</option>)}
                    </select>
                    {snippetFilter.lesson
                      ? <button style={{ fontSize:"0.78rem",padding:"3px 10px",background:"none",border:"1px solid #ccc",borderRadius:6,cursor:"pointer",color:"#666" }}
                          onClick={() => { const f={lesson:""}; setSnippetFilter(f); loadContent("Snippets",moduleFilter,lessonFilter,f); }}>Clear</button>
                      : <span style={{ fontSize:"0.75rem",color:"#bbb" }}>← select a lesson to enable drag-and-drop reordering</span>
                    }
                  </div>
                )}

                {contentLoading ? <p style={{ color: "#aaa", padding: "20px 0" }}>Loading…</p> : (() => {
                  const rows = contentData[contentSub] || [];
                  const pk = getPK(contentSub);
                  const displayCols = getDisplayCols(contentSub);
                  const canReorder = ["Modules","Lessons"].includes(contentSub)
                    || (contentSub === "Snippets" && !!snippetFilter.lesson);
                  return (
                    <>
                      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                        <button className="btn-primary" style={{ padding: "7px 18px", minHeight: 36, fontSize: "0.875rem" }} onClick={() => { setShowAdd(s => !s); setAddData({}); setEditId(null); }}>
                          {showAdd ? "Cancel" : "+ Add New"}
                        </button>
                        {dragSaving && <span style={{ fontSize: "0.8rem", color: "#6B6B6B" }}>Saving order…</span>}
                        {canReorder && !dragSaving && <span style={{ fontSize: "0.75rem", color: "#bbb" }}>⠿ Drag rows to reorder</span>}
                      </div>
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              {canReorder && <th style={{ width: 28 }}></th>}
                              {displayCols.map(c => <th key={c}>{colLabel(c === "hook" ? "Hook (preview)" : c)}</th>)}
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {showAdd && renderAddForm(contentSub, pk, canReorder ? 1 : 0)}
                            {rows.map(row => (
                              editId === row[pk] ? renderEditForm(contentSub, row, pk, canReorder ? 1 : 0) : (
                                <tr key={row[pk]}
                                  draggable={canReorder}
                                  onDragStart={canReorder ? () => setDragId(row[pk]) : undefined}
                                  onDragEnd={canReorder ? () => { setDragId(null); setDragOverId(null); } : undefined}
                                  onDragOver={canReorder ? e => { e.preventDefault(); setDragOverId(row[pk]); } : undefined}
                                  onDrop={canReorder ? () => handleDrop(row[pk]) : undefined}
                                  style={{
                                    opacity: dragId === row[pk] ? 0.4 : 1,
                                    borderTop: dragOverId === row[pk] && dragId !== row[pk] ? "2px solid " + SAFFRON : undefined,
                                    background: dragOverId === row[pk] && dragId !== row[pk] ? SAFFRON + "18" : undefined,
                                  }}
                                >
                                  {canReorder && (
                                    <td style={{ width: 28, textAlign: "center", color: "#ccc", cursor: "grab", userSelect: "none", fontSize: "1.1rem", paddingLeft: 6 }}>⠿</td>
                                  )}
                                  {displayCols.map(c => <td key={c} style={c === pk ? { fontWeight: 600, color: "#555", fontSize: "0.8125rem" } : {}}>{cellVal(row, c, contentSub)}</td>)}
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    <button className="icon-btn" title="Edit" onClick={() => { setEditId(row[pk]); setEditData({ ...row }); setShowAdd(false); }}>✏</button>
                                    <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(row[pk])}>🗑</button>
                                  </td>
                                </tr>
                              )
                            ))}
                            {rows.length === 0 && !showAdd && (
                              <tr><td colSpan={displayCols.length + (canReorder ? 2 : 1)} style={{ textAlign: "center", color: "#aaa", padding: "32px" }}>No records</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── TAXONOMY ─────────────────────────────────────────────── */}
            {activeTab === "Taxonomy" && (
              <div className="page-section">
                <div className="page-section-head">
                  <div className="page-section-title">Taxonomy Terms</div>
                  {terms.length > 0 && <div className="page-section-meta">{terms.length} terms</div>}
                </div>
                {taxMsg && <div className={"crud-msg " + (taxMsg.startsWith("Save") || taxMsg.startsWith("Delete") || taxMsg.startsWith("Add failed") ? "err" : "ok")}>{taxMsg}</div>}
                {taxLoading ? <p style={{ color: "#aaa" }}>Loading…</p> : (
                  <>
                    {[["category", "Categories", categories], ["tag", "Tags", tags]].map(([type, label, list]) => (
                      <div key={type}>
                        <div className="tax-type-label">{label}</div>
                        {list.map(term => (
                          <div className="tax-term-row" key={term.term_id}>
                            <span className="tax-term-id">{term.term_id}</span>
                            {editTermId === term.term_id ? (
                              <>
                                <input className="tax-edit-input" value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveTaxEdit(term.term_id); if (e.key === "Escape") setEditTermId(null); }} autoFocus />
                                <button className="icon-btn" onClick={() => saveTaxEdit(term.term_id)}>✓</button>
                                <button className="icon-btn" onClick={() => setEditTermId(null)}>✕</button>
                              </>
                            ) : (
                              <>
                                <span className="tax-term-name">{term.name}</span>
                                <span className="tax-term-count">{termCounts[term.term_id] || 0} mapped</span>
                                <button className="icon-btn" onClick={() => { setEditTermId(term.term_id); setEditName(term.name); }}>✏</button>
                                <button className="icon-btn danger" onClick={() => deleteTerm(term)}>🗑</button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    <form className="tax-add-form" onSubmit={addTerm}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#6B6B6B", whiteSpace: "nowrap" }}>Add term</span>
                      <input className="tax-add-input" placeholder="Term name" value={newTermName} onChange={e => setNewTermName(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
                      <select className="tax-type-select" value={newTermType} onChange={e => setNewTermType(e.target.value)}>
                        <option value="category">Category</option>
                        <option value="tag">Tag</option>
                      </select>
                      <button type="submit" className="btn-primary" style={{ padding: "8px 18px", minHeight: 38 }}>Add</button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* ── BADGES ───────────────────────────────────────────────── */}
            {activeTab === "Badges" && (
              <div className="page-section">
                <div className="page-section-head">
                  <div className="page-section-title">Badge Catalogue</div>
                  {badges.length > 0 && <div className="page-section-meta">{badges.filter(b => b.is_active).length} active / {badges.length} total</div>}
                </div>
                {badgeMsg && <div className={"crud-msg " + (badgeMsg.startsWith("Save") || badgeMsg.startsWith("Add failed") || badgeMsg.startsWith("Delete failed") ? "err" : "ok")}>{badgeMsg}</div>}
                <div style={{ marginBottom: 14 }}>
                  <button className="btn-primary" style={{ padding: "7px 18px", minHeight: 36, fontSize: "0.875rem" }}
                    onClick={() => { setShowAddBadge(s => !s); setAddBadgeData({}); setEditBadgeId(null); }}>
                    {showAddBadge ? "Cancel" : "+ Add Badge"}
                  </button>
                </div>
                {badgesLoading ? <p style={{ color: "#aaa" }}>Loading…</p> : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Icon</th><th>Badge ID</th><th>Name</th><th>Category</th>
                          <th>Criteria type</th><th style={{ textAlign: "center" }}>Value</th>
                          <th>Description</th><th style={{ textAlign: "center" }}>Sort</th>
                          <th style={{ textAlign: "center" }}>Active</th><th>Earned</th><th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Add row */}
                        {showAddBadge && (() => {
                          const ab = addBadgeData;
                          const setAb = patch => setAddBadgeData(p => ({ ...p, ...patch }));
                          return (
                            <tr style={{ background: "white" }}>
                              <td><input style={{ width: 48, textAlign: "center" }} value={ab.badge_icon || ""} onChange={e => setAb({ badge_icon: e.target.value })} placeholder="🏆" /></td>
                              <td><input style={{ width: 110, fontFamily: "monospace", fontSize: "0.8rem" }} value={ab.badge_id || ""} onChange={e => setAb({ badge_id: e.target.value })} placeholder="BADGE_XX" /></td>
                              <td><input style={{ width: 130 }} value={ab.badge_name || ""} onChange={e => setAb({ badge_name: e.target.value })} placeholder="Name…" /></td>
                              <td>
                                <select value={ab.badge_category || "progression"} onChange={e => setAb({ badge_category: e.target.value })}>
                                  {["progression","volume","streak","daily"].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </td>
                              <td><input style={{ width: 110 }} value={ab.criteria_type || ""} onChange={e => setAb({ criteria_type: e.target.value })} placeholder="e.g. lessons_completed" /></td>
                              <td><input type="number" style={{ width: 60, textAlign: "center" }} value={ab.criteria_value || ""} onChange={e => setAb({ criteria_value: e.target.value })} placeholder="0" /></td>
                              <td><input style={{ width: 160 }} value={ab.description || ""} onChange={e => setAb({ description: e.target.value })} placeholder="Description…" /></td>
                              <td><input type="number" style={{ width: 50, textAlign: "center" }} value={ab.sort_order || ""} onChange={e => setAb({ sort_order: e.target.value })} placeholder="99" /></td>
                              <td style={{ textAlign: "center" }}>
                                <label className="toggle-switch" style={{ margin: "0 auto" }}>
                                  <input type="checkbox" checked={ab.is_active !== false} onChange={e => setAb({ is_active: e.target.checked })} />
                                  <span className="toggle-track" /><span className="toggle-thumb" />
                                </label>
                              </td>
                              <td>—</td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <button className="icon-btn" title="Save" onClick={addBadge}>✓</button>
                                <button className="icon-btn" title="Cancel" onClick={() => { setShowAddBadge(false); setAddBadgeData({}); }}>✕</button>
                              </td>
                            </tr>
                          );
                        })()}
                        {/* Existing rows */}
                        {badges.map(badge => editBadgeId === badge.badge_id ? (() => {
                          const eb = editBadgeData;
                          const setEb = patch => setEditBadgeData(p => ({ ...p, ...patch }));
                          return (
                            <tr key={badge.badge_id} style={{ background: "#F0F7FF" }}>
                              <td><input style={{ width: 48, textAlign: "center" }} value={eb.badge_icon || ""} onChange={e => setEb({ badge_icon: e.target.value })} /></td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#6B6B6B" }}>{badge.badge_id}</td>
                              <td><input style={{ width: 130 }} value={eb.badge_name || ""} onChange={e => setEb({ badge_name: e.target.value })} /></td>
                              <td>
                                <select value={eb.badge_category || ""} onChange={e => setEb({ badge_category: e.target.value })}>
                                  {["progression","volume","streak","daily"].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </td>
                              <td><input style={{ width: 110 }} value={eb.criteria_type || ""} onChange={e => setEb({ criteria_type: e.target.value })} /></td>
                              <td><input type="number" style={{ width: 60, textAlign: "center" }} value={eb.criteria_value ?? ""} onChange={e => setEb({ criteria_value: e.target.value })} /></td>
                              <td><input style={{ width: 200 }} value={eb.description || ""} onChange={e => setEb({ description: e.target.value })} /></td>
                              <td><input type="number" style={{ width: 50, textAlign: "center" }} value={eb.sort_order ?? ""} onChange={e => setEb({ sort_order: e.target.value })} /></td>
                              <td style={{ textAlign: "center" }}>
                                <label className="toggle-switch" style={{ margin: "0 auto" }}>
                                  <input type="checkbox" checked={!!eb.is_active} onChange={e => setEb({ is_active: e.target.checked })} />
                                  <span className="toggle-track" /><span className="toggle-thumb" />
                                </label>
                              </td>
                              <td style={{ color: "#aaa", fontSize: "0.8rem" }}>{badgeCounts[badge.badge_id] || 0}</td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <button className="icon-btn" title="Save" onClick={saveBadge}>✓</button>
                                <button className="icon-btn" title="Cancel" onClick={() => { setEditBadgeId(null); setEditBadgeData({}); }}>✕</button>
                              </td>
                            </tr>
                          );
                        })() : (
                          <tr key={badge.badge_id} style={{ opacity: badge.is_active ? 1 : 0.5 }}>
                            <td style={{ fontSize: "1.25rem", textAlign: "center" }}>{badge.badge_icon}</td>
                            <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#6B6B6B" }}>{badge.badge_id}</td>
                            <td style={{ fontWeight: 600 }}>{badge.badge_name}</td>
                            <td><span className={"badge-cat-pill " + badge.badge_category}>{badge.badge_category}</span></td>
                            <td style={{ fontSize: "0.8125rem", color: "#666" }}>{badge.criteria_type}</td>
                            <td style={{ textAlign: "center", fontWeight: 600 }}>{badge.criteria_value}</td>
                            <td style={{ fontSize: "0.8125rem", color: "#666", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{badge.description}</td>
                            <td style={{ textAlign: "center", color: "#6B6B6B" }}>{badge.sort_order}</td>
                            <td style={{ textAlign: "center" }}>
                              <label className="toggle-switch" style={{ margin: "0 auto" }}>
                                <input type="checkbox" checked={badge.is_active} onChange={() => toggleBadge(badge)} />
                                <span className="toggle-track" /><span className="toggle-thumb" />
                              </label>
                            </td>
                            <td style={{ fontSize: "0.8125rem", color: "#aaa" }}>{badgeCounts[badge.badge_id] || 0}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <button className="icon-btn" title="Edit" onClick={() => { setEditBadgeId(badge.badge_id); setEditBadgeData({ ...badge }); setShowAddBadge(false); }}>✏</button>
                              <button className="icon-btn danger" title="Delete" onClick={() => deleteBadge(badge)}>🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}


            {/* ── FEATURED ────────────────────────────────────────────────── */}
            {activeTab === "Featured" && (
              <div className="page-section">
                <div className="page-section-head">
                  <div className="page-section-title">Featured Snippets</div>
                  <div className="page-section-meta" style={{ fontSize:"0.8125rem", color:"#4A5565" }}>
                    Slot 1 = hero card on Gateway page. Slots 2–10 = swipe pool.
                  </div>
                </div>

                {featMsg && <div className={"crud-msg " + (featMsg.includes("Failed") ? "err" : "ok")} style={{ marginBottom:12 }}>{featMsg}</div>}

                <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                  <input value={featSearch} onChange={e => setFeatSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchFeatSnip()}
                    placeholder="Search snippet by key or hook…"
                    style={{ flex:1, padding:"7px 12px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:"0.875rem" }} />
                  <button onClick={searchFeatSnip} disabled={featSearching}
                    className="btn-primary" style={{ padding:"7px 16px", fontSize:"0.875rem" }}>
                    {featSearching ? "Searching…" : "Search"}
                  </button>
                </div>

                {featResults.length > 0 && featTargetSlot && (
                  <div style={{ marginBottom:16, padding:"10px 14px", background:"#F9F9F9", borderRadius:8, border:"1px solid #E5E7EB" }}>
                    <div style={{ fontSize:"0.8125rem", fontWeight:600, marginBottom:8, color:"#101828" }}>
                      Assign to Slot {featTargetSlot}:
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {featResults.slice(0, 10).map(r => (
                        <div key={r.snippet_id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:"0.8125rem", flex:1, color:"#4A5565" }}>
                            {r.snippet_id.slice(0, 8)}… · ♥ {r.like_count || 0}
                          </span>
                          <button onClick={() => { assignFeatSlot(featTargetSlot, r.snippet_id); setFeatResults([]); setFeatTargetSlot(null); }}
                            style={{ padding:"3px 12px", borderRadius:6, border:"1px solid #00509E", color:"#00509E", background:"white", cursor:"pointer", fontSize:"0.8125rem" }}>
                            Fill
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {featLoading ? <div style={{ color:"#4A5565" }}>Loading…</div> : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr>
                        <th style={{ width:36 }}>Slot</th>
                        <th>Snippet ID</th>
                        <th style={{ width:60 }}>Likes</th>
                        <th style={{ width:120 }}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {featSlots.map((slot, i) => (
                          <tr key={i} style={{ background: i === 0 ? "#FFFBF0" : "white" }}>
                            <td style={{ fontWeight:700, color: i===0 ? "#FF8E00" : "#4A5565" }}>{i + 1}{i===0?" ★":""}</td>
                            <td style={{ fontFamily:"'Inter',sans-serif", fontSize:"0.8125rem", color:"#4A5565" }}>
                              {slot ? slot.snippet_id.slice(0, 16) + "…" : <span style={{ color:"#ccc" }}>— empty —</span>}
                            </td>
                            <td style={{ color:"#4A5565", fontSize:"0.8125rem" }}>
                              {slot?.snippet_core?.like_count ?? "—"}
                            </td>
                            <td>
                              <div style={{ display:"flex", gap:4 }}>
                                <button onClick={() => { setFeatTargetSlot(i + 1); setFeatResults([]); setFeatSearch(""); }}
                                  style={{ padding:"2px 8px", borderRadius:6, border:"1px solid #00509E", color:"#00509E", background:"white", cursor:"pointer", fontSize:"0.75rem" }}>
                                  Fill
                                </button>
                                {slot && <>
                                  <button onClick={() => moveFeatSlot(i + 1, -1)} disabled={i === 0}
                                    style={{ padding:"2px 6px", borderRadius:6, border:"1px solid #E5E7EB", background:"white", cursor:"pointer", fontSize:"0.75rem" }}>↑</button>
                                  <button onClick={() => moveFeatSlot(i + 1, 1)} disabled={i === 9}
                                    style={{ padding:"2px 6px", borderRadius:6, border:"1px solid #E5E7EB", background:"white", cursor:"pointer", fontSize:"0.75rem" }}>↓</button>
                                  <button onClick={() => clearFeatSlot(i + 1)}
                                    style={{ padding:"2px 8px", borderRadius:6, border:"1px solid #E5E7EB", color:"#999", background:"white", cursor:"pointer", fontSize:"0.75rem" }}>✕</button>
                                </>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ORDER ──────────────────────────────────────────────────── */}
            {activeTab === "Order" && (
              <div className="page-section">
                <div className="page-section-head">
                  <div className="page-section-title">Content Order</div>
                  <div className="page-section-meta" style={{ fontSize:"0.8125rem", color:"#4A5565" }}>Drag rows or use ↑↓ to reorder. Saves immediately.</div>
                </div>

                <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
                  {["courses","themes","modules","lessons"].map(p => (
                    <button key={p} onClick={() => { setOrderPanel(p); loadOrderPanel(p); }}
                      style={{ padding:"6px 18px", borderRadius:8, border:"1.5px solid", cursor:"pointer",
                        fontFamily:"'Inter',sans-serif", fontSize:"0.8125rem", fontWeight:500,
                        borderColor: orderPanel===p ? "#00509E":"#E5E7EB",
                        background:  orderPanel===p ? "#00509E":"white",
                        color:       orderPanel===p ? "white":"#4A5565" }}>
                      {({courses:"Courses",themes:"Themes",modules:"Modules",lessons:"Lessons"})[p]}
                    </button>
                  ))}
                </div>

                {orderPanel === "modules" && (
                  <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
                    <select value={orderFilter.course} onChange={e => { const f={...orderFilter,course:e.target.value}; setOrderFilter(f); loadOrderPanel("modules",f); }}
                      style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:"0.8125rem" }}>
                      <option value="">All Courses</option>
                      {orderCourses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                    </select>
                    <select value={orderFilter.theme} onChange={e => { const f={...orderFilter,theme:e.target.value}; setOrderFilter(f); loadOrderPanel("modules",f); }}
                      style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:"0.8125rem" }}>
                      <option value="">All Themes</option>
                      {orderThemes.map(t => <option key={t.theme_id} value={t.theme_id}>{t.title}</option>)}
                    </select>
                  </div>
                )}

                {orderPanel === "lessons" && (
                  <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
                    <select value={orderFilter.course} onChange={async e => {
                        const f={...orderFilter,course:e.target.value,theme:"",module:""};
                        setOrderFilter(f); setOrderModules([]); setOrderLessons([]);
                        let q="?select=module_id,module_name,sort_order&order=sort_order";
                        if (f.course) q+="&course_id=eq."+f.course;
                        setOrderModules(await supabase("modules",q) || []);
                      }}
                      style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:"0.8125rem" }}>
                      <option value="">All Courses</option>
                      {orderCourses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                    </select>
                    <select value={orderFilter.theme} onChange={async e => {
                        const f={...orderFilter,theme:e.target.value,module:""};
                        setOrderFilter(f); setOrderLessons([]);
                        let q="?select=module_id,module_name,sort_order&order=sort_order";
                        if (f.course) q+="&course_id=eq."+f.course;
                        if (f.theme)  q+="&theme_id=eq."+f.theme;
                        setOrderModules(await supabase("modules",q) || []);
                      }}
                      style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:"0.8125rem" }}>
                      <option value="">All Themes</option>
                      {orderThemes.map(t => <option key={t.theme_id} value={t.theme_id}>{t.title}</option>)}
                    </select>
                    <select value={orderFilter.module} onChange={e => { const f={...orderFilter,module:e.target.value}; setOrderFilter(f); loadOrderPanel("lessons",f); }}
                      style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:"0.8125rem" }}>
                      <option value="">Select Module</option>
                      {orderModules.map(m => <option key={m.module_id} value={m.module_id}>{m.module_name}</option>)}
                    </select>
                  </div>
                )}

                {orderMsg && <div className={"crud-msg "+(orderMsg.includes("failed")?"err":"ok")} style={{ marginBottom:12 }}>{orderMsg}</div>}

                {orderLoading && <div style={{ color:"#4A5565", fontSize:"0.9rem", padding:"12px 0" }}>Loading…</div>}

                {!orderLoading && (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr>
                        <th style={{ width:32 }}></th>
                        <th>#</th>
                        <th>Name</th>
                        <th style={{ width:80 }}>Reorder</th>
                      </tr></thead>
                      <tbody>
                        {(({courses:orderCourses,themes:orderThemes,modules:orderModules,lessons:orderLessons})[orderPanel]||[]).length === 0 && (
                          <tr><td colSpan={4} style={{ color:"#4A5565", padding:"16px", textAlign:"center" }}>
                            {orderPanel==="modules"||orderPanel==="lessons" ? "Select filters above to load items." : "No items found."}
                          </td></tr>
                        )}
                        {(({courses:orderCourses,themes:orderThemes,modules:orderModules,lessons:orderLessons})[orderPanel]||[]).map((row, idx) => {
                          const idKey  ={courses:"course_id",themes:"theme_id",modules:"module_id",lessons:"lesson_id"}[orderPanel];
                          const nameKey={courses:"course_name",themes:"title",modules:"module_name",lessons:"lesson_name"}[orderPanel];
                          const allItems=({courses:orderCourses,themes:orderThemes,modules:orderModules,lessons:orderLessons})[orderPanel]||[];
                          return (
                            <tr key={row[idKey]} draggable
                              onDragStart={() => setOrderDragIdx(idx)}
                              onDragOver={e => e.preventDefault()}
                              onDrop={() => orderDrop(orderPanel, idx)}
                              style={{ background:orderDragIdx===idx?"#FFF8EE":"white", cursor:"grab" }}>
                              <td style={{ color:"#aaa", fontSize:"1rem", textAlign:"center", userSelect:"none" }}>⠿</td>
                              <td style={{ color:"#4A5565", fontSize:"0.8rem", width:36 }}>{idx+1}</td>
                              <td style={{ fontWeight:500 }}>{row[nameKey]}</td>
                              <td><div style={{ display:"flex", gap:4 }}>
                                <button onClick={() => orderMove(orderPanel,idx,-1)} disabled={idx===0||orderSaving}
                                  style={{ padding:"2px 8px", borderRadius:6, border:"1px solid #E5E7EB", background:"white", cursor:"pointer", fontSize:"0.8rem" }}>↑</button>
                                <button onClick={() => orderMove(orderPanel,idx,1)} disabled={idx===allItems.length-1||orderSaving}
                                  style={{ padding:"2px 8px", borderRadius:6, border:"1px solid #E5E7EB", background:"white", cursor:"pointer", fontSize:"0.8rem" }}>↓</button>
                              </div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── IMPORT ──────────────────────────────────────────────────── */}
            {activeTab === "Import" && (
              <div className="page-section">
                <div className="page-section-head">
                  <div className="page-section-title">Import from Excel</div>
                </div>
                <p style={{ color: "#555", marginBottom: 16, fontSize: "0.9rem" }}>
                  Import snippets and/or Type 1 questions from a single <strong>.xlsx</strong> file ("Snippets" sheet).
                  Use <code>snippet_key</code> as a stable ID for snippets and <code>question_key</code> for questions — both enable reliable re-imports and upserts.
                  On re-import, non-empty snippet fields overwrite existing values; question rows are fully replaced by <code>question_key</code>.
                  Rows with only question fields (no <code>english_hook</code>) skip snippet processing.
                </p>

                {/* ── Next key banners ── */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                  {nextSnippetKey === null
                    ? <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "5px 14px" }} onClick={fetchNextSnippetKey}>Check next snippet_key</button>
                    : (
                    <div style={{ padding: "10px 16px", background: "#f0f7ff", border: "1px solid #c0d8f0", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <i className="ti ti-key" style={{ color: "#00509E", fontSize: "1.1rem" }} />
                      <span style={{ fontSize: "0.9rem", color: "#1F1F1F" }}>
                        Next <strong>snippet_key</strong>: <strong style={{ color: "#00509E", fontSize: "1.1rem" }}>{nextSnippetKey}</strong>
                      </span>
                    </div>
                  )}
                  {nextQuestionKey === null
                    ? <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "5px 14px" }} onClick={fetchNextQuestionKey}>Check next question_key</button>
                    : (
                    <div style={{ padding: "10px 16px", background: "#f0f7ff", border: "1px solid #c0d8f0", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <i className="ti ti-question-mark" style={{ color: "#00509E", fontSize: "1.1rem" }} />
                      <span style={{ fontSize: "0.9rem", color: "#1F1F1F" }}>
                        Next <strong>question_key</strong>: <strong style={{ color: "#00509E", fontSize: "1.1rem" }}>{nextQuestionKey}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Step 1: Download template ── */}
                <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn-secondary" style={{ padding: "7px 18px", fontSize: "0.875rem" }} onClick={downloadTemplate}>
                    ⬇ Download Template
                  </button>
                  <span style={{ fontSize: "0.8rem", color: "#6B6B6B" }}>
                    Single "Snippets" sheet with all columns + a Reference sheet. Fill snippet fields, question fields, or both per row.
                  </span>
                </div>

                {/* ── Step 2: Choose file ── */}
                <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
                  <label className="btn-primary" style={{ cursor: "pointer", display: "inline-block", padding: "7px 18px", fontSize: "0.875rem" }}>
                    📂 Choose Excel File
                    <input ref={importInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImportFile} />
                  </label>
                  {importFile && (
                    <span style={{ fontSize: "0.875rem", color: "#555" }}>
                      {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                {importMsg && !importResults && (
                  <div className={"crud-msg " + (importMsg.includes("error") || importMsg.includes("Could not") ? "err" : "ok")} style={{ marginBottom: 16 }}>
                    {importMsg}
                  </div>
                )}

                {/* Sheet preview */}
                {importSheets && Object.entries(importSheets).map(([sheetName, rows]) => {
                  if (!rows.length) return null;
                  const cols = Object.keys(rows[0]);
                  return (
                    <div key={sheetName} style={{ marginBottom: 24 }}>
                      <div style={{ fontFamily: "'Alumni Sans', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#0A0A0A", marginBottom: 8 }}>
                        {sheetName} — {rows.length} row{rows.length !== 1 ? "s" : ""}
                      </div>
                      <div className="admin-table-wrap" style={{ maxHeight: 200, overflowY: "auto" }}>
                        <table className="admin-table">
                          <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                          <tbody>
                            {rows.slice(0, 5).map((row, i) => (
                              <tr key={i}>{cols.map(c => (
                                <td key={c} style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {String(row[c] ?? "")}
                                </td>
                              ))}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {rows.length > 5 && <div style={{ color: "#aaa", fontSize: "0.8rem", padding: "4px 0" }}>Showing 5 of {rows.length} rows</div>}
                    </div>
                  );
                })}

                {/* ── Step 3: Validate ── */}
                {importSheets && (
                  <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: "9px 22px", fontSize: "0.9rem" }}
                      onClick={handleValidate}
                      disabled={validateRunning}
                    >
                      {validateRunning ? "Validating…" : "🔍 Validate"}
                    </button>
                    {validateResults && !validateRunning && (
                      <span style={{ fontSize: "0.8rem", color: "#6B6B6B" }}>
                        {validated ? "Validation passed — ready to import." : "Fix errors before importing."}
                      </span>
                    )}
                  </div>
                )}

                {/* Validation results panel */}
                {validateResults && !validateRunning && (() => {
                  const { counts, rowIssues, resolutions } = validateResults;
                  const hasErr  = counts.error > 0;
                  const hasWarn = counts.warn  > 0;
                  const borderColor = hasErr ? "#fcc" : hasWarn ? "#ffe0a0" : "#b8e6cc";
                  const bgColor     = hasErr ? "#fff8f8" : hasWarn ? "#fffbf0" : "#f2fbf6";
                  return (
                    <div style={{ marginBottom: 24, padding: "16px 18px", borderRadius: 10, border: "1px solid " + borderColor, background: bgColor }}>

                      {/* Summary row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", marginBottom: (rowIssues.length || Object.keys(resolutions).some(f => Object.values(resolutions[f] || {}).some(r => r.type !== "exact"))) ? 14 : 0 }}>
                        {hasErr && <span style={{ color: "#c00", fontWeight: 700, fontSize: "0.9rem" }}>❌ {counts.error} row{counts.error !== 1 ? "s" : ""} with errors (will be skipped)</span>}
                        {hasWarn && <span style={{ color: "#b86000", fontWeight: 600, fontSize: "0.9rem" }}>⚠️ {counts.warn} row{counts.warn !== 1 ? "s" : ""} with fuzzy matches</span>}
                        {counts.ok > 0 && <span style={{ color: "#2a6", fontWeight: 600, fontSize: "0.9rem" }}>✅ {counts.ok} row{counts.ok !== 1 ? "s" : ""} ready</span>}
                      </div>

                      {/* Issue list — only non-ok rows */}
                      {rowIssues.length > 0 && (
                        <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
                          {rowIssues.map((ri, idx) => (
                            <div key={idx} style={{ marginBottom: 6, padding: "7px 10px", borderRadius: 6, background: ri.status === "error" ? "#ffe8e8" : "#fff7e0", borderLeft: "3px solid " + (ri.status === "error" ? "#c00" : "#d08000") }}>
                              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: ri.status === "error" ? "#c00" : "#a06000", marginBottom: 3 }}>
                                Row {ri.rowNum}: {ri.englishHook}
                              </div>
                              {ri.issues.map((iss, j) => (
                                <div key={j} style={{ fontSize: "0.8rem", color: "#444" }}>• {iss}</div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Resolution breakdown — only fields with non-exact matches */}
                      {(() => {
                        const fields = ["language", "course", "level", "theme", "module", "lesson"];
                        const nonTrivial = fields.filter(f => Object.values(resolutions[f] || {}).some(r => r.type !== "exact"));
                        if (!nonTrivial.length) return null;
                        return (
                          <div style={{ borderTop: "1px solid #ddd", paddingTop: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#666", letterSpacing: "0.06em", marginBottom: 8 }}>RESOLUTION DETAILS</div>
                            {nonTrivial.map(f => (
                              <div key={f} style={{ marginBottom: 10 }}>
                                <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#444", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f}</div>
                                {Object.entries(resolutions[f]).map(([val, res]) => {
                                  if (res.type === "exact") return null;
                                  const badge =
                                    res.type === "fuzzy"   ? { bg: "#fff3cd", color: "#856404", text: "≈ fuzzy " + Math.round(res.score * 100) + "%" } :
                                    res.type === "create"  ? { bg: "#cfe2ff", color: "#084298", text: "✦ will create" } :
                                                             { bg: "#f8d7da", color: "#842029", text: "✕ not found" };
                                  return (
                                    <div key={val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: "0.8rem" }}>
                                      <span style={{ fontFamily: "monospace", background: "#f0f0f0", padding: "2px 7px", borderRadius: 4, color: "#333" }}>{val}</span>
                                      {res.resolvedTo && <><span style={{ color: "#6B6B6B" }}>→</span><span style={{ color: "#222" }}>{res.resolvedTo}</span></>}
                                      <span style={{ background: badge.bg, color: badge.color, padding: "2px 8px", borderRadius: 10, fontSize: "0.73rem", fontWeight: 700 }}>{badge.text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* ── Step 4: Import — only enabled after clean validation ── */}
                {validated && !importResults && (
                  <div style={{ marginBottom: 16 }}>
                    <button
                      className="btn-primary"
                      style={{ padding: "9px 28px", fontSize: "0.9rem" }}
                      onClick={handleImportAll}
                      disabled={importRunning}
                    >
                      {importRunning ? "Importing…" : (() => {
                        const rows = importSheets?.Snippets || [];
                        const s = rows.filter(r => String(r.english_hook || "").trim()).length;
                        const q = rows.filter(r => String(r.question_key || "").trim() && String(r.question || "").trim()).length;
                        const parts = [];
                        if (s) parts.push(s + " snippet" + (s !== 1 ? "s" : ""));
                        if (q) parts.push(q + " question" + (q !== 1 ? "s" : ""));
                        return "⬆ Import " + (parts.join(" + ") || "0 rows");
                      })()}
                    </button>

                  </div>
                )}

                {/* Results */}
                {importResults && (
                  <div style={{ marginTop: 8 }}>
                    <div className={"crud-msg " + (importResults.errors?.length ? "err" : "ok")} style={{ marginBottom: 14 }}>
                      {importMsg}
                    </div>
                    {(() => {
                      const r = importResults;
                      const statItems = [
                        { label: "Snippets created",        val: r.snippetsCreated },
                        { label: "Translations added",      val: r.translationsCreated },
                        { label: "Translations updated",    val: r.translationsUpdated },
                        { label: "Translations skipped",    val: r.translationsSkipped,  dim: true },
                        { label: "Images linked",           val: r.assetsCreated },
                        { label: "Fuzzy matches used",      val: r.fuzzyMatches,          dim: true },
                        { label: "Lessons created",         val: r.lessonsCreated },
                        { label: "Modules created",         val: r.modulesCreated },
                        { label: "Themes created",          val: r.themesCreated },
                        { label: "Levels created",          val: r.levelsCreated },
                        { label: "Courses created",         val: r.coursesCreated },
                        { label: "Mappings created",        val: r.mappingsCreated },
                        { label: "Questions created",       val: r.questionsCreated },
                        { label: "Questions updated",       val: r.questionsUpdated },
                        { label: "Questions skipped",       val: r.questionsSkipped,      dim: true },
                        { label: "Quiz sets created",       val: r.quizSetsCreated },
                        { label: "Quiz links created",      val: r.quizLinksCreated },
                      ].filter(s => s.val > 0 || !s.dim);
                      return (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", marginBottom: 16 }}>
                          {statItems.map(s => (
                            <div key={s.label} style={{ fontSize: "0.875rem", color: s.dim ? "#6B6B6B" : "#00924A", minWidth: 170 }}>
                              <span style={{ fontWeight: 700 }}>{s.val ?? 0}</span>
                              <span style={{ color: "#555", marginLeft: 6 }}>{s.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {importResults.errors?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 700, color: "#c00", marginBottom: 6, fontSize: "0.875rem" }}>
                          Errors ({importResults.errors.length}):
                        </div>
                        <div style={{ maxHeight: 160, overflowY: "auto", background: "#fff8f8", border: "1px solid #fcc", borderRadius: 6, padding: "8px 12px" }}>
                          {importResults.errors.map((err, i) => (
                            <div key={i} style={{ fontSize: "0.8125rem", color: "#c00", marginBottom: 3 }}>• {err}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


          </div>
        </>
      )}
    </>
  );
}
