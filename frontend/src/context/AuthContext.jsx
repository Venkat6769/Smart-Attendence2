/**
 * src/context/AuthContext.jsx
 * Global authentication state for the entire application.
 * Provides: user object, token, login function, and logout function
 * to any component that calls useAuth().
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and makes auth state available everywhere
 */
export function AuthProvider({ children }) {
  // Load user and token from localStorage on first render (persists across page refreshes)
  const [user,  setUser]  = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  /**
   * login — authenticates the user, stores the token, and updates state
   * @param {string} email
   * @param {string} password
   * @returns {object} user data on success
   */
  async function login(email, password) {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (!res.data || !res.data.data) {
        throw new Error('API server unreachable: The server returned an HTML page instead of JSON API response. If deploying on Vercel, please set VITE_API_URL in Vercel settings to your backend URL.');
      }
      const { token: newToken, user: newUser } = res.data.data;

      // Persist in localStorage so the session survives page refreshes
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      return newUser;
    } finally {
      setLoading(false);
    }
  }

  /**
   * logout — clears all auth state and redirects to login
   */
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  /**
   * refreshUser — fetches the latest user profile from the server
   * (useful after changing password to update must_change_password flag)
   */
  async function refreshUser() {
    try {
      const res = await api.get('/api/auth/me');
      const updatedUser = res.data.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch {
      // If this fails, the token is probably invalid — log out
      logout();
    }
  }

  const value = { user, token, loading, login, logout, refreshUser, isAuthenticated: !!token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — custom hook to access auth context in any component
 * Usage: const { user, login, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
