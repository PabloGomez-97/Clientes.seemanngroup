import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Ejecuta `refresh` al ganar foco.
 * Usa ref para que un `refresh` inestable no re-dispare el efecto
 * mientras la pantalla sigue enfocada (evita loops de carga).
 */
export function useRefreshOnFocus(
  refresh: () => void | Promise<void>,
  enabled = true,
) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void refreshRef.current();
    }, [enabled]),
  );
}
