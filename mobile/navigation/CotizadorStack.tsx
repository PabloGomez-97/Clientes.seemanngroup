import type { ComponentType } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { isStaffUser } from "../auth/portalRouting";
import CotizadorClientPickerScreen from "../screens/cotizador/CotizadorClientPickerScreen";
import CotizadorComingSoonScreen from "../screens/cotizador/CotizadorComingSoonScreen";
import CotizadorHubScreen from "../screens/cotizador/CotizadorHubScreen";
import { noBackStackOptions } from "./noBackStackOptions";

export type CotizadorMode = "air" | "fcl" | "lcl" | "lastmile";

export type CotizadorStackParamList = {
  CotizadorClientPicker: undefined;
  CotizadorHub: {
    clientUsername?: string;
    clientName?: string;
    /** Mongo User _id del cliente (modo staff) — para profit markup */
    clientUserId?: string;
  };
  QuoteAir: {
    clientUsername?: string;
    clientName?: string;
    clientUserId?: string;
  };
  CotizadorComingSoon: {
    mode: Exclude<CotizadorMode, "air">;
    clientUsername?: string;
    clientName?: string;
    clientUserId?: string;
  };
};

const Stack = createNativeStackNavigator<CotizadorStackParamList>();

/** Lazy: evita cargar el wizard aéreo (y originSelection/Intl) al montar tabs. */
function QuoteAirScreen() {
  const Comp = require("../screens/cotizador/air/QuoteAirWizardScreen")
    .default as ComponentType;
  return <Comp />;
}

export default function CotizadorStack() {
  const { user } = useAuth();
  const requireClient = isStaffUser(user);

  return (
    <Stack.Navigator
      initialRouteName={
        requireClient ? "CotizadorClientPicker" : "CotizadorHub"
      }
      screenOptions={noBackStackOptions}
    >
      {requireClient ? (
        <Stack.Screen
          name="CotizadorClientPicker"
          component={CotizadorClientPickerScreen}
          options={{ headerShown: false }}
        />
      ) : null}
      <Stack.Screen
        name="CotizadorHub"
        component={CotizadorHubScreen}
        options={{ headerShown: false }}
        initialParams={requireClient ? undefined : {}}
      />
      <Stack.Screen
        name="QuoteAir"
        component={QuoteAirScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CotizadorComingSoon"
        component={CotizadorComingSoonScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
