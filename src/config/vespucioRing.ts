/**
 * Polígono que aproxima el trazado de la Avenida Circunvalación
 * Américo Vespucio (Anillo de Vespucio) en Santiago de Chile.
 *
 * Se utiliza para determinar si una dirección de entrega está dentro
 * del radio de cobertura comercial de la Última Milla.
 *
 * Los vértices se listan en orden (horario) siguiendo aproximadamente
 * el recorrido de la autopista. Si necesitas mayor precisión, puedes
 * trazar el contorno en https://geojson.io o Google MyMaps y reemplazar
 * las coordenadas. Para que `containsLocation` funcione correctamente
 * el polígono debe ser cerrado (no es necesario repetir el primer
 * punto al final: la API de Google lo cierra automáticamente).
 */
export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export const VESPUCIO_RING_POLYGON: LatLngLiteral[] = [
  // Norte (Recoleta / Huechuraba)
  { lat: -33.358, lng: -70.66 },
  // NNE (Vespucio Norte Express, Vitacura)
  { lat: -33.378, lng: -70.595 },
  // NE (Vespucio Oriente, Las Condes)
  { lat: -33.405, lng: -70.555 },
  // E (La Reina)
  { lat: -33.45, lng: -70.535 },
  // ESE (Peñalolén)
  { lat: -33.49, lng: -70.54 },
  // SE (La Florida)
  { lat: -33.54, lng: -70.56 },
  // SSE (límite NW Puente Alto)
  { lat: -33.57, lng: -70.605 },
  // S (San Bernardo / El Bosque)
  { lat: -33.585, lng: -70.66 },
  // SSW (El Bosque oeste)
  { lat: -33.575, lng: -70.715 },
  // SW (Maipú este)
  { lat: -33.54, lng: -70.755 },
  // WSW (Maipú norte)
  { lat: -33.49, lng: -70.775 },
  // W (Pudahuel sur)
  { lat: -33.45, lng: -70.78 },
  // WNW (Pudahuel norte)
  { lat: -33.41, lng: -70.76 },
  // NW (Quilicura sur)
  { lat: -33.375, lng: -70.72 },
  // NNW (Quilicura)
  { lat: -33.36, lng: -70.69 },
];

/**
 * Determina si un punto está dentro del Anillo de Vespucio usando
 * `google.maps.geometry.poly.containsLocation`.
 *
 * Requiere que la librería `geometry` esté cargada en `useJsApiLoader`.
 * Si la API o la librería aún no está disponible, retorna `null`
 * para que el llamador pueda diferir la decisión sin asumir nada.
 */
export const isInsideVespucioRing = (
  point: LatLngLiteral | null | undefined,
): boolean | null => {
  if (!point) return null;
  if (
    typeof google === "undefined" ||
    !google.maps?.geometry?.poly?.containsLocation
  ) {
    return null;
  }
  const path = VESPUCIO_RING_POLYGON.map(
    (p) => new google.maps.LatLng(p.lat, p.lng),
  );
  const polygon = new google.maps.Polygon({ paths: path });
  return google.maps.geometry.poly.containsLocation(
    new google.maps.LatLng(point.lat, point.lng),
    polygon,
  );
};
