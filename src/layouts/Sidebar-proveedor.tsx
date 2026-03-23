// src/layouts/Sidebar-proveedor.tsx — Sidebar minimalista para Proveedores

import { useState, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoSeemann from "./logoseemann.png";
import { handleSidebarNavigation } from "./sidebarNavigation";

interface SidebarProveedorProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onCloseMobile: () => void;
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

function SidebarProveedor({
  isCollapsed,
  isMobile,
  onCloseMobile,
}: SidebarProveedorProps) {
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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navigateFromSidebar = (
    event: MouseEvent<HTMLAnchorElement>,
    targetPath: string,
  ) => {
    handleSidebarNavigation({
      event,
      navigate,
      currentPathname: location.pathname,
      targetPath,
      onAfterNavigate: isMobile ? onCloseMobile : undefined,
    });
  };

  const sidebarWidth = isMobile ? "280px" : isCollapsed ? "84px" : "260px";

  return (
    <>
      {isMobile && !isCollapsed && (
        <div
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            zIndex: 1090,
          }}
        />
      )}

      <div
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          height: "100vh",
          backgroundColor: colors.bg,
          display: "flex",
          flexDirection: "column",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          borderRight: `1px solid ${colors.border}`,
          overflowY: "auto",
          overflowX: "hidden",
          fontFamily:
            "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          transition:
            "width 0.22s ease, min-width 0.22s ease, transform 0.22s ease",
          transform: isMobile
            ? isCollapsed
              ? "translateX(-100%)"
              : "translateX(0)"
            : "translateX(0)",
          boxShadow:
            isMobile && !isCollapsed ? "4px 0 20px rgba(0, 0, 0, 0.3)" : "none",
          zIndex: isMobile ? 1100 : 20,
          pointerEvents: isMobile && isCollapsed ? "none" : "auto",
        }}
        className="sidebar-proveedor-scroll"
      >
        <div
          style={{
            height: isMobile ? "65px" : "70px",
            padding: isCollapsed && !isMobile ? "0 12px" : "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed && !isMobile ? "center" : "flex-start",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          {isCollapsed && !isMobile ? (
            <img
              src="/logo.png"
              alt="Seemann"
              style={{
                width: "40px",
                height: "40px",
                objectFit: "contain",
                borderRadius: "8px",
                backgroundColor: colors.bgActive,
                padding: "4px",
              }}
            />
          ) : (
            <img
              src={logoSeemann}
              alt="Seemann Group"
              style={{
                width: isMobile ? "160px" : "180px",
                height: "auto",
                objectFit: "contain",
              }}
            />
          )}
        </div>

        {!isCollapsed && (
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
        )}

        <nav
          style={{
            flex: 1,
            padding: isCollapsed && !isMobile ? "12px 10px" : "8px 0",
          }}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {menuItems.map((item, index) => {
              const isItemActive = isActive(item.path);
              const isHovered = hoveredItem === item.path;

              return (
                <li key={item.path}>
                  {isCollapsed && !isMobile && index > 0 && (
                    <div
                      style={{
                        margin: "8px 14px",
                        height: "1px",
                        backgroundColor: colors.border,
                        opacity: 0.7,
                      }}
                    />
                  )}

                  <a
                    href={item.path}
                    title={isCollapsed ? item.name : undefined}
                    onClick={(e) => {
                      navigateFromSidebar(e, item.path);
                    }}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{
                      display: "flex",
                      textDecoration: "none",
                      padding:
                        isCollapsed && !isMobile ? "14px 0" : "15px 20px",
                      alignItems: "center",
                      justifyContent:
                        isCollapsed && !isMobile ? "center" : "flex-start",
                      gap: isCollapsed && !isMobile ? "0" : "14px",
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
                        flexShrink: 0,
                      }}
                    />
                    {!isCollapsed && (
                      <span
                        style={{
                          flex: 1,
                          fontSize: "14px",
                          fontWeight: isItemActive ? "500" : "400",
                        }}
                      >
                        {item.name}
                      </span>
                    )}
                  </a>
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
        `}</style>
      </div>
    </>
  );
}

export default SidebarProveedor;
