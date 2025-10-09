// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin: boolean;
}

export default function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, token } = useAuth();

  // Si no hay token, redirigir al login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si requiere admin pero no lo es, redirigir
  if (requireAdmin && user.username !== 'Administrador') {
    return <Navigate to="/quotes" replace />;
  }

  // Si NO requiere admin pero ES admin, redirigir al dashboard admin
  if (!requireAdmin && user.username === 'Administrador') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}