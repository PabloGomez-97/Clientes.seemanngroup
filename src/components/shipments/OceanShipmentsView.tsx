import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { type OceanShipment, type OutletContext, type Quote, OceanShipmentTimeline, OceanRouteDisplay, CollapsibleSection, InfoField, QuoteModal } from '../shipments/Handlers/Handleroceanshipments';

function OceanShipmentsView() {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const [oceanShipments, setOceanShipments] = useState<OceanShipment[]>([]);
  const [displayedOceanShipments, setDisplayedOceanShipments] = useState<OceanShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filterConsignee = user?.username || '';
  
  // Modal state
  const [selectedOceanShipment, setSelectedOceanShipment] = useState<OceanShipment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Quote modal state
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  
  // Búsqueda por fecha
  const [searchDate, setSearchDate] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  
  // Búsqueda por número
  const [searchNumber, setSearchNumber] = useState('');
  
  const [showingAll, setShowingAll] = useState(false);


    // Tooltips estado
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
    // Define los mensajes de ayuda para cada columna
    const tooltipMessages = {
      numero: "Número único de identificación de la cotización",
      gasto: "Se excluyen impuestos asociados"
    };
  
    // Componente de Tooltip mejorado con posicionamiento inteligente
    const TooltipIcon = ({ id, message }: { id: string; message: string }) => {
      const iconRef = useRef<HTMLDivElement>(null);
  
      const handleMouseEnter = () => {
        if (iconRef.current) {
          const rect = iconRef.current.getBoundingClientRect();
          setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
          setActiveTooltip(id);
        }
      };
  
      const handleMouseLeave = () => {
        setActiveTooltip(null);
        setTooltipPosition(null);
      };
  
      // Calcular si el tooltip debe ir a la izquierda o derecha
      const getTooltipStyle = () => {
        if (!tooltipPosition) return {};
        
        const windowWidth = window.innerWidth;
        const tooltipWidth = 280; // maxWidth del tooltip
        const shouldAlignRight = tooltipPosition.x + tooltipWidth / 2 > windowWidth - 20;
        const shouldAlignLeft = tooltipPosition.x - tooltipWidth / 2 < 20;
  
        let transform = 'translate(-50%, -100%)';
        let left = tooltipPosition.x;
  
        if (shouldAlignRight) {
          // Si está muy a la derecha, alinear el tooltip a la derecha
          transform = 'translate(-100%, -100%)';
          left = tooltipPosition.x + 8; // pequeño offset
        } else if (shouldAlignLeft) {
          // Si está muy a la izquierda, alinear el tooltip a la izquierda
          transform = 'translate(0%, -100%)';
          left = tooltipPosition.x - 8;
        }
  
        return {
          position: 'fixed' as const,
          left: `${left}px`,
          top: `${tooltipPosition.y}px`,
          transform: transform,
          marginTop: '-12px'
        };
      };
  
      return (
        <div 
          ref={iconRef}
          style={{ 
            position: 'relative',
            display: 'inline-block',
            marginLeft: '6px',
            zIndex: 9999
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '50%',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'help',
            userSelect: 'none'
          }}>
            ?
          </span>
          {activeTooltip === id && tooltipPosition && (
            <div style={{
              ...getTooltipStyle(),
              padding: '10px 14px',
              backgroundColor: '#1f2937',
              color: 'white',
              borderRadius: '8px',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              whiteSpace: 'normal',
              maxWidth: '280px',
              minWidth: '200px',
              width: 'max-content',
              zIndex: 99999,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
              textAlign: 'center',
              wordWrap: 'break-word'
            }}>
              {message}
              {/* Flecha del tooltip - ajustar posición según alineación */}
              <div style={{
                position: 'absolute',
                top: '100%',
                left: tooltipPosition.x + 280 / 2 > window.innerWidth - 20 
                  ? 'auto' 
                  : tooltipPosition.x - 280 / 2 < 20 
                    ? '20px' 
                    : '50%',
                right: tooltipPosition.x + 280 / 2 > window.innerWidth - 20 
                  ? '20px' 
                  : 'auto',
                transform: tooltipPosition.x + 280 / 2 > window.innerWidth - 20 || tooltipPosition.x - 280 / 2 < 20
                  ? 'none'
                  : 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #1f2937'
              }} />
            </div>
          )}
        </div>
      );
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

  // Función para formatear precios en CLP
  const formatCLP = (priceString?: string) => {
    if (!priceString) return null;
    const numberMatch = priceString.match(/[\d.,]+/);
    if (!numberMatch) return priceString;
    const cleanNumber = numberMatch[0].replace(/,/g, '');
    const number = parseFloat(cleanNumber);
    if (isNaN(number)) return priceString;
    const formatted = new Intl.NumberFormat('es-CL').format(number);
    return `$${formatted} CLP`;
  };

  // Función para obtener cotización por número
  const fetchQuoteByNumber = async (quoteNumber: string) => {
    if (!accessToken) return;
    
    setLoadingQuote(true);
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
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const quotesArray: Quote[] = Array.isArray(data) ? data : [];
      const foundQuote = quotesArray.find(q => q.number === quoteNumber);
      
      if (foundQuote) {
        setSelectedQuote(foundQuote);
        setShowQuoteModal(true);
      } else {
        alert('No se encontró la cotización');
      }
    } catch (err) {
      console.error('Error al cargar cotización:', err);
      alert('Error al cargar la cotización');
    } finally {
      setLoadingQuote(false);
    }
  };

  // Obtener ocean shipments usando el token
  const fetchOceanShipments = async () => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://api.linbis.com/ocean-shipments/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido o expirado.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const oceanShipmentsArray: OceanShipment[] = Array.isArray(data) ? data : [];
      
      const filtered = oceanShipmentsArray.filter(os => os.consignee === filterConsignee);
      
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.createdOn || 0);
        const dateB = new Date(b.createdOn || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setOceanShipments(sorted);
      
      localStorage.setItem('oceanShipmentsCache', JSON.stringify(sorted));
      localStorage.setItem('oceanShipmentsCacheTimestamp', new Date().getTime().toString());
      
      setDisplayedOceanShipments(sorted.slice(0, 20));
      setShowingAll(false);
      
      console.log(`${oceanShipmentsArray.length} ocean shipments totales, ${filtered.length} del consignee, mostrando los 20 más recientes`);
      
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

    const cachedOceanShipments = localStorage.getItem('oceanShipmentsCache');
    const cacheTimestamp = localStorage.getItem('oceanShipmentsCacheTimestamp');
    
    if (cachedOceanShipments && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      
      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedOceanShipments);
        setOceanShipments(parsed);
        setDisplayedOceanShipments(parsed.slice(0, 20));
        setShowingAll(false);
        console.log('Cargando desde caché - datos guardados hace', Math.floor(cacheAge / 60000), 'minutos');
        return;
      }
    }
    
    fetchOceanShipments();
  }, [accessToken]);

  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedOceanShipments(oceanShipments.slice(0, 20));
      setShowingAll(false);
      return;
    }

    const searchTerm = searchNumber.trim().toLowerCase();
    const results = oceanShipments.filter(oceanShipment => {
      const number = (oceanShipment.number || '').toString().toLowerCase();
      return number.includes(searchTerm);
    });

    setDisplayedOceanShipments(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedOceanShipments(oceanShipments.slice(0, 20));
      setShowingAll(false);
      return;
    }

    const results = oceanShipments.filter(oceanShipment => {
      if (!oceanShipment.createdOn) return false;
      const shipmentDate = new Date(oceanShipment.createdOn).toISOString().split('T')[0];
      return shipmentDate === searchDate;
    });

    setDisplayedOceanShipments(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDateRange = () => {
    if (!searchStartDate && !searchEndDate) {
      setDisplayedOceanShipments(oceanShipments.slice(0, 20));
      setShowingAll(false);
      return;
    }

    const results = oceanShipments.filter(oceanShipment => {
      if (!oceanShipment.createdOn) return false;
      const shipmentDate = new Date(oceanShipment.createdOn);
      
      if (searchStartDate && searchEndDate) {
        const start = new Date(searchStartDate);
        const end = new Date(searchEndDate);
        end.setHours(23, 59, 59, 999);
        return shipmentDate >= start && shipmentDate <= end;
      } else if (searchStartDate) {
        return shipmentDate >= new Date(searchStartDate);
      } else if (searchEndDate) {
        const end = new Date(searchEndDate);
        end.setHours(23, 59, 59, 999);
        return shipmentDate <= end;
      }
      return false;
    });

    setDisplayedOceanShipments(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const clearSearch = () => {
    setSearchNumber('');
    setSearchDate('');
    setSearchStartDate('');
    setSearchEndDate('');
    setDisplayedOceanShipments(oceanShipments.slice(0, 20));
    setShowingAll(false);
  };

  const showAllOceanShipments = () => {
    setDisplayedOceanShipments(oceanShipments);
    setShowingAll(true);
  };

  const openModal = (oceanShipment: OceanShipment) => {
    setSelectedOceanShipment(oceanShipment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOceanShipment(null);
  };

  const openSearchModal = () => {
    setShowSearchModal(true);
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
  };

  const closeQuoteModal = () => {
    setShowQuoteModal(false);
    setSelectedQuote(null);
  };

  return (
    <>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '20px 0',
        marginBottom: '24px',
        borderBottom: '1px solid #e5e7eb',
        fontFamily: 'Poppins, sans-serif'
      }}>
        <h4 style={{ 
          color: '#111827',
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: '500',
          letterSpacing: '-0.01em'
        }}>
          Mis Ocean Shipments
        </h4>
        <p style={{ 
          color: '#6b7280',
          marginTop: '6px',
          marginBottom: 0,
          fontSize: '0.9rem',
          fontWeight: '400'
        }}>
          Consulta y gestiona tus envíos marítimos
        </p>
      </div>

      {/* Botones de acción */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        fontFamily: 'Poppins, sans-serif'
      }}>
        <button 
          onClick={openSearchModal}
          style={{
            backgroundColor: 'transparent',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '500',
            transition: 'background-color 0.2s ease, border-color 0.2s ease'
          }}
        >
          Buscar
        </button>

        {!showingAll && oceanShipments.length > 20 && (
          <button 
            onClick={showAllOceanShipments}
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '500',
              transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}
          >
            Ver todos ({oceanShipments.length})
          </button>
        )}

        {showingAll && (
          <button 
            onClick={clearSearch}
            style={{
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '400',
              transition: 'color 0.2s ease, border-color 0.2s ease'
            }}
          >
            Limpiar filtros
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
            <h5 style={{ marginBottom: '20px', color: '#1f2937' }}>Buscar Ocean Shipments</h5>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>
                Por Número
              </label>
              <input 
                type="text"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Ingresa el número del shipment"
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
                  backgroundColor: '#0ea5e9',
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
                  backgroundColor: '#0ea5e9',
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
                  backgroundColor: '#0ea5e9',
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
            marginBottom: '16px'
          }}>
            🚢
          </div>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>Cargando ocean shipments...</p>
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

      {/* Tabla de Ocean Shipments */}
      {!loading && displayedOceanShipments.length > 0 && (
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
                    minWidth: '250px'
                  }}>
                    Ruta
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
                    Fecha Salida
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
                    Embarcación
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
                    Tipo
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
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    Gasto Parcial
                    <TooltipIcon id="numero" message={tooltipMessages.gasto} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedOceanShipments.map((shipment, index) => {
                  return (
                    <tr 
                      key={shipment.id}
                      onClick={() => openModal(shipment)}
                      style={{
                        borderBottom: index < displayedOceanShipments.length - 1 ? '1px solid #f3f4f6' : 'none',
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
                        <div>{shipment.number || 'N/A'}</div>
                        {shipment.quoteNumber && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchQuoteByNumber(shipment.quoteNumber!);
                            }}
                            style={{
                              display: 'inline-block',
                              marginTop: '4px',
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              backgroundColor: '#d1fae5',
                              color: '#065f46',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            📋 {shipment.quoteNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#4b5563'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '600' }}>{shipment.portOfLoading || '-'}</span>
                          <span style={{ color: '#0ea5e9' }}>→</span>
                          <span style={{ fontWeight: '600' }}>{shipment.portOfUnloading || '-'}</span>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#4b5563',
                        whiteSpace: 'nowrap'
                      }}>
                        {shipment.departure 
                          ? new Date(shipment.departure).toLocaleDateString('es-CL', {
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
                        {shipment.vessel || '-'}
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: shipment.typeOfMove === 'FCL' ? '#7c3aed' : '#059669',
                          backgroundColor: shipment.typeOfMove === 'FCL' ? '#f3e8ff' : '#d1fae5'
                        }}>
                          {shipment.typeOfMove || '-'}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        textAlign: 'center',
                        color: '#4b5563',
                        fontWeight: '600'
                      }}>
                        {shipment.totalCargo_Pieces || '-'}
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        textAlign: 'right',
                        color: '#10b981',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatCLP(shipment.totalCharge_IncomeDisplayValue) || '-'}
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
              Mostrando <strong style={{ color: '#1f2937' }}>{displayedOceanShipments.length}</strong> de{' '}
              <strong style={{ color: '#1f2937' }}>{oceanShipments.length}</strong> envíos
            </div>
            {!showingAll && oceanShipments.length > displayedOceanShipments.length && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showAllOceanShipments();
                }}
                style={{
                  backgroundColor: 'white',
                  color: '#0ea5e9',
                  border: '1px solid #0ea5e9',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0ea5e9';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#0ea5e9';
                }}
              >
                Ver todos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalles del Ocean Shipment */}
      {showModal && selectedOceanShipment && (
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
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
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
                    Ocean Shipment #{selectedOceanShipment.number || selectedOceanShipment.id || 'N/A'}
                  </h5>
                  {selectedOceanShipment.quoteNumber && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchQuoteByNumber(selectedOceanShipment.quoteNumber!);
                      }}
                      disabled={loadingQuote}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '6px',
                        padding: '4px 12px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: loadingQuote ? 'not-allowed' : 'pointer',
                        marginTop: '8px'
                      }}
                    >
                      {loadingQuote ? 'Cargando...' : `📋 Ver Cotización ${selectedOceanShipment.quoteNumber}`}
                    </button>
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
                    padding: 0
                  }}
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
              {/* Timeline Visual */}
              <OceanShipmentTimeline shipment={selectedOceanShipment} />

              {/* Ruta de Envío - VISIBLE SIEMPRE */}
              <OceanRouteDisplay shipment={selectedOceanShipment} />

              {/* Información General */}
              <CollapsibleSection title="Información General" defaultOpen={true} icon="📋">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <InfoField label="Número de Envío" value={selectedOceanShipment.number} />
                  <InfoField label="Tipo de Operación" value={selectedOceanShipment.operationFlow} />
                  <InfoField label="Tipo de Envío" value={selectedOceanShipment.shipmentType} />
                  <InfoField label="Tipo de Movimiento" value={selectedOceanShipment.typeOfMove} />
                  <InfoField label="Booking Number" value={selectedOceanShipment.bookingNumber} />
                  <InfoField label="BL Number" value={selectedOceanShipment.waybillNumber} />
                  <InfoField label="Forwarded BL" value={selectedOceanShipment.fowaredBl} />
                  <InfoField label="Número de Contenedor" value={selectedOceanShipment.containerNumber} />
                  <InfoField label="Referencia Cliente" value={selectedOceanShipment.customerReference} />
                  <InfoField label="Representante Ventas" value={selectedOceanShipment.salesRep} />
                  <InfoField label="Fecha de Creación" value={selectedOceanShipment.createdOn ? formatDate(selectedOceanShipment.createdOn) : null} />
                  <InfoField label="Fecha Salida" value={selectedOceanShipment.departure ? formatDate(selectedOceanShipment.departure) : null} />
                  <InfoField label="Fecha Llegada" value={selectedOceanShipment.arrival ? formatDate(selectedOceanShipment.arrival) : null} />
                </div>
              </CollapsibleSection>

              {/* Información de Carga */}
              <CollapsibleSection title="Información de Carga" defaultOpen={false} icon="📦">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <InfoField label="Total de Piezas" value={selectedOceanShipment.totalCargo_Pieces} />
                  <InfoField label="Peso Total" value={selectedOceanShipment.totalCargo_WeightDisplayValue} />
                  <InfoField label="Volumen Total" value={selectedOceanShipment.totalCargo_VolumeDisplayValue} />
                  <InfoField label="Descripción de Carga" value={selectedOceanShipment.cargoDescription} fullWidth />
                  <InfoField label="Marcas de Carga" value={selectedOceanShipment.cargoMarks} fullWidth />
                  <InfoField label="Estado de Carga" value={selectedOceanShipment.cargoStatus} />
                  <InfoField label="Carga Peligrosa" value={selectedOceanShipment.hazardous ? 'Sí' : 'No'} />
                  <InfoField label="Containerizado" value={selectedOceanShipment.containerized ? 'Sí' : 'No'} />
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
                    Total Gasto (No incluye impuestos)
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: '#10b981'
                  }}>
                    {formatCLP(selectedOceanShipment.totalCharge_IncomeDisplayValue) || '$0 CLP'}
                  </div>
                </div>
              </CollapsibleSection>

              {/* Información de Importación/Aduana */}
              {(selectedOceanShipment.entryNumber || selectedOceanShipment.itNumber || selectedOceanShipment.amsNumber || selectedOceanShipment.broker) && (
                <CollapsibleSection title="Información de Importación y Aduana" defaultOpen={false} icon="🛃">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <InfoField label="Entry Number" value={selectedOceanShipment.entryNumber} />
                    <InfoField label="IT Number" value={selectedOceanShipment.itNumber} />
                    <InfoField label="AMS Number" value={selectedOceanShipment.amsNumber} />
                    <InfoField label="Broker" value={selectedOceanShipment.broker} />
                    <InfoField label="Liberado por Aduana" value={selectedOceanShipment.customsReleased ? 'Sí' : 'No'} />
                    <InfoField label="Flete Liberado" value={selectedOceanShipment.freightReleased ? 'Sí' : 'No'} />
                  </div>
                </CollapsibleSection>
              )}

              {/* Notas */}
              {selectedOceanShipment.notes && selectedOceanShipment.notes !== 'N/A' && (
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
                    {selectedOceanShipment.notes}
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
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgba(14, 165, 233, 0.3)'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cotización */}
      {showQuoteModal && (
        <QuoteModal quote={selectedQuote} onClose={closeQuoteModal} />
      )}

      {/* Estado vacío - Sin resultados de búsqueda */}
      {displayedOceanShipments.length === 0 && !loading && oceanShipments.length > 0 && showingAll && (
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
            🌊
          </div>
          <h5 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '1.2rem' }}>
            No se encontraron ocean shipments
          </h5>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            No hay ocean shipments que coincidan con tu búsqueda
          </p>
          <button 
            onClick={clearSearch}
            style={{
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(14, 165, 233, 0.3)'
            }}
          >
            Ver los últimos 20 ocean shipments
          </button>
        </div>
      )}

      {/* Estado vacío - Sin ocean shipments cargados */}
      {oceanShipments.length === 0 && !loading && (
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
            ⚓
          </div>
          <h5 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '1.2rem' }}>
            No hay ocean shipments disponibles
          </h5>
          <p style={{ color: '#6b7280' }}>
            No se encontraron ocean shipments para tu cuenta
          </p>
        </div>
      )}
    </>
  );
}

export default OceanShipmentsView;