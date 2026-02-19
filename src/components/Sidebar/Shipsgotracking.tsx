// src/components/shipsgo/ShipsGoTracking.tsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Shipsgotracking.css";

// Types
interface Location {
  iata: string;
  name: string;
  timezone: string;
  country: { code: string; name: string };
}

interface RoutePoint {
  location: Location;
  date_of_dep?: string;
  date_of_dep_initial?: string;
  date_of_rcf?: string;
  date_of_rcf_initial?: string;
}

interface Route {
  origin: RoutePoint;
  destination: RoutePoint;
  ts_count: number;
  transit_time: number;
  transit_percentage: number;
}

interface Airline {
  iata: string;
  name: string;
}
interface Cargo {
  pieces: number | null;
  weight: number | null;
  volume: number | null;
}
interface Tag {
  id: number;
  name: string;
}
interface Creator {
  name: string;
  email: string;
}

interface Shipment {
  id: number;
  reference: string | null;
  awb_number: string;
  airline: Airline | null;
  cargo: Cargo;
  status: string;
  status_split: boolean;
  route: Route | null;
  creator: Creator;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  checked_at: string;
  discarded_at: string | null;
}

interface ShipsGoResponse {
  message: string;
  shipments: Shipment[];
  meta: { more: boolean; total: number };
}

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

function ShipsGoTracking() {
  const { user, activeUsername } = useAuth();
  const navigate = useNavigate();

  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);

  const userShipments = useMemo(() => {
    if (!activeUsername) return [];
    return allShipments.filter(
      (s) => s.reference !== null && s.reference === activeUsername,
    );
  }, [allShipments, activeUsername]);

  // Stats
  const stats = useMemo(() => {
    const total = userShipments.length;
    const inTransit = userShipments.filter(
      (s) => s.status === "EN_ROUTE",
    ).length;
    const delivered = userShipments.filter(
      (s) => s.status === "DELIVERED" || s.status === "LANDED",
    ).length;
    const delayed = userShipments.filter(isDelayed).length;
    return { total, inTransit, delivered, delayed };
  }, [userShipments]);

  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/shipsgo/shipments`);
      if (!response.ok) throw new Error("Error al obtener los envíos");
      const data: ShipsGoResponse = await response.json();
      setAllShipments(
        data.shipments.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  function isDelayed(shipment: Shipment): boolean {
    if (!shipment.route) return false;
    const { transit_percentage } = shipment.route;
    const eta = shipment.route.destination.date_of_rcf;
    if (!eta || transit_percentage >= 100) return false;
    return (
      new Date(shipment.updated_at) >= new Date(eta) && transit_percentage < 100
    );
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatDateTime = (d: string | null | undefined) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const getStatusClass = (status: string) =>
    "sg-status sg-status--" + status.toLowerCase().replace("_", "-");

  const statusLabels: Record<string, string> = {
    BOOKED: "Reservado",
    EN_ROUTE: "En Tránsito",
    LANDED: "Aterrizado",
    DELIVERED: "Entregado",
    UNTRACKED: "Sin Rastreo",
    DISCARDED: "Descartado",
  };

  const getFlagUrl = (code: string) =>
    `https://flagcdn.com/w20/${code.toLowerCase()}.png`;

  const openModal = (s: Shipment) => {
    setSelectedShipment(s);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedShipment(null);
  };

  // Loading
  if (loading) {
    return (
      <div className="sg-wrapper">
        <div className="sg-container">
          <div className="sg-page-header">
            <div className="sg-page-header-left">
              <h1>Rastreo de envíos</h1>
              <p>{activeUsername}</p>
            </div>
          </div>
          <div className="sg-loading">
            <div className="sg-spinner" />
            <p>Cargando envíos...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="sg-wrapper">
        <div className="sg-container">
          <div className="sg-page-header">
            <div className="sg-page-header-left">
              <h1>Rastreo de envíos</h1>
              <p>{activeUsername}</p>
            </div>
          </div>
          <div className="sg-error">
            <h4>Error</h4>
            <p>{error}</p>
            <button className="sg-error-btn" onClick={fetchShipments}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty
  if (userShipments.length === 0) {
    return (
      <div className="sg-wrapper">
        <div className="sg-container">
          <div className="sg-page-header">
            <div className="sg-page-header-left">
              <h1>Rastreo de envíos</h1>
              <p>{activeUsername}</p>
            </div>
          </div>
          <div className="sg-empty">
            <h3>Sin envíos registrados</h3>
            <p>Comienza creando tu primer seguimiento de envío aéreo.</p>
            <button
              className="sg-empty-btn"
              onClick={() => navigate("/create-shipment")}
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
            onClick={() => navigate("/new-tracking")}
          >
            <span>+</span> Nuevo seguimiento
          </button>
        </div>

        {/* Stats */}
        <div className="sg-stats">
          <div className="sg-stat-item">
            <div className="sg-stat-value">{stats.total}</div>
            <div className="sg-stat-label">Total</div>
          </div>
          <div className="sg-stat-item">
            <div className="sg-stat-value">{stats.inTransit}</div>
            <div className="sg-stat-label">En tránsito</div>
          </div>
          <div className="sg-stat-item">
            <div className="sg-stat-value">{stats.delivered}</div>
            <div className="sg-stat-label">Entregados</div>
          </div>
          {stats.delayed > 0 && (
            <div className="sg-stat-item">
              <div className="sg-stat-value">{stats.delayed}</div>
              <div className="sg-stat-label">Con retraso</div>
            </div>
          )}
        </div>

        {/* Delay alerts */}
        {userShipments.filter(isDelayed).map((s) => (
          <div key={`d-${s.id}`} className="sg-delay-banner">
            AWB <strong>{s.awb_number}</strong> — Envío con posible retraso.
            Estamos obteniendo mayor información.
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
              {userShipments.map((s) => (
                <tr key={s.id}>
                  {/* Status */}
                  <td>
                    <span className={getStatusClass(s.status)}>
                      {statusLabels[s.status] || s.status}
                    </span>
                  </td>

                  {/* AWB */}
                  <td>
                    <span className="sg-awb">{s.awb_number}</span>
                  </td>

                  {/* Airline */}
                  <td>
                    <span className="sg-airline">{s.airline?.name || "—"}</span>
                  </td>

                  {/* Origin */}
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

                  {/* Destination */}
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

                  {/* Progress */}
                  <td>
                    {s.route ? (
                      <div className="sg-progress-cell">
                        <div className="sg-progress-bar">
                          <div
                            className={`sg-progress-fill ${s.route.transit_percentage === 100 ? "sg-progress-fill--done" : ""}`}
                            style={{ width: `${s.route.transit_percentage}%` }}
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

                  {/* Tags */}
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

                  {/* Date */}
                  <td>
                    <span className="sg-date">{formatDate(s.created_at)}</span>
                  </td>

                  {/* Action */}
                  <td>
                    <button
                      className="sg-btn-view"
                      onClick={() => openModal(s)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedShipment && (
        <div className="sg-modal-overlay" onClick={closeModal}>
          <div className="sg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sg-modal-header">
              <h3>AWB {selectedShipment.awb_number}</h3>
              <button className="sg-modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="sg-modal-body">
              {/* General Info */}
              <div className="sg-detail-section">
                <div className="sg-detail-title">Información general</div>
                <div className="sg-detail-grid">
                  <div className="sg-detail-item">
                    <label>Referencia</label>
                    <span>{selectedShipment.reference || "—"}</span>
                  </div>
                  <div className="sg-detail-item">
                    <label>Estado</label>
                    <span>
                      <span className={getStatusClass(selectedShipment.status)}>
                        {statusLabels[selectedShipment.status] ||
                          selectedShipment.status}
                      </span>
                      {selectedShipment.status_split && (
                        <span
                          className="sg-status"
                          style={{
                            marginLeft: "0.5rem",
                            background: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          Split
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="sg-detail-item">
                    <label>Aerolínea</label>
                    <span>
                      {selectedShipment.airline
                        ? `${selectedShipment.airline.iata} — ${selectedShipment.airline.name}`
                        : "—"}
                    </span>
                  </div>
                  <div className="sg-detail-item">
                    <label>Creado</label>
                    <span>{formatDateTime(selectedShipment.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Cargo */}
              <div className="sg-detail-section">
                <div className="sg-detail-title">Carga</div>
                <div className="sg-cargo-grid">
                  <div className="sg-cargo-item">
                    <div className="sg-cargo-value">
                      {selectedShipment.cargo.pieces ?? "—"}
                    </div>
                    <div className="sg-cargo-label">Piezas</div>
                  </div>
                  <div className="sg-cargo-item">
                    <div className="sg-cargo-value">
                      {selectedShipment.cargo.weight
                        ? `${selectedShipment.cargo.weight} kg`
                        : "—"}
                    </div>
                    <div className="sg-cargo-label">Peso</div>
                  </div>
                  <div className="sg-cargo-item">
                    <div className="sg-cargo-value">
                      {selectedShipment.cargo.volume
                        ? `${selectedShipment.cargo.volume} m³`
                        : "—"}
                    </div>
                    <div className="sg-cargo-label">Volumen</div>
                  </div>
                </div>
              </div>

              {/* Route */}
              {selectedShipment.route && (
                <div className="sg-detail-section">
                  <div className="sg-detail-title">Ruta</div>
                  <div className="sg-route">
                    <div className="sg-route-point">
                      <div className="sg-route-point-label">Origen</div>
                      <div className="sg-route-point-iata">
                        {selectedShipment.route.origin.location.iata}
                      </div>
                      <div className="sg-route-point-name">
                        {selectedShipment.route.origin.location.name}
                      </div>
                    </div>
                    <div className="sg-route-arrow">→</div>
                    <div className="sg-route-point sg-route-point--end">
                      <div className="sg-route-point-label">Destino</div>
                      <div className="sg-route-point-iata">
                        {selectedShipment.route.destination.location.iata}
                      </div>
                      <div className="sg-route-point-name">
                        {selectedShipment.route.destination.location.name}
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="sg-detail-progress">
                    <div
                      className={`sg-detail-progress-fill ${selectedShipment.route.transit_percentage === 100 ? "sg-detail-progress-fill--done" : ""}`}
                      style={{
                        width: `${selectedShipment.route.transit_percentage}%`,
                      }}
                    />
                  </div>
                  <div className="sg-detail-grid" style={{ marginBottom: 0 }}>
                    <div className="sg-detail-item">
                      <label>Progreso</label>
                      <span>{selectedShipment.route.transit_percentage}%</span>
                    </div>
                    <div className="sg-detail-item">
                      <label>Tiempo de tránsito</label>
                      <span>{selectedShipment.route.transit_time}h</span>
                    </div>
                    <div className="sg-detail-item">
                      <label>Escalas</label>
                      <span>{selectedShipment.route.ts_count}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {selectedShipment.route && (
                <div className="sg-detail-section">
                  <div className="sg-detail-title">Línea de tiempo</div>
                  <div className="sg-timeline">
                    {selectedShipment.route.origin.date_of_dep && (
                      <div className="sg-timeline-item sg-timeline-item--done">
                        <div className="sg-timeline-label">
                          Salida — {selectedShipment.route.origin.location.iata}
                        </div>
                        <div className="sg-timeline-date">
                          {formatDateTime(
                            selectedShipment.route.origin.date_of_dep,
                          )}
                        </div>
                      </div>
                    )}
                    {selectedShipment.route.transit_percentage > 0 &&
                      selectedShipment.route.transit_percentage < 100 && (
                        <div className="sg-timeline-item sg-timeline-item--active">
                          <div className="sg-timeline-label">
                            En tránsito —{" "}
                            {selectedShipment.route.transit_percentage}%
                          </div>
                          <div className="sg-timeline-date">
                            Actualizado:{" "}
                            {formatDateTime(selectedShipment.updated_at)}
                          </div>
                        </div>
                      )}
                    {selectedShipment.route.destination.date_of_rcf && (
                      <div
                        className={`sg-timeline-item ${selectedShipment.route.transit_percentage === 100 ? "sg-timeline-item--done" : ""}`}
                      >
                        <div className="sg-timeline-label">
                          {selectedShipment.route.transit_percentage === 100
                            ? "Llegada"
                            : "ETA"}{" "}
                          — {selectedShipment.route.destination.location.iata}
                        </div>
                        <div className="sg-timeline-date">
                          {formatDateTime(
                            selectedShipment.route.destination.date_of_rcf,
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedShipment.tags.length > 0 && (
                <div className="sg-detail-section">
                  <div className="sg-detail-title">Etiquetas</div>
                  <div className="sg-tags">
                    {selectedShipment.tags.map((t) => (
                      <span key={t.id} className="sg-tag">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="sg-detail-section">
                <div className="sg-detail-title">Fechas</div>
                <div className="sg-detail-grid">
                  <div className="sg-detail-item">
                    <label>Actualizado</label>
                    <span>{formatDateTime(selectedShipment.updated_at)}</span>
                  </div>
                  <div className="sg-detail-item">
                    <label>Verificado</label>
                    <span>{formatDateTime(selectedShipment.checked_at)}</span>
                  </div>
                  {selectedShipment.discarded_at && (
                    <div className="sg-detail-item">
                      <label>Descartado</label>
                      <span>
                        {formatDateTime(selectedShipment.discarded_at)}
                      </span>
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
