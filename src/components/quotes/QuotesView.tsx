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
      
      setDisplayedQuotes(sorted.slice(0, 10));
      setShowingAll(false);
      
      console.log(`${quotesArray.length} cotizaciones totales, ${filtered.length} del consignee, mostrando las 10 más recientes`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cachedQuotes = localStorage.getItem('quotesCache');
    const cacheTimestamp = localStorage.getItem('quotesCacheTimestamp');
    
    if (cachedQuotes && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      
      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedQuotes);
        setQuotes(parsed);
        setDisplayedQuotes(parsed.slice(0, 10));
        setShowingAll(false);
        console.log('Cargando desde caché - datos guardados hace', Math.floor(cacheAge / 60000), 'minutos');
        return;
      }
    }
    
    fetchQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setDisplayedQuotes(quotes.slice(0, 10));
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
      setDisplayedQuotes(quotes.slice(0, 10));
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
      setDisplayedQuotes(quotes.slice(0, 10));
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

  // Buscar por origen y/o destino
  const handleSearchByRoute = () => {
    if (!searchOrigin && !searchDestination) {
      setDisplayedQuotes(quotes.slice(0, 10));
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
    setDisplayedQuotes(quotes.slice(0, 10));
    setShowingAll(false);
  };

  const openQuoteDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedQuote(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (!dateString) return 'N/A';
    const formatted = formatDate(dateString);
    if (timeString) {
      return `${formatted} - ${timeString}`;
    }
    return formatted;
  };

  if (loading && quotes.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: '#1f2937',
            fontSize: '1rem',
            margin: 0,
            marginBottom: '4px'
          }}>
            Cargando información...
          </p>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            margin: 0
          }}>
            Puede tardar unos minutos
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#991b1b',
          fontSize: '0.9rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {quotes.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h5 style={{ 
              margin: 0, 
              marginBottom: '4px',
              color: '#1f2937',
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>
              Cotizaciones
            </h5>
            <p style={{ 
              margin: 0, 
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              {showingAll 
                ? `${displayedQuotes.length} resultado${displayedQuotes.length !== 1 ? 's' : ''} encontrado${displayedQuotes.length !== 1 ? 's' : ''}`
                : `Mostrando las últimas 10 de ${quotes.length} cotizaciones`
              }
            </p>
          </div>
          <button
            onClick={() => setShowSearchModal(true)}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            Buscador
          </button>
        </div>
      )}

      {/* Modal de Búsqueda */}
      {showSearchModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999 }}
          onClick={() => setShowSearchModal(false)}
        >
          <div 
            className="bg-white rounded"
            style={{ maxWidth: '500px', width: '100%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>
                Buscador
              </h5>
              <button 
                onClick={() => setShowSearchModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  lineHeight: 1,
                  padding: 0
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px', 
                  display: 'block' 
                }}>
                  Número de cotización
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ej: QUO-12345"
                    style={{
                      flex: 1,
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '0.9rem'
                    }}
                    value={searchNumber}
                    onChange={(e) => setSearchNumber(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchByNumber();
                      }
                    }}
                  />
                  <button 
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 20px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    onClick={handleSearchByNumber}
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                fontSize: '0.875rem', 
                margin: '20px 0' 
              }}>
                o
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '8px', 
                  display: 'block' 
                }}>
                  Fecha exacta
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    style={{
                      flex: 1,
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '0.9rem'
                    }}
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                  />
                  <button 
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 20px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    onClick={handleSearchByDate}
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                fontSize: '0.875rem', 
                margin: '20px 0' 
              }}>
                o
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '12px', 
                  display: 'block' 
                }}>
                  Rango de fechas
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ 
                      fontSize: '0.8rem', 
                      color: '#6b7280', 
                      marginBottom: '6px', 
                      display: 'block' 
                    }}>
                      Desde
                    </label>
                    <input
                      type="date"
                      style={{
                        width: '100%',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '0.9rem'
                      }}
                      value={searchStartDate}
                      onChange={(e) => setSearchStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      fontSize: '0.8rem', 
                      color: '#6b7280', 
                      marginBottom: '6px', 
                      display: 'block' 
                    }}>
                      Hasta
                    </label>
                    <input
                      type="date"
                      style={{
                        width: '100%',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '0.9rem'
                      }}
                      value={searchEndDate}
                      onChange={(e) => setSearchEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <button 
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '0.9rem'
                  }}
                  onClick={handleSearchByDateRange}
                >
                  Buscar por rango
                </button>
              </div>
              <div style={{
                textAlign: 'center', 
                color: '#9ca3af', 
                fontSize: '0.875rem', 
                margin: '20px 0' 
              }}>
                o
              </div>

              {/* Búsqueda por Ruta */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '12px', 
                  display: 'block' 
                }}>
                  Ruta (Origen/Destino)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ 
                      fontSize: '0.8rem', 
                      color: '#6b7280', 
                      marginBottom: '6px', 
                      display: 'block' 
                    }}>
                      Origen
                    </label>
                    <select
                      value={searchOrigin}
                      onChange={(e) => setSearchOrigin(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '0.9rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Todos los orígenes</option>
                      {uniqueOrigins.map(origin => (
                        <option key={origin} value={origin}>{origin}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ 
                      fontSize: '0.8rem', 
                      color: '#6b7280', 
                      marginBottom: '6px', 
                      display: 'block' 
                    }}>
                      Destino
                    </label>
                    <select
                      value={searchDestination}
                      onChange={(e) => setSearchDestination(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '0.9rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Todos los destinos</option>
                      {uniqueDestinations.map(destination => (
                        <option key={destination} value={destination}>{destination}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '0.9rem'
                  }}
                  onClick={handleSearchByRoute}
                >
                  Buscar por ruta
                </button>
              </div>

              <button 
                style={{
                  backgroundColor: 'white',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  width: '100%'
                }}
                onClick={clearSearch}
              >
                Limpiar búsqueda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Cotizaciones */}
      {displayedQuotes.length > 0 && (
        <div className="row g-3">
          {displayedQuotes.map((quote, index) => (
            <div key={quote.id || index} className="col-md-6 col-lg-4">
              <div 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  height: '100%'
                }}
                onClick={() => openQuoteDetails(quote)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ 
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <h6 style={{ 
                    color: '#1f2937', 
                    fontWeight: '600',
                    fontSize: '1rem',
                    marginBottom: '4px',
                    margin: 0
                  }}>
                    Cotización #{quote.number || quote.id || index + 1}
                  </h6>
                  <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                    {formatDateTime(quote.date || '', quote.time)}
                  </small>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <small style={{ 
                    color: '#6b7280', 
                    textTransform: 'uppercase', 
                    fontWeight: '600',
                    fontSize: '0.7rem',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    Consignee
                  </small>
                  <div style={{ 
                    color: '#1f2937',
                    fontSize: '0.875rem',
                    wordBreak: 'break-word'
                  }}>
                    {quote.consignee || 'N/A'}
                  </div>
                </div>
                
                {quote.origin && (
                  <div style={{ marginBottom: '12px' }}>
                    <small style={{ 
                      color: '#6b7280', 
                      textTransform: 'uppercase', 
                      fontWeight: '600',
                      fontSize: '0.7rem',
                      letterSpacing: '0.5px',
                      display: 'block',
                      marginBottom: '4px'
                    }}>
                      Origen
                    </small>
                    <div style={{ color: '#1f2937', fontSize: '0.875rem' }}>
                      {quote.origin}
                    </div>
                  </div>
                )}
                
                {quote.destination && (
                  <div style={{ marginBottom: '12px' }}>
                    <small style={{ 
                      color: '#6b7280', 
                      textTransform: 'uppercase', 
                      fontWeight: '600',
                      fontSize: '0.7rem',
                      letterSpacing: '0.5px',
                      display: 'block',
                      marginBottom: '4px'
                    }}>
                      Destino
                    </small>
                    <div style={{ color: '#1f2937', fontSize: '0.875rem' }}>
                      {quote.destination}
                    </div>
                  </div>
                )}
                
                <div style={{ 
                  textAlign: 'center',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <small style={{ 
                    color: '#2563eb',
                    fontWeight: '500',
                    fontSize: '0.8rem'
                  }}>
                    Ver detalles →
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🎨 NUEVO MODAL PROFESIONAL */}
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
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h4 style={{ margin: 0, marginBottom: '8px', fontSize: '1.5rem', fontWeight: '700' }}>
                    COTIZACIÓN #{selectedQuote.number || 'N/A'}
                  </h4>
                  <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>
                    {formatDateTime(selectedQuote.date || '', selectedQuote.time)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {selectedQuote.currentFlow && (
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {selectedQuote.currentFlow}
                    </div>
                  )}
                  <button 
                    onClick={closeModal}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      color: 'white',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      padding: 0
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Body con scroll */}
            <div style={{ 
              padding: '24px', 
              overflowY: 'auto', 
              maxHeight: 'calc(90vh - 200px)',
              backgroundColor: '#fafafa'
            }}>
              
              {/* 📋 INFORMACIÓN GENERAL */}
              <Section title="📋 Información General">
                <InfoGrid>
                  <InfoItem label="Válido hasta" value={formatDateTime(selectedQuote.validUntil_Date || '', selectedQuote.validUntil_Time)} />
                  <InfoItem label="Días de tránsito" value={selectedQuote.transitDays?.toString() || 'N/A'} />
                  <InfoItem label="Referencia del cliente" value={selectedQuote.customerReference} />
                  <InfoItem label="Modo de transporte" value={selectedQuote.modeOfTransportation} />
                </InfoGrid>
              </Section>

              {/* 🏢 COMPAÑÍA Y CONTACTO */}
              <Section title="🏢 Compañía y Contacto">
                <InfoGrid>
                  <InfoItem label="Empresa emisora" value={selectedQuote.issuingCompany} />
                  <InfoItem label="Representante de ventas" value={selectedQuote.salesRep} />
                  <InfoItem label="Carrier/Broker" value={selectedQuote.carrierBroker} />
                  <InfoItem label="Contacto" value={selectedQuote.contact} fullWidth />
                </InfoGrid>
                {selectedQuote.contactAddress && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    backgroundColor: 'white', 
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb'
                  }}>
                    <strong style={{ color: '#374151' }}>Dirección de contacto:</strong><br/>
                    {selectedQuote.contactAddress}
                  </div>
                )}
              </Section>

              {/* 👤 CLIENTE (CONSIGNEE) */}
              <Section title="👤 Cliente (Consignee)">
                <InfoGrid>
                  <InfoItem label="Consignee" value={selectedQuote.consignee} fullWidth />
                </InfoGrid>
                {selectedQuote.consigneeAddress && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    backgroundColor: 'white', 
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb'
                  }}>
                    {selectedQuote.consigneeAddress}
                  </div>
                )}
              </Section>

              {/* 📦 SHIPPER (ORIGEN) */}
              <Section title="📦 Shipper (Origen)">
                <InfoGrid>
                  <InfoItem label="Shipper" value={selectedQuote.shipper} />
                  <InfoItem label="Puerto de recepción" value={selectedQuote.portOfReceipt} />
                  <InfoItem label="Pickup desde" value={selectedQuote.pickupFrom} fullWidth />
                </InfoGrid>
                {selectedQuote.shipperAddress && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    backgroundColor: 'white', 
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb'
                  }}>
                    {selectedQuote.shipperAddress}
                  </div>
                )}
              </Section>

              {/* 🚢 RUTA */}
              <Section title="🚢 Ruta de Envío">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                      ORIGEN
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                      {selectedQuote.origin || 'N/A'}
                    </div>
                    {selectedQuote.deperture_Date && (
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        📅 {formatDateTime(selectedQuote.deperture_Date, selectedQuote.deperture_Time)}
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    fontSize: '2rem',
                    color: '#2563eb',
                    fontWeight: '300'
                  }}>
                    →
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                      DESTINO
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                      {selectedQuote.destination || 'N/A'}
                    </div>
                    {selectedQuote.arrival_Date && (
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        📅 {formatDateTime(selectedQuote.arrival_Date, selectedQuote.arrival_Time)}
                      </div>
                    )}
                  </div>
                </div>
              </Section>

              {/* 📊 DETALLES DE CARGA */}
              <Section title="📊 Detalles de Carga">
                <InfoGrid columns={3}>
                  <InfoItem label="Piezas" value={selectedQuote.totalCargo_Pieces?.toString() || '0'} highlight />
                  <InfoItem label="Contenedores" value={selectedQuote.totalCargo_Container?.toString() || '0'} highlight />
                  <InfoItem label="Peso" value={selectedQuote.totalCargo_WeightDisplayValue || 'N/A'} highlight />
                  <InfoItem label="Volumen" value={selectedQuote.totalCargo_VolumeDisplayValue || 'N/A'} highlight />
                  <InfoItem label="Volumen/Peso" value={selectedQuote.totalCargo_VolumeWeightDisplayValue || 'N/A'} highlight />
                  <InfoItem label="Tipo de pago" value={selectedQuote.paymentType} highlight />
                </InfoGrid>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginTop: '16px',
                  flexWrap: 'wrap'
                }}>
                  {selectedQuote.hazardous && (
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      backgroundColor: selectedQuote.hazardous === 'Yes' ? '#fee2e2' : '#dcfce7',
                      color: selectedQuote.hazardous === 'Yes' ? '#991b1b' : '#166534',
                      border: `1px solid ${selectedQuote.hazardous === 'Yes' ? '#fecaca' : '#bbf7d0'}`
                    }}>
                      ⚠️ Peligroso: {selectedQuote.hazardous}
                    </div>
                  )}
                  {selectedQuote.cargoStatus && (
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe'
                    }}>
                      Estado: {selectedQuote.cargoStatus}
                    </div>
                  )}
                </div>
              </Section>

              {/* 💰 COSTOS - SECCIÓN DESTACADA */}
              <div style={{
                backgroundColor: '#1f2937',
                borderRadius: '12px',
                padding: '24px',
                marginTop: '24px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}>
                <h6 style={{
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💰 Resumen Financiero
                </h6>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <CostBox 
                    label="Ingreso Total" 
                    value={selectedQuote.totalCharge_IncomeDisplayValue || '$$ 0.00'} 
                    color="#3b82f6"
                    bgColor="rgba(59, 130, 246, 0.1)"
                  />
                  <CostBox 
                    label="Gastos" 
                    value={selectedQuote.totalCharge_ExpenseDisplayValue || '$$ 0.00'} 
                    color="#ef4444"
                    bgColor="rgba(239, 68, 68, 0.1)"
                  />
                  <CostBox 
                    label="Ganancia" 
                    value={selectedQuote.totalCharge_ProfitDisplayValue || '$$ 0.00'} 
                    color="#10b981"
                    bgColor="rgba(16, 185, 129, 0.1)"
                  />
                </div>
              </div>

              {/* 📝 NOTAS */}
              {selectedQuote.notes && selectedQuote.notes !== 'N/A' && (
                <Section title="📝 Observaciones">
                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde047',
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '0.875rem',
                    color: '#713f12',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedQuote.notes}
                  </div>
                </Section>
              )}

              {/* 📌 INFORMACIÓN ADICIONAL */}
              <Section title="📌 Información Adicional">
                <InfoGrid>
                  {selectedQuote.cargoParcial && (
                    <InfoItem label="Carga parcial" value={selectedQuote.cargoParcial} />
                  )}
                  {selectedQuote.accountingStatus && (
                    <InfoItem label="Estado contable" value={selectedQuote.accountingStatus} />
                  )}
                </InfoGrid>
              </Section>
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: 'white'
            }}>
              {selectedQuote.view && (
                <a
                  href={selectedQuote.view}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: 'white',
                    color: '#2563eb',
                    border: '1px solid #2563eb',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  Ver en Linbis →
                </a>
              )}
              <button 
                onClick={closeModal}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {displayedQuotes.length === 0 && !loading && quotes.length > 0 && showingAll && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '16px',
            color: '#9ca3af'
          }}>
            📋
          </div>
          <h5 style={{ color: '#1f2937', marginBottom: '8px' }}>
            No se encontraron cotizaciones
          </h5>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            No hay cotizaciones que coincidan con tu búsqueda
          </p>
          <button 
            onClick={clearSearch}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Ver las últimas 10 cotizaciones
          </button>
        </div>
      )}

      {quotes.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '16px',
            color: '#9ca3af'
          }}>
            📦
          </div>
          <h5 style={{ color: '#1f2937', marginBottom: '8px' }}>
            No hay cotizaciones cargadas
          </h5>
          <p style={{ color: '#6b7280' }}>
            Esperando datos del servidor
          </p>
        </div>
      )}
    </>
  );
}

// 🎨 COMPONENTES HELPER PARA EL DISEÑO

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '24px' }}>
    <h6 style={{
      fontSize: '0.9rem',
      fontWeight: '700',
      color: '#374151',
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {title}
    </h6>
    {children}
  </div>
);

const InfoGrid: React.FC<{ children: React.ReactNode; columns?: number }> = ({ children, columns = 2 }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 3 ? '150px' : '200px'}, 1fr))`,
    gap: '12px'
  }}>
    {children}
  </div>
);

const InfoItem: React.FC<{ label: string; value?: string; fullWidth?: boolean; highlight?: boolean }> = ({ 
  label, 
  value, 
  fullWidth = false,
  highlight = false
}) => (
  <div style={{
    gridColumn: fullWidth ? '1 / -1' : 'auto',
    backgroundColor: highlight ? '#f0f9ff' : 'white',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  }}>
    <div style={{
      fontSize: '0.7rem',
      color: '#6b7280',
      marginBottom: '4px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '0.9rem',
      color: '#1f2937',
      fontWeight: '500',
      wordBreak: 'break-word'
    }}>
      {value || 'N/A'}
    </div>
  </div>
);

const CostBox: React.FC<{ label: string; value: string; color: string; bgColor: string }> = ({ 
  label, 
  value, 
  color,
  bgColor
}) => (
  <div style={{
    backgroundColor: bgColor,
    borderRadius: '8px',
    padding: '16px',
    border: `2px solid ${color}20`
  }}>
    <div style={{
      fontSize: '0.75rem',
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: '6px',
      fontWeight: '600',
      textTransform: 'uppercase'
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '1.4rem',
      fontWeight: '700',
      color: color
    }}>
      {value}
    </div>
  </div>
);

export default QuotesView;