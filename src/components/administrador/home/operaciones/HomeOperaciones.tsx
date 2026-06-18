// src/components/administrador/HomeOperaciones.tsx — Torre de Control de Operaciones
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import type {
  AirShipment,
  AirResponse,
  OceanShipment,
  OceanResponse,
} from "@/components/cliente/tracking/shipsgo/types";
import {
  AIR_STATUS_LABELS,
  OCEAN_STATUS_LABELS,
  formatDate,
  getFlagUrl,
} from "@/components/cliente/tracking/shipsgo/types";
import AirShipmentDetail from "@/components/cliente/tracking/shipsgo/AirShipmentDetail";
import OceanShipmentDetail from "@/components/cliente/tracking/shipsgo/OceanShipmentDetail";
import ShipsGoTrackingAdminOP from "@/components/administrador/tracking/operaciones/TrackingAdminOperaciones";
import "@/components/cliente/styles/Shipsgotracking.css";
import "./HomeOperaciones.css";
import { OperacionesQuickActions } from "./OperacionesQuickActions";
import {
  getCachedOpClients,
  normalizeOpClientsFromApi,
  setCachedOpClients,
  type OpCachedClient,
  type OpEjecutivoRef,
} from "@/utils/opClientsCache";
import { fetchDocumentCountsBatch } from "@/utils/documentCounts";

const STALE_TRACKING_MS = 48 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════
// Modal types
// ═══════════════════════════════════════════════════════════════════════════

type ListModalType =
  | null
  | "all-shipments"
  | "all-clients"
  | "kpi-total"
  | "kpi-active"
  | "kpi-air-transit"
  | "kpi-ocean-transit"
  | "kpi-completed"
  | "kpi-delayed"
  | "kpi-clients";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type ClientUser = OpCachedClient;

interface ClientShipmentCount {
  username: string;
  nombreuser?: string;
  air: number;
  ocean: number;
  total: number;
  docCount?: number;
  ejecutivoNombre?: string;
}

interface EjecutivoPortfolioRow {
  id: string;
  nombre: string;
  email: string;
  clientCount: number;
  clientsWithTracking: number;
  trackings: number;
  delayed: number;
  stale: number;
}

interface ShipsGoMeta {
  more: boolean;
  total: number;
}

function normalizeClientSearch(value?: string | null): string {
  return value?.trim().toLowerCase() || "";
}

function clientMatchesSearch(client: ClientUser, query: string): boolean {
  if (!query) return true;

  return [
    client.username,
    client.email,
    client.nombreuser,
    ...(client.usernames || []),
  ]
    .filter(Boolean)
    .some((value) => normalizeClientSearch(value).includes(query));
}

function shipmentMatchesClientSearch(
  reference: string | undefined,
  query: string,
  matchingUsernames: Set<string>,
): boolean {
  if (!query) return true;

  const normalizedReference = normalizeClientSearch(reference);
  if (normalizedReference.includes(query)) return true;

  return reference ? matchingUsernames.has(reference) : false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function isAirDelayed(s: AirShipment): boolean {
  if (!s.route) return false;
  const { transit_percentage } = s.route;
  const eta = s.route.destination.date_of_rcf;
  if (!eta || transit_percentage >= 100) return false;
  // Only in-transit shipments can be delayed (not LANDED/DELIVERED)
  if (s.status === "LANDED" || s.status === "DELIVERED") return false;
  return new Date(s.updated_at) >= new Date(eta) && transit_percentage < 100;
}

function isOceanDelayed(s: OceanShipment): boolean {
  if (!s.route) return false;
  const { transit_percentage } = s.route;
  const eta = s.route.port_of_discharge.date_of_discharge;
  if (!eta || transit_percentage >= 100) return false;
  // Only sailing/in-transit shipments can be delayed (not ARRIVED/DISCHARGED)
  if (s.status === "ARRIVED" || s.status === "DISCHARGED") return false;
  return new Date(s.updated_at) >= new Date(eta) && transit_percentage < 100;
}

function isAirInTransit(s: AirShipment): boolean {
  return s.status === "EN_ROUTE" || s.status === "BOOKED";
}

function isAirCompleted(s: AirShipment): boolean {
  return s.status === "LANDED" || s.status === "DELIVERED";
}

function isOceanInTransit(s: OceanShipment): boolean {
  return (
    s.status === "SAILING" ||
    s.status === "LOADED" ||
    s.status === "BOOKED" ||
    s.status === "NEW" ||
    s.status === "INPROGRESS"
  );
}

function isOceanCompleted(s: OceanShipment): boolean {
  return s.status === "ARRIVED" || s.status === "DISCHARGED";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getToday(): string {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getClientUsernames(client: ClientUser): string[] {
  return client.usernames?.length ? client.usernames : [client.username];
}

function buildUsernameSet(clients: ClientUser[]): Set<string> {
  const set = new Set<string>();
  clients.forEach((c) => getClientUsernames(c).forEach((u) => set.add(u)));
  return set;
}

function shipmentBelongsToClients(
  reference: string | null | undefined,
  usernameSet: Set<string>,
): boolean {
  return reference ? usernameSet.has(reference) : false;
}

function isStaleTracking(updatedAt: string, checkedAt?: string): boolean {
  const ref = checkedAt || updatedAt;
  return Date.now() - new Date(ref).getTime() > STALE_TRACKING_MS;
}

function hasAirEtaChange(s: AirShipment): boolean {
  const initial = s.route?.destination.date_of_rcf_initial;
  const current = s.route?.destination.date_of_rcf;
  return !!(initial && current && initial !== current);
}

function hasOceanEtaChange(s: OceanShipment): boolean {
  const initial = s.route?.port_of_discharge.date_of_discharge_initial;
  const current = s.route?.port_of_discharge.date_of_discharge;
  return !!(initial && current && initial !== current);
}

function formatLastRefresh(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  return `hace ${Math.floor(mins / 60)}h`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function SkeletonDashboard() {
  return (
    <>
      <div className="ops-command-bar" aria-hidden="true">
        <div className="ops-command-bar__actions">
          <div className="ops-skeleton" style={{ width: 160, height: 36, borderRadius: 8 }} />
          <div className="ops-skeleton" style={{ width: 320, height: 32, borderRadius: 8 }} />
        </div>
        <div className="ops-kpi-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="ops-kpi ops-kpi--orange" key={index}>
              <div
                className="ops-skeleton"
                style={{ width: "52%", height: 11, marginBottom: 10 }}
              />
              <div
                className="ops-skeleton"
                style={{ width: "34%", height: 28, marginBottom: 6 }}
              />
              <div className="ops-skeleton" style={{ width: "68%", height: 11 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="ops-skeleton-panel" aria-hidden="true">
        <div
          className="ops-skeleton"
          style={{ width: "28%", height: 14, marginBottom: 16 }}
        />
        <div className="ops-skeleton" style={{ width: "100%", height: 120 }} />
      </div>
      <div className="ops-skeleton-panel" aria-hidden="true">
        <div
          className="ops-skeleton"
          style={{ width: "32%", height: 14, marginBottom: 16 }}
        />
        <div className="ops-skeleton" style={{ width: "100%", height: 200 }} />
      </div>
    </>
  );
}

function IconAir({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function IconOcean({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1" />
      <path d="M4 18l-1-5h18l-1 5" />
    </svg>
  );
}

function IconAlert({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTracking({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconUsers({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconFile({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconCalculator({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <line x1="8" y1="18" x2="8" y2="18.01" />
      <line x1="12" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function IconKpiTotal({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconKpiMotion({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconKpiCheck({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

/** SVG donut chart for status distribution */
function DonutChart({
  segments,
  size = 110,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="#f1f3f8"
          strokeWidth="4"
        />
        <text
          x="18"
          y="20"
          textAnchor="middle"
          fontSize="7"
          fill="#b1b8c9"
          fontWeight="700"
        >
          0
        </text>
      </svg>
    );
  }
  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36">
      {segments
        .filter((s) => s.value > 0)
        .map((seg, i) => {
          const pct = (seg.value / total) * 100;
          const offset = 100 - cumulative + 25; // 25 = start from top
          cumulative += pct;
          return (
            <circle
              key={i}
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={seg.color}
              strokeWidth="4"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
      <text
        x="18"
        y="20"
        textAnchor="middle"
        fontSize="8"
        fill="#1a1a2e"
        fontWeight="700"
      >
        {total}
      </text>
    </svg>
  );
}

function getAirBadgeClass(status: string): string {
  if (status === "EN_ROUTE") return "ops-badge--transit";
  if (status === "LANDED" || status === "DELIVERED")
    return "ops-badge--delivered";
  if (status === "BOOKED") return "ops-badge--booked";
  return "ops-badge--other";
}

function getOceanBadgeClass(status: string): string {
  if (status === "SAILING") return "ops-badge--sailing";
  if (status === "ARRIVED" || status === "DISCHARGED")
    return "ops-badge--delivered";
  if (status === "LOADED" || status === "BOOKED") return "ops-badge--booked";
  return "ops-badge--other";
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="ops-progress">
      <div className="ops-progress__track">
        <div
          className="ops-progress__fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="ops-progress__text">{value}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function HomeOperaciones() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [allAir, setAllAir] = useState<AirShipment[]>([]);
  const [allOcean, setAllOcean] = useState<OceanShipment[]>([]);
  const [airMeta, setAirMeta] = useState<ShipsGoMeta>({ more: false, total: 0 });
  const [oceanMeta, setOceanMeta] = useState<ShipsGoMeta>({
    more: false,
    total: 0,
  });
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [shipmentTab, setShipmentTab] = useState<"air" | "ocean">("air");
  const [ejecutivoFilter, setEjecutivoFilter] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>(
    {},
  );

  // Modal state
  const [selectedAir, setSelectedAir] = useState<AirShipment | null>(null);
  const [selectedOcean, setSelectedOcean] = useState<OceanShipment | null>(
    null,
  );
  const [listModal, setListModal] = useState<ListModalType>(null);
  const [listModalTab, setListModalTab] = useState<"air" | "ocean" | "all">(
    "all",
  );
  const [showCreateTrackingModal, setShowCreateTrackingModal] = useState(false);

  // Auto-open modal when navigated from a notification (router state)
  const location = useLocation();
  useEffect(() => {
    const s = (location.state as any) || null;
    if (s && typeof s === "object" && s.openModal) {
      setListModal(s.openModal as ListModalType);
      if (
        s.modalTab &&
        (s.modalTab === "air" || s.modalTab === "ocean" || s.modalTab === "all")
      ) {
        setListModalTab(s.modalTab);
      }
      window.history.replaceState({}, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const displayName = user?.nombreuser || user?.username || "Operaciones";

  const fetchDocumentCounts = useCallback(
    async (clientList: ClientUser[], signal?: AbortSignal) => {
      if (!token || clientList.length === 0) return;
      try {
        const counts = await fetchDocumentCountsBatch(
          token,
          clientList.map((c) => c.username),
          signal,
        );
        if (!signal?.aborted) setDocumentCounts(counts);
      } catch {
        /* silent */
      }
    },
    [token],
  );

  // ── Data fetching ───────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (silent = false, signal?: AbortSignal) => {
      if (!token) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const cachedClients = getCachedOpClients();
      if (cachedClients) {
        setClients(cachedClients);
      }

      const shouldFetchClients = !cachedClients || silent;

      try {
        const shipmentRequests: Promise<unknown>[] = [
          fetch("/api/shipsgo/shipments", {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }).then((r) => r.json() as Promise<AirResponse>),
          fetch("/api/shipsgo/ocean/shipments", {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }).then((r) => r.json() as Promise<OceanResponse>),
        ];

        if (shouldFetchClients) {
          shipmentRequests.push(
            fetch("/api/admin/users", {
              headers: { Authorization: `Bearer ${token}` },
              signal,
            }).then(async (r) => {
              const data = await r.json();
              if (!r.ok) {
                throw new Error(data?.error || "Error al cargar clientes");
              }
              return data;
            }),
          );
        }

        const results = await Promise.allSettled(shipmentRequests);
        const airRes = results[0];
        const oceanRes = results[1];
        const clientsRes = shouldFetchClients ? results[2] : null;

        if (
          airRes.status === "fulfilled" &&
          Array.isArray((airRes.value as AirResponse)?.shipments)
        ) {
          const airValue = airRes.value as AirResponse;
          setAllAir(airValue.shipments);
          setAirMeta({
            more: !!airValue.meta?.more,
            total: airValue.meta?.total ?? airValue.shipments.length,
          });
        }
        if (
          oceanRes.status === "fulfilled" &&
          Array.isArray((oceanRes.value as OceanResponse)?.shipments)
        ) {
          const oceanValue = oceanRes.value as OceanResponse;
          setAllOcean(oceanValue.shipments);
          setOceanMeta({
            more: !!oceanValue.meta?.more,
            total: oceanValue.meta?.total ?? oceanValue.shipments.length,
          });
        }

        let nextClients: ClientUser[] = cachedClients ?? [];

        if (clientsRes) {
          if (clientsRes.status === "fulfilled") {
            const arr = normalizeOpClientsFromApi(clientsRes.value);
            setClients(arr);
            setCachedOpClients(arr);
            setClientsError(null);
            nextClients = arr;
          } else if (!cachedClients) {
            const reason = clientsRes.reason;
            setClientsError(
              reason instanceof Error
                ? reason.message
                : "No se pudieron cargar los clientes",
            );
          }
        }

        if (!signal?.aborted && nextClients.length > 0) {
          void fetchDocumentCounts(nextClients, signal);
        }
      } catch (error) {
        if (signal?.aborted) return;
        if (!cachedClients) {
          setClientsError(
            error instanceof Error
              ? error.message
              : "Error al cargar datos del panel",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
          setLastRefresh(new Date());
        }
      }
    },
    [token, fetchDocumentCounts],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(false, controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Computed stats (with optional ejecutivo filter) ─────────────────────

  const filteredClients = useMemo(() => {
    if (ejecutivoFilter === "all") return clients;
    if (ejecutivoFilter === "unassigned") {
      return clients.filter((c) => !c.ejecutivo?.id);
    }
    return clients.filter((c) => c.ejecutivo?.id === ejecutivoFilter);
  }, [clients, ejecutivoFilter]);

  const filteredUsernameSet = useMemo(
    () => buildUsernameSet(filteredClients),
    [filteredClients],
  );

  const scopedAir = useMemo(
    () =>
      ejecutivoFilter === "all"
        ? allAir
        : allAir.filter((s) =>
            shipmentBelongsToClients(s.reference, filteredUsernameSet),
          ),
    [allAir, ejecutivoFilter, filteredUsernameSet],
  );

  const scopedOcean = useMemo(
    () =>
      ejecutivoFilter === "all"
        ? allOcean
        : allOcean.filter((s) =>
            shipmentBelongsToClients(s.reference, filteredUsernameSet),
          ),
    [allOcean, ejecutivoFilter, filteredUsernameSet],
  );

  const ejecutivoOptions = useMemo(() => {
    const map = new Map<string, OpEjecutivoRef>();
    clients.forEach((c) => {
      if (c.ejecutivo?.id) map.set(c.ejecutivo.id, c.ejecutivo);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }, [clients]);

  // Air stats
  const airInTransit = useMemo(() => scopedAir.filter(isAirInTransit), [scopedAir]);
  const airCompleted = useMemo(() => scopedAir.filter(isAirCompleted), [scopedAir]);
  const airDelayed = useMemo(() => scopedAir.filter(isAirDelayed), [scopedAir]);

  // Ocean stats
  const oceanInTransit = useMemo(
    () => scopedOcean.filter(isOceanInTransit),
    [scopedOcean],
  );
  const oceanCompleted = useMemo(
    () => scopedOcean.filter(isOceanCompleted),
    [scopedOcean],
  );
  const oceanDelayed = useMemo(
    () => scopedOcean.filter(isOceanDelayed),
    [scopedOcean],
  );

  const staleAir = useMemo(
    () =>
      scopedAir.filter(
        (s) =>
          isAirInTransit(s) && isStaleTracking(s.updated_at, s.checked_at),
      ),
    [scopedAir],
  );

  const staleOcean = useMemo(
    () =>
      scopedOcean.filter(
        (s) =>
          isOceanInTransit(s) &&
          isStaleTracking(s.updated_at, s.checked_at),
      ),
    [scopedOcean],
  );

  const totalStale = staleAir.length + staleOcean.length;

  const etaChangesCount = useMemo(() => {
    let count = 0;
    scopedAir.forEach((s) => {
      if (hasAirEtaChange(s)) count += 1;
    });
    scopedOcean.forEach((s) => {
      if (hasOceanEtaChange(s)) count += 1;
    });
    return count;
  }, [scopedAir, scopedOcean]);

  const transitCargo = useMemo(() => {
    let pieces = 0;
    let weight = 0;
    airInTransit.forEach((s) => {
      pieces += s.cargo?.pieces ?? 0;
      weight += s.cargo?.weight ?? 0;
    });
    oceanInTransit.forEach(() => {
      /* ocean list lacks per-shipment cargo in ShipsGo types */
    });
    return { pieces, weight };
  }, [airInTransit, oceanInTransit]);

  const clientsWithTracking = useMemo(() => {
    const withTracking = new Set<string>();
    scopedAir.forEach((s) => {
      if (s.reference) withTracking.add(s.reference);
    });
    scopedOcean.forEach((s) => {
      if (s.reference) withTracking.add(s.reference);
    });
    return filteredClients.filter((c) =>
      getClientUsernames(c).some((u) => withTracking.has(u)),
    ).length;
  }, [filteredClients, scopedAir, scopedOcean]);

  const clientsWithoutTracking =
    filteredClients.length - clientsWithTracking;

  const totalDocuments = useMemo(
    () =>
      filteredClients.reduce(
        (sum, c) => sum + (documentCounts[c.username] ?? 0),
        0,
      ),
    [filteredClients, documentCounts],
  );

  const ejecutivoPortfolio = useMemo<EjecutivoPortfolioRow[]>(() => {
    const rows = new Map<string, EjecutivoPortfolioRow>();

    const ensureRow = (ej: OpEjecutivoRef | null | undefined): string => {
      const key = ej?.id || "unassigned";
      if (!rows.has(key)) {
        rows.set(key, {
          id: key,
          nombre: ej?.nombre || "Sin ejecutivo",
          email: ej?.email || "",
          clientCount: 0,
          clientsWithTracking: 0,
          trackings: 0,
          delayed: 0,
          stale: 0,
        });
      }
      return key;
    };

    clients.forEach((c) => {
      const key = ensureRow(c.ejecutivo);
      const row = rows.get(key)!;
      row.clientCount += 1;
      const usernames = getClientUsernames(c);
      const hasTracking = usernames.some(
        (u) =>
          allAir.some((s) => s.reference === u) ||
          allOcean.some((s) => s.reference === u),
      );
      if (hasTracking) row.clientsWithTracking += 1;
    });

    allAir.forEach((s) => {
      const client = clients.find((c) =>
        getClientUsernames(c).includes(s.reference ?? ""),
      );
      const key = ensureRow(client?.ejecutivo);
      const row = rows.get(key)!;
      row.trackings += 1;
      if (isAirDelayed(s)) row.delayed += 1;
      if (isAirInTransit(s) && isStaleTracking(s.updated_at, s.checked_at)) {
        row.stale += 1;
      }
    });

    allOcean.forEach((s) => {
      const client = clients.find((c) =>
        getClientUsernames(c).includes(s.reference ?? ""),
      );
      const key = ensureRow(client?.ejecutivo);
      const row = rows.get(key)!;
      row.trackings += 1;
      if (isOceanDelayed(s)) row.delayed += 1;
      if (
        isOceanInTransit(s) &&
        isStaleTracking(s.updated_at, s.checked_at)
      ) {
        row.stale += 1;
      }
    });

    return Array.from(rows.values()).sort((a, b) => b.trackings - a.trackings);
  }, [clients, allAir, allOcean]);

  // Total active = air in-transit + ocean in-transit
  const totalActive = airInTransit.length + oceanInTransit.length;
  const totalCompleted = airCompleted.length + oceanCompleted.length;
  const totalDelayed = airDelayed.length + oceanDelayed.length;
  const totalTrackings = scopedAir.length + scopedOcean.length;
  const showMetaWarning = airMeta.more || oceanMeta.more;

  const overviewMetrics = useMemo(
    () => [
      {
        id: "total",
        label: "Total",
        value: totalTrackings,
        subtext: `${scopedAir.length} aéreos · ${scopedOcean.length} marítimos`,
        tone: "ops-kpi--orange" as const,
        iconBg: "var(--ops-orange-bg)",
        iconColor: "var(--ops-orange)",
        icon: <IconKpiTotal color="var(--ops-orange)" />,
        onClick: () => {
          setListModal("kpi-total");
          setListModalTab("all");
        },
      },
      {
        id: "active",
        label: "En movimiento",
        value: totalActive,
        subtext: `${airInTransit.length} aéreos · ${oceanInTransit.length} marítimos`,
        tone: "ops-kpi--cyan" as const,
        iconBg: "var(--ops-cyan-bg)",
        iconColor: "var(--ops-cyan)",
        icon: <IconKpiMotion color="var(--ops-cyan)" />,
        onClick: () => {
          setListModal("kpi-active");
          setListModalTab("all");
        },
      },
      {
        id: "completed",
        label: "Completados",
        value: totalCompleted,
        subtext: `${airCompleted.length} aterrizados · ${oceanCompleted.length} arribados`,
        tone: "ops-kpi--green" as const,
        iconBg: "var(--ops-green-bg)",
        iconColor: "var(--ops-green)",
        icon: <IconKpiCheck color="var(--ops-green)" />,
        onClick: () => {
          setListModal("kpi-completed");
          setListModalTab("all");
        },
      },
      {
        id: "delayed",
        label: "Retrasos",
        value: totalDelayed,
        subtext: `${airDelayed.length} aéreos · ${oceanDelayed.length} marítimos`,
        tone: "ops-kpi--red" as const,
        iconBg: "var(--ops-red-bg)",
        iconColor: "var(--ops-red)",
        icon: <IconAlert size={18} />,
        alert: totalDelayed > 0,
        onClick: () => {
          setListModal("kpi-delayed");
          setListModalTab("all");
        },
      },
    ],
    [
      totalTrackings,
      scopedAir.length,
      scopedOcean.length,
      totalActive,
      airInTransit.length,
      oceanInTransit.length,
      totalCompleted,
      airCompleted.length,
      oceanCompleted.length,
      totalDelayed,
      airDelayed.length,
      oceanDelayed.length,
    ],
  );

  // Air status distribution
  const airStatusDist = useMemo(() => {
    const map: Record<string, number> = {};
    scopedAir.forEach((s) => {
      map[s.status] = (map[s.status] || 0) + 1;
    });
    return map;
  }, [scopedAir]);

  // Ocean status distribution
  const oceanStatusDist = useMemo(() => {
    const map: Record<string, number> = {};
    scopedOcean.forEach((s) => {
      map[s.status] = (map[s.status] || 0) + 1;
    });
    return map;
  }, [scopedOcean]);

  // Client ranking by shipment count
  const clientRanking = useMemo<ClientShipmentCount[]>(() => {
    const map = new Map<string, ClientShipmentCount>();
    filteredClients.forEach((c) => {
      const usernames = getClientUsernames(c);
      let air = 0;
      let ocean = 0;
      usernames.forEach((u) => {
        air += scopedAir.filter((s) => s.reference === u).length;
        ocean += scopedOcean.filter((s) => s.reference === u).length;
      });
      if (air + ocean > 0) {
        map.set(c.username, {
          username: c.username,
          nombreuser: c.nombreuser,
          air,
          ocean,
          total: air + ocean,
          docCount: documentCounts[c.username] ?? 0,
          ejecutivoNombre: c.ejecutivo?.nombre,
        });
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredClients, scopedAir, scopedOcean, documentCounts]);

  // Recent shipments (last 8 created)
  const recentAir = useMemo(
    () =>
      [...scopedAir]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 8),
    [scopedAir],
  );

  const recentOcean = useMemo(
    () =>
      [...scopedOcean]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 8),
    [scopedOcean],
  );

  // Route & carrier statistics
  const airRouteStats = useMemo(() => {
    const map: Record<string, number> = {};
    scopedAir.forEach((s) => {
      const o = s.route?.origin.location.iata;
      const d = s.route?.destination.location.iata;
      if (o && d) {
        const key = `${o} → ${d}`;
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [scopedAir]);

  const airAirlineStats = useMemo(() => {
    const map: Record<string, number> = {};
    scopedAir.forEach((s) => {
      const name = s.airline?.name;
      if (name) map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [scopedAir]);

  const oceanRouteStats = useMemo(() => {
    const map: Record<string, number> = {};
    scopedOcean.forEach((s) => {
      const o = s.route?.port_of_loading.location.name;
      const d = s.route?.port_of_discharge.location.name;
      if (o && d) {
        const key = `${o} → ${d}`;
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [scopedOcean]);

  const oceanCarrierStats = useMemo(() => {
    const map: Record<string, number> = {};
    scopedOcean.forEach((s) => {
      const name = s.carrier?.name;
      if (name) map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [scopedOcean]);

  // ── Donut segments ──────────────────────────────────────────────────────
  const airDonutSegments = useMemo(
    () => [
      {
        value: airStatusDist["EN_ROUTE"] || 0,
        color: "#0891b2",
        label: "En Tránsito",
      },
      {
        value:
          (airStatusDist["LANDED"] || 0) + (airStatusDist["DELIVERED"] || 0),
        color: "#059669",
        label: "Completado",
      },
      {
        value: airStatusDist["BOOKED"] || 0,
        color: "#7c3aed",
        label: "Reservado",
      },
      {
        value:
          (airStatusDist["UNTRACKED"] || 0) +
          (airStatusDist["DISCARDED"] || 0) +
          (airStatusDist["INPROGRESS"] || 0),
        color: "#cbd5e1",
        label: "Otros",
      },
    ],
    [airStatusDist],
  );

  const oceanDonutSegments = useMemo(
    () => [
      {
        value: oceanStatusDist["SAILING"] || 0,
        color: "#2563eb",
        label: "Navegando",
      },
      {
        value:
          (oceanStatusDist["ARRIVED"] || 0) +
          (oceanStatusDist["DISCHARGED"] || 0),
        color: "#059669",
        label: "Completado",
      },
      {
        value:
          (oceanStatusDist["LOADED"] || 0) + (oceanStatusDist["BOOKED"] || 0),
        color: "#7c3aed",
        label: "Cargado/Reservado",
      },
      {
        value:
          (oceanStatusDist["NEW"] || 0) +
          (oceanStatusDist["INPROGRESS"] || 0) +
          (oceanStatusDist["UNTRACKED"] || 0),
        color: "#cbd5e1",
        label: "Otros",
      },
    ],
    [oceanStatusDist],
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="ops-home ops-home--loading">
        <div className="ops-header">
          <div className="ops-header__left">
            <h1>
              {getGreeting()}, <span>{displayName}</span>
            </h1>
            <p>{getToday()}</p>
          </div>
        </div>
        <SkeletonDashboard />
      </div>
    );
  }

  const healthClass =
    totalDelayed === 0
      ? "ops-health-indicator--ok"
      : totalDelayed <= 3
        ? "ops-health-indicator--warn"
        : "ops-health-indicator--critical";

  const hasAlerts =
    totalDelayed > 0 || totalStale > 0 || clientsWithoutTracking > 0;

  return (
    <div className="ops-home">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="ops-header">
        <div className="ops-header__left">
          <h1>
            {getGreeting()}, <span>{displayName}</span>
          </h1>
          <p>
            {getToday()}
            {lastRefresh && (
              <span className="ops-last-refresh">
                · Actualizado {formatLastRefresh(lastRefresh)}
              </span>
            )}
          </p>
        </div>
        <div className="ops-header__actions">
          {clientsError && (
            <p className="ops-clients-error" role="alert">
              {clientsError}
            </p>
          )}
          <button
            className="ops-refresh-btn"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={refreshing ? "spinning" : ""}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Barra de comando: acciones + KPIs ───────────────────────────── */}
      <div className="ops-command-bar">
        <OperacionesQuickActions
          navigate={navigate}
          onNewTracking={() => setShowCreateTrackingModal(true)}
        />

        <div className="ops-kpi-grid">
          {overviewMetrics.map((metric) => (
            <div
              key={metric.id}
              className={`ops-kpi ${metric.tone} ops-kpi--clickable${metric.alert ? " ops-kpi--alert" : ""}`}
              onClick={metric.onClick}
            >
              <div className="ops-kpi__header">
                <span className="ops-kpi__label">{metric.label}</span>
                <div
                  className="ops-kpi__icon"
                  style={{
                    background: metric.iconBg,
                    color: metric.iconColor,
                  }}
                >
                  {metric.icon}
                </div>
              </div>
              <div className="ops-kpi__value">{metric.value}</div>
              <div className="ops-kpi__sub">{metric.subtext}</div>
            </div>
          ))}
        </div>
      </div>

      {showMetaWarning && (
        <div className="ops-meta-warning" role="status">
          <IconAlert size={14} />
          ShipsGo muestra hasta 100 envíos por modalidad
          {airMeta.more || oceanMeta.more
            ? ` (total registrado: ${airMeta.total + oceanMeta.total})`
            : ""}
          .
        </div>
      )}

      {hasAlerts && (
        <div className="ops-alert-strip">
          {totalDelayed > 0 && (
            <span className="ops-alert-strip__item">
              <IconAlert size={13} />
              {totalDelayed} retraso{totalDelayed !== 1 ? "s" : ""}
            </span>
          )}
          {totalStale > 0 && (
            <span className="ops-alert-strip__item">
              <IconAlert size={13} />
              {totalStale} sin actualizar (&gt;48h)
            </span>
          )}
          {clientsWithoutTracking > 0 && (
            <span className="ops-alert-strip__item">
              {clientsWithoutTracking} cliente
              {clientsWithoutTracking !== 1 ? "s" : ""} sin tracking
            </span>
          )}
          {etaChangesCount > 0 && (
            <span className="ops-alert-strip__item">
              {etaChangesCount} cambio{etaChangesCount !== 1 ? "s" : ""} de ETA
            </span>
          )}
          {totalDelayed > 0 && (
            <button
              type="button"
              className="ops-alert-strip__cta"
              onClick={() => {
                setListModal("kpi-delayed");
                setListModalTab("all");
              }}
            >
              Ver retrasos →
            </button>
          )}
        </div>
      )}

      {/* ── Filtro por ejecutivo ───────────────────────────────────────── */}
      <div className="ops-filter-bar">
        <span className="ops-filter-bar__label">Ejecutivo</span>
        <select
          className="ops-filter-select"
          value={ejecutivoFilter}
          onChange={(e) => setEjecutivoFilter(e.target.value)}
        >
          <option value="all">Todos los ejecutivos</option>
          <option value="unassigned">Sin ejecutivo asignado</option>
          {ejecutivoOptions.map((ej) => (
            <option key={ej.id} value={ej.id}>
              {ej.nombre}
            </option>
          ))}
        </select>
        <span className="ops-filter-bar__label">
          {filteredClients.length} cliente
          {filteredClients.length !== 1 ? "s" : ""}
          {totalDocuments > 0 && ` · ${totalDocuments} documentos`}
          {transitCargo.weight > 0 &&
            ` · ${transitCargo.weight.toLocaleString("es-CL")} kg en tránsito aéreo`}
        </span>
      </div>

      <div className="ops-section-divider" />

      {/* ── Distribución de Seguimientos ─────────────────────────────────── */}
      <div className="ops-section">
        <div className="ops-section-header">
          <h3 className="ops-section-title" style={{ margin: 0 }}>
            Distribución de Seguimientos
          </h3>
        </div>
        <div className="ops-grid-2">
          <div className="ops-panel">
            <h3 className="ops-section-title">
              <IconAir size={16} />
              Distribución Aérea
            </h3>
            <div className="ops-donut-wrap">
              <DonutChart segments={airDonutSegments} />
              <div className="ops-donut-legend">
                {airDonutSegments
                  .filter((s) => s.value > 0)
                  .map((seg) => (
                    <div key={seg.label} className="ops-donut-legend__item">
                      <span
                        className="ops-donut-legend__dot"
                        style={{ background: seg.color }}
                      />
                      {seg.label}
                      <span className="ops-donut-legend__value">
                        {seg.value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className="ops-panel">
            <h3 className="ops-section-title">
              <IconOcean size={16} />
              Distribución Marítima
            </h3>
            <div className="ops-donut-wrap">
              <DonutChart segments={oceanDonutSegments} />
              <div className="ops-donut-legend">
                {oceanDonutSegments
                  .filter((s) => s.value > 0)
                  .map((seg) => (
                    <div key={seg.label} className="ops-donut-legend__item">
                      <span
                        className="ops-donut-legend__dot"
                        style={{ background: seg.color }}
                      />
                      {seg.label}
                      <span className="ops-donut-legend__value">
                        {seg.value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Últimos Movimientos ────────────────────────────────────────────── */}
      <div className="ops-section">
        <div className="ops-section-header">
          <h3 className="ops-section-title" style={{ margin: 0 }}>
            Últimos Movimientos
          </h3>
          <button
            className="ops-view-all"
            onClick={() => {
              setListModal("all-shipments");
              setListModalTab("all");
            }}
          >
            Ver todos →
          </button>
        </div>
        <div className="ops-panel">
          {/* Tabs */}
          <div className="ops-tabs">
            <button
              className={`ops-tab ${shipmentTab === "air" ? "ops-tab--active" : ""}`}
              onClick={() => setShipmentTab("air")}
            >
              <span className="ops-tab__icon">
                <IconAir size={13} />
              </span>
              Aéreos ({scopedAir.length})
            </button>
            <button
              className={`ops-tab ${shipmentTab === "ocean" ? "ops-tab--active" : ""}`}
              onClick={() => setShipmentTab("ocean")}
            >
              <span className="ops-tab__icon">
                <IconOcean size={13} />
              </span>
              Marítimos ({scopedOcean.length})
            </button>
          </div>

          {shipmentTab === "air" ? (
            recentAir.length === 0 ? (
              <div className="ops-empty">
                No hay seguimientos aéreos registrados.
              </div>
            ) : (
              <table className="ops-mini-table">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>AWB</th>
                    <th>Aerolínea</th>
                    <th>Ruta</th>
                    <th>Cliente</th>
                    <th>Progreso</th>
                    <th>ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAir.map((s) => {
                    const delayed = isAirDelayed(s);
                    return (
                      <tr
                        key={s.id}
                        className="ops-clickable-row"
                        onClick={() => setSelectedAir(s)}
                      >
                        <td>
                          <span
                            className={`ops-badge ${delayed ? "ops-badge--delayed" : getAirBadgeClass(s.status)}`}
                          >
                            {delayed
                              ? "Retraso"
                              : AIR_STATUS_LABELS[s.status] || s.status}
                          </span>
                        </td>
                        <td
                          style={{
                            fontWeight: 600,
                            fontFamily: "monospace",
                            fontSize: 11,
                          }}
                        >
                          {s.awb_number}
                        </td>
                        <td>{s.airline?.name || "—"}</td>
                        <td>
                          {s.route?.origin.location.country.code && (
                            <img
                              src={getFlagUrl(
                                s.route.origin.location.country.code,
                              )}
                              alt=""
                              className="ops-flag"
                            />
                          )}
                          {s.route?.origin.location.iata || "—"}
                          {" → "}
                          {s.route?.destination.location.country.code && (
                            <img
                              src={getFlagUrl(
                                s.route.destination.location.country.code,
                              )}
                              alt=""
                              className="ops-flag"
                            />
                          )}
                          {s.route?.destination.location.iata || "—"}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {s.reference || "—"}
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <ProgressBar
                            value={s.route?.transit_percentage ?? 0}
                            color={delayed ? "#dc2626" : "#0891b2"}
                          />
                        </td>
                        <td style={{ fontSize: 11, color: "#8b92a5" }}>
                          {formatDate(s.route?.destination.date_of_rcf)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : recentOcean.length === 0 ? (
            <div className="ops-empty">
              No hay seguimientos marítimos registrados.
            </div>
          ) : (
            <table className="ops-mini-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Container / Booking</th>
                  <th>Naviera</th>
                  <th>Ruta</th>
                  <th>Cliente</th>
                  <th>Progreso</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {recentOcean.map((s) => {
                  const delayed = isOceanDelayed(s);
                  return (
                    <tr
                      key={s.id}
                      className="ops-clickable-row"
                      onClick={() => setSelectedOcean(s)}
                    >
                      <td>
                        <span
                          className={`ops-badge ${delayed ? "ops-badge--delayed" : getOceanBadgeClass(s.status)}`}
                        >
                          {delayed
                            ? "Retraso"
                            : OCEAN_STATUS_LABELS[s.status] || s.status}
                        </span>
                      </td>
                      <td
                        style={{
                          fontWeight: 600,
                          fontFamily: "monospace",
                          fontSize: 11,
                        }}
                      >
                        {s.container_number || s.booking_number || "—"}
                      </td>
                      <td>{s.carrier?.name || "—"}</td>
                      <td>
                        {s.route?.port_of_loading.location.country?.code && (
                          <img
                            src={getFlagUrl(
                              s.route.port_of_loading.location.country.code,
                            )}
                            alt=""
                            className="ops-flag"
                          />
                        )}
                        {s.route?.port_of_loading.location.name || "—"}
                        {" → "}
                        {s.route?.port_of_discharge.location.country?.code && (
                          <img
                            src={getFlagUrl(
                              s.route.port_of_discharge.location.country.code,
                            )}
                            alt=""
                            className="ops-flag"
                          />
                        )}
                        {s.route?.port_of_discharge.location.name || "—"}
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.reference || "—"}</td>
                      <td style={{ minWidth: 100 }}>
                        <ProgressBar
                          value={s.route?.transit_percentage ?? 0}
                          color={delayed ? "#dc2626" : "#2563eb"}
                        />
                      </td>
                      <td style={{ fontSize: 11, color: "#8b92a5" }}>
                        {formatDate(
                          s.route?.port_of_discharge.date_of_discharge,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────────────── */}
      <div className="ops-grid-2-balanced">
        <div className="ops-panel">
          <div className="ops-section-header" style={{ marginBottom: 14 }}>
            <h3 className="ops-section-title" style={{ margin: 0 }}>
              Clientes con más seguimientos
            </h3>
            <button
              className="ops-view-all"
              onClick={() => setListModal("all-clients")}
            >
              Ver todos →
            </button>
          </div>
          {clientRanking.length === 0 ? (
            <div className="ops-empty">Sin datos de clientes.</div>
          ) : (
            <div className="ops-client-ranking-list">
              {clientRanking.map((c, i) => (
                <div key={c.username} className="ops-client-row">
                  <span
                    className="ops-client-row__rank"
                    style={
                      i === 0
                        ? {}
                        : i === 1
                          ? { background: "#64748b" }
                          : i === 2
                            ? { background: "#94a3b8" }
                            : { background: "#cbd5e1", color: "#64748b" }
                    }
                  >
                    {i + 1}
                  </span>
                  <span className="ops-client-row__name">
                    {c.nombreuser || c.username}
                    {c.ejecutivoNombre && (
                      <span className="ops-ejecutivo-table__sub">
                        {" "}
                        · {c.ejecutivoNombre}
                      </span>
                    )}
                  </span>
                  <span className="ops-client-row__modes">
                    <IconAir size={11} /> {c.air}
                    <IconOcean size={11} /> {c.ocean}
                  </span>
                  {(c.docCount ?? 0) > 0 && (
                    <span className="ops-doc-badge">{c.docCount} docs</span>
                  )}
                  <span className="ops-client-row__count">{c.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ops-panel">
          <h3 className="ops-section-title">Resumen Operativo</h3>
          <div className="ops-summary-stack">
            <div className="ops-summary-card">
              <div className="ops-summary-card__header">
                <span className="ops-summary-card__title">Carga Aérea</span>
                <span className="ops-summary-card__value">
                  {scopedAir.length}
                </span>
              </div>
              <div className="ops-summary-card__stats">
                <MiniStat
                  label="Volando"
                  value={airInTransit.length}
                  color="var(--ops-cyan)"
                />
                <MiniStat
                  label="Completado"
                  value={airCompleted.length}
                  color="var(--ops-green)"
                />
                {airDelayed.length > 0 && (
                  <MiniStat
                    label="Retraso"
                    value={airDelayed.length}
                    color="var(--ops-red)"
                  />
                )}
              </div>
            </div>
            <div className="ops-summary-card">
              <div className="ops-summary-card__header">
                <span className="ops-summary-card__title">Carga Marítima</span>
                <span className="ops-summary-card__value">
                  {scopedOcean.length}
                </span>
              </div>
              <div className="ops-summary-card__stats">
                <MiniStat
                  label="Navegando"
                  value={oceanInTransit.length}
                  color="var(--ops-blue)"
                />
                <MiniStat
                  label="Completado"
                  value={oceanCompleted.length}
                  color="var(--ops-green)"
                />
                {oceanDelayed.length > 0 && (
                  <MiniStat
                    label="Retraso"
                    value={oceanDelayed.length}
                    color="var(--ops-red)"
                  />
                )}
              </div>
            </div>
            <div className={`ops-health-indicator ${healthClass}`}>
              <div className="ops-health-indicator__title">
                {totalDelayed === 0
                  ? "Sin retrasos"
                  : totalDelayed <= 3
                    ? "Retrasos moderados"
                    : "Atención requerida"}
              </div>
              <div className="ops-health-indicator__sub">
                {totalDelayed === 0
                  ? "Todas las cargas están en tiempo"
                  : `${totalDelayed} envío${totalDelayed !== 1 ? "s" : ""} con retraso · ${clientsWithTracking}/${filteredClients.length} clientes con tracking`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reportería (colapsable) ──────────────────────────────────────── */}
      <details className="ops-collapse">
        <summary className="ops-collapse__summary">
          Reportería de Movimientos
          <span className="ops-collapse__hint">
            Rutas y carriers más usados
          </span>
        </summary>
        <div className="ops-collapse__body">
          <div className="ops-report-grid">
            <div className="ops-report-stat">
              <div className="ops-report-stat__label">Rutas Aéreas más usadas</div>
              {airRouteStats.length === 0 ? (
                <div className="ops-empty">Sin datos.</div>
              ) : (
                airRouteStats.map(([route, count], i) => {
                  const pct =
                    airRouteStats[0][1] > 0
                      ? (count / airRouteStats[0][1]) * 100
                      : 0;
                  return (
                    <div key={route} className="ops-report-item">
                      <span className="ops-report-item__name">
                        {i === 0 ? "1° " : `${i + 1}. `}
                        {route}
                      </span>
                      <div className="ops-report-item__bar-wrap">
                        <div
                          className="ops-report-item__bar"
                          style={{
                            width: `${pct}%`,
                            background: "var(--ops-cyan)",
                          }}
                        />
                      </div>
                      <span
                        className="ops-report-item__count"
                        style={{ color: "var(--ops-cyan)" }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="ops-report-stat">
              <div className="ops-report-stat__label">Aerolíneas más usadas</div>
              {airAirlineStats.length === 0 ? (
                <div className="ops-empty">Sin datos.</div>
              ) : (
                airAirlineStats.map(([airline, count], i) => {
                  const pct =
                    airAirlineStats[0][1] > 0
                      ? (count / airAirlineStats[0][1]) * 100
                      : 0;
                  return (
                    <div key={airline} className="ops-report-item">
                      <span className="ops-report-item__name">
                        {i === 0 ? "1° " : `${i + 1}. `}
                        {airline}
                      </span>
                      <div className="ops-report-item__bar-wrap">
                        <div
                          className="ops-report-item__bar"
                          style={{
                            width: `${pct}%`,
                            background: "var(--ops-cyan)",
                          }}
                        />
                      </div>
                      <span
                        className="ops-report-item__count"
                        style={{ color: "var(--ops-cyan)" }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="ops-report-stat">
              <div className="ops-report-stat__label">
                Rutas Marítimas más usadas
              </div>
              {oceanRouteStats.length === 0 ? (
                <div className="ops-empty">Sin datos.</div>
              ) : (
                oceanRouteStats.map(([route, count], i) => {
                  const pct =
                    oceanRouteStats[0][1] > 0
                      ? (count / oceanRouteStats[0][1]) * 100
                      : 0;
                  return (
                    <div key={route} className="ops-report-item">
                      <span className="ops-report-item__name">
                        {i === 0 ? "1° " : `${i + 1}. `}
                        {route}
                      </span>
                      <div className="ops-report-item__bar-wrap">
                        <div
                          className="ops-report-item__bar"
                          style={{
                            width: `${pct}%`,
                            background: "var(--ops-blue)",
                          }}
                        />
                      </div>
                      <span
                        className="ops-report-item__count"
                        style={{ color: "var(--ops-blue)" }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="ops-report-stat">
              <div className="ops-report-stat__label">Navieras más usadas</div>
              {oceanCarrierStats.length === 0 ? (
                <div className="ops-empty">Sin datos.</div>
              ) : (
                oceanCarrierStats.map(([carrier, count], i) => {
                  const pct =
                    oceanCarrierStats[0][1] > 0
                      ? (count / oceanCarrierStats[0][1]) * 100
                      : 0;
                  return (
                    <div key={carrier} className="ops-report-item">
                      <span className="ops-report-item__name">
                        {i === 0 ? "1° " : `${i + 1}. `}
                        {carrier}
                      </span>
                      <div className="ops-report-item__bar-wrap">
                        <div
                          className="ops-report-item__bar"
                          style={{
                            width: `${pct}%`,
                            background: "var(--ops-blue)",
                          }}
                        />
                      </div>
                      <span
                        className="ops-report-item__count"
                        style={{ color: "var(--ops-blue)" }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </details>

      {/* ── Cartera por ejecutivo ───────────────────────────────────────── */}
      <div className="ops-section">
        <div className="ops-section-header">
          <h3 className="ops-section-title" style={{ margin: 0 }}>
            Cartera por ejecutivo
          </h3>
        </div>
        <div className="ops-panel">
          <table className="ops-ejecutivo-table">
            <thead>
              <tr>
                <th>Ejecutivo</th>
                <th>Clientes</th>
                <th>Con tracking</th>
                <th>Seguimientos</th>
                <th>Retrasos</th>
                <th>Stale</th>
              </tr>
            </thead>
            <tbody>
              {ejecutivoPortfolio.map((row) => (
                <tr
                  key={row.id}
                  className="ops-clickable-row"
                  onClick={() =>
                    setEjecutivoFilter(
                      row.id === "unassigned" ? "unassigned" : row.id,
                    )
                  }
                >
                  <td>
                    <div className="ops-ejecutivo-table__name">{row.nombre}</div>
                    {row.email && (
                      <div className="ops-ejecutivo-table__sub">{row.email}</div>
                    )}
                  </td>
                  <td>{row.clientCount}</td>
                  <td>{row.clientsWithTracking}</td>
                  <td>{row.trackings}</td>
                  <td>{row.delayed > 0 ? row.delayed : "—"}</td>
                  <td>{row.stale > 0 ? row.stale : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Individual shipment detail modals */}
      {selectedAir && (
        <AirShipmentDetail
          shipment={selectedAir}
          onClose={() => setSelectedAir(null)}
        />
      )}
      {selectedOcean && (
        <OceanShipmentDetail
          shipment={selectedOcean}
          onClose={() => setSelectedOcean(null)}
        />
      )}

      {/* List modal (shipments / clients / KPI drill-down) */}
      {listModal && (
        <ListModal
          type={listModal}
          tab={listModalTab}
          onTabChange={setListModalTab}
          onClose={() => setListModal(null)}
          clients={filteredClients}
          allAir={scopedAir}
          allOcean={scopedOcean}
          airInTransit={airInTransit}
          oceanInTransit={oceanInTransit}
          airCompleted={airCompleted}
          oceanCompleted={oceanCompleted}
          airDelayed={airDelayed}
          oceanDelayed={oceanDelayed}
          clientRanking={clientRanking}
          onSelectAir={(s) => {
            setListModal(null);
            setSelectedAir(s);
          }}
          onSelectOcean={(s) => {
            setListModal(null);
            setSelectedOcean(s);
          }}
        />
      )}

      {showCreateTrackingModal && (
        <div
          className="ops-list-overlay"
          onClick={() => setShowCreateTrackingModal(false)}
        >
          <div
            className="ops-list-modal ops-list-modal--tracking"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ops-list-modal__header">
              <div>
                <h2 className="ops-list-modal__title">
                  Generar nuevo seguimiento
                </h2>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ops-text-muted)",
                    marginTop: 4,
                  }}
                >
                  Reutiliza el flujo de OP Trackeo para seleccionar cliente y
                  crear un nuevo tracking.
                </div>
              </div>
              <button
                className="ops-list-modal__close"
                onClick={() => setShowCreateTrackingModal(false)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="ops-list-modal__body ops-list-modal__body--tracking">
              <ShipsGoTrackingAdminOP />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small stat pill
function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 6,
        background: "white",
        border: "1px solid var(--ops-border)",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <span style={{ color }}>{value}</span>
      <span style={{ color: "var(--ops-text-muted)" }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ListModal — Full-list overlay for shipments / clients / KPI drill-down
// ═══════════════════════════════════════════════════════════════════════════

interface ListModalProps {
  type: NonNullable<ListModalType>;
  tab: "air" | "ocean" | "all";
  onTabChange: (t: "air" | "ocean" | "all") => void;
  onClose: () => void;
  clients: ClientUser[];
  allAir: AirShipment[];
  allOcean: OceanShipment[];
  airInTransit: AirShipment[];
  oceanInTransit: OceanShipment[];
  airCompleted: AirShipment[];
  oceanCompleted: OceanShipment[];
  airDelayed: AirShipment[];
  oceanDelayed: OceanShipment[];
  clientRanking: ClientShipmentCount[];
  onSelectAir: (s: AirShipment) => void;
  onSelectOcean: (s: OceanShipment) => void;
}

function ListModal({
  type,
  tab,
  onTabChange,
  onClose,
  clients,
  allAir,
  allOcean,
  airInTransit,
  oceanInTransit,
  airCompleted,
  oceanCompleted,
  airDelayed,
  oceanDelayed,
  clientRanking,
  onSelectAir,
  onSelectOcean,
}: ListModalProps) {
  // Determine which data to show
  const isClientModal = type === "all-clients" || type === "kpi-clients";
  const [clientFilter, setClientFilter] = useState("");
  const normalizedClientFilter = normalizeClientSearch(clientFilter);

  let title = "";
  let airList: AirShipment[] = [];
  let oceanList: OceanShipment[] = [];

  switch (type) {
    case "all-shipments":
    case "kpi-total":
      title = "Todos los Seguimientos";
      airList = allAir;
      oceanList = allOcean;
      break;
    case "kpi-active":
      title = "Envíos En Movimiento";
      airList = airInTransit;
      oceanList = oceanInTransit;
      break;
    case "kpi-air-transit":
      title = "Aéreos En Tránsito";
      airList = airInTransit;
      oceanList = [];
      break;
    case "kpi-ocean-transit":
      title = "Marítimos Navegando";
      airList = [];
      oceanList = oceanInTransit;
      break;
    case "kpi-completed":
      title = "Envíos Completados";
      airList = airCompleted;
      oceanList = oceanCompleted;
      break;
    case "kpi-delayed":
      title = "Retrasos Activos";
      airList = airDelayed;
      oceanList = oceanDelayed;
      break;
    case "all-clients":
    case "kpi-clients":
      title = "Clientes con Seguimiento";
      break;
  }

  const matchingClientUsernames = useMemo(() => {
    if (!normalizedClientFilter) return new Set<string>();

    return clients.reduce((usernames, client) => {
      if (!clientMatchesSearch(client, normalizedClientFilter)) {
        return usernames;
      }

      usernames.add(client.username);
      client.usernames?.forEach((username) => usernames.add(username));
      return usernames;
    }, new Set<string>());
  }, [clients, normalizedClientFilter]);

  const filteredClientRanking = useMemo(
    () =>
      clientRanking.filter((client) => {
        if (!normalizedClientFilter) return true;

        if (
          normalizeClientSearch(client.username).includes(
            normalizedClientFilter,
          )
        ) {
          return true;
        }

        if (
          normalizeClientSearch(client.nombreuser).includes(
            normalizedClientFilter,
          )
        ) {
          return true;
        }

        return matchingClientUsernames.has(client.username);
      }),
    [clientRanking, matchingClientUsernames, normalizedClientFilter],
  );

  const showTabs = !isClientModal && airList.length > 0 && oceanList.length > 0;

  const filteredAir = useMemo(() => {
    if (tab === "ocean") return [];

    return airList.filter((shipment) =>
      shipmentMatchesClientSearch(
        shipment.reference || "",
        normalizedClientFilter,
        matchingClientUsernames,
      ),
    );
  }, [airList, matchingClientUsernames, normalizedClientFilter, tab]);

  const filteredOcean = useMemo(() => {
    if (tab === "air") return [];

    return oceanList.filter((shipment) =>
      shipmentMatchesClientSearch(
        shipment.reference || "",
        normalizedClientFilter,
        matchingClientUsernames,
      ),
    );
  }, [matchingClientUsernames, normalizedClientFilter, oceanList, tab]);

  return (
    <div className="ops-list-overlay" onClick={onClose}>
      <div className="ops-list-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ops-list-modal__header">
          <h2 className="ops-list-modal__title">{title}</h2>
          <button className="ops-list-modal__close" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="ops-list-modal__filters">
          <input
            type="text"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="ops-list-modal__search"
            placeholder="Filtrar por cliente, username o email..."
          />
        </div>

        {/* Client list */}
        {isClientModal ? (
          <div className="ops-list-modal__body">
            {filteredClientRanking.length === 0 ? (
              <div className="ops-empty">Sin datos de clientes.</div>
            ) : (
              <table className="ops-mini-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Username</th>
                    <th>Aéreos</th>
                    <th>Marítimos</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClientRanking.map((c, i) => (
                    <tr key={c.username}>
                      <td>
                        <span
                          className="ops-client-row__rank"
                          style={
                            i === 0
                              ? {}
                              : i === 1
                                ? { background: "#64748b" }
                                : i === 2
                                  ? { background: "#94a3b8" }
                                  : { background: "#cbd5e1", color: "#64748b" }
                          }
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {c.nombreuser || c.username}
                      </td>
                      <td style={{ fontSize: 11, color: "#8b92a5" }}>
                        {c.username}
                      </td>
                      <td>{c.air}</td>
                      <td>{c.ocean}</td>
                      <td
                        style={{ fontWeight: 700, color: "var(--ops-orange)" }}
                      >
                        {c.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <>
            {/* Tabs */}
            {showTabs && (
              <div className="ops-tabs" style={{ padding: "0 24px" }}>
                <button
                  className={`ops-tab ${tab === "all" ? "ops-tab--active" : ""}`}
                  onClick={() => onTabChange("all")}
                >
                  Todos ({airList.length + oceanList.length})
                </button>
                <button
                  className={`ops-tab ${tab === "air" ? "ops-tab--active" : ""}`}
                  onClick={() => onTabChange("air")}
                >
                  Aéreos ({airList.length})
                </button>
                <button
                  className={`ops-tab ${tab === "ocean" ? "ops-tab--active" : ""}`}
                  onClick={() => onTabChange("ocean")}
                >
                  Marítimos ({oceanList.length})
                </button>
              </div>
            )}

            <div className="ops-list-modal__body">
              {/* Air shipments table */}
              {filteredAir.length > 0 && (
                <>
                  {showTabs && tab === "all" && (
                    <h4 className="ops-list-modal__subtitle">
                      Aéreos ({filteredAir.length})
                    </h4>
                  )}
                  <table className="ops-mini-table">
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>AWB</th>
                        <th>Aerolínea</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th>Cliente</th>
                        <th>Progreso</th>
                        <th>Creado</th>
                        <th>ETD</th>
                        <th>ETA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAir.map((s) => {
                        const delayed = isAirDelayed(s);
                        return (
                          <tr
                            key={s.id}
                            className="ops-clickable-row"
                            onClick={() => onSelectAir(s)}
                          >
                            <td>
                              <span
                                className={`ops-badge ${delayed ? "ops-badge--delayed" : getAirBadgeClass(s.status)}`}
                              >
                                {delayed
                                  ? "Retraso"
                                  : AIR_STATUS_LABELS[s.status] || s.status}
                              </span>
                            </td>
                            <td
                              style={{
                                fontWeight: 600,
                                fontFamily: "monospace",
                                fontSize: 11,
                              }}
                            >
                              {s.awb_number}
                            </td>
                            <td>{s.airline?.name || "—"}</td>
                            <td>
                              {s.route?.origin.location.country.code && (
                                <img
                                  src={getFlagUrl(
                                    s.route.origin.location.country.code,
                                  )}
                                  alt=""
                                  className="ops-flag"
                                />
                              )}
                              {s.route?.origin.location.iata || "—"}
                            </td>
                            <td>
                              {s.route?.destination.location.country.code && (
                                <img
                                  src={getFlagUrl(
                                    s.route.destination.location.country.code,
                                  )}
                                  alt=""
                                  className="ops-flag"
                                />
                              )}
                              {s.route?.destination.location.iata || "—"}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {s.reference || "—"}
                            </td>
                            <td style={{ minWidth: 100 }}>
                              <ProgressBar
                                value={s.route?.transit_percentage ?? 0}
                                color={delayed ? "#dc2626" : "#0891b2"}
                              />
                            </td>
                            <td style={{ fontSize: 11, color: "#8b92a5" }}>
                              {formatDate(s.created_at)}
                            </td>
                            <td style={{ fontSize: 11, color: "#8b92a5" }}>
                              {formatDate(s.route?.origin.date_of_dep)}
                            </td>
                            <td style={{ fontSize: 11, color: "#8b92a5" }}>
                              {formatDate(s.route?.destination.date_of_rcf)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {/* Ocean shipments table */}
              {filteredOcean.length > 0 && (
                <>
                  {showTabs && tab === "all" && (
                    <h4 className="ops-list-modal__subtitle">
                      Marítimos ({filteredOcean.length})
                    </h4>
                  )}
                  <table className="ops-mini-table">
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Container / Booking</th>
                        <th>Naviera</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th>Cliente</th>
                        <th>Progreso</th>
                        <th>Creado</th>
                        <th>ETD</th>
                        <th>ETA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOcean.map((s) => {
                        const delayed = isOceanDelayed(s);
                        return (
                          <tr
                            key={s.id}
                            className="ops-clickable-row"
                            onClick={() => onSelectOcean(s)}
                          >
                            <td>
                              <span
                                className={`ops-badge ${delayed ? "ops-badge--delayed" : getOceanBadgeClass(s.status)}`}
                              >
                                {delayed
                                  ? "Retraso"
                                  : OCEAN_STATUS_LABELS[s.status] || s.status}
                              </span>
                            </td>
                            <td
                              style={{
                                fontWeight: 600,
                                fontFamily: "monospace",
                                fontSize: 11,
                              }}
                            >
                              {s.container_number || s.booking_number || "—"}
                            </td>
                            <td>{s.carrier?.name || "—"}</td>
                            <td>
                              {s.route?.port_of_loading.location.country
                                ?.code && (
                                  <img
                                    src={getFlagUrl(
                                      s.route.port_of_loading.location.country
                                        .code,
                                    )}
                                    alt=""
                                    className="ops-flag"
                                  />
                                )}
                              {s.route?.port_of_loading.location.name || "—"}
                            </td>
                            <td>
                              {s.route?.port_of_discharge.location.country
                                ?.code && (
                                  <img
                                    src={getFlagUrl(
                                      s.route.port_of_discharge.location.country
                                        .code,
                                    )}
                                    alt=""
                                    className="ops-flag"
                                  />
                                )}
                              {s.route?.port_of_discharge.location.name || "—"}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {s.reference || "—"}
                            </td>
                            <td style={{ minWidth: 100 }}>
                              <ProgressBar
                                value={s.route?.transit_percentage ?? 0}
                                color={delayed ? "#dc2626" : "#2563eb"}
                              />
                            </td>
                            <td style={{ fontSize: 11, color: "#8b92a5" }}>
                              {formatDate(s.created_at)}
                            </td>
                            <td style={{ fontSize: 11, color: "#8b92a5" }}>
                              {formatDate(
                                s.route?.port_of_loading.date_of_loading,
                              )}
                            </td>
                            <td style={{ fontSize: 11, color: "#8b92a5" }}>
                              {formatDate(
                                s.route?.port_of_discharge.date_of_discharge,
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}

              {filteredAir.length === 0 && filteredOcean.length === 0 && (
                <div className="ops-empty">
                  No hay seguimientos en esta categoría.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
