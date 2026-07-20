import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { IAgenciaAduanaFclConfig } from "../../../../types/agenciaAduanaFcl";
import { calculateAduanaChargesFcl } from "../../../../types/agenciaAduanaFcl";
import { applyDerechosExclusion } from "../../../../types/agenciaAduana";

interface AduanaSectionFclProps {
  activo: boolean;
  valorProducto: string;
  costoTransporte: number;
  seguroActivo: boolean;
  seguroMonto: number;
  currency: string;
  cantidadContenedores: number;
  config: IAgenciaAduanaFclConfig;
  valorProductoDisabled?: boolean;
  showDerechosExclusionControl?: boolean;
  derechosExcluidos?: boolean;
  onExcluirDerechos?: () => void;
}

export const AduanaSectionFcl: React.FC<AduanaSectionFclProps> = ({
  activo,
  valorProducto,
  costoTransporte,
  seguroActivo,
  seguroMonto,
  currency,
  cantidadContenedores,
  config,
  valorProductoDisabled = false,
  showDerechosExclusionControl = false,
  derechosExcluidos = false,
  onExcluirDerechos,
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
    if (!activo || valorProductoNum <= 0) return null;
    return calculateAduanaChargesFcl(
      valorProductoNum,
      costoTransporte,
      seguroParaCIF,
      cantidadContenedores,
      config,
    );
  }, [
    activo,
    valorProductoNum,
    costoTransporte,
    seguroParaCIF,
    cantidadContenedores,
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

  if (!activo) return null;

  return (
    <div className="mt-2 ps-4">
      {valorProductoNum > 0 && displayResult && (
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
                  {currency} {fmt(displayResult.cif)}
                </span>
              </div>
            </div>
          </div>

          <div
            className="p-2 rounded"
            style={{
              backgroundColor: "rgba(35, 47, 62, 0.03)",
              border: "1px solid rgba(35, 47, 62, 0.12)",
            }}
          >
            <small className="fw-bold d-block mb-1">
              <i className="bi bi-receipt me-1" />
              {t("AgenciaAduanaFcl.desgloseCobros")}
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
                  {t("AgenciaAduanaFcl.customsClearance")}
                </span>
                <span>
                  {currency} {fmt(displayResult.customsClearance)}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">
                  {t("AgenciaAduanaFcl.gateIn")} ({displayResult.gateInQuantity}{" "}
                  {t("AgenciaAduanaFcl.contenedores")})
                </span>
                <span>
                  {currency} {fmt(displayResult.gateIn)}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">
                  {t("AgenciaAduanaFcl.docProcess")}
                </span>
                <span>
                  {currency} {fmt(displayResult.docProcess)}
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
                  {t("AgenciaAduana.derechos")} ({config.charges.derechosPct}%)
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

      {valorProductoNum <= 0 && !valorProductoDisabled && (
        <small className="text-muted d-block mt-2">
          {t("AgenciaAduanaFcl.ingreseValorProducto")}
        </small>
      )}
    </div>
  );
};
