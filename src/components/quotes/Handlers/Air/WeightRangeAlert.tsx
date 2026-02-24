import React from "react";
import { useTranslation } from "react-i18next";
import type { WeightRangeValidation } from "./HandlerQuoteAir";

interface WeightRangeAlertProps {
  validation: WeightRangeValidation;
  pesoChargeable: number;
}

/**
 * Componente que muestra una alerta cuando el peso chargeable cae en un rango
 * sin precio disponible para la ruta seleccionada.
 * Indica al usuario cuál es el peso mínimo requerido para cotizar.
 */
export const WeightRangeAlert: React.FC<WeightRangeAlertProps> = ({
  validation,
  pesoChargeable,
}) => {
  const { t } = useTranslation();

  if (validation.tienePrecio) return null;

  return (
    <div
      className="p-3 rounded border mb-4"
      style={{
        backgroundColor: "#fff3cd",
        borderColor: "#ffc107",
        borderLeft: "4px solid #dc3545",
      }}
    >
      <div className="d-flex align-items-start gap-2">
        <i
          className="bi bi-exclamation-triangle-fill text-danger"
          style={{ fontSize: "1.25rem", marginTop: "2px" }}
        ></i>
        <div className="flex-grow-1">
          <h6 className="fw-bold mb-2 text-danger">
            {t("WeightRangeAlert.sinPrecioEnRango")}
          </h6>
          <p className="mb-2 small">
            {t("WeightRangeAlert.pesoActualEnRango", {
              peso: pesoChargeable.toFixed(2),
              rango: validation.rangoActual,
            })}
          </p>

          {validation.pesoMinimoRequerido !== null &&
          validation.siguienteRangoDisponible ? (
            <div
              className="p-2 rounded mt-2"
              style={{ backgroundColor: "rgba(255,255,255,0.7)" }}
            >
              <p className="mb-1 small fw-bold">
                <i className="bi bi-arrow-right-circle me-1"></i>
                {t("WeightRangeAlert.sugerencia", {
                  pesoMinimo: validation.pesoMinimoRequerido,
                  rangoSiguiente: validation.siguienteRangoDisponible,
                })}
              </p>
              <p className="mb-0 text-muted" style={{ fontSize: "0.75rem" }}>
                {t("WeightRangeAlert.ajustarPeso")}
              </p>
            </div>
          ) : (
            <div
              className="p-2 rounded mt-2"
              style={{ backgroundColor: "rgba(255,255,255,0.7)" }}
            >
              <p className="mb-0 small fw-bold text-danger">
                <i className="bi bi-x-circle me-1"></i>
                {t("WeightRangeAlert.sinRangoDisponible")}
              </p>
            </div>
          )}

          {/* Visualización de rangos disponibles */}
          <div className="mt-3">
            <small className="text-muted d-block mb-2">
              {t("WeightRangeAlert.rangosDisponibles")}:
            </small>
            <div className="d-flex flex-wrap gap-1">
              {validation.rangosDisponibles.map((rango) => (
                <span
                  key={rango.rango}
                  className={`badge ${
                    rango.rango === validation.rangoActual
                      ? "bg-danger"
                      : rango.disponible
                        ? "bg-success"
                        : "bg-secondary"
                  }`}
                  style={{ fontSize: "0.7rem" }}
                >
                  {rango.disponible ? (
                    <i className="bi bi-check-circle me-1"></i>
                  ) : (
                    <i className="bi bi-x-circle me-1"></i>
                  )}
                  {rango.rango}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
