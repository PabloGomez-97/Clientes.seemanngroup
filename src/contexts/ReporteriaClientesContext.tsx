import { createContext, useContext } from "react";
import type { ShipsGoOpenTrackingTarget } from "../services/shipsgoTrackingNavigation";

type ReporteriaClientesContextValue = {
  openTrackingTab: (
    tab?: "air" | "ocean",
    openTracking?: ShipsGoOpenTrackingTarget | null,
  ) => void;
  openQuotesTab: (quoteNumber?: string) => void;
  openShipmentsTab: (
    tab: "air" | "ocean",
    shipmentFilterNumber?: string,
  ) => void;
  quoteFilterNumber?: string;
};

const ReporteriaClientesContext =
  createContext<ReporteriaClientesContextValue | null>(null);

export const ReporteriaClientesProvider = ReporteriaClientesContext.Provider;

export function useReporteriaClientesContext() {
  return useContext(ReporteriaClientesContext);
}
