export function CardSkeleton() {
  return (
    <div className="anime-card anime-card--skeleton">
      <div className="skeleton skeleton--poster" />
      <div className="skeleton skeleton--line" style={{ width: '85%' }} />
      <div className="skeleton skeleton--line" style={{ width: '50%' }} />
    </div>
  );
}

export default function LoadingSkeleton({ count = 10 }) {
  return (
    <div className="anime-grid">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
