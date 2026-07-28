import PlacesAddressField from "./PlacesAddressField";

export type PickupCoords = { lat: number; lng: number };

type Props = {
  coords: PickupCoords | null;
  address: string;
  onAddressChange: (value: string) => void;
  onCoordsChange: (coords: PickupCoords | null) => void;
};

/** Recogida EXW: autocomplete de direcciones (paridad web, sin mapa ni botón Validar). */
export default function ExwPickupMap({
  coords,
  address,
  onAddressChange,
  onCoordsChange,
}: Props) {
  return (
    <PlacesAddressField
      label="Dirección de recogida (EXW)"
      value={address}
      onChange={onAddressChange}
      coords={coords}
      onCoordsChange={onCoordsChange}
      placeholder="Calle, número, comuna, ciudad…"
      multiline
      pendingHint="Escribe la dirección y elige una opción de la lista para continuar."
      confirmedHint={
        coords
          ? `Dirección confirmada (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`
          : undefined
      }
    />
  );
}
