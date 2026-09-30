// Dev-only harness (open /map-preview.html?p=25 while `npm run dev` is running). Not part of the production build.
// Renders the real <DashboardMap> with a synthetic learner state so every progress level can be reviewed
// without a database. ?p=0..100  ?badges=n
//   ?fresh=1  forget what the learner has seen  -> plays the full intro (first sight)
//   ?prev=P   pretend the learner last looked at P%  -> intro + celebration if p has crossed a new 5% step (&prevPlants=jasmine:1,lotus:1 sets earlier plant counts)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DashboardMap from "../components/map/DashboardMap";
import { globalStyles } from "../styles/global";
import "../index.css";
import { milestoneIndex } from "../lib/map/mapMath";
import dashSrc from "../pages/DashboardPage.jsx?raw";

const q = new URLSearchParams(location.search);
const p = Math.min(100, Math.max(0, Number(q.get("p") ?? 25)));
const nBadges = Number(q.get("badges") ?? 12);
const NAMES = ["First Step", "Module Complete", "Theme Explorer", "Level Achiever", "Course Master", "10 Lessons", "25 Lessons", "50 Lessons", "3-Day Streak", "7-Day Streak", "100 Dharma", "1000 Dharma"];
const ICONS = ["🪔", "📜", "🗺️", "⭐", "🏛️", "📖", "📚", "🎓", "🌅", "🔥", "✦", "🌳"];
const earned = Math.round((p / 100) * nBadges);
const total = 240;
const state = {
  status: "ok", scope: "platform", progressPercent: p, milestoneIndex: milestoneIndex(p),
  dharma: { awarded: Math.round((total * p) / 100), possible: total },
  plantCounts: { tulsi: Math.round(p * 1.4), jasmine: Math.round(p * 0.35), lotus: Math.round(p / 12), ashoka: Math.round(p / 25), banyan: p >= 100 ? 1 : 0 },
  badges: Array.from({ length: nBadges }, (_, i) => ({ badgeId: `B${i}`, name: NAMES[i % 12], icon: ICONS[i % 12], description: null, earned: i < earned })),
};
const card = {
  scope: "platform", lastViewed: { kind: "lesson", id: "x", title: "Lesson 7 · Chola bronzes" },
  course: { courseId: "c", name: "Temples of South India", percent: 78, snippetsTotal: 36, snippetsDone: 28 },
  nextUnlock: p >= 100 ? null : { milestoneIndex: milestoneIndex(p) + 1, thresholdPercent: (milestoneIndex(p) + 1) * 5, storiesToGo: 4 },
  nextBanyan: { courseId: "c", name: "Temples of South India", percent: 78, storiesToGo: 8 },
};
if (q.get("tulsi")) state.plantCounts.tulsi = Number(q.get("tulsi"));
try {
  const key = "ymap:seen:preview:all";
  if (q.get("fresh")) localStorage.removeItem(key);
  else if (q.get("prev") != null) {
    const plants = Object.fromEntries((q.get("prevPlants") || "").split(",").filter(Boolean).map((kv) => { const [k, v] = kv.split(":"); return [k, Number(v)]; }));
    localStorage.setItem(key, JSON.stringify({ m: milestoneIndex(Number(q.get("prev"))), plants }));
  } else if (q.get("keep") == null) localStorage.setItem(key, JSON.stringify({ m: state.milestoneIndex, plants: state.plantCounts }));   // default: "already seen" -> no intro
} catch { /* storage unavailable */ }
// ?split=1  -> the dashboard's 3-column layout (map centre) with the dashboard's own CSS and stand-in welcome / jump / stat blocks
const dashCss = ((dashSrc.match(/const styles = `([\s\S]*?)`;/) || [])[1] || "").replace(/\$\{SAFFRON\}/g, "#FF8E00").replace(/\$\{HERITAGE\}/g, "#00509E").replace(/\$\{GREEN\}/g, "#2F8F46");
const slots = q.get("split") ? {
  hero: <div className="dash-hero dash-hero-split"><div className="dash-hero-left"><div className="dash-title">Welcome back, Ram</div><div className="dash-subtitle">You&apos;ve been active 2 days this month</div><div className="dash-scope-wrap"><div className="dash-scope-pill"><i className="ti ti-books dash-scope-pill-icon" />Courses<span className="dash-scope-pill-chevron">▾</span></div><div className="dash-scope-hint">Filter your dashboard by a specific course</div></div></div></div>,
  jump: <div className="dash-hero dash-hero-split dash-jump-card"><div className="dash-nav-label">Jump to</div><div className="dash-nav-grid">{["Learning Streak", "Progress", "Recent Activity", "Yatra Map", "Your Forest", "Quiz Performance", "Share Your Yatra"].map((t) => <a key={t} className="dash-nav-link" href="#x">{t}</a>)}</div></div>,
  stats: <div className="dash-stats">{[["Dharma Points", "2,370"], ["Lessons Completed", "8"], ["Quizzes Taken", "3"], ["Badges", "1"], ["Plants", "23"]].map(([l, v]) => <div className="stat-card" key={l}><div className="stat-icon"><i className="ti ti-diamond" /></div><div className="stat-label">{l.split(" ").map((w) => <span key={w} className="stat-label-word">{w}</span>)}</div><div className="stat-value">{v}</div></div>)}<div className="stat-card stat-ghost" aria-hidden="true" /></div>,
} : null;
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <style>{globalStyles}</style>
    {slots ? (
      <div className="page-wrap" style={{ paddingTop: 12 }}><style>{dashCss}</style>
        <div className="dash-top"><DashboardMap slots={slots} stateOverride={state} cardOverride={card} seenKey="preview" /></div>
        <div className="dash-section" style={{ height: 300 }}>…rest of the dashboard scrolls below…</div>
      </div>
    ) : (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px" }}>
      <h2 style={{ fontFamily: "Oswald, sans-serif", margin: "0 0 12px" }}>Your Yatra Map</h2>
      <DashboardMap stateOverride={state} cardOverride={card} seenKey="preview" />
    </div>)}
  </StrictMode>
);
