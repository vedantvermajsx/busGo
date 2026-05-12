/**
 * MockApiClient — drop-in replacement for ApiClient when VITE_USE_MOCK=true.
 *
 * Mimics the same interface: get/post/patch/put/delete
 * All methods return Promise<data> (matches the axios interceptor output).
 * A 200ms fake network delay is applied to every call.
 *
 * Data is loaded from db.json once and held in memory for the browser session.
 * Writes (POST/PATCH) mutate the in-memory copy — changes persist until page refresh.
 */

import seedData from './db.json';
import { handleAuth } from './handlers/authHandler.js';
import { handleTrips } from './handlers/tripHandler.js';
import { handleBookings } from './handlers/bookingHandler.js';
import { handleAdmin } from './handlers/adminHandler.js';

const MOCK_DELAY_MS = 200;
const STORAGE_KEY = 'busgo-auth';

// Resolve dynamic date placeholders in trip startTimes
function hydrateDates(data) {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const trips = data.trips.map(trip => ({
    ...trip,
    startTime: trip.startTime
      .replace('__TODAY_T', `${todayStr}T`)
      .replace('__TOMORROW_T', `${tomorrowStr}T`),
  }));
  return { ...data, trips };
}

// Deep-clone + hydrate the seed data so we always start clean
const inMemoryDb = hydrateDates(JSON.parse(JSON.stringify(seedData)));

function delay() {
  return new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
}

function getCurrentUserId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const { token } = JSON.parse(stored);
    // token format: "mock-jwt-<userId>"
    if (token && token.startsWith('mock-jwt-')) {
      return token.replace('mock-jwt-', '');
    }
  } catch { /* ignore */ }
  return null;
}

export class MockApiClient {
  async _dispatch(method, url, body, params) {
    await delay();

    // Normalise url: strip leading /api if present
    const path = url.replace(/^\/api/, '');
    const userId = getCurrentUserId();

    // Auth check for protected routes (anything except /auth/login & /register)
    const publicPaths = ['/auth/login', '/auth/register'];
    if (!publicPaths.includes(path) && !userId) {
      // Some routes are truly public (GET /trips etc.) — only error for /bookings/my etc.
      const protectedPrefixes = ['/bookings/my', '/admin'];
      const needsAuth = protectedPrefixes.some(p => path.startsWith(p));
      if (needsAuth) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }

    try {
      // Route to the correct handler
      let result =
        handleAuth(method, path, body, inMemoryDb, userId) ??
        handleTrips(method, path, params, inMemoryDb) ??
        handleBookings(method, path, body, params, inMemoryDb, userId) ??
        handleAdmin(method, path, body, params, inMemoryDb);

      if (result === null || result === undefined) {
        throw { status: 404, message: `Mock: no handler for ${method} ${path}` };
      }

      return { success: true, ...result };
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
      }
      throw new Error(err.message || 'Mock API error');
    }
  }

  get(url, params)    { return this._dispatch('GET',    url, null, params); }
  post(url, data)     { return this._dispatch('POST',   url, data, null); }
  patch(url, data)    { return this._dispatch('PATCH',  url, data, null); }
  put(url, data)      { return this._dispatch('PUT',    url, data, null); }
  delete(url)         { return this._dispatch('DELETE', url, null, null); }
}

export default new MockApiClient();
