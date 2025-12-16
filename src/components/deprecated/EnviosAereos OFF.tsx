import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

// Interfaces para el objeto detallado
interface DateTimeObject {
  type: string | null;
  date: string | null;
  time: string | null;
  displayDate: string | null;
  displayTime: string | null;
}

interface Entity {
  id: number;
  name: string;
  accountNumber: string | null;
  code: string;
  scacNumber: string;
  iataCode: string | null;
  identificationNumber: string | null;
  email: string | null;
  primaryAddress: string | null;
  billingAddress: string | null;
  phone: string | null;
  addresses: any[];
  ownerId: string | null;
}

interface PackageType {
  id: number;
  description: string;
  isShippingContainer: boolean;
}

interface CommodityItem {
  id: number;
  item: string | null;
  lotNumber: string | null;
  ncmCode: string | null;
  model: string | null;
  serialNumber: string | null;
}

interface Commodity {
  commodityTypeName: string | null;
  commodityType: number;
  poNumber: string | null;
  invoiceNumber: string | null;
  pieces: number;
  description: string;
  weightPerUnitValue: number;
  weightPerUnitUOM: number;
  totalWeightValue: number;
  totalWeightUOM: number;
  lengthValue: number;
  lengthUOM: number;
  widthValue: number;
  widthUOM: number;
  heightValue: number;
  heightUOM: number;
  volumeValue: number;
  volumeUOM: number;
  totalVolumeValue: number;
  totalVolumeUOM: number;
  volumeWeightValue: number | null;
  volumeWeightUOM: number;
  totalVolumeWeightValue: number | null;
  totalVolumeWeightUOM: number;
  location: string | null;
  commodityItem: CommodityItem;
  repackItems: any | null;
  packageType: PackageType;
  dimensionalFactor: number;
  trackingNumber: string | null;
  containerNumber: string | null;
  sealNumberOne: string | null;
  sealNumberTwo: string | null;
  chassisNumber: string | null;
  id: number;
  auditTrail: any;
}

interface AirShipment {
  id: number;
  number: string;
  operationFlow: number;
  shipmentType: number;
  departure: DateTimeObject;
  arrival: DateTimeObject;
  from: string | null;
  to: string | null;
  carrier: Entity;
  waybillNumber: string;
  consignee: Entity;
  shipper: Entity;
  customerReference: string;
  cargoDescription: string;
  commodities: Commodity[];
  manifestedPieces: number;
  manifestedWeight: number;
  paymentType: number;
  shipmentClass: number;
  hazardous: boolean;
  customsReleased: boolean;
  freightReleased: boolean;
  parentShipmentId: number | null;
  auditTrail: any;
}

// Helper para calcular totales desde commodities
interface CalculatedTotals {
  totalPieces: number;
  totalWeight: number;
  totalVolume: number;
  totalVolumeWeight: number;
}

const calculateTotals = (commodities: Commodity[]): CalculatedTotals => {
  if (!commodities || commodities.length === 0) {
    return {
      totalPieces: 0,
      totalWeight: 0,
      totalVolume: 0,
      totalVolumeWeight: 0
    };
  }

  return commodities.reduce((acc, commodity) => {
    return {
      totalPieces: acc.totalPieces + (commodity.pieces || 0),
      totalWeight: acc.totalWeight + (commodity.totalWeightValue || 0),
      totalVolume: acc.totalVolume + (commodity.totalVolumeValue || 0),
      totalVolumeWeight: acc.totalVolumeWeight + (commodity.totalVolumeWeightValue || 0)
    };
  }, {
    totalPieces: 0,
    totalWeight: 0,
    totalVolume: 0,
    totalVolumeWeight: 0
  });
};

// Helper para mapear operationFlow
const getOperationFlowLabel = (flow: number): string => {
  switch (flow) {
    case 1: return 'Inbound';
    case 2: return 'Outbound';
    case 3: return 'Domestic';
    default: return 'N/A';
  }
};

// Helper para mapear shipmentType
const getShipmentTypeLabel = (type: number): string => {
  switch (type) {
    case 1: return 'Direct';
    case 2: return 'Consolidation';
    case 3: return 'Deconsolidation';
    default: return 'N/A';
  }
};

// Helper para mapear shipmentClass
const getShipmentClassLabel = (shipmentClass: number): string => {
  switch (shipmentClass) {
    case 1: return 'House';
    case 2: return 'Master';
    default: return 'N/A';
  }
};

const ReportsOperations = () => {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const filterConsignee = user?.username || '';
  
  const [shipments, setShipments] = useState<AirShipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<AirShipment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showingAll, setShowingAll] = useState(false);

  // Claves para el caché
  const CACHE_KEY = 'airShipmentsCache';
  const CACHE_TIMESTAMP_KEY = 'airShipmentsCacheTimestamp';
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
  const saveToCache = (data: AirShipment[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('Datos guardados en caché');
    } catch (error) {
      console.error('Error al guardar datos en caché:', error);
    }
  };

  const fetchAirShipments = async () => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://api.linbis.com/air-shipments', {
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
      const airShipmentsArray: AirShipment[] = Array.isArray(data) ? data : [];
      
      // Filtrar por consignee (usuario actual)
      const filtered = airShipmentsArray.filter(as => 
        as.consignee?.name === filterConsignee
      );
      
      // Ordenar por fecha de creación (más recientes primero)
      const sorted = filtered.sort((a, b) => {
        const dateA = a.auditTrail?.createdOn?.date ? new Date(a.auditTrail.createdOn.date).getTime() : 0;
        const dateB = b.auditTrail?.createdOn?.date ? new Date(b.auditTrail.createdOn.date).getTime() : 0;
        return dateB - dateA;
      });
      
      // Guardar en caché
      saveToCache(sorted);
      
      // Actualizar estado
      setShipments(sorted);
      setFilteredShipments(sorted.slice(0, 20));
      setShowingAll(false);
      
      console.log(`${airShipmentsArray.length} air shipments totales, ${filtered.length} del consignee, mostrando los 20 más recientes`);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  // Este efecto se ejecuta una sola vez al cargar el componente
  useEffect(() => {
    if (!loadFromCache()) {
      if (accessToken) {
        console.log('No hay datos en caché, haciendo fetch...');
        fetchAirShipments();
      } else {
        console.log('No hay token disponible todavía');
      }
    }
  }, []);

  // Este efecto se ejecuta cuando cambia el accessToken o filterConsignee
  useEffect(() => {
    if (accessToken && shipments.length > 0 && !loading) {
      console.log('Token o usuario cambiado, actualizando datos...');
      fetchAirShipments();
    }
  }, [accessToken, filterConsignee]);

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
      shipment.consignee?.name?.toLowerCase().includes(searchLower) ||
      shipment.shipper?.name?.toLowerCase().includes(searchLower) ||
      shipment.waybillNumber?.toLowerCase().includes(searchLower) ||
      shipment.cargoDescription?.toLowerCase().includes(searchLower) ||
      shipment.from?.toLowerCase().includes(searchLower) ||
      shipment.to?.toLowerCase().includes(searchLower) ||
      shipment.customerReference?.toLowerCase().includes(searchLower))
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

  // Helper function to get status badge class
  const getStatusBadgeClass = (hazardous: boolean, customsReleased: boolean, freightReleased: boolean): string => {
    if (freightReleased) return 'bg-success';
    if (customsReleased) return 'bg-info';
    if (hazardous) return 'bg-danger';
    return 'bg-warning';
  };

  // Helper function to get status label
  const getStatusLabel = (hazardous: boolean, customsReleased: boolean, freightReleased: boolean): string => {
    if (freightReleased) return 'Carga Liberada';
    if (customsReleased) return 'Aduana Liberada';
    if (hazardous) return 'Peligroso';
    return 'En Proceso';
  };

  // Helper para formatear fechas
  const formatDate = (dateObj: DateTimeObject | string | null): string => {
    if (!dateObj) return 'N/A';
    
    // Si es un objeto DateTimeObject, usar displayDate
    if (typeof dateObj === 'object' && dateObj.displayDate) {
      return dateObj.displayDate;
    }
    
    // Si es string, intentar parsear
    if (typeof dateObj === 'string') {
      try {
        const date = new Date(dateObj);
        return date.toLocaleDateString('es-CL', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        });
      } catch {
        return dateObj;
      }
    }
    
    return 'N/A';
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
      <h2 className="mb-4">Reportes de Operaciones Aéreas</h2>
      
      <div className="row mb-4 align-items-center">
        <div className="col-md-8">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar envíos..."
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
            onClick={fetchAirShipments}
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
        <div className="alert alert-info">No se encontraron envíos aéreos</div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {filteredShipments.map((shipment) => {
            const totals = calculateTotals(shipment.commodities);
            
            return (
              <div className="col" key={shipment.id}>
                <div className="card h-100 shadow-sm">
                  <div className="card-header d-flex justify-content-between align-items-start">
                    <h5 className="card-title mb-0">{shipment.number}</h5>
                    <span className={`badge ${getStatusBadgeClass(shipment.hazardous, shipment.customsReleased, shipment.freightReleased)}`}>
                      {getStatusLabel(shipment.hazardous, shipment.customsReleased, shipment.freightReleased)}
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <p className="card-subtitle mb-3 text-muted">
                      {shipment.waybillNumber || 'N/A'}
                    </p>
                    
                    <div className="mb-3">
                      <div className="row g-0 mb-1">
                        <div className="col-3 fw-bold">Origen:</div>
                        <div className="col-9 text-truncate">{shipment.from || 'N/A'}</div>
                      </div>
                      <div className="row g-0 mb-1">
                        <div className="col-3 fw-bold">Destino:</div>
                        <div className="col-9 text-truncate">{shipment.to || 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="row g-0 mb-1">
                        <div className="col-3 fw-bold">Salida:</div>
                        <div className="col-9">{formatDate(shipment.departure)}</div>
                      </div>
                      <div className="row g-0 mb-1">
                        <div className="col-3 fw-bold">Llegada:</div>
                        <div className="col-9">{formatDate(shipment.arrival)}</div>
                      </div>
                    </div>
                    
                    <hr className="my-3" />
                    
                    <div className="mb-3">
                      <p className="mb-1 text-truncate">
                        <span className="fw-bold">Consignatario:</span> {shipment.consignee?.name || 'N/A'}
                      </p>
                      <p className="mb-1 text-truncate">
                        <span className="fw-bold">Embarcador:</span> {shipment.shipper?.name || 'N/A'}
                      </p>
                      <p className="mb-1">
                        <span className="fw-bold">Transportista:</span> {shipment.carrier?.name || 'N/A'}
                      </p>
                      <p className="mb-1">
                        <span className="fw-bold">Tipo:</span> {getShipmentTypeLabel(shipment.shipmentType)}
                      </p>
                      <p className="mb-1">
                        <span className="fw-bold">Clase:</span> {getShipmentClassLabel(shipment.shipmentClass)}
                      </p>
                      <p className="mb-1">
                        <span className="fw-bold">Flujo:</span> {getOperationFlowLabel(shipment.operationFlow)}
                      </p>
                      {shipment.customerReference && (
                        <p className="mb-1 text-truncate">
                          <span className="fw-bold">Referencia:</span> {shipment.customerReference}
                        </p>
                      )}
                    </div>
                    
                    <hr className="my-3" />
                    
                    <div className="mb-3">
                      <h6 className="fw-bold mb-2">Detalles de Carga:</h6>
                      <p className="mb-1">
                        <span className="fw-bold">Piezas:</span> {totals.totalPieces || 0}
                      </p>
                      <p className="mb-1">
                        <span className="fw-bold">Peso (kg):</span> {totals.totalWeight.toFixed(2)}
                      </p>
                      <p className="mb-1">
                        <span className="fw-bold">Volumen (m³):</span> {totals.totalVolume.toFixed(3)}
                      </p>
                      <p className="mb-1">
                        <span className="fw-bold">Peso Volumétrico (kg):</span> {totals.totalVolumeWeight.toFixed(2)}
                      </p>
                      <p className="mb-0 text-truncate">
                        <span className="fw-bold">Descripción:</span> {shipment.cargoDescription || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="card-footer bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {shipment.hazardous && (
                          <span className="badge bg-danger me-2">
                            <i className="bi bi-exclamation-triangle"></i> Peligroso
                          </span>
                        )}
                        {shipment.customsReleased && (
                          <span className="badge bg-info me-2">
                            <i className="bi bi-check-circle"></i> Aduana OK
                          </span>
                        )}
                        {shipment.freightReleased && (
                          <span className="badge bg-success">
                            <i className="bi bi-check-circle"></i> Liberado
                          </span>
                        )}
                      </small>
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
            ✈️
          </div>
          <h5 className="mb-2">No hay envíos aéreos disponibles</h5>
          <p className="text-muted">
            No se encontraron envíos aéreos para tu cuenta
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsOperations;