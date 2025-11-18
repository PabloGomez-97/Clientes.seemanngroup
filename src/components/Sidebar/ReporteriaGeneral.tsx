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

// ============= PALETA DE COLORES MODERNA =============
const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  air: '#3b82f6',
  ocean: '#06b6d4',
  chart: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
  background: '#f8fafc',
  cardBg: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
};

// Gradientes para las cards
const GRADIENTS = {
  purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  blue: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  cyan: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  pink: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  orange: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  green: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
};

// ============= ESTILOS CSS EN JS =============
const styles = {
  container: {
    backgroundColor: COLORS.background,
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: '0.95rem',
  },
  metricCard: {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  chartCard: {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    backgroundColor: COLORS.cardBg,
    height: '100%',
  },
  chartTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: '1.5rem',
  },
  filterButton: {
    position: 'fixed' as 'fixed',
    top: '6rem',
    right: '2rem',
    zIndex: 1000,
    padding: '0.875rem 1.75rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    borderRadius: '50px',
    border: 'none',
    background: GRADIENTS.purple,
    color: 'white',
    boxShadow: '0 4px 12px rgba(102, 102, 234, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  modalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    borderRadius: '20px',
    border: 'none',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    borderBottom: `1px solid ${COLORS.border}`,
    padding: '1.5rem',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  formLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: '0.5rem',
  },
  formSelect: {
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    padding: '0.625rem 0.875rem',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  emptyState: {
    padding: '4rem 2rem',
    textAlign: 'center' as 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: '20px',
    border: `2px dashed ${COLORS.border}`,
  },
};

// ============= ESTILOS CSS PARA ANIMACIONES =============
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
  }
`;
if (!document.head.querySelector('style[data-loading-animation]')) {
  styleSheet.setAttribute('data-loading-animation', 'true');
  document.head.appendChild(styleSheet);
}

// ============= COMPONENTE CUSTOM TOOLTIP =============
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <p style={{ 
          margin: '0 0 8px 0', 
          fontWeight: '600', 
          color: COLORS.textPrimary,
          fontSize: '0.9rem' 
        }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ 
            margin: '4px 0', 
            color: entry.color,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color,
              display: 'inline-block'
            }}></span>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============= COMPONENTE CUSTOM Y-AXIS TICK =============
const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const maxLength = 20;
  const text = payload.value.length > maxLength 
    ? payload.value.substring(0, maxLength) + '...' 
    : payload.value;
  
  return (
    <text 
      x={x} 
      y={y} 
      dy={4} 
      textAnchor="end" 
      fill={COLORS.textSecondary}
      fontSize={11}
      fontWeight="500"
    >
      {text}
    </text>
  );
};

const ReporteriaGeneral = () => {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  // Estados para almacenar los datos de envíos
  const [airShipments, setAirShipments] = useState<AirShipment[]>([]);
  const [oceanShipments, setOceanShipments] = useState<OceanShipment[]>([]);
  
  // Estado para los filtros
  const [filters, setFilters] = useState<FilterOptions>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
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
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Estados para datos procesados para gráficos
  const [monthlyShipments, setMonthlyShipments] = useState<any[]>([]);
  const [topRoutes, setTopRoutes] = useState<RouteAnalysis[]>([]);
  const [shipperDistribution, setShipperDistribution] = useState<any[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<any[]>([]);
  
  // Estado para controlar qué vista detallada se muestra
  const [activeTab, setActiveTab] = useState<'dashboard' | 'air' | 'ocean'>('dashboard');
  
  // Función para cargar datos desde el caché
  const loadFromCache = () => {
    const cacheKey = `shipmentsCache_${user?.username || 'default'}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    if (cachedData && cacheTimestamp) {
      try {
        const now = new Date().getTime();
        const cacheAge = now - parseInt(cacheTimestamp);
        const maxCacheAge = 24 * 60 * 60 * 1000; // 24 horas
        
        if (cacheAge < maxCacheAge) {
          const parsedData = JSON.parse(cachedData);
          console.log('Cargando datos desde caché');
          setAirShipments(parsedData.airShipments || []);
          setOceanShipments(parsedData.oceanShipments || []);
          return true;
        } else {
          console.log('Caché expirado, limpiando...');
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`${cacheKey}_timestamp`);
        }
      } catch (error) {
        console.error('Error al parsear datos del caché:', error);
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
      }
    }
    
    return false;
  };
  
  // Función para guardar datos en el caché
  const saveToCache = (airData: AirShipment[], oceanData: OceanShipment[]) => {
    try {
      const cacheKey = `shipmentsCache_${user?.username || 'default'}`;
      const dataToCache = {
        airShipments: airData,
        oceanShipments: oceanData,
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
      console.log('Datos guardados en caché');
    } catch (error) {
      console.error('Error al guardar en caché:', error);
    }
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
      
      const airResponse = await fetch('https://api.linbis.com/air-shipments/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

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
      
      const filterConsignee = user?.username || '';
      const filteredAirShipments = airData.filter((as: AirShipment) => as.consignee === filterConsignee);
      const filteredOceanShipments = oceanData.filter((os: OceanShipment) => os.consignee === filterConsignee);
      
      setAirShipments(filteredAirShipments);
      setOceanShipments(filteredOceanShipments);
      
      // Guardar en caché
      saveToCache(filteredAirShipments, filteredOceanShipments);
      
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
        return date.getFullYear() === year;
      }
      
      return date.getFullYear() === year && (date.getMonth() + 1) === month;
    });
  };
  
  // Calcular métricas resumen
  const calculateSummaryMetrics = () => {
    const filteredAir = filterShipmentsByDate(airShipments, filters.year, filters.month);
    const filteredOcean = filterShipmentsByDate(oceanShipments, filters.year, filters.month);
    
    const metrics: SummaryMetrics = {
      totalAirShipments: filteredAir.length,
      totalOceanShipments: filteredOcean.length,
      totalShipments: filteredAir.length + filteredOcean.length,
      totalPieces: 0,
      totalWeight: 0,
      totalVolume: 0,
    };
    
    filteredAir.forEach(shipment => {
      metrics.totalPieces += shipment.totalCargo_Pieces || 0;
      metrics.totalWeight += shipment.totalCargo_WeightValue || 0;
      metrics.totalVolume += shipment.totalCargo_VolumeValue || 0;
    });
    
    filteredOcean.forEach(shipment => {
      metrics.totalPieces += shipment.totalCargo_Pieces || 0;
      metrics.totalWeight += shipment.totalCargo_WeightValue || 0;
      metrics.totalVolume += shipment.totalCargo_VolumeValue || 0;
    });
    
    setSummaryMetrics(metrics);
  };
  
  // Preparar datos para el gráfico mensual
  const prepareMonthlyData = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyData = months.map((month, index) => ({
      month,
      air: 0,
      ocean: 0,
    }));
    
    const filteredAir = filterShipmentsByDate(airShipments, filters.year, null);
    const filteredOcean = filterShipmentsByDate(oceanShipments, filters.year, null);
    
    filteredAir.forEach(shipment => {
      const month = new Date(shipment.createdOn).getMonth();
      monthlyData[month].air += 1;
    });
    
    filteredOcean.forEach(shipment => {
      const month = new Date(shipment.createdOn).getMonth();
      monthlyData[month].ocean += 1;
    });
    
    setMonthlyShipments(monthlyData);
  };
  
  // Analizar las rutas más utilizadas
  const analyzeTopRoutes = () => {
    const filteredAir = filterShipmentsByDate(airShipments, filters.year, filters.month);
    const filteredOcean = filterShipmentsByDate(oceanShipments, filters.year, filters.month);
    
    const routeCount: { [key: string]: { count: number; isAir: boolean } } = {};
    
    filteredAir.forEach(shipment => {
      const route = `${shipment.from} → ${shipment.to}`;
      if (routeCount[route]) {
        routeCount[route].count += 1;
      } else {
        routeCount[route] = { count: 1, isAir: true };
      }
    });
    
    filteredOcean.forEach(shipment => {
      const route = `${shipment.portOfLoading} → ${shipment.portOfUnloading}`;
      if (routeCount[route]) {
        routeCount[route].count += 1;
      } else {
        routeCount[route] = { count: 1, isAir: false };
      }
    });
    
    const sortedRoutes = Object.entries(routeCount)
      .map(([route, data]) => ({ route, count: data.count, isAir: data.isAir }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    setTopRoutes(sortedRoutes);
  };
  
  // Analizar distribución de embarcadores
  const analyzeShipperDistribution = () => {
    const filteredAir = filterShipmentsByDate(airShipments, filters.year, filters.month);
    const filteredOcean = filterShipmentsByDate(oceanShipments, filters.year, filters.month);
    
    const shipperCount: { [key: string]: { air: number; ocean: number } } = {};
    
    filteredAir.forEach(shipment => {
      const shipper = shipment.shipper || 'Desconocido';
      if (shipperCount[shipper]) {
        shipperCount[shipper].air += 1;
      } else {
        shipperCount[shipper] = { air: 1, ocean: 0 };
      }
    });
    
    filteredOcean.forEach(shipment => {
      const shipper = shipment.shipper || 'Desconocido';
      if (shipperCount[shipper]) {
        shipperCount[shipper].ocean += 1;
      } else {
        shipperCount[shipper] = { air: 0, ocean: 1 };
      }
    });
    
    const sortedShippers = Object.entries(shipperCount)
      .map(([name, counts]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        air: counts.air,
        ocean: counts.ocean,
        total: counts.air + counts.ocean,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    
    setShipperDistribution(sortedShippers);
  };
  
  // Analizar distribución por tipo de envío (marítimo y aéreo)
  const analyzeTypeDistribution = () => {
    const filteredAir = filterShipmentsByDate(airShipments, filters.year, filters.month);
    const filteredOcean = filterShipmentsByDate(oceanShipments, filters.year, filters.month);
    
    const typeCount: { [key: string]: number } = {};
    
    // Agregar envíos aéreos como categoría "AIR"
    if (filteredAir.length > 0) {
      typeCount['AIR'] = filteredAir.length;
    }
    
    // Agregar tipos de envíos marítimos (FCL, LCL, etc.)
    filteredOcean.forEach(shipment => {
      const type = shipment.typeOfMove || 'Desconocido';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    const distribution = Object.entries(typeCount).map(([name, value]) => ({
      name,
      value,
    }));
    
    setTypeDistribution(distribution);
  };
  
  // Cargar datos al montar el componente
  useEffect(() => {
    const hasCachedData = loadFromCache();
    
    if (!hasCachedData) {
      fetchShipmentData();
    } else {
      setLoading(false);
    }
  }, [accessToken]);
  
  // Recalcular métricas y gráficos cuando cambien los datos o filtros
  useEffect(() => {
    if (airShipments.length > 0 || oceanShipments.length > 0) {
      calculateSummaryMetrics();
      prepareMonthlyData();
      analyzeTopRoutes();
      analyzeShipperDistribution();
      analyzeTypeDistribution();
    }
  }, [airShipments, oceanShipments, filters]);
  
  // Manejadores de cambio de filtros
  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, year: parseInt(event.target.value) });
  };
  
  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters({ ...filters, month: value === 'all' ? null : parseInt(value) });
  };
  
  // Formatear números con separadores de miles
  const formatNumber = (num: number): string => {
    return num.toLocaleString('es-CL');
  };
  
  // Renderizar el dashboard principal
  const renderDashboard = () => {
    return (
    <div style={{ paddingTop: '1rem' }}>
      {/* Cards de Métricas */}
      <div className="row g-4 mb-4">
        {/* Envíos Totales */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div 
            className="card" 
            style={{
              ...styles.metricCard,
              background: GRADIENTS.purple,
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 102, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="mb-1" style={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: '500' }}>
                    Envíos Totales
                  </p>
                  <h2 className="mb-0 fw-bold" style={{ fontSize: '2.5rem' }}>
                    {formatNumber(summaryMetrics.totalShipments)}
                  </h2>
                </div>
                <div 
                  className="rounded-circle p-3" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '1.5rem' }}
                >
                  📦
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Envíos Aéreos */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div 
            className="card" 
            style={{
              ...styles.metricCard,
              background: GRADIENTS.blue,
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="mb-1" style={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: '500' }}>
                    Envíos Aéreos
                  </p>
                  <h2 className="mb-0 fw-bold" style={{ fontSize: '2.5rem' }}>
                    {formatNumber(summaryMetrics.totalAirShipments)}
                  </h2>
                </div>
                <div 
                  className="rounded-circle p-3" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '1.5rem' }}
                >
                  ✈️
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Envíos Marítimos */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div 
            className="card" 
            style={{
              ...styles.metricCard,
              background: GRADIENTS.cyan,
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(6, 182, 212, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="mb-1" style={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: '500' }}>
                    Envíos Marítimos
                  </p>
                  <h2 className="mb-0 fw-bold" style={{ fontSize: '2.5rem' }}>
                    {formatNumber(summaryMetrics.totalOceanShipments)}
                  </h2>
                </div>
                <div 
                  className="rounded-circle p-3" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '1.5rem' }}
                >
                  🚢
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Piezas */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div 
            className="card" 
            style={{
              ...styles.metricCard,
              background: GRADIENTS.pink,
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(236, 72, 153, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="mb-1" style={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: '500' }}>
                    Total Piezas
                  </p>
                  <h2 className="mb-0 fw-bold" style={{ fontSize: '2.5rem' }}>
                    {formatNumber(summaryMetrics.totalPieces)}
                  </h2>
                </div>
                <div 
                  className="rounded-circle p-3" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '1.5rem' }}
                >
                  📊
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Peso Total */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div 
            className="card" 
            style={{
              ...styles.metricCard,
              background: GRADIENTS.orange,
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="mb-1" style={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: '500' }}>
                    Peso Total (kg)
                  </p>
                  <h2 className="mb-0 fw-bold" style={{ fontSize: '2.5rem' }}>
                    {formatNumber(Math.round(summaryMetrics.totalWeight))}
                  </h2>
                </div>
                <div 
                  className="rounded-circle p-3" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '1.5rem' }}
                >
                  ⚖️
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Volumen Total */}
        <div className="col-12 col-sm-6 col-lg-4">
          <div 
            className="card" 
            style={{
              ...styles.metricCard,
              background: GRADIENTS.green,
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="mb-1" style={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: '500' }}>
                    Volumen (m³)
                  </p>
                  <h2 className="mb-0 fw-bold" style={{ fontSize: '2.5rem' }}>
                    {formatNumber(Math.round(summaryMetrics.totalVolume))}
                  </h2>
                </div>
                <div 
                  className="rounded-circle p-3" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '1.5rem' }}
                >
                  📐
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="row g-4 mb-4">
        {/* Gráfico de Envíos Mensuales */}
        <div className="col-12 col-lg-8">
          <div className="card" style={styles.chartCard}>
            <div className="card-body p-4">
              <h5 style={styles.chartTitle}>Envíos por Mes ({filters.year})</h5>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyShipments}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorAir" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.air} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={COLORS.air} stopOpacity={0.6}/>
                      </linearGradient>
                      <linearGradient id="colorOcean" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.ocean} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={COLORS.ocean} stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: COLORS.textSecondary, fontSize: 12 }}
                      axisLine={{ stroke: COLORS.border }}
                    />
                    <YAxis 
                      tick={{ fill: COLORS.textSecondary, fontSize: 12 }}
                      axisLine={{ stroke: COLORS.border }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '0.875rem', fontWeight: '500' }}
                    />
                    <Bar dataKey="air" name="Aéreos" fill="url(#colorAir)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="ocean" name="Marítimos" fill="url(#colorOcean)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gráfico de Distribución FCL/LCL */}
        <div className="col-12 col-lg-4">
          <div className="card" style={styles.chartCard}>
            <div className="card-body p-4">
              <h5 style={styles.chartTitle}>Tipo de Envío</h5>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row g-4 mb-4">
        {/* Gráfico de Top Rutas - MEJORADO */}
        <div className="col-12 col-lg-8">
          <div className="card" style={styles.chartCard}>
            <div className="card-body p-4">
              <h5 style={styles.chartTitle}>Top 10 Rutas Más Utilizadas</h5>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topRoutes}
                    margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis 
                      type="number" 
                      tick={{ fill: COLORS.textSecondary, fontSize: 12 }}
                      axisLine={{ stroke: COLORS.border }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="route" 
                      tick={<CustomYAxisTick />}
                      width={140}
                      axisLine={{ stroke: COLORS.border }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      name="Envíos" 
                      radius={[0, 8, 8, 0]}
                    >
                      {topRoutes.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isAir ? COLORS.air : COLORS.ocean} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gráfico de Top Embarcadores */}
        <div className="col-12 col-lg-4">
          <div className="card" style={styles.chartCard}>
            <div className="card-body p-4">
              <h5 style={styles.chartTitle}>Top 5 Embarcadores</h5>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={shipperDistribution}
                    margin={{ top: 20, right: 20, left: 20, bottom: 80 }}
                  >
                    <defs>
                      <linearGradient id="colorAir2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.air} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={COLORS.air} stopOpacity={0.6}/>
                      </linearGradient>
                      <linearGradient id="colorOcean2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.ocean} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={COLORS.ocean} stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={90}
                      tick={{ fill: COLORS.textSecondary, fontSize: 11 }}
                      axisLine={{ stroke: COLORS.border }}
                    />
                    <YAxis 
                      tick={{ fill: COLORS.textSecondary, fontSize: 12 }}
                      axisLine={{ stroke: COLORS.border }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.875rem', fontWeight: '500' }} />
                    <Bar dataKey="air" name="Aéreos" fill="url(#colorAir2)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="ocean" name="Marítimos" fill="url(#colorOcean2)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje si no hay datos */}
      {summaryMetrics.totalShipments === 0 && !loading && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📊</div>
          <h5 style={{ 
            color: COLORS.textPrimary, 
            fontWeight: '600', 
            marginBottom: '0.75rem' 
          }}>
            No hay datos disponibles
          </h5>
          <p style={{ color: COLORS.textSecondary, marginBottom: 0 }}>
            Intenta cambiar los filtros o verifica que existan envíos registrados
          </p>
        </div>
      )}
    </div>
    );
  };

   if (loading) {
    return (
      <div style={styles.container} className="container-fluid p-4">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '70vh',
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: '20px',
              padding: '3rem 4rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              textAlign: 'center',
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {/* Icono de reportería con animación */}
            <div
              style={{
                fontSize: '4rem',
                marginBottom: '1.5rem',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              📊
            </div>

            {/* Texto de carga */}
            <h4
              style={{
                color: COLORS.textPrimary,
                fontWeight: '600',
                marginBottom: '1rem',
                fontSize: '1.25rem',
              }}
            >
              Cargando Información
            </h4>

            {/* Spinner de carga */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '1.5rem',
              }}
            >
              <div
                className="spinner-border"
                style={{
                  width: '3rem',
                  height: '3rem',
                  color: COLORS.primary,
                  borderWidth: '0.3rem',
                }}
                role="status"
              >
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>

            {/* Texto adicional */}
            <p
              style={{
                color: COLORS.textSecondary,
                fontSize: '0.9rem',
                marginTop: '1.5rem',
                marginBottom: 0,
              }}
            >
              Obteniendo datos del sistema...
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container} className="container-fluid p-4">
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard Operacional</h1>
        <p style={styles.subtitle}>
          Vista general de tus operaciones logísticas
        </p>
      </div>
      
      {/* Contenido basado en la pestaña activa */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'air' && <ReportsOperations />}
      {activeTab === 'ocean' && <ReportsOperationsOcean />}
      
      {/* Botón Flotante de Filtros */}
      <button
        onClick={() => setShowFilters(true)}
        style={styles.filterButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 102, 234, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 102, 234, 0.4)';
        }}
      >
        <span style={{ marginRight: '8px' }}>🔍</span>
        Filtros
      </button>
      
      {/* Modal de Filtros */}
      {showFilters && (
        <div 
          className="modal fade show d-block" 
          style={styles.modalOverlay}
          onClick={() => setShowFilters(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={styles.modalContent}>
              <div className="modal-header" style={styles.modalHeader}>
                <h5 className="modal-title" style={styles.modalTitle}>
                  Filtros de Búsqueda
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowFilters(false)}
                  style={{ fontSize: '0.875rem' }}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-4">
                  <label style={styles.formLabel}>Año</label>
                  <select 
                    className="form-select" 
                    style={styles.formSelect}
                    value={filters.year}
                    onChange={handleYearChange}
                  >
                    {[2023, 2024, 2025].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label style={styles.formLabel}>Mes</label>
                  <select 
                    className="form-select" 
                    style={styles.formSelect}
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
              <div className="modal-footer border-0 p-4 pt-0">
                <button 
                  type="button" 
                  className="btn btn-light"
                  onClick={() => setShowFilters(false)}
                  style={{
                    borderRadius: '10px',
                    padding: '0.625rem 1.5rem',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Cerrar
                </button>
                <button 
                  type="button" 
                  className="btn"
                  onClick={() => setShowFilters(false)}
                  style={{
                    background: GRADIENTS.purple,
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.625rem 1.5rem',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteriaGeneral;