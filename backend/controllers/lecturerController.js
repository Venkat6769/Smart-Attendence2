/**
 * controllers/lecturerController.js
 * Handles all lecturer operations: viewing courses, managing attendance sessions,
 * generating QR codes, manual attendance overrides, and PDF reports.
 */

const { v4: uuidv4 }          = require('uuid');
const pool                    = require('../db/index');
const { generateQRCode }      = require('../utils/qrcode');
const { generateAttendancePDF } = require('../utils/pdf');
const { formatAttendanceRow } = require('../utils/attendance');

/**
 * getCourses — returns all courses assigned to the logged-in lecturer
 */
async function getCourses(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.code, c.title, c.created_at,
              COUNT(e.id) AS enrolled_count
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       WHERE c.lecturer_id = $1
       GROUP BY c.id, c.code, c.title, c.created_at
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getCourses error:', err);
    res.status(500).json({ error: 'Failed to fetch courses.' });
  }
}

/**
 * startSession — creates a new attendance session for a course and returns the QR code.
 * The QR code encodes the unique session token.
 * Session expires 30 minutes from creation.
 */
async function startSession(req, res) {
  const { course_id } = req.body;

  if (!course_id) {
    return res.status(400).json({ error: 'course_id is required.' });
  }

  try {
    // Verify the course belongs to this lecturer
    const courseCheck = await pool.query(
      'SELECT id, code, title FROM courses WHERE id = $1 AND lecturer_id = $2',
      [course_id, req.user.id]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Course not found or not assigned to you.' });
    }

    // Check if there's already an active session for this course
    const activeCheck = await pool.query(
      "SELECT id FROM attendance_sessions WHERE course_id = $1 AND status = 'active'",
      [course_id]
    );

    if (activeCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'There is already an active session for this course. Please end it first.',
      });
    }

    // Generate a unique token for this session
    const token     = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Insert the session into the database
    const sessionResult = await pool.query(
      `INSERT INTO attendance_sessions (course_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [course_id, token, expiresAt]
    );

    const session = sessionResult.rows[0];

    // Generate the QR code image as a base64 data URL
    const qrCodeDataUrl = await generateQRCode(token);

    res.status(201).json({
      data: {
        session,
        qrCode:  qrCodeDataUrl,
        course:  courseCheck.rows[0],
        message: 'Session started. QR code is ready.',
      },
    });
  } catch (err) {
    console.error('startSession error:', err);
    res.status(500).json({ error: 'Failed to start session.' });
  }
}

/**
 * endSession — closes an attendance session and auto-marks all enrolled students
 * who did not scan as absent.
 */
async function endSession(req, res) {
  const { id } = req.params;

  try {
    // Verify the session exists and belongs to a course assigned to this lecturer
    const sessionCheck = await pool.query(
      `SELECT s.id, s.course_id, s.status
       FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1 AND c.lecturer_id = $2`,
      [id, req.user.id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or not authorized.' });
    }

    const session = sessionCheck.rows[0];

    if (session.status === 'closed') {
      return res.status(409).json({ error: 'This session is already closed.' });
    }

    // Mark session as closed
    await pool.query(
      "UPDATE attendance_sessions SET status = 'closed', closed_at = NOW() WHERE id = $1",
      [id]
    );

    // Get all enrolled students for this course
    const enrolledStudents = await pool.query(
      'SELECT student_id FROM enrollments WHERE course_id = $1',
      [session.course_id]
    );

    // Get students who already scanned (have a 'present' record)
    const presentStudents = await pool.query(
      "SELECT student_id FROM attendance WHERE session_id = $1 AND status = 'present'",
      [id]
    );

    const presentIds = new Set(presentStudents.rows.map(r => r.student_id));

    // Auto-insert absent records for students who did not scan
    const absentStudents = enrolledStudents.rows.filter(
      row => !presentIds.has(row.student_id)
    );

    for (const student of absentStudents) {
      await pool.query(
        `INSERT INTO attendance (student_id, session_id, status)
         VALUES ($1, $2, 'absent')
         ON CONFLICT (student_id, session_id) DO NOTHING`,
        [student.student_id, id]
      );
    }

    res.json({
      data: {
        message:       'Session closed successfully.',
        absentMarked:  absentStudents.length,
        presentCount:  presentIds.size,
      },
    });
  } catch (err) {
    console.error('endSession error:', err);
    res.status(500).json({ error: 'Failed to end session.' });
  }
}

/**
 * getCourseSessions — returns all sessions for a specific course
 */
async function getCourseSessions(req, res) {
  const { courseId } = req.params;

  try {
    const result = await pool.query(
      `SELECT s.id, s.session_date, s.status, s.expires_at, s.created_at, s.closed_at,
              COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_count,
              COUNT(a.id) FILTER (WHERE a.status = 'absent')  AS absent_count
       FROM attendance_sessions s
       LEFT JOIN attendance a ON a.session_id = s.id
       WHERE s.course_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [courseId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getCourseSessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
}

/**
 * manualAttendance — allows a lecturer to manually set a student's attendance status
 */
async function manualAttendance(req, res) {
  const { student_id, session_id, status } = req.body;

  if (!student_id || !session_id || !status) {
    return res.status(400).json({ error: 'student_id, session_id, and status are required.' });
  }

  if (!['present', 'absent'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'present' or 'absent'." });
  }

  try {
    // Verify the session belongs to this lecturer's course
    const sessionCheck = await pool.query(
      `SELECT s.id FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1 AND c.lecturer_id = $2`,
      [session_id, req.user.id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Session not found or not authorized.' });
    }

    // Upsert: insert if no record exists, update if it does
    const result = await pool.query(
      `INSERT INTO attendance (student_id, session_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, session_id)
       DO UPDATE SET status = EXCLUDED.status, scanned_at = NOW()
       RETURNING *`,
      [student_id, session_id, status]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('manualAttendance error:', err);
    res.status(500).json({ error: 'Failed to update attendance.' });
  }
}

/**
 * getCourseReport — returns an attendance summary for all students in a course
 */
async function getCourseReport(req, res) {
  const { id } = req.params;

  try {
    // Verify course belongs to this lecturer
    const courseCheck = await pool.query(
      'SELECT id, code, title FROM courses WHERE id = $1 AND lecturer_id = $2',
      [id, req.user.id]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or not assigned to you.' });
    }

    const result = await pool.query(
      `SELECT
         u.id AS student_id, u.name, u.email, u.matric_number,
         COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_count,
         (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = $1 AND status = 'closed') AS total_sessions
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       LEFT JOIN attendance_sessions s ON s.course_id = $1 AND s.status = 'closed'
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = u.id
       WHERE e.course_id = $1
       GROUP BY u.id, u.name, u.email, u.matric_number
       ORDER BY u.name`,
      [id]
    );

    const rows = result.rows.map(formatAttendanceRow);

    res.json({
      data: {
        course: courseCheck.rows[0],
        rows,
        total_sessions: rows.length > 0 ? rows[0].total : 0,
      },
    });
  } catch (err) {
    console.error('getCourseReport error:', err);
    res.status(500).json({ error: 'Failed to generate course report.' });
  }
}

/**
 * getSessionReport — returns attendance for all students in a single session
 */
async function getSessionReport(req, res) {
  const { id } = req.params;

  try {
    // Verify session belongs to this lecturer's course
    const sessionCheck = await pool.query(
      `SELECT s.id, s.session_date, s.status, s.created_at,
              c.code AS course_code, c.title AS course_title
       FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1 AND c.lecturer_id = $2`,
      [id, req.user.id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Get all enrolled students and their attendance for this session
    const result = await pool.query(
      `SELECT
         u.id AS student_id, u.name, u.email, u.matric_number,
         COALESCE(a.status, 'absent') AS status,
         a.scanned_at
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       JOIN attendance_sessions s ON s.id = $1
       LEFT JOIN attendance a ON a.session_id = $1 AND a.student_id = u.id
       WHERE e.course_id = s.course_id
       ORDER BY u.name`,
      [id]
    );

    res.json({
      data: {
        session: sessionCheck.rows[0],
        records: result.rows,
      },
    });
  } catch (err) {
    console.error('getSessionReport error:', err);
    res.status(500).json({ error: 'Failed to generate session report.' });
  }
}

/**
 * getCoursePDF — generates and streams a PDF attendance report for download
 */
async function getCoursePDF(req, res) {
  const { id } = req.params;

  try {
    // Verify course belongs to this lecturer
    const courseCheck = await pool.query(
      'SELECT id, code, title FROM courses WHERE id = $1 AND lecturer_id = $2',
      [id, req.user.id]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const course = courseCheck.rows[0];

    // Fetch the same data used in getCourseReport
    const result = await pool.query(
      `SELECT
         u.name, u.matric_number,
         COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_count,
         (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = $1 AND status = 'closed') AS total_sessions
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       LEFT JOIN attendance_sessions s ON s.course_id = $1 AND s.status = 'closed'
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = u.id
       WHERE e.course_id = $1
       GROUP BY u.name, u.matric_number
       ORDER BY u.name`,
      [id]
    );

    const rows = result.rows.map(formatAttendanceRow);

    // Build summary statistics
    const totalStudents      = rows.length;
    const flaggedCount       = rows.filter(r => r.flagged).length;
    const averagePercentage  = totalStudents > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / totalStudents * 10) / 10
      : 0;

    // Generate the PDF buffer
    const pdfBuffer = await generateAttendancePDF(course, rows, {
      totalStudents,
      averagePercentage,
      flaggedCount,
    });

    // Set response headers to trigger a file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${course.code}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error('getCoursePDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF report.' });
  }
}

/**
 * getSessionQR — regenerates the QR code for an existing active session.
 * Called when the lecturer refreshes the page and loses the QR from state.
 */
async function getSessionQR(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT s.id, s.token, s.expires_at, s.status, s.created_at,
              c.code AS course_code, c.title AS course_title
       FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1 AND c.lecturer_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = result.rows[0];

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'This session is already closed.' });
    }

    if (new Date() > new Date(session.expires_at)) {
      return res.status(400).json({ error: 'This session has expired.' });
    }

    // Re-generate the QR from the stored token
    const qrCode = await generateQRCode(session.token);

    res.json({ data: { qrCode, session } });
  } catch (err) {
    console.error('getSessionQR error:', err);
    res.status(500).json({ error: 'Failed to regenerate QR code.' });
  }
}

module.exports = {
  getCourses,
  startSession,
  endSession,
  getCourseSessions,
  getSessionQR,
  manualAttendance,
  getCourseReport,
  getSessionReport,
  getCoursePDF,
};
