export interface AirportCoords {
  lat: number;
  lng: number;
  name: string;
  iata: string;
}

/**
 * Coordenadas de aeropuertos mapeados por su nombre normalizado (lowercase).
 * Se utiliza para trazar la ruta desde la dirección de recogida hasta el aeropuerto de origen.
 */
export const airportCoordinates: Record<string, AirportCoords> = {
  houston: {
    lat: 29.9902,
    lng: -95.3368,
    name: "George Bush Intercontinental Airport",
    iata: "IAH",
  },
  madrid: {
    lat: 40.4983,
    lng: -3.5676,
    name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
    iata: "MAD",
  },
  shanghai: {
    lat: 31.1443,
    lng: 121.8083,
    name: "Shanghai Pudong International Airport",
    iata: "PVG",
  },
  sudafrica: {
    lat: -26.1311,
    lng: 28.2316,
    name: "O.R. Tambo International Airport",
    iata: "JNB",
  },
  miami: {
    lat: 25.7952,
    lng: -80.2784,
    name: "Miami International Airport",
    iata: "MIA",
  },
  barcelona: {
    lat: 41.3040,
    lng: 2.0789,
    name: "Barcelona-El Prat Airport",
    iata: "BCN",
  },
  londres: {
    lat: 51.4694,
    lng: -0.4535,
    name: "London Heathrow Airport",
    iata: "LHR",
  },
  alemania: {
    lat: 50.0485,
    lng: 8.5586,
    name: "Frankfurt am Main Airport",
    iata: "FRA",
  },
  brasil: {
    lat: -23.0100,
    lng: -47.1449,
    name: "Campinas Viracopos International Airport",
    iata: "VCP",
  },
  brazil: {
    lat: -23.4241,
    lng: -46.4784,
    name: "São Paulo-Guarulhos International Airport",
    iata: "GRU",
  },
  hong: {
    lat: 22.3132,
    lng: 113.9371,
    name: "Hong Kong International Airport",
    iata: "HKG",
  },
  italia: {
    lat: 45.6272,
    lng: 8.7125,
    name: "Milan Malpensa Airport",
    iata: "MXP",
  },
  lisboa: {
    lat: 38.7729,
    lng: -9.1278,
    name: "Lisbon Humberto Delgado Airport",
    iata: "LIS",
  },
  nanjin: {
    lat: 31.7342,
    lng: 118.8714,
    name: "Nanjing Lukou International Airport",
    iata: "NKG",
  },
  santiago: {
    lat: -33.3972,
    lng: -70.7931,
    name: "Comodoro Arturo Merino Benítez International Airport",
    iata: "SCL",
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
 * Busca las coordenadas del aeropuerto por el nombre normalizado del origen.
 * Intenta coincidencia exacta primero, luego parcial.
 */
export function getAirportByOrigin(
  originNormalized: string,
): AirportCoords | null {
  if (!originNormalized) return null;

  const key = normalizeText(originNormalized);
  const aliases: Record<string, string> = {
    "sudafrica johannesburgo": "sudafrica",
    "south africa johannesburg": "sudafrica",
    johannesburgo: "johannesburgo",
    johannesburg: "johannesburg",
  };

  if (aliases[key] && airportCoordinates[aliases[key]]) {
    return airportCoordinates[aliases[key]];
  }

  // Coincidencia exacta
  if (airportCoordinates[key]) {
    return airportCoordinates[key];
  }

  // Coincidencia parcial: si el origin contiene el nombre del aeropuerto o viceversa
  for (const [airportKey, coords] of Object.entries(airportCoordinates)) {
    const normalizedAirportKey = normalizeText(airportKey);
    if (
      key.includes(normalizedAirportKey) ||
      normalizedAirportKey.includes(key)
    ) {
      return coords;
    }
  }

  return null;
}
