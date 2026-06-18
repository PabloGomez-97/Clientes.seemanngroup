import type { TFunction } from "i18next";
import {
  IconAlert,
  IconMotion,
  IconTracking,
  IconUsers,
} from "./HomeEjecutivoIcons";

export type EjOperationsMetricsProps = {
  t: TFunction;
  clientCount: number;
  newThisMonth: number;
  trackingAirCount: number;
  trackingOceanCount: number;
  inTransitAirCount: number;
  inTransitOceanCount: number;
  totalDelayed: number;
  airDelayedCount: number;
  oceanDelayedCount: number;
  onClientsClick: () => void;
  onTrackingsClick: () => void;
  onInMotionClick: () => void;
  onDelaysClick: () => void;
};

function BreakdownChips({
  air,
  ocean,
}: {
  air: number;
  ocean: number;
}) {
  return (
    <div className="ej-ops-card__chips">
      <span className="ej-ops-card__chip">{air} AIR</span>
      <span className="ej-ops-card__chip-sep" aria-hidden="true">
        ·
      </span>
      <span className="ej-ops-card__chip">{ocean} FCL</span>
    </div>
  );
}

export function EjOperationsMetrics({
  t,
  clientCount,
  newThisMonth,
  trackingAirCount,
  trackingOceanCount,
  inTransitAirCount,
  inTransitOceanCount,
  totalDelayed,
  airDelayedCount,
  oceanDelayedCount,
  onClientsClick,
  onTrackingsClick,
  onInMotionClick,
  onDelaysClick,
}: EjOperationsMetricsProps) {
  const totalTrackings = trackingAirCount + trackingOceanCount;
  const totalInTransit = inTransitAirCount + inTransitOceanCount;

  return (
    <div className="ej-ops-grid">
      <button
        type="button"
        className="ej-ops-card ej-ops-card--orange"
        onClick={onClientsClick}
      >
        <div className="ej-ops-card__header">
          <span className="ej-ops-card__label">{t("admin.homeEjecutivo.myClients")}</span>
          <div className="ej-ops-card__icon ej-ops-card__icon--orange">
            <IconUsers size={15} />
          </div>
        </div>
        <div className="ej-ops-card__value">{clientCount}</div>
        <div className="ej-ops-card__sub">
          {newThisMonth > 0
            ? t("admin.homeEjecutivo.newThisMonth", { count: newThisMonth })
            : t("admin.homeEjecutivo.activePortfolio")}
        </div>
      </button>

      <button
        type="button"
        className="ej-ops-card ej-ops-card--green"
        onClick={onTrackingsClick}
      >
        <div className="ej-ops-card__header">
          <span className="ej-ops-card__label">{t("admin.homeEjecutivo.trackings")}</span>
          <div className="ej-ops-card__icon ej-ops-card__icon--green">
            <IconTracking size={15} />
          </div>
        </div>
        <div className="ej-ops-card__value">{totalTrackings}</div>
        <BreakdownChips air={trackingAirCount} ocean={trackingOceanCount} />
      </button>

      <button
        type="button"
        className="ej-ops-card ej-ops-card--amber"
        onClick={onInMotionClick}
      >
        <div className="ej-ops-card__header">
          <span className="ej-ops-card__label">{t("admin.homeEjecutivo.inMotion")}</span>
          <div className="ej-ops-card__icon ej-ops-card__icon--amber">
            <IconMotion size={15} color="var(--ej-amber)" />
          </div>
        </div>
        <div className="ej-ops-card__value">{totalInTransit}</div>
        <BreakdownChips air={inTransitAirCount} ocean={inTransitOceanCount} />
      </button>

      <button
        type="button"
        className={`ej-ops-card ej-ops-card--red${totalDelayed > 0 ? " ej-ops-card--alert" : ""}`}
        onClick={onDelaysClick}
      >
        <div className="ej-ops-card__header">
          <span className="ej-ops-card__label">{t("admin.homeEjecutivo.activeDelays")}</span>
          <div className="ej-ops-card__icon ej-ops-card__icon--red">
            <IconAlert size={15} color="var(--ej-red)" />
          </div>
          {totalDelayed > 0 && (
            <span className="ej-ops-card__alert-badge" aria-hidden="true" />
          )}
        </div>
        <div className="ej-ops-card__value">{totalDelayed}</div>
        <BreakdownChips air={airDelayedCount} ocean={oceanDelayedCount} />
      </button>
    </div>
  );
}

export function EjOperationsMetricsSkeleton() {
  return (
    <div className="ej-ops-grid ej-ops-grid--skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="ej-ops-card ej-ops-card--skeleton" key={index}>
          <div className="ej-skeleton ej-skeleton--label" />
          <div className="ej-skeleton ej-skeleton--value" />
          <div className="ej-skeleton ej-skeleton--sub" />
        </div>
      ))}
    </div>
  );
}
