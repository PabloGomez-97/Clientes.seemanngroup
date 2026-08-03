import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import ClientsListScreen from "../screens/executive/ClientsListScreen";
import ClientHubScreen from "../screens/executive/ClientHubScreen";
import MisDocumentosStack from "./MisDocumentosStack";
import type { ShipsGoOpenTrackingTarget } from "../../src/services/shipsgoTrackingNavigation";
import CotizacionesStack from "./CotizacionesStack";
import OperacionesStack from "./OperacionesStack";
import TrackeosStack from "./TrackeosStack";
import { EmbeddedChromeProvider } from "./EmbeddedChromeContext";
import { ComportamientoDetailView } from "../screens/operaciones/ComportamientoDetailScreen";
import { brand } from "../theme/brand";
import { fonts } from "../theme/typography";
import { noBackStackOptions } from "./noBackStackOptions";
import { useStaffClientsSource } from "./StaffClientsSourceContext";

export type ClientScopeParams = {
  username: string;
  nombreuser?: string;
  email?: string;
  openTracking?: ShipsGoOpenTrackingTarget;
  openNewTracking?: {
    mode: "air" | "ocean";
    initialAwb?: string;
    initialIdentifierType?: "container_number" | "booking_number";
    initialIdentifierValue?: string;
    initialTag?: string;
  };
};

export type ExecutiveClientsStackParamList = {
  ClientsList: undefined;
  ClientHub: ClientScopeParams;
  ClientTrackeos: ClientScopeParams;
  ClientOperaciones: ClientScopeParams;
  ClientCotizaciones: ClientScopeParams;
  ClientDocumentos: ClientScopeParams;
  ClientComportamiento: ClientScopeParams;
};

const Stack = createNativeStackNavigator<ExecutiveClientsStackParamList>();

function ScopeHeader({ title }: { title: string }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<ExecutiveClientsStackParamList>>();
  const route =
    useRoute<
      RouteProp<
        ExecutiveClientsStackParamList,
        | "ClientTrackeos"
        | "ClientOperaciones"
        | "ClientCotizaciones"
        | "ClientDocumentos"
        | "ClientComportamiento"
      >
    >();
  const insets = useSafeAreaInsets();
  const { setActiveUsername } = useAuth();

  useEffect(() => {
    void setActiveUsername(route.params.username);
  }, [route.params.username, setActiveUsername]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={16}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Ionicons name="chevron-back" size={26} color={brand.navy} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSub} numberOfLines={1}>
          {route.params.username}
        </Text>
      </View>
      <View style={styles.back} />
    </View>
  );
}

function ClientScopedScreen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <EmbeddedChromeProvider>
      <View style={styles.fill}>
        <ScopeHeader title={title} />
        <View style={styles.fill}>{children}</View>
      </View>
    </EmbeddedChromeProvider>
  );
}

function ClientTrackeosScreen() {
  const route =
    useRoute<RouteProp<ExecutiveClientsStackParamList, "ClientTrackeos">>();
  const openKey = route.params.openTracking
    ? JSON.stringify(route.params.openTracking)
    : route.params.openNewTracking
      ? JSON.stringify(route.params.openNewTracking)
      : "list";
  return (
    <ClientScopedScreen title="Seguimientos">
      <TrackeosStack
        key={openKey}
        initialOpenTracking={route.params.openTracking}
        initialNewTracking={route.params.openNewTracking}
      />
    </ClientScopedScreen>
  );
}

function ClientOperacionesScreen() {
  return (
    <ClientScopedScreen title="Operaciones">
      <OperacionesStack />
    </ClientScopedScreen>
  );
}

function ClientCotizacionesScreen() {
  return (
    <ClientScopedScreen title="Cotizaciones">
      <CotizacionesStack />
    </ClientScopedScreen>
  );
}

function ClientDocumentosScreen() {
  return (
    <ClientScopedScreen title="Documentación">
      <MisDocumentosStack />
    </ClientScopedScreen>
  );
}

function ClientComportamientoScreen() {
  const route =
    useRoute<
      RouteProp<ExecutiveClientsStackParamList, "ClientComportamiento">
    >();
  const email = route.params.email?.trim();

  if (!email) {
    return (
      <ClientScopedScreen title="Comportamiento">
        <View style={styles.missingEmail}>
          <Text style={styles.missingEmailText}>
            Este cliente no tiene email para cargar el análisis.
          </Text>
        </View>
      </ClientScopedScreen>
    );
  }

  return (
    <ClientScopedScreen title="Comportamiento">
      <ComportamientoDetailView
        email={email}
        username={route.params.username}
        nombreuser={route.params.nombreuser}
        embed
      />
    </ClientScopedScreen>
  );
}

function ClientsListEntry() {
  const source = useStaffClientsSource();
  return (
    <ClientsListScreen
      title={source === "global" ? "Clientes" : "Mis clientes"}
      subtitle={
        source === "global"
          ? "Directorio global del portal"
          : undefined
      }
    />
  );
}

export default function ExecutiveClientsStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="ClientsList"
        component={ClientsListEntry}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClientHub"
        component={ClientHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClientTrackeos"
        component={ClientTrackeosScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClientOperaciones"
        component={ClientOperacionesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClientCotizaciones"
        component={ClientCotizacionesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClientDocumentos"
        component={ClientDocumentosScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClientComportamiento"
        component={ClientComportamientoScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: brand.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: brand.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  missingEmail: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingEmailText: {
    textAlign: "center",
    color: brand.muted,
    fontFamily: fonts.regular,
  },
});
