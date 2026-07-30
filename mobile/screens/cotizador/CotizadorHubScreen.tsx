import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { CotizadorStackParamList } from "../../navigation/CotizadorStack";
import { backOrParentHub } from "../../navigation/backOrHub";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<CotizadorStackParamList, "CotizadorHub">;
type R = RouteProp<CotizadorStackParamList, "CotizadorHub">;

export default function CotizadorHubScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const clientUsername = route.params?.clientUsername;
  const clientName = route.params?.clientName;
  const clientUserId = route.params?.clientUserId;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => backOrParentHub(navigation)} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={brand.navy} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Cotizador</Text>
          {clientName || clientUsername ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              Cliente: {clientName || clientUsername}
            </Text>
          ) : (
            <Text style={styles.subtitle}>Cotización aérea</Text>
          )}
        </View>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() =>
            navigation.navigate("QuoteAir", {
              clientUsername,
              clientName,
              clientUserId,
            })
          }
        >
          <View style={styles.iconWrap}>
            <Ionicons name="airplane-outline" size={22} color={brand.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Aéreo</Text>
            <Text style={styles.cardHint}>
              Rutas recurrentes y no recurrentes
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={brand.mutedLight} />
        </Pressable>
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
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 2 },
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
});
