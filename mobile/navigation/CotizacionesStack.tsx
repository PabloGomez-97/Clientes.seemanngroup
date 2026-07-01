import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ClientQuote } from "../../src/services/cotizacionesLogic";
import CotizacionesListScreen from "../screens/cotizaciones/CotizacionesListScreen";
import CotizacionDetailScreen from "../screens/cotizaciones/CotizacionDetailScreen";
import { brand } from "../theme/brand";

export type CotizacionesStackParamList = {
  CotizacionesList: undefined;
  CotizacionDetail: { quote: ClientQuote };
};

const Stack = createNativeStackNavigator<CotizacionesStackParamList>();

export default function CotizacionesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: brand.canvas },
        headerTintColor: brand.ink,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: brand.canvas },
      }}
    >
      <Stack.Screen
        name="CotizacionesList"
        component={CotizacionesListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CotizacionDetail"
        component={CotizacionDetailScreen}
        options={{ title: "Detalle cotización" }}
      />
    </Stack.Navigator>
  );
}
