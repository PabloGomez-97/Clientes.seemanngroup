// src/layouts/Sidebar-admin.tsx - AWS/Azure Minimalist Design (same as client)
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canSeeSidebarItem } from "../config/roleRoutes";
import logoSeemann from "./logoseemann.png";

interface SidebarAdminProps {
  isOpen: boolean;
  onToggle?: () => void;
}

interface SubMenuItem {
  path: string;
  name: string;
  restrictedTo?: string | string[];
}

interface MenuItem {
  path?: string;
  name: string;
  icon: string;
  restrictedTo?: string | string[];
  badge?: {
    text: string;
    type: "new" | "beta" | "admin";
  };
  subItems?: SubMenuItem[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Design tokens - AWS/Azure inspired (same as client Sidebar)
const colors = {
  bg: "#232f3e",
  bgHover: "#2d3a4a",
  bgActive: "#1a242f",
  text: "#ffffff",
  textMuted: "#8d99a8",
  border: "#3b4754",
  accent: "#ff9900",
};

function SidebarAdmin({ isOpen }: SidebarAdminProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const menuSections: MenuSection[] = [
    {
      title: "Principal",
      items: [
        { path: "/admin/home", name: "Inicio", icon: "fa fa-home" },
        {
          path: "/admin/cotizador-administrador",
          name: "Cotizador",
          icon: "fa fa-calculator",
        },
        {
          path: "/admin/tusclientes",
          name: "Mis Clientes",
          icon: "fa fa-users",
        },
        { path: "/admin/trackeos", name: "Trackeos", icon: "fa fa-route" },
      ],
    },
    {
      title: "Tarifario",
      items: [
        {
          path: "/admin/pricing",
          name: "Tarifas",
          icon: "fa fa-dollar-sign",
          badge: { text: "Pricing", type: "admin" as const },
        },
      ],
    },
    {
      title: "Gerencia",
      items: [
        {
          path: "/admin/users",
          name: "Gestión Usuarios",
          icon: "fa fa-shield-alt",
          badge: { text: "CHIEF", type: "admin" as const },
        },
        {
          path: "/admin/ejecutivos",
          name: "Gestión Ejecutivos",
          icon: "fa fa-briefcase",
          badge: { text: "CHIEF", type: "admin" as const },
        },
        {
          path: "/admin/reportexecutive",
          name: "Cotizaciones Ejecutivo",
          icon: "fa fa-file-alt",
          badge: { text: "CHIEF", type: "admin" as const },
        },
        {
          path: "/admin/reportoperational",
          name: "Facturaciones Ejecutivo",
          icon: "fa fa-file-invoice-dollar",
          badge: { text: "CHIEF", type: "admin" as const },
        },
      ],
    },
    {
      title: "Reportes",
      items: [
        {
          path: "/admin/reporteria",
          name: "Reportería Natalia",
          icon: "fa fa-chart-bar",
        },
        {
          path: "/admin/reporteriaclientes",
          name: "Reportería Clientes",
          icon: "fa fa-chart-line",
          badge: { text: "NEW", type: "new" as const },
        },
      ],
    },
    {
      title: "AUDITORIA",
      items: [
        {
          path: "/admin/auditoria",
          name: "Auditoría",
          icon: "fa fa-clipboard-list",
          badge: { text: "AUDIT", type: "admin" as const },
        },
      ],
    },
    {
      title: "Entrenamiento",
      items: [
        {
          path: "/admin/alumnos",
          name: "Ranking Alumnos",
          icon: "fa fa-trophy",
          badge: { text: "NEW", type: "new" as const },
          restrictedTo: "mreyes@seemanngroup.com",
        },
      ],
    },
  ];

  // Filter by permission (restrictedTo + roles)
  const filteredSections = menuSections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => {
        // Verificar restricción por email (restrictedTo)
        if (item.restrictedTo) {
          if (Array.isArray(item.restrictedTo)) {
            if (!item.restrictedTo.includes(user?.email || "")) return false;
          } else {
            if (user?.email !== item.restrictedTo) return false;
          }
        }
        // Verificar acceso por rol (si tiene roles definidos)
        if (user?.roles && item.path) {
          return canSeeSidebarItem(user.roles, item.path);
        }
        return true;
      }),
    }))
    .filter((s) => s.items.length > 0);

  if (!isOpen) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((m) => m !== menuName)
        : [...prev, menuName],
    );
  };

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
      className="sidebar-admin-scroll"
    >
      {/* Header con Logo */}
      <div
        className="sidebar-admin-header"
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
          className="sidebar-admin-logo"
          style={{
            width: "180px",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {filteredSections.map((section, sectionIdx) => (
          <div key={sectionIdx} style={{ marginBottom: "4px" }}>
            {/* Section Title */}
            <div
              style={{
                padding: "20px 20px 8px",
                fontSize: "11px",
                fontWeight: "600",
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginTop: sectionIdx > 0 ? "8px" : "0",
              }}
            >
              {section.title}
            </div>

            {/* Menu Items */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {section.items.map((item, itemIdx) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedMenus.includes(item.name);
                const isItemActive = item.path ? isActive(item.path) : false;
                const isHovered =
                  hoveredItem === `${section.title}-${item.name}`;

                return (
                  <li key={itemIdx}>
                    {/* Main Menu Item */}
                    <div
                      onClick={() => {
                        if (hasSubItems) {
                          toggleMenu(item.name);
                        } else if (item.path) {
                          navigate(item.path);
                        }
                      }}
                      onMouseEnter={() =>
                        setHoveredItem(`${section.title}-${item.name}`)
                      }
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
                        marginLeft: "0",
                        marginRight: "0",
                        borderRadius: "0",
                      }}
                    >
                      {/* Icon */}
                      <i
                        className={item.icon}
                        style={{
                          fontSize: "18px",
                          width: "22px",
                          textAlign: "center",
                          opacity: isItemActive ? 1 : 0.75,
                        }}
                      />

                      {/* Name */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: "14px",
                          fontWeight: isItemActive ? "500" : "400",
                        }}
                      >
                        {item.name}
                      </span>

                      {/* Badge */}
                      {item.badge && (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: "9px",
                            fontWeight: "600",
                            backgroundColor:
                              item.badge.type === "new"
                                ? colors.accent
                                : "rgba(255, 255, 255, 0.15)",
                            color: colors.text,
                            textTransform: "uppercase",
                          }}
                        >
                          {item.badge.text}
                        </span>
                      )}

                      {/* Arrow for submenus */}
                      {hasSubItems && (
                        <i
                          className="fa fa-chevron-right"
                          style={{
                            fontSize: "10px",
                            transition: "transform 0.2s ease",
                            transform: isExpanded
                              ? "rotate(90deg)"
                              : "rotate(0deg)",
                            opacity: 0.5,
                          }}
                        />
                      )}
                    </div>

                    {/* Submenu Items */}
                    {hasSubItems && (
                      <div
                        style={{
                          maxHeight: isExpanded ? "300px" : "0",
                          overflow: "hidden",
                          transition: "max-height 0.2s ease",
                        }}
                      >
                        <ul
                          style={{
                            listStyle: "none",
                            padding: "4px 0",
                            margin: 0,
                          }}
                        >
                          {item.subItems!.map((subItem, subIdx) => {
                            if (subItem.restrictedTo) {
                              const allowed = Array.isArray(
                                subItem.restrictedTo,
                              )
                                ? subItem.restrictedTo.includes(
                                    user?.email || "",
                                  )
                                : user?.email === subItem.restrictedTo;
                              if (!allowed) return null;
                            }

                            const isSubActive = isActive(subItem.path);
                            const isSubHovered =
                              hoveredItem === `sub-${subItem.path}`;

                            return (
                              <li
                                key={subIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(subItem.path);
                                }}
                                onMouseEnter={() =>
                                  setHoveredItem(`sub-${subItem.path}`)
                                }
                                onMouseLeave={() => setHoveredItem(null)}
                                style={{
                                  padding: "10px 20px 10px 56px",
                                  cursor: "pointer",
                                  transition: "all 0.12s ease",
                                  backgroundColor: isSubActive
                                    ? colors.bgActive
                                    : isSubHovered
                                      ? colors.bgHover
                                      : "transparent",
                                  color: isSubActive
                                    ? colors.text
                                    : colors.textMuted,
                                  fontSize: "14px",
                                  fontWeight: isSubActive ? "500" : "400",
                                  position: "relative",
                                  marginLeft: "0",
                                  marginRight: "0",
                                  borderRadius: "0",
                                }}
                              >
                                {/* Bullet point */}
                                <span
                                  style={{
                                    position: "absolute",
                                    left: "40px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    width: "5px",
                                    height: "5px",
                                    borderRadius: "50%",
                                    backgroundColor: isSubActive
                                      ? colors.accent
                                      : colors.textMuted,
                                    opacity: isSubActive ? 1 : 0.5,
                                  }}
                                />
                                {subItem.name}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <style>{`
        .sidebar-admin-scroll::-webkit-scrollbar {
          width: 0;
        }
        .sidebar-admin-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-admin-scroll::-webkit-scrollbar-thumb {
          background: transparent;
        }
        
        /* Responsive: Tablets */
        @media (max-width: 1024px) {
          .sidebar-admin-scroll {
            width: 240px !important;
            min-width: 240px !important;
          }
          .sidebar-admin-logo {
            width: 150px !important;
          }
          .sidebar-admin-header {
            height: 60px !important;
          }
        }
        
        /* Responsive: Mobile */
        @media (max-width: 768px) {
          .sidebar-admin-scroll {
            position: fixed !important;
            z-index: 1000 !important;
            width: 280px !important;
            min-width: 280px !important;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3) !important;
          }
          .sidebar-admin-logo {
            width: 160px !important;
          }
          .sidebar-admin-header {
            height: 65px !important;
            padding: 0 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SidebarAdmin;
