import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface oceanShipment {
  id: number;
  number: string;
  operationFlow: string;
  shipmentType: string;
  departure: string;
  arrival: string;
  portOfLoading: string;  // Origen actualizado
  portOfUnloading: string;  // Destino actualizado
  typeOfMove: string;  // Tipo de movimiento (FCL, LCL)
  vessel: string;  // Nombre de la embarcación
  voyage: string | null;  // Número de viaje
  carrier: string;
  fowaredBl: string;  // BL actualizado
  waybillNumber: string;
  containerNumber: string | null;
  consignee: string;
  consigneeAddress: string;
  shipper: string;
  shipperAddress: string;
  salesRep: string;
  customerReference: string;  // Referencia del cliente
  totalCharge_IncomeDisplayValue: string;
  totalCharge_IncomeValue: number;
  totalCharge_ExpenseDisplayValue: string;
  totalCharge_ExpenseValue: number;
  totalCharge_ProfitDisplayValue: string;
  totalCharge_ProfitValue: number;
  cargoDescription: string;
  cargoStatus: string;
  createdOn: string;
  totalCargo_Pieces: number;
  totalCargo_WeightValue: number;
  totalCargo_WeightDisplayValue: string;
  totalCargo_VolumeValue: number;
  totalCargo_VolumeDisplayValue: string;
  quoteTransitDays: number;  // Días de tránsito estimados
  view: string;  // URL para ver detalles completos
  // Add other fields as needed based on the full JSON structure
}

const ReportsOperationsOcean = () => {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const filterConsignee = user?.username || '';
  
  const [shipments, setShipments] = useState<oceanShipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<oceanShipment[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Cambiado a false para manejar mejor el caché
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showingAll, setShowingAll] = useState(false);

  // Claves para el caché
  const CACHE_KEY = 'oceanShipmentsCache';
  const CACHE_TIMESTAMP_KEY = 'oceanShipmentsCacheTimestamp';
  const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hora en milisegundos

  // Función para cargar datos desde el caché
  const loadFromCache = () => {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cachedData && timestamp) {
      try {
        const parsedData = JSON.parse(cachedData);
        const cacheAge = Date.now() - Number(timestamp);
        
        if (cacheAge < CACHE_EXPIRY) {
          console.log('Cargando datos desde caché - guardados hace', Math.floor(cacheAge / 60000), 'minutos');
          setShipments(parsedData);
          setFilteredShipments(parsedData.slice(0, 20));
          setShowingAll(false);
          return true;
        } else {
          console.log('Caché expirado, cargando nuevos datos');
        }
      } catch (error) {
        console.error('Error al parsear datos del caché:', error);
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      }
    }
    
    return false;
  };

  // Función para guardar datos en el caché
  const saveToCache = (data: oceanShipment[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('Datos guardados en caché');
    } catch (error) {
      console.error('Error al guardar datos en caché:', error);
    }
  };

  const fetchoceanShipments = async () => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://api.linbis.com/ocean-shipments/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido o expirado.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const oceanShipmentsArray: oceanShipment[] = Array.isArray(data) ? data : [];
      
      // Filtrar por consignee (usuario actual)
      const filtered = oceanShipmentsArray.filter(as => as.consignee === filterConsignee);
      
      // Ordenar por fecha de creación (más recientes primero)
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.createdOn || 0);
        const dateB = new Date(b.createdOn || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Guardar en caché
      saveToCache(sorted);
      
      // Actualizar estado
      setShipments(sorted);
      setFilteredShipments(sorted.slice(0, 20));
      setShowingAll(false);
      
      console.log(`${oceanShipmentsArray.length} ocean shipments totales, ${filtered.length} del consignee, mostrando los 20 más recientes`);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  // Este efecto se ejecuta una sola vez al cargar el componente
  useEffect(() => {
    // Si hay datos en caché, cargarlos, sino hacer fetch
    if (!loadFromCache()) {
      // Solo si el accessToken está disponible
      if (accessToken) {
        console.log('No hay datos en caché, haciendo fetch...');
        fetchoceanShipments();
      } else {
        console.log('No hay token disponible todavía');
      }
    }
  }, []); // Sin dependencias para que solo se ejecute una vez

  // Este efecto se ejecuta cuando cambia el accessToken o filterConsignee
  useEffect(() => {
    // Si cambia el token o el usuario, y ya estamos mostrando datos, refrescar
    if (accessToken && shipments.length > 0 && !loading) {
      console.log('Token o usuario cambiado, actualizando datos...');
      fetchoceanShipments();
    }
  }, [accessToken, filterConsignee]); // Solo dependencias clave

  // Función para manejar la búsqueda
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredShipments(shipments.slice(0, 20));
      setShowingAll(false);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const results = shipments.filter(shipment => 
      (shipment.number?.toLowerCase().includes(searchLower) ||
      shipment.consignee?.toLowerCase().includes(searchLower) ||
      shipment.shipper?.toLowerCase().includes(searchLower) ||
      shipment.fowaredBl?.toLowerCase().includes(searchLower) ||
      shipment.waybillNumber?.toLowerCase().includes(searchLower) ||
      shipment.vessel?.toLowerCase().includes(searchLower) ||
      shipment.cargoDescription?.toLowerCase().includes(searchLower) ||
      shipment.portOfLoading?.toLowerCase().includes(searchLower) ||
      shipment.portOfUnloading?.toLowerCase().includes(searchLower))
    );

    setFilteredShipments(results);
    setShowingAll(true);
  };

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredShipments(shipments.slice(0, 20));
    setShowingAll(false);
  };

  // Mostrar todos los envíos
  const showAllShipments = () => {
    setFilteredShipments(shipments);
    setShowingAll(true);
  };

  // Helper function to get status badge class based on cargo status
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'PreLoaded':
        return 'bg-warning text-dark';
      case 'In Transit':
        return 'bg-info text-dark';
      case 'Arrived':
        return 'bg-success';
      case 'Custom Clearance':
        return 'bg-primary';
      case 'Ready For Pick Up':
        return 'bg-info';
      case 'Delivered':
        return 'bg-dark';
      case 'With Problems':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  // Helper function to format CLP values
  const formatCLP = (clpValue: string): string => {
    if (!clpValue) return 'N/A';
    
    // Extraer solo los números si el string viene con formato
    let numericValue = clpValue.replace(/[^0-9,.]/g, '');
    
    // Reemplazar comas por puntos y viceversa si es necesario
    if (numericValue.includes(',') && numericValue.includes('.')) {
      // Si tiene ambos, asumir formato europeo (1.000,00)
      numericValue = numericValue.replace(/\./g, '').replace(',', '.');
    } else if (numericValue.includes(',')) {
      numericValue = numericValue.replace(',', '.');
    }
    
    const value = parseFloat(numericValue);
    if (isNaN(value)) return clpValue;
    
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Helper function to format dates
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  // Calcular días estimados para la llegada
  const calculateRemainingDays = (arrivalDate: string): number | null => {
    if (!arrivalDate) return null;
    
    const arrival = new Date(arrivalDate);
    if (isNaN(arrival.getTime())) return null;
    
    const today = new Date();
    const diffTime = arrival.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Calcular porcentaje de progreso del envío
  const calculateProgress = (departureDate: string, arrivalDate: string): number => {
    if (!departureDate || !arrivalDate) return 0;
    
    const departure = new Date(departureDate);
    const arrival = new Date(arrivalDate);
    const today = new Date();
    
    if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) return 0;
    
    const totalTime = arrival.getTime() - departure.getTime();
    const elapsedTime = today.getTime() - departure.getTime();
    
    if (totalTime <= 0) return 0;
    if (elapsedTime <= 0) return 0;
    if (elapsedTime >= totalTime) return 100;
    
    return Math.round((elapsedTime / totalTime) * 100);
  };

  if (loading && shipments.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">Reportes de Operaciones Marítimas</h2>
      
      <div className="row mb-4 align-items-center">
        <div className="col-md-8">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar envíos por BL, naviera, puerto, vessel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              className="btn btn-outline-primary" 
              type="button"
              onClick={handleSearch}
            >
              <i className="bi bi-search"></i> Buscar
            </button>
            {searchTerm && (
              <button 
                className="btn btn-outline-secondary" 
                type="button"
                onClick={clearSearch}
              >
                <i className="bi bi-x"></i> Limpiar
              </button>
            )}
          </div>
        </div>
        
        <div className="col-md-4 text-end">
          <button 
            className="btn btn-primary me-2"
            onClick={fetchoceanShipments}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Cargando...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-clockwise"></i> Actualizar
              </>
            )}
          </button>
          
          {!showingAll && shipments.length > 20 && (
            <button 
              className="btn btn-outline-success"
              onClick={showAllShipments}
            >
              Ver todos ({shipments.length})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="mb-3">
        <small className="text-muted">
          {showingAll 
            ? `Mostrando ${filteredShipments.length} de ${shipments.length} envíos` 
            : `Mostrando ${Math.min(20, filteredShipments.length)} de ${shipments.length} envíos más recientes`}
        </small>
      </div>

      {filteredShipments.length === 0 ? (
        <div className="alert alert-info">No se encontraron envíos marítimos</div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {filteredShipments.map((shipment) => {
            const progress = calculateProgress(shipment.departure, shipment.arrival);
            const remainingDays = calculateRemainingDays(shipment.arrival);
            
            return (
              <div className="col" key={shipment.id}>
                <div className="card h-100 shadow-sm">
                  {/* Encabezado de la Card */}
                  <div className="card-header bg-light">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="card-title mb-0">{shipment.number}</h5>
                        <p className="card-subtitle mt-1 mb-0 text-muted small">
                          <span className="fw-bold">BL:</span> {shipment.fowaredBl || 'N/A'}
                        </p>
                      </div>
                      <span className={`badge ${getStatusBadgeClass(shipment.cargoStatus)}`}>
                        {shipment.cargoStatus}
                      </span>
                    </div>
                  </div>
                  
                  {/* Cuerpo de la Card */}
                  <div className="card-body">
                    {/* Sección 1: Información Principal de Ruta */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="text-start">
                          <div className="fs-6 fw-bold mb-0">{shipment.portOfLoading || 'N/A'}</div>
                          <small className="text-muted">Origen</small>
                        </div>
                        <i className="bi bi-arrow-right text-muted"></i>
                        <div className="text-end">
                          <div className="fs-6 fw-bold mb-0">{shipment.portOfUnloading || 'N/A'}</div>
                          <small className="text-muted">Destino</small>
                        </div>
                      </div>

                      {/* Barra de Progreso */}
                      <div className="progress mb-2" style={{ height: '8px' }}>
                        <div 
                          className="progress-bar bg-success" 
                          role="progressbar" 
                          style={{ width: `${progress}%` }}
                          aria-valuenow={progress} 
                          aria-valuemin={0} 
                          aria-valuemax={100}
                        ></div>
                      </div>
                      
                      <div className="d-flex justify-content-between small mb-2">
                        <div>
                          <span className="fw-bold">{formatDate(shipment.departure)}</span>
                          <div className="text-muted small">Salida</div>
                        </div>
                        <div className="text-center">
                          <span className="badge bg-info text-dark">
                            {shipment.quoteTransitDays || '?'} días
                          </span>
                          <div className="text-muted small">Tránsito</div>
                        </div>
                        <div className="text-end">
                          <span className="fw-bold">{formatDate(shipment.arrival)}</span>
                          <div className="text-muted small">Llegada</div>
                        </div>
                      </div>
                      
                      {/* Días Restantes */}
                      {remainingDays !== null && remainingDays > 0 && (
                        <div className="text-center small">
                          <span className="badge bg-primary">{remainingDays} días para la llegada</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Sección 2: Información del Buque */}
                    <div className="mb-3 p-2 bg-light rounded">
                      <div className="d-flex align-items-center mb-1">
                        <i className="bi bi-water me-2 text-primary"></i>
                        <div className="fw-bold">{shipment.vessel || 'N/A'}</div>
                      </div>
                      <div className="d-flex justify-content-between small text-muted">
                        <span><i className="bi bi-tags me-1"></i>{shipment.typeOfMove || 'N/A'}</span>
                        <span><i className="bi bi-box-seam me-1"></i>{shipment.carrier || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Sección 3: Información del Cargamento */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="border rounded p-2 h-100">
                          <div className="small text-muted">Piezas</div>
                          <div className="fw-bold">{shipment.totalCargo_Pieces || '0'}</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-2 h-100">
                          <div className="small text-muted">Peso</div>
                          <div className="fw-bold">{shipment.totalCargo_WeightDisplayValue || '0'} kg</div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="border rounded p-2">
                          <div className="small text-muted">Volumen</div>
                          <div className="fw-bold">{shipment.totalCargo_VolumeDisplayValue || '0'} m³</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sección 4: Consignatario y Embarcador */}
                    <div className="mb-3">
                      <div className="mb-2">
                        <div className="small text-muted">Consignatario</div>
                        <div className="fw-bold text-truncate">{shipment.consignee}</div>
                      </div>
                      <div className="mb-0">
                        <div className="small text-muted">Embarcador</div>
                        <div className="fw-bold text-truncate">{shipment.shipper}</div>
                      </div>
                    </div>
                    
                    {/* Sección 5: Referencia del Cliente */}
                    {shipment.customerReference && (
                      <div className="mb-0">
                        <div className="small text-muted">Referencia</div>
                        <div className="small text-truncate">{shipment.customerReference}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Pie de la Card */}
                  <div className="card-footer bg-white">
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="small fw-bold">Ingresos:</span>
                        <span className="text-primary">{formatCLP(shipment.totalCharge_IncomeDisplayValue)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="small fw-bold">Gastos:</span>
                        <span className="text-danger">{formatCLP(shipment.totalCharge_ExpenseDisplayValue)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="small fw-bold">Ganancia:</span>
                        <span className="text-success fw-bold">{formatCLP(shipment.totalCharge_ProfitDisplayValue)}</span>
                      </div>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <small className="text-muted">
                        <i className="bi bi-calendar3 me-1"></i> {formatDate(shipment.createdOn)}
                      </small>
                      <a 
                        href={shipment.view} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-eye"></i> Ver
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Estado vacío - Sin envíos cargados */}
      {shipments.length === 0 && !loading && (
        <div className="text-center p-5 bg-white rounded shadow-sm">
          <div className="display-1 text-muted mb-4">
            🚢
          </div>
          <h5 className="mb-2">No hay envíos marítimos disponibles</h5>
          <p className="text-muted">
            No se encontraron envíos marítimos para tu cuenta
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsOperationsOcean;