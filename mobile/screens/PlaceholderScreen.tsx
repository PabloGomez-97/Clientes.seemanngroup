import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { brand, radii, spacing } from "../theme/brand";

type PlaceholderScreenProps = {
  title: string;
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Trackeos: "navigate-outline",
  Operaciones: "briefcase-outline",
  Cotizaciones: "document-text-outline",
  Menú: "menu-outline",
};

export default function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const icon = ICONS[title] ?? "construct-outline";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={32} color={brand.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Módulo en construcción</Text>
        <Text style={styles.hint}>Esta sección estará disponible próximamente.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: brand.canvas,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: brand.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: brand.primary,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: brand.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
