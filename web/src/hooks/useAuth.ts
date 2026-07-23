import { useAuthStore } from '../store/auth.store';
export function useAuth() {
  const { user, token, setSession, clearSession } = useAuthStore();
  return { user, token, setSession, clearSession, isAuthenticated: !!token };
}