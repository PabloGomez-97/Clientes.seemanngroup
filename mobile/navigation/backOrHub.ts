type NavLike = {
  canGoBack: () => boolean;
  goBack: () => void;
  navigate: (name: never | string, params?: object) => void;
  getParent?: () => NavLike | undefined;
  getState?: () => { routeNames?: string[] } | undefined;
};

/**
 * Chevron atrás seguro: si hay historial, goBack; si no (atajo desde Inicio
 * dejando el stack en index 0), navega al hub del menú.
 */
export function backOrHub(navigation: NavLike, fallbackScreen: string) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate(fallbackScreen);
}

/**
 * Para stacks anidados (Cotizador dentro de Menu/More): intentar goBack local,
 * luego parent, luego hub MenuHome/MoreHome en el stack padre.
 */
export function backOrParentHub(navigation: NavLike) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  let nav: NavLike | undefined = navigation.getParent?.();
  while (nav) {
    if (nav.canGoBack()) {
      nav.goBack();
      return;
    }
    const names = nav.getState?.()?.routeNames;
    if (names?.includes("MenuHome")) {
      nav.navigate("MenuHome");
      return;
    }
    if (names?.includes("MoreHome")) {
      nav.navigate("MoreHome");
      return;
    }
    nav = nav.getParent?.();
  }
}
