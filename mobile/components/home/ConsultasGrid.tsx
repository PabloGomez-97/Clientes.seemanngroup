import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type ConsultaScreen = "Tarifario" | "HistoricoPrecios" | "Novedades" | "Promesas";

type ConsultaItem = {
  key: ConsultaScreen;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
};

const ITEMS: ConsultaItem[] = [
  {
    key: "Tarifario",
    title: "Tarifario",
    subtitle: "Aéreo · FCL · LCL",
    icon: "pricetags-outline",
    tint: brand.primary,
    bg: brand.primaryMuted,
  },
  {
    key: "HistoricoPrecios",
    title: "Histórico de precios",
    subtitle: "Evolución de rutas",
    icon: "trending-up-outline",
    tint: brand.navy,
    bg: "rgba(30, 58, 95, 0.08)",
  },
  {
    key: "Novedades",
    title: "Novedades",
    subtitle: "Noticias del grupo",
    icon: "newspaper-outline",
    tint: "#0d9488",
    bg: "rgba(13, 148, 136, 0.1)",
  },
  {
    key: "Promesas",
    title: "Nuestras promesas",
    subtitle: "Compromiso Seemann",
    icon: "people-outline",
    tint: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.1)",
  },
];

export default function ConsultasGrid() {
  const navigation =
    useNavigation<BottomTabNavigationProp<ClientTabParamList>>();

  const open = (screen: "Tarifario" | "HistoricoPrecios" | "Novedades" | "Promesas") => {
    navigation.navigate("Menu", { screen });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Consultas</Text>
      <Text style={styles.sectionSubtitle}>
        Tarifas, histórico, novedades y promesas — solo consulta visual.
      </Text>
      <View style={styles.grid}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => open(item.key)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={20} color={item.tint} />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.ink,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: brand.muted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47.5%",
    flexGrow: 1,
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    minHeight: 118,
  },
  cardPressed: {
    backgroundColor: brand.canvasAlt,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.ink,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: brand.muted,
    lineHeight: 16,
  },
});
