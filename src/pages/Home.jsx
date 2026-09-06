import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import AnimeGrid from '../components/AnimeGrid';
import AdSlot from '../components/AdSlot';
import {
  getTrendingAnime,
  getAiringAnime,
  getCurrentSeasonAnime,
} from '../api/animeService';
import { getCurrentSeason, capitalize } from '../utils/formatters';

function useAnimeSection(fetcher) {
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let active = true;
    setState({ items: [], loading: true, error: false });
    fetcher()
      .then((items) => {
        if (active) setState({ items, loading: false, error: false });
      })
      .catch(() => {
        if (active) setState({ items: [], loading: false, error: true });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

export default function Home() {
  const trending = useAnimeSection(() => getTrendingAnime(1));
  const airing = useAnimeSection(() => getAiringAnime(1));
  const latest = useAnimeSection(() => getCurrentSeasonAnime(1));
  const { year, season } = getCurrentSeason();

  return (
    <>
      <Helmet>
        <title>AnimeHai — Discover Your Next Anime</title>
        <meta
          name="description"
          content="Track new releases, explore trending anime and never miss your next episode. Automatically updated anime discovery platform."
        />
      </Helmet>

      <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <h1>Discover Your Next Anime</h1>
        <p>Track new releases, explore trending anime and never miss your next episode.</p>
        <SearchBar large />
      </section>

      <AdSlot size="banner" />

      <section className="section">
        <div className="section__header">
          <h2>Trending Anime</h2>
          <Link to="/trending" className="section__link">
            View all →
          </Link>
        </div>
        <AnimeGrid items={trending.items} loading={trending.loading} error={trending.error} />
      </section>

      <AdSlot size="rectangle" />

      <section className="section">
        <div className="section__header">
          <h2>Currently Airing</h2>
          <Link to="/schedule" className="section__link">
            View schedule →
          </Link>
        </div>
        <AnimeGrid items={airing.items} loading={airing.loading} error={airing.error} />
      </section>

      <section className="section">
        <div className="section__header">
          <h2>
            Latest Anime — {capitalize(season)} {year}
          </h2>
          <Link to="/season" className="section__link">
            View all →
          </Link>
        </div>
        <AnimeGrid items={latest.items} loading={latest.loading} error={latest.error} />
      </section>

      <AdSlot size="banner" />
    </>
  );
}
