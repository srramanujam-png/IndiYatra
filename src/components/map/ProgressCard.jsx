// src/components/map/ProgressCard.jsx — "where am I / what's next" card that sits on the Tibetan plateau, top-right of the map (desktop)
// or under the map (phones). Pure presentation: every number comes from get_map_card + the manifest.
import { formatPercent, nextUnlockText } from "../../lib/map/mapMath";

export default function ProgressCard({ card, state, manifest, variant = "overlay", scoped = false }) {
  if (!state || state.status !== "ok") return null;
  const course = card?.course, last = card?.lastViewed;
  const coursePct = course?.percent ?? null;
  const unlock = nextUnlockText(card, manifest);
  const done = state.milestoneIndex >= 20;

  const title = course?.name || (scoped ? "This course" : "Your journey");
  const lastLine = last ? `Last ${last.kind === "quiz" ? "quiz" : "viewed"}: ${last.title}` : "Start any lesson to grow your map";

  return (
    <aside className={`ymap-card2 ${variant}`} aria-label="Your progress" aria-hidden={undefined}>
      <div className="body">
        <div className="ttl">{title}</div>
        <div className="sub">{lastLine}</div>
        {coursePct !== null && (<><div className="bar" role="img" aria-label={`${formatPercent(coursePct)} percent of this course`}><i style={{ width: `${Math.max(0, Math.min(100, coursePct))}%` }} /></div><div className="sub">{formatPercent(coursePct)}% of this course</div></>)}
        <div className="next">
          {done ? <>All rivers, ranges and temples unveiled.</>
            : unlock ? <><b>{unlock.lead}</b>{unlock.names ? <> <em>{unlock.names}</em></> : null}</>
            : <>Keep learning to unveil more of the map.</>}
        </div>
      </div>
    </aside>
  );
}
