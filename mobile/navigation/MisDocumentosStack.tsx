import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MisDocumentosScreen from "../screens/menu/MisDocumentosScreen";
import MisDocumentosFolderScreen from "../screens/menu/MisDocumentosFolderScreen";
import { noBackStackOptions } from "./noBackStackOptions";

export type MisDocumentosStackParamList = {
  MisDocumentosList: undefined;
  MisDocumentosFolder: { reference: string; title: string };
};

const Stack = createNativeStackNavigator<MisDocumentosStackParamList>();

export default function MisDocumentosStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="MisDocumentosList"
        component={MisDocumentosScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MisDocumentosFolder"
        component={MisDocumentosFolderScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
