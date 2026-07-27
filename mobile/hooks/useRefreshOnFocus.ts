import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Vuelve a ejecutar `refresh` cada vez que la pantalla gana foco
 * (incluye cambio de tab). Ideal para listas que deben verse frescas.
 */
export function useRefreshOnFocus(
  refresh: () => void | Promise<void>,
  enabled = true,
) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void refresh();
    }, [refresh, enabled]),
  );
}
