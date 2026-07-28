import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import CommissionAnalysisReportScreen from "../screens/admin/CommissionAnalysisReportScreen";
import CotizacionesPorEjecutivoScreen from "../screens/admin/CotizacionesPorEjecutivoScreen";
import FacturacionesPorEjecutivoScreen from "../screens/admin/FacturacionesPorEjecutivoScreen";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";
import { noBackStackOptions } from "./noBackStackOptions";

export type AdminReporteriaGerencialStackParamList = {
  ReporteriaGerencialHub: undefined;
  CommissionAnalysisReport: undefined;
  CotizacionesPorEjecutivo: undefined;
  FacturacionesPorEjecutivo: undefined;
};

const Stack =
  createNativeStackNavigator<AdminReporteriaGerencialStackParamList>();

function ReporteriaGerencialHubScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<
        AdminReporteriaGerencialStackParamList,
        "ReporteriaGerencialHub"
      >
    >();

  const items = [
    {
      key: "commission" as const,
      label: "Commission Analysis Report",
      hint: "Comisiones, profit, tendencias y top clientes",
      screen: "CommissionAnalysisReport" as const,
      icon: "analytics-outline" as const,
    },
    {
      key: "quotes" as const,
      label: "Cotizaciones por Ejecutivo",
      hint: "Individual, comparativa y doble",
      screen: "CotizacionesPorEjecutivo" as const,
      icon: "document-text-outline" as const,
    },
    {
      key: "invoices" as const,
      label: "Facturaciones por Ejecutivo",
      hint: "Individual, comparativa y doble",
      screen: "FacturacionesPorEjecutivo" as const,
      icon: "cash-outline" as const,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={brand.navy} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={styles.topTitle}>Reportería Gerencial</Text>
          <Text style={styles.topSub}>Solo Administrador</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.card}>
        {items.map((item, index) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [
              styles.row,
              index < items.length - 1 && styles.rowBorder,
              pressed && styles.rowPressed,
            ]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.icon}>
              <Ionicons name={item.icon} size={20} color={brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.hint}>{item.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={brand.mutedLight} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function AdminReporteriaGerencialStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="ReporteriaGerencialHub"
        component={ReporteriaGerencialHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CommissionAnalysisReport"
        component={CommissionAnalysisReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CotizacionesPorEjecutivo"
        component={CotizacionesPorEjecutivoScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FacturacionesPorEjecutivo"
        component={FacturacionesPorEjecutivoScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
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
  topText: { alignItems: "center" },
  topTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  topSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  card: {
    margin: spacing.lg,
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  hint: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
});
