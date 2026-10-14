import React, { useState } from 'react';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
import { FiLock, FiShield, FiUserPlus } from 'react-icons/fi';
=======
import { useNavigate, Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
>>>>>>> 03fb960 (rebuild)
import { useAuth } from '../context/AuthContext';
import styles from './AdminLogin.module.css';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, setupFirstAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();
<<<<<<< HEAD

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
=======
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
>>>>>>> 03fb960 (rebuild)

  React.useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true });
  }, [isAdmin, navigate]);

<<<<<<< HEAD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isRegistering) {
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setErrorMsg('Password must contain at least one letter and one number');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        setLoading(false);
        return;
      }

      try {
        const res = await setupFirstAdmin(email, password);
        if (res.success) {
          navigate('/admin');
        } else {
          setErrorMsg(res.message);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Registration failed');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await loginAdmin(email, password);
        navigate('/admin');
      } catch (err: any) {
        setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
      } finally {
        setLoading(false);
      }
=======
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
>>>>>>> 03fb960 (rebuild)
    }
  };

  return (
    <div className={styles.page}>
<<<<<<< HEAD
      <div className={styles.card}>
        <div style={{ textAlign: 'center', color: 'var(--gold-primary)', fontSize: '2rem' }}>
          {isRegistering ? <FiUserPlus /> : <FiShield />}
        </div>

        <h1 className={styles.title}>{isRegistering ? 'Admin Setup' : 'Admin Login'}</h1>
        <p className={styles.subtitle}>
          {isRegistering
            ? 'Initialize master admin account (one-time bootstrap setup)'
            : 'Protected portal for inventory, orders, and store settings'}
        </p>

        {errorMsg && <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>{errorMsg}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Admin Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={isRegistering ? 'Create Password (min. 8 chars, letters & numbers)' : 'Admin Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isRegistering && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {isRegistering ? <FiUserPlus /> : <FiLock />}
            {loading
              ? isRegistering
                ? 'Creating Master Admin...'
                : 'Authenticating...'
              : isRegistering
              ? 'Create Master Admin Account'
              : 'Login to Admin Dashboard'}
=======
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
>>>>>>> 03fb960 (rebuild)
          </button>
          <p className={styles.back}><Link to="/">← Back to store</Link></p>
        </form>

        <button
          type="button"
          className={styles.toggleLink}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => {
            setIsRegistering(!isRegistering);
            setErrorMsg('');
          }}
        >
          {isRegistering
            ? 'Already set up? Back to Admin Login'
            : 'First-time setup? Register master admin account'}
        </button>
      </div>
    </div>
  );
};
