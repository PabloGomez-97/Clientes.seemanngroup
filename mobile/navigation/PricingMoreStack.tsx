import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import ChangePasswordScreen from "../screens/menu/ChangePasswordScreen";
import TarifarioScreen from "../screens/consultas/TarifarioScreen";
import HistoricoPreciosScreen from "../screens/consultas/HistoricoPreciosScreen";
import CotizadorStack from "./CotizadorStack";
import NovedadesScreen from "../screens/consultas/NovedadesScreen";
import NovedadDetailScreen from "../screens/consultas/NovedadDetailScreen";
import PromesasScreen from "../screens/consultas/PromesasScreen";
import DocsProveedoresScreen from "../screens/pricing/DocsProveedoresScreen";
import { getEjecutivoPhotoUrl, getInitials } from "../utils/ejecutivoPhoto";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";
import { noBackStackOptions } from "./noBackStackOptions";

export type PricingMoreStackParamList = {
  MoreHome: undefined;
  ChangePassword: undefined;
  DocsProveedores: undefined;
  Tarifario: undefined;
  HistoricoPrecios: undefined;
  Cotizador: undefined;
  Novedades: undefined;
  NovedadDetail: { slug: string; title?: string };
  Promesas: undefined;
};

const Stack = createNativeStackNavigator<PricingMoreStackParamList>();

function MoreHomeScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<PricingMoreStackParamList, "MoreHome">
    >();
  const { user, logout } = useAuth();
  const [photoFailed, setPhotoFailed] = useState(false);

  const displayName =
    user?.nombreuser?.trim() ||
    user?.ejecutivo?.nombre?.trim() ||
    "Pricing";
  const photo = getEjecutivoPhotoUrl(displayName);

  const confirmLogout = () => {
    Alert.alert("Cerrar sesión", "¿Deseas cerrar tu sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: logout },
    ]);
  };

  const sections = [
    {
      title: "Proveedores",
      links: [
        {
          key: "docs",
          label: "Documentos de proveedores",
          icon: "folder-open-outline" as const,
          onPress: () => navigation.navigate("DocsProveedores"),
        },
      ],
    },
    {
      title: "Consultas",
      links: [
        {
          key: "cotizador",
          label: "Cotizador",
          icon: "create-outline" as const,
          onPress: () => navigation.navigate("Cotizador"),
        },
        {
          key: "tarifario",
          label: "Tarifario",
          icon: "pricetags-outline" as const,
          onPress: () => navigation.navigate("Tarifario"),
        },
        {
          key: "historico",
          label: "Histórico de precios",
          icon: "trending-up-outline" as const,
          onPress: () => navigation.navigate("HistoricoPrecios"),
        },
        {
          key: "novedades",
          label: "Novedades",
          icon: "newspaper-outline" as const,
          onPress: () => navigation.navigate("Novedades"),
        },
        {
          key: "promesas",
          label: "Nuestras promesas",
          icon: "people-outline" as const,
          onPress: () => navigation.navigate("Promesas"),
        },
      ],
    },
    {
      title: "Cuenta",
      links: [
        {
          key: "password",
          label: "Cambiar contraseña",
          icon: "key-outline" as const,
          onPress: () => navigation.navigate("ChangePassword"),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Más</Text>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            {photo && !photoFailed ? (
              <Image
                source={{ uri: photo }}
                style={styles.avatarImage}
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <Text style={styles.avatarInitials}>
                {getInitials(displayName)}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.links.map((link, index) => (
                <Pressable
                  key={link.key}
                  style={({ pressed }) => [
                    styles.row,
                    index < section.links.length - 1 && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={link.onPress}
                >
                  <Ionicons name={link.icon} size={20} color={brand.primary} />
                  <Text style={styles.rowLabel}>{link.label}</Text>
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
            styles.logout,
            pressed && { opacity: 0.9 },
          ]}
          onPress={confirmLogout}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PricingMoreStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="MoreHome"
        component={MoreHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DocsProveedores"
        component={DocsProveedoresScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Tarifario"
        component={TarifarioScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HistoricoPrecios"
        component={HistoricoPreciosScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Cotizador"
        component={CotizadorStack}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Novedades"
        component={NovedadesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NovedadDetail"
        component={NovedadDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Promesas"
        component={PromesasScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: brand.navy,
    marginBottom: spacing.lg,
  },
  profile: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: brand.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarImage: { width: 72, height: 72 },
  avatarInitials: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  name: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  email: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: fonts.semiBold,
    color: brand.muted,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  rowPressed: { backgroundColor: brand.canvasAlt },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  logout: {
    marginTop: spacing.md,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: "#b91c1c",
  },
});
