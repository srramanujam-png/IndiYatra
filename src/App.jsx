import { useState, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { signOut, loadCompletions, saveCompletion, updateLastVisited, loadLessonProgress, upsertLessonProgress, deleteLessonProgress } from "./lib/auth";
import { AuthContext } from "./contexts/AuthContext";
import AuthModal     from "./components/AuthModal";
import ProfileModal  from "./components/ProfileModal";
import { supabase, LEVEL_LABELS } from "./lib/supabase";
import { loadSettings, saveSettings } from "./hooks/useSettings";
import SettingsDrawer from "./components/SettingsDrawer";
import HomePage      from "./pages/HomePage";
import CoursePage    from "./pages/CoursePage";
import ModulesPage   from "./pages/ModulesPage";
import LessonsPage   from "./pages/LessonsPage";
import SnippetPlayer  from "./pages/SnippetPlayer";
import DashboardPage  from "./pages/DashboardPage";
import LikesPage      from "./pages/LikesPage";

const transitionStyles = `
  @keyframes pageSlideInRight {
    from { opacity: 0; transform: translateX(28px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes pageSlideInLeft {
    from { opacity: 0; transform: translateX(-28px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .page-enter-forward { animation: pageSlideInRight 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both; }
  .page-enter-back    { animation: pageSlideInLeft  0.28s cubic-bezier(0.25,0.46,0.45,0.94) both; }
  .page-enter-none    { animation: none; }
  .page-enter-forward, .page-enter-back, .page-enter-none {
    display: block; width: 100%; overflow-x: hidden;
  }
`;

export default function App() {
  const [settings, setSettings]         = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [languages, setLanguages]       = useState([]);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [lessonProgress,   setLessonProgress]   = useState(new Map());
  const [moduleLessons, setModuleLessons]       = useState([]);
  const [earnedBadges, setEarnedBadges]         = useState([]);
  const [navDirection, setNavDirection]         = useState("none");
  const snippetAdvanceTimer = useRef(null);

  const { user, profile, authLoading, refreshProfile } = useAuth();
  const [showAuthModal,    setShowAuthModal]    = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [page, setPage]                         = useState("home");
  const [selectedCourse, setSelectedCourse]     = useState(null);
  const [playlistSnippetIds, setPlaylistSnippetIds] = useState(null);
  const [playlistStartIndex, setPlaylistStartIndex] = useState(0);
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
  useEffect(() => {
    if (!user) {
      setCompletedLessons(new Set());
      setLessonProgress(new Map());
      return;
    }
    if (user.is_anonymous) return; // guests keep local-only state
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
  }, [user?.id]);

  // Redirect returning users (those with a saved route) to Dashboard on login.
  // Fires only when profile first loads (profile?.id dependency), not on page changes.
  useEffect(() => {
    if (profile?.last_visited_route && page === "home") {
      goForward("dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

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
        selectedCourse?.course_id ?? "",
        points || 0,
        snippetCount || null
      ).catch(e => console.warn("saveCompletion:", e));
      // Lesson complete — remove in-progress resume record
      deleteLessonProgress(user.id, lessonId)
        .catch(e => console.warn("deleteLessonProgress:", e));
      setLessonProgress(prev => { const m = new Map(prev); m.delete(lessonId); return m; });
    }

    const badges = [{ type: "lesson", name: selectedLesson.lesson_name }];

    // Module badge — all lessons in this module done?
    const allModDone = moduleLessons.length > 0 &&
      moduleLessons.every(l => newCompleted.has(l.lesson_id));

    if (allModDone) {
      badges.push({ type: "module", name: selectedModule.module_name });

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
          badges.push({ type: "theme", name: selectedTheme.title });

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
              badges.push({ type: "level", name: levelLabel });

              // Course badge — all modules in course done?
              const allMods = await supabase("modules", "?select=module_id");
              const allModIds = (allMods || []).map(m => m.module_id);
              if (allModIds.length > 0) {
                const allLessons = await supabase("lessons",
                  `?select=lesson_id&module_id=in.(${allModIds.join(",")})`);
                const allCourseDone = (allLessons || []).length > 0 &&
                  (allLessons || []).every(l => newCompleted.has(l.lesson_id));
                if (allCourseDone) {
                  badges.push({ type: "course", name: selectedCourse.course_name });
                }
              }
            }
          }
        }
      }
    }

    setEarnedBadges(badges);
  }

  async function handleResume() {
    if (!profile?.last_visited_route) { goForward("course"); return; }
    try {
      const route = JSON.parse(profile.last_visited_route);
      if (!route.module_id) { goForward("course"); return; }
      const mods = await supabase("modules", `?module_id=eq.${route.module_id}&select=*`);
      if (!mods || mods.length === 0) { goForward("course"); return; }
      setSelectedModule(mods[0]);
      if (route.level_id)    setSelectedLevelId(route.level_id);
      if (route.course_name) setSelectedCourse(c => c ?? { course_name: route.course_name });
      if (route.theme_title) setSelectedTheme(t => t ?? { title: route.theme_title });
      goForward("lessons");
    } catch (e) {
      console.warn("handleResume:", e);
      goForward("course");
    }
  }

  function handleSaveSettings(next) {
    setSettings(next);
    saveSettings(next);
  }

  async function handlePlayFromLikes(snippetIds, startIndex) {
    setPlaylistSnippetIds(snippetIds);
    setPlaylistStartIndex(startIndex);
    goForward("player");
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
    settings,
    onOpenSettings: () => setShowSettings(true),
    onDashboard: () => goForward("dashboard"),
    onLikes:     () => goForward("likes"),
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
            onBackToLessons={() => { setEarnedBadges([]); setPlaylistSnippetIds(null); goBack("lessons"); }}
            onBackToLikes={() => { setPlaylistSnippetIds(null); goBack("likes"); }}
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
              // Save last visited context for Resume Yatra (fire-and-forget)
              if (user && !user.is_anonymous) {
                updateLastVisited(user.id, JSON.stringify({
                  module_id:   selectedModule?.module_id  ?? null,
                  level_id:    selectedLevelId            ?? null,
                  course_name: selectedCourse?.course_name ?? null,
                  theme_title: selectedTheme?.title        ?? null,
                })).catch(e => console.warn("updateLastVisited:", e));
              }
              goForward("player");
            }}
            onBack={() => goBack("home")}
            onBackToCourse={() => goBack("course")}
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
            onBackToCourse={() => goBack("course")}
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
      case "likes":
        return (
          <LikesPage
            {...commonProps}
            onBack={() => goBack("home")}
            onPlaySnippet={(snippetIds, startIndex) => handlePlayFromLikes(snippetIds, startIndex)}
          />
        );
      default:
        return (
          <HomePage
            {...commonProps}
            onCourseClick={course => { setSelectedCourse(course); goForward("course"); }}
          />
        );
    }
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <style>{transitionStyles}</style>
      <div key={page} className={`page-enter-${navDirection}`} style={{ display: "block", width: "100%" }}>
        {renderPage()}
      </div>
      {showSettings && (
        <SettingsDrawer
          settings={settings}
          languages={languages}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
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
