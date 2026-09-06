import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ large = false, onDebouncedChange, initialValue = '' }) {
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!onDebouncedChange) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onDebouncedChange(value);
    }, 400); // 300-500ms debounce, as required — never fire on every keystroke.
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form className={`search-bar ${large ? 'search-bar--large' : ''}`} onSubmit={handleSubmit} role="search">
      <input
        type="search"
        placeholder="Search anime..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search anime"
      />
      <button type="submit">Search</button>
    </form>
  );
}
