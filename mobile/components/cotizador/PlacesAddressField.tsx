import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchPlaceSuggestions,
  hasGoogleMapsApiKey,
  resolvePlaceById,
  type PlaceCoords,
  type PlaceSuggestion,
} from "../../services/placesAutocomplete";
import { brand, radii } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** null = aún no eligió sugerencia / borró el texto */
  coords: PlaceCoords | null;
  onCoordsChange: (coords: PlaceCoords | null) => void;
  placeholder?: string;
  /** Bias Places (p. ej. Santiago para última milla). */
  locationBias?: { lat: number; lng: number; radiusMeters?: number };
  country?: string;
  multiline?: boolean;
  /** Texto cuando ya hay coords confirmadas */
  confirmedHint?: string;
  /** Texto cuando falta seleccionar */
  pendingHint?: string;
};

const DEBOUNCE_MS = 450;
const MIN_CHARS = 3;

/**
 * Campo de dirección con sugerencias (como CotizadorAddressMap en web).
 * Sin botón "Validar": el usuario elige una opción de la lista.
 */
export default function PlacesAddressField({
  label,
  value,
  onChange,
  coords,
  onCoordsChange,
  placeholder = "Calle, número, comuna…",
  locationBias,
  country,
  multiline = false,
  confirmedHint,
  pendingHint = "Escribe al menos 3 caracteres y elige una dirección de la lista.",
}: Props) {
  const { token } = useAuth();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  /** Evita re-fetch al setear la dirección formateada tras elegir. */
  const skipNextSearch = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setShowList(false);
      setLoading(false);
      setError(null);
      return;
    }

    if (!hasGoogleMapsApiKey()) {
      setError("Falta la API key de Google Maps en la app.");
      setSuggestions([]);
      setShowList(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const results = await fetchPlaceSuggestions(q, {
            locationBias,
            country,
            authToken: token,
          });
          if (id !== requestId.current) return;
          setSuggestions(results);
          setShowList(results.length > 0);
          if (results.length === 0) {
            setError(
              "No hay coincidencias. Prueba con calle, número y comuna.",
            );
          }
        } catch (e) {
          if (id !== requestId.current) return;
          setSuggestions([]);
          setShowList(false);
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar sugerencias.",
          );
        } finally {
          if (id === requestId.current) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    value,
    locationBias?.lat,
    locationBias?.lng,
    locationBias?.radiusMeters,
    country,
    token,
  ]);

  const handleChangeText = useCallback(
    (next: string) => {
      onChange(next);
      if (coords) onCoordsChange(null);
      setError(null);
    },
    [onChange, onCoordsChange, coords],
  );

  const handleSelect = useCallback(
    async (item: PlaceSuggestion) => {
      setResolving(true);
      setError(null);
      setShowList(false);
      try {
        const resolved = await resolvePlaceById(item.placeId, token);
        if (!resolved?.coords) {
          setError("No se pudo obtener la ubicación. Prueba otra opción.");
          return;
        }
        skipNextSearch.current = true;
        onChange(resolved.address || item.description);
        onCoordsChange(resolved.coords);
        setSuggestions([]);
      } catch {
        setError("No se pudo obtener la ubicación. Inténtalo de nuevo.");
      } finally {
        setResolving(false);
      }
    },
    [onChange, onCoordsChange, token],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (suggestions.length > 0 && !coords) setShowList(true);
          }}
          placeholder={placeholder}
          placeholderTextColor={brand.mutedLight}
          style={[styles.input, multiline && styles.inputMultiline]}
          multiline={multiline}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {(loading || resolving) && (
          <ActivityIndicator
            style={styles.spinner}
            color={brand.navy}
            size="small"
          />
        )}
      </View>

      {showList && suggestions.length > 0 ? (
        <View style={styles.list}>
          {suggestions.map((item) => (
            <Pressable
              key={item.placeId}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
              onPress={() => void handleSelect(item)}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={brand.primary}
                style={styles.itemIcon}
              />
              <View style={styles.itemText}>
                <Text style={styles.itemMain} numberOfLines={2}>
                  {item.mainText}
                </Text>
                {item.secondaryText ? (
                  <Text style={styles.itemSecondary} numberOfLines={1}>
                    {item.secondaryText}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {error && !coords ? <Text style={styles.error}>{error}</Text> : null}

      {coords ? (
        <Text style={styles.ok}>{confirmedHint || "Dirección confirmada."}</Text>
      ) : (
        <Text style={styles.hint}>{pendingHint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  inputWrap: { position: "relative" },
  input: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    backgroundColor: brand.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 40,
    fontFamily: fonts.regular,
    color: brand.navy,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  spinner: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  list: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    backgroundColor: brand.surface,
    overflow: "hidden",
    maxHeight: 240,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  itemPressed: { backgroundColor: brand.primarySoft },
  itemIcon: { marginTop: 2 },
  itemText: { flex: 1, gap: 2 },
  itemMain: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  itemSecondary: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  error: {
    color: "#b91c1c",
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  ok: {
    color: "#15803d",
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  hint: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
});
