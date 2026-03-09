export interface PortCoords {
  lat: number;
  lng: number;
  name: string;
  unlocode: string;
}

/**
 * Coordenadas de puertos mapeados por su nombre normalizado (lowercase).
 * Se utiliza para trazar la ruta desde la dirección de recogida hasta el puerto de origen.
 */
export const portCoordinates: Record<string, PortCoords> = {
  barcelona: {
    lat: 41.3485,
    lng: 2.1745,
    name: "Port of Barcelona",
    unlocode: "ESBCN",
  },
  dalian: {
    lat: 38.9281,
    lng: 121.6387,
    name: "Port of Dalian",
    unlocode: "CNDLC",
  },
  genoa: {
    lat: 44.4072,
    lng: 8.9267,
    name: "Port of Genoa",
    unlocode: "ITGOA",
  },
  hamburg: {
    lat: 53.5321,
    lng: 9.9646,
    name: "Port of Hamburg",
    unlocode: "DEHAM",
  },
  houston: {
    lat: 29.7261,
    lng: -95.2688,
    name: "Port of Houston",
    unlocode: "USHOU",
  },
  london: {
    lat: 51.5049,
    lng: 0.0211,
    name: "Port of London",
    unlocode: "GBLON",
  },
  "los angeles": {
    lat: 33.7361,
    lng: -118.2642,
    name: "Port of Los Angeles",
    unlocode: "USLAX",
  },
  miami: {
    lat: 25.7743,
    lng: -80.1703,
    name: "Port of Miami",
    unlocode: "USMIA",
  },
  mundra: {
    lat: 22.7394,
    lng: 69.7253,
    name: "Mundra Port",
    unlocode: "INMUN",
  },
  "new york": {
    lat: 40.6681,
    lng: -74.0415,
    name: "Port of New York and New Jersey",
    unlocode: "USNYC",
  },
  "nhava sheva": {
    lat: 18.9543,
    lng: 72.9517,
    name: "Jawaharlal Nehru Port (Nhava Sheva)",
    unlocode: "INNSA",
  },
  ningbo: {
    lat: 29.9483,
    lng: 121.8881,
    name: "Port of Ningbo-Zhoushan",
    unlocode: "CNNGB",
  },
  "port everglades": {
    lat: 26.0895,
    lng: -80.1157,
    name: "Port Everglades",
    unlocode: "USPEF",
  },
  qingdao: {
    lat: 36.0698,
    lng: 120.3829,
    name: "Port of Qingdao",
    unlocode: "CNQDG",
  },
  shanghai: {
    lat: 30.6264,
    lng: 122.0652,
    name: "Port of Shanghai",
    unlocode: "CNSHA",
  },
  shenzhen: {
    lat: 22.5771,
    lng: 114.2734,
    name: "Port of Shenzhen",
    unlocode: "CNSZX",
  },
  tianjin: {
    lat: 38.9866,
    lng: 117.7358,
    name: "Port of Tianjin",
    unlocode: "CNTSN",
  },
  turkey: {
    lat: 40.9812,
    lng: 29.0648,
    name: "Port of Ambarlı (Istanbul)",
    unlocode: "TRIST",
  },
  valencia: {
    lat: 39.4394,
    lng: -0.3245,
    name: "Port of Valencia",
    unlocode: "ESVLC",
  },
  xiamen: {
    lat: 24.4534,
    lng: 118.0819,
    name: "Port of Xiamen",
    unlocode: "CNXMN",
  },
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca las coordenadas del puerto por el nombre normalizado del POL.
 * Intenta coincidencia exacta primero, luego parcial.
 */
export function getPortByPOL(polNormalized: string): PortCoords | null {
  if (!polNormalized) return null;

  const key = normalizeText(polNormalized);

  // Coincidencia exacta
  if (portCoordinates[key]) {
    return portCoordinates[key];
  }

  // Coincidencia parcial: si el POL contiene el nombre del puerto o viceversa
  for (const [portKey, coords] of Object.entries(portCoordinates)) {
    const normalizedPortKey = normalizeText(portKey);
    if (
      key.includes(normalizedPortKey) ||
      normalizedPortKey.includes(key)
    ) {
      return coords;
    }
  }

  return null;
}
