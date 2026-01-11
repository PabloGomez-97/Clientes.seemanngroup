// src/components/shipsgo/ShipsGoTracking.tsx
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Shipsgotracking.css';

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

// ✅ Detectar automáticamente el ambiente
const API_BASE_URL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:4000'
  : 'https://portalclientes.seemanngroup.com';

function ShipsGoTracking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showModal, setShowModal] = useState(false);

  // ✅ FILTRADO: Obtener solo los shipments del usuario actual
  const userShipments = useMemo(() => {
    if (!user?.username) return [];
    
    return allShipments.filter(shipment => {
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

  useEffect(() => {
    fetchShipments();
  }, []);

  // ✅ FUNCIÓN PARA DETECTAR RETRASOS
  const isDelayed = (shipment: Shipment): boolean => {
    if (!shipment.route) return false;
    
    const progress = shipment.route.transit_percentage;
    const estimatedArrival = shipment.route.destination.date_of_rcf;
    const lastUpdate = shipment.updated_at;
    
    if (!estimatedArrival || progress >= 100) return false;
    
    const arrivalDate = new Date(estimatedArrival);
    const updateDate = new Date(lastUpdate);
    
    return updateDate >= arrivalDate && progress < 100;
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

  // Función para formatear fecha compacta
  const formatDateCompact = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year}\n${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };

  // Función para abrir el modal
  const openModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedShipment(null);
  };

  // Función para obtener el status badge normalizado
  const getStatusClass = (status: string): string => {
    const normalized = status.toLowerCase().replace('_', '-');
    return normalized;
  };

  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      'BOOKED': 'Reservado',
      'EN_ROUTE': 'En Tránsito',
      'LANDED': 'Aterrizado',
      'DELIVERED': 'Entregado',
      'UNTRACKED': 'Sin Rastreo',
      'DISCARDED': 'Descartado',
    };
    return statusLabels[status] || status;
  };

  // Función para obtener la URL de la bandera
  const getFlagUrl = (countryCode: string): string => {
    return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
  };

  // Render de loading
  if (loading) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-container">
          <div className="tracking-header">
            <h2>Rastreo de Envíos</h2>
            <p className="subtitle">Bienvenido, {user?.username}</p>
          </div>
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Cargando tus envíos...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render de error
  if (error) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-container">
          <div className="tracking-header">
            <h2>Rastreo de Envíos</h2>
            <p className="subtitle">Bienvenido, {user?.username}</p>
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
      </div>
    );
  }

  // Render cuando NO hay envíos
  if (userShipments.length === 0) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-container">
          <div className="tracking-header">
            <h2>Rastreo de Envíos</h2>
            <p className="subtitle">Bienvenido, {user?.username}</p>
          </div>
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
              </svg>
            </div>
            <h3 className="empty-title">No tienes envíos registrados</h3>
            <p className="empty-description">
              Comienza creando tu primer seguimiento de envío
            </p>
            <button 
              className="btn-create-shipment"
              onClick={() => navigate('/create-shipment')}
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              Crear Nuevo Seguimiento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render principal con envíos
  return (
    <div className="tracking-wrapper">
      <div className="tracking-container">
        {/* Header */}
        <div className="tracking-header">
          <h2>Rastreo de Envíos</h2>
          <p className="subtitle">Bienvenido, {user?.username}</p>
        </div>

        {/* Alerts de Retraso */}
        {userShipments.filter(isDelayed).map((shipment) => (
          <div key={`delay-${shipment.id}`} className="delay-alert">
            <div className="delay-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
            </div>
            <div className="delay-content">
              <h3 className="delay-title">
                AWB {shipment.awb_number} - Estado de su envío: Con retraso
              </h3>
              <p className="delay-message">
                Estamos obteniendo mayor información respecto al retraso de su cargamento. 
                Lamentamos los inconvenientes.
              </p>
            </div>
          </div>
        ))}

        {/* Botón Create Tracking */}
        <div className="create-tracking-container">
          <button
            type="button"
            className="btn-create-tracking"
            onClick={() => navigate('/new-tracking')}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Create New Tracking
          </button>
        </div>

        {/* Tabla de Shipments */}
        <div className="shipments-table-wrapper">
          <div className="shipments-table">
            {/* Header de la tabla */}
            <div className="table-header">
              <div className="table-header-cell">View</div>
              <div className="table-header-cell">Status</div>
              <div className="table-header-cell">Airline</div>
              <div className="table-header-cell">Reference</div>
              <div className="table-header-cell">AWB Number</div>
              <div className="table-header-cell">Origin</div>
              <div className="table-header-cell">TD</div>
              <div className="table-header-cell">Destination</div>
              <div className="table-header-cell">Tags</div>
              <div className="table-header-cell">Created At</div>
            </div>

            {/* Filas de shipments */}
            {userShipments.map((shipment) => (
              <div 
                key={shipment.id} 
                className="shipment-row"
              >
              {/* View */}
              <div className="table-cell cell-view" data-label="View">
                <button 
                  className="btn-view"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(shipment);
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                  </svg>
                </button>
              </div>

              {/* Status */}
              <div className="table-cell" data-label="Status">
                <span className={`status-badge ${getStatusClass(shipment.status)}`}>
                  {getStatusLabel(shipment.status)}
                </span>
              </div>

              {/* Airline */}
              <div className="table-cell" data-label="Airline">
                <div className="airline-name">
                  {shipment.airline?.name || '-'}
                </div>
              </div>

              {/* Reference */}
              <div className="table-cell" data-label="Reference">
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {shipment.reference || '-'}
                </div>
              </div>

              {/* AWB Number */}
              <div className="table-cell" data-label="AWB Number">
                <div className="awb-number">{shipment.awb_number}</div>
              </div>

              {/* Origin */}
              <div className="table-cell" data-label="Origin">
                {shipment.route ? (
                  <div className="location-cell">
                    <div className="location-header">
                      <span className="location-iata">
                        {shipment.route.origin.location.iata}
                      </span>
                      <img 
                        src={getFlagUrl(shipment.route.origin.location.country.code)}
                        alt={shipment.route.origin.location.country.name}
                        className="location-flag"
                      />
                    </div>
                    <div className="location-date">
                      {formatDateCompact(shipment.route.origin.date_of_dep).split('\n')[0]}
                      <br />
                      {formatDateCompact(shipment.route.origin.date_of_dep).split('\n')[1]}
                    </div>
                  </div>
                ) : (
                  <span>-</span>
                )}
              </div>

              {/* TD (Transit) */}
              <div className="table-cell" data-label="TD">
                {shipment.route ? (
                  <div className="transit-cell">
                    <span className="transit-count">{shipment.route.ts_count}</span>
                    <div className="progress-mini">
                      <div 
                        className={`progress-mini-fill ${
                          shipment.route.transit_percentage === 100 ? 'completed' : ''
                        }`}
                        style={{ width: `${shipment.route.transit_percentage}%` }}
                      ></div>
                    </div>
                    <span className="progress-percentage">
                      {shipment.route.transit_percentage}%
                    </span>
                  </div>
                ) : (
                  <span>-</span>
                )}
              </div>

              {/* Destination */}
              <div className="table-cell" data-label="Destination">
                {shipment.route ? (
                  <div className="location-cell">
                    <div className="location-header">
                      <span className="location-iata">
                        {shipment.route.destination.location.iata}
                      </span>
                      <img 
                        src={getFlagUrl(shipment.route.destination.location.country.code)}
                        alt={shipment.route.destination.location.country.name}
                        className="location-flag"
                      />
                    </div>
                    <div className="location-date">
                      {formatDateCompact(shipment.route.destination.date_of_rcf).split('\n')[0]}
                      <br />
                      {formatDateCompact(shipment.route.destination.date_of_rcf).split('\n')[1]}
                    </div>
                  </div>
                ) : (
                  <span>-</span>
                )}
              </div>

              {/* Tags */}
              <div className="table-cell" data-label="Tags">
                {shipment.tags.length > 0 ? (
                  <div className="tags-cell">
                    {shipment.tags.map((tag) => (
                      <span key={tag.id} className="tag-badge">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span>-</span>
                )}
              </div>

              {/* Created At */}
              <div className="table-cell date-cell" data-label="Created At">
                {formatDateCompact(shipment.created_at).split('\n')[0]}
                <br />
                {formatDateCompact(shipment.created_at).split('\n')[1]}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Modal de Detalles */}
      {showModal && selectedShipment && (
        <div 
          className="modal-overlay"
          onClick={closeModal}
        >
          <div 
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
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
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {/* Sección Principal */}
                <div className="modal-info-section">
                  <div className="modal-info-row">
                    <div className="modal-info-label">Reference:</div>
                    <div className="modal-info-value">
                      {selectedShipment.reference || <span className="text-muted">N/A</span>}
                    </div>
                  </div>

                  <div className="modal-info-row">
                    <div className="modal-info-label">Carrier:</div>
                    <div className="modal-info-value">
                      {selectedShipment.airline ? (
                        <>
                          <span style={{ 
                            background: '#45bbe0', 
                            color: 'white', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '0.25rem',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            marginRight: '0.5rem'
                          }}>
                            {selectedShipment.airline.iata}
                          </span>
                          {selectedShipment.airline.name}
                        </>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </div>
                  </div>

                  <div className="modal-info-row">
                    <div className="modal-info-label">AWB Number:</div>
                    <div className="modal-info-value">
                      <span className="awb-number">{selectedShipment.awb_number}</span>
                    </div>
                  </div>

                  <div className="modal-info-row">
                    <div className="modal-info-label">Status:</div>
                    <div className="modal-info-value">
                      <span className={`status-badge ${getStatusClass(selectedShipment.status)}`}>
                        {getStatusLabel(selectedShipment.status)}
                      </span>
                      {selectedShipment.status_split && (
                        <span className="status-badge" style={{ marginLeft: '0.5rem', background: '#fff3cd', color: '#856404' }}>
                          Split
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="modal-info-row">
                    <div className="modal-info-label">Creator:</div>
                    <div className="modal-info-value">
                      {formatDate(selectedShipment.created_at)}
                    </div>
                  </div>
                </div>

                {/* Cargo Grid */}
                <div className="modal-cargo-grid">
                  <div className="modal-cargo-item">
                    <div className="modal-cargo-label">Pieces</div>
                    <div className="modal-cargo-value">
                      {selectedShipment.cargo.pieces ?? '-'}
                    </div>
                  </div>
                  <div className="modal-cargo-item">
                    <div className="modal-cargo-label">Weight</div>
                    <div className="modal-cargo-value">
                      {selectedShipment.cargo.weight ? `${selectedShipment.cargo.weight} kg` : '-'}
                    </div>
                  </div>
                  <div className="modal-cargo-item">
                    <div className="modal-cargo-label">Volume</div>
                    <div className="modal-cargo-value">
                      {selectedShipment.cargo.volume ? `${selectedShipment.cargo.volume} m³` : '-'}
                    </div>
                  </div>
                </div>

                {/* Timeline Compacta */}
                {selectedShipment.route && (
                  <div className="timeline-compact" style={{ padding: '1.25rem 1.5rem', background: 'white', borderBottom: '1px solid #e9ecef' }}>
                    <div className="timeline-compact-title">Línea de Tiempo</div>
                    
                    {selectedShipment.route.origin.date_of_dep && (
                      <div className="timeline-compact-item">
                        <div className="timeline-compact-marker completed"></div>
                        <div className="timeline-compact-content">
                          <div className="timeline-compact-label">
                            Salida desde {selectedShipment.route.origin.location.iata}
                          </div>
                          <div className="timeline-compact-date">
                            {formatDate(selectedShipment.route.origin.date_of_dep)}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedShipment.route.transit_percentage > 0 && selectedShipment.route.transit_percentage < 100 && (
                      <div className="timeline-compact-item">
                        <div className="timeline-compact-marker"></div>
                        <div className="timeline-compact-content">
                          <div className="timeline-compact-label">
                            En tránsito hacia {selectedShipment.route.destination.location.iata}
                          </div>
                          <div className="timeline-compact-date">
                            {selectedShipment.route.transit_percentage}% completado
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedShipment.route.destination.date_of_rcf && (
                      <div className="timeline-compact-item">
                        <div className={`timeline-compact-marker ${
                          selectedShipment.route.transit_percentage === 100 ? 'completed' : ''
                        }`}></div>
                        <div className="timeline-compact-content">
                          <div className="timeline-compact-label">
                            {selectedShipment.route.transit_percentage === 100 
                              ? `Llegada a ${selectedShipment.route.destination.location.iata}`
                              : `Llegada estimada a ${selectedShipment.route.destination.location.iata}`
                            }
                          </div>
                          <div className="timeline-compact-date">
                            {formatDate(selectedShipment.route.destination.date_of_rcf)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Ruta */}
                {selectedShipment.route && (
                  <div className="modal-route-section">
                    <div className="modal-route-grid">
                      <div className="modal-route-point">
                        <div className="modal-route-label">Origen</div>
                        <div className="modal-route-location">
                          {selectedShipment.route.origin.location.name}
                        </div>
                        <div className="modal-route-iata">
                          {selectedShipment.route.origin.location.iata} • {selectedShipment.route.origin.location.country.name}
                        </div>
                      </div>

                      <div className="modal-route-arrow">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                        </svg>
                      </div>

                      <div className="modal-route-point">
                        <div className="modal-route-label destination">Destino</div>
                        <div className="modal-route-location">
                          {selectedShipment.route.destination.location.name}
                        </div>
                        <div className="modal-route-iata">
                          {selectedShipment.route.destination.location.iata} • {selectedShipment.route.destination.location.country.name}
                        </div>
                      </div>
                    </div>

                    <div className="modal-route-details">
                      <div className="modal-route-detail-item">
                        <div className="modal-route-detail-label">Tiempo de Tránsito</div>
                        <div className="modal-route-detail-value">{selectedShipment.route.transit_time}h</div>
                      </div>
                      <div className="modal-route-detail-item">
                        <div className="modal-route-detail-label">Escalas</div>
                        <div className="modal-route-detail-value">{selectedShipment.route.ts_count}</div>
                      </div>
                      <div className="modal-route-detail-item">
                        <div className="modal-route-detail-label">Progreso</div>
                        <div className="modal-route-detail-value">{selectedShipment.route.transit_percentage}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedShipment.tags.length > 0 && (
                  <div className="modal-info-section">
                    <div className="modal-info-row">
                      <div className="modal-info-label">Tags:</div>
                      <div className="modal-info-value">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {selectedShipment.tags.map((tag) => (
                            <span key={tag.id} className="tag-badge">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fechas */}
                <div className="modal-info-section">
                  <div className="modal-info-row">
                    <div className="modal-info-label">Actualizado:</div>
                    <div className="modal-info-value">
                      {formatDate(selectedShipment.updated_at)}
                    </div>
                  </div>
                  <div className="modal-info-row">
                    <div className="modal-info-label">Verificado:</div>
                    <div className="modal-info-value">
                      {formatDate(selectedShipment.checked_at)}
                    </div>
                  </div>
                  {selectedShipment.discarded_at && (
                    <div className="modal-info-row">
                      <div className="modal-info-label">Descartado:</div>
                      <div className="modal-info-value">
                        {formatDate(selectedShipment.discarded_at)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShipsGoTracking;