const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const PORT = 5500;

// ✅ Load Firebase service account key
const serviceAccount = require('./serviceAccountKey.json');

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://elaracure-80917-default-rtdb.firebaseio.com"
});

// ✅ Middleware
app.use(cors({
  origin: "http://127.0.0.1:5500", // change this if frontend is hosted elsewhere
  credentials: true
}));
app.use(express.json());

// ✅ Root route to prevent "Cannot GET /"
app.get('/', (req, res) => {
  res.send("✅ Elaracure backend server is running!");
});

/**
 * 🔒 POST /verify-token
 * Verifies Firebase Auth token from frontend
 */
app.post('/verify-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is missing' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    res.status(200).json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || null
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * 🔐 GET /user-data/:uid
 * Fetches user info from Firebase Realtime Database
 */
app.get('/user-data/:uid', async (req, res) => {
  const uid = req.params.uid;

  try {
    const snapshot = await admin.database().ref(`/users/${uid}`).once('value');
    const userData = snapshot.val();

    if (userData) {
      res.status(200).json(userData);
    } else {
      res.status(404).json({ error: 'User data not found' });
    }
  } catch (err) {
    console.error("Database fetch error:", err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

/**
 * 🧪 POST /log-login
 * Optional: Log user login activity
 */
app.post('/log-login', async (req, res) => {
  const { uid, email } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: 'Missing UID or email' });
  }

  try {
    await admin.database().ref(`/logins/${uid}`).set({
      email,
      lastLogin: new Date().toISOString()
    });

    res.status(200).json({ message: 'Login logged successfully' });
  } catch (error) {
    console.error("Logging error:", error);
    res.status(500).json({ error: 'Failed to log login' });
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});

