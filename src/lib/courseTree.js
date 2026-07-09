// ─── Shared course-tree helpers ─────────────────────────────────────────────
// Extracted from AllCoursesPage.jsx so the same Course → Level → Theme →
// Module → Lesson logic can power both the standalone All Courses page and
// the All Courses drawer embedded in the For You sidebar (mobile).
import { SAFFRON, HERITAGE, GREEN, LEVEL_LABELS } from "./supabase";

export const GAUGE_TRACK = "#E9E9E6";
export const GAUGE_GRAY  = "#B7B7B2";

// L1 / L2 / L3 short codes — derived from LEVEL_LABELS' fixed global ordering
// (Preparatory / Middle / Secondary), so it stays correct even if a course's
// tree only contains a subset of levels.
export const LEVEL_IDS_SORTED = Object.keys(LEVEL_LABELS).sort();

export function levelNumber(levelId) {
  const idx = LEVEL_IDS_SORTED.indexOf(levelId);
  return idx >= 0 ? idx + 1 : null;
}

export function levelShortLabel(levelId) {
  const n = levelNumber(levelId);
  return n != null ? `L${n}` : levelId;
}

// ─── Tree grouping — all courses at once ───────────────────────────────────
// coursesTreeRows: [{ course_id, course_name, level_id, theme_id, theme_title, theme_sort,
//                      module_id, module_name, module_sort, module_image_url,
//                      lesson_id, lesson_name, lesson_sort }]
export function buildAllTree(coursesTreeRows) {
  const courses = {};
  for (const row of coursesTreeRows) {
    if (!courses[row.course_id]) {
      courses[row.course_id] = { course_name: row.course_name, levels: {} };
    }
    const crs = courses[row.course_id];
    if (!crs.levels[row.level_id]) crs.levels[row.level_id] = { themes: {} };
    const lvl = crs.levels[row.level_id];
    if (!lvl.themes[row.theme_id]) {
      lvl.themes[row.theme_id] = { title: row.theme_title, sort: row.theme_sort, modules: {} };
    }
    const thm = lvl.themes[row.theme_id];
    if (!thm.modules[row.module_id]) {
      thm.modules[row.module_id] = {
        name: row.module_name, sort: row.module_sort,
        image_url: row.module_image_url || null, // module cover photo — see module_cover_image.sql
        lessons: [],
      };
    }
    thm.modules[row.module_id].lessons.push({
      lesson_id:   row.lesson_id,
      lesson_name: row.lesson_name,
      sort:        row.lesson_sort,
    });
  }
  for (const crs of Object.values(courses)) {
    for (const lvl of Object.values(crs.levels)) {
      for (const thm of Object.values(lvl.themes)) {
        for (const mod of Object.values(thm.modules)) {
          mod.lessons.sort((a, b) => a.sort - b.sort);
        }
      }
    }
  }
  return courses;
}

export function moduleProgress(lessons, completedLessons) {
  if (!lessons.length) return { done: 0, total: 0, pct: 0 };
  const done = lessons.filter(l => completedLessons.has(l.lesson_id)).length;
  return { done, total: lessons.length, pct: Math.round((done / lessons.length) * 100) };
}

// Arc colour encodes progress: gray (0-24%), saffron (25-50%), heritage (51-75%), green (>75%)
export function gaugeColor(pct) {
  if (pct > 75) return GREEN;
  if (pct >= 51) return HERITAGE;
  if (pct >= 25) return SAFFRON;
  return GAUGE_GRAY;
}

export function lessonStatus(id, completedLessons, lessonProgress) {
  if (completedLessons.has(id)) return "done";
  if (lessonProgress.has(id) && lessonProgress.get(id) > 0) return "resume";
  return "none";
}

// Parses profiles.last_visited_route the same way App.jsx's handleResume() does
export function parseResumeRoute(profile) {
  const raw = profile?.last_visited_route;
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { return null; }
}

// ─── Speedometer-style arc gauge geometry ──────────────────────────────────
// Gap sits centered on the bottom (180°) so a 100% gauge reads as "complete"
// rather than looking rotated.
export const GAUGE_START = -140;
export const GAUGE_END   = 140;

export function polarToCartesian(cx, cy, r, angleDeg) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end   = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
