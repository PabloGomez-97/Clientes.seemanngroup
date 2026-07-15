import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Section = "company" | "commitments" | "services";

export default function PromesasScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("company");

  const tabs: { id: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] =
    [
      { id: "company", label: t("promesas.tabs.company"), icon: "business-outline" },
      {
        id: "commitments",
        label: t("promesas.tabs.commitments"),
        icon: "people-outline",
      },
      {
        id: "services",
        label: t("promesas.tabs.services"),
        icon: "grid-outline",
      },
    ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title={t("promesas.hero.title")}
        subtitle={t("promesas.hero.eyebrow")}
      />

      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const active = section === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setSection(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={active ? brand.primary : brand.muted}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>{t("promesas.hero.subtitle")}</Text>

        {section === "company" ? (
          <View style={styles.block}>
            <Text style={styles.heading}>
              {t("promesas.company.history.title")}
            </Text>
            {(["p1", "p2", "p3"] as const).map((key) => (
              <Text key={key} style={styles.paragraph}>
                {t(`promesas.company.history.${key}`)}
              </Text>
            ))}
            <Text style={styles.heading}>
              {t("promesas.company.mission.title")}
            </Text>
            <Text style={styles.paragraph}>
              {t("promesas.company.mission.p1")}
            </Text>
            <Text style={styles.paragraph}>
              {t("promesas.company.mission.p2")}
            </Text>
          </View>
        ) : null}

        {section === "commitments" ? (
          <View style={styles.block}>
            <Text style={styles.paragraph}>{t("promesas.commitments.intro")}</Text>
            {(
              ["global", "anticipate", "experience", "support"] as const
            ).map((key) => (
              <View key={key} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t(`promesas.commitments.pillars.${key}.title`)}
                </Text>
                <Text style={styles.cardText}>
                  {t(`promesas.commitments.pillars.${key}.desc`)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {section === "services" ? (
          <View style={styles.block}>
            {(
              ["sea", "air", "land", "customs", "multimodal"] as const
            ).map((key) => (
              <View key={key} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t(`promesas.services.${key}.hero.title`)}
                </Text>
                <Text style={styles.cardText}>
                  {t(`promesas.services.${key}.hero.subtitle`)}
                </Text>
                <Text style={[styles.cardText, { marginTop: 8 }]}>
                  {t(`promesas.services.${key}.overview`)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tabActive: {
    backgroundColor: brand.primarySoft,
    borderColor: brand.primaryBorder,
  },
  tabText: { fontSize: 11, color: brand.muted, fontWeight: "600" },
  tabTextActive: { color: brand.primary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  lead: {
    fontSize: 14,
    color: brand.muted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  block: { gap: 12 },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: brand.ink,
    marginTop: 8,
  },
  paragraph: { fontSize: 14, color: brand.inkSecondary, lineHeight: 22 },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: brand.ink,
    marginBottom: 6,
  },
  cardText: { fontSize: 13, color: brand.muted, lineHeight: 20 },
});
