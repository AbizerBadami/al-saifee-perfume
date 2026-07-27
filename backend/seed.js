// ============================================================
// backend/seed.js
//
// This script inserts sample "tasks" into your Firestore
// database so you have some data to fetch from the frontend.
//
// Run it ONCE with:   node seed.js
// ============================================================

require('dotenv').config();
const { db } = require('./firebaseAdmin');

const SAMPLE_TASKS = [
  {
    title: 'Restock Royal Oud inventory',
    description: 'Order 50 units of Royal Oud 100ml from supplier.',
    priority: 'high',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Update product photos on website',
    description: 'Take new high-quality photos of the Amber Elixir collection.',
    priority: 'medium',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Send invoice to wholesale customer',
    description: 'Email invoice #1042 to Dubai Fragrances LLC.',
    priority: 'high',
    completed: true,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Clean and organize store display',
    description: 'Rearrange the front display case with new arrivals.',
    priority: 'low',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Review pending customer orders',
    description: 'Check 3 pending orders and update their shipping status.',
    priority: 'medium',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

async function seedDatabase() {
  if (!db) {
    console.error('❌ Cannot seed — Firestore is not connected.');
    console.error('   Make sure your serviceAccountKey.json and .env are set up.');
    process.exit(1);
  }

  console.log('🌱 Seeding Firestore with sample tasks...');
  console.log('');

  for (const task of SAMPLE_TASKS) {
    const docRef = await db.collection('tasks').add(task);
    console.log(`   ✅  Added: "${task.title}" (ID: ${docRef.id})`);
  }

  console.log('');
  console.log('🎉 Done! 5 tasks have been added to the "tasks" collection.');
  console.log('   You can see them in Firebase Console > Firestore Database.');
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
