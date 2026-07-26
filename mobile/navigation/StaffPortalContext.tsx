import { createContext, useContext } from "react";

export type StaffPortalKind = "executive" | "operaciones";

const StaffPortalContext = createContext<StaffPortalKind>("executive");

export const StaffPortalProvider = StaffPortalContext.Provider;

export function useStaffPortal(): StaffPortalKind {
  return useContext(StaffPortalContext);
}
