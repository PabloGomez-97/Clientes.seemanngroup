// src/components/administrador/ComportamientoDeClientes.tsx
// Behavior tracking dashboard – read-only view for ejecutivos
import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
}

// ── Types ──
interface ClientStats {
  totalEvents: number;
  quotesStarted: number;
  quotesCompleted: number;
  quotesAbandoned: number;
  completionRate: number;
  lastActivity: string;
  quoteTypes: string[];
}

interface ClientBehavior {
  email: string;
  username: string;
  usernames?: string[];
  nombreuser?: string;
  parentUsername?: string;
  stats: ClientStats | null;
}

interface Session {
  sessionId: string;
  quoteType: string;
  startedAt: string;
  endedAt: string;
  status: "completed" | "abandoned" | "in_progress";
  route: { origin: string; destination: string } | null;
  lastStep: { step: string; stepNumber: number; totalSteps: number } | null;
  eventsCount: number;
}

interface ClientDetail {
  sessions: Session[];
  summary: {
    totalSessions: number;
    completed: number;
    abandoned: number;
    byType: Record<
      string,
      { started: number; completed: number; abandoned: number }
    >;
  };
}

interface Analytics {
  abandonmentByStep: { quoteType: string; step: string; count: number }[];
  abandonmentByType: { quoteType: string; event: string; count: number }[];
  topRoutes: {
    origin: string;
    destination: string;
    quoteType: string;
    count: number;
  }[];
  completionTrend: { date: string; event: string; count: number }[];
}

// ── Expand accounts with multiple company names into separate list entries ──
function expandClients(rawClients: ClientBehavior[]): ClientBehavior[] {
  const expanded: ClientBehavior[] = [];
  for (const client of rawClients) {
    const names =
      client.usernames && client.usernames.length > 1
        ? client.usernames
        : [client.username];
    for (let i = 0; i < names.length; i++) {
      expanded.push({
        ...client,
        username: names[i],
        parentUsername: i > 0 ? names[0] : undefined,
      });
    }
  }
  return expanded;
}

// ── Helpers ──
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-CL");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const stepLabels: Record<string, string> = {
  commodity: "Detalles de carga",
  incoterm_charges: "Incoterm y cargos",
  route_selection: "Selección de ruta",
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> =
  {
    completed: { bg: "#ecfdf5", text: "#065f46", dot: "#10b981" },
    abandoned: { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444" },
    in_progress: { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  };

const statusLabels: Record<string, string> = {
  completed: "Completada",
  abandoned: "Abandonada",
  in_progress: "En progreso",
};

const typeColors: Record<string, string> = {
  AIR: "#3b82f6",
  FCL: "#8b5cf6",
  LCL: "#06b6d4",
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ComportamientoDeClientes() {
  useOutletContext<OutletContext>();
  const { token } = useAuth();

  const [clients, setClients] = useState<ClientBehavior[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Detail view
  const [selectedClient, setSelectedClient] = useState<ClientBehavior | null>(
    null,
  );
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Analytics overview
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [view, setView] = useState<"clients" | "analytics">("clients");

  // ── Fetch client list ──
  useEffect(() => {
    if (!token) return;
    const fetchClients = async () => {
      setLoading(true);
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/behavior-tracking/clients`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!resp.ok) throw new Error("Error al cargar datos");
        const data = await resp.json();
        setClients(data.clients || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [token]);

  // ── Fetch analytics ──
  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/behavior-tracking/analytics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!resp.ok) throw new Error("Error al cargar analytics");
      setAnalytics(await resp.json());
    } catch {
      /* silent */
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (view === "analytics" && !analytics) fetchAnalytics();
  }, [view, analytics, fetchAnalytics]);

  // ── Fetch client detail ──
  const openClientDetail = useCallback(
    async (client: ClientBehavior) => {
      setSelectedClient(client);
      setDetailLoading(true);
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/behavior-tracking/client/${encodeURIComponent(client.email)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!resp.ok) throw new Error("Error al cargar detalle");
        setClientDetail(await resp.json());
      } catch {
        setClientDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [token],
  );

  const handleBack = () => {
    setSelectedClient(null);
    setClientDetail(null);
  };

  // ── Filters ──
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.nombreuser && c.nombreuser.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  // Sort: clients with activity first, then alphabetical; then expand for multi-company
  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients].sort((a, b) => {
      if (a.stats && !b.stats) return -1;
      if (!a.stats && b.stats) return 1;
      if (a.stats && b.stats) {
        return (
          new Date(b.stats.lastActivity).getTime() -
          new Date(a.stats.lastActivity).getTime()
        );
      }
      return a.username.localeCompare(b.username);
    });
    return expandClients(sorted);
  }, [filteredClients]);

  const uniqueAccountCount = useMemo(
    () => new Set(clients.map((c) => c.email)).size,
    [clients],
  );

  const totalStarted = clients.reduce(
    (s, c) => s + (c.stats?.quotesStarted || 0),
    0,
  );
  const totalCompleted = clients.reduce(
    (s, c) => s + (c.stats?.quotesCompleted || 0),
    0,
  );
  const totalAbandoned = clients.reduce(
    (s, c) => s + (c.stats?.quotesAbandoned || 0),
    0,
  );
  const overallRate =
    totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

  // ═══════════════ LOADING ═══════════════
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
              borderTop: "3px solid var(--primary-color, #ff6200)",
              borderRadius: "50%",
              animation: "cbt-spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ color: "#8d99a8", fontSize: 13 }}>
            Cargando datos de comportamiento...
          </div>
          <style>{`@keyframes cbt-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ═══════════════ ERROR ═══════════════
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

  // ═══════════════ CLIENT DETAIL VIEW ═══════════════
  if (selectedClient) {
    return (
      <div style={{ fontFamily: FONT }}>
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
            fontFamily: FONT,
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
          Volver
        </button>

        {/* Client header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
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
            {selectedClient.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#1f2937",
                margin: 0,
              }}
            >
              {selectedClient.username}
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
              {selectedClient.email}
              {selectedClient.nombreuser && ` — ${selectedClient.nombreuser}`}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        {clientDetail?.summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <SummaryCard
              label="Cotizaciones iniciadas"
              value={clientDetail.summary.totalSessions}
            />
            <SummaryCard
              label="Completadas"
              value={clientDetail.summary.completed}
              color="#10b981"
            />
            <SummaryCard
              label="Abandonadas"
              value={clientDetail.summary.abandoned}
              color="#ef4444"
            />
            <SummaryCard
              label="Tasa de completación"
              value={
                clientDetail.summary.totalSessions > 0
                  ? `${Math.round((clientDetail.summary.completed / clientDetail.summary.totalSessions) * 100)}%`
                  : "—"
              }
            />
          </div>
        )}

        {/* By type breakdown */}
        {clientDetail?.summary?.byType && (
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
                margin: "0 0 12px",
              }}
            >
              Desglose por tipo
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {(["AIR", "FCL", "LCL"] as const).map((type) => {
                const data = clientDetail.summary.byType[type];
                if (!data || data.started === 0) return null;
                const rate =
                  data.started > 0
                    ? Math.round((data.completed / data.started) * 100)
                    : 0;
                return (
                  <div
                    key={type}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#fff",
                          background: typeColors[type] || "#6b7280",
                        }}
                      >
                        {type}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      <span>Iniciadas: {data.started}</span>
                      <span style={{ color: "#10b981" }}>
                        Completadas: {data.completed}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "#6b7280",
                        marginTop: 4,
                      }}
                    >
                      <span style={{ color: "#ef4444" }}>
                        Abandonadas: {data.abandoned}
                      </span>
                      <span style={{ fontWeight: 600, color: "#374151" }}>
                        Tasa: {rate}%
                      </span>
                    </div>
                    {/* Mini bar */}
                    <div
                      style={{
                        marginTop: 8,
                        height: 4,
                        borderRadius: 2,
                        background: "#f3f4f6",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${rate}%`,
                          background: typeColors[type] || "#6b7280",
                          borderRadius: 2,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sessions timeline */}
        <div>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#374151",
              margin: "0 0 12px",
            }}
          >
            Historial de cotizaciones
          </h3>

          {detailLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#8d99a8",
                fontSize: 13,
              }}
            >
              Cargando sesiones...
            </div>
          ) : !clientDetail?.sessions?.length ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#8d99a8",
                fontSize: 13,
              }}
            >
              Este cliente aún no tiene actividad de cotización registrada.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clientDetail.sessions.map((session) => {
                const sc =
                  statusColors[session.status] || statusColors.in_progress;
                return (
                  <div
                    key={session.sessionId}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Type badge */}
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                        background: typeColors[session.quoteType] || "#6b7280",
                        flexShrink: 0,
                      }}
                    >
                      {session.quoteType}
                    </span>

                    {/* Route */}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      {session.route ? (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#1f2937",
                          }}
                        >
                          {session.route.origin} → {session.route.destination}
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: "#9ca3af" }}>
                          Sin ruta seleccionada
                        </span>
                      )}
                    </div>

                    {/* Last step (if abandoned) */}
                    {session.status === "abandoned" && session.lastStep && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        Último paso:{" "}
                        {stepLabels[session.lastStep.step] ||
                          session.lastStep.step}
                      </span>
                    )}

                    {/* Status */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        background: sc.bg,
                        color: sc.text,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: sc.dot,
                        }}
                      />
                      {statusLabels[session.status]}
                    </span>

                    {/* Date */}
                    <span
                      style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}
                    >
                      {formatDate(session.startedAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════ ANALYTICS VIEW ═══════════════
  if (view === "analytics") {
    return (
      <div style={{ fontFamily: FONT }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#1f2937",
                margin: 0,
              }}
            >
              Análisis de cotizaciones
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              Patrones de abandono y comportamiento en el proceso de cotización
            </p>
          </div>
          <button
            onClick={() => setView("clients")}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              fontFamily: FONT,
            }}
          >
            Ver clientes
          </button>
        </div>

        {analyticsLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#8d99a8",
              fontSize: 13,
            }}
          >
            Cargando análisis...
          </div>
        ) : !analytics ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#8d99a8",
              fontSize: 13,
            }}
          >
            No hay datos de análisis disponibles.
          </div>
        ) : (
          <>
            {/* Abandonment by type */}
            <div style={{ marginBottom: 32 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  margin: "0 0 12px",
                }}
              >
                Tasa de abandono por tipo de cotización
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {(["AIR", "FCL", "LCL"] as const).map((type) => {
                  const events = analytics.abandonmentByType.filter(
                    (e) => e.quoteType === type,
                  );
                  const started =
                    events.find((e) => e.event === "QUOTE_STARTED")?.count || 0;
                  const completed =
                    events.find((e) => e.event === "QUOTE_COMPLETED")?.count ||
                    0;
                  const abandoned =
                    events.find((e) => e.event === "QUOTE_ABANDONED")?.count ||
                    0;
                  const abandonRate =
                    started > 0 ? Math.round((abandoned / started) * 100) : 0;

                  return (
                    <div
                      key={type}
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 20,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#fff",
                            background: typeColors[type],
                          }}
                        >
                          {type}
                        </span>
                        <span
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: "#1f2937",
                            marginLeft: "auto",
                          }}
                        >
                          {abandonRate}%
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        abandono
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          height: 4,
                          borderRadius: 2,
                          background: "#f3f4f6",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${abandonRate}%`,
                            background: "#ef4444",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "#9ca3af",
                          marginTop: 8,
                        }}
                      >
                        <span>Iniciadas: {started}</span>
                        <span>Completadas: {completed}</span>
                        <span>Abandonadas: {abandoned}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Abandonment by step */}
            {analytics.abandonmentByStep.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#374151",
                    margin: "0 0 12px",
                  }}
                >
                  Pasos con mayor abandono
                </h3>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {analytics.abandonmentByStep.map((item, idx) => {
                    const maxCount = analytics.abandonmentByStep[0]?.count || 1;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 18px",
                          borderBottom:
                            idx < analytics.abandonmentByStep.length - 1
                              ? "1px solid #f3f4f6"
                              : "none",
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#fff",
                            background: typeColors[item.quoteType] || "#6b7280",
                            flexShrink: 0,
                          }}
                        >
                          {item.quoteType}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "#374151",
                            fontWeight: 500,
                            minWidth: 140,
                          }}
                        >
                          {stepLabels[item.step] ||
                            item.step ||
                            "Paso 1 – Ruta"}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            background: "#f3f4f6",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(item.count / maxCount) * 100}%`,
                              background: "#ef4444",
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1f2937",
                            flexShrink: 0,
                          }}
                        >
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top routes */}
            {analytics.topRoutes.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#374151",
                    margin: "0 0 12px",
                  }}
                >
                  Rutas más consultadas
                </h3>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {analytics.topRoutes.map((route, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 18px",
                        borderBottom:
                          idx < analytics.topRoutes.length - 1
                            ? "1px solid #f3f4f6"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#fff",
                          background: typeColors[route.quoteType] || "#6b7280",
                          flexShrink: 0,
                        }}
                      >
                        {route.quoteType}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#1f2937",
                        }}
                      >
                        {route.origin} → {route.destination}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "#9ca3af",
                          marginLeft: "auto",
                          flexShrink: 0,
                        }}
                      >
                        {route.count} consultas
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ═══════════════ CLIENTS LIST VIEW (default) ═══════════════
  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1f2937",
              margin: 0,
            }}
          >
            Comportamiento de clientes
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            Seguimiento de cotizaciones de tus clientes
          </p>
        </div>
        <button
          onClick={() => setView("analytics")}
          style={{
            padding: "8px 16px",
            background: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            fontFamily: FONT,
          }}
        >
          Ver análisis
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <SummaryCard label="Cuentas" value={uniqueAccountCount} />
        {sortedClients.length > uniqueAccountCount && (
          <SummaryCard label="Empresas" value={sortedClients.length} />
        )}
        <SummaryCard label="Cotizaciones iniciadas" value={totalStarted} />
        <SummaryCard
          label="Completadas"
          value={totalCompleted}
          color="#10b981"
        />
        <SummaryCard
          label="Abandonadas"
          value={totalAbandoned}
          color="#ef4444"
        />
        <SummaryCard label="Tasa global" value={`${overallRate}%`} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          style={{
            width: "100%",
            maxWidth: 360,
            padding: "9px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: FONT,
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#ff6200")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
        />
      </div>

      {/* Client cards */}
      {sortedClients.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "#8d99a8",
            fontSize: 13,
          }}
        >
          {search
            ? "No se encontraron clientes."
            : "Aún no hay datos de comportamiento registrados."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sortedClients.map((client) => (
            <div
              key={`${client.email}-${client.username}`}
              onClick={() => openClientDetail(client)}
              style={{
                background: client.parentUsername ? "#fffbf5" : "#fff",
                border: client.parentUsername
                  ? "1px solid #fde68a"
                  : "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "14px 18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "border-color 0.15s, box-shadow 0.15s",
                flexWrap: "wrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = client.parentUsername
                  ? "#f59e0b"
                  : "rgba(255,98,0,0.35)";
                e.currentTarget.style.boxShadow =
                  "0 2px 10px rgba(255,98,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = client.parentUsername
                  ? "#fde68a"
                  : "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: client.parentUsername ? "#f59e0b" : "#232f3e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {client.username.charAt(0).toUpperCase()}
              </div>

              {/* Name/email */}
              <div style={{ flex: 1, minWidth: 120 }}>
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}
                >
                  {client.username}
                </div>
                {client.parentUsername && (
                  <div style={{ fontSize: 11, color: "#d97706", marginTop: 1 }}>
                    Cuenta: {client.parentUsername}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {client.email}
                </div>
              </div>

              {/* Stats */}
              {client.stats ? (
                <>
                  {/* Quote types */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {client.stats.quoteTypes.map((type) => (
                      <span
                        key={type}
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#fff",
                          background: typeColors[type] || "#6b7280",
                        }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>

                  {/* Numbers */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 12,
                      color: "#6b7280",
                      flexShrink: 0,
                    }}
                  >
                    <span>
                      Iniciadas:{" "}
                      <strong style={{ color: "#1f2937" }}>
                        {client.stats.quotesStarted}
                      </strong>
                    </span>
                    <span>
                      Completadas:{" "}
                      <strong style={{ color: "#10b981" }}>
                        {client.stats.quotesCompleted}
                      </strong>
                    </span>
                    <span>
                      Abandonadas:{" "}
                      <strong style={{ color: "#ef4444" }}>
                        {client.stats.quotesAbandoned}
                      </strong>
                    </span>
                  </div>

                  {/* Completion rate */}
                  <div style={{ width: 48, textAlign: "right", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color:
                          client.stats.completionRate >= 70
                            ? "#10b981"
                            : client.stats.completionRate >= 40
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    >
                      {client.stats.completionRate}%
                    </span>
                  </div>

                  {/* Last activity */}
                  <span
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      flexShrink: 0,
                      minWidth: 60,
                      textAlign: "right",
                    }}
                  >
                    {timeAgo(client.stats.lastActivity)}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#d1d5db" }}>
                  Sin actividad
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Small summary card sub-component ──
function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: color || "#1f2937",
          fontFamily: FONT,
        }}
      >
        {value}
      </div>
    </div>
  );
}
