import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  setInitialized: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      initialized: false,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      setInitialized: (initialized) => set({ initialized }),
    }),
    {
      name: 'roots-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
