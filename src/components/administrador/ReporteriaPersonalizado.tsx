import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { COLORS, GRADIENTS } from '../../themes/reportTheme';


interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface Invoice {
  id?: number;
  number?: string;
  type?: number;
  date?: string;
  dueDate?: string;
  status?: number;
  billTo?: {
    name?: string;
    identificationNumber?: string;
  };
  billToAddress?: string;
  currency?: {
    abbr?: string;
    name?: string;
  };
  amount?: {
    value?: number;
    userString?: string;
  };
  taxAmount?: {
    value?: number;
    userString?: string;
  };
  totalAmount?: {
    value?: number;
    userString?: string;
  };
  balanceDue?: {
    value?: number;
    userString?: string;
  };
  charges?: Array<{
    description?: string;
    quantity?: number;
    unit?: string;
    rate?: number;
    amount?: number;
  }>;
  shipment?: {
    number?: string;
    waybillNumber?: string;
    consignee?: {
      name?: string;
    };
    departure?: string;
    arrival?: string;
    customerReference?: string;
  };
  notes?: string;
  [key: string]: any;
}

interface ShipmentModalData {
  type: 'air' | 'ocean';
  number: string;
}

// Componente para Secciones Colapsables
function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  icon = '📋'
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  icon?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ 
      marginBottom: '12px',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: isOpen ? '#f9fafb' : 'white',
          border: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{icon}</span>
          <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.9rem' }}>
            {title}
          </span>
        </div>
        <span style={{ 
          fontSize: '1.2rem', 
          color: COLORS.textSecondary,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div style={{ padding: '16px', backgroundColor: 'white' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ReporteriaPersonalizable() {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [displayedInvoices, setDisplayedInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(true);
  
  // NUEVOS FILTROS DE CONSIGNEE
  const [filterMode, setFilterMode] = useState<'individual' | 'comparison'>('individual');
  const [selectedConsignee, setSelectedConsignee] = useState<string>('');
  const [consignee1, setConsignee1] = useState<string>('');
  const [consignee2, setConsignee2] = useState<string>('');
  
  // Filtros para comparativa mes/año (modo individual)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  // Modal de comparativa
  const [showComparativeModal, setShowComparativeModal] = useState(false);
  const [compareMonth1, setCompareMonth1] = useState<number>(new Date().getMonth() + 1);
  const [compareYear1, setCompareYear1] = useState<number>(new Date().getFullYear());
  const [compareMonth2, setCompareMonth2] = useState<number | null>(null);
  const [compareYear2, setCompareYear2] = useState<number | null>(null);
  
  // Modales
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentModalData, setShipmentModalData] = useState<ShipmentModalData | null>(null);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [overdueCurrency, setOverdueCurrency] = useState<string | null>(null);

  const openOverdueModal = (currency: string) => {
    setOverdueCurrency(currency);
    setShowOverdueModal(true);
  };

  const closeOverdueModal = () => {
    setShowOverdueModal(false);
    setOverdueCurrency(null);
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

  // Función para formatear moneda con soporte para decimales
  const formatCurrency = (value: number, currency: string = 'CLP', decimals: number = 0): string => {
    const numeric = Number.isFinite(value) ? value : 0;
    const amount = decimals === 0 ? Math.round(numeric) : numeric;

    const formatted = new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);

    if (currency === '$') {
      return `$${formatted}`;
    }

    return `${currency} $${formatted}`;
  };

  // Función para eliminar duplicados de charges
  const processCharges = (charges: any[]) => {
    if (!charges || charges.length === 0) return [];
    
    const uniqueCharges: any[] = [];
    const seenCharges = new Set<string>();
    
    charges.forEach(charge => {
      const key = `${charge.description}-${charge.quantity}-${charge.rate}-${charge.amount}`;
      
      if (!seenCharges.has(key)) {
        seenCharges.add(key);
        uniqueCharges.push(charge);
      }
    });
    
    return uniqueCharges;
  };

  // Obtener lista única de consignees
  const availableConsignees = useMemo(() => {
    const consigneeSet = new Set<string>();
    
    invoices.forEach(inv => {
      if (inv.billTo?.name) {
        consigneeSet.add(inv.billTo.name);
      }
      if (inv.shipment?.consignee?.name) {
        consigneeSet.add(inv.shipment.consignee.name);
      }
    });
    
    return Array.from(consigneeSet).sort();
  }, [invoices]);

  // Obtener años disponibles de las facturas
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    invoices.forEach(inv => {
      if (inv.date) {
        const year = new Date(inv.date).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  // Filtrar facturas según el modo seleccionado
  const filteredInvoices = useMemo(() => {
    if (filterMode === 'individual' && selectedConsignee) {
      return invoices.filter(inv => 
        inv.billTo?.name === selectedConsignee || 
        inv.shipment?.consignee?.name === selectedConsignee
      );
    } else if (filterMode === 'comparison' && (consignee1 || consignee2)) {
      return invoices.filter(inv => {
        const consigneeName = inv.billTo?.name || inv.shipment?.consignee?.name;
        return consigneeName === consignee1 || consigneeName === consignee2;
      });
    }
    return invoices;
  }, [invoices, filterMode, selectedConsignee, consignee1, consignee2]);

  // Fetch inicial de facturas
  const fetchInvoices = async (resetData: boolean = true) => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }
    
    if (resetData) {
      setLoading(true);
      setCurrentPage(1);
      setInvoices([]);
      setDisplayedInvoices([]);
      setHasMoreInvoices(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const startPage = resetData ? 1 : currentPage;
      const pagesToLoad = 3; // Cargar 3 páginas = 300 facturas
      let batchInvoices: Invoice[] = [];
      
      // Cargar 3 páginas en paralelo para mayor velocidad
      const requests = [];
      for (let i = 0; i < pagesToLoad; i++) {
        const page = startPage + i;
        requests.push(
          fetch(
            `https://api.linbis.com/invoices?Page=${page}&ItemsPerPage=100&SortBy=newest`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          )
        );
      }
      
      const responses = await Promise.all(requests);
      
      for (const response of responses) {
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Token inválido o expirado.');
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const invoicesArray: Invoice[] = Array.isArray(data) ? data : [];
        
        if (invoicesArray.length < 100) {
          setHasMoreInvoices(false);
        }
        
        batchInvoices = [...batchInvoices, ...invoicesArray];
      }
      
      if (resetData) {
        setInvoices(batchInvoices);
        setDisplayedInvoices(batchInvoices);
        
        // Guardar en caché solo la primera carga
        localStorage.setItem('invoicesCache', JSON.stringify(batchInvoices));
        localStorage.setItem('invoicesCacheTimestamp', new Date().getTime().toString());
        localStorage.setItem('invoicesCachePage', '3');
        
        // Seleccionar primer consignee por defecto
        if (batchInvoices.length > 0) {
          const firstConsignee = batchInvoices[0].billTo?.name || batchInvoices[0].shipment?.consignee?.name;
          if (firstConsignee) {
            setSelectedConsignee(firstConsignee);
          }
        }
        
        console.log(`Carga inicial: ${batchInvoices.length} facturas cargadas`);
      } else {
        // Agregar a las facturas existentes
        const updatedInvoices = [...invoices, ...batchInvoices];
        setInvoices(updatedInvoices);
        setDisplayedInvoices(updatedInvoices);
        
        console.log(`Cargadas ${batchInvoices.length} facturas más. Total: ${updatedInvoices.length}`);
      }
      
      setCurrentPage(startPage + pagesToLoad);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // useEffect para carga inicial
  useEffect(() => {
    if (accessToken) {
      // Intentar cargar desde caché primero
      const cachedInvoices = localStorage.getItem('invoicesCache');
      const cachedTimestamp = localStorage.getItem('invoicesCacheTimestamp');
      
      if (cachedInvoices && cachedTimestamp) {
        const cacheAge = new Date().getTime() - parseInt(cachedTimestamp);
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
        
        if (cacheAge < CACHE_DURATION) {
          console.log('Cargando desde caché');
          const parsed = JSON.parse(cachedInvoices);
          setInvoices(parsed);
          setDisplayedInvoices(parsed);
          setCurrentPage(4); // Ya tenemos 3 páginas cacheadas
          
          // Seleccionar primer consignee
          if (parsed.length > 0) {
            const firstConsignee = parsed[0].billTo?.name || parsed[0].shipment?.consignee?.name;
            if (firstConsignee) {
              setSelectedConsignee(firstConsignee);
            }
          }
          
          setLoading(false);
          return;
        }
      }
      
      // Si no hay caché válido, cargar desde API
      fetchInvoices(true);
    }
  }, [accessToken]);

  // Cargar más facturas
  const loadMoreInvoices = () => {
    if (loadingMore || !hasMoreInvoices) return;
    fetchInvoices(false);
  };

  // Métricas de KPI
  const kpiMetrics = useMemo(() => {
    const metrics: {
      [key: string]: {
        total: number;
        paid: number;
        pending: number;
        overdue: number;
        count: number;
      }
    } = {};

    filteredInvoices.forEach(inv => {
      const currency = inv.currency?.abbr || 'USD';
      
      if (!metrics[currency]) {
        metrics[currency] = { total: 0, paid: 0, pending: 0, overdue: 0, count: 0 };
      }

      const totalAmount = inv.totalAmount?.value || 0;
      const balanceDue = inv.balanceDue?.value || 0;
      const isPaid = balanceDue === 0;
      const isOverdue = !isPaid && inv.dueDate && new Date(inv.dueDate) < new Date();

      metrics[currency].total += totalAmount;
      metrics[currency].count += 1;

      if (isPaid) {
        metrics[currency].paid += totalAmount;
      } else if (isOverdue) {
        metrics[currency].overdue += balanceDue;
        metrics[currency].pending += balanceDue;
      } else {
        metrics[currency].pending += balanceDue;
      }
    });

    return metrics;
  }, [filteredInvoices]);

  // Facturas vencidas
  const overdueInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => {
      const balanceDue = inv.balanceDue?.value || 0;
      const isPaid = balanceDue === 0;
      const isOverdue = !isPaid && inv.dueDate && new Date(inv.dueDate) < new Date();
      return isOverdue && inv.currency?.abbr === overdueCurrency;
    });
  }, [filteredInvoices, overdueCurrency]);

  // Datos para gráfico de desglose por servicio
  const serviceBreakdownData = useMemo(() => {
    const serviceMap: { [key: string]: number } = {};

    filteredInvoices.forEach(inv => {
      const charges = processCharges(inv.charges || []);
      charges.forEach(charge => {
        const description = charge.description || 'Otros';
        const amount = charge.amount || 0;
        serviceMap[description] = (serviceMap[description] || 0) + amount;
      });
    });

    // Definir colores para los servicios
    const chartColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];

    return Object.entries(serviceMap)
      .map(([name, value], index) => ({ 
        name, 
        value,
        color: chartColors[index % chartColors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredInvoices]);

  // Datos para gráfico de gastos mensuales por año
  const monthlyExpensesData = useMemo(() => {
    const dataByYearCurrency: {
      [key: string]: { // año-moneda como key
        [month: number]: number
      }
    } = {};

    filteredInvoices.forEach(inv => {
      if (!inv.date) return;
      
      const date = new Date(inv.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const currency = inv.currency?.abbr || 'USD';
      const total = inv.totalAmount?.value || 0;
      
      const key = `${year}-${currency}`;
      
      if (!dataByYearCurrency[key]) {
        dataByYearCurrency[key] = {};
      }
      
      dataByYearCurrency[key][month] = (dataByYearCurrency[key][month] || 0) + total;
    });

    // Convertir a formato para gráficos
    const result: {
      year: number;
      currency: string;
      data: Array<{ month: string; value: number }>
    }[] = [];

    Object.keys(dataByYearCurrency).forEach(key => {
      const [year, currency] = key.split('-');
      const monthData = dataByYearCurrency[key];
      
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const data = monthNames.map((name, idx) => ({
        month: name,
        value: monthData[idx + 1] || 0
      }));

      result.push({
        year: parseInt(year),
        currency,
        data
      });
    });

    return result;
  }, [filteredInvoices]);

  // Datos para comparativa de meses
  const comparativeData = useMemo(() => {
    const month1Data = {
      total: 0,
      count: 0,
      services: {} as { [key: string]: number },
      currency: {} as { [key: string]: number }
    };

    const month2Data = {
      total: 0,
      count: 0,
      services: {} as { [key: string]: number },
      currency: {} as { [key: string]: number }
    };

    filteredInvoices.forEach(inv => {
      if (!inv.date) return;
      
      const date = new Date(inv.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const total = inv.totalAmount?.value || 0;
      const currency = inv.currency?.abbr || 'USD';

      // Mes 1
      if (year === compareYear1 && month === compareMonth1) {
        month1Data.total += total;
        month1Data.count += 1;
        month1Data.currency[currency] = (month1Data.currency[currency] || 0) + total;
        
        const charges = processCharges(inv.charges || []);
        charges.forEach(charge => {
          const desc = charge.description || 'Otros';
          const amount = charge.amount || 0;
          month1Data.services[desc] = (month1Data.services[desc] || 0) + amount;
        });
      }

      // Mes 2 (si está seleccionado)
      if (compareYear2 && compareMonth2 && year === compareYear2 && month === compareMonth2) {
        month2Data.total += total;
        month2Data.count += 1;
        month2Data.currency[currency] = (month2Data.currency[currency] || 0) + total;
        
        const charges = processCharges(inv.charges || []);
        charges.forEach(charge => {
          const desc = charge.description || 'Otros';
          const amount = charge.amount || 0;
          month2Data.services[desc] = (month2Data.services[desc] || 0) + amount;
        });
      }
    });

    return { month1: month1Data, month2: month2Data };
  }, [filteredInvoices, compareMonth1, compareYear1, compareMonth2, compareYear2]);

  // Handlers para modales
  const openInvoiceModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
  };

  const closeShipmentModal = () => {
    setShowShipmentModal(false);
    setShipmentModalData(null);
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <>
      {/* Header */}
      <div style={{
        background: GRADIENTS.purple,
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
              📊 Reportería Administrativa
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Análisis general de facturas por consignee
            </p>
          </div>
          
          {/* Botón para abrir modal de comparativa */}
          <button
            onClick={() => setShowComparativeModal(true)}
            style={{
              backgroundColor: 'white',
              color: COLORS.primary,
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📈 Comparar Períodos
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h5 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
          🔍 Filtros de Análisis
        </h5>

        {/* Selector de modo */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#4b5563' }}>
            Modo de análisis:
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setFilterMode('individual')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `2px solid ${filterMode === 'individual' ? COLORS.primary : COLORS.border}`,
                backgroundColor: filterMode === 'individual' ? COLORS.primary : 'white',
                color: filterMode === 'individual' ? 'white' : '#4b5563',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              Análisis Individual
            </button>
            <button
              onClick={() => setFilterMode('comparison')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `2px solid ${filterMode === 'comparison' ? COLORS.primary : COLORS.border}`,
                backgroundColor: filterMode === 'comparison' ? COLORS.primary : 'white',
                color: filterMode === 'comparison' ? 'white' : '#4b5563',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              Comparativa de Consignees
            </button>
          </div>
        </div>

        {/* Filtros según el modo */}
        {filterMode === 'individual' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#4b5563' }}>
                Consignee:
              </label>
              <select
                value={selectedConsignee}
                onChange={(e) => setSelectedConsignee(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.border}`,
                  fontSize: '0.9rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Todos los consignees</option>
                {availableConsignees.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#4b5563' }}>
                Consignee 1:
              </label>
              <select
                value={consignee1}
                onChange={(e) => setConsignee1(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.border}`,
                  fontSize: '0.9rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Seleccionar...</option>
                {availableConsignees.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#4b5563' }}>
                Consignee 2:
              </label>
              <select
                value={consignee2}
                onChange={(e) => setConsignee2(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.border}`,
                  fontSize: '0.9rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Seleccionar...</option>
                {availableConsignees.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          backgroundColor: COLORS.cardBg,
          borderRadius: '12px'
        }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p style={{ marginTop: '16px', color: COLORS.textSecondary }}>
            Cargando facturas...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#991b1b', margin: 0, fontWeight: '500' }}>
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* Contenido principal */}
      {!loading && invoices.length > 0 && (
        <>
          {/* KPIs por moneda */}
          <div style={{ marginBottom: '24px' }}>
            <h5 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: '600', color: '#1f2937' }}>
              💰 Resumen Financiero
            </h5>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {Object.entries(kpiMetrics).map(([currency, data]) => (
                <div 
                  key={currency}
                  style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: `1px solid ${COLORS.border}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, fontWeight: '600', marginBottom: '4px' }}>
                        {currency}
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                        {formatCurrency(data.total, currency)}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: COLORS.tableHeaderBg,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: COLORS.textSecondary
                    }}>
                      {data.count} {data.count === 1 ? 'factura' : 'facturas'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: COLORS.textSecondary }}>
                        💚 Pagado:
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#059669' }}>
                        {formatCurrency(data.paid, currency)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: COLORS.textSecondary }}>
                        ⏳ Pendiente:
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#d97706' }}>
                        {formatCurrency(data.pending, currency)}
                      </span>
                    </div>
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: data.overdue > 0 ? 'pointer' : 'default'
                      }}
                      onClick={() => data.overdue > 0 && openOverdueModal(currency)}
                    >
                      <span style={{ fontSize: '0.85rem', color: COLORS.textSecondary }}>
                        🔴 Vencido:
                      </span>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: '600', 
                        color: '#dc2626',
                        textDecoration: data.overdue > 0 ? 'underline' : 'none'
                      }}>
                        {formatCurrency(data.overdue, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gráficos */}
          <div style={{ marginBottom: '24px' }}>
            <CollapsibleSection title="📊 Análisis de Gastos" defaultOpen={true} icon="📊">
              {/* Gráfico de Desglose por Servicio */}
              <div style={{ marginBottom: '32px' }}>
                <h6 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                  Desglose por Servicio (Top 10)
                </h6>
                {serviceBreakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={serviceBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: any) => {
                          const name = props?.name || 'Otros';
                          const percent = (props?.percent ?? 0) as number;
                          return `${name}: ${(percent * 100).toFixed(0)}%`;
                        }}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {serviceBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value, '$')} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary }}>
                    No hay datos de servicios disponibles
                  </div>
                )}
              </div>

              {/* Gráficos de Gastos Mensuales */}
              {monthlyExpensesData.length > 0 && (
                <div>
                  <h6 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                    Gastos Mensuales por Año y Moneda
                  </h6>
                  {monthlyExpensesData.map(({ year, currency, data }) => (
                    <div key={`${year}-${currency}`} style={{ marginBottom: '40px' }}>
                      <h6 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#4b5563', marginBottom: '12px' }}>
                        {year} - {currency}
                      </h6>
                      
                      {/* Gráfico de Barras */}
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '0.85rem', color: COLORS.textSecondary, marginBottom: '8px', fontWeight: '500' }}>
                          Vista de Barras
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                            <XAxis dataKey="month" stroke={COLORS.textSecondary} />
                            <YAxis stroke={COLORS.textSecondary} />
                            <Tooltip formatter={(value: any) => formatCurrency(value, currency)} />
                            <Legend />
                            <Bar dataKey="value" name="Monto" fill={COLORS.primary} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Gráfico de Líneas */}
                      <div>
                        <div style={{ fontSize: '0.85rem', color: COLORS.textSecondary, marginBottom: '8px', fontWeight: '500' }}>
                          Vista de Líneas
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                            <XAxis dataKey="month" stroke={COLORS.textSecondary} />
                            <YAxis stroke={COLORS.textSecondary} />
                            <Tooltip formatter={(value: any) => formatCurrency(value, currency)} />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              name="Monto" 
                              stroke={COLORS.secondary} 
                              strokeWidth={2}
                              dot={{ fill: COLORS.secondary, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>

          {/* Tabla de facturas */}
          <div style={{ marginBottom: '24px' }}>
            <CollapsibleSection title="📋 Listado de Facturas" defaultOpen={false} icon="📋">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: COLORS.tableHeaderBg, borderBottom: `2px solid ${COLORS.border}` }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', width: '10%' }}>Número</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', width: '12%' }}>Fecha</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', width: '18%', maxWidth: '200px' }}>Cliente</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', width: '12%' }}>Shipment</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', width: '12%' }}>Total</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', width: '12%' }}>Saldo</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', width: '10%' }}>Estado</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', width: '14%' }}>Acción</th>
                        </tr>
                    </thead>
                  <tbody>
                    {displayedInvoices.filter(inv => {
                      if (filterMode === 'individual' && selectedConsignee) {
                        return inv.billTo?.name === selectedConsignee || 
                               inv.shipment?.consignee?.name === selectedConsignee;
                      } else if (filterMode === 'comparison' && (consignee1 || consignee2)) {
                        const consigneeName = inv.billTo?.name || inv.shipment?.consignee?.name;
                        return consigneeName === consignee1 || consigneeName === consignee2;
                      }
                      return true;
                    }).map((inv, idx) => {
                      const balanceDue = inv.balanceDue?.value || 0;
                      const isPaid = balanceDue === 0;
                      const isOverdue = !isPaid && inv.dueDate && new Date(inv.dueDate) < new Date();
                      
                      return (
                        <tr 
                          key={`${inv.id}-${idx}`} 
                          style={{ 
                            borderBottom: '1px solid #f3f4f6',
                            backgroundColor: 'white',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1f2937' }}>
                            {inv.number || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                            {formatDate(inv.date)}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                            {inv.billTo?.name || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                            {inv.shipment?.number || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                            {formatCurrency(inv.totalAmount?.value || 0, inv.currency?.abbr || 'USD')}
                          </td>
                          <td style={{ 
                            padding: '12px 16px', 
                            textAlign: 'right', 
                            fontWeight: '600',
                            color: isPaid ? '#059669' : isOverdue ? '#dc2626' : '#d97706'
                          }}>
                            {formatCurrency(balanceDue, inv.currency?.abbr || 'USD')}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: isPaid ? '#d1fae5' : isOverdue ? '#fee2e2' : '#fef3c7',
                              color: isPaid ? '#065f46' : isOverdue ? '#991b1b' : '#92400e'
                            }}>
                              {isPaid ? '✓ Pagada' : isOverdue ? '⚠ Vencida' : '⏳ Pendiente'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => openInvoiceModal(inv)}
                              style={{
                                backgroundColor: COLORS.secondary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                              }}
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Botón Cargar Más */}
              {hasMoreInvoices && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    onClick={loadMoreInvoices}
                    disabled={loadingMore}
                    style={{
                      backgroundColor: loadingMore ? '#e5e7eb' : COLORS.primary,
                      color: loadingMore ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      cursor: loadingMore ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  >
                    {loadingMore ? 'Cargando...' : 'Cargar más facturas'}
                  </button>
                </div>
              )}
            </CollapsibleSection>
          </div>
        </>
      )}

      {/* Modal de Detalle de Factura */}
      {showInvoiceModal && selectedInvoice && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10000, overflowY: 'auto', animation: 'fadeIn 0.3s ease-in-out' }}
          onClick={closeInvoiceModal}
        >
          <div
            className="bg-white rounded"
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{
              background: GRADIENTS.purple,
              padding: '24px',
              color: 'white'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
                    Factura {selectedInvoice.number}
                  </h5>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    {formatDate(selectedInvoice.date)}
                  </div>
                </div>
                <button
                  onClick={closeInvoiceModal}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'white',
                    lineHeight: 1,
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Información General */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, fontWeight: '600', marginBottom: '4px' }}>
                    CLIENTE
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937' }}>
                    {selectedInvoice.billTo?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, fontWeight: '600', marginBottom: '4px' }}>
                    RUT
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937' }}>
                    {selectedInvoice.billTo?.identificationNumber || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, fontWeight: '600', marginBottom: '4px' }}>
                    VENCIMIENTO
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937' }}>
                    {formatDate(selectedInvoice.dueDate)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, fontWeight: '600', marginBottom: '4px' }}>
                    MONEDA
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937' }}>
                    {selectedInvoice.currency?.abbr || 'USD'}
                  </div>
                </div>
              </div>

              {/* Información del Shipment */}
              {selectedInvoice.shipment && (
                <div style={{
                  backgroundColor: COLORS.tableHeaderBg,
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '12px' }}>
                    📦 INFORMACIÓN DEL ENVÍO
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: '4px' }}>Número</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                        {selectedInvoice.shipment.number || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: '4px' }}>Consignee</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                        {selectedInvoice.shipment.consignee?.name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: '4px' }}>Origen</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                        {selectedInvoice.shipment.departure || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: '4px' }}>Destino</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                        {selectedInvoice.shipment.arrival || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detalle de Cargos */}
              {selectedInvoice.charges && selectedInvoice.charges.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '12px' }}>
                    💵 DETALLE DE CARGOS
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: COLORS.tableHeaderBg, borderBottom: `2px solid ${COLORS.border}` }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600' }}>Descripción</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>Cantidad</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>Tarifa</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processCharges(selectedInvoice.charges).map((charge, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', color: '#1f2937' }}>{charge.description || 'N/A'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#4b5563' }}>
                              {charge.quantity || 0} {charge.unit || ''}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4b5563' }}>
                              {formatCurrency(charge.rate || 0, selectedInvoice.currency?.abbr || 'USD', 3)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                              {formatCurrency(charge.amount || 0, selectedInvoice.currency?.abbr || 'USD')}
                            </td>
                          </tr>
                        ))}
                        
                        {/* Fila de TIPO DE CAMBIO */}
                        {selectedInvoice.totalAmount?.value && (
                          <tr style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                            <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', color: '#4b5563', fontSize: '0.8rem' }}>
                              TIPO DE CAMBIO:
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4b5563', fontSize: '0.8rem' }}>
                              {(() => {
                                const totalCharges = processCharges(selectedInvoice.charges).reduce(
                                  (sum, charge) => sum + (charge.amount || 0), 0
                                );
                                const exchangeRate = totalCharges > 0 
                                  ? (selectedInvoice.totalAmount?.value / totalCharges).toFixed(2)
                                  : 0;
                                return `${exchangeRate} CLP / ${selectedInvoice.currency?.abbr}`;
                              })()}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totales */}
              <div style={{
                backgroundColor: COLORS.tableHeaderBg,
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: COLORS.textSecondary }}>Subtotal:</span>
                    <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                      {formatCurrency(selectedInvoice.amount?.value || 0, 'CLP')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: COLORS.textSecondary }}>Impuestos:</span>
                    <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                      {formatCurrency(selectedInvoice.taxAmount?.value || 0, 'CLP')}
                    </span>
                  </div>
                  <div style={{ 
                    height: '1px', 
                    backgroundColor: COLORS.border,
                    margin: '4px 0'
                  }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>Total:</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: '700', color: COLORS.primary }}>
                      {formatCurrency(selectedInvoice.totalAmount?.value || 0, 'CLP')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Saldo Pendiente con diseño mejorado */}
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: (() => {
                  const balanceDue = selectedInvoice.balanceDue?.value || 0;
                  return balanceDue === 0 ? '#d1fae5' : '#fef3c7';
                })(),
                borderRadius: '8px',
                border: '2px solid ' + (() => {
                  const balanceDue = selectedInvoice.balanceDue?.value || 0;
                  return balanceDue === 0 ? '#10b981' : '#f59e0b';
                })()
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: (() => {
                      const balanceDue = selectedInvoice.balanceDue?.value || 0;
                      return balanceDue === 0 ? '#10b981' : '#f59e0b';
                    })()
                  }}>
                    Saldo Pendiente:
                  </span>
                  <span style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '700',
                    color: (() => {
                      const balanceDue = selectedInvoice.balanceDue?.value || 0;
                      return balanceDue === 0 ? '#10b981' : '#f59e0b';
                    })()
                  }}>
                    {(() => {
                      // Calculamos el tipo de cambio de divisa
                      if (selectedInvoice.charges && selectedInvoice.charges.length > 0 && selectedInvoice.totalAmount?.value) {
                        const totalCharges = selectedInvoice.charges.reduce(
                          (sum, charge) => sum + (charge.amount || 0), 0
                        );
                        
                        if (totalCharges > 0) {
                          // Calculamos el tipo de cambio con el factor de multiplicación por 2
                          const exchangeRate = selectedInvoice.totalAmount.value / totalCharges * 2;
                          
                          // Aplicamos el tipo de cambio al saldo pendiente
                          const convertedBalance = (selectedInvoice.balanceDue?.value || 0) * exchangeRate;
                          
                          return formatCurrency(convertedBalance, 'CLP');
                        }
                      }
                      
                      // Si no podemos calcular el tipo de cambio, mostramos el valor original
                      return formatCurrency(selectedInvoice.balanceDue?.value || 0, 'CLP');
                    })()}
                  </span>
                </div>
              </div>

              {/* Notas */}
              {selectedInvoice.notes && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '8px' }}>
                    📝 NOTAS
                  </div>
                  <div style={{ 
                    backgroundColor: COLORS.tableHeaderBg,
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    color: '#4b5563'
                  }}>
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div style={{ 
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <button 
                onClick={closeInvoiceModal}
                style={{
                  width: '100%',
                  background: GRADIENTS.purple,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Información del Shipment */}
      {showShipmentModal && shipmentModalData && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10000, overflowY: 'auto' }}
          onClick={closeShipmentModal}
        >
          <div
            className="bg-white rounded"
            style={{
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: shipmentModalData.type === 'air' ? GRADIENTS.blue : GRADIENTS.cyan,
                padding: '24px',
                color: 'white',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px'
              }}
            >
              <h5 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>
                {shipmentModalData.type === 'air' ? '✈️ Air Shipment' : '🚢 Ocean Shipment'}
              </h5>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              <div style={{
                textAlign: 'center',
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
                  {shipmentModalData.type === 'air' ? '✈️' : '🚢'}
                </div>
                <h6 style={{ color: '#1f2937', marginBottom: '8px' }}>
                  Información del Envío
                </h6>
                <p style={{ color: COLORS.textSecondary, fontSize: '0.9rem', marginBottom: '20px' }}>
                  Para ver los detalles completos de este envío, dirígete a la sección de{' '}
                  <strong>{shipmentModalData.type === 'air' ? 'Air Shipments' : 'Ocean Shipments'}</strong>{' '}
                  y busca el número: <strong>{shipmentModalData.number}</strong>
                </p>
                
                <div style={{
                  padding: '16px',
                  backgroundColor: COLORS.tableHeaderBg,
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, marginBottom: '4px' }}>
                    NÚMERO DE ENVÍO
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f2937' }}>
                    {shipmentModalData.number}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <button 
                onClick={closeShipmentModal}
                style={{
                  width: '100%',
                  background: shipmentModalData.type === 'air' 
                    ? GRADIENTS.blue
                    : GRADIENTS.cyan,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Facturas Vencidas por moneda */}
      {showOverdueModal && overdueCurrency && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10001, overflowY: 'auto', animation: 'fadeIn 0.3s ease-in-out' }}
          onClick={closeOverdueModal}
        >
          <div
            className="bg-white rounded"
            style={{
              maxWidth: '1000px',
              width: '100%',
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: GRADIENTS.danger,
                padding: '24px',
                color: 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
                    ⚠️ Facturas Vencidas – {overdueCurrency}
                  </h5>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    {overdueInvoices.length} {overdueInvoices.length === 1 ? 'factura' : 'facturas'} encontradas
                  </div>
                </div>
                <button
                  onClick={closeOverdueModal}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'white',
                    lineHeight: 1,
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {overdueInvoices.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280' }}>No hay facturas vencidas en {overdueCurrency}.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: COLORS.tableHeaderBg, borderBottom: `2px solid ${COLORS.border}` }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Número</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Fecha</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Vencimiento</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Shipment</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Saldo</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueInvoices
                        .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
                        .map((inv, idx) => (
                          <tr key={`${inv.id}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6', background: 'white' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1f2937' }}>{inv.number || '-'}</td>
                            <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                              {inv.date ? new Date(inv.date).toLocaleDateString('es-CL') : '-'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#b91c1c', fontWeight: 600 }}>
                              {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('es-CL') : '-'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#4b5563' }}>{inv.shipment?.number || '-'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#1f2937', fontWeight: 600 }}>
                              {formatCurrency(inv.totalAmount?.value || 0, inv.currency?.abbr || 'USD')}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>
                              {formatCurrency(inv.balanceDue?.value || 0, inv.currency?.abbr || 'USD')}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  openInvoiceModal(inv);
                                }}
                                style={{
                                  backgroundColor: COLORS.secondary,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 600
                                }}
                              >
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
              <button
                onClick={closeOverdueModal}
                style={{
                  width: '100%',
                  background: GRADIENTS.danger,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comparativa de Períodos */}
      {showComparativeModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10002, overflowY: 'auto' }}
          onClick={() => setShowComparativeModal(false)}
        >
          <div
            className="bg-white rounded"
            style={{
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: GRADIENTS.purple,
                padding: '24px',
                color: 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
                    📈 Comparativa de Períodos
                  </h5>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    Análisis comparativo entre diferentes períodos
                  </div>
                </div>
                <button
                  onClick={() => setShowComparativeModal(false)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'white',
                    lineHeight: 1,
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Filtros de Comparación */}
            <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                    Período 1 - Mes:
                  </label>
                  <select
                    value={compareMonth1}
                    onChange={(e) => setCompareMonth1(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '0.9rem'
                    }}
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                    Período 1 - Año:
                  </label>
                  <select
                    value={compareYear1}
                    onChange={(e) => setCompareYear1(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '0.9rem'
                    }}
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                    Período 2 - Mes:
                  </label>
                  <select
                    value={compareMonth2 || ''}
                    onChange={(e) => setCompareMonth2(e.target.value ? parseInt(e.target.value) : null)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">Sin comparar</option>
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                    Período 2 - Año:
                  </label>
                  <select
                    value={compareYear2 || ''}
                    onChange={(e) => setCompareYear2(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={!compareMonth2}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${COLORS.border}`,
                      fontSize: '0.9rem',
                      backgroundColor: !compareMonth2 ? '#f3f4f6' : 'white'
                    }}
                  >
                    <option value="">Seleccionar año</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contenido de Comparación */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Tabla comparativa */}
              <div style={{ marginBottom: '32px' }}>
                <h6 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                  📊 Resumen Comparativo
                </h6>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: COLORS.tableHeaderBg, borderBottom: `2px solid ${COLORS.border}` }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Métrica</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                          {monthNames[compareMonth1 - 1]} {compareYear1}
                        </th>
                        {compareMonth2 && compareYear2 && (
                          <>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                              {monthNames[compareMonth2 - 1]} {compareYear2}
                            </th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                              Diferencia
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Cantidad de facturas */}
                      <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', color: '#4b5563', fontWeight: '500' }}>Cantidad de Facturas</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                          {comparativeData.month1.count}
                        </td>
                        {compareMonth2 && compareYear2 && (
                          <>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                              {comparativeData.month2.count}
                            </td>
                            <td style={{ 
                              padding: '12px 16px', 
                              textAlign: 'right', 
                              fontWeight: '700',
                              color: comparativeData.month2.count > comparativeData.month1.count ? '#059669' : 
                                     comparativeData.month2.count < comparativeData.month1.count ? '#dc2626' : '#4b5563'
                            }}>
                              {comparativeData.month2.count > comparativeData.month1.count ? '+' : ''}
                              {comparativeData.month2.count - comparativeData.month1.count}
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Total por moneda */}
                      {Object.keys({...comparativeData.month1.currency, ...comparativeData.month2.currency}).map(currency => (
                        <tr key={currency} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', color: '#4b5563', fontWeight: '500' }}>Total {currency}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                            {formatCurrency(comparativeData.month1.currency[currency] || 0, currency)}
                          </td>
                          {compareMonth2 && compareYear2 && (
                            <>
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>
                                {formatCurrency(comparativeData.month2.currency[currency] || 0, currency)}
                              </td>
                              <td style={{ 
                                padding: '12px 16px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                color: (comparativeData.month2.currency[currency] || 0) > (comparativeData.month1.currency[currency] || 0) ? '#dc2626' : 
                                       (comparativeData.month2.currency[currency] || 0) < (comparativeData.month1.currency[currency] || 0) ? '#059669' : '#4b5563'
                              }}>
                                {formatCurrency(
                                  (comparativeData.month2.currency[currency] || 0) - (comparativeData.month1.currency[currency] || 0), 
                                  currency
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráfico comparativo de servicios */}
              {(Object.keys(comparativeData.month1.services).length > 0 || Object.keys(comparativeData.month2.services).length > 0) && (
                <div>
                  <h6 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                    📦 Desglose por Servicio
                  </h6>
                  
                  {/* Preparar datos para gráfico comparativo */}
                  {(() => {
                    const allServices = new Set([
                      ...Object.keys(comparativeData.month1.services),
                      ...Object.keys(comparativeData.month2.services)
                    ]);
                    
                    const chartData = Array.from(allServices).map(service => ({
                      name: service,
                      periodo1: comparativeData.month1.services[service] || 0,
                      periodo2: comparativeData.month2.services[service] || 0
                    })).sort((a, b) => (b.periodo1 + b.periodo2) - (a.periodo1 + a.periodo2)).slice(0, 10);

                    return (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                          <XAxis dataKey="name" stroke={COLORS.textSecondary} angle={-45} textAnchor="end" height={100} />
                          <YAxis stroke={COLORS.textSecondary} />
                          <Tooltip formatter={(value: any) => formatCurrency(value, '$')} />
                          <Legend />
                          <Bar 
                            dataKey="periodo1" 
                            name={`${monthNames[compareMonth1 - 1]} ${compareYear1}`} 
                            fill={COLORS.primary} 
                          />
                          {compareMonth2 && compareYear2 && (
                            <Bar 
                              dataKey="periodo2" 
                              name={`${monthNames[compareMonth2 - 1]} ${compareYear2}`} 
                              fill={COLORS.secondary} 
                            />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
              <button
                onClick={() => setShowComparativeModal(false)}
                style={{
                  width: '100%',
                  background: GRADIENTS.purple,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && invoices.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          backgroundColor: COLORS.cardBg,
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.5 }}>📊</div>
          <h5 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '1.2rem' }}>
            No hay facturas disponibles
          </h5>
          <p style={{ color: '#6b7280' }}>
            No se encontraron facturas para mostrar
          </p>
        </div>
      )}
    </>
  );
}

export default ReporteriaPersonalizable;