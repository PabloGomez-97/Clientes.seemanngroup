/**
 * Configuración centralizada del loader de Google Maps.
 *
 * ⚠️  El loader de @react-google-maps/api es un SINGLETON global.
 *     Si dos componentes llaman a `useJsApiLoader` con opciones distintas
 *     (por ejemplo, distintas `libraries`), la app lanza un error en tiempo
 *     de ejecución.
 *
 *     TODOS los componentes que usen `useJsApiLoader` deben importar esta
 *     constante en lugar de definir su propia lista de librerías.
 */
export const GOOGLE_MAPS_LIBRARIES: (
  | "places"
  | "geometry"
  | "drawing"
  | "visualization"
)[] = ["places", "geometry"];
