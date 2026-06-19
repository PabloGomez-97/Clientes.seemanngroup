export const TIPOS_DOCUMENTO_COTIZACION = [
  'Orden de compra',
  'Invoice',
  'Packing List',
  'Certificado de Origen',
  'Póliza de seguro',
  'Guía de Despacho',
  'Declaración de Ingreso',
] as const;

export const TIPOS_DOCUMENTO_OPERACIONAL_AEREO = [
  'Documento de transporte Internacional (AWB)',
  'Facturas asociados al servicio',
  'Invoice',
  'Packing List',
  'Certificado de Origen',
  'Póliza de Seguro',
  'Declaración de ingreso (DNI)',
  'Guía de despacho',
  'SDA',
  'Papeleta',
  'Transporte local',
  'Otros Documentos',
] as const;

export const TIPOS_DOCUMENTO_OPERACIONAL_MARITIMO = [
  'Bill of Lading (BL)',
  'Facturas asociadas al servicio',
  'Endoso',
  'Invoice',
  'Packing List',
  'Certificado de Origen',
  'Póliza de Seguro',
  'Declaración de ingreso (DIN)',
  'Guía de despacho / Delivery Order',
  'SDA',
  'Papeleta',
  'Transporte local',
  'Warehouse Receipt',
  "Mate's Receipt / Received for shipment",
  'Otros Documentos',
] as const;

export type QuoteDocumentScope = 'cotizacion' | 'operacional';
export type QuoteOperacionalModo = 'aereo' | 'maritimo';
export type QuoteR2Subfolder = 'cotizacion' | 'aereo' | 'maritimo';

export function isCotizacionScope(scope?: string | null): boolean {
  return !scope || scope === 'cotizacion';
}
