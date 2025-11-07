// ============================================================================
// PARSERS.TS - Funciones de Parseo para cada Proveedor
// ============================================================================

import type {
  RutaMSLIMPORT,
  RutaMSLEXPORT,
  RutaCRAFT,
  RutaECU,
  RutaCTL,
  RutaOVERSEAS,
  RutaPLUSCARGO,
} from './Types';

// ============================================================================
// MSL-IMPORT PARSER
// ============================================================================

export const parseMSLIMPORT = (data: any[]): RutaMSLIMPORT[] => {
  const rutas: RutaMSLIMPORT[] = [];
  let idCounter = 1;

  const regiones = [
    { nombre: 'ASIA', inicio: 2, fin: 62, type: 'ASIA' as const },
    { nombre: 'EUROPA', inicio: 65, fin: 100, type: 'EUROPA' as const },
    { nombre: 'NORTEAMERICA', inicio: 104, fin: 122, type: 'NORTEAMERICA' as const },
    { nombre: 'AMERICA', inicio: 125, fin: 134, type: 'AMERICA' as const },
  ];

  regiones.forEach(region => {
    for (let i = region.inicio; i <= region.fin; i++) {
      const row: any = data[i];
      if (!row) continue;

      const country = row[1];
      const pol = row[2];
      const pod = row[3];
      const of_wm = row[4];
      const of_min = row[5];

      if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
        
        // REGIÓN ASIA
        if (region.type === 'ASIA') {
          const frequency = row[6];
          const tt = row[7];
          const via = row[8];
          const currency = row[9];

          rutas.push({
            id: `MSL-IMPORT-${idCounter++}`,
            provider: 'MSL-IMPORT',
            region: region.nombre,
            country: country || '',
            pol: pol.trim(),
            pod: pod.trim(),
            via: via || '',
            tariff_type: 'ASIA',
            of_wm: of_wm || 0,
            of_min: of_min || 0,
            currency: currency || 'USD',
            frequency: frequency || '',
            transit_time: tt || 0,
            row_number: i + 1
          });
        }
        
        // REGIÓN EUROPA
        else if (region.type === 'EUROPA') {
          const tt = row[6];
          const frequency = row[7];
          const otros = row[8];
          const service = row[9];
          const agente = row[10];
          const observaciones = row[11];
          const currency = row[12];

          rutas.push({
            id: `MSL-IMPORT-${idCounter++}`,
            provider: 'MSL-IMPORT',
            region: region.nombre,
            country: country || '',
            pol: pol.trim(),
            pod: pod.trim(),
            tariff_type: 'EUROPA',
            of_wm: of_wm || 0,
            of_min: of_min || 0,
            currency: currency || 'USD',
            frequency: frequency || '',
            transit_time: tt || 0,
            otros: otros || '',
            service: service || '',
            agente: agente || '',
            observaciones: observaciones || '',
            row_number: i + 1
          });
        }
        
        // REGIÓN NORTEAMERICA
        else if (region.type === 'NORTEAMERICA') {
          const tt = row[6];
          const frequency = row[7];
          const otros = row[8];
          const service = row[9];
          const agente = row[10];
          const currency = row[11];

          rutas.push({
            id: `MSL-IMPORT-${idCounter++}`,
            provider: 'MSL-IMPORT',
            region: region.nombre,
            country: country || '',
            pol: pol.trim(),
            pod: pod.trim(),
            tariff_type: 'NORTEAMERICA',
            of_wm: of_wm || 0,
            of_min: of_min || 0,
            currency: currency || 'USD',
            frequency: frequency || '',
            transit_time: tt || 0,
            otros: otros || '',
            service: service || '',
            agente: agente || '',
            row_number: i + 1
          });
        }
        
        // REGIÓN AMERICA
        else if (region.type === 'AMERICA') {
          const tt = row[6];
          const frequency = row[7];
          const otros = row[8];
          const service = row[9];
          const agente = row[10];
          const observaciones = row[11];
          const currency = row[12];

          rutas.push({
            id: `MSL-IMPORT-${idCounter++}`,
            provider: 'MSL-IMPORT',
            region: region.nombre,
            country: country || '',
            pol: pol.trim(),
            pod: pod.trim(),
            tariff_type: 'AMERICA',
            of_wm: of_wm || 0,
            of_min: of_min || 0,
            currency: currency || 'USD',
            frequency: frequency || '',
            transit_time: tt || 0,
            otros: otros || '',
            service: service || '',
            agente: agente || '',
            observaciones: observaciones || '',
            row_number: i + 1
          });
        }
      }
    }
  });

  return rutas;
};

// ============================================================================
// MSL-EXPORT PARSER
// ============================================================================

export const parseMSLEXPORT = (data: any[]): RutaMSLEXPORT[] => {
  const rutas: RutaMSLEXPORT[] = [];
  let idCounter = 1;

  for (let i = 2; i <= 470; i++) {
    const row: any = data[i];
    if (!row) continue;

    const country = row[1];
    const pol = row[2];
    const pod = row[3];
    const via = row[4];
    const of_wm = row[5];
    const of_min = row[10];
    const currency = row[7];
    const frequency = row[8];
    const tt = row[9];
    const remarks = row[11];

    if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
      rutas.push({
        id: `MSL-EXPORT-${idCounter++}`,
        provider: 'MSL-EXPORT',
        region: 'AMERICA',
        country: country || '',
        pol: pol.trim(),
        pod: pod.trim(),
        tariff_type: 'AMERICA',
        via: via || '',
        of_wm: of_wm || 0,
        of_min: of_min || 0,
        currency: currency || 'USD',
        frequency: frequency || '',
        transit_time: tt || 0,
        remarks: remarks || '',
        row_number: i + 1
      });
    }
  }

  return rutas;
};

// ============================================================================
// CRAFT PARSER
// ============================================================================

export const parseCRAFT = (data: any[]): RutaCRAFT[] => {
  const rutas: RutaCRAFT[] = [];
  let idCounter = 1;

  const regiones = [
    { nombre: 'AMERICA', inicio: 2, fin: 40, type: 'AMERICA' as const },
    { nombre: 'EUROPA', inicio: 43, fin: 145, type: 'EUROPA' as const },
    { nombre: 'ASIA', inicio: 149, fin: 240, type: 'ASIA' as const },
  ];

  regiones.forEach(region => {
    for (let i = region.inicio; i <= region.fin; i++) {
      const row: any = data[i];
      if (!row) continue;

      const pol = row[1];
      const servicio_via = row[2];
      const pod = row[3];

      if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
        
        // REGIÓN AMERICA
        if (region.type === 'AMERICA') {
          const of_wm = row[4];
          const others_wm = row[5];
          const currency = row[6];
          const bl = row[7];
          const solas = row[8];
          const frecuencia = row[9];
          const agente = row[10];
          const tt_aprox = row[11];

          rutas.push({
            id: `CRAFT-${idCounter++}`,
            provider: 'CRAFT',
            region: region.nombre,
            pol: pol.trim(),
            servicio_via: servicio_via || '',
            pod: pod.trim(),
            tariff_type: 'AMERICA',
            of_wm: of_wm || 0,
            others_wm: others_wm || 0,
            currency: currency || 'USD',
            bl: bl || '',
            solas: solas || '',
            frecuencia: frecuencia || '',
            agente: agente || '',
            tt_aprox: tt_aprox || '',
            row_number: i + 1
          });
        }
        
        // REGIÓN EUROPA
        else if (region.type === 'EUROPA') {
          const wm_1_15 = row[4];
          const currency = row[5];
          const frecuencia = row[6];
          const agente = row[7];
          const tt_aprox = row[8];

          rutas.push({
            id: `CRAFT-${idCounter++}`,
            provider: 'CRAFT',
            region: region.nombre,
            pol: pol.trim(),
            servicio_via: servicio_via || '',
            pod: pod.trim(),
            tariff_type: 'EUROPA',
            wm_1_15: wm_1_15 || 0,
            currency: currency || 'EUR',
            frecuencia: frecuencia || '',
            agente: agente || '',
            tt_aprox: tt_aprox || '',
            row_number: i + 1
          });
        }
        
        // REGIÓN ASIA
        else if (region.type === 'ASIA') {
          const wm_1_5 = row[4];
          const wm_5_10 = row[5];
          const wm_10_15 = row[6];
          const currency = row[7];
          const frecuencia = row[8];
          const agente = row[9];
          const tt_aprox = row[10];

          rutas.push({
            id: `CRAFT-${idCounter++}`,
            provider: 'CRAFT',
            region: region.nombre,
            pol: pol.trim(),
            servicio_via: servicio_via || '',
            pod: pod.trim(),
            tariff_type: 'ASIA',
            wm_1_5: wm_1_5 || 0,
            wm_5_10: wm_5_10 || 0,
            wm_10_15: wm_10_15 || 0,
            currency: currency || 'USD',
            frecuencia: frecuencia || '',
            agente: agente || '',
            tt_aprox: tt_aprox || '',
            row_number: i + 1
          });
        }
      }
    }
  });

  return rutas;
};

// ============================================================================
// ECU PARSER
// ============================================================================

export const parseECU = (data: any[]): RutaECU[] => {
  const rutas: RutaECU[] = [];
  let idCounter = 1;

  const regiones = [
    { nombre: 'EUROPA', inicio: 2, fin: 31, type: 'EUROPA' as const },
    { nombre: 'ASIA', inicio: 34, fin: 82, type: 'ASIA' as const },
    { nombre: 'USA_CAN', inicio: 85, fin: 109, type: 'USA_CAN' as const },
    { nombre: 'LATAM', inicio: 112, fin: 116, type: 'LATAM' as const },
  ];

  regiones.forEach(region => {
    for (let i = region.inicio; i <= region.fin; i++) {
      const row: any = data[i];
      if (!row) continue;

      const country = row[1];
      const pol = row[2];
      const firstleg = row[3];
      const ruta = row[4];
      const pod = row[5];
      const servicio = row[6];
      const currency = row[7];
      const tonm3 = row[8];

      if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
        
        // REGIÓN EUROPA
        if (region.type === 'EUROPA') {
          const bl_remarks = row[9];
          const tt_estimado = row[10];
          const validity_etd = row[11];

          rutas.push({
            id: `ECU-${idCounter++}`,
            provider: 'ECU',
            region: region.nombre,
            country: country || '',
            firstleg: firstleg || '',
            pol: pol.trim(),
            ruta: ruta || '',
            pod: pod.trim(),
            servicio: servicio || '',
            currency: currency || 'EUR',
            tonm3: tonm3 || 0,
            tariff_type: 'EUROPA',
            bl_remarks: bl_remarks || '',
            tt_estimado: tt_estimado || 0,
            validity_etd: validity_etd || '',
            row_number: i + 1
          });
        }
        
        // REGIÓN ASIA
        else if (region.type === 'ASIA') {
          const tt_estimado = row[9];
          const validity_etd = row[10];

          rutas.push({
            id: `ECU-${idCounter++}`,
            provider: 'ECU',
            region: region.nombre,
            country: country || '',
            firstleg: firstleg || '',
            pol: pol.trim(),
            ruta: ruta || '',
            pod: pod.trim(),
            servicio: servicio || '',
            currency: currency || 'USD',
            tonm3: tonm3 || 0,
            tariff_type: 'ASIA',
            tt_estimado: tt_estimado || 0,
            validity_etd: validity_etd || '',
            row_number: i + 1
          });
        }
        
        // REGIÓN USA_CAN
        else if (region.type === 'USA_CAN') {
          const final_tt = row[9];

          rutas.push({
            id: `ECU-${idCounter++}`,
            provider: 'ECU',
            region: region.nombre,
            country: country || '',
            firstleg: firstleg || '',
            pol: pol.trim(),
            ruta: ruta || '',
            pod: pod.trim(),
            servicio: servicio || '',
            currency: currency || 'USD',
            tonm3: tonm3 || 0,
            tariff_type: 'USA_CAN',
            final_tt: final_tt || '',
            row_number: i + 1
          });
        }
        
        // REGIÓN LATAM
        else if (region.type === 'LATAM') {
          const bl = row[9];
          const final_tt = row[10];

          rutas.push({
            id: `ECU-${idCounter++}`,
            provider: 'ECU',
            region: region.nombre,
            country: country || '',
            firstleg: firstleg || '',
            pol: pol.trim(),
            ruta: ruta || '',
            pod: pod.trim(),
            servicio: servicio || '',
            currency: currency || 'USD',
            tonm3: tonm3 || 0,
            tariff_type: 'LATAM',
            bl: bl || '',
            final_tt: final_tt || 0,
            row_number: i + 1
          });
        }
      }
    }
  });

  return rutas;
};

// ============================================================================
// CTL PARSER
// ============================================================================

export const parseCTL = (data: any[]): RutaCTL[] => {
  const rutas: RutaCTL[] = [];
  let idCounter = 1;

  const regiones = [
    { nombre: 'AMERICA', inicio: 10, fin: 17, type: 'AMERICA' as const },
    { nombre: 'EUROPA', inicio: 20, fin: 101, type: 'EUROPA' as const },
  ];

  regiones.forEach(region => {
    for (let i = region.inicio; i <= region.fin; i++) {
      const row: any = data[i];
      if (!row) continue;

      const country = row[1];
      const pol = row[2];
      const pod = row[3];
      const via = row[4];
      const of_wm = row[5];
      const of_min = row[6];
      const currency = row[7];
      const frequency = row[8];
      const tt = row[9];

      if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
        
        if (region.type === 'AMERICA') {
          rutas.push({
            id: `CTL-${idCounter++}`,
            provider: 'CTL',
            region: region.nombre,
            country: country || '',
            pol: pol.trim(),
            pod: pod.trim(),
            via: via || '',
            tariff_type: 'AMERICA',
            of_wm: of_wm || 0,
            of_min: of_min || 0,
            currency: currency || 'USD',
            frequency: frequency || '',
            transit_time: tt || 0,
            row_number: i + 1
          });
        }
        
        else if (region.type === 'EUROPA') {
          rutas.push({
            id: `CTL-${idCounter++}`,
            provider: 'CTL',
            region: region.nombre,
            country: country || '',
            pol: pol.trim(),
            pod: pod.trim(),
            via: via || '',
            tariff_type: 'EUROPA',
            of_wm: of_wm || 0,
            of_min: of_min || 0,
            currency: currency || 'USD',
            frequency: frequency || '',
            transit_time: tt || 0,
            row_number: i + 1
          });
        }
      }
    }
  });

  return rutas;
};

// ============================================================================
// OVERSEAS PARSER
// ============================================================================

export const parseOVERSEAS = (data: any[]): RutaOVERSEAS[] => {
  const rutas: RutaOVERSEAS[] = [];
  let idCounter = 1;

  for (let i = 2; i <= 87; i++) {
    const row: any = data[i];
    if (!row) continue;

    const country = row[1];
    const pol = row[2];
    const pod = row[3];
    const via = row[4];
    const of_wm = row[5];
    const of_min = row[6];
    const currency = row[7];
    const frequency = row[8];
    const tt = row[9];

    if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
      rutas.push({
        id: `OVERSEAS-${idCounter++}`,
        provider: 'OVERSEAS',
        region: 'AMERICA',
        country: country || '',
        pol: pol.trim(),
        pod: pod.trim(),
        via: via || '',
        tariff_type: 'AMERICA',
        of_wm: of_wm || 0,
        of_min: of_min || 0,
        currency: currency || 'USD',
        frequency: frequency || '',
        transit_time: tt || 0,
        row_number: i + 1
      });
    }
  }

  return rutas;
};

// ============================================================================
// PLUSCARGO PARSER
// ============================================================================

export const parsePLUSCARGO = (data: any[]): RutaPLUSCARGO[] => {
  const rutas: RutaPLUSCARGO[] = [];
  let idCounter = 1;

  const regiones = [
    { nombre: 'AMERICA', inicio: 2, fin: 98, type: 'AMERICA' as const },
    { nombre: 'EUROPA', inicio: 101, fin: 124, type: 'EUROPA' as const },
  ];

  regiones.forEach(region => {
    for (let i = region.inicio; i <= region.fin; i++) {
      const row: any = data[i];
      if (!row) continue;

      const country = row[1];
      const pol = row[2];
      const pod = row[3];
      const via = row[4];
      const of_wm = row[5];
      const of_min = row[6];
      const currency = row[7];
      const frequency = row[8];
      const tt = row[9];

      if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
        
        if (region.type === 'AMERICA') {
          rutas.push({
            id: `PLUSCARGO-${idCounter++}`,
            provider: 'PLUSCARGO',
            region: region.nombre,
            country: country || '',
            pol: pol.trim(),
            pod: pod.trim(),
            via: via || '',
            tariff_type: 'AMERICA',
            of_wm: of_wm || 0,
            of_min: of_min || 0,
            currency: currency || 'USD',
            frequency: frequency || '',
            transit_time: tt || 0,
            row_number: i + 1
          });
        }
        
        else if (region.type === 'EUROPA') {
          rutas.push({
            id: `PLUSCARGO-${idCounter++}`,
            provider: 'PLUSCARGO',
            region: region.nombre,
            country: country || '',
            pol: pol.trim(),
            pod: pod.trim(),
            via: via || '',
            tariff_type: 'EUROPA',
            of_wm: of_wm || 0,
            of_min: of_min || 0,
            currency: currency || 'USD',
            frequency: frequency || '',
            transit_time: tt || 0,
            row_number: i + 1
          });
        }
      }
    }
  });

  return rutas;
};