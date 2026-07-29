import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  getVespucioDeliveryZone,
  type VespucioDeliveryZone,
} from "../../../src/config/vespucioRing";
import PlacesAddressField from "./PlacesAddressField";
import { brand } from "../../theme/brand";
import { fonts } from "../../theme/typography";

export type DeliveryCoords = { lat: number; lng: number };

type Props = {
  airportCoords: DeliveryCoords;
  address: string;
  onAddressChange: (value: string) => void;
  onZoneChange: (
    zone: VespucioDeliveryZone | null,
    coords: DeliveryCoords | null,
  ) => void;
};

/** Places API (New): circle.radius máx. 50_000 m. */
const SANTIAGO_BIAS = {
  lat: -33.4489,
  lng: -70.6693,
  radiusMeters: 50_000,
};

/** Entrega última milla SCL: autocomplete + zona Vespucio (sin mapa ni botón buscar). */
export default function UltimaMillaDeliveryMap({
  address,
  onAddressChange,
  onZoneChange,
}: Props) {
  const [coords, setCoords] = useState<DeliveryCoords | null>(null);
  const zone = coords ? getVespucioDeliveryZone(coords) : null;

  const handleCoordsChange = useCallback(
    (next: DeliveryCoords | null) => {
      setCoords(next);
      if (!next) {
        onZoneChange(null, null);
        return;
      }
      onZoneChange(getVespucioDeliveryZone(next), next);
    },
    [onZoneChange],
  );

  return (
    <View style={styles.wrap}>
      <PlacesAddressField
        label="Dirección de entrega (Santiago)"
        value={address}
        onChange={onAddressChange}
        coords={coords}
        onCoordsChange={handleCoordsChange}
        placeholder="Calle, número, comuna…"
        country="cl"
        locationBias={SANTIAGO_BIAS}
        pendingHint="Escribe la dirección en Santiago y elige una opción de la lista."
        confirmedHint={coords ? "Dirección confirmada." : undefined}
      />
      {zone === "outside" ? (
        <Text style={styles.zoneOut}>
          Fuera de cobertura. No es posible agregar Última Milla.
        </Text>
      ) : null}
      {zone === "inside" || zone === "extended" ? (
        <Text style={styles.zoneOk}>Dirección dentro de cobertura.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  zoneOut: { fontSize: 12, fontFamily: fonts.medium, color: "#b42318" },
  zoneOk: { fontSize: 12, fontFamily: fonts.medium, color: "#15803d" },
});
