import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface AirShipment {
  id: number;
  number: string;
  operationFlow: string;
  shipmentType: string;
  departure: string;
  arrival: string;
  from: string;
  to: string;
  carrier: string;
  waybillNumber: string;
  consignee: string;
  shipper: string;
  salesRep: string;
  totalCharge_IncomeDisplayValue: string;
  totalCharge_ExpenseDisplayValue: string;
  totalCharge_ProfitDisplayValue: string;
  cargoDescription: string;
  cargoStatus: string;
  createdOn: string;
  totalCargo_Pieces: number;
  totalCargo_WeightValue: number;
  totalCargo_VolumeValue: number;
  totalCargo_VolumeWeightValue: number;
  // Add other fields as needed based on the full JSON structure
}

const ReportsOperations = () => {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const filterConsignee = user?.username || '';
  
  const [shipments, setShipments] = useState<AirShipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<AirShipment[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Cambiado a false para manejar mejor el caché
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
      
      const response = await fetch('https://api.linbis.com/air-shipments/all', {
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
      const filtered = airShipmentsArray.filter(as => as.consignee === filterConsignee);
      
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
    // Si hay datos en caché, cargarlos, sino hacer fetch
    if (!loadFromCache()) {
      // Solo si el accessToken está disponible
      if (accessToken) {
        console.log('No hay datos en caché, haciendo fetch...');
        fetchAirShipments();
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
      fetchAirShipments();
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
      shipment.waybillNumber?.toLowerCase().includes(searchLower) ||
      shipment.cargoDescription?.toLowerCase().includes(searchLower) ||
      shipment.from?.toLowerCase().includes(searchLower) ||
      shipment.to?.toLowerCase().includes(searchLower))
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
        return 'bg-warning'; // Yellow/Orange
      case 'Loaded':
        return 'bg-primary'; // Blue
      case 'Delivered':
        return 'bg-success'; // Green
      default:
        return 'bg-secondary'; // Grey
    }
  };

  // Función para formatear precios en CLP
  const formatCLP = (priceString?: string) => {
    if (!priceString) return null;
    const numberMatch = priceString.match(/[\\d.,]+/);
    if (!numberMatch) return priceString;
    const cleanNumber = numberMatch[0].replace(/,/g, '');
    const number = parseFloat(cleanNumber);
    if (isNaN(number)) return priceString;
    const formatted = new Intl.NumberFormat('es-CL').format(number);
    return `$${formatted} CLP`;
  };

  // Función para formatear fechas
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
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
          {filteredShipments.map((shipment) => (
            <div className="col" key={shipment.id}>
              <div className="card h-100 shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-start">
                  <h5 className="card-title mb-0">{shipment.number}</h5>
                  <span className={`badge ${getStatusBadgeClass(shipment.cargoStatus)}`}>
                    {shipment.cargoStatus}
                  </span>
                </div>
                
                <div className="card-body">
                  <p className="card-subtitle mb-3 text-muted">
                    {shipment.waybillNumber}
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
                      <span className="fw-bold">Consignatario:</span> {shipment.consignee}
                    </p>
                    <p className="mb-1 text-truncate">
                      <span className="fw-bold">Embarcador:</span> {shipment.shipper}
                    </p>
                    <p className="mb-1">
                      <span className="fw-bold">Transportista:</span> {shipment.carrier}
                    </p>
                    <p className="mb-1">
                      <span className="fw-bold">Tipo:</span> {shipment.shipmentType}
                    </p>
                    <p className="mb-1">
                      <span className="fw-bold">Piezas:</span> {shipment.totalCargo_Pieces || 'N/A'}
                    </p>
                    <p className="mb-1">
                      <span className="fw-bold">Peso (kg):</span> {shipment.totalCargo_WeightValue || 'N/A'}
                    </p>
                    <p className="mb-1">
                      <span className="fw-bold">Volumen (m³):</span> {shipment.totalCargo_VolumeValue || 'N/A'}
                    </p>
                    <p className="mb-1">
                      <span className="fw-bold">Peso Volumétrico (kg):</span> {shipment.totalCargo_VolumeWeightValue || 'N/A'}
                    </p>
                    <p className="mb-1">
                      <span className="fw-bold">Flujo:</span> {shipment.operationFlow}
                    </p>
                    <p className="mb-0 text-truncate">
                      <span className="fw-bold">Descripción de Carga:</span> {shipment.cargoDescription || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="card-footer bg-white">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold">Ingresos:</span>
                      <span className="text-primary">{formatCLP(shipment.totalCharge_IncomeDisplayValue)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold">Gastos:</span>
                      <span className="text-danger">{formatCLP(shipment.totalCharge_ExpenseDisplayValue)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold">Ganancia:</span>
                      <span className="text-success fw-bold">{formatCLP(shipment.totalCharge_ProfitDisplayValue)}</span>
                    </div>
                  </div>
                  
                  <div className="text-end mt-3">
                    <small className="text-muted">
                      Creado: {formatDate(shipment.createdOn)}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))}
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