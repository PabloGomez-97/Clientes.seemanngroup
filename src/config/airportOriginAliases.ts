/**
 * Alias de nombres de origen/destino del sheet → clave en airportCoordinates.
 * Agregar aquí cuando en tarifas aparezca un nombre distinto al del catálogo geo.
 */
export const AIRPORT_ORIGIN_KEY_ALIASES: Readonly<Record<string, string>> = {
  // Reino Unido / Londres
  londres: "london",
  london: "london",
  "london heathrow": "london",
  heathrow: "london",
  lhr: "london",
  inglaterra: "london",
  england: "london",
  "united kingdom": "london",
  uk: "london",
  "reino unido": "london",

  // Chile / Santiago
  santiago: "santiago_de_chile",
  "santiago de chile": "santiago_de_chile",
  "santiago chile": "santiago_de_chile",

  // Sudáfrica (ya existían parciales en getAirportByOrigin)
  "sudafrica johannesburgo": "sudafrica",
  "south africa johannesburg": "sudafrica",
  johannesburgo: "johannesburg",
};

/**
 * País ISO2 cuando el nombre del sheet no resuelve aeropuerto pero sí país (reserva).
 */
export const AIRPORT_ORIGIN_COUNTRY_FALLBACK: Readonly<Record<string, string>> =
  {
    inglaterra: "GB",
    england: "GB",
    londres: "GB",
    uk: "GB",
  };
