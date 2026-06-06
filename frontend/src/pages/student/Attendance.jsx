/**
 * src/pages/student/Attendance.jsx
 * Student attendance history page — shows attendance per course,
 * including session-by-session breakdown and overall percentage.
 */

import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import AttendanceTable, { StatusBadge } from '../../components/AttendanceTable';
import WarningBanner from '../../components/WarningBanner';
import LoadingSpinner from '../../components/LoadingSpinner';
import usePolling from '../../hooks/usePolling';
import { Inbox, AlertTriangle, Check } from 'lucide-react';

export default function Attendance() {
  const [courses,        setCourses]        = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [history,        setHistory]        = useState([]);
  const [percentage,     setPercentage]     = useState(null);
  const [warnings,       setWarnings]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [histLoading,    setHistLoading]    = useState(false);
  const [error,          setError]          = useState('');

  // Load courses and warnings on mount
  useEffect(() => {
    async function fetchBase() {
      try {
        const [cRes, wRes] = await Promise.all([
          api.get('/api/student/courses'),
          api.get('/api/attendance/warnings'),
        ]);
        setCourses(cRes.data.data);
        setWarnings(wRes.data.data);
        if (cRes.data.data.length > 0) {
          setSelectedCourse(cRes.data.data[0].id);
        }
      } catch {
        setError('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    }
    fetchBase();
  }, []);

  // Load history and percentage when selected course changes
  const fetchHistory = useCallback(async (silent = false) => {
    if (!selectedCourse) return;
    if (!silent) setHistLoading(true);
    try {
      const [hRes, pRes] = await Promise.all([
        api.get(`/api/attendance/history/${selectedCourse}`),
        api.get(`/api/attendance/percentage/${selectedCourse}`),
      ]);
      setHistory(hRes.data.data);
      setPercentage(pRes.data.data);
    } catch {
      if (!silent) setError('Failed to load attendance history.');
    } finally {
      if (!silent) setHistLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Refresh every 15 seconds so new attendance records appear automatically
  usePolling(() => fetchHistory(true), 15000, !!selectedCourse);

  const historyColumns = [
    {
      key:    'session_date',
      label:  'Date',
      render: row => new Date(row.session_date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      }),
    },
    {
      key:    'attendance_status',
      label:  'Status',
      render: row => <StatusBadge status={row.attendance_status} />,
    },
    {
      key:    'scanned_at',
      label:  'Scanned At',
      render: row => row.scanned_at
        ? new Date(row.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—',
    },
  ];

  if (loading) return <LoadingSpinner />;

  const courseObj = courses.find(c => c.id === selectedCourse);
  const isFlagged = percentage && percentage.percentage < 75 && percentage.total_sessions > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">Attendance History</h1>
        <p className="text-sm text-gray-500 mt-1">Session-by-session attendance for your enrolled courses</p>
      </div>

      {/* Warning banner */}
      <WarningBanner warnings={warnings} />

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Inbox size={40} className="text-gray-300 mb-3 mx-auto" />
          <p>You are not enrolled in any courses.</p>
        </div>
      ) : (
        <>
          {/* Course selector */}
          <div className="bg-white border border-violet-xlight rounded-xl p-5 mb-6">
            <label className="block text-sm font-semibold text-plum-950 mb-2">Select Course</label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
              ))}
            </select>
          </div>

          {/* Percentage summary card */}
          {percentage && (
            <div className={`rounded-2xl p-5 mb-6 border ${isFlagged ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-heading font-semibold text-plum-950">{courseObj?.code} — {courseObj?.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {percentage.present_count} present out of {percentage.total_sessions} sessions
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-heading text-3xl font-bold ${isFlagged ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {percentage.percentage}%
                  </p>
                  {isFlagged
                    ? <p className="text-xs text-amber-600 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> Below 75% — At Risk</p>
                    : <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check size={12} /> Good Standing</p>
                  }
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${isFlagged ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(percentage.percentage, 100)}%` }}
                />
              </div>

              {/* 75% threshold marker */}
              <div className="relative mt-1">
                <div className="absolute text-xs text-gray-400" style={{ left: '75%' }}>75%</div>
              </div>
            </div>
          )}

          {/* History table */}
          <h3 className="font-heading text-base font-semibold text-plum-950 mb-4">Session History</h3>

          {histLoading ? (
            <LoadingSpinner message="Loading history..." />
          ) : (
            <AttendanceTable
              rows={history}
              columns={historyColumns}
              emptyMessage="No sessions have been held yet for this course."
            />
          )}
        </>
      )}
    </div>
  );
}
