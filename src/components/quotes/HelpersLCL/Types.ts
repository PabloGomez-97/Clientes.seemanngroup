// ============================================================================
// TYPES.TS - Interfaces y Tipos para CotizadorGlobal
// ============================================================================

export type TipoOperacion = 'IMPORTACION' | 'EXPORTACION';
export type Provider = 'MSL-IMPORT' | 'MSL-EXPORT' | 'CRAFT' | 'ECU' | 'CTL' | 'OVERSEAS' | 'PLUSCARGO';

export interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// MSL-IMPORT INTERFACES
// ============================================================================

interface RutaBaseMSLIMPORT {
  id: string;
  provider: 'MSL-IMPORT';
  region: string;
  country: string;
  pol: string;
  pod: string;
  row_number: number;
}

export interface RutaMSLIMPORTAsia extends RutaBaseMSLIMPORT {
  tariff_type: 'ASIA';
  of_wm: number | string;
  of_min: number | string;
  frequency: string;
  transit_time: number | string;
  via: string;
  currency: string;
}

export interface RutaMSLIMPORTEuropa extends RutaBaseMSLIMPORT {
  tariff_type: 'EUROPA';
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  otros: string;
  service: string;
  agente: string;
  observaciones: string;
}

export interface RutaMSLIMPORTNorteAmerica extends RutaBaseMSLIMPORT {
  tariff_type: 'NORTEAMERICA';
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  otros: string;
  service: string;
  agente: string;
}

export interface RutaMSLIMPORTAmerica extends RutaBaseMSLIMPORT {
  tariff_type: 'AMERICA';
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  otros: string;
  service: string;
  agente: string;
  observaciones: string;
}

export type RutaMSLIMPORT = RutaMSLIMPORTAsia | RutaMSLIMPORTEuropa | RutaMSLIMPORTNorteAmerica | RutaMSLIMPORTAmerica;

// ============================================================================
// MSL-EXPORT INTERFACES
// ============================================================================

interface RutaBaseMSLEXPORT {
  id: string;
  provider: 'MSL-EXPORT';
  region: string;
  country: string;
  pol: string;
  pod: string;
  row_number: number;
}

export interface RutaMSLEXPORTAmerica extends RutaBaseMSLEXPORT {
  tariff_type: 'AMERICA';
  via: string;
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  remarks: string;
}

export type RutaMSLEXPORT = RutaMSLEXPORTAmerica;

// ============================================================================
// CRAFT INTERFACES
// ============================================================================

interface RutaBaseCRAFT {
  id: string;
  provider: 'CRAFT';
  region: string;
  pol: string;
  servicio_via: string;
  pod: string;
  currency: string;
  frecuencia: string;
  agente: string;
  tt_aprox: string;
  row_number: number;
}

export interface RutaCRAFTAmerica extends RutaBaseCRAFT {
  tariff_type: 'AMERICA';
  of_wm: number | string;
  others_wm: number | string;
  bl: string;
  solas: string;
}

export interface RutaCRAFTEuropa extends RutaBaseCRAFT {
  tariff_type: 'EUROPA';
  wm_1_15: number | string;
}

export interface RutaCRAFTAsia extends RutaBaseCRAFT {
  tariff_type: 'ASIA';
  wm_1_5: number | string;
  wm_5_10: number | string;
  wm_10_15: number | string;
}

export type RutaCRAFT = RutaCRAFTAmerica | RutaCRAFTEuropa | RutaCRAFTAsia;

// ============================================================================
// ECU INTERFACES
// ============================================================================

interface RutaBaseECU {
  id: string;
  provider: 'ECU';
  region: string;
  country: string;
  firstleg: string;
  pol: string;
  ruta: string;
  pod: string;
  servicio: string;
  currency: string;
  tonm3: number | string;
  row_number: number;
}

export interface RutaECUEuropa extends RutaBaseECU {
  tariff_type: 'EUROPA';
  bl_remarks: string;
  tt_estimado: number | string;
  validity_etd: string;
}

export interface RutaECUAsia extends RutaBaseECU {
  tariff_type: 'ASIA';
  tt_estimado: number | string;
  validity_etd: string;
}

export interface RutaECUUSACAN extends RutaBaseECU {
  tariff_type: 'USA_CAN';
  final_tt: string;
}

export interface RutaECULATAM extends RutaBaseECU {
  tariff_type: 'LATAM';
  bl: string;
  final_tt: number | string;
}

export type RutaECU = RutaECUEuropa | RutaECUAsia | RutaECUUSACAN | RutaECULATAM;

// ============================================================================
// CTL INTERFACES
// ============================================================================

interface RutaBaseCTL {
  id: string;
  provider: 'CTL';
  region: string;
  country: string;
  pol: string;
  pod: string;
  via: string;
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  row_number: number;
}

export interface RutaCTLAmerica extends RutaBaseCTL {
  tariff_type: 'AMERICA';
}

export interface RutaCTLEuropa extends RutaBaseCTL {
  tariff_type: 'EUROPA';
}

export type RutaCTL = RutaCTLAmerica | RutaCTLEuropa;

// ============================================================================
// OVERSEAS INTERFACES
// ============================================================================

interface RutaBaseOVERSEAS {
  id: string;
  provider: 'OVERSEAS';
  region: string;
  country: string;
  pol: string;
  pod: string;
  via: string;
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  row_number: number;
}

export interface RutaOVERSEASAmerica extends RutaBaseOVERSEAS {
  tariff_type: 'AMERICA';
}

export type RutaOVERSEAS = RutaOVERSEASAmerica;

// ============================================================================
// PLUSCARGO INTERFACES
// ============================================================================

interface RutaBasePLUSCARGO {
  id: string;
  provider: 'PLUSCARGO';
  region: string;
  country: string;
  pol: string;
  pod: string;
  via: string;
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  row_number: number;
}

export interface RutaPLUSCARGOAmerica extends RutaBasePLUSCARGO {
  tariff_type: 'AMERICA';
}

export interface RutaPLUSCARGOEuropa extends RutaBasePLUSCARGO {
  tariff_type: 'EUROPA';
}

export type RutaPLUSCARGO = RutaPLUSCARGOAmerica | RutaPLUSCARGOEuropa;

// ============================================================================
// UNION TYPE - Todas las rutas
// ============================================================================

export type Ruta = 
  | RutaMSLIMPORT 
  | RutaMSLEXPORT 
  | RutaCRAFT 
  | RutaECU 
  | RutaCTL 
  | RutaOVERSEAS 
  | RutaPLUSCARGO;

// ============================================================================
// CONFIGURACIÓN DE COLORES POR PROVEEDOR
// ============================================================================

export const PROVIDER_COLORS: Record<Provider, string> = {
  'MSL-IMPORT': 'primary',
  'MSL-EXPORT': 'purple',
  'CRAFT': 'success',
  'ECU': 'warning',
  'CTL': 'danger',
  'OVERSEAS': 'info',
  'PLUSCARGO': 'secondary'
};

// ============================================================================
// HELPER FUNCTIONS PARA EXTRACCIÓN DE DATOS
// ============================================================================

export const getPriceForComparison = (ruta: Ruta): number => {
  switch (ruta.provider) {
    case 'MSL-IMPORT':
    case 'MSL-EXPORT':
    case 'CTL':
    case 'OVERSEAS':
    case 'PLUSCARGO':
      const price = ruta.of_wm;
      return typeof price === 'number' ? price : parseFloat(price.toString()) || 0;

    case 'CRAFT':
      if (ruta.tariff_type === 'AMERICA') {
        const p = ruta.of_wm;
        return typeof p === 'number' ? p : parseFloat(p.toString()) || 0;
      } else if (ruta.tariff_type === 'EUROPA') {
        const p = ruta.wm_1_15;
        return typeof p === 'number' ? p : parseFloat(p.toString()) || 0;
      } else {
        const p = ruta.wm_1_5;
        return typeof p === 'number' ? p : parseFloat(p.toString()) || 0;
      }

    case 'ECU':
      const tonm3 = ruta.tonm3;
      return typeof tonm3 === 'number' ? tonm3 : parseFloat(tonm3.toString()) || 0;

    default:
      return 0;
  }
};

export const getTransitTimeForComparison = (ruta: Ruta): number => {
  let tt: any = 0;

  switch (ruta.provider) {
    case 'MSL-IMPORT':
    case 'MSL-EXPORT':
    case 'CTL':
    case 'OVERSEAS':
    case 'PLUSCARGO':
      tt = ruta.transit_time;
      break;

    case 'CRAFT':
      tt = ruta.tt_aprox;
      break;

    case 'ECU':
      if (ruta.tariff_type === 'EUROPA' || ruta.tariff_type === 'ASIA') {
        tt = ruta.tt_estimado;
      } else {
        tt = ruta.final_tt;
      }
      break;

    default:
      return 0;
  }

  if (typeof tt === 'number') return tt;
  if (typeof tt === 'string') {
    const parsed = parseFloat(tt.toString().replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};