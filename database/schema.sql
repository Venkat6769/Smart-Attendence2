-- =============================================================
-- Smart Attendance System - Database Schema
-- Run this file in the Supabase SQL Editor to set up your database.
-- Tables: users, courses, enrollments, attendance_sessions, attendance
-- =============================================================

-- Enable UUID generation extension (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- USERS
-- Stores all system users: admin, lecturer, and student roles
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255)  NOT NULL,
  email            VARCHAR(255)  UNIQUE NOT NULL,
  password         VARCHAR(255)  NOT NULL,                    -- bcrypt hashed
  role             VARCHAR(50)   NOT NULL CHECK (role IN ('admin', 'lecturer', 'student')),
  matric_number    VARCHAR(100),                              -- only populated for students
  must_change_password BOOLEAN   DEFAULT TRUE,               -- force password change on first login
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- COURSES
-- University courses that lecturers teach and students enroll in
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(50)   UNIQUE NOT NULL,                -- e.g. CS301
  title        VARCHAR(255)  NOT NULL,                       -- e.g. Database Systems
  lecturer_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- ENROLLMENTS
-- Links students to courses. Each student can only enroll once
-- per course (enforced by the UNIQUE constraint).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id    UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- ---------------------------------------------------------------
-- ATTENDANCE SESSIONS
-- Each class session created by a lecturer. Holds the QR token
-- and tracks whether the session is still active or has been closed.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  token         VARCHAR(255)  UNIQUE NOT NULL,               -- UUID token embedded in QR code
  session_date  DATE          DEFAULT CURRENT_DATE,
  status        VARCHAR(50)   DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  expires_at    TIMESTAMPTZ   NOT NULL,                      -- NOW() + 30 minutes when created
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  closed_at     TIMESTAMPTZ                                  -- set when lecturer ends the session
);

-- ---------------------------------------------------------------
-- ATTENDANCE
-- Records each student's attendance for a specific session.
-- Status is either 'present' (scanned QR) or 'absent' (auto-set on close).
-- A student can only have ONE record per session (UNIQUE constraint).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id  UUID          NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  status      VARCHAR(50)   NOT NULL CHECK (status IN ('present', 'absent')),
  scanned_at  TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(student_id, session_id)
);

-- ---------------------------------------------------------------
-- INDEXES
-- Speed up the most common queries in the application
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role          ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_lecturer    ON courses(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course     ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token      ON attendance_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student  ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session  ON attendance(session_id);

-- ---------------------------------------------------------------
-- SEED DATA
-- Default admin account. Password is: Admin@123
-- Run `node backend/db/seed.js` to insert this with a proper bcrypt hash.
-- Alternatively, insert manually after hashing the password yourself.
-- ---------------------------------------------------------------
-- The seed.js script will handle the admin user creation securely.
