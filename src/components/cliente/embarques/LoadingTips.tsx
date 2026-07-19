import { useState, useEffect } from "react";
import "./LoadingTips.css";

const LOADING_MESSAGE_DELAY_MS = 3000;

export type LoadingTipsVariant =
  | "table"
  | "financial"
  | "operational"
  | "ratesConsult";

export interface LoadingTipsColumn {
  label: string;
  center?: boolean;
}

interface LoadingTipsProps {
  variant?: LoadingTipsVariant;
  columns?: LoadingTipsColumn[];
}

const ROW_COUNT = 10;

/* Columnas genéricas cuando el consumidor no especifica ninguna */
const DEFAULT_COLUMNS: LoadingTipsColumn[] = [
  { label: "" },
  { label: "" },
  { label: "" },
  { label: "" },
  { label: "" },
  { label: "", center: true },
  { label: "", center: true },
];

/* Anchos de texto que rotan de forma determinista para dar un look orgánico */
const TEXT_WIDTHS = ["lt-bone--w-md", "lt-bone--w-lg", "lt-bone--w-sm"] as const;

function textWidthClass(rowIndex: number, colIndex: number): string {
  return TEXT_WIDTHS[(rowIndex * 3 + colIndex * 2) % TEXT_WIDTHS.length];
}

function LoadingOverlay() {
  const [message, setMessage] = useState("Cargando");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setMessage("Por favor, espere");
    }, LOADING_MESSAGE_DELAY_MS);

    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="lt-loading-overlay">
      <div className="lt-loading-message">
        <svg
          className="lt-loading-spinner"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="8" stroke="#e5e7eb" strokeWidth="2" />
          <path
            d="M10 2a8 8 0 0 1 8 8"
            stroke="#ff6200"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="lt-loading-text" key={message}>
          {message}
        </span>
      </div>
    </div>
  );
}

function KpiCardSkeleton({
  featured = false,
}: {
  featured?: boolean;
}) {
  return (
    <div className="lt-kpi-card">
      <span className="lt-bone lt-bone--kpi-label" />
      <span className="lt-bone lt-bone--kpi-value" />
      {featured ? (
        <>
          <span className="lt-bone lt-bone--kpi-change" />
          <span className="lt-bone lt-bone--kpi-bar" />
          <div className="lt-kpi-legend">
            <span className="lt-bone lt-bone--legend-item" />
            <span className="lt-bone lt-bone--legend-item" />
            <span className="lt-bone lt-bone--legend-item" />
          </div>
        </>
      ) : (
        <span className="lt-bone lt-bone--kpi-sub" />
      )}
    </div>
  );
}

function ChartPanelSkeleton({
  type,
}: {
  type: "area" | "donut" | "bars" | "list" | "progress";
}) {
  return (
    <div className="lt-panel">
      <span className="lt-bone lt-bone--panel-title" />
      {type === "area" && <div className="lt-chart lt-chart--area" />}
      {type === "donut" && (
        <div className="lt-chart lt-chart--donut-wrap">
          <span className="lt-bone lt-bone--donut" />
          <div className="lt-kpi-legend lt-kpi-legend--center">
            <span className="lt-bone lt-bone--legend-item" />
            <span className="lt-bone lt-bone--legend-item" />
          </div>
        </div>
      )}
      {type === "bars" && (
        <div className="lt-chart lt-chart--bars" aria-hidden="true">
          {[72, 48, 88, 56, 96, 40, 80, 52, 68, 44, 76, 60].map((h, i) => (
            <span
              key={i}
              className="lt-bone lt-bone--bar"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      )}
      {type === "list" && (
        <div className="lt-list-rows">
          <div className="lt-list-row">
            <span className="lt-bone lt-bone--list-label" />
            <span className="lt-bone lt-bone--list-value" />
          </div>
          <div className="lt-list-row">
            <span className="lt-bone lt-bone--list-label" />
            <span className="lt-bone lt-bone--list-value" />
          </div>
        </div>
      )}
      {type === "progress" && (
        <div className="lt-progress-blocks">
          <div className="lt-progress-block">
            <div className="lt-progress-block__head">
              <span className="lt-bone lt-bone--progress-label" />
              <span className="lt-bone lt-bone--progress-value" />
            </div>
            <span className="lt-bone lt-bone--progress-bar" />
            <span className="lt-bone lt-bone--progress-sub" />
          </div>
          <div className="lt-progress-block">
            <div className="lt-progress-block__head">
              <span className="lt-bone lt-bone--progress-label" />
              <span className="lt-bone lt-bone--progress-value" />
            </div>
            <span className="lt-bone lt-bone--progress-bar" />
            <span className="lt-bone lt-bone--progress-sub" />
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton({ columns }: { columns?: LoadingTipsColumn[] }) {
  const cols = columns?.length ? columns : DEFAULT_COLUMNS;

  return (
    <div className="lt-table-wrapper">
      <div className="lt-table-scroll">
        <table className="lt-skeleton-table">
          <thead>
            <tr>
              {cols.map((col, i) => (
                <th
                  key={i}
                  className={`lt-skeleton-th${col.center ? " lt-skeleton-th--center" : ""}`}
                >
                  {col.label ? (
                    <span className="lt-skeleton-th-label">{col.label}</span>
                  ) : (
                    <span className="lt-bone lt-bone--header" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROW_COUNT }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {cols.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`lt-skeleton-td${col.center ? " lt-skeleton-td--center" : ""}`}
                  >
                    {colIndex === 0 ? (
                      /* Celda rica: referencia + número, como en las tablas nuevas */
                      <span className="lt-cell-rich">
                        <span
                          className={`lt-bone lt-bone--ref ${textWidthClass(rowIndex, 0)}`}
                        />
                        <span className="lt-bone lt-bone--num" />
                      </span>
                    ) : col.center ? (
                      <span className="lt-bone lt-bone--pill" />
                    ) : (
                      <span
                        className={`lt-bone lt-bone--text ${textWidthClass(rowIndex, colIndex)}`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lt-pagination" aria-hidden="true">
        <span className="lt-bone lt-bone--page-text" />
        <span className="lt-bone lt-bone--page-select" />
        <span className="lt-bone lt-bone--page-range" />
        <span className="lt-bone lt-bone--page-btn" />
        <span className="lt-bone lt-bone--page-btn" />
      </div>

      <LoadingOverlay />
    </div>
  );
}

function FinancialSkeleton() {
  return (
    <div className="lt-dashboard-wrapper">
      <div className="lt-kpi-grid lt-kpi-grid--4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      <div className="lt-alerts" aria-hidden="true">
        <div className="lt-alert lt-alert--danger">
          <span className="lt-bone lt-bone--alert-icon" />
          <span className="lt-bone lt-bone--alert-text" />
        </div>
        <div className="lt-alert lt-alert--info">
          <span className="lt-bone lt-bone--alert-icon" />
          <span className="lt-bone lt-bone--alert-text" />
        </div>
      </div>

      <div className="lt-tabs" aria-hidden="true">
        <span className="lt-bone lt-bone--tab lt-bone--tab-active" />
        <span className="lt-bone lt-bone--tab" />
        <span className="lt-bone lt-bone--tab" />
      </div>

      <div className="lt-panel-row">
        <ChartPanelSkeleton type="area" />
        <ChartPanelSkeleton type="donut" />
      </div>

      <div className="lt-panel-row">
        <ChartPanelSkeleton type="list" />
        <ChartPanelSkeleton type="progress" />
      </div>

      <LoadingOverlay />
    </div>
  );
}

function RatesConsultSkeleton({ columns }: { columns?: LoadingTipsColumn[] }) {
  return (
    <div className="lt-rates-consult">
      <div className="lt-tabs" aria-hidden="true">
        <span className="lt-bone lt-bone--tab lt-bone--tab-active" />
        <span className="lt-bone lt-bone--tab" />
        <span className="lt-bone lt-bone--tab" />
      </div>

      <div className="lt-rates-filters" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="lt-rates-field">
            <span className="lt-bone lt-bone--filter-label" />
            <span className="lt-bone lt-bone--filter-select" />
          </div>
        ))}
        <div className="lt-rates-toggle">
          <span className="lt-bone lt-bone--toggle-box" />
          <span className="lt-bone lt-bone--toggle-text" />
        </div>
      </div>

      <div className="lt-rates-toolbar" aria-hidden="true">
        <span className="lt-bone lt-bone--results-text" />
        <span className="lt-bone lt-bone--download-btn" />
      </div>

      <TableSkeleton columns={columns} />
    </div>
  );
}

function OperationalSkeleton() {
  return (
    <div className="lt-dashboard-wrapper">
      <div className="lt-kpi-grid lt-kpi-grid--8">
        <KpiCardSkeleton featured />
        {Array.from({ length: 7 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>

      <div className="lt-tabs" aria-hidden="true">
        <span className="lt-bone lt-bone--tab lt-bone--tab-active" />
        <span className="lt-bone lt-bone--tab" />
        <span className="lt-bone lt-bone--tab" />
        <span className="lt-bone lt-bone--tab" />
      </div>

      <ChartPanelSkeleton type="area" />

      <div className="lt-panel-row">
        <ChartPanelSkeleton type="donut" />
        <ChartPanelSkeleton type="bars" />
      </div>

      <LoadingOverlay />
    </div>
  );
}

export default function LoadingTips({
  variant = "table",
  columns,
}: LoadingTipsProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      {variant === "financial" && <FinancialSkeleton />}
      {variant === "operational" && <OperationalSkeleton />}
      {variant === "ratesConsult" && <RatesConsultSkeleton columns={columns} />}
      {variant === "table" && <TableSkeleton columns={columns} />}
    </div>
  );
}
