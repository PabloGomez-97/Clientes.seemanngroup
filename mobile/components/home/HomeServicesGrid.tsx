import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import SectionHeader from "../ui/SectionHeader";
import { brand, radii, spacing } from "../../theme/brand";

type ServiceKey = "aereo" | "fcl" | "lcl" | "lastmile";

const SERVICE_KEYS: {
  key: ServiceKey;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { key: "aereo", icon: "airplane-outline" },
    { key: "fcl", icon: "cube-outline" },
    { key: "lcl", icon: "layers-outline" },
    { key: "lastmile", icon: "car-outline" },
  ];

export default function HomeServicesGrid() {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t("home.servicesSection.title")}
        subtitle="Selecciona la modalidad de transporte para tu carga"
      />
      <View style={styles.grid}>
        {SERVICE_KEYS.map(({ key, icon }) => (
          <View key={key} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.iconWrap}>
                <Ionicons name={icon} size={22} color={brand.primary} />
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={brand.mutedLight}
              />
            </View>
            <Text style={styles.cardTitle}>
              {t(`home.services.${key}.title`)}
            </Text>
            <Text style={styles.cardDesc} numberOfLines={3}>
              {t(`home.services.${key}.desc`)}
            </Text>
            <Text style={styles.cardCta}>
              {t(`home.services.${key}.cta`)} →
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: brand.border,
    shadowColor: brand.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: brand.ink,
    marginBottom: 6,
    lineHeight: 18,
  },
  cardDesc: {
    fontSize: 12,
    color: brand.muted,
    lineHeight: 17,
    marginBottom: 10,
    minHeight: 51,
  },
  cardCta: {
    fontSize: 12,
    fontWeight: "600",
    color: brand.primary,
  },
});
