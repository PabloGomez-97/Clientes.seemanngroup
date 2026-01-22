// HandlerQuoteLCL.tsx
// Handlers y tipos para cotizaciones LCL

export interface PieceData {
  id: string;
  packageType: string;
  description: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  // Calculados
  volume: number;
  totalVolume: number;
  weightTons: number; // peso en toneladas
  totalWeightTons: number; // peso total en toneladas
  wmChargeable: number; // W/M individual (mayor entre toneladas y volumen)
}