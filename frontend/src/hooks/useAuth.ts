import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, setUser, clearUser } = useAuthStore();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'editor' || user?.role === 'admin';

  const login = useCallback(
    async (email: string, password: string) => {
      const userData = await authApi.login({ email, password });
      setUser(userData);
      return userData;
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearUser();
      navigate('/login');
    }
  }, [clearUser, navigate]);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      first_name?: string;
      last_name?: string;
      invitation_token?: string;
    }) => {
      const userData = await authApi.register(data);
      setUser(userData);
      return userData;
    },
    [setUser]
  );

  return { user, isAdmin, isEditor, login, logout, register };
}
