import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MOBILE_API_BASE } from "../../../../src/auth/authApi";
import {
  buildAirPdfCharges,
  computeAirFreightQuoteValues,
} from "../../../../src/components/quotes/Handlers/Air/airQuotePricingShared";
import {
  DEFAULT_CONFIG as DEFAULT_ADUANA_CONFIG,
  type IAgenciaAduanaConfig,
} from "../../../../src/types/agenciaAduana";
import {
  DEFAULT_GESTION_COTIZADOR_CONFIG,
  getVespucioExtendedMultiplier,
} from "../../../../src/types/gestionCotizador";
import type { AirConnectPricedOffer } from "../../../../src/services/airConnectSpainQuote";
import { useAuth } from "../../../auth/AuthContext";
import { useLinbisToken } from "../../../hooks/useLinbisToken";
import { isStaffUser } from "../../../auth/portalRouting";
import {
  computeAirConnectStep3Extra,
  fetchMobileAirConnectOffers,
  shareAirQuotePdf,
  submitAirQuote,
} from "../../../services/airQuoteSubmit";
import { brand, radii, spacing } from "../../../theme/brand";
import { fonts } from "../../../theme/typography";
import type { AirStep1Result } from "./QuoteAirStep1";
import type { AirStep2Result, AirStep3Result } from "./airWizardTypes";

type Props = {
  step1: AirStep1Result;
  step2: AirStep2Result;
  step3: AirStep3Result;
  clientUsername?: string;
  clientName?: string;
  /** Mongo User _id — markup ya se resolvió en el wizard; se conserva por paridad con web */
  clientUserId?: string;
  profitMarkupPct: number;
  onCloseHome?: () => void;
};

export default function QuoteAirStep4({
  step1,
  step2,
  step3,
  clientUsername,
  clientName,
  profitMarkupPct,
  onCloseHome,
}: Props) {
  const { user, token, activeUsername } = useAuth();
  const { accessToken, refreshAccessToken, loading: linbisLoading } =
    useLinbisToken();
  const staff = isStaffUser(user);

  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string | null>(null);
  const [quoteGenerated, setQuoteGenerated] = useState(false);

  const [acLoading, setAcLoading] = useState(false);
  const [acError, setAcError] = useState<string | null>(null);
  const [acOffers, setAcOffers] = useState<AirConnectPricedOffer[]>([]);
  const [selectedOffer, setSelectedOffer] =
    useState<AirConnectPricedOffer | null>(null);
  const [aduanaConfig, setAduanaConfig] =
    useState<IAgenciaAduanaConfig>(DEFAULT_ADUANA_CONFIG);
  const [vespucioMult, setVespucioMult] = useState(1.45);

  const effectiveUsername = staff
    ? clientUsername || ""
    : activeUsername || user?.username || "";

  const salesRepName = staff
    ? user?.nombreuser || user?.username || ""
    : user?.ejecutivo?.nombre?.trim() || "";

  const salesRep =
    typeof user?.ejecutivo?.idInterno === "number"
      ? { id: user.ejecutivo.idInterno }
      : { name: salesRepName };

  const base = useMemo(
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
    () => computeAirFreightQuoteValues(base),
    [base],
  );

  const [pdfPreview, setPdfPreview] = useState<
    ReturnType<typeof buildAirPdfCharges>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [g, a] = await Promise.all([
          fetch(`${MOBILE_API_BASE}/api/gestion-cotizador/config`),
          fetch(`${MOBILE_API_BASE}/api/agencia-aduana/config`),
        ]);
        let aereo = DEFAULT_GESTION_COTIZADOR_CONFIG.aereo;
        let aduana = DEFAULT_ADUANA_CONFIG;
        if (g.ok) {
          const data = await g.json();
          if (data.aereo) aereo = data.aereo;
        }
        if (a.ok) {
          const data = await a.json();
          aduana = {
            exchangeRates: data.exchangeRates,
            charges: data.charges,
            updatedBy: data.updatedBy,
          };
        }
        if (cancelled) return;
        setAduanaConfig(aduana);
        const mult = getVespucioExtendedMultiplier(
          aereo.vespucioExtendedSurchargePct,
        );
        setVespucioMult(mult);
        if (freight) {
          setPdfPreview(
            buildAirPdfCharges({
              base,
              freight,
              addons: {
                seguroActivo: step3.seguroActivo,
                valorMercaderia: step3.valorMercaderia,
                gastolocal: step3.gastolocal,
                liveTrackingActivo: step3.liveTrackingActivo,
                ultimaMillaActivo: step3.ultimaMillaActivo,
                ultimaMillaDireccion: step3.ultimaMillaDireccion,
                ultimaMillaZone: step3.ultimaMillaZone,
                ultimaMillaBracket: step3.ultimaMillaBracket,
                aduanaActivo: step3.aduanaActivo,
                valorProductoAduana: step3.valorProductoAduana,
                noApilableActivo: step2.noApilableActivo,
              },
              aduanaConfig: aduana,
              vespucioExtendedMultiplier: mult,
              zeroAmounts: step1.sinTarifa,
            }),
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [base, freight, step1.sinTarifa, step2.noApilableActivo, step3]);

  useEffect(() => {
    if (!step1.airConnect || !token) return;
    let cancelled = false;
    (async () => {
      setAcLoading(true);
      setAcError(null);
      try {
        const offers = await fetchMobileAirConnectOffers({
          step1,
          step2,
          portalToken: token,
          contactCompanyName:
            clientName || clientUsername || effectiveUsername || "Seemann Group",
        });
        if (cancelled) return;
        setAcOffers(offers);
        if (offers[0]) setSelectedOffer(offers[0]);
      } catch (e) {
        if (!cancelled) {
          setAcError(
            e instanceof Error ? e.message : "Error al obtener ofertas AirConnect",
          );
        }
      } finally {
        if (!cancelled) setAcLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    step1,
    step2,
    token,
    clientName,
    clientUsername,
    effectiveUsername,
  ]);

  const totalPreview = pdfPreview.reduce((s, c) => s + c.amount, 0);
  const currency = freight?.currency || step1.ruta.currency || "USD";

  const acExtra =
    selectedOffer != null
      ? computeAirConnectStep3Extra({
          offer: selectedOffer,
          step3,
          aduanaConfig,
          vespucioMult,
        })
      : 0;

  const canSubmit =
    !quoteGenerated &&
    !!token &&
    !!effectiveUsername &&
    !linbisLoading &&
    !submitting &&
    (!step1.airConnect || !!selectedOffer) &&
    (step1.airConnect || !!freight || step1.sinTarifa);

  const handleSubmit = async () => {
    if (!token || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    setDoneMsg(null);
    try {
      const result = await submitAirQuote({
        step1,
        step2,
        step3,
        effectiveUsername,
        clientName: clientName || effectiveUsername,
        salesRep,
        salesRepName,
        ejecutivoEmail: staff
          ? user?.ejecutivo?.email || user?.email
          : user?.ejecutivo?.email,
        ejecutivoNombre: staff
          ? user?.ejecutivo?.nombre || user?.nombreuser || user?.username
          : user?.ejecutivo?.nombre,
        portalToken: token,
        accessToken,
        refreshAccessToken,
        profitMarkupPct,
        airConnectOffer: step1.airConnect ? selectedOffer : null,
        airConnectStep3Extra: step1.airConnect ? acExtra : 0,
      });
      setGeneratedPdfUri(result.pdfUri);
      setQuoteGenerated(true);
      setDoneMsg(`Cotización ${result.quoteNumber} creada correctamente.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al generar cotización";
      setError(msg);
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!generatedPdfUri) {
      Alert.alert("PDF", "No hay PDF disponible para compartir.");
      return;
    }
    setSharing(true);
    try {
      await shareAirQuotePdf(generatedPdfUri);
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo compartir el PDF",
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Paso 4 · Revisión</Text>
      <Text style={styles.hint}>
        {step1.ruta.origin} → {step1.ruta.destination} · {step1.incoterm}
        {step1.sinTarifa ? " · Sin tarifa" : ""}
        {step1.airConnect ? " · AirConnect" : ""}
      </Text>

      <View style={styles.summary}>
        <Row label="Cliente" value={clientName || effectiveUsername} />
        <Row
          label="Modo carga"
          value={step2.mode === "overall" ? "Overall" : "Piezas detalladas"}
        />
        <Row
          label="Chargeable"
          value={`${step2.chargeableWeight.toFixed(2)} kg`}
        />
        <Row
          label="Servicios"
          value={[
            step3.seguroActivo ? "Seguro" : null,
            step3.gastolocal ? "Desconsol." : null,
            step3.liveTrackingActivo ? "Live Tracking" : null,
            step3.ultimaMillaActivo ? "Última milla" : null,
            step3.aduanaActivo ? "Aduana" : null,
          ]
            .filter(Boolean)
            .join(", ") || "Ninguno"}
        />
      </View>

      {step1.airConnect ? (
        <View style={styles.acBox}>
          <Text style={styles.sectionTitle}>Ofertas AirConnect</Text>
          {acLoading ? (
            <ActivityIndicator color={brand.navy} />
          ) : acError ? (
            <Text style={styles.error}>{acError}</Text>
          ) : (
            acOffers.map((offer) => {
              const on = selectedOffer?.key === offer.key;
              const label = offer.via
                ? `${offer.airline} (vía ${offer.via})`
                : offer.airline;
              return (
                <Pressable
                  key={offer.key}
                  style={[styles.offer, on && styles.offerOn]}
                  disabled={quoteGenerated}
                  onPress={() => setSelectedOffer(offer)}
                >
                  <Text style={[styles.offerTitle, on && styles.offerTitleOn]}>
                    {label}
                  </Text>
                  <Text style={[styles.offerAmt, on && styles.offerTitleOn]}>
                    EUR {(offer.incomeWithLand + (on ? acExtra : 0)).toFixed(2)}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      ) : staff ? (
        <View style={styles.chargesWrap}>
          <View style={styles.staffWarn}>
            <Text style={styles.staffWarnText}>
              Los cargos estimados NO los puede ver el cliente
            </Text>
          </View>
          <View style={styles.chargesBox}>
            <Text style={styles.sectionTitle}>Cargos estimados</Text>
            {step1.sinTarifa ? (
              <Text style={styles.pending}>
                Pendiente de tarifa: el ejecutivo recibirá tu solicitud.
              </Text>
            ) : null}
            {pdfPreview.map((c) => (
              <View key={`${c.code}-${c.description}`} style={styles.chargeRow}>
                <Text style={styles.chargeLabel}>{c.description}</Text>
                <Text style={styles.chargeAmt}>
                  {currency} {c.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmt}>
                {currency} {totalPreview.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      ) : step1.sinTarifa ? (
        <Text style={styles.pending}>
          Pendiente de tarifa: el ejecutivo recibirá tu solicitud.
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {doneMsg ? <Text style={styles.ok}>{doneMsg}</Text> : null}

      {quoteGenerated ? (
        <View style={styles.postActions}>
          <Pressable
            style={[styles.primaryBtn, sharing && styles.primaryDisabled]}
            disabled={sharing || !generatedPdfUri}
            onPress={() => void handleShare()}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Compartir PDF</Text>
            )}
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => onCloseHome?.()}>
            <Text style={styles.secondaryBtnText}>Cerrar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.primaryBtn, !canSubmit && styles.primaryDisabled]}
          disabled={!canSubmit}
          onPress={() => void handleSubmit()}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Generar cotización</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { fontSize: 16, fontFamily: fonts.semiBold, color: brand.navy },
  hint: { fontSize: 12, fontFamily: fonts.medium, color: brand.primary },
  summary: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    gap: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  rowLabel: { fontSize: 12, fontFamily: fonts.medium, color: brand.muted },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    marginBottom: 4,
  },
  chargesWrap: { gap: 8 },
  staffWarn: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  staffWarnText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: "#92400e",
  },
  chargesBox: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    gap: 6,
  },
  chargeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  chargeLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.inkSecondary,
  },
  chargeAmt: { fontSize: 12, fontFamily: fonts.medium, color: brand.navy },
  totalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: brand.navy },
  totalAmt: { fontSize: 14, fontFamily: fonts.semiBold, color: brand.primary },
  pending: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#92400e",
    backgroundColor: "#fef3c7",
    padding: 8,
    borderRadius: radii.sm,
  },
  acBox: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    gap: 8,
  },
  offer: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  offerOn: { backgroundColor: brand.navy, borderColor: brand.navy },
  offerTitle: { fontSize: 13, fontFamily: fonts.semiBold, color: brand.navy },
  offerTitleOn: { color: "#fff" },
  offerAmt: { fontSize: 13, fontFamily: fonts.medium, color: brand.primary },
  error: { fontSize: 13, fontFamily: fonts.medium, color: "#b42318" },
  ok: { fontSize: 13, fontFamily: fonts.medium, color: "#15803d" },
  postActions: { gap: 10, marginTop: 4 },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: brand.navy,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryDisabled: { opacity: 0.4 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontFamily: fonts.semiBold },
  secondaryBtn: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: brand.navy,
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
});
