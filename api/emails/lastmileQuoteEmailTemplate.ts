/**
 * Template HTML para notificación de cotización de Última Milla
 * generada por cliente. Minimalista, responsive, branding Seemann Group.
 */

export interface LastMileQuoteEmailData {
  ejecutivoNombre: string;
  clienteUsername: string;
  clienteNombre?: string;
  origen: string;
  destino: string;
  pickupFromAddress: string;
  deliveryToAddress: string;
  cargoDescription: string;
  peso?: string;
  alto?: string;
  ancho?: string;
  largo?: string;
  seguroActivo?: boolean;
  tipoAccion?: 'cotizacion' | 'operacion';
  quoteNumber?: string;
}

const LOGO_URL = 'https://portalclientes.seemanngroup.com/logocompleto.png';
const PORTAL_URL = 'https://portalclientes.seemanngroup.com';

const C = {
  primary: '#ff6200',
  dark: '#1a1a1a',
  text: '#333333',
  muted: '#666666',
  border: '#e0e0e0',
  bgLight: '#f8f9fa',
  white: '#ffffff',
  lastmile: '#0d9488',
};

export function getLastMileQuoteEmailSubject(
  data: LastMileQuoteEmailData,
): string {
  const tipo = data.tipoAccion === 'operacion' ? 'operación' : 'cotización';
  return `Nueva ${tipo} de Última Milla — ${data.clienteUsername}`;
}

export function buildLastMileQuoteEmailHTML(
  data: LastMileQuoteEmailData,
): string {
  const fecha = new Date().toLocaleString('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const tipo = data.tipoAccion === 'operacion' ? 'operación' : 'cotización';

  const escape = (text: string) =>
    String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');

  const row = (label: string, value: string | undefined | null) => `
    <tr>
      <td class="detail-label" style="padding:8px 12px;font-size:13px;color:${C.muted};white-space:nowrap;width:200px;border-bottom:1px solid ${C.border};">${label}</td>
      <td class="detail-value" style="padding:8px 12px;font-size:13px;font-weight:600;color:${C.text};border-bottom:1px solid ${C.border};">${value ? escape(value) : '—'}</td>
    </tr>`;

  const highlightedRow = (label: string, value: string | undefined | null) => `
    <tr>
      <td class="detail-label" style="padding:8px 12px;font-size:13px;color:${C.muted};white-space:nowrap;width:200px;border-bottom:1px solid ${C.border};">${label}</td>
      <td class="detail-value" style="padding:8px 12px;font-size:13px;font-weight:600;color:${C.primary};border-bottom:1px solid ${C.border};">${value ? escape(value) : '—'}</td>
    </tr>`;

  const dimensiones = [
    data.peso ? `Peso: ${data.peso} kg` : null,
    data.largo ? `Largo: ${data.largo} cm` : null,
    data.ancho ? `Ancho: ${data.ancho} cm` : null,
    data.alto ? `Alto: ${data.alto} cm` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const dimensionesRow = dimensiones ? row('Dimensiones', dimensiones) : '';
  const seguroRow = data.seguroActivo
    ? highlightedRow('Servicios adicionales', 'Seguro de carga solicitado')
    : '';
  const quoteNumberRow = data.quoteNumber
    ? highlightedRow('N° de cotización', data.quoteNumber)
    : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Nueva ${tipo} de Última Milla - Seemann Group</title>
  <style>
    @media only screen and (max-width: 620px) {
      .card { width: 100% !important; min-width: 0 !important; }
      .card-body { padding: 24px 16px !important; }
      .card-header { padding: 20px 16px !important; }
      .card-footer { padding: 16px !important; }
      .detail-label { display: block !important; width: 100% !important; padding-bottom: 2px !important; }
      .detail-value { display: block !important; width: 100% !important; padding-top: 0 !important; padding-bottom: 12px !important; }
      .cta-btn { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="background-color:${C.white};border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <tr>
            <td class="card-header" align="center" style="background:linear-gradient(135deg,${C.lastmile} 0%,${C.primary} 100%);padding:28px 24px;">
              <img src="${LOGO_URL}" alt="Seemann Group" width="160" style="display:block;border:0;outline:none;text-decoration:none;margin:0 auto 8px;" />
              <div style="color:${C.white};font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.95;">Nueva ${tipo} · Última Milla</div>
            </td>
          </tr>

          <tr>
            <td class="card-body" style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;color:${C.text};">
                Hola <strong>${escape(data.ejecutivoNombre)}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:${C.muted};line-height:1.6;">
                Tu cliente <strong style="color:${C.text};">${escape(data.clienteUsername)}</strong>${data.clienteNombre ? ` (${escape(data.clienteNombre)})` : ''} acaba de generar una nueva ${tipo} de <strong>Última Milla</strong> en el portal el ${fecha}.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:6px;overflow:hidden;">
                ${quoteNumberRow}
                ${row('Origen', data.origen)}
                ${row('Destino', data.destino)}
                ${row('Recogida', data.pickupFromAddress)}
                ${row('Entrega', data.deliveryToAddress)}
                ${row('Información del cargamento', data.cargoDescription)}
                ${dimensionesRow}
                ${seguroRow}
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:${C.muted};line-height:1.6;">
                Recuerda que las cotizaciones de Última Milla deben confirmarse al cliente dentro de las próximas <strong>48 horas hábiles</strong>.
              </p>

              <div style="margin-top:24px;text-align:center;">
                <a href="${PORTAL_URL}" class="cta-btn" style="display:inline-block;background-color:${C.primary};color:${C.white};text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:6px;">
                  Ir al portal
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td class="card-footer" align="center" style="background-color:${C.bgLight};padding:18px 24px;border-top:1px solid ${C.border};">
              <p style="margin:0;font-size:11px;color:${C.muted};line-height:1.5;">
                © ${new Date().getFullYear()} Seemann Group · Portal Clientes<br/>
                Este es un mensaje automático, por favor no lo respondas.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
