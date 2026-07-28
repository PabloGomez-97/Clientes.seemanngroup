import type { PieceData } from "./HandlerQuoteAir";

export type OverallPieceDataAir = {
  id: string;
  packageType: string;
  description: string;
  weight: number;
  volume: number;
  volumeWeight: number;
};

export const DEFAULT_OVERALL_AIR_DESCRIPTION = "Cargamento Aéreo";
/** ID del tipo de paquete BOX en el API de cotización aérea */
export const DEFAULT_OVERALL_AIR_PACKAGE_TYPE = "97";
export const FIXED_AIR_PACKAGE_TYPE_NAME = "BOX";
export const AIR_VOLUME_FACTOR = 167;
export const MAX_AIR_PIECES = 10;
export const MAX_AIR_TOTAL_WEIGHT_KG = 2000;

export type AirOversizeFlags = {
  oversize: boolean; // L o W > 300 cm
  heightBlocked: boolean; // H > 240 cm
  cargoFlight: boolean; // H > 160 cm
};

export function createInitialAirPieceData(id = "1"): PieceData {
  return {
    id,
    packageType: DEFAULT_OVERALL_AIR_PACKAGE_TYPE,
    description: DEFAULT_OVERALL_AIR_DESCRIPTION,
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    noApilable: false,
    volume: 0,
    totalVolume: 0,
    volumeWeight: 0,
    totalVolumeWeight: 0,
    totalWeight: 0,
  };
}

export function createOverallPieceAir(
  id: string,
  weight = 0,
  volume = 0,
  description = DEFAULT_OVERALL_AIR_DESCRIPTION,
  packageType = DEFAULT_OVERALL_AIR_PACKAGE_TYPE,
): OverallPieceDataAir {
  return {
    id,
    packageType,
    description,
    weight,
    volume,
    volumeWeight: volume * AIR_VOLUME_FACTOR,
  };
}

export function isOverallPieceCompleteAir(piece: OverallPieceDataAir): boolean {
  return piece.weight > 0 && piece.volume > 0;
}

export function calculateOverallTotalsAir(pieces: OverallPieceDataAir[]) {
  const totalWeight = pieces.reduce((sum, piece) => sum + piece.weight, 0);
  const totalVolume = pieces.reduce((sum, piece) => sum + piece.volume, 0);
  const totalVolumetricWeight = pieces.reduce(
    (sum, piece) => sum + piece.volumeWeight,
    0,
  );

  return {
    totalWeight,
    totalVolume,
    totalVolumetricWeight,
    chargeableWeight: Math.max(totalWeight, totalVolumetricWeight),
  };
}

export function calculateDetailedPieceVolume(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
): number {
  if (!lengthCm || !widthCm || !heightCm) return 0;
  return (lengthCm * widthCm * heightCm) / 1_000_000;
}

export function applyDetailedPieceDimensions(
  piece: PieceData,
  patch: Partial<
    Pick<PieceData, "length" | "width" | "height" | "weight" | "noApilable">
  >,
): PieceData {
  const next: PieceData = { ...piece, ...patch };
  const volume = calculateDetailedPieceVolume(
    next.length,
    next.width,
    next.height,
  );
  const volumeWeight = volume * AIR_VOLUME_FACTOR;
  const weight = next.weight;
  return {
    ...next,
    volume,
    totalVolume: volume,
    volumeWeight,
    totalVolumeWeight: volumeWeight,
    totalWeight: weight,
  };
}

export function calculateDetailedTotals(pieces: PieceData[]) {
  const totalRealWeight = pieces.reduce((sum, piece) => sum + piece.weight, 0);
  const totalVolumetricWeight = pieces.reduce(
    (sum, piece) => sum + piece.volumeWeight,
    0,
  );
  const totalVolume = pieces.reduce((sum, piece) => sum + piece.totalVolume, 0);
  return {
    totalRealWeight,
    totalVolumetricWeight,
    totalVolume,
    chargeableWeight: Math.max(totalRealWeight, totalVolumetricWeight),
  };
}

export function analyzeAirOversize(pieces: PieceData[]): AirOversizeFlags {
  let oversize = false;
  let heightBlocked = false;
  let cargoFlight = false;
  for (const piece of pieces) {
    if (piece.length > 300 || piece.width > 300) oversize = true;
    if (piece.height > 240) heightBlocked = true;
    if (piece.height > 160) cargoFlight = true;
  }
  return { oversize, heightBlocked, cargoFlight };
}

export function isDetailedCargoReady(pieces: PieceData[]): boolean {
  return pieces.some(
    (p) => p.weight > 0 || (p.length > 0 && p.width > 0 && p.height > 0),
  );
}

export function isOverallCargoReady(pieces: OverallPieceDataAir[]): boolean {
  if (!pieces.length) return false;
  if (!pieces.every(isOverallPieceCompleteAir)) return false;
  const totals = calculateOverallTotalsAir(pieces);
  return totals.totalWeight > 0 && totals.totalVolume > 0;
}

export function buildOverallPiecesSummaryAir(
  pieces: OverallPieceDataAir[],
): string {
  return pieces
    .map((piece, index) => {
      return `Pieza ${index + 1}: ${FIXED_AIR_PACKAGE_TYPE_NAME} / ${DEFAULT_OVERALL_AIR_DESCRIPTION} / ${piece.volume.toFixed(4)} m3 / ${piece.weight.toFixed(2)} kg`;
    })
    .join("; ");
}

export function buildDetailedPiecesSummaryAir(pieces: PieceData[]): string {
  return pieces
    .map((piece, index) => {
      return `Pieza ${index + 1}: ${piece.length}x${piece.width}x${piece.height} cm / ${piece.weight.toFixed(2)} kg`;
    })
    .join("; ");
}
