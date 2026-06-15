import React from "react";
import {
  getCountryRateCellValue,
  type CountryRateColumn,
  type CountryRateRow,
  type CountryRateService,
} from "../Handlers/shared/countryRatesTypes";

interface PdfTemplateCountryRatesProps {
  countryLabel: string;
  serviceSuffix: string;
  service?: CountryRateService;
  generatedDate: string;
  columns: CountryRateColumn[];
  rows: CountryRateRow[];
  logoSrc?: string;
}

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

const SERVICE_NOTES: Record<CountryRateService, string> = {
  air: "Tarifas aéreas expresadas por tramos de peso (kg). Peso facturable según relación peso/volumen (1 m³ = 167 kg).",
  fcl: "Tarifas FCL por tipo de contenedor. Free time y tiempo de tránsito son referenciales y sujetos a confirmación del carrier.",
  lcl: "Tarifas LCL expresadas por W/M (peso o volumen, el que resulte mayor). Mínimos de embarque pueden aplicar según ruta.",
};

const COMMERCIAL_TERMS =
  "Seemann y Compañía Limitada no será responsable por daños, retrasos o pérdidas económicas de cualquier tipo si el cliente decide no contratar seguro de carga. Equipo y espacio sujetos a disponibilidad al momento del booking. Las tarifas no incluyen servicios adicionales ni cargos locales en puertos de origen o destino, incluyendo pero no limitado a: inspecciones, fumigación, aranceles, impuestos, tasas portuarias, almacenaje y requisitos regulatorios de agencias locales. Toda mercancía peligrosa (DG) requiere aprobación previa. Las tarifas publicadas son referenciales, incluyen markup comercial y pueden modificarse sin previo aviso. Seemann y Compañía Limitada no será responsable por demoras o pérdidas causadas por caso fortuito o fuerza mayor. El presente tarifario no constituye un compromiso contractual hasta confirmación formal de booking.";

const DATA_PROTECTION_CLAUSE =
  "El presente documento contiene información comercial confidencial destinada exclusivamente al destinatario. Los datos personales asociados a esta comunicación son tratados por Seemann y Compañía Limitada conforme a la Ley 81 de 2019 de Panamá y el Reglamento General de Protección de Datos (RGPD), para fines de gestión logística, comercial y cumplimiento normativo. Usted puede ejercer sus derechos de acceso, rectificación, supresión y portabilidad escribiendo a contacto@seemanngroup.com. Más información en la Política de Privacidad de Seemann Group.";

function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: C.bg,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${C.accent}`,
        borderRadius: "3px",
        padding: "7px 12px",
        marginBottom: "8px",
        fontSize: "7.5pt",
        color: C.sub,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: C.text }}>{title}</strong>
      {" — "}
      {children}
    </div>
  );
}

export const PdfTemplateCountryRates: React.FC<PdfTemplateCountryRatesProps> = ({
  countryLabel,
  serviceSuffix,
  service,
  generatedDate,
  columns,
  rows,
  logoSrc = "/logo.png",
}) => {
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
    borderBottom: `2px solid ${C.text}`,
    whiteSpace: "nowrap",
    backgroundColor: C.bg,
  };

  const td: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "7pt",
    borderBottom: `1px solid ${C.line}`,
    verticalAlign: "middle",
  };

  const tdPrice: React.CSSProperties = {
    ...td,
    textAlign: "right",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  };

  const page: React.CSSProperties = {
    width: "297mm",
    padding: "10mm 12mm",
    boxSizing: "border-box",
    backgroundColor: C.white,
    fontFamily: FONT,
    fontSize: "8pt",
    color: C.text,
    lineHeight: 1.45,
  };

  const serviceNote = service ? SERVICE_NOTES[service] : null;

  return (
    <div id="pdf-content" style={page}>
      <style>{`
        .pdf-rates-table thead { display: table-header-group; }
        .pdf-rates-table tr { page-break-inside: avoid; }
        .pdf-table-section { page-break-before: auto; }
      `}</style>

      {/* ── Accent bar ── */}
      <div
        style={{
          height: "3px",
          backgroundColor: C.accent,
          marginBottom: "10px",
          borderRadius: "1px",
        }}
      />

      {/* ── Header corporativo ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingBottom: "10px",
          borderBottom: `2px solid ${C.text}`,
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src={logoSrc}
            alt="Seemann Group"
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
              Seemann y Compañía Limitada
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
            Tarifario de Rutas
          </div>
          <div
            style={{
              fontSize: "15pt",
              fontWeight: 700,
              color: C.text,
              letterSpacing: "-0.4px",
              lineHeight: 1.1,
              marginTop: "3px",
            }}
          >
            Tarifas {countryLabel} · {serviceSuffix}
          </div>
          <div style={{ fontSize: "7.5pt", color: C.sub, marginTop: "3px" }}>
            Rutas recurrentes
          </div>
        </div>
      </div>

      {/* ── Ficha resumen ── */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: "0",
          backgroundColor: C.bg,
          border: `1px solid ${C.line}`,
          borderRadius: "3px",
          padding: "9px 14px",
          marginBottom: "12px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={label}>País</div>
          <div style={{ ...val, fontWeight: 700 }}>{countryLabel}</div>
        </div>
        <div
          style={{
            borderLeft: `1px solid ${C.line}`,
            paddingLeft: "14px",
            flex: 1,
          }}
        >
          <div style={label}>Modalidad</div>
          <div style={{ ...val, fontWeight: 700 }}>{serviceSuffix}</div>
        </div>
        <div
          style={{
            borderLeft: `1px solid ${C.line}`,
            paddingLeft: "14px",
            flex: 1,
          }}
        >
          <div style={label}>Generado</div>
          <div style={val}>{generatedDate}</div>
        </div>
        <div
          style={{
            borderLeft: `1px solid ${C.line}`,
            paddingLeft: "14px",
            flex: 1,
          }}
        >
          <div style={label}>Rutas</div>
          <div style={{ ...val, fontWeight: 700 }}>{rows.length}</div>
        </div>
      </div>

      {/* ── Tabla de tarifas ── */}
      <div className="pdf-table-section">
        <table
          className="pdf-rates-table"
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
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                style={{
                  backgroundColor:
                    rowIndex % 2 === 1 ? C.bg : C.white,
                }}
              >
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
      </div>

      {/* ── Callouts informativos ── */}
      <div style={{ marginTop: "12px" }}>
        <Callout title="Condiciones de la tarifa">
          Tarifa válida únicamente para el detalle de carga indicado: carga
          general, no mercancía peligrosa (DG), apilable, de peso y medidas
          estándar. Tarifas con markup incluido. Sujetas a disponibilidad de
          espacio y equipo al momento del booking.
          {serviceNote ? ` ${serviceNote}` : ""}
        </Callout>

        <Callout title="Recomendaciones Seemann Group">
          <span style={{ display: "block", marginTop: "2px" }}>
            <strong style={{ color: C.text }}>Seguro de carga:</strong> Seemann
            Group recomienda contratar cobertura total (All Risk). Consulte con
            su ejecutivo las condiciones y valores.
          </span>
          <span style={{ display: "block", marginTop: "3px" }}>
            <strong style={{ color: C.text }}>Cargos locales:</strong> Tasas
            portuarias, terminal, inspecciones y aranceles en origen/destino no
            están incluidos salvo indicación expresa.
          </span>
          <span style={{ display: "block", marginTop: "3px" }}>
            <strong style={{ color: C.text }}>Mercancía peligrosa:</strong>{" "}
            Embarques DG requieren aprobación previa y documentación específica.
          </span>
          <span style={{ display: "block", marginTop: "3px" }}>
            <strong style={{ color: C.text }}>Seguimiento:</strong> Al confirmar
            su operación, acceda al portal de clientes para monitorear su envío
            en tiempo real.
          </span>
          <span style={{ display: "block", marginTop: "3px" }}>
            <strong style={{ color: C.text }}>Vigencia:</strong> Respete la
            fecha de validez indicada en cada ruta; las tarifas pueden
            actualizarse sin previo aviso.
          </span>
        </Callout>
      </div>

      {/* ── Condiciones comerciales ── */}
      <div style={{ marginTop: "8px", marginBottom: "8px" }}>
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
          Condiciones Comerciales
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
          {COMMERCIAL_TERMS}
        </div>
      </div>

      {/* ── Protección de datos ── */}
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
          Protección de Datos Personales
        </div>
        <div
          style={{
            fontSize: "6pt",
            lineHeight: 1.55,
            color: C.sub,
          }}
        >
          {DATA_PROTECTION_CLAUSE}
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
        <span>
          Seemann Group · seemanngroup.com · portalclientes.seemanngroup.com
        </span>
        <span>Generado: {generatedDate}</span>
      </div>
    </div>
  );
};
