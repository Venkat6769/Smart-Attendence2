/**
 * src/pages/admin/Enrollments.jsx
 * Admin page for enrolling students into courses and viewing all enrollments.
 */

import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import AttendanceTable from '../../components/AttendanceTable';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [students,    setStudents]    = useState([]);
  const [courses,     setCourses]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  const [form,       setForm]       = useState({ student_id: '', course_id: '' });
  const [enrolling,  setEnrolling]  = useState(false);
  const [formError,  setFormError]  = useState('');

  const [search, setSearch] = useState('');

  async function fetchData() {
    try {
      const [eRes, uRes, cRes] = await Promise.all([
        api.get('/api/enrollments'),
        api.get('/api/users'),
        api.get('/api/courses'),
      ]);
      setEnrollments(eRes.data.data);
      setStudents(uRes.data.data.filter(u => u.role === 'student'));
      setCourses(cRes.data.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleEnroll(e) {
    e.preventDefault();
    setFormError('');
    setEnrolling(true);
    try {
      await api.post('/api/enrollments', { student_id: form.student_id, course_id: form.course_id });
      setSuccess('Student enrolled successfully.');
      setForm({ student_id: '', course_id: '' });
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Enrollment failed.');
    } finally {
      setEnrolling(false);
    }
  }

  const filtered = enrollments.filter(e =>
    e.student_name.toLowerCase().includes(search.toLowerCase()) ||
    e.course_code.toLowerCase().includes(search.toLowerCase()) ||
    e.course_title.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'student_name',  label: 'Student' },
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
      key:    'enrolled_at',
      label:  'Enrolled',
      render: row => new Date(row.enrolled_at).toLocaleDateString('en-GB'),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-plum-950">Enrollments</h1>
        <p className="text-sm text-gray-500 mt-1">{enrollments.length} total enrollments</p>
      </div>

      {error   && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>}

      {/* Enroll form */}
      <div className="bg-white border border-violet-xlight rounded-xl p-6 mb-6">
        <h2 className="font-heading text-lg font-semibold text-plum-950 mb-4">Enroll a Student</h2>
        {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{formError}</div>}
        <form onSubmit={handleEnroll} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-plum-950 mb-1">Student *</label>
            <select
              value={form.student_id}
              onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
              required
            >
              <option value="">Select student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.matric_number ? `(${s.matric_number})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-plum-950 mb-1">Course *</label>
            <select
              value={form.course_id}
              onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
              required
            >
              <option value="">Select course...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={enrolling}
              className="w-full bg-violet text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-plum-900 disabled:opacity-60 transition-colors"
            >
              {enrolling ? 'Enrolling...' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by student name or course..."
          className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
        />
      </div>

      <AttendanceTable
        rows={filtered}
        columns={columns}
        emptyMessage="No enrollments found."
      />
    </div>
  );
}
