import {
  SPAIN_COUNTRY_CODE,
  SANTIAGO_IATA,
} from "../../../services/airConnectSpainQuote";

export function isAirConnectSpainBaseFlow(params: {
  routeMode: "recurrente" | "noRecurrente" | null;
  paisValue?: string;
  destValue?: string;
  isSimulationMode: boolean;
}): boolean {
  return (
    !params.isSimulationMode &&
    params.routeMode === "recurrente" &&
    params.paisValue === SPAIN_COUNTRY_CODE &&
    params.destValue === SANTIAGO_IATA
  );
}

export function isAirConnectSpainFcaFlow(params: {
  routeMode: "recurrente" | "noRecurrente" | null;
  paisValue?: string;
  destValue?: string;
  incoterm: string;
  isSimulationMode: boolean;
}): boolean {
  return isAirConnectSpainBaseFlow(params) && params.incoterm === "FCA";
}

export function isAirConnectSpainExwFlow(params: {
  routeMode: "recurrente" | "noRecurrente" | null;
  paisValue?: string;
  destValue?: string;
  incoterm: string;
  isSimulationMode: boolean;
}): boolean {
  return isAirConnectSpainBaseFlow(params) && params.incoterm === "EXW";
}

export function isAirConnectSpainFlow(params: {
  routeMode: "recurrente" | "noRecurrente" | null;
  paisValue?: string;
  destValue?: string;
  incoterm: string;
  isSimulationMode: boolean;
}): boolean {
  return (
    isAirConnectSpainFcaFlow(params) || isAirConnectSpainExwFlow(params)
  );
}

/** Código postal español: 5 dígitos */
export function isValidSpainPostalCode(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

export { AIR_CONNECT_EXW_POSTAL_ERROR } from "../../../services/airConnectSpainQuote";
