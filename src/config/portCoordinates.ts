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
  atlanta: {
    lat: 33.7490,
    lng: -84.3880,
    name: "Atlanta (Inland Port)",
    unlocode: "USATL",
  },
  barcelona: {
    lat: 41.3485,
    lng: 2.1745,
    name: "Port of Barcelona",
    unlocode: "ESBCN",
  },
  bilbao: {
    lat: 43.3413,
    lng: -3.0414,
    name: "Port of Bilbao",
    unlocode: "ESBIO",
  },
  charleston: {
    lat: 32.8343,
    lng: -79.8822,
    name: "Port of Charleston",
    unlocode: "USCHS",
  },
  chennai: {
    lat: 13.1002,
    lng: 80.2975,
    name: "Port of Chennai",
    unlocode: "INMAA",
  },
  chicago: {
    lat: 41.7269,
    lng: -87.5333,
    name: "Port of Chicago",
    unlocode: "USCHI",
  },
  cleveland: {
    lat: 41.5014,
    lng: -81.7037,
    name: "Port of Cleveland",
    unlocode: "USCLE",
  },
  cochin: {
    lat: 9.9698,
    lng: 76.2594,
    name: "Cochin Port",
    unlocode: "INCOK",
  },
  dalian: {
    lat: 38.9281,
    lng: 121.6387,
    name: "Port of Dalian",
    unlocode: "CNDLC",
  },
  dallas: {
    lat: 32.7767,
    lng: -96.7970,
    name: "Dallas (Inland Port)",
    unlocode: "USDAL",
  },
  durban: {
    lat: -29.8727,
    lng: 31.0464,
    name: "Port of Durban",
    unlocode: "ZADUR",
  },
  genoa: {
    lat: 44.4066,
    lng: 8.8967,
    name: "Port of Genoa",
    unlocode: "ITGOA",
  },
  hamburg: {
    lat: 53.5321,
    lng: 9.9646,
    name: "Port of Hamburg",
    unlocode: "DEHAM",
  },
  hazira: {
    lat: 21.0867,
    lng: 72.6313,
    name: "Hazira Port",
    unlocode: "INHZA",
  },
  houston: {
    lat: 29.7261,
    lng: -95.2688,
    name: "Port of Houston",
    unlocode: "USHOU",
  },
  istanbul: {
    lat: 41.0088,
    lng: 28.0097,
    name: "Port of Istanbul",
    unlocode: "TRIST",
  },
  kocaeli: {
    lat: 40.7639,
    lng: 29.9317,
    name: "Port of Kocaeli",
    unlocode: "TRKOC",
  },
  kolkata: {
    lat: 22.5755,
    lng: 88.3459,
    name: "Port of Kolkata",
    unlocode: "INCCU",
  },
  london: {
    lat: 51.5049,
    lng: 0.0211,
    name: "Port of London",
    unlocode: "GBLON",
  },
  long: {
    lat: 33.7601,
    lng: -118.2292,
    name: "Port of Long Beach",
    unlocode: "USLGB",
  },
  los: {
    lat: 33.7369,
    lng: -118.2650,
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
  new: {
    lat: 40.6906,
    lng: -73.9998,
    name: "Port of New York and New Jersey",
    unlocode: "USNYC",
  },
  newark: {
    lat: 40.6963,
    lng: -74.1404,
    name: "Port Newark",
    unlocode: "USEWR",
  },
  nhava: {
    lat: 18.9478,
    lng: 72.9454,
    name: "Jawaharlal Nehru Port (Nhava Sheva)",
    unlocode: "INNSA",
  },
  ningbo: {
    lat: 29.9483,
    lng: 121.8881,
    name: "Port of Ningbo-Zhoushan",
    unlocode: "CNNGB",
  },
  philadelphia: {
    lat: 39.9807,
    lng: -75.0892,
    name: "Port of Philadelphia",
    unlocode: "USPHL",
  },
  port: {
    lat: 26.0958,
    lng: -80.1233,
    name: "Port Everglades",
    unlocode: "USPEF",
  },
  qingdao: {
    lat: 36.0698,
    lng: 120.3829,
    name: "Port of Qingdao",
    unlocode: "CNQDG",
  },
  savannah: {
    lat: 32.1236,
    lng: -81.1361,
    name: "Port of Savannah",
    unlocode: "USSAV",
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
  tuticorin: {
    lat: 8.7560,
    lng: 78.1792,
    name: "V.O. Chidambaranar Port (Tuticorin)",
    unlocode: "INTUT",
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
