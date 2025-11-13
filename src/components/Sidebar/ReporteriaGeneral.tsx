import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// Importación de los componentes de envíos
import ReportsOperations from './EnviosAereos';
import ReportsOperationsOcean from './EnviosMaritimos';

// Interfaces
interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

// Interface para AirShipment
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
}

// Interface para OceanShipment
interface OceanShipment {
  id: number;
  number: string;
  operationFlow: string;
  shipmentType: string;
  departure: string;
  arrival: string;
  portOfLoading: string;
  portOfUnloading: string;
  typeOfMove: string;
  vessel: string;
  voyage: string | null;
  carrier: string;
  fowaredBl: string;
  waybillNumber: string;
  containerNumber: string | null;
  consignee: string;
  shipper: string;
  totalCharge_IncomeDisplayValue: string;
  totalCharge_ExpenseDisplayValue: string;
  totalCharge_ProfitDisplayValue: string;
  cargoDescription: string;
  cargoStatus: string;
  createdOn: string;
  totalCargo_Pieces: number;
  totalCargo_WeightValue: number;
  totalCargo_VolumeValue: number;
}

// Interface para los filtros
interface FilterOptions {
  year: number;
  month: number | null;
}

// Interface para las métricas resumen
interface SummaryMetrics {
  totalAirShipments: number;
  totalOceanShipments: number;
  totalShipments: number;
  totalPieces: number;
  totalWeight: number;
  totalVolume: number;
}

// Interface para análisis de ruta
interface RouteAnalysis {
  route: string;
  count: number;
  isAir: boolean;
}

// Colores para los gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
const AIR_COLOR = '#4169E1'; // Azul para envíos aéreos
const OCEAN_COLOR = '#1E90FF'; // Azul más claro para envíos marítimos

const ReporteriaGeneral = () => {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  // Estados para almacenar los datos de envíos
  const [airShipments, setAirShipments] = useState<AirShipment[]>([]);
  const [oceanShipments, setOceanShipments] = useState<OceanShipment[]>([]);
  
  // Estado para los filtros
  const [filters, setFilters] = useState<FilterOptions>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // Mes actual
  });
  
  // Estado para métricas calculadas
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics>({
    totalAirShipments: 0,
    totalOceanShipments: 0,
    totalShipments: 0,
    totalPieces: 0,
    totalWeight: 0,
    totalVolume: 0,
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para datos procesados para gráficos
  const [monthlyShipments, setMonthlyShipments] = useState<any[]>([]);
  const [topRoutes, setTopRoutes] = useState<RouteAnalysis[]>([]);
  const [shipperDistribution, setShipperDistribution] = useState<any[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<any[]>([]);
  
  // Estado para controlar qué vista detallada se muestra
  const [activeTab, setActiveTab] = useState<'dashboard' | 'air' | 'ocean'>('dashboard');
  
  // Función para cargar datos desde el caché (similar a los componentes originales)
  const loadFromCache = () => {
    const airCachedData = localStorage.getItem('airShipmentsCache');
    const oceanCachedData = localStorage.getItem('oceanShipmentsCache');
    
    if (airCachedData && oceanCachedData) {
      try {
        const parsedAirData = JSON.parse(airCachedData);
        const parsedOceanData = JSON.parse(oceanCachedData);
        
        console.log('Cargando datos desde caché');
        setAirShipments(parsedAirData);
        setOceanShipments(parsedOceanData);
        return true;
      } catch (error) {
        console.error('Error al parsear datos del caché:', error);
      }
    }
    
    return false;
  };
  
  // Función para obtener datos de la API
  const fetchShipmentData = async () => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Obtener datos de envíos aéreos
      const airResponse = await fetch('https://api.linbis.com/air-shipments/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Obtener datos de envíos marítimos
      const oceanResponse = await fetch('https://api.linbis.com/ocean-shipments/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!airResponse.ok || !oceanResponse.ok) {
        if (airResponse.status === 401 || oceanResponse.status === 401) {
          throw new Error('Token inválido o expirado.');
        }
        throw new Error(`Error obteniendo datos de la API`);
      }

      const airData = await airResponse.json();
      const oceanData = await oceanResponse.json();
      
      // Filtrar por consignee (usuario actual)
      const filterConsignee = user?.username || '';
      const filteredAirShipments = airData.filter((as: AirShipment) => as.consignee === filterConsignee);
      const filteredOceanShipments = oceanData.filter((os: OceanShipment) => os.consignee === filterConsignee);
      
      setAirShipments(filteredAirShipments);
      setOceanShipments(filteredOceanShipments);
      
      console.log(`Datos cargados: ${filteredAirShipments.length} aéreos, ${filteredOceanShipments.length} marítimos`);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar envíos por fecha
  const filterShipmentsByDate = (
    shipments: (AirShipment | OceanShipment)[], 
    year: number, 
    month: number | null
  ): (AirShipment | OceanShipment)[] => {
    return shipments.filter(shipment => {
      const date = new Date(shipment.createdOn);
      
      if (month === null) {
        // Solo filtrar por año
        return date.getFullYear() === year;
      } else {
        // Filtrar por año y mes
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      }
    });
  };
  
  // Calcular métricas resumen
  const calculateSummaryMetrics = (
    filteredAirShipments: AirShipment[], 
    filteredOceanShipments: OceanShipment[]
  ) => {
    const totalPieces = 
      filteredAirShipments.reduce((sum, item) => sum + (item.totalCargo_Pieces || 0), 0) +
      filteredOceanShipments.reduce((sum, item) => sum + (item.totalCargo_Pieces || 0), 0);
      
    const totalWeight = 
      filteredAirShipments.reduce((sum, item) => sum + (item.totalCargo_WeightValue || 0), 0) +
      filteredOceanShipments.reduce((sum, item) => sum + (item.totalCargo_WeightValue || 0), 0);
      
    const totalVolume = 
      filteredAirShipments.reduce((sum, item) => sum + (item.totalCargo_VolumeValue || 0), 0) +
      filteredOceanShipments.reduce((sum, item) => sum + (item.totalCargo_VolumeValue || 0), 0);
    
    setSummaryMetrics({
      totalAirShipments: filteredAirShipments.length,
      totalOceanShipments: filteredOceanShipments.length,
      totalShipments: filteredAirShipments.length + filteredOceanShipments.length,
      totalPieces,
      totalWeight,
      totalVolume
    });
  };
  
  // Procesar datos para gráfico mensual
  const processMonthlyData = (
    filteredAirShipments: AirShipment[], 
    filteredOceanShipments: OceanShipment[],
    year: number
  ) => {
    const monthlyData: { [key: string]: { air: number, ocean: number, month: string } } = {};
    
    // Inicializar meses
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    monthNames.forEach((month, index) => {
      monthlyData[month] = { air: 0, ocean: 0, month };
    });
    
    // Procesar envíos aéreos
    filteredAirShipments.forEach(shipment => {
      const date = new Date(shipment.createdOn);
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth();
        const monthName = monthNames[monthIndex];
        monthlyData[monthName].air += 1;
      }
    });
    
    // Procesar envíos marítimos
    filteredOceanShipments.forEach(shipment => {
      const date = new Date(shipment.createdOn);
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth();
        const monthName = monthNames[monthIndex];
        monthlyData[monthName].ocean += 1;
      }
    });
    
    // Convertir a array para Recharts
    const result = Object.values(monthlyData);
    setMonthlyShipments(result);
  };
  
  // Procesar top rutas
  const processTopRoutes = (
    filteredAirShipments: AirShipment[], 
    filteredOceanShipments: OceanShipment[]
  ) => {
    const routesMap = new Map<string, { count: number, isAir: boolean }>();
    
    // Procesar rutas aéreas
    filteredAirShipments.forEach(shipment => {
      const route = `${shipment.from || 'N/A'} → ${shipment.to || 'N/A'}`;
      const currentCount = routesMap.get(route)?.count || 0;
      routesMap.set(route, { count: currentCount + 1, isAir: true });
    });
    
    // Procesar rutas marítimas
    filteredOceanShipments.forEach(shipment => {
      const route = `${shipment.portOfLoading || 'N/A'} → ${shipment.portOfUnloading || 'N/A'}`;
      const currentCount = routesMap.get(route)?.count || 0;
      routesMap.set(route, { count: currentCount + 1, isAir: false });
    });
    
    // Convertir a array y ordenar
    const routesArray: RouteAnalysis[] = Array.from(routesMap).map(([route, data]) => ({
      route,
      count: data.count,
      isAir: data.isAir
    }));
    
    // Ordenar por conteo descendente y limitar a los 10 principales
    const sortedRoutes = routesArray.sort((a, b) => b.count - a.count).slice(0, 10);
    setTopRoutes(sortedRoutes);
  };
  
  // Procesar distribución de embarcadores
  const processShipperDistribution = (
    filteredAirShipments: AirShipment[], 
    filteredOceanShipments: OceanShipment[]
  ) => {
    const shippersMap = new Map<string, { air: number, ocean: number }>();
    
    // Procesar embarcadores aéreos
    filteredAirShipments.forEach(shipment => {
      const shipper = shipment.shipper || 'No especificado';
      const current = shippersMap.get(shipper) || { air: 0, ocean: 0 };
      shippersMap.set(shipper, { ...current, air: current.air + 1 });
    });
    
    // Procesar embarcadores marítimos
    filteredOceanShipments.forEach(shipment => {
      const shipper = shipment.shipper || 'No especificado';
      const current = shippersMap.get(shipper) || { air: 0, ocean: 0 };
      shippersMap.set(shipper, { ...current, ocean: current.ocean + 1 });
    });
    
    // Convertir a array y ordenar por total
    const shippersArray = Array.from(shippersMap).map(([name, counts]) => ({
      name,
      air: counts.air,
      ocean: counts.ocean,
      total: counts.air + counts.ocean
    }));
    
    // Ordenar por total descendente y limitar a los 5 principales
    const sortedShippers = shippersArray.sort((a, b) => b.total - a.total).slice(0, 5);
    setShipperDistribution(sortedShippers);
  };
  
  // Procesar distribución de tipos de envío para marítimos (FCL/LCL)
  const processTypeDistribution = (filteredOceanShipments: OceanShipment[]) => {
    const typeMap = new Map<string, number>();
    
    filteredOceanShipments.forEach(shipment => {
      const type = shipment.typeOfMove || 'No especificado';
      const currentCount = typeMap.get(type) || 0;
      typeMap.set(type, currentCount + 1);
    });
    
    // Convertir a array para gráfico pie
    const typeArray = Array.from(typeMap).map(([name, value]) => ({ name, value }));
    setTypeDistribution(typeArray);
  };
  
  // Este useEffect se ejecuta una vez al cargar el componente
  useEffect(() => {
    // Intentar cargar datos desde caché
    if (!loadFromCache()) {
      // Si no hay datos en caché, obtenerlos de la API
      fetchShipmentData();
    } else {
      setLoading(false);
    }
  }, []);
  
  // Este useEffect se ejecuta cuando cambian los datos o los filtros
  useEffect(() => {
    if (airShipments.length > 0 || oceanShipments.length > 0) {
      // Aplicar filtros de fecha
      const filteredAir = filterShipmentsByDate(airShipments, filters.year, filters.month);
      const filteredOcean = filterShipmentsByDate(oceanShipments, filters.year, filters.month);
      
      // Calcular métricas
      calculateSummaryMetrics(filteredAir, filteredOcean);
      
      // Procesar datos para gráficos
      processMonthlyData(airShipments, oceanShipments, filters.year); // Usamos todos los datos del año para la vista mensual
      processTopRoutes(filteredAir, filteredOcean);
      processShipperDistribution(filteredAir, filteredOcean);
      processTypeDistribution(filteredOcean);
    }
  }, [airShipments, oceanShipments, filters]);
  
  // Manejadores para los filtros
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    setFilters({ ...filters, year });
  };
  
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const monthValue = e.target.value;
    const month = monthValue === 'all' ? null : parseInt(monthValue);
    setFilters({ ...filters, month });
  };
  
  // Formateo de números para mejorar legibilidad
  const formatNumber = (num: number) => {
    return num.toLocaleString('es-CL');
  };
  
  if (loading && airShipments.length === 0 && oceanShipments.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Renderiza el Dashboard principal
  const renderDashboard = () => (
    <div>
      {/* Tarjetas de métricas principales */}
      <div className="row row-cols-1 row-cols-md-3 row-cols-lg-6 g-4 mb-4">
        {/* Total de Envíos */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title text-muted">Envíos Totales</h5>
              <p className="display-5 mb-0">{formatNumber(summaryMetrics.totalShipments)}</p>
            </div>
          </div>
        </div>
        
        {/* Envíos Aéreos */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title text-muted">Envíos Aéreos</h5>
              <p className="display-5 mb-0">{formatNumber(summaryMetrics.totalAirShipments)}</p>
            </div>
          </div>
        </div>
        
        {/* Envíos Marítimos */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title text-muted">Envíos Marítimos</h5>
              <p className="display-5 mb-0">{formatNumber(summaryMetrics.totalOceanShipments)}</p>
            </div>
          </div>
        </div>
        
        {/* Total de Piezas */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title text-muted">Total Piezas</h5>
              <p className="display-5 mb-0">{formatNumber(summaryMetrics.totalPieces)}</p>
            </div>
          </div>
        </div>
        
        {/* Peso Total (kg) */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title text-muted">Peso Total (kg)</h5>
              <p className="display-5 mb-0">{formatNumber(Math.round(summaryMetrics.totalWeight))}</p>
            </div>
          </div>
        </div>
        
        {/* Volumen Total (m³) */}
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body text-center">
              <h5 className="card-title text-muted">Volumen (m³)</h5>
              <p className="display-5 mb-0">{formatNumber(Math.round(summaryMetrics.totalVolume))}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="row mb-4">
        {/* Gráfico de Envíos Mensuales */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Envíos por Mes ({filters.year})</h5>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyShipments}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="air" name="Aéreos" fill={AIR_COLOR} />
                    <Bar dataKey="ocean" name="Marítimos" fill={OCEAN_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gráfico de Distribución FCL/LCL */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Distribución por Tipo de Envío Marítimo</h5>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mb-4">
        {/* Gráfico de Top Rutas */}
        <div className="col-md-8 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Top 10 Rutas Más Utilizadas</h5>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topRoutes}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 100,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="route" width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="count" 
                      name="Envíos" 
                      fill={(data) => data.isAir ? AIR_COLOR : OCEAN_COLOR}
                    >
                      {topRoutes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isAir ? AIR_COLOR : OCEAN_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gráfico de Top Embarcadores */}
        <div className="col-md-4 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Top 5 Embarcadores</h5>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={shipperDistribution}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="air" name="Aéreos" fill={AIR_COLOR} />
                    <Bar dataKey="ocean" name="Marítimos" fill={OCEAN_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje si no hay datos */}
      {summaryMetrics.totalShipments === 0 && !loading && (
        <div className="text-center p-5 bg-white rounded shadow-sm">
          <div className="display-1 text-muted mb-4">
            📊
          </div>
          <h5 className="mb-2">No hay datos disponibles para el periodo seleccionado</h5>
          <p className="text-muted">
            Intenta cambiar los filtros o verifica que existan envíos registrados
          </p>
        </div>
      )}
    </div>
  );
  
  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">Dashboard Operacional</h2>
      
      {/* Filtros */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title">Filtros</h5>
          <div className="row">
            <div className="col-md-6 mb-2">
              <label className="form-label">Año</label>
              <select 
                className="form-select" 
                value={filters.year}
                onChange={handleYearChange}
              >
                {[2023, 2024, 2025].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6 mb-2">
              <label className="form-label">Mes</label>
              <select 
                className="form-select" 
                value={filters.month === null ? 'all' : filters.month}
                onChange={handleMonthChange}
              >
                <option value="all">Todos los meses</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pestañas de navegación */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard General
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'air' ? 'active' : ''}`} 
            onClick={() => setActiveTab('air')}
          >
            Envíos Aéreos
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'ocean' ? 'active' : ''}`} 
            onClick={() => setActiveTab('ocean')}
          >
            Envíos Marítimos
          </button>
        </li>
      </ul>
      
      {/* Estado de Error */}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      {/* Contenido basado en la pestaña activa */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'air' && <ReportsOperations />}
      {activeTab === 'ocean' && <ReportsOperationsOcean />}
    </div>
  );
};

export default ReporteriaGeneral;