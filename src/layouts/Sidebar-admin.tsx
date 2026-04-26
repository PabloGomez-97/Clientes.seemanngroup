// src/layouts/Sidebar-admin.tsx - AWS/Azure Minimalist Design (same as client)
import { useState, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canSeeSidebarItem } from "../config/roleRoutes";
import { imgUrl } from "../config/images";
import logoSeemann from "./logoseemann.png";
import { handleSidebarNavigation } from "./sidebarNavigation";

interface SidebarAdminProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onCloseMobile: () => void;
}

interface SubMenuItem {
  path: string;
  name: string;
  restrictedTo?: string | string[];
  badge?: {
    text: string;
    type: "new" | "beta" | "admin";
  };
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
  title?: string;
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

function SidebarAdmin({
  isCollapsed,
  isMobile,
  onCloseMobile,
}: SidebarAdminProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const canSeeByEmail = (restrictedTo?: string | string[]) => {
    if (!restrictedTo) return true;

    return Array.isArray(restrictedTo)
      ? restrictedTo.includes(user?.email || "")
      : user?.email === restrictedTo;
  };

  const canSeeByRole = (path?: string) => {
    if (!path || !user?.roles) return true;
    return canSeeSidebarItem(user.roles, path);
  };

  const menuSections: MenuSection[] = [
    {
      items: [{ path: "/admin/home", name: "Inicio", icon: "fa fa-home" }],
    },

    {
      items: [
        {
          path: "/admin/cotizador-administrador",
          name: "Cotizador",
          icon: "bi bi-currency-dollar",
        },
        {
          path: "/admin/simulador-cotizaciones",
          name: "Simulador de Cotizaciones",
          icon: "fa fa-flask",
        },
        {
          path: "/admin/comportamiento-clientes",
          name: "Análisis de Clientes",
          icon: "fa fa-chart-line",
        },
      ],
    },

    {
      items: [
        {
          name: "Operaciones",
          icon: "fa fa-route",
          subItems: [
            {
              path: "/admin/reporteriaclientes",
              name: "Directorio de Clientes",
            },
            {
              path: "/admin/op-reporteriaclientes",
              name: "Directorio de Clientes",
            },
            {
              path: "/admin/trackeos",
              name: "Monitoreo de Operaciones",
            },
            {
              path: "/admin/op-trackeos",
              name: "Monitoreo de Envíos",
            },
            {
              path: "/admin/op-documentacion",
              name: "Documentación de Clientes",
            },
          ],
        },
      ],
    },
    {
      title: "Tarifario",
      items: [
        {
          path: "/admin/pricing",
          name: "Administración de Tarifas",
          icon: "fa fa-tags",
        },
        {
          path: "/admin/tarifario-completo",
          name: "Tarifario General",
          icon: "fa fa-table",
        },
        {
          path: "/admin/documentos-proveedores",
          name: "Documentación de Proveedores",
          icon: "fa fa-file-alt",
        },
        {
          path: "/admin/alertas-pricing",
          name: "Alertas Tarifas",
          icon: "fa fa-exclamation-triangle",
        },
      ],
    },
    {
      title: "Reportes",
      items: [
        {
          path: "/admin/reporteria",
          name: "Reportes",
          icon: "fa fa-chart-bar",
          subItems: [
            {
              path: "/admin/reporteria",
              name: "Reportes LINBIS",
            },
            {
              path: "/admin/reportexecutive",
              name: "Reporte de Cotizaciones",
              badge: { text: "CHIEF", type: "admin" as const },
            },
            {
              path: "/admin/reportoperational",
              name: "Reporte de Facturaciones",
              badge: { text: "CHIEF", type: "admin" as const },
            },
          ],
        },
      ],
    },

    {
      items: [
        {
          name: "Administración",
          icon: "fa fa-shield-alt",
          subItems: [
            {
              path: "/admin/users",
              name: "Gestión de Usuarios",
              badge: { text: "CHIEF", type: "admin" as const },
            },
            {
              path: "/admin/auditoria",
              name: "Auditoría",
              badge: { text: "AUDIT", type: "admin" as const },
            },
            {
              path: "/admin/agencia-aduanas",
              name: "Gestión Aduanera",
              badge: { text: "CHIEF", type: "admin" as const },
            },
          ],
        },
      ],
    },
  ];

  // Filter by permission (restrictedTo + roles)
  const filteredSections = menuSections
    .map((s) => ({
      ...s,
      items: s.items
        .map((item) => ({
          ...item,
          subItems: item.subItems?.filter(
            (subItem) =>
              canSeeByEmail(subItem.restrictedTo) && canSeeByRole(subItem.path),
          ),
        }))
        .filter((item) => {
          if (!canSeeByEmail(item.restrictedTo)) return false;
          if (!canSeeByRole(item.path)) return false;
          if (item.subItems) return item.subItems.length > 0;
          return true;
        }),
    }))
    .filter((s) => s.items.length > 0);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const sidebarWidth = isMobile ? "280px" : isCollapsed ? "84px" : "260px";

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((m) => m !== menuName)
        : [...prev, menuName],
    );
  };

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
        className="sidebar-admin-scroll"
      >
        <div
          className="sidebar-admin-header"
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
              src={imgUrl("/logo.png")}
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
              className="sidebar-admin-logo"
              style={{
                width: isMobile ? "160px" : "180px",
                height: "auto",
                objectFit: "contain",
              }}
            />
          )}
        </div>

        <nav
          style={{
            flex: 1,
            padding: isCollapsed && !isMobile ? "12px 10px" : "12px 0",
          }}
        >
          {filteredSections.map((section, sectionIdx) => (
            <div
              key={sectionIdx}
              style={{
                marginBottom: isCollapsed && !isMobile ? "10px" : "4px",
              }}
            >
              {!isCollapsed && section.title ? (
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
              ) : sectionIdx > 0 && isCollapsed ? (
                <div
                  style={{
                    margin: "8px 14px",
                    height: "1px",
                    backgroundColor: colors.border,
                    opacity: 0.7,
                  }}
                />
              ) : null}

              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {section.items.map((item, itemIdx) => {
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const visibleSubItems = item.subItems || [];
                  const isExpanded = expandedMenus.includes(item.name);
                  const isItemActive =
                    (item.path ? isActive(item.path) : false) ||
                    visibleSubItems.some((subItem) => isActive(subItem.path));
                  const isHovered =
                    hoveredItem === `${section.title}-${item.name}`;

                  return (
                    <li key={itemIdx}>
                      <a
                        href={
                          item.path
                            ? item.path
                            : hasSubItems && visibleSubItems.length > 0
                              ? visibleSubItems[0].path
                              : "#"
                        }
                        title={isCollapsed ? item.name : undefined}
                        onClick={(e) => {
                          if (hasSubItems) {
                            if (isCollapsed && visibleSubItems.length > 0) {
                              navigateFromSidebar(e, visibleSubItems[0].path);
                            } else {
                              e.preventDefault();
                              toggleMenu(item.name);
                            }
                          } else if (item.path) {
                            navigateFromSidebar(e, item.path);
                          }
                        }}
                        onMouseEnter={() =>
                          setHoveredItem(`${section.title}-${item.name}`)
                        }
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                          display: "flex",
                          textDecoration: "none",
                          padding:
                            isCollapsed && !isMobile ? "15px 0" : "15px 8px",
                          alignItems: "center",
                          justifyContent:
                            isCollapsed && !isMobile ? "center" : "flex-start",
                          gap: isCollapsed && !isMobile ? "0" : "8px",
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
                          fontSize: "13px",
                          fontWeight: isItemActive ? "bold" : "normal",
                          marginLeft: "0",
                          marginRight: "0",
                          borderRadius: "0",
                        }}
                      >
                        {/* Sección de iconos */}
                        <i
                          className={item.icon}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "24px",
                            height: "24px",
                            fontSize: "15px",
                            textAlign: "center",
                            opacity: isItemActive ? 1 : 0.75,
                            flexShrink: 0,
                          }}
                        />

                        {!isCollapsed && (
                          <>
                            <span
                              style={{
                                flex: 1,
                                fontSize:
                                  "13px" /* tamaño del texto del sidebar */,
                                fontWeight: isItemActive ? "bold" : "normal",
                              }}
                            >
                              {item.name}
                            </span>

                            {item.badge && (
                              <span
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  fontSize: "9px",
                                  fontWeight: "bold",
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

                            {hasSubItems && visibleSubItems.length > 0 && (
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
                          </>
                        )}
                      </a>

                      {!isCollapsed &&
                        hasSubItems &&
                        visibleSubItems.length > 0 && (
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
                              {visibleSubItems.map((subItem, subIdx) => {
                                const isSubActive = isActive(subItem.path);
                                const isSubHovered =
                                  hoveredItem === `sub-${subItem.path}`;

                                return (
                                  <li key={subIdx}>
                                    <a
                                      href={subItem.path}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateFromSidebar(e, subItem.path);
                                      }}
                                      onMouseEnter={() =>
                                        setHoveredItem(`sub-${subItem.path}`)
                                      }
                                      onMouseLeave={() => setHoveredItem(null)}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "13px 12px 13px 36px",
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
                                        fontSize:
                                          "13px" /* tamaño del texto del subitem del sidebar */,
                                        fontWeight: isSubActive
                                          ? "bold"
                                          : "normal",
                                        position: "relative",
                                        marginLeft: "0",
                                        marginRight: "0",
                                        borderRadius: "0",
                                        textDecoration: "none",
                                      }}
                                    >
                                      {/* indicator removed for a minimal look */}
                                      <span style={{ flex: 1 }}>
                                        {subItem.name}
                                      </span>
                                      {subItem.badge && (
                                        <span
                                          style={{
                                            padding: "2px 6px",
                                            borderRadius: "3px",
                                            fontSize:
                                              "9px" /* tamaño del texto del badge */,
                                            fontWeight: "bold",
                                            backgroundColor:
                                              "rgba(255, 255, 255, 0.15)",
                                            color: colors.text,
                                            textTransform: "uppercase",
                                          }}
                                        >
                                          {subItem.badge.text}
                                        </span>
                                      )}
                                    </a>
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
        `}</style>
      </div>
    </>
  );
}

export default SidebarAdmin;
