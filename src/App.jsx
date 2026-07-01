import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useAuth } from "./hooks/useAuth";
import { supabaseClient, signOut, loadCompletions, saveCompletion, updateLastVisited, loadLessonProgress, upsertLessonProgress, deleteLessonProgress, loadUserBookmarks, insertBookmark, deleteBookmark, getEditorialRole, getQuizQuestions, getQuizForLesson } from "./lib/auth";
import { AuthContext } from "./contexts/AuthContext";
import AuthModal     from "./components/AuthModal";
import ProfileModal  from "./components/ProfileModal";
import { supabase, LEVEL_LABELS } from "./lib/supabase";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "./hooks/useSettings";
import { APP_NAME, DEFAULT_SNIPPET_SHARE_MSG, PLAYLIST } from "./config/appStrings";
import { awardForLessonComplete } from "./lib/awards";
import SettingsPage from "./pages/SettingsPage";
import HomePage      from "./pages/HomePage";
import CoursePage    from "./pages/CoursePage";
import ModulesPage   from "./pages/ModulesPage";
import LessonsPage   from "./pages/LessonsPage";
import SnippetPlayer  from "./pages/SnippetPlayer";
import DashboardPage  from "./pages/DashboardPage";
import LikesPage      from "./pages/LikesPage";
import BookmarksPage  from "./pages/BookmarksPage";
import DiscoverPage   from "./pages/DiscoverPage";
import GatewayPage    from "./pages/GatewayPage";
import CourseNavigatorPage from "./pages/CourseNavigatorPage";
import QuizPlayer from "./pages/QuizPlayer";
import ForYouPage from "./pages/ForYouPage";
import AppFooter from "./components/AppFooter";
const AdminPage  = lazy(() => import("./pages/AdminPage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));

const transitionStyles = `
  @keyframes pageSlideInRight {
    from { opacity: 0; transform: translateX(28px); }
    to   { opacity: 1; }
  }
  @keyframes pageSlideInLeft {
    from { opacity: 0; transform: translateX(-28px); }
    to   { opacity: 1; }
  }
  .page-enter-forward { animation: pageSlideInRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) backwards; }
  .page-enter-back    { animation: pageSlideInLeft  0.28s cubic-bezier(0.25,0.46,0.45,0.94) backwards; }
  .page-enter-none    { animation: none; }
  .page-enter-forward, .page-enter-back, .page-enter-none {
    display: block; width: 100%; overflow-x: hidden;
  }
`;

export default function App() {
  const [settings, setSettings]         = useState(loadSettings);
  const [languages, setLanguages]       = useState([]);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [lessonProgress,   setLessonProgress]   = useState(new Map());
  const [moduleLessons, setModuleLessons]       = useState([]);
  const [earnedBadges, setEarnedBadges]         = useState([]);
  const [navDirection, setNavDirection]         = useState("none");
  const snippetAdvanceTimer = useRef(null);
  const toastTimer = useRef(null);
  const lastVisitedRouteRef = useRef(null);
  const hasRedirectedOnLoginRef = useRef(false); // stays in sync; profile state is stale after login
  const redirectResetTimer = useRef(null);        // debounces guard reset on transient SIGNED_OUT

  const [bookmarks,    setBookmarks]    = useState(new Set());
  const [toastMsg,     setToastMsg]     = useState("");
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [isCreator,    setIsCreator]    = useState(false);
  const [userEditorialRole, setUserEditorialRole] = useState(null);

  const { user, profile, authLoading, refreshProfile } = useAuth();
  const [showAuthModal,    setShowAuthModal]    = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [page, setPage]                         = useState("home");
  const [selectedCourse, setSelectedCourse]     = useState(null);
  const [playlistSnippetIds, setPlaylistSnippetIds] = useState(null);
  const [playlistStartIndex, setPlaylistStartIndex] = useState(0);
  const [playlistSource,     setPlaylistSource]     = useState("likes");
  const [playerReturnPage, setPlayerReturnPage]   = useState("lessons");
  const [selectedQuiz,     setSelectedQuiz]       = useState(null);   // quiz_sets row
  const [quizQuestions,    setQuizQuestions]       = useState([]);     // resolved question objects
  const [quizReturnPage,   setQuizReturnPage]      = useState("lessons");
  const [lessonQuiz,       setLessonQuiz]         = useState(null);    // quiz for current lesson (completion modal CTA)
  const [quizKey,          setQuizKey]            = useState(0);       // increment to force QuizPlayer remount
  const [navigatorSelection, setNavigatorSelection] = useState(null); // pre-seeds Navigator when returning from Resume/player
  const [playlistLabel,      setPlaylistLabel]      = useState("");
  const [selectedTheme, setSelectedTheme]       = useState(null);
  const [selectedLevelId, setSelectedLevelId]   = useState(null);
  const [selectedModule, setSelectedModule]     = useState(null);
  const [selectedLesson, setSelectedLesson]     = useState(null);

  // Navigate forward/back helpers
  function goForward(newPage, fn) {
    setNavDirection("forward");
    if (fn) fn();
    setPage(newPage);
  }
  function goBack(newPage, fn) {
    setNavDirection("back");
    if (fn) fn();
    setPage(newPage);
  }

  // Apply font size on mount and whenever it changes
  useEffect(() => {
    const sizes = { sm: '13px', md: '16px', lg: '19px' };
    document.body.dataset.fs = settings.fontSize;
    document.documentElement.style.fontSize = sizes[settings.fontSize] || '16px';
  }, [settings.fontSize]);

  // Scroll to top on every page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // Auto-close AuthModal when sign-in succeeds (any provider)
  useEffect(() => {
    if (user) setShowAuthModal(false);
  }, [user]);

  // Load saved completions from Supabase when a real (non-anonymous) user signs in.
  // Clears local state on sign-out so a new user starts fresh.
  // Also loads/resets per-user settings so language preference is user-scoped.
  useEffect(() => {
    if (!user) {
      setCompletedLessons(new Set());
      setLessonProgress(new Map());
      setBookmarks(new Set());
      setIsAdmin(false);
      setIsCreator(false);
      setUserEditorialRole(null);
      setSettings({ ...DEFAULT_SETTINGS });
      return;
    }
    if (user.is_anonymous) return; // guests keep local-only state
    setSettings(loadSettings(user.id));
    loadCompletions(user.id).then(({ data }) => {
      if (data && data.length > 0) {
        setCompletedLessons(new Set(data.map(c => c.lesson_id)));
      }
    });
    loadLessonProgress(user.id).then(({ data }) => {
      if (data && data.length > 0) {
        setLessonProgress(new Map(data.map(p => [p.lesson_id, p.snippet_index])));
      }
    });
    loadUserBookmarks(user.id).then(({ data }) => {
      if (data && data.length > 0) {
        setBookmarks(new Set(data.map(b => b.content_type + ":" + b.content_id)));
      }
    });
    // Use SECURITY DEFINER RPC so it works regardless of RLS on user_roles_mapping
    supabaseClient.rpc("is_admin").then(({ data }) => {
      setIsAdmin(data === true);
    });
    supabaseClient
      .from("user_roles_mapping")
      .select("role_id")
      .eq("profile_id", user.id)
      .eq("role_id", "ROLE_07")
      .maybeSingle()
      .then(({ data }) => { setIsCreator(!!data); });
    getEditorialRole().then(({ data, error }) => {
      if (data) {
        // RPC returned a role string
        setUserEditorialRole(data);
      } else {
        // RPC not deployed or returned null — fall back to direct table read
        // Uses supabaseClient to join roles table so ROLE_XX format also works
        supabaseClient
          .from("user_roles_mapping")
          .select("role_id, roles(role_name)")
          .eq("profile_id", user.id)
          .then(({ data: roleData }) => {
            if (!roleData?.length) return;
            // Match by role_name only — all role_ids use ROLE_XX format
            let r = null;
            for (const row of roleData) {
              const rn = (row.roles?.role_name || "").toLowerCase();
              if (rn === "supervisor") { r = "supervisor"; break; }
              if (rn === "verifier")   { r = "verifier";   break; }
              if (rn === "editor")     { r = "editor";     break; }
            }
            if (r) setUserEditorialRole(r);
          });
      }
    });
  }, [user?.id]);

  // Redirect returning users (those with a saved route) to Dashboard on login.
  // Guard with a ref so token-refresh events (which briefly null+restore profile)
  // don't re-trigger the redirect while the user is actively using the app.
  useEffect(() => {
    if (!profile?.id) {
      // Profile cleared -- could be a genuine sign-out OR a transient SIGNED_OUT
      // event that immediately resolves with SIGNED_IN (e.g. after a network
      // blip or Supabase reconnect). Debounce the guard reset by 3 s: if the
      // profile comes back within that window, the guard stays set and no
      // unwanted redirect fires.
      redirectResetTimer.current = setTimeout(() => {
        hasRedirectedOnLoginRef.current = false;
      }, 3000);
      return;
    }
    // Profile is present -- cancel any pending guard reset.
    clearTimeout(redirectResetTimer.current);
    if (hasRedirectedOnLoginRef.current) return; // already redirected this session
    hasRedirectedOnLoginRef.current = true;
    if (profile?.last_visited_route && (page === "home" || page === "gateway")) {
      goForward("for-you");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Show gateway to first-time visitors only — fires once auth finishes loading.
  useEffect(() => {
    if (authLoading) return;
    if (!user && !localStorage.getItem("indiyatra_visited")) {
      localStorage.setItem("indiyatra_visited", "1");
      setPage("gateway");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Load language list once
  useEffect(() => {
    supabase("languages", "?select=*&order=language").then(data => setLanguages(data || []));
  }, []);

  function handleSnippetAdvance(lessonId, index) {
    if (!user || user.is_anonymous) return;
    // Update local Map immediately so dashboard stat is accurate
    setLessonProgress(prev => new Map(prev).set(lessonId, index));
    // Debounced write — collapses rapid taps into a single DB round-trip
    clearTimeout(snippetAdvanceTimer.current);
    snippetAdvanceTimer.current = setTimeout(() => {
      upsertLessonProgress(user.id, lessonId, index)
        .catch(e => console.warn("upsertLessonProgress:", e));
    }, 400);
  }

  async function handleLessonComplete(lessonId, points, snippetCount) {
    const newCompleted = new Set([...completedLessons, lessonId]);
    setCompletedLessons(newCompleted);

    // Persist to Supabase for authenticated (non-anonymous) users — fire-and-forget
    if (user && !user.is_anonymous) {
      saveCompletion(
        user.id,
        lessonId,
        selectedCourse?.course_id || null,
        points || 0,
        snippetCount || null
      ).catch(e => console.warn("saveCompletion:", e));
      // Lesson complete — remove in-progress resume record
      deleteLessonProgress(user.id, lessonId)
        .catch(e => console.warn("deleteLessonProgress:", e));
      setLessonProgress(prev => { const m = new Map(prev); m.delete(lessonId); return m; });
    }

    const badges = [{ type: "lesson", name: selectedLesson.lesson_name, id: lessonId }];

    // Module badge — all lessons in this module done?
    const allModDone = moduleLessons.length > 0 &&
      moduleLessons.every(l => newCompleted.has(l.lesson_id));

    if (allModDone) {
      badges.push({ type: "module", name: selectedModule.module_name, id: selectedModule?.module_id });

      // Theme badge — all modules in this theme+level, all their lessons done?
      const themeMods = await supabase("modules",
        `?select=module_id&level_id=eq.${selectedLevelId}&theme_id=eq.${selectedTheme.theme_id}`);
      const themeModIds = (themeMods || []).map(m => m.module_id);
      if (themeModIds.length > 0) {
        const themeLessons = await supabase("lessons",
          `?select=lesson_id&module_id=in.(${themeModIds.join(",")})`);
        const allThemeDone = (themeLessons || []).length > 0 &&
          (themeLessons || []).every(l => newCompleted.has(l.lesson_id));

        if (allThemeDone) {
          badges.push({ type: "theme", name: selectedTheme.title, id: selectedTheme?.theme_id });

          // Level badge — all modules in this level done?
          const levelMods = await supabase("modules",
            `?select=module_id&level_id=eq.${selectedLevelId}`);
          const levelModIds = (levelMods || []).map(m => m.module_id);
          if (levelModIds.length > 0) {
            const levelLessons = await supabase("lessons",
              `?select=lesson_id&module_id=in.(${levelModIds.join(",")})`);
            const allLevelDone = (levelLessons || []).length > 0 &&
              (levelLessons || []).every(l => newCompleted.has(l.lesson_id));

            if (allLevelDone) {
              const levelLabel = LEVEL_LABELS[selectedLevelId]?.label || selectedLevelId;
              badges.push({ type: "level", name: levelLabel, id: selectedLevelId });

              // Course badge — all modules in course done?
              const allMods = await supabase("modules", "?select=module_id");
              const allModIds = (allMods || []).map(m => m.module_id);
              if (allModIds.length > 0) {
                const allLessons = await supabase("lessons",
                  `?select=lesson_id&module_id=in.(${allModIds.join(",")})`);
                const allCourseDone = (allLessons || []).length > 0 &&
                  (allLessons || []).every(l => newCompleted.has(l.lesson_id));
                if (allCourseDone) {
                  badges.push({ type: "course", name: selectedCourse.course_name, id: selectedCourse?.course_id });
                }
              }
            }
          }
        }
      }
    }

    setEarnedBadges(badges);

    // Award forest tokens + check badge criteria (fire-and-forget)
    if (user && !user.is_anonymous) {
      awardForLessonComplete(user.id, badges, points || 0)
        .catch(e => console.warn("award:", e));
    }
  }

  function saveLastVisited(routeObj) {
    lastVisitedRouteRef.current = routeObj;
    if (user?.id) {
      updateLastVisited(user.id, routeObj ? JSON.stringify(routeObj) : null)
        .catch(e => console.warn("updateLastVisited:", e));
    }
  }

  async function handleResume() {
    // Use the in-memory ref first (updated on every lesson open this session),
    // fall back to the persisted profile value loaded at login.
    const rawRoute = lastVisitedRouteRef.current
      ?? profile?.last_visited_route;
    if (!rawRoute) { goForward("navigator"); return; }
    const clearStaleRoute = () => saveLastVisited(null);
    try {
      const route = typeof rawRoute === "string" ? JSON.parse(rawRoute) : rawRoute;
      if (!route.module_id) { clearStaleRoute(); goForward("navigator"); return; }
      // Fetch module (always needed for setSelectedModule)
      const mods = await supabase("modules", `?module_id=eq.${route.module_id}&select=*`);
      if (!Array.isArray(mods) || mods.length === 0) { clearStaleRoute(); goForward("navigator"); return; }
      setSelectedModule(mods[0]);
      if (route.level_id)    setSelectedLevelId(route.level_id);
      if (route.course_id)   setSelectedCourse(c => c?.course_id ? c : { course_id: route.course_id, course_name: route.course_name });
      else if (route.course_name) setSelectedCourse(c => c ?? { course_name: route.course_name });
      if (route.theme_id)    setSelectedTheme(t => t?.theme_id ? t : { theme_id: route.theme_id, title: route.theme_title });
      else if (route.theme_title) setSelectedTheme(t => t ?? { title: route.theme_title });
      // If we have a lesson_id, go straight to the player at the saved snippet position
      if (route.lesson_id) {
        const lessons = await supabase("lessons", `?lesson_id=eq.${route.lesson_id}&select=*`);
        if (Array.isArray(lessons) && lessons.length > 0) {
          setSelectedLesson(lessons[0]);
          setEarnedBadges([]);
          setPlayerReturnPage("navigator");
          setNavigatorSelection({ levelId: route.level_id, themeId: route.theme_id, moduleId: route.module_id, lessonId: route.lesson_id });
          goForward("player");
          return;
        }
      }
      // Fallback: no lesson_id saved — go to lessons list
      goForward("lessons");
    } catch (e) {
      console.warn("handleResume:", e);
      clearStaleRoute();
      goForward("navigator");
    }
  }

  function showToast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2000);
  }

  function handleToggleBookmark(contentType, contentId, label) {
    if (!user || user.is_anonymous) { setShowAuthModal(true); return; }
    const key = contentType + ":" + contentId;
    const isBookmarked = bookmarks.has(key);
    setBookmarks(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(key); else next.add(key);
      return next;
    });
    showToast(isBookmarked ? "Bookmark removed" : label + " bookmarked ✓");
    if (isBookmarked) {
      deleteBookmark(user.id, contentType, contentId).catch(e => console.warn("deleteBookmark:", e));
    } else {
      insertBookmark(user.id, contentType, contentId).catch(e => console.warn("insertBookmark:", e));
    }
  }


  async function handleBookmarkNavigate(item) {
    try {
      const {
        content_type, content_id,
        course_id, course_name,
        theme_id, theme_title,
        module_id, module_name,
        lesson_name,
      } = item;

      const courseObj = course_id ? { course_id, course_name } : null;

      switch (content_type) {

        case "course": {
          const rows = await supabase("courses", `?course_id=eq.${content_id}&select=*`);
          if (!rows?.length) return;
          setSelectedCourse(rows[0]);
          goForward("navigator");
          break;
        }

        case "theme": {
          const [themes, mods] = await Promise.all([
            supabase("themes",  `?theme_id=eq.${content_id}&select=*`),
            supabase("modules", `?theme_id=eq.${content_id}&select=level_id&limit=1`),
          ]);
          if (!themes?.length) return;
          const levelId = mods?.[0]?.level_id || "foundation";
          setSelectedCourse(courseObj);
          setSelectedTheme(themes[0]);
          setSelectedLevelId(levelId);
          goForward("modules");
          break;
        }

        case "module": {
          const [mods, themes] = await Promise.all([
            supabase("modules", `?module_id=eq.${content_id}&select=*`),
            theme_id ? supabase("themes", `?theme_id=eq.${theme_id}&select=*`) : Promise.resolve(null),
          ]);
          if (!mods?.length) return;
          const mod   = mods[0];
          const theme = themes?.[0] || { theme_id, title: theme_title };
          setSelectedCourse(courseObj);
          setSelectedTheme(theme);
          setSelectedLevelId(mod.level_id || null);
          setSelectedModule(mod);
          goForward("lessons");
          break;
        }

        case "lesson": {
          const [lessons, mods, themes] = await Promise.all([
            supabase("lessons", `?lesson_id=eq.${content_id}&select=*`),
            module_id ? supabase("modules", `?module_id=eq.${module_id}&select=*`) : Promise.resolve(null),
            theme_id  ? supabase("themes",  `?theme_id=eq.${theme_id}&select=*`)   : Promise.resolve(null),
          ]);
          if (!lessons?.length) return;
          const lesson = lessons[0];
          const mod    = mods?.[0]  || { module_id, module_name };
          const theme  = themes?.[0] || { theme_id, title: theme_title };
          setSelectedCourse(courseObj);
          setSelectedTheme(theme);
          setSelectedLevelId(mod.level_id || null);
          setSelectedModule(mod);
          setSelectedLesson(lesson);
          setEarnedBadges([]);
          setPlaylistSnippetIds(null);
          // Always start lesson bookmarks from the first snippet
          setLessonProgress(prev => { const m = new Map(prev); m.delete(content_id); return m; });
          setPlayerReturnPage("navigator");
          goForward("player");
          break;
        }

        case "snippet": {
          // Find which lesson this snippet belongs to and its position
          const mapping = await supabase(
            "lesson_snippet_mapping",
            `?snippet_id=eq.${content_id}&select=lesson_id,order_index&order=order_index&limit=1`
          );
          if (!mapping?.length) {
            // Fallback: play as single-item playlist
            setPlaylistSnippetIds([content_id]);
            setPlaylistStartIndex(0);
            goForward("player");
            return;
          }
          const lessonId = mapping[0].lesson_id;

          // Get all snippets in this lesson (ordered) to find the index
          const [allMappings, lessons, mods, themes] = await Promise.all([
            supabase("lesson_snippet_mapping", `?lesson_id=eq.${lessonId}&select=snippet_id,order_index&order=order_index`),
            supabase("lessons", `?lesson_id=eq.${lessonId}&select=*`),
            module_id ? supabase("modules", `?module_id=eq.${module_id}&select=*`) : Promise.resolve(null),
            theme_id  ? supabase("themes",  `?theme_id=eq.${theme_id}&select=*`)   : Promise.resolve(null),
          ]);

          const snippetIndex = Math.max(0, (allMappings || []).findIndex(m => String(m.snippet_id) === String(content_id)));
          const lesson = lessons?.[0] || { lesson_id: lessonId, lesson_name };
          const mod    = mods?.[0]  || { module_id, module_name };
          const theme  = themes?.[0] || { theme_id, title: theme_title };

          setSelectedCourse(courseObj);
          setSelectedTheme(theme);
          setSelectedLevelId(mod.level_id || null);
          setSelectedModule(mod);
          setSelectedLesson(lesson);
          setEarnedBadges([]);
          setPlaylistSnippetIds(null);
          // Set progress to start at the bookmarked snippet
          setLessonProgress(prev => { const m = new Map(prev); m.set(lessonId, snippetIndex); return m; });
          setPlayerReturnPage("navigator");
          goForward("player");
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.warn("handleBookmarkNavigate:", e);
    }
  }

  function handleSaveSettings(next) {
    setSettings(next);
    saveSettings(next, user?.id || null);
  }

  async function handlePlayFromLikes(snippetIds, startIndex) {
    setPlaylistSnippetIds(snippetIds);
    setPlaylistStartIndex(startIndex);
    setPlaylistSource("likes");
    setPlaylistLabel(PLAYLIST.likes);
    goForward("player");
  }

  async function handlePlayFromDiscover(snippetIds, startIndex, termName) {
    setPlaylistSnippetIds(snippetIds);
    setPlaylistStartIndex(startIndex);
    setPlaylistSource("discover");
    setPlaylistLabel("\u{1F9ED} " + (termName || "Discover"));
    goForward("player");
  }

  async function handlePlayFromGateway(snippetIds, label) {
    if (!snippetIds || snippetIds.length === 0) return;
    setPlaylistSnippetIds(snippetIds);
    setPlaylistStartIndex(0);
    setPlaylistSource("gateway");
    setPlaylistLabel(label || PLAYLIST.gateway);
    goForward("player");
  }

  // Opens a lesson directly by lesson_id (used by ForYouPage recommendations/carousels)
  async function handleOpenLessonById(lessonId) {
    try {
      const lessons = await supabase("lessons", `?lesson_id=eq.${lessonId}&select=*`);
      if (!Array.isArray(lessons) || !lessons.length) return;
      const lesson = lessons[0];
      const mods = await supabase("modules", `?module_id=eq.${lesson.module_id}&select=*`);
      const mod = Array.isArray(mods) && mods.length ? mods[0] : null;
      const themes = mod
        ? await supabase("themes", `?theme_id=eq.${mod.theme_id}&select=*`)
        : null;
      const theme = Array.isArray(themes) && themes.length ? themes[0] : null;
      setSelectedLesson(lesson);
      if (mod)   setSelectedModule(mod);
      if (theme) setSelectedTheme(theme);
      if (mod?.level_id) setSelectedLevelId(mod.level_id);
      setEarnedBadges([]);
      setPlaylistSnippetIds(null);
      setPlayerReturnPage("for-you");
      setLessonQuiz(null);
      getQuizForLesson(lessonId).then(({ data }) => setLessonQuiz(data || null));
      if (user && !user.is_anonymous) {
        saveLastVisited({
          lesson_id:   lesson.lesson_id,
          module_id:   mod?.module_id  ?? null,
          level_id:    mod?.level_id   ?? null,
          course_id:   selectedCourse?.course_id   ?? null,
          course_name: selectedCourse?.course_name ?? null,
          theme_id:    mod?.theme_id   ?? null,
          theme_title: theme?.title    ?? null,
        });
      }
      goForward("player");
    } catch (e) {
      console.warn("handleOpenLessonById:", e);
    }
  }

  async function handleSignOut() {
    try { await signOut(); } catch (e) { console.warn("signOut:", e); }
    setPage("home");
  }

  const authContextValue = {
    user,
    profile,
    onSignIn:  () => setShowAuthModal(true),
    onSignOut: handleSignOut,
    onProfile: () => setShowProfileModal(true),
  };

  const commonProps = {
    user,
    profile,
    settings,
    onOpenSettings: () => goForward("settings"),
    onHome:       () => goBack("home"),
    onForYou:     () => goForward("for-you"),
    onAllCourses: () => goForward("home"), // placeholder until All Courses page (Task 3)
    onDashboard: () => goForward("dashboard"),
    onLikes:     () => goForward("likes"),
    onBookmarks: () => goForward("bookmarks"),
    onDiscover:  () => goForward("discover"),
    onAdmin:     () => goForward("admin"),
    onEditor:    () => goForward("editor"),
    isAdmin,
    isCreator,
    userEditorialRole,
    onResume:    handleResume,
    bookmarks,
    onToggleBookmark: handleToggleBookmark,
    activePage:  page,
    onSaveSettings: handleSaveSettings,
    languages,
    lessonProgress,
  };

  const renderPage = () => {
    switch (page) {
      case "player":
        return (
          <SnippetPlayer
            {...commonProps}
            course={selectedCourse}
            theme={selectedTheme}
            module={selectedModule}
            lesson={selectedLesson}
            levelId={selectedLevelId}
            allLessons={moduleLessons}
            earnedBadges={earnedBadges}
            initialSnippetIndex={playlistSnippetIds ? playlistStartIndex : (lessonProgress.get(selectedLesson?.lesson_id) ?? 0)}
            playlistSnippetIds={playlistSnippetIds}
            onSnippetAdvance={handleSnippetAdvance}
            onComplete={handleLessonComplete}
            onNextLesson={lesson => {
              setEarnedBadges([]);
              setSelectedLesson(lesson);
            }}
            onBackToLessons={() => { setEarnedBadges([]); setPlaylistSnippetIds(null); goBack(playerReturnPage); }}
            onBackToLikes={playlistSource === "likes" ? () => { setPlaylistSnippetIds(null); goBack("likes"); } : undefined}
            onBackToDiscover={
              playlistSource === "discover" ? () => { setPlaylistSnippetIds(null); goBack("discover"); } :
              playlistSource === "gateway"  ? () => { setPlaylistSnippetIds(null); setPage("home"); } :
              undefined
            }
            playlistLabel={playlistLabel}
            snippetShareMsg={profile?.snippet_share_message || localStorage.getItem("indiyatra_snippet_share_message") || DEFAULT_SNIPPET_SHARE_MSG}
            lessonQuiz={lessonQuiz}
            onTakeQuiz={lessonQuiz ? async () => {
              const { data } = await getQuizQuestions(lessonQuiz.quiz_id, settings.languageId || "LANG_03");
              setSelectedQuiz(lessonQuiz);
              setQuizQuestions(data || []);
              setQuizReturnPage("player");
              setQuizKey(k => k + 1);
              goForward("quiz");
            } : null}
          />
        );
      case "lessons":
        return (
          <LessonsPage
            {...commonProps}
            course={selectedCourse}
            theme={selectedTheme}
            module={selectedModule}
            levelId={selectedLevelId}
            completedLessons={completedLessons}
            onLessonsLoaded={lessons => setModuleLessons(lessons)}
            onLessonClick={lesson => {
              setSelectedLesson(lesson);
              setEarnedBadges([]);
              setPlayerReturnPage("lessons");
              setLessonQuiz(null); // reset; fetch below
              getQuizForLesson(lesson.lesson_id).then(({ data }) => setLessonQuiz(data || null));
              // Save last visited context for Resume Yatra
              if (user && !user.is_anonymous) {
                saveLastVisited({
                  lesson_id:   lesson.lesson_id,
                  module_id:   selectedModule?.module_id  ?? null,
                  level_id:    selectedLevelId            ?? null,
                  course_id:   selectedCourse?.course_id  ?? null,
                  course_name: selectedCourse?.course_name ?? null,
                  theme_id:    selectedTheme?.theme_id    ?? null,
                  theme_title: selectedTheme?.title        ?? null,
                });
              }
              goForward("player");
            }}
            onQuizClick={async (lesson, quiz) => {
              const { data } = await getQuizQuestions(quiz.quiz_id, settings.languageId || "LANG_03");
              setSelectedLesson(lesson);
              setSelectedQuiz(quiz);
              setQuizQuestions(data || []);
              setQuizReturnPage("lessons");
              setQuizKey(k => k + 1);
              goForward("quiz");
            }}
            onBack={() => goBack("home")}
            onBackToCourse={() => goBack("navigator")}
            onBackToModules={() => goBack("modules")}
          />
        );
      case "modules":
        return (
          <ModulesPage
            {...commonProps}
            course={selectedCourse}
            theme={selectedTheme}
            levelId={selectedLevelId}
            completedLessons={completedLessons}
            onModuleClick={mod => { setSelectedModule(mod); goForward("lessons"); }}
            onBack={() => goBack("home")}
            onBackToCourse={() => goBack("navigator")}
          />
        );
      case "navigator":
        return (
          <CourseNavigatorPage
            {...commonProps}
            course={selectedCourse}
            completedLessons={completedLessons}
            lessonProgress={lessonProgress}
            onLessonSelect={(lesson, mod, thm, levelId) => {
              setSelectedLesson(lesson);
              setSelectedModule(mod);
              setSelectedTheme(thm);
              setSelectedLevelId(levelId);
              setEarnedBadges([]);
              setPlayerReturnPage("navigator");
              setLessonQuiz(null);
              getQuizForLesson(lesson.lesson_id).then(({ data }) => setLessonQuiz(data || null));
              setNavigatorSelection({ levelId, themeId: mod.theme_id, moduleId: mod.module_id, lessonId: lesson.lesson_id });
              if (user && !user.is_anonymous) {
                saveLastVisited({
                  lesson_id:   lesson.lesson_id,
                  module_id:   mod.module_id          ?? null,
                  level_id:    levelId                ?? null,
                  course_id:   selectedCourse?.course_id  ?? null,
                  course_name: selectedCourse?.course_name ?? null,
                  theme_id:    mod.theme_id           ?? null,
                  theme_title: thm.title              ?? null,
                });
              }
              goForward("player");
            }}
            initialSelection={navigatorSelection}
            onQuizClick={async (lesson, quiz, mod, thm, levelId) => {
              const { data } = await getQuizQuestions(quiz.quiz_id, settings.languageId || "LANG_03");
              setSelectedLesson(lesson);
              setSelectedQuiz(quiz);
              setQuizQuestions(data || []);
              setQuizReturnPage("navigator");
              if (mod?.module_id) setNavigatorSelection({ levelId, themeId: mod.theme_id, moduleId: mod.module_id, lessonId: lesson.lesson_id });
              setQuizKey(k => k + 1);
              goForward("quiz");
            }}
            onBack={() => goBack("home")}
            onBackToCourse={() => goBack("navigator")}
          />
        );
      case "quiz":
        return (
          <QuizPlayer
            key={quizKey}
            {...commonProps}
            quiz={selectedQuiz}
            questions={quizQuestions}
            lesson={selectedLesson}
            onBack={() => goBack(quizReturnPage)}
            onDashboard={() => goForward("dashboard")}
            onRetake={async () => {
              if (!selectedQuiz) return;
              const { data } = await getQuizQuestions(selectedQuiz.quiz_id, settings.languageId || "LANG_03");
              setQuizQuestions(data || []);
              setQuizKey(k => k + 1);
              goForward("quiz");
            }}
          />
        );
      case "course":
        return (
          <CoursePage
            {...commonProps}
            course={selectedCourse}
            completedLessons={completedLessons}
            onThemeClick={({ theme, levelId }) => {
              setSelectedTheme(theme);
              setSelectedLevelId(levelId);
              goForward("modules");
            }}
            onBack={() => goBack("home")}
          />
        );
      case "for-you":
        return (
          <ForYouPage
            {...commonProps}
            onBack={() => goBack("home")}
            lessonProgress={lessonProgress}
            onPlaySnippet={(snippetIds, startIndex) => {
              setPlaylistSnippetIds(snippetIds);
              setPlaylistStartIndex(startIndex);
              setPlaylistSource("likes");
              setPlaylistLabel("\u2665 My Likes");
              setPlayerReturnPage("for-you");
              goForward("player");
            }}
            onNavigate={handleBookmarkNavigate}
            onOpenLesson={handleOpenLessonById}
          />
        );
      case "dashboard":
        return (
          <DashboardPage
            {...commonProps}
            course={selectedCourse}
            completedLessons={completedLessons}
            onResume={handleResume}
            onBack={() => goBack("home")}
            languages={languages}
            onSaveSettings={handleSaveSettings}
          />
        );
      case "settings":
        return (
          <SettingsPage
            {...commonProps}
            onBack={() => goBack("home")}
            languages={languages}
            onSaveSettings={handleSaveSettings}
            refreshProfile={refreshProfile}
            user={user}
            profile={profile}
          />
        );
      case "discover":
        return (
          <DiscoverPage
            {...commonProps}
            onBack={() => goBack("home")}
            onNavigate={handleBookmarkNavigate}
            onPlaySnippet={(snippetIds, startIndex, termName) => handlePlayFromDiscover(snippetIds, startIndex, termName)}
          />
        );
      case "bookmarks":
        return (
          <BookmarksPage
            {...commonProps}
            onBack={() => goBack("home")}
            onNavigate={handleBookmarkNavigate}
          />
        );
      case "likes":
        return (
          <LikesPage
            {...commonProps}
            onBack={() => goBack("home")}
            onPlaySnippet={(snippetIds, startIndex) => handlePlayFromLikes(snippetIds, startIndex)}
          />
        );
      case "admin":
        return (
          <Suspense fallback={<div style={{padding:"2rem",textAlign:"center",color:"#6B6B6B"}}>Loading…</div>}>
            <AdminPage
              {...commonProps}
              isAdmin={isAdmin}
              onBack={() => goBack("home")}
            />
          </Suspense>
        );
      case "editor":
        return (
          <Suspense fallback={<div style={{padding:"2rem",textAlign:"center",color:"#6B6B6B"}}>Loading…</div>}>
            <EditorPage
              {...commonProps}
              userEditorialRole={userEditorialRole}
              languages={languages}
              onBack={() => goBack("home")}
            />
          </Suspense>
        );
      case "gateway":
        return (
          <GatewayPage
            {...commonProps}
            onCourseFlow={() => setPage("home")}
            onExploreInterests={() => goForward("discover")}
            onPlayMostLiked={ids => handlePlayFromGateway(ids, "♥ Most Liked")}
            onPlayMostSaved={ids => handlePlayFromGateway(ids, "🔖 Most Saved")}
            onSurpriseMe={ids => handlePlayFromGateway(ids, "🎲 Surprise Mix")}
          />
        );
      default:
        return (
          <HomePage
            {...commonProps}
            onCourseClick={course => { setSelectedCourse(course); goForward("navigator"); }}
          />
        );
    }
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <style>{transitionStyles}</style>
      <div key={page} className={`page-enter-${navDirection}`} style={{ display: "block", width: "100%" }}>
        {renderPage()}
        {!["player", "quiz", "gateway"].includes(page) && <AppFooter />}
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      {toastMsg && (
        <div style={{
          position: "fixed", bottom: "90px", left: "50%", transform: "translateX(-50%)",
          background: "#00509E", color: "white", padding: "10px 22px",
          borderRadius: "999px", fontSize: "0.875rem", fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)", zIndex: 9999,
          animation: "fadeUp 0.2s ease both", whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          {toastMsg}
        </div>
      )}
      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          onSaved={() => refreshProfile()}
        />
      )}
    </AuthContext.Provider>
  );
}
