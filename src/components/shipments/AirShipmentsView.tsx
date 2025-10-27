import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

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
        completed: !!shipment.arrival && new Date(shipment.arrival) <= new Date(),
        icon: '📦'
      },
      {
        label: 'Aduana',
        date: shipment.importSection?.importDate || shipment.importSection?.amsDate,
        completed: shipment.customsReleased || !!shipment.importSection?.entry,
        icon: '🛃'
      },
      {
        label: 'Entregado',
        date: shipment.proofOfDelivery?.podDelivery,
        completed: !!shipment.proofOfDelivery?.podDelivery,
        icon: '✅'
      }
    ];
    return steps;
  };

  const steps = getTimelineSteps();
  const completedSteps = steps.filter(s => s.completed).length;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h6 style={{ margin: 0, color: '#1f2937', fontSize: '0.9rem', fontWeight: '600' }}>
          Estado del Envío
        </h6>
        <span style={{ 
          backgroundColor: completedSteps === 4 ? '#10b981' : '#3b82f6',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          {completedSteps === 4 ? 'Entregado' : 'En Proceso'}
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        {/* Línea de fondo */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '5%',
          right: '5%',
          height: '2px',
          backgroundColor: '#e5e7eb',
          zIndex: 0
        }} />
        
        {/* Línea de progreso */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '5%',
          width: `${((completedSteps - 1) / 3) * 90}%`,
          height: '2px',
          backgroundColor: '#3b82f6',
          zIndex: 0,
          transition: 'width 0.3s ease'
        }} />

        {steps.map((step, index) => (
          <div key={index} style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: step.completed ? '#3b82f6' : '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              marginBottom: '8px',
              transition: 'all 0.3s ease',
              boxShadow: step.completed ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none'
            }}>
              {step.icon}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              fontWeight: '600',
              color: step.completed ? '#1f2937' : '#9ca3af',
              textAlign: 'center',
              marginBottom: '4px'
            }}>
              {step.label}
            </div>
            {step.date && (
              <div style={{ 
                fontSize: '0.7rem', 
                color: '#6b7280',
                textAlign: 'center'
              }}>
                {new Date(step.date).toLocaleDateString('es-CL')}
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
    return null; // No mostramos objetos complejos como campos simples
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
  const filterConsignee = user?.username || '';
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  
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
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener air-shipments usando el token con paginación
  const fetchAirShipments = async (startPage: number = 1, append: boolean = false) => {
    if (!accessToken) {
      setError('Debes ingresar un token primero');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let allFiltered: AirShipment[] = append ? [...shipments] : [];
      const pagesToLoad = 1000;
      const idsSet = new Set(allFiltered.map(s => s.id));
      
      const filterShipmentsByConsignee = (shipment: AirShipment): boolean => {
        // Filtro 1: El número debe comenzar con "SOG"
        const numberStartsWithSOG = shipment.number?.toString().toUpperCase().startsWith('SOG');
        
        // Filtro 2: Debe pertenecer al consignee
        const belongsToConsignee = shipment.consignee?.name === filterConsignee;
        
        // Filtro 3: O tener subShipments que pertenezcan al consignee
        const hasSubShipmentsForConsignee = shipment.subShipments && Array.isArray(shipment.subShipments) && 
          shipment.subShipments.some((sub: AirShipment) => 
            sub.consignee?.name === filterConsignee
          );
        
        // Solo mostrar si el número comienza con SOG Y (pertenece al consignee O tiene subShipments del consignee)
        return numberStartsWithSOG && (belongsToConsignee || hasSubShipmentsForConsignee);
      };
      
      for (let page = startPage; page < startPage + pagesToLoad; page++) {
        console.log(`Cargando página ${page}...`);
        
        const response = await fetch(
          `https://api.linbis.com/air-shipments?Page=${page}&ItemsPerPage=100`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Token inválido o expirado.');
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const shipmentsArray: AirShipment[] = Array.isArray(data) ? data : [];
        
        if (shipmentsArray.length === 0) {
          setHasMore(false);
          break;
        }
        
        const filtered = shipmentsArray.filter(filterShipmentsByConsignee);
        
        filtered.forEach(shipment => {
          if (!idsSet.has(shipment.id)) {
            allFiltered.push(shipment);
            idsSet.add(shipment.id);
          }
        });
        
        console.log(`Página ${page}: ${shipmentsArray.length} air-shipments totales, ${filtered.length} que comienzan con SOG y pertenecen a ${filterConsignee}, ${allFiltered.length} acumulados`);
        
        if (shipmentsArray.length < 50) {
          setHasMore(false);
          break;
        }
      }
      
      setShipments(allFiltered);
      setDisplayedShipments(allFiltered.slice(0, 20));
      setCurrentPage(startPage + pagesToLoad);
      setShowingAll(false);
      setHasMore(true);
      
      if (!append) {
        localStorage.setItem('airShipmentsCache', JSON.stringify(allFiltered));
        localStorage.setItem('airShipmentsCacheTimestamp', new Date().getTime().toString());
      }
      
      console.log(`Total encontrado: ${allFiltered.length} air-shipments con número SOG de ${filterConsignee}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePages = async () => {
    if (!hasMore || loading) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchAirShipments(nextPage, true);
  };

  useEffect(() => {
    if (!accessToken) {
      console.log('No hay token disponible todavía');
      return;
    }

    const cachedShipments = localStorage.getItem('airShipmentsCache');
    const cacheTimestamp = localStorage.getItem('airShipmentsCacheTimestamp');
    
    if (cachedShipments && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      
      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedShipments);
        setShipments(parsed);
        setDisplayedShipments(parsed.slice(0, 20));
        setShowingAll(false);
        console.log('Cargando desde caché - datos guardados hace', Math.floor(cacheAge / 60000), 'minutos');
        return;
      }
    }
    
    fetchAirShipments(1);
  }, [accessToken]);

  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedShipments(shipments.slice(0, 20));
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
      setDisplayedShipments(shipments.slice(0, 20));
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
      setDisplayedShipments(shipments.slice(0, 20));
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
    setDisplayedShipments(shipments.slice(0, 20));
    setShowingAll(false);
  };

  const showAllShipments = () => {
    setDisplayedShipments(shipments);
    setShowingAll(true);
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
          onClick={() => fetchAirShipments(1)}
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

        {!showingAll && shipments.length > 10 && (
          <button 
            onClick={showAllShipments}
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
            📋 Ver Todos ({shipments.length})
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
                    minWidth: '150px'
                  }}>
                    Carrier
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
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedShipments.map((shipment, index) => {
                  // Calcular estado del envío
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
                        {shipment.carrier?.name || '-'}
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
                          color: statusColor,
                          backgroundColor: statusBg,
                          whiteSpace: 'nowrap'
                        }}>
                          {statusLabel}
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
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ 
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Mostrando <strong style={{ color: '#1f2937' }}>{displayedShipments.length}</strong> de{' '}
              <strong style={{ color: '#1f2937' }}>{shipments.length}</strong> envíos
            </div>
            {!showingAll && shipments.length > displayedShipments.length && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showAllShipments();
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
                Ver todos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalles MEJORADO */}
      {showModal && selectedShipment && (
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

              {/* Importación y Aduanas */}
              {selectedShipment.importSection && (
                <CollapsibleSection title="Importación y Aduanas" defaultOpen={false} icon="🛃">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <InfoField label="Número de Entry" value={selectedShipment.importSection.entry} />
                    <InfoField label="Fecha de Importación" value={selectedShipment.importSection.importDate ? formatDate(selectedShipment.importSection.importDate) : null} />
                    <InfoField label="Número IT" value={selectedShipment.importSection.itNumber} />
                    <InfoField label="Fecha IT" value={selectedShipment.importSection.itDate ? formatDate(selectedShipment.importSection.itDate) : null} />
                    <InfoField label="Puerto IT" value={selectedShipment.importSection.itPort} />
                    <InfoField label="Número AMS" value={selectedShipment.importSection.amsNumber} />
                    <InfoField label="Fecha AMS" value={selectedShipment.importSection.amsDate ? formatDate(selectedShipment.importSection.amsDate) : null} />
                    <InfoField label="Número GO" value={selectedShipment.importSection.goNumber} />
                    <InfoField label="Fecha GO" value={selectedShipment.importSection.goDate ? formatDate(selectedShipment.importSection.goDate) : null} />
                    <InfoField label="Broker" value={selectedShipment.importSection.broker?.name} />
                    <InfoField label="Ubicación" value={selectedShipment.importSection.location} fullWidth />
                    <InfoField label="Comentarios Ubicación" value={selectedShipment.importSection.locationComments} fullWidth />
                    <InfoField label="Comentarios AMS" value={selectedShipment.importSection.amsComments} fullWidth />
                    <InfoField label="Liberado por Aduana" value={selectedShipment.customsReleased} />
                    <InfoField label="Flete Liberado" value={selectedShipment.freightReleased} />
                    <InfoField label="Liberado Por" value={selectedShipment.freightReleasedBy} />
                    <InfoField label="Fecha Liberación Flete" value={selectedShipment.freightReleasedDate ? formatDate(selectedShipment.freightReleasedDate) : null} />
                  </div>
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
          {hasMore && (
            <button 
              onClick={() => loadMorePages()}
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