// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user } = useAuth();

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere admin y el usuario no es admin, redirigir a su home
  if (requireAdmin && user.username !== 'Administrador') {
    return <Navigate to="/quotes" replace />;
  }

  // Si el usuario es admin intentando acceder a rutas de usuario regular, redirigir a admin home
  if (!requireAdmin && user.username === 'Administrador') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;