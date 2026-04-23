import React from "react";
import { useTranslation } from "react-i18next";

export interface OverallPieceDataAir {
  id: string;
  weight: number;
  volume: number;
  volumeWeight: number;
}

interface OverallPieceAccordionAirProps {
  piece: OverallPieceDataAir;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (field: "weight" | "volume", value: number) => void;
  canRemove: boolean;
}

export const OverallPieceAccordionAir: React.FC<
  OverallPieceAccordionAirProps
> = ({ piece, index, isOpen, onToggle, onRemove, onUpdate, canRemove }) => {
  const { t } = useTranslation();
  const chargeableWeight = Math.max(piece.weight, piece.volumeWeight);

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
          {(piece.weight > 0 || piece.volume > 0) && (
            <span className="qa-text-muted ms-3">
              ({piece.weight.toFixed(2)} kg | {piece.volume.toFixed(3)} m3)
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          {canRemove && (
            <button
              type="button"
              className="qa-btn qa-btn-sm qa-btn-outline"
              style={{ color: "#dc3545", borderColor: "transparent" }}
              title={t("Pieceaccordionlcl.eliminarpieza")}
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
          <div className="qa-grid-2">
            <div>
              <label className="qa-label">Peso (kg)</label>
              <input
                type="number"
                className="qa-input"
                value={piece.weight || ""}
                onChange={(e) => onUpdate("weight", Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="qa-label">Volumen (m3)</label>
              <input
                type="number"
                className="qa-input"
                value={piece.volume || ""}
                onChange={(e) => onUpdate("volume", Number(e.target.value))}
                min="0"
                step="0.0001"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
