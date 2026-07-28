import type { OverallPieceDataAir } from "../../../../src/components/quotes/Handlers/Air/airQuoteCargoShared";
import type { AirOversizeFlags } from "../../../../src/components/quotes/Handlers/Air/airQuoteCargoShared";
import type { PieceData } from "../../../../src/components/quotes/Handlers/Air/HandlerQuoteAir";
import type { AereoTtBracketResult } from "../../../../src/types/gestionCotizador";
import type { VespucioDeliveryZone } from "../../../../src/config/vespucioRing";
import type { AirStep1Result } from "./QuoteAirStep1";

export type AirCargoMode = "detailed" | "overall";

export type AirStep2Result = {
  mode: AirCargoMode;
  pieces: PieceData[];
  overallPieces: OverallPieceDataAir[];
  totalRealWeight: number;
  totalVolumetricWeight: number;
  chargeableWeight: number;
  oversize: AirOversizeFlags;
  noApilableActivo: boolean;
};

export type AirStep3Result = {
  seguroActivo: boolean;
  valorMercaderia: string;
  gastolocal: boolean;
  liveTrackingActivo: boolean;
  ultimaMillaActivo: boolean;
  ultimaMillaDireccion: string;
  ultimaMillaZone: VespucioDeliveryZone | null;
  ultimaMillaBracket: AereoTtBracketResult | null;
  aduanaActivo: boolean;
  valorProductoAduana: string;
  /** Quién manda el valor sincronizado: true=aduana, false=seguro, null=independiente */
  aduanaMaster: boolean | null;
};

export type AirWizardContext = {
  step1: AirStep1Result;
  step2: AirStep2Result;
  step3: AirStep3Result;
  clientUsername?: string;
  clientName?: string;
  clientUserId?: string;
};
