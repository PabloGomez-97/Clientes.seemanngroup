// src/components/shipsgo/ShipsGoTracking.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuditLog } from "@/hooks/useAuditLog";
import "@/components/cliente/styles/Shipsgotracking.css";
import OceanShipmentDetail from "./shipsgo/OceanShipmentDetail";
import type {
  AirShipment,
  AirResponse,
  OceanShipment,
  OceanResponse,
} from "./shipsgo/types";
import {
  AIR_STATUS_LABELS,
  OCEAN_STATUS_LABELS,
  getStatusClass,
  formatDate,
  getFlagUrl,
} from "./shipsgo/types";
import AirShipmentDetails from "./shipsgo/AirShipmentDetail";
import ShipsGoEmbed from "./shipsgo/ShipsGoEmbed";
import {
  type ShipsGoOpenTrackingTarget,
  type ShipsGoTrackingLocationState,
  buildOpenTrackingTargetFromPath,
  buildShipsgoTrackingPath,
  matchesAirOpenTrackingTarget,
  matchesOceanOpenTrackingTarget,
} from "@/services/shipsgoTrackingNavigation";
import { clearRouterLocationState } from "@/lib/notification-navigation";

type TabType = "air" | "ocean";

type DeleteTarget = {
  type: TabType;
  id: AirShipment["id"] | OceanShipment["id"];
  label: string;
};

type AirFilterKey = "inTransit" | "delivered" | "delayed";
type OceanFilterKey = "sailing" | "arrived" | "delayed";

type StatusChipTone = "transit" | "done" | "delayed" | "neutral";

type StatusChipDef = {
  key: string;
  label: string;
  count: number;
  tone: StatusChipTone;
};

interface TrackingStatusStripProps {
  chips: StatusChipDef[];
  activeKey: string | null;
  onToggle: (key: string) => void;
  ariaLabel: string;
}

function TrackingStatusStrip({
  chips,
  activeKey,
  onToggle,
  ariaLabel,
}: TrackingStatusStripProps) {
  const barTotal = chips.reduce((sum, chip) => sum + chip.count, 0);

  return (
    <section className="sg-status-strip" aria-label={ariaLabel}>
      {barTotal > 0 && (
        <div className="sg-status-bar" role="presentation">
          {chips.map((chip) =>
            chip.count > 0 ? (
              <div
                key={chip.key}
                className={`sg-status-bar__segment sg-status-bar__segment--${chip.tone}`}
                style={{ flexGrow: chip.count }}
              />
            ) : null,
          )}
        </div>
      )}
      <div className="sg-status-chips">
        {chips.map((chip) => {
          const isActive = activeKey === chip.key;
          const delayedAccent = chip.tone === "delayed" && chip.count > 0;
          return (
            <button
              key={chip.key}
              type="button"
              className={[
                "sg-status-chip",
                isActive ? "sg-status-chip--active" : "",
                delayedAccent ? "sg-status-chip--delayed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={isActive}
              onClick={() => onToggle(chip.key)}
            >
              <span
                className={`sg-status-chip__dot sg-status-chip__dot--${chip.tone}`}
              />
              <span className="sg-status-chip__label">{chip.label}</span>
              <span className="sg-status-chip__count">{chip.count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

export interface ShipsGoTrackingProps {
  /** Override the username used to filter shipments */
  filterUsername?: string;
  /** Custom callback for "new tracking" button (replaces default navigate) */
  onNewTracking?: (type: TabType) => void;
  /** Which tab to open initially: "air" (default) or "ocean" */
  initialTab?: TabType;
  /** Abrir un tracking concreto tras cargar la lista (reportería embebida) */
  initialOpenTracking?: ShipsGoOpenTrackingTarget | null;
  /** Se invoca cuando ya se aplicó initialOpenTracking */
  onOpenTrackingConsumed?: () => void;
}

function ShipsGoTracking({
  filterUsername,
  onNewTracking,
  initialTab = "air",
  initialOpenTracking = null,
  onOpenTrackingConsumed,
}: ShipsGoTrackingProps = {}) {
  const { token, activeUsername } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackingIdentifier } = useParams<{
    trackingIdentifier?: string;
  }>();
  const { registrarEvento } = useAuditLog();
  const effectiveUsername = filterUsername || activeUsername;
  const consumedEmbeddedOpenRef = useRef(false);
  const consumedLocationOpenRef = useRef(false);

  const locationState = location.state as ShipsGoTrackingLocationState | null;
  const deepLinkTracking = useMemo(
    () => buildOpenTrackingTargetFromPath(initialTab, trackingIdentifier),
    [initialTab, trackingIdentifier],
  );
  const pendingOpenTracking =
    initialOpenTracking ??
    deepLinkTracking ??
    locationState?.openTracking ??
    null;
  const pendingOpenTab =
    pendingOpenTracking?.mode ??
    locationState?.openTab ??
    initialTab;

  const [activeTab, setActiveTab] = useState<TabType>(pendingOpenTab);

  // Air state
  const [allAirShipments, setAllAirShipments] = useState<AirShipment[]>([]);
  const [airLoading, setAirLoading] = useState(true);
  const [airError, setAirError] = useState<string | null>(null);

  // Ocean state
  const [allOceanShipments, setAllOceanShipments] = useState<OceanShipment[]>(
    [],
  );
  const [oceanLoading, setOceanLoading] = useState(true);
  const [oceanError, setOceanError] = useState<string | null>(null);

  // Inline selection (split panel, no modal)
  const [selectedAir, setSelectedAir] = useState<AirShipment | null>(null);
  const [selectedOcean, setSelectedOcean] = useState<OceanShipment | null>(
    null,
  );
  const [deepLinkNotFound, setDeepLinkNotFound] = useState(false);
  const [airExpanded, setAirExpanded] = useState(false);
  const [oceanExpanded, setOceanExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [airStatusFilter, setAirStatusFilter] = useState<AirFilterKey | null>(
    null,
  );
  const [oceanStatusFilter, setOceanStatusFilter] =
    useState<OceanFilterKey | null>(null);
  const userAir = useMemo(() => {
    if (!effectiveUsername) return [];
    return allAirShipments.filter(
      (s) => s.reference !== null && s.reference === effectiveUsername,
    );
  }, [allAirShipments, effectiveUsername]);

  const userOcean = useMemo(() => {
    if (!effectiveUsername) return [];
    return allOceanShipments.filter(
      (s) => s.reference !== null && s.reference === effectiveUsername,
    );
  }, [allOceanShipments, effectiveUsername]);

  // Stats
  const airStats = useMemo(
    () => ({
      total: userAir.length,
      inTransit: userAir.filter((s) => s.status === "EN_ROUTE").length,
      delivered: userAir.filter(
        (s) => s.status === "DELIVERED" || s.status === "LANDED",
      ).length,
      delayed: userAir.filter(isAirDelayed).length,
    }),
    [userAir],
  );

  const oceanStats = useMemo(
    () => ({
      total: userOcean.length,
      sailing: userOcean.filter((s) => s.status === "SAILING").length,
      arrived: userOcean.filter(
        (s) => s.status === "ARRIVED" || s.status === "DISCHARGED",
      ).length,
      delayed: userOcean.filter(isOceanDelayed).length,
    }),
    [userOcean],
  );

  const showAirTagsColumn = useMemo(
    () => userAir.some((s) => s.tags.length > 0),
    [userAir],
  );

  const showOceanTagsColumn = useMemo(
    () => userOcean.some((s) => s.tags.length > 0),
    [userOcean],
  );

  // Fetches
  const fetchAir = useCallback(async () => {
    setAirLoading(true);
    setAirError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shipsgo/shipments`);
      if (!res.ok) throw new Error("Error al obtener envíos aéreos");
      const data: AirResponse = await res.json();
      setAllAirShipments(
        data.shipments.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    } catch (err) {
      setAirError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setAirLoading(false);
    }
  }, []);

  const fetchOcean = useCallback(async () => {
    setOceanLoading(true);
    setOceanError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shipsgo/ocean/shipments`);
      if (!res.ok) throw new Error("Error al obtener envíos marítimos");
      const data: OceanResponse = await res.json();
      setAllOceanShipments(
        data.shipments.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    } catch (err) {
      setOceanError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setOceanLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!effectiveUsername) {
      setAllAirShipments([]);
      setAllOceanShipments([]);
      setAirLoading(false);
      setOceanLoading(false);
      return;
    }
    void fetchAir();
    void fetchOcean();
  }, [effectiveUsername, fetchAir, fetchOcean]);

  useEffect(() => {
    const tabIntent =
      initialOpenTracking?.mode ??
      deepLinkTracking?.mode ??
      locationState?.openTracking?.mode ??
      locationState?.openTab;
    if (tabIntent) {
      setActiveTab(tabIntent);
    }
  }, [
    initialOpenTracking?.mode,
    deepLinkTracking?.mode,
    locationState?.openTracking?.mode,
    locationState?.openTab,
  ]);

  useEffect(() => {
    setDeepLinkNotFound(false);
  }, [trackingIdentifier]);

  useEffect(() => {
    consumedEmbeddedOpenRef.current = false;
  }, [initialOpenTracking]);

  useEffect(() => {
    consumedLocationOpenRef.current = false;
  }, [locationState?.openTracking]);

  useEffect(() => {
    if (!pendingOpenTracking) return;

    if (pendingOpenTracking.mode === "air") {
      if (airLoading || airError) return;
      const match = userAir.find((shipment) =>
        matchesAirOpenTrackingTarget(shipment.awb_number, pendingOpenTracking),
      );
      if (!match) {
        if (deepLinkTracking) setDeepLinkNotFound(true);
        return;
      }

      setDeepLinkNotFound(false);
      setSelectedOcean(null);
      setSelectedAir(match);
      setActiveTab("air");

      if (initialOpenTracking && !consumedEmbeddedOpenRef.current) {
        consumedEmbeddedOpenRef.current = true;
        onOpenTrackingConsumed?.();
      }
      if (locationState?.openTracking && !consumedLocationOpenRef.current) {
        consumedLocationOpenRef.current = true;
        clearRouterLocationState(navigate, location);
      }
      return;
    }

    if (oceanLoading || oceanError) return;
    const match = userOcean.find((shipment) =>
      matchesOceanOpenTrackingTarget(shipment, pendingOpenTracking),
    );
    if (!match) {
      if (deepLinkTracking) setDeepLinkNotFound(true);
      return;
    }

    setDeepLinkNotFound(false);
    setSelectedAir(null);
    setSelectedOcean(match);
    setActiveTab("ocean");

    if (initialOpenTracking && !consumedEmbeddedOpenRef.current) {
      consumedEmbeddedOpenRef.current = true;
      onOpenTrackingConsumed?.();
    }
    if (locationState?.openTracking && !consumedLocationOpenRef.current) {
      consumedLocationOpenRef.current = true;
      clearRouterLocationState(navigate, location);
    }
  }, [
    pendingOpenTracking,
    deepLinkTracking,
    airLoading,
    airError,
    oceanLoading,
    oceanError,
    userAir,
    userOcean,
    initialOpenTracking,
    locationState?.openTracking,
    location,
    navigate,
    onOpenTrackingConsumed,
  ]);

  function getOceanEmbedQuery(shipment: OceanShipment): string {
    return (
      shipment.container_number?.trim() ||
      shipment.booking_number?.trim() ||
      ""
    );
  }

  const isStandaloneTrackingRoute = location.pathname.startsWith("/trackings");
  const trackingBasePath = (tab: TabType) =>
    tab === "air" ? "/trackings-aereo" : "/trackings-maritimo";

  const clearSelection = () => {
    setSelectedAir(null);
    setSelectedOcean(null);
    setDeepLinkNotFound(false);
    if (trackingIdentifier && isStandaloneTrackingRoute) {
      navigate(trackingBasePath(activeTab), { replace: true });
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setDeepLinkNotFound(false);
    if (tab === "air") {
      setSelectedOcean(null);
      setOceanStatusFilter(null);
    } else {
      setSelectedAir(null);
      setAirStatusFilter(null);
    }
    if (trackingIdentifier && isStandaloneTrackingRoute) {
      navigate(trackingBasePath(tab), { replace: true });
    }
  };

  const selectAirShipment = (shipment: AirShipment) => {
    setSelectedAir(shipment);
    setSelectedOcean(null);
    setDeepLinkNotFound(false);
    if (isStandaloneTrackingRoute) {
      navigate(buildShipsgoTrackingPath("air", shipment.awb_number));
    }
  };

  const selectOceanShipment = (shipment: OceanShipment) => {
    setSelectedOcean(shipment);
    setSelectedAir(null);
    setDeepLinkNotFound(false);
    if (isStandaloneTrackingRoute) {
      const identifier = getOceanEmbedQuery(shipment);
      if (identifier) {
        navigate(buildShipsgoTrackingPath("ocean", identifier));
      }
    }
  };

  function isAirDelayed(s: AirShipment): boolean {
    if (!s.route) return false;
    const { transit_percentage } = s.route;
    const eta = s.route.destination.date_of_rcf;
    if (!eta || transit_percentage >= 100) return false;
    return new Date(s.updated_at) >= new Date(eta) && transit_percentage < 100;
  }

  function isOceanDelayed(s: OceanShipment): boolean {
    if (!s.route) return false;
    const { transit_percentage } = s.route;
    const eta = s.route.port_of_discharge.date_of_discharge;
    if (!eta || transit_percentage >= 100) return false;
    return new Date(s.updated_at) >= new Date(eta) && transit_percentage < 100;
  }

  const matchesAirFilter = useCallback(
    (shipment: AirShipment, filter: AirFilterKey) => {
      switch (filter) {
        case "inTransit":
          return shipment.status === "EN_ROUTE";
        case "delivered":
          return (
            shipment.status === "DELIVERED" || shipment.status === "LANDED"
          );
        case "delayed":
          return isAirDelayed(shipment);
        default:
          return true;
      }
    },
    [],
  );

  const matchesOceanFilter = useCallback(
    (shipment: OceanShipment, filter: OceanFilterKey) => {
      switch (filter) {
        case "sailing":
          return shipment.status === "SAILING";
        case "arrived":
          return (
            shipment.status === "ARRIVED" || shipment.status === "DISCHARGED"
          );
        case "delayed":
          return isOceanDelayed(shipment);
        default:
          return true;
      }
    },
    [],
  );

  const filteredUserAir = useMemo(() => {
    if (!airStatusFilter) return userAir;
    return userAir.filter((shipment) =>
      matchesAirFilter(shipment, airStatusFilter),
    );
  }, [userAir, airStatusFilter, matchesAirFilter]);

  const filteredUserOcean = useMemo(() => {
    if (!oceanStatusFilter) return userOcean;
    return userOcean.filter((shipment) =>
      matchesOceanFilter(shipment, oceanStatusFilter),
    );
  }, [userOcean, oceanStatusFilter, matchesOceanFilter]);

  const airStatusChips = useMemo<StatusChipDef[]>(
    () => [
      {
        key: "inTransit",
        label: "En tránsito",
        count: airStats.inTransit,
        tone: "transit",
      },
      {
        key: "delivered",
        label: "Entregados",
        count: airStats.delivered,
        tone: "done",
      },
      {
        key: "delayed",
        label: "Demorados",
        count: airStats.delayed,
        tone: "delayed",
      },
    ],
    [airStats],
  );

  const oceanStatusChips = useMemo<StatusChipDef[]>(
    () => [
      {
        key: "sailing",
        label: "Navegando",
        count: oceanStats.sailing,
        tone: "transit",
      },
      {
        key: "arrived",
        label: "Llegados",
        count: oceanStats.arrived,
        tone: "done",
      },
      {
        key: "delayed",
        label: "Demorados",
        count: oceanStats.delayed,
        tone: "delayed",
      },
    ],
    [oceanStats],
  );

  const handleAirStatusToggle = useCallback((key: string) => {
    setAirStatusFilter((prev) =>
      prev === key ? null : (key as AirFilterKey),
    );
  }, []);

  const handleOceanStatusToggle = useCallback((key: string) => {
    setOceanStatusFilter((prev) =>
      prev === key ? null : (key as OceanFilterKey),
    );
  }, []);

  const closeDeleteDialog = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleDeleteShipment = async () => {
    if (!deleteTarget) return;

    if (!token) {
      setDeleteError("No hay una sesión activa para eliminar el tracking.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const endpoint =
        deleteTarget.type === "air"
          ? `${API_BASE_URL}/api/shipsgo/shipments/${encodeURIComponent(String(deleteTarget.id))}`
          : `${API_BASE_URL}/api/shipsgo/ocean/shipments/${encodeURIComponent(String(deleteTarget.id))}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar el tracking.");
      }

      const tipoTracking = deleteTarget.type === "air" ? "aéreo" : "marítimo";
      registrarEvento({
        accion: "TRACKING_ELIMINADO",
        categoria: "TRACKING",
        descripcion: `Tracking ${tipoTracking} eliminado: ${deleteTarget.label}`,
        detalles: {
          tipo: deleteTarget.type,
          shipmentId: String(deleteTarget.id),
          label: deleteTarget.label,
          cuenta: effectiveUsername,
        },
        clienteAfectado: effectiveUsername || undefined,
      });

      if (deleteTarget.type === "air") {
        const deletedId = String(deleteTarget.id);
        setAllAirShipments((prev) =>
          prev.filter((shipment) => String(shipment.id) !== deletedId),
        );

        if (selectedAir && String(selectedAir.id) === deletedId) {
          clearSelection();
        }
      } else {
        const deletedId = String(deleteTarget.id);
        setAllOceanShipments((prev) =>
          prev.filter((shipment) => String(shipment.id) !== deletedId),
        );

        if (selectedOcean && String(selectedOcean.id) === deletedId) {
          clearSelection();
        }
      }

      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "No se pudo eliminar el tracking.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Render ───

  // Main
  return (
    <div className="sg-wrapper sg-wrapper--fluid">
      <div className="sg-container sg-container--fluid">
        {/* Header */}
        <div className="sg-page-header">
          <div className="sg-page-header-left">
            <h1>Rastreo de envíos</h1>
            <p>{effectiveUsername}</p>
          </div>
          <div className="sg-page-header-actions">
            <button
              className="sg-error-btn"
              type="button"
              onClick={() => {
                void fetchAir();
                void fetchOcean();
              }}
              title="Vuelve a consultar Shipsgo"
            >
              Actualizar
            </button>
            <button
              className="sg-btn-new"
              onClick={() => {
                if (onNewTracking) {
                  onNewTracking(activeTab);
                } else {
                  navigate(
                    activeTab === "air"
                      ? "/new-tracking"
                      : "/new-ocean-tracking",
                  );
                }
              }}
            >
              <span>+</span> Nuevo seguimiento
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="sg-tabs">
          <button
            className={`sg-tab ${activeTab === "air" ? "sg-tab--active" : ""}`}
            onClick={() => handleTabChange("air")}
          >
            ✈️ Aéreo ({userAir.length})
          </button>
          <button
            className={`sg-tab ${activeTab === "ocean" ? "sg-tab--active" : ""}`}
            onClick={() => handleTabChange("ocean")}
          >
            🚢 Marítimo ({userOcean.length})
          </button>
        </div>

        {deepLinkNotFound && trackingIdentifier && (
          <div className="sg-deep-link-notice" role="status">
            <div>
              <strong>Embarque no encontrado</strong>
              <p>
                No encontramos <b>{trackingIdentifier}</b> entre los embarques
                asociados a tu cuenta.
              </p>
            </div>
            <button type="button" onClick={clearSelection}>
              Ver todos
            </button>
          </div>
        )}

        {/* === AIR TAB === */}
        {activeTab === "air" && (
          <>
            {airLoading ? (
              <div className="sg-loading">
                <div className="sg-spinner" />
                <p>Cargando envíos aéreos...</p>
              </div>
            ) : airError ? (
              <div className="sg-error">
                <h4>Error</h4>
                <p>{airError}</p>
                <button
                  className="sg-error-btn"
                  type="button"
                  onClick={() => void fetchAir()}
                >
                  Reintentar
                </button>
              </div>
            ) : userAir.length === 0 ? (
              <div className="sg-empty-state">
                <span className="sg-empty-state-icon">✈️</span>
                <h3 className="sg-empty-state-heading">
                  No tienes envíos registrados
                </h3>
                <p className="sg-empty-state-text">
                  Agrega un nuevo seguimiento para comenzar a rastrear tus
                  envíos.
                </p>
                <button
                  className="sg-btn-new"
                  onClick={() => {
                    if (onNewTracking) {
                      onNewTracking("air");
                    } else {
                      navigate("/new-tracking");
                    }
                  }}
                >
                  <span>+</span> Nuevo seguimiento
                </button>
              </div>
            ) : (
              <>
                <TrackingStatusStrip
                  chips={airStatusChips}
                  activeKey={airStatusFilter}
                  onToggle={handleAirStatusToggle}
                  ariaLabel="Resumen de envíos aéreos"
                />

                <div
                  className={`sg-split-view${selectedAir ? " sg-split-view--active" : ""}`}
                >
                  <div className="sg-split-list">
                {airStatusFilter && filteredUserAir.length === 0 && (
                  <div className="sg-filter-empty">
                    <p>No hay envíos en este estado.</p>
                    <button
                      type="button"
                      className="sg-filter-empty-btn"
                      onClick={() => setAirStatusFilter(null)}
                    >
                      Ver todos
                    </button>
                  </div>
                )}

                {filteredUserAir.length > 0 && (
                  <>
                {/* Delay alerts */}
                {filteredUserAir.filter(isAirDelayed).map((s) => (
                  <div key={`d-${s.id}`} className="sg-delay-banner">
                    AWB <strong>{s.awb_number}</strong> — Envío con posible
                    retraso.
                  </div>
                ))}

                {/* Table */}
                <div className="sg-table-wrapper">
                  <table className="sg-table">
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>AWB</th>
                        <th>Aerolínea</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th>Progreso</th>
                        {showAirTagsColumn && <th>Etiquetas</th>}
                        <th>Fecha</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(airExpanded
                        ? filteredUserAir
                        : filteredUserAir.slice(0, 10)
                      ).map(
                        (s) => (
                          <tr
                            key={s.id}
                            className={
                              selectedAir?.id === s.id
                                ? "sg-table-row--selected"
                                : undefined
                            }
                            onClick={() => {
                              if (selectedAir?.id === s.id) {
                                clearSelection();
                                return;
                              }
                              selectAirShipment(s);
                            }}
                          >
                            <td>
                              <span className={getStatusClass(s.status)}>
                                {AIR_STATUS_LABELS[s.status] || s.status}
                              </span>
                            </td>
                            <td>
                              <span className="sg-awb">{s.awb_number}</span>
                            </td>
                            <td>
                              <span className="sg-airline">
                                {s.airline?.name || "—"}
                              </span>
                            </td>
                            <td>
                              {s.route ? (
                                <div className="sg-location">
                                  <span className="sg-location-code">
                                    {s.route.origin.location.iata}
                                    <img
                                      src={getFlagUrl(
                                        s.route.origin.location.country.code,
                                      )}
                                      alt=""
                                      className="sg-location-flag"
                                    />
                                  </span>
                                  <span className="sg-location-date">
                                    {formatDate(s.route.origin.date_of_dep)}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {s.route ? (
                                <div className="sg-location">
                                  <span className="sg-location-code">
                                    {s.route.destination.location.iata}
                                    <img
                                      src={getFlagUrl(
                                        s.route.destination.location.country
                                          .code,
                                      )}
                                      alt=""
                                      className="sg-location-flag"
                                    />
                                  </span>
                                  <span className="sg-location-date">
                                    {formatDate(
                                      s.route.destination.date_of_rcf,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {s.route ? (
                                <div className="sg-progress-cell">
                                  <div className="sg-progress-bar">
                                    <div
                                      className={`sg-progress-fill ${s.route.transit_percentage === 100 ? "sg-progress-fill--done" : ""}`}
                                      style={{
                                        width: `${s.route.transit_percentage}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="sg-progress-pct">
                                    {s.route.transit_percentage}%
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            {showAirTagsColumn && (
                              <td>
                                {s.tags.length > 0 ? (
                                  <div className="sg-tags">
                                    {s.tags.map((t) => (
                                      <span key={t.id} className="sg-tag">
                                        {t.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            )}
                            <td>
                              <span className="sg-date">
                                {formatDate(s.created_at)}
                              </span>
                            </td>
                            <td>
                              <div
                                className="sg-row-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="sg-btn-delete-icon"
                                  title="Eliminar seguimiento"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({
                                      type: "air",
                                      id: s.id,
                                      label: `AWB ${s.awb_number}`,
                                    });
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredUserAir.length > 10 && (
                  <div className="sg-show-more">
                    <button
                      type="button"
                      className="sg-btn-show-more"
                      onClick={() => setAirExpanded((v) => !v)}
                    >
                      {airExpanded
                        ? `Ver menos ▲`
                        : `Ver más (${filteredUserAir.length - 10} restantes) ▼`}
                    </button>
                  </div>
                )}
                  </>
                )}
                <div className="sg-new-tracking-warning">
                  ⚠️ Los seguimientos recién creados pueden tardar unos minutos
                  en cargarse. Por favor, no volver a crear el mismo
                  seguimiento.
                </div>
                  </div>

                  {selectedAir && (
                    <aside className="sg-split-detail">
                      <div className="sg-split-detail-map">
                        <ShipsGoEmbed
                          transport="air"
                          query={selectedAir.awb_number}
                        />
                      </div>
                      <div className="sg-split-detail-info">
                        <AirShipmentDetails
                          layout="panel"
                          shipment={selectedAir}
                          onClose={clearSelection}
                        />
                      </div>
                    </aside>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* === OCEAN TAB === */}
        {activeTab === "ocean" && (
          <>
            {oceanLoading ? (
              <div className="sg-loading">
                <div className="sg-spinner" />
                <p>Cargando envíos marítimos...</p>
              </div>
            ) : oceanError ? (
              <div className="sg-error">
                <h4>Error</h4>
                <p>{oceanError}</p>
                <button
                  className="sg-error-btn"
                  type="button"
                  onClick={() => void fetchOcean()}
                >
                  Reintentar
                </button>
              </div>
            ) : userOcean.length === 0 ? (
              <div className="sg-empty-state">
                <span className="sg-empty-state-icon">🚢</span>
                <h3 className="sg-empty-state-heading">
                  No tienes envíos registrados
                </h3>
                <p className="sg-empty-state-text">
                  Agrega un nuevo seguimiento para comenzar a rastrear tus
                  envíos.
                </p>
                <button
                  className="sg-btn-new"
                  onClick={() => {
                    if (onNewTracking) {
                      onNewTracking("ocean");
                    } else {
                      navigate("/new-ocean-tracking");
                    }
                  }}
                >
                  <span>+</span> Nuevo seguimiento
                </button>
              </div>
            ) : (
              <>
                <TrackingStatusStrip
                  chips={oceanStatusChips}
                  activeKey={oceanStatusFilter}
                  onToggle={handleOceanStatusToggle}
                  ariaLabel="Resumen de envíos marítimos"
                />

                <div
                  className={`sg-split-view${selectedOcean ? " sg-split-view--active" : ""}`}
                >
                  <div className="sg-split-list">
                {oceanStatusFilter && filteredUserOcean.length === 0 && (
                  <div className="sg-filter-empty">
                    <p>No hay envíos en este estado.</p>
                    <button
                      type="button"
                      className="sg-filter-empty-btn"
                      onClick={() => setOceanStatusFilter(null)}
                    >
                      Ver todos
                    </button>
                  </div>
                )}

                {filteredUserOcean.length > 0 && (
                  <>
                {/* Delay alerts */}
                {filteredUserOcean.filter(isOceanDelayed).map((s) => (
                  <div key={`d-${s.id}`} className="sg-delay-banner">
                    {s.container_number
                      ? `Container ${s.container_number}`
                      : `Booking ${s.booking_number}`}{" "}
                    — Envío con posible retraso.
                  </div>
                ))}
                {/* Table */}
                <div className="sg-table-wrapper">
                  <table className="sg-table">
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Container / Booking</th>
                        <th>Naviera</th>
                        <th>Puerto Carga</th>
                        <th>Puerto Descarga</th>
                        <th>Progreso</th>
                        {showOceanTagsColumn && <th>Etiquetas</th>}
                        <th>Fecha</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(oceanExpanded
                        ? filteredUserOcean
                        : filteredUserOcean.slice(0, 10)
                      ).map(
                        (s) => (
                          <tr
                            key={s.id}
                            className={
                              selectedOcean?.id === s.id
                                ? "sg-table-row--selected"
                                : undefined
                            }
                            onClick={() => {
                              if (selectedOcean?.id === s.id) {
                                clearSelection();
                                return;
                              }
                              selectOceanShipment(s);
                            }}
                          >
                            <td>
                              <span className={getStatusClass(s.status)}>
                                {OCEAN_STATUS_LABELS[s.status] || s.status}
                              </span>
                            </td>
                            <td>
                              <div>
                                {s.container_number && (
                                  <span className="sg-awb">
                                    {s.container_number}
                                  </span>
                                )}
                                {s.booking_number && (
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#6b7280",
                                    }}
                                  >
                                    {s.booking_number}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="sg-airline">
                                {s.carrier?.name || "—"}
                              </span>
                            </td>
                            <td>
                              {s.route ? (
                                <div className="sg-location">
                                  <span className="sg-location-code">
                                    {s.route.port_of_loading.location.code}
                                    <img
                                      src={getFlagUrl(
                                        s.route.port_of_loading.location.country
                                          .code,
                                      )}
                                      alt=""
                                      className="sg-location-flag"
                                    />
                                  </span>
                                  <span className="sg-location-date">
                                    {formatDate(
                                      s.route.port_of_loading.date_of_loading,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {s.route ? (
                                <div className="sg-location">
                                  <span className="sg-location-code">
                                    {s.route.port_of_discharge.location.code}
                                    <img
                                      src={getFlagUrl(
                                        s.route.port_of_discharge.location
                                          .country.code,
                                      )}
                                      alt=""
                                      className="sg-location-flag"
                                    />
                                  </span>
                                  <span className="sg-location-date">
                                    {formatDate(
                                      s.route.port_of_discharge
                                        .date_of_discharge,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {s.route ? (
                                <div className="sg-progress-cell">
                                  <div className="sg-progress-bar">
                                    <div
                                      className={`sg-progress-fill ${s.route.transit_percentage === 100 ? "sg-progress-fill--done" : ""}`}
                                      style={{
                                        width: `${s.route.transit_percentage}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="sg-progress-pct">
                                    {s.route.transit_percentage}%
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            {showOceanTagsColumn && (
                              <td>
                                {s.tags.length > 0 ? (
                                  <div className="sg-tags">
                                    {s.tags.map((t) => (
                                      <span key={t.id} className="sg-tag">
                                        {t.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            )}
                            <td>
                              <span className="sg-date">
                                {formatDate(s.created_at)}
                              </span>
                            </td>
                            <td>
                              <div
                                className="sg-row-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="sg-btn-delete-icon"
                                  title="Eliminar seguimiento"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({
                                      type: "ocean",
                                      id: s.id,
                                      label:
                                        s.container_number ||
                                        s.booking_number ||
                                        `Tracking ${s.id}`,
                                    });
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredUserOcean.length > 10 && (
                  <div className="sg-show-more">
                    <button
                      type="button"
                      className="sg-btn-show-more"
                      onClick={() => setOceanExpanded((v) => !v)}
                    >
                      {oceanExpanded
                        ? `Ver menos ▲`
                        : `Ver más (${filteredUserOcean.length - 10} restantes) ▼`}
                    </button>
                  </div>
                )}
                  </>
                )}
                <div className="sg-new-tracking-warning">
                  ⚠️ Los seguimientos recién creados pueden tardar unos minutos
                  en cargarse. Por favor, no volver a crear el mismo
                  seguimiento.
                </div>
                  </div>

                  {selectedOcean && (
                    <aside className="sg-split-detail">
                      <div className="sg-split-detail-map">
                        <ShipsGoEmbed
                          transport="ocean"
                          query={getOceanEmbedQuery(selectedOcean)}
                        />
                      </div>
                      <div className="sg-split-detail-info">
                        <OceanShipmentDetail
                          layout="panel"
                          shipment={selectedOcean}
                          onClose={clearSelection}
                        />
                      </div>
                    </aside>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <div className="sg-modal-overlay" onClick={closeDeleteDialog}>
          <div
            className="sg-modal sg-modal--confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sg-modal-header">
              <h3>Eliminar seguimiento</h3>
              <button
                type="button"
                className="sg-modal-close"
                onClick={closeDeleteDialog}
                disabled={deleteLoading}
              >
                ×
              </button>
            </div>
            <div className="sg-modal-body">
              <p className="sg-confirm-copy">
                ¿Está seguro de eliminar este seguimiento?
              </p>
              <div className="sg-confirm-target">{deleteTarget.label}</div>
              {deleteError && (
                <div className="sg-confirm-error">{deleteError}</div>
              )}
            </div>
            <div className="sg-modal-footer sg-modal-footer--confirm">
              <button
                type="button"
                className="sg-btn-secondary"
                onClick={closeDeleteDialog}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sg-btn-delete"
                onClick={handleDeleteShipment}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Eliminando..." : "Eliminar seguimiento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShipsGoTracking;
