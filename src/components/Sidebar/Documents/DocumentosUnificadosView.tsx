// src/components/Sidebar/Documents/DocumentosUnificadosView.tsx
// Vista unificada de documentos â€” reutilizable para ejecutivo y cliente
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { linbisFetch } from "../../../services/linbisFetch";

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export interface DocItem {
  id: string;
  shipmentId: string | null;
  tipo: string;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoMB: string;
  fechaSubida: string;
}

interface AllDocs {
  air: DocItem[];
  ocean: DocItem[];
  ground: DocItem[];
  quotes: DocItem[];
}

type TransportType = "all" | "air" | "ocean" | "ground" | "quotes";
type GroupTransportType = Exclude<TransportType, "all">;

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

interface ReferenceMeta {
  number: string | null;
  customerReference: string | null;
}

type UnifiedDoc = DocItem & { _type: GroupTransportType };

interface DocGroup {
  key: string;
  type: GroupTransportType;
  title: string;
  subtitle: string | null;
  docs: UnifiedDoc[];
  latestTimestamp: number;
}

const TRANSPORT_LABELS: Record<TransportType, string> = {
  all: "Todos",
  air: "Aéreo",
  ocean: "Marítimo",
  ground: "Terrestre",
  quotes: "Cotizaciones",
};

const TRANSPORT_COLORS: Record<
  TransportType,
  { bg: string; text: string; border: string }
> = {
  all: { bg: "#f0f4ff", text: "#2563eb", border: "#bfdbfe" },
  air: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  ocean: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  ground: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  quotes: { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
};

const TRANSPORT_ICONS: Record<TransportType, ReactNode> = {
  all: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  air: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4s-2 1-3.5 2.5L11 8 2.8 6.2c-.5-.1-.9.4-.8.9l6.4 6.4L5 17l-1 1 3 .5.5 3 1-1 3.4-4.4 6.4 6.4c.5.1 1-.3.9-.8z" />
    </svg>
  ),
  ocean: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1" />
      <path d="M4 5h12l3 6-18 1z" />
    </svg>
  ),
  ground: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="1" y="3" width="15" height="13" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  quotes: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
};

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  pdf: { icon: "PDF", color: "#dc2626" },
  excel: { icon: "XLS", color: "#16a34a" },
  spreadsheet: { icon: "XLS", color: "#16a34a" },
  word: { icon: "DOC", color: "#1d4ed8" },
  document: { icon: "DOC", color: "#1d4ed8" },
};

function getFileLabel(tipoArchivo: string) {
  for (const [key, val] of Object.entries(FILE_ICONS)) {
    if (tipoArchivo.includes(key)) return val;
  }
  return { icon: "FILE", color: "#6b7280" };
}

function formatFecha(fechaISO: string) {
  return new Date(fechaISO).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFechaFull(fechaISO: string) {
  return new Date(fechaISO).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getReferenceKey(type: GroupTransportType, referenceId: string | null) {
  return `${type}:${referenceId || "sin-referencia"}`;
}

function getGroupTitle(
  type: GroupTransportType,
  meta: ReferenceMeta | null,
  internalId: string | null,
) {
  const base =
    type === "quotes" ? "Cotización" : `Operación ${TRANSPORT_LABELS[type]}`;
  const number = normalizeText(meta?.number);
  const customerReference = normalizeText(meta?.customerReference);

  if (number || customerReference) {
    return `${base} ${number || customerReference}`;
  }

  return `${base}${internalId ? ` ${internalId}` : ""}`;
}

function getGroupSubtitle(
  meta: ReferenceMeta | null,
  internalId: string | null,
) {
  const number = normalizeText(meta?.number);
  const customerReference = normalizeText(meta?.customerReference);

  if (customerReference && customerReference !== number) {
    return `Ref. cliente: ${customerReference}`;
  }

  if (internalId && internalId !== number && internalId !== customerReference) {
    return `ID interno: ${internalId}`;
  }

  return null;
}

interface Props {
  ownerUsername: string;
  canDelete?: boolean;
  title?: string;
}

export function DocumentosUnificadosView({
  ownerUsername,
  canDelete = true,
  title,
}: Props) {
  const { token } = useAuth();
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();

  const [docs, setDocs] = useState<AllDocs>({
    air: [],
    ocean: [],
    ground: [],
    quotes: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<TransportType>("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [referenceMap, setReferenceMap] = useState<
    Record<string, ReferenceMeta>
  >({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const loadReferenceMap = useCallback(
    async (sourceDocs: AllDocs) => {
      if (!accessToken || !ownerUsername) {
        setReferenceMap({});
        return;
      }

      const nextMap: Record<string, ReferenceMeta> = {};
      const airIds = new Set(
        sourceDocs.air
          .map((doc) => normalizeText(doc.shipmentId))
          .filter(Boolean) as string[],
      );
      const oceanIds = new Set(
        sourceDocs.ocean
          .map((doc) => normalizeText(doc.shipmentId))
          .filter(Boolean) as string[],
      );
      const groundIds = new Set(
        sourceDocs.ground
          .map((doc) => normalizeText(doc.shipmentId))
          .filter(Boolean) as string[],
      );
      const quoteIds = new Set(
        sourceDocs.quotes
          .map((doc) => normalizeText(doc.shipmentId))
          .filter(Boolean) as string[],
      );

      const shippingOrderIds = Array.from(new Set([...airIds, ...oceanIds]));

      const shippingOrderRequests = shippingOrderIds.map(async (shipmentId) => {
        try {
          const res = await linbisFetch(
            `https://api.linbis.com/api/shipping-orders/${encodeURIComponent(shipmentId)}`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            },
            accessToken,
            refreshAccessToken,
          );

          if (!res.ok) return;

          const detail: any = await res.json();
          const meta: ReferenceMeta = {
            number: normalizeText(detail?.number),
            customerReference: normalizeText(detail?.customerReference),
          };

          if (airIds.has(shipmentId)) {
            nextMap[getReferenceKey("air", shipmentId)] = meta;
          }
          if (oceanIds.has(shipmentId)) {
            nextMap[getReferenceKey("ocean", shipmentId)] = meta;
          }
        } catch {
          // Ignorar referencias individuales con error y seguir armando el resto.
        }
      });

      const groundRequest =
        groundIds.size > 0
          ? (async () => {
              try {
                const res = await linbisFetch(
                  "https://api.linbis.com/ground-shipments/all",
                  {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                      "Content-Type": "application/json",
                    },
                  },
                  accessToken,
                  refreshAccessToken,
                );

                if (!res.ok) return;

                const data: any = await res.json();
                const shipments = Array.isArray(data) ? data : [];

                shipments.forEach((shipment: any) => {
                  const shipmentId = normalizeText(String(shipment?.id ?? ""));
                  if (!shipmentId || !groundIds.has(shipmentId)) return;

                  nextMap[getReferenceKey("ground", shipmentId)] = {
                    number: normalizeText(shipment?.number),
                    customerReference: normalizeText(
                      shipment?.customerReference,
                    ),
                  };
                });
              } catch {
                // Si falla ground, la vista sigue funcionando con el ID interno.
              }
            })()
          : Promise.resolve();

      const quotesRequest =
        quoteIds.size > 0
          ? (async () => {
              try {
                const query = new URLSearchParams({
                  ConsigneeName: ownerUsername,
                  Page: "1",
                  ItemsPerPage: "999",
                  SortBy: "newest",
                });

                const res = await linbisFetch(
                  `https://api.linbis.com/Quotes?${query.toString()}`,
                  {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                      "Content-Type": "application/json",
                    },
                  },
                  accessToken,
                  refreshAccessToken,
                );

                if (!res.ok) return;

                const data: any = await res.json();
                const quotes = Array.isArray(data) ? data : [];

                quotes.forEach((quote: any) => {
                  const quoteId = normalizeText(String(quote?.id ?? ""));
                  if (!quoteId || !quoteIds.has(quoteId)) return;

                  nextMap[getReferenceKey("quotes", quoteId)] = {
                    number: normalizeText(quote?.number),
                    customerReference: normalizeText(quote?.customerReference),
                  };
                });
              } catch {
                // Si falla quotes, se mantiene el fallback.
              }
            })()
          : Promise.resolve();

      await Promise.allSettled([
        Promise.allSettled(shippingOrderRequests),
        groundRequest,
        quotesRequest,
      ]);

      setReferenceMap(nextMap);
    },
    [accessToken, ownerUsername, refreshAccessToken],
  );

  const loadDocs = useCallback(async () => {
    if (!token || !ownerUsername) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/documents/all?ownerUsername=${encodeURIComponent(ownerUsername)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Error al cargar documentos");

      const data = await res.json();
      const nextDocs: AllDocs = {
        air: data.air || [],
        ocean: data.ocean || [],
        ground: data.ground || [],
        quotes: data.quotes || [],
      };

      setDocs(nextDocs);
      void loadReferenceMap(nextDocs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [token, ownerUsername, loadReferenceMap]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const allDocs = useMemo<UnifiedDoc[]>(
    () => [
      ...docs.air.map((d) => ({ ...d, _type: "air" as const })),
      ...docs.ocean.map((d) => ({ ...d, _type: "ocean" as const })),
      ...docs.ground.map((d) => ({ ...d, _type: "ground" as const })),
      ...docs.quotes.map((d) => ({ ...d, _type: "quotes" as const })),
    ],
    [docs],
  );

  const visibleDocs = useMemo(() => {
    let list =
      activeType === "all"
        ? allDocs
        : allDocs.filter((d) => d._type === activeType);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((doc) => {
        const internalId = normalizeText(doc.shipmentId);
        const meta =
          referenceMap[getReferenceKey(doc._type, internalId)] || null;

        return (
          doc.nombreArchivo.toLowerCase().includes(q) ||
          doc.tipo.toLowerCase().includes(q) ||
          (internalId || "").toLowerCase().includes(q) ||
          (normalizeText(meta?.number) || "").toLowerCase().includes(q) ||
          (normalizeText(meta?.customerReference) || "")
            .toLowerCase()
            .includes(q) ||
          TRANSPORT_LABELS[doc._type].toLowerCase().includes(q)
        );
      });
    }

    return [...list].sort(
      (a, b) =>
        new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime(),
    );
  }, [allDocs, activeType, search, referenceMap]);

  const groupedDocs = useMemo<DocGroup[]>(() => {
    const groups = new Map<string, DocGroup>();

    visibleDocs.forEach((doc) => {
      const internalId = normalizeText(doc.shipmentId);
      const meta = referenceMap[getReferenceKey(doc._type, internalId)] || null;
      const key = getReferenceKey(doc._type, internalId);
      const docTimestamp = new Date(doc.fechaSubida).getTime();

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          type: doc._type,
          title: getGroupTitle(doc._type, meta, internalId),
          subtitle: getGroupSubtitle(meta, internalId),
          docs: [],
          latestTimestamp: docTimestamp,
        });
      }

      const group = groups.get(key)!;
      group.docs.push(doc);
      group.latestTimestamp = Math.max(group.latestTimestamp, docTimestamp);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        docs: [...group.docs].sort(
          (a, b) =>
            new Date(b.fechaSubida).getTime() -
            new Date(a.fechaSubida).getTime(),
        ),
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [visibleDocs, referenceMap]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = {};

      groupedDocs.forEach((group) => {
        next[group.key] = prev[group.key] ?? true;
      });

      return next;
    });
  }, [groupedDocs]);

  useEffect(() => {
    if (!search.trim()) return;

    setExpandedGroups((prev) => {
      const next = { ...prev };
      groupedDocs.forEach((group) => {
        next[group.key] = true;
      });
      return next;
    });
  }, [search, groupedDocs]);

  const counts: Record<TransportType, number> = {
    all: allDocs.length,
    air: docs.air.length,
    ocean: docs.ocean.length,
    ground: docs.ground.length,
    quotes: docs.quotes.length,
  };

  const handleDownload = async (doc: UnifiedDoc) => {
    if (!token || downloadingId === doc.id) return;
    setDownloadingId(doc.id);

    try {
      const endpoint =
        doc._type === "air"
          ? `/api/air-shipments/documentos/download/${doc.id}?ownerUsername=${encodeURIComponent(ownerUsername)}`
          : doc._type === "ocean"
            ? `/api/ocean-shipments/documentos/download/${doc.id}?ownerUsername=${encodeURIComponent(ownerUsername)}`
            : doc._type === "ground"
              ? `/api/ground-shipments/documentos/download/${doc.id}?ownerUsername=${encodeURIComponent(ownerUsername)}`
              : `/api/documentos/download/${doc.id}?ownerUsername=${encodeURIComponent(ownerUsername)}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al descargar");

      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("application/json")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const a = document.createElement("a");
        a.href = data.documento.contenidoBase64;
        a.download = doc.nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      setError("Error al descargar el documento");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: UnifiedDoc) => {
    if (!token || !canDelete) return;
    if (!window.confirm(`Â¿Eliminar "${doc.nombreArchivo}"?`)) return;
    setDeletingId(doc.id);

    try {
      const endpoint =
        doc._type === "air"
          ? `/api/air-shipments/documentos/${doc.id}?ownerUsername=${encodeURIComponent(ownerUsername)}`
          : doc._type === "ocean"
            ? `/api/ocean-shipments/documentos/${doc.id}?ownerUsername=${encodeURIComponent(ownerUsername)}`
            : doc._type === "ground"
              ? `/api/ground-shipments/documentos/${doc.id}?ownerUsername=${encodeURIComponent(ownerUsername)}`
              : `/api/documentos/${doc.id}?ownerUsername=${encodeURIComponent(ownerUsername)}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al eliminar");

      setSuccessMsg(`"${doc.nombreArchivo}" eliminado`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadDocs();
    } catch {
      setError("Error al eliminar el documento");
    } finally {
      setDeletingId(null);
    }
  };

  const types: TransportType[] = ["all", "air", "ocean", "ground", "quotes"];

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .doc-row:hover { background: #f8fafc !important; }
        .doc-action-btn:hover { background: #f1f5f9 !important; }
        .doc-action-btn.danger:hover { background: #fee2e2 !important; color: #dc2626 !important; }
        .doc-type-chip { cursor: pointer; transition: all 0.12s; }
        .doc-type-chip:hover { filter: brightness(0.96); }
        .doc-group-btn:hover { background: #f8fafc !important; }
      `}</style>

      {title && (
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
            }}
          >
            {title}
          </h2>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {(["air", "ocean", "ground", "quotes"] as GroupTransportType[]).map(
          (t) => {
            const c = TRANSPORT_COLORS[t];
            return (
              <div
                key={t}
                onClick={() => setActiveType(activeType === t ? "all" : t)}
                className="doc-type-chip"
                style={{
                  padding: "12px 16px",
                  background: activeType === t ? c.bg : "#fff",
                  border: `1px solid ${activeType === t ? c.border : "#e5e7eb"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: activeType === t ? c.text : "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  {TRANSPORT_ICONS[t]}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {TRANSPORT_LABELS[t]}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: activeType === t ? c.text : "#1f2937",
                  }}
                >
                  {counts[t]}
                </div>
              </div>
            );
          },
        )}
      </div>

      {successMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
            color: "#15803d",
            animation: "fadeIn 0.2s",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            marginBottom: 14,
            fontSize: 13,
            color: "#dc2626",
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#dc2626",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            Ã—
          </button>
        </div>
      )}

      <div
        style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {types.map((t) => {
            const c = TRANSPORT_COLORS[t];
            const active = activeType === t;
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: `1px solid ${active ? c.border : "#e5e7eb"}`,
                  background: active ? c.bg : "#fff",
                  color: active ? c.text : "#6b7280",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  fontFamily: FONT,
                  transition: "all 0.12s",
                }}
              >
                {TRANSPORT_ICONS[t]}
                {TRANSPORT_LABELS[t]}
                <span
                  style={{
                    background: active ? c.text : "#e5e7eb",
                    color: active ? "#fff" : "#6b7280",
                    borderRadius: 99,
                    padding: "0 6px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <svg width="14" height="14" fill="#9ca3af" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, tipo, operación o cotización..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "#1f2937",
              background: "transparent",
              fontFamily: FONT,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
              }}
            >
              Ã—
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 180,
          }}
        >
          <div>
            <div
              style={{
                width: 30,
                height: 30,
                border: "3px solid #f0f0f0",
                borderTop: "3px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            <div
              style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}
            >
              Cargando documentos...
            </div>
          </div>
        </div>
      )}

      {!loading && visibleDocs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groupedDocs.map((group) => {
            const tc = TRANSPORT_COLORS[group.type];
            const isExpanded = expandedGroups[group.key] ?? true;

            return (
              <div
                key={group.key}
                style={{
                  background: "#fff",
                  border: `1px solid ${tc.border}`,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <button
                  className="doc-group-btn"
                  onClick={() =>
                    setExpandedGroups((prev) => ({
                      ...prev,
                      [group.key]: !isExpanded,
                    }))
                  }
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: tc.bg,
                        color: tc.text,
                        border: `1px solid ${tc.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {TRANSPORT_ICONS[group.type]}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          {group.title}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: tc.bg,
                            color: tc.text,
                            border: `1px solid ${tc.border}`,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {TRANSPORT_LABELS[group.type]}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {group.subtitle ||
                          "Documentos agrupados bajo esta referencia"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      {group.docs.length} documento
                      {group.docs.length !== 1 ? "s" : ""}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="2"
                      style={{
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #e5e7eb" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr 180px 110px 80px",
                        gap: 0,
                        padding: "8px 16px",
                        background: "#f8fafc",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {["", "Documento", "Tipo", "Fecha", ""].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            textAlign: i === 4 ? "right" : "left",
                          }}
                        >
                          {h}
                        </div>
                      ))}
                    </div>

                    {group.docs.map((doc, idx) => {
                      const fileLabel = getFileLabel(doc.tipoArchivo);
                      const isDeleting = deletingId === doc.id;
                      const isDownloading = downloadingId === doc.id;

                      return (
                        <div
                          key={doc.id}
                          className="doc-row"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "32px 1fr 180px 110px 80px",
                            gap: 0,
                            padding: "10px 16px",
                            borderBottom:
                              idx < group.docs.length - 1
                                ? "1px solid #f1f5f9"
                                : "none",
                            alignItems: "center",
                            transition: "background 0.1s",
                            opacity: isDeleting ? 0.5 : 1,
                            animation: "fadeIn 0.15s",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-start",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 26,
                                height: 26,
                                borderRadius: 5,
                                background: `${fileLabel.color}18`,
                                color: fileLabel.color,
                                fontSize: 8,
                                fontWeight: 800,
                                letterSpacing: "-0.3px",
                              }}
                            >
                              {fileLabel.icon}
                            </span>
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: "#0f172a",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={doc.nombreArchivo}
                            >
                              {doc.nombreArchivo}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                                marginTop: 1,
                              }}
                            >
                              {doc.tamanoMB} MB
                            </div>
                          </div>

                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 4,
                                background: tc.bg,
                                color: tc.text,
                                border: `1px solid ${tc.border}`,
                                fontSize: 10,
                                fontWeight: 600,
                                maxWidth: 170,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={doc.tipo}
                            >
                              {doc.tipo}
                            </span>
                          </div>

                          <div
                            style={{ fontSize: 12, color: "#94a3b8" }}
                            title={formatFechaFull(doc.fechaSubida)}
                          >
                            {formatFecha(doc.fechaSubida)}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 4,
                            }}
                          >
                            <button
                              className="doc-action-btn"
                              onClick={() => handleDownload(doc)}
                              disabled={isDownloading || isDeleting}
                              title="Descargar"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 30,
                                height: 30,
                                borderRadius: 6,
                                border: "1px solid #e5e7eb",
                                background: "transparent",
                                cursor: "pointer",
                                color: "#64748b",
                                transition: "all 0.1s",
                                fontFamily: FONT,
                              }}
                            >
                              {isDownloading ? (
                                <div
                                  style={{
                                    width: 12,
                                    height: 12,
                                    border: "2px solid #e5e7eb",
                                    borderTop: "2px solid #2563eb",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                  }}
                                />
                              ) : (
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                              )}
                            </button>

                            {canDelete && (
                              <button
                                className="doc-action-btn danger"
                                onClick={() => handleDelete(doc)}
                                disabled={isDeleting || isDownloading}
                                title="Eliminar"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: "1px solid #e5e7eb",
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: "#94a3b8",
                                  transition: "all 0.1s",
                                  fontFamily: FONT,
                                }}
                              >
                                {isDeleting ? (
                                  <div
                                    style={{
                                      width: 12,
                                      height: 12,
                                      border: "2px solid #e5e7eb",
                                      borderTop: "2px solid #dc2626",
                                      borderRadius: "50%",
                                      animation: "spin 0.8s linear infinite",
                                    }}
                                  />
                                ) : (
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && visibleDocs.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
            color: "#9ca3af",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1.5"
            style={{ marginBottom: 12 }}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p
            style={{
              fontSize: 14,
              margin: 0,
              fontWeight: 500,
              color: "#6b7280",
            }}
          >
            {search
              ? `Sin resultados para "${search}"`
              : counts.all === 0
                ? "No hay documentos disponibles"
                : `Sin documentos en ${TRANSPORT_LABELS[activeType]}`}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#2563eb",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              Limpiar bÃºsqueda
            </button>
          )}
        </div>
      )}

      {!loading && visibleDocs.length > 0 && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "right",
          }}
        >
          {visibleDocs.length} documento{visibleDocs.length !== 1 ? "s" : ""} en{" "}
          {groupedDocs.length} grupo{groupedDocs.length !== 1 ? "s" : ""}
          {search && ` encontrado${visibleDocs.length !== 1 ? "s" : ""}`}
        </div>
      )}
    </div>
  );
}
