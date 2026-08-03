import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { useMisDocumentos } from "../../hooks/useMisDocumentos";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { useEmbeddedChrome } from "../../navigation/EmbeddedChromeContext";
import { backOrParentHub } from "../../navigation/backOrHub";
import type { MisDocumentosStackParamList } from "../../navigation/MisDocumentosStack";
import {
  formatDocDate,
  folderMetaLabel,
  TRANSPORT_LABELS,
  type DocFolder,
  type DocTransportType,
} from "../../services/documentsApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const FILTERS: DocTransportType[] = [
  "all",
  "air",
  "ocean",
  "ground",
  "quotes",
];

type Nav = NativeStackNavigationProp<
  MisDocumentosStackParamList,
  "MisDocumentosList"
>;

export default function MisDocumentosScreen() {
  const navigation = useNavigation<Nav>();
  const embedded = useEmbeddedChrome();
  const {
    activeUsername,
    folders,
    counts,
    loading,
    error,
    activeType,
    setActiveType,
    search,
    setSearch,
    refresh,
  } = useMisDocumentos();

  useRefreshOnFocus(refresh);

  const openFolder = (folder: DocFolder) => {
    navigation.navigate("MisDocumentosFolder", {
      reference: folder.key,
      title: folder.title,
    });
  };

  const renderFolder = ({ item }: { item: DocFolder }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => openFolder(item)}
    >
      <View style={styles.folderIcon}>
        <Ionicons name="folder" size={22} color={brand.primary} />
      </View>
      <View style={styles.folderBody}>
        <Text style={styles.folderTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.folderMeta} numberOfLines={1}>
          {folderMetaLabel(item)}
        </Text>
      </View>
      <View style={styles.folderRight}>
        {item.latestDate ? (
          <Text style={styles.date}>{formatDocDate(item.latestDate)}</Text>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={brand.muted} />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ["top"]}>
      <ScreenHeader
        title="Mis Documentos"
        subtitle={activeUsername || undefined}
        onBack={embedded ? undefined : () => backOrParentHub(navigation)}
        right={
          <Pressable style={styles.iconBtn} onPress={() => void refresh()}>
            <Ionicons name="refresh" size={18} color={brand.navy} />
          </Pressable>
        }
      />

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = activeType === item;
            return (
              <Pressable
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveType(item)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {TRANSPORT_LABELS[item]}
                  {counts[item] > 0 ? ` (${counts[item]})` : ""}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={brand.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por carpeta, nombre o tipo…"
          placeholderTextColor={brand.mutedLight}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {loading && folders.length === 0 ? (
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
          data={folders}
          keyExtractor={(item) => item.key}
          renderItem={renderFolder}
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
                name="folder-open-outline"
                size={40}
                color={brand.primary}
              />
              <Text style={styles.emptyTitle}>Sin documentos</Text>
              <Text style={styles.emptyText}>
                {search
                  ? `No hay resultados para "${search}"`
                  : "Cuando subas documentos en operaciones o cotizaciones, aparecerán aquí agrupados por referencia."}
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
  filters: { paddingBottom: 8 },
  filterList: { paddingHorizontal: spacing.lg, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
  },
  chipActive: {
    backgroundColor: brand.primarySoft,
    borderColor: brand.primaryBorder,
  },
  chipText: { fontSize: 12, color: brand.muted, fontWeight: "600" },
  chipTextActive: { color: brand.primary },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: brand.ink, padding: 0 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
  },
  cardPressed: { opacity: 0.85 },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  folderBody: { flex: 1, minWidth: 0 },
  folderTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
    marginBottom: 2,
  },
  folderMeta: { fontSize: 12, color: brand.muted },
  folderRight: { alignItems: "flex-end", gap: 6 },
  date: { fontSize: 11, color: brand.muted },
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
