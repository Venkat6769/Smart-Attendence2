/**
 * routes/admin.js
 * Defines all admin-only HTTP routes.
 * All routes require: verifyToken (authenticated) + requireRole('admin').
 * Mounted at /api in server.js, so paths here start without /api.
 */

const express           = require('express');
const router            = express.Router();
const adminController   = require('../controllers/adminController');
const { verifyToken }   = require('../middleware/auth');
const { requireRole }   = require('../middleware/roles');

// Shortcut: apply both auth middleware to every route in this file
const adminOnly = [verifyToken, requireRole('admin')];

// GET  /api/users                  — list all users in the system
router.get('/users', adminOnly, adminController.getAllUsers);

// POST /api/users/lecturer         — create a new lecturer account
router.post('/users/lecturer', adminOnly, adminController.createLecturer);

// POST /api/users/student          — create a new student account
router.post('/users/student', adminOnly, adminController.createStudent);

// POST /api/courses                — create a new course
router.post('/courses', adminOnly, adminController.createCourse);

// GET  /api/courses                — list all courses
router.get('/courses', adminOnly, adminController.getAllCourses);

// PATCH /api/courses/:id/assign    — assign a lecturer to a course
router.patch('/courses/:id/assign', adminOnly, adminController.assignLecturer);

// POST /api/enrollments            — enroll a student in a course
router.post('/enrollments', adminOnly, adminController.enrollStudent);

// GET  /api/enrollments            — list all enrollments
router.get('/enrollments', adminOnly, adminController.getAllEnrollments);

// GET  /api/students/flagged       — list students with < 75% attendance
router.get('/students/flagged', adminOnly, adminController.getFlaggedStudents);

// GET  /api/attendance/all         — view all attendance records
router.get('/attendance/all', adminOnly, adminController.getAllAttendance);

module.exports = router;
