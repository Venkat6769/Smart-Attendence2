/**
 * src/pages/admin/Users.jsx
 * Admin page for managing users — lists all users and provides a form
 * to create new lecturer or student accounts.
 */

import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import AttendanceTable, { StatusBadge } from '../../components/AttendanceTable';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Users() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Create user form state
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name: '', email: '', matric_number: '', role: 'student' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Search filter
  const [search, setSearch] = useState('');

  async function fetchUsers() {
    try {
      const res = await api.get('/api/users');
      setUsers(res.data.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setCreating(true);

    try {
      const endpoint = form.role === 'lecturer' ? '/api/users/lecturer' : '/api/users/student';
      const payload  = form.role === 'lecturer'
        ? { name: form.name, email: form.email }
        : { name: form.name, email: form.email, matric_number: form.matric_number };

      await api.post(endpoint, payload);
      setSuccess(`${form.role === 'lecturer' ? 'Lecturer' : 'Student'} account created. Default password: Welcome@123`);
      setForm({ name: '', email: '', matric_number: '', role: 'student' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  }

  // Filter users by name or email
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'name',  label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key:    'role',
      label:  'Role',
      render: row => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
          row.role === 'admin'    ? 'bg-plum-950 text-white' :
          row.role === 'lecturer' ? 'bg-violet text-white' :
          'bg-violet-xlight text-violet'
        }`}>
          {row.role}
        </span>
      ),
    },
    { key: 'matric_number', label: 'Matric No.' },
    {
      key:    'must_change_password',
      label:  'Password',
      render: row => row.must_change_password
        ? <span className="text-xs text-amber-600">Must change</span>
        : <span className="text-xs text-emerald-600">Set</span>,
    },
    {
      key:    'created_at',
      label:  'Created',
      render: row => new Date(row.created_at).toLocaleDateString('en-GB'),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-plum-950">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} total users in the system</p>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setFormError(''); setSuccess(''); }}
          className="bg-violet text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-plum-900 transition-colors"
        >
          + Create User
        </button>
      </div>

      {error   && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>}

      {/* Create User Form */}
      {showForm && (
        <div className="bg-white border border-violet-xlight rounded-xl p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold text-plum-950 mb-4">Create New User</h2>
          {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">{formError}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. John Smith"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">Email Address *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@university.edu"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
              >
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
              </select>
            </div>
            {form.role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-plum-950 mb-1">Matric Number</label>
                <input
                  type="text"
                  value={form.matric_number}
                  onChange={e => setForm(f => ({ ...f, matric_number: e.target.value }))}
                  placeholder="e.g. CS/2021/001"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
                />
              </div>
            )}
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="bg-violet text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-plum-900 disabled:opacity-60 transition-colors"
              >
                {creating ? 'Creating...' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
          <p className="text-xs text-gray-400 mt-3">Default password: <strong>Welcome@123</strong> — users will be prompted to change it on first login.</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet"
        />
      </div>

      <AttendanceTable
        rows={filtered}
        columns={columns}
        emptyMessage="No users found. Create one above."
      />
    </div>
  );
}
