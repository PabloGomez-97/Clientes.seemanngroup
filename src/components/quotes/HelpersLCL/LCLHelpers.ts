// ============================================================================
// LCLHelpers.ts - Funciones Helper y Lógica de Negocio para LCL
// ============================================================================

import type { Ruta } from './Types';

// ============================================================================
// TIPOS ESPECÍFICOS PARA LCL
// ============================================================================

export interface TarifaCalculada {
  precio: number;
  divisa: string;
  precioConMarkup: number;
  volumenUsado: number;
  rangoAplicado?: string;
  minimoAplicado: boolean;
}

// ============================================================================
// FUNCIONES DE EXTRACCIÓN DE DATOS
// ============================================================================

/**
 * Extrae la divisa de una ruta LCL
 */
export const getCurrency = (ruta: Ruta): string => {
  if ('currency' in ruta && ruta.currency) {
    return ruta.currency;
  }
  return 'USD';
};

/**
 * Obtiene el volumen chargeable (mayor entre peso y volumen)
 * En LCL se compara numéricamente: el mayor número gana
 */
export const getChargeableVolume = (pesoToneladas: number, volumenM3: number): number => {
  return Math.max(pesoToneladas, volumenM3);
};

/**
 * Convierte kg a toneladas
 */
export const kgToTons = (kg: number): number => {
  return kg / 1000;
};

// ============================================================================
// CÁLCULO DE TARIFAS POR PROVEEDOR
// ============================================================================

/**
 * Calcula la tarifa de OCEAN FREIGHT según el proveedor y sus rangos
 */
export const calcularOceanFreight = (ruta: Ruta, volumenM3: number): TarifaCalculada => {
  const divisa = getCurrency(ruta);
  
  // ========== MSL-IMPORT ==========
  if (ruta.provider === 'MSL-IMPORT') {
    const tarifaWM = typeof ruta.of_wm === 'number' ? ruta.of_wm : parseFloat(ruta.of_wm.toString()) || 0;
    const tarifaMin = typeof ruta.of_min === 'number' ? ruta.of_min : parseFloat(ruta.of_min.toString()) || 0;
    
    const precioCalculado = tarifaWM * volumenM3;
    const precio = Math.max(precioCalculado, tarifaMin);
    const minimoAplicado = precio === tarifaMin && precioCalculado < tarifaMin;
    
    return {
      precio,
      divisa,
      precioConMarkup: precio * 1.15,
      volumenUsado: volumenM3,
      rangoAplicado: 'W/M',
      minimoAplicado
    };
  }
  
  // ========== MSL-EXPORT ==========
  else if (ruta.provider === 'MSL-EXPORT') {
    const tarifaWM = typeof ruta.of_wm === 'number' ? ruta.of_wm : parseFloat(ruta.of_wm.toString()) || 0;
    const tarifaMin = typeof ruta.of_min === 'number' ? ruta.of_min : parseFloat(ruta.of_min.toString()) || 0;
    
    const precioCalculado = tarifaWM * volumenM3;
    const precio = Math.max(precioCalculado, tarifaMin);
    const minimoAplicado = precio === tarifaMin && precioCalculado < tarifaMin;
    
    return {
      precio,
      divisa,
      precioConMarkup: precio * 1.15,
      volumenUsado: volumenM3,
      rangoAplicado: 'W/M',
      minimoAplicado
    };
  }
  
  // ========== CRAFT ==========
  else if (ruta.provider === 'CRAFT') {
    // CRAFT AMERICA
    if (ruta.tariff_type === 'AMERICA') {
      const tarifaWM = typeof ruta.of_wm === 'number' ? ruta.of_wm : parseFloat(ruta.of_wm.toString()) || 0;
      const precio = tarifaWM * volumenM3;
      
      return {
        precio,
        divisa,
        precioConMarkup: precio * 1.15,
        volumenUsado: volumenM3,
        rangoAplicado: 'W/M',
        minimoAplicado: false
      };
    }
    
    // CRAFT EUROPA
    else if (ruta.tariff_type === 'EUROPA') {
      const tarifaWM = typeof ruta.wm_1_15 === 'number' ? ruta.wm_1_15 : parseFloat(ruta.wm_1_15.toString()) || 0;
      const precio = tarifaWM * volumenM3;
      
      return {
        precio,
        divisa,
        precioConMarkup: precio * 1.15,
        volumenUsado: volumenM3,
        rangoAplicado: '1-15 W/M',
        minimoAplicado: false
      };
    }
    
    // CRAFT ASIA - Rangos múltiples
    else if (ruta.tariff_type === 'ASIA') {
      let tarifaAplicable = 0;
      let rangoAplicado = '';
      
      if (volumenM3 <= 5) {
        tarifaAplicable = typeof ruta.wm_1_5 === 'number' ? ruta.wm_1_5 : parseFloat(ruta.wm_1_5.toString()) || 0;
        rangoAplicado = '1-5 W/M';
      } else if (volumenM3 <= 10) {
        tarifaAplicable = typeof ruta.wm_5_10 === 'number' ? ruta.wm_5_10 : parseFloat(ruta.wm_5_10.toString()) || 0;
        rangoAplicado = '5-10 W/M';
      } else {
        tarifaAplicable = typeof ruta.wm_10_15 === 'number' ? ruta.wm_10_15 : parseFloat(ruta.wm_10_15.toString()) || 0;
        rangoAplicado = '10-15 W/M';
      }
      
      const precio = tarifaAplicable * volumenM3;
      
      return {
        precio,
        divisa,
        precioConMarkup: precio * 1.15,
        volumenUsado: volumenM3,
        rangoAplicado,
        minimoAplicado: false
      };
    }
  }
  
  // ========== ECU ==========
  else if (ruta.provider === 'ECU') {
    const tarifaTONM3 = typeof ruta.tonm3 === 'number' ? ruta.tonm3 : parseFloat(ruta.tonm3.toString()) || 0;
    const precio = tarifaTONM3 * volumenM3;
    
    return {
      precio,
      divisa,
      precioConMarkup: precio * 1.15,
      volumenUsado: volumenM3,
      rangoAplicado: 'TON/M³ (01-15 CBM)',
      minimoAplicado: false
    };
  }
  
  // ========== CTL / OVERSEAS / PLUSCARGO ==========
  else if (ruta.provider === 'CTL' || ruta.provider === 'OVERSEAS' || ruta.provider === 'PLUSCARGO') {
    const tarifaWM = typeof ruta.of_wm === 'number' ? ruta.of_wm : parseFloat(ruta.of_wm.toString()) || 0;
    const tarifaMin = typeof ruta.of_min === 'number' ? ruta.of_min : parseFloat(ruta.of_min.toString()) || 0;
    
    const precioCalculado = tarifaWM * volumenM3;
    const precio = Math.max(precioCalculado, tarifaMin);
    const minimoAplicado = precio === tarifaMin && precioCalculado < tarifaMin;
    
    return {
      precio,
      divisa,
      precioConMarkup: precio * 1.15,
      volumenUsado: volumenM3,
      rangoAplicado: 'W/M',
      minimoAplicado
    };
  }
  
  // Fallback
  return {
    precio: 0,
    divisa: 'USD',
    precioConMarkup: 0,
    volumenUsado: volumenM3,
    rangoAplicado: 'N/A',
    minimoAplicado: false
  };
};

// ============================================================================
// FUNCIONES PARA OBTENER INFORMACIÓN DE LA RUTA
// ============================================================================

/**
 * Obtiene el transit time de una ruta
 */
export const getTransitTime = (ruta: Ruta): string => {
  if (ruta.provider === 'MSL-IMPORT' || ruta.provider === 'MSL-EXPORT' || 
      ruta.provider === 'CTL' || ruta.provider === 'OVERSEAS' || ruta.provider === 'PLUSCARGO') {
    return ruta.transit_time ? `${ruta.transit_time} días` : 'N/A';
  }
  
  if (ruta.provider === 'CRAFT') {
    return ruta.tt_aprox || 'N/A';
  }
  
  if (ruta.provider === 'ECU') {
    if (ruta.tariff_type === 'EUROPA' || ruta.tariff_type === 'ASIA') {
      return ruta.tt_estimado ? `${ruta.tt_estimado} días` : 'N/A';
    } else {
      return ruta.final_tt ? `${ruta.final_tt}` : 'N/A';
    }
  }
  
  return 'N/A';
};

/**
 * Obtiene la frecuencia de una ruta
 */
export const getFrequency = (ruta: Ruta): string => {
  if (ruta.provider === 'MSL-IMPORT' || ruta.provider === 'MSL-EXPORT' || 
      ruta.provider === 'CTL' || ruta.provider === 'OVERSEAS' || ruta.provider === 'PLUSCARGO') {
    return ruta.frequency || 'N/A';
  }
  
  if (ruta.provider === 'CRAFT') {
    return ruta.frecuencia || 'N/A';
  }
  
  return 'N/A';
};

/**
 * Obtiene información de via/transbordo de una ruta
 */
export const getViaInfo = (ruta: Ruta): string | null => {
  if (ruta.provider === 'MSL-IMPORT' && ruta.tariff_type === 'ASIA') {
    return ruta.via || null;
  }
  
  if (ruta.provider === 'MSL-EXPORT') {
    return ruta.via || null;
  }
  
  if (ruta.provider === 'CTL' || ruta.provider === 'OVERSEAS' || ruta.provider === 'PLUSCARGO') {
    return ruta.via || null;
  }
  
  if (ruta.provider === 'CRAFT') {
    return ruta.servicio_via || null;
  }
  
  if (ruta.provider === 'ECU') {
    return ruta.ruta || null;
  }
  
  return null;
};

/**
 * Obtiene información adicional de la ruta para mostrar en el payload
 */
export const getRutaInfo = (ruta: Ruta): Record<string, any> => {
  const info: Record<string, any> = {};
  
  // Provider
  info.provider = ruta.provider;
  
  // Region
  info.region = ruta.region;
  
  // Country (si existe)
  if ('country' in ruta && ruta.country) {
    info.country = ruta.country;
  }
  
  // Via/Transbordo
  const via = getViaInfo(ruta);
  if (via) {
    info.via = via;
  }
  
  // Transit Time
  info.transitTime = getTransitTime(ruta);
  
  // Frequency
  const frequency = getFrequency(ruta);
  if (frequency !== 'N/A') {
    info.frequency = frequency;
  }
  
  // Información específica por proveedor
  if (ruta.provider === 'MSL-IMPORT' || ruta.provider === 'MSL-EXPORT') {
    if ('service' in ruta && ruta.service) {
      info.service = ruta.service;
    }
    if ('agente' in ruta && ruta.agente) {
      info.agente = ruta.agente;
    }
    if ('observaciones' in ruta && ruta.observaciones) {
      info.observaciones = ruta.observaciones;
    }
    if ('remarks' in ruta && ruta.remarks) {
      info.remarks = ruta.remarks;
    }
  }
  
  if (ruta.provider === 'CRAFT') {
    if (ruta.agente) {
      info.agente = ruta.agente;
    }
  }
  
  if (ruta.provider === 'ECU') {
    if (ruta.firstleg) {
      info.firstleg = ruta.firstleg;
    }
    if (ruta.servicio) {
      info.servicio = ruta.servicio;
    }
  }
  
  return info;
};

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Valida que los datos del commodity sean correctos
 */
export const validarCommodity = (
  peso: number,
  volumen: number,
  pieces: number
): { valid: boolean; error?: string } => {
  if (pieces < 1) {
    return { valid: false, error: 'El número de piezas debe ser al menos 1' };
  }
  
  if (peso <= 0) {
    return { valid: false, error: 'El peso debe ser mayor a 0' };
  }
  
  if (volumen <= 0) {
    return { valid: false, error: 'El volumen debe ser mayor a 0' };
  }
  
  return { valid: true };
};

// ============================================================================
// FUNCIONES HELPER PARA DISPLAY
// ============================================================================

/**
 * Formatea un precio con su divisa
 */
export const formatPrice = (precio: number, divisa: string): string => {
  return `${divisa} ${precio.toFixed(2)}`;
};

/**
 * Obtiene el color del badge según el proveedor
 */
export const getProviderColor = (provider: string): string => {
  const colors: Record<string, string> = {
    'MSL-IMPORT': 'primary',
    'MSL-EXPORT': 'dark',
    'CRAFT': 'success',
    'ECU': 'warning',
    'CTL': 'danger',
    'OVERSEAS': 'info',
    'PLUSCARGO': 'secondary'
  };
  
  return colors[provider] || 'secondary';
};