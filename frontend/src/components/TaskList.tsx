import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: string;
}

const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: '🔴 High' },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: '🟡 Medium' },
  low:    { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', label: '🟢 Low' },
};

export const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating a new task
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [creating, setCreating] = useState(false);

  // Fetch all tasks from the backend → which queries Firestore
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }
      const data = await response.json();
      setTasks(data.tasks);
    } catch (err) {
      console.error('Fetch tasks failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Create a new task
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          priority: newPriority,
        }),
      });
      if (!response.ok) throw new Error('Failed to create task.');
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      await fetchTasks(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed.');
    } finally {
      setCreating(false);
    }
  };

  // Toggle a task completed/not completed
  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to toggle task.');
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed.');
    }
  };

  // Delete a task
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete task.');
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.8rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '0.85rem',
    outline: 'none',
  };

  return (
    <div style={{
      maxWidth: '650px',
      margin: '2rem auto',
      padding: '2rem',
      background: 'linear-gradient(135deg, rgba(30,30,30,0.95), rgba(20,20,20,0.98))',
      borderRadius: '16px',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <h2 style={{ textAlign: 'center', color: '#d4af37', marginBottom: '0.3rem', fontSize: '1.4rem' }}>
        📋 Task Manager — Live from Firestore
      </h2>
      <p style={{ textAlign: 'center', color: '#777', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        Frontend → Express Backend → Firebase Firestore Database
      </p>

      {/* Error */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          marginBottom: '1rem',
          fontSize: '0.83rem',
        }}>
          ❌ {error}
        </div>
      )}

      {/* Create Task Form */}
      <form onSubmit={handleCreate} style={{
        padding: '1rem',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}>
        <div style={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
          ➕ Add a New Task
        </div>
        <input
          type="text"
          placeholder="Task title (e.g., Restock inventory)..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Description (optional)..."
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
          >
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            style={{
              marginLeft: 'auto',
              padding: '0.55rem 1.2rem',
              background: creating ? '#555' : 'linear-gradient(135deg, #d4af37, #b8941f)',
              color: '#111',
              border: 'none',
              borderRadius: '8px',
              cursor: creating ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.83rem',
            }}
          >
            {creating ? '⏳ Saving...' : '💾 Save to Firestore'}
          </button>
        </div>
      </form>

      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ color: '#888', fontSize: '0.8rem' }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} in database
        </span>
        <button
          onClick={fetchTasks}
          disabled={loading}
          style={{
            padding: '0.4rem 0.9rem',
            background: 'rgba(139, 92, 246, 0.2)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          {loading ? '⏳ Loading...' : '🔄 Refresh from DB'}
        </button>
      </div>

      {/* Task List */}
      {loading && tasks.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', padding: '2rem 0' }}>⏳ Loading tasks from Firestore...</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '2rem 0', fontSize: '0.85rem' }}>
          No tasks yet. Add one above, or run <code style={{ color: '#d4af37' }}>node seed.js</code> in the backend folder.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tasks.map((task) => {
            const pc = priorityColors[task.priority] || priorityColors.medium;
            return (
              <div key={task.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: task.completed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                opacity: task.completed ? 0.55 : 1,
                transition: 'all 0.2s ease',
              }}>
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(task.id)}
                  title={task.completed ? 'Mark as not done' : 'Mark as done'}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: `2px solid ${task.completed ? '#10b981' : '#555'}`,
                    background: task.completed ? 'rgba(16,185,129,0.25)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: '#10b981',
                    flexShrink: 0,
                  }}
                >
                  {task.completed ? '✓' : ''}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: '#e5e7eb',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textDecoration: task.completed ? 'line-through' : 'none',
                    marginBottom: '0.15rem',
                  }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ color: '#777', fontSize: '0.75rem', lineHeight: 1.3 }}>
                      {task.description}
                    </div>
                  )}
                </div>

                {/* Priority badge */}
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '99px',
                  background: pc.bg,
                  color: pc.text,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {pc.label}
                </span>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(task.id)}
                  title="Delete task"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#ef4444',
                    borderRadius: '6px',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer info */}
      <div style={{
        marginTop: '1.25rem',
        padding: '0.75rem',
        background: 'rgba(212,175,55,0.06)',
        border: '1px solid rgba(212,175,55,0.15)',
        borderRadius: '8px',
        fontSize: '0.72rem',
        color: '#888',
        lineHeight: 1.5,
      }}>
        💡 Every action here hits your Express backend (<code style={{ color: '#d4af37' }}>localhost:4000</code>),
        which reads/writes your <strong style={{ color: '#f59e0b' }}>Firebase Firestore</strong> database.
        Changes appear in your Firebase Console too!
      </div>
    </div>
  );
};
