import { useEffect, useState } from "react";

/**
 * Si React Router de Chile atrapa /mx, el rewrite de Vercel no se aplicó
 * (p. ej. soft-nav o /mx/ mal enrutado). Intentamos un hard reload a /mx
 * una vez; si sigue fallando, mostramos el mensaje de diagnóstico.
 */
export default function MexicoPortalBridge() {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const key = "mx_bridge_reload";
    if (sessionStorage.getItem(key) === "1") {
      setShowFallback(true);
      return;
    }
    sessionStorage.setItem(key, "1");
    // Sin barra final: /mx/ historicamente caía en el SPA de Chile.
    window.location.replace("/mx");
  }, []);

  if (!showFallback) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#555",
        }}
      >
        Redirigiendo a México…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        background: "#fafafa",
        color: "#1a1a1a",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>
          Portal México no disponible
        </h1>
        <p style={{ color: "#555", lineHeight: 1.5, marginBottom: 20 }}>
          El enrutamiento <code>/mx</code> no está llegando al proyecto de
          Seemann México en Vercel. Revisa el rewrite en{" "}
          <code>vercel.json</code> de Chile y que el deploy de México esté
          activo.
        </p>
        <a
          href="/login"
          onClick={() => {
            sessionStorage.removeItem("mx_bridge_reload");
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_tenant");
            localStorage.removeItem("active_username");
          }}
          style={{
            display: "inline-block",
            background: "#ff6200",
            color: "#fff",
            textDecoration: "none",
            padding: "10px 18px",
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          Volver al login
        </a>
      </div>
    </div>
  );
}
