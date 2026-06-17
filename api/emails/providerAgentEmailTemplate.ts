/**
 * Plantilla HTML corporativa para correos a agentes de proveedores.
 * Branding Seemann Group: #ff6200, Inter font, logo corporativo.
 */

const C = {
  primary: '#ff6200',
  dark: '#1a1a1a',
  text: '#333333',
  muted: '#666666',
  border: '#e0e0e0',
  bgLight: '#f8f9fa',
  white: '#ffffff',
};

const LOGO_URL = 'https://portalclientes.seemanngroup.com/logocompleto.png';

export interface ProviderAgentEmailParams {
  bodyHtml: string;
  agentName: string;
  responsableName: string;
  subject: string;
}

export function buildProviderAgentEmailHTML(params: ProviderAgentEmailParams): string {
  const { bodyHtml, agentName, responsableName, subject } = params;
  const fecha = new Date().toLocaleString('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(subject)}</title>
  <style>
    body{margin:0;padding:0;background-color:#f4f4f5;font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;}
    table{border-collapse:collapse;}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="700" cellpadding="0" cellspacing="0"
             style="max-width:700px;background-color:${C.white};border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.1);">

        <tr>
          <td style="background-color:${C.primary};padding:18px 28px;">
            <img src="${LOGO_URL}" alt="Seemann Group" height="34" style="height:34px;width:auto;display:block;"/>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 28px 12px;border-bottom:1px solid ${C.border};">
            <h1 style="margin:0 0 6px;font-size:17px;font-weight:700;color:${C.dark};">${escapeHtml(subject)}</h1>
            <p style="margin:0;font-size:13px;color:${C.muted};">
              Estimado/a <strong>${escapeHtml(agentName)}</strong> — contacto: ${escapeHtml(responsableName)}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 28px;font-size:14px;line-height:1.6;color:${C.text};">
            ${bodyHtml}
          </td>
        </tr>

        <tr>
          <td style="background-color:${C.bgLight};padding:12px 28px;border-top:1px solid ${C.border};">
            <p style="margin:0;font-size:11px;color:${C.muted};">
              Enviado el ${fecha} · Seemann Group · Equipo de Pricing
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
