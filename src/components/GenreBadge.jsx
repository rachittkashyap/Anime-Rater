import { Link } from 'react-router-dom';
import { slugify } from '../utils/formatters';

export default function GenreBadge({ genre, linkable = true }) {
  if (!linkable) return <span className="badge">{genre}</span>;
  return (
    <Link to={`/genre/${slugify(genre)}`} className="badge badge--link">
      {genre}
    </Link>
  );
}
