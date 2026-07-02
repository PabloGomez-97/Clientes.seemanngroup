import { useCallback } from "react";
import type { EjecutivoCliente } from "./EjecutivoClienteSelector";

export function useClienteEjecutivoGuard(
  isEjecutivoMode: boolean,
  clienteSeleccionado: EjecutivoCliente | null,
) {
  const requireCliente = useCallback((): boolean => {
    if (!isEjecutivoMode || clienteSeleccionado) {
      return true;
    }
    return false;
  }, [isEjecutivoMode, clienteSeleccionado]);

  return {
    requireCliente,
    clienteEjecutivoPendiente: isEjecutivoMode && !clienteSeleccionado,
  };
}
