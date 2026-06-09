import "./LoadingTips.css";

export type LoadingTipsVariant = "table" | "financial" | "operational";

interface LoadingTipsProps {
  variant?: LoadingTipsVariant;
}

const ROW_COUNT = 10;

const HEADER_COLUMNS = [
  { className: "lt-bone--id", center: false },
  { className: "lt-bone--badge", center: true },
  { className: "lt-bone--badge", center: true },
  { className: "lt-bone--city", center: false },
  { className: "lt-bone--city-lg", center: false },
  { className: "lt-bone--transport", center: false },
  { className: "lt-bone--date", center: false },
  { className: "lt-bone--date", center: false },
  { className: "lt-bone--transit", center: true },
  { className: "lt-bone--button", center: true },
] as const;

type RowCell = {
  className: string;
  center?: boolean;
};

const ROW_PATTERNS: RowCell[][] = [
  [
    { className: "lt-bone--id" },
    { className: "lt-bone--badge", center: true },
    { className: "lt-bone--badge", center: true },
    { className: "lt-bone--city-lg" },
    { className: "lt-bone--city" },
    { className: "lt-bone--transport" },
    { className: "lt-bone--date" },
    { className: "lt-bone--date" },
    { className: "lt-bone--transit", center: true },
    { className: "lt-bone--button", center: true },
  ],
  [
    { className: "lt-bone--id" },
    { className: "lt-bone--badge", center: true },
    { className: "lt-bone--badge", center: true },
    { className: "lt-bone--city" },
    { className: "lt-bone--city-lg" },
    { className: "lt-bone--transport" },
    { className: "lt-bone--date" },
    { className: "lt-bone--date" },
    { className: "lt-bone--transit", center: true },
    { className: "lt-bone--button", center: true },
  ],
  [
    { className: "lt-bone--id" },
    { className: "lt-bone--badge", center: true },
    { className: "lt-bone--badge", center: true },
    { className: "lt-bone--city-lg" },
    { className: "lt-bone--city-lg" },
    { className: "lt-bone--transport" },
    { className: "lt-bone--date" },
    { className: "lt-bone--date" },
    { className: "lt-bone--transit", center: true },
    { className: "lt-bone--button", center: true },
  ],
];

function getRowCells(index: number): RowCell[] {
  return ROW_PATTERNS[index % ROW_PATTERNS.length];
}

function LoadingOverlay() {
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
        <span>Cargando</span>
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

function TableSkeleton() {
  return (
    <div className="lt-table-wrapper">
      <div className="lt-table-scroll">
        <table className="lt-skeleton-table" aria-hidden="true">
          <thead>
            <tr>
              {HEADER_COLUMNS.map((col, i) => (
                <th
                  key={i}
                  className={`lt-skeleton-th${col.center ? " lt-skeleton-th--center" : ""}`}
                >
                  <span className={`lt-bone lt-bone--header ${col.className}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROW_COUNT }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {getRowCells(rowIndex).map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`lt-skeleton-td${cell.center ? " lt-skeleton-td--center" : ""}`}
                  >
                    <span className={`lt-bone ${cell.className}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lt-pagination" aria-hidden="true">
        <span className="lt-bone lt-bone--page-text" />
        <span className="lt-bone lt-bone--page-btn" />
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

export default function LoadingTips({ variant = "table" }: LoadingTipsProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      {variant === "financial" && <FinancialSkeleton />}
      {variant === "operational" && <OperationalSkeleton />}
      {variant === "table" && <TableSkeleton />}
    </div>
  );
}
