import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../config.js';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = mode === 'login' ? `${API}/auth/login` : `${API}/auth/register`;
      const body = mode === 'login' ? { email, password } : { email, password, role };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }
      localStorage.setItem('reloop_user', JSON.stringify({
        id: data.id,
        email: data.email,
        role: data.role,
        token: data.token,
      }));
      if (data.role === 'WORKER') navigate('/worker');
      else navigate('/');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Reloop Plus</h1>
        <p className="tagline">Resell · Repair · Recycle</p>
        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === 'register' && (
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="USER">User</option>
              <option value="WORKER">Worker (Repair / Recycle)</option>
            </select>
          )}
          {mode === 'login' && (
            <div className="role-select">
              <label>Login as</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="USER">User</option>
                <option value="WORKER">Worker</option>
              </select>
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Log in' : 'Register'}
          </button>
        </form>
        <button type="button" className="toggle-mode" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Create account' : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
