// src/layouts/Sidebar-admin.tsx — Chrome Enterprise Dark (admin)
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { canSeeSidebarItem } from "../config/roleRoutes";
import { usePricingExpiryCount } from "../hooks/usePricingExpiryCount";
import { imgUrl } from "../config/images";
import logoSeemann from "./logoseemann.png";
import { handleSidebarNavigation } from "./sidebarNavigation";
import SidebarMenuBadge from "./SidebarMenuBadge";

interface SidebarAdminProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onCloseMobile: () => void;
  onToggle: () => void;
}

interface SubMenuItem {
  path: string;
  name: string;
  restrictedTo?: string | string[];
  hiddenForAdmin?: boolean;
  badge?: {
    text: string;
    type: "new" | "beta" | "admin";
  };
}

interface MenuItem {
  path?: string;
  name: string;
  icon: string;
  menuId?: string;
  restrictedTo?: string | string[];
  hiddenForAdmin?: boolean;
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

const ACCENT = "#ff6200";

function SidebarAdmin({
  isCollapsed,
  isMobile,
  onCloseMobile,
  onToggle,
}: SidebarAdminProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pricingExpiryCount = usePricingExpiryCount(
    !!user?.roles?.administrador || !!user?.roles?.pricing,
  );

  const isRail = isCollapsed && !isMobile;

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

  const menuSections: MenuSection[] = useMemo(
    () => [
      {
        items: [
          {
            path: "/admin/home",
            name: t("admin.sidebar.home"),
            icon: "fa fa-home",
          },
        ],
      },

      {
        title: t("admin.sidebar.sectionQuote"),
        items: [
          {
            path: "/admin/cotizador",
            name: t("admin.sidebar.quoter"),
            icon: "bi bi-currency-dollar",
          },
          {
            path: "/admin/simulador-cotizaciones",
            name: t("admin.sidebar.quoteSimulator"),
            icon: "fa fa-flask",
          },
          {
            path: "/admin/gestion-cotizador",
            name: t("admin.sidebar.quoteManagement"),
            icon: "fa fa-sliders-h",
            badge: { text: t("admin.sidebar.badgeChief"), type: "admin" as const },
          },
        ],
      },

      {
        title: t("admin.sidebar.sectionClients"),
        items: [
          {
            path: "/admin/clientes/comportamiento",
            name: t("admin.sidebar.clientAnalysis"),
            icon: "fa fa-chart-line",
            hiddenForAdmin: true,
          },
          {
            path: "/admin/operaciones/clientes/comportamiento",
            name: t("admin.sidebar.clientAnalysisGlobal"),
            icon: "fa fa-chart-line",
          },
          {
            path: "/admin/clientes/reporteria",
            name: t("admin.sidebar.clientDirectory"),
            icon: "fa fa-address-book",
            hiddenForAdmin: true,
          },
          {
            path: "/admin/operaciones/clientes/reporteria",
            name: t("admin.sidebar.clientDirectoryGlobal"),
            icon: "fa fa-address-book",
          },
        ],
      },

      {
        title: t("admin.sidebar.sectionOperations"),
        items: [
          {
            menuId: "operations",
            name: t("admin.sidebar.operations"),
            icon: "fa fa-route",
            subItems: [
              {
                path: "/admin/clientes/documentacion",
                name: t("admin.sidebar.clientDocumentation"),
                hiddenForAdmin: true,
              },
              {
                path: "/admin/operaciones/clientes/documentacion",
                name: t("admin.sidebar.globalDocumentation"),
              },
              {
                path: "/admin/clientes/tracking",
                name: t("admin.sidebar.shipmentMonitoring"),
                hiddenForAdmin: true,
              },
              {
                path: "/admin/operaciones/tracking",
                name: t("admin.sidebar.shipmentMonitoringGlobal"),
              },
            ],
          },
        ],
      },

      {
        title: t("admin.sidebar.sectionTariff"),
        items: [
          {
            path: "/admin/pricing",
            name: t("admin.sidebar.tariffAdmin"),
            icon: "fa fa-tags",
          },
          {
            path: "/admin/tarifario-completo",
            name: t("admin.sidebar.generalTariff"),
            icon: "fa fa-table",
          },
          {
            path: "/admin/documentos-proveedores",
            name: t("admin.sidebar.supplierDocumentation"),
            icon: "fa fa-file-alt",
          },
          {
            path: "/admin/correos-proveedores",
            name: t("admin.sidebar.providerEmails"),
            icon: "fa fa-envelope",
          },
          {
            path: "/admin/pricing/alertas",
            name: t("admin.sidebar.tariffAlerts"),
            icon: "fa fa-exclamation-triangle",
          },
        ],
      },

      {
        title: t("admin.sidebar.sectionReports"),
        items: [
          {
            menuId: "reports",
            path: "/admin/analisys-system",
            name: t("admin.sidebar.reports"),
            icon: "fa fa-chart-bar",
            subItems: [
              {
                path: "/admin/analisys-system",
                name: t("admin.sidebar.analisysSystem"),
                badge: { text: t("admin.sidebar.badgeChief"), type: "admin" as const },
              },
              {
                path: "/admin/reporteria/financiera/ejecutivo",
                name: t("admin.sidebar.quotesReport"),
                badge: { text: t("admin.sidebar.badgeChief"), type: "admin" as const },
              },
              {
                path: "/admin/reporteria/financiera/operacional",
                name: t("admin.sidebar.billingReport"),
                badge: { text: t("admin.sidebar.badgeChief"), type: "admin" as const },
              },
            ],
          },
        ],
      },

      {
        title: t("home.sidebar.sectionReference"),
        items: [
          {
            path: "/admin/consultar-tarifas",
            name: t("home.sidebar.rateConsult"),
            icon: "fa fa-tags",
          },
          {
            path: "/admin/historico-precios",
            name: t("home.sidebar.priceHistory"),
            icon: "fa fa-chart-line",
          },
          {
            path: "/admin/novedades",
            name: t("home.sidebar.novedades"),
            icon: "fa fa-newspaper",
          },
          {
            path: "/admin/promesas",
            name: t("home.sidebar.promesas"),
            icon: "fa fa-handshake",
          },
        ],
      },

      {
        title: t("admin.sidebar.sectionAdministration"),
        items: [
          {
            menuId: "administration",
            name: t("admin.sidebar.administration"),
            icon: "fa fa-shield-alt",
            subItems: [
              {
                path: "/admin/users",
                name: t("admin.sidebar.userManagement"),
                badge: { text: t("admin.sidebar.badgeChief"), type: "admin" as const },
              },
              {
                path: "/admin/agencia-aduanas",
                name: t("admin.sidebar.customsManagement"),
                badge: { text: t("admin.sidebar.badgeChief"), type: "admin" as const },
              },
              {
                path: "/admin/auditoria",
                name: t("admin.sidebar.audit"),
                badge: { text: t("admin.sidebar.badgeAudit"), type: "admin" as const },
              },
            ],
          },
        ],
      },
    ],
    [t],
  );

  // Filtro por permisos (restrictedTo + roles + hiddenForAdmin)
  const isAdmin = !!user?.roles?.administrador;

  const filteredSections = useMemo(
    () =>
      menuSections
        .map((s) => ({
          ...s,
          items: s.items
            .map((item) => ({
              ...item,
              subItems: item.subItems?.filter(
                (subItem) =>
                  canSeeByEmail(subItem.restrictedTo) &&
                  canSeeByRole(subItem.path) &&
                  !(isAdmin && subItem.hiddenForAdmin),
              ),
            }))
            .filter((item) => {
              if (!canSeeByEmail(item.restrictedTo)) return false;
              if (!canSeeByRole(item.path)) return false;
              if (isAdmin && item.hiddenForAdmin) return false;
              if (item.subItems) return item.subItems.length > 0;
              return true;
            }),
        }))
        .filter((s) => s.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menuSections, isAdmin, user?.email, user?.roles],
  );

  const pathMatches = (path: string, pathname: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const getMostSpecificMatchingPath = (
    paths: string[],
    pathname: string,
  ): string | null => {
    const matches = paths.filter((path) => pathMatches(path, pathname));
    if (matches.length === 0) return null;
    return matches.reduce((best, current) =>
      current.length > best.length ? current : best,
    );
  };

  /** Todas las rutas del menú filtrado (items + subitems) */
  const allNavPaths = useMemo(() => {
    const paths: string[] = [];
    for (const section of filteredSections) {
      for (const item of section.items) {
        if (item.path) paths.push(item.path);
        for (const sub of item.subItems || []) {
          paths.push(sub.path);
        }
      }
    }
    return paths;
  }, [filteredSections]);

  /**
   * Activo solo si es la ruta más específica que coincide.
   * Evita que /admin/pricing quede marcado en /admin/pricing/alertas.
   */
  const isActive = (path: string) =>
    getMostSpecificMatchingPath(allNavPaths, location.pathname) === path;

  // Auto-expandir el grupo con la ruta activa
  useEffect(() => {
    const activeGroups = filteredSections
      .flatMap((section) => section.items)
      .filter(
        (item) =>
          item.menuId &&
          item.subItems?.some((sub) => isActive(sub.path)),
      )
      .map((item) => item.menuId!) as string[];

    if (activeGroups.length > 0) {
      setExpandedMenus((prev) => [
        ...prev,
        ...activeGroups.filter((id) => !prev.includes(id)),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, filteredSections]);

  // Escape cierra el drawer en teléfono
  useEffect(() => {
    if (!isMobile || isCollapsed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isCollapsed, onCloseMobile]);

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

  const rootClass = [
    "csb-root",
    isMobile ? "csb-root--drawer" : "csb-root--docked",
    isMobile && isCollapsed ? "csb-root--drawer-hidden" : "",
    isRail ? "csb-root--rail" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {isMobile && !isCollapsed && (
        <button
          type="button"
          className="csb-scrim"
          onClick={onCloseMobile}
          aria-label={t("admin.sidebar.closeMenu")}
          tabIndex={-1}
        />
      )}

      <div className={rootClass} aria-hidden={isMobile && isCollapsed}>
        <div className="csb-header">
          <a
            href="/admin/home"
            className="csb-header__link"
            onClick={(e) => navigateFromSidebar(e, "/admin/home")}
            aria-label={t("admin.sidebar.home")}
            title={t("admin.sidebar.home")}
          >
            {isRail ? (
              <img src={imgUrl("/logo.png")} alt="Seemann" className="csb-logo--mark" />
            ) : (
              <img src={logoSeemann} alt="Seemann Group" className="csb-logo" />
            )}
          </a>
        </div>

        <nav className="csb-nav" aria-label={t("home.sidebar.navLabel")}>
          {filteredSections.map((section, sectionIdx) => (
            <div className="csb-section" key={sectionIdx}>
              {!isRail && section.title ? (
                <div className="csb-section__title">{section.title}</div>
              ) : sectionIdx > 0 && isRail ? (
                <div className="csb-section__divider" aria-hidden />
              ) : null}

              <ul className="csb-list">
                {section.items.map((item, itemIdx) => {
                  const visibleSubItems = item.subItems || [];
                  const hasSubItems = visibleSubItems.length > 0;
                  const isExpanded = item.menuId
                    ? expandedMenus.includes(item.menuId)
                    : false;
                  const isItemActive =
                    (item.path ? isActive(item.path) : false) ||
                    visibleSubItems.some((sub) => isActive(sub.path));
                  const showCount =
                    item.path === "/admin/pricing/alertas" &&
                    pricingExpiryCount > 0;

                  return (
                    <li key={itemIdx}>
                      <a
                        href={
                          item.path
                            ? item.path
                            : hasSubItems
                              ? visibleSubItems[0].path
                              : "#"
                        }
                        className={[
                          "csb-item",
                          isItemActive && (!hasSubItems || isRail)
                            ? "csb-item--active"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={isRail ? item.name : undefined}
                        onClick={(e) => {
                          if (hasSubItems) {
                            if (isRail) {
                              navigateFromSidebar(e, visibleSubItems[0].path);
                            } else {
                              e.preventDefault();
                              toggleMenu(item.menuId!);
                            }
                          } else if (item.path) {
                            navigateFromSidebar(e, item.path);
                          }
                        }}
                        aria-expanded={
                          hasSubItems && !isRail ? isExpanded : undefined
                        }
                        aria-current={
                          !hasSubItems && isItemActive ? "page" : undefined
                        }
                      >
                        <i className={`csb-item__icon ${item.icon}`} aria-hidden />

                        {!isRail && (
                          <>
                            <span className="csb-item__label">
                              {item.name}
                              {item.badge && (
                                <SidebarMenuBadge
                                  text={item.badge.text}
                                  type={item.badge.type}
                                  accentColor={ACCENT}
                                />
                              )}
                            </span>

                            {showCount && (
                              <span className="csb-count">
                                {pricingExpiryCount > 99
                                  ? "99+"
                                  : pricingExpiryCount}
                              </span>
                            )}

                            {hasSubItems && (
                              <i
                                className={[
                                  "fa fa-chevron-right csb-item__chevron",
                                  isExpanded ? "csb-item__chevron--open" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                aria-hidden
                              />
                            )}
                          </>
                        )}
                      </a>

                      {!isRail && hasSubItems && (
                        <div
                          className="csb-subwrap"
                          style={{ maxHeight: isExpanded ? "400px" : "0" }}
                        >
                          <ul className="csb-sublist">
                            {visibleSubItems.map((subItem, subIdx) => {
                              const activeSubPath = getMostSpecificMatchingPath(
                                visibleSubItems.map((s) => s.path),
                                location.pathname,
                              );
                              const isSubActive = subItem.path === activeSubPath;
                              return (
                                <li key={subIdx}>
                                  <a
                                    href={subItem.path}
                                    className={[
                                      "csb-subitem",
                                      isSubActive ? "csb-subitem--active" : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateFromSidebar(e, subItem.path);
                                    }}
                                    aria-current={
                                      isSubActive ? "page" : undefined
                                    }
                                  >
                                    {subItem.name}
                                    {subItem.badge && (
                                      <SidebarMenuBadge
                                        text={subItem.badge.text}
                                        type={subItem.badge.type}
                                        accentColor={ACCENT}
                                      />
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

        {/* Colapsar / cerrar */}
        <div className="csb-collapse">
          <button
            type="button"
            className="csb-collapse__btn"
            onClick={onToggle}
            aria-label={
              isMobile
                ? t("admin.sidebar.closeNavAria")
                : isCollapsed
                  ? t("admin.sidebar.expandSidebarAria")
                  : t("admin.sidebar.collapseSidebarAria")
            }
            title={
              isMobile
                ? t("admin.sidebar.closeMenu")
                : isCollapsed
                  ? t("admin.sidebar.expand")
                  : t("admin.sidebar.collapse")
            }
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              style={{ flexShrink: 0 }}
              aria-hidden
            >
              <path
                d={isRail ? "M5.5 3.5 9 8l-3.5 4.5" : "M10.5 3.5 7 8l3.5 4.5"}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 2.5v11"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.65"
              />
            </svg>
            {!isRail && (
              <span>
                {isMobile
                  ? t("admin.sidebar.closeMenu")
                  : t("admin.sidebar.collapseMenu")}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default SidebarAdmin;
