interface AdminLoadingProps {
  compact?: boolean;
  label?: string;
}

export default function AdminLoading({
  compact = false,
  label = "読み込み中...",
}: AdminLoadingProps) {
  return (
    <div
      className={`admin-loading ${compact ? "admin-loading--compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="admin-loading__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
