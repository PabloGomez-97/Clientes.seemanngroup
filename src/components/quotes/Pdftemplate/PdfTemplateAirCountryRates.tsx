import React from "react";
import type { CountryAirRateRow } from "../Handlers/Air/buildCountryAirRates";

interface PdfTemplateAirCountryRatesProps {
  countryLabel: string;
  generatedDate: string;
  rows: CountryAirRateRow[];
  logoSrc?: string;
}

const C = {
  text: "#111",
  sub: "#666",
  line: "#e0e0e0",
  white: "#ffffff",
};

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const th: React.CSSProperties = {
  padding: "4px 5px",
  textAlign: "left",
  fontSize: "6pt",
  fontWeight: 700,
  color: C.sub,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
  borderBottom: `1.5px solid ${C.text}`,
  whiteSpace: "nowrap",
  backgroundColor: C.white,
};

const td: React.CSSProperties = {
  padding: "3px 5px",
  fontSize: "7pt",
  borderBottom: `1px solid ${C.line}`,
  verticalAlign: "middle",
};

const tdPrice: React.CSSProperties = {
  ...td,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const KG_COLUMNS: Array<{ key: keyof Pick<CountryAirRateRow, "kg45" | "kg100" | "kg300" | "kg500" | "kg1000">; label: string }> = [
  { key: "kg45", label: "45–99" },
  { key: "kg100", label: "100–299" },
  { key: "kg300", label: "300–499" },
  { key: "kg500", label: "500–999" },
  { key: "kg1000", label: "+1000" },
];

export const PdfTemplateAirCountryRates: React.FC<
  PdfTemplateAirCountryRatesProps
> = ({ countryLabel, generatedDate, rows, logoSrc = "/logo.png" }) => {
  const page: React.CSSProperties = {
    width: "297mm",
    minHeight: "210mm",
    padding: "10mm 12mm",
    boxSizing: "border-box",
    backgroundColor: C.white,
    fontFamily: FONT,
    fontSize: "8pt",
    color: C.text,
    lineHeight: 1.4,
  };

  return (
    <div id="pdf-content" style={page}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingBottom: "8px",
          borderBottom: `2px solid ${C.text}`,
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src={logoSrc}
            alt="Seemann"
            style={{ width: "44px", height: "44px", objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontSize: "14pt",
                fontWeight: 700,
                color: C.text,
                letterSpacing: "-0.3px",
              }}
            >
              Tarifas {countryLabel}
            </div>
            <div style={{ fontSize: "7.5pt", color: C.sub, marginTop: "2px" }}>
              Air Freight — Rutas recurrentes
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "7.5pt", color: C.sub }}>
          <div>Generado: {generatedDate}</div>
          <div>{rows.length} rutas</div>
        </div>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...th, width: "11%" }}>Origen</th>
            <th style={{ ...th, width: "11%" }}>Destino</th>
            <th style={{ ...th, width: "10%" }}>Carrier</th>
            {KG_COLUMNS.map((col) => (
              <th key={col.key} style={{ ...th, width: "8%", textAlign: "right" }}>
                {col.label}
                <span style={{ fontWeight: 400, fontSize: "5.5pt" }}> kg</span>
              </th>
            ))}
            <th style={{ ...th, width: "6%", textAlign: "center" }}>Mon.</th>
            <th style={{ ...th, width: "9%" }}>Validez</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ pageBreakInside: "avoid" }}>
              <td style={td}>{row.origin}</td>
              <td style={td}>{row.destination}</td>
              <td style={td}>{row.carrier}</td>
              {KG_COLUMNS.map((col) => (
                <td key={col.key} style={tdPrice}>
                  {row[col.key] ?? "—"}
                </td>
              ))}
              <td style={{ ...td, textAlign: "center" }}>{row.currency}</td>
              <td style={{ ...td, fontSize: "6.5pt" }}>{row.validUntil}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: "12px",
          fontSize: "6.5pt",
          color: C.sub,
          borderTop: `1px solid ${C.line}`,
          paddingTop: "6px",
        }}
      >
        Tarifas Air Freight de Seemann Group. Sujetas a disponibilidad.
      </div>
    </div>
  );
};
