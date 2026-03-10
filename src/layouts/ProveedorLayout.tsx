// src/layouts/ProveedorLayout.tsx
import { useState, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import NavbarAdmin from "./Navbar-admin";
import SidebarProveedor from "./Sidebar-proveedor";
import { useAuth } from "../auth/AuthContext";
import { canAccessRoute } from "../config/roleRoutes";

const MOBILE_BREAKPOINT = 768;

const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

function ProveedorLayout() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobileViewport);
  const location = useLocation();

  // Verificar acceso por rol a la ruta actual
  if (user?.roles && !canAccessRoute(user.roles, location.pathname)) {
    return <Navigate to="/proveedor/home" replace />;
  }

  useEffect(() => {
    const handleResize = () => {
      const mobile = isMobileViewport();

      setIsMobile((previousMobile) => {
        if (previousMobile !== mobile) {
          setSidebarCollapsed(mobile);
        }

        return mobile;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((previous) => !previous);
  };

  return (
    <div className="d-flex" style={{ height: "100vh", position: "relative" }}>
      <SidebarProveedor
        isCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        onCloseMobile={() => setSidebarCollapsed(true)}
      />

      <div
        className="flex-fill d-flex flex-column"
        style={{ overflow: "hidden" }}
      >
        <NavbarAdmin
          accessToken=""
          onLogout={() => {}}
          toggleSidebar={toggleSidebar}
          isSidebarCollapsed={sidebarCollapsed}
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
