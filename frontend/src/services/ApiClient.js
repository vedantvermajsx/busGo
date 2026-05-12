/**
 * ApiClient — base HTTP client with auth token injection and error normalization.
 *
 * When VITE_USE_MOCK=true the MockApiClient is returned instead, giving a fully
 * functional in-memory API backed by src/mocks/db.json — no backend needed.
 * All service files (AuthApi, TripApi, BookingApi) are unaffected.
 */
import axios from 'axios';

// ─── Real (axios) client ──────────────────────────────────────────────────────
class ApiClient {
  constructor(baseURL = import.meta.env.VITE_API_URL) {
    this.http = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Inject auth token from localStorage
    this.http.interceptors.request.use((config) => {
      try {
        const stored = localStorage.getItem('busgo-auth');
        if (stored) {
          const { token } = JSON.parse(stored);
          if (token) config.headers.Authorization = `Bearer ${token}`;
        }
      } catch { /* ignore parse errors */ }
      return config;
    });

    // Normalize errors
    this.http.interceptors.response.use(
      (res) => res.data,
      (err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('busgo-auth');
          window.location.href = '/login';
        }
        const message = err.response?.data?.message || err.message || 'Network error';
        return Promise.reject(new Error(message));
      }
    );
  }

  get(url, params) { return this.http.get(url, { params }); }
  post(url, data)  { return this.http.post(url, data); }
  patch(url, data) { return this.http.patch(url, data); }
  put(url, data)   { return this.http.put(url, data); }
  delete(url)      { return this.http.delete(url); }
}

// ─── Export: real or mock depending on VITE_USE_MOCK env var ─────────────────
let client;

if (import.meta.env.VITE_USE_MOCK === 'true') {
  // Dynamic import keeps the mock bundle separate from production builds
  const { default: MockApiClient } = await import('../mocks/MockApiClient.js');
  client = MockApiClient;
  console.info('[BusGo] 🧪 Mock API enabled — using in-memory db.json');
} else {
  client = new ApiClient();
}

export default client;
