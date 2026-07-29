import type { PdfAduanaBreakdownAir } from "../../src/components/quotes/pdf-template/pdfAduanaBreakdown";
import type { PdfChargeLine } from "../../src/components/quotes/Handlers/Air/airQuotePricingShared";

export type AirPdfPieceRow = {
  id: string;
  packageTypeName?: string;
  length?: number;
  width?: number;
  height?: number;
  description?: string;
  weight: number;
  volume: number;
  volumeWeight?: number;
  chargeableWeight?: number;
};

export type BuildAirQuotePdfHtmlParams = {
  quoteNumber: string;
  customerName: string;
  origin: string;
  destination: string;
  effectiveDate: string;
  expirationDate: string;
  incoterm: string;
  pickupFromAddress?: string;
  deliveryToAddress?: string;
  ultimaMillaDeliveryAddress?: string;
  salesRep: string;
  pieces: number;
  packageTypeName: string;
  description: string;
  totalWeight: number;
  totalVolume: number;
  chargeableWeight: number;
  weightUnit?: string;
  volumeUnit?: string;
  charges: PdfChargeLine[];
  totalCharges: number;
  currency: string;
  overallMode: boolean;
  piecesData?: AirPdfPieceRow[];
  overallPiecesData?: AirPdfPieceRow[];
  carrier?: string;
  transitTime?: string;
  frequency?: string;
  routing?: string;
  validUntil?: string;
  isPendingQuote?: boolean;
  company?: string;
  logoSrc?: string;
  airFreightMinWeight?: number;
  assignedAirport?: string;
  isExpiringSoon?: boolean;
  aduanaBreakdown?: PdfAduanaBreakdownAir;
};

const C = {
  text: "#111",
  sub: "#666",
  line: "#e0e0e0",
  bg: "#f7f8fa",
  accent: "#232f3e",
  brand: "#ff6200",
  white: "#ffffff",
};

const FONT =
  '"Manrope", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function esc(s: string | number | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(num: number): string {
  if (num % 1 === 0) return num.toLocaleString("en-US");
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: num < 10 ? 4 : 2,
  });
}

function money(currency: string, n: number): string {
  return `${esc(currency)} ${fmt(n)}`;
}

function aduanaSectionHtml(b: PdfAduanaBreakdownAir): string {
  const cur = b.currency;
  const row = (label: string, value: string, bold = false, accent?: string) =>
    `<div style="display:flex;justify-content:space-between;gap:12px;font-size:7.5pt;font-weight:${bold ? 700 : 400};color:${accent ?? "#111"}">
      <span style="color:${bold ? "#111" : "#666"}">${esc(label)}</span>
      <span style="white-space:nowrap">${esc(value)}</span>
    </div>`;

  return `<div style="margin-bottom:10px">
    <div style="font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#111;margin-bottom:6px">Customs Agency &amp; Nationalization</div>
    <div style="background-color:rgba(13,110,253,0.05);border:1px solid rgba(13,110,253,0.15);border-radius:3px;padding:8px 10px;margin-bottom:6px">
      <div style="font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#475569;margin-bottom:5px">CIF Calculation (Cost, Insurance &amp; Freight)</div>
      <div style="display:flex;flex-direction:column;gap:3px">
        ${row("Product Value", money(cur, b.valorProducto))}
        ${row("Transport Cost", money(cur, b.costoTransporte))}
        ${row(b.seguroIsTheoretical ? "Insurance (theoretical)" : "Insurance (actual)", money(cur, b.seguroParaCIF))}
        <div style="border-top:1px solid rgba(13,110,253,0.2);margin-top:3px;padding-top:4px">
          ${row("CIF", money(cur, b.cif), true, "#0d6efd")}
        </div>
      </div>
    </div>
    <div style="background-color:rgba(35,47,62,0.04);border:1px solid rgba(35,47,62,0.12);border-radius:3px;padding:8px 10px">
      <div style="font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#475569;margin-bottom:5px">Charges Breakdown — Customs Agency</div>
      <div style="display:flex;flex-direction:column;gap:3px">
        ${row("Agency Fees", money(cur, b.honorarios))}
        ${row("Clearance Expenses", money(cur, b.gastosDespacho))}
        ${row("Processing", money(cur, b.tramitacion))}
        ${row("Courier", money(cur, b.mensajeria))}
        ${row(`Customs VAT (${b.ivaAduaneroPct}%)`, money(cur, b.ivaAduanero))}
        ${row(`Customs Duties (${b.derechosPct}%)`, money(cur, b.derechos))}
        <div style="border-top:1px solid rgba(35,47,62,0.15);margin-top:3px;padding-top:4px">
          ${row("Total Customs Agency", money(cur, b.total), true, "#dc3545")}
        </div>
      </div>
    </div>
  </div>`;
}

/** HTML del PDF aéreo — paridad visual con `PDFTemplateAIR` (web). */
export function buildAirQuotePdfHtml(p: BuildAirQuotePdfHtmlParams): string {
  const weightUnit = p.weightUnit || "kg";
  const volumeUnit = p.volumeUnit || "m³";
  const logoSrc =
    p.logoSrc || "https://portalclientes.seemanngroup.com/logo.png";

  const displayCharges = p.aduanaBreakdown
    ? p.charges.filter((ch) => ch.code !== "ADA")
    : p.charges;

  const label = `font-size:6.5pt;font-weight:600;color:${C.sub};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px`;
  const val = `font-size:8.5pt;font-weight:500;color:${C.text}`;
  const th = `padding:5px 8px;text-align:left;font-size:6.5pt;font-weight:700;color:${C.sub};text-transform:uppercase;letter-spacing:0.3px;border-bottom:1.5px solid ${C.text};white-space:nowrap`;
  const td = `padding:5px 8px;font-size:8.5pt;border-bottom:1px solid ${C.line};vertical-align:top`;

  const infoCells: [string, string, boolean][] = [
    ["Customer", p.customerName, true],
    ["Incoterm", p.incoterm, false],
    ["Effective", p.effectiveDate, false],
    ["Expires", p.expirationDate, false],
    ["Sales Rep", p.salesRep, false],
  ];
  if (p.routing) infoCells.push(["Routing", p.routing, false]);

  let commoditiesBody = "";
  if (p.overallMode) {
    if (p.overallPiecesData && p.overallPiecesData.length > 0) {
      commoditiesBody = p.overallPiecesData
        .map(
          (piece) => `<tr>
          <td style="${td};text-align:center;font-weight:600">1</td>
          <td style="${td}">${esc(piece.packageTypeName || p.packageTypeName)}</td>
          <td style="${td}">${esc(piece.description || p.description)}</td>
          <td style="${td};text-align:right;font-weight:600">${fmt(piece.weight)}</td>
          <td style="${td};text-align:right;font-weight:600">${fmt(piece.volume)}</td>
          <td style="${td};text-align:right;font-weight:600">${fmt(piece.chargeableWeight ?? Math.max(piece.weight, piece.volumeWeight || 0))}</td>
        </tr>`,
        )
        .join("");
    } else {
      commoditiesBody = `<tr>
        <td style="${td};text-align:center;font-weight:600">${p.pieces}</td>
        <td style="${td}">${esc(p.packageTypeName)}</td>
        <td style="${td}">${esc(p.description)}</td>
        <td style="${td};text-align:right;font-weight:600">${fmt(p.totalWeight)}</td>
        <td style="${td};text-align:right;font-weight:600">${fmt(p.totalVolume)}</td>
        <td style="${td};text-align:right;font-weight:600">${fmt(p.chargeableWeight)}</td>
      </tr>`;
    }
  } else {
    commoditiesBody = (p.piecesData || [])
      .map(
        (piece) => `<tr>
        <td style="${td};text-align:center;font-weight:600">1</td>
        <td style="${td}">${esc(piece.packageTypeName || p.packageTypeName)}</td>
        <td style="${td}">${fmt(piece.length || 0)} × ${fmt(piece.width || 0)} × ${fmt(piece.height || 0)}</td>
        <td style="${td}">${esc(piece.description || p.description)}</td>
        <td style="${td};text-align:right;font-weight:600">${fmt(piece.weight)}</td>
        <td style="${td};text-align:right;font-weight:600">${fmt(piece.volume)}</td>
        <td style="${td};text-align:right;font-weight:600">${fmt(piece.volumeWeight ?? 0)}</td>
      </tr>`,
      )
      .join("");
  }

  const chargesRows = displayCharges
    .map(
      (ch) => `<tr>
      <td style="${td};font-weight:600;font-size:8pt">${esc(ch.code)}</td>
      <td style="${td}">${esc(ch.description)}</td>
      <td style="${td};text-align:right">${fmt(ch.quantity)}</td>
      <td style="${td};text-align:center">${esc(ch.unit)}</td>
      <td style="${td};text-align:right">${fmt(ch.rate)}</td>
      <td style="${td};text-align:right;font-weight:600">${fmt(ch.amount)}</td>
    </tr>`,
    )
    .join("");

  const routeMeta = [
    p.carrier
      ? `<div style="border-left:1px solid ${C.line};padding-left:12px;min-width:0;max-width:160px;flex:1 1 auto"><div style="${label}">Carrier</div><div style="${val};word-break:break-word;overflow-wrap:anywhere;white-space:normal;line-height:1.35">${esc(p.carrier)}</div></div>`
      : "",
    p.validUntil
      ? `<div style="border-left:1px solid ${C.line};padding-left:12px;min-width:0;flex:0 1 auto"><div style="${label}">Valid Until</div><div style="${val};color:${C.accent};font-weight:700;word-break:break-word;white-space:normal">${esc(p.validUntil)}</div></div>`
      : "",
    p.transitTime
      ? `<div style="border-left:1px solid ${C.line};padding-left:12px;min-width:0;flex:0 1 auto"><div style="${label}">Transit</div><div style="${val};word-break:break-word;white-space:normal">${esc(p.transitTime === "-" ? p.transitTime : `${p.transitTime} days`)}</div></div>`
      : "",
    p.frequency
      ? `<div style="border-left:1px solid ${C.line};padding-left:12px;min-width:0;max-width:200px;flex:1 1 120px"><div style="${label}">Frequency</div><div style="${val};word-break:break-word;overflow-wrap:anywhere;white-space:normal;line-height:1.35">${esc(p.frequency)}</div></div>`
      : "",
  ].join("");

  const exwBlock =
    p.incoterm === "EXW" && (p.pickupFromAddress || p.deliveryToAddress)
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:${p.assignedAirport ? "6px" : "10px"}">
        ${
          p.pickupFromAddress
            ? `<div style="background:${C.bg};border:1px solid ${C.line};border-radius:3px;padding:7px 10px"><div style="${label}">Pickup From</div><div style="${val};font-size:8pt">${esc(p.pickupFromAddress)}</div></div>`
            : ""
        }
        ${
          p.deliveryToAddress
            ? `<div style="background:${C.bg};border:1px solid ${C.line};border-radius:3px;padding:7px 10px"><div style="${label}">Delivery To</div><div style="${val};font-size:8pt">${esc(p.deliveryToAddress)}</div></div>`
            : ""
        }
      </div>`
      : "";

  const airportBlock =
    p.incoterm === "EXW" && p.assignedAirport
      ? `<div style="display:flex;align-items:center;gap:10px;background:#f7f8fa;border:1px solid #e0e0e0;border-left:3px solid #232f3e;border-radius:3px;padding:7px 12px;margin-bottom:10px">
        <div>
          <div style="font-size:6.5pt;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px">Assigned Airport of Origin</div>
          <div style="font-size:9.5pt;font-weight:700;color:#1e3a5f;letter-spacing:-0.2px">${esc(p.assignedAirport)}</div>
        </div>
        <div style="margin-left:auto;font-size:6.5pt;color:#64748b;text-align:right">Origin airport for land transport.</div>
      </div>`
      : "";

  const chargesBlock = !p.isPendingQuote
    ? `<div style="margin-bottom:10px">
      <div style="font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${C.text};margin-bottom:4px">Charges</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${th}">Code</th>
          <th style="${th};width:40%">Description</th>
          <th style="${th};text-align:right">Qty</th>
          <th style="${th};text-align:center">Unit</th>
          <th style="${th};text-align:right">Rate (${esc(p.currency)})</th>
          <th style="${th};text-align:right">Amount (${esc(p.currency)})</th>
        </tr></thead>
        <tbody>${chargesRows}</tbody>
      </table>
      ${p.aduanaBreakdown ? aduanaSectionHtml(p.aduanaBreakdown) : ""}
      <div style="display:flex;justify-content:flex-end;align-items:baseline;gap:8px;padding:8px 8px 0;border-top:2px solid ${C.text};margin-top:2px">
        <span style="font-size:7pt;color:${C.sub};font-weight:600;text-transform:uppercase">Total</span>
        <span style="font-size:14pt;font-weight:700;letter-spacing:-0.3px">${esc(p.currency)} ${fmt(p.totalCharges)}</span>
      </div>
      <div style="text-align:right;font-size:6.5pt;color:${C.sub};margin-top:2px;padding-right:8px">* Airport Transfer: ${esc(p.currency)} 0.15/kg — Minimum ${esc(p.currency)} 50</div>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #fff; }
</style>
</head>
<body>
<div id="pdf-content" style="width:210mm;padding:12mm 14mm;box-sizing:border-box;background:${C.white};font-family:${FONT};font-size:8.5pt;color:${C.text};position:relative;line-height:1.45">

  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid ${C.text};margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px">
      <img src="${esc(logoSrc)}" alt="Seemann" style="width:48px;height:48px;object-fit:contain"/>
      <div>
        <div style="font-weight:700;font-size:10pt;letter-spacing:-0.2px">Seemann y Compañia Limitada</div>
        <div style="font-size:7pt;color:${C.sub};line-height:1.5;margin-top:1px">
          Av. Libertad 1405, Of. 1203 · Viña del Mar, Chile<br/>
          +56 2 2604 8385 · contacto@seemanngroup.com
        </div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:6.5pt;font-weight:600;color:${C.sub};text-transform:uppercase;letter-spacing:1px">Air Freight Quotation</div>
      <div style="font-size:18pt;font-weight:700;color:${C.text};letter-spacing:-0.5px;line-height:1;margin-top:2px">${esc(p.quoteNumber || "—")}</div>
    </div>
  </div>

  <div style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px 12px;background:${C.bg};border:1px solid ${C.line};border-radius:3px;padding:9px 14px;margin-bottom:10px">
    <div style="flex:1 1 110px;min-width:90px">
      <div style="${label}">Origin</div>
      <div style="font-size:11pt;font-weight:700;letter-spacing:-0.3px;word-break:break-word;overflow-wrap:anywhere;white-space:normal;line-height:1.25">${esc(p.origin)}</div>
    </div>
    <div style="color:${C.brand};font-size:16pt;font-weight:700;line-height:1;align-self:center;letter-spacing:-1px">→</div>
    <div style="flex:1 1 110px;min-width:90px">
      <div style="${label}">Destination</div>
      <div style="font-size:11pt;font-weight:700;letter-spacing:-0.3px;word-break:break-word;overflow-wrap:anywhere;white-space:normal;line-height:1.25">${esc(p.destination)}</div>
    </div>
    ${routeMeta}
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(95px,1fr));gap:0;border:1px solid ${C.line};border-radius:3px;margin-bottom:10px">
    ${infoCells
      .map(
        ([lbl, v, bold]) =>
          `<div style="padding:7px 10px;border-right:1px solid ${C.line};border-bottom:1px solid ${C.line};min-width:0">
            <div style="${label}">${esc(lbl)}</div>
            <div style="${val};font-weight:${bold ? 700 : 500};word-break:break-word;overflow-wrap:anywhere;white-space:normal;line-height:1.35">${esc(v)}</div>
          </div>`,
      )
      .join("")}
  </div>

  ${exwBlock}
  ${airportBlock}

  <div style="margin-bottom:10px">
    <div style="font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${C.text};margin-bottom:4px">Commodities</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${th};text-align:center">Pcs</th>
        <th style="${th}">Package</th>
        ${!p.overallMode ? `<th style="${th}">Dimensions (cm)</th>` : ""}
        <th style="${th}">Description</th>
        <th style="${th};text-align:right">Weight (${esc(weightUnit)})</th>
        <th style="${th};text-align:right">Volume (${esc(volumeUnit)})</th>
        <th style="${th};text-align:right">Chargeable (${esc(weightUnit)})</th>
      </tr></thead>
      <tbody>${commoditiesBody}</tbody>
    </table>
    <div style="display:flex;gap:18px;padding:5px 8px;background:${C.bg};border-radius:0 0 3px 3px;border-top:1px solid ${C.line};font-size:7.5pt">
      <span><strong>Pieces:</strong> ${p.pieces}</span>
      <span><strong>Gross Weight:</strong> ${fmt(p.totalWeight)} ${esc(weightUnit)}</span>
      <span><strong>Volume:</strong> ${fmt(p.totalVolume)} ${esc(volumeUnit)}</span>
      <span><strong>Chargeable:</strong> ${fmt(p.chargeableWeight)} ${esc(weightUnit)}</span>
    </div>
  </div>

  ${chargesBlock}

  ${
    p.ultimaMillaDeliveryAddress
      ? `<div style="background:${C.bg};border:1px solid ${C.line};border-left:3px solid ${C.accent};border-radius:3px;padding:7px 12px;margin-bottom:10px;font-size:7.5pt;color:${C.sub};line-height:1.5">
        <strong style="color:${C.text}">Última Milla</strong> — Esta cotización incluye transporte terrestre desde el aeropuerto de destino hasta la siguiente dirección de entrega:
        <span style="color:${C.text};font-weight:600">${esc(p.ultimaMillaDeliveryAddress)}</span>
      </div>`
      : ""
  }

  <div style="background:${C.bg};border:1px solid ${C.line};border-left:3px solid ${C.accent};border-radius:3px;padding:7px 12px;margin-bottom:10px;font-size:7.5pt;color:${C.sub};line-height:1.5">
    <strong style="color:${C.text}">Seguimiento en Línea</strong> — Al confirmar su cotización, recibirá acceso gratuito a nuestro sistema de seguimiento en tiempo real para monitorear el estado de su envío, ETA y actualizaciones de ubicación.
  </div>

  ${
    p.isExpiringSoon
      ? `<div style="background:#FFFBEB;border:1px solid #F59E0B;border-left:4px solid #D97706;border-radius:4px;padding:8px 12px;margin-bottom:10px;font-size:7.5pt;color:#78350F;line-height:1.5">
        <strong style="color:#D97706;display:block;margin-bottom:3px">⚠ Aviso sobre Vigencia Tarifaria</strong>
        La tarifa aplicada en la presente cotización se encuentra próxima a su fecha de vencimiento. En virtud de lo anterior, se informa que los valores indicados podrían estar sujetos a revisión y/o modificación por parte de los agentes y aerolíneas involucradas, una vez vencido el período de validez. Por ello, el precio final confirmado podría diferir del aquí señalado. Se recomienda proceder con la aceptación formal de la cotización a la brevedad posible a fin de garantizar las condiciones tarifarias actuales.
      </div>`
      : ""
  }

  ${
    p.airFreightMinWeight !== undefined && !p.isPendingQuote
      ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #b45309;border-radius:4px;padding:8px 12px;margin-bottom:12px;font-size:7.5pt;color:#78350f;line-height:1.5">
        <strong style="color:#92400e;display:block;margin-bottom:4px">ⓘ Flete Aéreo — Aviso de peso mínimo facturable</strong>
        El peso cobrable declarado (${fmt(p.chargeableWeight)} kg) no se encuentra dentro de un tramo de peso tarifado para esta ruta. De acuerdo con las condiciones tarifarias de la aerolínea, el Flete Aéreo ha sido calculado considerando el peso mínimo entregado (${p.airFreightMinWeight} kg).
      </div>`
      : ""
  }

  ${
    p.isPendingQuote
      ? `<div style="background:#fff5f5;border:2px solid #dc3545;border-radius:4px;padding:12px 16px;margin-bottom:12px;text-align:center">
        <div style="color:#dc3545;font-size:11pt;font-weight:700;line-height:1.4">
          Su ejecutivo de ventas le proporcionará una cotización formal en un plazo de 48 horas hábiles para rutas no recurrentes
        </div>
      </div>`
      : ""
  }

  <div style="margin-bottom:10px">
    <div style="font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${C.sub};margin-bottom:3px">Terms &amp; Conditions</div>
    <div style="font-size:6pt;line-height:1.55;color:${C.sub};column-count:2;column-gap:14px">
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

  <div style="border-top:1px solid ${C.line};padding-top:6px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;font-size:6.5pt;color:${C.sub}">
    <span style="flex:1;min-width:0">Seemann Cloud · portalclientes.seemanngroup.com</span>
    <span style="flex:1;min-width:0;text-align:center;word-break:break-word;overflow-wrap:anywhere;white-space:normal">${esc(p.quoteNumber || "Draft")}${p.company ? ` - ${esc(p.company)}` : ""}</span>
    <span style="flex:0 0 auto;text-align:right">Page 1 of 1</span>
  </div>
</div>
</body></html>`;
}
