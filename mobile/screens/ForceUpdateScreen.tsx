import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";
import type { ForceUpdateRequirement } from "../services/appVersionApi";

type Props = {
  requirement: ForceUpdateRequirement;
};

export default function ForceUpdateScreen({ requirement }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const storeLabel =
    requirement.platform === "ios"
      ? t("forceUpdate.openAppStore")
      : t("forceUpdate.openPlayStore");

  const openStore = () => {
    void Linking.openURL(requirement.storeUrl);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={["#f3f5f9", "#fafbfd", "#ffffff"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        <View style={styles.brandBlock}>
          <Image
            source={require("../../src/auth/logoseemann.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Seemann Group"
          />
          <View style={styles.brandAccent} />
          <Text style={styles.brandLine}>Portal Cliente</Text>
        </View>

        <Text style={styles.title}>{t("forceUpdate.title")}</Text>
        <Text style={styles.message}>
          {requirement.message?.trim() || t("forceUpdate.message")}
        </Text>

        <Pressable
          onPress={openStore}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          accessibilityRole="button"
          accessibilityLabel={storeLabel}
        >
          <Text style={styles.ctaText}>{storeLabel}</Text>
          <Ionicons name="open-outline" size={18} color="#fff" />
        </Pressable>

        {__DEV__ ? (
          <Text style={styles.devMeta}>
            {t("forceUpdate.versionLine", {
              current: requirement.currentVersion,
              minimum: requirement.minVersion,
            })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f7f8fb",
  },
  orbTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 98, 0, 0.07)",
    top: -90,
    right: -80,
  },
  orbBottom: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(30, 58, 95, 0.05)",
    bottom: -70,
    left: -70,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 36,
  },
  logo: {
    width: 210,
    height: 60,
    marginBottom: 16,
  },
  brandAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: brand.primary,
    marginBottom: 12,
  },
  brandLine: {
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: brand.navy,
    fontFamily: fonts.semiBold,
    opacity: 0.75,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: brand.navy,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: brand.inkSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    maxWidth: 340,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 15,
    borderRadius: radii.md,
    minWidth: Platform.OS === "ios" ? 240 : 260,
    justifyContent: "center",
    shadowColor: brand.shadowOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  ctaPressed: {
    backgroundColor: brand.primaryDark,
  },
  ctaText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#fff",
  },
  devMeta: {
    marginTop: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: brand.mutedLight,
    textAlign: "center",
  },
});
