import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Rating from '../components/Rating';
import AdSlot from '../components/AdSlot';
import Spinner from '../components/Spinner';
import { getSchedule } from '../api/animeService';
import { safe, slugify } from '../utils/formatters';

function dayLabelFor(dateStr) {
  if (!dateStr) return 'Unscheduled';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, tomorrow)) return 'Tomorrow';
  return 'This Week';
}

export default function Schedule() {
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let active = true;
    getSchedule()
      .then((items) => active && setState({ items, loading: false, error: false }))
      .catch(() => active && setState({ items: [], loading: false, error: true }));
    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const groups = { Today: [], Tomorrow: [], 'This Week': [] };
    state.items.forEach((entry) => {
      const label = dayLabelFor(entry.airingAt);
      if (groups[label]) groups[label].push(entry);
      else groups['This Week'].push(entry);
    });
    return groups;
  }, [state.items]);

  return (
    <div className="page">
      <Helmet>
        <title>Anime Schedule — AnimeHai</title>
        <meta name="description" content="See what's airing today, tomorrow and this week, updated automatically." />
      </Helmet>
      <h1 className="page__title">Anime Schedule</h1>

      {state.loading && <Spinner label="Loading schedule…" size="lg" fullHeight />}
      {state.error && (
        <div className="state-message state-message--error">
          Anime data is temporarily unavailable. Please try again.
        </div>
      )}

      {!state.loading &&
        !state.error &&
        Object.entries(grouped).map(([label, entries]) => (
          <section className="section" key={label}>
            <h2>{label}</h2>
            {entries.length === 0 ? (
              <div className="state-message">Nothing scheduled yet.</div>
            ) : (
              <div className="schedule-list">
                {entries.map((entry, idx) => (
                  <Link
                    to={`/anime/${entry.anime.id}-${slugify(entry.anime.title)}`}
                    className="schedule-item"
                    key={`${entry.anime.id}-${idx}`}
                  >
                    <img src={entry.anime.image} alt={entry.anime.title} loading="lazy" />
                    <div className="schedule-item__body">
                      <h3>{safe(entry.anime.title)}</h3>
                      <p>
                        {entry.episode ? `Episode ${entry.episode}` : 'Episode info N/A'} •{' '}
                        {safe(entry.dayOfWeek)}
                      </p>
                      <p className="schedule-item__status">{safe(entry.anime.status)}</p>
                    </div>
                    <Rating score={entry.anime.rating} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      <AdSlot size="banner" />
    </div>
  );
}
