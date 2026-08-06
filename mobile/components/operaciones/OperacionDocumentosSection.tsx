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
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useAuth } from "../../auth/AuthContext";
import {
  downloadOperacionDocumento,
  fetchGroundOperacionDocumentos,
  fetchOperacionDocumentos,
  toUnifiedOperacionalDoc,
  uploadGroundOperacionDocumento,
  uploadOperacionDocumento,
  type OperacionModoDocs,
} from "../../services/operacionDetailApi";
import {
  formatDocDate,
  type MobileDocItem,
  type UnifiedDoc,
} from "../../services/documentsApi";
import {
  DOCUMENT_FORMATS_HINT,
  DOCUMENT_MAX_FILE_SIZE,
  isAllowedDocumentUpload,
  mimeFromDocumentFileName,
  resolveDocumentMime,
} from "@/utils/documentFileTypes";
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

const TIPOS_AIR = [
  "Documento de transporte Internacional (AWB)",
  "Facturas asociados al servicio",
  "Invoice",
  "Packing List",
  "Certificado de Origen",
  "Póliza de Seguro",
  "Declaración de ingreso (DNI)",
  "Guía de despacho",
  "SDA",
  "Papeleta",
  "Transporte local",
  "Otros Documentos",
] as const;

const TIPOS_OCEAN = [
  "Bill of Lading (BL)",
  "Facturas asociadas al servicio",
  "Endoso",
  "Invoice",
  "Packing List",
  "Certificado de Origen",
  "Póliza de Seguro",
  "Declaración de ingreso (DIN)",
  "Guía de despacho / Delivery Order",
  "SDA",
  "Papeleta",
  "Transporte local",
  "Warehouse Receipt",
  "Mate's Receipt / Received for shipment",
  "Otros Documentos",
] as const;

const TIPOS_GROUND = [
  "Carta de porte / Guía de remisión / CMR",
  "Prueba de entrega (POD / remito firmado)",
  "Factura comercial (Invoice)",
  "Packing List",
  "Póliza/Certificado de seguro de transporte",
  "Permisos/autorizaciones (sobredimensionada, especiales)",
  "Documentación del vehículo y conductor (licencia, tarjeta)",
  "Documentos aduaneros/transito (T1, TIR, manifiesto)",
  "Documentos ADR / MSDS (mercancías peligrosas)",
  "Orden/confirmación y factura del transportista (freight invoice)",
  "Delivery Order / Warehouse Receipt (si hay almacenaje)",
  "Certificado de Origen",
  "Papeleta",
  "Otros Documentos",
] as const;

function groupByTipo(
  docs: MobileDocItem[],
  tipos: readonly string[],
): Array<[string, MobileDocItem[]]> {
  const map = new Map<string, MobileDocItem[]>();
  for (const tipo of tipos) map.set(tipo, []);
  for (const doc of docs) {
    const tipo = doc.tipo?.trim() || "Otros Documentos";
    const list = map.get(tipo) ?? [];
    list.push(doc);
    map.set(tipo, list);
  }
  const known = tipos.map((tipo) => [tipo, map.get(tipo) ?? []] as [string, MobileDocItem[]]);
  const extras = [...map.entries()]
    .filter(([tipo]) => !tipos.includes(tipo))
    .sort((a, b) => a[0].localeCompare(b[0], "es"));
  return [...known, ...extras];
}

export default function OperacionDocumentosSection(props: Props) {
  const { token, activeUsername } = useAuth();
  const [docs, setDocs] = useState<MobileDocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTipos, setOpenTipos] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const mode = props.mode;
  const quoteNumber = props.mode === "ground" ? null : props.quoteNumber;
  const quoteLoading =
    props.mode === "ground" ? false : Boolean(props.quoteLoading);
  const shipmentId = props.mode === "ground" ? props.shipmentId : null;

  const tipos = useMemo(() => {
    if (mode === "air") return TIPOS_AIR as readonly string[];
    if (mode === "ocean") return TIPOS_OCEAN as readonly string[];
    return TIPOS_GROUND as readonly string[];
  }, [mode]);

  const canUpload =
    mode === "ground"
      ? Boolean(token && activeUsername && shipmentId)
      : Boolean(token && activeUsername && quoteNumber && !quoteLoading);

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

  const groups = useMemo(() => groupByTipo(docs, tipos), [docs, tipos]);

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

  const onUpload = async (tipo: string) => {
    if (!token || !activeUsername || !canUpload) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const name = asset.name || "documento";
      if (!isAllowedDocumentUpload(name, asset.mimeType)) {
        Alert.alert("Formato no permitido", DOCUMENT_FORMATS_HINT);
        return;
      }
      if (asset.size != null && asset.size > DOCUMENT_MAX_FILE_SIZE) {
        Alert.alert("Archivo demasiado grande", `"${name}" excede 15MB.`);
        return;
      }

      setUploadingTipo(tipo);
      setError(null);

      const FileSystem = await import("expo-file-system/legacy");
      const raw = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime =
        resolveDocumentMime(name, asset.mimeType) ||
        mimeFromDocumentFileName(name) ||
        "application/octet-stream";
      const contenidoBase64 = `data:${mime};base64,${raw}`;

      if (mode === "ground") {
        if (!shipmentId) return;
        await uploadGroundOperacionDocumento(token, activeUsername, {
          shipmentId,
          tipo,
          nombreArchivo: name,
          contenidoBase64,
        });
      } else {
        if (!quoteNumber) return;
        await uploadOperacionDocumento(token, activeUsername, {
          quoteNumber,
          modo: mode === "air" ? "aereo" : "maritimo",
          tipo,
          nombreArchivo: name,
          contenidoBase64,
        });
      }

      setOpenTipos((prev) => new Set(prev).add(tipo));
      await load();
      Alert.alert("Listo", `"${name}" subido correctamente.`);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "No se pudo subir el documento",
      );
    } finally {
      setUploadingTipo(null);
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
      <Text style={styles.hintFormats}>{DOCUMENT_FORMATS_HINT}</Text>

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
      ) : (
        <View style={styles.folders}>
          {groups.map(([tipo, items]) => {
            const open = openTipos.has(tipo);
            const uploading = uploadingTipo === tipo;
            return (
              <View key={tipo} style={styles.folder}>
                <View style={styles.folderHeader}>
                  <Pressable
                    style={styles.folderLeft}
                    onPress={() =>
                      setOpenTipos((prev) => {
                        const next = new Set(prev);
                        if (next.has(tipo)) next.delete(tipo);
                        else next.add(tipo);
                        return next;
                      })
                    }
                  >
                    <Ionicons
                      name={open ? "folder-open-outline" : "folder-outline"}
                      size={16}
                      color={brand.navy}
                    />
                    <Text style={styles.folderName} numberOfLines={2}>
                      {tipo}
                    </Text>
                  </Pressable>
                  <View style={styles.folderRight}>
                    <Text style={styles.count}>{items.length}</Text>
                    {canUpload ? (
                      <Pressable
                        style={styles.uploadBtn}
                        onPress={() => void onUpload(tipo)}
                        disabled={uploading || uploadingTipo != null}
                        hitSlop={8}
                      >
                        {uploading ? (
                          <ActivityIndicator size="small" color={brand.navy} />
                        ) : (
                          <Ionicons
                            name="cloud-upload-outline"
                            size={18}
                            color={brand.navy}
                          />
                        )}
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() =>
                        setOpenTipos((prev) => {
                          const next = new Set(prev);
                          if (next.has(tipo)) next.delete(tipo);
                          else next.add(tipo);
                          return next;
                        })
                      }
                      hitSlop={8}
                    >
                      <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={brand.muted}
                      />
                    </Pressable>
                  </View>
                </View>

                {open
                  ? items.length === 0
                    ? (
                        <Text style={styles.emptyFolder}>
                          Sin archivos en esta carpeta.
                        </Text>
                      )
                    : items.map((doc) => {
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
  hintFormats: {
    marginBottom: spacing.sm,
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
    lineHeight: 15,
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
  uploadBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brand.surface,
  },
  emptyFolder: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.medium,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
    backgroundColor: brand.surface,
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
