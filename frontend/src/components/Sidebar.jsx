/**
 * src/components/Sidebar.jsx
 * Navigation sidebar with role-aware links.
 * Shows different menu items depending on whether the user is admin, lecturer, or student.
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  AlertTriangle, Radio, BarChart2, Camera, Check, LogOut,
} from 'lucide-react';

// Navigation menu config per role
const NAV_ITEMS = {
  admin: [
    { label: 'Dashboard',        path: '/admin/dashboard' },
    { label: 'Users',            path: '/admin/users' },
    { label: 'Courses',          path: '/admin/courses' },
    { label: 'Enrollments',      path: '/admin/enrollments' },
    { label: 'Flagged Students', path: '/admin/flagged' },
  ],
  lecturer: [
    { label: 'Dashboard', path: '/lecturer/dashboard' },
    { label: 'My Courses', path: '/lecturer/courses' },
    { label: 'Sessions',   path: '/lecturer/sessions' },
    { label: 'Reports',    path: '/lecturer/reports' },
  ],
  student: [
    { label: 'Dashboard',  path: '/student/dashboard' },
    { label: 'My Courses', path: '/student/courses' },
    { label: 'Scan QR',    path: '/student/scan' },
    { label: 'Attendance', path: '/student/attendance' },
  ],
};

const ICONS = {
  'Dashboard':        LayoutDashboard,
  'Users':            Users,
  'Courses':          BookOpen,
  'My Courses':       BookOpen,
  'Enrollments':      ClipboardList,
  'Flagged Students': AlertTriangle,
  'Sessions':         Radio,
  'Reports':          BarChart2,
  'Scan QR':          Camera,
  'Attendance':       Check,
};

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const navItems         = NAV_ITEMS[user?.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-full bg-plum-950 text-white w-64">
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-plum-900">
        <h1 className="font-heading text-xl font-bold text-white leading-tight">
          Smart<br />
          <span className="text-violet-light">Attendance</span>
        </h1>
        <p className="text-xs text-violet-light mt-1 opacity-70">University Portal</p>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-plum-900">
        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
        <p className="text-xs text-violet-light opacity-70 truncate">{user?.email}</p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-violet text-white text-xs font-medium capitalize">
          {user?.role}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-violet text-white'
                  : 'text-violet-light hover:bg-plum-900 hover:text-white'
              }`
            }
          >
            {(() => { const Icon = ICONS[item.label]; return Icon ? <Icon size={16} /> : <span className="w-4 h-4 block" />; })()}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="px-4 py-4 border-t border-plum-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-violet-light hover:bg-plum-900 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
