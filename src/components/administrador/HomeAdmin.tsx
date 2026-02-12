// src/components/administrador/HomeAdmin.tsx — Ejecutivo Dashboard Home
import { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface Cliente {
  id: string;
  email: string;
  username: string;
  nombreuser?: string;
  createdAt: string;
}

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Simple SVG spinner used while loading aggregated stats
function Spinner({
  size = 18,
  color = "#cbd5e1",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      style={{ display: "block" }}
      aria-hidden
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

function HomeAdmin() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [quotesCount, setQuotesCount] = useState<number | null>(null);
  const [airCount, setAirCount] = useState<number | null>(null);
  const [oceanCount, setOceanCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const displayName = user?.nombreuser || user?.username || "Ejecutivo";

  // ── Fetch clients and aggregate stats ──
  useEffect(() => {
    if (!token) return;
    const fetchClientes = async () => {
      try {
        const resp = await fetch("/api/ejecutivo/clientes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (resp.ok && Array.isArray(data?.clientes)) {
          setClientes(data.clientes);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    fetchClientes();
  }, [token]);

  useEffect(() => {
    if (!accessToken) return;
    setStatsLoading(true);

    // If no clients loaded yet:
    // - while `loading` (clients being fetched) keep counts null so UI shows spinner
    // - if clients finished loading and list is empty, set counts to 0
    if (!clientes || clientes.length === 0) {
      if (loading) {
        setQuotesCount(null);
        setAirCount(null);
        setOceanCount(null);
        // keep statsLoading true until clients finish fetching
        return;
      } else {
        setQuotesCount(0);
        setAirCount(0);
        setOceanCount(0);
        setStatsLoading(false);
        return;
      }
    }

    (async () => {
      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        } as Record<string, string>;

        // Fetch ocean shipments once and filter client-side
        let oceanAll: any[] = [];
        try {
          const oceanRes = await fetch(
            `https://api.linbis.com/ocean-shipments/all`,
            {
              headers,
            },
          );
          if (oceanRes.ok) {
            const d = await oceanRes.json();
            oceanAll = Array.isArray(d) ? d : [];
          }
        } catch {
          oceanAll = [];
        }

        const quotePromises = clientes.map((c) =>
          fetch(
            `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(c.username)}&SortBy=newest&ItemsPerPage=1`,
            { headers },
          ).then(async (r) => {
            if (!r.ok) return 0;
            const h = r.headers.get("x-total-count");
            if (h) return parseInt(h, 10);
            const d = await r.json();
            return Array.isArray(d) ? d.length : 0;
          }),
        );

        const airPromises = clientes.map((c) =>
          fetch(
            `https://api.linbis.com/air-shipments?ConsigneeName=${encodeURIComponent(c.username)}&SortBy=newest&ItemsPerPage=1`,
            { headers },
          ).then(async (r) => {
            if (!r.ok) return 0;
            const h = r.headers.get("x-total-count");
            if (h) return parseInt(h, 10);
            const d = await r.json();
            return Array.isArray(d) ? d.length : 0;
          }),
        );

        const quoteResults = await Promise.allSettled(quotePromises);
        const airResults = await Promise.allSettled(airPromises);

        const quotesTotal = quoteResults.reduce((sum, res) => {
          if (res.status === "fulfilled")
            return sum + (typeof res.value === "number" ? res.value : 0);
          return sum;
        }, 0);

        const airTotal = airResults.reduce((sum, res) => {
          if (res.status === "fulfilled")
            return sum + (typeof res.value === "number" ? res.value : 0);
          return sum;
        }, 0);

        const oceanTotal = oceanAll.filter((os: any) =>
          clientes.some((c) => os.consignee === c.username),
        ).length;

        setQuotesCount(quotesTotal);
        setAirCount(airTotal);
        setOceanCount(oceanTotal);
      } catch {
        /* ignore */
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [accessToken, clientes, loading]);

  // ── Derived: new clients this month / last 7 days ──
  const { newThisMonth, newLast7Days, recentClients } = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sorted = [...clientes].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      newThisMonth: clientes.filter((c) => new Date(c.createdAt) >= firstDay)
        .length,
      newLast7Days: clientes.filter(
        (c) => new Date(c.createdAt) >= sevenDaysAgo,
      ).length,
      recentClients: sorted.slice(0, 5),
    };
  }, [clientes]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  const today = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ fontFamily: FONT, maxWidth: 1200 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", margin: 0 }}
        >
          {greeting}, <span style={{ color: "#ff6200" }}>{displayName}</span>
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#a3a3a3",
            margin: "4px 0 0",
            textTransform: "capitalize",
          }}
        >
          {today}
        </p>
      </div>

      {/* Main Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {/* Clients Card */}
        <StatCard
          label="Clientes Asignados"
          value={loading ? "..." : String(clientes.length)}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ff6200"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          accent="#ff6200"
          bg="#fff7ed"
        />
        {/* New This Month */}
        <StatCard
          label="Nuevos clientes este mes"
          value={loading ? "..." : String(newThisMonth)}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
          accent="#059669"
          bg="#ecfdf5"
        />
        {/* New Last 7 Days */}
        <StatCard
          label="Nuevos clientes últimos 7 días"
          value={loading ? "..." : String(newLast7Days)}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          accent="#2563eb"
          bg="#eff6ff"
        />
        {/* Quotes */}
        <StatCard
          label="Cotizaciones Totales"
          value={
            statsLoading || quotesCount === null ? (
              <Spinner size={20} color="#7c3aed" />
            ) : (
              String(quotesCount)
            )
          }
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
          accent="#7c3aed"
          bg="#f5f3ff"
        />
      </div>

      {/* Shipments row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <StatCard
          label="Embarques Aéreos"
          value={
            statsLoading || airCount === null ? (
              <Spinner size={20} color="#0891b2" />
            ) : (
              String(airCount)
            )
          }
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0891b2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
          }
          accent="#0891b2"
          bg="#ecfeff"
        />
        <StatCard
          label="Embarques Marítimos"
          value={
            statsLoading || oceanCount === null ? (
              <Spinner size={20} color="#059669" />
            ) : (
              String(oceanCount)
            )
          }
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1" />
              <path d="M4 18l-1-5h18l-1 5" />
              <path d="M12 2v7" />
              <path d="M7 9h10" />
            </svg>
          }
          accent="#059669"
          bg="#ecfdf5"
        />
      </div>

      {/* Quick Actions + Recent Clients */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Quick Actions */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #f0f0f0",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1a1a1a",
              margin: "0 0 16px",
            }}
          >
            Acceso Rápido
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              {
                label: "Nueva Cotización",
                path: "/admin/cotizador-administrador",
                color: "#ff6200",
              },
              {
                label: "Reportería Clientes",
                path: "/admin/reporteriaclientes",
                color: "#2563eb",
              },
              {
                label: "Mis Clientes",
                path: "/admin/tusclientes",
                color: "#059669",
              },
              {
                label: "Reportería General",
                path: "/admin/reporteria",
                color: "#7c3aed",
              },
              { label: "Trackeos", path: "/admin/trackeos", color: "#0891b2" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "transparent",
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#1a1a1a",
                  textAlign: "left",
                  transition: "all 0.15s",
                  fontFamily: FONT,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    item.color;
                  (e.currentTarget as HTMLElement).style.background = "#fafafa";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "#f0f0f0";
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Clients */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #f0f0f0",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1a1a1a",
              margin: "0 0 16px",
            }}
          >
            Últimos Clientes Registrados
          </h3>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 30,
                color: "#a3a3a3",
                fontSize: 13,
              }}
            >
              Cargando...
            </div>
          ) : recentClients.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 30,
                color: "#a3a3a3",
                fontSize: 13,
              }}
            >
              Sin clientes registrados.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {recentClients.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "#ff6200",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {(c.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.username}
                    </div>
                    <div style={{ fontSize: 11, color: "#a3a3a3" }}>
                      {c.email}
                    </div>
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#a3a3a3", flexShrink: 0 }}
                  >
                    {new Date(c.createdAt).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable stat card ──
function StatCard({
  label,
  value,
  icon,
  accent,
  bg,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #f0f0f0",
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#a3a3a3",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: accent }}>
        {value}
      </div>
    </div>
  );
}

export default HomeAdmin;
