import React from "react";
import {
  getCountryRateCellValue,
  type CountryRateColumn,
  type CountryRateRow,
} from "../Handlers/shared/countryRatesTypes";

interface PdfTemplateCountryRatesProps {
  countryLabel: string;
  serviceSuffix: string;
  generatedDate: string;
  columns: CountryRateColumn[];
  rows: CountryRateRow[];
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

export const PdfTemplateCountryRates: React.FC<PdfTemplateCountryRatesProps> = ({
  countryLabel,
  serviceSuffix,
  generatedDate,
  columns,
  rows,
  logoSrc = "/logo.png",
}) => {
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
              Tarifas {countryLabel} {serviceSuffix}
            </div>
            <div style={{ fontSize: "7.5pt", color: C.sub, marginTop: "2px" }}>
              Rutas recurrentes
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
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...th,
                  width: col.width,
                  textAlign: col.type === "price" ? "right" : "left",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ pageBreakInside: "avoid" }}>
              {columns.map((col) => {
                const value = getCountryRateCellValue(row, col);
                const isPrice = col.type === "price";
                const isCurrency = col.key === "currency";
                return (
                  <td
                    key={col.key}
                    style={{
                      ...(isPrice ? tdPrice : td),
                      textAlign: isPrice
                        ? "right"
                        : isCurrency
                          ? "center"
                          : "left",
                      fontSize: col.key === "validUntil" ? "6.5pt" : "7pt",
                    }}
                  >
                    {value}
                  </td>
                );
              })}
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
        Tarifas de Seemann Group. Sujetas a cambios sin previo aviso, según disponibilidad.
      </div>
    </div>
  );
};
