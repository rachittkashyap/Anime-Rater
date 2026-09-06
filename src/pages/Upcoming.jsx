import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AnimeGrid from '../components/AnimeGrid';
import AdSlot from '../components/AdSlot';
import { getUpcomingAnime } from '../api/animeService';

const TYPES = ['All', 'TV', 'Movie', 'OVA', 'ONA', 'Special'];

export default function Upcoming() {
  const [state, setState] = useState({ items: [], loading: true, error: false });
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    let active = true;
    getUpcomingAnime(1)
      .then((items) => active && setState({ items, loading: false, error: false }))
      .catch(() => active && setState({ items: [], loading: false, error: true }));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (typeFilter === 'All') return state.items;
    return state.items.filter((a) => (a.type || '').toLowerCase() === typeFilter.toLowerCase());
  }, [state.items, typeFilter]);

  return (
    <div className="page">
      <Helmet>
        <title>Upcoming Anime — AnimeHai</title>
        <meta name="description" content="Discover upcoming anime releases, automatically fetched and updated." />
      </Helmet>
      <h1 className="page__title">Upcoming Anime</h1>
      <div className="tabs">
        {TYPES.map((t) => (
          <button
            key={t}
            className={`tabs__item ${typeFilter === t ? 'tabs__item--active' : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <AnimeGrid
        items={filtered}
        loading={state.loading}
        error={state.error}
        emptyMessage="No upcoming anime match this filter yet."
      />
      <AdSlot size="banner" />
    </div>
  );
}
