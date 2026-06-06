/**
 * src/pages/lecturer/Courses.jsx
 * Lecturer's view of their assigned courses with enrollment counts.
 */

import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BookOpen } from 'lucide-react';

export default function LecturerCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await api.get('/api/lecturer/courses');
        setCourses(res.data.data);
      } catch {
        setError('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">My Courses</h1>
        <p className="text-sm text-gray-500 mt-1">Courses assigned to you by the administrator</p>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {courses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen size={48} className="text-gray-300 mb-4 mx-auto" />
          <p className="font-semibold">No courses assigned yet.</p>
          <p className="text-sm mt-1">Contact the system administrator to get courses assigned.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(course => (
            <div key={course.id} className="bg-white border border-violet-xlight rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="font-heading text-xs font-bold bg-violet-xlight text-violet px-3 py-1 rounded-full">
                  {course.code}
                </span>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                  {course.enrolled_count || 0} enrolled
                </span>
              </div>
              <h2 className="font-heading text-base font-semibold text-plum-950 mb-2">{course.title}</h2>
              <p className="text-xs text-gray-400">
                Created {new Date(course.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
