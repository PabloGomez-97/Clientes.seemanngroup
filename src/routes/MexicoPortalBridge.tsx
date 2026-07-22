/**
 * Si llegamos aquí, Vercel está sirviendo la SPA de Chile en /mx
 * (el rewrite al proyecto México no funcionó). Evita el loop con /login.
 */
export default function MexicoPortalBridge() {
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
