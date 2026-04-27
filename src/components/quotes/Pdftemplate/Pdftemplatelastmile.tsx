import React from "react";

interface PDFTemplateLastMileProps {
  quoteNumber: string;
  customerName: string;
  origen: string;
  destino: string;
  effectiveDate: string;
  expirationDate: string;
  pickupFromAddress: string;
  deliveryToAddress: string;
  salesRep: string;
  /** Texto libre del cargamento (max 2000) */
  cargoDescription: string;
  /** Dimensiones opcionales */
  peso?: string;
  alto?: string;
  ancho?: string;
  largo?: string;
  /** ¿Solicitó seguro? */
  seguroActivo?: boolean;
  /** Número de cotización para footer */
  validUntil?: string;
  logoSrc?: string;
}

/**
 * Trunca a 20 caracteres + "..." (según especificación del cliente, para no
 * llenar el PDF con la descripción completa).
 */
const truncateForTable = (text: string, max = 20): string => {
  if (!text) return "—";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}...`;
};

export const PDFTemplateLastMile: React.FC<PDFTemplateLastMileProps> = ({
  quoteNumber,
  customerName,
  origen,
  destino,
  effectiveDate,
  expirationDate,
  pickupFromAddress,
  deliveryToAddress,
  salesRep,
  cargoDescription,
  peso,
  alto,
  ancho,
  largo,
  seguroActivo = false,
  validUntil,
  logoSrc,
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
  const cen: React.CSSProperties = { textAlign: "center" };

  const dimensiones = [
    peso ? `Peso: ${peso} kg` : null,
    largo ? `Largo: ${largo} cm` : null,
    ancho ? `Ancho: ${ancho} cm` : null,
    alto ? `Alto: ${alto} cm` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
            src={logoSrc || "/logo.png"}
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
            Última Milla Quotation
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
          <div style={label}>Origen</div>
          <div
            style={{
              fontSize: "11pt",
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            {origen}
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
          <div style={label}>Destino</div>
          <div
            style={{
              fontSize: "11pt",
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            {destino}
          </div>
        </div>
        {validUntil && (
          <div
            style={{
              borderLeft: `1px solid ${C.line}`,
              paddingLeft: "12px",
            }}
          >
            <div style={label}>Valid Until</div>
            <div
              style={{
                ...val,
                color: C.accent,
                fontWeight: 700,
              }}
            >
              {validUntil}
            </div>
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
            ["Service", "Última Milla", false],
            ["Effective", effectiveDate, false],
            ["Expires", expirationDate, false],
            ["Sales Rep", salesRep, false],
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

      {/* ── Direcciones ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            backgroundColor: C.bg,
            border: `1px solid ${C.line}`,
            borderRadius: "3px",
            padding: "7px 10px",
          }}
        >
          <div style={label}>Pickup From</div>
          <div style={{ ...val, fontSize: "8pt" }}>
            {pickupFromAddress || "—"}
          </div>
        </div>
        <div
          style={{
            backgroundColor: C.bg,
            border: `1px solid ${C.line}`,
            borderRadius: "3px",
            padding: "7px 10px",
          }}
        >
          <div style={label}>Delivery To</div>
          <div style={{ ...val, fontSize: "8pt" }}>
            {deliveryToAddress || "—"}
          </div>
        </div>
      </div>

      {/* ── Cargo Details (Commodities) ── */}
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
              <th style={{ ...th, ...cen }}>Qty</th>
              <th style={th}>Commodity</th>
              <th style={th}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...td, ...cen, fontWeight: 600 }}>1</td>
              <td style={{ ...td, fontWeight: 600 }}>Última Milla</td>
              <td style={td}>{truncateForTable(cargoDescription)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Detalle del cargamento (texto completo) ── */}
      {cargoDescription && (
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
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <strong style={{ color: C.text }}>Información del cargamento</strong>{" "}
          — {cargoDescription}
          {dimensiones && (
            <>
              <br />
              <strong style={{ color: C.text }}>Dimensiones</strong> —{" "}
              {dimensiones}
            </>
          )}
          {seguroActivo && (
            <>
              <br />
              <strong style={{ color: C.text }}>Servicios adicionales</strong> —
              Seguro de carga solicitado
            </>
          )}
        </div>
      )}

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

      {/* ── Mensaje 48hrs ── */}
      <div
        style={{
          backgroundColor: "#fff5f5",
          border: "2px solid #dc3545",
          borderRadius: "4px",
          padding: "12px 16px",
          marginBottom: "12px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#dc3545",
            fontSize: "11pt",
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          Su ejecutivo de ventas le proporcionará una cotización formal en un
          plazo de 48 horas hábiles para su cotización de Última Milla
        </div>
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
          at either origin or destination, including but not limited to:
          inspections fees required by government agencies, X-ray, fumigation
          certificates, customs clearing charges, insurance, local taxes,
          terminal charges or other regulatory requirements by local agencies.
          All hazardous shipments are subject to approval. Tariff rates offered
          are subject to change without notice. Seemann y Compañia Limitada
          shall NOT be liable for any damages, delays or monetary loss of any
          type caused by Acts of God or other Force Majeure Events. LTL/FTL
          prices are valid for 5 days unless agreed in writing.
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
        <span>{quoteNumber || "Draft"} - Última Milla</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
};
