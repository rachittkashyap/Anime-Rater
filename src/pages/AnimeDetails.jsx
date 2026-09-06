import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import Rating from '../components/Rating';
import GenreBadge from '../components/GenreBadge';
import AnimeGrid from '../components/AnimeGrid';
import AdSlot from '../components/AdSlot';
import Spinner from '../components/Spinner';
import { getAnimeDetails, getAnimeEpisodes, getAnimeRecommendations } from '../api/animeService';
import { isInWatchlist, toggleWatchlist } from '../utils/storage';
import { safe, safeEpisodes, safeYear, safeGenres, truncate } from '../utils/formatters';

function extractId(param) {
  // Accepts "21-one-piece" or plain "21".
  const match = String(param).match(/^(\d+)/);
  return match ? match[1] : param;
}

export default function AnimeDetails() {
  const { idSlug } = useParams();
  const id = extractId(idSlug);

  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [recs, setRecs] = useState({ items: [], loading: true, error: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setAnime(null);

    getAnimeDetails(id)
      .then((data) => {
        if (!active) return;
        setAnime(data);
        setInWatchlist(isInWatchlist(data.id));
        setLoading(false);
      })
      .catch(() => active && (setError(true), setLoading(false)));

    getAnimeEpisodes(id).then((eps) => active && setEpisodes(eps));

    setRecs({ items: [], loading: true, error: false });
    getAnimeRecommendations(id)
      .then((items) => active && setRecs({ items, loading: false, error: false }))
      .catch(() => active && setRecs({ items: [], loading: false, error: true }));

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <Spinner label="Loading anime details…" size="lg" fullHeight />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="page">
        <div className="state-message state-message--error">
          Anime data is temporarily unavailable. Please try again.
        </div>
      </div>
    );
  }

  const genres = safeGenres(anime.genres);
  const seoTitle = `${safe(anime.title)} — Episodes, Rating, Genres & Anime Information | AnimeHai`;
  const seoDescription = truncate(
    anime.synopsis || `${safe(anime.title)} — ${safe(anime.type)}, ${safe(anime.episodes)} episodes, rated ${safe(anime.rating)}.`,
    160
  );

  const visibleEpisodes = showAllEpisodes ? episodes : episodes.slice(0, 12);

  return (
    <div className="page anime-details">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        {anime.image && <meta property="og:image" content={anime.image} />}
        <link rel="canonical" href={`https://animehai.in/anime/${id}`} />
      </Helmet>

      <div className="details-hero">
        <div className="details-hero__poster">
          {anime.image ? <img src={anime.image} alt={anime.title} /> : <div className="anime-card__poster-fallback">No Image</div>}
        </div>
        <div className="details-hero__info">
          <h1>{safe(anime.title)}</h1>
          {anime.titleJapanese && <p className="details-hero__jp">{anime.titleJapanese}</p>}

          <div className="details-hero__stats">
            <Rating score={anime.rating} size="lg" />
            <span>Rank #{safe(anime.rank)}</span>
            <span>Popularity #{safe(anime.popularity)}</span>
          </div>

          <div className="details-hero__genres">
            {genres.map((g) => (
              <GenreBadge genre={g} key={g} linkable={g !== 'N/A'} />
            ))}
          </div>

          <dl className="details-grid">
            <div><dt>Status</dt><dd>{safe(anime.status)}</dd></div>
            <div><dt>Type</dt><dd>{safe(anime.type)}</dd></div>
            <div><dt>Season</dt><dd>{safe(anime.season)}</dd></div>
            <div><dt>Year</dt><dd>{safeYear(anime.year)}</dd></div>
            <div><dt>Episodes</dt><dd>{safeEpisodes(anime.episodes)}</dd></div>
            <div><dt>Duration</dt><dd>{safe(anime.duration)}</dd></div>
            <div><dt>Source</dt><dd>{safe(anime.materialSource)}</dd></div>
            <div><dt>Studios</dt><dd>{anime.studios?.length ? anime.studios.join(', ') : 'N/A'}</dd></div>
          </dl>

          <button
            className={`btn ${inWatchlist ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => {
              toggleWatchlist(anime);
              setInWatchlist(!inWatchlist);
            }}
          >
            {inWatchlist ? '− Remove from Watchlist' : '+ Add to Watchlist'}
          </button>
        </div>
      </div>

      <AdSlot size="banner" />

      <section className="section">
        <h2>Synopsis</h2>
        <p className="details-synopsis">{safe(anime.synopsis, 'No synopsis available.')}</p>
      </section>

      {episodes.length > 0 && (
        <section className="section">
          <h2>Episodes</h2>
          <ul className="episode-list">
            {visibleEpisodes.map((ep) => (
              <li key={ep.number}>
                <span className="episode-list__num">Ep {ep.number}</span>
                <span className="episode-list__title">{safe(ep.title)}</span>
                <span className="episode-list__aired">{safe(ep.aired)}</span>
              </li>
            ))}
          </ul>
          {episodes.length > 12 && (
            <button className="btn btn--ghost" onClick={() => setShowAllEpisodes((v) => !v)}>
              {showAllEpisodes ? 'Show Less' : `Show All ${episodes.length} Episodes`}
            </button>
          )}
        </section>
      )}

      <AdSlot size="rectangle" />

      <section className="section">
        <h2>You May Also Like</h2>
        <AnimeGrid items={recs.items} loading={recs.loading} error={recs.error} emptyMessage="No recommendations available yet." compact />
      </section>

      <div className="details-back">
        <Link to="/" className="section__link">← Back to Home</Link>
      </div>
    </div>
  );
}
