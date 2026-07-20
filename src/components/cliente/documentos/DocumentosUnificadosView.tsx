// src/components/cliente/documentos/DocumentosUnificadosView.tsx
// Vista unificada de documentos para cliente y ejecutivo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { linbisFetch } from "@/services/linbisFetch";
import {
  DocGroupSection,
  type DocGroup,
  type UnifiedDoc,
} from "./DocGroupSection";
import { DocTransportFilter } from "./DocTransportFilter";
import {
  TRANSPORT_LABELS,
  type DocItem,
  type GroupTransportType,
  type TransportType,
} from "./docTransportTokens";
import "./DocumentosUnificadosView.css";
import LoadingTips from "@/components/cliente/embarques/LoadingTips";

const FONT =
  'var(--portal-font)';
const DOCS_CACHE_TTL = 3 * 60 * 60 * 1000;
const DOCS_CACHE_PREFIX = "unifiedDocumentsCache_v1";

export type { DocItem };

interface AllDocs {
  air: DocItem[];
  ocean: DocItem[];
  ground: DocItem[];
  quotes: DocItem[];
}

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

interface ReferenceMeta {
  number: string | null;
  customerReference: string | null;
}

interface CachedDocsPayload {
  ts: number;
  docs: AllDocs;
  referenceMap: Record<string, ReferenceMeta>;
}

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

function getDocsCacheKey(ownerUsername: string) {
  return `${DOCS_CACHE_PREFIX}_${ownerUsername.toLowerCase()}`;
}

function readDocsCache(ownerUsername: string): CachedDocsPayload | null {
  try {
    const raw = localStorage.getItem(getDocsCacheKey(ownerUsername));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedDocsPayload;
    if (!parsed?.ts || Date.now() - parsed.ts > DOCS_CACHE_TTL) {
      localStorage.removeItem(getDocsCacheKey(ownerUsername));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeDocsCache(
  ownerUsername: string,
  docs: AllDocs,
  referenceMap: Record<string, ReferenceMeta>,
) {
  try {
    const payload: CachedDocsPayload = {
      ts: Date.now(),
      docs,
      referenceMap,
    };
    localStorage.setItem(
      getDocsCacheKey(ownerUsername),
      JSON.stringify(payload),
    );
  } catch {
    // Cache is best-effort.
  }
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

function getGroupLookupValue(
  meta: ReferenceMeta | null,
  internalId: string | null,
) {
  return (
    normalizeText(meta?.number) ||
    normalizeText(meta?.customerReference) ||
    internalId
  );
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
  const navigate = useNavigate();
  const location = useLocation();
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
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const loadReferenceMap = useCallback(
    async (sourceDocs: AllDocs) => {
      if (!accessToken || !ownerUsername) {
        setReferenceMap({});
        return {};
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
                  const quoteNumber = normalizeText(String(quote?.number ?? ""));
                  const meta: ReferenceMeta = {
                    number: quoteNumber,
                    customerReference: normalizeText(quote?.customerReference),
                  };

                  if (quoteId && quoteIds.has(quoteId)) {
                    nextMap[getReferenceKey("quotes", quoteId)] = meta;
                  }
                  if (quoteNumber && quoteIds.has(quoteNumber)) {
                    nextMap[getReferenceKey("quotes", quoteNumber)] = meta;
                  }
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
      return nextMap;
    },
    [accessToken, ownerUsername, refreshAccessToken],
  );

  const loadDocs = useCallback(
    async (forceRefresh = false) => {
      if (!token || !ownerUsername) return;
      setLoading(true);
      setError(null);

      const cached = forceRefresh ? null : readDocsCache(ownerUsername);
      if (cached) {
        setDocs(cached.docs);
        setReferenceMap(cached.referenceMap);
        setLoading(false);
        return;
      }

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
        const nextReferenceMap = await loadReferenceMap(nextDocs);
        writeDocsCache(ownerUsername, nextDocs, nextReferenceMap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    },
    [loadReferenceMap, ownerUsername, token],
  );

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
          lookupValue: getGroupLookupValue(meta, internalId),
        });
      }

      const group = groups.get(key)!;
      group.docs.push(doc);
      group.latestTimestamp = Math.max(group.latestTimestamp, timestamp);
      group.sortValue = Math.max(
        group.sortValue,
        getReferenceSortValue(meta, internalId),
      );
      group.lookupValue =
        group.lookupValue || getGroupLookupValue(meta, internalId);
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

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      if (prev.includes(key)) {
        return prev.filter((groupKey) => groupKey !== key);
      }

      const next = prev.length >= 2 ? prev.slice(1) : [...prev];
      next.push(key);
      return next;
    });
  }, []);

  const buildDestination = useCallback(
    (group: DocGroup) => {
      const lookup = group.lookupValue || "";
      const isAdmin = location.pathname.startsWith("/admin/");

      if (group.type === "quotes") {
        if (isAdmin) {
          return {
            to: `/admin/clientes/reporteria/${encodeURIComponent(ownerUsername)}`,
            state: {
              targetTab: "quotes" as const,
              quoteFilterNumber: lookup,
            },
          };
        }

        return {
          to: "/quotes",
          state: {
            quoteFilter: lookup,
          },
        };
      }

      const targetTab = group.type;
      if (isAdmin) {
        return {
          to: `/admin/clientes/reporteria/${encodeURIComponent(ownerUsername)}`,
          state: {
            targetTab,
            shipmentFilterNumber: lookup,
          },
        };
      }

      const route =
        group.type === "air"
          ? "/air-shipments"
          : group.type === "ocean"
            ? "/ocean-shipments"
            : "/ground-shipments";

      return {
        to: route,
        state: {
          shipmentFilterNumber: lookup,
        },
      };
    },
    [location.pathname, ownerUsername],
  );

  const handleDownload = useCallback(
    async (doc: UnifiedDoc) => {
      if (!token || downloadingId === doc.id) return;
      setDownloadingId(doc.id);

      try {
        const ownerQuery = `ownerUsername=${encodeURIComponent(ownerUsername)}`;
        const endpoint =
          doc._type === "ground"
            ? `/api/ground-shipments/documentos/download/${doc.id}?${ownerQuery}`
            : doc.scope === "operacional"
              ? `/api/documentos/operacionales/download/${doc.id}?${ownerQuery}`
              : `/api/documentos/download/${doc.id}?${ownerQuery}`;

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
        const ownerQuery = `ownerUsername=${encodeURIComponent(ownerUsername)}`;
        const endpoint =
          doc._type === "ground"
            ? `/api/ground-shipments/documentos/${doc.id}?${ownerQuery}`
            : doc.scope === "operacional"
              ? `/api/documentos/operacionales/${doc.id}?${ownerQuery}`
              : `/api/documentos/${doc.id}?${ownerQuery}`;

        const res = await fetch(endpoint, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Error al eliminar");

        setSuccessMsg(`"${doc.nombreArchivo}" eliminado`);
        setTimeout(() => setSuccessMsg(null), 4000);
        await loadDocs(true);
      } catch {
        setError("Error al eliminar el documento");
      } finally {
        setDeletingId(null);
      }
    },
    [canDelete, loadDocs, ownerUsername, token],
  );

  const handleRefresh = useCallback(async () => {
    await loadDocs(true);
  }, [loadDocs]);

  const resultsSummary = useMemo(() => {
    if (loading || visibleDocs.length === 0) return null;

    let text = `${visibleDocs.length} documento${visibleDocs.length !== 1 ? "s" : ""}`;
    if (activeType !== "all") {
      text += ` en ${TRANSPORT_LABELS[activeType]}`;
    }
    if (search.trim()) {
      text += ` encontrado${visibleDocs.length !== 1 ? "s" : ""}`;
    }
    return text;
  }, [activeType, loading, search, visibleDocs.length]);

  return (
    <div className="doc-unified-view" style={{ fontFamily: FONT }}>
      {title && (
        <div className="doc-header">
          <h2 className="doc-header__title">{title}</h2>
        </div>
      )}

      <header className="doc-command-bar">
        <div className="doc-intro">
          <p className="doc-intro__text">
            Para <strong>subir nuevos documentos</strong>, ve a la sección de
            operaciones correspondiente (Aérea, Marítima o Terrestre) y ábrelos
            desde allí.
          </p>
        </div>

        <DocTransportFilter
          activeType={activeType}
          counts={counts}
          onChange={setActiveType}
          resultsSummary={resultsSummary}
        />

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
          <button
            type="button"
            className="doc-refresh-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            Actualizar
          </button>
        </div>
      </header>

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

      {/* Loading */}
      {loading && <LoadingTips />}

      {!loading && groupedDocs.length > 0 && (
        <div className="doc-groups">
          {groupedDocs.map((group) => (
            <DocGroupSection
              key={group.key}
              group={group}
              isExpanded={expandedGroups.includes(group.key)}
              destination={buildDestination(group)}
              canDelete={canDelete}
              deletingId={deletingId}
              downloadingId={downloadingId}
              onToggle={() => toggleGroup(group.key)}
              onNavigate={navigate}
              onDownload={handleDownload}
              onDelete={handleDelete}
              formatFecha={formatFecha}
              formatFechaFull={formatFechaFull}
            />
          ))}
        </div>
      )}

      {!loading && groupedDocs.length === 0 && (
        <div className="doc-empty">
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
      )}
    </div>
  );
}

export default DocumentosUnificadosView;
