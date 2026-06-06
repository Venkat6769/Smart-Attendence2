/**
 * src/pages/lecturer/Reports.jsx
 * Attendance reports for the lecturer — course summary and per-session view.
 * Includes a PDF download button.
 */

import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import AttendanceTable, { StatusBadge } from '../../components/AttendanceTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Download, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Reports() {
  const [courses,       setCourses]       = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [report,        setReport]        = useState(null);
  const [sessions,      setSessions]      = useState([]);
  const [sessionReport, setSessionReport] = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [error,         setError]         = useState('');
  const [view,          setView]          = useState('course'); // 'course' | 'session'

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await api.get('/api/lecturer/courses');
        setCourses(res.data.data);
        if (res.data.data.length > 0) setSelectedCourse(res.data.data[0].id);
      } catch {
        setError('Failed to load courses.');
      }
    }
    fetchCourses();
  }, []);

  // Load course report when course changes
  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    setReport(null);
    setError('');

    async function fetchReport() {
      try {
        const [rRes, sRes] = await Promise.all([
          api.get(`/api/reports/course/${selectedCourse}`),
          api.get(`/api/sessions/${selectedCourse}/list`),
        ]);
        setReport(rRes.data.data);
        setSessions(sRes.data.data.filter(s => s.status === 'closed'));
      } catch {
        setError('Failed to load report.');
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [selectedCourse]);

  async function loadSessionReport(sessionId) {
    setLoading(true);
    setSessionReport(null);
    try {
      const res = await api.get(`/api/reports/session/${sessionId}`);
      setSessionReport(res.data.data);
      setView('session');
    } catch {
      setError('Failed to load session report.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF() {
    setPdfLoading(true);
    try {
      const res = await api.get(`/api/reports/course/${selectedCourse}/pdf`, {
        responseType: 'blob',
      });

      // Create a temporary download link
      const url      = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link     = document.createElement('a');
      const course   = courses.find(c => c.id === selectedCourse);
      link.href      = url;
      link.download  = `report-${course?.code || 'course'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF.');
    } finally {
      setPdfLoading(false);
    }
  }

  const courseColumns = [
    { key: 'name',          label: 'Student Name' },
    { key: 'matric_number', label: 'Matric No.' },
    {
      key:    'present',
      label:  'Present / Total',
      render: row => `${row.present} / ${row.total}`,
    },
    {
      key:    'percentage',
      label:  'Attendance %',
      render: row => (
        <span className={`font-bold ${row.flagged ? 'text-rose-500' : 'text-emerald-600'}`}>
          {row.percentage}%
        </span>
      ),
    },
    {
      key:    'status',
      label:  'Status',
      render: row => <StatusBadge status={row.status.toLowerCase().replace(' ', '-')} />,
    },
  ];

  const sessionColumns = [
    { key: 'name',              label: 'Student' },
    { key: 'matric_number',     label: 'Matric No.' },
    { key: 'attendance_status', label: 'Status', render: row => <StatusBadge status={row.status} /> },
    {
      key:    'scanned_at',
      label:  'Scanned At',
      render: row => row.scanned_at
        ? new Date(row.scanned_at).toLocaleTimeString()
        : '—',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">Attendance Reports</h1>
        <p className="text-sm text-gray-500 mt-1">View and download attendance data for your courses</p>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {/* Controls */}
      <div className="bg-white border border-violet-xlight rounded-xl p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-semibold text-plum-950 mb-2">Course</label>
          <select
            value={selectedCourse}
            onChange={e => { setSelectedCourse(e.target.value); setView('course'); }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet min-w-[220px]"
          >
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </select>
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setView('course')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${view === 'course' ? 'bg-violet text-white' : 'border border-violet-xlight text-violet hover:bg-violet-xlight'}`}
          >
            Course Summary
          </button>
          <button
            onClick={downloadPDF}
            disabled={pdfLoading || !selectedCourse}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-plum-950 text-white hover:bg-plum-900 disabled:opacity-60 transition-colors"
          >
            {pdfLoading ? 'Generating...' : <><Download size={16} /> Download PDF</>}
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Course summary report */}
          {view === 'course' && report && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold text-plum-950">
                  {report.course.code} — {report.course.title}
                </h2>
                <span className="text-sm text-gray-500">{report.total_sessions} session{report.total_sessions !== 1 ? 's' : ''}</span>
              </div>
              <AttendanceTable
                rows={report.rows}
                columns={courseColumns}
                emptyMessage="No students enrolled in this course."
              />

              {/* Per-session breakdown */}
              {sessions.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-heading text-base font-semibold text-plum-950 mb-3">Session Breakdown</h3>
                  <div className="space-y-2">
                    {sessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => loadSessionReport(s.id)}
                        className="w-full text-left bg-white border border-violet-xlight rounded-xl px-5 py-3 hover:border-violet hover:bg-violet-xlight transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-plum-950">
                          {new Date(s.session_date).toLocaleDateString('en-GB', {
                            weekday: 'long', day: 'numeric', month: 'long',
                          })}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Check size={12} className="text-emerald-600" /> {s.present_count}
                          <span>·</span>
                          <X size={12} className="text-rose-500" /> {s.absent_count}
                          <ChevronRight size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Single session report */}
          {view === 'session' && sessionReport && (
            <div>
              <button
                onClick={() => setView('course')}
                className="text-sm text-violet font-semibold mb-4 hover:underline"
              >
                <ChevronLeft size={16} className="inline mr-1" /> Back to Course Summary
              </button>
              <h2 className="font-heading text-lg font-semibold text-plum-950 mb-1">
                Session — {new Date(sessionReport.session.session_date).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{sessionReport.session.course_title}</p>
              <AttendanceTable
                rows={sessionReport.records}
                columns={[
                  { key: 'name',          label: 'Student' },
                  { key: 'matric_number', label: 'Matric No.' },
                  { key: 'status',        label: 'Status', render: row => <StatusBadge status={row.status} /> },
                  {
                    key:    'scanned_at',
                    label:  'Scanned At',
                    render: row => row.scanned_at ? new Date(row.scanned_at).toLocaleTimeString() : '—',
                  },
                ]}
                emptyMessage="No records for this session."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
