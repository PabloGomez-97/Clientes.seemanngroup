import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import type {
  Ruta,
  TipoOperacion,
  Provider,
  SelectOption,
} from './Types';
import {
  getPriceForComparison,
  getTransitTimeForComparison,
} from './Types';
import {
  parseMSLIMPORT,
  parseMSLEXPORT,
  parseCRAFT,
  parseECU,
  parseCTL,
  parseOVERSEAS,
  parsePLUSCARGO,
} from './Parsers';
import Modal from './Modal';

// ============================================================================
// CONFIGURACIÓN DE COLORES
// ============================================================================

const PROVIDER_COLORS_MAP: Record<Provider, string> = {
  'MSL-IMPORT': 'primary',
  'MSL-EXPORT': 'dark',
  'CRAFT': 'success',
  'ECU': 'warning',
  'CTL': 'danger',
  'OVERSEAS': 'info',
  'PLUSCARGO': 'secondary'
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const CotizadorGlobal: React.FC = () => {
  // Estados principales
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de selección
  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(null);
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(null);
  
  // Opciones de dropdowns
  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);
  
  // Filtros
  const [rutasFiltradas, setRutasFiltradas] = useState<Ruta[]>([]);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<Set<Provider>>(new Set());
  const [ordenarPor, setOrdenarPor] = useState<'precio' | 'tiempo'>('precio');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null);

  // ============================================================================
  // CARGAR ARCHIVOS EXCEL
  // ============================================================================

  const cargarArchivos = async (tipo: TipoOperacion) => {
    setLoading(true);
    setError(null);

    try {
      const todasLasRutas: Ruta[] = [];

      if (tipo === 'IMPORTACION') {
        const archivos = [
          { nombre: 'MSL-IMPORT.xlsx', parser: parseMSLIMPORT },
          { nombre: 'CRAFT.xlsx', parser: parseCRAFT },
          { nombre: 'ECU.xlsx', parser: parseECU },
          { nombre: 'CTL.xlsx', parser: parseCTL },
          { nombre: 'OVERSEAS.xlsx', parser: parseOVERSEAS },
          { nombre: 'PLUSCARGO.xlsx', parser: parsePLUSCARGO },
          { nombre: 'MSL-EXPORT.xlsx', parser: parseMSLEXPORT }, // Incluido para rutas de exportación también
        ];

        for (const archivo of archivos) {
          try {
            const response = await fetch(`/assets/${archivo.nombre}`);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheet = workbook.Sheets['TARIFARIO'];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            
            const rutasParsed = archivo.parser(data as any);
            todasLasRutas.push(...rutasParsed);
          } catch (err) {
            console.error(`Error cargando ${archivo.nombre}:`, err);
          }
        }
      } else {
        const response = await fetch('/assets/MSL-EXPORT.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets['TARIFARIO'];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        const rutasParsed = parseMSLEXPORT(data as any);
        todasLasRutas.push(...rutasParsed);
      }

      setRutas(todasLasRutas);

      const polsUnicos = Array.from(new Set(todasLasRutas.map(r => r.pol))).sort();
      setOpcionesPOL(polsUnicos.map(pol => ({ value: pol, label: pol })));

      const providersSet = new Set(todasLasRutas.map(r => r.provider));
      setProveedoresSeleccionados(providersSet);

      setLoading(false);
    } catch (err) {
      console.error('Error al cargar archivos:', err);
      setError('Error al cargar las rutas. Verifica que todos los archivos estén en src/assets/');
      setLoading(false);
    }
  };

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    setRutas([]);
    setPolSeleccionado(null);
    setPodSeleccionado(null);
    setOpcionesPOL([]);
    setOpcionesPOD([]);
    setRutasFiltradas([]);
    setProveedoresSeleccionados(new Set());
    cargarArchivos('IMPORTACION');
  }, []); // ← sin dependencias

  useEffect(() => {
    if (polSeleccionado) {
      const rutasDelPOL = rutas.filter(r => r.pol === polSeleccionado.value);
      const podsUnicos = Array.from(new Set(rutasDelPOL.map(r => r.pod))).sort();
      setOpcionesPOD(podsUnicos.map(pod => ({ value: pod, label: pod })));
    } else {
      setOpcionesPOD([]);
    }
  }, [polSeleccionado, rutas]);

  useEffect(() => {
    if (polSeleccionado && podSeleccionado) {
      let resultados = rutas.filter(
        r => r.pol === polSeleccionado.value && 
             r.pod === podSeleccionado.value &&
             proveedoresSeleccionados.has(r.provider)
      );

      if (ordenarPor === 'precio') {
        resultados.sort((a, b) => getPriceForComparison(a) - getPriceForComparison(b));
      } else {
        resultados.sort((a, b) => getTransitTimeForComparison(a) - getTransitTimeForComparison(b));
      }

      setRutasFiltradas(resultados);
    } else {
      setRutasFiltradas([]);
    }
  }, [polSeleccionado, podSeleccionado, rutas, proveedoresSeleccionados, ordenarPor]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePOLChange = (option: SelectOption | null) => {
    setPolSeleccionado(option);
    setPodSeleccionado(null);
    setRutasFiltradas([]);
  };

  const handlePODChange = (option: SelectOption | null) => {
    setPodSeleccionado(option);
  };

  const toggleProveedor = (provider: Provider) => {
    const newSet = new Set(proveedoresSeleccionados);
    if (newSet.has(provider)) {
      newSet.delete(provider);
    } else {
      newSet.add(provider);
    }
    setProveedoresSeleccionados(newSet);
  };

  const handleCotizar = (ruta: Ruta) => {
    setRutaSeleccionada(ruta);
    setModalAbierto(true);
  };

  const handleCerrarModal = () => {
    setModalAbierto(false);
  };

  // ============================================================================
  // RENDERIZADO ESPECÍFICO POR PROVEEDOR Y CONTINENTE
  // ============================================================================

  const renderRutaContent = (ruta: Ruta) => {
    // ========== MSL-IMPORT ==========
    if (ruta.provider === 'MSL-IMPORT') {
      if (ruta.tariff_type === 'ASIA') {
        return (
          <>
            <div className="mb-3 pb-3 border-bottom">
              <p className="mb-1">
                <strong>Vía/Transbordo:</strong> {ruta.via || 'N/A'}
              </p>
            </div>
            <div className="mb-3 pb-3 border-bottom">
              <h6 className="text-primary mb-2">💰 Tarifas</h6>
              <div className="mb-2">
                <strong>Costo W/M:</strong> {ruta.of_wm} {ruta.currency}
              </div>
              <div>
                <strong>Mínimo:</strong> {ruta.of_min} {ruta.currency}
              </div>
            </div>
            <div>
              <h6 className="text-primary mb-2">⏱️ Servicio</h6>
              <p className="mb-1">
                <strong>Frecuencia:</strong>{' '}
                <span className="badge bg-info text-dark">{ruta.frequency}</span>
              </p>
              <p className="mb-0">
                <strong>Tiempo de Tránsito:</strong> {ruta.transit_time} días
              </p>
            </div>
          </>
        );
      }
      
      else if (ruta.tariff_type === 'EUROPA') {
        return (
          <>
            <div className="mb-3 pb-3 border-bottom">
              <h6 className="text-primary mb-2">💰 Tarifas</h6>
              <div className="mb-2">
                <strong>Tarifa (0.1 a 15 m³):</strong> {ruta.of_wm} {ruta.currency}
              </div>
              <div>
                <strong>Tarifa Mínima:</strong> {ruta.of_min} {ruta.currency}
              </div>
              <div className="mt-2">
                <small className="text-info">
                  <i className="bi bi-info-circle"></i> Región EUROPA - Tarifa por volumen
                </small>
              </div>
            </div>
            <div>
              <h6 className="text-primary mb-2">⏱️ Servicio</h6>
              <p className="mb-1">
                <strong>Frecuencia:</strong>{' '}
                <span className="badge bg-info text-dark">{ruta.frequency}</span>
              </p>
              <p className="mb-1">
                <strong>Tiempo de Tránsito:</strong> {ruta.transit_time} días
              </p>
              {ruta.service && <p className="mb-1"><strong>Servicio:</strong> {ruta.service}</p>}
              {ruta.agente && <p className="mb-1"><strong>Agente:</strong> {ruta.agente}</p>}
              {ruta.otros && <p className="mb-1"><strong>Otros:</strong> {ruta.otros}</p>}
              {ruta.observaciones && <p className="mb-0"><strong>Observaciones:</strong> {ruta.observaciones}</p>}
            </div>
          </>
        );
      }
      
      else if (ruta.tariff_type === 'NORTEAMERICA') {
        return (
          <>
            <div className="mb-3 pb-3 border-bottom">
              <h6 className="text-primary mb-2">💰 Tarifas</h6>
              <div className="mb-2">
                <strong>Tarifa (0.1 a 15 m³):</strong> {ruta.of_wm} {ruta.currency}
              </div>
              <div>
                <strong>Tarifa Mínima:</strong> {ruta.of_min} {ruta.currency}
              </div>
              <div className="mt-2">
                <small className="text-info">
                  <i className="bi bi-info-circle"></i> Región NORTEAMERICA - Tarifa por volumen
                </small>
              </div>
            </div>
            <div>
              <h6 className="text-primary mb-2">⏱️ Servicio</h6>
              <p className="mb-1">
                <strong>Frecuencia:</strong>{' '}
                <span className="badge bg-info text-dark">{ruta.frequency}</span>
              </p>
              <p className="mb-1">
                <strong>Tiempo de Tránsito:</strong> {ruta.transit_time} días
              </p>
              {ruta.service && <p className="mb-1"><strong>Servicio:</strong> {ruta.service}</p>}
              {ruta.agente && <p className="mb-1"><strong>Agente:</strong> {ruta.agente}</p>}
              {ruta.otros && <p className="mb-0"><strong>Otros:</strong> {ruta.otros}</p>}
            </div>
          </>
        );
      }
      
      else if (ruta.tariff_type === 'AMERICA') {
        return (
          <>
            <div className="mb-3 pb-3 border-bottom">
              <h6 className="text-primary mb-2">💰 Tarifas</h6>
              <div className="mb-2">
                <strong>Tarifa (0.1 a 15 m³):</strong> {ruta.of_wm} {ruta.currency}
              </div>
              <div>
                <strong>Tarifa Mínima:</strong> {ruta.of_min} {ruta.currency}
              </div>
              <div className="mt-2">
                <small className="text-info">
                  <i className="bi bi-info-circle"></i> Región AMERICA - Tarifa por volumen
                </small>
              </div>
            </div>
            <div>
              <h6 className="text-primary mb-2">⏱️ Servicio</h6>
              <p className="mb-1">
                <strong>Frecuencia:</strong>{' '}
                <span className="badge bg-info text-dark">{ruta.frequency}</span>
              </p>
              <p className="mb-1">
                <strong>Tiempo de Tránsito:</strong> {ruta.transit_time} días
              </p>
              {ruta.service && <p className="mb-1"><strong>Servicio:</strong> {ruta.service}</p>}
              {ruta.agente && <p className="mb-1"><strong>Agente:</strong> {ruta.agente}</p>}
              {ruta.otros && <p className="mb-1"><strong>Otros:</strong> {ruta.otros}</p>}
              {ruta.observaciones && <p className="mb-0"><strong>Observaciones:</strong> {ruta.observaciones}</p>}
            </div>
          </>
        );
      }
    }

    // ========== MSL-EXPORT ==========
    else if (ruta.provider === 'MSL-EXPORT') {
      return (
        <>
          {ruta.via && (
            <div className="mb-3 pb-3 border-bottom">
              <p className="mb-1">
                <strong>Vía/Transbordo:</strong> {ruta.via}
              </p>
            </div>
          )}
          <div className="mb-3 pb-3 border-bottom">
            <h6 className="text-primary mb-2">💰 Tarifas</h6>
            <div className="mb-2">
              <strong>Ocean Freight W/M:</strong> {ruta.of_wm} {ruta.currency}
            </div>
            <div>
              <strong>Consolidation Surcharge:</strong> {ruta.of_min} {ruta.currency}
            </div>
          </div>
          <div>
            <h6 className="text-primary mb-2">⏱️ Servicio</h6>
            {ruta.frequency && <p className="mb-1"><strong>Frecuencia:</strong> {ruta.frequency}</p>}
            {ruta.transit_time && <p className="mb-1"><strong>Tiempo de Tránsito:</strong> {ruta.transit_time} días</p>}
            {ruta.remarks && <p className="mb-0"><strong>Observaciones:</strong> {ruta.remarks}</p>}
          </div>
        </>
      );
    }

    // ========== CRAFT ==========
    else if (ruta.provider === 'CRAFT') {
      return (
        <>
          {ruta.servicio_via && (
            <div className="mb-3">
              <p className="mb-0"><strong>Servicio - Vía:</strong> {ruta.servicio_via}</p>
            </div>
          )}
          
          {ruta.tariff_type === 'AMERICA' && (
            <>
              <div className="mb-3 pb-3 border-bottom">
                <h6 className="text-primary mb-2">💰 Tarifas</h6>
                <div className="mb-2"><strong>OF W/M:</strong> {ruta.of_wm} {ruta.currency}</div>
                <div className="mb-2"><strong>OTHERS(*) W/M:</strong> {ruta.others_wm} {ruta.currency}</div>
              </div>
              <div className="mb-3 pb-3 border-bottom">
                <h6 className="text-primary mb-2">📋 Información Adicional</h6>
                {ruta.bl && <p className="mb-1"><strong>BL:</strong> {ruta.bl}</p>}
                {ruta.solas && <p className="mb-0"><strong>SOLAS:</strong> {ruta.solas}</p>}
              </div>
              <div>
                <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                <p className="mb-1">
                  <strong>Frecuencia:</strong>{' '}
                  <span className="badge bg-info text-dark">{ruta.frecuencia}</span>
                </p>
                {ruta.agente && <p className="mb-1"><strong>Agente:</strong> {ruta.agente}</p>}
                {ruta.tt_aprox && <p className="mb-0"><strong>TT Aprox:</strong> {ruta.tt_aprox}</p>}
              </div>
            </>
          )}
          
          {ruta.tariff_type === 'EUROPA' && (
            <>
              <div className="mb-3 pb-3 border-bottom">
                <h6 className="text-primary mb-2">💰 Tarifas</h6>
                <div className="mb-2"><strong>1-15 W/M:</strong> {ruta.wm_1_15} {ruta.currency}</div>
                <div className="mt-2">
                  <small className="text-info">
                    <i className="bi bi-info-circle"></i> Región EUROPA - Tarifa única
                  </small>
                </div>
              </div>
              <div>
                <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                <p className="mb-1">
                  <strong>Frecuencia:</strong>{' '}
                  <span className="badge bg-info text-dark">{ruta.frecuencia}</span>
                </p>
                {ruta.agente && <p className="mb-1"><strong>Agente:</strong> {ruta.agente}</p>}
                {ruta.tt_aprox && <p className="mb-0"><strong>TT Aprox:</strong> {ruta.tt_aprox}</p>}
              </div>
            </>
          )}
          
          {ruta.tariff_type === 'ASIA' && (
            <>
              <div className="mb-3 pb-3 border-bottom">
                <h6 className="text-primary mb-2">💰 Tarifas por Rango</h6>
                <div className="mb-2"><strong>1-5 W/M:</strong> {ruta.wm_1_5} {ruta.currency}</div>
                <div className="mb-2"><strong>5.01-10 W/M:</strong> {ruta.wm_5_10} {ruta.currency}</div>
                <div className="mb-2"><strong>10.01-15 W/M:</strong> {ruta.wm_10_15} {ruta.currency}</div>
                <div className="mt-2">
                  <small className="text-info">
                    <i className="bi bi-info-circle"></i> Región ASIA - Tarifas por rango de volumen
                  </small>
                </div>
              </div>
              <div>
                <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                <p className="mb-1">
                  <strong>Frecuencia:</strong>{' '}
                  <span className="badge bg-info text-dark">{ruta.frecuencia}</span>
                </p>
                {ruta.agente && <p className="mb-1"><strong>Agente:</strong> {ruta.agente}</p>}
                {ruta.tt_aprox && <p className="mb-0"><strong>TT Aprox:</strong> {ruta.tt_aprox}</p>}
              </div>
            </>
          )}
        </>
      );
    }

    // ========== ECU ==========
    else if (ruta.provider === 'ECU') {
      return (
        <>
          {(ruta.firstleg || ruta.ruta || ruta.servicio) && (
            <div className="mb-3 pb-3 border-bottom">
              <h6 className="text-primary mb-2">🚢 Información de Ruta</h6>
              {ruta.firstleg && <p className="mb-1"><strong>First Leg POL:</strong> {ruta.firstleg}</p>}
              {ruta.ruta && <p className="mb-1"><strong>Ruta:</strong> {ruta.ruta}</p>}
              {ruta.servicio && <p className="mb-0"><strong>Servicio:</strong> {ruta.servicio}</p>}
            </div>
          )}
          
          <div className="mb-3 pb-3 border-bottom">
            <h6 className="text-primary mb-2">💰 Tarifas</h6>
            <div className="mb-2">
              <strong>TON/M³ (01-15 CBM):</strong> {ruta.tonm3} {ruta.currency}
            </div>
            {ruta.tariff_type === 'EUROPA' && ruta.bl_remarks && (
              <div className="mt-2"><strong>BL / Remarks:</strong> <span className="text-muted">{ruta.bl_remarks}</span></div>
            )}
            {ruta.tariff_type === 'LATAM' && ruta.bl && (
              <div className="mt-2"><strong>BL:</strong> <span className="text-muted">{ruta.bl}</span></div>
            )}
          </div>
          
          <div>
            <h6 className="text-primary mb-2">⏱️ Tiempos</h6>
            {(ruta.tariff_type === 'EUROPA' || ruta.tariff_type === 'ASIA') && (
              <>
                <p className="mb-1">
                  <strong>TT Estimado:</strong>{' '}
                  <span className="badge bg-info text-dark">{ruta.tt_estimado} días</span>
                </p>
                {ruta.validity_etd && <p className="mb-0"><strong>Validity ETD:</strong> {ruta.validity_etd}</p>}
              </>
            )}
            {(ruta.tariff_type === 'USA_CAN' || ruta.tariff_type === 'LATAM') && (
              <p className="mb-0">
                <strong>Final TT:</strong>{' '}
                <span className="badge bg-info text-dark">{ruta.final_tt}</span>
              </p>
            )}
          </div>
        </>
      );
    }

    // ========== CTL / OVERSEAS / PLUSCARGO ==========
    else if (ruta.provider === 'CTL' || ruta.provider === 'OVERSEAS' || ruta.provider === 'PLUSCARGO') {
      return (
        <>
          {ruta.via && (
            <div className="mb-3 pb-3 border-bottom">
              <p className="mb-1">
                <strong>Vía/Transbordo:</strong>{' '}
                {ruta.via.toUpperCase().includes('DIRECT') ? (
                  <span className="badge bg-success">{ruta.via} ✓</span>
                ) : (
                  <span className="text-warning">{ruta.via}</span>
                )}
              </p>
            </div>
          )}
          <div className="mb-3 pb-3 border-bottom">
            <h6 className="text-primary mb-2">💰 Tarifas</h6>
            <div className="mb-2">
              <strong>Tarifa W/M:</strong> {ruta.of_wm} {ruta.currency}
            </div>
            <div>
              <strong>Tarifa Mínima:</strong> {ruta.of_min} {ruta.currency}
            </div>
          </div>
          <div>
            <h6 className="text-primary mb-2">⏱️ Servicio</h6>
            {ruta.frequency && (
              <p className="mb-1">
                <strong>Frecuencia:</strong>{' '}
                <span className="badge bg-info text-dark">{ruta.frequency}</span>
              </p>
            )}
            {ruta.transit_time && (
              <p className="mb-0">
                <strong>Tiempo de Tránsito:</strong> {ruta.transit_time} días
              </p>
            )}
          </div>
        </>
      );
    }

    return null;
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  const proveedoresDisponibles: Provider[] = [
    'MSL-IMPORT',
    'MSL-EXPORT',
    'CRAFT',
    'ECU',
    'CTL',
    'OVERSEAS',
    'PLUSCARGO',
  ];

  return (
    <div className="container mt-4 mb-5">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="fw-light">Cotizador Global de Rutas Marítimas</h1>
        <p className="text-muted">Sistema Unificado - Todos los Proveedores</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando tarifas...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Formulario Principal */}
      {!loading && !error && (
        <>
          {/* Selección POL y POD */}
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Puerto de Origen (POL)
                  </label>
                  <Select
                    options={opcionesPOL}
                    value={polSeleccionado}
                    onChange={handlePOLChange}
                    placeholder="Selecciona un puerto..."
                    isClearable
                    isSearchable
                    noOptionsMessage={() => 'No se encontraron puertos'}
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '45px',
                        borderColor: '#dee2e6',
                      })
                    }}
                  />
                  <small className="text-muted">
                    {opcionesPOL.length} puertos disponibles
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Puerto de Destino (POD)
                  </label>
                  <Select
                    options={opcionesPOD}
                    value={podSeleccionado}
                    onChange={handlePODChange}
                    placeholder={
                      polSeleccionado
                        ? 'Selecciona un destino...'
                        : 'Primero selecciona un POL'
                    }
                    isClearable
                    isSearchable
                    isDisabled={!polSeleccionado}
                    noOptionsMessage={() => 'No hay destinos'}
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '45px',
                        borderColor: '#dee2e6',
                      })
                    }}
                  />
                  <small className="text-muted">
                    {polSeleccionado
                      ? `${opcionesPOD.length} destino(s)`
                      : 'Selecciona POL primero'}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          {polSeleccionado && podSeleccionado && (
            <div className="card shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-semibold mb-3">
                      Filtrar por Proveedor:
                    </label>
                    <div className="row g-2">
                      {proveedoresDisponibles.map(provider => (
                        <div key={provider} className="col-md-4 col-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`check-${provider}`}
                              checked={proveedoresSeleccionados.has(provider)}
                              onChange={() => toggleProveedor(provider)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`check-${provider}`}
                            >
                              <span className={`badge bg-${PROVIDER_COLORS_MAP[provider]}`}>
                                {provider}
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold mb-3">
                      Ordenar por:
                    </label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="ordenar"
                        id="orden-precio"
                        checked={ordenarPor === 'precio'}
                        onChange={() => setOrdenarPor('precio')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="orden-precio">
                        💰 Precio
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="ordenar"
                        id="orden-tiempo"
                        checked={ordenarPor === 'tiempo'}
                        onChange={() => setOrdenarPor('tiempo')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="orden-tiempo">
                        ⏱️ Tiempo
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultados */}
          {rutasFiltradas.length > 0 && (
            <div>
              <h4 className="mb-3">
                Rutas Disponibles ({rutasFiltradas.length})
              </h4>

              <div className="row g-4">
                {rutasFiltradas.map((ruta) => (
                  <div key={ruta.id} className="col-12 col-lg-6">
                    <div className="card h-100 shadow-sm">
                      <div className="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 className="card-title mb-0">
                          {ruta.pol} → {ruta.pod}
                        </h5>
                        <span className={`badge bg-${PROVIDER_COLORS_MAP[ruta.provider]}`}>
                          {ruta.provider}
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          {'country' in ruta && ruta.country && (
                            <p className="mb-1">
                              <strong>País:</strong> {ruta.country}
                            </p>
                          )}
                          <p className="mb-1">
                            <strong>Región:</strong>{' '}
                            <span className="badge bg-secondary">{ruta.region}</span>
                          </p>
                        </div>

                        {renderRutaContent(ruta)}
                      </div>
                      <div className="card-footer">
                        <button
                          type="button"
                          className="btn btn-primary w-100"
                          onClick={() => handleCotizar(ruta)}
                        >
                          Cotizar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sin resultados */}
          {polSeleccionado && podSeleccionado && rutasFiltradas.length === 0 && (
            <div className="text-center text-muted mt-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" className="bi bi-search mb-3" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <p>No se encontraron rutas con los filtros seleccionados</p>
              <small>Intenta activar más proveedores</small>
            </div>
          )}

          {/* Mensaje inicial */}
          {!polSeleccionado && (
            <div className="text-center text-muted mt-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" className="bi bi-ship mb-3" viewBox="0 0 16 16">
                <path d="M3 5a2 2 0 0 0-2 2v2h2a2 2 0 0 1 2 2 2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1 2-2h2V7a2 2 0 0 0-2-2H3z"/>
                <path d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-2A1.5 1.5 0 0 0 13.5 10h-11A1.5 1.5 0 0 0 1 11.5v2z"/>
              </svg>
              <p>Selecciona un puerto de origen para comenzar</p>
            </div>
          )}
        </>
      )}

      {/* Modal de Cotización */}
      <Modal
        isOpen={modalAbierto}
        onClose={handleCerrarModal}
        title={`Cotización LCL: ${rutaSeleccionada?.pol} → ${rutaSeleccionada?.pod}`}
      >
        {rutaSeleccionada && (
          <div className="cotizacion-detalle">
            {/* Header */}
            <div className="mb-4 pb-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  {rutaSeleccionada.pol} → {rutaSeleccionada.pod}
                </h5>
                <span className={`badge bg-${PROVIDER_COLORS_MAP[rutaSeleccionada.provider]}`}>
                  {rutaSeleccionada.provider}
                </span>
              </div>
              <div className="mt-2">
                <small className="text-muted">Región: </small>
                <span className="badge bg-secondary">{rutaSeleccionada.region}</span>
                {'country' in rutaSeleccionada && rutaSeleccionada.country && (
                  <>
                    <small className="text-muted ms-3">País: </small>
                    <span>{rutaSeleccionada.country}</span>
                  </>
                )}
              </div>
            </div>

            {/* Contenido del Modal - Reutilizar la función renderRutaContent */}
            {renderRutaContent(rutaSeleccionada)}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CotizadorGlobal;