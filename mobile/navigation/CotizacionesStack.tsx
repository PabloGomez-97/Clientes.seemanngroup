import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { ClientQuote } from "../../src/services/cotizacionesLogic";
import CotizacionesListScreen from "../screens/cotizaciones/CotizacionesListScreen";
import CotizacionDetailScreen from "../screens/cotizaciones/CotizacionDetailScreen";
import { noBackStackOptions } from "./noBackStackOptions";
import { brand } from "../theme/brand";

export type CotizacionesStackParamList = {
  CotizacionesList: undefined;
  CotizacionDetail: { quote: ClientQuote };
};

const Stack = createNativeStackNavigator<CotizacionesStackParamList>();

export default function CotizacionesStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="CotizacionesList"
        component={CotizacionesListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CotizacionDetail"
        component={CotizacionDetailScreen}
        options={({ navigation }) => ({
          title: "Detalle cotización",
          headerBackVisible: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          headerTintColor: brand.navy,
          headerLeft: () => (
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Volver a cotizaciones"
              style={{ paddingHorizontal: 4, marginRight: 4 }}
            >
              <Ionicons name="chevron-back" size={28} color={brand.navy} />
            </Pressable>
          ),
        })}
      />
    </Stack.Navigator>
  );
}
