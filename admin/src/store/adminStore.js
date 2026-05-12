import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api.js';

export const useAdminStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (phone, password) => {
        const { data } = await api.post('/auth/login', { phone, password });
        if (!['admin'].includes(data.user.role))
          throw new Error('Access denied. Admin account required.');
        set({ user: data.user, token: data.token, isAuthenticated: true });
        return data.user;
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'busgo-admin' }
  )
);
