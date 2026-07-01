import { useState, useEffect, useContext } from "react";
import { supabase, SAFFRON, HERITAGE, GREEN, logoUrl } from "../lib/supabase";
import { globalStyles } from "../styles/global";
import PageHeader from "../components/PageHeader";
import { SkeletonCourseGrid } from "../components/Skeletons";
import { FALLBACK } from "../config/appStrings";
import { AuthContext } from "../contexts/AuthContext";

const TEAL    = "#4AADA8";
const TEAL_BG = "#EAF6F5";
const TEAL_BD = "#C2E4E2";

const styles = `
  .hp-hero {
    background: #FFFFFF;
    padding: 56px 1.5rem 52px;
    border-bottom: 1px solid #F0F0F0;
  }
  .hp-hero-inner {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 56px; align-items: center;
  }
  .hp-welcome-label {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.8125rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: ${SAFFRON}; margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .hp-welcome-label::before {
    content: ''; display: inline-block;
    width: 24px; height: 2px; background: ${SAFFRON};
    border-radius: 2px;
  }
  .hp-headline {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: clamp(2rem, 3.5vw, 2.75rem); font-weight: 700;
    line-height: 1.1; color: #101828; margin-bottom: 16px;
  }
  .hp-headline em { font-style: normal; }
  .hp-subline {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 1rem; color: #4A5565; line-height: 1.65;
    margin-bottom: 32px; max-width: 440px;
  }
  .hp-cta-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
  .hp-guest-note {
    margin-top: 16px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.8125rem; color: #9CA3AF;
  }
  .hp-benefits { display: flex; flex-direction: column; gap: 14px; }
  .hp-benefit-card {
    display: flex; align-items: flex-start; gap: 14px;
    background: #FAFAFA; border: 1px solid #EBEBEB;
    border-radius: 12px; padding: 16px 18px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .hp-benefit-card:hover {
    border-color: ${SAFFRON}55;
    box-shadow: 0 2px 12px ${SAFFRON}12;
  }
  .hp-benefit-icon {
    width: 40px; height: 40px; flex-shrink: 0;
    border-radius: 10px; background: ${SAFFRON}15;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.25rem;
  }
  .hp-benefit-title {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.9375rem; font-weight: 700; color: #101828; margin-bottom: 3px;
  }
  .hp-benefit-desc {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.8125rem; color: #6B7280; line-height: 1.5;
  }
  .hp-panel { background: #F8F8F6; padding: 48px 1.5rem 64px; }
  .hp-panel-inner { max-width: 1100px; margin: 0 auto; }
  .hp-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 28px;
  }
  .hp-panel-heading {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 1.375rem; font-weight: 500; color: #101828;
    display: flex; align-items: center; gap: 10px;
  }
  .hp-panel-heading::before {
    content: ''; display: inline-block;
    width: 4px; height: 22px; border-radius: 2px; background: ${TEAL};
  }
  .hp-panel-sub {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.875rem; color: #6B7280;
  }
  .hp-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
  }
  .hp-course-card {
    background: white; border-radius: 12px; overflow: hidden;
    border: 1px solid ${TEAL_BD};
    transition: transform 0.22s ease, box-shadow 0.22s ease;
    cursor: pointer; animation: fadeUp 0.5s ease both;
    display: flex; flex-direction: column;
  }
  .hp-course-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(74,173,168,0.18);
  }
  .hp-card-img {
    width: 100%; aspect-ratio: 16 / 9; overflow: hidden;
    position: relative; background: ${SAFFRON}12; flex-shrink: 0;
  }
  .hp-card-img img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.35s ease; display: block;
  }
  .hp-course-card:hover .hp-card-img img { transform: scale(1.05); }
  .hp-card-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.30) 100%);
  }
  .hp-card-num {
    position: absolute; bottom: 10px; left: 10px;
    background: ${SAFFRON}; color: white;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase; padding: 3px 10px; border-radius: 999px;
  }
  .hp-card-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; background: ${SAFFRON}10;
  }
  .hp-card-body {
    padding: 14px 16px 12px;
    display: flex; flex-direction: column; flex: 1;
  }
  .hp-card-title {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.9375rem; font-weight: 700;
    color: #101828; margin-bottom: 6px; line-height: 1.3;
  }
  .hp-card-meta {
    display: flex; flex-wrap: wrap; gap: 8px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.6875rem; font-weight: 600;
    color: #6B7280; margin-bottom: 14px;
  }
  .hp-card-meta span { display: flex; align-items: center; gap: 3px; }
  .hp-card-footer {
    background: ${TEAL}; padding: 11px 16px; margin-top: auto;
    transition: background 0.18s;
  }
  .hp-course-card:hover .hp-card-footer { background: #3d9994; }
  .hp-card-cta {
    width: 100%; background: transparent; border: none; color: white;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.8125rem; font-weight: 600; cursor: pointer;
    padding: 0; letter-spacing: 0.02em;
  }
  @media (max-width: 900px) {
    .hp-hero-inner { grid-template-columns: 1fr; gap: 36px; }
    .hp-subline { max-width: 100%; }
  }
  @media (max-width: 600px) {
    .hp-hero { padding: 36px 1rem 36px; }
    .hp-panel { padding: 32px 1rem 48px; }
    .hp-cards-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
    .hp-card-body { padding: 10px 12px 10px; }
    .hp-card-title { font-size: 0.875rem; }
  }
  @media (max-width: 380px) { .hp-cards-grid { grid-template-columns: 1fr; } }
`;

const BENEFITS = [
  {
    icon: "📱",
    title: "Sync across devices",
    desc: "Your progress, bookmarks and Dharma Points follow you everywhere you go.",
  },
  {
    icon: "✶",
    title: "Earn Dharma Points & grow your Forest",
    desc: "Complete lessons to earn sacred tokens and watch your personal forest grow.",
  },
  {
    icon: "🔖",
    title: "Bookmark lessons & themes",
    desc: "Save anything you want to revisit — modules, lessons, or themes — in one place.",
  },
];

export default function HomePage({
  settings, onCourseClick, onOpenSettings, onDashboard,
  onLikes, onBookmarks, onDiscover, onResume,
  isAdmin, onAdmin, userEditorialRole, onEditor,
  activePage, onSaveSettings, languages = [],
}) {
  const { onSignIn, user } = useContext(AuthContext);
  const isGuest = !user || user.is_anonymous;

  const [courses, setCourses]               = useState([]);
  const [assets, setAssets]                 = useState({});
  const [learnersByCourse, setLearnersByCourse] = useState(new Map());
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    async function load() {
      const [courseData, assetData, learnerData] = await Promise.all([
        supabase("courses", "?select=*&order=sort_order"),
        supabase("asset_library", "?select=*"),
        supabase("rpc/get_course_learner_counts", ""),
      ]);
      const assetMap = {};
      (assetData || []).forEach(a => { assetMap[a.asset_id] = a; });
      setCourses(courseData || []);
      setAssets(assetMap);
      const learnersMap = new Map((learnerData || []).map(r => [r.course_id, r.learner_count]));
      setLearnersByCourse(learnersMap);
      setLoading(false);
    }
    load();
  }, []);

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
          { label: "Home",        onClick: () => {}       },
          { label: "All Courses", onClick: onAllCourses   },
          { label: "For You",     onClick: onForYou       },
          { label: "Dashboard",   onClick: onDashboard    },
          { label: "Discover",    onClick: onDiscover     },
        ]}
      />

      {isGuest && <section className="hp-hero">
        <div className="hp-hero-inner">
          <div>
            <div className="hp-welcome-label">Welcome back</div>
            <h1 className="hp-headline">Continue your<br />Yatra</h1>
            <p className="hp-subline">
              Sign in to save your progress, earn Dharma Points, and grow your
              sacred forest — or keep exploring as a guest.
            </p>
            <div className="hp-cta-row">
              <button className="btn-primary btn-saffron" onClick={onSignIn}>Sign In →</button>
              <button className="btn-primary btn-heritage" onClick={onDiscover}>Continue as Guest</button>
            </div>
            <p className="hp-guest-note">
              Already exploring? Sign in and pick up right where you left off.
            </p>
          </div>

          <div className="hp-benefits">
            {BENEFITS.map((b, i) => (
              <div className="hp-benefit-card" key={i}>
                <div className="hp-benefit-icon">{b.icon}</div>
                <div>
                  <div className="hp-benefit-title">{b.title}</div>
                  <div className="hp-benefit-desc">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>}

      <section className="hp-panel">
        <div className="hp-panel-inner">
          <div className="hp-panel-header">
            <div className="hp-panel-heading">Explore Courses</div>
            <div className="hp-panel-sub">Click any course to start exploring</div>
          </div>
          {loading ? <SkeletonCourseGrid count={4} /> : (
            <div className="hp-cards-grid">
              {courses.map((course, i) => {
                const asset    = assets[course.asset_id];
                const learners = learnersByCourse.get(course.course_id);
                return (
                  <div
                    className="hp-course-card"
                    key={course.course_id}
                    style={{ animationDelay: `${i * 0.08}s` }}
                    onClick={() => onCourseClick(course)}
                  >
                    <div className="hp-card-img">
                      {asset
                        ? <img
                            src={asset.file_path}
                            alt={asset.alt_text || course.course_name}
                            onError={e => { e.target.src = logoUrl; }}
                          />
                        : <div className="hp-card-placeholder">🪔</div>
                      }
                      <div className="hp-card-overlay" />
                      <div className="hp-card-num">Course {course.course_number}</div>
                    </div>
                    <div className="hp-card-body">
                      <div className="hp-card-title">
                        {course.course_name || FALLBACK.courseName}
                      </div>
                      <div className="hp-card-meta">
                        {course.snippet_count != null && (
                          <span>📖 {course.snippet_count} stories</span>
                        )}
                        {learners != null && (
                          <span>👥 {learners.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="hp-card-footer">
                      <button
                        className="hp-card-cta"
                        onClick={e => { e.stopPropagation(); onCourseClick(course); }}
                      >
                        Explore →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

    </>
  );
}
