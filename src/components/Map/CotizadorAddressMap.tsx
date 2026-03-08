import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import type { AirportCoords } from "../../config/airportCoordinates";

type Coordinates = {
  lat: number;
  lng: number;
};

type SuggestionItem = {
  placeId: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _raw: any; // raw placePrediction from new Places API
};

const defaultCenter: Coordinates = {
  lat: -33.4489,
  lng: -70.6693,
};

const mapContainerStyle: React.CSSProperties = {
  height: "100%",
  width: "100%",
};

const libraries: "places"[] = ["places"];

interface CotizadorAddressMapProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** Coordenadas del aeropuerto destino para trazar la ruta con Directions API */
  airportCoords?: AirportCoords | null;
}

const CotizadorAddressMap = ({
  value,
  onChange,
  placeholder = "Ingrese direccion de recogida",
  rows = 2,
  airportCoords,
}: CotizadorAddressMapProps) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
    libraries,
  });

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedPosition, setSelectedPosition] =
    useState<Coordinates>(defaultCenter);
  const [hasSelection, setHasSelection] = useState(false);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Close overlay on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOverlayOpen(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounced autocomplete search using the new Places API (AutocompleteSuggestion)
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (value.trim().length < 3 || !isLoaded) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const PlacesNS = google.maps.places as any;

        if (PlacesNS.AutocompleteSuggestion) {
          // New Places API
          const { suggestions: rawSuggestions } =
            await PlacesNS.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: value.trim(),
            });

          const results: SuggestionItem[] = (rawSuggestions ?? []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (s: any) => ({
              placeId: s.placePrediction.placeId,
              description: s.placePrediction.text.toString(),
              _raw: s.placePrediction,
            }),
          );
          setSuggestions(results);
          setShowSuggestions(isOverlayOpen && results.length > 0);
        } else {
          // Fallback: old AutocompleteService (for accounts that still have it)
          const service = new google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            { input: value.trim() },
            (predictions, status) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                predictions
              ) {
                const results: SuggestionItem[] = predictions.map((p) => ({
                  placeId: p.place_id,
                  description: p.description,
                  _raw: null,
                }));
                setSuggestions(results);
                setShowSuggestions(isOverlayOpen && results.length > 0);
              } else {
                setSuggestions([]);
                setShowSuggestions(false);
              }
            },
          );
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
        setError(
          "No se pudo validar la direccion en este momento. Intentalo nuevamente.",
        );
      } finally {
        setIsLoading(false);
      }
    }, 450);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [value, isOverlayOpen, isLoaded]);

  // Calculate route when we have both a selected position and airport coords
  useEffect(() => {
    if (!isLoaded || !hasSelection || !airportCoords) {
      setDirections(null);
      setRouteDistance(null);
      setRouteDuration(null);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: selectedPosition,
        destination: { lat: airportCoords.lat, lng: airportCoords.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setRouteDistance(leg.distance?.text ?? null);
            setRouteDuration(leg.duration?.text ?? null);
          }
        } else {
          // If route calculation fails, just show the marker without route
          setDirections(null);
          setRouteDistance(null);
          setRouteDuration(null);
        }
      },
    );
  }, [isLoaded, hasSelection, selectedPosition, airportCoords]);

  const handleSuggestionClick = useCallback(
    async (suggestion: SuggestionItem) => {
      try {
        let lat: number;
        let lng: number;
        let address: string;

        if (suggestion._raw && typeof suggestion._raw.toPlace === "function") {
          // New Places API: use toPlace() + fetchFields()
          const place = suggestion._raw.toPlace();
          await place.fetchFields({
            fields: ["formattedAddress", "location"],
          });

          lat = place.location?.lat() ?? 0;
          lng = place.location?.lng() ?? 0;
          address = place.formattedAddress ?? suggestion.description;
        } else {
          // Fallback: use Geocoder
          const geocoder = new google.maps.Geocoder();
          const response = await geocoder.geocode({
            placeId: suggestion.placeId,
          });

          if (!response.results[0]) return;

          const location = response.results[0].geometry.location;
          lat = location.lat();
          lng = location.lng();
          address =
            response.results[0].formatted_address ?? suggestion.description;
        }

        if (lat === 0 && lng === 0) return;

        onChange(address);
        setSelectedAddress(address);
        setSelectedPosition({ lat, lng });
        setHasSelection(true);
        setShowInfoWindow(true);
        setShowSuggestions(false);
        setError(null);

        // Pan the map to the new position
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
      } catch {
        setError("No se pudo obtener la ubicacion. Intentalo nuevamente.");
      }
    },
    [onChange],
  );

  const selectFirstSuggestion = () => {
    if (suggestions.length > 0) {
      handleSuggestionClick(suggestions[0]);
      return;
    }
    setIsOverlayOpen(false);
  };

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    setIsOverlayOpen(true);
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      setIsOverlayOpen(false);
      setShowSuggestions(false);
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      selectFirstSuggestion();
    }
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const showRoute = directions !== null;

  return (
    <div className="qa-address-map" ref={wrapperRef}>
      <textarea
        className="qa-input"
        value={value}
        onChange={handleTextareaChange}
        onFocus={() => {
          setIsOverlayOpen(true);
          setShowSuggestions(suggestions.length > 0);
        }}
        onKeyDown={handleTextareaKeyDown}
        placeholder={placeholder}
        rows={rows}
      />

      {isOverlayOpen && (
        <section
          className="qa-address-map__overlay"
          aria-label="Busqueda de direccion"
        >
          <div className="qa-address-map__toolbar">
            <span>
              {isLoading
                ? "Validando direccion..."
                : "Confirma la direccion en el mapa (Enter para seleccionar)"}
            </span>
            <button
              type="button"
              className="qa-address-map__close"
              onClick={() => {
                setIsOverlayOpen(false);
                setShowSuggestions(false);
              }}
            >
              Cerrar
            </button>
          </div>

          {showSuggestions && (
            <ul className="qa-address-map__suggestions">
              {suggestions.map((item) => (
                <li key={item.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(item)}
                    className="qa-address-map__suggestion-btn"
                  >
                    {item.description}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="qa-address-map__error">{error}</p>}
          {!isLoading &&
            value.trim().length >= 3 &&
            suggestions.length === 0 &&
            !error && (
              <p className="qa-address-map__hint">
                No encontramos coincidencias exactas, pero puedes guardar la
                direccion escrita manualmente.
              </p>
            )}

          <div className="qa-address-map__canvas">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={hasSelection ? selectedPosition : defaultCenter}
                zoom={hasSelection ? 15 : 5}
                onLoad={onMapLoad}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                }}
              >
                {showRoute ? (
                  <DirectionsRenderer
                    directions={directions}
                    options={{
                      suppressMarkers: false,
                      polylineOptions: {
                        strokeColor: "#ff6200",
                        strokeWeight: 4,
                      },
                    }}
                  />
                ) : (
                  hasSelection && (
                    <Marker
                      position={selectedPosition}
                      onClick={() => setShowInfoWindow(true)}
                    >
                      {showInfoWindow && (
                        <InfoWindow
                          position={selectedPosition}
                          onCloseClick={() => setShowInfoWindow(false)}
                        >
                          <div>
                            <strong>Direccion seleccionada</strong>
                            <br />
                            {selectedAddress}
                            <br />
                            Lat: {selectedPosition.lat.toFixed(6)} | Lng:{" "}
                            {selectedPosition.lng.toFixed(6)}
                          </div>
                        </InfoWindow>
                      )}
                    </Marker>
                  )
                )}
              </GoogleMap>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#6c757d",
                  fontSize: "0.9rem",
                }}
              >
                Cargando mapa...
              </div>
            )}
          </div>

          {hasSelection && (
            <div className="qa-address-map__footer">
              <p className="qa-address-map__coords">
                Coordenadas: {selectedPosition.lat.toFixed(6)},{" "}
                {selectedPosition.lng.toFixed(6)}
              </p>
              {showRoute && airportCoords && (
                <div className="qa-address-map__route-info">
                  <i className="bi bi-signpost-2" />
                  <span>
                    Distancia hasta <strong>{airportCoords.name}</strong>
                    {" ("}
                    {airportCoords.iata}
                    {"): "}
                    <strong>{routeDistance}</strong>
                    {routeDuration && <> &middot; {routeDuration}</>}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CotizadorAddressMap;
