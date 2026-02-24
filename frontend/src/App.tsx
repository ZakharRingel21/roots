import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from './stores/authStore';
import { authApi } from './api/client';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TreesPage from './pages/TreesPage';
import TreePage from './pages/TreePage';
import PersonPage from './pages/PersonPage';
import AdminPage from './pages/AdminPage';
import PrivateRoute from './components/ui/PrivateRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/trees" replace />;
  return <Navigate to="/login" replace />;
}

function AppInner() {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    authApi
      .me()
      .then((user) => setUser(user))
      .catch(() => clearUser());
  }, [setUser, clearUser]);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/trees"
        element={
          <PrivateRoute>
            <TreesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/trees/:treeId"
        element={
          <PrivateRoute>
            <TreePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/persons/:personId"
        element={
          <PrivateRoute>
            <PersonPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute requireAdmin>
            <AdminPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
