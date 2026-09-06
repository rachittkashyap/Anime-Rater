// A single reusable loading indicator so every part of the site feels
// consistent. Use the skeleton grid (LoadingSkeleton) for card grids, and
// this spinner for everything else — full page loads, detail pages,
// inline sections, buttons.

export default function Spinner({ label, size = 'md', fullHeight = false }) {
  return (
    <div className={`spinner-wrap ${fullHeight ? 'spinner-wrap--full' : ''}`}>
      <span className={`spinner spinner--${size}`} role="status" aria-label={label || 'Loading'}>
        <span className="spinner__ring" />
      </span>
      {label && <p className="spinner__label">{label}</p>}
    </div>
  );
}
