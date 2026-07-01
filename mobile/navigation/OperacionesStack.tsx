import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AirShipment } from "../../src/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "../../src/components/cliente/embarques/Handlers/HandlerGroundShipments";
import type { OceanListItem } from "../../src/services/linbisShipmentMappers";
import OperacionesListScreen from "../screens/operaciones/OperacionesListScreen";
import AirOperacionDetailScreen from "../screens/operaciones/AirOperacionDetailScreen";
import OceanOperacionDetailScreen from "../screens/operaciones/OceanOperacionDetailScreen";
import GroundOperacionDetailScreen from "../screens/operaciones/GroundOperacionDetailScreen";
import { brand } from "../theme/brand";

export type OperacionesStackParamList = {
  OperacionesList: undefined;
  AirOperacionDetail: { shipment: AirShipment };
  OceanOperacionDetail: { shipment: OceanListItem };
  GroundOperacionDetail: { shipment: GroundShipment };
};

const Stack = createNativeStackNavigator<OperacionesStackParamList>();

export default function OperacionesStack() {
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
        name="OperacionesList"
        component={OperacionesListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AirOperacionDetail"
        component={AirOperacionDetailScreen}
        options={{ title: "Operación aérea" }}
      />
      <Stack.Screen
        name="OceanOperacionDetail"
        component={OceanOperacionDetailScreen}
        options={{ title: "Operación marítima" }}
      />
      <Stack.Screen
        name="GroundOperacionDetail"
        component={GroundOperacionDetailScreen}
        options={{ title: "Operación terrestre" }}
      />
    </Stack.Navigator>
  );
}
