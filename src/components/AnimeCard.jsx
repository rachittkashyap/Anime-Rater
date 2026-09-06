import { Link } from 'react-router-dom';
import Rating from './Rating';
import { safe, safeEpisodes, safeYear, safeGenres, slugify } from '../utils/formatters';

export default function AnimeCard({ anime, compact = false }) {
  if (!anime) return null;
  const genres = safeGenres(anime.genres).slice(0, 2);
  const detailPath = `/anime/${anime.id}-${slugify(anime.title)}`;

  return (
    <Link to={detailPath} className={`anime-card ${compact ? 'anime-card--compact' : ''}`}>
      <div className="anime-card__poster">
        {anime.image ? (
          <img src={anime.image} alt={anime.title} loading="lazy" decoding="async" />
        ) : (
          <div className="anime-card__poster-fallback">No Image</div>
        )}
        <span className="anime-card__rating-chip">
          <Rating score={anime.rating} size="sm" />
        </span>
        {anime.status && <span className="anime-card__status-chip">{safe(anime.status)}</span>}
      </div>
      <div className="anime-card__body">
        <h3 className="anime-card__title" title={anime.title}>
          {safe(anime.title)}
        </h3>
        <p className="anime-card__meta">
          {safe(anime.type)} • {safeYear(anime.year)}
        </p>
        <p className="anime-card__meta">{safeEpisodes(anime.episodes)}</p>
        {!compact && (
          <div className="anime-card__genres">
            {genres.map((g) => (
              <span className="badge" key={g}>
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
