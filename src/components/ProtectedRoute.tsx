// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireProveedor?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireProveedor = false,
}: ProtectedRouteProps) {
  const { user, token } = useAuth();

  // Si no hay token, redirigir al login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const isEjecutivo = user.username === "Ejecutivo";
  const isProveedor = isEjecutivo && user.roles?.proveedor === true;
  const isAdmin = isEjecutivo && !isProveedor;

  // Ruta de proveedor
  if (requireProveedor) {
    if (!isProveedor) {
      // Si es ejecutivo/admin, ir a admin
      if (isAdmin) return <Navigate to="/admin/home" replace />;
      // Si es cliente, ir a home
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // Ruta de admin/ejecutivo
  if (requireAdmin) {
    if (!isAdmin) {
      // Si es proveedor, ir a portal proveedor
      if (isProveedor) return <Navigate to="/proveedor/home" replace />;
      // Si es cliente, ir a home
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // Ruta de cliente (usuario regular)
  if (isProveedor) {
    return <Navigate to="/proveedor/home" replace />;
  }
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
