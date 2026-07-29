import { StackActions } from "@react-navigation/native";

/**
 * Si el tab "Más"/"Menu" tiene pantallas apiladas (p. ej. Cotizador),
 * al tocar el tab vuelve al hub (MoreHome / MenuHome) en vez de
 * reabrir la pantalla profunda donde se quedó.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPopToHubTabListener(tabName: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ navigation }: { navigation: any }) => ({
    tabPress: (e: { preventDefault: () => void }) => {
      const state = navigation.getState?.();
      if (!state?.routes) return;
      const tabRoute = state.routes.find(
        (r: { name: string }) => r.name === tabName,
      );
      const nested = tabRoute?.state as
        | { index?: number; key?: string }
        | undefined;
      if (
        nested &&
        typeof nested.index === "number" &&
        nested.index > 0 &&
        nested.key
      ) {
        e.preventDefault();
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: nested.key,
        });
      }
    },
  });
}
