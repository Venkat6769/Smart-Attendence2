/**
 * src/components/Layout.jsx
 * Main app shell with a fixed sidebar on desktop and a slide-in sidebar on mobile.
 * The <Outlet /> renders the current page's content in the main area.
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Desktop sidebar — always visible on md+ screens */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-violet-xlight px-6 py-4 flex items-center justify-between flex-shrink-0">
          {/* Hamburger for mobile */}
          <button
            className="md:hidden p-2 rounded-lg text-plum-950 hover:bg-violet-xlight"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h2 className="font-heading text-lg font-semibold text-plum-950">
            Smart Attendance System
          </h2>

          {/* User avatar placeholder */}
          <div className="w-9 h-9 rounded-full bg-violet flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </header>

        {/* Page content with scroll */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
