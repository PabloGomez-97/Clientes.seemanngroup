// src/components/Sidebar/Documents/DocumentosUnificadosView.tsx
// Vista unificada de documentos para cliente y ejecutivo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { linbisFetch } from "../../../services/linbisFetch";
import "./DocumentosUnificadosView.css";

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
  sortValue: number;
}

const TRANSPORT_LABELS: Record<TransportType, string> = {
  all: "Todos",
  air: "Aérea",
  ocean: "Marítima",
  ground: "Terrestre",
  quotes: "Cotizaciones",
};

const SUMMARY_METRICS: Array<{
  key: TransportType;
  label: string;
  sub: string;
}> = [
  { key: "all", label: "Todos", sub: "documentos" },
  { key: "air", label: "Aéreo", sub: "documentos" },
  { key: "ocean", label: "Marítimo", sub: "documentos" },
  { key: "ground", label: "Terrestre", sub: "documentos" },
  { key: "quotes", label: "Cotizaciones", sub: "documentos" },
];

const FILE_BADGES: Array<{ match: string; label: string }> = [
  { match: "pdf", label: "PDF" },
  { match: "excel", label: "XLS" },
  { match: "spreadsheet", label: "XLS" },
  { match: "word", label: "DOC" },
  { match: "document", label: "DOC" },
];

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function getReferenceKey(type: GroupTransportType, referenceId: string | null) {
  return `${type}:${referenceId || "sin-referencia"}`;
}

function getGroupTitle(
  type: GroupTransportType,
  meta: ReferenceMeta | null,
  internalId: string | null,
) {
  const number = normalizeText(meta?.number);
  const customerReference = normalizeText(meta?.customerReference);
  const suffix = number || customerReference || internalId || "";

  if (type === "quotes") {
    return suffix ? `Cotización ${suffix}` : "Cotización";
  }

  return suffix
    ? `Operación ${TRANSPORT_LABELS[type]} ${suffix}`
    : `Operación ${TRANSPORT_LABELS[type]}`;
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

function getFileBadge(tipoArchivo: string) {
  const lower = tipoArchivo.toLowerCase();
  const match = FILE_BADGES.find((item) => lower.includes(item.match));
  return match?.label ?? "FILE";
}

function getReferenceSortValue(
  meta: ReferenceMeta | null,
  internalId: string | null,
) {
  const source =
    normalizeText(meta?.number) ||
    normalizeText(meta?.customerReference) ||
    internalId;
  if (!source) return -1;

  const numeric = source.match(/\d+/g)?.join("");
  if (numeric) return Number(numeric);

  return 0;
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
          // Keep the fallback reference if Linbis is unavailable.
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
                // Keep the fallback reference if the lookup fails.
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
                // Keep the fallback reference if the lookup fails.
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
      await loadReferenceMap(nextDocs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [loadReferenceMap, ownerUsername, token]);

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

  const counts: Record<TransportType, number> = {
    all: allDocs.length,
    air: docs.air.length,
    ocean: docs.ocean.length,
    ground: docs.ground.length,
    quotes: docs.quotes.length,
  };

  const visibleDocs = useMemo(() => {
    let list =
      activeType === "all"
        ? allDocs
        : allDocs.filter((doc) => doc._type === activeType);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((doc) => {
        const internalId = normalizeText(doc.shipmentId);
        const meta =
          referenceMap[getReferenceKey(doc._type, internalId)] || null;
        const number = normalizeText(meta?.number) || "";
        const customerReference = normalizeText(meta?.customerReference) || "";

        return (
          doc.nombreArchivo.toLowerCase().includes(q) ||
          doc.tipo.toLowerCase().includes(q) ||
          (internalId || "").toLowerCase().includes(q) ||
          number.toLowerCase().includes(q) ||
          customerReference.toLowerCase().includes(q) ||
          TRANSPORT_LABELS[doc._type].toLowerCase().includes(q)
        );
      });
    }

    return [...list].sort(
      (a, b) =>
        new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime(),
    );
  }, [activeType, allDocs, referenceMap, search]);

  const groupedDocs = useMemo<DocGroup[]>(() => {
    const groups = new Map<string, DocGroup>();

    visibleDocs.forEach((doc) => {
      const internalId = normalizeText(doc.shipmentId);
      const meta = referenceMap[getReferenceKey(doc._type, internalId)] || null;
      const key = getReferenceKey(doc._type, internalId);
      const timestamp = new Date(doc.fechaSubida).getTime();

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          type: doc._type,
          title: getGroupTitle(doc._type, meta, internalId),
          subtitle: getGroupSubtitle(meta, internalId),
          docs: [],
          latestTimestamp: timestamp,
          sortValue: getReferenceSortValue(meta, internalId),
        });
      }

      const group = groups.get(key)!;
      group.docs.push(doc);
      group.latestTimestamp = Math.max(group.latestTimestamp, timestamp);
      group.sortValue = Math.max(
        group.sortValue,
        getReferenceSortValue(meta, internalId),
      );
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
      .sort((a, b) => {
        if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue;
        if (b.latestTimestamp !== a.latestTimestamp) {
          return b.latestTimestamp - a.latestTimestamp;
        }
        return a.title.localeCompare(b.title, "es", { numeric: true });
      });
  }, [referenceMap, visibleDocs]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };

      groupedDocs.forEach((group) => {
        if (next[group.key] === undefined) {
          next[group.key] = true;
        }
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
  }, [groupedDocs, search]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleDownload = useCallback(
    async (doc: UnifiedDoc) => {
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
    },
    [downloadingId, ownerUsername, token],
  );

  const handleDelete = useCallback(
    async (doc: UnifiedDoc) => {
      if (!token || !canDelete) return;
      if (!window.confirm(`¿Eliminar "${doc.nombreArchivo}"?`)) return;
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
    },
    [canDelete, loadDocs, ownerUsername, token],
  );

  return (
    <div className="doc-unified-view" style={{ fontFamily: FONT }}>
      {title && (
        <div className="doc-header">
          <h2 className="doc-header__title">{title}</h2>
        </div>
      )}

      <section className="doc-metrics-strip" aria-label="Resumen de documentos">
        {SUMMARY_METRICS.map((metric) => {
          const active = activeType === metric.key;
          return (
            <button
              key={metric.key}
              type="button"
              className={`doc-metrics-strip__item${active ? " doc-metrics-strip__item--active" : ""}`}
              aria-pressed={active}
              onClick={() => setActiveType(metric.key)}
            >
              <div className="doc-metrics-strip__label">{metric.label}</div>
              <div className="doc-metrics-strip__value">{counts[metric.key]}</div>
              <div className="doc-metrics-strip__sub">{metric.sub}</div>
            </button>
          );
        })}
      </section>

      <div className="doc-toolbar">
        <div className="doc-search">
          <input
            type="text"
            placeholder="Buscar por nombre, tipo, operación o cotización..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="doc-link"
              onClick={() => setSearch("")}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="doc-alert doc-alert--success">{successMsg}</div>
      )}

      {error && (
        <div className="doc-alert doc-alert--error">
          {error}
          <button
            type="button"
            className="doc-alert__close"
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {loading && (
        <div className="doc-empty">
          <span>Cargando documentos...</span>
        </div>
      )}

      {!loading && groupedDocs.length > 0 && (
        <div className="doc-groups">
          {groupedDocs.map((group) => {
            const isExpanded = expandedGroups[group.key] ?? true;

            return (
              <section key={group.key} className="doc-group">
                <button
                  type="button"
                  className="doc-group__header"
                  onClick={() => toggleGroup(group.key)}
                >
                  <div className="doc-group__copy">
                    <div className="doc-group__title">{group.title}</div>
                    <div className="doc-group__subtitle">
                      {group.subtitle ||
                        "Documentos agrupados bajo esta referencia"}
                    </div>
                  </div>

                  <div className="doc-group__meta">
                    <span>
                      {group.docs.length} documento
                      {group.docs.length !== 1 ? "s" : ""}
                    </span>
                    <span className="doc-group__toggle">
                      {isExpanded ? "Ocultar" : "Ver"}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="doc-group__body">
                    <div className="doc-group__table-header">
                      <div className="doc-group__head">Documento</div>
                      <div className="doc-group__head">Tipo</div>
                      <div className="doc-group__head">Fecha</div>
                      <div className="doc-group__head doc-group__head--actions">
                        Acciones
                      </div>
                    </div>

                    {group.docs.map((doc) => {
                      const isDeleting = deletingId === doc.id;
                      const isDownloading = downloadingId === doc.id;

                      return (
                        <div key={doc.id} className="doc-row">
                          <div
                            className="doc-document"
                            title={doc.nombreArchivo}
                          >
                            <span className="doc-file-badge">
                              {getFileBadge(doc.tipoArchivo)}
                            </span>
                            <div className="doc-document__copy">
                              <div className="doc-document__name">
                                {doc.nombreArchivo}
                              </div>
                              <div className="doc-document__size">
                                {doc.tamanoMB} MB
                              </div>
                            </div>
                          </div>

                          <div className="doc-type-cell">
                            <span className="doc-type-badge" title={doc.tipo}>
                              {doc.tipo}
                            </span>
                          </div>

                          <div
                            className="doc-date"
                            title={formatFechaFull(doc.fechaSubida)}
                          >
                            {formatFecha(doc.fechaSubida)}
                          </div>

                          <div className="doc-actions">
                            <button
                              type="button"
                              className="doc-action-link"
                              onClick={() => handleDownload(doc)}
                              disabled={isDownloading || isDeleting}
                            >
                              {isDownloading ? "Descargando..." : "Descargar"}
                            </button>

                            {canDelete && (
                              <button
                                type="button"
                                className="doc-action-link doc-action-link--danger"
                                onClick={() => handleDelete(doc)}
                                disabled={isDeleting || isDownloading}
                              >
                                {isDeleting ? "Eliminando..." : "Eliminar"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {!loading && groupedDocs.length === 0 && (
        <div className="doc-empty">
          <div>
            <div className="doc-empty__title">
              {search
                ? `Sin resultados para "${search}"`
                : counts.all === 0
                  ? "No hay documentos disponibles"
                  : `Sin documentos en ${TRANSPORT_LABELS[activeType]}`}
            </div>
            {search ? (
              <button
                type="button"
                className="doc-link"
                onClick={() => setSearch("")}
              >
                Limpiar búsqueda
              </button>
            ) : null}
          </div>
        </div>
      )}

      {!loading && visibleDocs.length > 0 && (
        <div className="doc-results">
          {visibleDocs.length} documento{visibleDocs.length !== 1 ? "s" : ""}
          {activeType !== "all" && ` en ${TRANSPORT_LABELS[activeType]}`}
          {search && ` encontrado${visibleDocs.length !== 1 ? "s" : ""}`}
        </div>
      )}
    </div>
  );
}

export default DocumentosUnificadosView;
