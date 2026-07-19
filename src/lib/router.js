// ─────────────────────────────────────────────────────────────────────────────
// Minimal hash router (Roadmap 2.3 / manual B2 — "minimal hash routing to start").
//
// The app keeps its existing state machine in App.jsx; this module only maps
// page-state ⇄ location.hash so that:
//   - browser Back/Forward work,
//   - lesson/quiz/course pages are deep-linkable and survive refresh,
//   - per-route analytics (R3) has a real path to log.
//
// Deep-linkable routes carry an id and are reconstructed on cold entry via
// App.jsx's existing helpers (handleOpenLessonById / handleBookmarkNavigate).
// State-only routes (#/modules, #/lessons, #/play) can't be reconstructed
// cold and fall back to #/courses.
//
// Upgrade path: swap this for react-router-dom when EditorPage's
// /editor/draft/:id (roadmap 4.8) needs nested routing.
// ─────────────────────────────────────────────────────────────────────────────

const SIMPLE_PAGES = {
  "home":        "#/",
  "gateway":     "#/welcome",
  "for-you":     "#/for-you",
  "all-courses": "#/courses",
  "modules":     "#/modules",
  "lessons":     "#/lessons",
  "dashboard":   "#/dashboard",
  "settings":    "#/settings",
  "discover":    "#/discover",
  "likes":       "#/likes",
  "bookmarks":   "#/bookmarks",
  "admin":       "#/admin",
  "editor":      "#/editor",
};

/** Current page-state → hash string. ctx carries the selected entities. */
export function pageToHash(page, ctx = {}) {
  switch (page) {
    case "navigator":
      return ctx.courseId ? `#/course/${encodeURIComponent(ctx.courseId)}` : "#/courses";
    case "player":
      if (ctx.isPlaylist) return "#/play";
      return ctx.lessonId ? `#/lesson/${encodeURIComponent(ctx.lessonId)}` : "#/";
    case "quiz":
      return ctx.quizId ? `#/quiz/${encodeURIComponent(ctx.quizId)}` : "#/";
    case "course": // legacy CoursePage
      return ctx.courseId ? `#/course-overview/${encodeURIComponent(ctx.courseId)}` : "#/courses";
    default:
      return SIMPLE_PAGES[page] || "#/";
  }
}

/** Hash string → { name, id }. Unknown/empty hashes resolve to home. */
export function parseHash(hash) {
  const h = (hash || "").replace(/^#\/?/, "");
  if (!h) return { name: "home", id: null };
  const [head, ...rest] = h.split("/");
  const id = rest.length ? decodeURIComponent(rest.join("/")) : null;
  const simple = {
    "":         "home",
    "home":     "home",
    "welcome":  "gateway",
    "for-you":  "for-you",
    "courses":  "all-courses",
    "modules":  "modules",
    "lessons":  "lessons",
    "play":     "play",
    "dashboard":"dashboard",
    "settings": "settings",
    "discover": "discover",
    "likes":    "likes",
    "bookmarks":"bookmarks",
    "admin":    "admin",
    "editor":   "editor",
  };
  if (head in simple) return { name: simple[head], id: null };
  if (head === "course")          return { name: "course",          id };
  if (head === "course-overview") return { name: "course-overview", id };
  if (head === "lesson")          return { name: "lesson",          id };
  if (head === "quiz")            return { name: "quiz",            id };
  return { name: "home", id: null };
}

/** True if the hash points at a specific place worth restoring on load. */
export function isDeepHash(hash) {
  const { name } = parseHash(hash);
  return name !== "home" && name !== "gateway";
}
