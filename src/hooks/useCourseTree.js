import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getCourseTree, getQuizzesForLessons } from "../lib/auth";
import { buildAllTree, parseResumeRoute } from "../lib/courseTree";

/**
 * useCourseTree — Course → Level → Theme → Module → Lesson browsing state.
 *
 * Extracted from AllCoursesPage so the same data-loading + accordion
 * behaviour can also power the All Courses drawer embedded in the
 * For You sidebar (mobile). Fetching is lazy — call `load()` when the
 * consumer actually needs the tree (e.g. the first time its UI is shown).
 *
 * Usage:
 *   const ct = useCourseTree(profile);
 *   useEffect(() => { if (!ct.loaded) ct.load(); }, []);
 *
 * `seed` (optional): { course_id, level_id, theme_id, module_id } — when
 * provided, load() opens directly on this course/level/theme (instead of the
 * learner's resume-route default) and scrolls to/highlights the given
 * module once its feed renders. Used when arriving here via a Module click
 * from a ForYouPage panel (Most Liked / Most Bookmarked / My Likes / My
 * Bookmarks) — those always land in All Courses at the clicked module,
 * never back on ForYouPage.
 */
export function useCourseTree(profile, seed) {
  const [courses,     setCourses]     = useState([]);
  const [tree,        setTree]        = useState({});
  const [storyCounts, setStoryCounts] = useState({}); // lesson_id -> snippet count
  const [lessonImages, setLessonImages] = useState({}); // lesson_id -> image url, from that
                                                          // lesson's own snippets (see load())
  const [quizMap,     setQuizMap]     = useState({});
  const [loading,     setLoading]     = useState(false);
  const [loaded,      setLoaded]      = useState(false);

  const [openCourseId, setOpenCourseId] = useState(null); // sidebar accordion — which course is expanded
  const [openLevelId,  setOpenLevelId]  = useState(null); // sidebar — active level tab within the open course
  const [selCourseId,  setSelCourseId]  = useState(null); // which course/level/theme is driving the main feed
  const [selLevelId,   setSelLevelId]   = useState(null);
  const [selThemeId,   setSelThemeId]   = useState(null);
  const [resumeLessonId, setResumeLessonId] = useState(null); // "continue where you left off" pointer
  const [resumeModuleId, setResumeModuleId] = useState(null); // one-time scroll/highlight target from `seed`

  const lessonRefs = useRef({});
  const moduleRefs = useRef({});
  const hasScrolledRef = useRef(false);
  const hasScrolledModuleRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const courseRows = await supabase("courses", "?select=*&order=sort_order");
    const list = courseRows || [];
    setCourses(list);

    const [treeResults, mappingRows] = await Promise.all([
      Promise.all(list.map(c => getCourseTree(c.course_id))),
      supabase("lesson_snippet_mapping", "?select=lesson_id,snippet_id"),
    ]);

    const allRows = [];
    treeResults.forEach(({ data, error }, i) => {
      if (error) { console.warn("useCourseTree tree error:", error); return; }
      (data || []).forEach(row => allRows.push({ ...row, course_id: list[i].course_id, course_name: list[i].course_name }));
    });
    const grouped = buildAllTree(allRows);
    setTree(grouped);

    const counts = {};
    (mappingRows || []).forEach(m => { counts[m.lesson_id] = (counts[m.lesson_id] || 0) + 1; });
    setStoryCounts(counts);

    // Lesson thumbnails — no dedicated lesson-image field exists yet, so for
    // now borrow whichever of the lesson's own snippets already has an
    // editorially-uploaded image (asset_library, via snippet_core.asset_id —
    // the same store SnippetPlayer reads). Lessons with no imaged snippet
    // just get no entry here; AllCoursesPage falls back to a placeholder.
    try {
      const snipsWithImages = await supabase("snippet_core", "?select=snippet_id,asset_id&asset_id=not.is.null");
      const assetIds = [...new Set((snipsWithImages || []).map(s => s.asset_id).filter(Boolean))];
      let fileById = {};
      if (assetIds.length > 0) {
        const assetRows = await supabase("asset_library", `?select=asset_id,file_path&asset_id=in.(${assetIds.join(",")})`);
        (assetRows || []).forEach(a => { fileById[a.asset_id] = a.file_path; });
      }
      const imageBySnippet = {};
      (snipsWithImages || []).forEach(s => { if (fileById[s.asset_id]) imageBySnippet[s.snippet_id] = fileById[s.asset_id]; });
      const images = {};
      (mappingRows || []).forEach(m => {
        if (images[m.lesson_id] || !imageBySnippet[m.snippet_id]) return;
        images[m.lesson_id] = imageBySnippet[m.snippet_id];
      });
      setLessonImages(images);
    } catch (e) {
      console.warn("useCourseTree lessonImages:", e);
    }

    const allLessonIds = [...new Set(allRows.map(r => r.lesson_id).filter(Boolean))];
    if (allLessonIds.length > 0) {
      const { data: qmap } = await getQuizzesForLessons(allLessonIds);
      setQuizMap(qmap || {});
    }

    // ── Resume-aware default: land on the learner's actual last-visited
    // course/level/theme (and highlight the exact lesson) instead of always
    // opening the first course. Falls back to "first course/level/theme"
    // for guests or when there's no saved route yet.
    let targetCourseId = null, targetLevelId = null, targetThemeId = null, targetLessonId = null, targetModuleId = null;

    // An explicit `seed` (arriving via a Module click from ForYouPage) always
    // wins over the resume-route default — the user asked to land on THIS
    // module, not wherever they last left off.
    if (seed?.course_id && seed?.level_id && seed?.theme_id) {
      const seedThm = grouped[seed.course_id]?.levels[seed.level_id]?.themes[seed.theme_id];
      if (seedThm) {
        targetCourseId = seed.course_id;
        targetLevelId  = seed.level_id;
        targetThemeId  = seed.theme_id;
        if (seed.module_id && seedThm.modules[seed.module_id]) targetModuleId = seed.module_id;
      }
    }

    const route = targetCourseId ? null : parseResumeRoute(profile);
    if (route?.course_id && route?.level_id && route?.theme_id) {
      const thm = grouped[route.course_id]?.levels[route.level_id]?.themes[route.theme_id];
      if (thm) {
        targetCourseId = route.course_id;
        targetLevelId  = route.level_id;
        targetThemeId  = route.theme_id;
        // Only keep the lesson pointer if it genuinely belongs to this theme
        if (route.lesson_id) {
          const belongs = Object.values(thm.modules).some(m => m.lessons.some(l => l.lesson_id === route.lesson_id));
          if (belongs) targetLessonId = route.lesson_id;
        }
      }
    }

    if (!targetCourseId) {
      const firstCourseId = list[0]?.course_id;
      if (firstCourseId && grouped[firstCourseId]) {
        targetCourseId = firstCourseId;
        const levelIds = Object.keys(grouped[firstCourseId].levels).sort();
        targetLevelId = levelIds[0] || null;
        if (targetLevelId) {
          const themeIds = Object.keys(grouped[firstCourseId].levels[targetLevelId].themes)
            .sort((a, b) => grouped[firstCourseId].levels[targetLevelId].themes[a].sort - grouped[firstCourseId].levels[targetLevelId].themes[b].sort);
          targetThemeId = themeIds[0] || null;
        }
      }
    }

    if (targetCourseId) {
      setOpenCourseId(targetCourseId);
      setOpenLevelId(targetLevelId);
    }
    if (targetCourseId && targetLevelId && targetThemeId) {
      setSelCourseId(targetCourseId);
      setSelLevelId(targetLevelId);
      setSelThemeId(targetThemeId);
    }
    setResumeLessonId(targetLessonId);
    setResumeModuleId(targetModuleId);

    setLoading(false);
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to the resume lesson once, after the feed for its theme has rendered
  useEffect(() => {
    if (loading || !resumeLessonId || hasScrolledRef.current) return;
    const el = lessonRefs.current[resumeLessonId];
    if (el) {
      hasScrolledRef.current = true;
      const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      return () => clearTimeout(t);
    }
  }, [loading, resumeLessonId, selThemeId]);

  // Auto-scroll to the seeded module once, after its theme's feed has rendered
  // (mirrors the resume-lesson scroll above, but for a Module click landing here).
  useEffect(() => {
    if (loading || !resumeModuleId || hasScrolledModuleRef.current) return;
    const el = moduleRefs.current[resumeModuleId];
    if (el) {
      hasScrolledModuleRef.current = true;
      const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      return () => clearTimeout(t);
    }
  }, [loading, resumeModuleId, selThemeId]);

  function toggleCourse(courseId) {
    if (openCourseId === courseId) { setOpenCourseId(null); return; }
    setOpenCourseId(courseId);
    const crs = tree[courseId];
    if (!crs) return;
    const levelIds = Object.keys(crs.levels).sort();
    // Reopening the course you already have selected keeps its active level tab
    if (selCourseId === courseId && selLevelId && levelIds.includes(selLevelId)) {
      setOpenLevelId(selLevelId);
    } else {
      setOpenLevelId(levelIds[0] || null);
    }
  }
  function selectLevelTab(levelId) {
    setOpenLevelId(levelId);
  }
  function selectTheme(courseId, levelId, themeId) {
    setSelCourseId(courseId); setSelLevelId(levelId); setSelThemeId(themeId);
    setResumeLessonId(null); // manual browsing supersedes the one-time "continue" pointer
    setResumeModuleId(null); // ditto for the one-time "opened from ForYouPage" module target
  }
  // Breadcrumb navigation — step back up to a course or level without a
  // theme selected, so the sidebar shows that course/level expanded (its
  // "clicked" state) and the main pane falls back to its "pick a theme"
  // prompt, same as first opening that course/level from scratch.
  function goToCourse(courseId) {
    setOpenCourseId(courseId);
    const crs = tree[courseId];
    const levelIds = crs ? Object.keys(crs.levels).sort() : [];
    setOpenLevelId(selCourseId === courseId && selLevelId && levelIds.includes(selLevelId) ? selLevelId : (levelIds[0] || null));
    setSelCourseId(null); setSelLevelId(null); setSelThemeId(null);
    setResumeLessonId(null); setResumeModuleId(null);
  }
  function goToLevel(courseId, levelId) {
    setOpenCourseId(courseId);
    setOpenLevelId(levelId);
    setSelCourseId(null); setSelLevelId(null); setSelThemeId(null);
    setResumeLessonId(null); setResumeModuleId(null);
  }
  function registerLessonRef(lessonId) {
    return el => { lessonRefs.current[lessonId] = el; };
  }
  function registerModuleRef(moduleId) {
    return el => { moduleRefs.current[moduleId] = el; };
  }

  return {
    courses, tree, storyCounts, lessonImages, quizMap, loading, loaded, load,
    openCourseId, openLevelId, selCourseId, selLevelId, selThemeId, resumeLessonId, resumeModuleId,
    toggleCourse, selectLevelTab, selectTheme, goToCourse, goToLevel, registerLessonRef, registerModuleRef,
  };
}
