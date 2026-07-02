import React from "react";
import Select from "react-select";
import "./EjecutivoClienteSelector.css";

export interface EjecutivoCliente {
  email: string;
  username: string;
}

interface EjecutivoClienteSelectorProps<
  T extends EjecutivoCliente = EjecutivoCliente,
> {
  clientes: T[];
  clienteSeleccionado: T | null;
  onClienteChange: (cliente: T) => void;
  loading: boolean;
  error: string | null;
  className?: string;
}

const buildSelectStyles = (requiereCliente: boolean) => ({
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: 48,
    borderColor: state.isFocused
      ? "#0d6efd"
      : requiereCliente
        ? "#e35d6a"
        : "#dee2e6",
    borderWidth: requiereCliente && !state.isFocused ? 2 : 1,
    boxShadow: state.isFocused
      ? "0 0 0 0.25rem rgba(13, 110, 253, 0.25)"
      : requiereCliente
        ? "0 0 0 0.15rem rgba(220, 53, 69, 0.12)"
        : "none",
    "&:hover": {
      borderColor: state.isFocused ? "#0d6efd" : requiereCliente ? "#dc3545" : "#0d6efd",
    },
  }),
  valueContainer: (base: Record<string, unknown>) => ({
    ...base,
    padding: "4px 12px",
  }),
  option: (
    base: Record<string, unknown>,
    state: { isSelected: boolean; isFocused: boolean },
  ) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#0d6efd"
      : state.isFocused
        ? "#e7f1ff"
        : "white",
    color: state.isSelected ? "white" : "#212529",
  }),
});

export default function EjecutivoClienteSelector<
  T extends EjecutivoCliente = EjecutivoCliente,
>({
  clientes,
  clienteSeleccionado,
  onClienteChange,
  loading,
  error,
  className = "",
}: EjecutivoClienteSelectorProps<T>) {
  const requiereCliente = !clienteSeleccionado;

  return (
    <div
      className={`card shadow-sm mb-4 quote-cliente-card${requiereCliente ? " quote-cliente-card--required" : ""} ${className}`.trim()}
    >
      <div className="card-body">
        {loading ? (
          <div className="text-center py-3">
            <div
              className="spinner-border spinner-border-sm text-primary"
              role="status"
            >
              <span className="visually-hidden">Cargando clientes...</span>
            </div>
            <span className="ms-2 text-muted">Cargando clientes asignados...</span>
          </div>
        ) : error ? (
          <div className="alert alert-danger mb-0">
            <strong>Error:</strong> {error}
          </div>
        ) : clientes.length === 0 ? (
          <div className="alert alert-warning mb-0">
            <strong>Sin clientes asignados</strong>
            <p className="mb-0 mt-2 small">
              No tienes clientes asignados. Contacta al administrador.
            </p>
          </div>
        ) : (
          <div className="quote-cliente-selector">
            <label className="form-label fw-semibold mb-2">
              Cliente para esta cotización
            </label>
            <Select
              value={
                clienteSeleccionado
                  ? {
                      value: clienteSeleccionado.username,
                      label: `${clienteSeleccionado.username} (${clienteSeleccionado.email})`,
                    }
                  : null
              }
              onChange={(option) => {
                if (!option?.value) return;
                const cliente = clientes.find((c) => c.username === option.value);
                if (cliente) onClienteChange(cliente);
              }}
              options={clientes.map((c) => ({
                value: c.username,
                label: `${c.username} (${c.email})`,
              }))}
              placeholder="Selecciona un cliente..."
              isClearable={false}
              styles={buildSelectStyles(requiereCliente)}
            />
            {requiereCliente ? (
              <div
                className="quote-cliente-selector__required mb-0"
                role="status"
                aria-live="polite"
              >
                <i
                  className="bi bi-person-exclamation"
                  aria-hidden="true"
                />
                <div>
                  <strong>Primero selecciona un cliente</strong>
                  <span className="quote-cliente-selector__required-hint">
                    Debes asignar un cliente antes de avanzar en la cotización.
                  </span>
                </div>
              </div>
            ) : (
              <p className="quote-cliente-selector__warning mb-0">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                Favor verificar que el cliente asignado sea el correcto
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
