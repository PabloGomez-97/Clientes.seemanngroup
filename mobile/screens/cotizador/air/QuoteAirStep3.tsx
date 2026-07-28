import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { airportCoordinates } from "../../../../src/config/airportCoordinates";
import {
  DEFAULT_AEREO_COTIZADOR,
  DEFAULT_GESTION_COTIZADOR_CONFIG,
  getVespucioExtendedMultiplier,
  isAirUltimaMillaEligibleDestination,
  type IAereoCotizadorConfig,
  type AereoTtBracketResult,
} from "../../../../src/types/gestionCotizador";
import { DEFAULT_CONFIG as DEFAULT_ADUANA_CONFIG } from "../../../../src/types/agenciaAduana";
import type { IAgenciaAduanaConfig } from "../../../../src/types/agenciaAduana";
import type { VespucioDeliveryZone } from "../../../../src/config/vespucioRing";
import {
  DESCONSOLIDACION_AMOUNT,
  calculateAirBaseWithoutSeguro,
  calculateAduanaAmount,
  calculateSeguroAmount,
  calculateUltimaMillaAmount,
  computeAirFreightQuoteValues,
  resolveUltimaMillaBracket,
} from "../../../../src/components/quotes/Handlers/Air/airQuotePricingShared";
import { MOBILE_API_BASE } from "../../../../src/auth/authApi";
import { useAuth } from "../../../auth/AuthContext";
import UltimaMillaDeliveryMap from "../../../components/cotizador/UltimaMillaDeliveryMap";
import { brand, radii, spacing } from "../../../theme/brand";
import { fonts } from "../../../theme/typography";
import type { AirStep1Result } from "./QuoteAirStep1";
import type { AirStep2Result, AirStep3Result } from "./airWizardTypes";

type Props = {
  step1: AirStep1Result;
  step2: AirStep2Result;
  profitMarkupPct: number;
  onConfirm: (result: AirStep3Result) => void;
};

export default function QuoteAirStep3({
  step1,
  step2,
  profitMarkupPct,
  onConfirm,
}: Props) {
  const { token } = useAuth();
  const [seguroActivo, setSeguroActivo] = useState(false);
  const [valorMercaderia, setValorMercaderia] = useState("");
  const [gastolocal, setGastolocal] = useState(false);
  const [liveTrackingActivo, setLiveTrackingActivo] = useState(false);
  const [aduanaActivo, setAduanaActivo] = useState(false);
  const [valorProductoAduana, setValorProductoAduana] = useState("");
  const [aduanaMaster, setAduanaMaster] = useState<boolean | null>(null);

  const [ultimaMillaActivo, setUltimaMillaActivo] = useState(false);
  const [ultimaMillaDireccion, setUltimaMillaDireccion] = useState("");
  const [ultimaMillaZone, setUltimaMillaZone] =
    useState<VespucioDeliveryZone | null>(null);
  const [ultimaMillaBracket, setUltimaMillaBracket] =
    useState<AereoTtBracketResult | null>(null);

  const [aereoConfig, setAereoConfig] = useState<IAereoCotizadorConfig>(
    DEFAULT_AEREO_COTIZADOR,
  );
  const [aduanaConfig, setAduanaConfig] =
    useState<IAgenciaAduanaConfig>(DEFAULT_ADUANA_CONFIG);
  const [loadingCfg, setLoadingCfg] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCfg(true);
      try {
        const [gestionRes, aduanaRes] = await Promise.all([
          fetch(`${MOBILE_API_BASE}/api/gestion-cotizador/config`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(`${MOBILE_API_BASE}/api/agencia-aduana/config`),
        ]);
        if (!cancelled && gestionRes.ok) {
          const data = await gestionRes.json();
          setAereoConfig(data.aereo || DEFAULT_GESTION_COTIZADOR_CONFIG.aereo);
        }
        if (!cancelled && aduanaRes.ok) {
          const data = await aduanaRes.json();
          setAduanaConfig({
            exchangeRates: data.exchangeRates,
            charges: data.charges,
            updatedBy: data.updatedBy,
          });
        }
      } catch {
        // defaults already set
      } finally {
        if (!cancelled) setLoadingCfg(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const baseInput = useMemo(
    () => ({
      ruta: step1.ruta,
      incoterm: step1.incoterm,
      sinTarifa: step1.sinTarifa,
      cargo: {
        mode: step2.mode,
        pieces: step2.pieces,
        overallPieces: step2.overallPieces,
      },
      profitMarkupPct,
      noApilableActivo: step2.noApilableActivo,
    }),
    [step1, step2, profitMarkupPct],
  );

  const freight = useMemo(
    () => computeAirFreightQuoteValues(baseInput),
    [baseInput],
  );

  const baseWithoutSeguro = useMemo(() => {
    if (!freight) return 0;
    return calculateAirBaseWithoutSeguro(baseInput, freight.incomeAmount);
  }, [baseInput, freight]);

  const seguroMonto = useMemo(
    () =>
      calculateSeguroAmount({
        activo: seguroActivo,
        valorMercaderia,
        baseWithoutSeguro,
      }),
    [seguroActivo, valorMercaderia, baseWithoutSeguro],
  );

  const vespucioMult = useMemo(
    () => getVespucioExtendedMultiplier(aereoConfig.vespucioExtendedSurchargePct),
    [aereoConfig.vespucioExtendedSurchargePct],
  );

  const umEligible = isAirUltimaMillaEligibleDestination(
    step1.ruta.destinationNormalized,
    step1.ruta.destination,
  );
  const umBracket = resolveUltimaMillaBracket(step2.totalRealWeight, aereoConfig);
  const umInRange = umBracket !== null;

  const umAmount = calculateUltimaMillaAmount({
    activo: ultimaMillaActivo,
    bracket: ultimaMillaBracket,
    zone: ultimaMillaZone,
    extendedMultiplier: vespucioMult,
  });

  const aduanaAmount = calculateAduanaAmount({
    activo: aduanaActivo,
    valorProducto: valorProductoAduana,
    costoTransporte: baseWithoutSeguro,
    seguroActivo,
    seguroMonto,
    currency: freight?.currency || step1.ruta.currency || "USD",
    config: aduanaConfig,
  });

  const airport = airportCoordinates.santiago_de_chile;

  const toggleSeguro = (on: boolean) => {
    setSeguroActivo(on);
    if (on && aduanaMaster === null) setAduanaMaster(false);
    if (!on && aduanaMaster === false) setAduanaMaster(aduanaActivo ? true : null);
  };

  const toggleAduana = (on: boolean) => {
    setAduanaActivo(on);
    if (on && aduanaMaster === null) setAduanaMaster(true);
    if (!on && aduanaMaster === true) setAduanaMaster(seguroActivo ? false : null);
    if (on && seguroActivo && valorMercaderia && !valorProductoAduana) {
      setValorProductoAduana(valorMercaderia);
    }
  };

  const onValorMercaderia = (v: string) => {
    setValorMercaderia(v);
    if (aduanaMaster === false && aduanaActivo) setValorProductoAduana(v);
  };

  const onValorProducto = (v: string) => {
    setValorProductoAduana(v);
    if (aduanaMaster === true && seguroActivo) setValorMercaderia(v);
  };

  const canConfirmUltimaMilla =
    umEligible &&
    umInRange &&
    ultimaMillaDireccion.trim().length > 0 &&
    ultimaMillaZone !== null &&
    ultimaMillaZone !== "outside" &&
    umBracket !== null;

  const seguroOk = !seguroActivo || (parseFloat(valorMercaderia.replace(",", ".")) || 0) > 0;
  const aduanaOk =
    !aduanaActivo || (parseFloat(valorProductoAduana.replace(",", ".")) || 0) > 0;
  const umOk =
    !ultimaMillaActivo ||
    (ultimaMillaBracket !== null &&
      ultimaMillaZone !== null &&
      ultimaMillaZone !== "outside");

  const canContinue = seguroOk && aduanaOk && umOk && !!freight;

  if (loadingCfg) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={brand.navy} />
        <Text style={styles.loadingText}>Cargando servicios…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Paso 3 · Servicios adicionales</Text>
      <Text style={styles.hint}>
        Cargo chargeable: {step2.chargeableWeight.toFixed(2)} kg ·{" "}
        {freight?.currency || step1.ruta.currency}
      </Text>

      <AddonCard
        title="Seguro de carga"
        active={seguroActivo}
        onToggle={toggleSeguro}
        amount={seguroActivo ? seguroMonto : null}
        currency={freight?.currency}
      >
        {seguroActivo ? (
          <View style={styles.field}>
            <Text style={styles.label}>
              Valor mercadería ({freight?.currency || "USD"}) *
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={valorMercaderia}
              onChangeText={onValorMercaderia}
              placeholder="0"
              placeholderTextColor={brand.muted}
            />
            {aduanaActivo ? (
              <Text style={styles.syncHint}>
                Se sincroniza con el valor de producto de aduana.
              </Text>
            ) : null}
          </View>
        ) : null}
      </AddonCard>

      <AddonCard
        title="Desconsolidación (gastos locales)"
        active={gastolocal}
        onToggle={setGastolocal}
        amount={gastolocal ? DESCONSOLIDACION_AMOUNT : null}
        currency={freight?.currency}
      />

      <AddonCard
        title="Live Tracking"
        active={liveTrackingActivo}
        onToggle={setLiveTrackingActivo}
        amount={liveTrackingActivo ? 0 : null}
        currency={freight?.currency}
        subtitle="Sin costo adicional"
      />

      {umEligible ? (
        <AddonCard
          title="Última milla SCL"
          active={ultimaMillaActivo}
          onToggle={(on) => {
            if (!on) {
              setUltimaMillaActivo(false);
              setUltimaMillaBracket(null);
              setUltimaMillaZone(null);
              return;
            }
            if (!umInRange) return;
            // Se activa al confirmar dirección
          }}
          amount={ultimaMillaActivo ? umAmount : null}
          currency={freight?.currency}
          hideSwitch
        >
          {!umInRange ? (
            <Text style={styles.warn}>
              El peso real debe estar entre 1 y {aereoConfig.maxKg} kg.
            </Text>
          ) : (
            <>
              <UltimaMillaDeliveryMap
                airportCoords={{ lat: airport.lat, lng: airport.lng }}
                address={ultimaMillaDireccion}
                onAddressChange={setUltimaMillaDireccion}
                extendedPct={aereoConfig.vespucioExtendedSurchargePct}
                onZoneChange={(zone) => {
                  setUltimaMillaZone(zone);
                  if (zone && zone !== "outside" && umBracket) {
                    setUltimaMillaBracket(umBracket);
                    setUltimaMillaActivo(true);
                  } else {
                    setUltimaMillaActivo(false);
                    setUltimaMillaBracket(null);
                  }
                }}
              />
              {canConfirmUltimaMilla && ultimaMillaActivo ? (
                <Text style={styles.ok}>
                  Última milla activa · {freight?.currency} {umAmount.toFixed(2)}
                </Text>
              ) : null}
            </>
          )}
        </AddonCard>
      ) : (
        <View style={styles.disabledCard}>
          <Text style={styles.disabledTitle}>Última milla SCL</Text>
          <Text style={styles.disabledBody}>
            Disponible solo con destino Santiago de Chile.
          </Text>
        </View>
      )}

      <AddonCard
        title="Agencia de aduana"
        active={aduanaActivo}
        onToggle={toggleAduana}
        amount={aduanaActivo ? aduanaAmount : null}
        currency={freight?.currency}
      >
        {aduanaActivo ? (
          <View style={styles.field}>
            <Text style={styles.label}>
              Valor producto ({freight?.currency || "USD"}) *
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={valorProductoAduana}
              onChangeText={onValorProducto}
              placeholder="0"
              placeholderTextColor={brand.muted}
            />
            {seguroActivo ? (
              <Text style={styles.syncHint}>
                Se sincroniza con el valor de mercadería del seguro.
              </Text>
            ) : null}
          </View>
        ) : null}
      </AddonCard>

      <Pressable
        style={[styles.primaryBtn, !canContinue && styles.primaryDisabled]}
        disabled={!canContinue}
        onPress={() =>
          onConfirm({
            seguroActivo,
            valorMercaderia,
            gastolocal,
            liveTrackingActivo,
            ultimaMillaActivo,
            ultimaMillaDireccion,
            ultimaMillaZone,
            ultimaMillaBracket,
            aduanaActivo,
            valorProductoAduana,
            aduanaMaster,
          })
        }
      >
        <Text style={styles.primaryBtnText}>Continuar</Text>
      </Pressable>
    </View>
  );
}

function AddonCard({
  title,
  subtitle,
  active,
  onToggle,
  amount,
  currency,
  children,
  hideSwitch,
}: {
  title: string;
  subtitle?: string;
  active: boolean;
  onToggle: (v: boolean) => void;
  amount: number | null;
  currency?: string;
  children?: ReactNode;
  hideSwitch?: boolean;
}) {
  return (
    <View style={[styles.card, active && styles.cardActive]}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
          {amount != null ? (
            <Text style={styles.cardAmount}>
              {currency || "USD"} {amount.toFixed(2)}
            </Text>
          ) : null}
        </View>
        {!hideSwitch ? (
          <Switch value={active} onValueChange={onToggle} />
        ) : null}
      </View>
      {children ? <View style={styles.cardBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  loading: { alignItems: "center", gap: 8, paddingVertical: 40 },
  loadingText: { fontFamily: fonts.regular, color: brand.muted },
  title: { fontSize: 16, fontFamily: fonts.semiBold, color: brand.navy },
  hint: { fontSize: 12, fontFamily: fonts.medium, color: brand.primary },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    gap: 8,
  },
  cardActive: { borderColor: brand.primary },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: brand.navy },
  cardSub: { fontSize: 12, fontFamily: fonts.regular, color: brand.muted },
  cardAmount: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.primary,
  },
  cardBody: { gap: 8, marginTop: 4 },
  field: { gap: 4 },
  label: { fontSize: 12, fontFamily: fonts.medium, color: brand.muted },
  input: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: brand.navy,
    backgroundColor: brand.canvas,
  },
  syncHint: { fontSize: 11, fontFamily: fonts.regular, color: brand.muted },
  warn: { fontSize: 12, fontFamily: fonts.medium, color: "#b42318" },
  ok: { fontSize: 12, fontFamily: fonts.semiBold, color: "#15803d" },
  disabledCard: {
    backgroundColor: brand.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    opacity: 0.7,
  },
  disabledTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: brand.muted },
  disabledBody: { fontSize: 12, fontFamily: fonts.regular, color: brand.muted, marginTop: 4 },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: brand.navy,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryDisabled: { opacity: 0.4 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontFamily: fonts.semiBold },
});
