// src/components/administrador/ReporteriaClientes.tsx — Selective Client Reporting with 1h localStorage cache
import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
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

interface ClienteStats {
  airShipments: number;
  oceanShipments: number;
  quotesTotal: number;
  quotesThisMonth: number;
  invoicesTotal: number;
  fetchedAt: number; // timestamp for cache expiry
}

// ── Cache helpers (1 hour TTL) ──
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

const CLIENTS_CACHE_KEY = "rc_clients_list";
const STATS_CACHE_PREFIX = "rc_stats_";

function getCachedClients(): Cliente[] | null {
  try {
    const raw = localStorage.getItem(CLIENTS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CLIENTS_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedClients(data: Cliente[]) {
  try {
    localStorage.setItem(
      CLIENTS_CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {
    /* quota exceeded, ignore */
  }
}

function getCachedStats(username: string): ClienteStats | null {
  try {
    const raw = localStorage.getItem(STATS_CACHE_PREFIX + username);
    if (!raw) return null;
    const stats: ClienteStats = JSON.parse(raw);
    if (Date.now() - stats.fetchedAt > CACHE_TTL) {
      localStorage.removeItem(STATS_CACHE_PREFIX + username);
      return null;
    }
    return stats;
  } catch {
    return null;
  }
}

function setCachedStats(username: string, stats: ClienteStats) {
  try {
    localStorage.setItem(STATS_CACHE_PREFIX + username, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function ReporteriaClientes() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { token } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected client and its stats
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [selectedStats, setSelectedStats] = useState<ClienteStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // ── Fetch clients list (with cache) ──
  useEffect(() => {
    const fetchClientes = async () => {
      if (!token) return;

      // Check cache first
      const cached = getCachedClients();
      if (cached) {
        setClientes(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resp = await fetch("/api/ejecutivo/clientes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (!resp.ok)
          throw new Error(data?.error || "Error al cargar clientes");
        const lista: Cliente[] = Array.isArray(data?.clientes)
          ? data.clientes
          : [];
        setClientes(lista);
        setCachedClients(lista);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, [token]);

  // ── Fetch stats for ONE selected client ──
  const fetchStatsForClient = useCallback(
    async (cliente: Cliente) => {
      if (!accessToken) return;

      // Check cache first
      const cached = getCachedStats(cliente.username);
      if (cached) {
        setSelectedStats(cached);
        return;
      }

      setLoadingStats(true);
      setSelectedStats(null);

      const stats: ClienteStats = {
        airShipments: 0,
        oceanShipments: 0,
        quotesTotal: 0,
        quotesThisMonth: 0,
        invoicesTotal: 0,
        fetchedAt: Date.now(),
      };

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch all 4 APIs in parallel for this single client
      const [quotesResult, airResult, oceanResult, invoicesResult] =
        await Promise.allSettled([
          fetch(
            `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(cliente.username)}&SortBy=newest&ItemsPerPage=200`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
              },
            },
          ).then((r) => (r.ok ? r.json() : [])),

          fetch(
            `https://api.linbis.com/air-shipments?ConsigneeName=${encodeURIComponent(cliente.username)}&SortBy=newest&ItemsPerPage=200`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
              },
            },
          ).then((r) => (r.ok ? r.json() : [])),

          fetch(`https://api.linbis.com/ocean-shipments/all`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          }).then((r) => (r.ok ? r.json() : [])),

          fetch(
            `https://api.linbis.com/invoices?ConsigneeName=${encodeURIComponent(cliente.username)}&SortBy=newest&ItemsPerPage=200`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
              },
            },
          ).then((r) => (r.ok ? r.json() : [])),
        ]);

      // Quotes
      if (
        quotesResult.status === "fulfilled" &&
        Array.isArray(quotesResult.value)
      ) {
        stats.quotesTotal = quotesResult.value.length;
        stats.quotesThisMonth = quotesResult.value.filter((q: any) => {
          const d = new Date(q.date);
          return d >= firstDayOfMonth;
        }).length;
      }

      // Air
      if (airResult.status === "fulfilled" && Array.isArray(airResult.value)) {
        stats.airShipments = airResult.value.length;
      }

      // Ocean (filter client-side)
      if (
        oceanResult.status === "fulfilled" &&
        Array.isArray(oceanResult.value)
      ) {
        stats.oceanShipments = oceanResult.value.filter(
          (os: any) => os.consignee === cliente.username,
        ).length;
      }

      // Invoices
      if (
        invoicesResult.status === "fulfilled" &&
        Array.isArray(invoicesResult.value)
      ) {
        stats.invoicesTotal = invoicesResult.value.length;
      }

      setCachedStats(cliente.username, stats);
      setSelectedStats(stats);
      setLoadingStats(false);
    },
    [accessToken],
  );

  // When a client is selected, fetch stats
  const handleSelectClient = useCallback(
    (cliente: Cliente) => {
      setSelectedClient(cliente);
      fetchStatsForClient(cliente);
    },
    [fetchStatsForClient],
  );

  // Go back to list
  const handleBack = () => {
    setSelectedClient(null);
    setSelectedStats(null);
  };

  // Filtered client list
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientes;
    const q = searchQuery.toLowerCase();
    return clientes.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.nombreuser && c.nombreuser.toLowerCase().includes(q)),
    );
  }, [clientes, searchQuery]);

  // ── Loading state ──
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
          fontFamily: FONT,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid #f0f0f0",
              borderTop: "3px solid #ff9900",
              borderRadius: "50%",
              animation: "rc-spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ color: "#8d99a8", fontSize: 13 }}>
            Cargando clientes...
          </div>
          <style>{`@keyframes rc-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ fontFamily: FONT, padding: 40, textAlign: "center" }}>
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "24px 32px",
            display: "inline-block",
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#dc2626",
              marginBottom: 4,
            }}
          >
            Error
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{error}</div>
        </div>
      </div>
    );
  }

  // ── Client Detail View ──
  if (selectedClient) {
    const totalShipments = selectedStats
      ? selectedStats.airShipments + selectedStats.oceanShipments
      : 0;
    const score = selectedStats
      ? selectedStats.quotesThisMonth * 3 +
        totalShipments * 2 +
        selectedStats.invoicesTotal
      : 0;
    const level = score > 20 ? "Alto" : score > 5 ? "Medio" : "Bajo";
    const levelColor =
      score > 20 ? "#059669" : score > 5 ? "#d97706" : "#dc2626";

    return (
      <div style={{ fontFamily: FONT, maxWidth: 1200 }}>
        {/* Back button */}
        <button
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            marginBottom: 20,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f9fafb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver a la lista
        </button>

        {/* Client Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#232f3e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {(selectedClient.username || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#1f2937",
                margin: 0,
              }}
            >
              {selectedClient.username}
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "2px 0 0" }}>
              {selectedClient.email} · Registrado el{" "}
              {new Date(selectedClient.createdAt).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Loading Stats */}
        {loadingStats && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid #f0f0f0",
                borderTop: "3px solid #ff9900",
                borderRadius: "50%",
                animation: "rc-spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <div style={{ color: "#8d99a8", fontSize: 13 }}>
              Consultando datos de {selectedClient.username}... Esto puede
              tardar unos segundos la primera vez
            </div>
            <style>{`@keyframes rc-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Stats loaded */}
        {selectedStats && !loadingStats && (
          <>
            {/* Stat Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
                marginBottom: 24,
              }}
            >
              {[
                {
                  label: "Cotizaciones (total)",
                  value: selectedStats.quotesTotal,
                  color: "#7c3aed",
                  bg: "#f5f3ff",
                },
                {
                  label: "Cotizaciones (mes)",
                  value: selectedStats.quotesThisMonth,
                  color: "#2563eb",
                  bg: "#eff6ff",
                },
                {
                  label: "Embarques Aéreos",
                  value: selectedStats.airShipments,
                  color: "#0891b2",
                  bg: "#ecfeff",
                },
                {
                  label: "Embarques Marítimos",
                  value: selectedStats.oceanShipments,
                  color: "#059669",
                  bg: "#ecfdf5",
                },
                {
                  label: "Facturas",
                  value: selectedStats.invoicesTotal,
                  color: "#d97706",
                  bg: "#fffbeb",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 8,
                    }}
                  >
                    {card.label}
                  </div>
                  <div
                    style={{ fontSize: 28, fontWeight: 700, color: card.color }}
                  >
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail panels */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {/* Activity Breakdown */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: 16,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Desglose de Actividad
                </div>
                {[
                  {
                    label: "Cotizaciones totales",
                    value: selectedStats.quotesTotal,
                    color: "#7c3aed",
                  },
                  {
                    label: "Cotizaciones este mes",
                    value: selectedStats.quotesThisMonth,
                    color: "#2563eb",
                  },
                  {
                    label: "Embarques aéreos",
                    value: selectedStats.airShipments,
                    color: "#0891b2",
                  },
                  {
                    label: "Embarques marítimos",
                    value: selectedStats.oceanShipments,
                    color: "#059669",
                  },
                  {
                    label: "Facturas",
                    value: selectedStats.invoicesTotal,
                    color: "#d97706",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #f9fafb",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#374151" }}>
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: row.color,
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Client Info */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: 16,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Información del Cliente
                </div>
                {[
                  { label: "Empresa", value: selectedClient.username },
                  { label: "Email", value: selectedClient.email },
                  {
                    label: "Registrado",
                    value: new Date(
                      selectedClient.createdAt,
                    ).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }),
                  },
                  { label: "Total operaciones", value: String(totalShipments) },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid #f9fafb",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#374151" }}>
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1f2937",
                        textAlign: "right",
                        maxWidth: "60%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Activity Score */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: 16,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Score de Actividad
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{ fontSize: 40, fontWeight: 700, color: levelColor }}
                  >
                    {score}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: levelColor,
                      background:
                        levelColor === "#059669"
                          ? "#ecfdf5"
                          : levelColor === "#d97706"
                            ? "#fffbeb"
                            : "#fef2f2",
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {level}
                  </span>
                </div>
                <div
                  style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}
                >
                  Basado en cotizaciones mensuales (×3), embarques activos (×2)
                  y facturación (×1).
                </div>
                {/* Cache indicator */}
                <div
                  style={{
                    marginTop: 16,
                    padding: "8px 12px",
                    background: "#f9fafb",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  Datos en caché hasta{" "}
                  {new Date(
                    selectedStats.fetchedAt + CACHE_TTL,
                  ).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Client List View ──
  return (
    <div style={{ fontFamily: FONT, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{ fontSize: 22, fontWeight: 700, color: "#1f2937", margin: 0 }}
        >
          Reportería Clientes
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
          Selecciona un cliente para ver sus métricas y actividad
        </p>
      </div>

      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 20,
          padding: "14px 20px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i
            className="fa fa-users"
            style={{ fontSize: 16, color: "#ff9900" }}
          />
          <span style={{ fontSize: 24, fontWeight: 700, color: "#1f2937" }}>
            {clientes.length}
          </span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            clientes asignados
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          Caché: {getCachedClients() ? "activo" : "sin caché"}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            transition: "border-color 0.15s",
          }}
        >
          <svg width="16" height="16" fill="#9ca3af" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar cliente por nombre, empresa o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#1f2937",
              background: "transparent",
              fontFamily: FONT,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                padding: 2,
                fontSize: 16,
              }}
            >
              ×
            </button>
          )}
        </div>
        {searchQuery && (
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
            {filteredClients.length} resultado
            {filteredClients.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Client List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filteredClients.map((client) => {
          const hasCachedStats = !!getCachedStats(client.username);
          return (
            <div
              key={client.id}
              onClick={() => handleSelectClient(client)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ff9900";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#232f3e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {(client.username || "?").charAt(0).toUpperCase()}
              </div>

              {/* Client info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#1f2937",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {client.username}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {client.email}
                </div>
              </div>

              {/* Registration date */}
              <div style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>
                {new Date(client.createdAt).toLocaleDateString("es-CL", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>

              {/* Cache indicator */}
              {hasCachedStats && (
                <div
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    background: "#ecfdf5",
                    color: "#059669",
                  }}
                >
                  EN CACHÉ
                </div>
              )}

              {/* Arrow */}
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          {searchQuery
            ? `No se encontraron clientes para "${searchQuery}"`
            : "No hay clientes asignados a este ejecutivo."}
        </div>
      )}
    </div>
  );
}

export default ReporteriaClientes;
