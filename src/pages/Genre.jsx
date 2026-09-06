import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import AnimeGrid from '../components/AnimeGrid';
import AdSlot from '../components/AdSlot';
import { getAnimeByGenre, GENRES } from '../api/animeService';
import { slugify, capitalize } from '../utils/formatters';

export default function Genre() {
  const { slug } = useParams();
  const genre = GENRES.find((g) => slugify(g.name) === slug) || { id: null, name: slug };
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let active = true;
    setState({ items: [], loading: true, error: false });
    getAnimeByGenre(genre, 1)
      .then((items) => active && setState({ items, loading: false, error: false }))
      .catch(() => active && setState({ items: [], loading: false, error: true }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="page">
      <Helmet>
        <title>{capitalize(genre.name)} Anime — AnimeHai</title>
        <meta name="description" content={`Browse the best ${genre.name} anime, automatically fetched and updated.`} />
      </Helmet>
      <Link to="/genres" className="section__link">
        ← All genres
      </Link>
      <h1 className="page__title">{capitalize(genre.name)} Anime</h1>
      <AnimeGrid items={state.items} loading={state.loading} error={state.error} />
      <AdSlot size="banner" />
    </div>
  );
}
