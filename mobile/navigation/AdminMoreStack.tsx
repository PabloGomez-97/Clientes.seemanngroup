import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import ClientsListScreen from "../screens/executive/ClientsListScreen";
import type { Cliente } from "../services/ejecutivoClientesApi";
import ChangePasswordScreen from "../screens/menu/ChangePasswordScreen";
import MisDocumentosStack from "./MisDocumentosStack";
import TarifarioScreen from "../screens/consultas/TarifarioScreen";
import HistoricoPreciosScreen from "../screens/consultas/HistoricoPreciosScreen";
import CotizadorStack from "./CotizadorStack";
import NovedadesScreen from "../screens/consultas/NovedadesScreen";
import NovedadDetailScreen from "../screens/consultas/NovedadDetailScreen";
import PromesasScreen from "../screens/consultas/PromesasScreen";
import ComportamientoListScreen from "../screens/operaciones/ComportamientoListScreen";
import ComportamientoDetailScreen from "../screens/operaciones/ComportamientoDetailScreen";
import PricingAlertsScreen from "../screens/pricing/PricingAlertsScreen";
import DocsProveedoresScreen from "../screens/pricing/DocsProveedoresScreen";
import AdminClientAccountsScreen from "../screens/admin/AdminClientAccountsScreen";
import AdminClientAccountFormScreen from "../screens/admin/AdminClientAccountFormScreen";
import AdminCompanySearchScreen from "../screens/admin/AdminCompanySearchScreen";
import AdminStaffAccountsScreen from "../screens/admin/AdminStaffAccountsScreen";
import AdminStaffAccountFormScreen from "../screens/admin/AdminStaffAccountFormScreen";
import AdminAuditoriaScreen from "../screens/admin/AdminAuditoriaScreen";
import AdminProveedorTarifasScreen from "../screens/admin/AdminProveedorTarifasScreen";
import ExecutiveReporteriaStack from "./ExecutiveReporteriaStack";
import AdminReporteriaGerencialStack from "./AdminReporteriaGerencialStack";
import { getEjecutivoPhotoUrl, getInitials } from "../utils/ejecutivoPhoto";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";
import { noBackStackOptions } from "./noBackStackOptions";
import { EmbeddedChromeProvider } from "./EmbeddedChromeContext";

export type AdminMoreStackParamList = {
  MoreHome: undefined;
  ChangePassword: undefined;
  DocsClientPicker: undefined;
  DocsWorkspace: { username: string };
  Tarifario: undefined;
  HistoricoPrecios: undefined;
  Cotizador: undefined;
  Novedades: undefined;
  NovedadDetail: { slug: string; title?: string };
  Promesas: undefined;
  ComportamientoList: undefined;
  ComportamientoDetail: {
    email: string;
    username: string;
    nombreuser?: string;
  };
  AdminClientAccounts: undefined;
  AdminClientAccountForm: {
    userId?: string;
    prefill?: {
      nombreuser?: string;
      usernames?: string[];
      emailPrefix?: string;
      ejecutivoId?: string;
    };
  };
  AdminCompanySearch: undefined;
  AdminStaffAccounts: undefined;
  AdminStaffAccountForm: { userId?: string };
  AdminAuditoria: undefined;
  PricingAlerts: undefined;
  DocsProveedores: undefined;
  AdminProveedorTarifas: undefined;
  Reporteria: undefined;
  ReporteriaGerencial: undefined;
};

const Stack = createNativeStackNavigator<AdminMoreStackParamList>();

function MoreHomeScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AdminMoreStackParamList, "MoreHome">
    >();
  const { user, logout } = useAuth();
  const [photoFailed, setPhotoFailed] = useState(false);

  const displayName =
    user?.nombreuser?.trim() ||
    user?.ejecutivo?.nombre?.trim() ||
    "Administrador";
  const photo = getEjecutivoPhotoUrl(displayName);

  const confirmLogout = () => {
    Alert.alert("Cerrar sesión", "¿Deseas cerrar tu sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: logout },
    ]);
  };

  const sections = [
    {
      title: "Cuentas",
      links: [
        {
          key: "clientes",
          label: "Cuentas de clientes",
          icon: "people-outline" as const,
          onPress: () => navigation.navigate("AdminClientAccounts"),
        },
        {
          key: "staff",
          label: "Cuentas de ejecutivos",
          icon: "briefcase-outline" as const,
          onPress: () => navigation.navigate("AdminStaffAccounts"),
        },
      ],
    },
    {
      title: "Clientes",
      links: [
        {
          key: "docs",
          label: "Documentos de clientes",
          icon: "folder-open-outline" as const,
          onPress: () => navigation.navigate("DocsClientPicker"),
        },
        {
          key: "comportamiento",
          label: "Comportamiento de clientes",
          icon: "pulse-outline" as const,
          onPress: () => navigation.navigate("ComportamientoList"),
        },
        {
          key: "reporteria",
          label: "Reportería por cliente",
          icon: "stats-chart-outline" as const,
          onPress: () => navigation.navigate("Reporteria"),
        },
      ],
    },
    {
      title: "Reportería Gerencial",
      links: [
        {
          key: "reporteriaGerencial",
          label: "Reportería Gerencial",
          icon: "bar-chart-outline" as const,
          onPress: () => navigation.navigate("ReporteriaGerencial"),
        },
      ],
    },
    {
      title: "Pricing",
      links: [
        {
          key: "alerts",
          label: "Alertas de tarifas",
          icon: "warning-outline" as const,
          onPress: () => navigation.navigate("PricingAlerts"),
        },
        {
          key: "tarifario",
          label: "Consulta de tarifas",
          icon: "pricetags-outline" as const,
          onPress: () => navigation.navigate("Tarifario"),
        },
        {
          key: "provTariffs",
          label: "Tarifas de proveedores",
          icon: "list-outline" as const,
          onPress: () => navigation.navigate("AdminProveedorTarifas"),
        },
        {
          key: "docsProv",
          label: "Documentos de proveedores",
          icon: "document-outline" as const,
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
      title: "Administración",
      links: [
        {
          key: "audit",
          label: "Auditoría",
          icon: "shield-checkmark-outline" as const,
          onPress: () => navigation.navigate("AdminAuditoria"),
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

function DocsClientPickerScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AdminMoreStackParamList, "DocsClientPicker">
    >();
  const { setActiveUsername } = useAuth();

  const onSelect = (client: Cliente) => {
    void setActiveUsername(client.username);
    navigation.navigate("DocsWorkspace", { username: client.username });
  };

  return (
    <ClientsListScreen
      title="Documentación"
      subtitle="Elige un cliente del portal"
      onSelectClient={onSelect}
      onBack={() =>
        navigation.canGoBack()
          ? navigation.goBack()
          : navigation.navigate("MoreHome")
      }
    />
  );
}

function DocsWorkspaceScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AdminMoreStackParamList, "DocsWorkspace">
    >();
  const route =
    useRoute<RouteProp<AdminMoreStackParamList, "DocsWorkspace">>();
  const insets = useSafeAreaInsets();
  const { setActiveUsername } = useAuth();

  useEffect(() => {
    void setActiveUsername(route.params.username);
  }, [route.params.username, setActiveUsername]);

  return (
    <EmbeddedChromeProvider>
      <View style={{ flex: 1, backgroundColor: brand.canvas }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: insets.top + 6,
            paddingBottom: 10,
            paddingHorizontal: 8,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: brand.border,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={16}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={26} color={brand.navy} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: fonts.semiBold,
                color: brand.navy,
              }}
            >
              Documentación
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: fonts.regular,
                color: brand.muted,
              }}
              numberOfLines={1}
            >
              {route.params.username}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <MisDocumentosStack />
      </View>
    </EmbeddedChromeProvider>
  );
}

export default function AdminMoreStack() {
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
        name="DocsClientPicker"
        component={DocsClientPickerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DocsWorkspace"
        component={DocsWorkspaceScreen}
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
      <Stack.Screen
        name="ComportamientoList"
        component={ComportamientoListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ComportamientoDetail"
        component={ComportamientoDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminClientAccounts"
        component={AdminClientAccountsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminClientAccountForm"
        component={AdminClientAccountFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminCompanySearch"
        component={AdminCompanySearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminStaffAccounts"
        component={AdminStaffAccountsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminStaffAccountForm"
        component={AdminStaffAccountFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminAuditoria"
        component={AdminAuditoriaScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PricingAlerts"
        component={PricingAlertsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DocsProveedores"
        component={DocsProveedoresScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminProveedorTarifas"
        component={AdminProveedorTarifasScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Reporteria"
        component={ExecutiveReporteriaStack}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReporteriaGerencial"
        component={AdminReporteriaGerencialStack}
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
