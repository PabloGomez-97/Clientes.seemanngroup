import React from "react";
import { type PieceData } from "./HandlerQuoteLCL";

interface PieceAccordionLCLProps {
  piece: PieceData;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (field: keyof PieceData, value: any) => void;
  packageTypes: Array<{ id: string; name: string }>;
  canRemove: boolean;
}

export const PieceAccordionLCL: React.FC<PieceAccordionLCLProps> = ({
  piece,
  index,
  isOpen,
  onToggle,
  onRemove,
  onUpdate,
  packageTypes,
  canRemove,
}) => {
  // Calcular volumen (L x W x H) en m³
  const calculateVolume = (
    length: number,
    width: number,
    height: number,
  ): number => {
    if (!length || !width || !height) return 0;
    return (length * width * height) / 1000000; // cm³ a m³
  };

  // Calcular peso en toneladas
  const calculateWeightTons = (weightKg: number): number => {
    return weightKg / 1000;
  };

  // Calcular W/M chargeable (mayor entre toneladas y volumen)
  const calculateWMChargeable = (
    weightTons: number,
    volume: number,
  ): number => {
    return Math.max(weightTons, volume);
  };

  // Handler para actualizar dimensiones y recalcular
  const handleDimensionChange = (
    field: "length" | "width" | "height",
    value: number,
  ) => {
    onUpdate(field, value);

    // Recalcular volumen
    const newLength = field === "length" ? value : piece.length;
    const newWidth = field === "width" ? value : piece.width;
    const newHeight = field === "height" ? value : piece.height;

    const newVolume = calculateVolume(newLength, newWidth, newHeight);
    const weightTons = calculateWeightTons(piece.weight);
    const newWMChargeable = calculateWMChargeable(weightTons, newVolume);

    onUpdate("volume", newVolume);
    onUpdate("wmChargeable", newWMChargeable);
  };

  // Handler para actualizar peso
  const handleWeightChange = (value: number) => {
    onUpdate("weight", value);

    const weightTons = calculateWeightTons(value);
    onUpdate("weightTons", weightTons);

    const newWMChargeable = calculateWMChargeable(weightTons, piece.volume);
    onUpdate("wmChargeable", newWMChargeable);
  };

  return (
    <div className="card mb-3">
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{ cursor: "pointer" }}
      >
        <div onClick={onToggle} className="flex-grow-1">
          <strong>Pieza {index + 1}</strong>
          {piece.weight > 0 && (
            <span className="ms-3 text-muted">
              ({piece.weight} kg | {piece.length}x{piece.width}x{piece.height}{" "}
              cm)
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-link text-decoration-none"
            onClick={onToggle}
          >
            <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`}></i>
          </button>
          {canRemove && (
            <button
              type="button"
              className="btn btn-sm btn-link text-danger position-absolute"
              style={{ top: 8, right: 45, zIndex: 2 }}
              title="Eliminar pieza"
              onClick={onRemove}
            >
              <i className="bi bi-trash" style={{ fontSize: "1.1rem" }}></i>
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="card-body">
          <div className="row g-3">
            {/* Package Type */}
            <div className="col-md-6">
              <label className="form-label">Tipo de Paquete</label>
              <select
                className="form-select"
                value={piece.packageType}
                onChange={(e) => onUpdate("packageType", e.target.value)}
              >
                <option value="">Seleccionar tipo</option>
                {packageTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="col-md-6">
              <label className="form-label">Descripción</label>
              <input
                type="text"
                className="form-control"
                value={piece.description}
                onChange={(e) => onUpdate("description", e.target.value)}
                placeholder="Descripción de la pieza"
              />
            </div>

            {/* Dimensiones */}
            <div className="col-md-3">
              <label className="form-label">Largo (cm)</label>
              <input
                type="number"
                className="form-control"
                value={piece.length || ""}
                onChange={(e) =>
                  handleDimensionChange("length", Number(e.target.value))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Ancho (cm)</label>
              <input
                type="number"
                className="form-control"
                value={piece.width || ""}
                onChange={(e) =>
                  handleDimensionChange("width", Number(e.target.value))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Alto (cm)</label>
              <input
                type="number"
                className="form-control"
                value={piece.height || ""}
                onChange={(e) =>
                  handleDimensionChange("height", Number(e.target.value))
                }
                min="0"
                step="0.01"
                disabled={piece.isNotApilable}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Peso (kg)</label>
              <input
                type="number"
                className="form-control"
                value={piece.weight || ""}
                onChange={(e) => handleWeightChange(Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>

            {/* Checkbox No Apilable */}
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`notApilable-${piece.id}`}
                  checked={piece.isNotApilable}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    onUpdate("isNotApilable", isChecked);
                    if (isChecked) {
                      // Setear height a 250 y recalcular
                      onUpdate("height", 250);
                      const newVolume = calculateVolume(
                        piece.length,
                        piece.width,
                        250,
                      );
                      const weightTons = calculateWeightTons(piece.weight);
                      const newWMChargeable = calculateWMChargeable(
                        weightTons,
                        newVolume,
                      );
                      onUpdate("volume", newVolume);
                      onUpdate("wmChargeable", newWMChargeable);
                    }
                  }}
                />
                <label
                  className="form-check-label"
                  htmlFor={`notApilable-${piece.id}`}
                >
                  No apilable
                  <i
                    className="bi bi-info-circle text-danger ms-1"
                    title="Tu carga no tendrá nada encima"
                    style={{ cursor: "help" }}
                  ></i>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
