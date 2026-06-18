import { Route, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import Login from "@/auth/Login";
import LoginAdmin from "@/auth/LoginAdmin";
import LoginProveedor from "@/auth/LoginProveedor";
import { getHomeRoute } from "./getHomeRoute";

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getHomeRoute(user)} replace />;
  return <>{children}</>;
}

export const authRoutes = (
  <>
    <Route
      path="/login"
      element={
        <AuthRedirect>
          <Login />
        </AuthRedirect>
      }
    />
    <Route
      path="/login-admin"
      element={
        <AuthRedirect>
          <LoginAdmin />
        </AuthRedirect>
      }
    />
    <Route
      path="/login-proveedor"
      element={
        <AuthRedirect>
          <LoginProveedor />
        </AuthRedirect>
      }
    />
  </>
);
