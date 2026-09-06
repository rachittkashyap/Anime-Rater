import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AnimeGrid from '../components/AnimeGrid';
import AdSlot from '../components/AdSlot';
import { getTrendingAnime, getPopularAnime, getTopRatedAnime, getCurrentSeasonAnime } from '../api/animeService';

const TABS = [
  { key: 'trending', label: 'Trending Today', fetcher: getTrendingAnime },
  { key: 'season', label: 'Popular This Season', fetcher: getCurrentSeasonAnime },
  { key: 'popular', label: 'Most Popular', fetcher: getPopularAnime },
  { key: 'top', label: 'Top Rated', fetcher: getTopRatedAnime },
];

export default function Trending() {
  const [activeTab, setActiveTab] = useState('trending');
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let active = true;
    const tab = TABS.find((t) => t.key === activeTab);
    setState({ items: [], loading: true, error: false });
    tab
      .fetcher(1)
      .then((items) => active && setState({ items, loading: false, error: false }))
      .catch(() => active && setState({ items: [], loading: false, error: true }));
    return () => {
      active = false;
    };
  }, [activeTab]);

  return (
    <div className="page">
      <Helmet>
        <title>Trending Anime — AnimeHai</title>
        <meta name="description" content="Explore trending, popular and top-rated anime, automatically updated." />
      </Helmet>
      <h1 className="page__title">Trending</h1>
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tabs__item ${activeTab === tab.key ? 'tabs__item--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <AnimeGrid items={state.items} loading={state.loading} error={state.error} />
      <AdSlot size="banner" />
    </div>
  );
}
