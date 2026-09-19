import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AdminLogin from '../components/admin/AdminLogin';
import StatCard from '../components/admin/StatCard';
import TrafficChart from '../components/admin/TrafficChart';
import BreakdownList from '../components/admin/BreakdownList';
import Spinner from '../components/Spinner';
import { clearToken, fetchStats, loadSavedToken } from '../api/adminApi';
import { isTrackingOptedOut, setTrackingOptOut } from '../utils/analytics';
import { formatDuration, formatNumber } from '../utils/adminFormat';
import '../styles/admin.css';

const RANGES = [
  { id: '1h', label: 'Last hour' },
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];

const REFRESH_MS = 30_000;

function Dashboard({ token, onLogout }) {
  const [range, setRange] = useState('24h');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [optOut, setOptOut] = useState(isTrackingOptedOut());
  const requestId = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        const data = await fetchStats(range, token);
        if (id !== requestId.current) return; // a newer request superseded this one
        setStats(data);
        setError('');
        setUpdatedAt(new Date());
      } catch (err) {
        if (id !== requestId.current) return;
        if (err.status === 401) {
          onLogout();
          return;
        }
        setError(err.message);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [range, token, onLogout]
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  function toggleOptOut() {
    const next = !optOut;
    setTrackingOptOut(next);
    setOptOut(next);
  }

  const totals = stats?.totals;
  const sessionsTotal = totals?.sessions ?? 0;

  return (
    <div className="admin">
      <header className="admin-top">
        <div>
          <Link to="/" className="navbar__logo">
            Anime<span>Hai</span>
          </Link>
          <span className="admin-top__badge">Admin</span>
        </div>
        <div className="admin-top__actions">
          <button className="btn btn--ghost" onClick={toggleOptOut} title="Stops your own visits to the public site from being counted in this browser">
            {optOut ? '✓ My visits are not counted' : 'Don’t count my visits'}
          </button>
          <button className="btn btn--ghost" onClick={() => load()}>Refresh</button>
          <button className="btn btn--danger" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <div className="admin-titlebar">
        <h1 className="page__title">Website analytics</h1>
        {updatedAt && (
          <span className="admin-updated">
            Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · auto-refreshes every 30s
          </span>
        )}
      </div>

      <div className="tabs" role="tablist" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={range === r.id}
            className={`tabs__item ${range === r.id ? 'tabs__item--active' : ''}`}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <div className="state-message state-message--error">{error}</div>}

      {!stats && loading && <Spinner label="Loading analytics…" fullHeight />}

      {stats && (
        <div className={`admin-content ${loading ? 'admin-content--loading' : ''}`}>
          <div className="admin-kpis">
            <StatCard live label="Live now" value={formatNumber(stats.live)} hint="active in the last minute" />
            <StatCard label="Visitors" value={formatNumber(totals.visitors)} hint="unique people" />
            <StatCard label="Visits" value={formatNumber(totals.sessions)} hint="sessions" />
            <StatCard label="Page views" value={formatNumber(totals.pageviews)} hint={`${totals.pagesPerSession} pages / visit`} />
            <StatCard label="Avg. time on site" value={formatDuration(totals.avgSessionSec)} hint="per visit" />
            <StatCard label="Bounce rate" value={`${totals.bounceRate}%`} hint="left in under 10s, 1 page" />
          </div>

          <section className="admin-card admin-card--wide">
            <header className="admin-card__head">
              <h3>Traffic over time</h3>
            </header>
            <TrafficChart series={stats.series} range={stats.range} />
          </section>

          <div className="admin-grid">
            <BreakdownList
              title="Where visitors come from"
              subtitle="Traffic source of each visit"
              valueLabel="Visits"
              total={sessionsTotal}
              items={stats.sources.map((s) => ({ key: `${s.name}|${s.channel}`, label: s.name, sub: s.channel, value: s.sessions }))}
            />
            <BreakdownList
              title="Countries"
              subtitle="Detected from the visitor’s location / timezone"
              valueLabel="Visits"
              total={sessionsTotal}
              items={stats.countries.map((c) => ({ key: c.name, label: c.name, value: c.sessions }))}
            />
            <BreakdownList
              title="How long visitors stay"
              subtitle="Active time on site per visit"
              valueLabel="Visits"
              total={sessionsTotal}
              items={stats.durations.map((d) => ({ key: d.label, label: d.label, value: d.sessions }))}
            />
            <BreakdownList
              title="Top pages"
              valueLabel="Views"
              total={totals.pageviews}
              items={stats.topPages.map((p) => ({ key: p.path, label: p.path, value: p.views }))}
            />
            <BreakdownList
              title="Channels"
              valueLabel="Visits"
              total={sessionsTotal}
              items={stats.channels.map((c) => ({ key: c.name, label: c.name, value: c.sessions }))}
            />
            <BreakdownList
              title="Devices"
              valueLabel="Visits"
              total={sessionsTotal}
              items={stats.devices.map((d) => ({ key: d.name, label: d.name, value: d.sessions }))}
            />
            <BreakdownList
              title="Browsers"
              valueLabel="Visits"
              total={sessionsTotal}
              items={stats.browsers.map((b) => ({ key: b.name, label: b.name, value: b.sessions }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => loadSavedToken());

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  // index.html ships a global "index, follow" robots tag; flip that same tag while /admin is open
  // (adding a second one via Helmet would leave two conflicting robots tags in <head>).
  useEffect(() => {
    const meta = document.querySelector('meta[name="robots"]');
    const original = meta?.getAttribute('content');
    meta?.setAttribute('content', 'noindex, nofollow');
    return () => {
      if (meta && original != null) meta.setAttribute('content', original);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Admin · AnimeHai</title>
      </Helmet>
      {token ? <Dashboard token={token} onLogout={logout} /> : <AdminLogin onLogin={setToken} />}
    </>
  );
}
