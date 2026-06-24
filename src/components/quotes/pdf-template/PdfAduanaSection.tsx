import React from "react";
import type { PdfAduanaBreakdown } from "./pdfAduanaBreakdown";

const fmt = (num: number): string =>
  num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface RowProps {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}

const Row: React.FC<RowProps> = ({ label, value, bold, accent }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "7.5pt",
      fontWeight: bold ? 700 : 400,
      color: accent ?? "#111",
    }}
  >
    <span style={{ color: bold ? "#111" : "#666" }}>{label}</span>
    <span style={{ whiteSpace: "nowrap" }}>{value}</span>
  </div>
);

interface PdfAduanaSectionProps {
  breakdown: PdfAduanaBreakdown;
}

export const PdfAduanaSection: React.FC<PdfAduanaSectionProps> = ({
  breakdown,
}) => {
  const { currency } = breakdown;
  const money = (n: number) => `${currency} ${fmt(n)}`;

  const sectionTitle =
    breakdown.mode === "fcl"
      ? "Customs Agency & Nationalization (FCL)"
      : breakdown.mode === "lcl"
        ? "Customs Agency & Nationalization (LCL)"
        : "Customs Agency & Nationalization";

  const chargesTitle =
    breakdown.mode === "fcl"
      ? "Charges Breakdown — Customs Agency (FCL)"
      : breakdown.mode === "lcl"
        ? "Charges Breakdown — Customs Agency (LCL)"
        : "Charges Breakdown — Customs Agency";

  return (
    <div style={{ marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "7pt",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "#111",
          marginBottom: "6px",
        }}
      >
        {sectionTitle}
      </div>

      {/* CIF */}
      <div
        style={{
          backgroundColor: "rgba(13, 110, 253, 0.05)",
          border: "1px solid rgba(13, 110, 253, 0.15)",
          borderRadius: "3px",
          padding: "8px 10px",
          marginBottom: "6px",
        }}
      >
        <div
          style={{
            fontSize: "6.5pt",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            color: "#475569",
            marginBottom: "5px",
          }}
        >
          CIF Calculation (Cost, Insurance &amp; Freight)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <Row label="Product Value" value={money(breakdown.valorProducto)} />
          <Row
            label="Transport Cost"
            value={money(breakdown.costoTransporte)}
          />
          <Row
            label={
              breakdown.seguroIsTheoretical
                ? "Insurance (theoretical)"
                : "Insurance (actual)"
            }
            value={money(breakdown.seguroParaCIF)}
          />
          <div
            style={{
              borderTop: "1px solid rgba(13, 110, 253, 0.2)",
              marginTop: "3px",
              paddingTop: "4px",
            }}
          >
            <Row label="CIF" value={money(breakdown.cif)} bold accent="#0d6efd" />
          </div>
        </div>
      </div>

      {/* Charges breakdown */}
      <div
        style={{
          backgroundColor: "rgba(255, 98, 0, 0.04)",
          border: "1px solid rgba(255, 98, 0, 0.12)",
          borderRadius: "3px",
          padding: "8px 10px",
        }}
      >
        <div
          style={{
            fontSize: "6.5pt",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            color: "#475569",
            marginBottom: "5px",
          }}
        >
          {chargesTitle}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <Row label="Agency Fees" value={money(breakdown.honorarios)} />

          {breakdown.mode === "air" && (
            <>
              <Row
                label="Clearance Expenses"
                value={money(breakdown.gastosDespacho)}
              />
              <Row label="Processing" value={money(breakdown.tramitacion)} />
              <Row label="Courier" value={money(breakdown.mensajeria)} />
            </>
          )}

          {breakdown.mode === "fcl" && (
            <>
              <Row
                label="Customs Clearance"
                value={money(breakdown.customsClearance)}
              />
              <Row
                label={`Gate In (${breakdown.gateInQuantity} ctr.)`}
                value={money(breakdown.gateIn)}
              />
              <Row label="Doc Process" value={money(breakdown.docProcess)} />
            </>
          )}

          {breakdown.mode === "lcl" && (
            <>
              <Row
                label="Customs Clearance"
                value={money(breakdown.customsClearance)}
              />
              <Row
                label={`Extraport Charges (W/M: ${breakdown.wmChargeable} chargeable)`}
                value={money(breakdown.extraportCharges)}
              />
            </>
          )}

          <Row
            label={`Customs VAT (${breakdown.ivaAduaneroPct}%)`}
            value={money(breakdown.ivaAduanero)}
          />
          <Row
            label={`Customs Duties (${breakdown.derechosPct}%)`}
            value={money(breakdown.derechos)}
          />
          <div
            style={{
              borderTop: "1px solid rgba(255, 98, 0, 0.2)",
              marginTop: "3px",
              paddingTop: "4px",
            }}
          >
            <Row
              label="Total Customs Agency"
              value={money(breakdown.total)}
              bold
              accent="#dc3545"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
