import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
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
import { noBackStackOptions } from "./noBackStackOptions";
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

function withBack(
  navigation: { goBack: () => void },
  title: string,
) {
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
        accessibilityLabel="Volver"
        style={{ paddingHorizontal: 4, marginRight: 4 }}
      >
        <Ionicons name="chevron-back" size={28} color={brand.navy} />
      </Pressable>
    ),
  };
}

export default function TrackeosStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="TrackeosList"
        component={TrackeosListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AirDetail"
        component={AirTrackingDetailScreen}
        options={({ navigation }) => withBack(navigation, "Seguimiento aéreo")}
      />
      <Stack.Screen
        name="OceanDetail"
        component={OceanTrackingDetailScreen}
        options={({ navigation }) =>
          withBack(navigation, "Seguimiento marítimo")
        }
      />
      <Stack.Screen
        name="NewAirTracking"
        component={NewAirTrackingScreen}
        options={({ navigation }) =>
          withBack(navigation, "Nuevo seguimiento aéreo")
        }
      />
      <Stack.Screen
        name="NewOceanTracking"
        component={NewOceanTrackingScreen}
        options={({ navigation }) =>
          withBack(navigation, "Nuevo seguimiento marítimo")
        }
      />
    </Stack.Navigator>
  );
}
