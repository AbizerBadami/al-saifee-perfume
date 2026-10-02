// ============================================================
// Tasks API Routes (Preserves Historic Express/Firestore Logic)
// Fully migrated to Cloudflare D1 with:
//   - Zod schema validation via @hono/zod-validator
//   - Parameterized D1 prepared statements
//   - 100% API compatibility with existing TaskList component
// ============================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings, Variables, TaskRow } from '../types';
import { toTaskJSON } from '../types';

const tasks = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------- Zod Validation Schemas ----------

const idParamSchema = z.object({
  id: z.string().trim().min(1, 'Task ID is required').max(64),
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().trim().max(2000).default(''),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

// ---------- Route Handlers ----------

// GET /api/tasks — List all tasks ordered by creation date
tasks.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM tasks ORDER BY created_at DESC'
  ).all<TaskRow>();

  return c.json({
    tasks: results.map(toTaskJSON),
    total: results.length,
    status: 'success',
  });
});

// POST /api/tasks — Create a new task
tasks.post('/', zValidator('json', taskCreateSchema), async (c) => {
  const { title, description, priority } = c.req.valid('json');
  const id = `task-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO tasks (id, title, description, priority, completed, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).bind(id, title, description, priority, now).run();

  const created = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first<TaskRow>();

  return c.json(
    {
      ...toTaskJSON(created!),
      status: 'success',
      message: `Task "${title}" created successfully!`,
    },
    201
  );
});

// PATCH /api/tasks/:id — Toggle task completion status
tasks.patch('/:id', zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE id = ?'
  ).bind(id).first<TaskRow>();

  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Task not found' }, 404);
  }

  const newCompleted = existing.completed === 1 ? 0 : 1;

  await c.env.DB.prepare(
    'UPDATE tasks SET completed = ? WHERE id = ?'
  ).bind(newCompleted, id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first<TaskRow>();

  return c.json({
    ...toTaskJSON(updated!),
    status: 'success',
  });
});

// DELETE /api/tasks/:id — Delete task from D1
tasks.delete('/:id', zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const existing = await c.env.DB.prepare('SELECT id FROM tasks WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ error: 'Not Found', message: 'Task not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  return c.json({ id, status: 'success', message: 'Task deleted successfully' });
});

export default tasks;
