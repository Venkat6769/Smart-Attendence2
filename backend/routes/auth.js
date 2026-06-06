/**
 * routes/auth.js
 * Defines all authentication-related HTTP routes.
 * Each route calls the corresponding function in authController.js.
 * Routes in this file are mounted at /api/auth in server.js.
 */

const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/login — log in with email + password, receive JWT token
router.post('/login', authController.login);

// GET /api/auth/me — get the current logged-in user's profile (requires token)
router.get('/me', verifyToken, authController.me);

// POST /api/auth/logout — client-side logout; token is removed on the frontend
router.post('/logout', verifyToken, authController.logout);

// PATCH /api/auth/change-password — change own password (any authenticated user)
router.patch('/change-password', verifyToken, authController.changePassword);

module.exports = router;
