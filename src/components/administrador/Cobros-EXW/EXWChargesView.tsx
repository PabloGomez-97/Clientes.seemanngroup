// src/components/shipments/EXWChargesView.tsx — Cobros EXW por cliente (air-shipments)
import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { useClientOverride } from "../../../contexts/ClientOverrideContext";

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface EXWRow {
  id: number | string;
  consignee: string;
  origen: string;
  direccion: string;
  kgCargamento: number;
  exwValue: number;
}

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function cleanAddress(addr: string | null | undefined): string {
  if (!addr) return "—";
  return addr
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function EXWChargesView() {
  const { accessToken } = useOutletContext<OutletContext>();
  const clientOverride = useClientOverride();
  const { activeUsername: authUsername } = useAuth();
  const activeUsername = clientOverride || authUsername;

  const [rows, setRows] = useState<EXWRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOrigen, setFilterOrigen] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fetchData = useCallback(async () => {
    if (!accessToken || !activeUsername) return;
    setLoading(true);
    setError(null);
    setRows([]);
    setProgress({ current: 0, total: 0 });

    try {
      // 1. Fetch all air-shipment IDs for this client
      const allIds: (string | number)[] = [];
      const seenIds = new Set<string | number>();
      let page = 1;
      const itemsPerPage = 50;

      while (true) {
        const params = new URLSearchParams({
          ConsigneeName: activeUsername,
          Page: page.toString(),
          ItemsPerPage: itemsPerPage.toString(),
          SortBy: "newest",
        });

        const res = await fetch(
          `https://api.linbis.com/air-shipments?${params}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          },
        );

        if (!res.ok) {
          if (res.status === 401) throw new Error("Token inválido o expirado.");
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const shipments: Record<string, unknown>[] = await res.json();
        if (!shipments.length) break;

        for (const s of shipments) {
          if (s.id && !seenIds.has(s.id as string | number)) {
            allIds.push(s.id as string | number);
            seenIds.add(s.id as string | number);
          }
          if (Array.isArray(s.subShipments)) {
            for (const sub of s.subShipments as Record<string, unknown>[]) {
              if (sub.id && !seenIds.has(sub.id as string | number)) {
                allIds.push(sub.id as string | number);
                seenIds.add(sub.id as string | number);
              }
            }
          }
        }

        if (shipments.length < itemsPerPage) break;
        page++;
      }

      setProgress({ current: 0, total: allIds.length });

      // 2. Fetch details in batches; keep only those with EXW CHARGES
      const results: EXWRow[] = [];
      const batchSize = 5;

      for (let i = 0; i < allIds.length; i += batchSize) {
        const batch = allIds.slice(i, i + batchSize);

        const promises = batch.map(async (id) => {
          try {
            const res = await fetch(
              `https://api.linbis.com/air-shipments/details/${id}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
              },
            );
            if (!res.ok) return null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detail: any = await res.json();

            // Only keep shipments that have an EXW CHARGES charge
            const exwCharge = (detail.charges ?? []).find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) =>
                typeof c.description === "string" &&
                c.description.toUpperCase().trim() === "EXW CHARGES",
            );
            if (!exwCharge) return null;

            const consignee =
              detail.consignee?.name ||
              detail.commodities?.[0]?.consignee ||
              "—";
            const origen = detail.from?.code || "—";
            const direccion = cleanAddress(detail.shipperAddress);
            const kgCargamento =
              detail.commodities?.[0]?.volWeight ??
              detail.totalCargoDetails?.volumeWeight?.value ??
              0;
            const exwValue = exwCharge.rateMoney?.value ?? 0;

            return {
              id,
              consignee,
              origen,
              direccion,
              kgCargamento,
              exwValue,
            } as EXWRow;
          } catch {
            return null;
          }
        });

        const batchResults = await Promise.all(promises);
        for (const r of batchResults) {
          if (r) results.push(r);
        }

        setProgress({
          current: Math.min(i + batchSize, allIds.length),
          total: allIds.length,
        });
      }

      setRows(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeUsername]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique origin codes for the filter dropdown
  const uniqueOrigenes = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.origen))).sort();
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!filterOrigen) return rows;
    return rows.filter((r) => r.origen === filterOrigen);
  }, [rows, filterOrigen]);

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            Cobros EXW
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Operaciones aéreas con cargos EXW
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: loading ? "#94a3b8" : "#ff9900",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: FONT,
          }}
        >
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: 16,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#dc2626",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading progress */}
      {loading && (
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: "3px solid #f0f0f0",
              borderTop: "3px solid #ff9900",
              borderRadius: "50%",
              animation: "exw-spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          {progress.total > 0 ? (
            <span>
              Analizando operaciones… {progress.current} / {progress.total}
            </span>
          ) : (
            <span>Cargando envíos aéreos…</span>
          )}
          <style>{`@keyframes exw-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Filter by Origin */}
      {!loading && rows.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
            Filtrar por Origen:
          </label>
          <select
            value={filterOrigen}
            onChange={(e) => setFilterOrigen(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              background: "#fff",
              color: "#334155",
              minWidth: 140,
              fontFamily: FONT,
            }}
          >
            <option value="">Todos</option>
            {uniqueOrigenes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {filteredRows.length} resultado
            {filteredRows.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "Consignatario",
                    "Origen",
                    "Dirección",
                    "KG Cargamento",
                    "EXW Charges (USD)",
                  ].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "12px 16px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#64748b",
                        textAlign: "left",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "2px solid #e2e8f0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: 14,
                      }}
                    >
                      No se encontraron operaciones con EXW Charges.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        background: i % 2 === 0 ? "#fff" : "#f8fafc",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: 13,
                          color: "#1e293b",
                          fontWeight: 500,
                        }}
                      >
                        {row.consignee}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: 13,
                          color: "#334155",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            background: "#e0f2fe",
                            color: "#0369a1",
                            borderRadius: 4,
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {row.origen}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: 13,
                          color: "#475569",
                          maxWidth: 300,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={row.direccion}
                      >
                        {row.direccion}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: 13,
                          color: "#334155",
                          fontWeight: 500,
                        }}
                      >
                        {row.kgCargamento.toLocaleString("es-CL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          fontSize: 13,
                          color: "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        ${" "}
                        {row.exwValue.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default EXWChargesView;
