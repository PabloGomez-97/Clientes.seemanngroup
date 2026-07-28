import Constants from "expo-constants";
import { MOBILE_API_BASE } from "../../src/auth/authApi";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceCoords = { lat: number; lng: number };

export type ResolvedPlace = {
  address: string;
  coords: PlaceCoords;
};

type AutocompleteOptions = {
  locationBias?: { lat: number; lng: number; radiusMeters?: number };
  country?: string;
  language?: string;
  /** Token portal: fallback por proxy si RN no envía Referer. */
  authToken?: string | null;
};

/**
 * La key de Maps está restringida por HTTP referer (web).
 * Desde mobile hay que enviar el mismo referer del portal.
 */
function getMapsReferer(): string {
  const extra = Constants.expoConfig?.extra as
    | { googleMapsHttpReferer?: string }
    | undefined;
  return (
    extra?.googleMapsHttpReferer ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_REFERER ||
    "https://portalclientes.seemanngroup.com/"
  );
}

function getMapsKey(): string {
  return (
    (Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined)
      ?.googleMapsApiKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
  );
}

function mapsHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": getMapsKey(),
    Referer: getMapsReferer(),
    ...extra,
  };
}

function isRefererBlockedError(status: number, message: string): boolean {
  const m = message.toLowerCase();
  return (
    status === 403 ||
    m.includes("referer") ||
    m.includes("blocked") ||
    m.includes("permission_denied") ||
    m.includes("requests from referer")
  );
}

export function hasGoogleMapsApiKey(): boolean {
  return getMapsKey().length > 0;
}

async function fetchSuggestionsViaProxy(
  input: string,
  options: AutocompleteOptions,
): Promise<PlaceSuggestion[]> {
  if (!options.authToken) {
    throw new Error(
      "No se pudieron cargar sugerencias (falta sesión para el proxy).",
    );
  }
  const res = await fetch(`${MOBILE_API_BASE}/api/places/autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.authToken}`,
    },
    body: JSON.stringify({
      input,
      languageCode: options.language || "es",
      country: options.country,
      locationBias: options.locationBias,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "No se pudieron cargar sugerencias.");
  }
  return (data.suggestions || []) as PlaceSuggestion[];
}

async function resolveViaProxy(
  placeId: string,
  authToken: string,
): Promise<ResolvedPlace | null> {
  const res = await fetch(
    `${MOBILE_API_BASE}/api/places/details?placeId=${encodeURIComponent(placeId)}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.coords) return null;
  return {
    address: data.address || "",
    coords: data.coords,
  };
}

/**
 * Places API (New) autocomplete — paridad web.
 * Si iOS/Android bloquea el header Referer, usa proxy del portal.
 */
export async function fetchPlaceSuggestions(
  input: string,
  options: AutocompleteOptions = {},
): Promise<PlaceSuggestion[]> {
  const key = getMapsKey();
  if (!key) {
    throw new Error("Falta la API key de Google Maps en la app.");
  }

  const q = input.trim();
  if (q.length < 3) return [];

  const body: Record<string, unknown> = {
    input: q,
    languageCode: options.language || "es",
  };

  if (options.country) {
    body.includedRegionCodes = [options.country.toUpperCase()];
  }

  if (options.locationBias) {
    const { lat, lng, radiusMeters = 80_000 } = options.locationBias;
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    };
  }

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: mapsHeaders(),
        body: JSON.stringify(body),
      },
    );
    const raw = await res.text();
    let data: {
      error?: { message?: string };
      suggestions?: {
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }[];
    };
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("No se pudieron cargar sugerencias de dirección.");
    }

    if (!res.ok) {
      const msg = data.error?.message || "";
      if (isRefererBlockedError(res.status, msg)) {
        return fetchSuggestionsViaProxy(q, options);
      }
      throw new Error(msg || "No se pudieron cargar sugerencias de dirección.");
    }

    return (data.suggestions || [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
      .map((p) => {
        const description = p.text?.text || "";
        return {
          placeId: p.placeId as string,
          description,
          mainText: p.structuredFormat?.mainText?.text || description,
          secondaryText: p.structuredFormat?.secondaryText?.text || "",
        };
      });
  } catch (e) {
    if (options.authToken) {
      try {
        return await fetchSuggestionsViaProxy(q, options);
      } catch {
        /* fall through */
      }
    }
    throw e instanceof Error
      ? e
      : new Error("No se pudieron cargar sugerencias de dirección.");
  }
}

/** Resuelve place_id → dirección formateada + coords. */
export async function resolvePlaceById(
  placeId: string,
  authToken?: string | null,
): Promise<ResolvedPlace | null> {
  const key = getMapsKey();
  if (!key) {
    throw new Error("Falta la API key de Google Maps en la app.");
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: mapsHeaders({
          "X-Goog-FieldMask": "id,formattedAddress,location",
        }),
      },
    );
    const raw = await res.text();
    let data: {
      error?: { message?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    };
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }

    if (!res.ok) {
      const msg = data.error?.message || "";
      if (authToken && isRefererBlockedError(res.status, msg)) {
        return resolveViaProxy(placeId, authToken);
      }
      return authToken ? resolveViaProxy(placeId, authToken) : null;
    }

    if (
      data.location?.latitude == null ||
      data.location?.longitude == null
    ) {
      return null;
    }

    return {
      address: data.formattedAddress || "",
      coords: {
        lat: data.location.latitude,
        lng: data.location.longitude,
      },
    };
  } catch {
    if (authToken) return resolveViaProxy(placeId, authToken);
    return null;
  }
}
