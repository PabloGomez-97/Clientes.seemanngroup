// src/layouts/Sidebar-proveedor.tsx — Chrome Enterprise Dark (proveedores)
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoSeemann from "./logoseemann.png";
import { handleSidebarNavigation } from "./sidebarNavigation";
import SidebarMenuBadge from "./SidebarMenuBadge";
import { imgUrl } from "../config/images";

interface SidebarProveedorProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onCloseMobile: () => void;
  onToggle: () => void;
}

interface SubMenuItem {
  path: string;
  name: string;
}

interface MenuItem {
  path?: string;
  name: string;
  icon: string;
  menuId?: string;
  badge?: {
    text: string;
    type: "new" | "beta";
  };
  subItems?: SubMenuItem[];
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

const ACCENT = "#ff6200";

function SidebarProveedor({
  isCollapsed,
  isMobile,
  onCloseMobile,
  onToggle,
}: SidebarProveedorProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const isRail = isCollapsed && !isMobile;

  const menuSections: MenuSection[] = useMemo(
    () => [
      {
        items: [
          {
            path: "/proveedor/home",
            name: t("proveedor.sidebar.home"),
            icon: "fa fa-home",
          },
          {
            menuId: "tarifario",
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
          {
            path: "/proveedor/ultima-milla",
            name: t("proveedor.sidebar.ultimaMilla"),
            icon: "fa fa-truck",
          },
        ],
      },
      {
        title: t("home.sidebar.sectionReference"),
        items: [
          {
            path: "/proveedor/consultar-tarifas",
            name: t("home.sidebar.rateConsult"),
            icon: "fa fa-tags",
          },
          {
            path: "/proveedor/historico-precios",
            name: t("home.sidebar.priceHistory"),
            icon: "fa fa-chart-line",
          },
          {
            path: "/proveedor/novedades",
            name: t("home.sidebar.novedades"),
            icon: "fa fa-newspaper",
          },
          {
            path: "/proveedor/promesas",
            name: t("home.sidebar.promesas"),
            icon: "fa fa-handshake",
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
    ],
    [t],
  );

  const pathMatches = (path: string, pathname: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const getMostSpecificMatchingPath = (
    paths: string[],
    pathname: string,
  ): string | null => {
    const matches = paths.filter((p) => pathMatches(p, pathname));
    if (matches.length === 0) return null;
    return matches.reduce((best, current) =>
      current.length > best.length ? current : best,
    );
  };

  const allNavPaths = useMemo(() => {
    const paths: string[] = [];
    for (const section of menuSections) {
      for (const item of section.items) {
        if (item.path) paths.push(item.path);
        for (const sub of item.subItems || []) {
          paths.push(sub.path);
        }
      }
    }
    return paths;
  }, [menuSections]);

  const isActive = (path: string) =>
    getMostSpecificMatchingPath(allNavPaths, location.pathname) === path;

  // Auto-expandir el grupo con la ruta activa
  useEffect(() => {
    const activeGroups = menuSections
      .flatMap((section) => section.items)
      .filter(
        (item) => item.menuId && item.subItems?.some((sub) => isActive(sub.path)),
      )
      .map((item) => item.menuId!) as string[];

    if (activeGroups.length > 0) {
      setExpandedMenus((prev) => [
        ...prev,
        ...activeGroups.filter((id) => !prev.includes(id)),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, menuSections]);

  // Escape cierra el drawer en teléfono
  useEffect(() => {
    if (!isMobile || isCollapsed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isCollapsed, onCloseMobile]);

  const toggleMenu = (name: string) =>
    setExpandedMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

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
          aria-label={t("home.sidebar.closeMenu")}
          tabIndex={-1}
        />
      )}

      <div className={rootClass} aria-hidden={isMobile && isCollapsed}>
        <div className="csb-header">
          <a
            href="/proveedor/home"
            className="csb-header__link"
            onClick={(e) => navigateFromSidebar(e, "/proveedor/home")}
            aria-label={t("proveedor.sidebar.home")}
            title={t("proveedor.sidebar.home")}
          >
            {isRail ? (
              <img src={imgUrl("/logo.png")} alt="Seemann" className="csb-logo--mark" />
            ) : (
              <img src={logoSeemann} alt="Seemann Group" className="csb-logo" />
            )}
          </a>
        </div>

        {!isRail && (
          <div className="csb-portal">
            <span className="csb-portal__label">
              {t("proveedor.sidebar.portalLabel")}
            </span>
            <span className="csb-portal__badge">
              {t("proveedor.sidebar.badge")}
            </span>
          </div>
        )}

        <nav className="csb-nav" aria-label={t("home.sidebar.navLabel")}>
          {menuSections.map((section, sectionIdx) => (
            <div className="csb-section" key={sectionIdx}>
              {!isRail && section.title ? (
                <div className="csb-section__title">{section.title}</div>
              ) : sectionIdx > 0 && isRail ? (
                <div className="csb-section__divider" aria-hidden />
              ) : null}

              <ul className="csb-list">
                {section.items.map((item, itemIdx) => {
                  const hasSubItems = !!item.subItems?.length;
                  const isExpanded = item.menuId
                    ? expandedMenus.includes(item.menuId)
                    : false;
                  const isItemActive = item.path
                    ? isActive(item.path)
                    : item.subItems?.some((s) => isActive(s.path)) || false;

                  return (
                    <li key={itemIdx}>
                      <a
                        href={item.path ?? item.subItems?.[0]?.path ?? "#"}
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
                              navigateFromSidebar(e, item.subItems![0].path);
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
                            {item.subItems!.map((subItem, subIdx) => {
                              const isSubActive = isActive(subItem.path);
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
                                    onClick={(e) =>
                                      navigateFromSidebar(e, subItem.path)
                                    }
                                    aria-current={
                                      isSubActive ? "page" : undefined
                                    }
                                  >
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

        {/* Colapsar / cerrar */}
        <div className="csb-collapse">
          <button
            type="button"
            className="csb-collapse__btn"
            onClick={onToggle}
            aria-label={
              isMobile
                ? t("home.sidebar.closeMenu")
                : isCollapsed
                  ? t("home.sidebar.expandMenu")
                  : t("home.sidebar.collapseMenu")
            }
            title={
              isMobile
                ? t("home.sidebar.closeMenu")
                : isCollapsed
                  ? t("home.sidebar.expandMenu")
                  : t("home.sidebar.collapseMenu")
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
                  ? t("home.sidebar.closeMenu")
                  : t("home.sidebar.collapseMenu")}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default SidebarProveedor;
