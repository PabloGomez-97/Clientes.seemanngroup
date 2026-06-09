// Design system compartido — Reportería de Ejecutivos (Seemann Group)
import type { CSSProperties, ReactNode } from "react";
import {
  PERIOD_PRESET_LABELS,
  type PeriodPreset,
} from "./quoteUtils";

export const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const C = {
  primary: "#ff6200",
  primaryLight: "#fff7ed",
  secondary: "#1a1a1a",
  text: "#111827",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  bg: "#f8f9fa",
  white: "#ffffff",
  positive: "#059669",
  positiveLight: "#ecfdf5",
  negative: "#dc2626",
  negativeLight: "#fef2f2",
  warning: "#d97706",
};

export const base: CSSProperties = { fontFamily: FONT };

export const styles = {
  card: {
    ...base,
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
  } as CSSProperties,
  cardPad: {
    ...base,
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: 20,
  } as CSSProperties,
  label: {
    ...base,
    fontSize: 11,
    fontWeight: 600,
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 4,
  } as CSSProperties,
  bigVal: {
    ...base,
    fontSize: 26,
    fontWeight: 700,
    color: C.secondary,
    lineHeight: 1.2,
  } as CSSProperties,
  sub: {
    ...base,
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
  } as CSSProperties,
  th: {
    ...base,
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    borderBottom: `2px solid ${C.border}`,
    whiteSpace: "nowrap" as const,
    backgroundColor: C.bg,
  } as CSSProperties,
  td: {
    ...base,
    padding: "10px 12px",
    fontSize: 13,
    color: C.text,
    borderBottom: `1px solid ${C.borderLight}`,
  } as CSSProperties,
  sectionTitle: {
    ...base,
    fontSize: 13,
    fontWeight: 600,
    color: C.secondary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 0,
  } as CSSProperties,
};

export const btnPrimary: CSSProperties = {
  ...base,
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 20px",
  borderRadius: 4,
  border: "none",
  backgroundColor: C.primary,
  color: C.white,
  cursor: "pointer",
  height: 38,
  transition: "opacity 0.15s",
};

export const btnOutline: CSSProperties = {
  ...base,
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 20px",
  borderRadius: 4,
  border: `1px solid ${C.border}`,
  backgroundColor: C.white,
  color: C.text,
  cursor: "pointer",
  height: 38,
  transition: "all 0.15s",
};

export const inputStyle: CSSProperties = {
  ...base,
  fontSize: 13,
  padding: "8px 12px",
  borderRadius: 4,
  border: `1px solid ${C.border}`,
  backgroundColor: C.white,
  color: C.text,
  height: 38,
  width: "100%",
  outline: "none",
};

export const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: "auto" as const,
};

export const tabBase: CSSProperties = {
  ...base,
  padding: "12px 24px",
  fontSize: 13,
  fontWeight: 600,
  border: "none",
  backgroundColor: "transparent",
  cursor: "pointer",
  borderBottom: "2px solid transparent",
  transition: "all 0.15s",
  color: C.textMuted,
};

export const tabActive: CSSProperties = {
  ...tabBase,
  color: C.primary,
  borderBottomColor: C.primary,
};

export const pageWrap: CSSProperties = {
  ...base,
  backgroundColor: C.bg,
  minHeight: "100vh",
  padding: "24px 32px",
};

export const Metric = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) => (
  <div style={styles.cardPad}>
    <div style={styles.label}>{label}</div>
    <div style={{ ...styles.bigVal, color: color || C.secondary }}>{value}</div>
    {sub && <div style={styles.sub}>{sub}</div>}
  </div>
);

export const PeriodPresetSelect = ({
  value,
  onChange,
}: {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset) => void;
}) => (
  <div style={{ flex: "0 1 180px" }}>
    <label style={styles.label}>Período</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PeriodPreset)}
      style={selectStyle}
    >
      {(Object.keys(PERIOD_PRESET_LABELS) as PeriodPreset[]).map((preset) => (
        <option key={preset} value={preset}>
          {PERIOD_PRESET_LABELS[preset]}
        </option>
      ))}
    </select>
  </div>
);

export const DataSourceBanner = ({
  children,
}: {
  children: ReactNode;
}) => (
  <div
    style={{
      ...base,
      padding: "10px 16px",
      backgroundColor: C.primaryLight,
      border: "1px solid #fed7aa",
      borderRadius: 6,
      fontSize: 12,
      color: C.textMuted,
      marginBottom: 16,
    }}
  >
    {children}
  </div>
);

export const EmptyState = ({ title, sub }: { title: string; sub: string }) => (
  <div style={{ ...styles.cardPad, padding: "60px 24px", textAlign: "center" }}>
    <div
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: C.secondary,
        marginBottom: 6,
        ...base,
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: 13, color: C.textMuted, ...base }}>{sub}</div>
  </div>
);

export const ErrorBanner = ({ message }: { message: string }) => (
  <div
    style={{
      padding: "14px 20px",
      backgroundColor: C.negativeLight,
      border: "1px solid #fecaca",
      borderRadius: 6,
      color: C.negative,
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 20,
      ...base,
    }}
  >
    {message}
  </div>
);

export const InvoiceStatusDot = ({ status }: { status: string }) => {
  const color = status === "Posted" ? C.positive : C.warning;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...base }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 12, color: C.textMuted }}>{status}</span>
    </span>
  );
};

export const StatusBar = ({
  invoiced,
  posted,
  total,
}: {
  invoiced: number;
  posted: number;
  total: number;
}) => {
  if (total === 0) return null;
  const items = [
    {
      label: "Invoiced",
      count: invoiced,
      pct: (invoiced / total) * 100,
      color: C.warning,
    },
    {
      label: "Posted",
      count: posted,
      pct: (posted / total) * 100,
      color: C.positive,
    },
  ].filter((it) => it.count > 0);

  return (
    <div style={styles.cardPad}>
      <div style={styles.label}>Distribución por Status</div>
      <div
        style={{
          display: "flex",
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: C.borderLight,
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        {items.map((it) => (
          <div
            key={it.label}
            style={{
              width: `${it.pct}%`,
              backgroundColor: it.color,
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", ...base }}>
        {items.map((it) => (
          <div
            key={it.label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: it.color,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 12, color: C.textMuted, ...base }}>
              {it.label}
            </span>
            <span
              style={{ fontSize: 13, fontWeight: 600, color: C.text, ...base }}
            >
              {it.count}
            </span>
            <span style={{ fontSize: 11, color: C.textLight, ...base }}>
              ({it.pct.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSection = ({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      ...styles.card,
      marginBottom: 20,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        padding: "14px 20px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={styles.sectionTitle}>{title}</div>
    </div>
    {children}
  </div>
);

export const SortableTh = ({
  label,
  align = "left",
  active,
  direction,
  onClick,
}: {
  label: string;
  align?: "left" | "center" | "right";
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) => (
  <th
    onClick={onClick}
    style={{
      ...styles.th,
      textAlign: align,
      cursor: "pointer",
      userSelect: "none",
    }}
  >
    {label}
    {active ? (direction === "asc" ? " ▲" : " ▼") : ""}
  </th>
);

// ════════════════════════════════════════════
// SKELETON LOADING
// ════════════════════════════════════════════
const SKELETON_KEYFRAMES = `
@keyframes execReportSkeletonPulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.9; }
}
`;

const skAnim: CSSProperties = {
  animation: "execReportSkeletonPulse 1.4s ease-in-out infinite",
};

const Sk = ({
  width = "100%",
  height = 14,
  style,
}: {
  width?: string | number;
  height?: number;
  style?: CSSProperties;
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: 4,
      backgroundColor: C.borderLight,
      ...skAnim,
      ...style,
    }}
  />
);

const SkeletonStyles = () => <style>{SKELETON_KEYFRAMES}</style>;

const SkeletonBanner = () => (
  <div
    style={{
      padding: "10px 16px",
      backgroundColor: C.primaryLight,
      border: "1px solid #fed7aa",
      borderRadius: 6,
      marginBottom: 16,
    }}
  >
    <Sk width="72%" height={12} style={{ marginBottom: 8 }} />
    <Sk width="55%" height={12} />
  </div>
);

const SkeletonMetrics = ({ count = 5 }: { count?: number }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
      marginBottom: 20,
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={styles.cardPad}>
        <Sk width="60%" height={10} style={{ marginBottom: 12 }} />
        <Sk width="45%" height={26} style={{ marginBottom: 8 }} />
        <Sk width="80%" height={10} />
      </div>
    ))}
  </div>
);

const SkeletonDistributionBar = () => (
  <div style={{ ...styles.cardPad, marginBottom: 20 }}>
    <Sk width="40%" height={10} style={{ marginBottom: 14 }} />
    <Sk width="100%" height={6} style={{ borderRadius: 3, marginBottom: 14 }} />
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {[1, 2, 3].map((i) => (
        <Sk key={i} width={90} height={12} />
      ))}
    </div>
  </div>
);

const SkeletonTableBlock = ({
  titleWidth = "35%",
  columns = 6,
  rows = 4,
}: {
  titleWidth?: string;
  columns?: number;
  rows?: number;
}) => (
  <div style={{ ...styles.card, marginBottom: 20, overflow: "hidden" }}>
    <div
      style={{
        padding: "14px 20px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <Sk width={titleWidth} height={12} />
    </div>
    <div style={{ padding: "12px 16px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 12,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: `2px solid ${C.border}`,
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Sk key={i} height={10} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 12,
            marginBottom: 12,
          }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Sk
              key={c}
              height={12}
              width={c === 0 ? "85%" : c === columns - 1 ? "60%" : "70%"}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const SkeletonChartsRow = () => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: 12,
      marginBottom: 20,
    }}
  >
    <div style={{ ...styles.cardPad, padding: 16 }}>
      <Sk width="45%" height={10} style={{ marginBottom: 16 }} />
      <div
        style={{
          height: 260,
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          paddingTop: 20,
        }}
      >
        {[55, 80, 45, 70, 60, 90, 50].map((h, i) => (
          <Sk
            key={i}
            width="100%"
            height={h}
            style={{ flex: 1, borderRadius: 3 }}
          />
        ))}
      </div>
    </div>
    <div
      style={{
        ...styles.cardPad,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Sk width="30%" height={10} style={{ marginBottom: 16, alignSelf: "flex-start" }} />
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          border: `24px solid ${C.borderLight}`,
          marginBottom: 20,
          ...skAnim,
        }}
      />
      <div style={{ display: "flex", gap: 16 }}>
        <Sk width={70} height={10} />
        <Sk width={70} height={10} />
      </div>
    </div>
  </div>
);

const SkeletonChartWide = () => (
  <div style={{ ...styles.cardPad, padding: 16, marginBottom: 20 }}>
    <Sk width="40%" height={10} style={{ marginBottom: 16 }} />
    <div
      style={{
        height: 280,
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        paddingTop: 20,
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <Sk
          key={i}
          width="100%"
          height={40 + (i % 4) * 25}
          style={{ flex: 1, borderRadius: 3 }}
        />
      ))}
    </div>
  </div>
);

const SkeletonDetailGrid = () => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 320px",
      gap: 12,
      marginBottom: 20,
    }}
  >
    <SkeletonTableBlock titleWidth="50%" columns={7} rows={6} />
    <SkeletonTableBlock titleWidth="55%" columns={4} rows={5} />
  </div>
);

/** Facturación — Análisis Individual */
export const InvoiceIndividualSkeleton = () => (
  <>
    <SkeletonStyles />
    <SkeletonBanner />
    <SkeletonMetrics count={5} />
    <SkeletonDistributionBar />
    <SkeletonTableBlock titleWidth="30%" columns={8} rows={3} />
    <SkeletonChartsRow />
    <SkeletonDetailGrid />
  </>
);

/** Cotizaciones — Análisis Individual */
export const QuotesIndividualSkeleton = () => (
  <>
    <SkeletonStyles />
    <SkeletonBanner />
    <SkeletonMetrics count={5} />
    <SkeletonDistributionBar />
    <SkeletonTableBlock titleWidth="45%" columns={6} rows={2} />
    <SkeletonTableBlock titleWidth="35%" columns={11} rows={2} />
    <SkeletonDetailGrid />
  </>
);

/** Análisis Comparativo */
export const ComparativeSkeleton = () => (
  <>
    <SkeletonStyles />
    <SkeletonBanner />
    <SkeletonMetrics count={5} />
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
      <Sk width={100} height={38} style={{ borderRadius: 4 }} />
    </div>
    <SkeletonChartWide />
    <SkeletonTableBlock titleWidth="40%" columns={8} rows={8} />
  </>
);

/** Comparación Doble */
export const DoubleComparisonSkeleton = () => (
  <>
    <SkeletonStyles />
    <SkeletonBanner />
    <SkeletonTableBlock titleWidth="50%" columns={4} rows={8} />
    <SkeletonChartWide />
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}
    >
      <SkeletonMetrics count={3} />
      <SkeletonMetrics count={3} />
    </div>
  </>
);
