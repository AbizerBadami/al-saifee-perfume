// ============================================================
// backend/firebaseAdmin.js
//
// This file initializes the Firebase Admin SDK and exports
// a Firestore database instance that the rest of the backend
// can use to read and write data.
//
// The Admin SDK is different from the client SDK your frontend
// uses. The Admin SDK has FULL access to your Firebase project
// — it bypasses all security rules. That is why it needs a
// special "service account key" file to prove it is authorized.
// ============================================================

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables from backend/.env
require('dotenv').config();

let db;

try {
  const serviceAccountPath = path.resolve(
    __dirname,
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 'serviceAccountKey.json'
  );

  // Initialize Firebase Admin with the service account key
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  // Get a Firestore database instance
  db = admin.firestore();

  console.log('✅  Firebase Admin initialized — connected to Firestore!');
} catch (error) {
  console.warn('');
  console.warn('⚠️  Firebase Admin could NOT initialize.');
  console.warn('   Reason:', error.message);
  console.warn('');
  console.warn('   The server will still run, but database endpoints will');
  console.warn('   return errors. Follow the guide to set up your service');
  console.warn('   account key file.');
  console.warn('');

  // Create a stub so the server does not crash on startup.
  // Database endpoints will return friendly error messages.
  db = null;
}

module.exports = { admin, db };
