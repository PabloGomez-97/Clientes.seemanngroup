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
  santiago_de_chile: {
    lat: -33.4489,
    lng: -70.6693,
    name: "Santiago de Chile",
    code: "CLSCL",
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
