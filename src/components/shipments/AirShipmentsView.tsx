import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './AirShipmentsView.css'; // 👈 Importar el CSS

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface Consignee {
  id?: number;
  name?: string;
  accountNumber?: string;
  code?: string;
  email?: string;
  [key: string]: any;
}

interface AirShipment {
  id?: string | number;
  number?: string;
  date?: string;
  consignee?: Consignee;
  origin?: string;
  destination?: string;
  [key: string]: any;
}

// Componente para el Timeline Visual
function ShipmentTimeline({ shipment }: { shipment: AirShipment }) {
  const getTimelineSteps = () => {
    // Verificar si ha llegado (arrival completado)
    const hasArrived = (() => {
      if (!shipment.arrival || !shipment.arrival.displayDate) return false;
      try {
        const [month, day, year] = shipment.arrival.displayDate.split('/');
        const arrivalDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return arrivalDate <= new Date();
      } catch {
        return false;
      }
    })();

    const steps = [
      {
        label: 'En Tránsito',
        date: shipment.departure,
        completed: !!shipment.departure,
        icon: '✈️'
      },
      {
        label: 'Llegada',
        date: shipment.arrival,
        completed: hasArrived,
        icon: '📦'
      }
    ];
    return steps;
  };

  const getProgressPercentage = () => {
    if (!shipment.departure || !shipment.arrival) return 0;

    try {
      const parseDisplayDate = (obj: any) => {
        const s = obj?.displayDate?.trim();
        if (!s) return null;

        const [m, d, y] = s.split('/');
        if (!m || !d || !y) return null;

        const date = new Date(Number(y), Number(m) - 1, Number(d));
        const time = date.getTime();
        return Number.isFinite(time) ? time : null;
      };

      const departureTime = parseDisplayDate(shipment.departure);
      const arrivalTime = parseDisplayDate(shipment.arrival);

      if (!departureTime || !arrivalTime) return 0;

      const now = Date.now();
      if (now <= departureTime) return 0;
      if (now >= arrivalTime) return 100;

      return ((now - departureTime) / (arrivalTime - departureTime)) * 100;
    } catch {
      return 0;
    }
  };

  const steps = getTimelineSteps();
  const progress = getProgressPercentage();
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const completedSteps = steps.filter(s => s.completed).length;

  useEffect(() => {
    let rafId: number;
    const durationMs = 6000;
    const start = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    let fromValue = 0;

    setAnimatedProgress(prev => {
      fromValue = prev;
      return prev;
    });

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);

      const next = fromValue + (progress - fromValue) * eased;
      setAnimatedProgress(next);

      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [progress]);

  return (
    <div style={{ 
      padding: '20px', 
      background: 'linear-gradient(to bottom, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)',
      borderRadius: '8px', 
      marginBottom: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    }}>
      
      {/* Sol decorativo con rayos */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '30px',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 100%)',
        boxShadow: '0 0 30px rgba(251, 191, 36, 0.4)',
        zIndex: 0
      }}>
        {/* Rayos del sol */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '80px',
          height: '80px',
          transform: 'translate(-50%, -50%)',
          animation: 'sunRays 20s linear infinite'
        }}>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '2px',
                height: '20px',
                backgroundColor: '#fbbf24',
                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-30px)`,
                opacity: 0.4
              }}
            />
          ))}
        </div>
      </div>

      {/* Estrellas pequeñas (aparecen sutilmente) */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`star-${i}`}
          style={{
            position: 'absolute',
            top: `${10 + i * 15}%`,
            left: `${15 + i * 12}%`,
            fontSize: '0.6rem',
            opacity: 0.3,
            animation: `twinkle ${2 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
            color: '#fbbf24',
            zIndex: 0
          }}
        >
          ✦
        </div>
      ))}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        position: 'relative',
        zIndex: 2
      }}>
        <h6 style={{ 
          margin: 0, 
          color: '#0f172a', 
          fontSize: '0.95rem', 
          fontWeight: '700',
          textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
        }}>
          Estado del Envío
        </h6>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        position: 'relative', 
        paddingLeft: '1%', 
        paddingRight: '6%', 
        minHeight: '110px' 
      }}>

        {/* Nubes grandes flotantes - múltiples capas */}
        <div style={{
          position: 'absolute',
          top: '5px',
          left: '0',
          right: '0',
          height: '50px',
          overflow: 'hidden',
          zIndex: 0,
          pointerEvents: 'none'
        }}>
          {/* Nube 1 */}
          <div style={{
            position: 'absolute',
            top: '5px',
            fontSize: '2rem',
            filter: 'blur(0.5px)',
            animation: 'cloudDrift 45s linear infinite'
          }}>
            ☁️
          </div>
        </div>

        {/* Pájaros volando en formación V */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '20%',
          zIndex: 1,
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'relative',
            animation: 'birdsFloat 25s ease-in-out infinite'
          }}>
            <span style={{ 
              position: 'absolute', 
              fontSize: '0.7rem', 
              color: '#475569',
              transform: 'translate(0px, 0px)'
            }}>Ʌ</span>
            <span style={{ 
              position: 'absolute', 
              fontSize: '0.65rem', 
              color: '#64748b',
              transform: 'translate(-10px, 8px)'
            }}>Ʌ</span>
            <span style={{ 
              position: 'absolute', 
              fontSize: '0.6rem', 
              color: '#64748b',
              transform: 'translate(10px, 8px)'
            }}>Ʌ</span>
            <span style={{ 
              position: 'absolute', 
              fontSize: '0.55rem', 
              color: '#94a3b8',
              transform: 'translate(-18px, 16px)'
            }}>Ʌ</span>
            <span style={{ 
              position: 'absolute', 
              fontSize: '0.55rem', 
              color: '#94a3b8',
              transform: 'translate(18px, 16px)'
            }}>Ʌ</span>
          </div>
        </div>

        {/* Montañas estilizadas con capas de profundidad */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '70px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          paddingLeft: '3%',
          paddingRight: '3%',
          zIndex: 0,
          pointerEvents: 'none'
        }}>
          {/* Capa de montañas lejanas (más claras) */}
          {[...Array(4)].map((_, i) => (
            <div
              key={`mountain-far-${i}`}
              style={{
                width: '0',
                height: '0',
                borderLeft: `${35 + i * 8}px solid transparent`,
                borderRight: `${35 + i * 8}px solid transparent`,
                borderBottom: `${30 + i * 10}px solid #cbd5e1`,
                animation: 'mountainShimmer 8s ease-in-out infinite',
                animationDelay: `${i * 0.5}s`,
                opacity: 0.4
              }}
            />
          ))}
          
          {/* Capa de montañas cercanas (más oscuras) */}
          {[...Array(3)].map((_, i) => (
            <div
              key={`mountain-near-${i}`}
              style={{
                width: '0',
                height: '0',
                borderLeft: `${40 + i * 10}px solid transparent`,
                borderRight: `${40 + i * 10}px solid transparent`,
                borderBottom: `${40 + i * 12}px solid #94a3b8`,
                animation: 'mountainShimmer 6s ease-in-out infinite',
                animationDelay: `${i * 0.8}s`,
                opacity: 0.25,
                marginLeft: `${i * 60}px`
              }}
            />
          ))}
        </div>

        {/* Línea de fondo más sutil */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '5%',
          right: '5%',
          height: '3px',
          background: 'linear-gradient(to right, #e0e7ff, #dbeafe, #e0e7ff)',
          borderRadius: '2px',
          zIndex: 1,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }} />

        {/* Línea de progreso con gradiente animado */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '5%',
          right: `${95 - (animatedProgress * 0.9)}%`,
          height: '3px',
          background: 'linear-gradient(to right, #3b82f6, #60a5fa, #3b82f6)',
          borderRadius: '2px',
          zIndex: 2,
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
          transition: 'right 0.3s ease'
        }} />

        {/* Avión con animación de vuelo suave */}
        <div style={{
          position: 'absolute',
          top: '4px',
          left: `calc(5% + ${animatedProgress * 0.9}%)`,
          transform: 'translateX(-50%) rotate(45deg)',
          fontSize: '1.6rem',
          zIndex: 3,
          pointerEvents: 'none',
          animation: 'planeBounce 2s ease-in-out infinite',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
        }}>
          ✈️
        </div>

        {/* Estela del avión */}
        <div style={{
          position: 'absolute',
          top: '21px',
          left: `calc(5% + ${Math.max(0, animatedProgress * 0.9 - 5)}%)`,
          width: '5%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(147, 197, 253, 0.4), transparent)',
          zIndex: 1,
          pointerEvents: 'none',
          opacity: animatedProgress > 5 ? 1 : 0
        }} />

        {/* Steps del timeline */}
        {steps.map((step, index) => (
          <div key={index} style={{ 
            flex: "0 0 auto", 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: step.completed 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              marginBottom: '10px',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: step.completed 
                ? '0 4px 12px rgba(59, 130, 246, 0.35), 0 0 0 3px rgba(59, 130, 246, 0.1)' 
                : '0 2px 6px rgba(0, 0, 0, 0.08)',
              border: step.completed ? 'none' : '2px solid white'
            }}>
              {step.icon}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              fontWeight: '700',
              color: step.completed ? '#0f172a' : '#94a3b8',
              textAlign: 'center',
              marginBottom: '4px',
              textShadow: step.completed ? '0 1px 2px rgba(255, 255, 255, 0.8)' : 'none',
              letterSpacing: '0.01em'
            }}>
              {step.label}
            </div>
            {step.date && step.date.displayDate && step.date.displayDate.trim() !== '' && (
              <div style={{ 
                fontSize: '0.7rem', 
                color: step.completed ? '#475569' : '#94a3b8',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {(() => {
                  try {
                    const [month, day, year] = step.date.displayDate.split('/');
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    return date.toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short'
                    });
                  } catch {
                    return step.date.displayDate;
                  }
                })()}
              </div>
            )}
          </div>
        ))}
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
  if (value === null || value === undefined || value === '' || value === 0) return null;
  
  let displayValue: string;
  if (typeof value === 'boolean') {
    displayValue = value ? 'Sí' : 'No';
  } else if (typeof value === 'object') {
    return null;
  } else {
    displayValue = String(value);
  }

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
        {displayValue}
      </div>
    </div>
  );
}

// Componente para mostrar información de commodities
function CommoditiesSection({ commodities }: { commodities: any[] }) {
  if (!commodities || commodities.length === 0) return null;

  return (
    <div>
      {commodities.map((commodity, index) => (
        <div key={index} style={{
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          marginBottom: index < commodities.length - 1 ? '12px' : '0'
        }}>
          <div style={{ 
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '8px'
          }}>
            Ítem {index + 1}
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <InfoField label="Descripción" value={commodity.description} fullWidth />
            <InfoField label="Piezas" value={commodity.pieces} />
            <InfoField label="Peso Total" value={commodity.totalWeightValue ? `${commodity.totalWeightValue} kg` : null} />
            <InfoField label="Volumen Total" value={commodity.totalVolumeValue ? `${commodity.totalVolumeValue} m³` : null} />
            <InfoField label="Tipo de Empaque" value={commodity.packageType?.description} />
            <InfoField label="Número PO" value={commodity.poNumber} />
            <InfoField label="Número de Factura" value={commodity.invoiceNumber} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Componente para SubShipments
function SubShipmentsList({ subShipments }: { subShipments: any[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!subShipments || subShipments.length === 0) return null;

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ 
        fontSize: '0.85rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>📦</span>
        <span>Sub-Envíos ({subShipments.length})</span>
      </div>
      
      {subShipments.map((subShipment, index) => (
        <div key={index} style={{
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          marginBottom: '8px',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: expandedIndex === index ? '#f9fafb' : 'white',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.85rem' }}>
                {subShipment.number || `Sub-Envío ${index + 1}`}
              </span>
              {subShipment.consignee?.name && (
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {subShipment.consignee.name}
                </span>
              )}
            </div>
            <span style={{ 
              fontSize: '1rem', 
              color: '#6b7280',
              transform: expandedIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}>
              ▼
            </span>
          </button>
          
          {expandedIndex === index && (
            <div style={{ padding: '12px', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <InfoField label="Número" value={subShipment.number} />
                <InfoField label="Waybill" value={subShipment.waybillNumber} />
                <InfoField label="Consignatario" value={subShipment.consignee?.name} fullWidth />
                <InfoField label="Dirección" value={subShipment.consigneeAddress} fullWidth />
                <InfoField label="Carrier" value={subShipment.carrier?.name} />
                <InfoField label="Descripción de Carga" value={subShipment.cargoDescription} fullWidth />
                <InfoField label="Piezas Manifestadas" value={subShipment.manifestedPieces} />
                <InfoField label="Peso Manifestado" value={subShipment.manifestedWeight ? `${subShipment.manifestedWeight} kg` : null} />
                <InfoField label="Referencia Cliente" value={subShipment.customerReference} />
              </div>
              
              {subShipment.commodities && subShipment.commodities.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ 
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    Commodities
                  </div>
                  <CommoditiesSection commodities={subShipment.commodities} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AirShipmentsView() {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<AirShipment[]>([]);
  const [displayedShipments, setDisplayedShipments] = useState<AirShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreShipments, setHasMoreShipments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Modal state
  const [selectedShipment, setSelectedShipment] = useState<AirShipment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Búsqueda por fecha
  const [searchDate, setSearchDate] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  
  // Búsqueda por número
  const [searchNumber, setSearchNumber] = useState('');
  
  const [showingAll, setShowingAll] = useState(false);

  // Función auxiliar para formatear fechas
  const formatDate = (dateObj: any) => {
    if (!dateObj || !dateObj.displayDate) return '-';
    
    if (dateObj.displayDate.trim() === '') return '-';
    
    try {
      const [month, day, year] = dateObj.displayDate.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return date.toLocaleDateString('es-CL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
    } catch (error) {
      return dateObj.displayDate;
    }
  };

  // Obtener air-shipments usando el token con paginación
  const fetchAirShipments = async (page: number = 1, append: boolean = false) => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }
    
    if (!user?.username) {
      setError('No se pudo obtener el nombre de usuario');
      return;
    }
    
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        ConsigneeName: user.username,
        Page: page.toString(),
        ItemsPerPage: '50',
        SortBy: 'newest'
      });
      
      const response = await fetch(`https://api.linbis.com/air-shipments?${queryParams}`, {
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
      const shipmentsArray: AirShipment[] = Array.isArray(data) ? data : [];
      
      const sortedShipments = shipmentsArray.sort((a, b) => {
        const dateA = a.departure?.date ? new Date(a.departure.date) : new Date(0);
        const dateB = b.departure?.date ? new Date(b.departure.date) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setHasMoreShipments(shipmentsArray.length === 50);
      
      if (append && page > 1) {
        const combined = [...shipments, ...sortedShipments];
        const resorted = combined.sort((a, b) => {
          const dateA = a.departure?.date ? new Date(a.departure.date) : new Date(0);
          const dateB = b.departure?.date ? new Date(b.departure.date) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setShipments(resorted);
        setDisplayedShipments(resorted);
        
        const cacheKey = `airShipmentsCache_${user.username}`;
        localStorage.setItem(cacheKey, JSON.stringify(resorted));
        localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      } else {
        setShipments(sortedShipments);
        setDisplayedShipments(sortedShipments);
        setShowingAll(false);
        
        const cacheKey = `airShipmentsCache_${user.username}`;
        localStorage.setItem(cacheKey, JSON.stringify(sortedShipments));
        localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      }
      
      console.log(`Página ${page}: ${shipmentsArray.length} air-shipments cargados`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreShipments = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchAirShipments(nextPage, true);
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
    
    const cacheKey = `airShipmentsCache_${user.username}`;
    const cachedShipments = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);
    
    if (cachedShipments && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      
      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedShipments);
        setShipments(parsed);
        setDisplayedShipments(parsed);
        setShowingAll(false);
        
        if (cachedPage) {
          setCurrentPage(parseInt(cachedPage));
        }
        
        const lastPageSize = parsed.length % 50;
        setHasMoreShipments(lastPageSize === 0 && parsed.length >= 50);
        
        setLoading(false);
        console.log('✅ Cargando desde caché - datos guardados hace', Math.floor(cacheAge / 60000), 'minutos');
        console.log(`📦 ${parsed.length} air-shipments en caché`);
        return;
      } else {
        console.log('🗑️ Caché expirado, limpiando...');
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
        localStorage.removeItem(`${cacheKey}_page`);
      }
    }
    
    setCurrentPage(1);
    fetchAirShipments(1, false);
  }, [accessToken, user?.username]);

  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }

    const searchTerm = searchNumber.trim().toLowerCase();
    const results = shipments.filter(shipment => {
      const number = (shipment.number || '').toString().toLowerCase();
      return number.includes(searchTerm);
    });

    setDisplayedShipments(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }

    const results = shipments.filter(shipment => {
      if (!shipment.date) return false;
      const shipmentDate = new Date(shipment.date).toISOString().split('T')[0];
      return shipmentDate === searchDate;
    });

    setDisplayedShipments(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDateRange = () => {
    if (!searchStartDate && !searchEndDate) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }

    const results = shipments.filter(shipment => {
      if (!shipment.date) return false;
      const shipmentDate = new Date(shipment.date);
      
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

    setDisplayedShipments(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const clearSearch = () => {
    setSearchNumber('');
    setSearchDate('');
    setSearchStartDate('');
    setSearchEndDate('');
    setDisplayedShipments(shipments);
    setShowingAll(false);
  };

  const refreshShipments = () => {
    if (!user?.username) return;
    
    const cacheKey = `airShipmentsCache_${user.username}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    localStorage.removeItem(`${cacheKey}_page`);
    
    setCurrentPage(1);
    setShipments([]);
    setDisplayedShipments([]);
    fetchAirShipments(1, false);
    
    console.log('🔄 Datos refrescados desde la API');
  };

  const openModal = (shipment: AirShipment) => {
    setSelectedShipment(shipment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedShipment(null);
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
          Mis Air Shipments
        </h4>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          margin: 0,
          fontSize: '0.9rem'
        }}>
          Consulta y gestiona tus envíos aéreos
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
          onClick={refreshShipments}
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

        {hasMoreShipments && !loadingMore && (
          <button 
            onClick={loadMoreShipments}
            disabled={loadingMore}
            style={{
              backgroundColor: 'white',
              color: '#10b981',
              border: '2px solid #10b981',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.2s',
              opacity: loadingMore ? 0.6 : 1
            }}
          >
            📦 Cargar Más Envíos
          </button>
        )}

        {loadingMore && (
          <div style={{
            padding: '10px 20px',
            color: '#6b7280',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            ⏳ Cargando más envíos...
          </div>
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
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, animation: 'fadeIn 0.3s ease-in-out' }}
          onClick={closeSearchModal}
        >
          <div 
            className="bg-white rounded p-4"
            style={{ maxWidth: '500px', width: '90%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 style={{ marginBottom: '20px', color: '#1f2937' }}>Buscar Air-Shipments</h5>
            
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
            ✈️
          </div>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>Cargando air-shipments...</p>
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

      {/* Tabla de Air-Shipments */}
      {!loading && displayedShipments.length > 0 && (
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          {/* Tabla */}
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
                    Waybill
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
                    Consignatario
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
                    Fecha Salida
                  </th>
                  <th style={{ 
                    padding: '16px 20px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    minWidth: '150px'
                  }}>
                    Fecha Llegada
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
                    Carrier
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedShipments.map((shipment, index) => {
                  const isDelivered = !!shipment.proofOfDelivery?.podDelivery;
                  const isInCustoms = shipment.customsReleased || !!shipment.importSection?.entry;
                  const hasArrived = shipment.arrival && new Date(shipment.arrival) <= new Date();
                  const inTransit = !!shipment.departure;
                  
                  let statusLabel = 'Pendiente';
                  let statusColor = '#9ca3af';
                  let statusBg = '#f3f4f6';
                  
                  if (isDelivered) {
                    statusLabel = 'Entregado';
                    statusColor = '#059669';
                    statusBg = '#d1fae5';
                  } else if (isInCustoms) {
                    statusLabel = 'En Aduana';
                    statusColor = '#d97706';
                    statusBg = '#fef3c7';
                  } else if (hasArrived) {
                    statusLabel = 'Arribado';
                    statusColor = '#2563eb';
                    statusBg = '#dbeafe';
                  } else if (inTransit) {
                    statusLabel = 'En Tránsito';
                    statusColor = '#7c3aed';
                    statusBg = '#ede9fe';
                  }

                  return (
                    <tr 
                      key={shipment.id}
                      onClick={() => openModal(shipment)}
                      style={{
                        borderBottom: index < displayedShipments.length - 1 ? '1px solid #f3f4f6' : 'none',
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
                        {shipment.number || 'N/A'}
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#3b82f6',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}>
                        {shipment.waybillNumber || '-'}
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#4b5563'
                      }}>
                        {shipment.consignee?.name || '-'}
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        textAlign: 'center',
                        color: '#4b5563',
                        whiteSpace: 'nowrap'
                      }}>
                        {shipment.departure && shipment.departure.displayDate && shipment.departure.displayDate.trim() !== ''
                          ? (() => {
                              try {
                                const [month, day, year] = shipment.departure.displayDate.split('/');
                                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                return date.toLocaleDateString('es-CL', { 
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                });
                              } catch {
                                return shipment.departure.displayDate;
                              }
                            })()
                          : '-'
                        }
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        textAlign: 'center',
                        color: '#4b5563',
                        whiteSpace: 'nowrap'
                      }}>
                        {shipment.arrival && shipment.arrival.displayDate && shipment.arrival.displayDate.trim() !== ''
                          ? (() => {
                              try {
                                const [month, day, year] = shipment.arrival.displayDate.split('/');
                                const date = new Date(
                                  parseInt(year),
                                  parseInt(month) - 1,
                                  parseInt(day)
                                );
                                return date.toLocaleDateString('es-CL', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                });
                              } catch {
                                return shipment.arrival.displayDate;
                              }
                            })()
                          : '-'
                        }
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        textAlign: 'center',
                        color: '#4b5563'
                      }}>
                        {shipment.carrier?.name || '-'}
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
              Mostrando <strong style={{ color: '#1f2937' }}>{displayedShipments.length}</strong> envíos
              {!hasMoreShipments && <span> (todos cargados)</span>}
            </div>
            {hasMoreShipments && !loadingMore && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  loadMoreShipments();
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

      {/* Modal de Detalles MEJORADO */}
      {showModal && selectedShipment && (
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
                    Air-Shipment #{selectedShipment.number || selectedShipment.id || 'N/A'}
                  </h5>
                  {selectedShipment.waybillNumber && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      Waybill: {selectedShipment.waybillNumber}
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
              {/* Timeline Visual */}
              <ShipmentTimeline shipment={selectedShipment} />

              {/* Información en Secciones Colapsables */}
              
              {/* Información General */}
              <CollapsibleSection title="Información General" defaultOpen={true} icon="📋">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <InfoField label="Número de Envío" value={selectedShipment.number} />
                  <InfoField label="Waybill" value={selectedShipment.waybillNumber} />
                  <InfoField label="Referencia Cliente" value={selectedShipment.customerReference} />
                  <InfoField label="Número de Booking" value={selectedShipment.bookingNumber} />
                  <InfoField label="Carrier" value={selectedShipment.carrier?.name} fullWidth />
                  <InfoField label="Vuelo" value={selectedShipment.flight} />
                  <InfoField label="Aeropuerto Salida" value={selectedShipment.airportOfDeparture} />
                  <InfoField label="Aeropuerto Llegada" value={selectedShipment.airportOfArrival} />
                  <InfoField label="Fecha Salida" value={selectedShipment.departure ? formatDate(selectedShipment.departure) : null} />
                  <InfoField label="Fecha Llegada" value={selectedShipment.arrival ? formatDate(selectedShipment.arrival) : null} />
                </div>
              </CollapsibleSection>

              {/* Origen y Destino */}
              <CollapsibleSection title="Origen y Destino" defaultOpen={true} icon="🌍">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <InfoField label="Remitente (Shipper)" value={selectedShipment.shipper?.name} fullWidth />
                  <InfoField label="Dirección Remitente" value={selectedShipment.shipperAddress} fullWidth />
                  <InfoField label="Consignatario" value={selectedShipment.consignee?.name} fullWidth />
                  <InfoField label="Dirección Consignatario" value={selectedShipment.consigneeAddress} fullWidth />
                  <InfoField label="Notify Party" value={selectedShipment.notifyParty?.name || selectedShipment.notifyPartyAddress} fullWidth />
                  <InfoField label="Agente Forwarding" value={selectedShipment.forwardingAgent?.name} />
                  <InfoField label="Agente Destino" value={selectedShipment.destinationAgent?.name} />
                </div>
              </CollapsibleSection>

              {/* Carga y Commodities */}
              {selectedShipment.commodities && selectedShipment.commodities.length > 0 && (
                <CollapsibleSection title="Carga" defaultOpen={false} icon="📦">
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                      <InfoField label="Descripción de Carga" value={selectedShipment.cargoDescription} fullWidth />
                      <InfoField label="Marcas de Carga" value={selectedShipment.cargoMarks} fullWidth />
                      <InfoField label="Piezas Manifestadas" value={selectedShipment.manifestedPieces} />
                      <InfoField label="Peso Manifestado" value={selectedShipment.manifestedWeight ? `${selectedShipment.manifestedWeight} kg` : null} />
                      <InfoField label="Pallets" value={selectedShipment.pallets || selectedShipment.manifestedPallets} />
                      <InfoField label="Carga Peligrosa" value={selectedShipment.hazardous} />
                    </div>
                  </div>
                  <CommoditiesSection commodities={selectedShipment.commodities} />
                </CollapsibleSection>
              )}

              {/* Entrega */}
              {selectedShipment.proofOfDelivery && (
                <CollapsibleSection title="Prueba de Entrega" defaultOpen={false} icon="✅">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <InfoField label="Fecha de Entrega" value={selectedShipment.proofOfDelivery.podDelivery ? formatDate(selectedShipment.proofOfDelivery.podDelivery) : null} />
                    <InfoField label="Recibido Por" value={selectedShipment.proofOfDelivery.podReceivedBy} />
                    <InfoField label="Notas" value={selectedShipment.proofOfDelivery.podNotes} fullWidth />
                    <InfoField label="Notas Internas" value={selectedShipment.proofOfDelivery.podInternalNotes} fullWidth />
                  </div>
                </CollapsibleSection>
              )}

              {/* Sub-Shipments */}
              {selectedShipment.subShipments && selectedShipment.subShipments.length > 0 && (
                <CollapsibleSection title={`Sub-Envíos (${selectedShipment.subShipments.length})`} defaultOpen={false} icon="📦">
                  <SubShipmentsList subShipments={selectedShipment.subShipments} />
                </CollapsibleSection>
              )}

              {/* Notas Adicionales */}
              {selectedShipment.notes && (
                <CollapsibleSection title="Notas" defaultOpen={false} icon="📝">
                  <div style={{ 
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    color: '#1f2937',
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedShipment.notes}
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
      {displayedShipments.length === 0 && !loading && shipments.length > 0 && showingAll && (
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
            No se encontraron air-shipments
          </h5>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            No hay air-shipments que coincidan con tu búsqueda
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
            Ver los últimos 10 air-shipments
          </button>
        </div>
      )}

      {/* Estado vacío - Sin air-shipments cargados */}
      {shipments.length === 0 && !loading && (
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
            ✈️
          </div>
          <h5 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '1.2rem' }}>
            No hay air-shipments disponibles
          </h5>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            No se encontraron air-shipments para tu cuenta
          </p>
          {hasMoreShipments && (
            <button 
              onClick={() => loadMoreShipments()}
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
              Cargar más páginas
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default AirShipmentsView;