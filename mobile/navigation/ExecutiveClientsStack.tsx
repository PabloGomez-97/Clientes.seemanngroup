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
import MisDocumentosScreen from "../screens/menu/MisDocumentosScreen";
import CotizacionesStack from "./CotizacionesStack";
import OperacionesStack from "./OperacionesStack";
import TrackeosStack from "./TrackeosStack";
import { EmbeddedChromeProvider } from "./EmbeddedChromeContext";
import { brand } from "../theme/brand";
import { fonts } from "../theme/typography";
import { noBackStackOptions } from "./noBackStackOptions";

export type ClientScopeParams = {
  username: string;
  nombreuser?: string;
  email?: string;
};

export type ExecutiveClientsStackParamList = {
  ClientsList: undefined;
  ClientHub: ClientScopeParams;
  ClientTrackeos: ClientScopeParams;
  ClientOperaciones: ClientScopeParams;
  ClientCotizaciones: ClientScopeParams;
  ClientDocumentos: ClientScopeParams;
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
  return (
    <ClientScopedScreen title="Seguimientos">
      <TrackeosStack />
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
      <MisDocumentosScreen />
    </ClientScopedScreen>
  );
}

export default function ExecutiveClientsStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="ClientsList"
        component={ClientsListScreen}
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
});
