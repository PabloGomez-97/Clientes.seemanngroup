import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchBehaviorClientDetail,
  type BehaviorClientDetail,
} from "../../services/comportamientoApi";
import type { ComportamientoStackParamList } from "./ComportamientoListScreen";
import { useStaffClientsSource } from "../../navigation/StaffClientsSourceContext";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<
  ComportamientoStackParamList,
  "ComportamientoDetail"
>;
type Route = RouteProp<ComportamientoStackParamList, "ComportamientoDetail">;

function statusLabel(status: string): string {
  if (status === "completed") return "Completada";
  if (status === "abandoned") return "Abandonada";
  return "En curso";
}

export function ComportamientoDetailView({
  email,
  username,
  nombreuser,
  onBack,
  embed = false,
}: {
  email: string;
  username: string;
  nombreuser?: string;
  onBack?: () => void;
  embed?: boolean;
}) {
  const { token } = useAuth();
  const clientsSource = useStaffClientsSource();
  const [detail, setDetail] = useState<BehaviorClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBehaviorClientDetail(
        token,
        email,
        clientsSource === "global" ? "global" : "portfolio",
      );
      setDetail(data);
    } catch (e) {
      setDetail(null);
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el detalle.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, email, clientsSource]);

  useEffect(() => {
    void load();
  }, [load]);

  const body = loading ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={brand.primary} />
    </View>
  ) : error ? (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <Pressable style={styles.retry} onPress={() => void load()}>
        <Text style={styles.retryText}>Reintentar</Text>
      </Pressable>
    </View>
  ) : (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryVal}>
            {detail?.summary.totalSessions ?? 0}
          </Text>
          <Text style={styles.summaryKey}>Sesiones</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryVal, { color: "#059669" }]}>
            {detail?.summary.completed ?? 0}
          </Text>
          <Text style={styles.summaryKey}>Completadas</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryVal, { color: "#dc2626" }]}>
            {detail?.summary.abandoned ?? 0}
          </Text>
          <Text style={styles.summaryKey}>Abandonos</Text>
        </View>
      </View>

      <Text style={styles.section}>Sesiones recientes</Text>
      {(detail?.sessions || []).length === 0 ? (
        <Text style={styles.empty}>Sin sesiones.</Text>
      ) : (
        (detail?.sessions || []).slice(0, 40).map((session) => (
          <View key={session.sessionId} style={styles.sessionCard}>
            <View style={styles.sessionTop}>
              <Text style={styles.sessionType}>{session.quoteType}</Text>
              <Text style={styles.sessionStatus}>
                {statusLabel(session.status)}
              </Text>
            </View>
            {session.route ? (
              <Text style={styles.sessionRoute}>
                {session.route.origin} → {session.route.destination}
              </Text>
            ) : null}
            {session.lastStep ? (
              <Text style={styles.sessionStep}>
                Paso {session.lastStep.stepNumber}/{session.lastStep.totalSteps}
                : {session.lastStep.step}
              </Text>
            ) : null}
            <Text style={styles.sessionMeta}>
              {new Date(session.startedAt).toLocaleString("es-CL")}
              {session.quoteNumber ? ` · ${session.quoteNumber}` : ""}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  if (embed) {
    return <View style={styles.fill}>{body}</View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={brand.navy} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {username}
          </Text>
          <Text style={styles.topSub} numberOfLines={1}>
            {nombreuser || email}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>
      {body}
    </SafeAreaView>
  );
}

export default function ComportamientoDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { email, username, nombreuser } = route.params;

  return (
    <ComportamientoDetailView
      email={email}
      username={username}
      nombreuser={nombreuser}
      onBack={() => navigation.goBack()}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, backgroundColor: brand.canvas },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topText: { flex: 1, alignItems: "center" },
  topTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  topSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: 10 },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
  },
  summaryCell: {
    flex: 1,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  summaryVal: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  summaryKey: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.muted,
  },
  section: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: fonts.semiBold,
    color: brand.muted,
    marginBottom: 4,
  },
  sessionCard: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 14,
    gap: 4,
  },
  sessionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  sessionType: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: brand.ink,
  },
  sessionStatus: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: brand.primary,
  },
  sessionRoute: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.navy,
  },
  sessionStep: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  sessionMeta: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.mutedLight,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: 12,
  },
  errorText: {
    textAlign: "center",
    color: brand.muted,
    fontFamily: fonts.regular,
  },
  retry: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: brand.primary,
  },
  retryText: { color: "#fff", fontFamily: fonts.semiBold },
  empty: {
    color: brand.muted,
    fontFamily: fonts.regular,
    marginTop: 8,
  },
});
