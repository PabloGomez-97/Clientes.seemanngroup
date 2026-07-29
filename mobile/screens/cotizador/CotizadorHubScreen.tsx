import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type {
  CotizadorMode,
  CotizadorStackParamList,
} from "../../navigation/CotizadorStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<CotizadorStackParamList, "CotizadorHub">;
type R = RouteProp<CotizadorStackParamList, "CotizadorHub">;

const MODES: {
  key: CotizadorMode;
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  ready: boolean;
}[] = [
  {
    key: "air",
    title: "Aéreo",
    hint: "Rutas recurrentes y no recurrentes",
    icon: "airplane-outline",
    ready: true,
  },
  {
    key: "fcl",
    title: "FCL",
    hint: "Contenedor completo",
    icon: "cube-outline",
    ready: false,
  },
  {
    key: "lcl",
    title: "LCL",
    hint: "Carga consolidada marítima",
    icon: "layers-outline",
    ready: false,
  },
  {
    key: "lastmile",
    title: "Última milla",
    hint: "Entrega terrestre local",
    icon: "car-outline",
    ready: false,
  },
];

export default function CotizadorHubScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const clientUsername = route.params?.clientUsername;
  const clientName = route.params?.clientName;
  const clientUserId = route.params?.clientUserId;

  const openMode = (mode: CotizadorMode, ready: boolean) => {
    if (mode === "air" && ready) {
      navigation.navigate("QuoteAir", {
        clientUsername,
        clientName,
        clientUserId,
      });
      return;
    }
    navigation.navigate("CotizadorComingSoon", {
      mode: mode as Exclude<CotizadorMode, "air">,
      clientUsername,
      clientName,
      clientUserId,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={brand.navy} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Cotizador</Text>
          {clientName || clientUsername ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              Cliente: {clientName || clientUsername}
            </Text>
          ) : (
            <Text style={styles.subtitle}>Elige el tipo de cotización</Text>
          )}
        </View>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        {MODES.map((mode) => (
          <Pressable
            key={mode.key}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
              !mode.ready && styles.cardSoon,
            ]}
            onPress={() => openMode(mode.key, mode.ready)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={mode.icon} size={22} color={brand.primary} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{mode.title}</Text>
                {!mode.ready ? (
                  <View style={styles.soonPill}>
                    <Text style={styles.soonPillText}>Próximamente</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardHint}>{mode.hint}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={brand.mutedLight}
            />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
    backgroundColor: brand.surface,
  },
  headerText: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 17,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  content: {
    padding: spacing.lg,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 14,
  },
  cardPressed: { opacity: 0.92 },
  cardSoon: { opacity: 0.88 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  cardHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  soonPill: {
    backgroundColor: brand.canvasAlt,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  soonPillText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: brand.muted,
    textTransform: "uppercase",
  },
});
