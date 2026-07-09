import { useState, useEffect } from "react";
import { gaugeColor, GAUGE_TRACK } from "../lib/courseTree";

// ─── Circular progress ring wrapping a module cover photo ──────────────────
// Full 360° ring (12 o'clock start, clockwise) around a circular photo —
// the ring shows progress, the photo is the module's cover image. Falls
// back to the plain percentage badge (today's look) when `image` is
// missing or fails to load, so partial photo coverage never looks broken.
// Used by AllCoursesPage's module header.
export default function ModuleGauge({ pct, size = 84, image, alt = "" }) {
  const color     = gaugeColor(pct);
  const clamped   = Math.min(100, Math.max(0, pct));
  const strokeW   = size * 0.09;
  const r         = (size - strokeW) / 2;
  const cx        = size / 2;
  const cy        = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset     = circumference * (1 - clamped / 100);
  const photoInset     = strokeW + size * 0.06; // gap between ring and photo
  const photoSize      = size - photoInset * 2;

  const [imgError, setImgError] = useState(false);
  // Reset the error flag if a different image URL comes in (e.g. list
  // re-renders with a different module) so a prior failure doesn't stick.
  useEffect(() => { setImgError(false); }, [image]);
  const showImage = !!image && !imgError;

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
      {showImage ? (
        <img
          src={image}
          alt={alt}
          onError={() => setImgError(true)}
          style={{
            position: "absolute", top: photoInset, left: photoInset,
            width: photoSize, height: photoSize,
            borderRadius: "50%", objectFit: "cover",
          }}
        />
      ) : (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: size * 0.22, color }}>
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
}
