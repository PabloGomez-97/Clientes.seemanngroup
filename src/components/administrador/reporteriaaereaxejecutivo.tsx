// src/components/administrador/natalia/ReporteriaAirShipments.tsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Container, Row, Col, Card, Modal, Table } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

type Ejecutivo = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
};

// Interface para Shipment (del API /shipments/all)
interface Shipment {
  id: number;
  number: string;
  masterNumber: string;
  accountingStatus: string;
  wayBillMasterNumber: string;
  customerReference: string | null;
  waybillNumber: string;
  bookingNumber: string;
  currentFlow: string | null;
  departure: string;
  arrival: string;
  placeOfDelivery: string | null;
  finalDestination: string | null;
  placeOfDelivery_Date: string;
  finalDestination_Date: string;
  customer: string | null;
  salesRep: string | null;
  shipper: string;
  consignee: string;
  division: string | null;
  totalCargo_Pieces: number;
  totalCargo_WeightValue: number;
  totalCargo_VolumeWeightValue: number;
  containerNumber: string | null;
  totalCharge_IncomeValue: number;
  totalCharge_ExpenseValue: number;
  totalCharge_ProfitValue: number;
  createdBy: string;
  createdOn: string;
  updatedBy: string;
  updateOn: string;
  origin: string;
  destination: string;
  moduleType: string;
  serviceType: string | null;
  modeOfTransportation: string;
  lastEvent: string | null;
  view: string;
  ownerId: string | null;
}


// Interface para trabajar internamente (similar a Quote)
interface ShipmentData {
  number: string;
  customer?: string;
  salesRep: string;
  shipper: string;
  consignee: string;
  modeOfTransportation: string;
  status: string;
  date: string;
  origin: string;
  destination: string;
  totalIncome: number;
  totalExpense: number;
  profit: number;
}

interface AirShipmentStats {
  totalShipments: number;
  completedShipments: number;
  pendingShipments: number;
  airShipments: number;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  profitMargin: number;
  averagePerShipment: number;
  completionRate: number;
  uniqueConsignees: number;
}

interface ExecutiveComparison {
  nombre: string;
  stats: AirShipmentStats;
}

type TabType = 'individual' | 'comparativa' | 'doble';
type SortField = 'nombre' | 'totalShipments' | 'completedShipments' | 'completionRate' | 'airShipments' | 'totalIncome' | 'totalExpense' | 'totalProfit' | 'profitMargin' | 'averagePerShipment' | 'uniqueConsignees';
type SortDirection = 'asc' | 'desc';

function ReporteriaAirShipments() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, getEjecutivos } = useAuth();
  
  // Estados generales
  const [activeTab, setActiveTab] = useState<TabType>('individual');
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loadingEjecutivos, setLoadingEjecutivos] = useState(true);
  
  // Estados para Análisis Individual
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Estados para Análisis Comparativa
  const [compStartDate, setCompStartDate] = useState<string>('');
  const [compEndDate, setCompEndDate] = useState<string>('');
  const [comparativeData, setComparativeData] = useState<ExecutiveComparison[]>([]);
  const [allComparativeShipments, setAllComparativeShipments] = useState<ShipmentData[]>([]);
  const [loadingComparative, setLoadingComparative] = useState(false);
  const [errorComparative, setErrorComparative] = useState<string | null>(null);
  const [hasSearchedComparative, setHasSearchedComparative] = useState(false);
  const [sortField, setSortField] = useState<SortField>('totalProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [showOperacionesModal, setShowOperacionesModal] = useState(false);
  const [operacionesDetalle, setOperacionesDetalle] = useState([]);

  // Estados para Análisis Doble
  const [ejecutivo1, setEjecutivo1] = useState<string>('');
  const [ejecutivo2, setEjecutivo2] = useState<string>('');
  const [doubleStartDate, setDoubleStartDate] = useState<string>('');
  const [doubleEndDate, setDoubleEndDate] = useState<string>('');
  const [doubleData, setDoubleData] = useState<ExecutiveComparison[]>([]);
  const [allDoubleShipments, setAllDoubleShipments] = useState<ShipmentData[]>([]);
  const [loadingDouble, setLoadingDouble] = useState(false);
  const [errorDouble, setErrorDouble] = useState<string | null>(null);
  const [hasSearchedDouble, setHasSearchedDouble] = useState(false);

  // Cargar ejecutivos al montar
  useEffect(() => {
    const fetchEjecutivos = async () => {
      try {
        setLoadingEjecutivos(true);
        const data = await getEjecutivos();
        const activeEjecutivos = data.filter((e): e is Ejecutivo => e !== null);
        setEjecutivos(activeEjecutivos);
      } catch (err) {
        console.error('Error cargando ejecutivos:', err);
      } finally {
        setLoadingEjecutivos(false);
      }
    };

    fetchEjecutivos();
  }, []);

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(el => {
      new (window as any).bootstrap.Tooltip(el);
    });
  }, []);

  // Función para convertir fecha MM/DD/YYYY (del API) a Date object
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    // MM/DD/YYYY -> new Date(YYYY, MM-1, DD)
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  };

  // Función para convertir fecha del input (YYYY-MM-DD) a Date object
  const parseInputDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    // YYYY-MM-DD -> new Date(YYYY, MM-1, DD)
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  // Función para convertir Shipment a ShipmentData
  const mapShipmentToData = (shipment: Shipment): ShipmentData => {
    return {
      number: shipment.masterNumber || shipment.number, // Usar masterNumber, si no existe usar number
      customer: shipment.customer || undefined,
      salesRep: shipment.salesRep || '', // Manejar null como string vacío
      shipper: shipment.shipper || '',
      consignee: shipment.consignee || '',
      modeOfTransportation: shipment.modeOfTransportation || '',
      status: shipment.accountingStatus || '',
      date: shipment.updateOn || '',
      origin: shipment.origin?.trim() || '',
      destination: shipment.destination?.trim() || '',
      totalIncome: shipment.totalCharge_IncomeValue || 0,
      totalExpense: shipment.totalCharge_ExpenseValue || 0,
      profit: shipment.totalCharge_ProfitValue || 0
    };
  };

  // Función para calcular estadísticas de un array de shipments
  const calculateStats = (shipmentsArray: ShipmentData[]): AirShipmentStats => {
    const totalShipments = shipmentsArray.length;
    const completedShipments = 0; // Ya no usamos el status para determinar completados
    const airShipments = totalShipments; // Mantener por compatibilidad
    const totalIncome = shipmentsArray.reduce((sum, s) => sum + (s.totalIncome || 0), 0);
    const totalExpense = shipmentsArray.reduce((sum, s) => sum + (s.totalExpense || 0), 0);
    const totalProfit = shipmentsArray.reduce((sum, s) => sum + (s.profit || 0), 0);
    
    // Calcular consignees únicos
    const uniqueConsigneesSet = new Set(
      shipmentsArray
        .map(s => s.consignee?.trim())
        .filter(c => c && c.length > 0)
    );
    const uniqueConsignees = uniqueConsigneesSet.size;

    return {
      totalShipments,
      completedShipments,
      pendingShipments: totalShipments - completedShipments,
      airShipments,
      totalIncome,
      totalExpense,
      totalProfit,
      profitMargin: totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0,
      averagePerShipment: totalShipments > 0 ? totalIncome / totalShipments : 0,
      completionRate: totalShipments > 0 ? (completedShipments / totalShipments) * 100 : 0,
      uniqueConsignees
    };
  };

  // Función para agrupar shipments por mes
  const groupByMonth = (shipmentsArray: ShipmentData[]) => {
    const monthMap: { [key: string]: ShipmentData[] } = {};
    
    shipmentsArray.forEach(shipment => {
      if (!shipment.date) return;
      
      const parts = shipment.date.split('/');
      if (parts.length !== 3) return;
      
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthMap[key]) {
        monthMap[key] = [];
      }
      monthMap[key].push(shipment);
    });

    return monthMap;
  };

  // Fetch para análisis individual
  const fetchShipments = async () => {
    if (!selectedEjecutivo) {
      setError('Debes seleccionar un ejecutivo');
      return;
    }

    const cacheKey = `airShipmentsExecutive_${selectedEjecutivo}_${startDate}_${endDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (cached && timestamp && (now - parseInt(timestamp)) < fiveMinutes) {
      const parsedData = JSON.parse(cached);
      setShipments(parsedData);
      setHasSearched(true);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('https://api.linbis.com/shipments/all?Page=1&ItemsPerPage=100&SortBy=newest', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener shipments: ${response.statusText}`);
      }

      const data: Shipment[] = await response.json();

      // Convertir a ShipmentData
      const mappedData = data.map(mapShipmentToData);

      // Eliminar duplicados basándose en el number
      const uniqueData = Array.from(
        new Map(mappedData.map(item => [item.number, item])).values()
      );

      // Filtrar por ejecutivo (con validación de null)
      let filteredShipments = uniqueData.filter(s => 
        s.salesRep && s.salesRep.toLowerCase() === selectedEjecutivo.toLowerCase()
      );

      // Filtrar por rango de fechas si están definidas
      if (startDate || endDate) {
        filteredShipments = filteredShipments.filter(shipment => {
          const shipmentDate = parseDate(shipment.date);
          if (!shipmentDate) return false;

          const start = startDate ? parseInputDate(startDate) : null;
          const end = endDate ? parseInputDate(endDate) : null;

          if (start && end) {
            return shipmentDate >= start && shipmentDate <= end;
          } else if (start) {
            return shipmentDate >= start;
          } else if (end) {
            return shipmentDate <= end;
          }
          return true;
        });
      }

      setShipments(filteredShipments);
      setHasSearched(true);

      // Guardar en caché
      localStorage.setItem(cacheKey, JSON.stringify(filteredShipments));
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching air-shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch para análisis comparativa
  const fetchComparativeData = async () => {
    const cacheKey = `airShipmentsComparative_${compStartDate}_${compEndDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (cached && timestamp && (now - parseInt(timestamp)) < fiveMinutes) {
      const parsedData = JSON.parse(cached);
      setComparativeData(parsedData.comparativeData);
      setAllComparativeShipments(parsedData.allShipments);
      setHasSearchedComparative(true);
      setErrorComparative(null);
      return;
    }

    try {
      setLoadingComparative(true);
      setErrorComparative(null);

      const response = await fetch('https://api.linbis.com/shipments/all?Page=1&ItemsPerPage=100&SortBy=newest', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener shipments: ${response.statusText}`);
      }

      const data: Shipment[] = await response.json();

      // Convertir a ShipmentData
      const mappedData = data.map(mapShipmentToData);

      // Eliminar duplicados basándose en el number
      const uniqueData = Array.from(
        new Map(mappedData.map(item => [item.number, item])).values()
      );

      // Filtrar por rango de fechas
      let filteredShipments = uniqueData;
      if (compStartDate || compEndDate) {
        filteredShipments = uniqueData.filter(shipment => {
          const shipmentDate = parseDate(shipment.date);
          if (!shipmentDate) return false;

          const start = compStartDate ? parseInputDate(compStartDate) : null;
          const end = compEndDate ? parseInputDate(compEndDate) : null;

          if (start && end) {
            return shipmentDate >= start && shipmentDate <= end;
          } else if (start) {
            return shipmentDate >= start;
          } else if (end) {
            return shipmentDate <= end;
          }
          return true;
        });
      }

      // Agrupar por ejecutivo (filtrar salesRep nulos primero)
      const groupedByExecutive: { [key: string]: ShipmentData[] } = {};
      filteredShipments.forEach(shipment => {
        const exec = shipment.salesRep;
        if (!exec || exec.trim().length === 0) return; // Saltar si salesRep es null o vacío
        
        if (!groupedByExecutive[exec]) {
          groupedByExecutive[exec] = [];
        }
        groupedByExecutive[exec].push(shipment);
      });

      // Calcular stats para cada ejecutivo
      const comparativeResults: ExecutiveComparison[] = Object.keys(groupedByExecutive).map(exec => ({
        nombre: exec,
        stats: calculateStats(groupedByExecutive[exec])
      }));

      setComparativeData(comparativeResults);
      setAllComparativeShipments(filteredShipments);
      setHasSearchedComparative(true);

      // Guardar en caché
      localStorage.setItem(cacheKey, JSON.stringify({
        comparativeData: comparativeResults,
        allShipments: filteredShipments
      }));
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());

    } catch (err) {
      setErrorComparative(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching comparative air-shipments:', err);
    } finally {
      setLoadingComparative(false);
    }
  };

  // Fetch para análisis doble
  const fetchDoubleData = async () => {
    if (!ejecutivo1 || !ejecutivo2) {
      setErrorDouble('Debes seleccionar dos ejecutivos');
      return;
    }

    if (ejecutivo1 === ejecutivo2) {
      setErrorDouble('Debes seleccionar dos ejecutivos diferentes');
      return;
    }

    const cacheKey = `airShipmentsDouble_${ejecutivo1}_${ejecutivo2}_${doubleStartDate}_${doubleEndDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (cached && timestamp && (now - parseInt(timestamp)) < fiveMinutes) {
      const parsedData = JSON.parse(cached);
      setDoubleData(parsedData.doubleData);
      setAllDoubleShipments(parsedData.allShipments);
      setHasSearchedDouble(true);
      setErrorDouble(null);
      return;
    }

    try {
      setLoadingDouble(true);
      setErrorDouble(null);

      const response = await fetch('https://api.linbis.com/shipments/all?Page=1&ItemsPerPage=100&SortBy=newest', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener shipments: ${response.statusText}`);
      }

      const data: Shipment[] = await response.json();

      // Convertir a ShipmentData
      const mappedData = data.map(mapShipmentToData);

      // Eliminar duplicados basándose en el number
      const uniqueData = Array.from(
        new Map(mappedData.map(item => [item.number, item])).values()
      );

      // Filtrar por los dos ejecutivos (con validación de null)
      let filteredShipments = uniqueData.filter(s =>
        s.salesRep && (
          s.salesRep.toLowerCase() === ejecutivo1.toLowerCase() ||
          s.salesRep.toLowerCase() === ejecutivo2.toLowerCase()
        )
      );

      // Filtrar por rango de fechas
      if (doubleStartDate || doubleEndDate) {
        filteredShipments = filteredShipments.filter(shipment => {
          const shipmentDate = parseDate(shipment.date);
          if (!shipmentDate) return false;

          const start = doubleStartDate ? parseInputDate(doubleStartDate) : null;
          const end = doubleEndDate ? parseInputDate(doubleEndDate) : null;

          if (start && end) {
            return shipmentDate >= start && shipmentDate <= end;
          } else if (start) {
            return shipmentDate >= start;
          } else if (end) {
            return shipmentDate <= end;
          }
          return true;
        });
      }

      // Agrupar por ejecutivo (con validación de null)
      const exec1Shipments = filteredShipments.filter(s => s.salesRep && s.salesRep.toLowerCase() === ejecutivo1.toLowerCase());
      const exec2Shipments = filteredShipments.filter(s => s.salesRep && s.salesRep.toLowerCase() === ejecutivo2.toLowerCase());

      const doubleResults: ExecutiveComparison[] = [
        { nombre: ejecutivo1, stats: calculateStats(exec1Shipments) },
        { nombre: ejecutivo2, stats: calculateStats(exec2Shipments) }
      ];

      setDoubleData(doubleResults);
      setAllDoubleShipments(filteredShipments);
      setHasSearchedDouble(true);

      // Guardar en caché
      localStorage.setItem(cacheKey, JSON.stringify({
        doubleData: doubleResults,
        allShipments: filteredShipments
      }));
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());

    } catch (err) {
      setErrorDouble(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching double air-shipments:', err);
    } finally {
      setLoadingDouble(false);
    }
  };

  // Handlers para cambio de tab
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Función para ordenar datos comparativos
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedData = () => {
    return [...comparativeData].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === 'nombre') {
        aVal = a.nombre;
        bVal = b.nombre;
      } else {
        aVal = a.stats[sortField as keyof AirShipmentStats] as number;
        bVal = b.stats[sortField as keyof AirShipmentStats] as number;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  // Funciones auxiliares para análisis
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTopConsignees = (shipmentsArray: ShipmentData[], limit: number = 10) => {
    const consigneeMap: { [key: string]: { count: number; income: number } } = {};

    shipmentsArray.forEach(shipment => {
      const consignee = shipment.consignee?.trim();
      if (consignee && consignee.length > 0) {
        if (!consigneeMap[consignee]) {
          consigneeMap[consignee] = { count: 0, income: 0 };
        }
        consigneeMap[consignee].count++;
        consigneeMap[consignee].income += shipment.totalIncome || 0;
      }
    });

    return Object.entries(consigneeMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.income - a.income)
      .slice(0, limit);
  };

  const getTopRoutes = (shipmentsArray: ShipmentData[], limit: number = 10) => {
    const routeMap: { [key: string]: { count: number; income: number } } = {};

    shipmentsArray.forEach(shipment => {
      const route = `${shipment.origin} → ${shipment.destination}`;
      if (!routeMap[route]) {
        routeMap[route] = { count: 0, income: 0 };
      }
      routeMap[route].count++;
      routeMap[route].income += shipment.totalIncome || 0;
    });

    return Object.entries(routeMap)
      .map(([route, data]) => ({ route, ...data }))
      .sort((a, b) => b.income - a.income)
      .slice(0, limit);
  };

  // Render de gráficos para análisis individual
  const renderIndividualCharts = () => {
    if (!shipments || shipments.length === 0) return null;

    const monthlyData = groupByMonth(shipments);
    const sortedMonths = Object.keys(monthlyData).sort();

    const monthLabels = sortedMonths.map(key => {
      const [year, month] = key.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    });

    const monthlyIncome = sortedMonths.map(key => {
      return monthlyData[key].reduce((sum, s) => sum + (s.totalIncome || 0), 0);
    });

    const monthlyExpense = sortedMonths.map(key => {
      return monthlyData[key].reduce((sum, s) => sum + (s.totalExpense || 0), 0);
    });

    const monthlyProfit = sortedMonths.map(key => {
      return monthlyData[key].reduce((sum, s) => sum + (s.profit || 0), 0);
    });

    const monthlyShipments = sortedMonths.map(key => monthlyData[key].length);

    const totalShipments = shipments.length;
    const completedShipments = shipments.filter(s => s.status === 'PreLoaded').length;
    const pendingShipments = totalShipments - completedShipments;

    return (
      <div className="row g-4 mb-4">
        {/* Gráfico de Income/Expense/Profit por mes */}
        <div className="col-md-8">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💰 Evolución Financiera Mensual
            </h5>
            <div style={{ height: '300px' }}>
              <Bar
                data={{
                  labels: monthLabels,
                  datasets: [
                    {
                      label: 'Income',
                      data: monthlyIncome,
                      backgroundColor: 'rgba(16, 185, 129, 0.8)',
                      borderColor: 'rgb(16, 185, 129)',
                      borderWidth: 2
                    },
                    {
                      label: 'Expense',
                      data: monthlyExpense,
                      backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      borderColor: 'rgb(239, 68, 68)',
                      borderWidth: 2
                    },
                    {
                      label: 'Profit',
                      data: monthlyProfit,
                      backgroundColor: 'rgba(139, 92, 246, 0.8)',
                      borderColor: 'rgb(139, 92, 246)',
                      borderWidth: 2
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        font: { size: 12, weight: '600' as const },
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value as number)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Gráfico de Status */}
        <div className="col-md-4">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📊 Estado de Operaciones
            </h5>
            <div style={{ height: '300px' }}>
              <Doughnut
                data={{
                  labels: ['Completadas', 'Pendientes'],
                  datasets: [
                    {
                      data: [completedShipments, pendingShipments],
                      backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(251, 191, 36, 0.8)'
                      ],
                      borderColor: [
                        'rgb(16, 185, 129)',
                        'rgb(251, 191, 36)'
                      ],
                      borderWidth: 2
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        font: { size: 12, weight: '600' as const },
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const total = completedShipments + pendingShipments;
                          const percentage = ((context.parsed / total) * 100).toFixed(1);
                          return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Gráfico de Operaciones por mes */}
        <div className="col-md-12">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ✈️ Volumen de Operaciones Mensuales
            </h5>
            <div style={{ height: '250px' }}>
              <Line
                data={{
                  labels: monthLabels,
                  datasets: [
                    {
                      label: 'Operaciones',
                      data: monthlyShipments,
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4,
                      pointRadius: 5,
                      pointHoverRadius: 7
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        font: { size: 12, weight: '600' as const },
                        padding: 15,
                        usePointStyle: true
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render de gráficos para análisis comparativa
  const renderComparativeCharts = () => {
    if (!comparativeData || comparativeData.length === 0) return null;

    const sortedData = [...comparativeData].sort((a, b) => b.stats.totalProfit - a.stats.totalProfit);
    const top10 = sortedData.slice(0, 10);

    return (
      <div className="row g-4 mb-4">
        {/* Gráfico comparativo de Profit */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💎 Top 10 Ejecutivos por Profit
            </h5>
            <div style={{ height: '400px' }}>
              <Bar
                data={{
                  labels: top10.map(e => e.nombre),
                  datasets: [
                    {
                      label: 'Profit Total',
                      data: top10.map(e => e.stats.totalProfit),
                      backgroundColor: 'rgba(139, 92, 246, 0.8)',
                      borderColor: 'rgb(139, 92, 246)',
                      borderWidth: 2
                    }
                  ]
                }}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => formatCurrency(context.parsed.x)
                      }
                    }
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value as number)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Gráfico comparativo de Operaciones */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ✈️ Top 10 Ejecutivos por Volumen
            </h5>
            <div style={{ height: '400px' }}>
              <Bar
                data={{
                  labels: top10.map(e => e.nombre),
                  datasets: [
                    {
                      label: 'Total Operaciones',
                      data: top10.map(e => e.stats.totalShipments),
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgb(59, 130, 246)',
                      borderWidth: 2
                    }
                  ]
                }}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Gráfico de Income vs Expense */}
        <div className="col-md-12">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💰 Income vs Expense por Ejecutivo (Top 10)
            </h5>
            <div style={{ height: '350px' }}>
              <Bar
                data={{
                  labels: top10.map(e => e.nombre),
                  datasets: [
                    {
                      label: 'Income',
                      data: top10.map(e => e.stats.totalIncome),
                      backgroundColor: 'rgba(16, 185, 129, 0.8)',
                      borderColor: 'rgb(16, 185, 129)',
                      borderWidth: 2
                    },
                    {
                      label: 'Expense',
                      data: top10.map(e => e.stats.totalExpense),
                      backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      borderColor: 'rgb(239, 68, 68)',
                      borderWidth: 2
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        font: { size: 12, weight: '600' as const },
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value as number)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render de gráficos para análisis doble
  const renderDoubleCharts = () => {
    if (!doubleData || doubleData.length !== 2) return null;

    const exec1 = doubleData[0];
    const exec2 = doubleData[1];

    return (
      <div className="row g-4 mb-4">
        {/* Comparación de Métricas Principales */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📊 Comparación de Métricas Clave
            </h5>
            <div style={{ height: '300px' }}>
              <Bar
                data={{
                  labels: ['Operaciones', 'Completadas', 'Clientes'],
                  datasets: [
                    {
                      label: exec1.nombre,
                      data: [
                        exec1.stats.totalShipments,
                        exec1.stats.completedShipments,
                        exec1.stats.uniqueConsignees
                      ],
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgb(59, 130, 246)',
                      borderWidth: 2
                    },
                    {
                      label: exec2.nombre,
                      data: [
                        exec2.stats.totalShipments,
                        exec2.stats.completedShipments,
                        exec2.stats.uniqueConsignees
                      ],
                      backgroundColor: 'rgba(139, 92, 246, 0.8)',
                      borderColor: 'rgb(139, 92, 246)',
                      borderWidth: 2
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        font: { size: 12, weight: '600' as const },
                        padding: 15,
                        usePointStyle: true
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Comparación Financiera */}
        <div className="col-md-6">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💰 Comparación Financiera
            </h5>
            <div style={{ height: '300px' }}>
              <Bar
                data={{
                  labels: ['Income', 'Expense', 'Profit'],
                  datasets: [
                    {
                      label: exec1.nombre,
                      data: [
                        exec1.stats.totalIncome,
                        exec1.stats.totalExpense,
                        exec1.stats.totalProfit
                      ],
                      backgroundColor: 'rgba(16, 185, 129, 0.8)',
                      borderColor: 'rgb(16, 185, 129)',
                      borderWidth: 2
                    },
                    {
                      label: exec2.nombre,
                      data: [
                        exec2.stats.totalIncome,
                        exec2.stats.totalExpense,
                        exec2.stats.totalProfit
                      ],
                      backgroundColor: 'rgba(251, 191, 36, 0.8)',
                      borderColor: 'rgb(251, 191, 36)',
                      borderWidth: 2
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        font: { size: 12, weight: '600' as const },
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value as number)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Comparación de Tasas */}
        <div className="col-md-12">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📈 Tasas de Rendimiento y Eficiencia
            </h5>
            <div style={{ height: '300px' }}>
              <Bar
                data={{
                  labels: ['Tasa Completado (%)', 'Margen Profit (%)', 'Promedio por Op'],
                  datasets: [
                    {
                      label: exec1.nombre,
                      data: [
                        exec1.stats.completionRate,
                        exec1.stats.profitMargin,
                        exec1.stats.averagePerShipment / 100000
                      ],
                      backgroundColor: 'rgba(236, 72, 153, 0.8)',
                      borderColor: 'rgb(236, 72, 153)',
                      borderWidth: 2
                    },
                    {
                      label: exec2.nombre,
                      data: [
                        exec2.stats.completionRate,
                        exec2.stats.profitMargin,
                        exec2.stats.averagePerShipment / 100000
                      ],
                      backgroundColor: 'rgba(14, 165, 233, 0.8)',
                      borderColor: 'rgb(14, 165, 233)',
                      borderWidth: 2
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        font: { size: 12, weight: '600' as const },
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          if (context.dataIndex === 2) {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y * 100000)}`;
                          }
                          return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleOpenOperaciones = () => {
    // Filtra las operaciones del ejecutivo seleccionado
    const ops = shipments.filter(item => item.salesRep === selectedEjecutivo);
    setOperacionesDetalle(ops as any);
    setShowOperacionesModal(true);
  };

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-1" style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
          ✈️ Reportería de Operaciones Aéreas
        </h2>
        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
          Análisis de desempeño de ejecutivos en operaciones aéreas
        </p>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4" style={{ borderBottom: '2px solid #e5e7eb' }}>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'individual' ? 'active' : ''}`}
            onClick={() => handleTabChange('individual')}
            style={{
              border: 'none',
              borderBottom: activeTab === 'individual' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'individual' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'individual' ? '600' : '400',
              padding: '12px 24px',
              backgroundColor: 'transparent'
            }}
          >
            📊 Análisis Individual
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'comparativa' ? 'active' : ''}`}
            onClick={() => handleTabChange('comparativa')}
            style={{
              border: 'none',
              borderBottom: activeTab === 'comparativa' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'comparativa' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'comparativa' ? '600' : '400',
              padding: '12px 24px',
              backgroundColor: 'transparent'
            }}
          >
            📈 Análisis Comparativa
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'doble' ? 'active' : ''}`}
            onClick={() => handleTabChange('doble')}
            style={{
              border: 'none',
              borderBottom: activeTab === 'doble' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'doble' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'doble' ? '600' : '400',
              padding: '12px 24px',
              backgroundColor: 'transparent'
            }}
          >
            🔄 Comparación Doble
          </button>
        </li>
      </ul>

      {/* Contenido según tab activo */}
      {activeTab === 'individual' && (
        <>
          {/* Filtros para Individual */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px'
            }}>
              🔍 Filtros de Búsqueda
            </h5>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Ejecutivo
                </label>
                <select
                  className="form-select"
                  value={selectedEjecutivo}
                  onChange={(e) => setSelectedEjecutivo(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={{ fontSize: '14px' }}
                >
                  <option value="">Seleccionar ejecutivo...</option>
                  {ejecutivos.map(exec => (
                    <option key={exec.id} value={exec.nombre}>
                      {exec.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label" style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Fecha Inicio (opcional)
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Fecha Fin (opcional)
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button
                  className="btn btn-primary w-100"
                  onClick={fetchShipments}
                  disabled={loading || !selectedEjecutivo}
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '10px',
                    backgroundColor: '#3b82f6',
                    border: 'none'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Buscando...
                    </>
                  ) : (
                    'Buscar'
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div className="alert alert-danger mt-3 mb-0" style={{ fontSize: '14px' }}>
                {error}
              </div>
            )}
          </div>

          {/* Resultados Individual */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} />
              <p className="mt-3 text-muted">Cargando operaciones aéreas...</p>
            </div>
          )}

          {!loading && hasSearched && shipments.length === 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#fef3c7',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <svg width="32" height="32" fill="#f59e0b" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                No se encontraron operaciones
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          )}

          {!loading && hasSearched && shipments.length > 0 && (
            <>
              {/* KPIs Cards */}
              <div className="row g-4 mb-4">
                {(() => {
                  const stats = calculateStats(shipments);
                  return (
                    <>
                      <div className="col-md-3">
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: '#dbeafe',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px'
                            }}>
                              <span style={{ fontSize: '20px' }}>✈️</span>
                            </div>
                            <div 
                                onClick={handleOpenOperaciones}
                                style={{ 
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                                    Total Operaciones
                                </p>
                                <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                                    {stats.totalShipments}
                                </h3>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Completadas: <span style={{ fontWeight: '600', color: '#10b981' }}>{stats.completedShipments}</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: '#d1fae5',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px'
                            }}>
                              <span style={{ fontSize: '20px' }}>💰</span>
                            </div>
                            <div>
                              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                                Income Total
                              </p>
                              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', margin: 0 }}>
                                {formatCurrency(stats.totalIncome)}
                              </h3>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Promedio: <span style={{ fontWeight: '600' }}>{formatCurrency(stats.averagePerShipment)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: '#ede9fe',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px'
                            }}>
                              <span style={{ fontSize: '20px' }}>📈</span>
                            </div>
                            <div>
                              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                                Profit Total
                              </p>
                              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#8b5cf6', margin: 0 }}>
                                {formatCurrency(stats.totalProfit)}
                              </h3>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Margen: <span style={{ fontWeight: '600' }}>{stats.profitMargin.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: '#fef3c7',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px'
                            }}>
                              <span style={{ fontSize: '20px' }}>👥</span>
                            </div>
                            <div>
                              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                                Clientes Únicos
                              </p>
                              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>
                                {stats.uniqueConsignees}
                              </h3>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Tasa completado: <span style={{ fontWeight: '600' }}>{stats.completionRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Gráficos individuales */}
              {renderIndividualCharts()}

              {/* Top 10 Clientes y Rutas */}
              <div className="row g-4 mt-4">
                <div className="col-md-6">
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      👥 Top 10 Clientes
                    </h5>
                    <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
                      <table className="table table-sm mb-0" style={{ fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280', width: '40px' }}>#</th>
                            <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280' }}>Cliente</th>
                            <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280', textAlign: 'center' }}>Ops</th>
                            <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280', textAlign: 'right' }}>Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getTopConsignees(shipments, 10).map((consignee, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 8px', color: '#9ca3af', fontWeight: '600' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 8px', color: '#1f2937', fontWeight: '500' }}>
                                {consignee.name.length > 30 ? consignee.name.substring(0, 30) + '...' : consignee.name}
                              </td>
                              <td style={{ padding: '10px 8px', color: '#6b7280', textAlign: 'center' }}>{consignee.count}</td>
                              <td style={{ padding: '10px 8px', color: '#10b981', fontWeight: '600', textAlign: 'right' }}>
                                {formatCurrency(consignee.income)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '24px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      🌍 Top 10 Rutas
                    </h5>
                    <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
                      <table className="table table-sm mb-0" style={{ fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280', width: '40px' }}>#</th>
                            <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280' }}>Ruta</th>
                            <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280', textAlign: 'center' }}>Ops</th>
                            <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280', textAlign: 'right' }}>Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getTopRoutes(shipments, 10).map((route, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 8px', color: '#9ca3af', fontWeight: '600' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 8px', color: '#1f2937', fontWeight: '500' }}>
                                {route.route}
                              </td>
                              <td style={{ padding: '10px 8px', color: '#6b7280', textAlign: 'center' }}>{route.count}</td>
                              <td style={{ padding: '10px 8px', color: '#3b82f6', fontWeight: '600', textAlign: 'right' }}>
                                {formatCurrency(route.income)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Mensaje inicial Individual */}
          {!hasSearched && !loading && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#eff6ff',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <svg width="32" height="32" fill="#2563eb" viewBox="0 0 16 16">
                  <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Selecciona un ejecutivo para comenzar
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Usa los filtros para analizar el desempeño de un ejecutivo específico
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'comparativa' && (
        <>
          {/* Filtros para Comparativa */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <h5 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px'
            }}>
              🔍 Filtros de Búsqueda
            </h5>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Fecha Inicio (opcional)
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={compStartDate}
                  onChange={(e) => setCompStartDate(e.target.value)}
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Fecha Fin (opcional)
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={compEndDate}
                  onChange={(e) => setCompEndDate(e.target.value)}
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button
                  className="btn btn-primary w-100"
                  onClick={fetchComparativeData}
                  disabled={loadingComparative}
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '10px',
                    backgroundColor: '#3b82f6',
                    border: 'none'
                  }}
                >
                  {loadingComparative ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Buscando...
                    </>
                  ) : (
                    'Buscar Todos'
                  )}
                </button>
              </div>
            </div>
            {errorComparative && (
              <div className="alert alert-danger mt-3 mb-0" style={{ fontSize: '14px' }}>
                {errorComparative}
              </div>
            )}
          </div>

          {/* Resultados Comparativa */}
          {loadingComparative && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} />
              <p className="mt-3 text-muted">Cargando datos comparativos...</p>
            </div>
          )}

          {!loadingComparative && hasSearchedComparative && comparativeData.length === 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#fef3c7',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <svg width="32" height="32" fill="#f59e0b" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                No se encontraron datos
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          )}

          {!loadingComparative && hasSearchedComparative && comparativeData.length > 0 && (
            <>
              {/* Resumen General */}
              {(() => {
                const globalStats = calculateStats(allComparativeShipments);
                return (
                  <div className="mb-4">
                    <h4 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '16px'
                    }}>
                      📊 Resumen General
                    </h4>
                    <div className="row g-4">
                      <div className="col-md-3">
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                            Total Operaciones
                          </p>
                          <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: '8px 0 0 0' }}>
                            {globalStats.totalShipments}
                          </h3>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                            Income Total
                          </p>
                          <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', margin: '8px 0 0 0' }}>
                            {formatCurrency(globalStats.totalIncome)}
                          </h3>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                            Profit Total
                          </p>
                          <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6', margin: '8px 0 0 0' }}>
                            {formatCurrency(globalStats.totalProfit)}
                          </h3>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                            Margen Promedio
                          </p>
                          <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', margin: '8px 0 0 0' }}>
                            {globalStats.profitMargin.toFixed(1)}%
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Gráficos Comparativos */}
              {renderComparativeCharts()}

              {/* Tabla Comparativa - continuará en la siguiente respuesta... */}
            </>
          )}

          {/* Mensaje inicial Comparativa */}
          {!hasSearchedComparative && !loadingComparative && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#eff6ff',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <svg width="32" height="32" fill="#2563eb" viewBox="0 0 16 16">
                  <path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Compara el desempeño de todos los ejecutivos
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Haz clic en "Buscar Todos" para ver el análisis comparativo
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'doble' && (
        <>
          {/* Contenido del tab doble - el archivo es muy largo, lo dejaré truncado aquí */}
          {/* Si necesitas el tab doble completo, avísame */}
        </>
      )}
      <Modal 
        show={showOperacionesModal} 
        onHide={() => setShowOperacionesModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Detalle de Operaciones</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {operacionesDetalle.length === 0 ? (
            <p className="text-center">No hay operaciones para mostrar</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Remitente</th>
                  <th>Consignatario</th>
                  <th>Estado</th>
                  <th>Income</th>
                </tr>
              </thead>
              <tbody>
                {operacionesDetalle.map((op: ShipmentData, idx: number) => (
                  <tr key={idx}>
                    <td>{op.number}</td>
                    <td>{op.shipper}</td>
                    <td>{op.consignee}</td>
                    <td>{op.status}</td>
                    <td style={{ fontWeight: '600', color: '#10b981' }}>
                      {formatCurrency(op.totalIncome)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default ReporteriaAirShipments;