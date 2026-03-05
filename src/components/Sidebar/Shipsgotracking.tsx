// src/components/shipsgo/ShipsGoTracking.tsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./styles/Shipsgotracking.css";
import AirShipmentDetail from "./shipsgo/AirShipmentDetail";
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
  formatDateTime,
  getFlagUrl,
} from "./shipsgo/types";

type TabType = "air" | "ocean";

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

function ShipsGoTracking() {
  const { user, activeUsername } = useAuth();
  const navigate = useNavigate();

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

  // Filtered by active user
  const userAir = useMemo(() => {
    if (!activeUsername) return [];
    return allAirShipments.filter(
      (s) => s.reference !== null && s.reference === activeUsername,
    );
  }, [allAirShipments, activeUsername]);

  const userOcean = useMemo(() => {
    if (!activeUsername) return [];
    return allOceanShipments.filter(
      (s) => s.reference !== null && s.reference === activeUsername,
    );
  }, [allOceanShipments, activeUsername]);

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
              <p>{activeUsername}</p>
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
              <p>{activeUsername}</p>
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
              <p>{activeUsername}</p>
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
              onClick={() =>
                navigate(
                  activeTab === "air" ? "/new-tracking" : "/new-ocean-tracking",
                )
              }
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
            <p>{activeUsername}</p>
          </div>
          <button
            className="sg-btn-new"
            onClick={() =>
              navigate(
                activeTab === "air" ? "/new-tracking" : "/new-ocean-tracking",
              )
            }
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
                        <button
                          className="sg-btn-view"
                          onClick={() => {
                            setSelectedAir(s);
                            setSelectedOcean(null);
                            setShowModal(true);
                          }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                        <button
                          className="sg-btn-view"
                          onClick={() => {
                            setSelectedOcean(s);
                            setSelectedAir(null);
                            setShowModal(true);
                          }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ═══ Air Detail Panel ═══ */}
      {showModal && selectedAir && (
        <AirShipmentDetail shipment={selectedAir} onClose={closeModal} />
      )}

      {/* ═══ Ocean Detail Modal ═══ */}
      {showModal && selectedOcean && (
        <div className="sg-modal-overlay" onClick={closeModal}>
          <div className="sg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sg-modal-header">
              <h3>
                🚢{" "}
                {selectedOcean.container_number ||
                  selectedOcean.booking_number ||
                  "Envío Marítimo"}
              </h3>
              <button className="sg-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="sg-modal-body">
              <div className="sg-detail-section">
                <div className="sg-detail-title">Información general</div>
                <div className="sg-detail-grid">
                  <div className="sg-detail-item">
                    <label>Referencia</label>
                    <span>{selectedOcean.reference || "—"}</span>
                  </div>
                  <div className="sg-detail-item">
                    <label>Estado</label>
                    <span>
                      <span className={getStatusClass(selectedOcean.status)}>
                        {OCEAN_STATUS_LABELS[selectedOcean.status] ||
                          selectedOcean.status}
                      </span>
                    </span>
                  </div>
                  {selectedOcean.container_number && (
                    <div className="sg-detail-item">
                      <label>Container</label>
                      <span>{selectedOcean.container_number}</span>
                    </div>
                  )}
                  {selectedOcean.booking_number && (
                    <div className="sg-detail-item">
                      <label>Booking</label>
                      <span>{selectedOcean.booking_number}</span>
                    </div>
                  )}
                  <div className="sg-detail-item">
                    <label>Naviera</label>
                    <span>
                      {selectedOcean.carrier
                        ? `${selectedOcean.carrier.scac} — ${selectedOcean.carrier.name}`
                        : "—"}
                    </span>
                  </div>
                  <div className="sg-detail-item">
                    <label>Contenedores</label>
                    <span>{selectedOcean.container_count}</span>
                  </div>
                  <div className="sg-detail-item">
                    <label>Creado</label>
                    <span>{formatDateTime(selectedOcean.created_at)}</span>
                  </div>
                </div>
              </div>
              {selectedOcean.route && (
                <div className="sg-detail-section">
                  <div className="sg-detail-title">Ruta</div>
                  <div className="sg-route">
                    <div className="sg-route-point">
                      <div className="sg-route-point-label">
                        Puerto de carga
                      </div>
                      <div className="sg-route-point-iata">
                        {selectedOcean.route.port_of_loading.location.code}
                      </div>
                      <div className="sg-route-point-name">
                        {selectedOcean.route.port_of_loading.location.name}
                      </div>
                    </div>
                    <div className="sg-route-arrow">→</div>
                    <div className="sg-route-point sg-route-point--end">
                      <div className="sg-route-point-label">
                        Puerto de descarga
                      </div>
                      <div className="sg-route-point-iata">
                        {selectedOcean.route.port_of_discharge.location.code}
                      </div>
                      <div className="sg-route-point-name">
                        {selectedOcean.route.port_of_discharge.location.name}
                      </div>
                    </div>
                  </div>
                  <div className="sg-detail-progress">
                    <div
                      className={`sg-detail-progress-fill ${selectedOcean.route.transit_percentage === 100 ? "sg-detail-progress-fill--done" : ""}`}
                      style={{
                        width: `${selectedOcean.route.transit_percentage}%`,
                      }}
                    />
                  </div>
                  <div className="sg-detail-grid" style={{ marginBottom: 0 }}>
                    <div className="sg-detail-item">
                      <label>Progreso</label>
                      <span>{selectedOcean.route.transit_percentage}%</span>
                    </div>
                    <div className="sg-detail-item">
                      <label>Tiempo de tránsito</label>
                      <span>{selectedOcean.route.transit_time} días</span>
                    </div>
                    <div className="sg-detail-item">
                      <label>Transbordos</label>
                      <span>{selectedOcean.route.ts_count}</span>
                    </div>
                  </div>
                </div>
              )}
              {selectedOcean.route && (
                <div className="sg-detail-section">
                  <div className="sg-detail-title">Línea de tiempo</div>
                  <div className="sg-timeline">
                    {selectedOcean.route.port_of_loading.date_of_loading && (
                      <div className="sg-timeline-item sg-timeline-item--done">
                        <div className="sg-timeline-label">
                          Carga —{" "}
                          {selectedOcean.route.port_of_loading.location.name}
                        </div>
                        <div className="sg-timeline-date">
                          {formatDateTime(
                            selectedOcean.route.port_of_loading.date_of_loading,
                          )}
                        </div>
                      </div>
                    )}
                    {selectedOcean.route.transit_percentage > 0 &&
                      selectedOcean.route.transit_percentage < 100 && (
                        <div className="sg-timeline-item sg-timeline-item--active">
                          <div className="sg-timeline-label">
                            Navegando — {selectedOcean.route.transit_percentage}
                            %
                          </div>
                          <div className="sg-timeline-date">
                            Actualizado:{" "}
                            {formatDateTime(selectedOcean.updated_at)}
                          </div>
                        </div>
                      )}
                    {selectedOcean.route.port_of_discharge
                      .date_of_discharge && (
                      <div
                        className={`sg-timeline-item ${selectedOcean.route.transit_percentage === 100 ? "sg-timeline-item--done" : ""}`}
                      >
                        <div className="sg-timeline-label">
                          {selectedOcean.route.transit_percentage === 100
                            ? "Descargado"
                            : "ETA"}{" "}
                          —{" "}
                          {selectedOcean.route.port_of_discharge.location.name}
                        </div>
                        <div className="sg-timeline-date">
                          {formatDateTime(
                            selectedOcean.route.port_of_discharge
                              .date_of_discharge,
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedOcean.tags.length > 0 && (
                <div className="sg-detail-section">
                  <div className="sg-detail-title">Etiquetas</div>
                  <div className="sg-tags">
                    {selectedOcean.tags.map((t) => (
                      <span key={t.id} className="sg-tag">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="sg-detail-section">
                <div className="sg-detail-title">Fechas</div>
                <div className="sg-detail-grid">
                  <div className="sg-detail-item">
                    <label>Actualizado</label>
                    <span>{formatDateTime(selectedOcean.updated_at)}</span>
                  </div>
                  <div className="sg-detail-item">
                    <label>Verificado</label>
                    <span>{formatDateTime(selectedOcean.checked_at)}</span>
                  </div>
                  {selectedOcean.discarded_at && (
                    <div className="sg-detail-item">
                      <label>Descartado</label>
                      <span>{formatDateTime(selectedOcean.discarded_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="sg-modal-footer">
              <button className="sg-btn-close" onClick={closeModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShipsGoTracking;
