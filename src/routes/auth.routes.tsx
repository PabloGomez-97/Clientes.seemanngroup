import { Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import Login from "@/auth/Login";
import LoginAdmin from "@/auth/LoginAdmin";
import LoginProveedor from "@/auth/LoginProveedor";
import { getHomeRoute } from "./getHomeRoute";

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const home = user ? getHomeRoute(user) : null;

  useEffect(() => {
    if (home?.startsWith("/mx")) {
      window.location.assign(home);
    }
  }, [home]);

  if (loading) return null;
  if (user) {
    if (home?.startsWith("/mx")) return null;
    return <Navigate to={home!} replace />;
  }
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
