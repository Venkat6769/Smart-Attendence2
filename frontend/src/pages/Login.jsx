/**
 * src/pages/Login.jsx
 * The login page — the first screen users see.
 * Handles authentication and redirects to the correct dashboard based on role.
 * Also prompts users to change their password on first login.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { KeyRound, Radio, BarChart2, AlertTriangle, FileText } from 'lucide-react';

export default function Login() {
  const { login, refreshUser } = useAuth();
  const navigate  = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Change password state (shown after first login)
  const [mustChange,    setMustChange]    = useState(false);
  const [changeForm,    setChangeForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changeError,   setChangeError]   = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(form.email, form.password);

      // If the account requires a password change, show the change form
      if (user.must_change_password) {
        setMustChange(true);
        setLoading(false);
        return;
      }

      redirectByRole(user.role);
    } catch (err) {
      console.error('Login error:', err);
      const serverMsg = err.response?.data?.error;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.message && err.message.includes('API server unreachable')) {
        setError(err.message);
      } else if (!err.response) {
        setError('Cannot connect to backend server. If running locally, open http://localhost:5173. If using Vercel, ensure your backend is deployed and VITE_API_URL is configured in Vercel settings.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setChangeError('');

    if (changeForm.newPassword !== changeForm.confirmPassword) {
      return setChangeError('New passwords do not match.');
    }
    if (changeForm.newPassword.length < 6) {
      return setChangeError('Password must be at least 6 characters.');
    }

    setChangeLoading(true);
    try {
      await api.patch('/api/auth/change-password', {
        currentPassword: changeForm.currentPassword,
        newPassword:     changeForm.newPassword,
      });

      // Refresh user profile so must_change_password is updated
      if (refreshUser) {
        await refreshUser();
      }

      // After changing password, redirect to dashboard
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      redirectByRole(savedUser.role);
    } catch (err) {
      setChangeError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setChangeLoading(false);
    }
  }

  function redirectByRole(role) {
    const map = { admin: '/admin/dashboard', lecturer: '/lecturer/dashboard', student: '/student/dashboard' };
    navigate(map[role] || '/');
  }

  // ── Change Password Screen ────────────────────────────────────────────────
  if (mustChange) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-violet-xlight shadow-sm p-8 w-full max-w-md">
          <div className="mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <KeyRound size={24} className="text-amber-600" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-plum-950">Set New Password</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your account requires a password change before you can continue.
            </p>
          </div>

          {changeError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">
              {changeError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">Current Password</label>
              <input
                type="password"
                value={changeForm.currentPassword}
                onChange={e => setChangeForm(f => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Welcome@123"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">New Password</label>
              <input
                type="password"
                value={changeForm.newPassword}
                onChange={e => setChangeForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="At least 6 characters"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-plum-950 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={changeForm.confirmPassword}
                onChange={e => setChangeForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Repeat new password"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={changeLoading}
              className="w-full bg-violet text-white font-semibold py-3 rounded-xl hover:bg-plum-900 disabled:opacity-60 transition-colors"
            >
              {changeLoading ? 'Saving...' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Login Screen ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-plum-950 flex-col items-center justify-center p-12">
        <div className="text-center">
          <h1 className="font-heading text-5xl font-bold text-white mb-4 leading-tight">
            Smart<br />
            <span className="text-violet-light">Attendance</span>
          </h1>
          <p className="text-violet-light opacity-70 text-lg mb-8">
            QR-based attendance management<br />for modern universities
          </p>
          <div className="grid grid-cols-2 gap-4 text-left max-w-xs">
            {[
              { icon: Radio,         text: 'Real-time QR scanning' },
              { icon: BarChart2,     text: 'Instant reports' },
              { icon: AlertTriangle, text: 'Attendance alerts' },
              { icon: FileText,      text: 'PDF exports' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-violet-light text-sm opacity-80">
                <item.icon size={16} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-heading text-3xl font-bold text-plum-950">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-2">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-plum-950 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@university.edu"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet focus:border-transparent transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-plum-950 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Your password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet focus:border-transparent transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet text-white font-semibold py-3 rounded-xl hover:bg-plum-900 disabled:opacity-60 transition-colors font-body text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium text-center">Default Accounts (Click to auto-fill):</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setForm({ email: 'admin@university.edu', password: 'Admin@123' })}
                className="text-center p-2 rounded-lg border border-violet-xlight hover:bg-violet-xlight/50 transition-colors text-left"
              >
                <div className="text-xs font-semibold text-plum-950">Admin</div>
                <div className="text-[10px] text-gray-400 truncate">Admin@123</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ email: 'lecturer@university.edu', password: 'Lecturer@123' })}
                className="text-center p-2 rounded-lg border border-violet-xlight hover:bg-violet-xlight/50 transition-colors text-left"
              >
                <div className="text-xs font-semibold text-plum-950">Lecturer</div>
                <div className="text-[10px] text-gray-400 truncate">Lecturer@123</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ email: 'student@university.edu', password: 'Student@123' })}
                className="text-center p-2 rounded-lg border border-violet-xlight hover:bg-violet-xlight/50 transition-colors text-left"
              >
                <div className="text-xs font-semibold text-plum-950">Student</div>
                <div className="text-[10px] text-gray-400 truncate">Student@123</div>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Smart Attendance System · University Edition
          </p>
        </div>
      </div>
    </div>
  );
}
