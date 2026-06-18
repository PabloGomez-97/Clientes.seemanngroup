// src/components/administrador/PricingAlerts/PricingAlertsPanel.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthContext";
import "./PricingAlertsPanel.css";

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

interface AlertStatus {
  lastRun: {
    source: string;
    createdAt: string;
    sent: { type: string; alertType: string; count: number }[];
    errors: string[];
    skipped: string[];
  } | null;
  nextCronUtc: string;
  recipients: { email: string; name: string | null }[];
  buckets: {
    bucket48: number;
    bucket24: number;
    bucketToday: number;
    totals: { all: number };
  };
}

type AlertType = "48hrs" | "24hrs";
type TariffKind = "air" | "fcl" | "lcl";
type UrgencyFilter = "all" | "0" | "1" | "2";

// ─── Helpers ────────────────────────────────────────────────────────────────

function val(v: string | null | undefined): string {
  return v?.trim() || "—";
}

function urgencyClass(days: number | undefined): string {
  if (days === undefined) return "pa-badge pa-badge--neutral";
  if (days <= 0) return "pa-badge pa-badge--danger";
  if (days === 1) return "pa-badge pa-badge--danger";
  if (days === 2) return "pa-badge pa-badge--warning";
  return "pa-badge pa-badge--info";
}

function urgencyLabel(days: number | undefined): string {
  if (days === undefined || days < 0) return "Expirado";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

function statSubtext(count: number, kind: "all" | TariffKind): string {
  if (count === 0) return "Sin tarifas próximas";
  const labels: Record<"all" | TariffKind, string> = {
    all: "tarifas próximas a vencer",
    air: "rutas aéreas",
    fcl: "rutas marítimas FCL",
    lcl: "consolidados LCL",
  };
  return labels[kind];
}

function filterByUrgency<T extends TarifaBase>(
  rows: T[],
  urgency: UrgencyFilter,
): T[] {
  if (urgency === "all") return rows;
  const d = Number(urgency);
  return rows.filter((r) => r.daysUntilExpiry === d);
}

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseExtraEmails(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PricingAlertsPanel() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const isAdmin = !!user?.roles?.administrador;

  const [data, setData] = useState<ExpiryData | null>(null);
  const [status, setStatus] = useState<AlertStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [activeTab, setActiveTab] = useState<TariffKind>("air");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [showRecipients, setShowRecipients] = useState(false);

  const [alertType, setAlertType] = useState<AlertType>("48hrs");
  const [tariffType, setTariffType] = useState<TariffKind>("air");
  const [extraEmailsInput, setExtraEmailsInput] = useState("");
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    partial?: boolean;
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
        const e = await res.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pricing/alert-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* silent */
    }
  }, [token]);

  useEffect(() => {
    fetchExpiry();
    fetchStatus();
  }, [fetchExpiry, fetchStatus]);

  const filteredRows = useMemo(() => {
    if (!data) return { air: [], fcl: [], lcl: [] };
    return {
      air: filterByUrgency(data.air, urgencyFilter),
      fcl: filterByUrgency(data.fcl, urgencyFilter),
      lcl: filterByUrgency(data.lcl, urgencyFilter),
    };
  }, [data, urgencyFilter]);

  const postAlerts = async (mode: "manual" | "test") => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/pricing/send-alerts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          alertType,
          tariffType,
          extraEmails: parseExtraEmails(extraEmailsInput),
        }),
      });

      const json = await res.json();
      const sentTypes = (json.sent as { type: string; count: number; alertType: string }[]) || [];
      const details =
        sentTypes.length > 0
          ? sentTypes.map((s) => `${s.type} (${s.alertType}) · ${s.count} tarifa(s)`).join(" · ")
          : json.errors?.length
            ? json.errors.join("; ")
            : undefined;

      setSendResult({
        success: json.success === true,
        partial: json.partialFailure === true,
        message: json.message || json.error || "Operación completada",
        details,
      });

      if (json.success) fetchStatus();
    } catch (e: unknown) {
      setSendResult({
        success: false,
        message: e instanceof Error ? e.message : "Error al enviar",
      });
    } finally {
      setSending(false);
    }
  };

  const handlePreview = async () => {
    setSending(true);
    try {
      const res = await fetch(
        `/api/pricing/alert-preview?alertType=${alertType}&tariffType=${tariffType}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (!json.hasData) {
        setSendResult({ success: false, message: json.message || "Sin datos para previsualizar" });
        return;
      }
      setPreviewHtml(json.html);
    } catch (e: unknown) {
      setSendResult({
        success: false,
        message: e instanceof Error ? e.message : "Error en vista previa",
      });
    } finally {
      setSending(false);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const tab = activeTab;
    const rows = filteredRows[tab];
    if (rows.length === 0) return;

    if (tab === "air") {
      const air = rows as TarifaAerea[];
      exportCsv(
        `tarifas-aereo-${days}d.csv`,
        ["Origin", "Destination", "45kgs+", "100kgs+", "Carrier", "Currency", "Compañía", "Válido Hasta", "Urgencia"],
        air.map((t) => [
          val(t.origen), val(t.destino), val(t.kg45), val(t.kg100),
          val(t.carrier), val(t.currency), val(t.company), val(t.validUntil),
          urgencyLabel(t.daysUntilExpiry),
        ]),
      );
    } else if (tab === "fcl") {
      const fcl = rows as TarifaFCL[];
      exportCsv(
        `tarifas-fcl-${days}d.csv`,
        ["POL", "POD", "20GP", "40HQ", "Carrier", "Currency", "Compañía", "Validez", "Urgencia"],
        fcl.map((t) => [
          val(t.pol), val(t.pod), val(t.gp20), val(t.hq40),
          val(t.carrier), val(t.currency), val(t.company), val(t.validUntil),
          urgencyLabel(t.daysUntilExpiry),
        ]),
      );
    } else {
      const lcl = rows as TarifaLCL[];
      exportCsv(
        `tarifas-lcl-${days}d.csv`,
        ["POL", "Servicio", "POD", "OF W/M", "Currency", "Operador", "Validez", "Urgencia"],
        lcl.map((t) => [
          val(t.pol), val(t.servicio), val(t.pod), val(t.ofWM),
          val(t.currency), val(t.operador), val(t.validUntil),
          urgencyLabel(t.daysUntilExpiry),
        ]),
      );
    }
  };

  const StatItem = ({
    label,
    value,
    sub,
  }: {
    label: string;
    value: number;
    sub: string;
  }) => (
    <div className="pa-stats__item">
      <div className="pa-stats__label">{label}</div>
      <div className="pa-stats__value">{value}</div>
      <div className="pa-stats__sub">{sub}</div>
    </div>
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Santiago",
    });

  return (
    <div className="pa-page">
      <div className="pa-page__header">
        <h1 className="pa-page__title">
          {t("admin.pricingAlerts.title", "Alertas de Vencimiento de Tarifas")}
        </h1>
        <p className="pa-page__subtitle">
          {t(
            "admin.pricingAlerts.subtitle",
            "Visualiza tarifas próximas a vencer · Envío manual solo administradores",
          )}
        </p>
      </div>

      {status && (
        <div className="pa-card pa-status">
          <div className="pa-status__grid">
            <div className="pa-status__item">
              <span className="pa-status__label">Última ejecución</span>
              <span className="pa-status__value">
                {status.lastRun
                  ? `${formatDate(status.lastRun.createdAt)} (${status.lastRun.source})`
                  : "Sin registros"}
              </span>
              {status.lastRun?.errors?.length ? (
                <span className="pa-status__warn">{status.lastRun.errors[0]}</span>
              ) : null}
            </div>
            <div className="pa-status__item">
              <span className="pa-status__label">Próximo cron (UTC)</span>
              <span className="pa-status__value">{formatDate(status.nextCronUtc)}</span>
            </div>
            <div className="pa-status__item">
              <span className="pa-status__label">Buckets automáticos</span>
              <span className="pa-status__value">
                48h: {status.buckets.bucket48} · 24h: {status.buckets.bucket24} · Hoy:{" "}
                {status.buckets.bucketToday}
              </span>
            </div>
            <div className="pa-status__item">
              <button
                type="button"
                className="pa-btn pa-btn--link"
                onClick={() => setShowRecipients((v) => !v)}
              >
                {status.recipients.length} destinatario(s) Pricing
              </button>
              {showRecipients && (
                <ul className="pa-status__recipients">
                  {status.recipients.map((r) => (
                    <li key={r.email}>{r.name ? `${r.name} · ${r.email}` : r.email}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="pa-stats">
          <StatItem label="Total próximas" value={data.totals.all} sub={statSubtext(data.totals.all, "all")} />
          <StatItem label="Aéreo" value={data.totals.air} sub={statSubtext(data.totals.air, "air")} />
          <StatItem label="FCL" value={data.totals.fcl} sub={statSubtext(data.totals.fcl, "fcl")} />
          <StatItem label="LCL" value={data.totals.lcl} sub={statSubtext(data.totals.lcl, "lcl")} />
        </div>
      )}

      <div className="pa-toolbar">
        <label className="pa-toolbar__label">
          Mostrar tarifas venciendo en los próximos
          <select className="pa-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[1, 2, 3, 5, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} día{d > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="pa-toolbar__label">
          Urgencia
          <select
            className="pa-select"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as UrgencyFilter)}
          >
            <option value="all">Todas</option>
            <option value="0">Hoy</option>
            <option value="1">Mañana</option>
            <option value="2">En 2 días</option>
          </select>
        </label>

        <button type="button" className="pa-btn pa-btn--outline" onClick={fetchExpiry} disabled={loading}>
          {loading ? "Cargando…" : "Actualizar"}
        </button>

        {data && (
          <button type="button" className="pa-btn pa-btn--outline" onClick={handleExportCsv}>
            Exportar CSV
          </button>
        )}
      </div>

      {error && (
        <div className="pa-alert pa-alert--error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div className="pa-card">
          <div className="pa-tabs">
            {(["air", "fcl", "lcl"] as const).map((tab) => {
              const labels = {
                air: `Aéreo (${filteredRows.air.length})`,
                fcl: `FCL (${filteredRows.fcl.length})`,
                lcl: `LCL (${filteredRows.lcl.length})`,
              };
              return (
                <button
                  key={tab}
                  type="button"
                  className={`pa-tab ${activeTab === tab ? "pa-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <div className="pa-table-wrap">
            {activeTab === "air" &&
              (filteredRows.air.length === 0 ? (
                <div className="pa-empty">No hay tarifas aéreas con el filtro actual</div>
              ) : (
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th>45kgs+</th>
                      <th>100kgs+</th>
                      <th>Carrier</th>
                      <th>Currency</th>
                      <th>Compañía</th>
                      <th>Válido Hasta</th>
                      <th>Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.air.map((t) => (
                      <tr key={t.rowNumber}>
                        <td>{val(t.origen)}</td>
                        <td>{val(t.destino)}</td>
                        <td>{val(t.kg45)}</td>
                        <td>{val(t.kg100)}</td>
                        <td>{val(t.carrier)}</td>
                        <td>{val(t.currency)}</td>
                        <td>{val(t.company)}</td>
                        <td className="pa-table__validity">{val(t.validUntil)}</td>
                        <td>
                          <span className={urgencyClass(t.daysUntilExpiry)}>
                            {urgencyLabel(t.daysUntilExpiry)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {activeTab === "fcl" &&
              (filteredRows.fcl.length === 0 ? (
                <div className="pa-empty">No hay tarifas FCL con el filtro actual</div>
              ) : (
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th>POL</th>
                      <th>POD</th>
                      <th>20GP</th>
                      <th>40HQ</th>
                      <th>Carrier</th>
                      <th>Currency</th>
                      <th>Compañía</th>
                      <th>Validez</th>
                      <th>Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.fcl.map((t) => (
                      <tr key={t.rowNumber}>
                        <td>{val(t.pol)}</td>
                        <td>{val(t.pod)}</td>
                        <td>{val(t.gp20)}</td>
                        <td>{val(t.hq40)}</td>
                        <td>{val(t.carrier)}</td>
                        <td>{val(t.currency)}</td>
                        <td>{val(t.company)}</td>
                        <td className="pa-table__validity">{val(t.validUntil)}</td>
                        <td>
                          <span className={urgencyClass(t.daysUntilExpiry)}>
                            {urgencyLabel(t.daysUntilExpiry)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {activeTab === "lcl" &&
              (filteredRows.lcl.length === 0 ? (
                <div className="pa-empty">No hay tarifas LCL con el filtro actual</div>
              ) : (
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th>POL</th>
                      <th>Servicio</th>
                      <th>POD</th>
                      <th>OF W/M</th>
                      <th>Currency</th>
                      <th>Operador</th>
                      <th>Validez</th>
                      <th>Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.lcl.map((t) => (
                      <tr key={t.rowNumber}>
                        <td>{val(t.pol)}</td>
                        <td>{val(t.servicio)}</td>
                        <td>{val(t.pod)}</td>
                        <td>{val(t.ofWM)}</td>
                        <td>{val(t.currency)}</td>
                        <td>{val(t.operador)}</td>
                        <td className="pa-table__validity">{val(t.validUntil)}</td>
                        <td>
                          <span className={urgencyClass(t.daysUntilExpiry)}>
                            {urgencyLabel(t.daysUntilExpiry)}
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

      {loading && !data && (
        <div className="pa-card">
          <div className="pa-loading">Cargando tarifas…</div>
        </div>
      )}

      {isAdmin && (
        <div className="pa-card">
          <div className="pa-card__header">
            <h2 className="pa-card__title">Enviar alertas manualmente</h2>
            <p className="pa-card__subtitle">
              Envía correos a usuarios con rol Pricing y/o correos adicionales.
            </p>
          </div>
          <div className="pa-card__body">
            <div className="pa-form-row">
              <div className="pa-field">
                <label className="pa-field__label">Tipo de tarifa</label>
                <select
                  className="pa-select"
                  value={tariffType}
                  onChange={(e) => setTariffType(e.target.value as TariffKind)}
                >
                  <option value="air">Aéreo</option>
                  <option value="fcl">FCL (Marítimo)</option>
                  <option value="lcl">LCL (Consolidado)</option>
                </select>
              </div>

              <div className="pa-field">
                <label className="pa-field__label">Ventana de alerta</label>
                <select
                  className="pa-select"
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as AlertType)}
                >
                  <option value="48hrs">48 horas (hoy + mañana + pasado mañana)</option>
                  <option value="24hrs">24 horas (hoy + mañana)</option>
                </select>
              </div>

              <div className="pa-field pa-form-row__field--grow">
                <label className="pa-field__label">Correos adicionales</label>
                <input
                  className="pa-input"
                  type="text"
                  placeholder="ej. nombre@empresa.com"
                  value={extraEmailsInput}
                  onChange={(e) => setExtraEmailsInput(e.target.value)}
                />
              </div>
            </div>

            <div className="pa-form-actions">
              <button
                type="button"
                className="pa-btn pa-btn--primary"
                onClick={() => postAlerts("manual")}
                disabled={sending}
              >
                {sending ? "Enviando…" : `Enviar alerta · ${alertType}`}
              </button>
              <button
                type="button"
                className="pa-btn pa-btn--outline"
                onClick={() => postAlerts("test")}
                disabled={sending}
              >
                Enviar prueba a mí
              </button>
              <button
                type="button"
                className="pa-btn pa-btn--outline"
                onClick={handlePreview}
                disabled={sending}
              >
                Vista previa
              </button>
            </div>

            <p className="pa-note">
              El cron diario (12:00 UTC) envía alertas escalonadas por bucket: 48h, 24h y hoy.
              Cada tarifa aparece una sola vez por día según su urgencia.
            </p>

            {sendResult && (
              <div
                className={`pa-alert ${
                  sendResult.success
                    ? sendResult.partial
                      ? "pa-alert--warning"
                      : "pa-alert--success"
                    : "pa-alert--error"
                }`}
              >
                <strong>{sendResult.message}</strong>
                {sendResult.details && (
                  <div className="pa-alert__detail">{sendResult.details}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {previewHtml && (
        <div
          className="pa-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewHtml(null)}
        >
          <div className="pa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pa-modal__header">
              <h3>Vista previa del correo</h3>
              <button type="button" className="pa-btn pa-btn--link" onClick={() => setPreviewHtml(null)}>
                Cerrar
              </button>
            </div>
            <iframe
              className="pa-modal__iframe"
              title="Vista previa email"
              sandbox=""
              srcDoc={previewHtml}
            />
          </div>
        </div>
      )}
    </div>
  );
}
