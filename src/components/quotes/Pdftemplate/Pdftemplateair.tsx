import React from "react";

interface PieceData {
  id: string;
  length: number;
  width: number;
  height: number;
  description?: string;
  weight: number;
  volume: number;
  volumeWeight: number;
}

interface PDFTemplateAIRProps {
  customerName: string;
  origin: string;
  destination: string;
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
  chargeableWeight: number;
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
  overallMode: boolean;
  piecesData?: PieceData[];
}

const formatNumber = (num: number): string => {
  if (num % 1 === 0) return num.toString();
  return num.toFixed(num < 10 ? 4 : 2);
};

export const PDFTemplateAIR: React.FC<PDFTemplateAIRProps> = ({
  customerName,
  origin,
  destination,
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
  chargeableWeight,
  weightUnit,
  volumeUnit,
  charges,
  totalCharges,
  currency,
  overallMode,
  piecesData,
}) => {
  // ===== Minimal / Traditional theme tokens =====
  const COLORS = {
    text: "#111111",
    subtext: "#666666",
    line: "#E5E5E5",
    soft: "#F7F7F7",
  };

  const pageStyle: React.CSSProperties = {
    width: "210mm",
    minHeight: "297mm",
    padding: "15mm",
    boxSizing: "border-box",
    backgroundColor: "white",
    fontFamily: "Inter, Helvetica, Arial, sans-serif",
    fontSize: "10pt",
    color: COLORS.text,
    position: "relative",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
    paddingBottom: "12px",
    borderBottom: `1px solid ${COLORS.line}`,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: "9.5pt",
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
    paddingBottom: "6px",
    marginBottom: "10px",
    borderBottom: `1px solid ${COLORS.line}`,
    color: COLORS.text,
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: "16px",
  };

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${COLORS.line}`,
    borderRadius: "2px",
    padding: "12px",
  };

  const gridLabelStyle: React.CSSProperties = {
    fontWeight: 600,
    color: COLORS.text,
  };

  const subtleText: React.CSSProperties = {
    color: COLORS.subtext,
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "9pt",
    border: `1px solid ${COLORS.line}`,
  };

  const thStyle: React.CSSProperties = {
    padding: "9px 8px",
    textAlign: "left",
    backgroundColor: COLORS.soft,
    color: COLORS.text,
    fontWeight: 600,
    borderBottom: `1px solid ${COLORS.line}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: "9px 8px",
    borderBottom: `1px solid ${COLORS.line}`,
    verticalAlign: "top",
  };

  const right: React.CSSProperties = { textAlign: "right" };
  const center: React.CSSProperties = { textAlign: "center" };

  const twoCol: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  };

  const metaBar: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    padding: "10px 0",
    borderBottom: `1px solid ${COLORS.line}`,
  };

  return (
    <div id="pdf-content" style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src="/logo.png"
            alt="Seemann Group"
            style={{ width: "72px", height: "72px", objectFit: "contain" }}
          />
          <div style={{ fontSize: "9pt", lineHeight: 1.5 }}>
            <div
              style={{ fontWeight: 600, fontSize: "11pt", marginBottom: "4px" }}
            >
              Seemann y Compañia Limitada
            </div>
            <div style={subtleText}>Av. Libertad 1405, Oficina 1203</div>
            <div style={subtleText}>Viña del Mar, Valparaiso 2520000</div>
            <div style={subtleText}>CHILE</div>
            <div style={{ marginTop: "6px", ...subtleText }}>
              Phone: +56226048385 • RUT 76.583.910-6
            </div>
            <div style={subtleText}>contacto@seemanngroup.com</div>
            <div style={subtleText}>seemanngroup.com</div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              margin: 0,
              fontSize: "26pt",
              fontWeight: 600,
              letterSpacing: "1px",
              lineHeight: 1,
            }}
          >
            QUOTE
          </div>
        </div>
      </div>

      {/* Quote meta */}
      <div style={metaBar}>
        <div style={{ fontSize: "12pt", fontWeight: 600 }}>QUO000001</div>
        <div
          style={{ fontSize: "9pt", textAlign: "right", color: COLORS.subtext }}
        >
          <div>
            <span style={gridLabelStyle}>Printed On:</span>{" "}
            {new Date().toLocaleDateString()}
          </div>
          <div>
            <span style={gridLabelStyle}>Printed By:</span> {customerName}
          </div>
        </div>
      </div>

      {/* Customer + Additional info */}
      <div style={{ ...twoCol, ...sectionStyle }}>
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Customer</div>
          <div style={{ fontWeight: 600, fontSize: "11pt" }}>
            {customerName}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Additional Information</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "8px 12px",
              fontSize: "9pt",
            }}
          >
            <div style={gridLabelStyle}>Effective Date:</div>
            <div>{effectiveDate}</div>

            <div style={gridLabelStyle}>Expiration Date:</div>
            <div>{expirationDate}</div>

            <div style={gridLabelStyle}>Origin:</div>
            <div>{origin}</div>

            <div style={gridLabelStyle}>Dest:</div>
            <div>{destination}</div>

            <div style={gridLabelStyle}>Incoterms:</div>
            <div style={{ fontWeight: 600 }}>{incoterm}</div>

            {incoterm === "EXW" && pickupFromAddress && (
              <>
                <div style={gridLabelStyle}>Pickup From:</div>
                <div style={{ fontSize: "8.5pt", color: COLORS.subtext }}>
                  {pickupFromAddress}
                </div>
              </>
            )}

            {incoterm === "EXW" && deliveryToAddress && (
              <>
                <div style={gridLabelStyle}>Delivery To:</div>
                <div style={{ fontSize: "8.5pt", color: COLORS.subtext }}>
                  {deliveryToAddress}
                </div>
              </>
            )}

            <div style={gridLabelStyle}>Transit Days:</div>
            <div>5</div>

            <div style={gridLabelStyle}>Sales Rep:</div>
            <div>{salesRep}</div>
          </div>
        </div>
      </div>

      {/* Shipper + Consignee */}
      <div style={{ ...twoCol, ...sectionStyle }}>
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Shipper</div>
          <div style={{ minHeight: "52px", color: COLORS.subtext }}>&nbsp;</div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Consignee</div>
          <div style={{ fontWeight: 600, fontSize: "11pt" }}>
            {customerName}
          </div>
        </div>
      </div>

      {/* Tracking System Message */}
      <div
        style={{
          marginTop: "12px",
          padding: "10px",
          backgroundColor: "#F0F8FF",
          borderLeft: `3px solid #0066CC`,
          borderRadius: "2px",
          fontSize: "8.5pt",
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 600, color: "#0066CC", marginBottom: "4px" }}>
          🔍 Sistema de Seguimiento en Línea
        </div>
        <div style={{ color: COLORS.text }}>
          Al confirmar esta cotización con nosotros, tendrá acceso{" "}
          <strong>sin costo adicional</strong> a nuestro sistema de rastreo en
          tiempo real, donde podrá consultar la ubicación de su cargamento,
          tiempo estimado de llegada y el estado actualizado de su envío.
        </div>
      </div>

      {/* Commodities table - AIR specific */}
      <div
        style={{
          ...sectionStyle,
          pageBreakBefore: "always",
          breakBefore: "page",
          marginTop: "20mm",
        }}
      >
        <div style={sectionTitleStyle}>Commodities</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, ...center }}>Pieces</th>
              <th style={thStyle}>Package</th>
              {!overallMode && <th style={thStyle}>Dimensions</th>}
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, ...right }}>Weight</th>
              <th style={{ ...thStyle, ...right }}>Volume</th>
              <th style={{ ...thStyle, ...right }}>Chargeable</th>
            </tr>
          </thead>
          <tbody>
            {overallMode ? (
              <tr>
                <td style={{ ...tdStyle, ...center, fontWeight: 600 }}>
                  {pieces}
                </td>
                <td style={tdStyle}>{packageTypeName}</td>
                {!overallMode && (
                  <td style={tdStyle}>
                    {formatNumber(length)} × {formatNumber(width)} ×{" "}
                    {formatNumber(height)} cm
                  </td>
                )}
                <td style={tdStyle}>{description}</td>
                <td style={{ ...tdStyle, ...right, fontWeight: 600 }}>
                  {formatNumber(totalWeight)} {weightUnit}
                </td>
                <td style={{ ...tdStyle, ...right, fontWeight: 600 }}>
                  {formatNumber(totalVolume)} {volumeUnit}
                </td>
                <td style={{ ...tdStyle, ...right, fontWeight: 600 }}>
                  {formatNumber(chargeableWeight)} {weightUnit}
                </td>
              </tr>
            ) : (
              piecesData &&
              piecesData.length > 0 &&
              piecesData.map((piece, idx) => (
                <tr key={piece.id}>
                  <td style={{ ...tdStyle, ...center, fontWeight: 600 }}>1</td>
                  <td style={tdStyle}>{packageTypeName}</td>
                  <td style={tdStyle}>
                    {formatNumber(piece.length)} × {formatNumber(piece.width)} ×{" "}
                    {formatNumber(piece.height)} cm
                  </td>
                  <td style={tdStyle}>{piece.description || description}</td>
                  <td style={{ ...tdStyle, ...right, fontWeight: 600 }}>
                    {formatNumber(piece.weight)} {weightUnit}
                  </td>
                  <td style={{ ...tdStyle, ...right, fontWeight: 600 }}>
                    {formatNumber(piece.volume)} {volumeUnit}
                  </td>
                  <td style={{ ...tdStyle, ...right, fontWeight: 600 }}>
                    {formatNumber(piece.volumeWeight)} {weightUnit}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals summary (minimal) */}
        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: `1px solid ${COLORS.line}`,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            fontSize: "9.5pt",
          }}
        >
          <div>
            <span style={gridLabelStyle}>Pieces:</span> {pieces}
          </div>
          <div>
            <span style={gridLabelStyle}>Weight:</span>{" "}
            {formatNumber(totalWeight)} {weightUnit}
          </div>
          <div>
            <span style={gridLabelStyle}>Volume:</span>{" "}
            {formatNumber(totalVolume)} {volumeUnit}
          </div>
          <div>
            <span style={gridLabelStyle}>Chargeable:</span>{" "}
            {formatNumber(chargeableWeight)} {weightUnit}
          </div>
        </div>
      </div>

      {/* Charges table */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Charges</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, ...right }}>Qty</th>
              <th style={{ ...thStyle, ...center }}>Unit</th>
              <th style={{ ...thStyle, ...right }}>Rate</th>
              <th style={{ ...thStyle, ...right }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((charge, index) => (
              <tr key={index}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{charge.code}</td>
                <td style={tdStyle}>{charge.description}</td>
                <td style={{ ...tdStyle, ...right }}>
                  {formatNumber(charge.quantity)}
                </td>
                <td style={{ ...tdStyle, ...center }}>{charge.unit}</td>
                <td style={{ ...tdStyle, ...right }}>
                  {formatNumber(charge.rate)}
                </td>
                <td style={{ ...tdStyle, ...right, fontWeight: 600 }}>
                  {formatNumber(charge.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total charges (invoice-style) */}
        <div
          style={{
            marginTop: "12px",
            paddingTop: "10px",
            borderTop: `1px solid ${COLORS.text}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ fontSize: "13pt", fontWeight: 600 }}>
              TOTAL CHARGES ({currency}): {formatNumber(totalCharges)}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: "8px",
            textAlign: "right",
            fontSize: "8pt",
            color: COLORS.subtext,
          }}
        >
          <small>
            * El cobro del Airport Transfer es {currency} 0.15/kg - Mínimo{" "}
            {currency} 50
          </small>
        </div>
      </div>

      {/* Comments */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Comments</div>
        <div style={{ ...cardStyle, borderRadius: "2px" }}>
          <div style={{ fontWeight: 600, marginBottom: "8px" }}>
            Charges Applied:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              lineHeight: 1.7,
              color: COLORS.subtext,
            }}
          >
            {charges.map((charge, index) => (
              <li key={index}>
                {charge.description}: {formatNumber(charge.quantity)} ×{" "}
                {currency} {formatNumber(charge.rate)} = {currency}{" "}
                {formatNumber(charge.amount)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Terms */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Terms</div>
        <div
          style={{
            ...cardStyle,
            fontSize: "8.5pt",
            lineHeight: 1.6,
            color: COLORS.subtext,
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
          to. Storage charges/washing charges will be for the account of
          customer and will be based upon the governing tariff of the relevant
          port(s) in effect at the time of shipment. All hazardous shipments are
          subject to approval. Ocean freight is subject to GRI & carrier's
          locals at destination. Tariff rates offered are subject to change
          without notice. Seemann y Compañia Limitada shall NOT be liable for
          any damages, delays or monetary loss of any type caused by: Acts of
          God or other Force Majeure Events; ie: weather delays, storms, floods,
          war, fires. LTL/FTL prices are valid for 7 days unless agreed in
          written.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${COLORS.line}`,
          paddingTop: "10px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "8pt",
          color: COLORS.subtext,
        }}
      >
        <div>
          Seemann Cloud Applications | www.portalclientes.seemanngroup.com
        </div>
        <div>QuotationGeneralWithoutTax</div>
        <div>Page 1 of 1</div>
      </div>
    </div>
  );
};
