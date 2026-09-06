import AnimeCard from './AnimeCard';
import LoadingSkeleton from './LoadingSkeleton';

export default function AnimeGrid({
  items,
  loading,
  error,
  emptyMessage = 'No anime found.',
  compact = false,
}) {
  if (loading) return <LoadingSkeleton count={10} />;

  if (error) {
    return (
      <div className="state-message state-message--error">
        Anime data is temporarily unavailable. Please try again.
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <div className="state-message">{emptyMessage}</div>;
  }

  return (
    <div className="anime-grid">
      {items.map((anime) => (
        <AnimeCard anime={anime} key={`${anime.source}-${anime.id}`} compact={compact} />
      ))}
    </div>
  );
}
