export default function StatCard({ label, value, hint, live = false }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat__label">
        {live && <span className="admin-live-dot" aria-hidden="true" />}
        {label}
      </div>
      <div className="admin-stat__value">{value}</div>
      {hint && <div className="admin-stat__hint">{hint}</div>}
    </div>
  );
}
