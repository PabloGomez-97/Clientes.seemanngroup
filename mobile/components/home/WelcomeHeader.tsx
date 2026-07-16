import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth } from "../../auth/AuthContext";
import { useHomeShipments } from "../../hooks/useHomeShipments";
import { useHomeDocumentsCount } from "../../hooks/useHomeDocumentsCount";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Props = {
  topInset?: number;
};

/** Identidad y resumen de cuenta. */
export default function WelcomeHeader({ topInset = 0 }: Props) {
  const navigation =
    useNavigation<BottomTabNavigationProp<ClientTabParamList>>();
  const { user, activeUsername } = useAuth();
  const { activeCount, loading: shipmentsLoading } =
    useHomeShipments(activeUsername);
  const { count: docsCount, loading: docsLoading } =
    useHomeDocumentsCount(activeUsername);

  const displayName =
    user?.nombreuser?.trim() || activeUsername || user?.username || "Cliente";

  const bandStyle: StyleProp<ViewStyle> = [
    styles.band,
    { paddingTop: topInset + spacing.sm },
  ];

  return (
    <View>
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
          {activeUsername ? (
            <View style={styles.accountPill}>
              <View style={styles.liveDot} />
              <Text style={styles.accountPillText} numberOfLines={1}>
                {activeUsername}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.welcomeLine}>Bienvenido de nuevo</Text>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.tagline}>
          Centro de control de tu operación logística
        </Text>
      </LinearGradient>

      <View style={styles.statusBoard}>
        <Pressable
          style={({ pressed }) => [
            styles.statusCell,
            pressed && styles.statusPressed,
          ]}
          onPress={() =>
            navigation.navigate("Trackeos", { screen: "TrackeosList" })
          }
        >
          <Text style={styles.statusKey}>EMBARQUES</Text>
          {shipmentsLoading ? (
            <ActivityIndicator color={brand.navy} />
          ) : (
            <Text style={styles.statusVal}>{activeCount}</Text>
          )}
          <Text style={styles.statusLink}>Seguimientos ↗</Text>
        </Pressable>

        <View style={styles.statusDivider} />

        <Pressable
          style={({ pressed }) => [
            styles.statusCell,
            pressed && styles.statusPressed,
          ]}
          onPress={() =>
            navigation.navigate("Menu", { screen: "MisDocumentos" })
          }
        >
          <Text style={styles.statusKey}>DOCUMENTOS</Text>
          {docsLoading ? (
            <ActivityIndicator color={brand.primary} />
          ) : (
            <Text style={[styles.statusVal, { color: brand.primary }]}>
              {docsCount}
            </Text>
          )}
          <Text style={[styles.statusLink, { color: brand.primary }]}>
            Abrir ↗
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  logo: {
    width: 120,
    height: 32,
  },
  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "48%",
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
    flexShrink: 1,
  },
  welcomeLine: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontFamily: fonts.medium,
    marginBottom: 4,
  },
  name: {
    color: "#fff",
    fontSize: 24,
    fontFamily: fonts.bold,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  tagline: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: "92%",
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
  },
  statusCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statusPressed: {
    backgroundColor: "#fafafa",
  },
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
});
