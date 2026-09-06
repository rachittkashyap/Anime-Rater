import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import SearchBar from './SearchBar';
import { getWatchlist } from '../utils/storage';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/trending', label: 'Trending' },
  { to: '/season', label: 'Seasonal' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/genres', label: 'Genres' },
  { to: '/watchlist', label: 'Watchlist' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  useEffect(() => {
    const update = () => setWatchlistCount(getWatchlist().length);
    update();
    window.addEventListener('animehai:watchlist-changed', update);
    return () => window.removeEventListener('animehai:watchlist-changed', update);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar__row">
        <NavLink to="/" className="navbar__logo" onClick={() => setMenuOpen(false)}>
          Anime<span>Hai</span>
        </NavLink>

        <nav className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
              {link.to === '/watchlist' && watchlistCount > 0 && (
                <span className="navbar__badge">{watchlistCount}</span>
              )}
            </NavLink>
          ))}
          <div className="navbar__mobile-search">
            <SearchBar />
          </div>
        </nav>

        <div className="navbar__desktop-search">
          <SearchBar />
        </div>

        <button
          className="navbar__menu-btn"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
