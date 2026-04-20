// src/components/administrador/PricingAlerts/PricingAlertsPanel.tsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../auth/AuthContext";

// ─── Types ─────────────────────────────────────────────────────────────────

interface TarifaBase {
  rowNumber: number;
  validUntil: string;
  daysUntilExpiry?: number;
}

interface TarifaAerea extends TarifaBase {
  origen: string;
  destino: string;
  kg45: string | null;
  kg100: string | null;
  carrier: string | null;
  currency: string | null;
  company: string | null;
}

interface TarifaFCL extends TarifaBase {
  pol: string;
  pod: string;
  gp20: string | null;
  hq40: string | null;
  carrier: string | null;
  currency: string | null;
  company: string | null;
}

interface TarifaLCL extends TarifaBase {
  pol: string;
  pod: string;
  servicio: string | null;
  ofWM: string | null;
  currency: string | null;
  operador: string | null;
}

interface ExpiryData {
  air: TarifaAerea[];
  fcl: TarifaFCL[];
  lcl: TarifaLCL[];
  totals: { air: number; fcl: number; lcl: number; all: number };
}

type AlertType = "48hrs" | "24hrs";

// ─── Helpers ────────────────────────────────────────────────────────────────

function val(v: string | null | undefined): string {
  return v?.trim() || "—";
}

function urgencyColor(days: number | undefined): string {
  if (days === undefined) return "#6c757d";
  if (days <= 1) return "#ef4444";
  if (days <= 2) return "#f59e0b";
  return "#3b82f6";
}

function urgencyBadge(days: number | undefined): string {
  if (days === undefined || days < 0) return "Expirado";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} día${days > 1 ? "s" : ""}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PricingAlertsPanel() {
  const { token } = useAuth();

  const [data, setData] = useState<ExpiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [activeTab, setActiveTab] = useState<"air" | "fcl" | "lcl">("air");

  // Send controls
  const [alertType, setAlertType] = useState<AlertType>("48hrs");
  const [tariffType, setTariffType] = useState<"air" | "fcl" | "lcl">("air");
  const [extraEmailsInput, setExtraEmailsInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const fetchExpiry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pricing/expiry-check?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const e = await res
          .json()
          .catch(() => ({ error: "Error desconocido" }));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    fetchExpiry();
  }, [fetchExpiry]);

  const handleSendAlerts = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const extraEmails = extraEmailsInput
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

      const res = await fetch("/api/pricing/send-alerts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertType, tariffType, extraEmails }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      const sentTypes = (json.sent as { type: string; count: number }[]) || [];
      const details =
        sentTypes.length > 0
          ? sentTypes
              .map(
                (s) =>
                  `${s.type} → ${s.count} destinatario${s.count > 1 ? "s" : ""}`,
              )
              .join(" · ")
          : "";

      setSendResult({ success: true, message: json.message, details });
    } catch (e: any) {
      setSendResult({ success: false, message: e.message });
    } finally {
      setSending(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const styles: Record<string, React.CSSProperties> = {
    page: {
      padding: "24px",
      fontFamily:
        "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: "#333",
      maxWidth: "1200px",
      margin: "0 auto",
    },
    card: {
      background: "#fff",
      borderRadius: "8px",
      border: "1px solid #e0e0e0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      marginBottom: "20px",
    },
    cardHeader: {
      padding: "16px 20px",
      borderBottom: "1px solid #e0e0e0",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    cardBody: { padding: "20px" },
    title: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#1a1a1a" },
    subtitle: { margin: "4px 0 0", fontSize: "13px", color: "#666" },
    badge: (color: string): React.CSSProperties => ({
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: 600,
      background: color + "22",
      color,
      border: `1px solid ${color}44`,
    }),
    btn: {
      padding: "8px 18px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: "13px",
      transition: "opacity 0.2s",
    },
    btnPrimary: {
      background: "#ff6200",
      color: "#fff",
    },
    btnOutline: {
      background: "transparent",
      border: "1px solid #e0e0e0",
      color: "#333",
    },
    tab: (active: boolean): React.CSSProperties => ({
      padding: "8px 20px",
      border: "none",
      borderBottom: active ? "2px solid #ff6200" : "2px solid transparent",
      background: "transparent",
      cursor: "pointer",
      fontWeight: active ? 600 : 400,
      color: active ? "#ff6200" : "#666",
      fontSize: "14px",
      transition: "all 0.15s",
    }),
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "13px",
    },
    th: {
      padding: "9px 12px",
      textAlign: "left" as const,
      background: "#f8f9fa",
      color: "#444",
      fontWeight: 600,
      fontSize: "11px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.4px",
      borderBottom: "2px solid #e0e0e0",
      whiteSpace: "nowrap" as const,
    },
    td: {
      padding: "9px 12px",
      borderBottom: "1px solid #f0f0f0",
      verticalAlign: "top" as const,
    },
    input: {
      padding: "8px 12px",
      border: "1px solid #e0e0e0",
      borderRadius: "6px",
      fontSize: "13px",
      width: "100%",
      outline: "none",
    },
    select: {
      padding: "8px 12px",
      border: "1px solid #e0e0e0",
      borderRadius: "6px",
      fontSize: "13px",
      background: "#fff",
      cursor: "pointer",
    },
    alert: (type: "success" | "error"): React.CSSProperties => ({
      padding: "12px 16px",
      borderRadius: "6px",
      fontSize: "13px",
      background: type === "success" ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
      color: type === "success" ? "#166534" : "#991b1b",
      marginTop: "12px",
    }),
  };

  const statCard = (
    label: string,
    count: number,
    color: string,
    icon: string,
  ) => (
    <div
      style={{
        flex: 1,
        minWidth: "140px",
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          background: color + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#1a1a1a",
            lineHeight: 1,
          }}
        >
          {count}
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
          {label}
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      {/* Page header */}
      <div style={{ marginBottom: "20px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: 700,
            color: "#1a1a1a",
          }}
        >
          Alertas de Vencimiento de Tarifas
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#666" }}>
          Visualiza y notifica las tarifas próximas a vencer · Solo visible para
          Administrador
        </p>
      </div>

      {/* Stats row */}
      {data && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          {statCard("Total próximas", data.totals.all, "#ff6200", "⚠️")}
          {statCard("Aéreo", data.totals.air, "#3b82f6", "✈️")}
          {statCard("FCL", data.totals.fcl, "#0ea5e9", "🚢")}
          {statCard("LCL", data.totals.lcl, "#8b5cf6", "📦")}
        </div>
      )}

      {/* Filter + refresh bar */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            fontSize: "13px",
            color: "#666",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          Mostrar tarifas venciendo en los próximos
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={styles.select}
          >
            {[1, 2, 3, 5, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} día{d > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={fetchExpiry}
          disabled={loading}
          style={{ ...styles.btn, ...styles.btnOutline }}
        >
          {loading ? "Cargando…" : "↻ Actualizar"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.alert("error")}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Rate tables */}
      {data && (
        <div style={styles.card}>
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #e0e0e0",
              paddingLeft: "8px",
            }}
          >
            {(["air", "fcl", "lcl"] as const).map((tab) => {
              const labels = {
                air: `✈ Aéreo (${data.air.length})`,
                fcl: `🚢 FCL (${data.fcl.length})`,
                lcl: `📦 LCL (${data.lcl.length})`,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={styles.tab(activeTab === tab)}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <div style={{ overflowX: "auto" }}>
            {/* AIR TABLE */}
            {activeTab === "air" &&
              (data.air.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "14px",
                  }}
                >
                  No hay tarifas aéreas venciendo en los próximos {days} días
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Origin</th>
                      <th style={styles.th}>Destination</th>
                      <th style={styles.th}>45kgs+</th>
                      <th style={styles.th}>100kgs+</th>
                      <th style={styles.th}>Carrier</th>
                      <th style={styles.th}>Currency</th>
                      <th style={styles.th}>Compañía</th>
                      <th style={styles.th}>Válido Hasta</th>
                      <th style={styles.th}>Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.air.map((t, i) => (
                      <tr
                        key={i}
                        style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                      >
                        <td style={styles.td}>{val(t.origen)}</td>
                        <td style={styles.td}>{val(t.destino)}</td>
                        <td style={styles.td}>{val(t.kg45)}</td>
                        <td style={styles.td}>{val(t.kg100)}</td>
                        <td style={styles.td}>{val(t.carrier)}</td>
                        <td style={styles.td}>{val(t.currency)}</td>
                        <td style={styles.td}>{val(t.company)}</td>
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 600,
                            color: urgencyColor(t.daysUntilExpiry),
                          }}
                        >
                          {val(t.validUntil)}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={styles.badge(
                              urgencyColor(t.daysUntilExpiry),
                            )}
                          >
                            {urgencyBadge(t.daysUntilExpiry)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {/* FCL TABLE */}
            {activeTab === "fcl" &&
              (data.fcl.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "14px",
                  }}
                >
                  No hay tarifas FCL venciendo en los próximos {days} días
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>POL</th>
                      <th style={styles.th}>POD</th>
                      <th style={styles.th}>20GP</th>
                      <th style={styles.th}>40HQ</th>
                      <th style={styles.th}>Carrier</th>
                      <th style={styles.th}>Currency</th>
                      <th style={styles.th}>Compañía</th>
                      <th style={styles.th}>Validez</th>
                      <th style={styles.th}>Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fcl.map((t, i) => (
                      <tr
                        key={i}
                        style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                      >
                        <td style={styles.td}>{val(t.pol)}</td>
                        <td style={styles.td}>{val(t.pod)}</td>
                        <td style={styles.td}>{val(t.gp20)}</td>
                        <td style={styles.td}>{val(t.hq40)}</td>
                        <td style={styles.td}>{val(t.carrier)}</td>
                        <td style={styles.td}>{val(t.currency)}</td>
                        <td style={styles.td}>{val(t.company)}</td>
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 600,
                            color: urgencyColor(t.daysUntilExpiry),
                          }}
                        >
                          {val(t.validUntil)}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={styles.badge(
                              urgencyColor(t.daysUntilExpiry),
                            )}
                          >
                            {urgencyBadge(t.daysUntilExpiry)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {/* LCL TABLE */}
            {activeTab === "lcl" &&
              (data.lcl.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "14px",
                  }}
                >
                  No hay tarifas LCL venciendo en los próximos {days} días
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>POL</th>
                      <th style={styles.th}>Servicio</th>
                      <th style={styles.th}>POD</th>
                      <th style={styles.th}>OF W/M</th>
                      <th style={styles.th}>Currency</th>
                      <th style={styles.th}>Operador</th>
                      <th style={styles.th}>Validez</th>
                      <th style={styles.th}>Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lcl.map((t, i) => (
                      <tr
                        key={i}
                        style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                      >
                        <td style={styles.td}>{val(t.pol)}</td>
                        <td style={styles.td}>{val(t.servicio)}</td>
                        <td style={styles.td}>{val(t.pod)}</td>
                        <td style={styles.td}>{val(t.ofWM)}</td>
                        <td style={styles.td}>{val(t.currency)}</td>
                        <td style={styles.td}>{val(t.operador)}</td>
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: 600,
                            color: urgencyColor(t.daysUntilExpiry),
                          }}
                        >
                          {val(t.validUntil)}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={styles.badge(
                              urgencyColor(t.daysUntilExpiry),
                            )}
                          >
                            {urgencyBadge(t.daysUntilExpiry)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div style={styles.card}>
          <div
            style={{
              ...styles.cardBody,
              textAlign: "center",
              padding: "48px",
              color: "#999",
            }}
          >
            Cargando tarifas…
          </div>
        </div>
      )}

      {/* Manual send section */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={{ fontSize: "18px" }}>📧</span>
          <div>
            <h2 style={{ ...styles.title, fontSize: "16px" }}>
              Enviar alertas manualmente
            </h2>
            <p style={styles.subtitle}>
              Envía correos de alerta a los usuarios con rol Pricing y/o correos
              adicionales
            </p>
          </div>
        </div>
        <div style={styles.cardBody}>
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {/* Tariff type */}
            <div style={{ flex: "0 0 auto" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#555",
                  marginBottom: "6px",
                }}
              >
                Tipo de tarifa
              </label>
              <select
                value={tariffType}
                onChange={(e) =>
                  setTariffType(e.target.value as "air" | "fcl" | "lcl")
                }
                style={styles.select}
              >
                <option value="air">✈ Aéreo</option>
                <option value="fcl">🚢 FCL (Marítimo)</option>
                <option value="lcl">📦 LCL (Consolidado)</option>
              </select>
            </div>

            {/* Alert type */}
            <div style={{ flex: "0 0 auto" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#555",
                  marginBottom: "6px",
                }}
              >
                Ventana de alerta
              </label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as AlertType)}
                style={styles.select}
              >
                <option value="48hrs">⚠ 48 horas (expiran en 2 días)</option>
                <option value="24hrs">🔴 24 horas (expiran mañana)</option>
              </select>
            </div>

            {/* Extra emails */}
            <div style={{ flex: "1 1 300px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#555",
                  marginBottom: "6px",
                }}
              >
                Correos adicionales (separados por coma o espacio)
              </label>
              <input
                type="text"
                placeholder="ej. nombre@empresa.com, otro@empresa.com"
                value={extraEmailsInput}
                onChange={(e) => setExtraEmailsInput(e.target.value)}
                style={styles.input}
              />
            </div>

            {/* Send button */}
            <div style={{ flex: "0 0 auto" }}>
              <button
                onClick={handleSendAlerts}
                disabled={sending}
                style={{
                  ...styles.btn,
                  ...styles.btnPrimary,
                  opacity: sending ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {sending ? (
                  <>Enviando…</>
                ) : (
                  <>
                    📤 Enviar{" "}
                    {tariffType === "air"
                      ? "✈ Aéreo"
                      : tariffType === "fcl"
                        ? "🚢 FCL"
                        : "📦 LCL"}{" "}
                    · {alertType}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info note */}
          <p
            style={{
              fontSize: "12px",
              color: "#888",
              marginTop: "12px",
              margin: "12px 0 0",
            }}
          >
            <strong>Nota:</strong> Los correos se enviarán a todos los usuarios
            activos con rol <strong>Pricing</strong>
            {extraEmailsInput.trim()
              ? " más los correos adicionales ingresados"
              : ""}
            . El envío automático se realiza diariamente a las 9:00 AM (hora
            Chile) mediante el cron job.
          </p>

          {/* Send result feedback */}
          {sendResult && (
            <div style={styles.alert(sendResult.success ? "success" : "error")}>
              {sendResult.success ? "✅ " : "❌ "}
              <strong>{sendResult.message}</strong>
              {sendResult.details && (
                <div
                  style={{ marginTop: "4px", fontSize: "12px", opacity: 0.85 }}
                >
                  {sendResult.details}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
