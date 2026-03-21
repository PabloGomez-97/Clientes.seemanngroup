// src/components/administrador/HomeOperaciones.tsx — Torre de Control de Operaciones
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type {
  AirShipment,
  AirResponse,
  OceanShipment,
  OceanResponse,
} from "../Sidebar/shipsgo/types";
import {
  AIR_STATUS_LABELS,
  OCEAN_STATUS_LABELS,
  formatDate,
  getFlagUrl,
} from "../Sidebar/shipsgo/types";
import AirShipmentDetail from "../Sidebar/shipsgo/AirShipmentDetail";
import OceanShipmentDetail from "../Sidebar/shipsgo/OceanShipmentDetail";
import "../Sidebar/styles/Shipsgotracking.css";
import "./HomeOperaciones.css";

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

interface ClientUser {
  id: string;
  email: string;
  username: string;
  nombreuser?: string;
  usernames?: string[];
  createdAt: string;
}

interface DelayedShipmentInfo {
  type: "air" | "ocean";
  id: number;
  reference: string;
  identifier: string; // AWB or container number
  carrier: string;
  origin: string;
  originCountry: string;
  destination: string;
  destinationCountry: string;
  eta: string;
  progress: number;
  updatedAt: string;
}

interface ClientShipmentCount {
  username: string;
  nombreuser?: string;
  air: number;
  ocean: number;
  total: number;
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

function daysLate(eta: string): number {
  const diff = Date.now() - new Date(eta).getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function SkeletonCard() {
  return (
    <div className="ops-kpi" style={{ minHeight: 95 }}>
      <div
        className="ops-skeleton"
        style={{ width: "60%", height: 12, marginBottom: 14 }}
      />
      <div className="ops-skeleton" style={{ width: "40%", height: 28 }} />
    </div>
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

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="ops-status-row">
      <span className="ops-status-row__label">{label}</span>
      <div className="ops-status-row__bar-wrap">
        <div
          className="ops-status-row__bar"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="ops-status-row__count">{count}</span>
    </div>
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
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [shipmentTab, setShipmentTab] = useState<"air" | "ocean">("air");

  // Modal state
  const [selectedAir, setSelectedAir] = useState<AirShipment | null>(null);
  const [selectedOcean, setSelectedOcean] = useState<OceanShipment | null>(
    null,
  );
  const [listModal, setListModal] = useState<ListModalType>(null);
  const [listModalTab, setListModalTab] = useState<"air" | "ocean" | "all">(
    "all",
  );

  const displayName = user?.nombreuser || user?.username || "Operaciones";

  // ── Data fetching ───────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const [airRes, oceanRes, clientsRes] = await Promise.allSettled([
          fetch("/api/shipsgo/shipments", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json() as Promise<AirResponse>),
          fetch("/api/shipsgo/ocean/shipments", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json() as Promise<OceanResponse>),
          fetch("/api/admin/users", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
        ]);

        if (
          airRes.status === "fulfilled" &&
          Array.isArray(airRes.value?.shipments)
        ) {
          setAllAir(airRes.value.shipments);
        }
        if (
          oceanRes.status === "fulfilled" &&
          Array.isArray(oceanRes.value?.shipments)
        ) {
          setAllOcean(oceanRes.value.shipments);
        }
        if (clientsRes.status === "fulfilled") {
          const raw = clientsRes.value;
          const arr: ClientUser[] = Array.isArray(raw?.users)
            ? raw.users
            : Array.isArray(raw)
              ? raw
              : [];
          setClients(arr.filter((u: ClientUser) => u.username !== "Ejecutivo"));
        }
        setLastRefresh(new Date());
      } catch {
        /* silent */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Computed stats ──────────────────────────────────────────────────────

  // Air stats
  const airInTransit = useMemo(() => allAir.filter(isAirInTransit), [allAir]);
  const airCompleted = useMemo(() => allAir.filter(isAirCompleted), [allAir]);
  const airDelayed = useMemo(() => allAir.filter(isAirDelayed), [allAir]);

  // Ocean stats
  const oceanInTransit = useMemo(
    () => allOcean.filter(isOceanInTransit),
    [allOcean],
  );
  const oceanCompleted = useMemo(
    () => allOcean.filter(isOceanCompleted),
    [allOcean],
  );
  const oceanDelayed = useMemo(
    () => allOcean.filter(isOceanDelayed),
    [allOcean],
  );

  // Total active = air in-transit + ocean in-transit
  const totalActive = airInTransit.length + oceanInTransit.length;
  const totalCompleted = airCompleted.length + oceanCompleted.length;
  const totalDelayed = airDelayed.length + oceanDelayed.length;
  const totalTrackings = allAir.length + allOcean.length;

  // Build delayed shipment list for the alerts panel
  const delayedShipments = useMemo<DelayedShipmentInfo[]>(() => {
    const items: DelayedShipmentInfo[] = [];
    airDelayed.forEach((s) => {
      items.push({
        type: "air",
        id: s.id,
        reference: s.reference || "—",
        identifier: s.awb_number,
        carrier: s.airline?.name || "—",
        origin: s.route?.origin.location.iata || "—",
        originCountry: s.route?.origin.location.country.code || "",
        destination: s.route?.destination.location.iata || "—",
        destinationCountry: s.route?.destination.location.country.code || "",
        eta: s.route?.destination.date_of_rcf || "",
        progress: s.route?.transit_percentage ?? 0,
        updatedAt: s.updated_at,
      });
    });
    oceanDelayed.forEach((s) => {
      items.push({
        type: "ocean",
        id: s.id,
        reference: s.reference || "—",
        identifier: s.container_number || s.booking_number || "—",
        carrier: s.carrier?.name || "—",
        origin: s.route?.port_of_loading.location.name || "—",
        originCountry: s.route?.port_of_loading.location.country?.code || "",
        destination: s.route?.port_of_discharge.location.name || "—",
        destinationCountry:
          s.route?.port_of_discharge.location.country?.code || "",
        eta: s.route?.port_of_discharge.date_of_discharge || "",
        progress: s.route?.transit_percentage ?? 0,
        updatedAt: s.updated_at,
      });
    });
    // Sort by most days late first
    items.sort((a, b) => daysLate(b.eta) - daysLate(a.eta));
    return items;
  }, [airDelayed, oceanDelayed]);

  // Air status distribution
  const airStatusDist = useMemo(() => {
    const map: Record<string, number> = {};
    allAir.forEach((s) => {
      map[s.status] = (map[s.status] || 0) + 1;
    });
    return map;
  }, [allAir]);

  // Ocean status distribution
  const oceanStatusDist = useMemo(() => {
    const map: Record<string, number> = {};
    allOcean.forEach((s) => {
      map[s.status] = (map[s.status] || 0) + 1;
    });
    return map;
  }, [allOcean]);

  // Client ranking by shipment count
  const clientRanking = useMemo<ClientShipmentCount[]>(() => {
    const map = new Map<string, ClientShipmentCount>();
    clients.forEach((c) => {
      const usernames = c.usernames?.length ? c.usernames : [c.username];
      let air = 0;
      let ocean = 0;
      usernames.forEach((u) => {
        air += allAir.filter((s) => s.reference === u).length;
        ocean += allOcean.filter((s) => s.reference === u).length;
      });
      if (air + ocean > 0) {
        map.set(c.username, {
          username: c.username,
          nombreuser: c.nombreuser,
          air,
          ocean,
          total: air + ocean,
        });
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [clients, allAir, allOcean]);

  // Recent shipments (last 10 created)
  const recentAir = useMemo(
    () =>
      [...allAir]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 8),
    [allAir],
  );

  const recentOcean = useMemo(
    () =>
      [...allOcean]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 8),
    [allOcean],
  );

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
      <div className="ops-home">
        <div className="ops-header">
          <div className="ops-header__left">
            <h1>
              {getGreeting()}, <span>{displayName}</span>
            </h1>
            <p>{getToday()}</p>
          </div>
        </div>
        <div className="ops-kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ops-home">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="ops-header">
        <div className="ops-header__left">
          <h1>
            {getGreeting()}, <span>{displayName}</span>
          </h1>
          <p>{getToday()}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <div className="ops-header__badge">
            <div className="ops-pulse" />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Torre de Control
          </div>
        </div>
      </div>

      {lastRefresh && (
        <div style={{ marginBottom: 16, marginTop: -8 }}>
          <span className="ops-last-refresh">
            Última actualización:{" "}
            {lastRefresh.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="ops-kpi-grid">
        {/* Total seguimientos */}
        <div
          className="ops-kpi ops-kpi--orange ops-kpi--clickable"
          onClick={() => {
            setListModal("kpi-total");
            setListModalTab("all");
          }}
        >
          <div className="ops-kpi__header">
            <span className="ops-kpi__label">Total Seguimientos</span>
            <div
              className="ops-kpi__icon"
              style={{ background: "var(--ops-orange-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ops-orange)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div
            className="ops-kpi__value"
            style={{ color: "var(--ops-orange)" }}
          >
            {totalTrackings}
          </div>
          <div className="ops-kpi__sub">
            {allAir.length} aéreos · {allOcean.length} marítimos
          </div>
        </div>

        {/* En movimiento */}
        <div
          className="ops-kpi ops-kpi--cyan ops-kpi--clickable"
          onClick={() => {
            setListModal("kpi-active");
            setListModalTab("all");
          }}
        >
          <div className="ops-kpi__header">
            <span className="ops-kpi__label">En Movimiento</span>
            <div
              className="ops-kpi__icon"
              style={{ background: "var(--ops-cyan-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ops-cyan)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
            </div>
          </div>
          <div className="ops-kpi__value" style={{ color: "var(--ops-cyan)" }}>
            {totalActive}
          </div>
          <div className="ops-kpi__sub">
            {airInTransit.length} aéreos · {oceanInTransit.length} marítimos
          </div>
        </div>

        {/* Aéreos en tránsito */}
        <div
          className="ops-kpi ops-kpi--blue ops-kpi--clickable"
          onClick={() => {
            setListModal("kpi-air-transit");
            setListModalTab("air");
          }}
        >
          <div className="ops-kpi__header">
            <span className="ops-kpi__label">Aéreos En Tránsito</span>
            <div
              className="ops-kpi__icon"
              style={{ background: "var(--ops-blue-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ops-blue)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
            </div>
          </div>
          <div className="ops-kpi__value" style={{ color: "var(--ops-blue)" }}>
            {airInTransit.length}
          </div>
          <div className="ops-kpi__sub">{airCompleted.length} completados</div>
        </div>

        {/* Marítimos navegando */}
        <div
          className="ops-kpi ops-kpi--green ops-kpi--clickable"
          onClick={() => {
            setListModal("kpi-ocean-transit");
            setListModalTab("ocean");
          }}
        >
          <div className="ops-kpi__header">
            <span className="ops-kpi__label">Marítimos Navegando</span>
            <div
              className="ops-kpi__icon"
              style={{ background: "var(--ops-green-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ops-green)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1" />
                <path d="M4 18l-1-5h18l-1 5" />
                <path d="M12 2v7" />
                <path d="M7 9h10" />
              </svg>
            </div>
          </div>
          <div className="ops-kpi__value" style={{ color: "var(--ops-green)" }}>
            {oceanInTransit.length}
          </div>
          <div className="ops-kpi__sub">
            {oceanCompleted.length} completados
          </div>
        </div>

        {/* Completados total */}
        <div
          className="ops-kpi ops-kpi--purple ops-kpi--clickable"
          onClick={() => {
            setListModal("kpi-completed");
            setListModalTab("all");
          }}
        >
          <div className="ops-kpi__header">
            <span className="ops-kpi__label">Completados</span>
            <div
              className="ops-kpi__icon"
              style={{ background: "var(--ops-purple-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ops-purple)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div
            className="ops-kpi__value"
            style={{ color: "var(--ops-purple)" }}
          >
            {totalCompleted}
          </div>
          <div className="ops-kpi__sub">
            {airCompleted.length} aterrizados · {oceanCompleted.length}{" "}
            arribados
          </div>
        </div>

        {/* Retrasos */}
        <div
          className="ops-kpi ops-kpi--red ops-kpi--clickable"
          onClick={() => {
            setListModal("kpi-delayed");
            setListModalTab("all");
          }}
        >
          <div className="ops-kpi__header">
            <span className="ops-kpi__label">Retrasos Activos</span>
            <div
              className="ops-kpi__icon"
              style={{ background: "var(--ops-red-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ops-red)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="ops-kpi__value" style={{ color: "var(--ops-red)" }}>
            {totalDelayed}
          </div>
          <div className="ops-kpi__sub">
            {airDelayed.length} aéreos · {oceanDelayed.length} marítimos
          </div>
        </div>

        {/* Clientes con seguimiento */}
        <div
          className="ops-kpi ops-kpi--amber ops-kpi--clickable"
          onClick={() => setListModal("kpi-clients")}
        >
          <div className="ops-kpi__header">
            <span className="ops-kpi__label">Clientes con Seguimiento</span>
            <div
              className="ops-kpi__icon"
              style={{ background: "var(--ops-amber-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ops-amber)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="ops-kpi__value" style={{ color: "var(--ops-amber)" }}>
            {clientRanking.length}
          </div>
          <div className="ops-kpi__sub">de {clients.length} totales</div>
        </div>
      </div>

      {/* ── Alerts Panel (only if there are delays) ──────────────────────── */}
      {totalDelayed > 0 && (
        <div
          className={`ops-alerts ${totalDelayed > 0 ? "ops-alerts--critical" : ""}`}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3 className="ops-section-title" style={{ margin: 0 }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Alertas de Retraso — {totalDelayed} envío
              {totalDelayed !== 1 ? "s" : ""} con retraso en tránsito
            </h3>
            <button
              className="ops-view-all"
              onClick={() => navigate("/admin/op-trackeos")}
            >
              Ver todos los seguimientos →
            </button>
          </div>
          <div className="ops-alert-list">
            {delayedShipments.map((ds) => (
              <div key={`${ds.type}-${ds.id}`} className="ops-alert-item">
                <div className="ops-alert-item__icon">
                  {ds.type === "air" ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1" />
                      <path d="M4 18l-1-5h18l-1 5" />
                      <path d="M12 2v7" />
                      <path d="M7 9h10" />
                    </svg>
                  )}
                </div>
                <div className="ops-alert-item__body">
                  <div className="ops-alert-item__title">
                    {ds.identifier} — {ds.carrier}
                  </div>
                  <div className="ops-alert-item__meta">
                    <span>
                      Cliente: <strong>{ds.reference}</strong>
                    </span>
                    <span>
                      {ds.originCountry && (
                        <img
                          src={getFlagUrl(ds.originCountry)}
                          alt=""
                          className="ops-flag"
                        />
                      )}
                      {ds.origin} →{" "}
                      {ds.destinationCountry && (
                        <img
                          src={getFlagUrl(ds.destinationCountry)}
                          alt=""
                          className="ops-flag"
                        />
                      )}
                      {ds.destination}
                    </span>
                    {ds.eta && <span>ETA: {formatDate(ds.eta)}</span>}
                    <span>Progreso: {ds.progress}%</span>
                  </div>
                </div>
                <span
                  className={`ops-alert-item__badge ${ds.type === "air" ? "ops-alert-item__badge--air" : "ops-alert-item__badge--ocean"}`}
                >
                  {ds.type === "air" ? "✈ Aéreo" : "🚢 Marítimo"}
                </span>
                {ds.eta && (
                  <span className="ops-alert-item__badge ops-alert-item__badge--delay">
                    {daysLate(ds.eta)}d retraso
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Status Distribution + Quick Actions ──────────────────────────── */}
      <div className="ops-grid-2">
        {/* Air status donut & bars */}
        <div className="ops-panel">
          <h3 className="ops-section-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ops-cyan)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
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
                    <span className="ops-donut-legend__value">{seg.value}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="ops-status-grid">
            <StatusBar
              label="En Tránsito"
              count={airStatusDist["EN_ROUTE"] || 0}
              total={allAir.length}
              color="#0891b2"
            />
            <StatusBar
              label="Aterrizado"
              count={airStatusDist["LANDED"] || 0}
              total={allAir.length}
              color="#059669"
            />
            <StatusBar
              label="Entregado"
              count={airStatusDist["DELIVERED"] || 0}
              total={allAir.length}
              color="#22c55e"
            />
            <StatusBar
              label="Reservado"
              count={airStatusDist["BOOKED"] || 0}
              total={allAir.length}
              color="#7c3aed"
            />
            {(airStatusDist["UNTRACKED"] || 0) > 0 && (
              <StatusBar
                label="Sin Rastreo"
                count={airStatusDist["UNTRACKED"] || 0}
                total={allAir.length}
                color="#94a3b8"
              />
            )}
          </div>
        </div>

        {/* Ocean status donut & bars */}
        <div className="ops-panel">
          <h3 className="ops-section-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ops-blue)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1" />
              <path d="M4 18l-1-5h18l-1 5" />
              <path d="M12 2v7" />
              <path d="M7 9h10" />
            </svg>
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
                    <span className="ops-donut-legend__value">{seg.value}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="ops-status-grid">
            <StatusBar
              label="Navegando"
              count={oceanStatusDist["SAILING"] || 0}
              total={allOcean.length}
              color="#2563eb"
            />
            <StatusBar
              label="Llegó"
              count={oceanStatusDist["ARRIVED"] || 0}
              total={allOcean.length}
              color="#059669"
            />
            <StatusBar
              label="Descargado"
              count={oceanStatusDist["DISCHARGED"] || 0}
              total={allOcean.length}
              color="#22c55e"
            />
            <StatusBar
              label="Cargado"
              count={oceanStatusDist["LOADED"] || 0}
              total={allOcean.length}
              color="#7c3aed"
            />
            {(oceanStatusDist["UNTRACKED"] || 0) > 0 && (
              <StatusBar
                label="Sin Rastreo"
                count={oceanStatusDist["UNTRACKED"] || 0}
                total={allOcean.length}
                color="#94a3b8"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Shipments Table ────────────────────────────────────────── */}
      <div className="ops-panel" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <h3 className="ops-section-title" style={{ margin: 0 }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ops-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Últimos Seguimientos
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

        {/* Tabs */}
        <div className="ops-tabs">
          <button
            className={`ops-tab ${shipmentTab === "air" ? "ops-tab--active" : ""}`}
            onClick={() => setShipmentTab("air")}
          >
            ✈ Aéreos ({allAir.length})
          </button>
          <button
            className={`ops-tab ${shipmentTab === "ocean" ? "ops-tab--active" : ""}`}
            onClick={() => setShipmentTab("ocean")}
          >
            🚢 Marítimos ({allOcean.length})
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
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Cliente</th>
                  <th>Progreso</th>
                  <th>Creado</th>
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
                            ? "⚠ Retraso"
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
                      <td style={{ fontWeight: 600 }}>{s.reference || "—"}</td>
                      <td style={{ minWidth: 100 }}>
                        <ProgressBar
                          value={s.route?.transit_percentage ?? 0}
                          color={delayed ? "#dc2626" : "#0891b2"}
                        />
                      </td>
                      <td style={{ fontSize: 11, color: "#8b92a5" }}>
                        {formatDate(s.created_at)}
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
                <th>Origen</th>
                <th>Destino</th>
                <th>Cliente</th>
                <th>Progreso</th>
                <th>Creado</th>
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
                          ? "⚠ Retraso"
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
                    </td>
                    <td>
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
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Bottom row: Quick Actions + Client Ranking ────────────────────── */}
      <div className="ops-grid-3">
        {/* Quick Actions */}
        <div className="ops-panel">
          <h3 className="ops-section-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ops-orange)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Acceso Rápido
          </h3>
          <div
            className="ops-quick-actions"
            style={{ flexDirection: "column" }}
          >
            <button
              className="ops-quick-action"
              onClick={() => navigate("/admin/op-trackeos")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Seguimientos (ShipsGo)
            </button>
            <button
              className="ops-quick-action"
              onClick={() => navigate("/admin/op-reporteriaclientes")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Clientes (Todos)
            </button>
            <button
              className="ops-quick-action"
              onClick={() => navigate("/admin/cotizador-administrador")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Cotizador
            </button>
            <button
              className="ops-quick-action"
              onClick={() => navigate("/admin/settings")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Configuración
            </button>
          </div>
        </div>

        {/* Client Ranking */}
        <div className="ops-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3 className="ops-section-title" style={{ margin: 0 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ops-amber)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
              </svg>
              Top Clientes por Volumen
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
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                  </span>
                  <span style={{ fontSize: 11, color: "#8b92a5" }}>
                    ✈{c.air} 🚢{c.ocean}
                  </span>
                  <span className="ops-client-row__count">{c.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operations Summary Card */}
        <div className="ops-panel">
          <h3 className="ops-section-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ops-purple)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Resumen Operativo
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Air summary row */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--ops-border)",
                background: "#fafbfc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ops-cyan)",
                  }}
                >
                  ✈ Carga Aérea
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--ops-text)",
                  }}
                >
                  {allAir.length}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

            {/* Ocean summary row */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--ops-border)",
                background: "#fafbfc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ops-blue)",
                  }}
                >
                  🚢 Carga Marítima
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--ops-text)",
                  }}
                >
                  {allOcean.length}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

            {/* Health indicator */}
            <div
              style={{
                padding: "14px",
                borderRadius: 10,
                background:
                  totalDelayed === 0
                    ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
                    : totalDelayed <= 3
                      ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
                      : "linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>
                {totalDelayed === 0 ? "✅" : totalDelayed <= 3 ? "⚠️" : "🚨"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ops-text)",
                }}
              >
                {totalDelayed === 0
                  ? "Sin Retrasos"
                  : totalDelayed <= 3
                    ? "Retrasos Moderados"
                    : "Atención Requerida"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ops-text-muted)",
                  marginTop: 2,
                }}
              >
                {totalDelayed === 0
                  ? "Todas las cargas están en tiempo"
                  : `${totalDelayed} envío${totalDelayed !== 1 ? "s" : ""} con retraso activo`}
              </div>
            </div>
          </div>
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
          allAir={allAir}
          allOcean={allOcean}
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

  const showTabs = !isClientModal && airList.length > 0 && oceanList.length > 0;

  const filteredAir = tab === "ocean" ? [] : airList;
  const filteredOcean = tab === "air" ? [] : oceanList;

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

        {/* Client list */}
        {isClientModal ? (
          <div className="ops-list-modal__body">
            {clientRanking.length === 0 ? (
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
                  {clientRanking.map((c, i) => (
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
                      <td>✈ {c.air}</td>
                      <td>🚢 {c.ocean}</td>
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
                  ✈ Aéreos ({airList.length})
                </button>
                <button
                  className={`ops-tab ${tab === "ocean" ? "ops-tab--active" : ""}`}
                  onClick={() => onTabChange("ocean")}
                >
                  🚢 Marítimos ({oceanList.length})
                </button>
              </div>
            )}

            <div className="ops-list-modal__body">
              {/* Air shipments table */}
              {filteredAir.length > 0 && (
                <>
                  {showTabs && tab === "all" && (
                    <h4 className="ops-list-modal__subtitle">
                      ✈ Aéreos ({filteredAir.length})
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
                                  ? "⚠ Retraso"
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
                      🚢 Marítimos ({filteredOcean.length})
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
                                  ? "⚠ Retraso"
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
