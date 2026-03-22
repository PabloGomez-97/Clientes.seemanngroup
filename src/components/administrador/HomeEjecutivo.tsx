// src/components/administrador/HomeEjecutivo.tsx — Torre de Control del Ejecutivo
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
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
import "./HomeEjecutivo.css";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

interface Cliente {
  id: string;
  email: string;
  username: string;
  nombreuser?: string;
  createdAt: string;
}

// Linbis shipment (air)
interface LinbisAirShipment {
  id?: string | number;
  number?: string;
  waybillNumber?: string;
  carrier?: { name?: string };
  consignee?: { name?: string };
  origin?: string;
  destination?: string;
  departure?: { displayDate?: string } | string;
  arrival?: { displayDate?: string } | string;
  customerReference?: string;
  cargoDescription?: string;
  [key: string]: unknown;
}

// Linbis shipment (ocean)
interface LinbisOceanShipment {
  id?: number;
  number?: string;
  consignee?: string;
  carrier?: string;
  portOfLoading?: string;
  portOfUnloading?: string;
  vessel?: string;
  bookingNumber?: string;
  waybillNumber?: string;
  containerNumber?: string;
  departure?: string;
  arrival?: string;
  customerReference?: string;
  cargoDescription?: string;
  accountingStatus?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightDisplayValue?: string;
  [key: string]: unknown;
}

// Linbis shipment (ground)
interface LinbisGroundShipment {
  id?: number;
  number?: string;
  consignee?: string;
  carrier?: string;
  from?: string;
  to?: string;
  truckNumber?: string;
  departure?: string;
  arrival?: string;
  customerReference?: string;
  cargoDescription?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightDisplayValue?: string;
  [key: string]: unknown;
}

// Quote from Linbis
interface LinbisQuote {
  id?: string | number;
  number?: string;
  date?: string;
  validUntil_Date?: string;
  origin?: string;
  destination?: string;
  consignee?: string;
  totalCargo_Pieces?: number;
  totalCharge_IncomeDisplayValue?: string;
  customerReference?: string;
  [key: string]: unknown;
}

// Client + stats with aggregated data
interface ClientStats {
  username: string;
  nombreuser?: string;
  email: string;
  airCount: number;
  oceanCount: number;
  groundCount: number;
  quoteCount: number;
  trackingAir: number;
  trackingOcean: number;
}

type ListModalType =
  | null
  | "all-clients"
  | "all-trackings"
  | "kpi-clients"
  | "kpi-air"
  | "kpi-ocean"
  | "kpi-ground"
  | "kpi-quotes"
  | "kpi-trackings"
  | "kpi-delayed"
  | "client-detail"
  | "linbis-air"
  | "linbis-ocean"
  | "linbis-ground"
  | "linbis-quotes";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function isAirDelayed(s: AirShipment): boolean {
  if (!s.route) return false;
  const landed = ["LANDED", "DELIVERED"].includes(s.status);
  if (landed) return false;
  const etaStr = s.route.destination.date_of_rcf;
  if (!etaStr) return false;
  return new Date(etaStr) < new Date();
}

function isOceanDelayed(s: OceanShipment): boolean {
  if (!s.route) return false;
  const arrived = ["ARRIVED", "DISCHARGED"].includes(s.status);
  if (arrived) return false;
  const etaStr = s.route.port_of_discharge.date_of_discharge;
  if (!etaStr) return false;
  return new Date(etaStr) < new Date();
}

function getAirBadgeClass(status: string): string {
  switch (status) {
    case "BOOKED":
    case "INPROGRESS":
      return "ej-badge--booked";
    case "EN_ROUTE":
      return "ej-badge--transit";
    case "LANDED":
    case "DELIVERED":
      return "ej-badge--delivered";
    default:
      return "ej-badge--other";
  }
}

function getOceanBadgeClass(status: string): string {
  switch (status) {
    case "BOOKED":
    case "NEW":
    case "INPROGRESS":
    case "LOADED":
      return "ej-badge--booked";
    case "SAILING":
      return "ej-badge--sailing";
    case "ARRIVED":
    case "DISCHARGED":
      return "ej-badge--delivered";
    default:
      return "ej-badge--other";
  }
}

function linbisFetchBasic(url: string, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components (stateless)
// ═══════════════════════════════════════════════════════════════════════════

function SkeletonCard() {
  return (
    <div className="ej-kpi" style={{ minHeight: 95 }}>
      <div
        className="ej-skeleton"
        style={{ width: 100, height: 12, marginBottom: 14 }}
      />
      <div
        className="ej-skeleton"
        style={{ width: 60, height: 28, marginBottom: 6 }}
      />
      <div className="ej-skeleton" style={{ width: 120, height: 10 }} />
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="ej-progress">
      <div className="ej-progress__track">
        <div
          className="ej-progress__fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="ej-progress__text">{pct}%</span>
    </div>
  );
}

function DonutChart({
  segments,
  size = 100,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = 36;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="ej-donut-wrap">
      <svg width={size} height={size} viewBox="0 0 100 100">
        {total === 0 ? (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#f1f3f8"
            strokeWidth="12"
          />
        ) : (
          segments
            .filter((seg) => seg.value > 0)
            .map((seg, i) => {
              const pct = seg.value / total;
              const dash = pct * c;
              const gap = c - dash;
              const o = offset;
              offset += dash;
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-o}
                  transform="rotate(-90 50 50)"
                />
              );
            })
        )}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dy="0.35em"
          fontSize="16"
          fontWeight="700"
          fill="#1a1a2e"
        >
          {total}
        </text>
      </svg>
      <div className="ej-donut-legend">
        {segments
          .filter((s) => s.value > 0)
          .map((seg, i) => (
            <div key={i} className="ej-donut-legend__item">
              <span
                className="ej-donut-legend__dot"
                style={{ background: seg.color }}
              />
              {seg.label}
              <span className="ej-donut-legend__value">{seg.value}</span>
            </div>
          ))}
      </div>
    </div>
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
    <div className="ej-status-row">
      <span className="ej-status-row__label">{label}</span>
      <div className="ej-status-row__bar-wrap">
        <div
          className="ej-status-row__bar"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="ej-status-row__count">{count}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function HomeEjecutivo() {
  const { user, token } = useAuth();
  const { accessToken } = useOutletContext<OutletContext>();
  const navigate = useNavigate();

  // ── Core state ─────────────────────────────────────────
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Linbis data
  const [linbisAir, setLinbisAir] = useState<LinbisAirShipment[]>([]);
  const [linbisOcean, setLinbisOcean] = useState<LinbisOceanShipment[]>([]);
  const [linbisGround, setLinbisGround] = useState<LinbisGroundShipment[]>([]);
  const [linbisQuotes, setLinbisQuotes] = useState<LinbisQuote[]>([]);
  const [linbisLoading, setLinbisLoading] = useState(true);

  // ShipsGo data
  const [trackingAir, setTrackingAir] = useState<AirShipment[]>([]);
  const [trackingOcean, setTrackingOcean] = useState<OceanShipment[]>([]);

  // Filters
  const [clientFilter, setClientFilter] = useState("");
  const [shipmentTab, setShipmentTab] = useState<"air" | "ocean" | "ground">(
    "air",
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
  const [modalClient, setModalClient] = useState<string | null>(null);

  const displayName = user?.nombreuser || user?.username || "Ejecutivo";

  // ── Fetch clients & ShipsGo data ──────────────────────────
  const fetchCoreData = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const [clientsRes, airRes, oceanRes] = await Promise.allSettled([
          fetch("/api/ejecutivo/clientes", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
          fetch("/api/shipsgo/shipments", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json() as Promise<AirResponse>),
          fetch("/api/shipsgo/ocean/shipments", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json() as Promise<OceanResponse>),
        ]);

        const raw = clientsRes.status === "fulfilled" ? clientsRes.value : null;
        const arr: Cliente[] = Array.isArray(raw?.clientes)
          ? raw.clientes
          : Array.isArray(raw)
            ? raw
            : [];
        setClientes(arr);
        const clientSet = new Set(arr.map((c) => c.username));

        if (
          airRes.status === "fulfilled" &&
          Array.isArray(airRes.value?.shipments)
        ) {
          setTrackingAir(
            airRes.value.shipments.filter((s) =>
              clientSet.has(s.reference ?? ""),
            ),
          );
        }
        if (
          oceanRes.status === "fulfilled" &&
          Array.isArray(oceanRes.value?.shipments)
        ) {
          setTrackingOcean(
            oceanRes.value.shipments.filter((s) =>
              clientSet.has(s.reference ?? ""),
            ),
          );
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
    fetchCoreData();
  }, [fetchCoreData]);

  // ── Fetch Linbis data once we have clients + accessToken ─────────
  useEffect(() => {
    if (!accessToken || !clientes.length) {
      if (!loading && clientes.length === 0) setLinbisLoading(false);
      return;
    }

    let cancelled = false;
    setLinbisLoading(true);

    (async () => {
      try {
        // Ocean & Ground: fetch all, filter client-side
        const [oceanAllRes, groundAllRes] = await Promise.allSettled([
          linbisFetchBasic(
            "https://api.linbis.com/ocean-shipments/all",
            accessToken,
          ).then((r) => (r.ok ? r.json() : [])),
          linbisFetchBasic(
            "https://api.linbis.com/ground-shipments/all",
            accessToken,
          ).then((r) => (r.ok ? r.json() : [])),
        ]);

        const clientUsernames = new Set(clientes.map((c) => c.username));

        const oceanAll: LinbisOceanShipment[] =
          oceanAllRes.status === "fulfilled" && Array.isArray(oceanAllRes.value)
            ? oceanAllRes.value.filter((o: LinbisOceanShipment) =>
                clientUsernames.has(o.consignee || ""),
              )
            : [];
        const groundAll: LinbisGroundShipment[] =
          groundAllRes.status === "fulfilled" &&
          Array.isArray(groundAllRes.value)
            ? groundAllRes.value.filter((g: LinbisGroundShipment) =>
                clientUsernames.has(g.consignee || ""),
              )
            : [];

        // Air shipments & quotes: per-client counts
        const airPromises = clientes.map((c) =>
          linbisFetchBasic(
            `https://api.linbis.com/air-shipments?ConsigneeName=${encodeURIComponent(c.username)}&SortBy=newest&ItemsPerPage=100`,
            accessToken,
          ).then(async (r) => {
            if (!r.ok) return [];
            const d = await r.json();
            return Array.isArray(d) ? d : [];
          }),
        );

        const quotesPromises = clientes.map((c) =>
          linbisFetchBasic(
            `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(c.username)}&SortBy=newest&ItemsPerPage=100`,
            accessToken,
          ).then(async (r) => {
            if (!r.ok) return [];
            const d = await r.json();
            return Array.isArray(d) ? d : [];
          }),
        );

        const [airResults, quoteResults] = await Promise.all([
          Promise.allSettled(airPromises),
          Promise.allSettled(quotesPromises),
        ]);

        const allAirShipments: LinbisAirShipment[] = [];
        airResults.forEach((res) => {
          if (res.status === "fulfilled") allAirShipments.push(...res.value);
        });

        const allQuotes: LinbisQuote[] = [];
        quoteResults.forEach((res) => {
          if (res.status === "fulfilled") allQuotes.push(...res.value);
        });

        if (!cancelled) {
          setLinbisAir(allAirShipments);
          setLinbisOcean(oceanAll);
          setLinbisGround(groundAll);
          setLinbisQuotes(allQuotes);
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLinbisLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, clientes, loading]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => fetchCoreData(true), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchCoreData]);

  // ═══════════════════════════════════════════════════════════════════════
  // Computed values
  // ═══════════════════════════════════════════════════════════════════════

  // ShipsGo tracking stats
  const airInTransit = useMemo(
    () =>
      trackingAir.filter((s) =>
        ["EN_ROUTE", "BOOKED", "INPROGRESS"].includes(s.status),
      ),
    [trackingAir],
  );
  const airCompleted = useMemo(
    () => trackingAir.filter((s) => ["LANDED", "DELIVERED"].includes(s.status)),
    [trackingAir],
  );
  const airDelayed = useMemo(
    () => trackingAir.filter(isAirDelayed),
    [trackingAir],
  );

  const oceanInTransit = useMemo(
    () =>
      trackingOcean.filter((s) =>
        ["SAILING", "LOADED", "BOOKED", "NEW", "INPROGRESS"].includes(s.status),
      ),
    [trackingOcean],
  );
  const oceanCompleted = useMemo(
    () =>
      trackingOcean.filter((s) => ["ARRIVED", "DISCHARGED"].includes(s.status)),
    [trackingOcean],
  );
  const oceanDelayed = useMemo(
    () => trackingOcean.filter(isOceanDelayed),
    [trackingOcean],
  );

  const totalDelayed = airDelayed.length + oceanDelayed.length;

  // Delayed alerts
  const delayedShipments = useMemo(() => {
    const items: {
      type: "air" | "ocean";
      id: number;
      reference: string;
      identifier: string;
      carrier: string;
      origin: string;
      destination: string;
      progress: number;
    }[] = [];
    airDelayed.forEach((s) => {
      items.push({
        type: "air",
        id: s.id,
        reference: s.reference || "—",
        identifier: s.awb_number,
        carrier: s.airline?.name || "—",
        origin: s.route?.origin.location.iata || "—",
        destination: s.route?.destination.location.iata || "—",
        progress: s.route?.transit_percentage ?? 0,
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
        destination: s.route?.port_of_discharge.location.name || "—",
        progress: s.route?.transit_percentage ?? 0,
      });
    });
    return items;
  }, [airDelayed, oceanDelayed]);

  // Client stats (aggregated)
  const clientStats = useMemo<ClientStats[]>(() => {
    const map = new Map<string, ClientStats>();
    clientes.forEach((c) => {
      map.set(c.username, {
        username: c.username,
        nombreuser: c.nombreuser,
        email: c.email,
        airCount: 0,
        oceanCount: 0,
        groundCount: 0,
        quoteCount: 0,
        trackingAir: 0,
        trackingOcean: 0,
      });
    });

    // Count Linbis air
    linbisAir.forEach((s) => {
      const name = s.consignee?.name || "";
      const entry = map.get(name);
      if (entry) entry.airCount++;
    });

    // Count Linbis ocean
    linbisOcean.forEach((s) => {
      const entry = map.get(s.consignee || "");
      if (entry) entry.oceanCount++;
    });

    // Count Linbis ground
    linbisGround.forEach((s) => {
      const entry = map.get(s.consignee || "");
      if (entry) entry.groundCount++;
    });

    // Count quotes
    linbisQuotes.forEach((q) => {
      const entry = map.get(q.consignee || "");
      if (entry) entry.quoteCount++;
    });

    // Count ShipsGo trackings
    trackingAir.forEach((s) => {
      const entry = map.get(s.reference || "");
      if (entry) entry.trackingAir++;
    });
    trackingOcean.forEach((s) => {
      const entry = map.get(s.reference || "");
      if (entry) entry.trackingOcean++;
    });

    return [...map.values()].sort(
      (a, b) =>
        b.airCount +
        b.oceanCount +
        b.groundCount +
        b.quoteCount -
        (a.airCount + a.oceanCount + a.groundCount + a.quoteCount),
    );
  }, [
    clientes,
    linbisAir,
    linbisOcean,
    linbisGround,
    linbisQuotes,
    trackingAir,
    trackingOcean,
  ]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!clientFilter.trim()) return clientStats;
    const q = clientFilter.toLowerCase();
    return clientStats.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        (c.nombreuser || "").toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [clientStats, clientFilter]);

  // New clients this month
  const newThisMonth = useMemo(() => {
    const firstDay = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    return clientes.filter((c) => new Date(c.createdAt) >= firstDay).length;
  }, [clientes]);

  // Recent ShipsGo air/ocean
  const recentAir = useMemo(
    () =>
      [...trackingAir]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 8),
    [trackingAir],
  );
  const recentOcean = useMemo(
    () =>
      [...trackingOcean]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 8),
    [trackingOcean],
  );

  // Status distributions for ShipsGo
  const airStatusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    trackingAir.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [trackingAir]);

  const oceanStatusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    trackingOcean.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [trackingOcean]);

  // Donut segments
  const airDonut = useMemo(
    () => [
      { value: airInTransit.length, color: "#0891b2", label: "En Tránsito" },
      { value: airCompleted.length, color: "#059669", label: "Completados" },
      { value: airDelayed.length, color: "#dc2626", label: "Retrasos" },
    ],
    [airInTransit, airCompleted, airDelayed],
  );
  const oceanDonut = useMemo(
    () => [
      { value: oceanInTransit.length, color: "#2563eb", label: "En Tránsito" },
      { value: oceanCompleted.length, color: "#059669", label: "Completados" },
      { value: oceanDelayed.length, color: "#dc2626", label: "Retrasos" },
    ],
    [oceanInTransit, oceanCompleted, oceanDelayed],
  );

  // Greeting
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  const today = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Render: Loading
  // ═══════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="ej-home">
        <div className="ej-header">
          <div className="ej-header__left">
            <h1>Cargando Torre de Control...</h1>
          </div>
        </div>
        <div className="ej-kpi-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="ej-home">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="ej-header">
        <div className="ej-header__left">
          <h1>
            {greeting}, <span>{displayName}</span>
          </h1>
          <p>{today}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="ej-refresh-btn"
            onClick={() => fetchCoreData(true)}
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
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
          <div className="ej-header__badge">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="ej-pulse" />
            TORRE DE CONTROL
          </div>
        </div>
      </div>

      {/* ── Acceso Rápido ──────────────────────────────────────────────── */}
      <div className="ops-quick-actions-section">
        <span className="ops-quick-actions-label">Acceso Rápido</span>
        <div className="ops-quick-actions">
          <button
            className="ops-quick-action"
            onClick={() => navigate("/admin/cotizador-administrador")}
          >
            Nueva Cotización
          </button>
          <button
            className="ops-quick-action"
            onClick={() => navigate("/admin/reporteriaclientes")}
          >
            Mis Clientes
          </button>
          <button
            className="ops-quick-action"
            onClick={() => navigate("/admin/trackeos")}
          >
            Seguimientos
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="ej-kpi-grid">
        {/* Clients */}
        <div
          className="ej-kpi ej-kpi--orange ej-kpi--clickable"
          onClick={() => setListModal("all-clients")}
        >
          <div className="ej-kpi__header">
            <span className="ej-kpi__label">Mis Clientes</span>
            <div
              className="ej-kpi__icon"
              style={{ background: "var(--ej-orange-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ej-orange)"
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
          <div className="ej-kpi__value" style={{ color: "var(--ej-orange)" }}>
            {clientes.length}
          </div>
          <div className="ej-kpi__sub">
            {newThisMonth > 0 ? `+${newThisMonth} este mes` : "Cartera activa"}
          </div>
        </div>

        {/* ShipsGo Trackings */}
        <div
          className="ej-kpi ej-kpi--green ej-kpi--clickable"
          onClick={() => {
            setListModal("all-trackings");
            setListModalTab("all");
          }}
        >
          <div className="ej-kpi__header">
            <span className="ej-kpi__label">Seguimientos</span>
            <div
              className="ej-kpi__icon"
              style={{ background: "var(--ej-green-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ej-green)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <div className="ej-kpi__value" style={{ color: "var(--ej-green)" }}>
            {trackingAir.length + trackingOcean.length}
          </div>
          <div className="ej-kpi__sub">
            {trackingAir.length} aéreos · {trackingOcean.length} marítimos
          </div>
        </div>

        {/* Active (in transit) */}
        <div
          className="ej-kpi ej-kpi--amber ej-kpi--clickable"
          onClick={() => {
            setListModal("kpi-trackings");
            setListModalTab("all");
          }}
        >
          <div className="ej-kpi__header">
            <span className="ej-kpi__label">En Movimiento</span>
            <div
              className="ej-kpi__icon"
              style={{ background: "var(--ej-amber-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ej-amber)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="ej-kpi__value" style={{ color: "var(--ej-amber)" }}>
            {airInTransit.length + oceanInTransit.length}
          </div>
          <div className="ej-kpi__sub">
            {airInTransit.length} aéreos · {oceanInTransit.length} marítimos
          </div>
        </div>

        {/* Delays */}
        <div
          className="ej-kpi ej-kpi--red ej-kpi--clickable"
          onClick={() => {
            setListModal("kpi-delayed");
            setListModalTab("all");
          }}
        >
          <div className="ej-kpi__header">
            <span className="ej-kpi__label">Retrasos Activos</span>
            <div
              className="ej-kpi__icon"
              style={{ background: "var(--ej-red-bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ej-red)"
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
          <div className="ej-kpi__value" style={{ color: "var(--ej-red)" }}>
            {totalDelayed}
          </div>
          <div className="ej-kpi__sub">
            {airDelayed.length} aéreos · {oceanDelayed.length} marítimos
          </div>
        </div>
      </div>

      {/* ── Alerts Panel (only if there are delays) ──────────────────── */}
      {totalDelayed > 0 && (
        <div
          className={`ej-alerts ${totalDelayed > 0 ? "ej-alerts--critical" : ""}`}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3 className="ej-section-title" style={{ margin: 0 }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ej-red)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Alertas de Retraso ({totalDelayed})
            </h3>
          </div>
          <div className="ej-alert-list">
            {delayedShipments.map((d) => (
              <div
                key={`${d.type}-${d.id}`}
                className="ej-alert-item"
                onClick={() => {
                  const ship =
                    d.type === "air"
                      ? trackingAir.find((s) => s.id === d.id)
                      : trackingOcean.find((s) => s.id === d.id);
                  if (d.type === "air" && ship)
                    setSelectedAir(ship as AirShipment);
                  if (d.type === "ocean" && ship)
                    setSelectedOcean(ship as OceanShipment);
                }}
              >
                <div className="ej-alert-item__icon">
                  <span style={{ fontSize: 16 }}>
                    {d.type === "air" ? "✈" : "🚢"}
                  </span>
                </div>
                <div className="ej-alert-item__body">
                  <div className="ej-alert-item__title">
                    {d.identifier} — {d.carrier}
                  </div>
                  <div className="ej-alert-item__meta">
                    <span>
                      {d.origin} → {d.destination}
                    </span>
                    <span>Cliente: {d.reference}</span>
                    <span>Progreso: {Math.round(d.progress)}%</span>
                  </div>
                </div>
                <span
                  className={`ej-alert-item__badge ej-alert-item__badge--${d.type}`}
                >
                  {d.type === "air" ? "✈ Aéreo" : "🚢 Marítimo"}
                </span>
                <span className="ej-alert-item__badge ej-alert-item__badge--delay">
                  ⚠ Retraso
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Distribución de Seguimientos ──────────────────────────────── */}
      {/* ShipsGo Tracking Distribution */}
      <div className="ej-panel">
        <h3 className="ej-section-title">Distribución de Seguimientos</h3>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          {/* Air donut */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ej-cyan)",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              ✈ Aéreos
            </div>
            <DonutChart segments={airDonut} size={90} />
            <div className="ej-status-grid" style={{ marginTop: 8 }}>
              <StatusBar
                label="En Tránsito"
                count={airStatusDist["EN_ROUTE"] || 0}
                total={trackingAir.length}
                color="#0891b2"
              />
              <StatusBar
                label="Aterrizado"
                count={airStatusDist["LANDED"] || 0}
                total={trackingAir.length}
                color="#059669"
              />
              <StatusBar
                label="Entregado"
                count={airStatusDist["DELIVERED"] || 0}
                total={trackingAir.length}
                color="#22c55e"
              />
              {(airStatusDist["BOOKED"] || 0) > 0 && (
                <StatusBar
                  label="Reservado"
                  count={airStatusDist["BOOKED"] || 0}
                  total={trackingAir.length}
                  color="#7c3aed"
                />
              )}
            </div>
          </div>

          {/* Ocean donut */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ej-blue)",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              🚢 Marítimos
            </div>
            <DonutChart segments={oceanDonut} size={90} />
            <div className="ej-status-grid" style={{ marginTop: 8 }}>
              <StatusBar
                label="Navegando"
                count={oceanStatusDist["SAILING"] || 0}
                total={trackingOcean.length}
                color="#2563eb"
              />
              <StatusBar
                label="Arribado"
                count={oceanStatusDist["ARRIVED"] || 0}
                total={trackingOcean.length}
                color="#059669"
              />
              <StatusBar
                label="Descargado"
                count={oceanStatusDist["DISCHARGED"] || 0}
                total={trackingOcean.length}
                color="#22c55e"
              />
              {(oceanStatusDist["LOADED"] || 0) > 0 && (
                <StatusBar
                  label="Cargado"
                  count={oceanStatusDist["LOADED"] || 0}
                  total={trackingOcean.length}
                  color="#7c3aed"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ShipsGo Recent Shipments Table ────────────────────────────── */}
      <div className="ej-panel" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <h3 className="ej-section-title" style={{ margin: 0 }}>
            Últimos Seguimientos
          </h3>
          <button
            className="ej-view-all"
            onClick={() => {
              setListModal("all-trackings");
              setListModalTab("all");
            }}
          >
            Ver todos →
          </button>
        </div>

        {/* Tabs */}
        <div className="ej-tabs">
          <button
            className={`ej-tab ${shipmentTab === "air" ? "ej-tab--active" : ""}`}
            onClick={() => setShipmentTab("air")}
          >
            ✈ Aéreos ({trackingAir.length})
          </button>
          <button
            className={`ej-tab ${shipmentTab === "ocean" ? "ej-tab--active" : ""}`}
            onClick={() => setShipmentTab("ocean")}
          >
            🚢 Marítimos ({trackingOcean.length})
          </button>
        </div>

        {shipmentTab === "air" ? (
          recentAir.length === 0 ? (
            <div className="ej-empty">
              No hay seguimientos aéreos registrados.
            </div>
          ) : (
            <table className="ej-mini-table">
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
                      className="ej-clickable-row"
                      onClick={() => setSelectedAir(s)}
                    >
                      <td>
                        <span
                          className={`ej-badge ${delayed ? "ej-badge--delayed" : getAirBadgeClass(s.status)}`}
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
                            className="ej-flag"
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
                            className="ej-flag"
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
          <div className="ej-empty">
            No hay seguimientos marítimos registrados.
          </div>
        ) : (
          <table className="ej-mini-table">
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
                    className="ej-clickable-row"
                    onClick={() => setSelectedOcean(s)}
                  >
                    <td>
                      <span
                        className={`ej-badge ${delayed ? "ej-badge--delayed" : getOceanBadgeClass(s.status)}`}
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
                          className="ej-flag"
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
                          className="ej-flag"
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

      {/* ── Client Portfolio + Health ─────────────────────────────────── */}
      <div className="ej-grid-2">
        {/* Client Portfolio */}
        <div className="ej-panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3 className="ej-section-title" style={{ margin: 0 }}>
              Cartera de Clientes
            </h3>
            <button
              className="ej-view-all"
              onClick={() => setListModal("all-clients")}
            >
              Ver todos →
            </button>
          </div>

          <input
            type="text"
            className="ej-filter-bar__search"
            placeholder="Buscar cliente..."
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            style={{ width: "100%", marginBottom: 10 }}
          />

          <div className="ej-client-list">
            {filteredClients.length === 0 ? (
              <div className="ej-empty">Sin resultados.</div>
            ) : (
              filteredClients.slice(0, 12).map((c) => {
                const total = c.airCount + c.oceanCount + c.groundCount;
                return (
                  <div
                    key={c.username}
                    className="ej-client-row"
                    onClick={() => {
                      setModalClient(c.username);
                      setListModal("client-detail");
                    }}
                  >
                    <div className="ej-client-row__avatar">
                      {(c.username || c.username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ej-client-row__name">
                        {c.username || c.username}
                      </div>
                      <div style={{ fontSize: 11, color: "#8b92a5" }}>
                        ✈{c.airCount} 🚢{c.oceanCount} 🚛{c.groundCount} 📋
                        {c.quoteCount}
                      </div>
                    </div>
                    <span className="ej-client-row__count">{total}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Health + Summary */}
        <div className="ej-panel">
          <h3 className="ej-section-title">Resumen Ejecutivo</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MiniStat
              label="Clientes"
              value={clientes.length}
              color="var(--ej-orange)"
            />
            <MiniStat
              label="Seguimientos Activos"
              value={airInTransit.length + oceanInTransit.length}
              color="var(--ej-amber)"
            />

            {/* Health */}
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
                marginTop: 4,
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>
                {totalDelayed === 0 ? "✅" : totalDelayed <= 3 ? "⚠️" : "🚨"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ej-text)",
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
                  color: "var(--ej-text-muted)",
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

      {/* Individual shipsgo detail modals */}
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

      {/* List modal */}
      {listModal && (
        <EjListModal
          type={listModal}
          tab={listModalTab}
          onTabChange={setListModalTab}
          onClose={() => {
            setListModal(null);
            setModalClient(null);
          }}
          clientStats={clientStats}
          trackingAir={trackingAir}
          trackingOcean={trackingOcean}
          airInTransit={airInTransit}
          oceanInTransit={oceanInTransit}
          airDelayed={airDelayed}
          oceanDelayed={oceanDelayed}
          linbisAir={linbisAir}
          linbisOcean={linbisOcean}
          linbisGround={linbisGround}
          linbisQuotes={linbisQuotes}
          linbisLoading={linbisLoading}
          modalClient={modalClient}
          onSelectAir={(s) => {
            setListModal(null);
            setSelectedAir(s);
          }}
          onSelectOcean={(s) => {
            setListModal(null);
            setSelectedOcean(s);
          }}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MiniStat
// ═══════════════════════════════════════════════════════════════════════════

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
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 8,
        background: "#fafbfc",
        border: "1px solid var(--ej-border)",
      }}
    >
      <span
        style={{ fontSize: 12, fontWeight: 600, color: "var(--ej-text-muted)" }}
      >
        {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EjListModal — Full-list overlay
// ═══════════════════════════════════════════════════════════════════════════

interface EjListModalProps {
  type: NonNullable<ListModalType>;
  tab: "air" | "ocean" | "all";
  onTabChange: (t: "air" | "ocean" | "all") => void;
  onClose: () => void;
  clientStats: ClientStats[];
  trackingAir: AirShipment[];
  trackingOcean: OceanShipment[];
  airInTransit: AirShipment[];
  oceanInTransit: OceanShipment[];
  airDelayed: AirShipment[];
  oceanDelayed: OceanShipment[];
  linbisAir: LinbisAirShipment[];
  linbisOcean: LinbisOceanShipment[];
  linbisGround: LinbisGroundShipment[];
  linbisQuotes: LinbisQuote[];
  linbisLoading: boolean;
  modalClient: string | null;
  onSelectAir: (s: AirShipment) => void;
  onSelectOcean: (s: OceanShipment) => void;
  onNavigate: (path: string) => void;
}

function EjListModal({
  type,
  tab,
  onTabChange,
  onClose,
  clientStats,
  trackingAir,
  trackingOcean,
  airInTransit,
  oceanInTransit,
  airDelayed,
  oceanDelayed,
  linbisAir,
  linbisOcean,
  linbisGround,
  linbisQuotes,
  linbisLoading,
  modalClient,
  onSelectAir,
  onSelectOcean,
  onNavigate,
}: EjListModalProps) {
  const [search, setSearch] = useState("");

  let title = "";
  let showTrackingTabs = false;
  let airList: AirShipment[] = [];
  let oceanList: OceanShipment[] = [];

  switch (type) {
    case "all-trackings":
      title = "Todos los Seguimientos";
      airList = trackingAir;
      oceanList = trackingOcean;
      showTrackingTabs = true;
      break;
    case "kpi-trackings":
      title = "Envíos En Movimiento";
      airList = airInTransit;
      oceanList = oceanInTransit;
      showTrackingTabs = true;
      break;
    case "kpi-delayed":
      title = "Retrasos Activos";
      airList = airDelayed;
      oceanList = oceanDelayed;
      showTrackingTabs = true;
      break;
    default:
      break;
  }

  // Filtering tracking lists by search
  const filteredAirList = search
    ? airList.filter(
        (s) =>
          s.awb_number.toLowerCase().includes(search.toLowerCase()) ||
          (s.reference || "").toLowerCase().includes(search.toLowerCase()) ||
          (s.airline?.name || "").toLowerCase().includes(search.toLowerCase()),
      )
    : airList;
  const filteredOceanList = search
    ? oceanList.filter(
        (s) =>
          (s.container_number || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (s.booking_number || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (s.reference || "").toLowerCase().includes(search.toLowerCase()) ||
          (s.carrier?.name || "").toLowerCase().includes(search.toLowerCase()),
      )
    : oceanList;

  const filteredAir = tab === "ocean" ? [] : filteredAirList;
  const filteredOcean = tab === "air" ? [] : filteredOceanList;

  // ── Render: Tracking modals ──
  if (showTrackingTabs) {
    const hasBothTypes = airList.length > 0 && oceanList.length > 0;
    return (
      <div className="ej-list-overlay" onClick={onClose}>
        <div className="ej-list-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ej-list-modal__header">
            <h2 className="ej-list-modal__title">{title}</h2>
            <button className="ej-list-modal__close" onClick={onClose}>
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

          <div style={{ padding: "0 24px" }}>
            <input
              type="text"
              className="ej-filter-bar__search"
              placeholder="Buscar AWB, container, cliente, aerolínea..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", marginTop: 12 }}
            />
          </div>

          {hasBothTypes && (
            <div className="ej-tabs" style={{ padding: "0 24px" }}>
              <button
                className={`ej-tab ${tab === "all" ? "ej-tab--active" : ""}`}
                onClick={() => onTabChange("all")}
              >
                Todos ({airList.length + oceanList.length})
              </button>
              <button
                className={`ej-tab ${tab === "air" ? "ej-tab--active" : ""}`}
                onClick={() => onTabChange("air")}
              >
                ✈ Aéreos ({airList.length})
              </button>
              <button
                className={`ej-tab ${tab === "ocean" ? "ej-tab--active" : ""}`}
                onClick={() => onTabChange("ocean")}
              >
                🚢 Marítimos ({oceanList.length})
              </button>
            </div>
          )}

          <div className="ej-list-modal__body">
            {filteredAir.length > 0 && (
              <>
                {hasBothTypes && tab === "all" && (
                  <h4 className="ej-list-modal__subtitle">
                    ✈ Aéreos ({filteredAir.length})
                  </h4>
                )}
                <table className="ej-mini-table">
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
                          className="ej-clickable-row"
                          onClick={() => onSelectAir(s)}
                        >
                          <td>
                            <span
                              className={`ej-badge ${delayed ? "ej-badge--delayed" : getAirBadgeClass(s.status)}`}
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
                                className="ej-flag"
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
                                className="ej-flag"
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

            {filteredOcean.length > 0 && (
              <>
                {hasBothTypes && tab === "all" && (
                  <h4 className="ej-list-modal__subtitle">
                    🚢 Marítimos ({filteredOcean.length})
                  </h4>
                )}
                <table className="ej-mini-table">
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
                          className="ej-clickable-row"
                          onClick={() => onSelectOcean(s)}
                        >
                          <td>
                            <span
                              className={`ej-badge ${delayed ? "ej-badge--delayed" : getOceanBadgeClass(s.status)}`}
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
                                  s.route.port_of_loading.location.country.code,
                                )}
                                alt=""
                                className="ej-flag"
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
                                className="ej-flag"
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
              <div className="ej-empty">
                No hay seguimientos en esta categoría.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Client list modal ──
  if (type === "all-clients" || type === "kpi-clients") {
    return (
      <div className="ej-list-overlay" onClick={onClose}>
        <div className="ej-list-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ej-list-modal__header">
            <h2 className="ej-list-modal__title">
              Mis Clientes ({clientStats.length})
            </h2>
            <button className="ej-list-modal__close" onClick={onClose}>
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
          <div style={{ padding: "0 24px" }}>
            <input
              type="text"
              className="ej-filter-bar__search"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", marginTop: 12 }}
            />
          </div>
          <div className="ej-list-modal__body">
            <table className="ej-mini-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre Empresa</th>
                  <th>Nombre Cliente</th>
                  <th>Email</th>
                  <th>✈ Aéreo</th>
                  <th>🚢 Marítimo</th>
                  <th>🚛 Terrestre</th>
                  <th>📋 Cotiz.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {clientStats
                  .filter(
                    (c) =>
                      !search ||
                      c.username.toLowerCase().includes(search.toLowerCase()) ||
                      (c.nombreuser || "")
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((c, i) => (
                    <tr
                      key={c.username}
                      className="ej-clickable-row"
                      onClick={() => onNavigate("/admin/reporteriaclientes")}
                    >
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background:
                              i === 0
                                ? "var(--ej-orange)"
                                : i === 1
                                  ? "#64748b"
                                  : i === 2
                                    ? "#94a3b8"
                                    : "#cbd5e1",
                            color: i < 3 ? "#fff" : "#64748b",
                            fontSize: 11,
                            fontWeight: 700,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.username}</td>
                      <td style={{ fontSize: 11, color: "#8b92a5" }}>
                        {c.nombreuser}
                      </td>
                      <td style={{ fontSize: 11, color: "#8b92a5" }}>
                        {c.email}
                      </td>
                      <td>{c.airCount}</td>
                      <td>{c.oceanCount}</td>
                      <td>{c.groundCount}</td>
                      <td>{c.quoteCount}</td>
                      <td
                        style={{ fontWeight: 700, color: "var(--ej-orange)" }}
                      >
                        {c.airCount + c.oceanCount + c.groundCount}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Client detail modal ──
  if (type === "client-detail" && modalClient) {
    const cs = clientStats.find((c) => c.username === modalClient);
    const clientAirShipments = linbisAir.filter(
      (s) => s.consignee?.name === modalClient,
    );
    const clientOceanShipments = linbisOcean.filter(
      (s) => s.consignee === modalClient,
    );
    const clientGroundShipments = linbisGround.filter(
      (s) => s.consignee === modalClient,
    );
    const clientQuotes = linbisQuotes.filter(
      (q) => q.consignee === modalClient,
    );
    const clientTrackingAir = trackingAir.filter(
      (s) => s.reference === modalClient,
    );
    const clientTrackingOcean = trackingOcean.filter(
      (s) => s.reference === modalClient,
    );

    return (
      <div className="ej-list-overlay" onClick={onClose}>
        <div className="ej-list-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ej-list-modal__header">
            <h2 className="ej-list-modal__title">
              📊 {cs?.nombreuser || modalClient}
            </h2>
            <button className="ej-list-modal__close" onClick={onClose}>
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
          <div className="ej-list-modal__body">
            {/* Client KPIs mini */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <MiniStat
                label="✈ Aéreos"
                value={clientAirShipments.length}
                color="var(--ej-cyan)"
              />
              <MiniStat
                label="🚢 Marítimos"
                value={clientOceanShipments.length}
                color="var(--ej-blue)"
              />
              <MiniStat
                label="🚛 Terrestres"
                value={clientGroundShipments.length}
                color="var(--ej-teal)"
              />
              <MiniStat
                label="📋 Cotizaciones"
                value={clientQuotes.length}
                color="var(--ej-purple)"
              />
              <MiniStat
                label="🔍 Seguimientos"
                value={clientTrackingAir.length + clientTrackingOcean.length}
                color="var(--ej-green)"
              />
            </div>

            {/* ShipsGo trackings for this client */}
            {(clientTrackingAir.length > 0 ||
              clientTrackingOcean.length > 0) && (
              <>
                <h4 className="ej-list-modal__subtitle">
                  🔍 Seguimientos en Tiempo Real
                </h4>
                {clientTrackingAir.length > 0 && (
                  <table className="ej-mini-table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>AWB</th>
                        <th>Aerolínea</th>
                        <th>Origen → Destino</th>
                        <th>Progreso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientTrackingAir.map((s) => {
                        const delayed = isAirDelayed(s);
                        return (
                          <tr
                            key={s.id}
                            className="ej-clickable-row"
                            onClick={() => onSelectAir(s)}
                          >
                            <td>
                              <span
                                className={`ej-badge ${delayed ? "ej-badge--delayed" : getAirBadgeClass(s.status)}`}
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
                              {s.route?.origin.location.iata || "?"} →{" "}
                              {s.route?.destination.location.iata || "?"}
                            </td>
                            <td style={{ minWidth: 100 }}>
                              <ProgressBar
                                value={s.route?.transit_percentage ?? 0}
                                color={delayed ? "#dc2626" : "#0891b2"}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {clientTrackingOcean.length > 0 && (
                  <table className="ej-mini-table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Container</th>
                        <th>Naviera</th>
                        <th>Origen → Destino</th>
                        <th>Progreso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientTrackingOcean.map((s) => {
                        const delayed = isOceanDelayed(s);
                        return (
                          <tr
                            key={s.id}
                            className="ej-clickable-row"
                            onClick={() => onSelectOcean(s)}
                          >
                            <td>
                              <span
                                className={`ej-badge ${delayed ? "ej-badge--delayed" : getOceanBadgeClass(s.status)}`}
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
                              {s.route?.port_of_loading.location.name || "?"} →{" "}
                              {s.route?.port_of_discharge.location.name || "?"}
                            </td>
                            <td style={{ minWidth: 100 }}>
                              <ProgressBar
                                value={s.route?.transit_percentage ?? 0}
                                color={delayed ? "#dc2626" : "#2563eb"}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* Linbis air for client */}
            {clientAirShipments.length > 0 && (
              <>
                <h4 className="ej-list-modal__subtitle">
                  ✈ Embarques Aéreos ({clientAirShipments.length})
                </h4>
                <table className="ej-mini-table" style={{ marginBottom: 16 }}>
                  <thead>
                    <tr>
                      <th>Nro</th>
                      <th>AWB</th>
                      <th>Carrier</th>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientAirShipments.slice(0, 20).map((s, idx) => (
                      <tr key={s.id ?? idx}>
                        <td style={{ fontWeight: 600 }}>{s.number || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {s.waybillNumber || "—"}
                        </td>
                        <td>{s.carrier?.name || "—"}</td>
                        <td>{s.origin || "—"}</td>
                        <td>{s.destination || "—"}</td>
                        <td>{s.customerReference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Linbis ocean for client */}
            {clientOceanShipments.length > 0 && (
              <>
                <h4 className="ej-list-modal__subtitle">
                  🚢 Embarques Marítimos ({clientOceanShipments.length})
                </h4>
                <table className="ej-mini-table" style={{ marginBottom: 16 }}>
                  <thead>
                    <tr>
                      <th>Nro</th>
                      <th>BL / Container</th>
                      <th>Naviera</th>
                      <th>POL</th>
                      <th>POD</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientOceanShipments.slice(0, 20).map((s, idx) => (
                      <tr key={s.id ?? idx}>
                        <td style={{ fontWeight: 600 }}>{s.number || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {s.waybillNumber || s.containerNumber || "—"}
                        </td>
                        <td>{s.carrier || "—"}</td>
                        <td>{s.portOfLoading || "—"}</td>
                        <td>{s.portOfUnloading || "—"}</td>
                        <td>{s.customerReference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Linbis ground for client */}
            {clientGroundShipments.length > 0 && (
              <>
                <h4 className="ej-list-modal__subtitle">
                  🚛 Embarques Terrestres ({clientGroundShipments.length})
                </h4>
                <table className="ej-mini-table" style={{ marginBottom: 16 }}>
                  <thead>
                    <tr>
                      <th>Nro</th>
                      <th>Camión</th>
                      <th>Transportista</th>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientGroundShipments.slice(0, 20).map((s, idx) => (
                      <tr key={s.id ?? idx}>
                        <td style={{ fontWeight: 600 }}>{s.number || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {s.truckNumber || "—"}
                        </td>
                        <td>{s.carrier || "—"}</td>
                        <td>{s.from || "—"}</td>
                        <td>{s.to || "—"}</td>
                        <td>{s.customerReference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Quotes for client */}
            {clientQuotes.length > 0 && (
              <>
                <h4 className="ej-list-modal__subtitle">
                  📋 Cotizaciones ({clientQuotes.length})
                </h4>
                <table className="ej-mini-table">
                  <thead>
                    <tr>
                      <th>Nro</th>
                      <th>Fecha</th>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Ingreso</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientQuotes.slice(0, 20).map((q, idx) => (
                      <tr key={q.id ?? idx}>
                        <td style={{ fontWeight: 600 }}>{q.number || "—"}</td>
                        <td style={{ fontSize: 11 }}>{q.date || "—"}</td>
                        <td>{q.origin || "—"}</td>
                        <td>{q.destination || "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          {q.totalCharge_IncomeDisplayValue || "—"}
                        </td>
                        <td>{q.customerReference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Navigate button */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                className="ej-quick-action"
                onClick={() => {
                  onClose();
                  onNavigate("/admin/reporteriaclientes");
                }}
                style={{ display: "inline-flex" }}
              >
                Abrir Portal Completo de {cs?.nombreuser || modalClient} →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Linbis shipment list modals ──
  if (
    type === "linbis-air" ||
    type === "linbis-ocean" ||
    type === "linbis-ground" ||
    type === "linbis-quotes"
  ) {
    const isAir = type === "linbis-air";
    const isOceanL = type === "linbis-ocean";
    const isGround = type === "linbis-ground";
    const isQuotes = type === "linbis-quotes";

    title = isAir
      ? `✈ Embarques Aéreos (${linbisAir.length})`
      : isOceanL
        ? `🚢 Embarques Marítimos (${linbisOcean.length})`
        : isGround
          ? `🚛 Embarques Terrestres (${linbisGround.length})`
          : `📋 Cotizaciones (${linbisQuotes.length})`;

    return (
      <div className="ej-list-overlay" onClick={onClose}>
        <div className="ej-list-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ej-list-modal__header">
            <h2 className="ej-list-modal__title">{title}</h2>
            <button className="ej-list-modal__close" onClick={onClose}>
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

          <div style={{ padding: "0 24px" }}>
            <input
              type="text"
              className="ej-filter-bar__search"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", marginTop: 12 }}
            />
          </div>

          <div className="ej-list-modal__body">
            {linbisLoading ? (
              <div className="ej-empty">Cargando datos...</div>
            ) : isAir ? (
              <table className="ej-mini-table">
                <thead>
                  <tr>
                    <th>Nro</th>
                    <th>AWB</th>
                    <th>Carrier</th>
                    <th>Cliente</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {linbisAir
                    .filter(
                      (s) =>
                        !search ||
                        (s.number || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (s.waybillNumber || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (s.consignee?.name || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (s.customerReference || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((s, idx) => (
                      <tr key={s.id ?? idx}>
                        <td style={{ fontWeight: 600 }}>{s.number || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {s.waybillNumber || "—"}
                        </td>
                        <td>{s.carrier?.name || "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          {s.consignee?.name || "—"}
                        </td>
                        <td>{s.origin || "—"}</td>
                        <td>{s.destination || "—"}</td>
                        <td>{s.customerReference || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : isOceanL ? (
              <table className="ej-mini-table">
                <thead>
                  <tr>
                    <th>Nro</th>
                    <th>BL / Container</th>
                    <th>Naviera</th>
                    <th>Cliente</th>
                    <th>POL</th>
                    <th>POD</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {linbisOcean
                    .filter(
                      (s) =>
                        !search ||
                        (s.number || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (s.consignee || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (s.containerNumber || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (s.customerReference || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((s, idx) => (
                      <tr key={s.id ?? idx}>
                        <td style={{ fontWeight: 600 }}>{s.number || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {s.waybillNumber || s.containerNumber || "—"}
                        </td>
                        <td>{s.carrier || "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          {s.consignee || "—"}
                        </td>
                        <td>{s.portOfLoading || "—"}</td>
                        <td>{s.portOfUnloading || "—"}</td>
                        <td>{s.customerReference || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : isGround ? (
              <table className="ej-mini-table">
                <thead>
                  <tr>
                    <th>Nro</th>
                    <th>Camión</th>
                    <th>Transportista</th>
                    <th>Cliente</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {linbisGround
                    .filter(
                      (s) =>
                        !search ||
                        (s.number || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (s.consignee || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (s.truckNumber || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((s, idx) => (
                      <tr key={s.id ?? idx}>
                        <td style={{ fontWeight: 600 }}>{s.number || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {s.truckNumber || "—"}
                        </td>
                        <td>{s.carrier || "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          {s.consignee || "—"}
                        </td>
                        <td>{s.from || "—"}</td>
                        <td>{s.to || "—"}</td>
                        <td>{s.customerReference || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : isQuotes ? (
              <table className="ej-mini-table">
                <thead>
                  <tr>
                    <th>Nro</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Ingreso</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {linbisQuotes
                    .filter(
                      (q) =>
                        !search ||
                        (q.number || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (q.consignee || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        (q.customerReference || "")
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((q, idx) => (
                      <tr key={q.id ?? idx}>
                        <td style={{ fontWeight: 600 }}>{q.number || "—"}</td>
                        <td style={{ fontSize: 11 }}>{q.date || "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          {q.consignee || "—"}
                        </td>
                        <td>{q.origin || "—"}</td>
                        <td>{q.destination || "—"}</td>
                        <td style={{ fontWeight: 600 }}>
                          {q.totalCharge_IncomeDisplayValue || "—"}
                        </td>
                        <td>{q.customerReference || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
