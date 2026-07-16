import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { AirShipment } from "../../src/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "../../src/components/cliente/embarques/Handlers/HandlerGroundShipments";
import type { OceanListItem } from "../../src/services/linbisShipmentMappers";
import OperacionesListScreen from "../screens/operaciones/OperacionesListScreen";
import AirOperacionDetailScreen from "../screens/operaciones/AirOperacionDetailScreen";
import OceanOperacionDetailScreen from "../screens/operaciones/OceanOperacionDetailScreen";
import GroundOperacionDetailScreen from "../screens/operaciones/GroundOperacionDetailScreen";
import { noBackStackOptions } from "./noBackStackOptions";
import { brand } from "../theme/brand";

export type OperacionesStackParamList = {
  OperacionesList: undefined;
  AirOperacionDetail: { shipment: AirShipment };
  OceanOperacionDetail: { shipment: OceanListItem };
  GroundOperacionDetail: { shipment: GroundShipment };
};

const Stack = createNativeStackNavigator<OperacionesStackParamList>();

function detailOptions({
  navigation,
  title,
}: {
  navigation: { goBack: () => void };
  title: string;
}) {
  return {
    title,
    headerBackVisible: false,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    headerTintColor: brand.navy,
    headerLeft: () => (
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Volver a operaciones"
        style={{ paddingHorizontal: 4, marginRight: 4 }}
      >
        <Ionicons name="chevron-back" size={28} color={brand.navy} />
      </Pressable>
    ),
  };
}

export default function OperacionesStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="OperacionesList"
        component={OperacionesListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AirOperacionDetail"
        component={AirOperacionDetailScreen}
        options={({ navigation }) =>
          detailOptions({ navigation, title: "Operación aérea" })
        }
      />
      <Stack.Screen
        name="OceanOperacionDetail"
        component={OceanOperacionDetailScreen}
        options={({ navigation }) =>
          detailOptions({ navigation, title: "Operación marítima" })
        }
      />
      <Stack.Screen
        name="GroundOperacionDetail"
        component={GroundOperacionDetailScreen}
        options={({ navigation }) =>
          detailOptions({ navigation, title: "Operación terrestre" })
        }
      />
    </Stack.Navigator>
  );
}
