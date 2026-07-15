import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { useHomeShipments } from "../../hooks/useHomeShipments";
import { useHomeDocumentsCount } from "../../hooks/useHomeDocumentsCount";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const KPI_META = {
  shipments: {
    icon: "boat-outline" as const,
    tint: brand.navy,
    bg: "rgba(30, 58, 95, 0.08)",
  },
  documents: {
    icon: "folder-open-outline" as const,
    tint: brand.primary,
    bg: brand.primaryMuted,
  },
};

export default function WelcomeHeader() {
  const { t } = useTranslation();
  const navigation =
    useNavigation<BottomTabNavigationProp<ClientTabParamList>>();
  const { user, activeUsername } = useAuth();
  const { activeCount, loading: shipmentsLoading } =
    useHomeShipments(activeUsername);
  const { count: docsCount, loading: docsLoading } =
    useHomeDocumentsCount(activeUsername);

  const displayName =
    user?.nombreuser?.trim() || activeUsername || user?.username || "";

  const kpis = [
    {
      key: "shipments" as const,
      label: t("home.welcome.kpiShipments"),
      value: activeCount,
      loading: shipmentsLoading,
      onPress: () =>
        navigation.navigate("Trackeos", { screen: "TrackeosList" }),
    },
    {
      key: "documents" as const,
      label: t("home.welcome.kpiDocuments"),
      value: docsCount,
      loading: docsLoading,
      onPress: () => navigation.navigate("Menu", { screen: "MisDocumentos" }),
    },
  ];

  return (
    <LinearGradient
      colors={["#ffffff", "#eef4fb", "#e8f0fa"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.decorCircle} />
      <View style={styles.decorCircleSmall} />

      <View style={styles.topRow}>
        <Image
          source={require("../../../src/auth/logoseemann.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.portalBadge}>
          <Ionicons name="globe-outline" size={12} color={brand.navy} />
          <Text style={styles.portalBadgeText}>Portal Cliente</Text>
        </View>
      </View>

      <Text style={styles.greeting}>
        {t("home.welcome.greeting", { name: displayName })}
      </Text>

      {activeUsername ? (
        <View style={styles.accountPill}>
          <Ionicons name="business-outline" size={14} color={brand.primary} />
          <Text style={styles.account} numberOfLines={1}>
            {t("home.welcome.account", { account: activeUsername })}
          </Text>
        </View>
      ) : null}

      <View style={styles.kpiRow}>
        {kpis.map((kpi) => {
          const meta = KPI_META[kpi.key];
          return (
            <Pressable
              key={kpi.key}
              style={({ pressed }) => [
                styles.kpiCard,
                pressed && styles.kpiCardPressed,
              ]}
              onPress={kpi.onPress}
              accessibilityRole="button"
              accessibilityLabel={kpi.label}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={18} color={meta.tint} />
              </View>
              {kpi.loading ? (
                <ActivityIndicator color={brand.primary} size="small" />
              ) : (
                <Text style={styles.kpiValue}>{kpi.value}</Text>
              )}
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.curve} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + 8,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(255, 98, 0, 0.1)",
    top: -60,
    right: -50,
  },
  decorCircleSmall: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
    bottom: 40,
    left: -30,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  logo: {
    width: 130,
    height: 36,
  },
  portalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  portalBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.navy,
    letterSpacing: 0.2,
  },
  greeting: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: brand.primarySoft,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
    maxWidth: "100%",
  },
  account: {
    color: brand.inkSecondary,
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    minHeight: 108,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: brand.border,
    shadowColor: brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiCardPressed: {
    backgroundColor: brand.canvasAlt,
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kpiValue: {
    color: brand.primary,
    fontSize: 30,
    fontFamily: fonts.bold,
    marginBottom: 2,
    fontVariant: ["tabular-nums"],
  },
  kpiLabel: {
    color: brand.muted,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },
  curve: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: brand.canvas,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
