import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { getHomeRoute } from "./getHomeRoute";
import { authRoutes } from "./auth.routes";
import { adminRoutes } from "./admin.routes";
import { providerRoutes } from "./provider.routes";
import { clientRoutes } from "./client.routes";
import { publicRoutes } from "./public.routes";

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {authRoutes}
      {adminRoutes}
      {providerRoutes}
      {clientRoutes}
      {publicRoutes}
      <Route path="*" element={<Navigate to={getHomeRoute(user)} replace />} />
    </Routes>
  );
}
