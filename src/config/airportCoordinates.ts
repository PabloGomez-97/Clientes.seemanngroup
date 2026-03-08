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
    iata: "HOUSTON",
  },
  madrid: {
    lat: 40.4983,
    lng: -3.5676,
    name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
    iata: "MAD",
  },
  shanghái: {
    lat: 31.1443,
    lng: 121.8083,
    name: "Shanghai Pudong International Airport",
    iata: "SHANGHÁI",
  },
  sudáfrica: {
    lat: -26.1392,
    lng: 28.246,
    name: "O.R. Tambo International Airport",
    iata: "SUDÁFRICA (JOHANNESBURGO)",
  },
  johannesburg: {
    lat: -26.1392,
    lng: 28.246,
    name: "O.R. Tambo International Airport",
    iata: "SUDÁFRICA (JOHANNESBURGO)",
  },
  "sudafrica (johannesburgo)": {
    lat: -26.1392,
    lng: 28.246,
    name: "O.R. Tambo International Airport",
    iata: "SUDÁFRICA (JOHANNESBURGO)",
  },
};

/**
 * Busca las coordenadas del aeropuerto por el nombre normalizado del origen.
 * Intenta coincidencia exacta primero, luego parcial.
 */
export function getAirportByOrigin(
  originNormalized: string,
): AirportCoords | null {
  if (!originNormalized) return null;

  const key = originNormalized.toLowerCase().trim();

  // Coincidencia exacta
  if (airportCoordinates[key]) {
    return airportCoordinates[key];
  }

  // Coincidencia parcial: si el origin contiene el nombre del aeropuerto o viceversa
  for (const [airportKey, coords] of Object.entries(airportCoordinates)) {
    if (key.includes(airportKey) || airportKey.includes(key)) {
      return coords;
    }
  }

  return null;
}
