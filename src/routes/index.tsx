import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { getHomeRoute } from "./getHomeRoute";
import { authRoutes } from "./auth.routes";
import { adminRoutes } from "./admin.routes";
import { providerRoutes } from "./provider.routes";
import { clientRoutes } from "./client.routes";
import { publicRoutes } from "./public.routes";
import MexicoPortalBridge from "./MexicoPortalBridge";

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {authRoutes}
      {adminRoutes}
      {providerRoutes}
      {clientRoutes}
      {publicRoutes}
      {/* Si el rewrite de Vercel falla, /mx cae en la SPA Chile: no redirigir a /login */}
      <Route path="/mx" element={<MexicoPortalBridge />} />
      <Route path="/mx/*" element={<MexicoPortalBridge />} />
      <Route path="*" element={<Navigate to={getHomeRoute(user)} replace />} />
    </Routes>
  );
}
