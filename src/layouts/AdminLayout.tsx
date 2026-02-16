// src/layouts/AdminLayout.tsx - Same structure as UserLayout
import { useState, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import NavbarAdmin from "./Navbar-admin";
import SidebarAdmin from "./Sidebar-admin";
import ChatWidget from "../components/ChatWidget";
import { useAuth } from "../auth/AuthContext";
import { canAccessRoute } from "../config/roleRoutes";

function AdminLayout() {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Verificar acceso por rol a la ruta actual
  if (
    user?.username === "Ejecutivo" &&
    user?.roles &&
    !canAccessRoute(user.roles, location.pathname)
  ) {
    return <Navigate to="/admin/home" replace />;
  }

  // Obtener token de Linbis automáticamente al cargar
  useEffect(() => {
    const fetchLinbisToken = async () => {
      const startTime = Date.now();

      try {
        const response = await fetch("/api/linbis-token");
        if (!response.ok) {
          throw new Error("No se pudo obtener el token de Linbis");
        }
        const data = await response.json();
        setAccessToken(data.token);
        setError(null);
      } catch (err) {
        console.error("Error obteniendo token de Linbis:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 500 - elapsedTime);
        setTimeout(() => {
          setLoading(false);
        }, remainingTime);
      }
    };

    fetchLinbisToken();
  }, []);

  const handleLogout = () => {
    setAccessToken("");
    setError(null);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Mostrar error si falla
  if (error) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "40px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "#fee2e2",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <svg width="32" height="32" fill="#dc2626" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
                </svg>
              </div>
              <h4 style={{ color: "#1f2937", marginBottom: "12px" }}>
                Error de Conexión
              </h4>
              <p style={{ color: "#6b7280", marginBottom: "24px" }}>{error}</p>
              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ height: "100vh" }}>
      <SidebarAdmin isOpen={sidebarOpen} />

      <div
        className="flex-fill d-flex flex-column"
        style={{ overflow: "hidden" }}
      >
        <NavbarAdmin
          accessToken={accessToken}
          onLogout={handleLogout}
          toggleSidebar={toggleSidebar}
        />

        <div
          className="flex-fill p-4"
          style={{ overflowY: "auto", backgroundColor: "#f8f9fa" }}
        >
          <Outlet context={{ accessToken, onLogout: handleLogout }} />
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}

export default AdminLayout;
