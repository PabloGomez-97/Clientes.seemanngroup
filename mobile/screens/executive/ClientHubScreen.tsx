import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import type { ExecutiveClientsStackParamList } from "../../navigation/ExecutiveClientsStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<
  ExecutiveClientsStackParamList,
  "ClientHub"
>;
type Route = RouteProp<ExecutiveClientsStackParamList, "ClientHub">;

type HubLink = {
  key:
    | "ClientTrackeos"
    | "ClientOperaciones"
    | "ClientCotizaciones"
    | "ClientDocumentos"
    | "ClientComportamiento";
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const LINKS: HubLink[] = [
  {
    key: "ClientTrackeos",
    label: "Seguimientos",
    hint: "Tracking aéreo y marítimo",
    icon: "navigate-outline",
  },
  {
    key: "ClientOperaciones",
    label: "Operaciones",
    hint: "Embarques del cliente",
    icon: "briefcase-outline",
  },
  {
    key: "ClientCotizaciones",
    label: "Cotizaciones",
    hint: "Quotes del cliente",
    icon: "document-text-outline",
  },
  {
    key: "ClientDocumentos",
    label: "Documentación",
    hint: "Listar, ver y descargar",
    icon: "folder-open-outline",
  },
  {
    key: "ClientComportamiento",
    label: "Comportamiento",
    hint: "Cotizaciones y abandonos",
    icon: "pulse-outline",
  },
];

export default function ClientHubScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { setActiveUsername } = useAuth();
  const { username, nombreuser, email } = route.params;

  useEffect(() => {
    void setActiveUsername(username);
  }, [setActiveUsername, username]);

  const links = LINKS;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={brand.navy} />
        </Pressable>
        <Text style={styles.topTitle}>Cliente</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="business" size={26} color={brand.primary} />
          </View>
          <Text style={styles.username}>{username}</Text>
          {nombreuser ? (
            <Text style={styles.meta}>{nombreuser}</Text>
          ) : null}
          {email ? <Text style={styles.meta}>{email}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Accesos</Text>
        <View style={styles.linksCard}>
          {links.map((link, index) => (
            <Pressable
              key={link.key}
              style={({ pressed }) => [
                styles.linkRow,
                index < links.length - 1 && styles.linkBorder,
                pressed && styles.linkPressed,
              ]}
              onPress={() =>
                navigation.navigate(link.key, {
                  username,
                  nombreuser,
                  email,
                })
              }
            >
              <View style={styles.linkIcon}>
                <Ionicons name={link.icon} size={20} color={brand.primary} />
              </View>
              <View style={styles.linkBody}>
                <Text style={styles.linkLabel}>{link.label}</Text>
                <Text style={styles.linkHint}>{link.hint}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={brand.mutedLight}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  profile: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  username: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  meta: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: fonts.semiBold,
    color: brand.muted,
    marginBottom: spacing.sm,
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
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  linkBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  linkPressed: { backgroundColor: brand.canvasAlt },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  linkBody: { flex: 1 },
  linkLabel: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  linkHint: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
});
