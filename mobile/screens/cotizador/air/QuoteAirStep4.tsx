import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MOBILE_API_BASE } from "../../../../src/auth/authApi";
import {
  BANK_FEE_AMOUNT,
  buildAirPdfCharges,
  calculateAirBaseWithoutSeguro,
  calculateExportExwCif,
  calculateSeguroAmount,
  computeAirFreightQuoteValues,
  isExportExw,
  isExportFcaOrExw,
} from "../../../../src/components/quotes/Handlers/Air/airQuotePricingShared";
import { formatAirTradeTypeLabel } from "../../../../src/components/quotes/Handlers/Air/airQuoteStep1Shared";
import {
  fetchStorageAtSheet,
  type StorageAtSheetData,
} from "../../../../src/components/administrador/pricing/storage-at/storageAtSheet";
import { buildAirOperacionDetalle } from "../../../../src/components/quotes/Operations/buildOperacionDetalleEmail";
import {
  DEFAULT_CONFIG as DEFAULT_ADUANA_CONFIG,
  type IAgenciaAduanaConfig,
} from "../../../../src/types/agenciaAduana";
import {
  DEFAULT_GESTION_COTIZADOR_CONFIG,
  findAereoTtBracket,
  getVespucioExtendedMultiplier,
  type IAereoCotizadorConfig,
} from "../../../../src/types/gestionCotizador";
import {
  AIR_CONNECT_CURRENCY,
  type AirConnectPricedOffer,
} from "../../../../src/services/airConnectSpainQuote";
import { useAuth } from "../../../auth/AuthContext";
import { useLinbisToken } from "../../../hooks/useLinbisToken";
import { isStaffUser } from "../../../auth/portalRouting";
import GenerateOperationModal from "../../../components/cotizador/GenerateOperationModal";
import {
  computeAirConnectStep3Extra,
  fetchMobileAirConnectOffers,
  shareAirQuotePdf,
  submitAirQuote,
} from "../../../services/airQuoteSubmit";
import type { CrearOperacionPayload } from "../../../services/crearOperacionApi";
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
  const [generatedQuoteNumber, setGeneratedQuoteNumber] = useState<string | null>(
    null,
  );
  const [showOperationModal, setShowOperationModal] = useState(false);

  const [acLoading, setAcLoading] = useState(false);
  const [acError, setAcError] = useState<string | null>(null);
  const [acOffers, setAcOffers] = useState<AirConnectPricedOffer[]>([]);
  const [selectedOffer, setSelectedOffer] =
    useState<AirConnectPricedOffer | null>(null);
  const [aduanaConfig, setAduanaConfig] =
    useState<IAgenciaAduanaConfig>(DEFAULT_ADUANA_CONFIG);
  const [aereoConfig, setAereoConfig] = useState<IAereoCotizadorConfig>(
    DEFAULT_GESTION_COTIZADOR_CONFIG.aereo,
  );
  const [vespucioMult, setVespucioMult] = useState(1.45);
  const [storageAtData, setStorageAtData] =
    useState<StorageAtSheetData | null>(null);
  const [valorCargaExportExw, setValorCargaExportExw] = useState("");

  const isExportSpecial = isExportFcaOrExw(step1.tradeType, step1.incoterm);
  const isExportExwFlow = isExportExw(step1.tradeType, step1.incoterm);
  const tradeTypeLabel = formatAirTradeTypeLabel(step1.tradeType);

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
      tradeType: step1.tradeType,
      storageAtData,
      aereoTtConfig: aereoConfig,
    }),
    [step1, step2, profitMarkupPct, storageAtData, aereoConfig],
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
        setAereoConfig(aereo);
        setVespucioMult(
          getVespucioExtendedMultiplier(aereo.vespucioExtendedSurchargePct),
        );
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isExportSpecial) {
      setStorageAtData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sheet = await fetchStorageAtSheet();
        if (!cancelled) setStorageAtData(sheet);
      } catch {
        // A/T TEISA usa mínimo si falla
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isExportSpecial]);

  useEffect(() => {
    if (!isExportExwFlow) setValorCargaExportExw("");
  }, [isExportExwFlow]);

  const valorMercaderiaForCharges = useMemo(() => {
    if (step3.seguroActivo) return step3.valorMercaderia;
    if (isExportExwFlow) return valorCargaExportExw;
    return step3.valorMercaderia;
  }, [
    step3.seguroActivo,
    step3.valorMercaderia,
    isExportExwFlow,
    valorCargaExportExw,
  ]);

  useEffect(() => {
    if (!freight) {
      setPdfPreview([]);
      return;
    }
    setPdfPreview(
      buildAirPdfCharges({
        base,
        freight,
        addons: {
          seguroActivo: step3.seguroActivo,
          valorMercaderia: valorMercaderiaForCharges,
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
        aduanaConfig,
        vespucioExtendedMultiplier: vespucioMult,
        zeroAmounts: step1.sinTarifa,
      }),
    );
  }, [
    base,
    freight,
    step1.sinTarifa,
    step2.noApilableActivo,
    step3,
    valorMercaderiaForCharges,
    aduanaConfig,
    vespucioMult,
  ]);

  const baseWithoutSeguro = useMemo(() => {
    if (!freight) return 0;
    return calculateAirBaseWithoutSeguro(base, freight.incomeAmount);
  }, [base, freight]);

  /** CIF Export EXW: sin Bank Fee / CBA / CUSD */
  const costoTransporteCif = useMemo(() => {
    if (!isExportExwFlow) return baseWithoutSeguro;
    return Math.max(0, baseWithoutSeguro - BANK_FEE_AMOUNT);
  }, [isExportExwFlow, baseWithoutSeguro]);

  const seguroMonto = useMemo(
    () =>
      calculateSeguroAmount({
        activo: step3.seguroActivo,
        valorMercaderia: step3.valorMercaderia,
        baseWithoutSeguro,
      }),
    [step3.seguroActivo, step3.valorMercaderia, baseWithoutSeguro],
  );

  const valorCargaForExportExwCif = useMemo(() => {
    if (!isExportExwFlow) return 0;
    if (step3.seguroActivo) {
      return parseFloat(step3.valorMercaderia.replace(",", ".")) || 0;
    }
    return parseFloat(valorCargaExportExw.replace(",", ".")) || 0;
  }, [
    isExportExwFlow,
    step3.seguroActivo,
    step3.valorMercaderia,
    valorCargaExportExw,
  ]);

  const exportExwCif = useMemo(() => {
    if (!isExportExwFlow || valorCargaForExportExwCif <= 0) {
      return { cif: 0, seguroParaCif: 0 };
    }
    return calculateExportExwCif({
      valorProducto: valorCargaForExportExwCif,
      costoTransporte: costoTransporteCif,
      seguroActivo: step3.seguroActivo,
      seguroMonto,
    });
  }, [
    isExportExwFlow,
    valorCargaForExportExwCif,
    costoTransporteCif,
    step3.seguroActivo,
    seguroMonto,
  ]);

  const exportExwTtAmount =
    isExportExwFlow
      ? findAereoTtBracket(step2.totalRealWeight, aereoConfig)?.amount ?? 0
      : 0;

  const exportExwMissingCargoValue =
    isExportExwFlow &&
    !step3.seguroActivo &&
    valorCargaForExportExwCif <= 0;

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
    !exportExwMissingCargoValue &&
    (!isExportExwFlow || exportExwTtAmount > 0) &&
    (!step1.airConnect || !!selectedOffer) &&
    (step1.airConnect || !!freight || step1.sinTarifa);

  const handleSubmit = async () => {
    if (!token || !canSubmit) return;
    if (exportExwMissingCargoValue) {
      Alert.alert(
        "Valor de carga",
        "Debes ingresar el valor de la carga o agregar Seguro de Carga para generar la cotización.",
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    setDoneMsg(null);
    try {
      const result = await submitAirQuote({
        step1,
        step2,
        step3,
        valorCargaExportExw: isExportExwFlow ? valorCargaExportExw : undefined,
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
      setGeneratedQuoteNumber(result.quoteNumber);
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

  const operationEmailContext =
    useMemo((): CrearOperacionPayload["emailContext"] | undefined => {
      if (!quoteGenerated) return undefined;

      if (step1.airConnect && selectedOffer) {
        const airlineLabel = selectedOffer.via
          ? `${selectedOffer.airline} (vía ${selectedOffer.via})`
          : selectedOffer.airline;
        const totalAmount = selectedOffer.incomeWithLand + acExtra;
        const ventaTotal = `${AIR_CONNECT_CURRENCY} ${totalAmount.toFixed(2)}`;
        const cw = step2.chargeableWeight;
        return {
          origen: step1.ruta.origin,
          destino: step1.ruta.destination,
          carrier: airlineLabel,
          incoterm: step1.incoterm || undefined,
          pickupFromAddress:
            step1.incoterm === "EXW" ? step1.pickupAddress : undefined,
          deliveryToAddress:
            step1.incoterm === "EXW" ? step1.ruta.destination : undefined,
          description: "Cargamento Aéreo",
          chargeableWeight: cw,
          currency: AIR_CONNECT_CURRENCY,
          total: ventaTotal,
          agente: step1.ruta.company || undefined,
          operacionDetalle: buildAirOperacionDetalle({
            ruta: {
              ...step1.ruta,
              carrier: airlineLabel || step1.ruta.carrier,
            },
            description: "Cargamento Aéreo",
            chargeableWeight: cw,
            expenseAmount: selectedOffer.apiWithLand,
            expenseRate: cw > 0 ? selectedOffer.apiWithLand / cw : 0,
            ventaTotal,
          }),
        };
      }

      if (!freight) return undefined;
      const ventaTotal = `${currency} ${totalPreview.toFixed(2)}`;
      return {
        origen: step1.ruta.origin,
        destino: step1.ruta.destination,
        carrier: step1.ruta.carrier || undefined,
        incoterm: step1.incoterm || undefined,
        pickupFromAddress:
          step1.incoterm === "EXW" ? step1.pickupAddress : undefined,
        deliveryToAddress:
          step1.incoterm === "EXW" ? step1.ruta.destination : undefined,
        description: "Cargamento Aéreo",
        chargeableWeight: step2.chargeableWeight,
        currency,
        total: ventaTotal,
        agente: step1.ruta.company || undefined,
        operacionDetalle: buildAirOperacionDetalle({
          ruta: step1.ruta,
          description: "Cargamento Aéreo",
          chargeableWeight: step2.chargeableWeight,
          expenseAmount: freight.expenseAmount,
          expenseRate: freight.expenseRate,
          ventaTotal,
        }),
      };
    }, [
      quoteGenerated,
      step1,
      step2.chargeableWeight,
      selectedOffer,
      acExtra,
      freight,
      currency,
      totalPreview,
    ]);

  const operationValidUntil = step1.airConnect
    ? selectedOffer?.validity ?? null
    : step1.ruta.validUntil ?? null;

  const canConvertToOperation =
    quoteGenerated && !step1.sinTarifa && !!generatedQuoteNumber;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Paso 4 · Revisión</Text>
      <Text style={styles.hint}>
        {step1.ruta.origin} → {step1.ruta.destination} · {step1.incoterm}
        {step1.sinTarifa ? " · Sin tarifa" : ""}
        {step1.airConnect ? " · AirConnect" : ""}
        {` · ${tradeTypeLabel.replace(/^Tipo:\s*/i, "")}`}
      </Text>

      <View style={styles.summary}>
        <Row label="Cliente" value={clientName || effectiveUsername} />
        <Row label="Tipo" value={tradeTypeLabel.replace(/^Tipo:\s*/i, "")} />
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

      {isExportExwFlow ? (
        <View style={styles.cifBox}>
          <Text style={styles.sectionTitle}>
            Valor de la carga / CIF (Exportación EXW)
          </Text>
          <Text style={styles.cifHint}>
            Custom Broker y Customs Declaration se calculan sobre el CIF. Si no
            agregaste Seguro en el Paso 3, ingresa el valor de la carga aquí.
          </Text>
          {!step3.seguroActivo ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                Valor de la carga ({currency}) *
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={valorCargaExportExw}
                onChangeText={setValorCargaExportExw}
                placeholder="0"
                placeholderTextColor={brand.muted}
                editable={!quoteGenerated}
              />
            </View>
          ) : (
            <Text style={styles.cifHint}>
              Usando valor de mercadería del Seguro: {currency}{" "}
              {valorCargaForExportExwCif.toFixed(2)}
            </Text>
          )}
          {valorCargaForExportExwCif > 0 ? (
            <View style={styles.cifRows}>
              <Row
                label="Valor producto"
                value={`${currency} ${valorCargaForExportExwCif.toFixed(2)}`}
              />
              <Row
                label="Costo transporte"
                value={`${currency} ${costoTransporteCif.toFixed(2)}`}
              />
              <Row
                label="Seguro (CIF)"
                value={`${currency} ${exportExwCif.seguroParaCif.toFixed(2)}`}
              />
              <Row
                label="CIF"
                value={`${currency} ${exportExwCif.cif.toFixed(2)}`}
              />
            </View>
          ) : null}
          {exportExwMissingCargoValue ? (
            <Text style={styles.warn}>
              Debes ingresar el valor de la carga o agregar Seguro de Carga para
              generar la cotización.
            </Text>
          ) : null}
          {isExportExwFlow && exportExwTtAmount <= 0 ? (
            <Text style={styles.warn}>
              Transporte Terrestre: el peso real debe estar entre 1 y{" "}
              {aereoConfig.maxKg} kg.
            </Text>
          ) : null}
        </View>
      ) : null}

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
              const offerExtra = computeAirConnectStep3Extra({
                offer,
                step3,
                aduanaConfig,
                vespucioMult,
              });
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
                    EUR {(offer.incomeWithLand + offerExtra).toFixed(2)}
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
          {canConvertToOperation ? (
            <Pressable
              style={styles.convertBtn}
              onPress={() => setShowOperationModal(true)}
            >
              <Text style={styles.primaryBtnText}>Convertir en operación</Text>
            </Pressable>
          ) : null}
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

      {generatedQuoteNumber ? (
        <GenerateOperationModal
          show={showOperationModal}
          onClose={() => setShowOperationModal(false)}
          quoteNumber={generatedQuoteNumber}
          tipoServicio="AIR"
          emailContext={operationEmailContext}
          validUntil={operationValidUntil}
          ownerUsername={staff ? effectiveUsername : undefined}
        />
      ) : null}
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
  cifBox: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    gap: 10,
  },
  cifHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
    lineHeight: 17,
  },
  cifRows: { gap: 6 },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12, fontFamily: fonts.medium, color: brand.muted },
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
  warn: { fontSize: 12, fontFamily: fonts.medium, color: "#b42318" },
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
  convertBtn: {
    marginTop: 4,
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
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
