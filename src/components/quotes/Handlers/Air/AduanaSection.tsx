import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import type {
  IAgenciaAduanaConfig,
  SupportedCurrency,
} from "../../../../types/agenciaAduana";
import {
  calculateAduanaCharges,
  applyDerechosExclusion,
} from "../../../../types/agenciaAduana";

interface AduanaSectionProps {
  /** Si el usuario activó la agencia de aduanas */
  activo: boolean;
  onToggle: (checked: boolean) => void;
  /** Valor del producto ingresado por el usuario */
  valorProducto: string;
  onValorProductoChange: (value: string) => void;
  /** Costo de transporte (total sin opcionales) */
  costoTransporte: number;
  /** Si el seguro está activo */
  seguroActivo: boolean;
  /** Monto del seguro (0 si no hay) */
  seguroMonto: number;
  /** Moneda de la tarifa */
  currency: SupportedCurrency;
  /** Configuración cargada de la DB */
  config: IAgenciaAduanaConfig;
  /** Si la configuración está cargando */
  configLoading: boolean;
  /** Si el input de valor del producto debe estar bloqueado (cuando seguro es master) */
  valorProductoDisabled?: boolean;
  /** Solo en modo ejecutivo: permite excluir derechos de aduana de la cotización */
  showDerechosExclusionControl?: boolean;
  derechosExcluidos?: boolean;
  onExcluirDerechos?: () => void;
}

/**
 * Componente que muestra la sección de "Agencia de Aduanas y Nacionalización"
 * dentro de los Opcionales y Cargos Adicionales del cotizador aéreo.
 */
export const AduanaSection: React.FC<AduanaSectionProps> = ({
  activo,
  onToggle,
  valorProducto,
  onValorProductoChange,
  costoTransporte,
  seguroActivo,
  seguroMonto,
  currency,
  config,
  configLoading,
  valorProductoDisabled = false,
  showDerechosExclusionControl = false,
  derechosExcluidos = false,
  onExcluirDerechos,
}) => {
  const { t } = useTranslation();

  const valorProductoNum = parseFloat(valorProducto.replace(",", ".")) || 0;

  // Calcular seguro teórico si no hay seguro activo
  const seguroParaCIF = useMemo(() => {
    if (seguroActivo && seguroMonto > 0) {
      return seguroMonto;
    }
    // Seguro teórico: ((valor producto + valor transporte) * 1.1) * 0.02
    if (valorProductoNum > 0) {
      return (valorProductoNum + costoTransporte) * 1.1 * 0.02;
    }
    return 0;
  }, [seguroActivo, seguroMonto, valorProductoNum, costoTransporte]);

  // Calcular los cobros de aduana
  const aduanaResult = useMemo(() => {
    if (!activo || valorProductoNum <= 0) return null;
    return calculateAduanaCharges(
      valorProductoNum,
      costoTransporte,
      seguroParaCIF,
      currency,
      config,
    );
  }, [
    activo,
    valorProductoNum,
    costoTransporte,
    seguroParaCIF,
    currency,
    config,
  ]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const displayResult =
    aduanaResult &&
    applyDerechosExclusion(aduanaResult, derechosExcluidos);

  return (
    <div className="mt-2">
      {activo && (
        <div className="mt-2 ps-4">
          {/* Desglose CIF */}
          {valorProductoNum > 0 && displayResult && (
            <div className="mt-3">
              {/* CIF Calculation */}
              <div
                className="p-2 rounded mb-2"
                style={{
                  backgroundColor: "rgba(13, 110, 253, 0.05)",
                  border: "1px solid rgba(13, 110, 253, 0.15)",
                }}
              >
                <small className="fw-bold d-block mb-1">
                  <i className="bi bi-calculator me-1" />
                  {t("AgenciaAduana.calculoCIF")}
                </small>
                <div
                  className="d-flex flex-column gap-1"
                  style={{ fontSize: "0.8rem" }}
                >
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t("AgenciaAduana.valorProductoLabel")}
                    </span>
                    <span>
                      {currency} {fmt(valorProductoNum)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t("AgenciaAduana.costoTransporte")}
                    </span>
                    <span>
                      {currency} {fmt(costoTransporte)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {seguroActivo && seguroMonto > 0
                        ? t("AgenciaAduana.seguroReal")
                        : t("AgenciaAduana.seguroTeorico")}
                    </span>
                    <span>
                      {currency} {fmt(seguroParaCIF)}
                    </span>
                  </div>
                  <hr className="my-1" />
                  <div className="d-flex justify-content-between fw-bold">
                    <span>CIF</span>
                    <span className="text-primary">
                      {currency} {fmt(displayResult.cif)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desglose de cobros */}
              <div
                className="p-2 rounded"
                style={{
                  backgroundColor: "rgba(255, 98, 0, 0.04)",
                  border: "1px solid rgba(255, 98, 0, 0.12)",
                }}
              >
                <small className="fw-bold d-block mb-1">
                  <i className="bi bi-receipt me-1" />
                  {t("AgenciaAduana.desgloseCobros")}
                </small>
                <div
                  className="d-flex flex-column gap-1"
                  style={{ fontSize: "0.8rem" }}
                >
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t("AgenciaAduana.honorarios")}
                    </span>
                    <span>
                      {currency} {fmt(displayResult.honorarios)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t("AgenciaAduana.gastosDespacho")}
                    </span>
                    <span>
                      {currency} {fmt(displayResult.gastosDespacho)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t("AgenciaAduana.tramitacion")}
                    </span>
                    <span>
                      {currency} {fmt(displayResult.tramitacion)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t("AgenciaAduana.mensajeria")}
                    </span>
                    <span>
                      {currency} {fmt(displayResult.mensajeria)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">
                      {t("AgenciaAduana.ivaAduanero")} (
                      {config.charges.ivaAduaneroPct}%)
                    </span>
                    <span>
                      {currency} {fmt(displayResult.ivaAduanero)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted d-flex align-items-center gap-2">
                      {t("AgenciaAduana.derechos")} (
                      {config.charges.derechosPct}%)
                      {showDerechosExclusionControl && !derechosExcluidos && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-0"
                          title={t("AgenciaAduana.eliminarDerechos")}
                          onClick={onExcluirDerechos}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      )}
                    </span>
                    <span>
                      {currency} {fmt(displayResult.derechos)}
                    </span>
                  </div>
                  <hr className="my-1" />
                  <div className="d-flex justify-content-between fw-bold">
                    <span>{t("AgenciaAduana.totalAduana")}</span>
                    <span className="text-danger">
                      {currency} {fmt(displayResult.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
