import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchAdminClientUsers,
  fetchAdminEjecutivos,
  generateCompanyEmailPrefix,
  searchCompanies,
  type CompanySearchResult,
} from "../../services/adminApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = {
  goBack: () => void;
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

export default function AdminCompanySearchScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<number | null>(null);

  const onSearch = async () => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    const q = term.trim();
    if (!q) {
      setError("Ingresa un término de búsqueda.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchCompanies(token, q);
      setResults(data);
      if (!data.length) {
        setError("No se encontraron empresas.");
      }
    } catch (e) {
      setResults([]);
      setError(
        e instanceof Error ? e.message : "No se pudo buscar empresas.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onSelect = async (company: CompanySearchResult) => {
    if (!token) return;
    setSelectingId(company.id);
    setError(null);
    try {
      const [clients, ejecutivos] = await Promise.all([
        fetchAdminClientUsers(token),
        fetchAdminEjecutivos(token),
      ]);
      const existingEmails = clients.map((c) => c.email);
      const emailPrefix = generateCompanyEmailPrefix(
        company.name || "",
        existingEmails,
      );
      const matchedEj = company.salesRepName
        ? ejecutivos.find(
            (ej) =>
              ej.nombre.trim().toLowerCase() ===
              company.salesRepName.trim().toLowerCase(),
          )
        : undefined;

      navigation.navigate("AdminClientAccountForm", {
        prefill: {
          nombreuser: company.contact || company.name || "",
          usernames: [company.name || ""],
          emailPrefix,
          ejecutivoId: matchedEj?.id || "",
        },
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo preparar el formulario.",
      );
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Buscar empresa"
        subtitle="Completa el formulario con datos de la empresa"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={brand.mutedLight} />
          <TextInput
            style={styles.search}
            placeholder="Nombre o razón social…"
            placeholderTextColor={brand.mutedLight}
            value={term}
            onChangeText={setTerm}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void onSearch()}
          />
        </View>
        <Pressable
          style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
          onPress={() => void onSearch()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.searchBtnText}>Buscar</Text>
          )}
        </Pressable>
      </View>

      {error && !results.length ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              Busca una empresa para rellenar el formulario de cliente.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => void onSelect(item)}
            disabled={selectingId === item.id}
          >
            <View style={styles.cardTop}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name || "Sin nombre"}
              </Text>
              {selectingId === item.id ? (
                <ActivityIndicator size="small" color={brand.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={brand.muted} />
              )}
            </View>
            {item.contact ? (
              <Text style={styles.meta} numberOfLines={1}>
                Contacto: {item.contact}
              </Text>
            ) : null}
            {item.email ? (
              <Text style={styles.meta} numberOfLines={1}>
                {item.email}
              </Text>
            ) : null}
            {item.salesRepName ? (
              <Text style={styles.rep} numberOfLines={1}>
                Ejecutivo: {item.salesRepName}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  search: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: brand.ink,
    padding: 0,
  },
  searchBtn: {
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 88,
    alignItems: "center",
  },
  searchBtnDisabled: { opacity: 0.7 },
  searchBtnText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  errorText: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    color: "#dc2626",
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: 10,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: brand.muted,
    fontFamily: fonts.regular,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 14,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  meta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  rep: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.primary,
  },
});
