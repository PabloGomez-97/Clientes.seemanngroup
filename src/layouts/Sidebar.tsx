// src/layouts/Sidebar.tsx - AWS/Azure Minimalist Design
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import logoSeemann from "./logoseemann.png";

interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
}

interface SubMenuItem {
  path: string;
  name: string;
}

interface MenuItem {
  path?: string;
  name: string;
  icon: string;
  badge?: {
    text: string;
    type: "new" | "beta" | "trial" | "try";
  };
  subItems?: SubMenuItem[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Design tokens - AWS/Azure inspired
const colors = {
  bg: "#232f3e",
  bgHover: "#2d3a4a",
  bgActive: "#1a242f",
  text: "#ffffff",
  textMuted: "#8d99a8",
  border: "#3b4754",
  accent: "#ff9900",
};

function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, activeUsername, setActiveUsername } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Reports"]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Determinar si se muestra el selector de cuenta
  const usernames = user?.usernames || [];
  const showAccountSelector = usernames.length > 1;

  const menuSections: MenuSection[] = [
    {
      title: t("home.sidebar.dashboard"),
      items: [
        { path: "/", name: t("home.sidebar.home"), icon: "fa fa-home" },
        {
          path: "/newquotes",
          name: t("home.sidebar.quoteHere"),
          icon: "fa fa-calculator",
        },
      ],
    },
    {
      title: t("home.sidebar.quotesOperations"),
      items: [
        {
          path: "/quotes",
          name: t("home.sidebar.quotes"),
          icon: "fa fa-folder-open",
        },
        {
          path: "/air-shipments",
          name: t("home.sidebar.airOperations"),
          icon: "fa fa-plane",
        },
        {
          path: "/ocean-shipments",
          name: t("home.sidebar.oceanOperations"),
          icon: "fa fa-ship",
        },
      ],
    },
    {
      title: t("home.sidebar.news"),
      items: [
        {
          path: "/novedades",
          name: t("home.sidebar.novedades"),
          icon: "fa fa-newspaper",
        },
      ],
    },
    {
      title: t("home.sidebar.trackingOperations"),
      items: [
        {
          path: "/new-tracking",
          name: t("home.sidebar.trackNewShipment"),
          icon: "fa fa-route",
        },
        {
          path: "/trackings",
          name: t("home.sidebar.myShipments"),
          icon: "fa fa-route",
        },
      ],
    },
    {
      title: t("home.sidebar.reports"),
      items: [
        {
          name: t("home.sidebar.reporting"),
          icon: "fa fa-chart-bar",
          subItems: [
            { path: "/financiera", name: t("home.sidebar.financial") },
            { path: "/operacional", name: t("home.sidebar.operational") },
          ],
        },
      ],
    },
  ];

  if (!isOpen) return null;

  const isActive = (path: string) => location.pathname === path;

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
      className="sidebar-scroll"
    >
      {/* Header con Logo */}
      <div
        className="sidebar-header"
        style={{
          height: "70px",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {/* Logo - Cambiar tamaño aquí: width controla el tamaño */}
        <img
          src={logoSeemann}
          alt="Seemann Group"
          className="sidebar-logo"
          style={{
            width: "180px", // <-- CAMBIAR AQUÍ EL TAMAÑO DEL LOGO
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Account Selector - solo si el usuario tiene más de una empresa */}
      {showAccountSelector && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "10px",
              fontWeight: "600",
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: "6px",
            }}
          >
            {t("sidebar.account")}
          </label>
          <select
            value={activeUsername}
            onChange={(e) => {
              setActiveUsername(e.target.value);
              // Limpiar cachés al cambiar de cuenta
              const keysToRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (
                  key &&
                  (key.startsWith("quotesCache_") ||
                    key.startsWith("airShipmentsCache_") ||
                    key.startsWith("oceanShipmentsCache_") ||
                    key.startsWith("invoicesCache_") ||
                    key.startsWith("shipmentsCache_"))
                ) {
                  keysToRemove.push(key);
                }
              }
              keysToRemove.forEach((k) => localStorage.removeItem(k));
              // Recargar la página para refrescar datos
              window.location.reload();
            }}
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: "13px",
              fontWeight: "500",
              backgroundColor: colors.bgHover,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: "6px",
              outline: "none",
              cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238d99a8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              paddingRight: "30px",
            }}
          >
            {usernames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {menuSections.map((section, sectionIdx) => (
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

                      {/* Badge (if exists) */}
                      {item.badge && (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: "9px",
                            fontWeight: "600",
                            backgroundColor: "rgba(255, 255, 255, 0.15)",
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
        .sidebar-scroll::-webkit-scrollbar {
          width: 0;
        }
        
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: transparent;
        }
        
        /* Responsive: Tablets */
        @media (max-width: 1024px) {
          .sidebar-scroll {
            width: 240px !important;
            min-width: 240px !important;
          }
          .sidebar-logo {
            width: 150px !important;
          }
          .sidebar-header {
            height: 60px !important;
          }
        }
        
        /* Responsive: Mobile */
        @media (max-width: 768px) {
          .sidebar-scroll {
            position: fixed !important;
            z-index: 1000 !important;
            width: 280px !important;
            min-width: 280px !important;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3) !important;
          }
          .sidebar-logo {
            width: 160px !important;
          }
          .sidebar-header {
            height: 65px !important;
            padding: 0 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Sidebar;
