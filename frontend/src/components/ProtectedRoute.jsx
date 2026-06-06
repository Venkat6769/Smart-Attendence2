/**
 * src/components/ProtectedRoute.jsx
 * Guards routes so only authenticated users with the correct role can access them.
 * Redirects to /login if not authenticated, or to the user's own dashboard if wrong role.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — renders child routes only if the user is authenticated and has the right role
 * @param {string} role - the required role ('admin', 'lecturer', or 'student')
 */
export default function ProtectedRoute({ role }) {
  const { user, isAuthenticated } = useAuth();

  // Not logged in — redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role — redirect to their own dashboard
  if (role && user?.role !== role) {
    const dashboardMap = {
      admin:    '/admin/dashboard',
      lecturer: '/lecturer/dashboard',
      student:  '/student/dashboard',
    };
    return <Navigate to={dashboardMap[user?.role] || '/login'} replace />;
  }

  // Correct role — render the child route
  return <Outlet />;
}
