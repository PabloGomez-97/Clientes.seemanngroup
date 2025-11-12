import { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

// Define types for our shipping order data
interface Address {
  id: number;
  name: string;
  accountNumber: string | null;
  code: string;
  scacNumber: string | null;
  iataCode: string | null;
  identificationNumber: string | null;
  email: string | null;
  primaryAddress: string | null;
  billingAddress: string | null;
  phone: string | null;
  addresses: any[];
  ownerId: string | null;
}

interface TotalCargo {
  pieces: number;
  value: number;
  containers: number;
  declaredValue: number;
  weightValue: number;
  weightUOM: number;
  volumeValue: number;
  volumeUOM: number;
  volumeWeightValue: number;
  volumeWeightUOM: number;
}

interface ShippingOrder {
  id: number;
  number: string;
  customerReference: string | null;
  departureDate: string | null;
  arrivalDate: string | null;
  cutOffDate: string | null;
  operationFlow: number;
  modeOfTransportation: string | null;
  carrier: Address | null;
  shipper: Address;
  shipperAddress: string;
  consignee: Address;
  consigneeAddress: string;
  forwardingAgent: Address | null;
  destinationAgent: Address | null;
  orderDate: string;
  totalCargo: TotalCargo;
  commodities: any[];
  charges: any[];
}

interface ShippingOrdersResponse {
  shippingOrders: {
    items: ShippingOrder[];
  };
}

// Interface para la estructura de caché
interface CacheData {
  timestamp: number;
  shippingOrders: ShippingOrder[];
  username: string | null; // Añadimos el username para asegurarnos de que el caché es específico del usuario
  version: string; // Para invalidar el caché si cambiamos la estructura
}

// Constantes para el caché
const CACHE_KEY = 'shipping_orders_cache_v1'; // Versión 1 del caché
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora en milisegundos

const Reporteria: React.FC = () => {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([]);
  const [userOrders, setUserOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState<boolean>(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<Date | null>(null);

  // Función para verificar si el caché es válido
  const isCacheValid = (cacheData: CacheData): boolean => {
    const now = Date.now();
    const cacheAge = now - cacheData.timestamp;
    const isValid = (
      cacheAge < CACHE_DURATION && 
      cacheData.version === 'v1' &&
      cacheData.username === user?.username
    );
    
    console.log('Caché válido:', isValid, 'Edad del caché (ms):', cacheAge, 'Límite (ms):', CACHE_DURATION);
    return isValid;
  };

  // Función para obtener datos del caché
  const getFromCache = (): CacheData | null => {
    try {
      const cacheStr = localStorage.getItem(CACHE_KEY);
      console.log('Datos en caché encontrados:', cacheStr ? 'Sí' : 'No');
      
      if (!cacheStr) return null;

      const cacheData: CacheData = JSON.parse(cacheStr);
      console.log('Datos del caché parseados:', !!cacheData);
      
      if (isCacheValid(cacheData)) {
        console.log('Usando datos del caché');
        setCacheTimestamp(new Date(cacheData.timestamp));
        return cacheData;
      } else {
        console.log('Caché expirado o inválido, eliminando');
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
    } catch (error) {
      console.error('Error al leer del caché:', error);
      localStorage.removeItem(CACHE_KEY); // Eliminar caché corrupto
      return null;
    }
  };

  // Función para guardar datos en el caché
  const saveToCache = (data: ShippingOrder[]) => {
    try {
      const timestamp = Date.now();
      const cacheData: CacheData = {
        timestamp: timestamp,
        shippingOrders: data,
        username: user?.username || null,
        version: 'v1'
      };
      
      console.log('Guardando en caché', data.length, 'órdenes. Timestamp:', new Date(timestamp));
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('Datos guardados en caché correctamente');
    } catch (error) {
      console.error('Error al guardar en caché:', error);
      // Intenta eliminar el caché si hay error al guardar
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch (e) {
        console.error('No se pudo eliminar el caché corrupto');
      }
    }
  };

  // Función para forzar recarga desde API
  const forceRefresh = () => {
    console.log('Forzando recarga desde API');
    localStorage.removeItem(CACHE_KEY);
    setLoading(true);
    setUsingCache(false);
    fetchShippingOrdersFromAPI();
  };

  // Función para procesar órdenes de envío
  const processShippingOrders = (orders: ShippingOrder[]) => {
    console.log('Procesando', orders.length, 'órdenes de envío');
    // Almacenar todas las órdenes
    setShippingOrders(orders);
    
    // Filtrar por el nombre del consignatario en lugar del ID
    if (user?.username) {
      const userSpecificOrders = orders.filter(order => 
        order.consignee && order.consignee.name === user.username
      );
      console.log('Filtradas', userSpecificOrders.length, 'órdenes para el usuario', user.username);
      setUserOrders(userSpecificOrders);
    } else {
      // Si no hay nombre de usuario disponible, mostrar todas las órdenes
      console.log('Ningún usuario específico, mostrando todas las órdenes');
      setUserOrders(orders);
    }
  };

  // Función para obtener datos de la API
  const fetchShippingOrdersFromAPI = async () => {
    console.log('Obteniendo datos de la API...');
    try {
      if (!accessToken) {
        console.error('No hay accessToken, cerrando sesión');
        onLogout();
        return;
      }

      const response = await fetch('https://api.linbis.com/api/shipping-orders?PageNumber=1&PageSize=3324', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Error en la respuesta de la API:', response.status);
        if (response.status === 401) {
          onLogout();
          return;
        }
        throw new Error(`Error API: ${response.status}`);
      }

      console.log('Respuesta de la API recibida, procesando datos...');
      const data: ShippingOrdersResponse = await response.json();
      
      if (data && data.shippingOrders && data.shippingOrders.items) {
        console.log('Datos válidos recibidos de la API, guardando en caché...');
        // Guardar en caché
        saveToCache(data.shippingOrders.items);
        
        // Procesar los datos
        processShippingOrders(data.shippingOrders.items);
        setUsingCache(false);
      } else {
        console.error('Formato de datos inválido recibido de la API');
        throw new Error('Formato de datos inválido recibido de la API');
      }
    } catch (err) {
      console.error('Error completo al obtener órdenes de envío:', err);
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Efecto principal para cargar datos
  useEffect(() => {
    const fetchShippingOrders = async () => {
      try {
        console.log('Iniciando carga de datos, verificando caché primero...');
        // Primero verificamos si tenemos datos válidos en caché
        const cachedData = getFromCache();
        
        if (cachedData && cachedData.shippingOrders.length > 0) {
          // Usar datos en caché
          console.log('Usando', cachedData.shippingOrders.length, 'órdenes del caché');
          processShippingOrders(cachedData.shippingOrders);
          setUsingCache(true);
          setLoading(false);
          return;
        }

        console.log('No hay caché válido disponible, obteniendo de la API...');
        // Si no hay caché válido, obtener de la API
        await fetchShippingOrdersFromAPI();
      } catch (err) {
        console.error('Error en el flujo principal:', err);
        setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
        setLoading(false);
      }
    };

    fetchShippingOrders();
  }, [accessToken, onLogout, user?.username]); // Nota: Dependencia específica al user.username

  // Helper function to get status badge color based on operationFlow
  const getStatusBadge = (operationFlow: number) => {
    switch (operationFlow) {
      case 1:
        return <Badge bg="primary">Export</Badge>;
      case 2:
        return <Badge bg="success">Import</Badge>;
      case 3:
        return <Badge bg="info">Transit</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  // Helper function to format weight with UOM
  const formatWeight = (weight: number, uom: number) => {
    const unit = uom === 2 ? 'kg' : 'lb';
    return `${weight.toLocaleString()} ${unit}`;
  };

  // Helper function to format volume with UOM
  const formatVolume = (volume: number, uom: number) => {
    const unit = uom === 2 ? 'm³' : 'ft³';
    return `${volume.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${unit}`;
  };

  // Format date directly without external utility
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch {
      return 'N/A';
    }
  };

  // Función para formatear el tiempo restante del caché
  const formatCacheTimeRemaining = () => {
    if (!cacheTimestamp) return '';
    
    const expiryTime = new Date(cacheTimestamp.getTime() + CACHE_DURATION);
    const now = new Date();
    const remainingMs = expiryTime.getTime() - now.getTime();
    
    if (remainingMs <= 0) return 'Caché expirado';
    
    const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
    const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
    
    return `${remainingMinutes}m ${remainingSeconds}s`;
  };

  return (
    <Container fluid className="mt-4">
      <h2>Shipping Operations Reports</h2>
      
      {/* Indicador de datos en caché */}
      {usingCache && !loading && !error && (
        <Alert variant="info" className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Datos cargados desde caché local</strong>
            <div>Tiempo restante: {formatCacheTimeRemaining()}</div>
            <div>Caché creado: {cacheTimestamp?.toLocaleTimeString()}</div>
          </div>
          <button 
            className="btn btn-sm btn-primary" 
            onClick={forceRefresh}
          >
            Actualizar datos
          </button>
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Cargando datos de envíos...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="danger">
          <strong>Error:</strong> {error}
          <div className="mt-2">
            <button 
              className="btn btn-sm btn-outline-danger" 
              onClick={forceRefresh}
            >
              Reintentar
            </button>
          </div>
        </Alert>
      )}

      {/* Results count */}
      {!loading && !error && (
        <div className="mb-3">
          <p>Mostrando {userOrders.length} órdenes de envío</p>
        </div>
      )}

      {/* Shipping order cards */}
      <Row xs={1} md={2} lg={3} className="g-4">
        {userOrders.map(order => (
          <Col key={order.id}>
            <Card className="h-100 shadow-sm">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">{order.number}</span>
                {getStatusBadge(order.operationFlow)}
              </Card.Header>
              <Card.Body>
                <Card.Title>
                  {order.consignee?.name || 'No Consignee'}
                </Card.Title>
                <Card.Text>
                  <small className="text-muted">
                    {order.customerReference ? `Ref: ${order.customerReference}` : 'No reference'}
                  </small>
                </Card.Text>
                
                <hr />
                
                <div className="mb-2">
                  <strong>Shipper:</strong> {order.shipper?.name || 'N/A'}
                </div>
                
                {order.carrier && (
                  <div className="mb-2">
                    <strong>Carrier:</strong> {order.carrier.name}
                  </div>
                )}
                
                <div className="d-flex justify-content-between mb-2">
                  <div>
                    <strong>Departure:</strong><br />
                    {formatDate(order.departureDate)}
                  </div>
                  <div>
                    <strong>Arrival:</strong><br />
                    {formatDate(order.arrivalDate)}
                  </div>
                </div>
                
                <hr />
                
                <Row className="mb-2 text-center">
                  <Col xs={4}>
                    <small className="d-block fw-bold">Pieces</small>
                    <span>{order.totalCargo.pieces}</span>
                  </Col>
                  <Col xs={4}>
                    <small className="d-block fw-bold">Weight</small>
                    <span>{formatWeight(order.totalCargo.weightValue, order.totalCargo.weightUOM)}</span>
                  </Col>
                  <Col xs={4}>
                    <small className="d-block fw-bold">Peso Volumétrico</small>
                    <span>{formatVolume(order.totalCargo.volumeWeightValue, order.totalCargo.volumeUOM)}</span>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer className="text-muted">
                <small>Order Date: {formatDate(order.orderDate)}</small>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>

      {/* No results message */}
      {!loading && !error && userOrders.length === 0 && (
        <Alert variant="info">
          No shipping orders found for your account.
        </Alert>
      )}
    </Container>
  );
};

export default Reporteria;