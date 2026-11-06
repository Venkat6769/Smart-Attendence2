/**
 * src/pages/lecturer/Sessions.jsx
 * Lecturer session management page.
 * Allows starting a session (which generates a QR code) and ending it.
 * Displays the QR code with a countdown timer when a session is active.
 * Also allows manual attendance overrides per session.
 */

import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import QRDisplay from '../../components/QRDisplay';
import LoadingSpinner from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/AttendanceTable';
import usePolling from '../../hooks/usePolling';
import { Radio, X } from 'lucide-react';

export default function Sessions() {
  const [courses,       setCourses]       = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessions,      setSessions]      = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [qrCode,        setQrCode]        = useState('');
  const [loading,       setLoading]       = useState(false);
  const [starting,      setStarting]      = useState(false);
  const [ending,        setEnding]        = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');

  // Manual override modal state
  const [overrideSession, setOverrideSession] = useState(null);
  const [overrideRecords, setOverrideRecords] = useState([]);
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Live attendance count for the active session
  const [liveCount, setLiveCount] = useState({ present: 0, total: 0 });

  // Load lecturer's courses on mount
  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await api.get('/api/lecturer/courses');
        setCourses(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedCourse(res.data.data[0].id);
        }
      } catch {
        setError('Failed to load courses.');
      }
    }
    fetchCourses();
  }, []);

  // Load sessions for the selected course
  const fetchSessions = useCallback(async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/sessions/${selectedCourse}/list`);
      const all = res.data.data;
      setSessions(all);

      // If there's an active session, automatically regenerate its QR code
      const active = all.find(s => s.status === 'active');
      if (active) {
        // If expired, clear activeSession so "Start Session" button is immediately available
        const isExpired = new Date(active.expires_at) <= new Date();
        if (isExpired) {
          setActiveSession(null);
          setQrCode('');
        } else {
          setActiveSession(active);
          try {
            // Fetch the QR from the backend using the stored session token
            const qrRes = await api.get(`/api/sessions/${active.id}/qr`);
            setQrCode(qrRes.data.data.qrCode);
          } catch {
            setActiveSession(null);
            setQrCode('');
          }
        }
      } else {
        setActiveSession(null);
        setQrCode('');
      }
    } catch {
      setError('Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Poll live attendance count every 8 seconds while a session is active
  usePolling(async () => {
    if (!activeSession) return;
    try {
      const res = await api.get(`/api/sessions/${selectedCourse}/list`);
      const active = res.data.data.find(s => s.status === 'active');
      if (active) {
        setLiveCount({
          present: parseInt(active.present_count, 10),
          total:   parseInt(active.present_count, 10) + parseInt(active.absent_count, 10),
        });
        // Silently refresh the full list so history stays up to date too
        setSessions(res.data.data);
      }
    } catch { /* silent — don't show error for background polls */ }
  }, 8000, !!activeSession);

  async function handleStartSession() {
    setError('');
    setSuccess('');
    setStarting(true);
    try {
      const res = await api.post('/api/sessions/start', { course_id: selectedCourse });
      const { session, qrCode: newQR } = res.data.data;
      setActiveSession(session);
      setQrCode(newQR);
      setSuccess('Session started! Students can now scan the QR code.');
      // Refresh session history list silently without re-running fetchSessions()
      const listRes = await api.get(`/api/sessions/${selectedCourse}/list`);
      setSessions(listRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start session.');
    } finally {
      setStarting(false);
    }
  }

  // Refresh the rotating QR code every 5 seconds
  const handleRefreshQR = useCallback(async () => {
    if (!activeSession) return;
    try {
      const res = await api.get(`/api/sessions/${activeSession.id}/qr`);
      const { qrCode: newQR, token: newToken } = res.data.data;
      setQrCode(newQR);
      if (newToken) {
        setActiveSession((prev) => (prev ? { ...prev, token: newToken } : null));
      }
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        fetchSessions();
      }
    }
  }, [activeSession, fetchSessions]);

  async function handleEndSession() {
    if (!activeSession) return;
    setEnding(true);
    setError('');
    try {
      const res = await api.post(`/api/sessions/${activeSession.id}/end`);
      const { absentMarked, presentCount } = res.data.data;
      setActiveSession(null);
      setQrCode('');
      setSuccess(`Session closed. ${presentCount} present, ${absentMarked} marked absent.`);
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to end session.');
    } finally {
      setEnding(false);
    }
  }

  // Load attendance records for the manual override modal
  async function openOverride(session) {
    setOverrideSession(session);
    setOverrideLoading(true);
    try {
      const res = await api.get(`/api/reports/session/${session.id}`);
      setOverrideRecords(res.data.data.records);
    } catch {
      setOverrideRecords([]);
    } finally {
      setOverrideLoading(false);
    }
  }

  async function handleOverride(studentId, status) {
    try {
      await api.patch('/api/attendance/manual', {
        student_id: studentId,
        session_id: overrideSession.id,
        status,
      });
      // Refresh the modal records
      const res = await api.get(`/api/reports/session/${overrideSession.id}`);
      setOverrideRecords(res.data.data.records);
      setSuccess('Attendance updated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update attendance.');
    }
  }

  const courseObj = courses.find(c => c.id === selectedCourse);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">Sessions</h1>
        <p className="text-sm text-gray-500 mt-1">Start a session to generate a QR code for student attendance</p>
      </div>

      {error   && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>}

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

      {/* QR display / session controls */}
      <div className="bg-white border border-violet-xlight rounded-2xl p-6 mb-6">
        {activeSession && qrCode ? (
          // Active session with QR code
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-plum-950">Session Active</h2>
                <p className="text-xs text-gray-400">
                  Started {new Date(activeSession.created_at).toLocaleTimeString()}
                </p>
                {/* Live attendance counter — updates every 8 seconds */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    {liveCount.present} scanned
                  </span>
                  <span className="text-xs text-gray-400">live · updates every 8s</span>
                </div>
              </div>
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-600 disabled:opacity-60 transition-colors"
              >
                {ending ? 'Ending...' : 'End Session'}
              </button>
            </div>
            <QRDisplay
              qrCode={qrCode}
              expiresAt={activeSession.expires_at}
              courseCode={courseObj?.code}
              isClosed={false}
              token={activeSession.token}
              onRefresh={handleRefreshQR}
              refreshInterval={5}
            />
          </div>
        ) : activeSession && !qrCode ? (
          // Active session found but QR has expired or is unavailable
          <div className="text-center py-8">
            <h2 className="font-heading text-lg font-semibold text-plum-950 mb-2">Previous Session Expired</h2>
            <p className="text-sm text-gray-500 mb-6">
              This session has expired. Close it to finalize attendance and start a new session.
            </p>
            <button
              onClick={handleEndSession}
              disabled={ending}
              className="bg-rose-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-600 disabled:opacity-60 transition-colors"
            >
              {ending ? 'Closing...' : 'Close & Finalize Session'}
            </button>
          </div>
        ) : (
          // No active session
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-violet-xlight rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Radio size={28} className="text-violet" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-plum-950 mb-2">No Active Session</h2>
            <p className="text-sm text-gray-500 mb-6">
              Start a session to generate a QR code for {courseObj?.title || 'this course'}.
            </p>
            <button
              onClick={handleStartSession}
              disabled={starting || !selectedCourse}
              className="bg-violet text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-plum-900 disabled:opacity-60 transition-colors"
            >
              {starting ? 'Generating QR...' : 'Start Session'}
            </button>
          </div>
        )}
      </div>

      {/* Past sessions list */}
      <h2 className="font-heading text-lg font-semibold text-plum-950 mb-4">Session History</h2>

      {loading ? <LoadingSpinner /> : (
        sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No sessions yet. Start one to generate a QR code.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div key={session.id} className="bg-white border border-violet-xlight rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={session.status} />
                    <span className="text-sm font-medium text-plum-950">
                      {new Date(session.session_date).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Present: <strong className="text-emerald-600">{session.present_count}</strong>
                    {' '} · Absent: <strong className="text-rose-500">{session.absent_count}</strong>
                  </p>
                </div>
                {session.status === 'closed' && (
                  <button
                    onClick={() => openOverride(session)}
                    className="text-xs text-violet font-semibold hover:underline border border-violet-xlight px-3 py-1.5 rounded-lg"
                  >
                    Override Attendance
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Manual override modal */}
      {overrideSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-violet-xlight flex items-center justify-between">
              <h3 className="font-heading font-semibold text-plum-950">Override Attendance</h3>
              <button onClick={() => setOverrideSession(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {overrideLoading ? <LoadingSpinner /> : (
                <div className="space-y-2">
                  {overrideRecords.map(rec => (
                    <div key={rec.student_id} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-plum-950">{rec.name}</p>
                        <p className="text-xs text-gray-400">{rec.matric_number || rec.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={rec.status} />
                        <button
                          onClick={() => handleOverride(rec.student_id, rec.status === 'present' ? 'absent' : 'present')}
                          className="text-xs text-violet font-semibold hover:underline"
                        >
                          Toggle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-violet-xlight">
              <button
                onClick={() => setOverrideSession(null)}
                className="w-full bg-violet text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-plum-900 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
