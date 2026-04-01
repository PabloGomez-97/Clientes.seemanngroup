// src/components/shipsgo/ShipsGoTracking.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useAuditLog } from "../../hooks/useAuditLog";
import "./styles/Shipsgotracking.css";
import OceanShipmentDetail from "./shipsgo/OceanShipmentDetail";
import type {
  AirShipment,
  AirResponse,
  AirShipmentDetail,
  OceanShipment,
  OceanResponse,
} from "./shipsgo/types";
import {
  AIR_STATUS_LABELS,
  OCEAN_STATUS_LABELS,
  getStatusClass,
  formatDate,
  formatDateTime,
  getFlagUrl,
} from "./shipsgo/types";
import AirShipmentDetails from "./shipsgo/AirShipmentDetail";

type TabType = "air" | "ocean";

type DeleteTarget = {
  type: TabType;
  id: AirShipment["id"] | OceanShipment["id"];
  label: string;
};

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

export interface ShipsGoTrackingProps {
  /** Override the username used to filter shipments */
  filterUsername?: string;
  /** Custom callback for "new tracking" button (replaces default navigate) */
  onNewTracking?: (type: TabType) => void;
}

function ShipsGoTracking({
  filterUsername,
  onNewTracking,
}: ShipsGoTrackingProps = {}) {
  const { token, activeUsername } = useAuth();
  const navigate = useNavigate();
  const { registrarEvento } = useAuditLog();
  const effectiveUsername = filterUsername || activeUsername;

  const [activeTab, setActiveTab] = useState<TabType>("air");

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

  // Modal
  const [selectedAir, setSelectedAir] = useState<AirShipment | null>(null);
  const [selectedOcean, setSelectedOcean] = useState<OceanShipment | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Air map tokens: shipmentId -> map token string
  const [airMapTokens, setAirMapTokens] = useState<Record<number, string>>({});
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

  // Fetches
  const fetchAir = async () => {
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
  };

  const fetchOcean = async () => {
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
  };

  useEffect(() => {
    fetchAir();
    fetchOcean();
  }, []);

  // Fetch map tokens for air shipments (lazy, after userAir is populated)
  const fetchAirMapToken = useCallback(
    async (shipmentId: number) => {
      if (airMapTokens[shipmentId] !== undefined) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/shipsgo/shipments/${shipmentId}`,
        );
        if (!res.ok) return;
        const data: { shipment: AirShipmentDetail } = await res.json();
        const mapToken = data.shipment?.tokens?.map;
        if (mapToken) {
          setAirMapTokens((prev) => ({ ...prev, [shipmentId]: mapToken }));
        }
      } catch {
        // silently ignore – button simply won't show
      }
    },
    [airMapTokens],
  );

  useEffect(() => {
    for (const s of userAir) {
      if (airMapTokens[s.id] === undefined) {
        fetchAirMapToken(s.id);
      }
    }
  }, [userAir, fetchAirMapToken]);

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

  const closeModal = () => {
    setShowModal(false);
    setSelectedAir(null);
    setSelectedOcean(null);
  };

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
          closeModal();
        }
      } else {
        const deletedId = String(deleteTarget.id);
        setAllOceanShipments((prev) =>
          prev.filter((shipment) => String(shipment.id) !== deletedId),
        );

        if (selectedOcean && String(selectedOcean.id) === deletedId) {
          closeModal();
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

  const isLoading = activeTab === "air" ? airLoading : oceanLoading;
  const currentError = activeTab === "air" ? airError : oceanError;
  const refetchCurrent = activeTab === "air" ? fetchAir : fetchOcean;
  const currentShipments = activeTab === "air" ? userAir : userOcean;

  // ─── Render ───

  // Loading
  if (isLoading) {
    return (
      <div className="sg-wrapper">
        <div className="sg-container">
          <div className="sg-page-header">
            <div className="sg-page-header-left">
              <h1>Rastreo de envíos</h1>
              <p>{effectiveUsername}</p>
            </div>
          </div>
          <div className="sg-tabs">
            <button
              className={`sg-tab ${activeTab === "air" ? "sg-tab--active" : ""}`}
              onClick={() => setActiveTab("air")}
            >
              ✈️ Aéreo
            </button>
            <button
              className={`sg-tab ${activeTab === "ocean" ? "sg-tab--active" : ""}`}
              onClick={() => setActiveTab("ocean")}
            >
              🚢 Marítimo
            </button>
          </div>
          <div className="sg-loading">
            <div className="sg-spinner" />
            <p>
              Cargando envíos {activeTab === "air" ? "aéreos" : "marítimos"}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (currentError) {
    return (
      <div className="sg-wrapper">
        <div className="sg-container">
          <div className="sg-page-header">
            <div className="sg-page-header-left">
              <h1>Rastreo de envíos</h1>
              <p>{effectiveUsername}</p>
            </div>
          </div>
          <div className="sg-tabs">
            <button
              className={`sg-tab ${activeTab === "air" ? "sg-tab--active" : ""}`}
              onClick={() => setActiveTab("air")}
            >
              ✈️ Aéreo
            </button>
            <button
              className={`sg-tab ${activeTab === "ocean" ? "sg-tab--active" : ""}`}
              onClick={() => setActiveTab("ocean")}
            >
              🚢 Marítimo
            </button>
          </div>
          <div className="sg-error">
            <h4>Error</h4>
            <p>{currentError}</p>
            <button className="sg-error-btn" onClick={refetchCurrent}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty
  if (currentShipments.length === 0) {
    return (
      <div className="sg-wrapper">
        <div className="sg-container">
          <div className="sg-page-header">
            <div className="sg-page-header-left">
              <h1>Rastreo de envíos</h1>
              <p>{effectiveUsername}</p>
            </div>
          </div>
          <div className="sg-tabs">
            <button
              className={`sg-tab ${activeTab === "air" ? "sg-tab--active" : ""}`}
              onClick={() => setActiveTab("air")}
            >
              ✈️ Aéreo ({userAir.length})
            </button>
            <button
              className={`sg-tab ${activeTab === "ocean" ? "sg-tab--active" : ""}`}
              onClick={() => setActiveTab("ocean")}
            >
              🚢 Marítimo ({userOcean.length})
            </button>
          </div>
          <div className="sg-empty">
            <h3>
              Sin envíos {activeTab === "air" ? "aéreos" : "marítimos"}{" "}
              registrados
            </h3>
            <p>
              Comienza creando tu primer seguimiento de envío{" "}
              {activeTab === "air" ? "aéreo" : "marítimo"}.
            </p>
            <button
              className="sg-empty-btn"
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
      </div>
    );
  }

  // Main
  return (
    <div className="sg-wrapper">
      <div className="sg-container">
        {/* Header */}
        <div className="sg-page-header">
          <div className="sg-page-header-left">
            <h1>Rastreo de envíos</h1>
            <p>{effectiveUsername}</p>
          </div>
          <button
            className="sg-btn-new"
            onClick={() => {
              if (onNewTracking) {
                onNewTracking(activeTab);
              } else {
                navigate(
                  activeTab === "air" ? "/new-tracking" : "/new-ocean-tracking",
                );
              }
            }}
          >
            <span>+</span> Nuevo seguimiento
          </button>
        </div>

        {/* Tabs */}
        <div className="sg-tabs">
          <button
            className={`sg-tab ${activeTab === "air" ? "sg-tab--active" : ""}`}
            onClick={() => setActiveTab("air")}
          >
            ✈️ Aéreo ({userAir.length})
          </button>
          <button
            className={`sg-tab ${activeTab === "ocean" ? "sg-tab--active" : ""}`}
            onClick={() => setActiveTab("ocean")}
          >
            🚢 Marítimo ({userOcean.length})
          </button>
        </div>

        {/* === AIR TAB === */}
        {activeTab === "air" && (
          <>
            {/* Stats */}
            <div className="sg-stats">
              <div className="sg-stat-item">
                <div className="sg-stat-value">{airStats.total}</div>
                <div className="sg-stat-label">Total</div>
              </div>
              <div className="sg-stat-item">
                <div className="sg-stat-value">{airStats.inTransit}</div>
                <div className="sg-stat-label">En tránsito</div>
              </div>
              <div className="sg-stat-item">
                <div className="sg-stat-value">{airStats.delivered}</div>
                <div className="sg-stat-label">Entregados</div>
              </div>
              {airStats.delayed > 0 && (
                <div className="sg-stat-item">
                  <div className="sg-stat-value">{airStats.delayed}</div>
                  <div className="sg-stat-label">Con retraso</div>
                </div>
              )}
            </div>

            {/* Delay alerts */}
            {userAir.filter(isAirDelayed).map((s) => (
              <div key={`d-${s.id}`} className="sg-delay-banner">
                AWB <strong>{s.awb_number}</strong> — Envío con posible retraso.
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
                    <th>Etiquetas</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {userAir.map((s) => (
                    <tr key={s.id}>
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
                                  s.route.destination.location.country.code,
                                )}
                                alt=""
                                className="sg-location-flag"
                              />
                            </span>
                            <span className="sg-location-date">
                              {formatDate(s.route.destination.date_of_rcf)}
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
                      <td>
                        <span className="sg-date">
                          {formatDate(s.created_at)}
                        </span>
                      </td>
                      <td>
                        <div className="sg-row-actions">
                          <button
                            type="button"
                            className="sg-btn-view"
                            onClick={() => {
                              setSelectedAir(s);
                              setSelectedOcean(null);
                              setShowModal(true);
                            }}
                          >
                            Ver
                          </button>
                          {airMapTokens[s.id] && (
                            <a
                              className="sg-link-live"
                              href={`https://map.shipsgo.com/air/shipments/${s.id}?token=${airMapTokens[s.id]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Ver en vivo
                            </a>
                          )}
                          <button
                            type="button"
                            className="sg-btn-delete"
                            onClick={() =>
                              setDeleteTarget({
                                type: "air",
                                id: s.id,
                                label: `AWB ${s.awb_number}`,
                              })
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="sg-new-tracking-warning"
              style={{
                marginTop: "1rem",
                padding: "0.6rem 0.75rem",
                backgroundColor: "#fff8e1",
                borderLeft: "4px solid #f59e0b",
                color: "#92400e",
                borderRadius: "0.25rem",
                fontSize: "0.875rem",
              }}
            >
              ⚠️ Los seguimientos recién creados pueden tardar unos minutos en
              cargarse. Por favor, no volver a crear el mismo seguimiento.
            </div>
          </>
        )}

        {/* === OCEAN TAB === */}
        {activeTab === "ocean" && (
          <>
            {/* Stats */}
            <div className="sg-stats">
              <div className="sg-stat-item">
                <div className="sg-stat-value">{oceanStats.total}</div>
                <div className="sg-stat-label">Total</div>
              </div>
              <div className="sg-stat-item">
                <div className="sg-stat-value">{oceanStats.sailing}</div>
                <div className="sg-stat-label">Navegando</div>
              </div>
              <div className="sg-stat-item">
                <div className="sg-stat-value">{oceanStats.arrived}</div>
                <div className="sg-stat-label">Llegados</div>
              </div>
              {oceanStats.delayed > 0 && (
                <div className="sg-stat-item">
                  <div className="sg-stat-value">{oceanStats.delayed}</div>
                  <div className="sg-stat-label">Con retraso</div>
                </div>
              )}
            </div>

            {/* Delay alerts */}
            {userOcean.filter(isOceanDelayed).map((s) => (
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
                    <th>Etiquetas</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {userOcean.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className={getStatusClass(s.status)}>
                          {OCEAN_STATUS_LABELS[s.status] || s.status}
                        </span>
                      </td>
                      <td>
                        <div>
                          {s.container_number && (
                            <span className="sg-awb">{s.container_number}</span>
                          )}
                          {s.booking_number && (
                            <div
                              style={{ fontSize: "0.75rem", color: "#6b7280" }}
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
                                  s.route.port_of_loading.location.country.code,
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
                                  s.route.port_of_discharge.location.country
                                    .code,
                                )}
                                alt=""
                                className="sg-location-flag"
                              />
                            </span>
                            <span className="sg-location-date">
                              {formatDate(
                                s.route.port_of_discharge.date_of_discharge,
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
                      <td>
                        <span className="sg-date">
                          {formatDate(s.created_at)}
                        </span>
                      </td>
                      <td>
                        <div className="sg-row-actions">
                          <button
                            type="button"
                            className="sg-btn-view"
                            onClick={() => {
                              setSelectedOcean(s);
                              setSelectedAir(null);
                              setShowModal(true);
                            }}
                          >
                            Ver
                          </button>

                          {(s.container_number || s.booking_number) && (
                            <a
                              className="sg-link-live"
                              href={`https://shipsgo.com/live-map-container-tracking?query=${encodeURIComponent(
                                s.container_number || s.booking_number || "",
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Ver en vivo
                            </a>
                          )}
                          <button
                            type="button"
                            className="sg-btn-delete"
                            onClick={() =>
                              setDeleteTarget({
                                type: "ocean",
                                id: s.id,
                                label:
                                  s.container_number ||
                                  s.booking_number ||
                                  `Tracking ${s.id}`,
                              })
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="sg-new-tracking-warning"
              style={{
                marginTop: "1rem",
                padding: "0.6rem 0.75rem",
                backgroundColor: "#fff8e1",
                borderLeft: "4px solid #f59e0b",
                color: "#92400e",
                borderRadius: "0.25rem",
                fontSize: "0.875rem",
              }}
            >
              ⚠️ Los seguimientos recién creados pueden tardar unos minutos en
              cargarse. Por favor, no volver a crear el mismo seguimiento.
            </div>
          </>
        )}
      </div>

      {/* ═══ Air Detail Panel ═══ */}
      {showModal && selectedAir && (
        <AirShipmentDetails shipment={selectedAir} onClose={closeModal} />
      )}

      {/* ═══ Ocean Detail Panel ═══ */}
      {showModal && selectedOcean && (
        <OceanShipmentDetail shipment={selectedOcean} onClose={closeModal} />
      )}

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
