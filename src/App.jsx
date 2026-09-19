import { Routes, Route } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import AnalyticsTracker from './components/AnalyticsTracker';
import Home from './pages/Home';
import Trending from './pages/Trending';
import Seasonal from './pages/Seasonal';
import Upcoming from './pages/Upcoming';
import Schedule from './pages/Schedule';
import Genres from './pages/Genres';
import Genre from './pages/Genre';
import Search from './pages/Search';
import AnimeDetails from './pages/AnimeDetails';
import Watchlist from './pages/Watchlist';
import Admin from './pages/Admin';

function NotFound() {
  return (
    <div className="page">
      <div className="state-message state-message--centered">
        <h1>404</h1>
        <p>This page doesn't exist.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <AnalyticsTracker />
      <Routes>
        {/* Admin dashboard: separate page, no public navbar/footer */}
        <Route path="/admin" element={<Admin />} />

        {/* Public site */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/season" element={<Seasonal />} />
          <Route path="/upcoming" element={<Upcoming />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/genres" element={<Genres />} />
          <Route path="/genre/:slug" element={<Genre />} />
          <Route path="/search" element={<Search />} />
          <Route path="/anime/:idSlug" element={<AnimeDetails />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
