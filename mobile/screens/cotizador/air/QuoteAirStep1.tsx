import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  capitalize,
  type RutaAerea,
} from "../../../../src/components/quotes/Handlers/Air/HandlerQuoteAir";
import { fetchExpandedRoutesAir } from "../../../../src/components/quotes/Handlers/Air/ExpandedRoutesAir";
import {
  collapseAirRoutesByCarrier,
  createPendingAirRoute,
  fetchAirRatesFromSheet,
  filterAirRoutesForOd,
  getAirDestinationLabel,
  isAirRouteSelectable,
} from "../../../../src/components/quotes/Handlers/Air/airQuoteStep1Shared";
import { getValidityClass } from "../../../../src/components/quotes/Handlers/handlerFechas";
import {
  buildOriginIndex,
  buildOriginOptionsForCountryAndDestination,
  buildPodOptionsForCountry,
  getOriginsInCountry,
  getRatedOriginsInCountryForDestination,
  rankRatedOriginsByDistance,
  type OriginIndex,
} from "../../../../src/components/quotes/originSelection";
import {
  getAirportByOrigin,
  getOriginCountryCode,
} from "../../../../src/config/airportCoordinates";
import {
  isAirConnectSpainFlow,
  isValidSpainPostalCode,
} from "../../../../src/components/quotes/AirConnectSpain/flow";
import {
  SANTIAGO_DESTINATION_OPTION,
  SPAIN_AIRCONNECT_ORIGINS,
  SPAIN_COUNTRY_CODE,
  SPAIN_COUNTRY_OPTION,
} from "../../../../src/services/airConnectSpainQuote";
import AirRateCard from "../../../components/cotizador/AirRateCard";
import CotizadorSelectField, {
  type CotizadorOption,
} from "../../../components/cotizador/CotizadorSelectField";
import ExwPickupMap, {
  type PickupCoords,
} from "../../../components/cotizador/ExwPickupMap";
import { brand, radii } from "../../../theme/brand";
import { fonts } from "../../../theme/typography";

export type AirStep1Result = {
  routeMode: "recurrente" | "noRecurrente";
  incoterm: "EXW" | "FCA";
  pais: CotizadorOption;
  destination: CotizadorOption;
  origin: CotizadorOption;
  ruta: RutaAerea;
  sinTarifa: boolean;
  pickupAddress?: string;
  pickupCoords?: PickupCoords;
  spainPostalCode?: string;
  airConnect: boolean;
};

type Props = {
  onConfirm: (result: AirStep1Result) => void;
};

type RouteMode = "recurrente" | "noRecurrente" | null;
type Incoterm = "EXW" | "FCA" | "";

const originGeoOptions = {
  getCountryCode: (normalized: string) =>
    getAirportByOrigin(normalized)?.countryCode?.toUpperCase() ??
    getOriginCountryCode(normalized),
  getCoords: (normalized: string) => {
    const airport = getAirportByOrigin(normalized);
    return airport ? { lat: airport.lat, lng: airport.lng } : null;
  },
};

export default function QuoteAirStep1({ onConfirm }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rutas, setRutas] = useState<RutaAerea[]>([]);
  const [expandedOrigins, setExpandedOrigins] = useState<
    { value: string; label: string }[]
  >([]);
  const [expandedRows, setExpandedRows] = useState<
    {
      origin: string;
      destination: string;
      destinationLabel: string;
    }[]
  >([]);

  const [routeMode, setRouteMode] = useState<RouteMode>(null);
  const [pais, setPais] = useState<CotizadorOption | null>(null);
  const [destination, setDestination] = useState<CotizadorOption | null>(null);
  const [incoterm, setIncoterm] = useState<Incoterm>("");
  const [origin, setOrigin] = useState<CotizadorOption | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<PickupCoords | null>(null);
  const [spainPostal, setSpainPostal] = useState("");
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaAerea | null>(
    null,
  );
  const [sinTarifa, setSinTarifa] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rates, expanded] = await Promise.all([
        fetchAirRatesFromSheet(),
        fetchExpandedRoutesAir(),
      ]);
      setRutas(rates);
      setExpandedOrigins(expanded.origins);
      setExpandedRows(
        expanded.rows.map((r) => ({
          origin: r.originNorm,
          destination: r.destNorm,
          destinationLabel: r.destLabel,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las tarifas",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const originIndex = useMemo((): OriginIndex | null => {
    if (!rutas.length) return null;
    const originMap = new Map<string, string>();
    for (const r of rutas) {
      if (!originMap.has(r.originNormalized)) {
        originMap.set(r.originNormalized, r.origin);
      }
    }
    return buildOriginIndex(
      Array.from(originMap.entries()).map(([normalized, label]) => ({
        normalized,
        label: capitalize(label),
      })),
      originGeoOptions,
    );
  }, [rutas]);

  const originIndexNR = useMemo((): OriginIndex | null => {
    if (!expandedOrigins.length) return null;
    return buildOriginIndex(
      expandedOrigins.map((o) => ({
        normalized: o.value,
        label: o.label,
      })),
      originGeoOptions,
    );
  }, [expandedOrigins]);

  const activeIndex =
    routeMode === "noRecurrente" ? originIndexNR : originIndex;
  const isNR = routeMode === "noRecurrente";

  const countryOptions = useMemo((): CotizadorOption[] => {
    const base = activeIndex?.countries ?? [];
    if (routeMode === "recurrente") {
      if (base.some((c) => c.value === SPAIN_COUNTRY_CODE)) return base;
      return [...base, SPAIN_COUNTRY_OPTION].sort((a, b) =>
        a.label.localeCompare(b.label, "es"),
      );
    }
    return base;
  }, [activeIndex, routeMode]);

  const airConnect = isAirConnectSpainFlow({
    routeMode,
    paisValue: pais?.value,
    destValue: destination?.value,
    incoterm: incoterm || "FCA",
    isSimulationMode: false,
  });

  const destinationOptions = useMemo((): CotizadorOption[] => {
    if (!pais || !activeIndex) return [];
    if (!isNR && pais.value === SPAIN_COUNTRY_CODE) {
      return [SANTIAGO_DESTINATION_OPTION];
    }
    if (isNR) {
      const originsInCountry = new Set(
        getOriginsInCountry(activeIndex, pais.value).map((o) => o.normalized),
      );
      const destMap = new Map<string, string>();
      for (const row of expandedRows) {
        if (!originsInCountry.has(row.origin)) continue;
        if (!destMap.has(row.destination)) {
          destMap.set(
            row.destination,
            getAirDestinationLabel(row.destination, row.destinationLabel),
          );
        }
      }
      return Array.from(destMap.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));
    }
    return buildPodOptionsForCountry(
      rutas.map((r) => ({
        polNormalized: r.originNormalized,
        podNormalized: r.destinationNormalized,
        pod: r.destination,
      })),
      activeIndex,
      pais.value,
      getAirDestinationLabel,
    );
  }, [pais, activeIndex, isNR, expandedRows, rutas]);

  const originOptions = useMemo((): CotizadorOption[] => {
    if (airConnect) {
      return [...SPAIN_AIRCONNECT_ORIGINS];
    }
    if (!pais || !activeIndex || !destination) return [];
    if (isNR) {
      return getOriginsInCountry(activeIndex, pais.value).map((o) => ({
        value: o.normalized,
        label: o.label,
      }));
    }
    if (!originIndex) return [];
    return buildOriginOptionsForCountryAndDestination(
      rutas,
      originIndex,
      pais.value,
      destination.value,
      (_o, label) => capitalize(label),
      (ruta) => getValidityClass(ruta.validUntil) !== "expired",
    );
  }, [
    airConnect,
    incoterm,
    pais,
    activeIndex,
    destination,
    isNR,
    originIndex,
    rutas,
  ]);

  const exwCandidates = useMemo(() => {
    if (!pais || !activeIndex || !destination) return [];
    if (isNR) return getOriginsInCountry(activeIndex, pais.value);
    if (!originIndex) return [];
    return getRatedOriginsInCountryForDestination(
      originIndex,
      pais.value,
      destination.value,
      rutas,
      (ruta) => getValidityClass(ruta.validUntil) !== "expired",
    );
  }, [pais, activeIndex, destination, isNR, originIndex, rutas]);

  useEffect(() => {
    if (incoterm !== "EXW" || !pickupCoords || !exwCandidates.length) return;
    const nearest = rankRatedOriginsByDistance(pickupCoords, exwCandidates, 1);
    if (nearest[0]) {
      setOrigin({
        value: nearest[0].origin.normalized,
        label: nearest[0].origin.label,
      });
    }
  }, [incoterm, pickupCoords, exwCandidates]);

  useEffect(() => {
    if (routeMode !== "noRecurrente" || !origin || !destination) return;
    const match = filterAirRoutesForOd({
      rutas,
      originNormalized: origin.value,
      destinationNormalized: destination.value,
    });
    if (match.length > 0) {
      setRouteMode("recurrente");
      setSinTarifa(false);
    }
  }, [routeMode, origin, destination, rutas]);

  const filteredRoutes = useMemo(() => {
    if (!origin || !destination || routeMode !== "recurrente") return [];
    return collapseAirRoutesByCarrier(
      filterAirRoutesForOd({
        rutas,
        originNormalized: origin.value,
        destinationNormalized: destination.value,
      }),
    );
  }, [origin, destination, routeMode, rutas]);

  useEffect(() => {
    if (!origin || !destination || !incoterm) return;
    if (routeMode === "noRecurrente") {
      setRutaSeleccionada(
        createPendingAirRoute({
          originLabel: origin.label,
          originNormalized: origin.value,
          destinationLabel: destination.label,
          destinationNormalized: destination.value,
        }),
      );
      setSinTarifa(true);
      return;
    }
    if (routeMode === "recurrente" && filteredRoutes.length === 0) {
      setRutaSeleccionada(
        createPendingAirRoute({
          originLabel: origin.label,
          originNormalized: origin.value,
          destinationLabel: destination.label,
          destinationNormalized: destination.value,
        }),
      );
      setSinTarifa(true);
      return;
    }
    if (filteredRoutes.length > 0) {
      setSinTarifa(false);
      setRutaSeleccionada((prev) =>
        prev && filteredRoutes.some((r) => r.id === prev.id) ? prev : null,
      );
    }
  }, [routeMode, origin, destination, incoterm, filteredRoutes]);

  const routeReady =
    !!pais &&
    !!destination &&
    !!incoterm &&
    (airConnect && incoterm === "EXW"
      ? isValidSpainPostalCode(spainPostal) && !!origin
      : incoterm === "FCA"
        ? !!origin
        : incoterm === "EXW"
          ? !!pickupCoords && !!origin
          : false) &&
    !!rutaSeleccionada &&
    isAirRouteSelectable(rutaSeleccionada);

  const resetDownstream = () => {
    setDestination(null);
    setIncoterm("");
    setOrigin(null);
    setPickupAddress("");
    setPickupCoords(null);
    setSpainPostal("");
    setRutaSeleccionada(null);
    setSinTarifa(false);
  };

  const selectMode = (mode: "recurrente" | "noRecurrente") => {
    setRouteMode(mode);
    setPais(null);
    resetDownstream();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={brand.primary} />
        <Text style={styles.muted}>Cargando tarifas aéreas…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const showFcaOrigin =
    !!destination &&
    (incoterm === "FCA" ||
      (incoterm === "EXW" &&
        airConnect &&
        isValidSpainPostalCode(spainPostal)));

  return (
    <View style={styles.root}>
      <Text style={styles.section}>Tipo de ruta</Text>
      <View style={styles.modeRow}>
        {(
          [
            { key: "recurrente", label: "Recurrente" },
            { key: "noRecurrente", label: "No recurrente" },
          ] as const
        ).map((m) => (
          <Pressable
            key={m.key}
            style={[styles.modeBtn, routeMode === m.key && styles.modeBtnOn]}
            onPress={() => selectMode(m.key)}
          >
            <Text
              style={[
                styles.modeText,
                routeMode === m.key && styles.modeTextOn,
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!routeMode ? (
        <Text style={styles.hint}>
          Elige si la ruta es recurrente (con tarifa en sheet) o no recurrente.
        </Text>
      ) : (
        <>
          <CotizadorSelectField
            label="País de origen"
            value={pais?.value || ""}
            options={countryOptions}
            onChange={(opt) => {
              setPais(opt);
              resetDownstream();
              if (
                opt.value === SPAIN_COUNTRY_CODE &&
                routeMode === "recurrente"
              ) {
                setDestination(SANTIAGO_DESTINATION_OPTION);
              }
            }}
          />

          <CotizadorSelectField
            label="Destino"
            value={destination?.value || ""}
            options={destinationOptions}
            disabled={!pais}
            onChange={(opt) => {
              setDestination(opt);
              setIncoterm("");
              setOrigin(null);
              setPickupCoords(null);
              setRutaSeleccionada(null);
              setSinTarifa(false);
            }}
          />

          <CotizadorSelectField
            label="Incoterm"
            value={incoterm}
            options={[
              { value: "EXW", label: "EXW" },
              { value: "FCA", label: "FCA" },
            ]}
            disabled={!destination}
            searchable={false}
            onChange={(opt) => {
              setIncoterm(opt.value as Incoterm);
              setOrigin(null);
              setPickupCoords(null);
              setPickupAddress("");
              setSpainPostal("");
              setRutaSeleccionada(null);
              setSinTarifa(false);
            }}
          />
        </>
      )}

      {routeMode && destination && incoterm === "EXW" && airConnect ? (
        <View style={styles.wrapInput}>
          <Text style={styles.fieldLabel}>Código postal (España)</Text>
          <TextInput
            value={spainPostal}
            onChangeText={(t) =>
              setSpainPostal(t.replace(/\D/g, "").slice(0, 5))
            }
            keyboardType="number-pad"
            placeholder="28001"
            placeholderTextColor={brand.mutedLight}
            style={[
              styles.textBox,
              spainPostal &&
                !isValidSpainPostalCode(spainPostal) &&
                styles.textBoxError,
            ]}
          />
          {spainPostal && !isValidSpainPostalCode(spainPostal) ? (
            <Text style={styles.fieldError}>
              Ingresa un CP español de 5 dígitos.
            </Text>
          ) : null}
        </View>
      ) : null}

      {routeMode && destination && incoterm === "EXW" && !airConnect ? (
        <ExwPickupMap
          coords={pickupCoords}
          address={pickupAddress}
          onAddressChange={setPickupAddress}
          onCoordsChange={setPickupCoords}
        />
      ) : null}

      {showFcaOrigin ? (
        <CotizadorSelectField
          label="Origen (aeropuerto)"
          value={origin?.value || ""}
          options={originOptions}
          onChange={(opt) => {
            setOrigin(opt);
            setRutaSeleccionada(null);
            setSinTarifa(false);
          }}
        />
      ) : null}

      {incoterm === "EXW" && pickupCoords && origin ? (
        <Text style={styles.hint}>
          Aeropuerto de origen sugerido: {origin.label}
        </Text>
      ) : null}

      {airConnect ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>AirConnect España → SCL</Text>
          <Text style={styles.noticeBody}>
            Esta ruta usa el flujo especial AirConnect (igual que en la web).
          </Text>
        </View>
      ) : null}

      {origin && destination && rutaSeleccionada && sinTarifa ? (
        <>
          <Text style={styles.section}>Ruta sin tarifa publicada</Text>
          <AirRateCard
            ruta={rutaSeleccionada}
            selected
            pending
            onPress={() => undefined}
          />
        </>
      ) : null}

      {routeMode === "recurrente" && origin && destination && !sinTarifa ? (
        <>
          <Text style={styles.section}>
            Tarifas disponibles ({filteredRoutes.length})
          </Text>
          {filteredRoutes.length === 0 ? (
            <Text style={styles.muted}>
              No hay tarifas vigentes para esta combinación.
            </Text>
          ) : (
            filteredRoutes.map((ruta) => (
              <AirRateCard
                key={ruta.id}
                ruta={ruta}
                selected={rutaSeleccionada?.id === ruta.id}
                onPress={() => {
                  if (!isAirRouteSelectable(ruta)) return;
                  setRutaSeleccionada(ruta);
                }}
              />
            ))
          )}
        </>
      ) : null}

      <Pressable
        style={[styles.confirm, !routeReady && styles.confirmDisabled]}
        disabled={!routeReady}
        onPress={() => {
          if (
            !routeReady ||
            !pais ||
            !destination ||
            !origin ||
            !rutaSeleccionada ||
            !routeMode
          ) {
            return;
          }
          onConfirm({
            routeMode,
            incoterm: incoterm as "EXW" | "FCA",
            pais,
            destination,
            origin,
            ruta: rutaSeleccionada,
            sinTarifa,
            pickupAddress: pickupAddress || undefined,
            pickupCoords: pickupCoords || undefined,
            spainPostalCode: spainPostal || undefined,
            airConnect,
          });
        }}
      >
        <Text style={styles.confirmText}>Confirmar ruta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  center: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  section: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  modeBtnOn: {
    borderColor: brand.navy,
    backgroundColor: brand.navy,
  },
  modeText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: brand.navy,
  },
  modeTextOn: { color: "#fff" },
  hint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
    lineHeight: 18,
  },
  muted: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: "center",
  },
  fieldError: {
    color: "#b91c1c",
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  retry: {
    backgroundColor: brand.navy,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
  },
  notice: {
    backgroundColor: "#E8F1FB",
    borderRadius: radii.md,
    padding: 12,
    gap: 4,
  },
  noticeTitle: {
    fontFamily: fonts.semiBold,
    color: brand.navy,
    fontSize: 13,
  },
  noticeBody: {
    fontFamily: fonts.regular,
    color: brand.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  confirm: {
    marginTop: 8,
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmDisabled: { opacity: 0.4 },
  confirmText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  wrapInput: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  textBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    backgroundColor: brand.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    color: brand.navy,
    fontSize: 14,
  },
  textBoxError: { borderColor: "#ef4444" },
});
