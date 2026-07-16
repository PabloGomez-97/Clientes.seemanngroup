import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MenuScreen from "../screens/MenuScreen";
import LegalDocumentScreen from "../screens/menu/LegalDocumentScreen";
import DeleteAccountScreen from "../screens/menu/DeleteAccountScreen";
import MisDocumentosScreen from "../screens/menu/MisDocumentosScreen";
import ReporteriaFinancieraScreen from "../screens/menu/ReporteriaFinancieraScreen";
import ReporteriaOperacionalScreen from "../screens/menu/ReporteriaOperacionalScreen";
import TarifarioScreen from "../screens/consultas/TarifarioScreen";
import HistoricoPreciosScreen from "../screens/consultas/HistoricoPreciosScreen";
import NovedadesScreen from "../screens/consultas/NovedadesScreen";
import NovedadDetailScreen from "../screens/consultas/NovedadDetailScreen";
import PromesasScreen from "../screens/consultas/PromesasScreen";
import NotificacionesScreen from "../screens/menu/NotificacionesScreen";
import { noBackStackOptions } from "./noBackStackOptions";

export type MenuStackParamList = {
  MenuHome: undefined;
  ReporteriaFinanciera: undefined;
  ReporteriaOperacional: undefined;
  MisDocumentos: undefined;
  Tarifario: undefined;
  HistoricoPrecios: undefined;
  Novedades: undefined;
  NovedadDetail: { slug: string; title?: string };
  Promesas: undefined;
  Notificaciones: undefined;
  LegalDocument: { doc: "privacy" | "terms" };
  DeleteAccount: undefined;
};

const Stack = createNativeStackNavigator<MenuStackParamList>();

export default function MenuStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="MenuHome"
        component={MenuScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReporteriaFinanciera"
        component={ReporteriaFinancieraScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReporteriaOperacional"
        component={ReporteriaOperacionalScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MisDocumentos"
        component={MisDocumentosScreen}
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
        name="Notificaciones"
        component={NotificacionesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
