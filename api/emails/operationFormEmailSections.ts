/**
 * Secciones HTML compartidas para el correo de “operación generada”:
 * datos del proveedor + lista de documentos de referencia.
 */

export interface OperacionProveedorEmail {
  nombreEmpresa: string;
  nombreContacto: string;
  email: string;
  telefono: string;
}

export interface OperacionDocumentoEmail {
  tipo: string;
  nombreArchivo: string;
}

export interface OperacionSheetCellEmail {
  label: string;
  value: string;
}

export interface OperacionSheetRowEmail {
  /** Ej: "Tarifa seleccionada · fila del sheet aéreo" */
  title: string;
  /** Hasta 3 celdas en la fila superior */
  cells: OperacionSheetCellEmail[];
  /** Línea inferior (remarks, validez, etc.) */
  footerLabel?: string;
  footerValue?: string;
}

export interface OperacionDetalleEmail {
  origen?: string;
  destino?: string;
  viaTransporte?: string;
  agente?: string;
  /** Aerolínea / Naviera / Operador */
  carrierLabel?: string;
  carrierValue?: string;
  detalleCarga?: string;
  sheetRow?: OperacionSheetRowEmail | null;
  /** Solo flete sin profit */
  freightCostLabel?: string;
  freightCostAmount?: string;
  freightCostDetail?: string;
  /** Total cotización (venta) */
  ventaTotalAmount?: string;
}

const FONT =
  "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const C = {
  primary: '#ff6200',
  card: '#ffffff',
  section: '#f8f9fa',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
};

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileExtBadge(nombreArchivo: string): string {
  const ext = String(nombreArchivo || '')
    .split('.')
    .pop()
    ?.toUpperCase();
  if (!ext || ext.length > 4) return 'DOC';
  if (ext === 'XLSX') return 'XLS';
  if (ext === 'DOCX') return 'DOC';
  return ext;
}

/**
 * Bloque “Datos del proveedor” (solo si hay proveedor).
 */
export function buildProveedorSectionHTML(
  proveedor?: OperacionProveedorEmail | null,
): string {
  if (!proveedor) return '';

  const empresa = escapeHtml(proveedor.nombreEmpresa || '—');
  const contacto = escapeHtml(proveedor.nombreContacto || '—');
  const email = escapeHtml(proveedor.email || '—');
  const telefono = escapeHtml(proveedor.telefono || '—');
  const emailHref = proveedor.email
    ? `mailto:${escapeHtml(proveedor.email)}`
    : '#';

  return `
          <!-- Datos del proveedor -->
          <tr>
            <td style="background-color:${C.section};padding:0 36px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.card};border-radius:12px;border:1px solid ${C.border};overflow:hidden;">
                <tr>
                  <td style="padding:18px 24px 14px;border-bottom:1px solid ${C.border};">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="3" style="width:3px;background-color:${C.primary};border-radius:1px;font-size:0;line-height:0;">&nbsp;</td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.text};line-height:1.2;">
                            Datos del proveedor
                          </p>
                          <p style="margin:4px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};line-height:1.4;">
                            Información ingresada por el cliente al generar la operación
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="prov-col" width="50%" valign="top" style="padding:14px 16px 14px 0;border-right:1px solid ${C.border};">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Empresa</p>
                          <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${C.text};line-height:1.35;">${empresa}</p>
                        </td>
                        <td class="prov-col" width="50%" valign="top" style="padding:14px 0 14px 16px;">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Contacto</p>
                          <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${C.text};line-height:1.35;">${contacto}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="height:1px;background-color:${C.border};font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td class="prov-col" width="50%" valign="top" style="padding:14px 16px 4px 0;border-right:1px solid ${C.border};">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Email</p>
                          <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:500;color:${C.text};line-height:1.35;">
                            <a href="${emailHref}" style="color:${C.text};text-decoration:none;">${email}</a>
                          </p>
                        </td>
                        <td class="prov-col prov-col-last" width="50%" valign="top" style="padding:14px 0 4px 16px;">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Teléfono</p>
                          <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:500;color:${C.text};line-height:1.35;">${telefono}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/**
 * Bloque “Detalle de la operación” (después del proveedor, antes de documentos).
 */
export function buildOperacionDetalleSectionHTML(
  detalle?: OperacionDetalleEmail | null,
  include = true,
): string {
  if (!include || !detalle) return '';

  const field = (label: string, value?: string) => {
    const v = String(value || '').trim() || '—';
    return { label, value: escapeHtml(v) };
  };

  const row1Left = field('Origen', detalle.origen);
  const row1Right = field('Destino', detalle.destino);
  const row2Left = field('Vía de transporte', detalle.viaTransporte);
  const row2Right = field('Agente', detalle.agente);
  const carrierLabel = detalle.carrierLabel || 'Aerolínea / Naviera';
  const row3Left = field(carrierLabel, detalle.carrierValue);
  const row3Right = field('Detalle de la carga', detalle.detalleCarga);

  const sheet = detalle.sheetRow;
  const sheetCells = (sheet?.cells || [])
    .slice(0, 3)
    .map((c, idx, arr) => {
      const isLast = idx === arr.length - 1;
      const width = arr.length === 1 ? '100%' : arr.length === 2 ? '50%' : '33%';
      const border = isLast ? '' : `border-right:1px solid ${C.border};`;
      return `
                              <td class="rate-col${isLast ? ' rate-col-last' : ''}" width="${width}" style="padding:12px;${border}">
                                <p style="margin:0 0 3px;font-family:${FONT};font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">${escapeHtml(c.label)}</p>
                                <p style="margin:0;font-family:${FONT};font-size:13px;font-weight:600;color:${C.text};line-height:1.35;">${escapeHtml(c.value || '—')}</p>
                              </td>`;
    })
    .join('');

  const sheetFooter =
    sheet && (sheet.footerLabel || sheet.footerValue)
      ? `
                            <tr>
                              <td colspan="3" style="height:1px;background-color:${C.border};font-size:0;line-height:0;">&nbsp;</td>
                            </tr>
                            <tr>
                              <td colspan="3" style="padding:12px;">
                                <p style="margin:0 0 3px;font-family:${FONT};font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">${escapeHtml(sheet.footerLabel || 'Detalle')}</p>
                                <p style="margin:0;font-family:${FONT};font-size:13px;color:${C.text};line-height:1.45;">${escapeHtml(sheet.footerValue || '—')}</p>
                              </td>
                            </tr>`
      : '';

  const sheetBlock =
    sheet && sheetCells
      ? `
                <tr>
                  <td style="padding:4px 16px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.section};border-radius:10px;border:1px solid ${C.border};">
                      <tr>
                        <td style="padding:14px 16px 10px;">
                          <p style="margin:0;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};">${escapeHtml(sheet.title)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.card};border-radius:8px;border:1px solid ${C.border};">
                            <tr>
                              ${sheetCells}
                            </tr>
                            ${sheetFooter}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`
      : '';

  const costoAmount = escapeHtml(detalle.freightCostAmount || '—');
  const costoLabel = escapeHtml(detalle.freightCostLabel || 'Flete sin profit');
  const costoDetail = detalle.freightCostDetail
    ? `<p style="margin:4px 0 0;font-family:${FONT};font-size:11px;color:#c2410c;">${escapeHtml(detalle.freightCostDetail)}</p>`
    : '';
  const ventaAmount = escapeHtml(detalle.ventaTotalAmount || '—');

  return `
          <!-- Detalle de la operación -->
          <tr>
            <td style="background-color:${C.section};padding:0 36px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.card};border-radius:12px;border:1px solid ${C.border};overflow:hidden;">
                <tr>
                  <td style="padding:18px 24px 14px;border-bottom:1px solid ${C.border};">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="3" style="width:3px;background-color:${C.primary};border-radius:1px;font-size:0;line-height:0;">&nbsp;</td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.text};line-height:1.2;">
                            Detalle de la operación
                          </p>
                          <p style="margin:4px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};line-height:1.4;">
                            Resumen de la cotización
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="op-col" width="50%" valign="top" style="padding:12px 16px 12px 0;border-right:1px solid ${C.border};">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${row1Left.label}</p>
                          <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${C.text};line-height:1.35;">${row1Left.value}</p>
                        </td>
                        <td class="op-col" width="50%" valign="top" style="padding:12px 0 12px 16px;">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${row1Right.label}</p>
                          <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${C.text};line-height:1.35;">${row1Right.value}</p>
                        </td>
                      </tr>
                      <tr><td colspan="2" style="height:1px;background-color:${C.border};font-size:0;line-height:0;">&nbsp;</td></tr>
                      <tr>
                        <td class="op-col" width="50%" valign="top" style="padding:12px 16px 12px 0;border-right:1px solid ${C.border};">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${row2Left.label}</p>
                          <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:600;color:${C.text};line-height:1.35;">${row2Left.value}</p>
                        </td>
                        <td class="op-col" width="50%" valign="top" style="padding:12px 0 12px 16px;">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${row2Right.label}</p>
                          <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:600;color:${C.text};line-height:1.35;">${row2Right.value}</p>
                        </td>
                      </tr>
                      <tr><td colspan="2" style="height:1px;background-color:${C.border};font-size:0;line-height:0;">&nbsp;</td></tr>
                      <tr>
                        <td class="op-col" width="50%" valign="top" style="padding:12px 16px 12px 0;border-right:1px solid ${C.border};">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${escapeHtml(carrierLabel)}</p>
                          <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:600;color:${C.text};line-height:1.35;">${row3Left.value}</p>
                        </td>
                        <td class="op-col op-col-last" width="50%" valign="top" style="padding:12px 0 12px 16px;">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${row3Right.label}</p>
                          <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:500;color:${C.text};line-height:1.35;">${row3Right.value}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
${sheetBlock}
                <tr>
                  <td style="padding:0 24px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid ${C.border};">
                      <tr>
                        <td width="50%" valign="top" style="padding:16px 18px;background-color:#fff7ed;border-right:1px solid #fed7aa;">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#c2410c;">Tarifa y costo total</p>
                          <p style="margin:0;font-family:${FONT};font-size:11px;color:#9a3412;line-height:1.3;">${costoLabel}</p>
                          <p style="margin:8px 0 0;font-family:${FONT};font-size:22px;font-weight:700;color:#9a3412;">${costoAmount}</p>
                          ${costoDetail}
                        </td>
                        <td width="50%" valign="top" style="padding:16px 18px;background-color:#111827;">
                          <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;">Tarifa y venta total</p>
                          <p style="margin:0;font-family:${FONT};font-size:11px;color:#6b7280;line-height:1.3;">Total cotización</p>
                          <p style="margin:8px 0 0;font-family:${FONT};font-size:22px;font-weight:700;color:${C.primary};">${ventaAmount}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/**
 * Bloque “Documentos de referencia” (solo para operaciones).
 */
export function buildDocumentosReferenciaSectionHTML(
  documentos: OperacionDocumentoEmail[] | undefined,
  include: boolean,
): string {
  if (!include) return '';

  const docs = Array.isArray(documentos) ? documentos : [];
  const countLabel =
    docs.length === 0
      ? 'Sin archivos adjuntos'
      : docs.length === 1
        ? '1 archivo adjunto a este correo'
        : `${docs.length} archivos adjuntos a este correo`;

  const rows =
    docs.length === 0
      ? `<p style="margin:16px 12px;font-family:${FONT};font-size:13px;color:${C.muted};">El cliente no adjuntó documentos de referencia.</p>`
      : docs
          .map((doc, idx) => {
            const badge = escapeHtml(fileExtBadge(doc.nombreArchivo));
            const tipo = escapeHtml(doc.tipo || 'Documento');
            const nombre = escapeHtml(doc.nombreArchivo || 'archivo');
            const mt = idx === 0 ? '6px' : '8px';
            return `
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:${mt};">
                      <tr>
                        <td style="padding:12px 12px;background:${C.section};border-radius:8px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="40" valign="middle">
                                <div style="width:36px;height:36px;border-radius:8px;background:#ffffff;border:1px solid ${C.border};text-align:center;line-height:36px;font-family:${FONT};font-size:11px;font-weight:700;color:${C.primary};">${badge}</div>
                              </td>
                              <td style="padding-left:12px;" valign="middle">
                                <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:600;color:${C.text};">${tipo}</p>
                                <p style="margin:3px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};">${nombre}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>`;
          })
          .join('');

  const badgeAdjuntos =
    docs.length > 0
      ? `<td align="right" valign="middle">
                          <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fff7ed;border:1px solid #fed7aa;font-family:${FONT};font-size:11px;font-weight:600;color:#c2410c;">
                            Adjuntos
                          </span>
                        </td>`
      : '';

  return `
          <!-- Documentos de referencia -->
          <tr>
            <td style="background-color:${C.section};padding:0 36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.card};border-radius:12px;border:1px solid ${C.border};overflow:hidden;">
                <tr>
                  <td style="padding:18px 24px 14px;border-bottom:1px solid ${C.border};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.text};line-height:1.2;">
                            Documentos de referencia
                          </p>
                          <p style="margin:4px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};line-height:1.4;">
                            ${escapeHtml(countLabel)}
                          </p>
                        </td>
                        ${badgeAdjuntos}
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 12px;">
                    ${rows}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/** Media queries extra para las columnas del proveedor / detalle en móvil. */
export const OPERATION_FORM_EMAIL_MOBILE_CSS = `
      .prov-col { display: block !important; width: 100% !important; padding: 12px 0 !important; border-right: none !important; border-bottom: 1px solid #e5e7eb !important; }
      .prov-col-last { border-bottom: none !important; }
      .op-col { display: block !important; width: 100% !important; padding: 12px 0 !important; border-right: none !important; border-bottom: 1px solid #e5e7eb !important; }
      .op-col-last { border-bottom: none !important; }
      .rate-col { display: block !important; width: 100% !important; padding: 12px !important; border-right: none !important; border-bottom: 1px solid #e5e7eb !important; }
      .rate-col-last { border-bottom: none !important; }
`;
