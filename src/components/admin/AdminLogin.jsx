import { useState } from 'react';
import { adminLogin, saveToken } from '../../api/adminApi';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await adminLogin(password);
      saveToken(session);
      onLogin(session.token);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={handleSubmit}>
        <div className="navbar__logo">
          Anime<span>Hai</span> <small className="admin-login__tag">Admin</small>
        </div>
        <p className="admin-login__text">Enter the admin password to view website analytics.</p>
        <input
          type="password"
          className="admin-input"
          placeholder="Password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="admin-login__error" role="alert">{error}</p>}
        <button className={`btn btn--primary ${busy ? 'btn--loading' : ''}`} type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
