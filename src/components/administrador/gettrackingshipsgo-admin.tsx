// src/components/shipsgo/ShipsGoTrackingAdmin.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';

// Tipos de ShipsGo
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

// ✅ Detectar automáticamente el ambiente (desarrollo o producción)
const API_BASE_URL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:4000'
  : 'https://portalclientes.seemanngroup.com';

function ShipsGoTrackingAdmin() {
  const { user } = useAuth();
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterText, setFilterText] = useState('');

  // Función para obtener los shipments
  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/shipsgo/shipments`);

      if (!response.ok) {
        throw new Error('Error al obtener los shipments');
      }

      const data: ShipsGoResponse = await response.json();
      
      // Ordenar por fecha de creación (más nuevos primero)
      const sortedShipments = data.shipments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setShipments(sortedShipments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Cargar shipments al montar el componente
  useEffect(() => {
    fetchShipments();
  }, []);

  // ✅ Filtrado en tiempo real por búsqueda
  const filteredShipments = shipments.filter(shipment => {
    if (!filterText) return true;
    
    const searchLower = filterText.toLowerCase();
    return (
      shipment.awb_number.toLowerCase().includes(searchLower) ||
      shipment.reference?.toLowerCase().includes(searchLower) ||
      shipment.status.toLowerCase().includes(searchLower) ||
      shipment.airline?.name.toLowerCase().includes(searchLower) ||
      shipment.creator.name.toLowerCase().includes(searchLower)
    );
  });

  // Función para obtener el color del badge según el estado
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      'BOOKED': { color: 'primary', label: 'Reservado' },
      'EN_ROUTE': { color: 'warning', label: 'En Tránsito' },
      'LANDED': { color: 'success', label: 'Aterrizado' },
      'UNTRACKED': { color: 'secondary', label: 'Sin Rastreo' },
      'DISCARDED': { color: 'danger', label: 'Descartado' },
    };

    const config = statusConfig[status] || { color: 'secondary', label: status };
    return (
      <span className={`badge bg-${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Función para formatear fechas
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Función para abrir el modal
  const openModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setShowModal(true);
  };

  // Función para cerrar el modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedShipment(null);
  };

  // Render de loading
  if (loading) {
    return (
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col">
            <h2 className="mb-0">
              <span className="badge bg-danger me-3">ADMIN</span>
              Rastreo de Envíos Aéreos - ShipsGo
            </h2>
            <p className="text-muted">Panel Administrativo - {user?.username}</p>
          </div>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando todos los shipments...</p>
        </div>
      </div>
    );
  }

  // Render de error
  if (error) {
    return (
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col">
            <h2 className="mb-0">
              <span className="badge bg-danger me-3">ADMIN</span>
              Rastreo de Envíos Aéreos - ShipsGo
            </h2>
            <p className="text-muted">Panel Administrativo - {user?.username}</p>
          </div>
        </div>
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
          <hr />
          <button className="btn btn-danger" onClick={fetchShipments}>
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
            Rastreo de Envíos Aéreos - ShipsGo
          </h2>
          <p className="text-muted">Panel Administrativo - {user?.username}</p>
        </div>
        <div className="col-md-6 text-end">
          <button 
            className="btn btn-primary"
            onClick={fetchShipments}
            disabled={loading}
          >
            <svg 
              width="16" 
              height="16" 
              fill="currentColor" 
              className="me-2" 
              viewBox="0 0 16 16"
            >
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="input-group">
                <span className="input-group-text">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por AWB, Referencia, Estado, Aerolínea o Creator..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                {filterText && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setFilterText('')}
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <small className="text-muted mt-2 d-block">
                Mostrando {filteredShipments.length} de {shipments.length} shipments
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row">
                <div className="col-md-2 text-center">
                  <h3 className="text-primary mb-0">{shipments.length}</h3>
                  <small className="text-muted">Total Shipments</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-warning mb-0">
                    {shipments.filter(s => s.status === 'EN_ROUTE').length}
                  </h3>
                  <small className="text-muted">En Tránsito</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-success mb-0">
                    {shipments.filter(s => s.status === 'LANDED').length}
                  </h3>
                  <small className="text-muted">Aterrizados</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-primary mb-0">
                    {shipments.filter(s => s.status === 'BOOKED').length}
                  </h3>
                  <small className="text-muted">Reservados</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-secondary mb-0">
                    {shipments.filter(s => s.status === 'UNTRACKED').length}
                  </h3>
                  <small className="text-muted">Sin Rastreo</small>
                </div>
                <div className="col-md-2 text-center">
                  <h3 className="text-info mb-0">
                    {shipments.filter(s => s.reference === null).length}
                  </h3>
                  <small className="text-muted">Sin Referencia</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments Grid */}
      {filteredShipments.length === 0 ? (
        <div className="alert alert-info" role="alert">
          {filterText 
            ? `No se encontraron shipments que coincidan con "${filterText}"`
            : 'No hay shipments disponibles en este momento.'
          }
        </div>
      ) : (
        <div className="row g-4">
          {filteredShipments.map((shipment) => (
            <div key={shipment.id} className="col-md-6 col-lg-4 col-xl-3">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className="card-body">
                  {/* Reference Badge */}
                  {shipment.reference ? (
                    <div className="mb-2">
                      <span className="badge bg-info">
                        👤 {shipment.reference}
                      </span>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <span className="badge bg-secondary">
                        Sin Referencia
                      </span>
                    </div>
                  )}

                  {/* AWB Number */}
                  <h5 className="card-title mb-3">
                    <strong>AWB:</strong> {shipment.awb_number}
                  </h5>

                  {/* Airline */}
                  <p className="card-text mb-2">
                    <strong>Aerolínea:</strong>{' '}
                    {shipment.airline ? (
                      <>
                        <span className="badge bg-info me-2">
                          {shipment.airline.iata}
                        </span>
                        {shipment.airline.name}
                      </>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </p>

                  {/* Status */}
                  <p className="card-text mb-3">
                    <strong>Estado:</strong> {getStatusBadge(shipment.status)}
                  </p>

                  {/* Route */}
                  {shipment.route ? (
                    <>
                      <div className="mb-2">
                        <small className="text-muted">
                          <strong>Origen:</strong> {shipment.route.origin.location.iata}
                        </small>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">
                          <strong>Destino:</strong> {shipment.route.destination.location.iata}
                        </small>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Progreso</small>
                          <small className="text-muted">
                            {shipment.route.transit_percentage}%
                          </small>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div
                            className={`progress-bar ${
                              shipment.route.transit_percentage === 100
                                ? 'bg-success'
                                : 'bg-primary'
                            }`}
                            role="progressbar"
                            style={{ width: `${shipment.route.transit_percentage}%` }}
                            aria-valuenow={shipment.route.transit_percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted mb-3">
                      <small>No hay información de ruta disponible</small>
                    </p>
                  )}

                  {/* Creator Info */}
                  <div className="mb-3">
                    <small className="text-muted">
                      <strong>Creado por:</strong> {shipment.creator.name}
                    </small>
                  </div>

                  {/* Ver Detalles Button */}
                  <button
                    className="btn btn-sm btn-outline-primary w-100"
                    onClick={() => openModal(shipment)}
                  >
                    Ver Detalles Completos
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedShipment && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <span className="badge bg-white text-danger me-2">ADMIN</span>
                  Detalles del Shipment - AWB: {selectedShipment.awb_number}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {/* Reference */}
                <div className="mb-3">
                  <strong>Referencia (Cliente):</strong>{' '}
                  {selectedShipment.reference ? (
                    <span className="badge bg-info fs-6">{selectedShipment.reference}</span>
                  ) : (
                    <span className="badge bg-secondary">Sin Referencia</span>
                  )}
                </div>

                {/* AWB Number */}
                <div className="mb-3">
                  <strong>AWB Number:</strong> {selectedShipment.awb_number}
                </div>

                {/* ID Interno */}
                <div className="mb-3">
                  <strong>ID Interno:</strong> {selectedShipment.id}
                </div>

                {/* Status */}
                <div className="mb-3">
                  <strong>Estado:</strong> {getStatusBadge(selectedShipment.status)}
                  {selectedShipment.status_split && (
                    <span className="badge bg-warning ms-2">Split</span>
                  )}
                </div>

                {/* Airline */}
                <div className="mb-3">
                  <strong>Aerolínea:</strong>{' '}
                  {selectedShipment.airline ? (
                    <>
                      <span className="badge bg-info me-2">
                        {selectedShipment.airline.iata}
                      </span>
                      {selectedShipment.airline.name}
                    </>
                  ) : (
                    <span className="text-muted">N/A</span>
                  )}
                </div>

                {/* Cargo */}
                <div className="mb-3">
                  <strong>Carga:</strong>
                  <ul className="list-unstyled ms-3 mt-2">
                    <li>
                      <strong>Piezas:</strong>{' '}
                      {selectedShipment.cargo.pieces ?? <span className="text-muted">N/A</span>}
                    </li>
                    <li>
                      <strong>Peso:</strong>{' '}
                      {selectedShipment.cargo.weight ? `${selectedShipment.cargo.weight} kg` : (
                        <span className="text-muted">N/A</span>
                      )}
                    </li>
                    <li>
                      <strong>Volumen:</strong>{' '}
                      {selectedShipment.cargo.volume ? `${selectedShipment.cargo.volume} m³` : (
                        <span className="text-muted">N/A</span>
                      )}
                    </li>
                  </ul>
                </div>

                {/* Route */}
                {selectedShipment.route && (
                  <div className="mb-3">
                    <strong>Ruta:</strong>
                    <div className="card mt-2">
                      <div className="card-body">
                        {/* Origin */}
                        <div className="mb-3">
                          <h6 className="text-primary">Origen</h6>
                          <p className="mb-1">
                            <strong>Aeropuerto:</strong>{' '}
                            {selectedShipment.route.origin.location.name} (
                            {selectedShipment.route.origin.location.iata})
                          </p>
                          <p className="mb-1">
                            <strong>País:</strong>{' '}
                            {selectedShipment.route.origin.location.country.name} (
                            {selectedShipment.route.origin.location.country.code})
                          </p>
                          <p className="mb-0">
                            <strong>Salida:</strong>{' '}
                            {formatDate(selectedShipment.route.origin.date_of_dep)}
                          </p>
                        </div>

                        {/* Destination */}
                        <div className="mb-3">
                          <h6 className="text-success">Destino</h6>
                          <p className="mb-1">
                            <strong>Aeropuerto:</strong>{' '}
                            {selectedShipment.route.destination.location.name} (
                            {selectedShipment.route.destination.location.iata})
                          </p>
                          <p className="mb-1">
                            <strong>País:</strong>{' '}
                            {selectedShipment.route.destination.location.country.name} (
                            {selectedShipment.route.destination.location.country.code})
                          </p>
                          <p className="mb-0">
                            <strong>Llegada:</strong>{' '}
                            {formatDate(selectedShipment.route.destination.date_of_rcf)}
                          </p>
                        </div>

                        {/* Transit Info */}
                        <div>
                          <p className="mb-1">
                            <strong>Tiempo de Tránsito:</strong>{' '}
                            {selectedShipment.route.transit_time} horas
                          </p>
                          <p className="mb-1">
                            <strong>Escalas:</strong> {selectedShipment.route.ts_count}
                          </p>
                          <div className="mt-2">
                            <div className="d-flex justify-content-between mb-1">
                              <small><strong>Progreso:</strong></small>
                              <small>{selectedShipment.route.transit_percentage}%</small>
                            </div>
                            <div className="progress" style={{ height: '12px' }}>
                              <div
                                className={`progress-bar ${
                                  selectedShipment.route.transit_percentage === 100
                                    ? 'bg-success'
                                    : 'bg-primary'
                                }`}
                                role="progressbar"
                                style={{ 
                                  width: `${selectedShipment.route.transit_percentage}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedShipment.tags.length > 0 && (
                  <div className="mb-3">
                    <strong>Tags:</strong>
                    <div className="mt-2">
                      {selectedShipment.tags.map((tag) => (
                        <span key={tag.id} className="badge bg-secondary me-2 mb-2">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Creator */}
                <div className="mb-3">
                  <strong>Creado por:</strong>
                  <p className="mb-0 ms-3">
                    {selectedShipment.creator.name} ({selectedShipment.creator.email})
                  </p>
                </div>

                {/* Dates */}
                <div className="mb-3">
                  <strong>Fechas:</strong>
                  <ul className="list-unstyled ms-3 mt-2">
                    <li>
                      <strong>Creado:</strong> {formatDate(selectedShipment.created_at)}
                    </li>
                    <li>
                      <strong>Actualizado:</strong> {formatDate(selectedShipment.updated_at)}
                    </li>
                    <li>
                      <strong>Verificado:</strong> {formatDate(selectedShipment.checked_at)}
                    </li>
                    {selectedShipment.discarded_at && (
                      <li>
                        <strong>Descartado:</strong>{' '}
                        {formatDate(selectedShipment.discarded_at)}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS adicional para hover effect */}
      <style>{`
        .hover-shadow {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .hover-shadow:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  );
}

export default ShipsGoTrackingAdmin;