/**
 * Admin API Client — axios instance with auth token injection.
 */
import axios from 'axios';

const ADMIN_STORAGE_KEY = 'busgo-admin-auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('busgo-admin');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    }
  } catch { /* ignore */ }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('busgo-admin');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default api;
