import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PieceData } from "../../../../src/components/quotes/Handlers/Air/HandlerQuoteAir";
import type { OverallPieceDataAir } from "../../../../src/components/quotes/Handlers/Air/airQuoteCargoShared";
import {
  MAX_AIR_PIECES,
  MAX_AIR_TOTAL_WEIGHT_KG,
  analyzeAirOversize,
  applyDetailedPieceDimensions,
  calculateDetailedTotals,
  calculateOverallTotalsAir,
  createInitialAirPieceData,
  createOverallPieceAir,
  isDetailedCargoReady,
  isOverallCargoReady,
} from "../../../../src/components/quotes/Handlers/Air/airQuoteCargoShared";
import { MOBILE_API_BASE } from "../../../../src/auth/authApi";
import { useAuth } from "../../../auth/AuthContext";
import { brand, radii, spacing } from "../../../theme/brand";
import { fonts } from "../../../theme/typography";
import type { AirStep1Result } from "./QuoteAirStep1";
import type { AirCargoMode, AirStep2Result } from "./airWizardTypes";

type Props = {
  step1: AirStep1Result;
  onConfirm: (result: AirStep2Result) => void;
};

function parseNum(raw: string): number {
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function QuoteAirStep2({ step1, onConfirm }: Props) {
  const { token, user } = useAuth();
  const [mode, setMode] = useState<AirCargoMode>("detailed");
  const [pieces, setPieces] = useState<PieceData[]>([
    createInitialAirPieceData("1"),
  ]);
  const [overallPieces, setOverallPieces] = useState<OverallPieceDataAir[]>([
    createOverallPieceAir("1"),
  ]);
  const [openId, setOpenId] = useState("1");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySent, setNotifySent] = useState(false);

  const detailedTotals = useMemo(() => calculateDetailedTotals(pieces), [pieces]);
  const overallTotals = useMemo(
    () => calculateOverallTotalsAir(overallPieces),
    [overallPieces],
  );
  const totals = useMemo(() => {
    if (mode === "overall") {
      return {
        totalRealWeight: overallTotals.totalWeight,
        totalVolumetricWeight: overallTotals.totalVolumetricWeight,
        chargeableWeight: overallTotals.chargeableWeight,
      };
    }
    return {
      totalRealWeight: detailedTotals.totalRealWeight,
      totalVolumetricWeight: detailedTotals.totalVolumetricWeight,
      chargeableWeight: detailedTotals.chargeableWeight,
    };
  }, [mode, detailedTotals, overallTotals]);
  const oversize =
    mode === "detailed"
      ? analyzeAirOversize(pieces)
      : { oversize: false, heightBlocked: false, cargoFlight: false };

  const noApilableActivo =
    step1.incoterm === "EXW" &&
    mode === "detailed" &&
    pieces.some((p) => p.noApilable);

  const weightError =
    totals.totalRealWeight > MAX_AIR_TOTAL_WEIGHT_KG
      ? `El peso total no puede exceder ${MAX_AIR_TOTAL_WEIGHT_KG} kg`
      : null;

  const canContinue =
    !weightError &&
    (mode === "overall"
      ? isOverallCargoReady(overallPieces)
      : isDetailedCargoReady(pieces));

  const hasOversizeAlert =
    oversize.oversize || oversize.heightBlocked || oversize.cargoFlight;

  const updatePiece = (
    id: string,
    patch: Partial<
      Pick<PieceData, "length" | "width" | "height" | "weight" | "noApilable">
    >,
  ) => {
    setPieces((prev) =>
      prev.map((p) =>
        p.id === id ? applyDetailedPieceDimensions(p, patch) : p,
      ),
    );
  };

  const addPiece = () => {
    if (pieces.length >= MAX_AIR_PIECES) {
      Alert.alert("Máximo de piezas", `Puedes agregar hasta ${MAX_AIR_PIECES} piezas.`);
      return;
    }
    const id = String(pieces.length + 1);
    setPieces((prev) => [...prev, createInitialAirPieceData(id)]);
    setOpenId(id);
  };

  const removePiece = (id: string) => {
    if (pieces.length <= 1) return;
    const next = pieces
      .filter((p) => p.id !== id)
      .map((p, i) => ({ ...p, id: String(i + 1) }));
    setPieces(next);
    setOpenId(next[0]?.id || "1");
  };

  const addOverall = () => {
    if (overallPieces.length >= MAX_AIR_PIECES) {
      Alert.alert("Máximo de piezas", `Puedes agregar hasta ${MAX_AIR_PIECES} piezas.`);
      return;
    }
    const id = String(overallPieces.length + 1);
    setOverallPieces((prev) => [...prev, createOverallPieceAir(id)]);
    setOpenId(id);
  };

  const removeOverall = (id: string) => {
    if (overallPieces.length <= 1) return;
    const next = overallPieces
      .filter((p) => p.id !== id)
      .map((p, i) => createOverallPieceAir(String(i + 1), p.weight, p.volume));
    setOverallPieces(next);
    setOpenId(next[0]?.id || "1");
  };

  const notifyExecutive = async () => {
    if (!token) return;
    setNotifyLoading(true);
    try {
      const reasons: string[] = [];
      if (oversize.oversize) reasons.push("oversize");
      if (oversize.heightBlocked) reasons.push("no-apta-aereo");
      if (oversize.cargoFlight) reasons.push("vuelo-carguero");

      const piezasResumen =
        mode === "overall"
          ? overallPieces
              .map(
                (p, i) =>
                  `Pieza ${i + 1}: ${p.volume.toFixed(4)} m³ / ${p.weight.toFixed(2)} kg`,
              )
              .join("\n")
          : pieces
              .map(
                (p, i) =>
                  `Pieza ${i + 1}: ${p.length}×${p.width}×${p.height} cm / ${p.weight.toFixed(2)} kg`,
              )
              .join("\n");

      const res = await fetch(`${MOBILE_API_BASE}/api/send-oversize-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origen: step1.ruta.origin,
          destino: step1.ruta.destination,
          carrier: step1.ruta.carrier || "",
          validUntil: step1.ruta.validUntil || "",
          motivos: reasons,
          descripcion: "Cargamento Aéreo",
          incoterm: step1.incoterm,
          piezas: piezasResumen,
          clienteNombre: user?.nombreuser || user?.username || "",
          clienteEmail: user?.email || "",
        }),
      });
      if (!res.ok) throw new Error("Error al notificar");
      setNotifySent(true);
    } catch {
      Alert.alert("Error", "No se pudo notificar al ejecutivo. Intenta de nuevo.");
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Paso 2 · Cargamento</Text>
      <Text style={styles.hint}>
        {step1.ruta.origin} → {step1.ruta.destination} · {step1.incoterm}
      </Text>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, mode === "detailed" && styles.modeBtnOn]}
          onPress={() => setMode("detailed")}
        >
          <Text
            style={[styles.modeText, mode === "detailed" && styles.modeTextOn]}
          >
            Piezas detalladas
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === "overall" && styles.modeBtnOn]}
          onPress={() => setMode("overall")}
        >
          <Text
            style={[styles.modeText, mode === "overall" && styles.modeTextOn]}
          >
            Overall
          </Text>
        </Pressable>
      </View>

      {mode === "detailed"
        ? pieces.map((piece, index) => {
            const open = openId === piece.id;
            return (
              <View key={piece.id} style={styles.card}>
                <Pressable
                  style={styles.cardHead}
                  onPress={() => setOpenId(open ? "" : piece.id)}
                >
                  <Text style={styles.cardTitle}>Pieza {index + 1}</Text>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={brand.muted}
                  />
                </Pressable>
                {open ? (
                  <View style={styles.cardBody}>
                    <View style={styles.row3}>
                      <NumField
                        label="Largo (cm)"
                        value={piece.length}
                        onChange={(n) => updatePiece(piece.id, { length: n })}
                      />
                      <NumField
                        label="Ancho (cm)"
                        value={piece.width}
                        onChange={(n) => updatePiece(piece.id, { width: n })}
                      />
                      <NumField
                        label="Alto (cm)"
                        value={piece.height}
                        onChange={(n) => updatePiece(piece.id, { height: n })}
                      />
                    </View>
                    <NumField
                      label="Peso (kg)"
                      value={piece.weight}
                      onChange={(n) => updatePiece(piece.id, { weight: n })}
                    />
                    {step1.incoterm === "EXW" ? (
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>No apilable</Text>
                        <Switch
                          value={piece.noApilable}
                          onValueChange={(v) =>
                            updatePiece(piece.id, { noApilable: v })
                          }
                        />
                      </View>
                    ) : null}
                    <Text style={styles.meta}>
                      Vol: {piece.volume.toFixed(4)} m³ · Vol.wt:{" "}
                      {piece.volumeWeight.toFixed(2)} kg
                    </Text>
                    {pieces.length > 1 ? (
                      <Pressable onPress={() => removePiece(piece.id)}>
                        <Text style={styles.remove}>Eliminar pieza</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        : overallPieces.map((piece, index) => {
            const open = openId === piece.id;
            return (
              <View key={piece.id} style={styles.card}>
                <Pressable
                  style={styles.cardHead}
                  onPress={() => setOpenId(open ? "" : piece.id)}
                >
                  <Text style={styles.cardTitle}>Pieza overall {index + 1}</Text>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={brand.muted}
                  />
                </Pressable>
                {open ? (
                  <View style={styles.cardBody}>
                    <NumField
                      label="Peso (kg)"
                      value={piece.weight}
                      onChange={(n) =>
                        setOverallPieces((prev) =>
                          prev.map((p) =>
                            p.id === piece.id
                              ? createOverallPieceAir(p.id, n, p.volume)
                              : p,
                          ),
                        )
                      }
                    />
                    <NumField
                      label="Volumen (m³)"
                      value={piece.volume}
                      onChange={(n) =>
                        setOverallPieces((prev) =>
                          prev.map((p) =>
                            p.id === piece.id
                              ? createOverallPieceAir(p.id, p.weight, n)
                              : p,
                          ),
                        )
                      }
                    />
                    <Text style={styles.meta}>
                      Vol.wt: {piece.volumeWeight.toFixed(2)} kg
                    </Text>
                    {overallPieces.length > 1 ? (
                      <Pressable onPress={() => removeOverall(piece.id)}>
                        <Text style={styles.remove}>Eliminar pieza</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}

      <Pressable
        style={styles.addBtn}
        onPress={mode === "overall" ? addOverall : addPiece}
      >
        <Ionicons name="add-circle-outline" size={18} color={brand.primary} />
        <Text style={styles.addText}>Agregar pieza</Text>
      </Pressable>

      <View style={styles.totals}>
        <Text style={styles.totalsTitle}>Totales</Text>
        <Text style={styles.totalsLine}>
          Peso real: {totals.totalRealWeight.toFixed(2)} kg
        </Text>
        <Text style={styles.totalsLine}>
          Peso volumétrico: {totals.totalVolumetricWeight.toFixed(2)} kg
        </Text>
        <Text style={styles.totalsCharge}>
          Chargeable: {totals.chargeableWeight.toFixed(2)} kg
        </Text>
      </View>

      {weightError ? <Text style={styles.error}>{weightError}</Text> : null}

      {hasOversizeAlert ? (
        <View style={styles.oversizeBox}>
          <Text style={styles.oversizeTitle}>Aviso de sobredimensión</Text>
          {oversize.oversize ? (
            <Text style={styles.oversizeLine}>
              Largo o ancho supera 300 cm — requiere análisis caso a caso.
            </Text>
          ) : null}
          {oversize.heightBlocked ? (
            <Text style={styles.oversizeLine}>
              Alto supera 240 cm — no apta para aéreo estándar.
            </Text>
          ) : null}
          {oversize.cargoFlight ? (
            <Text style={styles.oversizeLine}>
              Alto supera 160 cm — posible vuelo carguero.
            </Text>
          ) : null}
          <Text style={styles.oversizeHint}>
            Puedes continuar. Si quieres, notifica a tu ejecutivo con estos datos.
          </Text>
          <Pressable
            style={[styles.notifyBtn, notifySent && styles.notifyDone]}
            disabled={notifyLoading || notifySent}
            onPress={() => void notifyExecutive()}
          >
            <Text style={styles.notifyText}>
              {notifySent
                ? "Ejecutivo notificado"
                : notifyLoading
                  ? "Enviando…"
                  : "Notificar a mi ejecutivo"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[styles.primaryBtn, !canContinue && styles.primaryDisabled]}
        disabled={!canContinue}
        onPress={() =>
          onConfirm({
            mode,
            pieces,
            overallPieces,
            totalRealWeight: totals.totalRealWeight,
            totalVolumetricWeight: totals.totalVolumetricWeight,
            chargeableWeight: totals.chargeableWeight,
            oversize,
            noApilableActivo,
          })
        }
      >
        <Text style={styles.primaryBtnText}>Continuar</Text>
      </Pressable>
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={value ? String(value) : ""}
        onChangeText={(t) => onChange(parseNum(t))}
        placeholder="0"
        placeholderTextColor={brand.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { fontSize: 16, fontFamily: fonts.semiBold, color: brand.navy },
  hint: { fontSize: 12, fontFamily: fonts.medium, color: brand.primary },
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: brand.surface,
  },
  modeBtnOn: { backgroundColor: brand.navy, borderColor: brand.navy },
  modeText: { fontSize: 13, fontFamily: fonts.medium, color: brand.inkSecondary },
  modeTextOn: { color: "#fff", fontFamily: fonts.semiBold },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  cardTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: brand.navy },
  cardBody: { padding: spacing.md, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.border },
  row3: { flexDirection: "row", gap: 8 },
  field: { flex: 1, gap: 4 },
  label: { fontSize: 11, fontFamily: fonts.medium, color: brand.muted },
  input: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: brand.navy,
    backgroundColor: brand.canvas,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { fontSize: 13, fontFamily: fonts.medium, color: brand.navy },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: brand.muted },
  remove: { fontSize: 13, fontFamily: fonts.medium, color: "#b42318" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  addText: { fontSize: 14, fontFamily: fonts.semiBold, color: brand.primary },
  totals: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    gap: 4,
  },
  totalsTitle: { fontSize: 13, fontFamily: fonts.semiBold, color: brand.navy },
  totalsLine: { fontSize: 13, fontFamily: fonts.regular, color: brand.inkSecondary },
  totalsCharge: { fontSize: 14, fontFamily: fonts.semiBold, color: brand.primary, marginTop: 4 },
  error: { fontSize: 13, fontFamily: fonts.medium, color: "#b42318" },
  oversizeBox: {
    backgroundColor: "#fff8f7",
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  oversizeTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: "#b42318" },
  oversizeLine: { fontSize: 13, fontFamily: fonts.regular, color: brand.inkSecondary },
  oversizeHint: { fontSize: 12, fontFamily: fonts.regular, color: brand.muted, marginTop: 4 },
  notifyBtn: {
    marginTop: 6,
    backgroundColor: "#b42318",
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  notifyDone: { backgroundColor: "#15803d" },
  notifyText: { color: "#fff", fontFamily: fonts.semiBold, fontSize: 13 },
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
