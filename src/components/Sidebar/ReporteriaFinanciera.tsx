import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const GRADIENTS = {
  purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  blue: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  cyan: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  pink: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  orange: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  green: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  red: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
};

// ============= ESTILOS =============
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
    cursor: 'pointer',
  },
  modalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
  },
  emptyState: {
    padding: '4rem 2rem',
    textAlign: 'center' as 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: '20px',
    border: `2px dashed ${COLORS.border}`,
  },
};

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
      border: '1px solid #e5e7eb',
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
          color: '#6b7280',
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

function ReporteriaFinanciera() {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [displayedInvoices, setDisplayedInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filterConsignee = user?.username || '';
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(true);
  const INVOICES_PER_BATCH = 300;
  
  // Filtros
  const [periodFilter, setPeriodFilter] = useState<'month' | '3months' | '6months' | 'year' | 'all'>('month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
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

  // Función para eliminar duplicados de charges sin modificar valores
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

  // Función para determinar el estado de la factura
  const getInvoiceStatus = (invoice: Invoice): 'paid' | 'pending' | 'overdue' => {
    const balanceDue = invoice.balanceDue?.value || 0;
    
    if (balanceDue === 0) return 'paid';
    
    if (invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) return 'overdue';
    }
    
    return 'pending';
  };

  // Función para determinar el tipo de servicio (Air o Ocean)
  const getServiceType = (shipmentNumber?: string): 'Air' | 'Ocean' | 'Unknown' => {
    if (!shipmentNumber) return 'Unknown';
    if (shipmentNumber.startsWith('SOG')) return 'Air';
    if (shipmentNumber.startsWith('HBLI')) return 'Ocean';
    return 'Unknown';
  };

  // Obtener facturas
  const fetchInvoices = async (resetData: boolean = true) => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }
    
    if (resetData) {
      setLoading(true);
      setCurrentPage(1);
      setInvoices([]);
      setHasMoreInvoices(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const startPage = resetData ? 1 : currentPage;
      const pagesToLoad = 3;
      let batchInvoices: Invoice[] = [];
      
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
      
      const filtered = batchInvoices.filter(inv => 
        inv.billTo?.name === filterConsignee || 
        inv.shipment?.consignee?.name === filterConsignee
      );
      
      if (resetData) {
        setInvoices(filtered);
        setDisplayedInvoices(filtered);
        
        localStorage.setItem('invoicesCache', JSON.stringify(filtered));
        localStorage.setItem('invoicesCacheTimestamp', new Date().getTime().toString());
        localStorage.setItem('invoicesCachePage', '3');
        
        console.log(`Carga inicial: ${filtered.length} facturas del consignee`);
      } else {
        const updatedInvoices = [...invoices, ...filtered];
        setInvoices(updatedInvoices);
        setDisplayedInvoices(updatedInvoices);
        
        console.log(`Cargadas ${filtered.length} facturas más. Total: ${updatedInvoices.length}`);
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

  // Cargar más facturas
  const loadMoreInvoices = () => {
    fetchInvoices(false);
  };

  useEffect(() => {
    if (!accessToken) {
      console.log('No hay token disponible todavía');
      return;
    }

    const cachedInvoices = localStorage.getItem('invoicesCache');
    const cacheTimestamp = localStorage.getItem('invoicesCacheTimestamp');
    const cachedPage = localStorage.getItem('invoicesCachePage');
    
    if (cachedInvoices && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      
      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedInvoices);
        setInvoices(parsed);
        setDisplayedInvoices(parsed);
        setCurrentPage(parseInt(cachedPage || '3') + 1);
        console.log('Cargando desde caché - datos guardados hace', Math.floor(cacheAge / 60000), 'minutos');
        return;
      }
    }
    
    fetchInvoices(true);
  }, [accessToken]);

  // Filtrar facturas por período
  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    switch (periodFilter) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return invoices;
    }
    
    return invoices.filter(inv => {
      if (!inv.date) return false;
      const invDate = new Date(inv.date);
      return invDate >= startDate;
    });
  }, [invoices, periodFilter]);

  const overdueInvoices = useMemo(() => {
    if (!overdueCurrency) return [];
    return filteredByPeriod.filter(
      (inv) =>
        getInvoiceStatus(inv) === 'overdue' &&
        (inv.currency?.abbr || 'USD') === overdueCurrency
    );
  }, [filteredByPeriod, overdueCurrency]);

  // Filtrar por estado
  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'all') return filteredByPeriod;
    
    return filteredByPeriod.filter(inv => {
      const status = getInvoiceStatus(inv);
      return status === statusFilter;
    });
  }, [filteredByPeriod, statusFilter]);

  useEffect(() => {
    setDisplayedInvoices(filteredByStatus);
  }, [filteredByStatus]);

  // Calcular métricas por moneda
  const metricsByCurrency = useMemo(() => {
    const currencies: { [key: string]: {
      totalBilled: number;
      totalPending: number;
      totalPaid: number;
      count: number;
      overdueCount: number;
    }} = {};
    
    filteredByPeriod.forEach(inv => {
      const currency = inv.currency?.abbr || 'USD';
      
      if (!currencies[currency]) {
        currencies[currency] = {
          totalBilled: 0,
          totalPending: 0,
          totalPaid: 0,
          count: 0,
          overdueCount: 0
        };
      }
      
      const total = inv.totalAmount?.value || 0;
      const balance = inv.balanceDue?.value || 0;
      const status = getInvoiceStatus(inv);
      
      currencies[currency].totalBilled += total;
      currencies[currency].totalPending += balance;
      currencies[currency].totalPaid += (total - balance);
      currencies[currency].count += 1;
      
      if (status === 'overdue') {
        currencies[currency].overdueCount += 1;
      }
    });
    
    return currencies;
  }, [filteredByPeriod]);

  // Datos para gráfico de gastos mensuales
  const monthlyData = useMemo(() => {
    const months: { [key: string]: { [currency: string]: number } } = {};
    
    filteredByPeriod.forEach(inv => {
      if (!inv.date) return;
      
      const date = new Date(inv.date);
      const monthKey = date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
      const currency = inv.currency?.abbr || 'USD';
      const amount = inv.totalAmount?.value || 0;
      
      if (!months[monthKey]) {
        months[monthKey] = {};
      }
      
      if (!months[monthKey][currency]) {
        months[monthKey][currency] = 0;
      }
      
      months[monthKey][currency] += amount;
    });
    
    return Object.entries(months).map(([month, curr]) => ({
      month,
      ...curr
    }));
  }, [filteredByPeriod]);

  // Datos para gráfico de desglose por servicio
  const serviceData = useMemo(() => {
    const services: { [key: string]: number } = {
      Air: 0,
      Ocean: 0,
      Unknown: 0
    };
    
    filteredByPeriod.forEach(inv => {
      const serviceType = getServiceType(inv.shipment?.number);
      const amount = inv.totalAmount?.value || 0;
      services[serviceType] += amount;
    });
    
    return [
      { name: 'Air Shipments', value: services.Air, color: COLORS.air },
      { name: 'Ocean Shipments', value: services.Ocean, color: COLORS.ocean },
      { name: 'Otros', value: services.Unknown, color: COLORS.textMuted }
    ].filter(item => item.value > 0);
  }, [filteredByPeriod]);

  // Top 5 envíos más costosos
  const topExpensiveShipments = useMemo(() => {
    return [...filteredByPeriod]
      .sort((a, b) => (b.totalAmount?.value || 0) - (a.totalAmount?.value || 0))
      .slice(0, 5);
  }, [filteredByPeriod]);

  const openInvoiceModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
  };

  const openShipmentModal = (shipmentNumber: string) => {
    const type = shipmentNumber.startsWith('SOG') ? 'air' : 'ocean';
    setShipmentModalData({ type, number: shipmentNumber });
    setShowShipmentModal(true);
  };

  const closeShipmentModal = () => {
    setShowShipmentModal(false);
    setShipmentModalData(null);
  };

  // Función para generar y descargar PDF del reporte
  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para descargar el PDF');
      return;
    }

    const periodLabel = {
      month: 'Último Mes',
      '3months': 'Últimos 3 Meses',
      '6months': 'Últimos 6 Meses',
      year: 'Último Año',
      all: 'Todo el Período'
    }[periodFilter];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte Financiero - ${user?.username}</title>
        <style>
          @media print {
            @page { margin: 1cm; }
            body { margin: 0; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 20px;
            color: #1f2937;
            line-height: 1.6;
          }
          .header {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 2rem;
          }
          .header p {
            margin: 0;
            opacity: 0.9;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .metric-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            background: white;
          }
          .metric-card h3 {
            font-size: 0.75rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 10px 0;
          }
          .metric-card .value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
          }
          .currency-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .currency-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            page-break-inside: avoid;
          }
          th {
            background-color: #f9fafb;
            padding: 12px;
            text-align: left;
            font-size: 0.75rem;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            border-bottom: 2px solid #e5e7eb;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 0.875rem;
          }
          .status-paid { color: #10b981; font-weight: 600; }
          .status-pending { color: #f59e0b; font-weight: 600; }
          .status-overdue { color: #ef4444; font-weight: 600; }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.875rem;
          }
          .print-button {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin: 20px 0;
          }
          @media print {
            .print-button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Reporte Financiero</h1>
          <p><strong>Cliente:</strong> ${user?.username || 'N/A'}</p>
          <p><strong>Período:</strong> ${periodLabel}</p>
          <p><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-CL', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <button class="print-button" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>

        ${Object.entries(metricsByCurrency).map(([currency, metrics]) => `
          <div class="currency-section">
            <h2 class="currency-title">💱 Resumen en ${currency}</h2>
            
            <div class="metrics">
              <div class="metric-card">
                <h3>Total Facturado</h3>
                <div class="value">${formatCurrency(metrics.totalBilled, currency)}</div>
                <p style="margin: 5px 0 0 0; font-size: 0.875rem; color: #6b7280;">${metrics.count} facturas</p>
              </div>
              <div class="metric-card">
                <h3>Pendiente de Pago</h3>
                <div class="value" style="color: #f59e0b;">${formatCurrency(metrics.totalPending, currency)}</div>
              </div>
              <div class="metric-card">
                <h3>Total Pagado</h3>
                <div class="value" style="color: #10b981;">${formatCurrency(metrics.totalPaid, currency)}</div>
              </div>
              <div class="metric-card">
                <h3>Facturas Vencidas</h3>
                <div class="value" style="color: #ef4444;">${metrics.overdueCount}</div>
              </div>
            </div>
          </div>
        `).join('')}

        <div style="margin-top: 40px;">
          <h2 style="font-size: 1.2rem; font-weight: 600; color: #1f2937; margin-bottom: 15px;">
            💰 Detalle de Facturas
          </h2>
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Shipment</th>
                <th style="text-align: right;">Total</th>
                <th style="text-align: right;">Saldo</th>
                <th style="text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${displayedInvoices.map(invoice => {
                const status = getInvoiceStatus(invoice);
                const statusClass = `status-${status}`;
                const statusLabel = {
                  paid: 'Pagada',
                  pending: 'Pendiente',
                  overdue: 'Vencida'
                }[status];
                
                return `
                  <tr>
                    <td><strong>${invoice.number || 'N/A'}</strong></td>
                    <td>${invoice.date ? new Date(invoice.date).toLocaleDateString('es-CL') : '-'}</td>
                    <td>${invoice.shipment?.number || '-'}</td>
                    <td style="text-align: right;">${formatCurrency(invoice.totalAmount?.value || 0, invoice.currency?.abbr || 'USD')}</td>
                    <td style="text-align: right;" class="${statusClass}">${formatCurrency(invoice.balanceDue?.value || 0, invoice.currency?.abbr || 'USD')}</td>
                    <td style="text-align: center;" class="${statusClass}">${statusLabel}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Reporte generado por el Sistema de Gestión de Envíos</p>
          <p>Total de facturas en este reporte: <strong>${displayedInvoices.length}</strong></p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

    // Estado de carga
  if (loading) {
    return (
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
    );
  }


  return (
    <div style={styles.container} className="container-fluid p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>
      
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Reportería Financiera</h1>
        <p style={styles.subtitle}>Control de gastos y análisis de facturas</p>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div 
          className="alert alert-danger" 
          style={{ 
            borderRadius: '12px', 
            border: 'none',
            backgroundColor: '#fee2e2',
            color: '#991b1b'
          }}
        >
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Dashboard */}
      {!loading && invoices.length > 0 && (
        <>
          {/* Gráficos */}
          <div className="row g-4 mb-4">
            {/* Gráfico de Gastos Mensuales */}
            <div className="col-12 col-lg-8">
              <div className="card" style={styles.chartCard}>
                <div className="card-body p-4">
                  <h5 style={styles.chartTitle}>📈 Gastos Mensuales</h5>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <defs>
                          {Object.keys(metricsByCurrency).map((currency, index) => (
                            <linearGradient key={currency} id={`color${currency}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.chart[index % COLORS.chart.length]} stopOpacity={0.9}/>
                              <stop offset="95%" stopColor={COLORS.chart[index % COLORS.chart.length]} stopOpacity={0.6}/>
                            </linearGradient>
                          ))}
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
                        <Legend wrapperStyle={{ fontSize: '0.875rem', fontWeight: '500' }} />
                        {Object.keys(metricsByCurrency).map((currency, index) => (
                          <Bar 
                            key={currency}
                            dataKey={currency} 
                            fill={`url(#color${currency})`}
                            name={currency}
                            radius={[8, 8, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico de Desglose por Servicio */}
            <div className="col-12 col-lg-4">
              <div className="card" style={styles.chartCard}>
                <div className="card-body p-4">
                  <h5 style={styles.chartTitle}>🛫 Desglose por Servicio</h5>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => `${entry.name}: ${((entry.percent as number) * 100).toFixed(0)}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {serviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
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

          {/* Tabla de Facturas */}
          <div className="card" style={styles.chartCard}>
            <div className="card-body p-0">
              <div style={{ 
                padding: '16px 20px',
                borderBottom: `1px solid ${COLORS.border}`,
                backgroundColor: '#f9fafb'
              }}>
                <h5 style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  color: COLORS.textPrimary, 
                  margin: 0
                }}>
                  💰 Facturas
                </h5>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#f9fafb',
                      borderBottom: `2px solid ${COLORS.border}`
                    }}>
                      <th style={{ 
                        padding: '16px 20px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        N° Factura
                      </th>
                      <th style={{ 
                        padding: '16px 20px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Fecha
                      </th>
                      <th style={{ 
                        padding: '16px 20px',
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Shipment
                      </th>
                      <th style={{ 
                        padding: '16px 20px',
                        textAlign: 'right',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Total
                      </th>
                      <th style={{ 
                        padding: '16px 20px',
                        textAlign: 'right',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Saldo
                      </th>
                      <th style={{ 
                        padding: '16px 20px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedInvoices.map((invoice, index) => {
                      const status = getInvoiceStatus(invoice);
                      const statusConfig = {
                        paid: { label: 'Pagada', color: '#10b981', bg: '#d1fae5' },
                        pending: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
                        overdue: { label: 'Vencida', color: '#ef4444', bg: '#fee2e2' }
                      };
                      const config = statusConfig[status];

                      return (
                        <tr 
                          key={invoice.id}
                          onClick={() => openInvoiceModal(invoice)}
                          style={{
                            borderBottom: index < displayedInvoices.length - 1 ? '1px solid #f3f4f6' : 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            backgroundColor: 'white'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                          }}
                        >
                          <td style={{ 
                            padding: '16px 20px',
                            fontWeight: '600',
                            color: '#1f2937'
                          }}>
                            {invoice.notes ? invoice.notes.split('@')[0] : ''}
                          </td>
                          <td style={{ 
                            padding: '16px 20px',
                            color: '#4b5563'
                          }}>
                            {invoice.date 
                              ? new Date(invoice.date).toLocaleDateString('es-CL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                              : '-'
                            }
                          </td>
                          <td style={{ 
                            padding: '16px 20px',
                            color: '#4b5563'
                          }}>
                            {invoice.shipment?.number ? (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openShipmentModal(invoice.shipment!.number!);
                                }}
                                style={{
                                  color: COLORS.air,
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                {invoice.shipment.number}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ 
                            padding: '16px 20px',
                            textAlign: 'right',
                            color: '#1f2937',
                            fontWeight: '600'
                          }}>
                            {formatCurrency(invoice.totalAmount?.value || 0, 'CLP')}
                          </td>
                          <td style={{
                            padding: '16px 20px',
                            textAlign: 'right',
                            color: status === 'paid' ? '#10b981' : '#f59e0b',
                            fontWeight: '700'
                          }}>
                            {(() => {
                              if (invoice.charges && invoice.charges.length > 0 && invoice.totalAmount?.value) {
                                const totalCharges = invoice.charges.reduce(
                                  (sum, charge) => sum + (charge.amount || 0), 0
                                );
                                
                                if (totalCharges > 0) {
                                  const exchangeRate = invoice.totalAmount.value / totalCharges * 2;
                                  const convertedBalance = (invoice.balanceDue?.value || 0) * exchangeRate;
                                  return formatCurrency(convertedBalance, 'CLP');
                                }
                              }
                              
                              return formatCurrency(invoice.balanceDue?.value || 0, 'CLP');
                            })()}
                          </td>
                          <td style={{ 
                            padding: '16px 20px',
                            textAlign: 'center'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: config.color,
                              backgroundColor: config.bg
                            }}>
                              {config.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer de la tabla */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#f9fafb',
                borderTop: `1px solid ${COLORS.border}`
              }}>
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ 
                    fontSize: '0.875rem',
                    color: COLORS.textSecondary
                  }}>
                    Mostrando <strong style={{ color: COLORS.textPrimary }}>{displayedInvoices.length}</strong> facturas
                  </div>
                  
                  {hasMoreInvoices && (
                    <button 
                      onClick={loadMoreInvoices}
                      disabled={loadingMore}
                      style={{
                        background: GRADIENTS.purple,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 20px',
                        cursor: loadingMore ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        opacity: loadingMore ? 0.6 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {loadingMore ? '⏳ Cargando más...' : '📥 Cargar 300 Facturas Más'}
                    </button>
                  )}
                  
                  {!hasMoreInvoices && invoices.length >= 300 && (
                    <div style={{ 
                      fontSize: '0.85rem',
                      color: '#10b981',
                      fontWeight: '600'
                    }}>
                      ✅ Todas las facturas cargadas
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px' }}>
              <div className="modal-header" style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '1.5rem' }}>
                <h5 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.textPrimary }}>
                  Filtros y Acciones
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowFilters(false)}
                  style={{ fontSize: '0.875rem' }}
                ></button>
              </div>
              <div className="modal-body p-4">
                {/* Acciones */}
                <div className="mb-4">
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '0.75rem' }}>
                    Acciones
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => { fetchInvoices(true); setShowFilters(false); }}
                      disabled={loading}
                      style={{
                        background: GRADIENTS.purple,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      {loading ? 'Cargando...' : '🔄 Actualizar'}
                    </button>

                    <button 
                      onClick={() => { generatePDF(); setShowFilters(false); }}
                      disabled={loading || invoices.length === 0}
                      style={{
                        background: GRADIENTS.green,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        cursor: (loading || invoices.length === 0) ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        opacity: (loading || invoices.length === 0) ? 0.6 : 1
                      }}
                    >
                      📥 Descargar PDF
                    </button>
                  </div>
                </div>

                {/* Período */}
                <div className="mb-4">
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '0.75rem' }}>
                    Período
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { value: 'month', label: 'Último Mes' },
                      { value: '3months', label: '3 Meses' },
                      { value: '6months', label: '6 Meses' },
                      { value: 'year', label: 'Año' },
                      { value: 'all', label: 'Todo' }
                    ].map(period => (
                      <button
                        key={period.value}
                        onClick={() => setPeriodFilter(period.value as any)}
                        style={{
                          backgroundColor: periodFilter === period.value ? COLORS.primary : 'white',
                          color: periodFilter === period.value ? 'white' : COLORS.textSecondary,
                          border: periodFilter === period.value ? 'none' : `1px solid ${COLORS.border}`,
                          borderRadius: '8px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estado */}
                <div className="mb-3">
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '0.75rem' }}>
                    Estado
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { value: 'all', label: 'Todas' },
                      { value: 'paid', label: 'Pagadas' },
                      { value: 'pending', label: 'Pendientes' },
                      { value: 'overdue', label: 'Vencidas' }
                    ].map(status => (
                      <button
                        key={status.value}
                        onClick={() => setStatusFilter(status.value as any)}
                        style={{
                          backgroundColor: statusFilter === status.value ? COLORS.primary : 'white',
                          color: statusFilter === status.value ? 'white' : COLORS.textSecondary,
                          border: statusFilter === status.value ? 'none' : `1px solid ${COLORS.border}`,
                          borderRadius: '8px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
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
                    width: '100%'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Factura */}
      {showInvoiceModal && selectedInvoice && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, overflowY: 'auto', animation: 'fadeIn 0.3s ease-in-out' }}
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
              flexDirection: 'column',
              borderRadius: '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{
              background: GRADIENTS.purple,
              padding: '24px',
              color: 'white',
              borderRadius: '20px 20px 0 0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
                    Factura {selectedInvoice.notes ? selectedInvoice.notes.split('@')[0] : '0'}
                  </h5>
                  {selectedInvoice.date && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      📅 {formatDate(selectedInvoice.date)}
                    </div>
                  )}
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
            <div style={{ 
              padding: '24px', 
              overflowY: 'auto', 
              flex: 1
            }}>
              {/* Información de la Factura */}
              <CollapsibleSection title="Información de la Factura" defaultOpen={true} icon="📄">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                      NÚMERO DE FACTURA
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: '600' }}>
                      {selectedInvoice.number}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                      FECHA DE EMISIÓN
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {formatDate(selectedInvoice.date)}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                      FECHA DE VENCIMIENTO
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {formatDate(selectedInvoice.dueDate)}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                      ESTADO
                    </div>
                    <div>
                      {(() => {
                        const status = getInvoiceStatus(selectedInvoice);
                        const statusConfig = {
                          paid: { label: 'Pagada', color: '#10b981', bg: '#d1fae5' },
                          pending: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
                          overdue: { label: 'Vencida', color: '#ef4444', bg: '#fee2e2' }
                        };
                        const config = statusConfig[status];
                        return (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: config.color,
                            backgroundColor: config.bg
                          }}>
                            {config.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Información del Envío */}
              {selectedInvoice.shipment && (
                <CollapsibleSection title="Información del Envío" defaultOpen={false} icon="📦">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                        NÚMERO DE ENVÍO
                      </div>
                      <div 
                        onClick={() => openShipmentModal(selectedInvoice.shipment!.number!)}
                        style={{
                          fontSize: '0.875rem',
                          color: COLORS.air,
                          fontWeight: '600',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {selectedInvoice.shipment.number}
                      </div>
                    </div>
                    {selectedInvoice.shipment.departure && (
                      <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                          ORIGEN
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                          {selectedInvoice.shipment.departure}
                        </div>
                      </div>
                    )}
                    {selectedInvoice.shipment.arrival && (
                      <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                          DESTINO
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                          {selectedInvoice.shipment.arrival}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {/* Cargos */}
              {selectedInvoice.charges && selectedInvoice.charges.length > 0 && (
                <CollapsibleSection title={`Cargos (${processCharges(selectedInvoice.charges).length})`} defaultOpen={false} icon="💵">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%',
                      fontSize: '0.8rem',
                      borderCollapse: 'collapse'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.7rem' }}>Descripción</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontSize: '0.7rem' }}>Cantidad</th>
                          <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.7rem' }}>Tarifa</th>
                          <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.7rem' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processCharges(selectedInvoice.charges).map((charge, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px' }}>{charge.description || '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{charge.quantity || '-'} {charge.unit || ''}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {charge.rate !== undefined ? formatCurrency(charge.rate, selectedInvoice.currency?.abbr || 'USD', 2) : '-'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>
                              {charge.amount !== undefined ? formatCurrency(charge.amount, selectedInvoice.currency?.abbr || 'USD', 2) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}

              {/* Totales */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.875rem' }}>Subtotal:</span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>
                    {formatCurrency(selectedInvoice.amount?.value || 0, selectedInvoice.currency?.abbr || 'USD')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#6b7280', fontSize: '0.875rem' }}>Impuestos:</span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>
                    {formatCurrency(selectedInvoice.taxAmount?.value || 0, selectedInvoice.currency?.abbr || 'USD')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #e5e7eb' }}>
                  <span style={{ fontWeight: '700', color: '#1f2937', fontSize: '1rem' }}>Total:</span>
                  <span style={{ fontWeight: '700', color: '#1f2937', fontSize: '1rem' }}>
                    {formatCurrency(selectedInvoice.totalAmount?.value || 0, selectedInvoice.currency?.abbr || 'USD')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: '700', color: '#f59e0b', fontSize: '1rem' }}>Saldo Pendiente:</span>
                  <span style={{ fontWeight: '700', color: '#f59e0b', fontSize: '1rem' }}>
                    {formatCurrency(selectedInvoice.balanceDue?.value || 0, selectedInvoice.currency?.abbr || 'USD')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div style={{ 
              padding: '16px 24px',
              borderTop: `1px solid ${COLORS.border}`,
              backgroundColor: '#f9fafb',
              borderRadius: '0 0 20px 20px'
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

      {/* Modal de Envío */}
      {showShipmentModal && shipmentModalData && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10000, overflowY: 'auto', animation: 'fadeIn 0.3s ease-in-out' }}
          onClick={closeShipmentModal}
        >
          <div
            className="bg-white rounded"
            style={{
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              borderRadius: '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: shipmentModalData.type === 'air' ? GRADIENTS.blue : GRADIENTS.cyan,
              padding: '24px',
              color: 'white',
              borderRadius: '20px 20px 0 0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
                    {shipmentModalData.type === 'air' ? '✈️ Envío Aéreo' : '🚢 Envío Marítimo'}
                  </h5>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    Información no disponible en esta vista
                  </div>
                </div>
                <button
                  onClick={closeShipmentModal}
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
            <div style={{ padding: '24px' }}>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Para ver los detalles completos de este envío, dirígete a la sección de{' '}
                <strong>{shipmentModalData.type === 'air' ? 'Air Shipments' : 'Ocean Shipments'}</strong>{' '}
                y busca el número: <strong>{shipmentModalData.number}</strong>
              </p>
              
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                  NÚMERO DE ENVÍO
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f2937' }}>
                  {shipmentModalData.number}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              borderRadius: '0 0 20px 20px'
            }}>
              <button 
                onClick={closeShipmentModal}
                style={{
                  width: '100%',
                  background: shipmentModalData.type === 'air' ? GRADIENTS.blue : GRADIENTS.cyan,
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
              flexDirection: 'column',
              borderRadius: '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: GRADIENTS.red,
                padding: '24px',
                color: 'white',
                borderRadius: '20px 20px 0 0'
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
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
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
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderRadius: '0 0 20px 20px' }}>
              <button
                onClick={closeOverdueModal}
                style={{
                  width: '100%',
                  background: GRADIENTS.red,
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
        <div style={styles.emptyState}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📊</div>
          <h5 style={{ 
            color: COLORS.textPrimary, 
            fontWeight: '600', 
            marginBottom: '0.75rem' 
          }}>
            No hay facturas disponibles
          </h5>
          <p style={{ color: COLORS.textSecondary, marginBottom: 0 }}>
            No se encontraron facturas para tu cuenta
          </p>
        </div>
      )}
    </div>
  );
}

export default ReporteriaFinanciera;