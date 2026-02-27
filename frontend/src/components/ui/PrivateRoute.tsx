import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function PrivateRoute({ children, requireAdmin = false }: PrivateRouteProps) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-300 mb-2">403</h1>
          <p className="text-slate-500">У вас недостаточно прав для просмотра этой страницы</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
