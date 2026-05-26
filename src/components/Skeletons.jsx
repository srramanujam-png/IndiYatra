// Skeleton shimmer components — one per page loading state.
// Each matches the visual proportions of the real content it replaces.
// All use the .skel CSS class (shimmer animation defined in globalStyles).

const S = ({ w = "100%", h = 16, r = 6, mb = 0, mt = 0, ml = 0, mr = 0, flex = null }) => (
  <span className="skel" style={{
    width: w, height: h, borderRadius: r,
    marginBottom: mb, marginTop: mt, marginLeft: ml, marginRight: mr,
    flexShrink: 0, ...(flex ? { flex } : {}),
  }} />
);

// ── 1. HomePage — course card grid ────────────────────────────────────────
export function SkeletonCourseGrid({ count = 3 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: 20, padding: "0 1.5rem 60px", maxWidth: 900, margin: "0 auto",
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: "white", borderRadius: 18,
          border: "1px solid #E8D5B0", overflow: "hidden",
          boxShadow: "0 2px 12px rgba(255,142,0,0.06)",
        }}>
          <S h={180} r={0} />
          <div style={{ padding: "18px 20px 20px" }}>
            <S h={22} w="65%" mb={10} />
            <S h={14} w="85%" mb={8} />
            <S h={13} w="50%" mb={16} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <S h={13} w="30%" />
              <S h={13} w="25%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 2. CoursePage — level tabs + theme rows ───────────────────────────────
export function SkeletonCourseThemes() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 60px" }}>
      {/* Level tab pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        {[110, 90, 120].map((w, i) => (
          <S key={i} h={42} w={w} r={12} />
        ))}
      </div>
      {/* Theme rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 14,
          background: "white", borderRadius: 16,
          border: "1px solid #E8D5B0", padding: "14px 16px",
          marginBottom: 10,
        }}>
          <S w={52} h={52} r={10} />
          <div style={{ flex: 1 }}>
            <S h={18} w="55%" mb={8} />
            <S h={12} w="70%" />
          </div>
          <S w={80} h={34} r={999} />
        </div>
      ))}
    </div>
  );
}

// ── 3. ModulesPage — module rows ──────────────────────────────────────────
export function SkeletonModuleList({ count = 4 }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 60px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 14,
          background: "white", borderRadius: 16,
          border: "1px solid #E8D5B0", padding: "14px 16px",
          marginBottom: 10,
        }}>
          <S w={64} h={64} r={10} />
          <div style={{ flex: 1 }}>
            <S h={12} w="35%" mb={8} />
            <S h={20} w="65%" mb={8} />
            <S h={6}  w="100%" r={999} />
          </div>
          <S w={84} h={36} r={999} />
        </div>
      ))}
    </div>
  );
}

// ── 4. LessonsPage — lesson rows ──────────────────────────────────────────
export function SkeletonLessonList({ count = 5 }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 60px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 14,
          background: "white", borderRadius: 14,
          border: "1px solid #E8D5B0", padding: "14px 16px",
          marginBottom: 8,
        }}>
          <S w={36} h={36} r={999} />
          <div style={{ flex: 1 }}>
            <S h={18} w="55%" mb={6} />
            <S h={12} w="35%" />
          </div>
          <S w={80} h={32} r={999} />
        </div>
      ))}
    </div>
  );
}

// ── 5. LikesPage — card grid ──────────────────────────────────────────────
export function SkeletonLikeGrid({ count = 6 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: 20, padding: "24px 1.5rem 80px", maxWidth: 900, margin: "0 auto",
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: "white", borderRadius: 16,
          border: "1px solid #E8D5B0", overflow: "hidden",
          boxShadow: "0 2px 12px rgba(255,142,0,0.07)",
        }}>
          <S h={140} r={0} />
          <div style={{ padding: "14px 16px 16px" }}>
            <S h={16} w="90%" mb={8} />
            <S h={14} w="70%" mb={10} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <S h={12} w="28%" />
              <S h={12} w="22%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 6. BookmarksPage — list cards ─────────────────────────────────────────
export function SkeletonBookmarkList({ count = 4 }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 1.5rem 80px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          display: "flex", background: "white", borderRadius: 16,
          border: "1px solid #E8D5B0", marginBottom: 12, overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <S w={5} h={88} r={0} />
          <div style={{ flex: 1, padding: "14px 16px" }}>
            <S h={18} w="60%" mb={8} />
            <S h={13} w="80%" mb={8} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <S h={11} w="40%" />
              <S h={11} w="20%" />
            </div>
          </div>
          <div style={{ padding: "14px 12px", display: "flex", alignItems: "center" }}>
            <S w={28} h={28} r={999} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 7. DiscoverPage — result rows ─────────────────────────────────────────
export function SkeletonDiscoverResults({ count = 5 }) {
  return (
    <div>
      {/* Group label */}
      <S h={12} w={100} mb={12} />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "white", borderRadius: 12,
          border: "1px solid #E8D5B0", padding: "13px 16px",
          marginBottom: 8,
        }}>
          <S h={16} w="55%" />
          <S w={14} h={14} r={4} />
        </div>
      ))}
    </div>
  );
}

// ── 8. DashboardPage — badges row ─────────────────────────────────────────
export function SkeletonBadges({ count = 3 }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "8px 0" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 72 }}>
          <S w={56} h={56} r={999} />
          <S h={12} w={56} />
          <S h={10} w={48} />
        </div>
      ))}
    </div>
  );
}
