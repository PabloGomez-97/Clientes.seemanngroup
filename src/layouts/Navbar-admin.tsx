// src/layouts/Navbar-admin.tsx - AWS/Azure Minimalist Design (same as client)
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

// Design tokens - AWS/Azure inspired (same as client Navbar)
const colors = {
  bg: "#232f3e",
  bgHover: "#2d3a4a",
  text: "#ffffff",
  textMuted: "#8d99a8",
  border: "#3b4754",
  accent: "#ff9900",
};

interface NavbarAdminProps {
  accessToken: string;
  onLogout: () => void;
  toggleSidebar: () => void;
}

function NavbarAdmin({
  accessToken,
  onLogout,
  toggleSidebar,
}: NavbarAdminProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [showProfile, setShowProfile] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);

  // User data
  const username = user?.nombreuser || user?.username || "Ejecutivo";
  const email = user?.email || "admin@sphereglobal.io";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  const initials = getInitials(username);

  const getUserImage = (nombre?: string) => {
    if (!nombre) return null;
    const partes = nombre.trim().split(" ");
    if (partes.length < 2) return null;
    return `/ejecutivos/${partes[0][0].toLowerCase()}${partes[1][0].toLowerCase()}.png`;
  };
  const userImage = getUserImage(user?.nombreuser);

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    setShowProfile(false);
  };

  // Keyboard shortcut: Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowProfile(false);
        setShowLanguage(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".admin-profile-dropdown") &&
        !target.closest(".admin-profile-button")
      ) {
        setShowProfile(false);
      }
      if (
        !target.closest(".admin-language-dropdown") &&
        !target.closest(".admin-language-button")
      ) {
        setShowLanguage(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      className="main-navbar-admin"
      style={{
        height: "70px",
        minHeight: "70px",
        maxHeight: "70px",
        flexShrink: 0,
        backgroundColor: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 20px",
        gap: "12px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        fontFamily:
          '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Right Section - Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Language Selector */}
        <div style={{ position: "relative" }}>
          <button
            className="admin-language-button"
            onClick={() => setShowLanguage(!showLanguage)}
            style={{
              height: "36px",
              padding: "0 12px",
              borderRadius: "4px",
              border: `1px solid ${colors.border}`,
              backgroundColor: showLanguage ? colors.bgHover : "transparent",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: colors.text,
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!showLanguage)
                e.currentTarget.style.backgroundColor = colors.bgHover;
            }}
            onMouseLeave={(e) => {
              if (!showLanguage)
                e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span>{i18n.language === "es" ? "ES" : "EN"}</span>
            <svg
              width="12"
              height="12"
              fill="currentColor"
              viewBox="0 0 16 16"
              style={{
                transform: showLanguage ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            >
              <path
                fillRule="evenodd"
                d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
              />
            </svg>
          </button>

          {showLanguage && (
            <div
              className="admin-language-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "120px",
                backgroundColor: "#ffffff",
                borderRadius: "6px",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
                zIndex: 1000,
              }}
            >
              {[
                { code: "es", label: "Español" },
                { code: "en", label: "English" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setShowLanguage(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    backgroundColor: "transparent",
                    textAlign: "left",
                    color: "#374151",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div style={{ position: "relative" }}>
          <button
            className="admin-profile-button"
            onClick={() => setShowProfile(!showProfile)}
            style={{
              height: "36px",
              padding: "0 12px",
              borderRadius: "4px",
              border: `1px solid ${colors.border}`,
              backgroundColor: showProfile ? colors.bgHover : "transparent",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!showProfile)
                e.currentTarget.style.backgroundColor = colors.bgHover;
            }}
            onMouseLeave={(e) => {
              if (!showProfile)
                e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "4px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.text,
                fontSize: "11px",
                fontWeight: "600",
                overflow: "hidden",
              }}
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt={username}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                initials
              )}
            </div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: colors.text,
              }}
            >
              {username}
            </span>
            <svg
              width="12"
              height="12"
              fill={colors.textMuted}
              viewBox="0 0 16 16"
              style={{
                transition: "transform 0.15s ease",
                transform: showProfile ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <path
                fillRule="evenodd"
                d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
              />
            </svg>
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <div
              className="admin-profile-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "320px",
                backgroundColor: "#ffffff",
                borderRadius: "6px",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
                zIndex: 1000,
                fontFamily:
                  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {/* User info header */}
              <div
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "6px",
                      backgroundColor: colors.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: "16px",
                      fontWeight: "600",
                      overflow: "hidden",
                    }}
                  >
                    {userImage ? (
                      <img
                        src={userImage}
                        alt={username}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1f2937",
                        marginBottom: "2px",
                      }}
                    >
                      {username}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <div style={{ padding: "12px 16px" }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    backgroundColor: "#ffffff",
                    color: "#dc2626",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fef2f2";
                    e.currentTarget.style.borderColor = "#fecaca";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"
                    />
                    <path
                      fillRule="evenodd"
                      d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"
                    />
                  </svg>
                  {t("home.navbar.profile.logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        /* Responsive: Tablets */
        @media (max-width: 1024px) {
          .main-navbar-admin {
            height: 60px !important;
            min-height: 60px !important;
            max-height: 60px !important;
            padding: 0 16px !important;
          }
        }
        
        /* Responsive: Mobile */
        @media (max-width: 768px) {
          .main-navbar-admin {
            height: 65px !important;
            min-height: 65px !important;
            max-height: 65px !important;
            padding: 0 12px !important;
          }
        }
      `}</style>
    </nav>
  );
}

export default NavbarAdmin;
