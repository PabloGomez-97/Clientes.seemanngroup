import type { SelectOption } from "../Selectroute";
import { AirportSelectorAIR } from "../Selectroute";
import {
  isAirConnectSpainExwFlow,
  isAirConnectSpainFcaFlow,
  isValidSpainPostalCode,
} from "./flow";

interface AirConnectSpainStep1FieldsProps {
  routeMode: "recurrente" | "noRecurrente" | null;
  paisValue?: string;
  destValue?: string;
  incoterm: "EXW" | "FCA" | "";
  isSimulationMode: boolean;
  hasPais: boolean;
  originLabel: string;
  originSeleccionado: SelectOption | null;
  originOptions: SelectOption[];
  onOriginChange: (option: SelectOption | null) => void;
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
}

export function AirConnectSpainStep1Fields({
  routeMode,
  paisValue,
  destValue,
  incoterm,
  isSimulationMode,
  hasPais,
  originLabel,
  originSeleccionado,
  originOptions,
  onOriginChange,
  postalCode,
  onPostalCodeChange,
}: AirConnectSpainStep1FieldsProps) {
  const flowBase = {
    routeMode,
    paisValue,
    destValue,
    isSimulationMode,
  };
  const isFca = isAirConnectSpainFcaFlow({ ...flowBase, incoterm });
  const isExw = isAirConnectSpainExwFlow({ ...flowBase, incoterm });

  if (!hasPais || (!isFca && !isExw)) return null;

  if (isFca) {
    return (
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <AirportSelectorAIR
            id="air-origin-recurrente-fca-airconnect"
            label={originLabel}
            icon=""
            value={originSeleccionado}
            onChange={onOriginChange}
            options={originOptions}
            placeholder="Selecciona aeropuerto de origen"
            menuPlacement="bottom"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="row g-3 mb-4">
      <div className="col-md-6">
        <div className="qa-card border p-3 h-100">
          <label className="qa-label mb-2" htmlFor="airconnect-exw-postal">
            <i className="bi bi-mailbox me-2" />
            Código postal de recogida
            <span
              className="qf-badge ms-2"
              style={{ fontSize: "0.7rem", fontWeight: 400 }}
            >
              Obligatorio
            </span>
          </label>
          <input
            id="airconnect-exw-postal"
            type="text"
            className="qa-input"
            inputMode="numeric"
            maxLength={5}
            placeholder="Ej: 46001"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value.replace(/\D/g, ""))}
          />
          <small className="text-muted d-block mt-2">
            Ingresa el código postal español de 5 dígitos donde se recogerá la
            carga. Las tarifas se calcularán en el paso 4 según el cargamento.
          </small>
          {postalCode.length > 0 && !isValidSpainPostalCode(postalCode) && (
            <small className="text-danger d-block mt-1">
              El código postal debe tener 5 dígitos numéricos.
            </small>
          )}
        </div>
      </div>
    </div>
  );
}
