import { useState } from "react";
import {
  useGestionCotizador,
  type IFclCotizadorConfig,
  type ILclCotizadorConfig,
  type ILclDeliveryBracket,
} from "../../hooks/useGestionCotizador";

type CotizadorTab = "FCL" | "LCL" | "AÉREO" | "ÚLTIMA MILLA";

const TABS: CotizadorTab[] = ["FCL", "LCL", "AÉREO", "ÚLTIMA MILLA"];

const FCL_FIELDS: {
  key: keyof IFclCotizadorConfig;
  label: string;
  suffix: string;
  description: string;
  step?: string;
  min?: string;
}[] = [
  {
    key: "ttRate20GP",
    label: "Transporte Terrestre (TT) — Contenedor 20GP",
    suffix: "por contenedor",
    description:
      "Tarifa de última milla por cada contenedor 20GP seleccionado en la cotización FCL.",
    step: "0.01",
    min: "0.01",
  },
  {
    key: "ttRate40",
    label: "Transporte Terrestre (TT) — Contenedor 40HQ / 40NOR",
    suffix: "por contenedor",
    description:
      "Tarifa de última milla por cada contenedor 40HQ o 40NOR seleccionado en la cotización FCL.",
    step: "0.01",
    min: "0.01",
  },
  {
    key: "vespucioExtendedSurchargePct",
    label: "Recargo zona extendida (Vespucio)",
    suffix: "% adicional",
    description:
      "Porcentaje adicional sobre el TT cuando la dirección de entrega está entre el anillo de Américo Vespucio y el polígono exterior de cobertura.",
    step: "0.1",
    min: "0",
  },
];

export default function GestionCotizador() {
  const { config, loading, error, saving, updateFcl, updateLcl } =
    useGestionCotizador();
  const [activeTab, setActiveTab] = useState<CotizadorTab>("FCL");
  const [editingFcl, setEditingFcl] = useState<Partial<IFclCotizadorConfig>>({});
  const [editingLcl, setEditingLcl] = useState<{
    vespucioExtendedSurchargePct?: number;
    brackets?: ILclDeliveryBracket[];
  }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFclChange = (key: keyof IFclCotizadorConfig, value: string) => {
    const num = parseFloat(value);
    if (value === "" || isNaN(num)) {
      setEditingFcl((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setEditingFcl((prev) => ({ ...prev, [key]: num }));
  };

  const handleSaveFcl = async () => {
    if (Object.keys(editingFcl).length === 0) return;
    try {
      setSaveError(null);
      setSuccessMsg(null);
      await updateFcl(editingFcl);
      setEditingFcl({});
      setSuccessMsg("Configuración FCL actualizada correctamente");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  const handleLclBracketChange = (
    index: number,
    field: keyof ILclDeliveryBracket,
    value: string,
  ) => {
    const num = parseFloat(value);
    const base =
      editingLcl.brackets ??
      config.lcl.brackets.map((b) => ({ ...b }));
    const next = base.map((b, i) =>
      i === index
        ? {
            ...b,
            [field]:
              value === "" || isNaN(num) ? b[field] : num,
          }
        : { ...b },
    );
    setEditingLcl((prev) => ({ ...prev, brackets: next }));
  };

  const handleLclVespucioChange = (value: string) => {
    const num = parseFloat(value);
    if (value === "" || isNaN(num)) {
      setEditingLcl((prev) => {
        const next = { ...prev };
        delete next.vespucioExtendedSurchargePct;
        return next;
      });
      return;
    }
    setEditingLcl((prev) => ({
      ...prev,
      vespucioExtendedSurchargePct: num,
    }));
  };

  const handleSaveLcl = async () => {
    if (Object.keys(editingLcl).length === 0) return;
    try {
      setSaveError(null);
      setSuccessMsg(null);
      await updateLcl(editingLcl);
      setEditingLcl({});
      setSuccessMsg("Configuración LCL actualizada correctamente");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };

  const lclBracketsDisplay =
    editingLcl.brackets ?? config.lcl.brackets;
  const lclVespucioDisplay =
    editingLcl.vespucioExtendedSurchargePct ??
    config.lcl.vespucioExtendedSurchargePct;

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
      <div className="mb-4">
        <h3 className="fw-bold mb-1">
          <i className="bi bi-sliders me-2" />
          Gestión Cotizador
        </h3>
        <p className="text-muted mb-0">
          Parámetros de tarifas y recargos utilizados por los cotizadores del
          portal. Los cambios se aplican de inmediato en nuevas cotizaciones.
        </p>
      </div>

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

      <ul className="nav nav-tabs mb-4">
        {TABS.map((tab) => (
          <li className="nav-item" key={tab}>
            <button
              type="button"
              className={`nav-link ${activeTab === tab ? "active fw-semibold" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === "FCL" && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-truck me-2 text-primary" />
              FCL — Transporte Terrestre (Última Milla)
            </h5>
            <small className="text-muted">
              Código de cargo en Linbis: TT (id 134796). Aplica al servicio
              adicional en cotización FCL hacia San Antonio o Valparaíso.
            </small>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Parámetro</th>
                    <th style={{ width: "30%" }}>Valor</th>
                    <th style={{ width: "35%" }}>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {FCL_FIELDS.map(({ key, label, suffix, description, step, min }) => {
                    const currentValue = config.fcl[key];
                    const editedValue = editingFcl[key];
                    const isEdited = editedValue !== undefined;
                    const displayValue = isEdited ? editedValue : currentValue;

                    return (
                      <tr key={key}>
                        <td>
                          <span className="fw-semibold">{label}</span>
                          <br />
                          <small className="text-muted">{suffix}</small>
                        </td>
                        <td>
                          <div
                            className="input-group"
                            style={{ maxWidth: "220px" }}
                          >
                            <input
                              type="number"
                              className={`form-control ${isEdited ? "border-warning" : ""}`}
                              value={displayValue}
                              onChange={(e) => handleFclChange(key, e.target.value)}
                              step={step}
                              min={min}
                            />
                            {key === "vespucioExtendedSurchargePct" && (
                              <span className="input-group-text">%</span>
                            )}
                          </div>
                          {key === "vespucioExtendedSurchargePct" && (
                            <small className="text-muted d-block mt-1">
                              Multiplicador actual:{" "}
                              <strong>
                                {(1 + (Number(displayValue) || 0) / 100).toFixed(2)}×
                              </strong>
                            </small>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">{description}</small>
                          {isEdited && (
                            <span className="badge bg-warning text-dark ms-2">
                              Modificado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mt-3 pt-3 border-top">
              <button
                type="button"
                className="btn btn-primary"
                disabled={Object.keys(editingFcl).length === 0 || saving}
                onClick={handleSaveFcl}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save me-2" />
                    Guardar cambios FCL
                  </>
                )}
              </button>
            </div>

            {config.updatedBy && (
              <p className="text-muted small mb-0 mt-2">
                Última actualización por: <strong>{config.updatedBy}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === "LCL" && (
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-box-seam me-2 text-primary" />
              LCL — Delivery Trucking (Última Milla)
            </h5>
            <small className="text-muted">
              Código Linbis: DELV (id 134724). Bracket por mayor tramo entre peso
              real (kg) y volumen (m³). EXPENSE = INCOME ÷ 1,10 (fijo).
            </small>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Recargo zona extendida (Vespucio)
                </label>
                <div className="input-group" style={{ maxWidth: "220px" }}>
                  <input
                    type="number"
                    className={`form-control ${editingLcl.vespucioExtendedSurchargePct !== undefined ? "border-warning" : ""}`}
                    value={lclVespucioDisplay}
                    onChange={(e) => handleLclVespucioChange(e.target.value)}
                    step="0.1"
                    min="0"
                  />
                  <span className="input-group-text">%</span>
                </div>
                <small className="text-muted">
                  Multiplicador:{" "}
                  <strong>
                    {(1 + (Number(lclVespucioDisplay) || 0) / 100).toFixed(2)}×
                  </strong>
                </small>
              </div>
              <div className="col-md-6">
                <p className="text-muted small mb-0">
                  Límites máximos: {config.lcl.maxKg} kg / {config.lcl.maxM3}{" "}
                  m³ (fuera de rango no se puede agregar el servicio).
                </p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hasta (kg)</th>
                    <th>Hasta (m³)</th>
                    <th>Monto INCOME</th>
                  </tr>
                </thead>
                <tbody>
                  {lclBracketsDisplay.map((b, index) => {
                    const edited =
                      editingLcl.brackets !== undefined &&
                      JSON.stringify(editingLcl.brackets[index]) !==
                        JSON.stringify(config.lcl.brackets[index]);
                    return (
                      <tr key={index}>
                        <td className="text-muted">{index + 1}</td>
                        <td>
                          <input
                            type="number"
                            className={`form-control form-control-sm ${edited ? "border-warning" : ""}`}
                            value={b.maxKg}
                            onChange={(e) =>
                              handleLclBracketChange(index, "maxKg", e.target.value)
                            }
                            step="1"
                            min="1"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={`form-control form-control-sm ${edited ? "border-warning" : ""}`}
                            value={b.maxM3}
                            onChange={(e) =>
                              handleLclBracketChange(index, "maxM3", e.target.value)
                            }
                            step="0.1"
                            min="0.1"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={`form-control form-control-sm ${edited ? "border-warning" : ""}`}
                            value={b.amount}
                            onChange={(e) =>
                              handleLclBracketChange(index, "amount", e.target.value)
                            }
                            step="0.01"
                            min="0.01"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mt-3 pt-3 border-top">
              <button
                type="button"
                className="btn btn-primary"
                disabled={Object.keys(editingLcl).length === 0 || saving}
                onClick={handleSaveLcl}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save me-2" />
                    Guardar cambios LCL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab !== "FCL" && activeTab !== "LCL" && (
        <div
          className="card shadow-sm border-0"
          style={{ backgroundColor: "#f8f9fa" }}
        >
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-tools display-6 d-block mb-3" />
            <h5 className="fw-semibold text-secondary">{activeTab}</h5>
            <p className="mb-0">
              Configuración en desarrollo. Disponible: FCL y LCL.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
