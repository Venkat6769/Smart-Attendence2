/**
 * src/App.jsx
 * Main router configuration for the Smart Attendance System.
 * Defines all routes and wraps role-specific pages in ProtectedRoute.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Shared
import Login           from './pages/Login';
import ProtectedRoute  from './components/ProtectedRoute';
import Layout          from './components/Layout';

// Admin pages
import AdminDashboard  from './pages/admin/AdminDashboard';
import Users           from './pages/admin/Users';
import Courses         from './pages/admin/Courses';
import Enrollments     from './pages/admin/Enrollments';
import FlaggedStudents from './pages/admin/FlaggedStudents';

// Lecturer pages
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import LecturerCourses   from './pages/lecturer/Courses';
import Sessions          from './pages/lecturer/Sessions';
import Reports           from './pages/lecturer/Reports';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourses   from './pages/student/Courses';
import ScanQR           from './pages/student/ScanQR';
import Attendance       from './pages/student/Attendance';

export default function App() {
  const { user } = useAuth();

  // Redirect root path to the correct dashboard based on role
  function RootRedirect() {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin')    return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'lecturer') return <Navigate to="/lecturer/dashboard" replace />;
    if (user.role === 'student')  return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Admin routes */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<Layout />}>
          <Route path="/admin/dashboard"       element={<AdminDashboard />} />
          <Route path="/admin/users"           element={<Users />} />
          <Route path="/admin/courses"         element={<Courses />} />
          <Route path="/admin/enrollments"     element={<Enrollments />} />
          <Route path="/admin/flagged"         element={<FlaggedStudents />} />
        </Route>
      </Route>

      {/* Lecturer routes */}
      <Route element={<ProtectedRoute role="lecturer" />}>
        <Route element={<Layout />}>
          <Route path="/lecturer/dashboard"    element={<LecturerDashboard />} />
          <Route path="/lecturer/courses"      element={<LecturerCourses />} />
          <Route path="/lecturer/sessions"     element={<Sessions />} />
          <Route path="/lecturer/reports"      element={<Reports />} />
        </Route>
      </Route>

      {/* Student routes */}
      <Route element={<ProtectedRoute role="student" />}>
        <Route element={<Layout />}>
          <Route path="/student/dashboard"     element={<StudentDashboard />} />
          <Route path="/student/courses"       element={<StudentCourses />} />
          <Route path="/student/scan"          element={<ScanQR />} />
          <Route path="/student/attendance"    element={<Attendance />} />
        </Route>
      </Route>

      {/* Fallback for unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
