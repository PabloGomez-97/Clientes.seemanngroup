import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type {
  AirShipment,
  OceanShipment,
} from "../../src/components/cliente/tracking/shipsgo/types";
import type { ShipsGoOpenTrackingTarget } from "../../src/services/shipsgoTrackingNavigation";
import TrackeosListScreen from "../screens/tracking/TrackeosListScreen";
import AirTrackingDetailScreen from "../screens/tracking/AirTrackingDetailScreen";
import OceanTrackingDetailScreen from "../screens/tracking/OceanTrackingDetailScreen";
import NewAirTrackingScreen from "../screens/tracking/NewAirTrackingScreen";
import NewOceanTrackingScreen from "../screens/tracking/NewOceanTrackingScreen";
import { brand } from "../theme/brand";

export type TrackeosStackParamList = {
  TrackeosList:
    | {
        openTracking?: ShipsGoOpenTrackingTarget;
      }
    | undefined;
  AirDetail: { shipment: AirShipment };
  OceanDetail: { shipment: OceanShipment };
  NewAirTracking: undefined;
  NewOceanTracking: undefined;
};

const Stack = createNativeStackNavigator<TrackeosStackParamList>();

export default function TrackeosStack() {
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
        name="TrackeosList"
        component={TrackeosListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AirDetail"
        component={AirTrackingDetailScreen}
        options={{ title: "Tracking aéreo" }}
      />
      <Stack.Screen
        name="OceanDetail"
        component={OceanTrackingDetailScreen}
        options={{ title: "Tracking marítimo" }}
      />
      <Stack.Screen
        name="NewAirTracking"
        component={NewAirTrackingScreen}
        options={{ title: "Nuevo seguimiento aéreo" }}
      />
      <Stack.Screen
        name="NewOceanTracking"
        component={NewOceanTrackingScreen}
        options={{ title: "Nuevo seguimiento marítimo" }}
      />
    </Stack.Navigator>
  );
}
