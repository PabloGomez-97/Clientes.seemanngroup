/**
 * Template HTML para notificación de cotización u operación marítima FCL.
 * Tarjeta clara compacta — branding Seemann Group.
 */

export interface FclQuoteEmailData {
  ejecutivoNombre: string;
  clienteUsername: string;
  clienteNombre?: string;
  pol: string;
  pod: string;
  carrier: string;
  containerType?: string;
  cantidadContenedores?: number | string;
  incoterm?: string;
  currency: string;
  total: string;
  tipoAccion?: 'cotizacion' | 'operacion';
  pickupFromAddress?: string;
  deliveryToAddress?: string;
  ultimaMilla?: boolean;
  ultimaMillaDireccion?: string;
  ultimaMillaMonto?: string;
  ultimaMillaZonaExtendida?: boolean;
  agente?: string;
  quoteNumber?: string;
  proveedor?: {
    nombreEmpresa: string;
    nombreContacto: string;
    email: string;
    telefono: string;
  };
}

const LOGO_URL = 'https://portalclientes.seemanngroup.com/logocompleto.png';

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const C = {
  primary: '#ff6200',
  card: '#ffffff',
  section: '#f8f9fa',
  border: '#e5e7eb',
  canvas: '#eceff3',
  text: '#111827',
  muted: '#6b7280',
  labelLight: '#4b5563',
};

function isOperacion(data: FclQuoteEmailData): boolean {
  return data.tipoAccion === 'operacion';
}

function tipoTitulo(data: FclQuoteEmailData): string {
  return isOperacion(data) ? 'Nueva operación marítima FCL' : 'Nueva cotización marítima FCL';
}

function badgeLine1(data: FclQuoteEmailData): string {
  return isOperacion(data) ? 'Operación' : 'Cotización';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatClienteLine(data: FclQuoteEmailData): string {
  if (data.clienteNombre && data.clienteNombre !== data.clienteUsername) {
    return `${escapeHtml(data.clienteUsername)} · ${escapeHtml(data.clienteNombre)}`;
  }
  return escapeHtml(data.clienteUsername);
}

function formatTotal(data: FclQuoteEmailData): string {
  const total = String(data.total || '').trim();
  if (total) return escapeHtml(total);
  return data.currency ? escapeHtml(`${data.currency} —`) : '—';
}

export function getFclQuoteEmailSubject(data: FclQuoteEmailData): string {
  const tipo = isOperacion(data) ? 'operación' : 'cotización';
  return `Nueva ${tipo} Marítima FCL — ${data.clienteUsername}`;
}

export function buildFclQuoteEmailHTML(data: FclQuoteEmailData): string {
  const fecha = new Date().toLocaleString('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const titulo = tipoTitulo(data);
  const badgeLine1Text = badgeLine1(data);
  const clienteLine = formatClienteLine(data);
  const quoteNumber = data.quoteNumber ? escapeHtml(data.quoteNumber) : '—';
  const totalDisplay = formatTotal(data);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(titulo)} — Seemann Group</title>
  <style>
    @media only screen and (max-width: 720px) {
      .shell-pad { padding: 16px 8px !important; }
      .header-pad { padding: 24px 20px !important; }
      .header-logo-col { display: block !important; width: 100% !important; text-align: left !important; padding-bottom: 14px !important; }
      .header-badge-col { display: block !important; width: 100% !important; text-align: left !important; }
      .header-title-row { padding-top: 16px !important; }
      .title-main { font-size: 22px !important; }
      .route-pad { padding: 0 20px 24px !important; }
      .route-col { display: block !important; width: 100% !important; text-align: center !important; padding: 8px 0 !important; }
      .route-arrow { display: block !important; width: 100% !important; text-align: center !important; padding: 4px 0 !important; }
      .summary-col { display: block !important; width: 100% !important; text-align: left !important; padding: 10px 0 !important; border-left: none !important; border-right: none !important; border-top: 1px solid ${C.border} !important; }
      .summary-col-first { border-top: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.canvas};font-family:${FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <table role="presentation" class="shell-pad" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.canvas};font-family:${FONT};">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;min-width:300px;width:100%;background-color:${C.card};border-radius:14px;overflow:hidden;border:1px solid ${C.border};box-shadow:0 8px 32px rgba(17,24,39,0.08);">

          <!-- Header -->
          <tr>
            <td class="header-pad" style="background-color:${C.card};padding:28px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header-logo-col" valign="middle">
                    <img src="${LOGO_URL}" alt="Seemann Group" width="140" style="display:block;max-width:140px;height:auto;" />
                  </td>
                  <td class="header-badge-col" align="right" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="3" style="width:3px;background-color:${C.primary};border-radius:1px;font-size:0;line-height:0;">&nbsp;</td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-family:${FONT};font-size:9px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;line-height:1.3;">${escapeHtml(badgeLine1Text)}</p>
                          <p style="margin:3px 0 0;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.primary};line-height:1.2;">FCL</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="header-title-row" colspan="2" style="padding-top:22px;">
                    <p class="title-main" style="margin:0 0 6px;font-family:${FONT};font-size:26px;font-weight:600;color:${C.text};line-height:1.2;letter-spacing:-0.02em;">
                      ${escapeHtml(titulo)}
                    </p>
                    <p style="margin:0;font-family:${FONT};font-size:14px;color:${C.muted};line-height:1.5;">
                      Cliente <span style="color:${C.text};font-weight:600;">${clienteLine}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ruta + resumen -->
          <tr>
            <td class="route-pad" style="background-color:${C.section};padding:0 36px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.card};border-radius:12px;border:1px solid ${C.border};">
                <tr>
                  <td class="route-col" width="42%" align="left" style="padding:22px 20px 22px 24px;">
                    <p style="margin:0 0 6px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};">POL</p>
                    <p style="margin:0;font-family:${FONT};font-size:17px;font-weight:600;color:${C.text};line-height:1.3;">${escapeHtml(data.pol || '—')}</p>
                  </td>
                  <td class="route-arrow" width="16%" align="center" style="padding:22px 8px;">
                    <span style="display:inline-block;font-family:Arial,sans-serif;font-size:20px;font-weight:600;color:${C.primary};line-height:1;">&rarr;</span>
                  </td>
                  <td class="route-col" width="42%" align="right" style="padding:22px 24px 22px 20px;">
                    <p style="margin:0 0 6px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};">POD</p>
                    <p style="margin:0;font-family:${FONT};font-size:17px;font-weight:600;color:${C.text};line-height:1.3;">${escapeHtml(data.pod || '—')}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td class="summary-col summary-col-first" width="33%" style="padding:14px 16px 14px 0;border-right:1px solid ${C.border};">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">N° de cotización</p>
                    <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:700;color:${C.text};letter-spacing:0.03em;">${quoteNumber}</p>
                  </td>
                  <td class="summary-col" width="34%" style="padding:14px 16px;border-right:1px solid ${C.border};">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Total</p>
                    <p style="margin:0;font-family:${FONT};font-size:20px;font-weight:700;color:${C.primary};letter-spacing:-0.01em;">${totalDisplay}</p>
                  </td>
                  <td class="summary-col" width="33%" style="padding:14px 0 14px 16px;">
                    <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Generado</p>
                    <p style="margin:0;font-family:${FONT};font-size:13px;font-weight:500;color:${C.labelLight};line-height:1.4;">${escapeHtml(fecha)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`.trim();
}
