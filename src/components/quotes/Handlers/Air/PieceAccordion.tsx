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
    <div className={`qa-accordion ${isOpen ? "open" : ""}`}>
      <div
        className={`qa-accordion-header ${isOpen ? "open" : ""}`}
        onClick={onToggle}
      >
        <div style={{ flexGrow: 1 }}>
          <strong>
            {t("QuoteAIR.pieza")} {index + 1}
          </strong>
          {piece.noApilable && (
            <span className="qa-badge qa-badge-primary ms-2">
              {t("QuoteAIR.noapilable1")}
            </span>
          )}
          {piece.weight > 0 && (
            <span className="qa-text-muted ms-3">
              ({piece.weight} kg | {piece.length}x{piece.width}x{piece.height}{" "}
              cm)
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          {canRemove && (
            <button
              type="button"
              className="qa-btn qa-btn-sm qa-btn-outline"
              style={{ color: "#dc3545", borderColor: "transparent" }}
              title="Eliminar pieza"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <i className="bi bi-trash"></i>
            </button>
          )}
          <i
            className={`bi bi-chevron-${isOpen ? "up" : "down"}`}
            style={{ color: "var(--qa-text-secondary)" }}
          ></i>
        </div>
      </div>

      {isOpen && (
        <div className="qa-accordion-content">
          <div className="row g-3">
            {/* Package Type */}
            <div className="col-md-6 mb-3">
              <label className="qa-label">
                {t("Pieceaccordionair.tipopaquete")}
              </label>
              <select
                className="qa-select"
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
            <div className="col-md-6 mb-3">
              <label className="qa-label">
                {t("Pieceaccordionair.descripcion")}
              </label>
              <input
                type="text"
                className="qa-input"
                value={piece.description}
                onChange={(e) => onUpdate("description", e.target.value)}
                placeholder={t("Pieceaccordionair.descripcionPlaceholder")}
              />
            </div>

            {/* Dimensiones */}
            <div className="col-12">
              <div className="qa-grid-4">
                <div>
                  <label className="qa-label">
                    {t("Pieceaccordionair.largo")}
                  </label>
                  <input
                    type="number"
                    className="qa-input"
                    value={piece.length || ""}
                    onChange={(e) =>
                      handleDimensionChange("length", Number(e.target.value))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="qa-label">
                    {t("Pieceaccordionair.ancho")}
                  </label>
                  <input
                    type="number"
                    className="qa-input"
                    value={piece.width || ""}
                    onChange={(e) =>
                      handleDimensionChange("width", Number(e.target.value))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="qa-label">
                    {t("Pieceaccordionair.alto")}
                  </label>
                  <input
                    type="number"
                    className="qa-input"
                    value={piece.height || ""}
                    onChange={(e) =>
                      handleDimensionChange("height", Number(e.target.value))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="qa-label">
                    {t("Pieceaccordionair.peso")}
                  </label>
                  <input
                    type="number"
                    className="qa-input"
                    value={piece.weight || ""}
                    onChange={(e) => handleWeightChange(Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox No Apilable */}
            <div className="col-12 mt-3">
              <div className="qa-switch-container" style={{ width: "fit-content", padding: "0.5rem 1rem" }}>
                <input
                  className="qa-switch-input"
                  type="checkbox"
                  id={`noApilable-${piece.id}`}
                  checked={piece.noApilable || false}
                  onChange={(e) => onUpdate("noApilable", e.target.checked)}
                />
                <label
                  className="qa-label mb-0 ms-2"
                  htmlFor={`noApilable-${piece.id}`}
                  style={{ cursor: "pointer" }}
                >
                  {t("Pieceaccordionair.noapilable")}
                </label>
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip>
                      {t("Pieceaccordionair.noapilableTooltip")}
                    </Tooltip>
                  }
                >
                  <i
                    className="bi bi-info-circle text-muted ms-2"
                    style={{ cursor: "pointer", fontSize: "0.9rem" }}
                  ></i>
                </OverlayTrigger>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
