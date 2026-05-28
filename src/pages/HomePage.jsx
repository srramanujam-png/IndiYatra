import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, DEFAULT_LANG_CODE } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { SkeletonCourseGrid } from "../components/Skeletons";

const styles = `
  .hero {
    text-align: center; padding: 64px 1.5rem 48px;
    position: relative; overflow: hidden;
  }
  .tagline-pill {
    display: inline-flex; align-items: center; gap: 8px;
    background: white;
    border: 1px solid ${SAFFRON}; border-radius: 999px;
    padding: 6px 20px; font-size: 0.875rem; font-weight: 600;
    color: #b86000; letter-spacing: 0.05em; text-transform: uppercase;
    margin-bottom: 20px; animation: fadeUp 0.6s ease both;
  }
  .wordmark {
    font-family: 'Alumni Sans', sans-serif;
    font-size: clamp(52px, 10vw, 96px); font-weight: 800;
    line-height: 1; letter-spacing: -0.02em;
    margin-bottom: 12px; animation: fadeUp 0.6s 0.1s ease both;
  }
  .wordmark .indi  { color: ${SAFFRON}; }
  .wordmark .yatra { color: ${HERITAGE}; }
  .subtitle {
    font-size: 1.125rem; font-style: italic; color: #1F1F1F;
    margin-bottom: 40px; animation: fadeUp 0.6s 0.2s ease both;
  }
  .section-heading {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.75rem; font-weight: 700;
    color: #0A0A0A; margin-bottom: 32px;
    display: flex; align-items: center; gap: 12px;
  padding-bottom: 4px; border-bottom: 2px solid ${SAFFRON}; align-self: flex-start; }
  .section-heading::before { content: none; }; border-radius: 2px; flex-shrink: 0;
  }
  .courses-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 320px));
    gap: 24px;
    justify-content: start;
  }
  .course-card {
    background: white; border-radius: 14px; overflow: hidden;
    border: 1px solid rgba(0,0,0,0.07); box-shadow: 0 2px 14px rgba(0,0,0,0.07);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    animation: fadeUp 0.6s ease both; cursor: pointer;
    width: 100%;
  }
  .course-card:hover { transform: translateY(-5px); box-shadow: none; }
  .card-image { position: relative; aspect-ratio: 1 / 1; overflow: hidden; }
  .card-image img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; transition: transform 0.4s; }
  .course-card:hover .card-image img { transform: scale(1.05); }
  .card-image-overlay { position:absolute; inset:0; background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.45) 100%); }
  .card-lang-badge {
    position: absolute; top: 12px; right: 12px;
    border-radius: 999px; padding: 3px 10px;
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.03em;
  }
  .card-lang-badge.available { background: ${SAFFRON}18; color: ${SAFFRON}; border: 1px solid ${SAFFRON}44; }
  .card-lang-badge.fallback  { background: #fff3; color: #ffffffcc; border: 1px solid #ffffff44; backdrop-filter: blur(4px); }
  .card-num-pill {
    position: absolute; top: 12px; left: 12px;
    background: ${SAFFRON}; color: white; border-radius: 999px;
    padding: 4px 14px; font-family: 'Alumni Sans', sans-serif; font-size: 0.875rem; font-weight: 700;
  }
  .card-body  { padding: 18px 20px 20px; text-align: left; }
  .card-title { font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; font-weight: 700; color: #0A0A0A; margin-bottom: 6px; }
  .card-desc  { font-size: 0.875rem; color: #1F1F1F; line-height: 1.6; margin-bottom: 12px; }
  .card-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .card-stat  {
    display: inline-flex; align-items: center; gap: 4px;
    background: white; border: 1px solid rgba(0,0,0,0.07);
    border-radius: 999px; padding: 4px 10px;
    font-size: 0.75rem; font-weight: 600; color: ${SAFFRON};
  }

  .card-bm-btn {
    position: absolute; top: 10px; right: 10px; z-index: 2;
    background: rgba(255,255,255,0.92); border: none; cursor: pointer;
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #6B6B6B; transition: color 0.15s, transform 0.15s, background 0.15s;
    box-shadow: none;
  }
  .card-bm-btn:hover { color: #FF8E00; transform: scale(1.12); }
  .card-bm-btn.saved { color: #FF8E00; background: white; }
  @media (max-width: 768px) {
    .courses-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 300px)); gap: 16px; justify-content: start; }
    .hero { padding: 40px 1rem 32px; }

  }
  @media (max-width: 600px) {
    .courses-grid { grid-template-columns: 1fr; gap: 14px; }
    .card-body { padding: 16px; }
    .card-cta { width: 100%; justify-content: center; }
  }
  @media (max-width: 480px) {
    .card-image { aspect-ratio: 4 / 3; }
    .card-title { font-size: 1.25rem; }
  }
`;

export default function HomePage({ settings, onCourseClick, onOpenSettings, onDashboard, onLikes, onBookmarks, onDiscover, onResume, bookmarks = new Set(), onToggleBookmark, isAdmin, onAdmin, userEditorialRole, onEditor, activePage, onSaveSettings, languages = [] }) {
  const [courses, setCourses]       = useState([]);
  const [assets, setAssets]         = useState({});
  const [siteSettings, setSiteSettings] = useState({});
  const [availableLangs, setAvailableLangs] = useState(new Set());
  const [learnersByCourse, setLearnersByCourse] = useState(new Map());
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      const [courseData, assetData, settingsData, transData, learnerData] = await Promise.all([
        supabase("courses", "?select=*&order=course_number"),
        supabase("asset_library", "?select=*"),
        supabase("site_settings", "?select=*"),
        supabase("snippet_translations", "?select=language"),
        supabase("rpc/get_course_learner_counts", ""),
      ]);
      const assetMap = {};
      (assetData || []).forEach(a => { assetMap[a.asset_id] = a; });
      const settingsMap = {};
      (settingsData || []).forEach(s => { settingsMap[s.key] = s.value; });
      const langSet = new Set((transData || []).map(t => t.language));
      setCourses(courseData || []);
      setAssets(assetMap);
      setSiteSettings(settingsMap);
      setAvailableLangs(langSet);
      const learnersMap = new Map((learnerData || []).map(r => [r.course_id, r.learner_count]));
      setLearnersByCourse(learnersMap);
      setLoading(false);
    }
    load();
  }, []);

  const tagline  = siteSettings.site_tagline      || "Heritage for Every Child";
  const subtitle = siteSettings.site_hero_subtitle || "Discover Bharat. One Story at a Time.";
  const prefCode  = settings.languageCode;
  const isEnglish = prefCode === DEFAULT_LANG_CODE;

  return (
    <>
      <style>{globalStyles + styles}</style>
      <PageHeader
        onHome={() => {}}
        onOpenSettings={onOpenSettings}
        onResume={onResume}
        isAdmin={isAdmin}
        onAdmin={onAdmin}
        userEditorialRole={userEditorialRole}
        onEditor={onEditor}
        activePage={activePage}
        settings={settings}
        onSaveSettings={onSaveSettings}
        languages={languages}
        navLinks={[
          { label: "Home",      onClick: () => {} },
          { label: "Discover",  onClick: onDiscover },
          { label: "Dashboard", onClick: onDashboard },
          { label: "Likes",      onClick: onLikes },
          { label: "Bookmarks", onClick: onBookmarks },
        ]}
      />

      <section className="hero">
        <div className="tagline-pill">✦ {tagline}</div>
        <div className="wordmark">
          <span className="indi">Indi</span><span className="yatra">Yatra</span>
        </div>
        <p className="subtitle">{subtitle}</p>
      </section>

      <section className="page-wrap">
        <h2 className="section-heading">Choose Your Course</h2>
        {loading ? <SkeletonCourseGrid count={3} /> : (
          <div className="courses-grid">
            {courses.map((course, i) => {
              const asset   = assets[course.asset_id];
              const hasLang = !isEnglish && availableLangs.has(prefCode);
              return (
                <div
                  className="course-card"
                  key={course.course_id}
                  style={{ animationDelay: `${i * 0.1}s` }}
                  onClick={() => onCourseClick(course)}
                >
                  <div className="card-image">
                    {asset && (
                      <img src={asset.file_path} alt={asset.alt_text || course.course_name}
                        onError={e => { e.target.src = logoUrl; }} />
                    )}
                    <div className="card-image-overlay" />
                    <button
                      className={"card-bm-btn" + (bookmarks.has("course:" + course.course_id) ? " saved" : "")}
                      title={bookmarks.has("course:" + course.course_id) ? "Remove bookmark" : "Bookmark course"}
                      onClick={e => { e.stopPropagation(); onToggleBookmark && onToggleBookmark("course", course.course_id, course.course_name); }}
                    >
                      {bookmarks.has("course:" + course.course_id)
                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      }
                    </button>
                    <div className="card-num-pill">Course {course.course_number}</div>
                    {!isEnglish && (
                      <div className={`card-lang-badge ${hasLang ? "available" : "fallback"}`}>
                        {hasLang ? "✓ Available" : "English only"}
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="card-title">{course.course_name}</div>
                    <div className="card-desc">{course.description || "Explore the rich heritage of Bharat through stories, art, and wisdom."}</div>
                    <div className="card-stats">
                      <span className="card-stat">📖 {course.snippet_count ?? '—'} stories</span>
                      <span className="card-stat">🌐 In {course.language_count ?? '—'} languages</span>
                      <span className="card-stat">👥 {(learnersByCourse.get(course.course_id) ?? '—').toLocaleString()} learners</span>
                    </div>
                    <button className="btn-primary btn-saffron" onClick={e => { e.stopPropagation(); onCourseClick(course); }}>
                      Explore →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="footer">© {new Date().getFullYear()} IndiYatra · Heritage for Every Child</footer>
    </>
  );
}
