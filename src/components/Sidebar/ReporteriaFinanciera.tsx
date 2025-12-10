import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

function ReporteriaFinanciera() {
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
  
  // Filtros
  const [periodFilter, setPeriodFilter] = useState<'month' | '3months' | '6months' | 'year' | 'all'>('month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  
  // Modales
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentModalData, setShipmentModalData] = useState<ShipmentModalData | null>(null);
  // Modal de facturas vencidas por moneda
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
    // protecciones básicas
    const numeric = Number.isFinite(value) ? value : 0;

    // solo redondear si decimals es 0
    const amount = decimals === 0 ? Math.round(numeric) : numeric;

    // formatear con los decimales especificados
    const formatted = new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);

    // si currency es el símbolo '$', no duplicar
    if (currency === '$') {
      return `$${formatted}`;
    }

    // ejemplo: "CLP $520.212" o "USD $0.780" con decimales
    return `${currency} $${formatted}`;
  };

  // Función para eliminar duplicados de charges sin modificar valores
  const processCharges = (charges: any[]) => {
    if (!charges || charges.length === 0) return [];
    
    // Eliminar duplicados basándose en descripción, cantidad, rate y amount
    const uniqueCharges: any[] = [];
    const seenCharges = new Set<string>();
    
    charges.forEach(charge => {
      // Crear una key única para cada charge
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

  // Obtener facturas usando el nuevo endpoint con ConsigneeName
  const fetchInvoices = async (page: number = 1, append: boolean = false) => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }
    
    if (!user?.username) {
      setError('No se pudo obtener el nombre de usuario');
      return;
    }
    
    // Si es la primera página, mostrar loading completo
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      // Construir URL con query parameters
      const queryParams = new URLSearchParams({
        ConsigneeName: user.username,
        Page: page.toString(),
        ItemsPerPage: '50',
        SortBy: 'newest'
      });
      
      const response = await fetch(`https://api.linbis.com/invoices?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido o expirado. Obtén un nuevo token desde Postman.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const invoicesArray: Invoice[] = Array.isArray(data) ? data : [];
      
      // Ordenar las facturas por date (más nueva primero)
      const sortedInvoices = invoicesArray.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB.getTime() - dateA.getTime(); // Descendente (más nueva primero)
      });
      
      // Si recibimos menos de 50 facturas, no hay más páginas
      setHasMoreInvoices(invoicesArray.length === 50);
      
      if (append && page > 1) {
        // Agregar las nuevas facturas a las existentes y re-ordenar todo
        const combined = [...invoices, ...sortedInvoices];
        const resorted = combined.sort((a, b) => {
          const dateA = a.date ? new Date(a.date) : new Date(0);
          const dateB = b.date ? new Date(b.date) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setInvoices(resorted);
        setDisplayedInvoices(resorted);
        
        // Guardar en caché con el username del usuario
        const cacheKey = `invoicesCache_${user.username}`;
        localStorage.setItem(cacheKey, JSON.stringify(resorted));
        localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      } else {
        // Primera carga: reemplazar todo
        setInvoices(sortedInvoices);
        setDisplayedInvoices(sortedInvoices);
        
        // Guardar en caché con el username del usuario
        const cacheKey = `invoicesCache_${user.username}`;
        localStorage.setItem(cacheKey, JSON.stringify(sortedInvoices));
        localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      }
      
      console.log(`Página ${page}: ${invoicesArray.length} facturas cargadas`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Cargar más facturas (paginación)
  const loadMoreInvoices = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchInvoices(nextPage, true);
  };

  useEffect(() => {
    if (!accessToken) {
      console.log('No hay token disponible todavía');
      return;
    }

    if (!user?.username) {
      console.log('No hay usuario disponible todavía');
      return;
    }
    
    // Intentar cargar desde caché primero
    const cacheKey = `invoicesCache_${user.username}`;
    const cachedInvoices = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);
    
    if (cachedInvoices && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000; // 1 hora en milisegundos
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      
      if (cacheAge < oneHour) {
        // El caché es válido (menos de 1 hora)
        const parsed = JSON.parse(cachedInvoices);
        setInvoices(parsed);
        setDisplayedInvoices(parsed);
        
        // Restaurar la página actual
        if (cachedPage) {
          setCurrentPage(parseInt(cachedPage));
        }
        
        // Verificar si hay más facturas disponibles
        const lastPageSize = parsed.length % 50;
        setHasMoreInvoices(lastPageSize === 0 && parsed.length >= 50);
        
        setLoading(false);
        console.log('✅ Cargando desde caché - datos guardados hace', Math.floor(cacheAge / 60000), 'minutos');
        console.log(`💰 ${parsed.length} facturas en caché`);
        return;
      } else {
        // El caché expiró, limpiarlo
        console.log('🗑️ Caché expirado, limpiando...');
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
        localStorage.removeItem(`${cacheKey}_page`);
      }
    }
    
    // No hay caché válido, cargar desde la API
    setCurrentPage(1);
    fetchInvoices(1, false);
  }, [accessToken, user?.username]);

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
      { name: 'Otros', value: services.Unknown, color: COLORS.neutralGrey }
    ].filter(item => item.value > 0);
  }, [filteredByPeriod]);

  // Top 5 envíos más costosos
  const topExpensiveShipments = useMemo(() => {
    return [...filteredByPeriod]
      .sort((a, b) => (b.totalAmount?.value || 0) - (a.totalAmount?.value || 0))
      .slice(0, 5);
  }, [filteredByPeriod]);

  // Función para refrescar datos (limpiar caché y recargar)
  const refreshInvoices = () => {
    if (!user?.username) return;
    
    // Limpiar caché del usuario actual
    const cacheKey = `invoicesCache_${user.username}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    localStorage.removeItem(`${cacheKey}_page`);
    
    // Recargar desde la API
    setCurrentPage(1);
    setInvoices([]);
    setDisplayedInvoices([]);
    fetchInvoices(1, false);
    
    console.log('🔄 Datos refrescados desde la API');
  };

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

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      {/* Header */}
      <div style={{
        background: GRADIENTS.purple,
        padding: '24px 20px',
        marginBottom: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h4 style={{ 
          color: 'white', 
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: '8px'
        }}>
          Reportes Financieros
        </h4>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          margin: 0,
          fontSize: '0.9rem'
        }}>
          Control de gastos y análisis de facturas
        </p>
      </div>

      {/* Filtros */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button 
          onClick={refreshInvoices}
          disabled={loading}
          style={{
            backgroundColor: COLORS.secondary,
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
          onClick={generatePDF}
          disabled={loading || invoices.length === 0}
          style={{
            backgroundColor: COLORS.success,
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
          📥 Descargar Reporte PDF
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: COLORS.textSecondary, fontWeight: '600' }}>Período:</span>
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
                backgroundColor: periodFilter === period.value ? COLORS.secondary : COLORS.cardBg,
                color: periodFilter === period.value ? 'white' : COLORS.textSecondary,
                border: periodFilter === period.value ? 'none' : `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}
            >
              {period.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: COLORS.textSecondary, fontWeight: '600' }}>Estado:</span>
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
                backgroundColor: statusFilter === status.value ? '#8b5cf6' : 'white',
                color: statusFilter === status.value ? 'white' : COLORS.textSecondary,
                border: statusFilter === status.value ? 'none' : '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: COLORS.cardBg,
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
          <p style={{ color: COLORS.textSecondary, fontSize: '1rem' }}>Cargando facturas...</p>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div style={{ 
          padding: '16px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fecaca'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Dashboard */}
      {!loading && invoices.length > 0 && (
        <>
          {/* Gráficos */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            {/* Gráfico de Gastos Mensuales */}
            <div style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h6 style={{ 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                color: '#1f2937', 
                marginBottom: '16px' 
              }}>
                📈 Gastos Mensuales
              </h6>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" style={{ fontSize: '0.75rem' }} />
                  <YAxis style={{ fontSize: '0.75rem' }} />
                  <Tooltip />
                  <Legend />
                  {Object.keys(metricsByCurrency).map((currency, index) => (
                    <Bar 
                      key={currency}
                      dataKey={currency} 
                      fill={COLORS.chart[index % COLORS.chart.length]}
                      name={currency}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Desglose por Servicio */}
            <div style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h6 style={{ 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                color: '#1f2937', 
                marginBottom: '16px' 
              }}>
                🛫 Desglose por Servicio
              </h6>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${((entry.percent as number) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, 'USD')} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de Facturas */}
          <div style={{
            backgroundColor: COLORS.cardBg,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h5 style={{ 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#1f2937', 
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
                    backgroundColor: COLORS.tableHeaderBg,
                    borderBottom: `2px solid ${COLORS.border}`
                  }}>
                    <th style={{ 
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: COLORS.neutralDark,
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
                      color: COLORS.neutralDark,
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
                      color: COLORS.neutralDark,
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
                      color: COLORS.neutralDark,
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
                      color: COLORS.neutralDark,
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
                      color: COLORS.neutralDark,
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
                                color: '#3b82f6',
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
                            // Calculamos el tipo de cambio usando la misma lógica que en la vista detallada
                            if (invoice.charges && invoice.charges.length > 0 && invoice.totalAmount?.value) {
                              const totalCharges = invoice.charges.reduce(
                                (sum, charge) => sum + (charge.amount || 0), 0
                              );
                              
                              if (totalCharges > 0) {
                                // Calculamos el tipo de cambio
                                const exchangeRate = invoice.totalAmount.value / totalCharges * 2;
                                
                                // Aplicamos el tipo de cambio al saldo pendiente
                                const convertedBalance = (invoice.balanceDue?.value || 0) * exchangeRate;
                                
                                return formatCurrency(convertedBalance, 'CLP');
                              }
                            }
                            
                            // Si no podemos calcular el tipo de cambio, mostramos el valor original
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
              backgroundColor: COLORS.tableHeaderBg,
              borderTop: '1px solid #e5e7eb'
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
                  color: '#6b7280'
                }}>
                  Mostrando <strong style={{ color: '#1f2937' }}>{displayedInvoices.length}</strong> facturas
                  {!hasMoreInvoices && <span> (todas cargadas)</span>}
                </div>
                
                {hasMoreInvoices && !loadingMore && (
                  <button 
                    onClick={loadMoreInvoices}
                    disabled={loadingMore}
                    style={{
                      backgroundColor: COLORS.secondary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 20px',
                      cursor: loadingMore ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      opacity: loadingMore ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    💰 Cargar Más Facturas
                  </button>
                )}
                
                {loadingMore && (
                  <div style={{ 
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    fontWeight: '600'
                  }}>
                    ⏳ Cargando más facturas...
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
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
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '4px' }}>
                      NÚMERO DE FACTURA
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: '600' }}>
                      {selectedInvoice.number}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '4px' }}>
                      FECHA DE EMISIÓN
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {formatDate(selectedInvoice.date)}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '4px' }}>
                      FECHA DE VENCIMIENTO
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {formatDate(selectedInvoice.dueDate)}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '4px' }}>
                      MONEDA
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {selectedInvoice.currency?.name || 'N/A'} ({selectedInvoice.currency?.abbr || 'USD'})
                    </div>
                  </div>
                  {selectedInvoice.shipment?.number && (
                    <div style={{ flex: '1 1 100%' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: COLORS.textSecondary, marginBottom: '4px' }}>
                        SHIPMENT ASOCIADO
                      </div>
                      <span
                        onClick={() => openShipmentModal(selectedInvoice.shipment!.number!)}
                        style={{
                          fontSize: '0.875rem',
                          color: '#3b82f6',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        {selectedInvoice.shipment.number}
                      </span>
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              {/* Detalles de Cobros */}
              {selectedInvoice.charges && selectedInvoice.charges.length > 0 && (
                <CollapsibleSection title="Detalles de Cobros" defaultOpen={true} icon="📋">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                          <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.7rem', color: '#6b7280' }}>DESCRIPCIÓN</th>
                          <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.7rem', color: '#6b7280' }}>CANTIDAD</th>
                          <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.7rem', color: '#6b7280' }}>TARIFA ({selectedInvoice.currency?.abbr})</th>
                          <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.7rem', color: '#6b7280' }}>MONTO ({selectedInvoice.currency?.abbr})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processCharges(selectedInvoice.charges).map((charge, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px', color: '#1f2937' }}>{charge.description}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#4b5563' }}>
                              {charge.quantity} {charge.unit}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#4b5563' }}>
                              {formatCurrency(charge.rate || 0, selectedInvoice.currency?.abbr, 3)}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#1f2937', fontWeight: '600' }}>
                              {formatCurrency(charge.amount || 0, selectedInvoice.currency?.abbr)}
                            </td>
                          </tr>
                        ))}
                        {/* Fila de total */}
                        <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                          <td colSpan={3} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#1f2937' }}>
                            TOTAL:
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#1f2937', fontSize: '0.95rem' }}>
                            {formatCurrency(
                              processCharges(selectedInvoice.charges).reduce((sum, charge) => sum + (charge.amount || 0), 0),
                              selectedInvoice.currency?.abbr
                            )}
                          </td>
                        </tr>
                        
                        {/* Fila de conversión de divisa */}
                        {selectedInvoice.totalAmount?.value && (
                          <tr style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                            <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right', color: '#4b5563', fontSize: '0.8rem' }}>
                              TIPO DE CAMBIO:
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', color: '#4b5563', fontSize: '0.8rem' }}>
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
                </CollapsibleSection>
              )}

              {/* Totales */}
              <CollapsibleSection title="Resumen de Totales" defaultOpen={true} icon="💰">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: COLORS.tableHeaderBg, borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Subtotal:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                      {formatCurrency(selectedInvoice.amount?.value || 0, 'CLP')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: COLORS.tableHeaderBg, borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>IVA:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                      {formatCurrency(selectedInvoice.taxAmount?.value || 0, 'CLP')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: COLORS.secondary, borderRadius: '8px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>Total:</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'white' }}>
                      {formatCurrency(selectedInvoice.totalAmount?.value || 0, 'CLP')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: getInvoiceStatus(selectedInvoice) === 'paid' ? '#d1fae5' : '#fef3c7', borderRadius: '8px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '600', color: getInvoiceStatus(selectedInvoice) === 'paid' ? '#10b981' : '#f59e0b' }}>Saldo Pendiente:</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: getInvoiceStatus(selectedInvoice) === 'paid' ? '#10b981' : '#f59e0b' }}>
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
              </CollapsibleSection>
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

      {/* Indicador de carga de más facturas */}
      {loadingMore && (
        <div style={{ 
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: COLORS.secondary,
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
            Cargando más facturas...
          </span>
        </div>
      )}

      {/* Modal de Shipment (Air o Ocean) */}
      {showShipmentModal && shipmentModalData && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10000, overflowY: 'auto', animation: 'fadeIn 0.3s ease-in-out' }}
          onClick={closeShipmentModal}
        >
          <div 
            className="bg-white rounded"
            style={{ 
              maxWidth: '700px', 
              width: '100%', 
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: shipmentModalData.type === 'air' 
                ? GRADIENTS.blue
                : GRADIENTS.cyan,
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
                    {shipmentModalData.type === 'air' ? '✈️' : '🚢'} {shipmentModalData.type === 'air' ? 'Air' : 'Ocean'} Shipment
                  </h5>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    {shipmentModalData.number}
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
            <div style={{ 
              padding: '24px', 
              overflowY: 'auto', 
              flex: 1,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>
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
            No se encontraron facturas para tu cuenta
          </p>
        </div>
      )}
    </>
  );
}

export default ReporteriaFinanciera;