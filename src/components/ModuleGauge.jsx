import { gaugeColor, GAUGE_TRACK } from "../lib/courseTree";

// ─── Circular progress ring — transparent middle ────────────────────────────
// Full 360° ring (12 o'clock start, clockwise), just the ring — no photo
// filling the middle, so it reads cleanly as a progress indicator sitting
// on top of a module card's own background (which now carries the cover
// photo itself, tiled across the whole card — see AllCoursesPage). The
// percentage label is always near-black rather than progress-colored, so
// it stays legible against that background regardless of pct.
// Used by AllCoursesPage's module header.
export default function ModuleGauge({ pct, size = 84 }) {
  const color     = gaugeColor(pct);
  const clamped   = Math.min(100, Math.max(0, pct));
  const strokeW   = size * 0.09;
  const r         = (size - strokeW) / 2;
  const cx        = size / 2;
  const cy        = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset     = circumference * (1 - clamped / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={GAUGE_TRACK} strokeWidth={strokeW} />
        {clamped > 0 && (
          <circle
            cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: size * 0.22, color: "var(--color-text-main)" }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}
