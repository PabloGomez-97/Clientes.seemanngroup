import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { CotizadorStackParamList } from "../../navigation/CotizadorStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<
  CotizadorStackParamList,
  "CotizadorComingSoon"
>;
type R = RouteProp<CotizadorStackParamList, "CotizadorComingSoon">;

const LABELS = {
  fcl: "FCL",
  lcl: "LCL",
  lastmile: "Última milla",
} as const;

export default function CotizadorComingSoonScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const label = LABELS[route.params.mode];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={brand.navy} />
        </Pressable>
        <Text style={styles.title}>{label}</Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.body}>
        <View style={styles.card}>
          <Ionicons name="construct-outline" size={36} color={brand.primary} />
          <Text style={styles.heading}>Próximamente</Text>
          <Text style={styles.text}>
            El cotizador {label} llegará en una próxima fase. Por ahora puedes
            usar el cotizador aéreo.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
    backgroundColor: brand.surface,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  body: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.xl,
    alignItems: "center",
    gap: 10,
  },
  heading: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  text: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: brand.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
