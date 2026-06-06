/**
 * src/pages/student/Courses.jsx
 * Student's list of enrolled courses with attendance percentage for each.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Inbox, AlertTriangle } from 'lucide-react';

export default function StudentCourses() {
  const [courses,  setCourses]  = useState([]);
  const [percents, setPercents] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get('/api/student/courses');
        const list = res.data.data;
        setCourses(list);

        // Fetch percentage for each enrolled course
        const percentData = await Promise.all(
          list.map(c =>
            api.get(`/api/attendance/percentage/${c.id}`)
              .then(r => ({ id: c.id, ...r.data.data }))
              .catch(() => ({ id: c.id, percentage: 0, total_sessions: 0, present_count: 0 }))
          )
        );

        const map = {};
        percentData.forEach(p => { map[p.id] = p; });
        setPercents(map);
      } catch {
        setError('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">My Courses</h1>
        <p className="text-sm text-gray-500 mt-1">Courses you are currently enrolled in</p>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {courses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Inbox size={48} className="text-gray-300 mb-4 mx-auto" />
          <p className="font-semibold">Not enrolled in any courses yet.</p>
          <p className="text-sm mt-1">Contact the administrator to enroll you in courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map(course => {
            const p = percents[course.id] || { percentage: 0, total_sessions: 0, present_count: 0 };
            const isFlagged = p.percentage < 75 && p.total_sessions > 0;

            return (
              <div key={course.id} className={`bg-white border rounded-2xl p-6 ${isFlagged ? 'border-amber-300' : 'border-violet-xlight'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold bg-violet-xlight text-violet px-2.5 py-1 rounded-full">{course.code}</span>
                    <h2 className="font-heading text-base font-semibold text-plum-950 mt-2">{course.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Lecturer: {course.lecturer_name || 'TBA'}</p>
                  </div>
                  {isFlagged && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1"><AlertTriangle size={11} /> At Risk</span>
                  )}
                </div>

                {/* Attendance bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Attendance</span>
                    <span className={`font-bold ${isFlagged ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {p.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${isFlagged ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(p.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{p.present_count} present out of {p.total_sessions} sessions</p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to="/student/scan"
                    className="flex-1 text-center bg-violet text-white text-xs py-2 rounded-lg font-semibold hover:bg-plum-900 transition-colors"
                  >
                    Scan QR
                  </Link>
                  <Link
                    to="/student/attendance"
                    className="flex-1 text-center border border-violet-xlight text-violet text-xs py-2 rounded-lg font-semibold hover:bg-violet-xlight transition-colors"
                  >
                    View History
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
