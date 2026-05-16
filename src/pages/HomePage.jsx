import { useState, useEffect } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl, DEFAULT_LANG_CODE } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";

const styles = `
  .hero {
    text-align: center; padding: 64px 1.5rem 48px;
    position: relative; overflow: hidden;
  }
  .hero::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 6px; background: linear-gradient(90deg, ${SAFFRON}, #FF6B00, ${SAFFRON});
  }
  .tagline-pill {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, ${SAFFRON}22, ${SAFFRON}11);
    border: 1px solid ${SAFFRON}44; border-radius: 999px;
    padding: 6px 20px; font-size: 14px; font-weight: 600;
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
    font-size: 18px; font-style: italic; color: #666;
    margin-bottom: 40px; animation: fadeUp 0.6s 0.2s ease both;
  }
  .section-heading {
    font-family: 'Alumni Sans', sans-serif; font-size: 28px; font-weight: 700;
    color: ${HERITAGE}; text-align: center; margin-bottom: 32px;
    display: flex; align-items: center; justify-content: center; gap: 16px;
  }
  .section-heading::before, .section-heading::after {
    content: ''; flex: 1; max-width: 80px; height: 2px;
    background: linear-gradient(90deg, transparent, ${SAFFRON});
  }
  .section-heading::after { background: linear-gradient(90deg, ${SAFFRON}, transparent); }
  .courses-section { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem 80px; }
  .courses-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 360px));
    gap: 24px;
    justify-content: center;
  }
  .course-card {
    background: white; border-radius: 20px; overflow: hidden;
    border: 1px solid #E8D5B0; box-shadow: 0 4px 24px rgba(255,142,0,0.08);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    animation: fadeUp 0.6s ease both; cursor: pointer;
    width: 100%;
  }
  .course-card:hover { transform: translateY(-6px); box-shadow: 0 12px 40px rgba(255,142,0,0.18); }
  .card-image { position: relative; height: 200px; overflow: hidden; }
  .card-image img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; transition: transform 0.4s; }
  .course-card:hover .card-image img { transform: scale(1.05); }
  .card-image-overlay { position:absolute; inset:0; background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.72) 100%); }
  .card-lang-badge {
    position: absolute; top: 12px; right: 12px;
    border-radius: 999px; padding: 3px 10px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.03em;
  }
  .card-lang-badge.available { background: ${GREEN}22; color: ${GREEN}; border: 1px solid ${GREEN}44; }
  .card-lang-badge.fallback  { background: #fff3; color: #ffffffcc; border: 1px solid #ffffff44; backdrop-filter: blur(4px); }
  .card-num-pill {
    position: absolute; top: 12px; left: 12px;
    background: ${SAFFRON}; color: white; border-radius: 999px;
    padding: 4px 14px; font-family: 'Alumni Sans', sans-serif; font-size: 14px; font-weight: 700;
  }
  .card-body  { padding: 18px 20px 20px; text-align: left; }
  .card-title { font-family: 'Alumni Sans', sans-serif; font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
  .card-desc  { font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 12px; }
  .card-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .card-stat  {
    display: inline-flex; align-items: center; gap: 4px;
    background: #F7F3EC; border: 1px solid #E8D5B0;
    border-radius: 999px; padding: 4px 10px;
    font-size: 12px; font-weight: 600; color: #888;
  }
  .card-cta {
    display: inline-flex; align-items: center; gap: 6px;
    border: 1.5px solid ${SAFFRON}; color: ${SAFFRON}; border-radius: 999px;
    padding: 6px 18px; font-family: 'Alumni Sans', sans-serif; font-size: 15px;
    font-weight: 700; cursor: pointer; background: transparent; transition: background 0.2s, color 0.2s;
  }
  .card-cta:hover { background: ${SAFFRON}; color: white; }
  @media (max-width: 768px) {
    .courses-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; justify-content: start; }
    .hero { padding: 40px 1rem 32px; }
    .courses-section { padding: 0 1rem 60px; }
  }
  @media (max-width: 480px) {
    .courses-grid { grid-template-columns: 1fr; }
    .card-image { height: 160px; }
  }
`;

export default function HomePage({ settings, onCourseClick, onOpenSettings }) {
  const [courses, setCourses]       = useState([]);
  const [assets, setAssets]         = useState({});
  const [siteSettings, setSiteSettings] = useState({});
  const [availableLangs, setAvailableLangs] = useState(new Set());
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      const [courseData, assetData, settingsData, transData] = await Promise.all([
        supabase("courses", "?select=*&order=course_number"),
        supabase("asset_library", "?select=*"),
        supabase("site_settings", "?select=*"),
        supabase("snippet_translations", "?select=language"),
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
        navLinks={[
          { label: "Courses",  onClick: () => {} },
          { label: "Discover", onClick: () => {} },
        ]}
      />

      <section className="hero">
        <div className="tagline-pill">✦ {tagline}</div>
        <div className="wordmark">
          <span className="indi">Indi</span><span className="yatra">Yatra</span>
        </div>
        <p className="subtitle">{subtitle}</p>
      </section>

      <section className="courses-section">
        <h2 className="section-heading">Choose Your Course</h2>
        {loading ? <div className="loading">Loading courses…</div> : (
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
                      <span className="card-stat">📖 48 stories</span>
                      <span className="card-stat">🌐 In 14 languages</span>
                      <span className="card-stat">👥 1,240 learners</span>
                    </div>
                    <button className="card-cta" onClick={e => { e.stopPropagation(); onCourseClick(course); }}>
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
