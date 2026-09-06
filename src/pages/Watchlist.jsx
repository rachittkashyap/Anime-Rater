import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Rating from '../components/Rating';
import { getWatchlist, removeFromWatchlist } from '../utils/storage';
import { safe, safeEpisodes, slugify } from '../utils/formatters';

export default function Watchlist() {
  const [list, setList] = useState([]);

  useEffect(() => {
    setList(getWatchlist());
    const update = () => setList(getWatchlist());
    window.addEventListener('animehai:watchlist-changed', update);
    return () => window.removeEventListener('animehai:watchlist-changed', update);
  }, []);

  function handleRemove(id) {
    setList(removeFromWatchlist(id));
  }

  return (
    <div className="page">
      <Helmet>
        <title>My Watchlist — AnimeHai</title>
        <meta name="description" content="Your personal anime watchlist, saved locally in your browser." />
      </Helmet>
      <h1 className="page__title">My Watchlist</h1>

      {list.length === 0 ? (
        <div className="state-message state-message--centered">
          <p>Your watchlist is empty.</p>
          <Link to="/trending" className="btn btn--primary">
            Discover Anime
          </Link>
        </div>
      ) : (
        <div className="watchlist-grid">
          {list.map((anime) => (
            <div className="watchlist-card" key={anime.id}>
              <Link to={`/anime/${anime.id}-${slugify(anime.title)}`} className="watchlist-card__link">
                <img src={anime.image} alt={anime.title} loading="lazy" />
                <div>
                  <h3>{safe(anime.title)}</h3>
                  <Rating score={anime.rating} size="sm" />
                  <p>{safeEpisodes(anime.episodes)}</p>
                  <p className="watchlist-card__status">{safe(anime.status)}</p>
                </div>
              </Link>
              <div className="watchlist-card__actions">
                <Link to={`/anime/${anime.id}-${slugify(anime.title)}`} className="btn btn--ghost">
                  View Details
                </Link>
                <button className="btn btn--danger" onClick={() => handleRemove(anime.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
