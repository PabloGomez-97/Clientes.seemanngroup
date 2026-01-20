import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DocumentosSection } from './Documents/DocumentosSection';
import './QuotesView.css';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';

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
const ITEMS_PER_PAGE = 15;
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

    // Función para obtener la ruta de la bandera
  const getFlagPath = (locationName: string | undefined) => {
    if (!locationName) return null;
    // Limpiar el nombre: reemplazar caracteres no válidos en nombres de archivo
    const cleanName = locationName
      .trim()
      .replace(/\//g, '-')  // Reemplazar / por -
      .replace(/\\/g, '-')  // Reemplazar \ por -
      .replace(/:/g, '-')   // Reemplazar : por -
      .replace(/\*/g, '')   // Eliminar *
      .replace(/\?/g, '')   // Eliminar ?
      .replace(/"/g, '')    // Eliminar "
      .replace(/</g, '')    // Eliminar 
      .replace(/>/g, '')    // Eliminar >
      .replace(/\|/g, '-'); // Reemplazar | por -
    
    return `/paises/${cleanName}.png`;
  };



  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '20px' }}>
      <h6 style={{ margin: 0, color: '#1f2937', fontSize: '0.9rem', fontWeight: '600', marginBottom: '16px' }}>
        Ruta de Envío
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
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {getFlagPath(quote.origin) && (
              <img 
                src={getFlagPath(quote.origin)!}
                alt={quote.origin || ''}
                style={{ 
                  width: '24px', 
                  height: '18px', 
                  objectFit: 'cover',
                  borderRadius: '3px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            {quote.origin || 'N/A'}
          </div>
          {quote.deperture_Date && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              {formatDate(quote.deperture_Date)}
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
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              {quote.destination || 'N/A'}
              {getFlagPath(quote.destination) && (
                <img 
                  src={getFlagPath(quote.destination)!}
                  alt={quote.destination || ''}
                  style={{ 
                    width: '24px', 
                    height: '18px', 
                    objectFit: 'cover',
                    borderRadius: '3px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>
          {quote.arrival_Date && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              {formatDate(quote.arrival_Date)}
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

      // Función para obtener la ruta de la bandera
  const getFlagPath = (locationName: string | undefined) => {
    if (!locationName) return null;
    // Limpiar el nombre: reemplazar caracteres no válidos en nombres de archivo
    const cleanName = locationName
      .trim()
      .replace(/\//g, '-')  // Reemplazar / por -
      .replace(/\\/g, '-')  // Reemplazar \ por -
      .replace(/:/g, '-')   // Reemplazar : por -
      .replace(/\*/g, '')   // Eliminar *
      .replace(/\?/g, '')   // Eliminar ?
      .replace(/"/g, '')    // Eliminar "
      .replace(/</g, '')    // Eliminar 
      .replace(/>/g, '')    // Eliminar >
      .replace(/\|/g, '-'); // Reemplazar | por -
    
    return `/paises/${cleanName}.png`;
  };

  // Componente para mostrar ubicación con bandera
  const LocationWithFlag = ({ location }: { location: string | undefined }) => {
    if (!location) return <>-</>;
    
    const flagPath = getFlagPath(location);
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {flagPath && (
          <img 
            src={flagPath}
            alt={location}
            style={{ 
              width: '20px', 
              height: '15px', 
              objectFit: 'cover',
              borderRadius: '2px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onError={(e) => {
              // Si la imagen no carga, ocultar el elemento
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <span style={{ fontWeight: '600' }}>{location}</span>
      </div>
    );
  };

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreQuotes, setHasMoreQuotes] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const [openAccordions, setOpenAccordions] = useState<(string | number)[]>([]);
  const [activeTabs, setActiveTabs] = useState<Record<string | number, number>>({});
  
  const [searchDate, setSearchDate] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [showingAll, setShowingAll] = useState(false);
  const [showAllQuotes, setShowAllQuotes] = useState(false); // Estado para controlar si se muestran todas las cotizaciones
  const [quickSearch, setQuickSearch] = useState('');


  // Tooltips estado
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Define los mensajes de ayuda para cada columna
  const tooltipMessages = {
    numero: "Número único de identificación de la cotización",
    gasto: "Se excluyen impuestos asociados"
  };

  // Agregar estas funciones helper:
  const toggleAccordion = (quoteId: string | number) => {
    setOpenAccordions(prev => {
      const isOpen = prev.includes(quoteId);
      
      if (isOpen) {
        return prev.filter(id => id !== quoteId);
      } else {
        if (prev.length >= 3) {
          return [...prev.slice(1), quoteId];
        }
        return [...prev, quoteId];
      }
    });
    
    if (!activeTabs[quoteId]) {
      setActiveTabs(prev => ({ ...prev, [quoteId]: 0 }));
    }
  };

  const setActiveTab = (quoteId: string | number, tabIndex: number) => {
    setActiveTabs(prev => ({ ...prev, [quoteId]: tabIndex }));
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

  const fetchQuotes = async (page: number = 1, append: boolean = false) => {
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
        ItemsPerPage: ITEMS_PER_PAGE.toString(),
        SortBy: 'newest'
      });
      
      const response = await fetch(`https://api.linbis.com/Quotes?${queryParams}`, {
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
      
      // Ordenar las cotizaciones por fecha (más nueva primero)
      const sortedQuotes = quotesArray.sort((a, b) => {
        const numberA = parseInt(a.number?.replace(/\D/g, '') || '0', 10);
        const numberB = parseInt(b.number?.replace(/\D/g, '') || '0', 10);
        return numberB - numberA; // Descendente (mayor al menor)
      });
      
      // Si recibimos menos de 50 cotizaciones, no hay más páginas
      setHasMoreQuotes(quotesArray.length === ITEMS_PER_PAGE);
      
      if (append && page > 1) {
        // Agregar las nuevas cotizaciones a las existentes y re-ordenar todo
        const combined = [...quotes, ...sortedQuotes];
        const resorted = combined.sort((a, b) => {
          const numberA = parseInt(a.number?.replace(/\D/g, '') || '0', 10);
          const numberB = parseInt(b.number?.replace(/\D/g, '') || '0', 10);
          return numberB - numberA; // Descendente (mayor al menor)
        });
        setQuotes(resorted);
        setDisplayedQuotes(resorted);
        
        // Guardar en caché con el username del usuario
        const cacheKey = `quotesCache_${user.username}`;
        localStorage.setItem(cacheKey, JSON.stringify(resorted));
        localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      } else {
        // Primera carga: reemplazar todo
        setQuotes(sortedQuotes);
        setDisplayedQuotes(sortedQuotes);
        setShowingAll(false);
        
        // Guardar en caché con el username del usuario
        const cacheKey = `quotesCache_${user.username}`;
        localStorage.setItem(cacheKey, JSON.stringify(sortedQuotes));
        localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      }
      
      console.log(`Página ${page}: ${quotesArray.length} cotizaciones cargadas`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
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
    const cacheKey = `quotesCache_${user.username}`;
    const cachedQuotes = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);
    
    if (cachedQuotes && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000; // 1 hora en milisegundos
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      
      if (cacheAge < oneHour) {
        // El caché es válido (menos de 1 hora)
        const parsed = JSON.parse(cachedQuotes);
        setQuotes(parsed);
        setDisplayedQuotes(parsed);
        setShowingAll(false);
        
        // Restaurar la página actual
        if (cachedPage) {
          setCurrentPage(parseInt(cachedPage));
        }
        
        // Verificar si hay más cotizaciones disponibles
        // Si la última carga fue de 50 cotizaciones, probablemente hay más
        const lastPageSize = parsed.length % ITEMS_PER_PAGE;
        setHasMoreQuotes(lastPageSize === 0 && parsed.length >= ITEMS_PER_PAGE);
        
        setLoading(false);
        console.log('✅ Cargando desde caché - datos guardados hace', Math.floor(cacheAge / 60000), 'minutos');
        console.log(`📋 ${parsed.length} cotizaciones en caché`);
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
    fetchQuotes(1, false);
  }, [accessToken, user?.username]);

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

  useEffect(() => {
    const t = setTimeout(() => {
      const term = quickSearch.trim().toLowerCase();

      if (!term) {
        setDisplayedQuotes(quotes);
        setShowingAll(false);
        return;
      }

      const results = quotes.filter((q) => {
        const number = (q.number || '').toString().toLowerCase();
        const origin = (q.origin || '').toString().toLowerCase();
        const destination = (q.destination || '').toString().toLowerCase();
        const date = (q.date || '').toString().toLowerCase();

        // Ajusta campos si quieres (customerReference, shipper, etc.)
        return (
          number.includes(term) ||
          origin.includes(term) ||
          destination.includes(term) ||
          date.includes(term)
        );
      });

      setDisplayedQuotes(results);
      setShowingAll(true);
    }, 250); // 250ms

    return () => clearTimeout(t);
  }, [quickSearch, quotes]);


  // Función para cargar más cotizaciones (paginación)
  const loadMoreQuotes = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchQuotes(nextPage, true);
  };

  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedQuotes(quotes);
      setShowingAll(false);
      setShowAllQuotes(false);
      return;
    }

    const searchTerm = searchNumber.trim().toLowerCase();
    const results = quotes.filter(quote => {
      const number = (quote.number || '').toString().toLowerCase();
      return number.includes(searchTerm);
    });

    setDisplayedQuotes(results);
    setShowingAll(true);
    setShowAllQuotes(false);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedQuotes(quotes);
      setShowingAll(false);
      setShowAllQuotes(false);
      return;
    }

    const results = quotes.filter(quote => {
      if (!quote.date) return false;
      const quoteDate = new Date(quote.date).toISOString().split('T')[0];
      return quoteDate === searchDate;
    });

    setDisplayedQuotes(results);
    setShowingAll(true);
    setShowAllQuotes(false);
    setShowSearchModal(false);
  };

  const handleSearchByDateRange = () => {
    if (!searchStartDate && !searchEndDate) {
      setDisplayedQuotes(quotes);
      setShowingAll(false);
      setShowAllQuotes(false);
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
    setShowAllQuotes(false);
    setShowSearchModal(false);
  };

  const handleSearchByRoute = () => {
    if (!searchOrigin && !searchDestination) {
      setDisplayedQuotes(quotes);
      setShowingAll(false);
      setShowAllQuotes(false);
      return;
    }

    const results = quotes.filter(quote => {
      const matchOrigin = !searchOrigin || quote.origin === searchOrigin;
      const matchDestination = !searchDestination || quote.destination === searchDestination;
      return matchOrigin && matchDestination;
    });

    setDisplayedQuotes(results);
    setShowingAll(true);
    setShowAllQuotes(false);
    setShowSearchModal(false);
  };

  const clearSearch = () => {
    setQuickSearch('');
    setSearchNumber('');
    setSearchDate('');
    setSearchStartDate('');
    setSearchEndDate('');
    setSearchOrigin('');
    setSearchDestination('');
    setDisplayedQuotes(quotes);
    setShowingAll(false);
    setShowAllQuotes(false); // Resetear el estado de ver todas
  };

  // Función para refrescar datos (limpiar caché y recargar)
  const refreshQuotes = () => {
    if (!user?.username) return;
    
    // Limpiar caché del usuario actual
    const cacheKey = `quotesCache_${user.username}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    localStorage.removeItem(`${cacheKey}_page`);
    
    // Recargar desde la API
    setCurrentPage(1);
    setQuotes([]);
    setDisplayedQuotes([]);
    fetchQuotes(1, false);
    
    console.log('🔄 Datos refrescados desde la API');
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
        {/* Interactive Map */}
        <div style={{ 
          marginBottom: '32px',
          height: '350px',  // 👈 MODIFICA ESTE VALOR para ajustar altura (300px-400px)
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          zIndex: 1,
          position: 'relative'
        }}>
          <MapContainer
            center={[-33.4489, -70.6693]} // Coordenadas de Santiago, Chile
            zoom={3}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </MapContainer>
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
          <input
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Buscar (número, origen, destino...)"
            style={{
              backgroundColor: 'white',
              color: '#111827',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.800rem',
              fontWeight: '400',
              outline: 'none',
              minWidth: '300px',
              height: '38px',
              display: 'flex',
              alignItems: 'center'
            }}
          />

            {/* Botón Actualizar */}
          <div className="refresh-button-container">
            <button 
              onClick={refreshQuotes}
              className="btn-refresh"
              title="Actualizar lista de cotizaciones"
            >
              🔄 Actualizar
            </button>
          </div>

          {/* Indicador de carga */}
          {loadingMore && (
            <div style={{
              padding: '8px 14px',
              color: '#6b7280',
              fontSize: '0.85rem',
              fontWeight: '400'
            }}>
              Cargando…
            </div>
          )}

          {/* Limpiar filtros */}
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
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, animation: 'fadeIn 0.3s ease-in-out' }}
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

        {/* Tabla de Cotizaciones con Accordion */}
        {!loading && displayedQuotes.length > 0 && (
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'visible',
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
                      <TooltipIcon id="numero" message={tooltipMessages.numero} />
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
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}>
                      Transporte
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
                      Gasto Parcial
                      <TooltipIcon id="gasto" message={tooltipMessages.gasto} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedQuotes.map((quote, index) => {
                    const quoteId = quote.id || quote.number || index;
                    const isOpen = openAccordions.includes(quoteId);
                    const activeTabIndex = activeTabs[quoteId] || 0;

                    return (
                      <>
                        {/* Fila de la tabla */}
                        <tr 
                          key={`row-${quoteId}`}
                          onClick={() => toggleAccordion(quoteId)}
                          className={`quotes-table-row ${isOpen ? 'expanded' : ''}`}
                          style={{
                            borderBottom: !isOpen && index < Math.min(displayedQuotes.length, ITEMS_PER_PAGE) - 1 ? '1px solid #f3f4f6' : 'none',
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
                              <LocationWithFlag location={quote.origin} />
                              <span style={{ color: '#3b82f6' }}>→</span>
                              <LocationWithFlag location={quote.destination} />
                            </div>
                          </td>
                          <td style={{ 
                            padding: '16px 20px',
                            color: '#4b5563',
                            whiteSpace: 'nowrap'
                          }}>
                            {quote.modeOfTransportation || '-'}
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

                        {/* Contenido del Accordion */}
                        {isOpen && (
                          <tr key={`accordion-${quoteId}`}>
                            <td colSpan={7} style={{ padding: 0}}>
                              <div className="accordion-content">
                                {/* RouteDisplay encima de los tabs */}
                                <div className="accordion-route-section">
                                  <RouteDisplay quote={quote} />
                                </div>

                                {/* Tabs horizontales */}
                                <div className="tabs-container">
                                  <button
                                    className={`tab-button ${activeTabIndex === 0 ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab(quoteId, 0);
                                    }}
                                  >
                                    Información General
                                  </button>
                                  <button
                                    className={`tab-button ${activeTabIndex === 1 ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab(quoteId, 1);
                                    }}
                                  >
                                    Información de Carga
                                  </button>
                                  <button
                                    className={`tab-button ${activeTabIndex === 2 ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab(quoteId, 2);
                                    }}
                                  >
                                    Documentación Operativa
                                  </button>
                                  <button
                                    className={`tab-button ${activeTabIndex === 3 ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab(quoteId, 3);
                                    }}
                                  >
                                    Resumen Financiero
                                  </button>
                                  {quote.notes && quote.notes !== 'N/A' && (
                                    <button
                                      className={`tab-button ${activeTabIndex === 4 ? 'active' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab(quoteId, 4);
                                      }}
                                    >
                                      Notas
                                    </button>
                                  )}
                                </div>

                                {/* Contenido de los tabs */}
                                <div className="tab-content">
                                  {/* Tab 0: Información General */}
                                  {activeTabIndex === 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                      <InfoField label="Número de Cotización" value={quote.number} />
                                      <InfoField label="Fecha de Emisión" value={quote.date ? formatDate(quote.date) : null} />
                                      <InfoField label="Válida Hasta" value={quote.validUntil_Date ? formatDate(quote.validUntil_Date) : null} />
                                      <InfoField label="Días de Tránsito" value={quote.transitDays} />
                                      <InfoField label="Referencia Cliente" value={quote.customerReference} />
                                      <InfoField label="Modo de Transporte" value={quote.modeOfTransportation} />
                                      <InfoField label="Tipo de Pago" value={quote.paymentType} />
                                      <InfoField label="Carrier/Broker" value={quote.carrierBroker} fullWidth />
                                    </div>
                                  )}

                                  {/* Tab 1: Información de Carga */}
                                  {activeTabIndex === 1 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                      <InfoField label="Total de Piezas" value={quote.totalCargo_Pieces} />
                                      <InfoField label="Contenedores" value={quote.totalCargo_Container} />
                                      <InfoField label="Peso Total" value={quote.totalCargo_WeightDisplayValue} />
                                      <InfoField label="Volumen Total" value={quote.totalCargo_VolumeDisplayValue} />
                                      <InfoField label="Peso Volumétrico" value={quote.totalCargo_VolumeWeightDisplayValue} />
                                      <InfoField label="Carga Peligrosa" value={quote.hazardous} />
                                      <InfoField label="Estado de Carga" value={quote.cargoStatus} />
                                    </div>
                                  )}

                                  {/* Tab 2: Documentación Operativa */}
                                  {activeTabIndex === 2 && (
                                    <DocumentosSection quoteId={String(quote.id || quote.number || '')} />
                                  )}

                                  {/* Tab 3: Resumen Financiero */}
                                  {activeTabIndex === 3 && (
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
                                        Gasto Total (No incluye impuestos)
                                      </div>
                                      <div style={{
                                        fontSize: '2rem',
                                        fontWeight: '700',
                                        color: '#10b981'
                                      }}>
                                        {formatCLP(quote.totalCharge_IncomeDisplayValue) || '$0 CLP'}
                                      </div>
                                    </div>
                                  )}

                                  {/* Tab 4: Notas */}
                                  {activeTabIndex === 4 && quote.notes && quote.notes !== 'N/A' && (
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
                                      {quote.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
                Mostrando <strong style={{ color: '#1f2937' }}>{displayedQuotes.length}</strong> cotizaciones
                {!hasMoreQuotes && <span> (todas cargadas)</span>}
              </div>
              {hasMoreQuotes && !loadingMore && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    loadMoreQuotes();
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
                  Cargar más
                </button>
              )}
              {loadingMore && (
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Cargando...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Detalles */}
        {showModal && selectedQuote && (
          <div 
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, overflowY: 'auto', animation: 'fadeIn 0.3s ease-in-out' }}
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
                backgroundColor: '#1F2937',
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
                       {formatDate(selectedQuote.date)}
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
                <CollapsibleSection title="Información General" defaultOpen={false} icon="">
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
                <CollapsibleSection title="Información de Carga" defaultOpen={false} icon="">
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

                <CollapsibleSection title="Documentación Operativa" defaultOpen={false} icon="">
                  <DocumentosSection quoteId={String(selectedQuote.id || selectedQuote.number || '')} />
                </CollapsibleSection>

                {/* Resumen Financiero - SOLO INGRESO */}
                <CollapsibleSection title="Resumen Financiero" defaultOpen={false} icon="">
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
                      Gasto Total (No incluye impuestos)
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
                    background: '#1F2937',
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
              Ver todas las cotizaciones
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