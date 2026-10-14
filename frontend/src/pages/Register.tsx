import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLogin.module.css';

export const Register: React.FC = () => {
  const { registerCustomer, isCustomer, customerLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/shop';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (!customerLoading && isCustomer) navigate(redirect, { replace: true });
  }, [isCustomer, customerLoading, navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      await registerCustomer(name.trim(), email.trim(), password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <form className={styles.card} onSubmit={submit} aria-labelledby="reg-h">
          <p className="eyebrow">Join Al-Saifee</p>
          <h1 id="reg-h" className={styles.h1}>Create account</h1>
          <p className={styles.sub}>One account for wishlist, checkout, order history and verified reviews.</p>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <div>
            <label htmlFor="reg-name">Full name *</label>
            <input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="reg-email">Email *</label>
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} autoComplete="email" />
          </div>
          <div>
            <label htmlFor="reg-pass">Password (min 8 characters) *</label>
            <input id="reg-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
          <p className={styles.back}>Have an account? <Link to={`/login${redirect !== '/shop' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>Sign in</Link></p>
        </form>
      </div>
    </div>
  );
};
