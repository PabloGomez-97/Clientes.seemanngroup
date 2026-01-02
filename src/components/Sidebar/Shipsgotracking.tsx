// src/components/shipsgo/ShipsGoTracking.tsx
import { useState, useEffect, useMemo } from 'react';
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

function ShipsGoTracking() {
  const { user } = useAuth();
  
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showModal, setShowModal] = useState(false);

  // ✅ FILTRADO: Obtener solo los shipments del usuario actual
  const userShipments = useMemo(() => {
    if (!user?.username) return [];
    
    return allShipments.filter(shipment => {
      // Filtrar: reference debe ser exactamente igual a username
      // Excluir shipments con reference null
      return shipment.reference !== null && 
             shipment.reference === user.username;
    });
  }, [allShipments, user?.username]);

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
      
      setAllShipments(sortedShipments);
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
            <h2 className="mb-0">Rastreo de Envíos Aéreos</h2>
            <p className="text-muted">Bienvenido, {user?.username}</p>
          </div>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando tus envíos...</p>
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
            <h2 className="mb-0">Rastreo de Envíos Aéreos</h2>
            <p className="text-muted">Bienvenido, {user?.username}</p>
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

  // ✅ Render cuando NO hay envíos asignados al usuario
  if (userShipments.length === 0) {
    return (
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col">
            <h2 className="mb-0">Rastreo de Envíos Aéreos</h2>
            <p className="text-muted">Bienvenido, {user?.username}</p>
          </div>
        </div>
        
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm text-center">
              <div className="card-body py-5">
                <svg 
                  width="80" 
                  height="80" 
                  fill="currentColor" 
                  className="text-muted mb-4" 
                  viewBox="0 0 16 16"
                >
                  <path d="M2 2a2 2 0 0 0-2 2v8.01A2 2 0 0 0 2 14h5.5a.5.5 0 0 0 0-1H2a1 1 0 0 1-.966-.741l5.64-3.471L8 9.583l7-4.2V8.5a.5.5 0 0 0 1 0V4a2 2 0 0 0-2-2H2Zm3.708 6.208L1 11.105V5.383l4.708 2.825ZM1 4.217V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v.217l-7 4.2-7-4.2Z"/>
                  <path d="M14.247 14.269c1.01 0 1.587-.857 1.587-2.025v-.21C15.834 10.43 14.64 9 12.52 9h-.035C10.42 9 9 10.36 9 12.432v.214C9 14.82 10.438 16 12.358 16h.044c.594 0 1.018-.074 1.237-.175v-.73c-.245.11-.673.18-1.18.18h-.044c-1.334 0-2.571-.788-2.571-2.655v-.157c0-1.657 1.058-2.724 2.64-2.724h.04c1.535 0 2.484 1.05 2.484 2.326v.118c0 .975-.324 1.39-.639 1.39-.232 0-.41-.148-.41-.42v-2.19h-.906v.569h-.03c-.084-.298-.368-.63-.954-.63-.778 0-1.259.555-1.259 1.4v.528c0 .892.49 1.434 1.26 1.434.471 0 .896-.227 1.014-.643h.043c.118.42.617.648 1.12.648Zm-2.453-1.588v-.227c0-.546.227-.791.573-.791.297 0 .572.192.572.708v.367c0 .573-.253.744-.564.744-.354 0-.581-.215-.581-.8Z"/>
                </svg>
                <h4 className="mb-3">No tienes envíos asignados</h4>
                <p className="text-muted mb-4">
                  Actualmente no hay trackeos registrados a tu nombre. Si necesitas activar el rastreo 
                  de un nuevo envío, puedes solicitarlo a continuación.
                </p>
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    // 🔴 AQUÍ AGREGARÁS TU LINK EN EL FUTURO
                    // Por ejemplo: window.location.href = '/solicitar-trackeo'
                    alert('Funcionalidad de solicitud próximamente disponible');
                  }}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    fill="currentColor" 
                    className="me-2" 
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                  </svg>
                  Solicitar Trackeo
                </button>
                <div className="mt-4">
                  <small className="text-muted">
                    ¿Necesitas ayuda? Contacta a tu ejecutivo de cuenta
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2 className="mb-0">Rastreo de Envíos Aéreos</h2>
          <p className="text-muted">Bienvenido, {user?.username}</p>
        </div>
        <div className="col-md-4 text-end">
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

      {/* Info Card */}
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 text-center">
                  <h3 className="text-primary mb-0">{userShipments.length}</h3>
                  <small className="text-muted">Mis Envíos</small>
                </div>
                <div className="col-md-3 text-center">
                  <h3 className="text-warning mb-0">
                    {userShipments.filter(s => s.status === 'EN_ROUTE').length}
                  </h3>
                  <small className="text-muted">En Tránsito</small>
                </div>
                <div className="col-md-3 text-center">
                  <h3 className="text-success mb-0">
                    {userShipments.filter(s => s.status === 'LANDED').length}
                  </h3>
                  <small className="text-muted">Aterrizados</small>
                </div>
                <div className="col-md-3 text-center">
                  <h3 className="text-primary mb-0">
                    {userShipments.filter(s => s.status === 'BOOKED').length}
                  </h3>
                  <small className="text-muted">Reservados</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments Grid */}
      <div className="row g-4">
        {userShipments.map((shipment) => (
          <div key={shipment.id} className="col-md-6 col-lg-4 col-xl-3">
            <div className="card h-100 shadow-sm hover-shadow">
              <div className="card-body">
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
                        {' - '}
                        {shipment.route.origin.location.name}
                      </small>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">
                        <strong>Destino:</strong> {shipment.route.destination.location.iata}
                        {' - '}
                        {shipment.route.destination.location.name}
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

      {/* Modal */}
      {showModal && selectedShipment && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Detalles del Shipment - AWB: {selectedShipment.awb_number}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {/* Reference */}
                <div className="mb-3">
                  <strong>Referencia (Cliente):</strong>{' '}
                  {selectedShipment.reference || <span className="text-muted">N/A</span>}
                </div>

                {/* AWB Number */}
                <div className="mb-3">
                  <strong>AWB Number:</strong> {selectedShipment.awb_number}
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

export default ShipsGoTracking;