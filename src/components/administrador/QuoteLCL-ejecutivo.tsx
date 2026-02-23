// QuoteLCL-ejecutivo.tsx
// Wrapper delgado que reutiliza QuoteLCL en modo ejecutivo.
// Toda la lógica vive en QuoteLCL.tsx (isEjecutivoMode = true).

import QuoteLCL from "../quotes/QuoteLCL";

export default function QuoteLCLEjecutivo() {
  return <QuoteLCL isEjecutivoMode />;
}
