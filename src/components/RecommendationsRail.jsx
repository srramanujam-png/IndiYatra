import { SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { useRecommendations } from "../hooks/useRecommendations";

// ── Styles (injected inline — matches IndiYatra design system pattern) ─────────
const styles = `
  /* ── Recommendations Rail ── */
  .rec-rail {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    padding: 24px; margin-bottom: 24px;
    border-left: 3px solid ${SAFFRON}; border-radius: 0 12px 12px 0;
  }

  .rec-rail-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }

  .rec-rail-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif; font-size: 1.25rem;
    font-weight: 500; color: #101828; letter-spacing: 0.01em;
    display: inline-flex; align-items: center; gap: 8px;
    padding-bottom: 4px; border-bottom: 2px solid ${SAFFRON};
  }

  .rec-rail-meta {
    font-size: 0.75rem; color: #4A5565; font-weight: 600;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Scroll container */
  .rec-carousel {
    display: flex; gap: 12px;
    overflow-x: auto; overflow-y: visible;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; padding-bottom: 2px;
  }
  .rec-carousel::-webkit-scrollbar { display: none; }

  /* Lesson card */
  .rec-card {
    flex: 0 0 160px; scroll-snap-align: start;
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    overflow: hidden; cursor: pointer;
    transition: border-color 0.15s, transform 0.18s;
    display: flex; flex-direction: column;
    min-height: 0;
  }
  .rec-card:hover {
    border-color: ${SAFFRON}80; transform: translateY(-2px);
  }
  .rec-card:active { transform: translateY(0); }

  /* Colour-block thumb */
  .rec-thumb {
    height: 88px; width: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.875rem; position: relative; flex-shrink: 0;
    background: #F3F4F6;
  }
  .rec-thumb-tag {
    position: absolute; bottom: 6px; left: 6px; right: 6px;
    font-size: 0.5625rem; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; color: white;
    background: rgba(0,0,0,0.45); border-radius: 4px;
    padding: 2px 6px; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; font-family: 'Inter', system-ui, sans-serif;
  }
  .rec-thumb-popular {
    position: absolute; top: 6px; right: 6px;
    font-size: 0.5rem; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; color: ${SAFFRON};
    background: white; border-radius: 4px; padding: 2px 5px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Card body */
  .rec-body { padding: 10px 12px 12px; flex: 1; display: flex; flex-direction: column; }
  .rec-lesson-name {
    font-family: 'Nunito Sans', system-ui, sans-serif;
    font-size: 0.8125rem; font-weight: 700; color: #101828;
    line-height: 1.4; margin-bottom: 6px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .rec-meta-row {
    display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
    margin-top: auto;
  }
  .rec-chip {
    font-size: 0.5625rem; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; border-radius: 999px;
    padding: 2px 7px; white-space: nowrap;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .rec-chip-saffron { background: ${SAFFRON}15; color: ${SAFFRON}; }
  .rec-chip-heritage { background: ${HERITAGE}12; color: ${HERITAGE}; }

  /* Tags strip under the card grid */
  .rec-interests {
    margin-top: 14px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
  }
  .rec-interest-label {
    font-size: 0.6875rem; color: #4A5565; font-family: 'Inter', system-ui, sans-serif;
    white-space: nowrap;
  }
  .rec-interest-tag {
    font-size: 0.6875rem; font-weight: 600; color: ${HERITAGE};
    background: ${HERITAGE}0F; border-radius: 999px; padding: 2px 9px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Empty / loading states */
  .rec-empty {
    font-size: 0.9375rem; color: #4A5565; font-style: italic; padding: 4px 0;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }

  /* Skeleton */
  .rec-skel-row { display: flex; gap: 12px; }
  .rec-skel-card {
    flex: 0 0 160px; border-radius: 12px; height: 160px;
    background: linear-gradient(90deg, #F3F4F6 25%, #FFFFFF 50%, #F3F4F6 75%);
    background-size: 600px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  @media (max-width: 480px) {
    .rec-rail { padding: 18px 14px; }
    .rec-card { flex: 0 0 140px; }
    .rec-thumb { height: 76px; }
    .rec-rail-title { font-size: 1.125rem; }
  }
`;

// ── Thumb colour palettes (cycles by lesson index) ─────────────────────────────
const THUMB_PALETTES = [
  { bg: "#EEF5FF", icon: "🏛️" },
  { bg: "#FFF3E8", icon: "🪔" },
  { bg: "#E8F8F0", icon: "🌿" },
  { bg: "#F3EEFF", icon: "🎨" },
  { bg: "#FFF8E1", icon: "🏺" },
  { bg: "#E8F4FD", icon: "🌊" },
  { bg: "#FFF0F0", icon: "🎭" },
  { bg: "#F0FFF4", icon: "🌸" },
];

// ── Component ──────────────────────────────────────────────────────────────────
/**
 * RecommendationsRail — "Pick up where your interests left off" section.
 *
 * Props:
 *   userId     — auth user id (null = not logged in, rail hidden)
 *   onOpenLesson(lesson_id, lesson_name) — called when user taps a card
 *   limit      — max cards to show (default 8)
 */
export default function RecommendationsRail({ userId, onOpenLesson, limit = 8 }) {
  const { recommendations, loading, error } = useRecommendations({ userId, limit });

  // Don't render for anonymous/logged-out users
  if (!userId) return null;

  // Collect unique interest tags to display at the bottom
  const interestTags = [
    ...new Set(
      recommendations
        .filter(r => r.tag_overlap > 0)
        .flatMap(r => r.tag_names || [])
        .slice(0, 10)
    ),
  ].slice(0, 5);

  const hasData = !loading && recommendations.length > 0;
  const isEmpty = !loading && !error && recommendations.length === 0;

  return (
    <>
      <style>{styles}</style>

      <div className="rec-rail">
        <div className="rec-rail-head">
          <div className="rec-rail-title">
            ✦ Pick up where your interests left off
          </div>
          {hasData && (
            <div className="rec-rail-meta">
              {recommendations.length} lessons
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="rec-skel-row">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rec-skel-card" />
            ))}
          </div>
        )}

        {/* Error — silently hide (rail just won't appear) */}
        {error && !loading && null}

        {/* Empty — user has no history yet */}
        {isEmpty && (
          <p className="rec-empty">
            Complete a few lessons and we'll personalise this for you.
          </p>
        )}

        {/* Cards carousel */}
        {hasData && (
          <>
            <div className="rec-carousel">
              {recommendations.map((rec, idx) => {
                const palette = THUMB_PALETTES[idx % THUMB_PALETTES.length];
                const isPopular = rec.total_completions > 10;

                return (
                  <div
                    key={rec.lesson_id}
                    className="rec-card"
                    onClick={() => onOpenLesson?.(rec.lesson_id, rec.lesson_name)}
                    title={rec.lesson_name}
                  >
                    <div className="rec-thumb" style={{ background: palette.bg }}>
                      <span>{palette.icon}</span>
                      {rec.theme_title && (
                        <div className="rec-thumb-tag">{rec.theme_title}</div>
                      )}
                      {isPopular && (
                        <div className="rec-thumb-popular">Popular</div>
                      )}
                    </div>

                    <div className="rec-body">
                      <div className="rec-lesson-name">{rec.lesson_name}</div>
                      <div className="rec-meta-row">
                        {rec.course_name && (
                          <span className="rec-chip rec-chip-heritage">
                            {rec.course_name.length > 12
                              ? rec.course_name.slice(0, 12) + "…"
                              : rec.course_name}
                          </span>
                        )}
                        {rec.tag_overlap > 0 && (
                          <span className="rec-chip rec-chip-saffron">
                            {rec.tag_overlap} match{rec.tag_overlap !== 1 ? "es" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interest tags row — shows what drove these recommendations */}
            {interestTags.length > 0 && (
              <div className="rec-interests">
                <span className="rec-interest-label">Based on your interest in</span>
                {interestTags.map(tag => (
                  <span key={tag} className="rec-interest-tag">{tag}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
