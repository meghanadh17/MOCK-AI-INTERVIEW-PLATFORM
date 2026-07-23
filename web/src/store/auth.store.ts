import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: any | null;
  setSession: (token: string, user: any) => void;
  updateUser: (user: any) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      updateUser: (user) => set((state) => ({ user: { ...state.user, ...user } })),
      clearSession: () => set({ token: null, user: null }),
    }),
    {
      name: 'mocrai-auth-storage',
    }
  )
);
export default useAuthStore;