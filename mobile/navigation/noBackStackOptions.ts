import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { brand } from "../theme/brand";

export const noBackStackOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: brand.canvas },
  headerTintColor: brand.ink,
  headerTitleStyle: { fontWeight: "600" },
  contentStyle: { backgroundColor: brand.canvas },
  headerBackVisible: false,
  headerLeft: () => null,
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
};
