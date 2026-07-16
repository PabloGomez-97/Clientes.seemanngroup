import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { MenuStackParamList } from "../navigation/MenuStack";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";

type Nav = NativeStackNavigationProp<MenuStackParamList, "MenuHome">;

type MenuLink = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

type MenuSection = {
  title: string;
  links: MenuLink[];
};

export default function MenuScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { user, activeUsername, logout } = useAuth();

  const email = user?.email?.trim() || "";
  const accountName = activeUsername?.trim() || "";

  const confirmLogout = () => {
    Alert.alert(
      t("home.navbar.profile.logout"),
      "¿Deseas cerrar tu sesión en el portal?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: t("home.navbar.profile.logout"),
          style: "destructive",
          onPress: logout,
        },
      ],
    );
  };

  const sections: MenuSection[] = [
    {
      title: "Reportería",
      links: [
        {
          key: "fin",
          label: "Reportería financiera",
          icon: "cash-outline",
          onPress: () => navigation.navigate("ReporteriaFinanciera"),
        },
        {
          key: "ops",
          label: "Reportería operacional",
          icon: "stats-chart-outline",
          onPress: () => navigation.navigate("ReporteriaOperacional"),
        },
      ],
    },
    {
      title: "Documentos",
      links: [
        {
          key: "docs",
          label: "Mis Documentos",
          icon: "folder-open-outline",
          onPress: () => navigation.navigate("MisDocumentos"),
        },
      ],
    },
    {
      title: "Consultas",
      links: [
        {
          key: "tarifario",
          label: "Tarifario",
          icon: "pricetags-outline",
          onPress: () => navigation.navigate("Tarifario"),
        },
        {
          key: "historico",
          label: "Histórico de precios",
          icon: "trending-up-outline",
          onPress: () => navigation.navigate("HistoricoPrecios"),
        },
        {
          key: "novedades",
          label: "Novedades",
          icon: "newspaper-outline",
          onPress: () => navigation.navigate("Novedades"),
        },
        {
          key: "promesas",
          label: "Nuestras promesas",
          icon: "people-outline",
          onPress: () => navigation.navigate("Promesas"),
        },
      ],
    },
    {
      title: "Cuenta y legal",
      links: [
        {
          key: "privacy",
          label: "Política de Privacidad",
          icon: "shield-checkmark-outline",
          onPress: () =>
            navigation.navigate("LegalDocument", { doc: "privacy" }),
        },
        {
          key: "terms",
          label: "Términos de Servicio",
          icon: "document-text-outline",
          onPress: () => navigation.navigate("LegalDocument", { doc: "terms" }),
        },
        {
          key: "delete",
          label: "Eliminar cuenta",
          icon: "trash-outline",
          onPress: () => navigation.navigate("DeleteAccount"),
          destructive: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Menú</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={brand.primary} />
          </View>
          <View style={styles.profileInfo}>
            {accountName ? (
              <View style={styles.accountRow}>
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={brand.muted}
                />
                <Text style={styles.accountText} numberOfLines={1}>
                  {accountName}
                </Text>
              </View>
            ) : null}
            {email ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.linksCard}>
              {section.links.map((link, index) => (
                <Pressable
                  key={link.key}
                  style={({ pressed }) => [
                    styles.linkRow,
                    index < section.links.length - 1 && styles.linkRowBorder,
                    pressed && styles.linkRowPressed,
                  ]}
                  onPress={link.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={link.label}
                >
                  <View style={styles.linkLeft}>
                    <Ionicons
                      name={link.icon}
                      size={20}
                      color={link.destructive ? "#b91c1c" : brand.primary}
                    />
                    <Text
                      style={[
                        styles.linkLabel,
                        link.destructive && styles.linkLabelDestructive,
                      ]}
                    >
                      {link.label}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={brand.mutedLight}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel={t("home.navbar.profile.logout")}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>
            {t("home.navbar.profile.logout")}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: brand.canvas,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: brand.muted,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  accountText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.inkSecondary,
    flexShrink: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  linksCard: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  linkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  linkRowPressed: {
    backgroundColor: brand.canvasAlt,
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  linkLabel: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  linkLabelDestructive: {
    color: "#b91c1c",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  logoutButtonPressed: {
    backgroundColor: brand.primaryDark,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
});
