// src/layouts/ProveedorLayout.tsx
import { useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import NavbarAdmin from "./Navbar-admin";
import SidebarProveedor from "./Sidebar-proveedor";
import { useAuth } from "../auth/AuthContext";
import { canAccessRoute } from "../config/roleRoutes";

function ProveedorLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Verificar acceso por rol a la ruta actual
  if (user?.roles && !canAccessRoute(user.roles, location.pathname)) {
    return <Navigate to="/proveedor/home" replace />;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="d-flex" style={{ height: "100vh" }}>
      <SidebarProveedor isOpen={sidebarOpen} />

      <div
        className="flex-fill d-flex flex-column"
        style={{ overflow: "hidden" }}
      >
        <NavbarAdmin
          accessToken=""
          onLogout={() => {}}
          toggleSidebar={toggleSidebar}
        />

        <div
          className="flex-fill p-4"
          style={{ overflowY: "auto", backgroundColor: "#f8f9fa" }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default ProveedorLayout;
