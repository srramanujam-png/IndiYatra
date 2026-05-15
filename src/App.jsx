import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { loadSettings, saveSettings } from "./hooks/useSettings";
import SettingsDrawer from "./components/SettingsDrawer";
import HomePage      from "./pages/HomePage";
import CoursePage    from "./pages/CoursePage";
import ModulesPage   from "./pages/ModulesPage";
import LessonsPage   from "./pages/LessonsPage";
import SnippetPlayer from "./pages/SnippetPlayer";

export default function App() {
  const [settings, setSettings]         = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [languages, setLanguages]       = useState([]);

  const [page, setPage]                         = useState("home");
  const [selectedCourse, setSelectedCourse]     = useState(null);
  const [selectedTheme, setSelectedTheme]       = useState(null);
  const [selectedLevelId, setSelectedLevelId]   = useState(null);
  const [selectedModule, setSelectedModule]     = useState(null);
  const [selectedLesson, setSelectedLesson]     = useState(null);

  // Apply font size on mount and whenever it changes
  useEffect(() => {
    document.body.dataset.fs = settings.fontSize;
  }, [settings.fontSize]);

  // Load language list once
  useEffect(() => {
    supabase("languages", "?select=*&order=language").then(data => setLanguages(data || []));
  }, []);

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
            onBackToLessons={() => setPage("lessons")}
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
            onLessonClick={lesson => { setSelectedLesson(lesson); setPage("player"); }}
            onBack={() => setPage("home")}
            onBackToCourse={() => setPage("course")}
            onBackToModules={() => setPage("modules")}
          />
        );
      case "modules":
        return (
          <ModulesPage
            {...commonProps}
            course={selectedCourse}
            theme={selectedTheme}
            levelId={selectedLevelId}
            onModuleClick={mod => { setSelectedModule(mod); setPage("lessons"); }}
            onBack={() => setPage("home")}
            onBackToCourse={() => setPage("course")}
          />
        );
      case "course":
        return (
          <CoursePage
            {...commonProps}
            course={selectedCourse}
            onThemeClick={({ theme, levelId }) => {
              setSelectedTheme(theme);
              setSelectedLevelId(levelId);
              setPage("modules");
            }}
            onBack={() => setPage("home")}
          />
        );
      default:
        return (
          <HomePage
            {...commonProps}
            onCourseClick={course => { setSelectedCourse(course); setPage("course"); }}
          />
        );
    }
  };

  return (
    <>
      {renderPage()}
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
