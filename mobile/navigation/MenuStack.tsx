import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MenuScreen from "../screens/MenuScreen";
import LegalDocumentScreen from "../screens/menu/LegalDocumentScreen";
import DeleteAccountScreen from "../screens/menu/DeleteAccountScreen";
import { brand } from "../theme/brand";

export type MenuStackParamList = {
  MenuHome: undefined;
  LegalDocument: { doc: "privacy" | "terms" };
  DeleteAccount: undefined;
};

const Stack = createNativeStackNavigator<MenuStackParamList>();

export default function MenuStack() {
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
        name="MenuHome"
        component={MenuScreen}
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
        options={{ title: "Eliminar cuenta" }}
      />
    </Stack.Navigator>
  );
}
