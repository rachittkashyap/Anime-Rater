import { formatNumber } from '../../utils/adminFormat';

// A ranked list with proportional bars, e.g. "Traffic sources" or "Top pages".
// items: [{ key, label, value, sub? }]   total: what 100% means (defaults to the sum of values)
export default function BreakdownList({ title, subtitle, items, total, valueLabel, emptyText = 'No data yet' }) {
  const base = total ?? items.reduce((sum, it) => sum + it.value, 0);

  return (
    <section className="admin-card">
      <header className="admin-card__head">
        <h3>{title}</h3>
        {valueLabel && <span className="admin-card__meta">{valueLabel}</span>}
      </header>
      {subtitle && <p className="admin-card__sub">{subtitle}</p>}

      {items.length === 0 ? (
        <p className="admin-empty">{emptyText}</p>
      ) : (
        <ul className="admin-bd">
          {items.map((it) => {
            const pct = base ? Math.round((it.value / base) * 100) : 0;
            return (
              <li key={it.key ?? it.label} className="admin-bd__item">
                <div className="admin-bd__row">
                  <span className="admin-bd__label" title={it.label}>
                    {it.label}
                    {it.sub && <small>{it.sub}</small>}
                  </span>
                  <span className="admin-bd__value">
                    {formatNumber(it.value)}
                    <em>{pct}%</em>
                  </span>
                </div>
                <div className="admin-bd__bar">
                  <span style={{ width: `${Math.max(pct, it.value > 0 ? 2 : 0)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
