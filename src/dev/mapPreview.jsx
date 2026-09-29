// Dev-only harness (open /map-preview.html?p=25 while `npm run dev` is running). Not part of the production build.
// Renders the real <DashboardMap> with a synthetic learner state so every progress level can be reviewed
// without a database. ?p=0..100  ?badges=n
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DashboardMap from "../components/map/DashboardMap";
import { globalStyles } from "../styles/global";
import "../index.css";
import { milestoneIndex } from "../lib/map/mapMath";

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
if (q.get("tulsi")) state.plantCounts.tulsi = Number(q.get("tulsi"));
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <style>{globalStyles}</style>
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px" }}>
      <h2 style={{ fontFamily: "Oswald, sans-serif", margin: "0 0 12px" }}>Your Yatra Map</h2>
      <DashboardMap stateOverride={state} />
    </div>
  </StrictMode>
);
