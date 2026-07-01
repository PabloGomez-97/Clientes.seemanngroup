import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LOGIN_DARK, LOGIN_PRIMARY } from "../../../src/auth/loginTheme";

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
      <Text style={styles.sectionTitle}>
        {t("home.servicesSection.title")}
      </Text>
      <View style={styles.grid}>
        {SERVICE_KEYS.map(({ key, icon }) => (
          <View key={key} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={22} color={LOGIN_PRIMARY} />
            </View>
            <Text style={styles.cardTitle}>{t(`home.services.${key}.title`)}</Text>
            <Text style={styles.cardDesc}>{t(`home.services.${key}.desc`)}</Text>
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
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: LOGIN_DARK,
    marginBottom: 12,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ececec",
    padding: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255, 98, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: LOGIN_DARK,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 10,
  },
  cardCta: {
    fontSize: 13,
    fontWeight: "500",
    color: LOGIN_PRIMARY,
  },
});
