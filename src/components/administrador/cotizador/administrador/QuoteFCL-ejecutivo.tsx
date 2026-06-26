import QuoteFCL from "@/components/quotes/QuoteFCL";
import type { QuoteFCLProps } from "@/components/quotes/Handlers/FCL/HandlerQuoteFCL";

/**
 * QuoteFCL-ejecutivo.tsx
 * Wrapper delgado que reutiliza QuoteFCL en modo ejecutivo.
 * Toda la lógica vive en QuoteFCL.tsx (isEjecutivoMode = true).
 */
export default function QuoteFCLEjecutivo(
  props: Omit<QuoteFCLProps, "isEjecutivoMode">,
) {
  return <QuoteFCL {...props} isEjecutivoMode />;
}
