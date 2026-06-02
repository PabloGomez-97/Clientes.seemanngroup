import { useCallback } from "react";
import Select from "react-select";
import { getAirportByOrigin } from "../../../config/airportCoordinates";
import type { SelectOption } from "../Handlers/Air/HandlerQuoteAir";
import { routeSelectStyles } from "./routeSelectStyles";

interface AirportSelectorAIRProps {
  id?: string;
  value: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
  options: SelectOption[];
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  label: string;
  icon?: string;
  hint?: string;
  menuPlacement?: "auto" | "top" | "bottom";
  /** Si false, muestra solo el nombre del catálogo (p. ej. destino). Por defecto true (origen). */
  showAirportPrefix?: boolean;
}

const getIata = (value: string): string | null =>
  getAirportByOrigin(value)?.iata ?? null;

function AirportSelectorAIR({
  id,
  value,
  onChange,
  options,
  placeholder = "Escribe ciudad, país o código IATA...",
  isDisabled = false,
  isClearable = true,
  label,
  icon = "bi-geo-alt",
  hint,
  menuPlacement = "auto",
  showAirportPrefix = true,
}: AirportSelectorAIRProps) {
  const formatOptionLabel = useCallback(
    (option: SelectOption) => {
      const iata = getIata(option.value);
      return (
        <div className="psfcl-option">
          <span className="psfcl-name">
            {showAirportPrefix && (
              <span className="psfcl-name">Aeropuerto de </span>
            )}
            {option.label}
          </span>
          {iata && <span className="psfcl-badge">{iata}</span>}
        </div>
      );
    },
    [showAirportPrefix],
  );

  const filterOption = useCallback(
    (
      option: { value: string; label: string; data: SelectOption },
      inputValue: string,
    ) => {
      if (!inputValue) return true;
      const s = inputValue.toLowerCase().trim();
      const iata = getIata(option.value);
      const labelLower = option.label.toLowerCase();
      const fullLabel = showAirportPrefix
        ? `aeropuerto de ${labelLower}`
        : labelLower;
      return (
        fullLabel.includes(s) ||
        labelLower.includes(s) ||
        option.value.toLowerCase().includes(s) ||
        (iata?.toLowerCase() ?? "").includes(s)
      );
    },
    [showAirportPrefix],
  );

  return (
    <div className="psfcl-wrapper">
      <label className="psfcl-label" htmlFor={id}>
        <i className={`bi ${icon} psfcl-label-icon`} aria-hidden="true" />
        {label}
      </label>
      <Select
        inputId={id}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        isClearable={isClearable}
        isDisabled={isDisabled}
        isSearchable
        menuPlacement={menuPlacement}
        formatOptionLabel={formatOptionLabel}
        filterOption={filterOption}
        styles={routeSelectStyles}
        noOptionsMessage={({ inputValue }) =>
          inputValue
            ? `Sin resultados para "${inputValue}"`
            : "No hay aeropuertos disponibles"
        }
      />
      {hint && <p className="psfcl-hint">{hint}</p>}
    </div>
  );
}

export default AirportSelectorAIR;
