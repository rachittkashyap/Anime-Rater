import { bucketLabel, bucketTooltip, formatNumber } from '../../utils/adminFormat';

// Dependency-free SVG chart: bars = page views, line = unique visitors.

const W = 800;
const H = 280;
const PAD = { left: 46, right: 12, top: 14, bottom: 32 };

// Round the largest value up so all 4 gridlines land on whole numbers (1, 2, 5 × 10^k steps).
function niceStep(rawStep) {
  if (rawStep <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(rawStep));
  const n = rawStep / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export default function TrafficChart({ series, range }) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxValue = Math.max(0, ...series.map((s) => Math.max(s.pageviews, s.visitors)));
  const step = niceStep(maxValue / 4);
  const yMax = step * 4;

  const band = innerW / Math.max(series.length, 1);
  const barW = Math.max(2, band * 0.64);
  const x = (i) => PAD.left + i * band + band / 2;
  const y = (v) => PAD.top + innerH - (v / yMax) * innerH;

  const labelEvery = Math.max(1, Math.ceil(series.length / 8));
  const line = series.map((s, i) => `${x(i).toFixed(1)},${y(s.visitors).toFixed(1)}`).join(' ');
  const hasData = maxValue > 0;

  return (
    <div className="admin-chart">
      <div className="admin-chart__legend">
        <span><i className="admin-chart__swatch admin-chart__swatch--bar" /> Page views</span>
        <span><i className="admin-chart__swatch admin-chart__swatch--line" /> Visitors</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Page views and visitors over time" className="admin-chart__svg">
        <defs>
          <linearGradient id="adminBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#4f9dff" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line className="admin-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(k * step)} y2={y(k * step)} />
            <text className="admin-chart__tick" x={PAD.left - 8} y={y(k * step) + 4} textAnchor="end">
              {formatNumber(k * step)}
            </text>
          </g>
        ))}

        {series.map((s, i) => (
          <g key={s.t} className="admin-chart__col">
            <rect className="admin-chart__hit" x={PAD.left + i * band} y={PAD.top} width={band} height={innerH} />
            {s.pageviews > 0 && (
              <rect
                className="admin-chart__bar"
                x={x(i) - barW / 2}
                y={y(s.pageviews)}
                width={barW}
                height={PAD.top + innerH - y(s.pageviews)}
                rx={Math.min(3, barW / 2)}
                fill="url(#adminBarGradient)"
              />
            )}
            <title>{`${bucketTooltip(s.t, range)}\n${formatNumber(s.pageviews)} page views · ${formatNumber(s.visitors)} visitors`}</title>
            {i % labelEvery === 0 && (
              <text className="admin-chart__tick" x={x(i)} y={H - 10} textAnchor="middle">
                {bucketLabel(s.t, range)}
              </text>
            )}
          </g>
        ))}

        {hasData && series.length > 1 && <polyline className="admin-chart__line" points={line} />}
        {hasData && series.length <= 31 &&
          series.map((s, i) => s.visitors > 0 && <circle key={s.t} className="admin-chart__dot" cx={x(i)} cy={y(s.visitors)} r="3" />)}
      </svg>

      {!hasData && <p className="admin-empty admin-chart__empty">No visits in this period yet.</p>}
    </div>
  );
}
