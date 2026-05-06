export interface LastMileCoords {
  lat: number;
  lng: number;
  name: string;
  /** Código identificador (UN/LOCODE u otro). */
  code: string;
}

/**
 * Coordenadas de los puntos de origen y destino disponibles para
 * cotizaciones de Última Milla.
 *
 * NOTA: Las coordenadas son provisorias. Reemplázalas con los valores reales
 * cuando los tengas disponibles.
 */
export const lastMileCoordinates: Record<string, LastMileCoords> = {
  san_antonio: {
    lat: -33.5928,
    lng: -71.6064,
    name: "San Antonio",
    code: "CLSAI",
  },
  valparaiso: {
    lat: -33.0472,
    lng: -71.6127,
    name: "Valparaíso",
    code: "CLVAP",
  },
  chile: {
    lat: -33.4489,
    lng: -70.6693,
    name: "Santiago de Chile",
    code: "CLSCL",
  },

  argentina: {
    lat: -34.6037,
    lng: -58.3816,
    name: "Buenos Aires",
    code: "ARBUE",
  },
  peru: {
    lat: -12.0464,
    lng: -77.0428,
    name: "Lima",
    code: "PELIM",
  },
  bolivia: {
    lat: -16.4897,
    lng: -68.1193,
    name: "La Paz",
    code: "BOLPB",
  },
  paraguay: {
    lat: -25.2637,
    lng: -57.5759,
    name: "Asunción",
    code: "PYASU",
  },
  brasil: {
    lat: -23.5505,
    lng: -46.6333,
    name: "São Paulo",
    code: "BRSAO",
  },
  uruguay: {
    lat: -34.9011,
    lng: -56.1645,
    name: "Montevideo",
    code: "UYMVD",
  },
  ecuador: {
    lat: -0.1807,
    lng: -78.4678,
    name: "Quito",
    code: "ECUIO",
  },
  colombia: {
    lat: 4.7110,
    lng: -74.0721,
    name: "Bogotá",
    code: "COBOG",
  },
};

/** Devuelve las coordenadas (si existen) para una clave normalizada. */
export const getLastMileCoords = (
  key: string | null | undefined,
): LastMileCoords | null => {
  if (!key) return null;
  const normalized = key
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  return lastMileCoordinates[normalized] || null;
};
