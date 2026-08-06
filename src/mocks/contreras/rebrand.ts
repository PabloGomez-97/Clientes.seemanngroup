/** Rebrands MundoGaming dummy payloads for Empresa Contreras SpA. */

export const CONTRERAS_USERNAME = "Empresa Contreras SpA";
export const CONTRERAS_CONTACT_NAME = "Mariana Contreras";
export const CONTRERAS_CONTACT_EMAIL = "contreraspa@seemanngroup.com";
export const CONTRERAS_TAX_ID = "76.543.210-8";

export function rebrandToContreras<T>(value: T): T {
  const json = JSON.stringify(value)
    .replaceAll("MUNDOGAMING SPA", "EMPRESA CONTRERAS SPA")
    .replaceAll("MundoGaming", CONTRERAS_USERNAME)
    .replaceAll("77.123.456-7", CONTRERAS_TAX_ID)
    .replaceAll("MG01", "EC01")
    .replaceAll("MGO-", "ECO-")
    .replaceAll("MGT-", "ECT-")
    .replaceAll("MGA", "ECA")
    .replaceAll("mundogaming", "contreras")
    .replaceAll("contacto@contreras.cl", CONTRERAS_CONTACT_EMAIL)
    .replaceAll("MG-", "EC-");

  return JSON.parse(json) as T;
}
