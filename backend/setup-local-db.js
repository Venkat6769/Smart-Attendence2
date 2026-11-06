const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function setup() {
  console.log('Connecting to postgres database to ensure smart_attendance exists...');
  const pgUser = process.env.PGUSER || 'postgres';
  const pgPassword = process.env.PGPASSWORD || '1234';
  const pgHost = process.env.PGHOST || '127.0.0.1';
  const pgPort = parseInt(process.env.PGPORT || '5432', 10);

  const rootClient = new Client({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: pgPassword,
    database: 'postgres'
  });

  await rootClient.connect();
  const dbCheck = await rootClient.query("SELECT 1 FROM pg_database WHERE datname = 'smart_attendance'");
  if (dbCheck.rows.length === 0) {
    await rootClient.query('CREATE DATABASE smart_attendance');
    console.log('Created database smart_attendance');
  } else {
    console.log('Database smart_attendance already exists');
  }
  await rootClient.end();

  console.log('Connecting to smart_attendance database...');
  const dbClient = new Client({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: pgPassword,
    database: 'smart_attendance'
  });

  await dbClient.connect();

  const schemaSqlPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');

  console.log('Applying schema from database/schema.sql...');
  await dbClient.query(schemaSql);
  console.log('Schema applied successfully!');

  // Check / seed demo accounts
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const lecturerHash = await bcrypt.hash('Lecturer@123', 10);
  const studentHash = await bcrypt.hash('Student@123', 10);

  // Admin
  await dbClient.query(`
    INSERT INTO users (name, email, password, role, must_change_password)
    VALUES ('System Admin', 'admin@university.edu', $1, 'admin', FALSE)
    ON CONFLICT (email) DO UPDATE SET password = $1, must_change_password = FALSE
  `, [adminHash]);

  // Lecturer
  const lectRes = await dbClient.query(`
    INSERT INTO users (name, email, password, role, must_change_password)
    VALUES ('Dr. John Doe', 'lecturer@university.edu', $1, 'lecturer', FALSE)
    ON CONFLICT (email) DO UPDATE SET password = $1, must_change_password = FALSE
    RETURNING id
  `, [lecturerHash]);
  const lecturerId = lectRes.rows[0].id;

  // Student
  const studRes = await dbClient.query(`
    INSERT INTO users (name, email, password, role, matric_number, must_change_password)
    VALUES ('Jane Smith', 'student@university.edu', $1, 'student', 'STU/2026/001', FALSE)
    ON CONFLICT (email) DO UPDATE SET password = $1, must_change_password = FALSE
    RETURNING id
  `, [studentHash]);
  const studentId = studRes.rows[0].id;

  // Demo Course
  const courseRes = await dbClient.query(`
    INSERT INTO courses (code, title, lecturer_id)
    VALUES ('CS101', 'Introduction to Computer Science', $1)
    ON CONFLICT (code) DO UPDATE SET lecturer_id = $1
    RETURNING id
  `, [lecturerId]);
  const courseId = courseRes.rows[0].id;

  // Enrollment
  await dbClient.query(`
    INSERT INTO enrollments (student_id, course_id)
    VALUES ($1, $2)
    ON CONFLICT (student_id, course_id) DO NOTHING
  `, [studentId, courseId]);

  console.log('Demo accounts, courses, and enrollments created successfully!');
  await dbClient.end();
}

setup().then(() => {
  console.log('Local PostgreSQL setup complete!');
  process.exit(0);
}).catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
