// src/components/map/ProgressCard.jsx — "where am I / what's next" card that sits in the Bay of Bengal (desktop)
// or under the map (phones). Pure presentation: every number comes from get_map_card + the manifest.
import { formatPercent, nextUnlockText } from "../../lib/map/mapMath";

const RING_R = 22, RING_C = 2 * Math.PI * RING_R;

function Ring({ percent, label }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="ymap-ring" role="img" aria-label={label}>
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="27" cy="27" r={RING_R} fill="none" stroke="#E6E4DA" strokeWidth="5" />
        <circle cx="27" cy="27" r={RING_R} fill="none" stroke="#2F8F46" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(RING_C * p) / 100} ${RING_C}`} transform="rotate(-90 27 27)" />
      </svg>
      <b>{formatPercent(p)}%</b>
    </div>
  );
}

export default function ProgressCard({ card, state, manifest, variant = "overlay", scoped = false }) {
  if (!state || state.status !== "ok") return null;
  const course = card?.course, last = card?.lastViewed;
  const coursePct = course?.percent ?? null;
  const unlock = nextUnlockText(card, manifest);
  const banyan = card?.nextBanyan;
  const done = state.milestoneIndex >= 20;

  const title = course?.name || (scoped ? "This course" : "Your journey");
  const lastLine = last ? `Last ${last.kind === "quiz" ? "quiz" : "viewed"}: ${last.title}` : "Start any lesson to grow your map";

  return (
    <aside className={`ymap-card2 ${variant}`} aria-label="Your progress" aria-hidden={undefined}>
      <Ring percent={coursePct ?? state.progressPercent} label={`${formatPercent(coursePct ?? state.progressPercent)} percent ${course ? "of this course" : "of your journey"}`} />
      <div className="body">
        <div className="ttl">{title}</div>
        <div className="sub">{lastLine}</div>
        {coursePct !== null && (<><div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, coursePct))}%` }} /></div><div className="sub">{formatPercent(coursePct)}% of this course</div></>)}
        <div className="next">
          {done ? <>All rivers, ranges and temples unveiled.</>
            : unlock ? <><b>{unlock.lead}</b>{unlock.names ? <> <em>{unlock.names}</em></> : null}</>
            : <>Keep learning to unveil more of the map.</>}
        </div>
        {banyan && (
          <div className="banyan"><i className="ti ti-tree" aria-hidden="true" /> {scoped ? "Course banyan" : "Next banyan"}: {scoped ? "" : `${banyan.name} · `}{banyan.storiesToGo} {banyan.storiesToGo === 1 ? "story" : "stories"} to go</div>
        )}
        {!banyan && !scoped && <div className="banyan muted">Reach 50% in a course to see your next banyan.</div>}
      </div>
    </aside>
  );
}
