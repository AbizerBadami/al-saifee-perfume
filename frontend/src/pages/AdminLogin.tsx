import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiShield, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLogin.module.css';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, setupFirstAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

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
    }
  };

  return (
    <div className={styles.page}>
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
          </button>
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
