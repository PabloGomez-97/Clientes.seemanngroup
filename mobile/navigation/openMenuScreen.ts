import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { ClientTabParamList } from "./ClientTabs";
import type { MenuStackParamList } from "./MenuStack";

type TabNavigation = NavigationProp<ClientTabParamList>;

export type MenuScreenName = keyof MenuStackParamList;

export function openMenuScreen(
  navigation: {
    getParent?: <T extends ParamListBase = ParamListBase>() =>
      | NavigationProp<T>
      | undefined;
    navigate: (...args: never[]) => void;
  },
  screen: MenuScreenName,
  params?: MenuStackParamList[MenuScreenName],
) {
  const tabNav =
    (navigation.getParent?.() as TabNavigation | undefined) ??
    (navigation as unknown as TabNavigation);

  if (params !== undefined) {
    tabNav.navigate("Menu", { screen, params } as never);
  } else {
    tabNav.navigate("Menu", { screen } as never);
  }
}

export function openTrackeosTab(
  navigation: {
    getParent?: <T extends ParamListBase = ParamListBase>() =>
      | NavigationProp<T>
      | undefined;
    navigate: (...args: never[]) => void;
  },
) {
  const tabNav =
    (navigation.getParent?.() as TabNavigation | undefined) ??
    (navigation as unknown as TabNavigation);
  tabNav.navigate("Trackeos", { screen: "TrackeosList" });
}
