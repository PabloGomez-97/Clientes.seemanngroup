// src/layouts/Sidebar-proveedor.tsx — Sidebar minimalista para Proveedores

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoSeemann from "./logoseemann.png";

interface SidebarProveedorProps {
  isOpen: boolean;
}

interface MenuItem {
  path: string;
  name: string;
  icon: string;
}

// Design tokens — misma paleta que Sidebar-admin
const colors = {
  bg: "#232f3e",
  bgHover: "#2d3a4a",
  bgActive: "#1a242f",
  text: "#ffffff",
  textMuted: "#8d99a8",
  border: "#3b4754",
  accent: "#ff9900",
};

function SidebarProveedor({ isOpen }: SidebarProveedorProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const menuItems: MenuItem[] = [
    {
      path: "/proveedor/home",
      name: t("proveedor.sidebar.home"),
      icon: "fa fa-home",
    },
    {
      path: "/proveedor/settings",
      name: t("proveedor.sidebar.settings"),
      icon: "fa fa-cog",
    },
  ];

  if (!isOpen) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div
      style={{
        width: "260px",
        minWidth: "260px",
        height: "100vh",
        backgroundColor: colors.bg,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        left: 0,
        borderRight: `1px solid ${colors.border}`,
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily:
          "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
      className="sidebar-proveedor-scroll"
    >
      {/* Header con Logo */}
      <div
        style={{
          height: "70px",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <img
          src={logoSeemann}
          alt="Seemann Group"
          style={{
            width: "180px",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Portal label */}
      <div
        style={{
          padding: "16px 20px 8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
          }}
        >
          {t("proveedor.sidebar.portalLabel")}
        </span>
        <span
          style={{
            padding: "2px 6px",
            borderRadius: "3px",
            fontSize: "9px",
            fontWeight: "600",
            backgroundColor: colors.accent,
            color: colors.text,
            textTransform: "uppercase",
          }}
        >
          {t("proveedor.sidebar.badge")}
        </span>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {menuItems.map((item) => {
            const isItemActive = isActive(item.path);
            const isHovered = hoveredItem === item.path;

            return (
              <li key={item.path}>
                <div
                  onClick={() => navigate(item.path)}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    padding: "15px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    backgroundColor: isItemActive
                      ? colors.bgActive
                      : isHovered
                        ? colors.bgHover
                        : "transparent",
                    borderLeft: isItemActive
                      ? `3px solid ${colors.accent}`
                      : "3px solid transparent",
                    color: isItemActive ? colors.text : colors.textMuted,
                    fontSize: "14px",
                    fontWeight: isItemActive ? "500" : "400",
                  }}
                >
                  <i
                    className={item.icon}
                    style={{
                      fontSize: "18px",
                      width: "22px",
                      textAlign: "center",
                      opacity: isItemActive ? 1 : 0.75,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      fontWeight: isItemActive ? "500" : "400",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <style>{`
        .sidebar-proveedor-scroll::-webkit-scrollbar {
          width: 0;
        }
        .sidebar-proveedor-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-proveedor-scroll::-webkit-scrollbar-thumb {
          background: transparent;
        }

        @media (max-width: 1024px) {
          .sidebar-proveedor-scroll {
            width: 240px !important;
            min-width: 240px !important;
          }
        }

        @media (max-width: 768px) {
          .sidebar-proveedor-scroll {
            position: fixed !important;
            z-index: 1000 !important;
            width: 280px !important;
            min-width: 280px !important;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3) !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SidebarProveedor;
