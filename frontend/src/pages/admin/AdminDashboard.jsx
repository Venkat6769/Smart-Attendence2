/**
 * src/pages/admin/AdminDashboard.jsx
 * Admin overview dashboard showing system-wide statistics:
 * total users, courses, enrollments, and flagged students.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Users, GraduationCap, BookOpen, ClipboardList, AlertTriangle, User } from 'lucide-react';

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch all the data needed for the dashboard in parallel
        const [usersRes, coursesRes, enrollmentsRes, flaggedRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/courses'),
          api.get('/api/enrollments'),
          api.get('/api/students/flagged'),
        ]);

        const users   = usersRes.data.data;
        setStats({
          totalUsers:    users.length,
          lecturers:     users.filter(u => u.role === 'lecturer').length,
          students:      users.filter(u => u.role === 'student').length,
          courses:       coursesRes.data.data.length,
          enrollments:   enrollmentsRes.data.data.length,
          flaggedCount:  flaggedRes.data.data.length,
        });
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">System overview and quick access to management tools</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatsCard label="Total Users"    value={stats.totalUsers}   icon={Users}         color="violet" />
            <StatsCard label="Lecturers"      value={stats.lecturers}    icon={GraduationCap} color="plum" />
            <StatsCard label="Students"       value={stats.students}     icon={GraduationCap} color="plum" />
            <StatsCard label="Courses"        value={stats.courses}      icon={BookOpen}      color="violet" />
            <StatsCard label="Enrollments"    value={stats.enrollments}  icon={ClipboardList} color="success" />
            <StatsCard
              label="Flagged Students"
              value={stats.flaggedCount}
              icon={AlertTriangle}
              color={stats.flaggedCount > 0 ? 'warning' : 'success'}
              sub={stats.flaggedCount > 0 ? 'below 75% attendance' : 'All students on track'}
            />
          </div>

          {/* Quick links */}
          <h2 className="font-heading text-lg font-semibold text-plum-950 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { to: '/admin/users',       icon: User,           label: 'Create User' },
              { to: '/admin/courses',     icon: BookOpen,       label: 'Add Course' },
              { to: '/admin/enrollments', icon: ClipboardList,  label: 'Enroll Student' },
              { to: '/admin/flagged',     icon: AlertTriangle,  label: 'View Flagged' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="bg-white border border-violet-xlight rounded-xl p-5 flex flex-col items-center gap-2 text-center hover:border-violet hover:shadow-sm transition-all"
              >
                <link.icon size={28} className="text-plum-950" />
                <span className="text-sm font-semibold text-plum-950">{link.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
