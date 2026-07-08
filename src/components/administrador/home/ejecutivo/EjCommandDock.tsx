import type { TFunction } from "i18next";
import type { NavigateFunction } from "react-router-dom";
import { adminPaths } from "@/config/adminPaths";
import {
  IconAnalysis,
  IconLastMile,
  IconPlus,
  IconTracking,
  IconUsers,
} from "./HomeEjecutivoIcons";

type EjCommandDockProps = {
  t: TFunction;
  navigate: NavigateFunction;
};

export function EjCommandDock({ t, navigate }: EjCommandDockProps) {
  return (
    <section className="ej-command-dock-section" aria-label={t("admin.homeEjecutivo.quickAccess")}>
      <div className="ej-command-dock">
        <span className="ej-command-dock__label">{t("admin.homeEjecutivo.quickAccess")}</span>
        <div className="ej-command-dock__actions">
          <button
            type="button"
            className="ej-command-dock__primary"
            onClick={() => navigate(adminPaths.cotizador)}
          >
            <IconPlus size={15} />
            {t("admin.homeEjecutivo.newQuote")}
          </button>
          <div className="ej-command-dock__links" role="group" aria-label={t("admin.homeEjecutivo.quickAccess")}>
            <button
              type="button"
              className="ej-command-dock__link"
              onClick={() =>
                navigate(adminPaths.cotizador, {
                  state: { tipoEnvio: "LASTMILE" },
                })
              }
            >
              <IconLastMile size={14} />
              {t("admin.homeEjecutivo.lastMileQuote")}
            </button>
            <button
              type="button"
              className="ej-command-dock__link"
              onClick={() => navigate(adminPaths.clientesReporteria)}
            >
              <IconUsers size={14} />
              {t("admin.homeEjecutivo.myClients")}
            </button>
            <button
              type="button"
              className="ej-command-dock__link"
              onClick={() => navigate(adminPaths.clientesTracking)}
            >
              <IconTracking size={14} />
              {t("admin.homeEjecutivo.trackings")}
            </button>
            <button
              type="button"
              className="ej-command-dock__link"
              onClick={() => navigate(adminPaths.analisysSystem)}
            >
              <IconAnalysis size={14} />
              {t("admin.sidebar.analisysSystem")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EjCommandDockSkeleton() {
  return (
    <div className="ej-command-dock-section ej-command-dock-section--skeleton" aria-hidden="true">
      <div className="ej-command-dock ej-command-dock--skeleton">
        <div className="ej-skeleton ej-skeleton--dock-label" />
        <div className="ej-command-dock__actions">
          <div className="ej-skeleton ej-skeleton--dock-primary" />
          <div className="ej-command-dock__links">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="ej-skeleton ej-skeleton--dock-link" key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
