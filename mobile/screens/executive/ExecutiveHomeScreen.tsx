import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { useExecutivePortfolioTracking } from "../../hooks/useExecutivePortfolioTracking";
import type { ExecutiveTabParamList } from "../../navigation/ExecutiveTabs";
import { getEjecutivoPhotoUrl, getInitials } from "../../utils/ejecutivoPhoto";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = BottomTabNavigationProp<ExecutiveTabParamList>;

type QuickLink = {
  key: keyof ExecutiveTabParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: "navy" | "orange";
};

const QUICK: QuickLink[] = [
  { key: "Clients", label: "Clientes", icon: "people", accent: "navy" },
  {
    key: "Trackeos",
    label: "Seguimientos",
    icon: "navigate",
    accent: "orange",
  },
  {
    key: "Reporteria",
    label: "Reportería",
    icon: "stats-chart",
    accent: "orange",
  },
  {
    key: "More",
    label: "Documentación",
    icon: "folder-open",
    accent: "navy",
  },
  { key: "More", label: "Consultas", icon: "search", accent: "navy" },
];

const INDEX = [
  {
    n: "01",
    title: "Novedades",
    subtitle: "Comunicados y actualidad Seemann",
    target: "novedades" as const,
  },
  {
    n: "02",
    title: "Nuestras promesas",
    subtitle: "Compromisos y modalidades de servicio",
    target: "promesas" as const,
  },
  {
    n: "03",
    title: "Reportería financiera",
    subtitle: "Elige un cliente de tu cartera",
    target: "reporteria" as const,
  },
  {
    n: "04",
    title: "Reportería operacional",
    subtitle: "Elige un cliente de tu cartera",
    target: "reporteria" as const,
  },
];

export default function ExecutiveHomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    clients,
    inMotionTrackings,
    loading,
    refresh,
  } = useExecutivePortfolioTracking();
  const [refreshing, setRefreshing] = useState(false);
  const [lightStatus, setLightStatus] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);

  const name =
    user?.nombreuser?.trim() ||
    user?.ejecutivo?.nombre?.trim() ||
    user?.email?.split("@")[0] ||
    "Ejecutivo";
  const photo = getEjecutivoPhotoUrl(name);
  const clientCount = clients.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      setLightStatus(true);
      void refresh();
      return () => setLightStatus(false);
    }, [refresh]),
  );

  const bandStyle: StyleProp<ViewStyle> = [
    styles.band,
    { paddingTop: insets.top + spacing.sm },
  ];

  const openIndex = (target: "novedades" | "promesas" | "reporteria") => {
    if (target === "reporteria") {
      navigation.navigate("Reporteria");
      return;
    }
    navigation.navigate("More", {
      screen: target === "novedades" ? "Novedades" : "Promesas",
    });
  };

  return (
    <View style={styles.root}>
      {lightStatus ? <StatusBar style="light" /> : null}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: spacing.xl + 20 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={brand.primary}
          />
        }
      >
        <LinearGradient
          colors={["#152a45", "#1e3a5f", "#243f66"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={bandStyle}
        >
          <View style={styles.bandOrb} />
          <View style={styles.bandOrbSmall} />

          <View style={styles.bandTop}>
            <Image
              source={require("../../../src/auth/logoseemann.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.accountPill}>
              <View style={styles.liveDot} />
              <Text style={styles.accountPillText}>Portal ejecutivo</Text>
            </View>
          </View>

          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              {photo && !photoFailed ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.heroAvatarImage}
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <Text style={styles.heroInitials}>{getInitials(name)}</Text>
              )}
            </View>
            <View style={styles.heroText}>
              <Text style={styles.welcomeLine}>Bienvenido/a</Text>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.tagline}>
                Torre de control de tu cartera de clientes
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statusBoard}>
          <Pressable
            style={({ pressed }) => [
              styles.statusCell,
              pressed && styles.statusPressed,
            ]}
            onPress={() => navigation.navigate("Clients")}
          >
            <Text style={styles.statusKey}>CARTERA</Text>
            {loading ? (
              <ActivityIndicator color={brand.navy} />
            ) : (
              <Text style={styles.statusVal}>{String(clientCount)}</Text>
            )}
            <Text style={styles.statusLink}>Ver clientes ↗</Text>
          </Pressable>

          <View style={styles.statusDivider} />

          <Pressable
            style={({ pressed }) => [
              styles.statusCell,
              pressed && styles.statusPressed,
            ]}
            onPress={() => navigation.navigate("Trackeos")}
          >
            <Text style={styles.statusKey}>SEGUIMIENTOS</Text>
            {loading ? (
              <ActivityIndicator color={brand.primary} />
            ) : (
              <Text style={[styles.statusVal, { color: brand.primary }]}>
                {String(inMotionTrackings)}
              </Text>
            )}
            <Text style={[styles.statusLink, { color: brand.primary }]}>
              Abrir ↗
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionPad}>
          <View style={styles.sectionHead}>
            <Text style={styles.kicker}>Módulos</Text>
            <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          </View>

          <View style={styles.launcher}>
            {QUICK.map((item, index) => {
              const orange = item.accent === "orange";
              return (
                <Pressable
                  key={`${item.label}-${index}`}
                  style={({ pressed }) => [
                    styles.launchCell,
                    pressed && styles.launchPressed,
                  ]}
                  onPress={() => navigation.navigate(item.key)}
                >
                  <View
                    style={[
                      styles.launchIcon,
                      orange ? styles.launchIconOrange : styles.launchIconNavy,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={orange ? brand.primary : brand.navy}
                    />
                  </View>
                  <Text style={styles.launchLabel}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.kicker}>Consultas</Text>
            <Text style={styles.sectionTitle}>Información y reportes</Text>
          </View>

          <View style={styles.indexList}>
            {INDEX.map((row, i) => (
              <Pressable
                key={row.n}
                style={({ pressed }) => [
                  styles.indexRow,
                  i < INDEX.length - 1 && styles.indexBorder,
                  pressed && styles.indexPressed,
                ]}
                onPress={() => openIndex(row.target)}
              >
                <Text style={styles.indexNum}>{row.n}</Text>
                <View style={styles.indexCopy}>
                  <Text style={styles.indexTitle}>{row.title}</Text>
                  <Text style={styles.indexSub}>{row.subtitle}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={brand.mutedLight}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        pointerEvents="none"
        style={[
          styles.statusCover,
          { height: insets.top, backgroundColor: "#152a45" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#edf1f6" },
  scroll: { flexGrow: 1 },
  statusCover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  band: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
    overflow: "hidden",
  },
  bandOrb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,98,0,0.12)",
    top: -80,
    right: -60,
  },
  bandOrbSmall: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    bottom: 10,
    left: -40,
  },
  bandTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  logo: { width: 120, height: 32 },
  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  accountPillText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroAvatarImage: { width: 56, height: 56 },
  heroInitials: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  heroText: { flex: 1, minWidth: 0 },
  welcomeLine: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontFamily: fonts.medium,
    marginBottom: 4,
  },
  name: {
    color: "#fff",
    fontSize: 22,
    fontFamily: fonts.bold,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  tagline: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
  },
  statusBoard: {
    marginTop: -18,
    marginHorizontal: spacing.lg,
    backgroundColor: "#fff",
    borderRadius: 4,
    borderTopWidth: 3,
    borderTopColor: brand.primary,
    flexDirection: "row",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 5,
    marginBottom: spacing.xl,
  },
  statusCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statusPressed: { backgroundColor: "#fafafa" },
  statusDivider: {
    width: 1,
    backgroundColor: "#eceff3",
    marginVertical: 14,
  },
  statusKey: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: brand.muted,
    fontFamily: fonts.semiBold,
    marginBottom: 6,
  },
  statusVal: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: brand.navy,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },
  statusLink: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  sectionPad: {
    paddingHorizontal: spacing.lg,
  },
  sectionHead: {
    marginBottom: 14,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: brand.primary,
    fontFamily: fonts.semiBold,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: brand.navy,
    letterSpacing: -0.3,
  },
  launcher: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: spacing.xl + 4,
  },
  launchCell: {
    width: "31.5%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e9f0",
  },
  launchPressed: {
    borderColor: brand.primaryBorder,
    backgroundColor: brand.primarySoft,
  },
  launchIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  launchIconNavy: { backgroundColor: "#eef2f7" },
  launchIconOrange: { backgroundColor: brand.primarySoft },
  launchLabel: {
    fontSize: 11,
    textAlign: "center",
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  indexList: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e9f0",
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  indexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  indexBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f5",
  },
  indexPressed: { backgroundColor: "#fafbfd" },
  indexNum: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: brand.primary,
    width: 28,
  },
  indexCopy: { flex: 1 },
  indexTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: brand.navy,
  },
  indexSub: {
    marginTop: 2,
    fontSize: 12,
    color: brand.muted,
    lineHeight: 16,
  },
});
