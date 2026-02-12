// src/auth/LoginAdmin.tsx
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";
import logoSeemann from "./logoseemann.png";

export default function LoginAdmin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      // ✅ Login retorna el usuario directamente
      const loggedUser = await login(email, password);

      // ✅ Validar inmediatamente si es Ejecutivo
      if (loggedUser.username !== "Ejecutivo") {
        // ❌ No es ejecutivo - hacer logout completo
        logout(); // ✅ ESTO limpia todo el estado
        setErr(
          "Acceso denegado. Esta área es exclusiva para ejecutivos. Por favor, ingresa como cliente usando el enlace de abajo.",
        );
        setLoading(false);
        return;
      }

      // ✅ Es ejecutivo - redirigir al dashboard
      navigate("/admin/dashboard", { replace: true });
    } catch (e: any) {
      setErr(e.message || "No se pudo iniciar sesión");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        position: "relative",
        padding: "20px",
      }}
    >
      {/* Patrón de fondo sutil */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%), 
                          radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.05) 2%, transparent 0%)`,
          backgroundSize: "100px 100px",
          opacity: 0.3,
          zIndex: 0,
        }}
      />

      {/* Contenido principal */}
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Logo y Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: "20px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
              marginBottom: "32px",
              border: "2px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <img
              src={logoSeemann}
              alt="Seemann Group"
              style={{
                height: "70px",
                width: "auto",
                display: "block",
              }}
            />
          </div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "white",
              marginBottom: "12px",
              letterSpacing: "-0.5px",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
            }}
          >
            Portal Administrativo
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255, 255, 255, 0.8)",
              margin: 0,
              fontWeight: "400",
            }}
          >
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Card del Formulario */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            padding: "40px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Error Alert */}
          {err && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "16px 18px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "start",
                gap: "12px",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 16 16"
                fill="#dc2626"
                style={{ flexShrink: 0, marginTop: "2px" }}
              >
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
              </svg>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#991b1b",
                    fontWeight: "500",
                    lineHeight: "1.5",
                  }}
                >
                  {err}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: "24px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "8px",
                  letterSpacing: "-0.2px",
                }}
              >
                Correo corporativo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ejecutivo@seemann.com"
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  fontSize: "15px",
                  color: "#1f2937",
                  backgroundColor: "#f9fafb",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#0f3460";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 4px rgba(15, 52, 96, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "32px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "8px",
                  letterSpacing: "-0.2px",
                }}
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  fontSize: "15px",
                  color: "#1f2937",
                  backgroundColor: "#f9fafb",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#0f3460";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 4px rgba(15, 52, 96, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px 24px",
                fontSize: "16px",
                fontWeight: "600",
                color: "white",
                background: loading
                  ? "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
                  : "linear-gradient(135deg, #0f3460 0%, #16213e 100%)",
                border: "none",
                borderRadius: "10px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                letterSpacing: "-0.2px",
                boxShadow: loading
                  ? "none"
                  : "0 4px 14px rgba(15, 52, 96, 0.4)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(15, 52, 96, 0.6)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 14px rgba(15, 52, 96, 0.4)";
                }
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      border: "2px solid white",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Verificando acceso...
                </>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  Ingresar al Panel
                </>
              )}
            </button>
          </form>

          {/* Link a Login de Clientes */}
          <div
            style={{
              marginTop: "28px",
              paddingTop: "24px",
              borderTop: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#6b7280",
                lineHeight: "1.6",
              }}
            >
              ¿Eres cliente?{" "}
              <Link
                to="/login"
                style={{
                  color: "#0f3460",
                  fontWeight: "600",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#16213e")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#0f3460")}
              >
                Ingresa aquí →
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: "32px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.6)",
              fontWeight: "400",
            }}
          >
            © {new Date().getFullYear()} Seemann Group. Todos los derechos
            reservados.
          </p>
        </div>
      </div>

      {/* Keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
