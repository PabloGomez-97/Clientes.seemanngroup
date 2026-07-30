/**
 * Branding compartido para plantillas de correo.
 * Solo URL pública — no adjuntar el logo (CID aparece como archivo y suele fallar el render).
 *
 * logo.png ya está en producción y es seguro para clientes de correo.
 * logocompleto-email.png (~560px) está en /public para usar tras el deploy:
 *   'https://portalclientes.seemanngroup.com/logocompleto-email.png'
 */
export const EMAIL_LOGO_URL =
  'https://portalclientes.seemanngroup.com/logo.png';
