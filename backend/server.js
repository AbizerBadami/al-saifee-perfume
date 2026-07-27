const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { db } = require('./firebaseAdmin');

const app = express();
const PORT = process.env.PORT || 4000;

// Allow cross-origin requests from the frontend
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// ---------- Original Test Endpoints (from Part 1) ----------

// GET /api/message — Returns a greeting (hardcoded, no database)
app.get('/api/message', (req, res) => {
  res.json({
    message: 'Hello from Al-Saifee Perfumes Backend! 🌹 The frontend and backend are now connected!',
    timestamp: new Date().toISOString(),
    status: 'success',
  });
});

// GET /api/perfumes — Returns sample perfumes (hardcoded, no database)
app.get('/api/perfumes', (req, res) => {
  res.json({
    perfumes: [
      { id: 1, name: 'Royal Oud',     price: 2500, inStock: true  },
      { id: 2, name: 'Amber Elixir',  price: 1800, inStock: true  },
      { id: 3, name: 'Midnight Musk', price: 3200, inStock: false },
    ],
    total: 3,
    status: 'success',
  });
});

// ============================================================
//  NEW DATABASE ENDPOINTS — these read/write from Firestore
// ============================================================

// GET /api/tasks — Fetch ALL tasks from the Firestore "tasks" collection
app.get('/api/tasks', async (req, res) => {
  if (!db) {
    return res.status(503).json({
      error: 'Database not connected. Set up your serviceAccountKey.json first.',
    });
  }

  try {
    const snapshot = await db.collection('tasks').orderBy('createdAt', 'desc').get();
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ tasks, total: tasks.length, status: 'success' });
  } catch (err) {
    console.error('Error fetching tasks:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — Create a NEW task in Firestore
app.post('/api/tasks', async (req, res) => {
  if (!db) {
    return res.status(503).json({
      error: 'Database not connected. Set up your serviceAccountKey.json first.',
    });
  }

  try {
    const { title, description, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const newTask = {
      title,
      description: description || '',
      priority: priority || 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('tasks').add(newTask);

    res.status(201).json({
      id: docRef.id,
      ...newTask,
      status: 'success',
      message: `Task "${title}" created!`,
    });
  } catch (err) {
    console.error('Error creating task:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — Toggle a task's completed status
app.patch('/api/tasks/:id', async (req, res) => {
  if (!db) {
    return res.status(503).json({
      error: 'Database not connected. Set up your serviceAccountKey.json first.',
    });
  }

  try {
    const { id } = req.params;
    const docRef = db.collection('tasks').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const currentData = doc.data();
    const updatedCompleted = !currentData.completed;

    await docRef.update({ completed: updatedCompleted });

    res.json({
      id,
      ...currentData,
      completed: updatedCompleted,
      status: 'success',
    });
  } catch (err) {
    console.error('Error toggling task:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id — Delete a task from Firestore
app.delete('/api/tasks/:id', async (req, res) => {
  if (!db) {
    return res.status(503).json({
      error: 'Database not connected. Set up your serviceAccountKey.json first.',
    });
  }

  try {
    const { id } = req.params;
    const docRef = db.collection('tasks').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await docRef.delete();

    res.json({ id, status: 'success', message: 'Task deleted.' });
  } catch (err) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log('');
  console.log('=============================================');
  console.log('  ✅  Backend server is RUNNING!');
  console.log(`  🌐  URL:  http://localhost:${PORT}`);
  console.log('  -------------------------------------------');
  console.log('  Hardcoded endpoints (no database needed):');
  console.log(`  📡  GET   http://localhost:${PORT}/api/message`);
  console.log(`  🧴  GET   http://localhost:${PORT}/api/perfumes`);
  console.log('  -------------------------------------------');
  console.log('  Firestore endpoints (database required):');
  console.log(`  📋  GET   http://localhost:${PORT}/api/tasks`);
  console.log(`  ➕  POST  http://localhost:${PORT}/api/tasks`);
  console.log(`  ✏️   PATCH http://localhost:${PORT}/api/tasks/:id`);
  console.log(`  🗑️   DEL   http://localhost:${PORT}/api/tasks/:id`);
  console.log('=============================================');
  console.log('');
});
