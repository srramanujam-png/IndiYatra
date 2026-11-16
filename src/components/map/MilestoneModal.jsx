// src/components/map/MilestoneModal.jsx
// Pop-up shown the moment a finished lesson moves the Yatra map to a new 5% milestone (or completes a module / theme / level / course).
// It replays the map intro FROM the state before the lesson, so the learner watches exactly what they just unlocked.
//
//   <MilestoneModal open before={stateBeforeLesson} after={stateAfterLesson} seenKey={user.id} onClose={...} onOpenDashboard={...} />
//
// Decide WHEN to show it with shouldShowMapPopup(before, after) (mapMath.js). Progress is credited by the server when the lesson completion
// is saved, so this can only appear once the lesson is complete — never halfway through a lesson.
import { useEffect, useMemo, useRef } from "react";
import DashboardMap from "./DashboardMap";
import { seenRecordFrom } from "../../lib/map/mapMath";

const CSS = `
  .ymm { position: fixed; inset: 0; z-index: 1300; display: grid; place-items: center; padding: 12px; background: rgba(16,24,40,.62); animation: ymm-in .25s ease; overflow-y: auto; }
  .ymm-box { width: min(100%, 780px); max-height: 100%; overflow-y: auto; background: var(--color-surface, #fff); border-radius: 18px; box-shadow: 0 24px 60px rgba(16,24,40,.4); padding: 14px 14px 16px; }
  .ymm-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 2px 10px; }
  .ymm-top h3 { margin: 0; font-family: var(--font-heading); font-size: 1.15rem; font-weight: 600; color: var(--color-text-main); }
  .ymm-x { width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; cursor: pointer; font-size: 22px; line-height: 1; color: var(--color-text-muted); }
  .ymm-x:hover { background: var(--color-border-muted); }
  .ymm-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
  .ymm-btn { font-family: var(--font-ui); font-size: var(--text-sm); font-weight: 600; border-radius: var(--radius-pill, 999px); padding: 10px 20px; min-height: 44px; cursor: pointer; border: 1px solid var(--color-primary); }
  .ymm-btn.primary { background: var(--color-primary); color: #fff; }
  .ymm-btn.ghost { background: #fff; color: var(--color-primary); }
  @keyframes ymm-in { from { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .ymm { animation: none; } }
`;

export default function MilestoneModal({ open, before, after, seenKey = "anon", courseId = null, cardOverride = undefined, onClose, onOpenDashboard }) {
  const closeRef = useRef(null);
  const prev = useMemo(() => seenRecordFrom(before), [before]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    const prevOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);
  if (!open || !after) return null;
  return (
    <div className="ymm" role="dialog" aria-modal="true" aria-label="Your Yatra map has grown" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <style>{CSS}</style>
      <div className="ymm-box">
        <div className="ymm-top">
          <h3>Your Yatra Map has grown</h3>
          <button ref={closeRef} type="button" className="ymm-x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <DashboardMap compact stateOverride={after} cardOverride={cardOverride} prevOverride={prev} courseId={courseId} seenKey={seenKey} />
        <div className="ymm-actions">
          <button type="button" className="ymm-btn primary" onClick={onClose}>Keep learning</button>
          {onOpenDashboard && <button type="button" className="ymm-btn ghost" onClick={onOpenDashboard}>See my dashboard</button>}
        </div>
      </div>
    </div>
  );
}
