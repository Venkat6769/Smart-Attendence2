/**
 * server.js
 * Main entry point for the Smart Attendance System API.
 * Sets up the Express app, mounts middleware, and registers all route groups.
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// Import route files — each file handles one domain of the API
const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const lecturerRoutes = require('./routes/lecturer');
const studentRoutes  = require('./routes/student');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────

// Allow cross-origin requests from the React frontend.
// Also allows ngrok tunnels so you can test on a real phone.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
    ];

    // Allow any ngrok tunnel domain (covers .ngrok-free.dev, .ngrok-free.app, .ngrok.io etc.)
    const isNgrok = origin.includes('ngrok');

    if (allowed.includes(origin) || isNgrok) {
      return callback(null, true);
    }

    callback(new Error('CORS not allowed for origin: ' + origin));
  },
  credentials: true,
}));

// Parse incoming request bodies as JSON
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────

// Public and shared auth routes (login, me, logout, change-password)
app.use('/api/auth', authRoutes);

// Admin-only routes (user management, courses, enrollments)
app.use('/api', adminRoutes);

// Lecturer routes (sessions, QR codes, reports)
app.use('/api', lecturerRoutes);

// Student routes (scan QR, view attendance history)
app.use('/api', studentRoutes);

// Health check — useful to verify the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Attendance API is running' });
});

// ── Global Error Handler ───────────────────────────────────────────────────
// Catches any error passed to next(err) from controllers
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Smart Attendance API running on http://localhost:${PORT}`);
});
