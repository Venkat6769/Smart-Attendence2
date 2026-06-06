/**
 * src/pages/student/StudentDashboard.jsx
 * Student overview dashboard — shows enrolled courses, attendance percentages,
 * and a warning banner for courses below 75%.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import WarningBanner from '../../components/WarningBanner';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import usePolling from '../../hooks/usePolling';
import { BookOpen, BarChart2, AlertTriangle, Inbox, Camera } from 'lucide-react';

export default function StudentDashboard() {
  const { user }    = useAuth();
  const [courses,   setCourses]   = useState([]);
  const [warnings,  setWarnings]  = useState([]);
  const [percents,  setPercents]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      const [cRes, wRes] = await Promise.all([
        api.get('/api/student/courses'),
        api.get('/api/attendance/warnings'),
      ]);

      const courseList = cRes.data.data;
      setCourses(courseList);
      setWarnings(wRes.data.data);

      const percentResults = await Promise.all(
        courseList.map(c =>
          api.get(`/api/attendance/percentage/${c.id}`)
            .then(r => ({ id: c.id, ...r.data.data }))
            .catch(() => ({ id: c.id, percentage: 0, total_sessions: 0, present_count: 0 }))
        )
      );

      const percentMap = {};
      percentResults.forEach(p => { percentMap[p.id] = p; });
      setPercents(percentMap);
      setLastUpdated(new Date());
    } catch {
      if (!silent) setError('Failed to load dashboard.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 20 seconds so attendance updates without manual refresh
  usePolling(() => fetchData(true), 20000, true);

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  const avgPercent = courses.length > 0
    ? Math.round(Object.values(percents).reduce((s, p) => s + (p.percentage || 0), 0) / courses.length)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">
          Hi, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's your attendance overview</p>
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
            Live · updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        )}
      </div>

      {/* Warning banner — shown prominently if any course is below 75% */}
      <WarningBanner warnings={warnings} />

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatsCard label="Enrolled Courses"   value={courses.length}    icon={BookOpen}      color="violet" />
        <StatsCard label="Avg. Attendance"    value={`${avgPercent}%`}  icon={BarChart2}     color={avgPercent >= 75 ? 'success' : 'warning'} />
        <StatsCard label="Courses At Risk"    value={warnings.length}   icon={AlertTriangle} color={warnings.length > 0 ? 'warning' : 'success'} />
      </div>

      {/* Course attendance cards */}
      <h2 className="font-heading text-lg font-semibold text-plum-950 mb-4">Your Courses</h2>

      {courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Inbox size={48} className="text-gray-300 mb-3 mx-auto" />
          <p className="font-semibold">You are not enrolled in any courses.</p>
          <p className="text-sm mt-1">Contact the administrator to enroll you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => {
            const p = percents[course.id] || { percentage: 0, total_sessions: 0, present_count: 0 };
            const isFlagged = p.percentage < 75 && p.total_sessions > 0;

            return (
              <div
                key={course.id}
                className={`bg-white border rounded-2xl p-5 ${isFlagged ? 'border-amber-300' : 'border-violet-xlight'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold bg-violet-xlight text-violet px-2.5 py-1 rounded-full">
                    {course.code}
                  </span>
                  {isFlagged && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <AlertTriangle size={11} /> At Risk
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-semibold text-plum-950 text-sm mb-1">{course.title}</h3>
                <p className="text-xs text-gray-400 mb-4">by {course.lecturer_name || 'Unassigned'}</p>

                {/* Attendance progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{p.present_count}/{p.total_sessions} sessions</span>
                    <span className={`font-bold ${isFlagged ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {p.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isFlagged ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(p.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <Link
                  to="/student/attendance"
                  className="block text-center text-xs font-semibold text-violet hover:underline"
                >
                  View details →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Scan CTA */}
      {courses.length > 0 && (
        <div className="mt-8 bg-plum-950 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-white font-semibold">Ready to attend a class?</h3>
            <p className="text-violet-light text-sm mt-1 opacity-80">Open your camera and scan the lecturer's QR code</p>
          </div>
          <Link
            to="/student/scan"
            className="bg-violet text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-plum-800 transition-colors flex-shrink-0 flex items-center gap-2"
          >
            <Camera size={16} /> Scan QR
          </Link>
        </div>
      )}
    </div>
  );
}
