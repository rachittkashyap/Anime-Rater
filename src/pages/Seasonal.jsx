import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AnimeGrid from '../components/AnimeGrid';
import AdSlot from '../components/AdSlot';
import { getAnimeBySeason } from '../api/animeService';
import { getCurrentSeason, capitalize } from '../utils/formatters';

const SEASONS = ['winter', 'spring', 'summer', 'fall'];

export default function Seasonal() {
  const current = getCurrentSeason();
  const [year, setYear] = useState(current.year);
  const [season, setSeason] = useState(current.season);
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let active = true;
    setState({ items: [], loading: true, error: false });
    getAnimeBySeason(year, season, 1)
      .then((items) => active && setState({ items, loading: false, error: false }))
      .catch(() => active && setState({ items: [], loading: false, error: true }));
    return () => {
      active = false;
    };
  }, [year, season]);

  return (
    <div className="page">
      <Helmet>
        <title>
          {capitalize(season)} {year} Anime Season — AnimeHai
        </title>
        <meta
          name="description"
          content={`Browse anime airing in ${capitalize(season)} ${year}, automatically detected and updated.`}
        />
      </Helmet>
      <h1 className="page__title">
        Anime Season — {capitalize(season)} {year}
      </h1>

      <div className="season-controls">
        <div className="tabs">
          {SEASONS.map((s) => (
            <button
              key={s}
              className={`tabs__item ${season === s ? 'tabs__item--active' : ''}`}
              onClick={() => setSeason(s)}
            >
              {capitalize(s)}
            </button>
          ))}
        </div>
        <div className="season-controls__year">
          <button onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
            ‹
          </button>
          <span>{year}</span>
          <button onClick={() => setYear((y) => y + 1)} aria-label="Next year">
            ›
          </button>
        </div>
      </div>

      <AnimeGrid items={state.items} loading={state.loading} error={state.error} />
      <AdSlot size="banner" />
    </div>
  );
}
