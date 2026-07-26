import { createContext, useContext } from "react";

/** Directorio de clientes según portal staff. */
export type StaffClientsSource = "portfolio" | "global";

const StaffClientsSourceContext =
  createContext<StaffClientsSource>("portfolio");

export const StaffClientsSourceProvider = StaffClientsSourceContext.Provider;

export function useStaffClientsSource(): StaffClientsSource {
  return useContext(StaffClientsSourceContext);
}
