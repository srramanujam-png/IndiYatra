import { useState, useEffect } from "react";
import { supabase, LEVEL_LABELS } from "./lib/supabase";
import { loadSettings, saveSettings } from "./hooks/useSettings";
import SettingsDrawer from "./components/SettingsDrawer";
import HomePage      from "./pages/HomePage";
import CoursePage    from "./pages/CoursePage";
import ModulesPage   from "./pages/ModulesPage";
import LessonsPage   from "./pages/LessonsPage";
import SnippetPlayer from "./pages/SnippetPlayer";

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
  const [moduleLessons, setModuleLessons]       = useState([]);
  const [earnedBadges, setEarnedBadges]         = useState([]);
  const [navDirection, setNavDirection]         = useState("none");

  const [page, setPage]                         = useState("home");
  const [selectedCourse, setSelectedCourse]     = useState(null);
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
    document.body.dataset.fs = settings.fontSize;
  }, [settings.fontSize]);

  // Scroll to top on every page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // Load language list once
  useEffect(() => {
    supabase("languages", "?select=*&order=language").then(data => setLanguages(data || []));
  }, []);

  async function handleLessonComplete(lessonId, points) {
    const newCompleted = new Set([...completedLessons, lessonId]);
    setCompletedLessons(newCompleted);

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

  function handleSaveSettings(next) {
    setSettings(next);
    saveSettings(next);
  }

  const commonProps = {
    settings,
    onOpenSettings: () => setShowSettings(true),
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
            onComplete={handleLessonComplete}
            onNextLesson={lesson => {
              setEarnedBadges([]);
              setSelectedLesson(lesson);
            }}
            onDashboard={() => alert("Dashboard coming soon!")}
            onBackToLessons={() => { setEarnedBadges([]); goBack("lessons"); }}
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
    <>
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
    </>
  );
}
