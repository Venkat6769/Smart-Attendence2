/**
 * src/pages/lecturer/LecturerDashboard.jsx
 * Lecturer overview — shows assigned courses and recent session activity.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, GraduationCap, Radio } from 'lucide-react';

export default function LecturerDashboard() {
  const { user }  = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get('/api/lecturer/courses');
        setCourses(res.data.data);
      } catch {
        setError('Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">
          Welcome, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Lecturer Portal — manage your courses and sessions</p>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatsCard label="Assigned Courses"    value={courses.length}                              icon={BookOpen}      color="violet" />
        <StatsCard label="Total Students"      value={courses.reduce((s, c) => s + parseInt(c.enrolled_count || 0), 0)} icon={GraduationCap} color="plum" />
        <StatsCard label="Quick Action"        value="Start Session"                               icon={Radio}         color="success" sub="Go to Sessions tab" />
      </div>

      {/* Course list */}
      <h2 className="font-heading text-lg font-semibold text-plum-950 mb-4">Your Courses</h2>

      {courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={40} className="text-gray-300 mb-3 mx-auto" />
          <p className="text-sm">No courses assigned yet. Contact your administrator.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <div key={course.id} className="bg-white border border-violet-xlight rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold bg-violet-xlight text-violet px-2.5 py-1 rounded-full">
                  {course.code}
                </span>
                <span className="text-xs text-gray-400">{course.enrolled_count} students</span>
              </div>
              <h3 className="font-heading font-semibold text-plum-950 text-sm mb-3">{course.title}</h3>
              <div className="flex gap-2">
                <Link
                  to="/lecturer/sessions"
                  className="flex-1 text-center bg-violet text-white text-xs py-2 rounded-lg font-semibold hover:bg-plum-900 transition-colors"
                >
                  Sessions
                </Link>
                <Link
                  to="/lecturer/reports"
                  className="flex-1 text-center border border-violet-xlight text-violet text-xs py-2 rounded-lg font-semibold hover:bg-violet-xlight transition-colors"
                >
                  Reports
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
