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

interface SubMenuItem {
  path: string;
  name: string;
}

interface MenuItem {
  path?: string;
  name: string;
  icon: string;
  subItems?: SubMenuItem[];
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
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
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleMenu = (name: string) =>
    setExpandedMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  const menuSections: MenuSection[] = [
    {
      items: [
        {
          path: "/proveedor/home",
          name: t("proveedor.sidebar.home"),
          icon: "fa fa-home",
        },
        {
          name: t("proveedor.sidebar.sectionTarifario"),
          icon: "fa fa-tag",
          subItems: [
            {
              path: "/proveedor/tarifario-aereo",
              name: t("proveedor.sidebar.tarifarioAereo"),
            },
            {
              path: "/proveedor/tarifario-fcl",
              name: t("proveedor.sidebar.tarifarioFCL"),
            },
            {
              path: "/proveedor/tarifario-lcl",
              name: t("proveedor.sidebar.tarifarioLCL"),
            },
          ],
        },
      ],
    },
    {
      items: [
        {
          path: "/proveedor/internacionalizacion",
          name: t("proveedor.sidebar.internacionalizacion"),
          icon: "fa fa-university",
        },
        {
          path: "/proveedor/archivos",
          name: t("proveedor.sidebar.archivos"),
          icon: "fa fa-file",
        },
        {
          path: "/proveedor/ayuda",
          name: t("proveedor.sidebar.ayuda"),
          icon: "fa fa-question-circle",
        },
      ],
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
          {menuSections.map((section, sectionIdx) => (
            <div
              key={sectionIdx}
              style={{
                marginBottom: isCollapsed && !isMobile ? "10px" : "4px",
              }}
            >
              {sectionIdx > 0 && isCollapsed ? (
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
                  const isExpanded = expandedMenus.includes(item.name);
                  const isItemActive = item.path
                    ? isActive(item.path)
                    : item.subItems?.some((s) => isActive(s.path)) || false;
                  const isHovered = hoveredItem === `${sectionIdx}-${itemIdx}`;

                  return (
                    <li key={itemIdx}>
                      <a
                        href={item.path ?? item.subItems?.[0]?.path ?? "#"}
                        title={isCollapsed ? item.name : undefined}
                        onClick={(e) => {
                          if (hasSubItems) {
                            if (isCollapsed) {
                              navigateFromSidebar(e, item.subItems![0].path);
                            } else {
                              e.preventDefault();
                              toggleMenu(item.name);
                            }
                          } else if (item.path) {
                            navigateFromSidebar(e, item.path);
                          }
                        }}
                        onMouseEnter={() =>
                          setHoveredItem(`${sectionIdx}-${itemIdx}`)
                        }
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
                          <>
                            <span
                              style={{
                                flex: 1,
                                fontSize: "14px",
                                fontWeight: isItemActive ? "500" : "400",
                              }}
                            >
                              {item.name}
                            </span>
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
                          </>
                        )}
                      </a>

                      {!isCollapsed && hasSubItems && (
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
                              const isSubActive = isActive(subItem.path);
                              const isSubHovered =
                                hoveredItem === `sub-${subItem.path}`;

                              return (
                                <li key={subIdx}>
                                  <a
                                    href={subItem.path}
                                    onClick={(e) =>
                                      navigateFromSidebar(e, subItem.path)
                                    }
                                    onMouseEnter={() =>
                                      setHoveredItem(`sub-${subItem.path}`)
                                    }
                                    onMouseLeave={() => setHoveredItem(null)}
                                    style={{
                                      display: "block",
                                      padding: "10px 20px 10px 56px",
                                      textDecoration: "none",
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
                                    }}
                                  >
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
                                      }}
                                    />
                                    {subItem.name}
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
