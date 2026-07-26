import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import ClientsListScreen from "../screens/executive/ClientsListScreen";
import type { Cliente } from "../services/ejecutivoClientesApi";
import ReporteriaFinancieraScreen from "../screens/menu/ReporteriaFinancieraScreen";
import ReporteriaOperacionalScreen from "../screens/menu/ReporteriaOperacionalScreen";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";
import { noBackStackOptions } from "./noBackStackOptions";
import { useStaffClientsSource } from "./StaffClientsSourceContext";

export type ExecutiveReporteriaStackParamList = {
  ReporteriaClientPicker: undefined;
  ReporteriaMenu: { username: string };
  ReporteriaOperacional: { username: string };
  ReporteriaFinanciera: { username: string };
  ReporteriaKpis: { username: string };
};

const Stack = createNativeStackNavigator<ExecutiveReporteriaStackParamList>();

function ReporteriaClientPickerScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<
        ExecutiveReporteriaStackParamList,
        "ReporteriaClientPicker"
      >
    >();
  const { setActiveUsername } = useAuth();
  const source = useStaffClientsSource();

  const onSelect = (client: Cliente) => {
    void setActiveUsername(client.username);
    navigation.navigate("ReporteriaMenu", { username: client.username });
  };

  return (
    <ClientsListScreen
      title="Reportería"
      subtitle={
        source === "global"
          ? "Elige un cliente del portal"
          : "Elige un cliente de tu cartera"
      }
      onSelectClient={onSelect}
    />
  );
}

function ReporteriaMenuScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<ExecutiveReporteriaStackParamList, "ReporteriaMenu">
    >();
  const route =
    useRoute<RouteProp<ExecutiveReporteriaStackParamList, "ReporteriaMenu">>();
  const username = route.params.username;

  const items = [
    {
      key: "ops" as const,
      label: "Operacional",
      hint: "Embarques y estados",
      screen: "ReporteriaOperacional" as const,
      icon: "stats-chart-outline" as const,
    },
    {
      key: "fin" as const,
      label: "Financiera",
      hint: "Facturas y montos",
      screen: "ReporteriaFinanciera" as const,
      icon: "cash-outline" as const,
    },
    {
      key: "kpi" as const,
      label: "KPIs",
      hint: "Indicadores del cliente",
      screen: "ReporteriaKpis" as const,
      icon: "speedometer-outline" as const,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={brand.navy} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={styles.topTitle}>Reportería</Text>
          <Text style={styles.topSub}>{username}</Text>
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
            onPress={() => navigation.navigate(item.screen, { username })}
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

function ScopedReport({
  children,
}: {
  children: React.ReactNode;
}) {
  const route = useRoute<
    RouteProp<
      ExecutiveReporteriaStackParamList,
      "ReporteriaOperacional" | "ReporteriaFinanciera" | "ReporteriaKpis"
    >
  >();
  const { setActiveUsername } = useAuth();

  useEffect(() => {
    void setActiveUsername(route.params.username);
  }, [route.params.username, setActiveUsername]);

  return <View style={{ flex: 1 }}>{children}</View>;
}

export default function ExecutiveReporteriaStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="ReporteriaClientPicker"
        component={ReporteriaClientPickerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReporteriaMenu"
        component={ReporteriaMenuScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="ReporteriaOperacional" options={{ headerShown: false }}>
        {() => (
          <ScopedReport>
            <ReporteriaOperacionalScreen />
          </ScopedReport>
        )}
      </Stack.Screen>
      <Stack.Screen name="ReporteriaFinanciera" options={{ headerShown: false }}>
        {() => (
          <ScopedReport>
            <ReporteriaFinancieraScreen />
          </ScopedReport>
        )}
      </Stack.Screen>
      <Stack.Screen name="ReporteriaKpis" options={{ headerShown: false }}>
        {() => (
          <ScopedReport>
            <ReporteriaFinancieraScreen />
          </ScopedReport>
        )}
      </Stack.Screen>
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
