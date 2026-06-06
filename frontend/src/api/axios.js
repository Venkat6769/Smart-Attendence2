/**
 * src/api/axios.js
 * Configures the Axios instance used for all API calls in the application.
 * Every API call imports `api` from this file — never use raw `fetch` or `axios` directly.
 * The interceptor automatically attaches the JWT token to every outgoing request.
 */

import axios from 'axios';

// Empty baseURL = relative URLs, routed through Vite proxy to the backend.
// Set VITE_API_URL only in production deployments.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // bypass ngrok browser warning for API calls
  },
});

// Request interceptor — runs before every request is sent
api.interceptors.request.use(
  (config) => {
    // Retrieve the JWT token stored in localStorage after login
    const token = localStorage.getItem('token');
    if (token) {
      // Attach the token as a Bearer token in the Authorization header
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handles 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server returns 401, the token is expired or invalid — log the user out
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
