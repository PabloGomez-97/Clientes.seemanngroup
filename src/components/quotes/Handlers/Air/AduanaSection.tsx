import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  onToggle?: (checked: boolean) => void;
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
  config: IAgenciaAduanaConfig | null;
  /** Si la configuración está cargando */
  configLoading: boolean;
  /** Si el input de valor del producto debe estar bloqueado (cuando seguro es master) */
  valorProductoDisabled?: boolean;
  /** Solo en modo ejecutivo: permite excluir derechos de aduana de la cotización */
  showDerechosExclusionControl?: boolean;
  derechosExcluidos?: boolean;
  onExcluirDerechos?: () => void;
  /**
   * Solo desglose CIF (Export EXW). Oculta honorarios/aduana.
   * Si `showValorProductoInput`, muestra el input de valor de carga.
   */
  cifOnly?: boolean;
  showValorProductoInput?: boolean;
  valorProductoLabel?: string;
}

/**
 * Componente que muestra la sección de "Agencia de Aduanas y Nacionalización"
 * dentro de los Opcionales y Cargos Adicionales del cotizador aéreo.
 * También reutilizable en modo `cifOnly` para Exportación + EXW.
 */
export const AduanaSection: React.FC<AduanaSectionProps> = ({
  activo,
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
  cifOnly = false,
  showValorProductoInput = false,
  valorProductoLabel,
}) => {
  const { t } = useTranslation();

  const valorProductoNum = parseFloat(valorProducto.replace(",", ".")) || 0;

  const seguroParaCIF = useMemo(() => {
    if (seguroActivo && seguroMonto > 0) {
      return seguroMonto;
    }
    if (valorProductoNum > 0) {
      return (valorProductoNum + costoTransporte) * 1.1 * 0.02;
    }
    return 0;
  }, [seguroActivo, seguroMonto, valorProductoNum, costoTransporte]);

  const aduanaResult = useMemo(() => {
    if (!activo || valorProductoNum <= 0 || !config) return null;
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
    aduanaResult && applyDerechosExclusion(aduanaResult, derechosExcluidos);

  const cifFallback =
    valorProductoNum > 0
      ? valorProductoNum + costoTransporte + seguroParaCIF
      : 0;

  if (!cifOnly && configLoading) {
    return null;
  }

  return (
    <div className="mt-2">
      {activo && (
        <div className={cifOnly ? "mt-2" : "mt-2 ps-4"}>
          {showValorProductoInput && (
            <div className="mb-3">
              <label className="qa-label">
                {valorProductoLabel || t("AgenciaAduana.valorProducto")}
                <span
                  className="qf-badge ms-2"
                  style={{ fontSize: "0.7rem", fontWeight: 400 }}
                >
                  Obligatorio
                </span>
              </label>
              <div className="input-group" style={{ maxWidth: 320 }}>
                <span className="input-group-text">{currency}</span>
                <input
                  type="text"
                  className="form-control"
                  value={valorProducto}
                  disabled={valorProductoDisabled}
                  placeholder="0.00"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[\d,.]+$/.test(v)) {
                      onValorProductoChange(v);
                    }
                  }}
                />
              </div>
              {valorProductoNum <= 0 && (
                <small className="text-danger d-block mt-1">
                  Ingresa el valor de la carga para calcular CIF y generar la
                  cotización.
                </small>
              )}
            </div>
          )}

          {valorProductoNum > 0 && (displayResult || cifOnly) && (
            <div className="mt-3">
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
                      {currency} {fmt(displayResult?.cif ?? cifFallback)}
                    </span>
                  </div>
                </div>
              </div>

              {!cifOnly && displayResult && config && (
                <div
                  className="p-2 rounded"
                  style={{
                    backgroundColor: "rgba(35, 47, 62, 0.03)",
                    border: "1px solid rgba(35, 47, 62, 0.12)",
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
