// src/components/ErrorState.jsx  (Roadmap 2.8 / manual B3)
// Shared error + empty states so a failed fetch never masquerades as "no
// content". Use <ErrorState> when a fetch returned an error (check
// `rows.error` from the REST helper, or the `error` half of supabaseClient
// results); use <EmptyState> only for a genuinely empty successful result.
// Skeletons.jsx remains the loading state.

export function ErrorState({
  title = "Couldn't load this",
  detail,
  onRetry,
  compact = false,
}) {
  return (
    <div
      role="alert"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        padding: compact ? "20px 16px" : "48px 24px", textAlign: "center",
      }}
    >
      <i className="ti ti-cloud-off" style={{ fontSize: compact ? "1.5rem" : "2.2rem", color: "var(--color-danger)" }} />
      <div style={{ fontWeight: 700, color: "var(--color-text-body)" }}>{title}</div>
      <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", maxWidth: 420 }}>
        {detail || "Something went wrong while fetching your content. Check your connection and try again."}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 6, padding: "8px 20px", borderRadius: "999px",
            border: "1px solid var(--color-primary)", background: "white",
            color: "var(--color-primary)", fontWeight: 600, cursor: "pointer",
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "ti ti-inbox", title = "Nothing here yet", detail, action, compact = false }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        padding: compact ? "20px 16px" : "48px 24px", textAlign: "center",
      }}
    >
      <i className={icon} style={{ fontSize: compact ? "1.5rem" : "2.2rem", color: "var(--color-text-muted)" }} />
      <div style={{ fontWeight: 700, color: "var(--color-text-body)" }}>{title}</div>
      {detail && (
        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", maxWidth: 420 }}>{detail}</div>
      )}
      {action}
    </div>
  );
}

export default ErrorState;
