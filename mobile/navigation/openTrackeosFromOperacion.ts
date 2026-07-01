import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { ShipsGoOpenTrackingTarget } from "../../src/services/shipsgoTrackingNavigation";
import type { ClientTabParamList } from "../navigation/ClientTabs";

type TabNavigation = NavigationProp<ClientTabParamList>;

export function openTrackeosFromOperacion(
  navigation: {
    getParent: <T extends ParamListBase = ParamListBase>() =>
      | NavigationProp<T>
      | undefined;
  },
  target: ShipsGoOpenTrackingTarget,
) {
  (navigation.getParent() as TabNavigation | undefined)?.navigate("Trackeos", {
    screen: "TrackeosList",
    params: {
      openTracking: target,
    },
  });
}
