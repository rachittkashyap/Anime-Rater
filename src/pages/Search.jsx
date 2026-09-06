import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import AnimeGrid from '../components/AnimeGrid';
import AdSlot from '../components/AdSlot';
import { searchAnime, GENRES } from '../api/animeService';

const TYPES = ['TV', 'Movie', 'OVA', 'ONA', 'Special'];
const STATUSES = [
  { value: 'airing', label: 'Airing' },
  { value: 'complete', label: 'Completed' },
  { value: 'upcoming', label: 'Upcoming' },
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({ genre: '', year: '', type: '', status: '' });
  const [state, setState] = useState({ items: [], loading: false, error: false });

  useEffect(() => {
    if (!query.trim()) {
      setState({ items: [], loading: false, error: false });
      return;
    }
    setSearchParams({ q: query });
    setState((s) => ({ ...s, loading: true, error: false }));
    let active = true;
    searchAnime(query, 1, filters)
      .then((items) => active && setState({ items, loading: false, error: false }))
      .catch(() => active && setState({ items: [], loading: false, error: true }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters]);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="page">
      <Helmet>
        <title>{query ? `"${query}" — Search Results` : 'Search Anime'} — AnimeHai</title>
        <meta name="description" content="Search thousands of anime by title, genre, year, type and status." />
      </Helmet>
      <h1 className="page__title">Search Anime</h1>
      <SearchBar large onDebouncedChange={setQuery} initialValue={initialQuery} />

      <div className="filters-bar">
        <select value={filters.genre} onChange={(e) => updateFilter('genre', e.target.value)}>
          <option value="">All Genres</option>
          {GENRES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map((t) => (
            <option key={t} value={t.toLowerCase()}>
              {t}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          <option value="">Any Status</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Year"
          value={filters.year}
          onChange={(e) => updateFilter('year', e.target.value)}
        />
      </div>

      {query.trim() ? (
        <AnimeGrid
          items={state.items}
          loading={state.loading}
          error={state.error}
          emptyMessage={`No results for "${query}".`}
        />
      ) : (
        <div className="state-message">Start typing to search thousands of anime.</div>
      )}
      <AdSlot size="banner" />
    </div>
  );
}
