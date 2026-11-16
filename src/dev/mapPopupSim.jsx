// Dev-only simulation (open /map-popup-sim.html while `npm run dev` is running). No database needed.
// A mock lesson's last snippet -> "Finish lesson" -> the completion is "saved" -> the REAL <MilestoneModal> pops up over the completion
// screen when (and only when) the finished lesson moved the map. Scenarios: ?s=milestone (default) | module | nothing   ?auto=1 clicks Finish for you.
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import MilestoneModal from "../components/map/MilestoneModal";
import { globalStyles } from "../styles/global";
import "../index.css";
import { milestoneIndex, shouldShowMapPopup } from "../lib/map/mapMath";

const q = new URLSearchParams(location.search);
const scenario = q.get("s") || "milestone";
const NAMES = ["First Step", "Module Complete", "Theme Explorer", "Level Achiever", "Course Master", "10 Lessons", "25 Lessons", "50 Lessons", "3-Day Streak", "7-Day Streak", "100 Dharma", "1000 Dharma"];
const ICONS = ["🪔", "📜", "🗺️", "⭐", "🏛️", "📖", "📚", "🎓", "🌅", "🔥", "✦", "🌳"];
const mk = (p, plants) => ({
  status: "ok", scope: "platform", progressPercent: p, milestoneIndex: milestoneIndex(p), dharma: { awarded: Math.round((240 * p) / 100), possible: 240 },
  plantCounts: plants, badges: Array.from({ length: 12 }, (_, i) => ({ badgeId: `B${i}`, name: NAMES[i], icon: ICONS[i], description: null, earned: i < Math.round((p / 100) * 12) })),
});
const SCEN = {
  milestone: { before: mk(43.3, { tulsi: 60, jasmine: 15, lotus: 3, ashoka: 1, banyan: 0 }), after: mk(45.4, { tulsi: 64, jasmine: 15, lotus: 3, ashoka: 1, banyan: 0 }), label: "This lesson takes you from 43% to 45%: a new milestone" },
  module: { before: mk(41.2, { tulsi: 57, jasmine: 14, lotus: 3, ashoka: 1, banyan: 0 }), after: mk(43.3, { tulsi: 60, jasmine: 15, lotus: 3, ashoka: 1, banyan: 0 }), label: "This lesson finishes a module (no new 5% step)" },
  nothing: { before: mk(41.2, { tulsi: 57, jasmine: 14, lotus: 3, ashoka: 1, banyan: 0 }), after: mk(42.4, { tulsi: 59, jasmine: 14, lotus: 3, ashoka: 1, banyan: 0 }), label: "An ordinary lesson: nothing new on the map" },
}[scenario];
const card = { scope: "platform", lastViewed: { kind: "lesson", id: "x", title: "Lesson 7 · Chola bronzes" }, course: { courseId: "c", name: "Temples of South India", percent: 78, snippetsTotal: 36, snippetsDone: 28 },
  nextUnlock: { milestoneIndex: SCEN.after.milestoneIndex + 1, thresholdPercent: (SCEN.after.milestoneIndex + 1) * 5, storiesToGo: 6 }, nextBanyan: null };

const box = { maxWidth: 520, margin: "24px auto", padding: "0 16px", fontFamily: "var(--font-body, system-ui)" };
const btn = { font: "600 15px var(--font-ui, system-ui)", color: "#fff", background: "var(--color-primary, #00509E)", border: 0, borderRadius: 999, padding: "12px 22px", cursor: "pointer", minHeight: 44 };

// eslint-disable-next-line react-refresh/only-export-components
function Sim() {
  const [phase, setPhase] = useState("lesson");        // lesson -> saving -> done
  const [popup, setPopup] = useState(false);
  const show = useMemo(() => shouldShowMapPopup(SCEN.before, SCEN.after), []);
  useEffect(() => { if (q.get("auto") === "1") { const t = setTimeout(finish, 1200); return () => clearTimeout(t); } }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  function finish() {
    setPhase("saving");                                  // in the app: saveCompletion() -> DB trigger credits dharma -> fetchMapState() again
    setTimeout(() => { setPhase("done"); if (show) setTimeout(() => setPopup(true), 600); }, 900);
  }
  return (
    <div style={box}>
      <p style={{ font: "600 12px var(--font-ui)", color: "var(--color-text-muted)", margin: "0 0 4px" }}>SIMULATION · {SCEN.label}</p>
      <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 16, padding: 20, boxShadow: "0 6px 20px rgba(16,24,40,.08)" }}>
        {phase !== "done" ? (<>
          <div style={{ font: "600 13px var(--font-ui)", color: "var(--color-text-muted)" }}>Lesson 7 · Chola bronzes — snippet 6 of 6</div>
          <div style={{ display: "flex", gap: 5, margin: "10px 0 14px" }}>{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--color-accent, #FF8E00)" }} />)}</div>
          <h2 style={{ margin: "0 0 8px", font: "600 22px var(--font-heading)" }}>The dancing Nataraja</h2>
          <p style={{ margin: "0 0 18px", lineHeight: 1.55, color: "var(--color-text-body)" }}>Cast by the lost-wax method, the Chola bronzes froze the cosmic dance in metal. Each limb and gesture carries meaning…</p>
          <button type="button" style={btn} onClick={finish} disabled={phase === "saving"}>{phase === "saving" ? "Saving your progress…" : "Finish lesson"}</button>
        </>) : (<>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 44 }}>🎓</div>
            <h2 style={{ margin: "6px 0", font: "600 22px var(--font-heading)" }}>Lesson complete!</h2>
            <p style={{ margin: 0, color: "var(--color-text-body)" }}>+12 dharma seeds collected</p>
            <p style={{ margin: "14px 0 0" }}><button type="button" style={btn} onClick={() => setPopup(show)}>{show ? "Show map pop-up again" : "Continue"}</button></p>
          </div>
        </>)}
      </div>
      <MilestoneModal open={popup} before={SCEN.before} after={SCEN.after} cardOverride={card} seenKey="sim" onClose={() => setPopup(false)} onOpenDashboard={() => setPopup(false)} />
    </div>
  );
}
try { localStorage.removeItem("ymap:seen:sim:all"); } catch { /* ignore */ }
createRoot(document.getElementById("root")).render(<StrictMode><style>{globalStyles}</style><Sim /></StrictMode>);
