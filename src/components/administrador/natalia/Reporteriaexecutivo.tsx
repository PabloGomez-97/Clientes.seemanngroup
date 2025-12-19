// src/components/administrador/natalia/reportExecutive.tsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';

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

interface Quote {
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
  chargeDetails?: any[];
}

interface QuoteStats {
  totalQuotes: number;
  completedQuotes: number;
  pendingQuotes: number;
  airQuotes: number;
  seaQuotes: number;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  profitMargin: number;
  averagePerQuote: number;
  completionRate: number;
  uniqueConsignees: number;
}

interface ExecutiveComparison {
  nombre: string;
  stats: QuoteStats;
}

type TabType = 'individual' | 'comparativa' | 'doble';
type SortField = 'nombre' | 'totalQuotes' | 'completedQuotes' | 'completionRate' | 'airQuotes' | 'seaQuotes' | 'totalIncome' | 'totalExpense' | 'totalProfit' | 'profitMargin' | 'averagePerQuote' | 'uniqueConsignees';
type SortDirection = 'asc' | 'desc';

function ReportExecutive() {
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
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Estados para Análisis Comparativa
  const [compStartDate, setCompStartDate] = useState<string>('');
  const [compEndDate, setCompEndDate] = useState<string>('');
  const [comparativeData, setComparativeData] = useState<ExecutiveComparison[]>([]);
  const [loadingComparative, setLoadingComparative] = useState(false);
  const [errorComparative, setErrorComparative] = useState<string | null>(null);
  const [hasSearchedComparative, setHasSearchedComparative] = useState(false);
  const [sortField, setSortField] = useState<SortField>('totalProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Estados para Análisis Doble
  const [ejecutivo1, setEjecutivo1] = useState<string>('');
  const [ejecutivo2, setEjecutivo2] = useState<string>('');
  const [doubleStartDate, setDoubleStartDate] = useState<string>('');
  const [doubleEndDate, setDoubleEndDate] = useState<string>('');
  const [doubleData, setDoubleData] = useState<ExecutiveComparison[]>([]);
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

  // Función para calcular estadísticas de un array de quotes
  const calculateStats = (quotesArray: Quote[]): QuoteStats => {
    const totalQuotes = quotesArray.length;
    const completedQuotes = quotesArray.filter(q => q.status === 'Completed').length;
    const airQuotes = quotesArray.filter(q => q.modeOfTransportation === '40 - Air').length;
    const seaQuotes = quotesArray.filter(q => 
      q.modeOfTransportation === '11 - Vessel, Containerized' || 
      q.modeOfTransportation === '10 - Vessel'
    ).length;
    const totalIncome = quotesArray.reduce((sum, q) => sum + (q.totalIncome || 0), 0);
    const totalExpense = quotesArray.reduce((sum, q) => sum + (q.totalExpense || 0), 0);
    const totalProfit = quotesArray.reduce((sum, q) => sum + (q.profit || 0), 0);
    
    // Calcular consignees únicos
    const uniqueConsigneesSet = new Set(
      quotesArray
        .map(q => q.consignee?.trim())
        .filter(c => c && c.length > 0)
    );
    const uniqueConsignees = uniqueConsigneesSet.size;

    return {
      totalQuotes,
      completedQuotes,
      pendingQuotes: totalQuotes - completedQuotes,
      airQuotes,
      seaQuotes,
      totalIncome,
      totalExpense,
      totalProfit,
      profitMargin: totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0,
      averagePerQuote: totalQuotes > 0 ? totalIncome / totalQuotes : 0,
      completionRate: totalQuotes > 0 ? (completedQuotes / totalQuotes) * 100 : 0,
      uniqueConsignees
    };
  };

  // Fetch para análisis individual
  const fetchQuotes = async () => {
    if (!selectedEjecutivo) {
      setError('Debes seleccionar un ejecutivo');
      return;
    }

    const cacheKey = `quotesExecutive_${selectedEjecutivo}_${startDate}_${endDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < 5 * 60 * 1000) {
        setQuotes(JSON.parse(cached));
        setHasSearched(true);
        setError(null);
        console.log('📦 Datos individuales cargados desde caché');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const params = new URLSearchParams({ SalesRepName: selectedEjecutivo });
      if (startDate) params.append('StartDate', startDate);
      if (endDate) params.append('EndDate', endDate);

      const response = await fetch(`https://api.linbis.com/Quotes/filter?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Token inválido o expirado');
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const quotesArray: Quote[] = Array.isArray(data) ? data : [];
      const sortedQuotes = quotesArray.sort((a, b) => 
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      );

      setQuotes(sortedQuotes);
      localStorage.setItem(cacheKey, JSON.stringify(sortedQuotes));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Fetch para análisis comparativa
  const fetchComparativeData = async () => {
    const cacheKey = `quotesComparative_${compStartDate}_${compEndDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < 5 * 60 * 1000) {
        setComparativeData(JSON.parse(cached));
        setHasSearchedComparative(true);
        setErrorComparative(null);
        console.log('📦 Datos comparativos cargados desde caché');
        return;
      }
    }

    try {
      setLoadingComparative(true);
      setErrorComparative(null);
      setHasSearchedComparative(true);

      const comparisons: ExecutiveComparison[] = [];

      for (const ejecutivo of ejecutivos) {
        const params = new URLSearchParams({ SalesRepName: ejecutivo.nombre });
        if (compStartDate) params.append('StartDate', compStartDate);
        if (compEndDate) params.append('EndDate', compEndDate);

        const response = await fetch(`https://api.linbis.com/Quotes/filter?${params}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const quotesArray: Quote[] = Array.isArray(data) ? data : [];
          comparisons.push({
            nombre: ejecutivo.nombre,
            stats: calculateStats(quotesArray)
          });
        }
      }

      setComparativeData(comparisons);
      localStorage.setItem(cacheKey, JSON.stringify(comparisons));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

    } catch (err) {
      setErrorComparative(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoadingComparative(false);
    }
  };

  // Fetch para análisis doble
  const fetchDoubleComparison = async () => {
    if (!ejecutivo1 || !ejecutivo2) {
      setErrorDouble('Debes seleccionar dos ejecutivos');
      return;
    }

    const cacheKey = `quotesDouble_${ejecutivo1}_${ejecutivo2}_${doubleStartDate}_${doubleEndDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < 5 * 60 * 1000) {
        setDoubleData(JSON.parse(cached));
        setHasSearchedDouble(true);
        setErrorDouble(null);
        console.log('📦 Comparación doble cargada desde caché');
        return;
      }
    }

    try {
      setLoadingDouble(true);
      setErrorDouble(null);
      setHasSearchedDouble(true);

      const comparisons: ExecutiveComparison[] = [];

      for (const ejeName of [ejecutivo1, ejecutivo2]) {
        const params = new URLSearchParams({ SalesRepName: ejeName });
        if (doubleStartDate) params.append('StartDate', doubleStartDate);
        if (doubleEndDate) params.append('EndDate', doubleEndDate);

        const response = await fetch(`https://api.linbis.com/Quotes/filter?${params}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const quotesArray: Quote[] = Array.isArray(data) ? data : [];
          comparisons.push({
            nombre: ejeName,
            stats: calculateStats(quotesArray)
          });
        }
      }

      setDoubleData(comparisons);
      localStorage.setItem(cacheKey, JSON.stringify(comparisons));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

    } catch (err) {
      setErrorDouble(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoadingDouble(false);
    }
  };

  // Función de ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Datos ordenados para tabla comparativa
  const sortedComparativeData = [...comparativeData].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    if (sortField === 'nombre') {
      aVal = a.nombre;
      bVal = b.nombre;
    } else {
      aVal = a.stats[sortField];
      bVal = b.stats[sortField];
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' 
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // Calcular totales globales para comparativa
  const globalStats = comparativeData.reduce((acc, exec) => ({
    totalQuotes: acc.totalQuotes + exec.stats.totalQuotes,
    totalIncome: acc.totalIncome + exec.stats.totalIncome,
    totalExpense: acc.totalExpense + exec.stats.totalExpense,
    totalProfit: acc.totalProfit + exec.stats.totalProfit
  }), { totalQuotes: 0, totalIncome: 0, totalExpense: 0, totalProfit: 0 });

  // Stats para análisis individual
  const stats = calculateStats(quotes);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Reportería de Ejecutivos
          </h2>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            margin: 0
          }}>
            Bienvenida {user?.nombreuser}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('individual')}
            style={{
              flex: 1,
              padding: '16px 24px',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              backgroundColor: activeTab === 'individual' ? '#eff6ff' : 'transparent',
              color: activeTab === 'individual' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'individual' ? '3px solid #2563eb' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📊 Análisis Individual
          </button>
          <button
            onClick={() => setActiveTab('comparativa')}
            style={{
              flex: 1,
              padding: '16px 24px',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              backgroundColor: activeTab === 'comparativa' ? '#eff6ff' : 'transparent',
              color: activeTab === 'comparativa' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'comparativa' ? '3px solid #2563eb' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📈 Análisis Comparativa
          </button>
          <button
            onClick={() => setActiveTab('doble')}
            style={{
              flex: 1,
              padding: '16px 24px',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              backgroundColor: activeTab === 'doble' ? '#eff6ff' : 'transparent',
              color: activeTab === 'doble' ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === 'doble' ? '3px solid #2563eb' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🔄 Análisis Doble
          </button>
        </div>
      </div>

      {/* CONTENIDO: ANÁLISIS INDIVIDUAL */}
      {activeTab === 'individual' && (
        <>
          {/* Filtros Individual */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h4 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px'
            }}>
              Filtros de Búsqueda
            </h4>

            <div className="row g-3">
              <div className="col-md-4">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Ejecutivo *
                </label>
                <select
                  className="form-select"
                  value={selectedEjecutivo}
                  onChange={(e) => setSelectedEjecutivo(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                >
                  <option value="">Seleccionar ejecutivo...</option>
                  {ejecutivos.map(ej => (
                    <option key={ej.id} value={ej.nombre}>{ej.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Fecha Desde
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                />
              </div>

              <div className="col-md-3">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                />
              </div>

              <div className="col-md-2">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'transparent', marginBottom: '8px' }}>-</label>
                <button
                  className="btn btn-primary w-100"
                  onClick={fetchQuotes}
                  disabled={loading || !selectedEjecutivo}
                  style={{ fontSize: '14px', fontWeight: '600', height: '38px' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Buscando...
                    </>
                  ) : (
                    '🔍 Buscar'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* KPIs Individual */}
          {hasSearched && !loading && (
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Total Cotizaciones
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
                    {stats.totalQuotes}
                  </div>
                  <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '500' }}>
                    ✓ {stats.completedQuotes} Completadas
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Por Tipo
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{stats.airQuotes}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>✈️ Aéreas</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#0ea5e9' }}>{stats.seaQuotes}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>🚢 Marítimas</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Income Total
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                    {formatCurrency(stats.totalIncome)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                    Expense: {formatCurrency(stats.totalExpense)}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Profit Total
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6', marginBottom: '4px' }}>
                    {formatCurrency(stats.totalProfit)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                    Margen: {stats.profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Promedio por Cotización
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>
                    {stats.totalQuotes > 0 ? formatCurrency(stats.averagePerQuote) : '$0'}
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Tasa de Completado
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: stats.totalQuotes > 0 ? '#10b981' : '#6b7280' }}>
                    {stats.completionRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Profit Promedio
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#8b5cf6' }}>
                    {stats.totalQuotes > 0 ? formatCurrency(stats.totalProfit / stats.totalQuotes) : '$0'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Individual */}
          {error && (
            <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '24px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Mensaje: No hay resultados Individual */}
          {hasSearched && !loading && quotes.length === 0 && !error && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#fef3c7', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="32" height="32" fill="#f59e0b" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0, fontWeight: '500' }}>
                No se encontraron resultados para las fechas seleccionadas
              </p>
            </div>
          )}

          {/* Tabla Individual */}
          {hasSearched && !loading && quotes.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  Detalle de Cotizaciones ({quotes.length})
                </h4>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                <table className="table table-hover mb-0" style={{ fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Número</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Fecha</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Estado</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Tipo</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Shipper</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Consignee</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Origen</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Destino</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'right' }}>Income</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'right' }}>Expense</th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'right' }}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#3b82f6' }}>{quote.number}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(quote.date)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: quote.status === 'Completed' ? '#d1fae5' : '#fef3c7',
                            color: quote.status === 'Completed' ? '#065f46' : '#92400e'
                          }}>
                            {quote.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                          {quote.modeOfTransportation === '40 - Air' ? '✈️ Aéreo' : 
                           quote.modeOfTransportation === '11 - Vessel, Containerized' || quote.modeOfTransportation === '10 - Vessel' ? '🚢 Marítimo' :
                           quote.modeOfTransportation}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#1f2937', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quote.shipper}</td>
                        <td style={{ padding: '12px 16px', color: '#1f2937', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quote.consignee}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{quote.origin}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{quote.destination}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>{formatCurrency(quote.totalIncome)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>{formatCurrency(quote.totalExpense)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#8b5cf6', fontWeight: '700' }}>{formatCurrency(quote.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensaje inicial Individual */}
          {!hasSearched && !loading && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="32" height="32" fill="#2563eb" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Selecciona un ejecutivo para comenzar
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Filtra por ejecutivo y rango de fechas para ver la reportería completa
              </p>
            </div>
          )}
        </>
      )}

      {/* CONTENIDO: ANÁLISIS COMPARATIVA */}
      {activeTab === 'comparativa' && (
        <>
          {/* Filtros Comparativa */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
              Filtros de Búsqueda
            </h4>

            <div className="row g-3">
              <div className="col-md-4">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Fecha Desde
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={compStartDate}
                  onChange={(e) => setCompStartDate(e.target.value)}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                />
              </div>

              <div className="col-md-4">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={compEndDate}
                  onChange={(e) => setCompEndDate(e.target.value)}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                />
              </div>

              <div className="col-md-4">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'transparent', marginBottom: '8px' }}>-</label>
                <button
                  className="btn btn-primary w-100"
                  onClick={fetchComparativeData}
                  disabled={loadingComparative}
                  style={{ fontSize: '14px', fontWeight: '600', height: '38px' }}
                >
                  {loadingComparative ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Cargando...
                    </>
                  ) : (
                    '🔍 Cargar Comparativa'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* KPIs Globales Comparativa */}
          {hasSearchedComparative && !loadingComparative && comparativeData.length > 0 && (
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Total Cotizaciones
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
                    {globalStats.totalQuotes}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Total Income
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>
                    {formatCurrency(globalStats.totalIncome)}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Total Expense
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>
                    {formatCurrency(globalStats.totalExpense)}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Total Profit
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6' }}>
                    {formatCurrency(globalStats.totalProfit)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Comparativa */}
          {errorComparative && (
            <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '24px' }}>
              <strong>Error:</strong> {errorComparative}
            </div>
          )}

          {/* Tabla Comparativa */}
          {hasSearchedComparative && !loadingComparative && sortedComparativeData.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  Comparativa de Ejecutivos ({sortedComparativeData.length})
                </h4>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table table-hover mb-0" style={{ fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('nombre')}>
                        Ejecutivo <SortIcon field="nombre" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('totalQuotes')}>
                        Total <SortIcon field="totalQuotes" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('uniqueConsignees')}>
                        👥 Clientes <SortIcon field="uniqueConsignees" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('completedQuotes')}>
                        Completadas <SortIcon field="completedQuotes" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('completionRate')}>
                        % Compl. <SortIcon field="completionRate" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('airQuotes')}>
                        ✈️ Aéreas <SortIcon field="airQuotes" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('seaQuotes')}>
                        🚢 Marít. <SortIcon field="seaQuotes" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('totalIncome')}>
                        Income <SortIcon field="totalIncome" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('totalExpense')}>
                        Expense <SortIcon field="totalExpense" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('totalProfit')}>
                        Profit <SortIcon field="totalProfit" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('profitMargin')}>
                        Margen % <SortIcon field="profitMargin" />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('averagePerQuote')}>
                        Prom/Quote <SortIcon field="averagePerQuote" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedComparativeData.map((exec, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1f2937' }}>{exec.nombre}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151', fontWeight: '600' }}>{exec.stats.totalQuotes}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#f59e0b', fontWeight: '600' }}>{exec.stats.uniqueConsignees}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#10b981', fontWeight: '600' }}>{exec.stats.completedQuotes}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>{exec.stats.completionRate.toFixed(1)}%</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#3b82f6', fontWeight: '600' }}>{exec.stats.airQuotes}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#0ea5e9', fontWeight: '600' }}>{exec.stats.seaQuotes}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>{formatCurrency(exec.stats.totalIncome)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>{formatCurrency(exec.stats.totalExpense)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#8b5cf6', fontWeight: '700' }}>{formatCurrency(exec.stats.totalProfit)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>{exec.stats.profitMargin.toFixed(1)}%</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>{formatCurrency(exec.stats.averagePerQuote)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensaje inicial Comparativa */}
          {!hasSearchedComparative && !loadingComparative && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="32" height="32" fill="#2563eb" viewBox="0 0 16 16">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Carga la comparativa de ejecutivos
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Filtra por rango de fechas para comparar el desempeño de todos los ejecutivos
              </p>
            </div>
          )}
        </>
      )}

      {/* CONTENIDO: ANÁLISIS DOBLE */}
      {activeTab === 'doble' && (
        <>
          {/* Filtros Doble */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
              Comparar Dos Ejecutivos
            </h4>

            <div className="row g-3">
              <div className="col-md-3">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Ejecutivo 1 *
                </label>
                <select
                  className="form-select"
                  value={ejecutivo1}
                  onChange={(e) => setEjecutivo1(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                >
                  <option value="">Seleccionar...</option>
                  {ejecutivos.map(ej => (
                    <option key={ej.id} value={ej.nombre}>{ej.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Ejecutivo 2 *
                </label>
                <select
                  className="form-select"
                  value={ejecutivo2}
                  onChange={(e) => setEjecutivo2(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                >
                  <option value="">Seleccionar...</option>
                  {ejecutivos.filter(e => e.nombre !== ejecutivo1).map(ej => (
                    <option key={ej.id} value={ej.nombre}>{ej.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Fecha Desde
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={doubleStartDate}
                  onChange={(e) => setDoubleStartDate(e.target.value)}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                />
              </div>

              <div className="col-md-2">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={doubleEndDate}
                  onChange={(e) => setDoubleEndDate(e.target.value)}
                  style={{ fontSize: '14px', borderColor: '#d1d5db' }}
                />
              </div>

              <div className="col-md-2">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'transparent', marginBottom: '8px' }}>-</label>
                <button
                  className="btn btn-primary w-100"
                  onClick={fetchDoubleComparison}
                  disabled={loadingDouble || !ejecutivo1 || !ejecutivo2}
                  style={{ fontSize: '14px', fontWeight: '600', height: '38px' }}
                >
                  {loadingDouble ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Comparando...
                    </>
                  ) : (
                    '🔍 Comparar'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Doble */}
          {errorDouble && (
            <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '24px' }}>
              <strong>Error:</strong> {errorDouble}
            </div>
          )}

          {/* Comparación Doble */}
          {hasSearchedDouble && !loadingDouble && doubleData.length === 2 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  Comparación: {doubleData[0].nombre} vs {doubleData[1].nombre}
                </h4>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table table-hover mb-0" style={{ fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>
                        Ejecutivo
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                        Total
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                        Completadas
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                        % Compl.
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                        ✈️ Aéreas
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                        🚢 Marít.
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                        👥 Clientes
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'right' }}>
                        Income
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'right' }}>
                        Expense
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'right' }}>
                        Profit
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                        Margen %
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151', textAlign: 'right' }}>
                        Prom/Quote
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {doubleData.map((exec, idx) => (
                      <tr key={idx} style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: idx === 0 ? '#eff6ff' : '#fef3c7'
                      }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: idx === 0 ? '#1e40af' : '#92400e', fontSize: '14px' }}>
                          {exec.nombre}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151', fontWeight: '600' }}>
                          {exec.stats.totalQuotes}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#10b981', fontWeight: '600' }}>
                          {exec.stats.completedQuotes}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>
                          {exec.stats.completionRate.toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#3b82f6', fontWeight: '600' }}>
                          {exec.stats.airQuotes}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#0ea5e9', fontWeight: '600' }}>
                          {exec.stats.seaQuotes}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#f59e0b', fontWeight: '600' }}>
                          {exec.stats.uniqueConsignees}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>
                          {formatCurrency(exec.stats.totalIncome)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>
                          {formatCurrency(exec.stats.totalExpense)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#8b5cf6', fontWeight: '700' }}>
                          {formatCurrency(exec.stats.totalProfit)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280' }}>
                          {exec.stats.profitMargin.toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>
                          {formatCurrency(exec.stats.averagePerQuote)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensaje inicial Doble */}
          {!hasSearchedDouble && !loadingDouble && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="32" height="32" fill="#2563eb" viewBox="0 0 16 16">
                  <path d="M8 1a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a6 6 0 1 1 12 0v6a2.5 2.5 0 0 1-2.5 2.5H9.366a1 1 0 0 1-.866.5h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 .866.5H11.5A1.5 1.5 0 0 0 13 12h-1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V6a5 5 0 0 0-5-5z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Selecciona dos ejecutivos para comparar
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Compara el desempeño entre dos ejecutivos específicos
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReportExecutive;