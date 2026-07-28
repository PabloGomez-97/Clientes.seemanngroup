import { getOriginCountryCode } from "../../../../config/airportCoordinates";
import { getPortByPOL } from "../../../../config/portCoordinates";
import { normalize } from "../FCL/HandlerQuoteFCL";

/** Hermes (RN) may lack Intl.DisplayNames — guard before `new`. */
function createRegionDisplayNames(): Intl.DisplayNames | null {
  try {
    const DisplayNames = (
      Intl as typeof Intl & { DisplayNames?: typeof Intl.DisplayNames }
    ).DisplayNames;
    if (typeof DisplayNames !== "function") return null;
    return new DisplayNames(["es"], { type: "region" });
  } catch {
    return null;
  }
}

const COUNTRY_NAMES_ES = createRegionDisplayNames();

export function getPolCountryCode(
  polNorm: string,
  mode: "air" | "fcl" | "lcl",
): string | null {
  if (!polNorm) return null;

  if (mode === "air") {
    return getOriginCountryCode(polNorm);
  }

  const port = getPortByPOL(polNorm);
  if (port?.unlocode && port.unlocode.length >= 2) {
    return port.unlocode.slice(0, 2).toUpperCase();
  }

  return null;
}

export function getCountryLabel(countryCode: string): string {
  if (!countryCode) return "Otros";
  try {
    const label = COUNTRY_NAMES_ES?.of(countryCode);
    if (label) return label;
  } catch {
    /* ignore */
  }
  return countryCode;
}

export function getPolCountry(
  polNorm: string,
  polLabel: string,
  mode: "air" | "fcl" | "lcl",
): { code: string; label: string } {
  const code = getPolCountryCode(polNorm, mode) ?? "XX";
  const label = code === "XX" ? "Otros" : getCountryLabel(code);
  return { code, label };
}

export function normalizeEntityKey(value: string | null | undefined): string {
  return normalize(value || "") || "sin-identificar";
}

export function formatEntityLabel(value: string | null | undefined): string {
  const v = (value || "").trim();
  if (!v) return "Sin identificar";
  return v
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
