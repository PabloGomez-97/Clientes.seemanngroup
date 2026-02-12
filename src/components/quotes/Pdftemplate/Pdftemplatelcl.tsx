import React from "react";

interface PDFTemplateLCLProps {
  quoteNumber: string;
  customerName: string;
  pol: string;
  pod: string;
  effectiveDate: string;
  expirationDate: string;
  incoterm: string;
  pickupFromAddress?: string;
  deliveryToAddress?: string;
  salesRep: string;
  pieces: number;
  packageTypeName: string;
  length: number;
  width: number;
  height: number;
  description: string;
  totalWeight: number;
  totalVolume: number;
  totalVolumeWeight: number;
  weightUnit: string;
  volumeUnit: string;
  charges: Array<{
    code: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }>;
  totalCharges: number;
  currency: string;
  carrier?: string;
  transitTime?: string;
  frequency?: string;
  service?: string;
}

const fmt = (num: number): string => {
  if (num % 1 === 0) return num.toLocaleString("en-US");
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: num < 10 ? 4 : 2,
  });
};

export const PDFTemplateLCL: React.FC<PDFTemplateLCLProps> = ({
  quoteNumber,
  customerName,
  pol,
  pod,
  effectiveDate,
  expirationDate,
  incoterm,
  pickupFromAddress,
  deliveryToAddress,
  salesRep,
  pieces,
  packageTypeName,
  length,
  width,
  height,
  description,
  totalWeight,
  totalVolume,
  totalVolumeWeight,
  weightUnit,
  volumeUnit,
  charges,
  totalCharges,
  currency,
  carrier,
  transitTime,
  frequency,
  service,
}) => {
  const C = {
    text: "#111",
    sub: "#666",
    line: "#e0e0e0",
    bg: "#f7f8fa",
    accent: "#ff6200",
    white: "#ffffff",
  };
  const FONT =
    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const page: React.CSSProperties = {
    width: "210mm",
    minHeight: "297mm",
    padding: "12mm 14mm",
    boxSizing: "border-box",
    backgroundColor: C.white,
    fontFamily: FONT,
    fontSize: "8.5pt",
    color: C.text,
    position: "relative",
    lineHeight: 1.45,
  };

  const label: React.CSSProperties = {
    fontSize: "6.5pt",
    fontWeight: 600,
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "1px",
  };
  const val: React.CSSProperties = {
    fontSize: "8.5pt",
    fontWeight: 500,
    color: C.text,
  };

  const th: React.CSSProperties = {
    padding: "5px 8px",
    textAlign: "left",
    fontSize: "6.5pt",
    fontWeight: 700,
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    borderBottom: `1.5px solid ${C.text}`,
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "5px 8px",
    fontSize: "8.5pt",
    borderBottom: `1px solid ${C.line}`,
    verticalAlign: "top",
  };
  const r: React.CSSProperties = { textAlign: "right" };
  const cen: React.CSSProperties = { textAlign: "center" };

  return (
    <div id="pdf-content" style={page}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingBottom: "10px",
          borderBottom: `2px solid ${C.text}`,
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src="/logo.png"
            alt="Seemann"
            style={{ width: "48px", height: "48px", objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "10pt",
                letterSpacing: "-0.2px",
              }}
            >
              Seemann y Compañia Limitada
            </div>
            <div
              style={{
                fontSize: "7pt",
                color: C.sub,
                lineHeight: 1.5,
                marginTop: "1px",
              }}
            >
              Av. Libertad 1405, Of. 1203 · Viña del Mar, Chile
              <br />
              +56 2 2604 8385 · contacto@seemanngroup.com
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "6.5pt",
              fontWeight: 600,
              color: C.sub,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            LCL Freight Quotation
          </div>
          <div
            style={{
              fontSize: "18pt",
              fontWeight: 700,
              color: C.text,
              letterSpacing: "-0.5px",
              lineHeight: 1,
              marginTop: "2px",
            }}
          >
            {quoteNumber || "—"}
          </div>
        </div>
      </div>

      {/* ── Route strip ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: C.bg,
          border: `1px solid ${C.line}`,
          borderRadius: "3px",
          padding: "9px 14px",
          marginBottom: "10px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={label}>Port of Loading</div>
          <div
            style={{
              fontSize: "11pt",
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            {pol}
          </div>
        </div>
        <div
          style={{
            color: C.accent,
            fontSize: "14pt",
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          ⟶
        </div>
        <div style={{ flex: 1 }}>
          <div style={label}>Port of Discharge</div>
          <div
            style={{
              fontSize: "11pt",
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            {pod}
          </div>
        </div>
        {carrier && (
          <div
            style={{
              borderLeft: `1px solid ${C.line}`,
              paddingLeft: "12px",
            }}
          >
            <div style={label}>Carrier / Operator</div>
            <div style={val}>{carrier}</div>
          </div>
        )}
        {transitTime && (
          <div
            style={{
              borderLeft: `1px solid ${C.line}`,
              paddingLeft: "12px",
            }}
          >
            <div style={label}>Transit</div>
            <div style={val}>{transitTime} days</div>
          </div>
        )}
        {frequency && (
          <div
            style={{
              borderLeft: `1px solid ${C.line}`,
              paddingLeft: "12px",
            }}
          >
            <div style={label}>Frequency</div>
            <div style={val}>{frequency}</div>
          </div>
        )}
      </div>

      {/* ── Info grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
          gap: "0",
          border: `1px solid ${C.line}`,
          borderRadius: "3px",
          marginBottom: "10px",
          overflow: "hidden",
        }}
      >
        {(
          [
            ["Customer", customerName, true],
            ["Incoterm", incoterm, false],
            ["Effective", effectiveDate, false],
            ["Expires", expirationDate, false],
            ["Sales Rep", salesRep, false],
            ...(service ? [["Service", service, false]] : []),
          ] as [string, string, boolean][]
        ).map(([lbl, v, bold], i) => (
          <div
            key={i}
            style={{
              padding: "7px 10px",
              borderRight: `1px solid ${C.line}`,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div style={label}>{lbl}</div>
            <div style={{ ...val, fontWeight: bold ? 700 : 500 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── EXW addresses ── */}
      {incoterm === "EXW" && (pickupFromAddress || deliveryToAddress) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          {pickupFromAddress && (
            <div
              style={{
                backgroundColor: C.bg,
                border: `1px solid ${C.line}`,
                borderRadius: "3px",
                padding: "7px 10px",
              }}
            >
              <div style={label}>Pickup From</div>
              <div style={{ ...val, fontSize: "8pt" }}>{pickupFromAddress}</div>
            </div>
          )}
          {deliveryToAddress && (
            <div
              style={{
                backgroundColor: C.bg,
                border: `1px solid ${C.line}`,
                borderRadius: "3px",
                padding: "7px 10px",
              }}
            >
              <div style={label}>Delivery To</div>
              <div style={{ ...val, fontSize: "8pt" }}>{deliveryToAddress}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Commodities ── */}
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            fontSize: "7pt",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: C.text,
            marginBottom: "4px",
          }}
        >
          Cargo Details
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, ...cen }}>Pcs</th>
              <th style={th}>Package</th>
              <th style={th}>Dimensions (cm)</th>
              <th style={th}>Description</th>
              <th style={{ ...th, ...r }}>Weight ({weightUnit})</th>
              <th style={{ ...th, ...r }}>Volume ({volumeUnit})</th>
              <th style={{ ...th, ...r }}>W/M ({weightUnit})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...td, ...cen, fontWeight: 600 }}>{pieces}</td>
              <td style={td}>{packageTypeName}</td>
              <td style={td}>
                {fmt(length)} × {fmt(width)} × {fmt(height)}
              </td>
              <td style={td}>{description}</td>
              <td style={{ ...td, ...r, fontWeight: 600 }}>
                {fmt(totalWeight)}
              </td>
              <td style={{ ...td, ...r, fontWeight: 600 }}>
                {fmt(totalVolume)}
              </td>
              <td style={{ ...td, ...r, fontWeight: 600 }}>
                {fmt(totalVolumeWeight)}
              </td>
            </tr>
          </tbody>
        </table>
        {/* Summary strip */}
        <div
          style={{
            display: "flex",
            gap: "18px",
            padding: "5px 8px",
            backgroundColor: C.bg,
            borderRadius: "0 0 3px 3px",
            borderTop: `1px solid ${C.line}`,
            fontSize: "7.5pt",
          }}
        >
          <span>
            <strong>Pieces:</strong> {pieces}
          </span>
          <span>
            <strong>Gross Weight:</strong> {fmt(totalWeight)} {weightUnit}
          </span>
          <span>
            <strong>Volume:</strong> {fmt(totalVolume)} {volumeUnit}
          </span>
          <span>
            <strong>Chargeable (W/M):</strong> {fmt(totalVolumeWeight)}{" "}
            {weightUnit}
          </span>
        </div>
      </div>

      {/* ── Charges ── */}
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            fontSize: "7pt",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: C.text,
            marginBottom: "4px",
          }}
        >
          Charges
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Code</th>
              <th style={{ ...th, width: "40%" }}>Description</th>
              <th style={{ ...th, ...r }}>Qty</th>
              <th style={{ ...th, ...cen }}>Unit</th>
              <th style={{ ...th, ...r }}>Rate ({currency})</th>
              <th style={{ ...th, ...r }}>Amount ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((ch, i) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 600, fontSize: "8pt" }}>
                  {ch.code}
                </td>
                <td style={td}>{ch.description}</td>
                <td style={{ ...td, ...r }}>{fmt(ch.quantity)}</td>
                <td style={{ ...td, ...cen }}>{ch.unit}</td>
                <td style={{ ...td, ...r }}>{fmt(ch.rate)}</td>
                <td style={{ ...td, ...r, fontWeight: 600 }}>
                  {fmt(ch.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Total */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "baseline",
            gap: "8px",
            padding: "8px 8px 0",
            borderTop: `2px solid ${C.text}`,
            marginTop: "2px",
          }}
        >
          <span
            style={{
              fontSize: "7pt",
              color: C.sub,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Total
          </span>
          <span
            style={{
              fontSize: "14pt",
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            {currency} {fmt(totalCharges)}
          </span>
        </div>
      </div>

      {/* ── Tracking message ── */}
      <div
        style={{
          backgroundColor: C.bg,
          border: `1px solid ${C.line}`,
          borderLeft: `3px solid ${C.accent}`,
          borderRadius: "3px",
          padding: "7px 12px",
          marginBottom: "10px",
          fontSize: "7.5pt",
          color: C.sub,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: C.text }}>Online Tracking</strong> — Upon
        confirmation you will receive complimentary access to our real-time
        tracking system to monitor your shipment status, ETA, and location
        updates.
      </div>

      {/* ── Terms ── */}
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            fontSize: "6.5pt",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: C.sub,
            marginBottom: "3px",
          }}
        >
          Terms &amp; Conditions
        </div>
        <div
          style={{
            fontSize: "6pt",
            lineHeight: 1.55,
            color: C.sub,
            columnCount: 2,
            columnGap: "14px",
          }}
        >
          Insure your cargo (FULL COVERAGE-ALL RISK) – Please ask our prices.
          Seemann y Compañia Limitada shall NOT be liable for any damages,
          delays or monetary loss of any type if you decided to not hire
          insurance. Equipment and space are subject to availability at the time
          of the booking. Reposition costs may apply. Rates do not include any
          additional services, unless specified in quote, and/or additional fees
          at either port of load or port of discharge, including but not limited
          to: inspections fees required by government agencies, X-ray,
          fumigation certificates, customs clearing charges, insurance, local
          taxes, terminal charges or other regulatory requirements by local
          agencies. Local port/crane charges etc. at both load and discharge
          ports are for the account of customer even if not specified in quote.
          Any/all Receiving/Wharfage/Terminal charges including but not limited
          to storage charges/washing charges will be for the account of customer
          and will be based upon the governing tariff of the relevant port(s) in
          effect at the time of shipment. All hazardous shipments are subject to
          approval. Tariff rates offered are subject to change without notice.
          Seemann y Compañia Limitada shall NOT be liable for any damages,
          delays or monetary loss of any type caused by Acts of God or other
          Force Majeure Events. LTL/FTL prices are valid for 7 days unless
          agreed in writing.
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: `1px solid ${C.line}`,
          paddingTop: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "6.5pt",
          color: C.sub,
        }}
      >
        <span>Seemann Cloud · portalclientes.seemanngroup.com</span>
        <span>{quoteNumber || "Draft"}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
};
