import React, { useState } from 'react';

interface BackendMessage {
  message: string;
  timestamp: string;
  status: string;
}

interface Perfume {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}

export const HelloButton: React.FC = () => {
  const [message, setMessage] = useState<BackendMessage | null>(null);
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/message');
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      const data: BackendMessage = await response.json();
      setMessage(data);
    } catch (err) {
      console.error('Fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const fetchPerfumes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/perfumes');
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      const data = await response.json();
      setPerfumes(data.perfumes);
    } catch (err) {
      console.error('Fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '2rem auto',
      padding: '2rem',
      background: 'linear-gradient(135deg, rgba(30,30,30,0.95), rgba(20,20,20,0.98))',
      borderRadius: '16px',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h2 style={{ textAlign: 'center', color: '#d4af37', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
        🔗 Frontend ↔ Backend Connection Test
      </h2>
      <p style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Click the buttons below to fetch data from your Express backend
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <button
          onClick={fetchMessage}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading ? '#555' : 'linear-gradient(135deg, #d4af37, #b8941f)',
            color: '#111',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {loading ? '⏳ Loading...' : '📡 Fetch Message'}
        </button>
        <button
          onClick={fetchPerfumes}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading ? '#555' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {loading ? '⏳ Loading...' : '🧴 Fetch Perfumes'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '8px',
          color: '#ef4444',
          marginBottom: '1rem',
          fontSize: '0.85rem',
        }}>
          ❌ <strong>Error:</strong> {error}
          <br />
          <span style={{ color: '#999', fontSize: '0.8rem' }}>
            Tip: Make sure the backend is running (node server.js in the backend folder)
          </span>
        </div>
      )}

      {message && (
        <div style={{
          padding: '1.25rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          marginBottom: '1rem',
        }}>
          <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '0.5rem' }}>
            ✅ Response from Backend:
          </div>
          <div style={{ color: '#e5e7eb', fontSize: '1rem', lineHeight: 1.6 }}>
            {message.message}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Received at: {new Date(message.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {perfumes.length > 0 && (
        <div style={{
          padding: '1.25rem',
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '12px',
        }}>
          <div style={{ color: '#8b5cf6', fontWeight: 700, marginBottom: '0.75rem' }}>
            🧴 Perfumes from Backend:
          </div>
          {perfumes.map((p) => (
            <div key={p.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              color: '#e5e7eb',
            }}>
              <span>{p.name}</span>
              <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: '#d4af37' }}>₹{p.price}</span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '99px',
                  background: p.inStock ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: p.inStock ? '#10b981' : '#ef4444',
                }}>
                  {p.inStock ? 'In Stock' : 'Sold Out'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
