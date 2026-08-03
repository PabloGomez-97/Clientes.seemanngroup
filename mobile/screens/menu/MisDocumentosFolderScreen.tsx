import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { useMisDocumentos } from "../../hooks/useMisDocumentos";
import { useEmbeddedChrome } from "../../navigation/EmbeddedChromeContext";
import type { MisDocumentosStackParamList } from "../../navigation/MisDocumentosStack";
import {
  formatDocDate,
  TRANSPORT_LABELS,
  type UnifiedDoc,
} from "../../services/documentsApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<
  MisDocumentosStackParamList,
  "MisDocumentosFolder"
>;
type Route = RouteProp<MisDocumentosStackParamList, "MisDocumentosFolder">;

export default function MisDocumentosFolderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const embedded = useEmbeddedChrome();
  const { reference, title } = route.params;
  const {
    getDocsForReference,
    loading,
    error,
    busyId,
    refresh,
    remove,
    download,
  } = useMisDocumentos();
  const [toast, setToast] = useState<string | null>(null);

  const docs = useMemo(
    () => getDocsForReference(reference),
    [getDocsForReference, reference],
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const onDownload = useCallback(
    async (doc: UnifiedDoc) => {
      try {
        const result = await download(doc);
        if (!result) return;
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          Alert.alert(
            "Descarga lista",
            `Archivo guardado temporalmente:\n${result.fileName}`,
          );
          return;
        }
        await Sharing.shareAsync(result.uri, {
          dialogTitle: result.fileName,
        });
        showToast(`Listo: ${result.fileName}`);
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "No se pudo descargar",
        );
      }
    },
    [download],
  );

  const onDelete = useCallback(
    (doc: UnifiedDoc) => {
      Alert.alert(
        "Eliminar documento",
        `¿Eliminar "${doc.nombreArchivo}"? Esta acción no se puede deshacer.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await remove(doc);
                  showToast("Documento eliminado");
                } catch (err) {
                  Alert.alert(
                    "Error",
                    err instanceof Error
                      ? err.message
                      : "No se pudo eliminar",
                  );
                }
              })();
            },
          },
        ],
      );
    },
    [remove],
  );

  const renderItem = ({ item }: { item: UnifiedDoc }) => {
    const busy = busyId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {TRANSPORT_LABELS[item._type]}
            </Text>
          </View>
          <Text style={styles.date}>{formatDocDate(item.fechaSubida)}</Text>
        </View>
        <Text style={styles.fileName} numberOfLines={2}>
          {item.nombreArchivo}
        </Text>
        <Text style={styles.meta}>
          {item.tipo || "Documento"}
          {item.tamanoMB ? ` · ${item.tamanoMB} MB` : ""}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={() => void onDownload(item)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={styles.actionPrimaryText}>Descargar</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionDanger]}
            onPress={() => onDelete(item)}
            disabled={busy}
          >
            <Ionicons name="trash-outline" size={16} color="#b91c1c" />
            <Text style={styles.actionDangerText}>Eliminar</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ["top"]}>
      <ScreenHeader
        title={title}
        subtitle={
          docs.length === 1 ? "1 documento" : `${docs.length} documentos`
        }
        onBack={() => navigation.goBack()}
        right={
          <Pressable style={styles.iconBtn} onPress={() => void refresh()}>
            <Ionicons name="refresh" size={18} color={brand.navy} />
          </Pressable>
        }
      />

      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {loading && docs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingText}>Cargando documentos…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void refresh()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => `${item._type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="document-outline"
                size={40}
                color={brand.primary}
              />
              <Text style={styles.emptyTitle}>Carpeta vacía</Text>
              <Text style={styles.emptyText}>
                No quedan documentos en esta referencia.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    marginHorizontal: spacing.lg,
    marginBottom: 8,
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
  },
  toastText: { color: "#047857", fontSize: 13, fontFamily: fonts.semiBold },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 12 },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: brand.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: brand.primary,
  },
  date: { fontSize: 12, color: brand.muted },
  fileName: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
    marginBottom: 4,
  },
  meta: { fontSize: 12, color: brand.muted, marginBottom: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  actionPrimary: { backgroundColor: brand.primary },
  actionPrimaryText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  actionDanger: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  actionDangerText: {
    color: "#b91c1c",
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: 8,
  },
  loadingText: { color: brand.muted, marginTop: 8 },
  errorTitle: { fontFamily: fonts.bold, fontSize: 16, color: brand.ink },
  errorText: { color: brand.muted, textAlign: "center" },
  retry: {
    marginTop: 8,
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryText: { color: "#fff", fontFamily: fonts.semiBold },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: brand.ink,
    marginTop: 8,
  },
  emptyText: { color: brand.muted, textAlign: "center", lineHeight: 20 },
});
