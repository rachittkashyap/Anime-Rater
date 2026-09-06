import { Link } from 'react-router-dom';
import AdSlot from './AdSlot';

export default function Footer() {
  return (
    <footer className="footer">
      <AdSlot size="banner" />
      <div className="footer__grid">
        <div>
          <div className="navbar__logo">
            Anime<span>Hai</span>
          </div>
          <p className="footer__tagline">
            Discover, track and explore anime — automatically updated from free public anime APIs.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link to="/trending">Trending</Link>
          <Link to="/season">Seasonal</Link>
          <Link to="/upcoming">Upcoming</Link>
          <Link to="/schedule">Schedule</Link>
          <Link to="/genres">Genres</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/watchlist">My Watchlist</Link>
          <Link to="/search">Search Anime</Link>
        </div>
      </div>
      <div className="footer__legal">
        <p>
          AnimeHai provides anime discovery and information only. We do not host anime videos or copyrighted
          content.
        </p>
        <p>Anime data provided by the Jikan API (MyAnimeList) and the AniList API.</p>
        <p>© {new Date().getFullYear()} AnimeHai.in — All rights reserved.</p>
      </div>
    </footer>
  );
}
