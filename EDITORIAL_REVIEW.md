# IndiYatra — Editorial Roles & Editor Page Review

**Date:** 19 July 2026 · **Scope:** (1) documentation of the role-assignment logic as built, (2) UX review + improvement directives for `EditorPage.jsx`.
**Roadmap items derived from this doc are cited as ED-A / ED-B / ED-C in `OVERHAUL_ROADMAP.md`.**

---

## Part 1 — The role model as it exists today (documented from code)

Your instinct is right: there are two assignment mechanisms — in fact **three parallel mechanisms** decide what a user can do, and they interact in non-obvious ways.

### Mechanism 1 — Global admin flag

- **Storage:** `user_roles_mapping` → `roles` (ROLE_01 Admin, from `admin_schema.sql`).
- **Read path:** `App.jsx:172` calls the `is_admin` RPC → `isAdmin` state → shows/hides AdminPage nav.
- **Grants:** SQL only (no UI).

### Mechanism 2 — Global editorial role (decides WHICH VIEW of EditorPage you see)

- **Storage:** same `user_roles_mapping` → `roles` table: ROLE_02 Editor, ROLE_05 Supervisor, ROLE_06 Verifier, plus ROLE_07 Creator ("global access to editorial workspace", `content_role_schema.sql`).
- **Read path:** `App.jsx:182` calls `get_editorial_role()` (SECURITY DEFINER RPC, `editorial_roles_uniform.sql`) which returns the user's **highest single role** — priority supervisor > verifier > editor — as a string. `EditorPage.jsx:1652–1654` then renders exactly one of `SupervisorView` / `VerifierView` / `EditorView`.
- **Fallback:** if the RPC returns null, `App.jsx:186–204` re-implements the same priority logic client-side by joining `user_roles_mapping` to `roles` on `role_name`. Two implementations of the same rule = drift risk.
- **Creator quirk:** ROLE_07 is checked *separately* (`App.jsx:176–181`, direct table read → `isCreator`); `get_editorial_role()` does not know about it. So "who can enter the workspace" and "which view they get" are answered by two different code paths.
- **Grants:** SQL only. The helper functions that would do this from a UI — `grantEditorialRole` / `revokeEditorialRole` / `loadUserRole` (`auth.js:358,705,715`) — are **dead exports, imported by nothing** (also flagged in `ENGINEERING_IMPROVEMENT_MANUAL.md` C2). In other words: today, someone must run SQL by hand to make a user an editor.

### Mechanism 3 — Per-content sub-roles (decides WHAT CONTENT you may work on)

- **Storage:** `content_role_assignments` (`content_role_schema.sql`): one row = (profile, content_type `snippet_translation`|`lesson`, content_id, language_id, sub_role `editor`|`verifier`|`supervisor`). UNIQUE-constrained; RLS: own rows visible, Creator/Admin see all.
- **Write path:** `assign_content_role` RPC (permission-checked internally: supervisor-or-admin) called from SupervisorView's Assign Tasks tab — this one **does** have a UI.
- **Consumption:** drafts (`content_drafts`, `editorial_workflow.sql`) carry the sub_role; `loadMyDrafts()` feeds EditorView's "My Tasks" table; verifier RLS policies check assignments, not global roles.

### The draft workflow (state machine, `editorial_workflow.sql`)

```
unassigned → assigned → in_draft → submitted → approved → published
                              ↑          ↓
                              └── needs_revision        (rejected = terminal)
```

Supervisor assigns (→`assigned`) · Editor starts (→`in_draft`), submits (→`submitted`) · Verifier approves (→`approved`) or returns (→`needs_revision`) · Supervisor publishes (→`published`). Every transition is written to an event log (viewable per draft).

### Historical drift worth knowing

Plain-text role_ids (`'editor'`, `'supervisor'`) were used first (`editorial_roles.sql`), then migrated to canonical ROLE_XX (`editorial_roles_uniform.sql`), which now matches by `role_name` join only. `editorial_roles_fix.sql` patched an intermediate state. Any future role code must join through `roles.role_name`, never compare `role_id` strings.

### Assessment of the model

The **two-layer design is sound** — a global "what kind of staff are you" plus per-content "what are you assigned to" is exactly how editorial systems should work. The problems are operational:

1. **No UI to grant global roles** — onboarding an editor requires SQL. (The dead `grantEditorialRole` was presumably meant for this.)
2. **One-view-per-user:** the highest-role-wins collapse means a supervisor who also edits content never sees the editor's "My Tasks" view of their own assignments.
3. **Three code paths answer "may this user enter the workspace"** (get_editorial_role, isCreator check, client fallback) — they can disagree.
4. **Access could be derived, not declared:** anyone with ≥1 row in `content_role_assignments` could be granted workspace entry automatically, reserving global roles for defaults and the permission ceiling. One source of truth instead of three.

---

## Part 2 — EditorPage UX review

### What works (keep)

The workflow bones are good: clear status vocabulary with colour-coded badges, per-draft event log, due dates with overdue highlighting, supervisor bulk-assign with conflict detection, verifier recommend/return loop, drafts stored as `jsonb` (flexible), image upload with client-side resize, taxonomy tagging inside the draft form.

### The problems, in order of pain

**E1. Editors work on IDs, not stories.** The My Tasks table shows `content_id` in monospace (`EditorPage.jsx:1478`) — an editor sees `SNIP_0413`, not "The Churning of the Ocean" with a thumbnail. Every task decision starts with a mental lookup the software should do.

**E2. Translators can't see the source text.** `DraftEditForm` pre-fills from `loadDraftContent(...draft.language_id)` — the *target* language's live row (`auth.js:534`). When translating to Hindi, the Hindi row is empty and the English original is **nowhere on screen**. The single most important piece of reference material for the job is missing. This is the #1 fix.

**E3. No preview of what students will see.** Editors write into nine stacked textareas and never see the snippet as SnippetPlayer renders it (hook band, image, key-term callout). Formatting/length mistakes surface only after publish.

**E4. Manual save in a modal, no safety net.** Saving is a button; there is no autosave, no dirty-state `beforeunload` guard, no "last saved" indicator (verified: zero matches in the file). A mis-click on the backdrop closes the modal. Long-form editing in a dismissible modal is where work goes to die.

**E5. Verifiers re-read everything.** The verifier sees the full draft, not a **diff against live content** — so they review whole documents instead of changes. Review quality drops and time balloons as content grows.

**E6. No queue flow.** After submitting, the editor returns to the table and re-orients. No "next task", no sort-by-due, no status filter on My Tasks, no keyboard movement.

**E7. No validation before submit.** Quiz drafts can be submitted with empty wrong-options; no per-field length guidance (hooks that overflow the player card, key terms with no meaning).

### Design directives — Editor workbench

Grouped into the three roadmap work packages:

**ED-A · Role model consolidation (foundation)**
1. Derive workspace access from `content_role_assignments` (any assignment ⇒ entry); keep global roles as defaults/ceiling. Delete the client-side fallback and the separate isCreator path — one RPC answers both "may enter" and "default view".
2. Build the missing **Team tab** (supervisor/admin only): list staff via existing `get_editorial_staff()`, grant/revoke global roles (resurrect `grantEditorialRole`/`revokeEditorialRole` behind a permission-checked RPC instead of raw table upsert).
3. View switcher instead of view lock: supervisors/verifiers get a segmented control (Supervise · Verify · My Tasks) so multi-role users see all their hats.

**ED-B · Editor ergonomics (quick wins)**
4. Task rows show **title + thumbnail + language chip**, ID demoted to a tooltip/copy button. (Titles are one join away — snippet hook / lesson_name.)
5. **Autosave** drafts (debounced 2s, jsonb upsert is cheap) + "Saved ✓ 12:04" indicator + `beforeunload` guard + Escape asks before closing dirty forms.
6. **Submit validation**: required-field checks per content type (quiz: 1 correct + 3 wrong non-empty), soft length warnings with live char counts on hook/key-term fields.
7. Queue flow: My Tasks default-sorted by due date; status filter pills; after submit, offer "Next task →".

**ED-C · Workbench v2 (the real editor)**
8. **Full-page editor route** `/editor/draft/:id` (needs routing, manual B2) replacing the modal — linkable from assignment notifications and verifier comments.
9. **Three-pane translation layout**: left = read-only source language (English by default, language-pickable), centre = editable target fields, right = **live SnippetPlayer preview** rendering `draft_data` through the actual player card component. Field-by-field alignment (hook beside hook).
10. **Verifier diff view**: draft_data vs live row, changed fields highlighted (added/removed inline marks), unchanged fields collapsed. Approve/return buttons sticky at bottom with a comment box.
11. Keyboard: Ctrl+S save, Ctrl+Enter submit, Tab order through fields matched to the player's visual order.
