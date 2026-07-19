// src/layouts/UserLayout.tsx
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import ChatWidget from "../components/Chatbot/ChatWidget";
import FeedbackWidget from "../components/cliente/FeedbackWidget";
import Footer from "../components/footer/Footer";
import { ChatbotProvider } from "../contexts/ChatbotContext";
import { useLinbisToken } from "../hooks/useLinbisToken";
import "./ClientShell.css";

/** Teléfonos: menú lateral como drawer superpuesto */
const MOBILE_BREAKPOINT = 768;
/** Tablets: rail compacto persistente por defecto */
const TABLET_BREAKPOINT = 1199;

/** Clave propia del portal cliente (no compartida con admin/proveedor) */
const SIDEBAR_PREF_KEY = "client.sidebarCollapsed";

const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

const isTabletViewport = () =>
  typeof window !== "undefined" && window.innerWidth <= TABLET_BREAKPOINT;

function UserLayout() {
  const { t } = useTranslation();
  const { accessToken, error, refreshAccessToken, ensureFreshToken, getTokenAgeMs } =
    useLinbisToken();
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [hasUserPref, setHasUserPref] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_PREF_KEY) !== null;
    } catch {
      return false;
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    // En teléfono el drawer siempre parte cerrado
    if (isMobileViewport()) return true;
    try {
      const stored = localStorage.getItem(SIDEBAR_PREF_KEY);
      if (stored !== null) return stored === "true";
    } catch {
      /* ignore */
    }
    // Sin preferencia: rail en tablet, expandido en desktop
    return isTabletViewport();
  });

  useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = isMobileViewport();

      setIsMobile((previousMobile) => {
        if (previousMobile !== mobile) {
          if (mobile) {
            // Al entrar a teléfono, el drawer parte cerrado
            setSidebarCollapsed(true);
          } else {
            // Al salir de teléfono, respetar preferencia o default por viewport
            let next = isTabletViewport();
            if (hasUserPref) {
              try {
                const stored = localStorage.getItem(SIDEBAR_PREF_KEY);
                if (stored !== null) next = stored === "true";
              } catch {
                /* ignore */
              }
            }
            setSidebarCollapsed(next);
          }
        }

        return mobile;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasUserPref]);

  const handleLogout = () => {
    // Token state is managed by useLinbisToken hook
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((previous) => {
      const next = !previous;
      // El estado del drawer en teléfono no se persiste
      if (!isMobileViewport()) {
        setHasUserPref(true);
        try {
          localStorage.setItem(SIDEBAR_PREF_KEY, String(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  // Mostrar error si falla
  if (error) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "40px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "#fee2e2",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <svg width="32" height="32" fill="#dc2626" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
                </svg>
              </div>
              <h4 style={{ color: "#1f2937", marginBottom: "12px" }}>
                {t("home.userLayout.connectionError")}
              </h4>
              <p style={{ color: "#6b7280", marginBottom: "24px" }}>{error}</p>
              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                {t("home.userLayout.retry")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatbotProvider>
      <div
        className="d-flex user-layout-shell"
        style={{ height: "100vh", position: "relative" }}
      >
        <Sidebar
          isCollapsed={sidebarCollapsed}
          isMobile={isMobile}
          onCloseMobile={() => setSidebarCollapsed(true)}
          onToggle={toggleSidebar}
        />

        <div
          className="flex-fill d-flex flex-column user-layout-frame"
          style={{ overflow: "hidden", position: "relative" }}
        >
          <Navbar
            onLogout={handleLogout}
            toggleSidebar={toggleSidebar}
            isSidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
          />

          <div
            ref={mainRef}
            className="flex-fill user-layout-main layout-main--sticky-footer"
            style={{
              overflowY: "auto",
              backgroundColor: "#f8f9fa",
              minHeight: 0,
            }}
          >
            <div className="layout-main__content">
              <Outlet
                context={{
                  accessToken,
                  refreshAccessToken,
                  ensureFreshToken,
                  getTokenAgeMs,
                  onLogout: handleLogout,
                }}
              />
            </div>
            <Footer />
          </div>
          <FeedbackWidget />
        </div>
        <ChatWidget />
      </div>
    </ChatbotProvider>
  );
}

export default UserLayout;
