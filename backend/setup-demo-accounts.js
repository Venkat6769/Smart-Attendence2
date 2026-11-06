const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const pool = require('./db/index');

async function setup() {
  try {
    const adminPass = await bcrypt.hash('Admin@123', 10);
    const lecPass   = await bcrypt.hash('Lecturer@123', 10);
    const studPass  = await bcrypt.hash('Student@123', 10);

    // 1. Admin
    await pool.query(`
      INSERT INTO users (name, email, password, role, must_change_password)
      VALUES ('System Admin', 'admin@university.edu', $1, 'admin', false)
      ON CONFLICT (email)
      DO UPDATE SET password = EXCLUDED.password, must_change_password = false
    `, [adminPass]);
    console.log('Admin ready: admin@university.edu / Admin@123');

    // 2. Lecturer
    const lecResult = await pool.query(`
      INSERT INTO users (name, email, password, role, must_change_password)
      VALUES ('Dr. Alan Turing', 'lecturer@university.edu', $1, 'lecturer', false)
      ON CONFLICT (email)
      DO UPDATE SET password = EXCLUDED.password, must_change_password = false
      RETURNING id
    `, [lecPass]);
    const lecId = lecResult.rows[0].id;
    console.log('Lecturer ready: lecturer@university.edu / Lecturer@123');

    // 3. Student
    const studResult = await pool.query(`
      INSERT INTO users (name, email, password, role, matric_number, must_change_password)
      VALUES ('Ada Lovelace', 'student@university.edu', $1, 'student', 'MAT-2026-001', false)
      ON CONFLICT (email)
      DO UPDATE SET password = EXCLUDED.password, must_change_password = false
      RETURNING id
    `, [studPass]);
    const studId = studResult.rows[0].id;
    console.log('Student ready: student@university.edu / Student@123');

    // 4. Ensure Course CS101 exists and is assigned to this lecturer
    let courseResult = await pool.query(`
      INSERT INTO courses (code, title, lecturer_id)
      VALUES ('CS101', 'Introduction to Computer Science', $1)
      ON CONFLICT (code)
      DO UPDATE SET lecturer_id = EXCLUDED.lecturer_id
      RETURNING id
    `, [lecId]);
    const courseId = courseResult.rows[0].id;
    console.log('Course CS101 assigned to lecturer');

    // 5. Ensure Student is enrolled in CS101
    await pool.query(`
      INSERT INTO enrollments (student_id, course_id)
      VALUES ($1, $2)
      ON CONFLICT (student_id, course_id) DO NOTHING
    `, [studId, courseId]);
    console.log('Student enrolled in CS101');

    console.log('\nAll 3 default accounts configured and ready to log in immediately!');
    process.exit(0);
  } catch (err) {
    console.error('Setup error:', err.message);
    process.exit(1);
  }
}

setup();
