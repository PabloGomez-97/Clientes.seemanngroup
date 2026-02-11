// src/auth/Login.tsx
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";
import logoSeemann from "./logoseemann.png";
import { Link } from "react-router-dom";

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const PRIMARY = "#ff6200";
const DARK = "#1a1a1a";

export default function Login() {
  const { login, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const loggedUser = await login(email, password);

      if (loggedUser.username === "Administrador") {
        logout();
        setErr(t("home.login.executiveMessage"));
        setLoading(false);
        return;
      }
    } catch (e: unknown) {
      const error = e as { message?: string };
      setErr(error.message || t("home.login.loginError"));
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: FONT,
      }}
    >
      {/* Left brand panel */}
      <div
        style={{
          width: "42%",
          minHeight: "100vh",
          backgroundColor: DARK,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle geometric accent */}
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            right: "-120px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            border: `1px solid rgba(255, 98, 0, 0.08)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            right: "-60px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            border: `1px solid rgba(255, 98, 0, 0.05)`,
          }}
        />

        {/* Top: Logo */}
        <div>
          <img
            src={logoSeemann}
            alt="Seemann Group"
            style={{
              height: "80px",
              width: "auto",
              display: "block",
            }}
          />
        </div>

        {/* Center: Brand message */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: "32px",
              height: "3px",
              backgroundColor: PRIMARY,
              marginBottom: "24px",
            }}
          />
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "600",
              color: "#ffffff",
              lineHeight: "1.3",
              margin: "0 0 16px 0",
              letterSpacing: "-0.5px",
            }}
          >
            {t("home.login.title")}
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255, 255, 255, 0.5)",
              margin: 0,
              lineHeight: "1.6",
              maxWidth: "320px",
            }}
          >
            {t("home.login.subtitle")}
          </p>
        </div>

        {/* Bottom: Footer */}
        <p
          style={{
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.3)",
            margin: 0,
          }}
        >
          © {new Date().getFullYear()} Seemann Group
        </p>
      </div>

      {/* Right form panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
          padding: "48px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "380px" }}>
          {/* Language toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "48px",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => changeLanguage("es")}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: i18n.language === "es" ? "600" : "400",
                fontFamily: FONT,
                color: i18n.language === "es" ? DARK : "#999",
                backgroundColor:
                  i18n.language === "es" ? "#fff" : "transparent",
                border:
                  i18n.language === "es"
                    ? "1px solid #e5e5e5"
                    : "1px solid transparent",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => changeLanguage("en")}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: i18n.language === "en" ? "600" : "400",
                fontFamily: FONT,
                color: i18n.language === "en" ? DARK : "#999",
                backgroundColor:
                  i18n.language === "en" ? "#fff" : "transparent",
                border:
                  i18n.language === "en"
                    ? "1px solid #e5e5e5"
                    : "1px solid transparent",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              EN
            </button>
          </div>

          {/* Heading */}
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "600",
              color: DARK,
              margin: "0 0 6px 0",
              letterSpacing: "-0.3px",
            }}
          >
            {t("home.login.loginButton")}
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#888",
              margin: "0 0 36px 0",
              fontWeight: "400",
            }}
          >
            {t("home.login.subtitle")}
          </p>

          {/* Error */}
          {err && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                borderLeft: "3px solid #dc2626",
                padding: "12px 16px",
                marginBottom: "24px",
                borderRadius: "2px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#991b1b",
                  fontWeight: "400",
                  lineHeight: "1.5",
                }}
              >
                {err}
              </p>
            </div>
          )}

          <form onSubmit={onSubmit}>
            {/* Email */}
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#555",
                  marginBottom: "6px",
                }}
              >
                {t("home.login.emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t("home.login.emailPlaceholder")}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  fontFamily: FONT,
                  color: DARK,
                  backgroundColor: "#fff",
                  border: `1px solid ${focusedField === "email" ? PRIMARY : "#d4d4d4"}`,
                  borderRadius: "4px",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "28px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#555",
                  marginBottom: "6px",
                }}
              >
                {t("home.login.passwordLabel")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t("home.login.passwordPlaceholder")}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  fontFamily: FONT,
                  color: DARK,
                  backgroundColor: "#fff",
                  border: `1px solid ${focusedField === "password" ? PRIMARY : "#d4d4d4"}`,
                  borderRadius: "4px",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px 20px",
                fontSize: "14px",
                fontWeight: "500",
                fontFamily: FONT,
                color: "#fff",
                backgroundColor: loading ? "#ccc" : PRIMARY,
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
                letterSpacing: "0.2px",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#e55800";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = PRIMARY;
              }}
            >
              {loading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  {t("home.login.loggingIn")}
                </span>
              ) : (
                t("home.login.loginButton")
              )}
            </button>
          </form>

          {/* Divider + links */}
          <div
            style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid #e5e5e5",
            }}
          >
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: "13px",
                color: "#888",
                textAlign: "center",
              }}
            >
              {t("home.login.executiveLink")}{" "}
              <Link
                to="/login-admin"
                style={{
                  color: PRIMARY,
                  fontWeight: "500",
                  textDecoration: "none",
                }}
              >
                {t("home.login.executiveLinkText")}
              </Link>
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#aaa",
                textAlign: "center",
              }}
            >
              {t("home.login.helpText")}{" "}
              <span
                style={{
                  color: "#888",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                {t("home.login.helpLink")}
              </span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          /* Stack vertically on mobile */
        }
      `}</style>
    </div>
  );
}
