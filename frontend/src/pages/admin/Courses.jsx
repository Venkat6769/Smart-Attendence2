/**
 * src/pages/admin/Courses.jsx
 * Admin page for managing courses — create courses and assign lecturers.
 */

import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import AttendanceTable from '../../components/AttendanceTable';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Courses() {
  const [courses,   setCourses]   = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const [showCreate,   setShowCreate]   = useState(false);
  const [createForm,   setCreateForm]   = useState({ code: '', title: '', lecturer_id: '' });
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState('');

  // Assignment form — assign a lecturer to an existing course
  const [assigningId,  setAssigningId]  = useState(null);
  const [assignLecId,  setAssignLecId]  = useState('');

  async function fetchData() {
    try {
      const [cRes, uRes] = await Promise.all([
        api.get('/api/courses'),
        api.get('/api/users'),
      ]);
      setCourses(cRes.data.data);
      setLecturers(uRes.data.data.filter(u => u.role === 'lecturer'));
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/api/courses', {
        code:        createForm.code,
        title:       createForm.title,
        lecturer_id: createForm.lecturer_id || undefined,
      });
      setSuccess('Course created successfully.');
      setCreateForm({ code: '', title: '', lecturer_id: '' });
      setShowCreate(false);
      fetchData();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create course.');
    } finally {
      setCreating(false);
    }
  }

  async function handleAssign(courseId) {
    if (!assignLecId) return;
    try {
      await api.patch(`/api/courses/${courseId}/assign`, { lecturer_id: assignLecId });
      setSuccess('Lecturer assigned successfully.');
      setAssigningId(null);
      setAssignLecId('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign lecturer.');
    }
  }

  const columns = [
    { key: 'code',  label: 'Code' },
    { key: 'title', label: 'Course Title' },
    {
      key:    'lecturer_name',
      label:  'Lecturer',
      render: row => row.lecturer_name || <span className="text-gray-400 text-xs">Unassigned</span>,
    },
    {
      key:    'created_at',
      label:  'Created',
      render: row => new Date(row.created_at).toLocaleDateString('en-GB'),
    },
    {
      key:    'actions',
      label:  'Assign Lecturer',
      render: row => (
        assigningId === row.id ? (
          <div className="flex items-center gap-2">
            <select
              value={assignLecId}
              onChange={e => setAssignLecId(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet"
            >
              <option value="">Select...</option>
              {lecturers.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <button onClick={() => handleAssign(row.id)} className="text-xs text-emerald-600 font-semibold hover:underline">Save</button>
            <button onClick={() => setAssigningId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => { setAssigningId(row.id); setAssignLecId(row.lecturer_id || ''); }}
            className="text-xs text-violet font-semibold hover:underline"
          >
            {row.lecturer_name ? 'Change' : 'Assign'}
          </button>
        )
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-plum-950">Courses</h1>
          <p className="text-sm text-gray-500 mt-1">{courses.length} courses in the system</p>
        </div>
        <button
          onClick={() => { setShowCreate(s => !s); setCreateError(''); setSuccess(''); }}
          className="bg-violet text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-plum-900 transition-colors"
        >
          + Create Course
        </button>
      </div>

      {error   && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>}

      {showCreate && (
        <div className="bg-white border border-violet-xlight rounded-xl p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold text-plum-950 mb-4">Create New Course</h2>
          {createError && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{createError}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">Course Code *</label>
              <input
                type="text"
                value={createForm.code}
                onChange={e => setCreateForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g. CS301"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">Course Title *</label>
              <input
                type="text"
                value={createForm.title}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Database Systems"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">Lecturer (optional)</label>
              <select
                value={createForm.lecturer_id}
                onChange={e => setCreateForm(f => ({ ...f, lecturer_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
              >
                <option value="">Assign later</option>
                {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" disabled={creating} className="bg-violet text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-plum-900 disabled:opacity-60 transition-colors">
                {creating ? 'Creating...' : 'Create Course'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <AttendanceTable
        rows={courses}
        columns={columns}
        emptyMessage="No courses yet. Create one above."
      />
    </div>
  );
}
