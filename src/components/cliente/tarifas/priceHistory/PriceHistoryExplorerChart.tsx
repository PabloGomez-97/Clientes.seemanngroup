import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  HistoricalEntitySeries,
  HistoricalTierSeries,
} from "@/components/quotes/Handlers/shared/historicalExplorerParse";
import { getExplorerEntityColor } from "@/components/quotes/Handlers/shared/historicalExplorerParse";
import { computePriceInsight } from "@/components/quotes/Handlers/shared/priceHistoryInsights";
import type { PriceHistoryCurrency } from "@/components/quotes/Handlers/shared/priceHistoryTypes";

const MAX_ADDED_ENTITIES = 5;

interface PriceHistoryExplorerChartProps {
  tier: HistoricalTierSeries;
  routeLabel: string;
  entityColumnLabel: string;
  chartResetKey: string;
  compact?: boolean;
}

function formatPrice(value: number, currency: PriceHistoryCurrency): string {
  return `${currency} ${value.toFixed(2)}`;
}

function entityAveragePrice(entity: HistoricalEntitySeries): number {
  if (entity.points.length === 0) return Number.POSITIVE_INFINITY;
  const sum = entity.points.reduce((acc, p) => acc + p.value, 0);
  return sum / entity.points.length;
}

export function PriceHistoryExplorerChart({
  tier,
  routeLabel,
  entityColumnLabel,
  chartResetKey,
  compact = false,
}: PriceHistoryExplorerChartProps) {
  const { t } = useTranslation();
  const selectId = useId();
  const [addedEntityKeys, setAddedEntityKeys] = useState<string[]>([]);

  useEffect(() => {
    setAddedEntityKeys([]);
  }, [chartResetKey]);

  const rankedEntities = useMemo(
    () =>
      [...tier.entities].sort(
        (a, b) =>
          entityAveragePrice(a) - entityAveragePrice(b) ||
          a.entityLabel.localeCompare(b.entityLabel),
      ),
    [tier.entities],
  );

  const cheapestEntity = rankedEntities[0] ?? null;

  const visibleEntities = useMemo(() => {
    if (!cheapestEntity) return [];
    const added = addedEntityKeys
      .map((key) => rankedEntities.find((e) => e.entityKey === key))
      .filter((e): e is HistoricalEntitySeries => Boolean(e));
    return [cheapestEntity, ...added];
  }, [cheapestEntity, addedEntityKeys, rankedEntities]);

  const addableEntities = useMemo(() => {
    if (!cheapestEntity) return [];
    const onChart = new Set([cheapestEntity.entityKey, ...addedEntityKeys]);
    return rankedEntities.filter((e) => !onChart.has(e.entityKey));
  }, [rankedEntities, cheapestEntity, addedEntityKeys]);

  const canAddMore = addedEntityKeys.length < MAX_ADDED_ENTITIES;

  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, string | number>>();
    for (const entity of visibleEntities) {
      for (const point of entity.points) {
        if (!dateMap.has(point.dateKey)) {
          dateMap.set(point.dateKey, {
            label: point.label,
            dateKey: point.dateKey,
          });
        }
        const row = dateMap.get(point.dateKey)!;
        row[entity.entityKey] = point.value;
      }
    }
    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.dateKey).localeCompare(String(b.dateKey)),
    );
  }, [visibleEntities]);

  const aggregateInsight = useMemo(() => {
    const allPoints = visibleEntities.flatMap((e) => e.points);
    const byDate = new Map<string, number>();
    for (const p of allPoints) {
      const cur = byDate.get(p.dateKey);
      if (cur === undefined || p.value < cur) byDate.set(p.dateKey, p.value);
    }
    return computePriceInsight(
      Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, value]) => ({
          dateKey,
          label: dateKey,
          value,
        })),
    );
  }, [visibleEntities]);

  const height = compact ? 220 : 260;

  const handleAddEntity = (entityKey: string) => {
    if (!entityKey || !canAddMore) return;
    setAddedEntityKeys((prev) =>
      prev.includes(entityKey) ? prev : [...prev, entityKey],
    );
  };

  const handleRemoveAdded = (entityKey: string) => {
    setAddedEntityKeys((prev) => prev.filter((k) => k !== entityKey));
  };

  if (!cheapestEntity) {
    return (
      <p className="rhp-card__empty">{t("priceHistoryExplorer.noSeriesData")}</p>
    );
  }

  return (
    <div className="rhp-chart-block">
      <div className="rhp-chart-block__head">
        <div>
          <div className="rhp-chart-block__route">{routeLabel}</div>
          <div className="rhp-chart-block__tier">
            {tier.tierLabel} · {tier.currency}
          </div>
        </div>
        {aggregateInsight && (
          <div className="rhp-insight">
            <span
              className={`rhp-insight__trend rhp-insight__trend--${aggregateInsight.trend}`}
            >
              {t(`priceHistoryExplorer.trend.${aggregateInsight.trend}`)}
            </span>
            <span className="rhp-insight__range">
              {t("priceHistoryExplorer.rangeEstimate", {
                low: formatPrice(aggregateInsight.rangeLow, tier.currency),
                high: formatPrice(aggregateInsight.rangeHigh, tier.currency),
              })}
            </span>
          </div>
        )}
      </div>

      {addableEntities.length > 0 && (
        <div className="rhp-entity-picker">
          <label className="rhp-entity-picker__label" htmlFor={selectId}>
            {t("priceHistoryExplorer.addEntity", { label: entityColumnLabel })}
          </label>
          <select
            id={selectId}
            className="rhp-select"
            value=""
            disabled={!canAddMore}
            onChange={(e) => handleAddEntity(e.target.value)}
          >
            <option value="">
              {canAddMore
                ? t("priceHistoryExplorer.selectEntity")
                : t("priceHistoryExplorer.maxEntitiesAdded", {
                    label: entityColumnLabel,
                  })}
            </option>
            {addableEntities.map((entity) => (
              <option key={entity.entityKey} value={entity.entityKey}>
                {entity.entityLabel}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rhp-legend">
        {visibleEntities.map((entity, index) => {
          const isCheapest = entity.entityKey === cheapestEntity.entityKey;
          const lineColor = getExplorerEntityColor(index);
          return (
            <span key={entity.entityKey} className="rhp-legend__item">
              <span
                className="rhp-legend__swatch"
                style={{ backgroundColor: lineColor }}
              />
              {entity.entityLabel}
              {isCheapest ? (
                <span className="rhp-legend__tag">
                  {t("priceHistoryExplorer.lowestPrice")}
                </span>
              ) : (
                <button
                  type="button"
                  className="rhp-legend__remove"
                  onClick={() => handleRemoveAdded(entity.entityKey)}
                  aria-label={t("priceHistoryExplorer.removeEntity", {
                    label: entity.entityLabel,
                  })}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>

      <div className="rhp-chart-wrap">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b7280" }}
              width={48}
              tickFormatter={(v) => Number(v).toFixed(0)}
            />
            <Tooltip
              formatter={(value: number) => formatPrice(value, tier.currency)}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                fontSize: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
              }}
            />
            {visibleEntities.map((entity, index) => {
              const lineColor = getExplorerEntityColor(index);
              return (
                <Line
                  key={entity.entityKey}
                  type="monotone"
                  dataKey={entity.entityKey}
                  name={entity.entityLabel}
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: lineColor,
                    stroke: lineColor,
                  }}
                  activeDot={{
                    r: 4,
                    fill: lineColor,
                    stroke: lineColor,
                  }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length < 2 && (
        <p className="rhp-chart-block__note">
          {t("priceHistoryExplorer.limitedHistory")}
        </p>
      )}
    </div>
  );
}
