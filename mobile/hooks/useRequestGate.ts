import { useCallback, useRef } from "react";

/**
 * Serializa respuestas async: ignora resultados de peticiones obsoletas
 * cuando el usuario cambia filtros/tabs rápido.
 */
export function useRequestGate() {
  const seq = useRef(0);

  const next = useCallback(() => {
    seq.current += 1;
    return seq.current;
  }, []);

  const isLatest = useCallback((id: number) => id === seq.current, []);

  return { next, isLatest };
}
