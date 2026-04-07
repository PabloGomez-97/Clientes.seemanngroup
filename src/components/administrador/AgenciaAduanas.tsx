import { useState } from "react";
import { useAgenciaAduanas } from "../../hooks/useAgenciaAduanas";
import type { IExchangeRates, IChargeValues } from "../../types/agenciaAduana";

// ============================================================================
// Administración de Agencia de Aduanas y Nacionalización
// Permite al administrador modificar tasas de cambio y valores de cobros
// ============================================================================

const EXCHANGE_RATE_LABELS: {
  key: keyof IExchangeRates;
  label: string;
  symbol: string;
}[] = [
  { key: "ufToCLP", label: "1 UF", symbol: "CLP" },
  { key: "usdToCLP", label: "1 USD", symbol: "CLP" },
  { key: "eurToCLP", label: "1 EUR", symbol: "CLP" },
  { key: "gbpToCLP", label: "1 GBP", symbol: "CLP" },
  { key: "cadToCLP", label: "1 CAD", symbol: "CLP" },
  { key: "chfToCLP", label: "1 CHF", symbol: "CLP" },
  { key: "sekToCLP", label: "1 SEK", symbol: "CLP" },
];

const CHARGE_LABELS: {
  key: keyof IChargeValues;
  label: string;
  suffix: string;
  description: string;
}[] = [
  {
    key: "honorariosPct",
    label: "Honorarios",
    suffix: "% del CIF",
    description: "Porcentaje aplicado sobre el valor CIF",
  },
  {
    key: "honorariosMinUF",
    label: "Honorarios Mínimos",
    suffix: "UF",
    description: "Monto mínimo de honorarios en UF",
  },
  {
    key: "gastosDespachoUF",
    label: "Gastos Despachos",
    suffix: "UF",
    description: "Gastos de despacho aduanero",
  },
  {
    key: "tramitacionUF",
    label: "Tramitación CDA SAG/Seremi/ISP",
    suffix: "UF",
    description: "Cargos por tramitación de documentos",
  },
  {
    key: "mensajeriaUF",
    label: "Mensajería",
    suffix: "UF",
    description: "Gastos de mensajería",
  },
  {
    key: "ivaAduaneroPct",
    label: "IVA Aduanero",
    suffix: "% del CIF",
    description: "Impuesto al valor agregado aduanero",
  },
  {
    key: "derechosPct",
    label: "Derechos",
    suffix: "% del CIF",
    description: "Derechos de importación",
  },
];

export default function AgenciaAduanas() {
  const { config, loading, error, saving, updateConfig } = useAgenciaAduanas();

  // Local state for editing
  const [editingRates, setEditingRates] = useState<Partial<IExchangeRates>>({});
  const [editingCharges, setEditingCharges] = useState<Partial<IChargeValues>>(
    {},
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleRateChange = (key: keyof IExchangeRates, value: string) => {
    const num = parseFloat(value);
    if (value === "" || isNaN(num)) {
      setEditingRates((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setEditingRates((prev) => ({ ...prev, [key]: num }));
  };

  const handleChargeChange = (key: keyof IChargeValues, value: string) => {
    const num = parseFloat(value);
    if (value === "" || isNaN(num)) {
      setEditingCharges((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setEditingCharges((prev) => ({ ...prev, [key]: num }));
  };

  const handleSaveRates = async () => {
    if (Object.keys(editingRates).length === 0) return;
    try {
      setSaveError(null);
      setSuccessMsg(null);
      await updateConfig({ exchangeRates: editingRates });
      setEditingRates({});
      setSuccessMsg("Tasas de cambio actualizadas correctamente");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  const handleSaveCharges = async () => {
    if (Object.keys(editingCharges).length === 0) return;
    try {
      setSaveError(null);
      setSuccessMsg(null);
      await updateConfig({ charges: editingCharges });
      setEditingCharges({});
      setSuccessMsg("Valores de cobros actualizados correctamente");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  // Calcular valores UF en cada moneda para referencia
  const ufInCurrencies = config.exchangeRates
    ? {
        USD: (
          config.exchangeRates.ufToCLP / config.exchangeRates.usdToCLP
        ).toFixed(2),
        EUR: (
          config.exchangeRates.ufToCLP / config.exchangeRates.eurToCLP
        ).toFixed(2),
        GBP: (
          config.exchangeRates.ufToCLP / config.exchangeRates.gbpToCLP
        ).toFixed(2),
        CAD: (
          config.exchangeRates.ufToCLP / config.exchangeRates.cadToCLP
        ).toFixed(2),
        CHF: (
          config.exchangeRates.ufToCLP / config.exchangeRates.chfToCLP
        ).toFixed(2),
        SEK: (
          config.exchangeRates.ufToCLP / config.exchangeRates.sekToCLP
        ).toFixed(2),
      }
    : null;

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1100px" }}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="fw-bold mb-1">
          <i className="bi bi-building me-2" />
          Agencia de Aduanas y Nacionalización
        </h3>
        <p className="text-muted mb-0">
          Configuración de tasas de cambio y valores de cobros para el servicio
          de agencia de aduanas.
        </p>
      </div>

      {/* Success / Error messages */}
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-check-circle-fill" />
          {successMsg}
        </div>
      )}
      {(error || saveError) && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-exclamation-triangle-fill" />
          {error || saveError}
        </div>
      )}

      {/* Tasas de Cambio */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-bold">
            <i className="bi bi-currency-exchange me-2 text-primary" />
            Tasas de Cambio
          </h5>
          <small className="text-muted">
            Todas las conversiones se basan en CLP como moneda base
          </small>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Moneda</th>
                  <th style={{ width: "30%" }}>Valor en CLP</th>
                  <th style={{ width: "20%" }}>Equivalencia UF</th>
                  <th style={{ width: "20%" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {EXCHANGE_RATE_LABELS.map(({ key, label }) => {
                  const currentValue = config.exchangeRates[key];
                  const editedValue = editingRates[key];
                  const isEdited = editedValue !== undefined;
                  const ufEquiv =
                    key === "ufToCLP"
                      ? "—"
                      : `1 UF = ${(config.exchangeRates.ufToCLP / (isEdited ? editedValue! : currentValue)).toFixed(2)} ${label.replace("1 ", "")}`;

                  return (
                    <tr key={key}>
                      <td>
                        <span className="fw-semibold">{label}</span>
                      </td>
                      <td>
                        <div
                          className="input-group"
                          style={{ maxWidth: "220px" }}
                        >
                          <span
                            className="input-group-text"
                            style={{ fontSize: "0.85rem" }}
                          >
                            $
                          </span>
                          <input
                            type="number"
                            className={`form-control ${isEdited ? "border-warning" : ""}`}
                            value={isEdited ? editedValue : currentValue}
                            onChange={(e) =>
                              handleRateChange(key, e.target.value)
                            }
                            step="0.01"
                            min="0.01"
                          />
                          <span
                            className="input-group-text"
                            style={{ fontSize: "0.85rem" }}
                          >
                            CLP
                          </span>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">{ufEquiv}</small>
                      </td>
                      <td>
                        {isEdited ? (
                          <span className="badge bg-warning text-dark">
                            Modificado
                          </span>
                        ) : (
                          <span className="badge bg-success">Actual</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* UF equivalencies reference */}
          {ufInCurrencies && (
            <div
              className="mt-3 p-3 rounded"
              style={{
                backgroundColor: "#f8f9fa",
                border: "1px solid #e9ecef",
              }}
            >
              <small className="fw-bold d-block mb-2">
                <i className="bi bi-info-circle me-1" />
                Equivalencias UF calculadas:
              </small>
              <div className="d-flex flex-wrap gap-3">
                {Object.entries(ufInCurrencies).map(([currency, value]) => (
                  <small key={currency} className="text-muted">
                    1 UF ={" "}
                    <strong>
                      {value} {currency}
                    </strong>
                  </small>
                ))}
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end mt-3">
            {Object.keys(editingRates).length > 0 && (
              <button
                className="btn btn-outline-secondary me-2"
                onClick={() => setEditingRates({})}
                disabled={saving}
              >
                Cancelar
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSaveRates}
              disabled={Object.keys(editingRates).length === 0 || saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-2" />
                  Guardar Tasas de Cambio
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Valores de Cobros */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-bold">
            <i className="bi bi-receipt me-2 text-primary" />
            Valores de Cobros
          </h5>
          <small className="text-muted">
            Porcentajes y montos fijos en UF para el cálculo de agencia de
            aduanas
          </small>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {CHARGE_LABELS.map(({ key, label, suffix, description }) => {
              const currentValue = config.charges[key];
              const editedValue = editingCharges[key];
              const isEdited = editedValue !== undefined;

              return (
                <div key={key} className="col-md-6">
                  <div
                    className={`p-3 rounded border ${isEdited ? "border-warning" : ""}`}
                  >
                    <label className="form-label fw-semibold mb-1">
                      {label}
                    </label>
                    <small className="text-muted d-block mb-2">
                      {description}
                    </small>
                    <div className="input-group">
                      <input
                        type="number"
                        className={`form-control ${isEdited ? "border-warning" : ""}`}
                        value={isEdited ? editedValue : currentValue}
                        onChange={(e) =>
                          handleChargeChange(key, e.target.value)
                        }
                        step={suffix.includes("%") ? "0.01" : "0.05"}
                        min="0"
                      />
                      <span
                        className="input-group-text"
                        style={{ fontSize: "0.85rem", minWidth: "80px" }}
                      >
                        {suffix}
                      </span>
                    </div>
                    {isEdited && (
                      <small className="text-warning mt-1 d-block">
                        Anterior: {currentValue} {suffix}
                      </small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="d-flex justify-content-end mt-3">
            {Object.keys(editingCharges).length > 0 && (
              <button
                className="btn btn-outline-secondary me-2"
                onClick={() => setEditingCharges({})}
                disabled={saving}
              >
                Cancelar
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSaveCharges}
              disabled={Object.keys(editingCharges).length === 0 || saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-2" />
                  Guardar Valores de Cobros
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info sobre última actualización */}
      <div className="text-muted small text-end">
        <i className="bi bi-clock me-1" />
        Última modificación por: {config.updatedBy || "sistema"}
      </div>
    </div>
  );
}
