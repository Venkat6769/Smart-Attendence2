/**
 * routes/lecturer.js
 * Defines all lecturer-only HTTP routes.
 * All routes require: verifyToken + requireRole('lecturer').
 * Mounted at /api in server.js.
 */

const express              = require('express');
const router               = express.Router();
const lecturerController   = require('../controllers/lecturerController');
const { verifyToken }      = require('../middleware/auth');
const { requireRole }      = require('../middleware/roles');

// Apply auth + lecturer role check to all routes in this file
const lecturerOnly = [verifyToken, requireRole('lecturer')];

// GET  /api/lecturer/courses        — view courses assigned to the logged-in lecturer
router.get('/lecturer/courses', lecturerOnly, lecturerController.getCourses);

// POST /api/sessions/start          — start a new attendance session and get QR code
router.post('/sessions/start', lecturerOnly, lecturerController.startSession);

// POST /api/sessions/:id/end        — close a session and auto-mark absent students
router.post('/sessions/:id/end', lecturerOnly, lecturerController.endSession);

// GET  /api/sessions/:courseId/list — list all sessions for a course
router.get('/sessions/:courseId/list', lecturerOnly, lecturerController.getCourseSessions);

// GET  /api/sessions/:id/qr        — regenerate QR for an existing active session
router.get('/sessions/:id/qr', lecturerOnly, lecturerController.getSessionQR);

// PATCH /api/attendance/manual      — manually override a student's attendance status
router.patch('/attendance/manual', lecturerOnly, lecturerController.manualAttendance);

// GET  /api/reports/course/:id      — attendance report for a whole course
router.get('/reports/course/:id', lecturerOnly, lecturerController.getCourseReport);

// GET  /api/reports/session/:id     — attendance report for a single session
router.get('/reports/session/:id', lecturerOnly, lecturerController.getSessionReport);

// GET  /api/reports/course/:id/pdf  — download PDF report for a course
router.get('/reports/course/:id/pdf', lecturerOnly, lecturerController.getCoursePDF);

module.exports = router;
