import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLogin.module.css';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true });
  }, [isAdmin, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await loginAdmin(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <form className={styles.card} onSubmit={submit} aria-labelledby="admin-h">
          <p className="eyebrow">Staff only</p>
          <h1 id="admin-h" className={styles.h1}>Admin sign in</h1>
          <p className={styles.sub}>Manage products, orders, reviews and settings.</p>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <div>
            <label htmlFor="admin-email">Email *</label>
            <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </div>
          <div>
            <label htmlFor="admin-pass">Password *</label>
            <input id="admin-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
            <FiLock /> {busy ? 'Please wait…' : 'Sign in'}
          </button>
          <p className={styles.back}><Link to="/">← Back to store</Link></p>
        </form>
      </div>
    </div>
  );
};
