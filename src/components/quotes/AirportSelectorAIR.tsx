import { useCallback } from "react";
import Select, { type StylesConfig, type GroupBase } from "react-select";
import { airportCoordinates } from "../../config/airportCoordinates";
import type { SelectOption } from "./Handlers/Air/HandlerQuoteAir";

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
}

const getIata = (value: string): string | null => {
  const key = value.toLowerCase();
  return (
    airportCoordinates[key]?.iata ??
    airportCoordinates[key.replace(/\s+/g, "_")]?.iata ??
    null
  );
};

const selectStyles: StylesConfig<
  SelectOption,
  false,
  GroupBase<SelectOption>
> = {
  control: (base, state) => ({
    ...base,
    minHeight: "46px",
    borderColor: state.isFocused ? "var(--qf-primary)" : "#d0d5dd",
    borderWidth: "1.5px",
    borderRadius: "8px",
    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(255,98,0,0.12)"
      : "0 1px 2px rgba(0,0,0,0.04)",
    backgroundColor: state.isDisabled ? "#f9fafb" : "#ffffff",
    cursor: state.isDisabled ? "not-allowed" : "default",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    "&:hover": {
      borderColor: state.isDisabled
        ? "#d0d5dd"
        : state.isFocused
          ? "var(--qf-primary)"
          : "#9ca3af",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 10px",
    gap: "4px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#b0b7c3",
    fontSize: "0.88rem",
    fontStyle: "italic",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#111827",
    margin: 0,
  }),
  input: (base) => ({
    ...base,
    color: "#111827",
    fontSize: "0.9rem",
    margin: 0,
    padding: 0,
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)",
    overflow: "hidden",
    zIndex: 9999,
    marginTop: "6px",
  }),
  menuList: (base) => ({
    ...base,
    padding: "6px",
    maxHeight: "264px",
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: "6px",
    backgroundColor: state.isSelected
      ? "rgba(255,98,0,0.09)"
      : state.isFocused
        ? "#f3f4f6"
        : "transparent",
    color: state.isSelected ? "var(--qf-primary)" : "#111827",
    fontWeight: state.isSelected ? 600 : 400,
    cursor: "pointer",
    padding: "7px 10px",
    "&:active": { backgroundColor: "rgba(255,98,0,0.14)" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "var(--qf-primary)" : "#b0b7c3",
    transition: "transform 0.2s ease, color 0.15s ease",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
    padding: "0 10px 0 4px",
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "#c4c9d4",
    padding: "0 4px",
    "&:hover": { color: "#6b7280" },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "#9ca3af",
    fontSize: "0.875rem",
    padding: "10px 12px",
  }),
};

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
}: AirportSelectorAIRProps) {
  const formatOptionLabel = useCallback((option: SelectOption) => {
    const iata = getIata(option.value);
    return (
      <div className="psfcl-option">
        <span className="psfcl-name">
          <span className="psfcl-name">Aeropuerto de </span>
          {option.label}
        </span>
        {iata && <span className="psfcl-badge">{iata}</span>}
      </div>
    );
  }, []);

  const filterOption = useCallback(
    (
      option: { value: string; label: string; data: SelectOption },
      inputValue: string,
    ) => {
      if (!inputValue) return true;
      const s = inputValue.toLowerCase().trim();
      const iata = getIata(option.value);
      const fullLabel = `aeropuerto de ${option.label.toLowerCase()}`;
      return (
        fullLabel.includes(s) ||
        option.label.toLowerCase().includes(s) ||
        option.value.toLowerCase().includes(s) ||
        (iata?.toLowerCase() ?? "").includes(s)
      );
    },
    [],
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
        styles={selectStyles}
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
