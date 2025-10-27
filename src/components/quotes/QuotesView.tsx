import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface Quote {
  id?: string | number;
  number?: string;
  date?: string;
  time?: string;
  validUntil_Date?: string;
  validUntil_Time?: string;
  transitDays?: number;
  customerReference?: string;
  issuingCompany?: string;
  contact?: string;
  contactAddress?: string;
  carrierBroker?: string;
  portOfReceipt?: string;
  shipper?: string;
  shipperAddress?: string;
  pickupFrom?: string;
  pickupFromAddress?: string;
  salesRep?: string;
  origin?: string;
  deperture_Date?: string;
  deperture_Time?: string;
  consignee?: string;
  consigneeAddress?: string;
  destination?: string;
  arrival_Date?: string;
  arrival_Time?: string;
  notes?: string;
  totalCargo_Pieces?: number;
  totalCargo_Container?: number;
  totalCargo_WeightDisplayValue?: string;
  totalCargo_VolumeDisplayValue?: string;
  totalCargo_VolumeWeightDisplayValue?: string;
  totalCharge_IncomeDisplayValue?: string;
  totalCharge_ExpenseDisplayValue?: string;
  totalCharge_ProfitDisplayValue?: string;
  paymentType?: string;
  hazardous?: string;
  currentFlow?: string;
  cargoStatus?: string;
  modeOfTransportation?: string;
  [key: string]: any;
}

// Componente para la Ruta de Envío (visible siempre)
function RouteDisplay({ quote }: { quote: Quote }) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '20px' }}>
      <h6 style={{ margin: 0, color: '#1f2937', fontSize: '0.9rem', fontWeight: '600', marginBottom: '16px' }}>
        🚚 Ruta de Envío
      </h6>
      
      {/* Origen → Destino Principal */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '2px solid #3b82f6'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '0.7rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px'
          }}>
            Origen
          </div>
          <div style={{ 
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            {quote.origin || 'N/A'}
          </div>
          {quote.deperture_Date && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              📅 {formatDate(quote.deperture_Date)}
            </div>
          )}
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: '1.5rem',
            color: '#3b82f6'
          }}>
            →
          </div>
          {quote.transitDays && (
            <div style={{ 
              fontSize: '0.7rem',
              fontWeight: '600',
              color: '#3b82f6',
              backgroundColor: '#dbeafe',
              padding: '2px 8px',
              borderRadius: '12px',
              whiteSpace: 'nowrap'
            }}>
              {quote.transitDays} días
            </div>
          )}
        </div>
        
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ 
            fontSize: '0.7rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px'
          }}>
            Destino
          </div>
          <div style={{ 
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            {quote.destination || 'N/A'}
          </div>
          {quote.arrival_Date && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              📅 {formatDate(quote.arrival_Date)}
            </div>
          )}
        </div>
      </div>

      {/* Detalles adicionales de la ruta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {quote.portOfReceipt && (
          <div style={{ 
            padding: '12px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>
              Puerto de Recepción
            </div>
            <div style={{ fontSize: '0.85rem', color: '#1f2937' }}>
              {quote.portOfReceipt}
            </div>
          </div>
        )}
        
        {quote.pickupFrom && (
          <div style={{ 
            padding: '12px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>
              Pickup Desde
            </div>
            <div style={{ fontSize: '0.85rem', color: '#1f2937' }}>
              {quote.pickupFrom}
            </div>
            {quote.pickupFromAddress && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                {quote.pickupFromAddress}
              </div>
            )}
          </div>
        )}
        
        {quote.shipper && (
          <div style={{ 
            padding: '12px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            gridColumn: 'span 2'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>
              Remitente (Shipper)
            </div>
            <div style={{ fontSize: '0.85rem', color: '#1f2937', fontWeight: '600' }}>
              {quote.shipper}
            </div>
            {quote.shipperAddress && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                {quote.shipperAddress}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
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

// Componente para mostrar un campo
function InfoField({ label, value, fullWidth = false }: { label: string; value: any; fullWidth?: boolean }) {
  if (value === null || value === undefined || value === '' || value === 'N/A') return null;
  
  return (
    <div style={{ 
      marginBottom: '12px',
      flex: fullWidth ? '1 1 100%' : '1 1 48%',
      minWidth: fullWidth ? '100%' : '200px'
    }}>
      <div style={{ 
        fontSize: '0.7rem',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px'
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '0.875rem',
        color: '#1f2937',
        wordBreak: 'break-word'
      }}>
        {String(value)}
      </div>
    </div>
  );
}

function QuotesView() {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [displayedQuotes, setDisplayedQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterConsignee = user?.username || '';
  
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  const [searchDate, setSearchDate] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [showingAll, setShowingAll] = useState(false);

  // Función para formatear precios en CLP
  const formatCLP = (priceString?: string) => {
    if (!priceString) return null;
    
    // Extraer solo los números del string
    const numberMatch = priceString.match(/[\d.,]+/);
    if (!numberMatch) return priceString;
    
    // Convertir a número, manejando tanto puntos como comas
    const cleanNumber = numberMatch[0].replace(/,/g, '');
    const number = parseFloat(cleanNumber);
    
    if (isNaN(number)) return priceString;
    
    // Formatear con separadores de miles
    const formatted = new Intl.NumberFormat('es-CL').format(number);
    
    return `$${formatted} CLP`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  const fetchQuotes = async () => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://api.linbis.com/Quotes', {
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
      const quotesArray: Quote[] = Array.isArray(data) ? data : [];
      
      const filtered = quotesArray.filter(q => q.consignee === filterConsignee);
      
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setQuotes(sorted);
      
      localStorage.setItem('quotesCache', JSON.stringify(sorted));
      localStorage.setItem('quotesCacheTimestamp', new Date().getTime().toString());
      
      setDisplayedQuotes(sorted.slice(0, 20));
      setShowingAll(false);
      
      console.log(`${quotesArray.length} cotizaciones totales, ${filtered.length} del consignee, mostrando las 20 más recientes`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      console.log('No hay token disponible todavía');
      return;
    }

    const cachedQuotes = localStorage.getItem('quotesCache');
    const cacheTimestamp = localStorage.getItem('quotesCacheTimestamp');
    
    if (cachedQuotes && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      
      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedQuotes);
        setQuotes(parsed);
        setDisplayedQuotes(parsed.slice(0, 20));
        setShowingAll(false);
        console.log('Cargando desde caché - datos guardados hace', Math.floor(cacheAge / 60000), 'minutos');
        return;
      }
    }
    
    fetchQuotes();
  }, [accessToken]);

  // Obtener orígenes y destinos únicos
  const uniqueOrigins = useMemo(() => {
    const origins = quotes
      .map(q => q.origin)
      .filter(o => o && o !== 'N/A')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return origins;
  }, [quotes]);

  const uniqueDestinations = useMemo(() => {
    const destinations = quotes
      .map(q => q.destination)
      .filter(d => d && d !== 'N/A')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return destinations;
  }, [quotes]);

  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedQuotes(quotes.slice(0, 20));
      setShowingAll(false);
      return;
    }

    const searchTerm = searchNumber.trim().toLowerCase();
    const results = quotes.filter(quote => {
      const number = (quote.number || '').toString().toLowerCase();
      return number.includes(searchTerm);
    });

    setDisplayedQuotes(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedQuotes(quotes.slice(0, 20));
      setShowingAll(false);
      return;
    }

    const results = quotes.filter(quote => {
      if (!quote.date) return false;
      const quoteDate = new Date(quote.date).toISOString().split('T')[0];
      return quoteDate === searchDate;
    });

    setDisplayedQuotes(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDateRange = () => {
    if (!searchStartDate && !searchEndDate) {
      setDisplayedQuotes(quotes.slice(0, 20));
      setShowingAll(false);
      return;
    }

    const results = quotes.filter(quote => {
      if (!quote.date) return false;
      const quoteDate = new Date(quote.date);
      
      if (searchStartDate && searchEndDate) {
        const start = new Date(searchStartDate);
        const end = new Date(searchEndDate);
        end.setHours(23, 59, 59, 999);
        return quoteDate >= start && quoteDate <= end;
      } else if (searchStartDate) {
        return quoteDate >= new Date(searchStartDate);
      } else if (searchEndDate) {
        const end = new Date(searchEndDate);
        end.setHours(23, 59, 59, 999);
        return quoteDate <= end;
      }
      return false;
    });

    setDisplayedQuotes(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByRoute = () => {
    if (!searchOrigin && !searchDestination) {
      setDisplayedQuotes(quotes.slice(0, 20));
      setShowingAll(false);
      return;
    }

    const results = quotes.filter(quote => {
      const matchOrigin = !searchOrigin || quote.origin === searchOrigin;
      const matchDestination = !searchDestination || quote.destination === searchDestination;
      return matchOrigin && matchDestination;
    });

    setDisplayedQuotes(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const clearSearch = () => {
    setSearchNumber('');
    setSearchDate('');
    setSearchStartDate('');
    setSearchEndDate('');
    setSearchOrigin('');
    setSearchDestination('');
    setDisplayedQuotes(quotes.slice(0, 20));
    setShowingAll(false);
  };

  const showAllQuotes = () => {
    setDisplayedQuotes(quotes);
    setShowingAll(true);
  };

  const openModal = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedQuote(null);
  };

  const openSearchModal = () => {
    setShowSearchModal(true);
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
  };

  return (
    <>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          Mis Cotizaciones
        </h4>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          margin: 0,
          fontSize: '0.9rem'
        }}>
          Consulta y gestiona tus cotizaciones de envío
        </p>
      </div>

      {/* Botones de acción */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={fetchQuotes}
          disabled={loading}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
          }}
        >
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>

        <button 
          onClick={openSearchModal}
          style={{
            backgroundColor: 'white',
            color: '#3b82f6',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '10px 20px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          🔍 Buscar
        </button>

        {!showingAll && quotes.length > 20 && (
          <button 
            onClick={showAllQuotes}
            style={{
              backgroundColor: 'white',
              color: '#10b981',
              border: '2px solid #10b981',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            📋 Ver Todas ({quotes.length})
          </button>
        )}

        {showingAll && (
          <button 
            onClick={clearSearch}
            style={{
              backgroundColor: 'white',
              color: '#6b7280',
              border: '2px solid #6b7280',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            ✖ Limpiar Filtros
          </button>
        )}
      </div>

      {/* Modal de Búsqueda */}
      {showSearchModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999 }}
          onClick={closeSearchModal}
        >
          <div 
            className="bg-white rounded p-4"
            style={{ maxWidth: '500px', width: '90%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 style={{ marginBottom: '20px', color: '#1f2937' }}>Buscar Cotizaciones</h5>
            
            {/* Búsqueda por Número */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                Por Número
              </label>
              <input 
                type="text"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Ingresa el número de cotización"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}
              />
              <button 
                onClick={handleSearchByNumber}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Buscar por Número
              </button>
            </div>

            {/* Búsqueda por Ruta */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                Por Ruta
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">Origen</option>
                  {uniqueOrigins.map(origin => (
                    <option key={origin} value={origin}>{origin}</option>
                  ))}
                </select>
                <select
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">Destino</option>
                  {uniqueDestinations.map(destination => (
                    <option key={destination} value={destination}>{destination}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleSearchByRoute}
                style={{
                  width: '100%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Buscar por Ruta
              </button>
            </div>

            {/* Búsqueda por Fecha */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                Por Fecha Exacta
              </label>
              <input 
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}
              />
              <button 
                onClick={handleSearchByDate}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Buscar por Fecha
              </button>
            </div>

            {/* Búsqueda por Rango de Fechas */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                Por Rango de Fechas
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#6b7280' }}>
                    Desde
                  </label>
                  <input 
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#6b7280' }}>
                    Hasta
                  </label>
                  <input 
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>
              <button 
                onClick={handleSearchByDateRange}
                style={{
                  width: '100%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Buscar por Rango
              </button>
            </div>

            <button 
              onClick={closeSearchModal}
              style={{
                marginTop: '20px',
                width: '100%',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '16px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            📋
          </div>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>Cargando cotizaciones...</p>
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

      {/* Tabla de Cotizaciones */}
      {!loading && displayedQuotes.length > 0 && (
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <th style={{ 
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    Número
                  </th>
                  <th style={{ 
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
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
                    letterSpacing: '0.5px',
                    minWidth: '200px'
                  }}>
                    Ruta
                  </th>
                  <th style={{ 
                    padding: '16px 20px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    Piezas
                  </th>
                  <th style={{ 
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    Volumen/Peso
                  </th>
                  <th style={{ 
                    padding: '16px 20px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    Ingreso Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedQuotes.map((quote, index) => {
                  return (
                    <tr 
                      key={quote.id}
                      onClick={() => openModal(quote)}
                      style={{
                        borderBottom: index < displayedQuotes.length - 1 ? '1px solid #f3f4f6' : 'none',
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
                        color: '#1f2937',
                        whiteSpace: 'nowrap'
                      }}>
                        {quote.number || 'N/A'}
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#4b5563',
                        whiteSpace: 'nowrap'
                      }}>
                        {quote.date 
                          ? new Date(quote.date).toLocaleDateString('es-CL', {
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '600' }}>{quote.origin || '-'}</span>
                          <span style={{ color: '#3b82f6' }}>→</span>
                          <span style={{ fontWeight: '600' }}>{quote.destination || '-'}</span>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        textAlign: 'center',
                        color: '#4b5563',
                        fontWeight: '600'
                      }}>
                        {quote.totalCargo_Pieces || '-'}
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#4b5563',
                        whiteSpace: 'nowrap'
                      }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          {quote.totalCargo_VolumeDisplayValue && (
                            <div>📦 {quote.totalCargo_VolumeDisplayValue}</div>
                          )}
                          {quote.totalCargo_WeightDisplayValue && (
                            <div>⚖️ {quote.totalCargo_WeightDisplayValue}</div>
                          )}
                          {!quote.totalCargo_VolumeDisplayValue && !quote.totalCargo_WeightDisplayValue && '-'}
                        </div>
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        textAlign: 'right',
                        color: '#10b981',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatCLP(quote.totalCharge_IncomeDisplayValue) || '-'}
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
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ 
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Mostrando <strong style={{ color: '#1f2937' }}>{displayedQuotes.length}</strong> de{' '}
              <strong style={{ color: '#1f2937' }}>{quotes.length}</strong> cotizaciones
            </div>
            {!showingAll && quotes.length > displayedQuotes.length && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showAllQuotes();
                }}
                style={{
                  backgroundColor: 'white',
                  color: '#3b82f6',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#3b82f6';
                }}
              >
                Ver todas
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {showModal && selectedQuote && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, overflowY: 'auto' }}
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded"
            style={{ 
              maxWidth: '900px', 
              width: '100%', 
              maxHeight: '90vh',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
                    Cotización #{selectedQuote.number || selectedQuote.id || 'N/A'}
                  </h5>
                  {selectedQuote.date && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      📅 {formatDate(selectedQuote.date)}
                    </div>
                  )}
                </div>
                <button 
                  onClick={closeModal}
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
                    padding: 0,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Contenido del Modal con Scroll */}
            <div style={{ 
              padding: '24px', 
              overflowY: 'auto', 
              flex: 1
            }}>
              {/* Ruta de Envío - VISIBLE SIEMPRE */}
              <RouteDisplay quote={selectedQuote} />

              {/* Información General */}
              <CollapsibleSection title="Información General" defaultOpen={true} icon="📋">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <InfoField label="Número de Cotización" value={selectedQuote.number} />
                  <InfoField label="Fecha de Emisión" value={selectedQuote.date ? formatDate(selectedQuote.date) : null} />
                  <InfoField label="Válida Hasta" value={selectedQuote.validUntil_Date ? formatDate(selectedQuote.validUntil_Date) : null} />
                  <InfoField label="Días de Tránsito" value={selectedQuote.transitDays} />
                  <InfoField label="Referencia Cliente" value={selectedQuote.customerReference} />
                  <InfoField label="Modo de Transporte" value={selectedQuote.modeOfTransportation} />
                  <InfoField label="Tipo de Pago" value={selectedQuote.paymentType} />
                  <InfoField label="Carrier/Broker" value={selectedQuote.carrierBroker} fullWidth />
                </div>
              </CollapsibleSection>

              {/* Información de Carga */}
              <CollapsibleSection title="Información de Carga" defaultOpen={false} icon="📦">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <InfoField label="Total de Piezas" value={selectedQuote.totalCargo_Pieces} />
                  <InfoField label="Contenedores" value={selectedQuote.totalCargo_Container} />
                  <InfoField label="Peso Total" value={selectedQuote.totalCargo_WeightDisplayValue} />
                  <InfoField label="Volumen Total" value={selectedQuote.totalCargo_VolumeDisplayValue} />
                  <InfoField label="Peso Volumétrico" value={selectedQuote.totalCargo_VolumeWeightDisplayValue} />
                  <InfoField label="Carga Peligrosa" value={selectedQuote.hazardous} />
                  <InfoField label="Estado de Carga" value={selectedQuote.cargoStatus} />
                </div>
              </CollapsibleSection>

              {/* Resumen Financiero - SOLO INGRESO */}
              <CollapsibleSection title="Resumen Financiero" defaultOpen={false} icon="💰">
                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '2px solid rgba(16, 185, 129, 0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    marginBottom: '8px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Ingreso Total
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#10b981'
                  }}>
                    {formatCLP(selectedQuote.totalCharge_IncomeDisplayValue) || '$0 CLP'}
                  </div>
                </div>
              </CollapsibleSection>

              {/* Notas */}
              {selectedQuote.notes && selectedQuote.notes !== 'N/A' && (
                <CollapsibleSection title="Notas" defaultOpen={false} icon="📝">
                  <div style={{ 
                    padding: '12px',
                    backgroundColor: '#fffbeb',
                    borderRadius: '6px',
                    border: '1px solid #fde047',
                    color: '#713f12',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6'
                  }}>
                    {selectedQuote.notes}
                  </div>
                </CollapsibleSection>
              )}
            </div>

            {/* Footer del Modal */}
            <div style={{ 
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f9fafb'
            }}>
              <button 
                onClick={closeModal}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío - Sin resultados de búsqueda */}
      {displayedQuotes.length === 0 && !loading && quotes.length > 0 && showingAll && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '16px',
            opacity: 0.5
          }}>
            📋
          </div>
          <h5 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '1.2rem' }}>
            No se encontraron cotizaciones
          </h5>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            No hay cotizaciones que coincidan con tu búsqueda
          </p>
          <button 
            onClick={clearSearch}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
            }}
          >
            Ver las últimas 20 cotizaciones
          </button>
        </div>
      )}

      {/* Estado vacío - Sin cotizaciones cargadas */}
      {quotes.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '16px',
            opacity: 0.5
          }}>
            📦
          </div>
          <h5 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '1.2rem' }}>
            No hay cotizaciones disponibles
          </h5>
          <p style={{ color: '#6b7280' }}>
            No se encontraron cotizaciones para tu cuenta
          </p>
        </div>
      )}
    </>
  );
}

export default QuotesView;