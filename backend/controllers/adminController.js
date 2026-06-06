/**
 * controllers/adminController.js
 * Handles all admin-facing operations: user management, course management,
 * enrollments, and monitoring attendance data.
 */

const bcrypt   = require('bcryptjs');
const pool     = require('../db/index');
const { calculatePercentage, isFlagged, ATTENDANCE_THRESHOLD } = require('../utils/attendance');

const DEFAULT_PASSWORD = 'Welcome@123'; // default password for new accounts

/**
 * getAllUsers — returns a list of all users in the system
 */
async function getAllUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, matric_number, must_change_password, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

/**
 * createLecturer — creates a new lecturer account with a default password
 */
async function createLecturer(req, res) {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, must_change_password)
       VALUES ($1, $2, $3, 'lecturer', TRUE)
       RETURNING id, name, email, role, must_change_password, created_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    res.status(201).json({
      data: {
        user: result.rows[0],
        defaultPassword: DEFAULT_PASSWORD,
        message: 'Lecturer created. Default password is Welcome@123',
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error('createLecturer error:', err);
    res.status(500).json({ error: 'Failed to create lecturer.' });
  }
}

/**
 * createStudent — creates a new student account with a default password
 */
async function createStudent(req, res) {
  const { name, email, matric_number } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, matric_number, must_change_password)
       VALUES ($1, $2, $3, 'student', $4, TRUE)
       RETURNING id, name, email, role, matric_number, must_change_password, created_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword, matric_number || null]
    );

    res.status(201).json({
      data: {
        user: result.rows[0],
        defaultPassword: DEFAULT_PASSWORD,
        message: 'Student created. Default password is Welcome@123',
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error('createStudent error:', err);
    res.status(500).json({ error: 'Failed to create student.' });
  }
}

/**
 * createCourse — creates a new course
 */
async function createCourse(req, res) {
  const { code, title, lecturer_id } = req.body;

  if (!code || !title) {
    return res.status(400).json({ error: 'Course code and title are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO courses (code, title, lecturer_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [code.toUpperCase().trim(), title.trim(), lecturer_id || null]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A course with this code already exists.' });
    }
    console.error('createCourse error:', err);
    res.status(500).json({ error: 'Failed to create course.' });
  }
}

/**
 * getAllCourses — returns all courses with lecturer names
 */
async function getAllCourses(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.code, c.title, c.created_at,
              u.id AS lecturer_id, u.name AS lecturer_name
       FROM courses c
       LEFT JOIN users u ON c.lecturer_id = u.id
       ORDER BY c.created_at DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllCourses error:', err);
    res.status(500).json({ error: 'Failed to fetch courses.' });
  }
}

/**
 * assignLecturer — assigns a lecturer to a specific course
 */
async function assignLecturer(req, res) {
  const { id }         = req.params;
  const { lecturer_id } = req.body;

  if (!lecturer_id) {
    return res.status(400).json({ error: 'lecturer_id is required.' });
  }

  try {
    // Verify the lecturer exists and has the correct role
    const lecturerCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'lecturer'",
      [lecturer_id]
    );

    if (lecturerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lecturer not found.' });
    }

    const result = await pool.query(
      'UPDATE courses SET lecturer_id = $1 WHERE id = $2 RETURNING *',
      [lecturer_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('assignLecturer error:', err);
    res.status(500).json({ error: 'Failed to assign lecturer.' });
  }
}

/**
 * enrollStudent — enrolls a student in a course
 */
async function enrollStudent(req, res) {
  const { student_id, course_id } = req.body;

  if (!student_id || !course_id) {
    return res.status(400).json({ error: 'student_id and course_id are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO enrollments (student_id, course_id)
       VALUES ($1, $2)
       RETURNING *`,
      [student_id, course_id]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Student is already enrolled in this course.' });
    }
    console.error('enrollStudent error:', err);
    res.status(500).json({ error: 'Failed to enroll student.' });
  }
}

/**
 * getAllEnrollments — returns all enrollments with student and course details
 */
async function getAllEnrollments(req, res) {
  try {
    const result = await pool.query(
      `SELECT e.id, e.enrolled_at,
              u.id AS student_id, u.name AS student_name, u.email AS student_email,
              u.matric_number,
              c.id AS course_id, c.code AS course_code, c.title AS course_title
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       JOIN courses c ON e.course_id = c.id
       ORDER BY e.enrolled_at DESC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllEnrollments error:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments.' });
  }
}

/**
 * getFlaggedStudents — returns all students whose attendance in any course is below 75%
 */
async function getFlaggedStudents(req, res) {
  try {
    // For each enrolled student-course pair, compute attendance percentage
    const result = await pool.query(
      `SELECT
         u.id AS student_id,
         u.name,
         u.email,
         u.matric_number,
         c.id AS course_id,
         c.code AS course_code,
         c.title AS course_title,
         COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_count,
         COUNT(s.id) AS total_sessions
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN attendance_sessions s ON s.course_id = c.id AND s.status = 'closed'
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = u.id
       GROUP BY u.id, u.name, u.email, u.matric_number, c.id, c.code, c.title
       HAVING COUNT(s.id) > 0`
    );

    // Filter to only those below the threshold
    const flagged = result.rows
      .map(row => ({
        ...row,
        percentage: calculatePercentage(
          parseInt(row.present_count, 10),
          parseInt(row.total_sessions, 10)
        ),
      }))
      .filter(row => isFlagged(row.percentage));

    res.json({ data: flagged });
  } catch (err) {
    console.error('getFlaggedStudents error:', err);
    res.status(500).json({ error: 'Failed to fetch flagged students.' });
  }
}

/**
 * getAllAttendance — returns all attendance records with student and session details
 */
async function getAllAttendance(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         a.id, a.status, a.scanned_at,
         u.name AS student_name, u.email AS student_email, u.matric_number,
         c.code AS course_code, c.title AS course_title,
         s.session_date, s.status AS session_status
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       JOIN attendance_sessions s ON a.session_id = s.id
       JOIN courses c ON s.course_id = c.id
       ORDER BY a.scanned_at DESC
       LIMIT 500`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllAttendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
}

module.exports = {
  getAllUsers,
  createLecturer,
  createStudent,
  createCourse,
  getAllCourses,
  assignLecturer,
  enrollStudent,
  getAllEnrollments,
  getFlaggedStudents,
  getAllAttendance,
};
