import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { GENRES } from '../api/animeService';
import { slugify } from '../utils/formatters';

export default function Genres() {
  return (
    <div className="page">
      <Helmet>
        <title>Anime Genres — AnimeHai</title>
        <meta name="description" content="Browse anime by genre — Action, Romance, Fantasy, Sci-Fi and more." />
      </Helmet>
      <h1 className="page__title">Genres</h1>
      <div className="genre-grid">
        {GENRES.map((genre) => (
          <Link to={`/genre/${slugify(genre.name)}`} key={genre.id} className="genre-tile">
            {genre.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
