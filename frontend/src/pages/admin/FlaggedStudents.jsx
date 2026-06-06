/**
 * src/pages/admin/FlaggedStudents.jsx
 * Admin page showing all students whose attendance in any course is below 75%.
 */

import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import AttendanceTable from '../../components/AttendanceTable';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function FlaggedStudents() {
  const [flagged,  setFlagged]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    async function fetchFlagged() {
      try {
        const res = await api.get('/api/students/flagged');
        setFlagged(res.data.data);
      } catch {
        setError('Failed to load flagged students.');
      } finally {
        setLoading(false);
      }
    }
    fetchFlagged();
  }, []);

  const filtered = flagged.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.course_code.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'name',         label: 'Student Name' },
    { key: 'matric_number', label: 'Matric No.' },
    {
      key:    'course_code',
      label:  'Course',
      render: row => (
        <span>
          <span className="font-semibold">{row.course_code}</span>
          <span className="text-gray-500 ml-2 text-xs">{row.course_title}</span>
        </span>
      ),
    },
    {
      key:    'present_count',
      label:  'Present / Total',
      render: row => `${row.present_count} / ${row.total_sessions}`,
    },
    {
      key:    'percentage',
      label:  'Attendance %',
      render: row => (
        <span className="font-bold text-rose-600">{row.percentage}%</span>
      ),
    },
    {
      key:    'status',
      label:  'Status',
      render: () => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          AT RISK
        </span>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">Flagged Students</h1>
        <p className="text-sm text-gray-500 mt-1">
          Students with attendance below 75% — {flagged.length} record{flagged.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {flagged.length === 0 && !loading && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center mb-6">
          <CheckCircle2 size={32} className="text-emerald-500 mb-2 mx-auto" />
          <p className="font-semibold text-emerald-700">All students are above 75% attendance.</p>
          <p className="text-sm text-emerald-600 mt-1">No flags at this time.</p>
        </div>
      )}

      {flagged.length > 0 && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
            <AlertTriangle size={16} className="inline mr-1 align-text-bottom text-amber-600" /><strong>{flagged.length}</strong> student-course combination{flagged.length !== 1 ? 's are' : ' is'} flagged for low attendance.
            Students risk exam barment if attendance is not improved.
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or course code..."
              className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
            />
          </div>

          <AttendanceTable rows={filtered} columns={columns} emptyMessage="No matching records." />
        </>
      )}
    </div>
  );
}
