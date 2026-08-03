import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { useAuth } from "../../auth/AuthContext";
import {
  downloadOperacionDocumento,
  fetchGroundOperacionDocumentos,
  fetchOperacionDocumentos,
  toUnifiedOperacionalDoc,
  type OperacionModoDocs,
} from "../../services/operacionDetailApi";
import {
  formatDocDate,
  type MobileDocItem,
  type UnifiedDoc,
} from "../../services/documentsApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import { DetailSection } from "./DetailFields";

type Props =
  | {
      mode: "air" | "ocean";
      quoteNumber: string | null;
      quoteLoading?: boolean;
    }
  | {
      mode: "ground";
      shipmentId: string | number | null | undefined;
    };

function groupByTipo(docs: MobileDocItem[]): Array<[string, MobileDocItem[]]> {
  const map = new Map<string, MobileDocItem[]>();
  for (const doc of docs) {
    const tipo = doc.tipo?.trim() || "Otros Documentos";
    const list = map.get(tipo) ?? [];
    list.push(doc);
    map.set(tipo, list);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
}

export default function OperacionDocumentosSection(props: Props) {
  const { token, activeUsername } = useAuth();
  const [docs, setDocs] = useState<MobileDocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openTipos, setOpenTipos] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const mode = props.mode;
  const quoteNumber = props.mode === "ground" ? null : props.quoteNumber;
  const quoteLoading = props.mode === "ground" ? false : Boolean(props.quoteLoading);
  const shipmentId = props.mode === "ground" ? props.shipmentId : null;

  const load = useCallback(async () => {
    if (!token || !activeUsername) {
      setDocs([]);
      return;
    }

    if (mode === "ground") {
      if (!shipmentId) {
        setDocs([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await fetchGroundOperacionDocumentos(
          token,
          activeUsername,
          shipmentId,
        );
        setDocs(list);
        const first = list[0]?.tipo;
        setOpenTipos(first ? new Set([first]) : new Set());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar documentos",
        );
        setDocs([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!quoteNumber) {
      setDocs([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const modo: OperacionModoDocs = mode === "air" ? "aereo" : "maritimo";
    try {
      const list = await fetchOperacionDocumentos(
        token,
        activeUsername,
        quoteNumber,
        modo,
      );
      setDocs(list);
      const first = list[0]?.tipo;
      setOpenTipos(first ? new Set([first]) : new Set());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar documentos",
      );
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [activeUsername, mode, quoteNumber, shipmentId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupByTipo(docs), [docs]);

  const onDownload = async (doc: MobileDocItem) => {
    if (!token || !activeUsername) return;
    const unified: UnifiedDoc = toUnifiedOperacionalDoc(
      doc,
      mode === "air" ? "air" : mode === "ocean" ? "ocean" : "ground",
    );
    setBusyId(doc.id);
    try {
      const result = await downloadOperacionDocumento(
        token,
        activeUsername,
        unified,
      );
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Descarga lista", result.fileName);
        return;
      }
      await Sharing.shareAsync(result.uri, { dialogTitle: result.fileName });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "No se pudo descargar",
      );
    } finally {
      setBusyId(null);
    }
  };

  const subtitle =
    mode === "ground"
      ? undefined
      : quoteLoading
        ? "Buscando cotización…"
        : quoteNumber
          ? `Cotización ${quoteNumber}`
          : "Sin cotización vinculada";

  return (
    <DetailSection title="Documentos Operacionales">
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {loading ? (
        <View style={styles.centerRow}>
          <ActivityIndicator size="small" color={brand.navy} />
          <Text style={styles.hint}>Cargando documentos…</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : mode !== "ground" && !quoteNumber && !quoteLoading ? (
        <Text style={styles.hint}>
          No hay cotización vinculada para mostrar documentos.
        </Text>
      ) : groups.length === 0 ? (
        <Text style={styles.hint}>Sin documentos operacionales.</Text>
      ) : (
        <View style={styles.folders}>
          {groups.map(([tipo, items]) => {
            const open = openTipos.has(tipo);
            return (
              <View key={tipo} style={styles.folder}>
                <Pressable
                  style={styles.folderHeader}
                  onPress={() =>
                    setOpenTipos((prev) => {
                      const next = new Set(prev);
                      if (next.has(tipo)) next.delete(tipo);
                      else next.add(tipo);
                      return next;
                    })
                  }
                >
                  <View style={styles.folderLeft}>
                    <Ionicons
                      name={open ? "folder-open-outline" : "folder-outline"}
                      size={16}
                      color={brand.navy}
                    />
                    <Text style={styles.folderName} numberOfLines={1}>
                      {tipo}
                    </Text>
                  </View>
                  <View style={styles.folderRight}>
                    <Text style={styles.count}>{items.length}</Text>
                    <Ionicons
                      name={open ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={brand.muted}
                    />
                  </View>
                </Pressable>

                {open
                  ? items.map((doc) => {
                      const busy = busyId === doc.id;
                      return (
                        <View key={doc.id} style={styles.fileRow}>
                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName} numberOfLines={1}>
                              {doc.nombreArchivo}
                            </Text>
                            <Text style={styles.fileMeta}>
                              {[
                                doc.tamanoMB ? `${doc.tamanoMB} MB` : null,
                                formatDocDate(doc.fechaSubida),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Text>
                          </View>
                          <Pressable
                            style={styles.downloadBtn}
                            onPress={() => void onDownload(doc)}
                            disabled={busy}
                          >
                            {busy ? (
                              <ActivityIndicator
                                size="small"
                                color={brand.navy}
                              />
                            ) : (
                              <Ionicons
                                name="download-outline"
                                size={18}
                                color={brand.navy}
                              />
                            )}
                          </Pressable>
                        </View>
                      );
                    })
                  : null}
              </View>
            );
          })}
        </View>
      )}
    </DetailSection>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginBottom: spacing.sm,
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hint: {
    fontSize: 13,
    color: brand.muted,
    fontFamily: fonts.medium,
    lineHeight: 18,
  },
  error: {
    fontSize: 13,
    color: "#b91c1c",
    fontFamily: fonts.medium,
  },
  folders: {
    gap: 8,
  },
  folder: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: brand.canvasAlt,
  },
  folderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  folderName: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  folderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  count: {
    minWidth: 18,
    textAlign: "center",
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.muted,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
    backgroundColor: brand.surface,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.inkSecondary,
  },
  fileMeta: {
    marginTop: 2,
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brand.canvasAlt,
  },
});
