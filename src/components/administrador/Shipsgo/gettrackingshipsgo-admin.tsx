// src/components/shipsgo/ShipsGoTrackingAdmin.tsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../auth/AuthContext";

// ============================================================
// TIPOS COMUNES
// ============================================================
interface Tag {
  id: number;
  name: string;
}
interface Creator {
  name: string;
  email: string;
}

// ============================================================
// TIPOS AÉREO (AIR)
// ============================================================
interface AirLocation {
  iata: string;
  name: string;
  timezone: string;
  country: { code: string; name: string };
}
interface AirRoutePoint {
  location: AirLocation;
  date_of_dep?: string;
  date_of_dep_initial?: string;
  date_of_rcf?: string;
  date_of_rcf_initial?: string;
}
interface AirRoute {
  origin: AirRoutePoint;
  destination: AirRoutePoint;
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

// ============================================================
// TIPOS MARÍTIMO (OCEAN)
// ============================================================
interface OceanLocation {
  code: string;
  name: string;
  timezone: string;
  country: { code: string; name: string };
}
interface OceanPortPoint {
  location: OceanLocation;
  date_of_loading?: string;
  date_of_loading_initial?: string;
  date_of_discharge?: string;
  date_of_discharge_initial?: string;
}
interface OceanRoute {
  port_of_loading: OceanPortPoint;
  port_of_discharge: OceanPortPoint;
  ts_count: number;
  transit_time: number;
  transit_percentage: number;
  co2_emission: number | null;
}
interface OceanCarrier {
  scac: string;
  name: string;
}

// ============================================================
// INTERFACES DE SHIPMENT
// ============================================================
interface AirShipment {
  id: number;
  reference: string | null;
  awb_number: string;
  airline: Airline | null;
  cargo: Cargo;
  status: string;
  status_split: boolean;
  route: AirRoute | null;
  creator: Creator;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  checked_at: string;
  discarded_at: string | null;
}
interface OceanShipment {
  id: number;
  reference: string | null;
  booking_number: string | null;
  container_number: string | null;
  container_count: number;
  carrier: OceanCarrier | null;
  status: string;
  route: OceanRoute | null;
  creator: Creator;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  checked_at: string;
  discarded_at: string | null;
}
interface AirShipsGoResponse {
  message: string;
  shipments: AirShipment[];
  meta: { more: boolean; total: number };
}
interface OceanShipsGoResponse {
  message: string;
  shipments: OceanShipment[];
  meta: { more: boolean; total: number };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Location {
  iata: string;
  name: string;
  timezone: string;
  country: {
    code: string;
    name: string;
  };
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
  meta: {
    more: boolean;
    total: number;
  };
}

type TransportMode = "air" | "ocean";

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

function ShipsGoTrackingAdmin() {
  const { user } = useAuth();

  // Estado global
  const [activeTab, setActiveTab] = useState<TransportMode>("air");
  const [filterText, setFilterText] = useState("");

  // Air state
  const [airShipments, setAirShipments] = useState<AirShipment[]>([]);
  const [airLoading, setAirLoading] = useState(true);
  const [airError, setAirError] = useState<string | null>(null);
  const [selectedAir, setSelectedAir] = useState<AirShipment | null>(null);

  // Ocean state
  const [oceanShipments, setOceanShipments] = useState<OceanShipment[]>([]);
  const [oceanLoading, setOceanLoading] = useState(true);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [selectedOcean, setSelectedOcean] = useState<OceanShipment | null>(
    null,
  );

  const [showModal, setShowModal] = useState(false);

  // ── Fetch Air ──
  const fetchAirShipments = async () => {
    setAirLoading(true);
    setAirError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shipsgo/shipments`);
      if (!res.ok) throw new Error("Error al obtener los shipments aéreos");
      const data: AirShipsGoResponse = await res.json();
      setAirShipments(
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

  // ── Fetch Ocean ──
  const fetchOceanShipments = async () => {
    setOceanLoading(true);
    setOceanError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shipsgo/ocean/shipments`);
      if (!res.ok) throw new Error("Error al obtener los shipments marítimos");
      const data: OceanShipsGoResponse = await res.json();
      setOceanShipments(
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
    fetchAirShipments();
    fetchOceanShipments();
  }, []);

  // ── Filtros ──
  const filteredAir = useMemo(() => {
    if (!filterText) return airShipments;
    const q = filterText.toLowerCase();
    return airShipments.filter(
      (s) =>
        s.awb_number.toLowerCase().includes(q) ||
        s.reference?.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        s.airline?.name.toLowerCase().includes(q) ||
        s.creator.name.toLowerCase().includes(q),
    );
  }, [airShipments, filterText]);

  const filteredOcean = useMemo(() => {
    if (!filterText) return oceanShipments;
    const q = filterText.toLowerCase();
    return oceanShipments.filter(
      (s) =>
        s.container_number?.toLowerCase().includes(q) ||
        s.booking_number?.toLowerCase().includes(q) ||
        s.reference?.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        s.carrier?.name.toLowerCase().includes(q) ||
        s.creator.name.toLowerCase().includes(q),
    );
  }, [oceanShipments, filterText]);

  // ── Helpers ──
  const airStatusConfig: Record<string, { color: string; label: string }> = {
    BOOKED: { color: "primary", label: "Reservado" },
    EN_ROUTE: { color: "warning", label: "En Tránsito" },
    LANDED: { color: "success", label: "Aterrizado" },
    DELIVERED: { color: "success", label: "Entregado" },
    UNTRACKED: { color: "secondary", label: "Sin Rastreo" },
    DISCARDED: { color: "danger", label: "Descartado" },
  };
  const oceanStatusConfig: Record<string, { color: string; label: string }> = {
    NEW: { color: "info", label: "Nuevo" },
    INPROGRESS: { color: "warning", label: "En Proceso" },
    BOOKED: { color: "primary", label: "Reservado" },
    LOADED: { color: "info", label: "Cargado" },
    SAILING: { color: "warning", label: "Navegando" },
    ARRIVED: { color: "success", label: "Arribado" },
    DISCHARGED: { color: "success", label: "Descargado" },
    UNTRACKED: { color: "secondary", label: "Sin Rastreo" },
  };

  const getStatusBadge = (status: string, mode: TransportMode) => {
    const config =
      mode === "air"
        ? airStatusConfig[status] || { color: "secondary", label: status }
        : oceanStatusConfig[status] || { color: "secondary", label: status };
    return <span className={`badge bg-${config.color}`}>{config.label}</span>;
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "N/A";
    try {
      return new Date(d).toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha inválida";
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAir(null);
    setSelectedOcean(null);
  };

  const isLoading = activeTab === "air" ? airLoading : oceanLoading;
  const hasError = activeTab === "air" ? airError : oceanError;
  const refetchCurrent =
    activeTab === "air" ? fetchAirShipments : fetchOceanShipments;

  // ── Tabs ──
  function renderTabs() {
    return (
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "air" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("air");
              setFilterText("");
            }}
          >
            ✈️ Aéreo{" "}
            <span className="badge bg-secondary ms-1">
              {airShipments.length}
            </span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "ocean" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("ocean");
              setFilterText("");
            }}
          >
            🚢 Marítimo{" "}
            <span className="badge bg-secondary ms-1">
              {oceanShipments.length}
            </span>
          </button>
        </li>
      </ul>
    );
  }

  // ── Air Stats ──
  function renderAirStats() {
    return (
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row">
                <div className="col-md-2 text-center">
                  <h3 className="text-primary mb-0">{airShipments.length}</h3>
                  <small className="text-muted">Total</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-warning mb-0">
                    {airShipments.filter((s) => s.status === "EN_ROUTE").length}
                  </h3>
                  <small className="text-muted">En Tránsito</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-success mb-0">
                    {airShipments.filter((s) => s.status === "LANDED").length}
                  </h3>
                  <small className="text-muted">Aterrizados</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-primary mb-0">
                    {airShipments.filter((s) => s.status === "BOOKED").length}
                  </h3>
                  <small className="text-muted">Reservados</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-secondary mb-0">
                    {
                      airShipments.filter((s) => s.status === "UNTRACKED")
                        .length
                    }
                  </h3>
                  <small className="text-muted">Sin Rastreo</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-info mb-0">
                    {airShipments.filter((s) => s.reference === null).length}
                  </h3>
                  <small className="text-muted">Sin Referencia</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Ocean Stats ──
  function renderOceanStats() {
    return (
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row">
                <div className="col-md-2 text-center">
                  <h3 className="text-primary mb-0">{oceanShipments.length}</h3>
                  <small className="text-muted">Total</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-warning mb-0">
                    {
                      oceanShipments.filter((s) => s.status === "SAILING")
                        .length
                    }
                  </h3>
                  <small className="text-muted">Navegando</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-success mb-0">
                    {
                      oceanShipments.filter(
                        (s) =>
                          s.status === "ARRIVED" || s.status === "DISCHARGED",
                      ).length
                    }
                  </h3>
                  <small className="text-muted">Arribados</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-info mb-0">
                    {
                      oceanShipments.filter(
                        (s) => s.status === "BOOKED" || s.status === "LOADED",
                      ).length
                    }
                  </h3>
                  <small className="text-muted">Reservados / Cargados</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-secondary mb-0">
                    {
                      oceanShipments.filter((s) => s.status === "UNTRACKED")
                        .length
                    }
                  </h3>
                  <small className="text-muted">Sin Rastreo</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-info mb-0">
                    {oceanShipments.filter((s) => s.reference === null).length}
                  </h3>
                  <small className="text-muted">Sin Referencia</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render de loading
  if (isLoading) {
    return (
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col">
            <h2 className="mb-0">
              <span className="badge bg-danger me-3">ADMIN</span>
              Rastreo de Envíos - ShipsGo
            </h2>
            <p className="text-muted">
              Panel Administrativo - {user?.username}
            </p>
          </div>
        </div>
        {renderTabs()}
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando shipments...</p>
        </div>
      </div>
    );
  }

  // Render de error
  if (hasError) {
    return (
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col">
            <h2 className="mb-0">
              <span className="badge bg-danger me-3">ADMIN</span>
              Rastreo de Envíos - ShipsGo
            </h2>
            <p className="text-muted">
              Panel Administrativo - {user?.username}
            </p>
          </div>
        </div>
        {renderTabs()}
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{hasError}</p>
          <hr />
          <button className="btn btn-danger" onClick={refetchCurrent}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-6">
          <h2 className="mb-0">
            <span className="badge bg-danger me-3">ADMIN</span>
            Rastreo de Envíos - ShipsGo
          </h2>
          <p className="text-muted">Panel Administrativo - {user?.username}</p>
        </div>
        <div className="col-md-6 text-end">
          <button
            className="btn btn-primary"
            onClick={refetchCurrent}
            disabled={isLoading}
          >
            <svg
              width="16"
              height="16"
              fill="currentColor"
              className="me-2"
              viewBox="0 0 16 16"
            >
              <path
                fillRule="evenodd"
                d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
              />
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      {renderTabs()}

      {/* Search */}
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="input-group">
                <span className="input-group-text">
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder={
                    activeTab === "air"
                      ? "Buscar por AWB, Referencia, Estado, Aerolínea o Creator..."
                      : "Buscar por Container, Booking, Referencia, Estado, Naviera o Creator..."
                  }
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                {filterText && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setFilterText("")}
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <small className="text-muted mt-2 d-block">
                Mostrando{" "}
                {activeTab === "air"
                  ? `${filteredAir.length} de ${airShipments.length}`
                  : `${filteredOcean.length} de ${oceanShipments.length}`}{" "}
                shipments
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {activeTab === "air" ? renderAirStats() : renderOceanStats()}

      {/* Cards Grid */}
      {activeTab === "air" ? (
        filteredAir.length === 0 ? (
          <div className="alert alert-info">
            {filterText
              ? `No se encontraron shipments aéreos que coincidan con "${filterText}"`
              : "No hay shipments aéreos disponibles en este momento."}
          </div>
        ) : (
          <div className="row g-4">
            {filteredAir.map((s) => (
              <div key={s.id} className="col-md-6 col-lg-4 col-xl-3">
                <div className="card h-100 shadow-sm hover-shadow">
                  <div className="card-body">
                    {s.reference ? (
                      <div className="mb-2">
                        <span className="badge bg-info">👤 {s.reference}</span>
                      </div>
                    ) : (
                      <div className="mb-2">
                        <span className="badge bg-secondary">
                          Sin Referencia
                        </span>
                      </div>
                    )}
                    <h5 className="card-title mb-3">
                      <strong>AWB:</strong> {s.awb_number}
                    </h5>
                    <p className="card-text mb-2">
                      <strong>Aerolínea:</strong>{" "}
                      {s.airline ? (
                        <>
                          <span className="badge bg-info me-2">
                            {s.airline.iata}
                          </span>
                          {s.airline.name}
                        </>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </p>
                    <p className="card-text mb-3">
                      <strong>Estado:</strong> {getStatusBadge(s.status, "air")}
                    </p>
                    {s.route ? (
                      <>
                        <div className="mb-2">
                          <small className="text-muted">
                            <strong>Origen:</strong>{" "}
                            {s.route.origin.location.iata}
                          </small>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted">
                            <strong>Destino:</strong>{" "}
                            {s.route.destination.location.iata}
                          </small>
                        </div>
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">Progreso</small>
                            <small className="text-muted">
                              {s.route.transit_percentage}%
                            </small>
                          </div>
                          <div className="progress" style={{ height: "8px" }}>
                            <div
                              className={`progress-bar ${s.route.transit_percentage === 100 ? "bg-success" : "bg-primary"}`}
                              role="progressbar"
                              style={{
                                width: `${s.route.transit_percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted mb-3">
                        <small>No hay información de ruta disponible</small>
                      </p>
                    )}
                    <button
                      className="btn btn-sm btn-outline-primary w-100"
                      onClick={() => {
                        setSelectedAir(s);
                        setSelectedOcean(null);
                        setShowModal(true);
                      }}
                    >
                      Ver Detalles Completos
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredOcean.length === 0 ? (
        <div className="alert alert-info">
          {filterText
            ? `No se encontraron shipments marítimos que coincidan con "${filterText}"`
            : "No hay shipments marítimos disponibles en este momento."}
        </div>
      ) : (
        <div className="row g-4">
          {filteredOcean.map((s) => (
            <div key={s.id} className="col-md-6 col-lg-4 col-xl-3">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className="card-body">
                  {s.reference ? (
                    <div className="mb-2">
                      <span className="badge bg-info">👤 {s.reference}</span>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <span className="badge bg-secondary">Sin Referencia</span>
                    </div>
                  )}
                  {s.container_number && (
                    <h5 className="card-title mb-1">
                      <strong>Contenedor:</strong> {s.container_number}
                    </h5>
                  )}
                  {s.booking_number && (
                    <h6 className="card-subtitle mb-3 text-muted">
                      <strong>Booking:</strong> {s.booking_number}
                    </h6>
                  )}
                  <p className="card-text mb-2">
                    <strong>Naviera:</strong>{" "}
                    {s.carrier ? (
                      <>
                        <span className="badge bg-info me-2">
                          {s.carrier.scac}
                        </span>
                        {s.carrier.name}
                      </>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </p>
                  <p className="card-text mb-3">
                    <strong>Estado:</strong> {getStatusBadge(s.status, "ocean")}
                  </p>
                  {s.route ? (
                    <>
                      <div className="mb-2">
                        <small className="text-muted">
                          <strong>Carga:</strong>{" "}
                          {s.route.port_of_loading.location.name} (
                          {s.route.port_of_loading.location.code})
                        </small>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">
                          <strong>Descarga:</strong>{" "}
                          {s.route.port_of_discharge.location.name} (
                          {s.route.port_of_discharge.location.code})
                        </small>
                      </div>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Progreso</small>
                          <small className="text-muted">
                            {s.route.transit_percentage}%
                          </small>
                        </div>
                        <div className="progress" style={{ height: "8px" }}>
                          <div
                            className={`progress-bar ${s.route.transit_percentage === 100 ? "bg-success" : "bg-primary"}`}
                            role="progressbar"
                            style={{ width: `${s.route.transit_percentage}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted mb-3">
                      <small>No hay información de ruta disponible</small>
                    </p>
                  )}
                  <button
                    className="btn btn-sm btn-outline-primary w-100"
                    onClick={() => {
                      setSelectedOcean(s);
                      setSelectedAir(null);
                      setShowModal(true);
                    }}
                  >
                    Ver Detalles Completos
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Air Modal */}
      {showModal && selectedAir && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <span className="badge bg-white text-danger me-2">ADMIN</span>
                  ✈️ Detalles Aéreo - AWB: {selectedAir.awb_number}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeModal}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Referencia:</strong>{" "}
                  {selectedAir.reference ? (
                    <span className="badge bg-info fs-6">
                      {selectedAir.reference}
                    </span>
                  ) : (
                    <span className="badge bg-secondary">Sin Referencia</span>
                  )}
                </div>
                <div className="mb-3">
                  <strong>AWB:</strong> {selectedAir.awb_number}
                </div>
                <div className="mb-3">
                  <strong>ID Interno:</strong> {selectedAir.id}
                </div>
                <div className="mb-3">
                  <strong>Estado:</strong>{" "}
                  {getStatusBadge(selectedAir.status, "air")}
                  {selectedAir.status_split && (
                    <span className="badge bg-warning ms-2">Split</span>
                  )}
                </div>
                <div className="mb-3">
                  <strong>Aerolínea:</strong>{" "}
                  {selectedAir.airline ? (
                    <>
                      <span className="badge bg-info me-2">
                        {selectedAir.airline.iata}
                      </span>
                      {selectedAir.airline.name}
                    </>
                  ) : (
                    <span className="text-muted">N/A</span>
                  )}
                </div>
                <div className="mb-3">
                  <strong>Carga:</strong>
                  <ul className="list-unstyled ms-3 mt-2">
                    <li>
                      <strong>Piezas:</strong>{" "}
                      {selectedAir.cargo.pieces ?? "N/A"}
                    </li>
                    <li>
                      <strong>Peso:</strong>{" "}
                      {selectedAir.cargo.weight
                        ? `${selectedAir.cargo.weight} kg`
                        : "N/A"}
                    </li>
                    <li>
                      <strong>Volumen:</strong>{" "}
                      {selectedAir.cargo.volume
                        ? `${selectedAir.cargo.volume} m³`
                        : "N/A"}
                    </li>
                  </ul>
                </div>
                {selectedAir.route && (
                  <div className="mb-3">
                    <strong>Ruta:</strong>
                    <div className="card mt-2">
                      <div className="card-body">
                        <div className="mb-3">
                          <h6 className="text-primary">Origen</h6>
                          <p className="mb-1">
                            <strong>Aeropuerto:</strong>{" "}
                            {selectedAir.route.origin.location.name} (
                            {selectedAir.route.origin.location.iata})
                          </p>
                          <p className="mb-1">
                            <strong>País:</strong>{" "}
                            {selectedAir.route.origin.location.country.name} (
                            {selectedAir.route.origin.location.country.code})
                          </p>
                          <p className="mb-0">
                            <strong>Salida:</strong>{" "}
                            {formatDate(selectedAir.route.origin.date_of_dep)}
                          </p>
                        </div>
                        <div className="mb-3">
                          <h6 className="text-success">Destino</h6>
                          <p className="mb-1">
                            <strong>Aeropuerto:</strong>{" "}
                            {selectedAir.route.destination.location.name} (
                            {selectedAir.route.destination.location.iata})
                          </p>
                          <p className="mb-1">
                            <strong>País:</strong>{" "}
                            {
                              selectedAir.route.destination.location.country
                                .name
                            }{" "}
                            (
                            {
                              selectedAir.route.destination.location.country
                                .code
                            }
                            )
                          </p>
                          <p className="mb-0">
                            <strong>Llegada:</strong>{" "}
                            {formatDate(
                              selectedAir.route.destination.date_of_rcf,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1">
                            <strong>Tiempo de Tránsito:</strong>{" "}
                            {selectedAir.route.transit_time} horas
                          </p>
                          <p className="mb-1">
                            <strong>Escalas:</strong>{" "}
                            {selectedAir.route.ts_count}
                          </p>
                          <div className="mt-2">
                            <div className="d-flex justify-content-between mb-1">
                              <small>
                                <strong>Progreso:</strong>
                              </small>
                              <small>
                                {selectedAir.route.transit_percentage}%
                              </small>
                            </div>
                            <div
                              className="progress"
                              style={{ height: "12px" }}
                            >
                              <div
                                className={`progress-bar ${selectedAir.route.transit_percentage === 100 ? "bg-success" : "bg-primary"}`}
                                role="progressbar"
                                style={{
                                  width: `${selectedAir.route.transit_percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedAir.tags.length > 0 && (
                  <div className="mb-3">
                    <strong>Tags:</strong>
                    <div className="mt-2">
                      {selectedAir.tags.map((t) => (
                        <span
                          key={t.id}
                          className="badge bg-secondary me-2 mb-2"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <strong>Fechas:</strong>
                  <ul className="list-unstyled ms-3 mt-2">
                    <li>
                      <strong>Creado:</strong>{" "}
                      {formatDate(selectedAir.created_at)}
                    </li>
                    <li>
                      <strong>Actualizado:</strong>{" "}
                      {formatDate(selectedAir.updated_at)}
                    </li>
                    <li>
                      <strong>Verificado:</strong>{" "}
                      {formatDate(selectedAir.checked_at)}
                    </li>
                    {selectedAir.discarded_at && (
                      <li>
                        <strong>Descartado:</strong>{" "}
                        {formatDate(selectedAir.discarded_at)}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ocean Modal */}
      {showModal && selectedOcean && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <span className="badge bg-white text-primary me-2">
                    ADMIN
                  </span>
                  🚢 Detalles Marítimo
                  {selectedOcean.container_number &&
                    ` — ${selectedOcean.container_number}`}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeModal}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Referencia:</strong>{" "}
                  {selectedOcean.reference ? (
                    <span className="badge bg-info fs-6">
                      {selectedOcean.reference}
                    </span>
                  ) : (
                    <span className="badge bg-secondary">Sin Referencia</span>
                  )}
                </div>
                {selectedOcean.container_number && (
                  <div className="mb-3">
                    <strong>Container Number:</strong>{" "}
                    {selectedOcean.container_number}
                  </div>
                )}
                {selectedOcean.booking_number && (
                  <div className="mb-3">
                    <strong>Booking Number:</strong>{" "}
                    {selectedOcean.booking_number}
                  </div>
                )}
                <div className="mb-3">
                  <strong>ID Interno:</strong> {selectedOcean.id}
                </div>
                <div className="mb-3">
                  <strong>Contenedores:</strong> {selectedOcean.container_count}
                </div>
                <div className="mb-3">
                  <strong>Estado:</strong>{" "}
                  {getStatusBadge(selectedOcean.status, "ocean")}
                </div>
                <div className="mb-3">
                  <strong>Naviera:</strong>{" "}
                  {selectedOcean.carrier ? (
                    <>
                      <span className="badge bg-info me-2">
                        {selectedOcean.carrier.scac}
                      </span>
                      {selectedOcean.carrier.name}
                    </>
                  ) : (
                    <span className="text-muted">N/A</span>
                  )}
                </div>
                {selectedOcean.route && (
                  <div className="mb-3">
                    <strong>Ruta:</strong>
                    <div className="card mt-2">
                      <div className="card-body">
                        <div className="mb-3">
                          <h6 className="text-primary">Puerto de Carga</h6>
                          <p className="mb-1">
                            <strong>Puerto:</strong>{" "}
                            {selectedOcean.route.port_of_loading.location.name}{" "}
                            ({selectedOcean.route.port_of_loading.location.code}
                            )
                          </p>
                          <p className="mb-1">
                            <strong>País:</strong>{" "}
                            {
                              selectedOcean.route.port_of_loading.location
                                .country.name
                            }{" "}
                            (
                            {
                              selectedOcean.route.port_of_loading.location
                                .country.code
                            }
                            )
                          </p>
                          <p className="mb-0">
                            <strong>Fecha de carga:</strong>{" "}
                            {formatDate(
                              selectedOcean.route.port_of_loading
                                .date_of_loading,
                            )}
                          </p>
                        </div>
                        <div className="mb-3">
                          <h6 className="text-success">Puerto de Descarga</h6>
                          <p className="mb-1">
                            <strong>Puerto:</strong>{" "}
                            {
                              selectedOcean.route.port_of_discharge.location
                                .name
                            }{" "}
                            (
                            {
                              selectedOcean.route.port_of_discharge.location
                                .code
                            }
                            )
                          </p>
                          <p className="mb-1">
                            <strong>País:</strong>{" "}
                            {
                              selectedOcean.route.port_of_discharge.location
                                .country.name
                            }{" "}
                            (
                            {
                              selectedOcean.route.port_of_discharge.location
                                .country.code
                            }
                            )
                          </p>
                          <p className="mb-0">
                            <strong>Fecha de descarga:</strong>{" "}
                            {formatDate(
                              selectedOcean.route.port_of_discharge
                                .date_of_discharge,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1">
                            <strong>Tiempo de Tránsito:</strong>{" "}
                            {selectedOcean.route.transit_time} días
                          </p>
                          <p className="mb-1">
                            <strong>Transbordos:</strong>{" "}
                            {selectedOcean.route.ts_count}
                          </p>
                          <div className="mt-2">
                            <div className="d-flex justify-content-between mb-1">
                              <small>
                                <strong>Progreso:</strong>
                              </small>
                              <small>
                                {selectedOcean.route.transit_percentage}%
                              </small>
                            </div>
                            <div
                              className="progress"
                              style={{ height: "12px" }}
                            >
                              <div
                                className={`progress-bar ${selectedOcean.route.transit_percentage === 100 ? "bg-success" : "bg-primary"}`}
                                role="progressbar"
                                style={{
                                  width: `${selectedOcean.route.transit_percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedOcean.tags.length > 0 && (
                  <div className="mb-3">
                    <strong>Tags:</strong>
                    <div className="mt-2">
                      {selectedOcean.tags.map((t) => (
                        <span
                          key={t.id}
                          className="badge bg-secondary me-2 mb-2"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <strong>Fechas:</strong>
                  <ul className="list-unstyled ms-3 mt-2">
                    <li>
                      <strong>Creado:</strong>{" "}
                      {formatDate(selectedOcean.created_at)}
                    </li>
                    <li>
                      <strong>Actualizado:</strong>{" "}
                      {formatDate(selectedOcean.updated_at)}
                    </li>
                    <li>
                      <strong>Verificado:</strong>{" "}
                      {formatDate(selectedOcean.checked_at)}
                    </li>
                    {selectedOcean.discarded_at && (
                      <li>
                        <strong>Descartado:</strong>{" "}
                        {formatDate(selectedOcean.discarded_at)}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-shadow { transition: all 0.3s ease; cursor: pointer; }
        .hover-shadow:hover { transform: translateY(-5px); box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important; }
        .nav-tabs .nav-link { cursor: pointer; }
      `}</style>
    </div>
  );
}

export default ShipsGoTrackingAdmin;
