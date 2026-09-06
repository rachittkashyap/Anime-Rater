import { safeRating } from '../utils/formatters';

export default function Rating({ score, size = 'md' }) {
  const value = safeRating(score);
  return (
    <span className={`rating rating--${size}`}>
      <span className="rating__star" aria-hidden="true">★</span>
      {value}
    </span>
  );
}
