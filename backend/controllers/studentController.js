/**
 * controllers/studentController.js
 * Handles all student-facing operations: viewing enrolled courses,
 * scanning QR codes to mark attendance, and viewing attendance history/percentages.
 */

const pool                                          = require('../db/index');
const { calculatePercentage, isFlagged }            = require('../utils/attendance');

/**
 * getCourses — returns all courses the student is enrolled in
 */
async function getCourses(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.code, c.title,
              u.name AS lecturer_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN users u ON c.lecturer_id = u.id
       WHERE e.student_id = $1
       ORDER BY c.title`,
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getCourses error:', err);
    res.status(500).json({ error: 'Failed to fetch courses.' });
  }
}

/**
 * scanQR — validates a QR token and records the student's attendance as 'present'.
 * Performs 5 validation checks before inserting the attendance record.
 */
async function scanQR(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'QR token is required.' });
  }

  try {
    // Check 1: Does a session with this token exist?
    // Check both session_tokens (rotating 5s tokens) and attendance_sessions (direct token)
    let session = null;
    let tokenExpired = false;

    const tokenLookup = await pool.query(
      `SELECT s.*, st.expires_at AS token_expires_at
       FROM session_tokens st
       JOIN attendance_sessions s ON s.id = st.session_id
       WHERE st.token = $1`,
      [token]
    );

    if (tokenLookup.rows.length > 0) {
      session = tokenLookup.rows[0];
      if (new Date() > new Date(session.token_expires_at)) {
        tokenExpired = true;
      }
    } else {
      // Fallback for direct token lookup on attendance_sessions
      const sessionResult = await pool.query(
        'SELECT * FROM attendance_sessions WHERE token = $1',
        [token]
      );
      if (sessionResult.rows.length > 0) {
        session = sessionResult.rows[0];
        if (session.expires_at && new Date() > new Date(session.expires_at)) {
          tokenExpired = true;
        }
      }
    }

    if (!session) {
      return res.status(404).json({ error: 'Invalid QR code. Session not found.' });
    }

    // Check 2: Is the session still active (not closed)?
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'This session has already been closed.' });
    }

    // Check 3: Has the QR code or session expired?
    if (tokenExpired || (session.expires_at && new Date() > new Date(session.expires_at))) {
      return res.status(400).json({ error: 'This QR code has expired. Please scan the current QR code on the screen.' });
    }

    // Check 4: Is the student enrolled in this course?
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [req.user.id, session.course_id]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not enrolled in this course.' });
    }

    // Check 5: Has the student already scanned for this session?
    const existingRecord = await pool.query(
      "SELECT id, status FROM attendance WHERE student_id = $1 AND session_id = $2",
      [req.user.id, session.id]
    );

    if (existingRecord.rows.length > 0 && existingRecord.rows[0].status === 'present') {
      return res.status(409).json({ error: 'You have already marked attendance for this session.' });
    }

    // All checks passed — record or update attendance as 'present'
    const result = await pool.query(
      `INSERT INTO attendance (student_id, session_id, status)
       VALUES ($1, $2, 'present')
       ON CONFLICT (student_id, session_id)
       DO UPDATE SET status = 'present', scanned_at = NOW()
       RETURNING *`,
      [req.user.id, session.id]
    );

    res.status(201).json({
      data: {
        attendance: result.rows[0],
        message: 'Attendance marked successfully!',
      },
    });
  } catch (err) {
    console.error('scanQR error:', err);
    res.status(500).json({ error: 'Failed to record attendance.' });
  }
}

/**
 * getAttendanceHistory — returns the student's attendance record for a specific course,
 * listing each session and whether they were present or absent.
 */
async function getAttendanceHistory(req, res) {
  const { courseId } = req.params;

  try {
    // Verify the student is enrolled in this course
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not enrolled in this course.' });
    }

    const result = await pool.query(
      `SELECT
         s.id AS session_id,
         s.session_date,
         s.status AS session_status,
         COALESCE(a.status, 'absent') AS attendance_status,
         a.scanned_at
       FROM attendance_sessions s
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = $1
       WHERE s.course_id = $2 AND s.status = 'closed'
       ORDER BY s.session_date DESC`,
      [req.user.id, courseId]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAttendanceHistory error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance history.' });
  }
}

/**
 * getAttendancePercentage — calculates the student's attendance percentage for a course
 */
async function getAttendancePercentage(req, res) {
  const { courseId } = req.params;

  try {
    // Verify enrollment
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not enrolled in this course.' });
    }

    const result = await pool.query(
      `SELECT
         COUNT(s.id)                                          AS total_sessions,
         COUNT(a.id) FILTER (WHERE a.status = 'present')     AS present_count
       FROM attendance_sessions s
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = $1
       WHERE s.course_id = $2 AND s.status = 'closed'`,
      [req.user.id, courseId]
    );

    const { total_sessions, present_count } = result.rows[0];
    const percentage = calculatePercentage(
      parseInt(present_count, 10),
      parseInt(total_sessions, 10)
    );

    res.json({
      data: {
        total_sessions: parseInt(total_sessions, 10),
        present_count:  parseInt(present_count, 10),
        percentage,
        flagged:        isFlagged(percentage),
      },
    });
  } catch (err) {
    console.error('getAttendancePercentage error:', err);
    res.status(500).json({ error: 'Failed to calculate attendance percentage.' });
  }
}

/**
 * getWarnings — returns all courses where the student's attendance is below 75%
 */
async function getWarnings(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         c.id AS course_id, c.code, c.title,
         COUNT(s.id)                                          AS total_sessions,
         COUNT(a.id) FILTER (WHERE a.status = 'present')     AS present_count
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN attendance_sessions s ON s.course_id = c.id AND s.status = 'closed'
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = e.student_id
       WHERE e.student_id = $1
       GROUP BY c.id, c.code, c.title`,
      [req.user.id]
    );

    // Calculate percentage and filter to only flagged courses
    const warnings = result.rows
      .map(row => ({
        course_id:      row.course_id,
        code:           row.code,
        title:          row.title,
        total_sessions: parseInt(row.total_sessions, 10),
        present_count:  parseInt(row.present_count, 10),
        percentage:     calculatePercentage(
          parseInt(row.present_count, 10),
          parseInt(row.total_sessions, 10)
        ),
      }))
      .filter(row => isFlagged(row.percentage) && row.total_sessions > 0);

    res.json({ data: warnings });
  } catch (err) {
    console.error('getWarnings error:', err);
    res.status(500).json({ error: 'Failed to fetch warnings.' });
  }
}

module.exports = { getCourses, scanQR, getAttendanceHistory, getAttendancePercentage, getWarnings };
