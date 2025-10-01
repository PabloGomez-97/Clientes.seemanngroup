import { useState, useEffect } from 'react';

interface QuotesViewProps {
  accessToken: string;
  onLogout: () => void;
}

interface Quote {
  id?: string | number;
  quoteNumber?: string;
  number?: string;
  date?: string;
  consignee?: string;
  origin?: string;
  destination?: string;
  [key: string]: any;
}

function QuotesView({ accessToken, onLogout }: QuotesViewProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [displayedQuotes, setDisplayedQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterConsignee] = useState('MAURICIO HOCHSCHILD INGENIERÍA Y SERVICIOS SPA.');
  
  // Modal state
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Búsqueda por fecha
  const [searchDate, setSearchDate] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  
  // Búsqueda por número
  const [searchNumber, setSearchNumber] = useState('');
  
  const [showingAll, setShowingAll] = useState(false);

  // Obtener cotizaciones usando el token
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
      
      // Filtrar por consignee
      const filtered = quotesArray.filter(q => q.consignee === filterConsignee);
      
      // Ordenar por fecha (más recientes primero)
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setQuotes(sorted);
      
      // Guardar en caché
      localStorage.setItem('quotesCache', JSON.stringify(sorted));
      localStorage.setItem('quotesCacheTimestamp', new Date().getTime().toString());
      
      // Mostrar solo las últimas 10
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

  // Cargar automáticamente las cotizaciones al montar el componente
  useEffect(() => {
    // Intentar cargar desde caché primero
    const cachedQuotes = localStorage.getItem('quotesCache');
    const cacheTimestamp = localStorage.getItem('quotesCacheTimestamp');
    
    if (cachedQuotes && cacheTimestamp) {
      // Verificar si el caché tiene menos de 1 hora
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

  // Buscar por número de cotización
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

  // Buscar por fecha exacta
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

  // Buscar por rango de fechas
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

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchNumber('');
    setSearchDate('');
    setSearchStartDate('');
    setSearchEndDate('');
    setDisplayedQuotes(quotes.slice(0, 10));
    setShowingAll(false);
  };

  // Abrir modal con detalles
  const openQuoteDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowModal(true);
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedQuote(null);
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mostrar loader mientras carga
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
      {/* Mensajes de Error */}
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

      {/* Header con información y botón de búsqueda */}
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
              {/* Búsqueda por número de cotización */}
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

              {/* Búsqueda por fecha exacta */}
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

              {/* Búsqueda por rango */}
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
                    Cotización #{quote.number || quote.id || quote.quoteNumber || index + 1}
                  </h6>
                  <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                    {formatDate(quote.date || '')}
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
              maxWidth: '700px', 
              width: '100%', 
              maxHeight: '90vh',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h5 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>
                Cotización #{selectedQuote.number || selectedQuote.id || selectedQuote.quoteNumber || 'N/A'}
                </h5>
              <button 
                onClick={closeModal}
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
            <div style={{ 
              padding: '20px', 
              overflowY: 'auto', 
              maxHeight: 'calc(90vh - 140px)' 
            }}>
              {Object.entries(selectedQuote).map(([key, value]) => {
                let displayValue: string;
                if (value === null || value === undefined) {
                  displayValue = 'N/A';
                } else if (typeof value === 'boolean') {
                  displayValue = value ? 'Sí' : 'No';
                } else if (key === 'date' && value) {
                  displayValue = formatDate(value as string);
                } else if (typeof value === 'object') {
                  displayValue = JSON.stringify(value, null, 2);
                } else {
                  displayValue = String(value);
                }

                return (
                  <div key={key} style={{ 
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      textTransform: 'uppercase',
                      color: '#6b7280',
                      fontWeight: '600',
                      marginBottom: '4px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.5px'
                    }}>
                      {key}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem',
                      color: '#1f2937',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ 
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={closeModal}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío - Sin resultados de búsqueda */}
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

      {/* Estado vacío - Sin cotizaciones cargadas */}
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

export default QuotesView;