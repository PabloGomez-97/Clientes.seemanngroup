import React from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { type PieceData } from "./HandlerQuoteAir";
import { useTranslation } from "react-i18next";

interface PieceAccordionProps {
  piece: PieceData;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (field: keyof PieceData, value: any) => void;
  packageTypes: Array<{ id: string; name: string }>;
  canRemove: boolean;
}

export const PieceAccordion: React.FC<PieceAccordionProps> = ({
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
  const { t } = useTranslation();

  // Calcular peso volumétrico (volumen * 167 para aéreo)
  const calculateVolumeWeight = (volume: number): number => {
    return volume * 167;
  };

  // Handler para actualizar dimensiones y recalcular
  const handleDimensionChange = (
    field: "length" | "width" | "height",
    value: number,
  ) => {
    onUpdate(field, value);

    // Recalcular volumen y peso volumétrico
    const newLength = field === "length" ? value : piece.length;
    const newWidth = field === "width" ? value : piece.width;
    const newHeight = field === "height" ? value : piece.height;

    const newVolume = calculateVolume(newLength, newWidth, newHeight);
    const newVolumeWeight = calculateVolumeWeight(newVolume);

    onUpdate("volume", newVolume);
    onUpdate("totalVolume", newVolume);
    onUpdate("volumeWeight", newVolumeWeight);
    onUpdate("totalVolumeWeight", newVolumeWeight);
  };

  // Handler para actualizar peso
  const handleWeightChange = (value: number) => {
    onUpdate("weight", value);
    onUpdate("totalWeight", value);
  };

  return (
    <div className="card mb-3">
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{ cursor: "pointer" }}
      >
        <div onClick={onToggle} className="flex-grow-1">
          <strong>
            {t("QuoteAIR.pieza")} {index + 1}
          </strong>
          {piece.noApilable && (
            <span className="badge bg-warning text-dark ms-2">
              {t("QuoteAIR.noapilable1")}
            </span>
          )}
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
              <label className="form-label">
                {t("Pieceaccordionair.tipopaquete")}
              </label>
              <select
                className="form-select"
                value={piece.packageType}
                onChange={(e) => onUpdate("packageType", e.target.value)}
              >
                <option value="">
                  {t("Pieceaccordionair.seleccionartipo")}
                </option>
                {packageTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="col-md-6">
              <label className="form-label">
                {t("Pieceaccordionair.descripcion")}
              </label>
              <input
                type="text"
                className="form-control"
                value={piece.description}
                onChange={(e) => onUpdate("description", e.target.value)}
                placeholder={t("Pieceaccordionair.descripcionPlaceholder")}
              />
            </div>

            {/* Dimensiones */}
            <div className="col-md-3">
              <label className="form-label">
                {t("Pieceaccordionair.largo")}
              </label>
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
              <label className="form-label">
                {t("Pieceaccordionair.ancho")}
              </label>
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
              <label className="form-label">
                {t("Pieceaccordionair.alto")}
              </label>
              <input
                type="number"
                className="form-control"
                value={piece.height || ""}
                onChange={(e) =>
                  handleDimensionChange("height", Number(e.target.value))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">
                {t("Pieceaccordionair.peso")}
              </label>
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
                  id={`noApilable-${piece.id}`}
                  checked={piece.noApilable || false}
                  onChange={(e) => onUpdate("noApilable", e.target.checked)}
                />
                <label
                  className="form-check-label"
                  htmlFor={`noApilable-${piece.id}`}
                >
                  {t("Pieceaccordionair.noapilable")}
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip>
                        {t("Pieceaccordionair.noapilableTooltip")}
                      </Tooltip>
                    }
                  >
                    <i
                      className="bi bi-info-circle text-danger ms-1"
                      style={{ cursor: "pointer" }}
                    ></i>
                  </OverlayTrigger>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
