import { createContext, useContext } from "react";

type ReporteriaClientesContextValue = {
  openTrackingTab: () => void;
  openQuotesTab: (quoteNumber?: string) => void;
  quoteFilterNumber?: string;
};

const ReporteriaClientesContext =
  createContext<ReporteriaClientesContextValue | null>(null);

export const ReporteriaClientesProvider = ReporteriaClientesContext.Provider;

export function useReporteriaClientesContext() {
  return useContext(ReporteriaClientesContext);
}
