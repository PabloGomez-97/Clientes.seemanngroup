/**
 * Si el tab "Más"/"Menu" tiene pantallas apiladas (p. ej. Cotizador),
 * al tocar el tab vuelve al hub (MoreHome / MenuHome).
 *
 * Importante: no basta con popToTop. Al abrir Cotizador desde Inicio vía
 * `navigate('Menu', { screen: 'Cotizador' })`, React Navigation a veces deja
 * el stack solo con Cotizador (index 0). Ahí popToTop no hace nada y el
 * usuario se queda atrapado — síntoma típico en portal cliente.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPopToHubTabListener(
  tabName: string,
  hubScreen: string,
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ navigation }: { navigation: any }) => ({
    tabPress: (e: { preventDefault: () => void }) => {
      const state = navigation.getState?.();
      if (!state?.routes) return;

      const tabRoute = state.routes.find(
        (r: { name: string }) => r.name === tabName,
      );
      const nested = tabRoute?.state as
        | {
            index?: number;
            routes?: Array<{ name: string; state?: { index?: number } }>;
          }
        | undefined;

      if (!nested?.routes || typeof nested.index !== "number") return;

      const current = nested.routes[nested.index];
      if (!current) return;

      const onHub = current.name === hubScreen;
      const nestedDeep =
        typeof current.state?.index === "number" && current.state.index > 0;

      if (!onHub || nestedDeep) {
        e.preventDefault();
        navigation.navigate(tabName, { screen: hubScreen });
      }
    },
  });
}
