/**
 * routes/student.js
 * Defines all student-only HTTP routes.
 * All routes require: verifyToken + requireRole('student').
 * Mounted at /api in server.js.
 */

const express            = require('express');
const router             = express.Router();
const studentController  = require('../controllers/studentController');
const { verifyToken }    = require('../middleware/auth');
const { requireRole }    = require('../middleware/roles');

// Apply auth + student role check to all routes
const studentOnly = [verifyToken, requireRole('student')];

// GET  /api/student/courses                    — view courses the student is enrolled in
router.get('/student/courses', studentOnly, studentController.getCourses);

// POST /api/attendance/scan                    — submit scanned QR token to mark attendance
router.post('/attendance/scan', studentOnly, studentController.scanQR);

// GET  /api/attendance/history/:courseId       — attendance history for a specific course
router.get('/attendance/history/:courseId', studentOnly, studentController.getAttendanceHistory);

// GET  /api/attendance/percentage/:courseId    — attendance percentage for a specific course
router.get('/attendance/percentage/:courseId', studentOnly, studentController.getAttendancePercentage);

// GET  /api/attendance/warnings                — list courses where percentage < 75%
router.get('/attendance/warnings', studentOnly, studentController.getWarnings);

module.exports = router;
