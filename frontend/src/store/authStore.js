import { create } from 'zustand';
import authApi from '../services/AuthApi.js';

const STORAGE_KEY = 'trivedi-travels-auth';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,

  hydrate: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { user, token } = JSON.parse(stored);
        if (token) set({ user, token, isAuthenticated: true });
      }
    } catch { /* ignore */ }
    set({ isHydrated: true });
  },

  login: async (phone, password) => {
    const data = await authApi.login(phone, password);
    const { user, token } = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    set({ user, token, isAuthenticated: true });
    return user;
  },

  signup: async (name, phone, password) => {
    const data = await authApi.register(name, phone, password);
    const { user, token } = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    set({ user, token, isAuthenticated: true });
    return user;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/';
  },
}));
