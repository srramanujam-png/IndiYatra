import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./supabase";

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:   true,  // store session in localStorage — survives page refresh
    autoRefreshToken: true,  // silently refresh JWT before it expires
    storageKey:       "indiyatra-auth",
  },
});

export async function signInWithProvider(provider) {
  return supabaseClient.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
}

export async function signInWithEmail(email, password) {
  return supabaseClient.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  return supabaseClient.auth.signUp({ email, password });
}

export async function signOut() {
  return supabaseClient.auth.signOut({ scope: 'local' });
}

export async function signInAnonymously() {
  return supabaseClient.auth.signInAnonymously();
}

export async function getProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}

export async function updateDisplayName(userId, displayName) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ display_name: displayName.trim(), updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
}


export async function updateShareMessage(userId, message) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ share_message: message.trim(), updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
}

export async function updateSnippetShareMessage(userId, message) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ snippet_share_message: message.trim(), updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
}

// ─── Progress persistence ─────────────────────────────────────────────────────

export async function loadCompletions(userId) {
  const { data, error } = await supabaseClient
    .from("lesson_completions")
    .select("lesson_id, points_earned")
    .eq("profile_id", userId);
  return { data, error };
}

export async function saveCompletion(userId, lessonId, courseId, pointsEarned = 0, snippetCount = null) {
  const { data, error } = await supabaseClient
    .from("lesson_completions")
    .upsert({
      profile_id: userId,
      lesson_id: lessonId,
      course_id: courseId,
      points_earned: pointsEarned,
      snippet_count: snippetCount,
      completed_at: new Date().toISOString(),
    }, { onConflict: "profile_id,lesson_id" });
  if (error) {
    console.error("[saveCompletion] UPSERT failed:", JSON.stringify(error),
      { userId, lessonId, courseId, pointsEarned, snippetCount });
  }
  return { data, error };
}

// ─── Lesson progress (resume + snippet tracking) ──────────────────────────────

export async function loadLessonProgress(userId) {
  const { data, error } = await supabaseClient
    .from("lesson_progress")
    .select("lesson_id, snippet_index")
    .eq("profile_id", userId);
  return { data, error };
}

export async function upsertLessonProgress(userId, lessonId, snippetIndex) {
  const { data, error } = await supabaseClient
    .from("lesson_progress")
    .upsert(
      { profile_id: userId, lesson_id: lessonId, snippet_index: snippetIndex, updated_at: new Date().toISOString() },
      { onConflict: "profile_id,lesson_id" }
    );
  if (error) {
    console.error("[upsertLessonProgress] UPSERT failed:", JSON.stringify(error),
      { userId, lessonId, snippetIndex });
  }
  return { data, error };
}

export async function deleteLessonProgress(userId, lessonId) {
  const { data, error } = await supabaseClient
    .from("lesson_progress")
    .delete()
    .eq("profile_id", userId)
    .eq("lesson_id", lessonId);
  if (error) {
    console.error("[deleteLessonProgress] DELETE failed:", JSON.stringify(error),
      { userId, lessonId });
  }
  return { data, error };
}

// ─── Snippet likes ───────────────────────────────────────────────────────────

export async function loadUserLikes(userId, snippetIds) {
  const { data, error } = await supabaseClient
    .from("snippet_likes")
    .select("snippet_id")
    .eq("profile_id", userId)
    .in("snippet_id", snippetIds);
  return { data, error };
}

export async function insertLike(userId, snippetId, courseId, themeId, moduleId, lessonId) {
  const { data, error } = await supabaseClient
    .from("snippet_likes")
    .insert({
      profile_id: userId,
      snippet_id: snippetId,
      course_id:  courseId  || null,
      theme_id:   themeId   || null,
      module_id:  moduleId  || null,
      lesson_id:  lessonId  || null,
      liked_at:   new Date().toISOString(),
    });
  return { data, error };
}

export async function deleteLike(userId, snippetId) {
  const { data, error } = await supabaseClient
    .from("snippet_likes")
    .delete()
    .eq("profile_id", userId)
    .eq("snippet_id", snippetId);
  return { data, error };
}

export async function updateLastVisited(userId, routeJson) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ last_visited_route: routeJson, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return { data, error };
}

// ─── Bookmarks ───────────────────────────────────────────────────────────────

export async function loadUserBookmarks(userId) {
  const { data, error } = await supabaseClient
    .from("bookmarks")
    .select("content_type, content_id")
    .eq("profile_id", userId);
  return { data, error };
}

export async function insertBookmark(userId, contentType, contentId) {
  const { data, error } = await supabaseClient
    .from("bookmarks")
    .upsert(
      { profile_id: userId, content_type: contentType, content_id: contentId, saved_at: new Date().toISOString() },
      { onConflict: "profile_id,content_type,content_id" }
    );
  if (error) {
    console.error("[insertBookmark] UPSERT failed:", JSON.stringify(error), { userId, contentType, contentId });
  }
  return { data, error };
}

export async function deleteBookmark(userId, contentType, contentId) {
  const { data, error } = await supabaseClient
    .from("bookmarks")
    .delete()
    .eq("profile_id", userId)
    .eq("content_type", contentType)
    .eq("content_id", contentId);
  if (error) {
    console.error("[deleteBookmark] DELETE failed:", JSON.stringify(error), { userId, contentType, contentId });
  }
  return { data, error };
}

export async function loadUserBookmarksRich() {
  const { data, error } = await supabaseClient.rpc("get_user_bookmarks");
  if (error) {
    console.error("[loadUserBookmarksRich] RPC failed:", JSON.stringify(error));
  }
  return { data, error };
}

// ─── Admin helpers ───────────────────────────────────────────────────────────

export async function loadUserRole(userId) {
  const { data, error } = await supabaseClient
    .from("user_roles_mapping")
    .select("role_id")
    .eq("profile_id", userId);
  return { data, error };
}

export async function adminGetUsers() {
  const { data, error } = await supabaseClient.rpc("admin_get_users");
  if (error) console.error("[adminGetUsers] RPC failed:", JSON.stringify(error));
  return { data, error };
}

export async function adminGetBadgeCounts() {
  const { data, error } = await supabaseClient.rpc("admin_get_badge_counts");
  if (error) console.error("[adminGetBadgeCounts] RPC failed:", JSON.stringify(error));
  return { data, error };
}

export async function adminToggleBadge(badgeId, isActive) {
  const { data, error } = await supabaseClient
    .from("badges")
    .update({ is_active: isActive })
    .eq("badge_id", badgeId);
  if (error) console.error("[adminToggleBadge] failed:", JSON.stringify(error));
  return { data, error };
}

export async function adminAddTerm(termId, name, type) {
  const { data, error } = await supabaseClient
    .from("taxonomy_terms")
    .insert({ term_id: termId, name, type });
  if (error) console.error("[adminAddTerm] failed:", JSON.stringify(error));
  return { data, error };
}

export async function adminUpdateTerm(termId, name) {
  const { data, error } = await supabaseClient
    .from("taxonomy_terms")
    .update({ name })
    .eq("term_id", termId);
  if (error) console.error("[adminUpdateTerm] failed:", JSON.stringify(error));
  return { data, error };
}

export async function adminDeleteTerm(termId) {
  const { data, error } = await supabaseClient
    .from("taxonomy_terms")
    .delete()
    .eq("term_id", termId);
  if (error) console.error("[adminDeleteTerm] failed:", JSON.stringify(error));
  return { data, error };
}

export async function adminUpsertTranslation(termId, languageId, name) {
  const { data, error } = await supabaseClient
    .from("taxonomy_term_translations")
    .upsert({ term_id: termId, language_id: languageId, name },
             { onConflict: "term_id,language_id" });
  if (error) console.error("[adminUpsertTranslation] failed:", JSON.stringify(error));
  return { data, error };
}

export async function adminDeleteTranslation(termId, languageId) {
  const { data, error } = await supabaseClient
    .from("taxonomy_term_translations")
    .delete()
    .eq("term_id", termId)
    .eq("language_id", languageId);
  if (error) console.error("[adminDeleteTranslation] failed:", JSON.stringify(error));
  return { data, error };
}

export async function adminGetTokens() {
  const { data, error } = await supabaseClient.rpc("admin_get_tokens");
  if (error) console.error("[adminGetTokens] RPC failed:", JSON.stringify(error));
  return { data, error };
}

// ─── Editorial Workflow helpers ──────────────────────────────────────────────

export async function getEditorialRole() {
  const { data, error } = await supabaseClient.rpc("get_editorial_role");
  if (error) console.error("[getEditorialRole] RPC failed:", JSON.stringify(error));
  return { data, error };
}

export async function getEditorialStaff() {
  const { data, error } = await supabaseClient.rpc("get_editorial_staff");
  if (error) console.error("[getEditorialStaff] RPC failed:", JSON.stringify(error));
  return { data, error };
}

export async function loadAllDrafts() {
  const { data, error } = await supabaseClient.rpc("get_all_drafts");
  if (error) console.error("[loadAllDrafts] RPC failed:", JSON.stringify(error));
  return { data, error };
}

export async function loadMyDrafts() {
  const { data, error } = await supabaseClient.rpc("get_my_drafts");
  if (error) console.error("[loadMyDrafts] RPC failed:", JSON.stringify(error));
  return { data, error };
}

export async function loadReviewQueue() {
  const { data, error } = await supabaseClient.rpc("get_review_queue");
  if (error) console.error("[loadReviewQueue] RPC failed:", JSON.stringify(error));
  return { data, error };
}

export async function assignDraft({ contentType, contentId, languageId, assignedTo, dueDate, notes }) {
  const { data, error } = await supabaseClient
    .from("content_drafts")
    .insert({
      content_type: contentType,
      content_id:   contentId,
      language_id:  languageId || null,
      assigned_to:  assignedTo,
      assigned_by:  (await supabaseClient.auth.getUser()).data?.user?.id,
      due_date:     dueDate || null,
      notes:        notes   || null,
      status:       "assigned",
    })
    .select()
    .single();
  if (error) console.error("[assignDraft] INSERT failed:", JSON.stringify(error));
  return { data, error };
}

export async function updateDraftStatus(draftId, status, comment) {
  // 1. Update the draft row
  const { data, error } = await supabaseClient
    .from("content_drafts")
    .update({ status })
    .eq("id", draftId)
    .select()
    .single();
  if (error) { console.error("[updateDraftStatus] UPDATE failed:", JSON.stringify(error)); return { data, error }; }

  // 2. Log a workflow event (fire-and-forget)
  const actorId = (await supabaseClient.auth.getUser()).data?.user?.id;
  supabaseClient
    .from("content_workflow_events")
    .insert({ draft_id: draftId, action: status, actor_id: actorId, comment: comment || null })
    .then(({ error: e }) => { if (e) console.warn("[updateDraftStatus] event insert:", e); });

  return { data, error };
}

export async function addWorkflowEvent(draftId, action, comment) {
  const actorId = (await supabaseClient.auth.getUser()).data?.user?.id;
  const { data, error } = await supabaseClient
    .from("content_workflow_events")
    .insert({ draft_id: draftId, action, actor_id: actorId, comment: comment || null });
  if (error) console.error("[addWorkflowEvent] INSERT failed:", JSON.stringify(error));
  return { data, error };
}

export async function loadDraftEvents(draftId) {
  const { data, error } = await supabaseClient
    .from("content_workflow_events")
    .select("*")
    .eq("draft_id", draftId)
    .order("created_at", { ascending: true });
  if (error) console.error("[loadDraftEvents] SELECT failed:", JSON.stringify(error));
  return { data, error };
}

// ─── Editorial Phase B helpers ───────────────────────────────────────────────

// Load current live content for pre-filling the edit form.
// For snippet_translation: fetches the row matching snippet_id + language.
// For lesson:             fetches the row matching lesson_id.
// Uses the anon read client since these are public-read tables.
export async function loadDraftContent(contentType, contentId, languageId) {
  const { supabase: anonFetch } = await import("./supabase");
  if (contentType === "snippet_translation") {
    const lang = languageId || "";
    const rows = await anonFetch(
      "snippet_translations",
      `?snippet_id=eq.${encodeURIComponent(contentId)}&language=eq.${encodeURIComponent(lang)}&limit=1`
    );
    return { data: rows?.[0] || null };
  } else if (contentType === "lesson") {
    const rows = await anonFetch(
      "lessons",
      `?lesson_id=eq.${encodeURIComponent(contentId)}&limit=1`
    );
    return { data: rows?.[0] || null };
  }
  return { data: null };
}

// Load taxonomy terms already tagged against a piece of content.
export async function loadExistingTaxonomy(entityId, entityType) {
  const { supabase: anonFetch } = await import("./supabase");
  const rows = await anonFetch(
    "content_taxonomy_mapping",
    `?entity_id=eq.${encodeURIComponent(entityId)}&entity_type=eq.${encodeURIComponent(entityType)}&select=term_id`
  );
  return { data: (rows || []).map(r => r.term_id) };
}

// Load all taxonomy terms (for the term picker in the edit form).
export async function loadTaxonomyTerms() {
  const { supabase: anonFetch } = await import("./supabase");
  const rows = await anonFetch("taxonomy_terms", "?select=*&order=type,name");
  return { data: rows || [] };
}

// Save draft_data without changing the draft status.
export async function saveDraftData(draftId, draftData) {
  const { data, error } = await supabaseClient
    .from("content_drafts")
    .update({ draft_data: draftData })
    .eq("id", draftId)
    .select()
    .single();
  if (error) console.error("[saveDraftData] failed:", JSON.stringify(error));
  return { data, error };
}

// Save draft_data AND move status to 'submitted' for verifier review.
export async function submitDraft(draftId, draftData) {
  const { data, error } = await supabaseClient
    .from("content_drafts")
    .update({ draft_data: draftData, status: "submitted" })
    .eq("id", draftId)
    .select()
    .single();
  if (error) { console.error("[submitDraft] failed:", JSON.stringify(error)); return { data, error }; }

  // Log workflow event (fire-and-forget)
  const actorId = (await supabaseClient.auth.getUser()).data?.user?.id;
  supabaseClient
    .from("content_workflow_events")
    .insert({ draft_id: draftId, action: "submitted", actor_id: actorId, comment: "Editor submitted for review" })
    .then(({ error: e }) => { if (e) console.warn("[submitDraft] event:", e); });

  return { data, error };
}

// Call the publish_draft() Supabase RPC to write draft to live tables.
export async function publishDraft(draftId) {
  const { data, error } = await supabaseClient.rpc("publish_draft", { p_draft_id: draftId });
  if (error) console.error("[publishDraft] RPC failed:", JSON.stringify(error));
  return { data, error };
}

// ── Editorial content browser helpers ──────────────────────────────────────

// loadSnippetsForAssignment(languageId)
// Returns all snippets with per-language content status + English preview hook.
// content_status: 'full' | 'partial' | 'none'
// total_fields = 7 (hook, explanation, key_term, key_term_meaning, life_connection, quiz_recap, source_citation)
export async function loadSnippetsForAssignment(languageId) {
  const FIELDS = ["hook","explanation","key_term","key_term_meaning","life_connection","quiz_recap","source_citation"];
  const TOTAL = FIELDS.length;

  const { data: snippets, error } = await supabaseClient
    .from("snippet_core")
    .select("snippet_id")
    .order("snippet_id")
    .limit(300);
  if (error) { console.error("[loadSnippetsForAssignment]", error); return { data: [], error }; }

  // English preview hooks
  const { data: enRows } = await supabaseClient
    .from("snippet_translations")
    .select("snippet_id, hook")
    .eq("language", "LANG_01");

  // Target-language translations (for content status check)
  let langRows = [];
  if (languageId) {
    const { data } = await supabaseClient
      .from("snippet_translations")
      .select("snippet_id, hook, explanation, key_term, key_term_meaning, life_connection, quiz_recap, source_citation")
      .eq("language", languageId);
    langRows = data || [];
  }

  const enMap = {};
  (enRows || []).forEach(r => { enMap[r.snippet_id] = r.hook || ""; });
  const langMap = {};
  langRows.forEach(r => { langMap[r.snippet_id] = r; });

  const result = (snippets || []).map(s => {
    const tr = langMap[s.snippet_id];
    const filled = tr ? FIELDS.filter(f => tr[f] && tr[f].trim() !== "").length : 0;
    return {
      snippet_id:     s.snippet_id,
      preview_hook:   enMap[s.snippet_id] || "",
      content_status: !tr ? "none" : filled === TOTAL ? "full" : "partial",
      filled_count:   filled,
      total_fields:   TOTAL,
    };
  });

  return { data: result, error: null };
}

// loadLessonsForAssignment()
// Returns all lessons with a simple content status (full/partial/none) for the assignment browser.
export async function loadLessonsForAssignment() {
  const { data, error } = await supabaseClient
    .from("lessons")
    .select("lesson_id, lesson_name, lesson_description")
    .order("lesson_id")
    .limit(300);
  if (error) { console.error("[loadLessonsForAssignment]", error); return { data: [], error }; }

  const result = (data || []).map(l => ({
    lesson_id:      l.lesson_id,
    preview_hook:   l.lesson_name || "",
    lesson_name:    l.lesson_name || "",
    content_status: (l.lesson_name && l.lesson_description) ? "full" : l.lesson_name ? "partial" : "none",
    filled_count:   [l.lesson_name, l.lesson_description].filter(Boolean).length,
    total_fields:   2,
  }));

  return { data: result, error: null };
}

// checkActiveDrafts(contentIds, contentType, languageId)
// Returns active (non-terminal) drafts for the given content items.
// languageId is required for snippet_translation — conflicts are per-language,
// so an Assamese draft must not block a Bengali assignment for the same snippet.
export async function checkActiveDrafts(contentIds, contentType, languageId) {
  if (!contentIds || contentIds.length === 0) return { data: [], error: null };
  let q = supabaseClient
    .from("content_drafts")
    .select("content_id, language_id, status, assigned_to")
    .eq("content_type", contentType)
    .in("content_id", contentIds)
    .not("status", "in", "(published,rejected)");
  if (languageId) q = q.eq("language_id", languageId);
  const { data, error } = await q;
  if (error) console.error("[checkActiveDrafts]", error);
  return { data: data || [], error };
}

// grantEditorialRole(profileId, roleId)
// Idempotent: inserts (profile_id, role_id) into user_roles_mapping.
// roleId must be a canonical ROLE_XX value (ROLE_02, ROLE_05, ROLE_06).
export async function grantEditorialRole(profileId, roleId) {
  const { data, error } = await supabaseClient
    .from("user_roles_mapping")
    .upsert({ profile_id: profileId, role_id: roleId }, { onConflict: "profile_id,role_id" });
  if (error) console.error("[grantEditorialRole]", error);
  return { data, error };
}

// revokeEditorialRole(profileId, roleId)
// Removes (profile_id, role_id) from user_roles_mapping.
export async function revokeEditorialRole(profileId, roleId) {
  const { data, error } = await supabaseClient
    .from("user_roles_mapping")
    .delete()
    .eq("profile_id", profileId)
    .eq("role_id", roleId);
  if (error) console.error("[revokeEditorialRole]", error);
  return { data, error };
}

// ─── Content-role helpers (content_role_assignments) ─────────────────────────

// loadContentRoles(contentId, contentType, languageId)
// Returns all sub_role rows for a given piece of content.
// languageId may be null for lessons.
export async function loadContentRoles(contentId, contentType, languageId) {
  let q = supabaseClient
    .from("content_role_assignments")
    .select("id, profile_id, sub_role, assigned_at, assigned_by")
    .eq("content_id", contentId)
    .eq("content_type", contentType);
  if (languageId) q = q.eq("language_id", languageId);
  else            q = q.is("language_id", null);
  const { data, error } = await q;
  if (error) console.error("[loadContentRoles]", error);
  return { data: data || [], error };
}

// assignContentRole(profileId, contentType, contentId, languageId, subRole)
// Upserts a sub_role for a user on a specific piece of content.
// subRole must be 'editor' | 'verifier' | 'supervisor'.
export async function assignContentRole(profileId, contentType, contentId, languageId, subRole) {
  // Uses a SECURITY DEFINER RPC to bypass RLS on content_role_assignments.
  // Direct table INSERT/upsert returned 403 because Supabase evaluates RLS
  // UPDATE policies even for pure inserts with onConflict. The RPC runs as
  // DB owner and checks is_supervisor_or_admin() internally.
  const { data, error } = await supabaseClient.rpc("assign_content_role", {
    p_profile_id:   profileId,
    p_content_type: contentType,
    p_content_id:   contentId,
    p_language_id:  languageId || null,
    p_sub_role:     subRole,
  });
  if (error) console.error("[assignContentRole]", error);
  return { data, error };
}

// revokeContentRole(profileId, contentType, contentId, languageId, subRole)
// Removes a sub_role from a user for a specific piece of content.
export async function revokeContentRole(profileId, contentType, contentId, languageId, subRole) {
  let q = supabaseClient
    .from("content_role_assignments")
    .delete()
    .eq("profile_id", profileId)
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .eq("sub_role", subRole);
  if (languageId) q = q.eq("language_id", languageId);
  else            q = q.is("language_id", null);
  const { data, error } = await q;
  if (error) console.error("[revokeContentRole]", error);
  return { data, error };
}

// loadAllContentRoleAssignments()
// Returns every row in content_role_assignments visible to the current user.
// Supervisor/admin sees all rows (via RLS policy); others see only their own.
export async function loadAllContentRoleAssignments() {
  const { data, error } = await supabaseClient
    .from("content_role_assignments")
    .select("id, profile_id, content_type, content_id, language_id, sub_role, assigned_at");
  if (error) console.error("[loadAllContentRoleAssignments]", error);
  return { data: data || [], error };
}

// deleteAssignment(draft)
// Removes a content_draft (events cascade) and its associated content_role_assignment.
// draft must have: id, assigned_to, content_type, content_id, language_id.
export async function deleteAssignment(draft) {
  // 1. Delete the draft (workflow events cascade via FK ON DELETE CASCADE)
  const { error: draftErr } = await supabaseClient
    .from("content_drafts")
    .delete()
    .eq("id", draft.id);
  if (draftErr) { console.error("[deleteAssignment] draft", draftErr); return { error: draftErr }; }

  // 2. Delete the content role assignment for the same (user, content, language)
  let q = supabaseClient
    .from("content_role_assignments")
    .delete()
    .eq("profile_id",   draft.assigned_to)
    .eq("content_type", draft.content_type)
    .eq("content_id",   draft.content_id);
  if (draft.language_id) q = q.eq("language_id", draft.language_id);
  else                   q = q.is("language_id", null);
  const { error: roleErr } = await q;
  if (roleErr) console.warn("[deleteAssignment] role cleanup", roleErr); // non-fatal
  return { error: null };
}

// ─── Snippet image helpers ────────────────────────────────────────────────────

// uploadSnippetImage(blob, snippetId)
// Uploads a resized image Blob to the "snippet-images" Supabase Storage bucket.
// Returns { url: publicUrl, error }.
export async function uploadSnippetImage(blob, snippetId) {
  const filename = `${snippetId}/${Date.now()}.jpg`;
  const { error: upErr } = await supabaseClient.storage
    .from("snippet-images")
    .upload(filename, blob, { contentType: "image/jpeg", upsert: true });
  if (upErr) { console.error("[uploadSnippetImage]", upErr); return { url: null, error: upErr }; }
  const { data: { publicUrl } } = supabaseClient.storage
    .from("snippet-images")
    .getPublicUrl(filename);
  return { url: publicUrl, error: null };
}

// loadSnippetAsset(snippetId)
// Returns the current asset row for a snippet (for pre-fill in the edit form).
// Returns { data: { asset_id, file_path, alt_text, attribution } | null, error }.
export async function loadSnippetAsset(snippetId) {
  const { data: core, error: coreErr } = await supabaseClient
    .from("snippet_core")
    .select("asset_id")
    .eq("snippet_id", snippetId)
    .maybeSingle();
  if (coreErr || !core?.asset_id) return { data: null, error: coreErr };

  const { data: asset, error: assetErr } = await supabaseClient
    .from("asset_library")
    .select("asset_id, file_path, alt_text, attribution")
    .eq("asset_id", core.asset_id)
    .maybeSingle();
  return { data: asset || null, error: assetErr };
}

// ─── Badge admin helpers ──────────────────────────────────────────────────────

export async function adminUpdateBadge(badgeId, fields) {
  const { data, error } = await supabaseClient
    .from("badges")
    .update(fields)
    .eq("badge_id", badgeId);
  if (error) console.error("[adminUpdateBadge]", error);
  return { data, error };
}

export async function adminAddBadge(fields) {
  const { data, error } = await supabaseClient
    .from("badges")
    .insert(fields);
  if (error) console.error("[adminAddBadge]", error);
  return { data, error };
}

export async function adminDeleteBadge(badgeId) {
  const { data, error } = await supabaseClient
    .from("badges")
    .delete()
    .eq("badge_id", badgeId);
  if (error) console.error("[adminDeleteBadge]", error);
  return { data, error };
}

// ─── Token admin helpers ──────────────────────────────────────────────────────

export async function adminAwardToken(profileId, tokenType, quantity) {
  const { data, error } = await supabaseClient
    .from("user_tokens")
    .insert({
      profile_id:  profileId,
      token_type:  tokenType,
      quantity:    parseInt(quantity, 10),
      source_type: "manual_admin",
      source_id:   "admin",
    });
  if (error) console.error("[adminAwardToken]", error);
  return { data, error };
}

// ─── Bulk import helpers (Excel import tab) ─────────────────────────────────
//
// ── Import string-similarity helpers ─────────────────────────────────────────

function _lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1]
        ? row[j - 1]
        : 1 + Math.min(prev, row[j], row[j - 1]);
      row[j - 1] = prev; prev = val;
    }
    row[n] = prev;
  }
  return row[n];
}

function _sim(a, b) {
  if (a === b) return 1;
  const mx = Math.max(a.length, b.length);
  return mx === 0 ? 1 : 1 - _lev(a, b) / mx;
}

// Returns { id, matchedNorm, score, type:"exact"|"fuzzy" } or null
// Caches fuzzy hits back into normMap so repeated lookups are O(1).
function _fuzzyLookup(needle, normMap, threshold = 0.8) {
  if (!needle) return null;
  if (normMap[needle] !== undefined)
    return { id: normMap[needle], matchedNorm: needle, score: 1, type: "exact" };
  let bestId = null, bestNorm = null, bestScore = 0;
  for (const [k, id] of Object.entries(normMap)) {
    const s = _sim(needle, k);
    if (s > bestScore) { bestScore = s; bestId = id; bestNorm = k; }
  }
  if (bestId !== null && bestScore >= threshold) {
    normMap[needle] = bestId;   // cache so next identical typo is instant
    return { id: bestId, matchedNorm: bestNorm, score: bestScore, type: "fuzzy" };
  }
  return null;
}

// Exact-only variant — used by adminImportSnippetsFull so deliberate
// minor variations in lesson/module/theme/course/language names are never
// silently collapsed into an existing record.
function _exactLookup(needle, normMap) {
  if (!needle || normMap[needle] === undefined) return null;
  return { id: normMap[needle], matchedNorm: needle, score: 1, type: "exact" };
}

// adminImportSnippetsFull(rows)
//
// Single-sheet, text-only import. Each row = one snippet × one language.
// No IDs in the spreadsheet — matching is done by normalized text.
// This function INSERT-only: existing rows for a (snippet, language) pair
// are silently skipped. Upsert will be handled by a separate template later.
//
// Required columns:  english_hook, language
// Optional columns:  difficulty_level, snippet_value,
//                    picture_url, picture_alt, picture_attribution,
//                    hook, explanation, key_term, key_term_meaning,
//                    life_connection, refresher_question, source_reference,
//                    lesson, module, theme, level, course, order_index
//
// Tables written:    snippet_core  (new snippets only)
//                    snippet_translations (new language rows only)
//                    asset_library (new image URLs only)
//                    lesson_snippet_mapping (new pairs only)
//                    lessons / modules / themes / levels / courses (as needed)

export async function adminImportSnippetsFull(rows) {
  const normalize = s => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

  // ── 1. Load all lookup data upfront ──────────────────────────────────────
  const [
    langRes, allTransRes, snipCoreRes,
    lessonRes, moduleRes, themeRes, levelRes, courseRes, assetRes, mappingRes,
  ] = await Promise.all([
    supabaseClient.from("languages").select("language_id, language"),
    supabaseClient.from("snippet_translations").select("snippet_id, language"),
    supabaseClient.from("snippet_core").select("snippet_id, asset_id, import_key"),
    supabaseClient.from("lessons").select("lesson_id, lesson_name, module_id, sort_order"),
    supabaseClient.from("modules").select("module_id, module_name, course_id, level_id, theme_id, sort_order"),
    supabaseClient.from("themes").select("theme_id, title, sort_order"),
    supabaseClient.from("levels").select("level_id, title"),
    supabaseClient.from("courses").select("course_id, course_name, sort_order"),
    supabaseClient.from("asset_library").select("asset_id, file_path"),
    supabaseClient.from("lesson_snippet_mapping").select("lesson_id, snippet_id"),
  ]);

  // ── 2. Lookup maps (normalized text → id) ────────────────────────────────
  const langMap    = {};   // e.g. "tamil" → "LANG_13"
  const transSet   = new Set();   // "snip_id:lang_id" already exists
  const lessonMap  = {};
  const moduleMap  = {};
  const themeMap   = {};
  const levelMap   = {};
  const courseMap  = {};
  const assetMap   = {};
  const mappingSet = new Set();   // "lesson_id:snippet_id" already exists

  (langRes.data    || []).forEach(r => { langMap[normalize(r.language)]    = r.language_id; });
  (allTransRes.data|| []).forEach(r => { transSet.add(r.snippet_id + ":" + r.language); });
  (lessonRes.data  || []).forEach(r => { lessonMap[normalize(r.lesson_name)] = r.lesson_id; });
  (moduleRes.data  || []).forEach(r => { moduleMap[normalize(r.module_name)] = r.module_id; });
  (themeRes.data   || []).forEach(r => { themeMap[normalize(r.title)]       = r.theme_id; });
  (levelRes.data   || []).forEach(r => { levelMap[normalize(r.title)]       = r.level_id; });
  (courseRes.data  || []).forEach(r => { courseMap[normalize(r.course_name)]= r.course_id; });
  (assetRes.data   || []).forEach(r => { assetMap[normalize(r.file_path)]   = r.asset_id; });
  const importKeyMap   = {};          // import_key (int) → snippet_id
  const assetLinkedSet = new Set();  // snippetIds that already have an asset assigned
  (snipCoreRes.data|| []).forEach(r => {
    if (r.import_key != null) importKeyMap[r.import_key] = r.snippet_id;
    if (r.asset_id)           assetLinkedSet.add(r.snippet_id);
  });
  (mappingRes.data || []).forEach(r => { mappingSet.add(r.lesson_id + ":" + r.snippet_id); });

  // ── 3. sort_order trackers ────────────────────────────────────────────────
  const courseMaxOrder = Math.max(0, ...(courseRes.data || []).map(r => r.sort_order || 0));
  const themeMaxOrder  = Math.max(0, ...(themeRes.data  || []).map(r => r.sort_order || 0));
  let nextCourseOrder  = courseMaxOrder;
  let nextThemeOrder   = themeMaxOrder;

  const moduleGroupMax = {};
  (moduleRes.data || []).forEach(r => {
    const key = (r.course_id || "") + "|" + (r.level_id || "") + "|" + (r.theme_id || "");
    moduleGroupMax[key] = Math.max(moduleGroupMax[key] || 0, r.sort_order || 0);
  });

  const lessonModuleMax = {};
  (lessonRes.data || []).forEach(r => {
    if (r.module_id)
      lessonModuleMax[r.module_id] = Math.max(lessonModuleMax[r.module_id] || 0, r.sort_order || 0);
  });

  // ── 4. UUID generator (all content IDs are auto-generated UUIDs) ───────────
  const uuid = () => crypto.randomUUID();

  // ── 4. Process rows ───────────────────────────────────────────────────────
  const stats = {
    snippetsCreated:      0,
    translationsCreated:  0,
    translationsUpdated:  0,
    translationsSkipped:  0,
    assetsCreated:        0,
    lessonsCreated:       0,
    modulesCreated:       0,
    themesCreated:        0,
    levelsCreated:        0,
    coursesCreated:       0,
    mappingsCreated:      0,
    fuzzyMatches:         0,
    errors:               [],
  };

  for (const row of rows) {
    try {
      // ── Required field check ────────────────────────────────────────────
      const englishHook = String(row.english_hook || "").trim();
      if (!englishHook) {
        stats.errors.push("Row skipped — english_hook is blank");
        continue;
      }
      const langName  = normalize(row.language || "English");
      const langMatch = _exactLookup(langName, langMap);
      if (!langMatch) {
        stats.errors.push('Unknown language "' + (row.language || "") + '" — row skipped. Add it to the languages table first.');
        continue;
      }
      const langId = langMatch.id;
      if (langMatch.type === "fuzzy") stats.fuzzyMatches++;

      // ── Find or create snippet_core ─────────────────────────────────────
      // snippet_key is required — it is the sole deduplication key.
      const importKeyRaw = String(row.snippet_key || "").trim();
      const importKeyNum = importKeyRaw !== "" && !isNaN(importKeyRaw) ? Number(importKeyRaw) : null;
      if (importKeyNum === null) {
        stats.errors.push("Row skipped — snippet_key is missing or not a number (english_hook: " + englishHook + ")");
        continue;
      }

      let snippetId = importKeyMap[importKeyNum] !== undefined ? importKeyMap[importKeyNum] : null;
      const dv = v => v !== undefined && String(v).trim() !== "" ? Number(v) : undefined;

      if (!snippetId) {
        snippetId = uuid();
        const coreRow = { snippet_id: snippetId, import_key: importKeyNum };
        if (dv(row.difficulty_level) !== undefined) coreRow.difficulty_level = dv(row.difficulty_level);
        if (dv(row.snippet_value)    !== undefined) coreRow.snippet_value    = dv(row.snippet_value);
        const { error: coreErr } = await supabaseClient.from("snippet_core").insert(coreRow);
        if (coreErr) {
          stats.errors.push("Create snippet (key=" + importKeyNum + "): " + coreErr.message);
          continue;
        }
        importKeyMap[importKeyNum] = snippetId;
        stats.snippetsCreated++;
      } else {
        // Existing snippet — update non-empty fields
        const coreUpd = {};
        if (dv(row.difficulty_level) !== undefined) coreUpd.difficulty_level = dv(row.difficulty_level);
        if (dv(row.snippet_value)    !== undefined) coreUpd.snippet_value    = dv(row.snippet_value);
        if (Object.keys(coreUpd).length > 0) {
          await supabaseClient.from("snippet_core").update(coreUpd).eq("snippet_id", snippetId);
        }
      }

      // ── Find or create asset, then link to snippet ──────────────────────
      // If picture_url is provided in this row, create/find the asset and link
      // it (last import wins). If blank, leave existing asset untouched.
      const picUrl = String(row.picture_url || "").trim();
      if (picUrl) {
        let assetId = assetMap[normalize(picUrl)];
        if (!assetId) {
          assetId = uuid();
          const { error: assetErr } = await supabaseClient.from("asset_library").insert({
            asset_id:    assetId,
            file_path:   picUrl,
            asset_type:  "IMAGE",
            alt_text:    String(row.picture_alt         || "").trim(),
            attribution: String(row.picture_attribution || "").trim(),
          });
          if (!assetErr) {
            assetMap[normalize(picUrl)] = assetId;
            stats.assetsCreated++;
          } else {
            stats.errors.push("Asset create (" + picUrl + "): " + assetErr.message);
          }
        }
        if (assetId) {
          const { error: linkErr } = await supabaseClient
            .from("snippet_core")
            .update({ asset_id: assetId })
            .eq("snippet_id", snippetId);
          if (!linkErr) assetLinkedSet.add(snippetId);
        }
      }

      // ── Upsert translation ────────────────────────────────────────────────
      const transKey = snippetId + ":" + langId;
      const hookVal  = String(row.hook || "").trim() || (langId === "LANG_01" ? englishHook : "");
      if (transSet.has(transKey)) {
        // Partial update: only overwrite fields that have a value in this row
        const upd = {};
        if (hookVal) upd.hook = hookVal;
        const strFields = [
          ["explanation",      row.explanation],
          ["key_term",         row.key_term],
          ["key_term_meaning", row.key_term_meaning],
          ["life_connection",  row.life_connection],
          ["quiz_recap",       row.refresher_question],
          ["source_citation",  row.source_reference],
        ];
        strFields.forEach(([col, val]) => {
          if (String(val || "").trim()) upd[col] = String(val).trim();
        });
        if (Object.keys(upd).length > 0) {
          const { error: updErr } = await supabaseClient
            .from("snippet_translations")
            .update(upd)
            .eq("snippet_id", snippetId)
            .eq("language", langId);
          if (updErr) stats.errors.push("Update translation (" + snippetId + "/" + langId + "): " + updErr.message);
          else stats.translationsUpdated++;
        } else {
          stats.translationsSkipped++;
        }
      } else {
        const transRow = { snippet_translation_id: uuid(), snippet_id: snippetId, language: langId };
        if (hookVal)                              transRow.hook              = hookVal;
        if (String(row.explanation       || "").trim()) transRow.explanation       = String(row.explanation).trim();
        if (String(row.key_term          || "").trim()) transRow.key_term          = String(row.key_term).trim();
        if (String(row.key_term_meaning  || "").trim()) transRow.key_term_meaning  = String(row.key_term_meaning).trim();
        if (String(row.life_connection   || "").trim()) transRow.life_connection   = String(row.life_connection).trim();
        if (String(row.refresher_question|| "").trim()) transRow.quiz_recap        = String(row.refresher_question).trim();
        if (String(row.source_reference  || "").trim()) transRow.source_citation   = String(row.source_reference).trim();

        const { error: transErr } = await supabaseClient.from("snippet_translations").insert(transRow);
        if (transErr) {
          stats.errors.push("Translation (" + snippetId + "/" + langId + "): " + transErr.message);
        } else {
          transSet.add(transKey);
          stats.translationsCreated++;
        }
      }

      // ── Find or create lesson hierarchy → create mapping ────────────────
      const lessonName = String(row.lesson || "").trim();
      if (!lessonName) continue;

      const _lesM = _exactLookup(normalize(lessonName), lessonMap);
      let lessonId = _lesM ? _lesM.id : null;
      if (_lesM && _lesM.type === "fuzzy") stats.fuzzyMatches++;
      if (!lessonId) {
        // Find or create course
        let courseId = null;
        const courseName = String(row.course || "").trim();
        if (courseName) {
          const _cm = _exactLookup(normalize(courseName), courseMap);
          if (_cm) {
            courseId = _cm.id;
            if (_cm.type === "fuzzy") stats.fuzzyMatches++;
          } else {
            courseId = uuid();
            nextCourseOrder++;
            const { error: e } = await supabaseClient.from("courses").insert({ course_id: courseId, course_name: courseName, sort_order: nextCourseOrder });
            if (!e) { courseMap[normalize(courseName)] = courseId; stats.coursesCreated++; }
            else    { stats.errors.push("Create course (" + courseName + "): " + e.message); courseId = null; }
          }
        }

        // Find level — levels are fixed constants (Preparatory / Middle / Secondary)
        // They are pre-seeded by uuid_migration.sql; NOT auto-created from imports.
        let levelId = null;
        const levelName = String(row.level || "").trim();
        if (levelName) {
          const _lm = _exactLookup(normalize(levelName), levelMap);
          if (_lm) {
            levelId = _lm.id;
            if (_lm.type === "fuzzy") stats.fuzzyMatches++;
          } else {
            stats.errors.push('Unknown level "' + levelName + '" — must be one of: Preparatory, Middle, Secondary. Module will be created without a level.');
          }
        }

        // Find or create theme
        let themeId = null;
        const themeName = String(row.theme || "").trim();
        if (themeName) {
          const _tm = _exactLookup(normalize(themeName), themeMap);
          if (_tm) {
            themeId = _tm.id;
            if (_tm.type === "fuzzy") stats.fuzzyMatches++;
          } else {
            themeId = uuid();
            nextThemeOrder++;
            const { error: e } = await supabaseClient.from("themes").insert({ theme_id: themeId, title: themeName, sort_order: nextThemeOrder });
            if (!e) { themeMap[normalize(themeName)] = themeId; stats.themesCreated++; }
            else    { stats.errors.push("Create theme (" + themeName + "): " + e.message); themeId = null; }
          }
        }

        // Find or create module
        let moduleId = null;
        const moduleName = String(row.module || "").trim();
        if (moduleName) {
          const _mm = _exactLookup(normalize(moduleName), moduleMap);
          if (_mm) {
            moduleId = _mm.id;
            if (_mm.type === "fuzzy") stats.fuzzyMatches++;
          } else {
            moduleId = uuid();
            const modGroupKey = (courseId || "") + "|" + (levelId || "") + "|" + (themeId || "");
            moduleGroupMax[modGroupKey] = (moduleGroupMax[modGroupKey] || 0) + 1;
            const modRow = { module_id: moduleId, module_name: moduleName, visibility: "PUBLIC", sort_order: moduleGroupMax[modGroupKey] };
            if (courseId) modRow.course_id = courseId;
            if (levelId)  modRow.level_id  = levelId;
            if (themeId)  modRow.theme_id  = themeId;
            const { error: e } = await supabaseClient.from("modules").insert(modRow);
            if (!e) { moduleMap[normalize(moduleName)] = moduleId; stats.modulesCreated++; }
            else    { stats.errors.push("Create module (" + moduleName + "): " + e.message); moduleId = null; }
          }
        }

        // Create lesson
        lessonId = uuid();
        if (moduleId) lessonModuleMax[moduleId] = (lessonModuleMax[moduleId] || 0) + 1;
        const lesRow = { lesson_id: lessonId, lesson_name: lessonName };
        if (moduleId) { lesRow.module_id = moduleId; lesRow.sort_order = lessonModuleMax[moduleId]; }
        const { error: lesErr } = await supabaseClient.from("lessons").insert(lesRow);
        if (lesErr) {
          stats.errors.push("Create lesson (" + lessonName + "): " + lesErr.message);
          lessonId = null;
        } else {
          lessonMap[normalize(lessonName)] = lessonId;
          stats.lessonsCreated++;
        }
      }

      // Create lesson↔snippet mapping
      if (lessonId) {
        const mapKey = lessonId + ":" + snippetId;
        if (!mappingSet.has(mapKey)) {
          const mapRow = { lesson_id: lessonId, snippet_id: snippetId };
          const oi = String(row.order_index || "").trim();
          if (oi !== "") mapRow.order_index = Number(oi);
          const { error: mapErr } = await supabaseClient.from("lesson_snippet_mapping").insert(mapRow);
          if (mapErr) {
            stats.errors.push("Mapping (" + lessonId + "→" + snippetId + "): " + mapErr.message);
          } else {
            mappingSet.add(mapKey);
            stats.mappingsCreated++;
          }
        }
      }

    } catch (e) {
      stats.errors.push("Unexpected error on row: " + (e.message || String(e)));
    }
  }

  // ── Refresh course counts (snippet_count, language_count) ───────────────
  await supabaseClient.rpc("refresh_course_counts");

  return stats;
}


// adminDryRunImport(rows)
//
// Dry-run pass: resolves every unique text value in each lookup column
// WITHOUT writing anything to the database.
// Returns:
//   {
//     resolutions: { language, course, level, theme, module, lesson }
//       each field map: { [originalValue]: { type, id, resolvedTo, score } }
//         type: "exact" | "fuzzy" | "create" | "error"
//     rowIssues: [ { rowNum, englishHook, status:"ok"|"warn"|"error", issues[] } ]
//     counts: { total, ok, warn, error }
//   }

export async function adminDryRunImport(rows) {
  const normalize = s => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

  const [langRes, lessonRes, moduleRes, themeRes, levelRes, courseRes] = await Promise.all([
    supabaseClient.from("languages").select("language_id, language"),
    supabaseClient.from("lessons").select("lesson_id, lesson_name"),
    supabaseClient.from("modules").select("module_id, module_name"),
    supabaseClient.from("themes").select("theme_id, title"),
    supabaseClient.from("levels").select("level_id, title"),
    supabaseClient.from("courses").select("course_id, course_name"),
  ]);

  const langMap = {}, lessonMap = {}, moduleMap = {}, themeMap = {}, levelMap = {}, courseMap = {};
  const langDisp = {}, lessonDisp = {}, moduleDisp = {}, themeDisp = {}, levelDisp = {}, courseDisp = {};

  (langRes.data   || []).forEach(r => { const n = normalize(r.language);    langMap[n]   = r.language_id; langDisp[n]   = r.language; });
  (lessonRes.data || []).forEach(r => { const n = normalize(r.lesson_name); lessonMap[n] = r.lesson_id;   lessonDisp[n] = r.lesson_name; });
  (moduleRes.data || []).forEach(r => { const n = normalize(r.module_name); moduleMap[n] = r.module_id;   moduleDisp[n] = r.module_name; });
  (themeRes.data  || []).forEach(r => { const n = normalize(r.title);       themeMap[n]  = r.theme_id;    themeDisp[n]  = r.title; });
  (levelRes.data  || []).forEach(r => { const n = normalize(r.title);       levelMap[n]  = r.level_id;    levelDisp[n]  = r.title; });
  (courseRes.data || []).forEach(r => { const n = normalize(r.course_name); courseMap[n] = r.course_id;   courseDisp[n] = r.course_name; });

  const LOOKUP_MAPS = { language: langMap, course: courseMap, level: levelMap, theme: themeMap, module: moduleMap, lesson: lessonMap };
  const DISP_MAPS   = { language: langDisp, course: courseDisp, level: levelDisp, theme: themeDisp, module: moduleDisp, lesson: lessonDisp };
  const CAN_CREATE  = { language: false, course: true, level: false, theme: true, module: true, lesson: true };
  const FIELDS      = ["language", "course", "level", "theme", "module", "lesson"];

  // Collect unique values per field from the rows
  const uniqueVals = {};
  for (const f of FIELDS) uniqueVals[f] = new Set();
  for (const row of rows) {
    for (const f of FIELDS) {
      const v = String(row[f] || "").trim();
      if (v) uniqueVals[f].add(v);
    }
  }

  // Resolve each unique value
  const resolutions = {};
  for (const f of FIELDS) {
    resolutions[f] = {};
    for (const val of uniqueVals[f]) {
      const n = normalize(val);
      const match = _exactLookup(n, LOOKUP_MAPS[f]);
      if (match) {
        const resolvedName = DISP_MAPS[f][match.matchedNorm] || match.matchedNorm;
        resolutions[f][val] = { type: match.type, id: match.id, resolvedTo: resolvedName, score: match.score };
      } else if (CAN_CREATE[f]) {
        resolutions[f][val] = { type: "create", id: null, resolvedTo: val };
      } else {
        resolutions[f][val] = { type: "error", id: null, resolvedTo: null };
      }
    }
  }

  // Per-row analysis
  let okCount = 0, warnCount = 0, errorCount = 0;
  const rowIssues = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const issues = [];
    let hasError = false, hasWarn = false;

    const englishHook = String(row.english_hook || "").trim();
    if (!englishHook) {
      issues.push("english_hook is blank");
      hasError = true;
    }

    const langVal = String(row.language || "").trim();
    if (!langVal) {
      issues.push("language is blank — will default to English");
    } else {
      const res = resolutions.language[langVal];
      if (res && res.type === "error") {
        issues.push("Language \"" + langVal + "\" not found — add it to the languages table first");
        hasError = true;
      } else if (res && res.type === "fuzzy") {
        issues.push("Language \"" + langVal + "\" → fuzzy match \"" + res.resolvedTo + "\" (" + Math.round(res.score * 100) + "%)");
        hasWarn = true;
      }
    }

    for (const f of ["course", "level", "theme", "module", "lesson"]) {
      const v = String(row[f] || "").trim();
      if (!v) continue;
      const res = resolutions[f] && resolutions[f][v];
      if (res && res.type === "fuzzy") {
        issues.push(f.charAt(0).toUpperCase() + f.slice(1) + " \"" + v + "\" → fuzzy match \"" + res.resolvedTo + "\" (" + Math.round(res.score * 100) + "%)");
        hasWarn = true;
      }
    }

    const status = hasError ? "error" : hasWarn ? "warn" : "ok";
    if (status === "error") errorCount++;
    else if (status === "warn") warnCount++;
    else okCount++;

    if (status !== "ok") {
      rowIssues.push({ rowNum: i + 1, englishHook: englishHook || "(blank)", status, issues });
    }
  }

  return {
    resolutions,
    rowIssues,
    counts: { total: rows.length, ok: okCount, warn: warnCount, error: errorCount },
  };
}


// ── Admin token raw access ────────────────────────────────────────────────────

export async function adminGetTokensRaw() {
  return supabaseClient
    .from("user_tokens")
    .select("id, profile_id, token_type, quantity, source_type, source_id, awarded_at, profiles(display_name)")
    .order("awarded_at", { ascending: false });
}

export async function adminUpdateTokenRow(id, fields) {
  return supabaseClient.from("user_tokens").update(fields).eq("id", id);
}

export async function adminDeleteTokenRow(id) {
  return supabaseClient.from("user_tokens").delete().eq("id", id);
}

// adminSaveOrder(type, items, auxId?)
// type "modules"  → items [{ module_id, module_number }]
// type "lessons"  → items [{ lesson_id, lesson_number }]
// type "snippets" → items [{ snippet_id, order_index }], auxId = lesson_id

export async function adminSaveOrder(type, items, auxId) {
  const errs = [];
  if (type === "modules") {
    for (const { module_id, module_number } of items) {
      const { error } = await supabaseClient.from("modules")
        .update({ module_number }).eq("module_id", module_id);
      if (error) errs.push(error.message);
    }
  } else if (type === "lessons") {
    for (const { lesson_id, lesson_number } of items) {
      const { error } = await supabaseClient.from("lessons")
        .update({ lesson_number }).eq("lesson_id", lesson_id);
      if (error) errs.push(error.message);
    }
  } else if (type === "snippets") {
    for (const { snippet_id, order_index } of items) {
      const { error } = await supabaseClient.from("lesson_snippet_mapping")
        .update({ order_index })
        .eq("lesson_id", auxId)
        .eq("snippet_id", snippet_id);
      if (error) errs.push(error.message);
    }
  }
  return { errors: errs };
}

// ── Token Catalogue CRUD ─────────────────────────────────────────────────────

/**
 * Fetches all rows from the tokens catalogue table.
 * Returns { data, error }
 */
export async function adminGetTokenCatalogue() {
  return supabaseClient
    .from("tokens")
    .select("token_type, token_name, token_icon, description, earn_trigger, sort_order, is_active")
    .order("sort_order", { ascending: true });
}

/**
 * Inserts a new token type into the catalogue.
 * @param {Object} fields  { token_type, token_name, token_icon, description, earn_trigger, sort_order, is_active }
 * Returns { data, error }
 */
export async function adminAddTokenType(fields) {
  return supabaseClient.from("tokens").insert([fields]);
}

/**
 * Updates an existing token type.
 * @param {string} tokenType  Primary key value to match
 * @param {Object} fields     Fields to update (any subset of columns)
 * Returns { data, error }
 */
export async function adminUpdateTokenType(tokenType, fields) {
  return supabaseClient.from("tokens").update(fields).eq("token_type", tokenType);
}

/**
 * Deletes a token type from the catalogue.
 * Will fail if user_tokens rows reference this type and FK is active.
 * @param {string} tokenType  Primary key value to delete
 * Returns { data, error }
 */
export async function adminDeleteTokenType(tokenType) {
  return supabaseClient.from("tokens").delete().eq("token_type", tokenType);
}

// ─── Snippet Comments ─────────────────────────────────────────────────────────

/**
 * Posts a new comment on a snippet.
 * @param {string} userId     The poster's profile_id (auth.uid())
 * @param {string} snippetId  The snippet being commented on
 * @param {string} body       Comment text (1–500 chars)
 * @param {string} userName   Display name to store alongside the comment
 * Returns { data, error }
 */
export async function postComment(userId, snippetId, body, userName) {
  return supabaseClient.from("snippet_comments").insert({
    snippet_id: snippetId,
    profile_id: userId,
    user_name:  userName || "Learner",
    body:       body.trim(),
  }).select().single();
}

/**
 * Deletes a comment by its id. RLS ensures only the owner can delete.
 * @param {string} commentId  The uuid of the comment row
 * Returns { data, error }
 */
export async function deleteComment(commentId) {
  return supabaseClient.from("snippet_comments").delete().eq("id", commentId);
}

/**
 * Admin-only: deletes any comment for moderation purposes.
 * Relies on the comments_delete_admin RLS policy (ROLE_01 check in DB).
 * @param {string} commentId  The uuid of the comment row
 * Returns { data, error }
 */
export async function adminDeleteComment(commentId) {
  return supabaseClient.from("snippet_comments").delete().eq("id", commentId);
}

/**
 * Updates the body of an existing comment (own comment only — enforced by RLS).
 * @param {string} commentId  The uuid of the comment row
 * @param {string} newBody    Replacement text (1–500 chars)
 * Returns { data, error }
 */
export async function editComment(commentId, newBody) {
  return supabaseClient
    .from("snippet_comments")
    .update({ body: newBody.trim() })
    .eq("id", commentId)
    .select()
    .single();
}

// ─── Course sidebar tree ───────────────────────────────────────────────────────
/**
 * Fetches the full Theme > Module > Lesson tree for a given course, with
 * per-lesson completion and progress status baked in.
 * Calls the get_course_tree(p_course_id) Supabase RPC.
 * Returns { data: [...flat rows], error }
 */
export async function getCourseTree(courseId) {
  return supabaseClient.rpc("get_course_tree", { p_course_id: courseId });
}

// ─── Quiz helpers ─────────────────────────────────────────────────────────────

export async function getQuizForLesson(lessonId) {
  const { data, error } = await supabaseClient
    .from("quiz_sets")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) console.error("[getQuizForLesson]", error);
  return { data: data || null, error };
}

export async function getQuizzesForLessons(lessonIds) {
  if (!lessonIds || lessonIds.length === 0) return { data: {}, error: null };
  const { data, error } = await supabaseClient
    .from("quiz_sets")
    .select("*")
    .in("lesson_id", lessonIds)
    .eq("is_published", true);
  if (error) { console.error("[getQuizzesForLessons]", error); return { data: {}, error }; }
  const map = {};
  (data || []).forEach(q => { if (q.lesson_id) map[q.lesson_id] = q; });
  return { data: map, error: null };
}

export async function getQuizQuestions(quizId, languageId) {
  // quiz_questions stores question_key (language-agnostic integer).
  // We resolve to the right language row at runtime.
  const { data: refs, error: refErr } = await supabaseClient
    .from("quiz_questions")
    .select("id, question_type, question_key, sort_order, points")
    .eq("quiz_id", quizId)
    .not("question_key", "is", null)
    .order("sort_order");
  if (refErr) { console.error("[getQuizQuestions] refs", refErr); return { data: [], error: refErr }; }
  if (!refs || refs.length === 0) return { data: [], error: null };

  const snippetRefs    = refs.filter(r => r.question_type === "snippet");
  const standaloneRefs = refs.filter(r => r.question_type === "standalone");

  // ── Type 1: snippet_questions ─────────────────────────────────────────────
  let snippetQMap = {};   // question_key → enriched question row
  if (snippetRefs.length > 0) {
    const keys = snippetRefs.map(r => r.question_key);

    const { data: sqRows, error: sqErr } = await supabaseClient
      .from("snippet_questions")
      .select("*")
      .in("question_key", keys)
      .eq("language", languageId);
    if (sqErr) console.error("[getQuizQuestions] snippet_questions", sqErr);
    (sqRows || []).forEach(q => { snippetQMap[q.question_key] = q; });

    const snippetIds = [...new Set((sqRows || []).map(q => q.snippet_id).filter(Boolean))];
    if (snippetIds.length > 0) {
      const [coreRes, transRes] = await Promise.all([
        supabaseClient.from("snippet_core").select("snippet_id, asset_id").in("snippet_id", snippetIds),
        supabaseClient.from("snippet_translations")
          .select("snippet_id, language, explanation, key_term, key_term_meaning, life_connection, quiz_recap, source_citation, hook")
          .in("snippet_id", snippetIds),
      ]);
      const coreMap = {};
      (coreRes.data || []).forEach(c => { coreMap[c.snippet_id] = c; });

      // Prefer requested language, fall back to LANG_03, then any available
      const allTransBySnippet = {};
      (transRes.data || []).forEach(t => {
        if (!allTransBySnippet[t.snippet_id]) allTransBySnippet[t.snippet_id] = {};
        allTransBySnippet[t.snippet_id][t.language] = t;
      });
      const transMap = {};
      snippetIds.forEach(sid => {
        const langs = allTransBySnippet[sid] || {};
        transMap[sid] = langs[languageId] || langs["LANG_03"] || Object.values(langs)[0] || {};
      });

      const assetIds = [...new Set(Object.values(coreMap).map(c => c.asset_id).filter(Boolean))];
      let assetMap = {};
      if (assetIds.length > 0) {
        const { data: assets } = await supabaseClient
          .from("asset_library").select("asset_id, file_path, alt_text").in("asset_id", assetIds);
        (assets || []).forEach(a => { assetMap[a.asset_id] = a; });
      }

      Object.keys(snippetQMap).forEach(qkey => {
        const sq    = snippetQMap[qkey];
        const core  = coreMap[sq.snippet_id]  || {};
        const trans = transMap[sq.snippet_id] || {};
        const asset = core.asset_id ? assetMap[core.asset_id] : null;
        snippetQMap[qkey] = { ...sq, asset, ...trans };
      });
    }
  }

  // ── Type 2: standalone_questions ──────────────────────────────────────────
  let standaloneQMap = {};   // question_key → enriched question row
  if (standaloneRefs.length > 0) {
    const keys = standaloneRefs.map(r => r.question_key);

    const { data: stRows, error: stErr } = await supabaseClient
      .from("standalone_questions")
      .select("*")
      .in("question_key", keys)
      .eq("language", languageId);
    if (stErr) console.error("[getQuizQuestions] standalone_questions", stErr);

    const assetIds = [...new Set((stRows || []).map(q => q.asset_id).filter(Boolean))];
    let assetMap = {};
    if (assetIds.length > 0) {
      const { data: assets } = await supabaseClient
        .from("asset_library").select("asset_id, file_path, alt_text").in("asset_id", assetIds);
      (assets || []).forEach(a => { assetMap[a.asset_id] = a; });
    }
    (stRows || []).forEach(q => {
      standaloneQMap[q.question_key] = { ...q, asset: q.asset_id ? assetMap[q.asset_id] : null };
    });
  }

  const resolved = refs.map(ref => {
    const q = ref.question_type === "snippet"
      ? snippetQMap[ref.question_key]
      : standaloneQMap[ref.question_key];
    if (!q) return null;
    return { ...q, question_type: ref.question_type, points: ref.points, _ref_id: ref.id };
  }).filter(Boolean);

  return { data: resolved, error: null };
}

export async function saveQuizAttempt(userId, quizId, score, maxScore, answers) {
  const { data, error } = await supabaseClient
    .from("quiz_attempts")
    .insert({
      profile_id:   userId,
      quiz_id:      quizId,
      score,
      max_score:    maxScore,
      started_at:   new Date().toISOString(),
      completed_at: new Date().toISOString(),
      answers,
    })
    .select()
    .single();
  if (error) console.error("[saveQuizAttempt] FAILED:", JSON.stringify(error));
  else       console.log("[saveQuizAttempt] OK — id:", data?.id, "quiz_id:", data?.quiz_id);
  return { data, error };
}

// ── Question bank import ──────────────────────────────────────────────────────
//
// adminImportQuestions(rows)
//
// Imports Type 1 (snippet-linked) questions from the "Questions" sheet of the
// import template.
//
// Required columns: snippet_key, language, question, option_1–option_4
// Optional columns: hint
//
// Rules:
//   - snippet_key must match an existing snippet_core.import_key
//   - option_1 is the CORRECT answer; option_2–4 are wrong answers
//   - All four options must be non-empty
//   - hint may be blank/null
//   - Existing (snippet_id × language) pairs are silently skipped
//
// Returns { questionsCreated, questionsSkipped, errors[] }

// adminImportQuestions(rows)
//
// Processes rows from the merged single-sheet import template.
// Rows without question_key or question text are silently skipped.
// Deduplication and upsert key: question_key (unique across both question tables).
//
// Required per question row: question_key, question, option_1–option_4
// Optional: snippet_key (links to snippet → Type 1), language, hint
//
// Returns { questionsCreated, questionsUpdated, questionsSkipped, errors[] }

export async function adminImportQuestions(rows) {
  const normalize = s => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
  const uuid = () => crypto.randomUUID();

  // ── Load lookup data upfront ────────────────────────────────────────────────
  const [langRes, snipCoreRes, existingSqRes, existingStRes, assetRes] = await Promise.all([
    supabaseClient.from("languages").select("language_id, language"),
    supabaseClient.from("snippet_core").select("snippet_id, import_key"),
    supabaseClient.from("snippet_questions").select("question_key, language"),
    supabaseClient.from("standalone_questions").select("question_key, language"),
    supabaseClient.from("asset_library").select("asset_id, file_path"),
  ]);

  const langMap = {};
  (langRes.data || []).forEach(r => { langMap[normalize(r.language)] = r.language_id; });

  const importKeyMap = {};  // snippet import_key → snippet_id
  (snipCoreRes.data || []).forEach(r => {
    if (r.import_key != null) importKeyMap[r.import_key] = r.snippet_id;
  });

  // Keyed by "question_key:language" — same question_key can exist in multiple languages
  const existingSqPairs = new Set(
    (existingSqRes.data || []).filter(q => q.question_key != null).map(q => `${q.question_key}:${q.language}`)
  );
  const existingStPairs = new Set(
    (existingStRes.data || []).filter(q => q.question_key != null).map(q => `${q.question_key}:${q.language}`)
  );

  // Asset dedup map (file_path → asset_id)
  const assetMap = {};
  (assetRes.data || []).forEach(a => { assetMap[normalize(a.file_path)] = a.asset_id; });

  const stats = { questionsCreated: 0, questionsUpdated: 0, questionsSkipped: 0, errors: [] };
  const processedSnippetIds = new Set();  // snippet_ids with new/updated questions this run

  for (const row of rows) {
    try {
      // ── question_key — required, dedup/upsert key ──────────────────────────
      const qKeyRaw = String(row.question_key || "").trim();
      const qKeyNum = qKeyRaw !== "" && !isNaN(qKeyRaw) ? Number(qKeyRaw) : null;
      if (qKeyNum === null) continue;  // no question_key → not a question row

      // ── question text ──────────────────────────────────────────────────────
      const question = String(row.question || "").trim();
      if (!question) {
        stats.errors.push(`question_key ${qKeyNum}: question text is blank`);
        continue;
      }

      // ── options — all four required ────────────────────────────────────────
      const opt1 = String(row.option_1 || "").trim();
      const opt2 = String(row.option_2 || "").trim();
      const opt3 = String(row.option_3 || "").trim();
      const opt4 = String(row.option_4 || "").trim();
      if (!opt1 || !opt2 || !opt3 || !opt4) {
        stats.errors.push(`question_key ${qKeyNum}: all four options are required (option_1 is the correct answer)`);
        continue;
      }

      // ── language ───────────────────────────────────────────────────────────
      const langId = langMap[normalize(row.language || "English")];
      if (!langId) {
        stats.errors.push(`question_key ${qKeyNum}: unknown language "${row.language}"`);
        continue;
      }

      // ── snippet_key → snippet_id (determines Type 1 vs Type 2) ────────────
      const snipKeyRaw = String(row.snippet_key || "").trim();
      const snipKeyNum = snipKeyRaw !== "" && !isNaN(snipKeyRaw) ? Number(snipKeyRaw) : null;
      let snippetId = null;
      if (snipKeyNum !== null) {
        snippetId = importKeyMap[snipKeyNum] ?? null;
        if (!snippetId) {
          stats.errors.push(`question_key ${qKeyNum}: snippet_key ${snipKeyNum} not found — import snippets first`);
          continue;
        }
      }

      const hint = String(row.hint || "").trim() || null;
      const isType2 = snippetId === null;

      // ── Asset handling (Type 2 only) ───────────────────────────────────────
      // Type 1 questions display the snippet's image at runtime; they don't
      // get their own asset_id. Type 2 standalone questions carry their own image.
      let assetId = null;
      if (isType2) {
        const picUrl = String(row.picture_url || "").trim();
        if (picUrl) {
          assetId = assetMap[normalize(picUrl)];
          if (!assetId) {
            assetId = uuid();
            const { error: assetErr } = await supabaseClient.from("asset_library").insert({
              asset_id:    assetId,
              file_path:   picUrl,
              asset_type:  "IMAGE",
              alt_text:    String(row.picture_alt          || "").trim(),
              attribution: String(row.picture_attribution  || "").trim(),
            });
            if (assetErr) {
              stats.errors.push(`question_key ${qKeyNum}: asset create failed — ${assetErr.message}`);
              assetId = null;
            } else {
              assetMap[normalize(picUrl)] = assetId;
            }
          }
        }
      }

      if (isType2) {
        // ────────────────────────────────────────────────────────────────────
        // TYPE 2 — standalone_questions
        // ────────────────────────────────────────────────────────────────────
        const expFields = {
          ...(String(row.explanation      || "").trim() && { explanation:      String(row.explanation).trim() }),
          ...(String(row.key_term         || "").trim() && { key_term:         String(row.key_term).trim() }),
          ...(String(row.key_term_meaning || "").trim() && { key_term_meaning: String(row.key_term_meaning).trim() }),
          ...(String(row.life_connection  || "").trim() && { life_connection:  String(row.life_connection).trim() }),
          ...(String(row.source_reference || "").trim() && { source_citation:  String(row.source_reference).trim() }),
        };

        const stPairKey = `${qKeyNum}:${langId}`;
        if (existingStPairs.has(stPairKey)) {
          const upd = {
            question,
            correct_option: opt1, wrong_option_1: opt2, wrong_option_2: opt3, wrong_option_3: opt4,
            ...expFields,
          };
          if (hint !== null) upd.hint = hint;
          if (assetId)       upd.asset_id = assetId;

          const { error } = await supabaseClient
            .from("standalone_questions").update(upd)
            .eq("question_key", qKeyNum).eq("language", langId);
          if (error) stats.errors.push(`question_key ${qKeyNum} (${row.language}): ${error.message}`);
          else stats.questionsUpdated++;
        } else {
          const insertRow = {
            question_key: qKeyNum, language: langId, question,
            correct_option: opt1, wrong_option_1: opt2, wrong_option_2: opt3, wrong_option_3: opt4,
            hint,
            ...expFields,
          };
          if (assetId) insertRow.asset_id = assetId;

          const { error } = await supabaseClient.from("standalone_questions").insert(insertRow);
          if (error) stats.errors.push(`question_key ${qKeyNum} (${row.language}): ${error.message}`);
          else { existingStPairs.add(stPairKey); stats.questionsCreated++; }
        }
      } else {
        // ────────────────────────────────────────────────────────────────────
        // TYPE 1 — snippet_questions
        // ────────────────────────────────────────────────────────────────────
        const sqPairKey = `${qKeyNum}:${langId}`;
        if (existingSqPairs.has(sqPairKey)) {
          const upd = {
            snippet_id: snippetId, question,
            correct_option: opt1, wrong_option_1: opt2, wrong_option_2: opt3, wrong_option_3: opt4,
          };
          if (hint !== null) upd.hint = hint;

          const { error } = await supabaseClient
            .from("snippet_questions").update(upd)
            .eq("question_key", qKeyNum).eq("language", langId);
          if (error) stats.errors.push(`question_key ${qKeyNum} (${row.language}): ${error.message}`);
          else { stats.questionsUpdated++; processedSnippetIds.add(snippetId); }
        } else {
          const insertRow = {
            question_key: qKeyNum, snippet_id: snippetId, language: langId, question,
            correct_option: opt1, wrong_option_1: opt2, wrong_option_2: opt3, wrong_option_3: opt4,
            hint,
          };

          const { error } = await supabaseClient.from("snippet_questions").insert(insertRow);
          if (error) stats.errors.push(`question_key ${qKeyNum} (${row.language}): ${error.message}`);
          else { existingSqPairs.add(sqPairKey); stats.questionsCreated++; processedSnippetIds.add(snippetId); }
        }
      }
    } catch (e) {
      stats.errors.push("Unexpected error: " + (e.message || String(e)));
    }
  }

  // ── Auto-wire quizzes after questions are saved ───────────────────────────
  if (stats.questionsCreated > 0 || stats.questionsUpdated > 0) {
    const wireErrors = await adminWireQuizzes(processedSnippetIds);
    stats.errors.push(...wireErrors);
    stats.quizSetsCreated  = wireErrors._quizSetsCreated  || 0;
    stats.quizLinksCreated = wireErrors._quizLinksCreated || 0;
  }

  return stats;
}

// adminWireQuizzes(snippetIds)
//
// For each snippet_id in the set:
//   1. Find which lessons it belongs to (via lesson_snippet_mapping)
//   2. Ensure each lesson has a quiz_set (create one if missing)
//   3. Add any new question_keys to quiz_questions (idempotent)
//
// Returns an error array (with hidden _quizSetsCreated / _quizLinksCreated counts).

export async function adminWireQuizzes(snippetIds) {
  const errors = [];
  errors._quizSetsCreated  = 0;
  errors._quizLinksCreated = 0;

  if (!snippetIds || snippetIds.size === 0) return errors;

  const snippetArr = [...snippetIds];

  // ── 1. Find lessons for these snippets ────────────────────────────────────
  const { data: mappings, error: mapErr } = await supabaseClient
    .from("lesson_snippet_mapping")
    .select("lesson_id, snippet_id")
    .in("snippet_id", snippetArr);
  if (mapErr) { errors.push("Wire: lesson_snippet_mapping fetch failed — " + mapErr.message); return errors; }
  if (!mappings?.length) return errors;

  const lessonIds = [...new Set(mappings.map(m => m.lesson_id))];

  // snippetIds grouped by lesson
  const lessonSnippets = {};
  mappings.forEach(m => {
    if (!lessonSnippets[m.lesson_id]) lessonSnippets[m.lesson_id] = new Set();
    lessonSnippets[m.lesson_id].add(m.snippet_id);
  });

  // ── 2. Find/create quiz_sets ──────────────────────────────────────────────
  const { data: existingSets } = await supabaseClient
    .from("quiz_sets").select("quiz_id, lesson_id").in("lesson_id", lessonIds);

  const lessonToQuizId = {};
  (existingSets || []).forEach(qs => { lessonToQuizId[qs.lesson_id] = qs.quiz_id; });

  const newLessonIds = lessonIds.filter(id => !lessonToQuizId[id]);
  if (newLessonIds.length) {
    const { data: lessons } = await supabaseClient
      .from("lessons").select("lesson_id, lesson_name").in("lesson_id", newLessonIds);

    for (const lesson of (lessons || [])) {
      const quizId = crypto.randomUUID();
      const { error } = await supabaseClient.from("quiz_sets").insert({
        quiz_id:           quizId,
        lesson_id:         lesson.lesson_id,
        title:             lesson.lesson_name || "Quiz",
        is_published:      true,
        shuffle_questions: false,
      });
      if (error) {
        errors.push(`Wire: create quiz_set for lesson ${lesson.lesson_id} — ${error.message}`);
      } else {
        lessonToQuizId[lesson.lesson_id] = quizId;
        errors._quizSetsCreated++;
      }
    }
  }

  // ── 3. Wire question_keys to quiz_questions ───────────────────────────────
  // One entry per (quiz_id, question_key) regardless of language.
  const quizIds = Object.values(lessonToQuizId);
  const { data: existingLinks } = await supabaseClient
    .from("quiz_questions").select("quiz_id, question_key")
    .in("quiz_id", quizIds).not("question_key", "is", null);

  const existingPairs = new Set(
    (existingLinks || []).map(r => `${r.quiz_id}:${r.question_key}`)
  );

  // Fetch question_keys for all processed snippets (deduplicated by question_key — language-agnostic)
  const { data: qRows } = await supabaseClient
    .from("snippet_questions")
    .select("question_key, snippet_id")
    .in("snippet_id", snippetArr)
    .not("question_key", "is", null);

  // One entry per snippet+question_key (ignore language duplicates)
  const uniqueByKey = {};
  (qRows || []).forEach(q => {
    const k = `${q.snippet_id}:${q.question_key}`;
    if (!uniqueByKey[k]) uniqueByKey[k] = q;
  });

  const toInsert = [];
  for (const [lessonId, quizId] of Object.entries(lessonToQuizId)) {
    const snippets = lessonSnippets[lessonId];
    if (!snippets) continue;
    let sortOrder = 0;
    for (const q of Object.values(uniqueByKey)) {
      if (!snippets.has(q.snippet_id)) continue;
      const pair = `${quizId}:${q.question_key}`;
      if (existingPairs.has(pair)) continue;
      toInsert.push({ quiz_id: quizId, question_type: "snippet", question_key: q.question_key, sort_order: sortOrder++, points: 1 });
      existingPairs.add(pair);
    }
  }

  // Batch insert in chunks of 500
  const CHUNK = 500;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const { error } = await supabaseClient.from("quiz_questions").insert(toInsert.slice(i, i + CHUNK));
    if (error) errors.push("Wire: quiz_questions insert — " + error.message);
    else errors._quizLinksCreated += toInsert.slice(i, i + CHUNK).length;
  }

  return errors;
}

// getNextQuestionKey()
// Returns the next available question_key integer (MAX across both question
// tables + 1). Shared namespace ensures a question_key is unique regardless
// of whether it belongs to a Type 1 or Type 2 question.
export async function getNextQuestionKey() {
  const [sq, st] = await Promise.all([
    supabaseClient.from("snippet_questions").select("question_key").order("question_key", { ascending: false }).limit(1),
    supabaseClient.from("standalone_questions").select("question_key").order("question_key", { ascending: false }).limit(1),
  ]);
  const maxSq = sq.data?.[0]?.question_key ?? 0;
  const maxSt = st.data?.[0]?.question_key ?? 0;
  return Math.max(maxSq, maxSt) + 1;
}

export async function getAttemptCount(userId, quizId) {
  const { count, error } = await supabaseClient
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", userId)
    .eq("quiz_id", quizId)
    .not("completed_at", "is", null);
  if (error) console.error("[getAttemptCount]", error);
  return { count: count || 0, error };
}

// ── Inline snippet / question edit helpers ────────────────────────────────────

// Fetch the snippet_questions row for a given snippet + language.
export async function getSnippetQuestion(snippetId, languageId) {
  const { data, error } = await supabaseClient
    .from("snippet_questions")
    .select("*")
    .eq("snippet_id", snippetId)
    .eq("language", languageId)
    .maybeSingle();
  if (error) console.error("[getSnippetQuestion]", error);
  return { data: data || null, error };
}

// Upsert a snippet_questions row (create or update by snippet_id + language).
export async function saveSnippetQuestion(snippetId, languageId, questionData) {
  const { data, error } = await supabaseClient
    .from("snippet_questions")
    .upsert(
      { snippet_id: snippetId, language: languageId, ...questionData },
      { onConflict: "snippet_id,language" }
    )
    .select()
    .single();
  if (error) console.error("[saveSnippetQuestion]", error);
  return { data, error };
}

// Update a standalone_questions row by question_id.
export async function saveStandaloneQuestion(questionId, questionData) {
  const { data, error } = await supabaseClient
    .from("standalone_questions")
    .update({ ...questionData })
    .eq("question_id", questionId)
    .select()
    .single();
  if (error) console.error("[saveStandaloneQuestion]", error);
  return { data, error };
}
