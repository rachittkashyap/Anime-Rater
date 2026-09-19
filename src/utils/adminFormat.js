export const formatNumber = (n) => (Number(n) || 0).toLocaleString();

export function formatDuration(totalSec) {
  const sec = Math.max(0, Math.round(totalSec || 0));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// Chart axis label (short) and tooltip label (long) for a bucket that starts at time `t`.
export function bucketLabel(t, range) {
  const d = new Date(t);
  if (range === '1h') return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (range === '24h') return d.toLocaleTimeString([], { hour: 'numeric' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function bucketTooltip(t, range) {
  const d = new Date(t);
  if (range === '1h') return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (range === '24h') return d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric' });
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}
