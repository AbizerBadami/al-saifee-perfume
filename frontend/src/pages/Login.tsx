import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLogin.module.css';

export const Login: React.FC<{ redirectTo?: string }> = ({ redirectTo }) => {
  const { loginCustomer, isCustomer, customerLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = redirectTo || params.get('redirect') || '/shop';
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
    setBusy(true);
    try {
      await loginCustomer(email.trim(), password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <form className={styles.card} onSubmit={submit} aria-labelledby="login-h">
          <p className="eyebrow">Welcome back</p>
          <h1 id="login-h" className={styles.h1}>Sign in</h1>
          <p className={styles.sub}>Sign in to save fragrances, check out and write verified reviews.</p>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <div>
            <label htmlFor="login-email">Email *</label>
            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label htmlFor="login-pass">Password *</label>
            <input id="login-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className={styles.back}>New here? <Link to={`/register${redirect !== '/shop' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>Create an account</Link></p>
        </form>
      </div>
    </div>
  );
};
