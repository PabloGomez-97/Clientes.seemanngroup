import { useRef } from "react";
import CotizadorLastMile from "@/components/quotes/QuoteLASTMILE";
import {
  AirCotizadorSidebarProvider,
  AirCotizadorSidebarSlot,
  useAirCotizadorSidebarOptional,
} from "@/components/quotes/Handlers/Air/AirCotizadorSidebarContext";
import "@/components/cliente/styles/Cotizador.css";

function CotizadorFormLayout({ children }: { children: React.ReactNode }) {
  const sidebarCtx = useAirCotizadorSidebarOptional();
  const hasSidebar = sidebarCtx?.hasSidebar ?? false;

  return (
    <div
      className={`cotizador-container cotizador-container--form${hasSidebar ? " cotizador-container--with-sidebar" : ""}`}
    >
      <div
        className={`cotizador-split${hasSidebar ? " cotizador-split--active" : ""}`}
      >
        <div className="cotizador-split__main">
          <div className="cotizador-quote-container cotizador-quote-container--form">
            {children}
          </div>
        </div>
        <AirCotizadorSidebarSlot />
      </div>
    </div>
  );
}

export default function UltimaMillaCotizador() {
  const quoteAbandonRef = useRef<(() => void) | null>(null);

  return (
    <div className="cotizador-page cotizador-page--form">
      <AirCotizadorSidebarProvider>
        <CotizadorFormLayout>
          <CotizadorLastMile key="lastmile" abandonRef={quoteAbandonRef} />
        </CotizadorFormLayout>
      </AirCotizadorSidebarProvider>
    </div>
  );
}
