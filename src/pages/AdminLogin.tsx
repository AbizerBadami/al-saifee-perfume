import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLogin.module.css';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@oudelixir.com');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAdmin) {
    navigate('/admin');
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await loginAdmin(email, password);
      navigate('/admin');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div style={{ textAlign: 'center', color: 'var(--gold-primary)', fontSize: '2rem' }}>
          <FiShield />
        </div>

        <h1 className={styles.title}>Atelier Admin Login</h1>
        <p className={styles.subtitle}>
          Protected portal for inventory, orders, and store settings
        </p>

        <div className={styles.demoBanner}>
          <strong>Preview Demo Quick Credentials:</strong>
          <div>Email: <code>admin@oudelixir.com</code></div>
          <div>Password: <code>admin123</code></div>
        </div>

        {errorMsg && <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>{errorMsg}</div>}

        <form className={styles.form} onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Admin Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <FiLock />
            {loading ? 'Authenticating...' : 'Login to Admin Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
