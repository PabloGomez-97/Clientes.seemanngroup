import { brand } from "../../theme/brand";

export type StatusToneKey = "transit" | "done" | "delayed" | "neutral";

export const TRANSIT_BLUE = "#2f6fed";

export const STATUS_TONE = {
  transit: {
    accent: TRANSIT_BLUE,
    soft: "#eff4ff",
    border: "#c7d7fc",
    text: "#1d4ed8",
  },
  done: {
    accent: "#15803d",
    soft: "#f0fdf4",
    border: "#bbf7d0",
    text: "#166534",
  },
  delayed: {
    accent: "#dc2626",
    soft: "#fef2f2",
    border: "#fecaca",
    text: "#b91c1c",
  },
  neutral: {
    accent: brand.muted,
    soft: brand.canvasAlt,
    border: brand.border,
    text: brand.inkSecondary,
  },
} as const;

export function toneForStatus(
  mode: "air" | "ocean",
  status: string,
  delayed: boolean,
): StatusToneKey {
  if (delayed) return "delayed";
  if (mode === "air") {
    if (status === "EN_ROUTE") return "transit";
    if (status === "LANDED" || status === "DELIVERED") return "done";
    return "neutral";
  }
  if (status === "SAILING" || status === "LOADED") return "transit";
  if (status === "ARRIVED" || status === "DISCHARGED") return "done";
  return "neutral";
}
