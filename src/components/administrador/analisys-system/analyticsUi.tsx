import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { C, base, styles } from "@/components/administrador/reporteria/financiera/executiveReportingUi";

export type InsightTone = "neutral" | "positive" | "negative" | "warning";

export type InsightItem = {
  id: string;
  text: string;
  tone?: InsightTone;
};

const toneBg: Record<InsightTone, string> = {
  neutral: C.borderLight,
  positive: C.positiveLight,
  negative: C.negativeLight,
  warning: "#fffbeb",
};

const toneColor: Record<InsightTone, string> = {
  neutral: C.text,
  positive: C.positive,
  negative: C.negative,
  warning: C.warning,
};

export function AnalyticsSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ ...base, fontSize: 18, fontWeight: 700, color: C.secondary, margin: "0 0 6px" }}>
        {title}
      </h2>
      <p style={{ ...base, fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  accent,
  compact,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "positive" | "neutral";
  compact?: boolean;
}) {
  const borderColor =
    accent === "primary" ? C.primary : accent === "positive" ? C.positive : C.border;

  return (
    <div
      style={{
        ...styles.card,
        padding: compact ? "12px 14px" : "14px 16px",
        borderLeft: `3px solid ${borderColor}`,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div style={styles.label}>{label}</div>
      <div
        style={{
          ...styles.bigVal,
          fontSize: compact ? "clamp(14px, 1.8vw, 18px)" : "clamp(15px, 2.2vw, 22px)",
          lineHeight: 1.25,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
      {hint && <div style={styles.sub}>{hint}</div>}
    </div>
  );
}

export function ComparisonModeBanner({
  label,
  periodALabel,
  periodBLabel,
}: {
  label: string;
  periodALabel: string;
  periodBLabel: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: C.primaryLight,
        borderRadius: 6,
        marginBottom: 16,
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ ...base, fontSize: 13, fontWeight: 600, color: C.secondary, marginBottom: 10 }}>
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            ...styles.card,
            padding: "10px 12px",
            borderLeft: `4px solid ${C.primary}`,
            backgroundColor: C.white,
          }}
        >
          <div style={{ ...styles.label, marginBottom: 4 }}>
            {t("analisysSystem.analytics.periodComparison.periodA")}
          </div>
          <div style={{ ...base, fontSize: 14, fontWeight: 700, color: C.secondary }}>
            {periodALabel}
          </div>
        </div>
        <div
          style={{
            ...styles.card,
            padding: "10px 12px",
            borderLeft: `4px solid ${C.textMuted}`,
            backgroundColor: C.white,
          }}
        >
          <div style={{ ...styles.label, marginBottom: 4 }}>
            {t("analisysSystem.analytics.periodComparison.periodB")}
          </div>
          <div style={{ ...base, fontSize: 14, fontWeight: 700, color: C.secondary }}>
            {periodBLabel}
          </div>
        </div>
      </div>
      <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
        {t("analisysSystem.analytics.comparisonMode.periodLegend")}
      </p>
    </div>
  );
}

export function InsightPanel({
  title,
  items,
}: {
  title: string;
  items: InsightItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        ...styles.card,
        padding: 16,
        marginBottom: 20,
        backgroundColor: C.bg,
      }}
    >
      <div style={{ ...styles.sectionTitle, marginBottom: 12 }}>{title}</div>
      <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              ...base,
              fontSize: 13,
              lineHeight: 1.55,
              color: toneColor[item.tone ?? "neutral"],
              backgroundColor: toneBg[item.tone ?? "neutral"],
              padding: "8px 12px",
              borderRadius: 4,
              listStylePosition: "outside",
            }}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartGuide({ items }: { items: { color: string; label: string; description: string }[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 12,
        padding: "10px 14px",
        backgroundColor: C.bg,
        borderRadius: 6,
        border: `1px solid ${C.borderLight}`,
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", gap: 8, alignItems: "flex-start", minWidth: 200 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: item.color,
              flexShrink: 0,
              marginTop: 3,
            }}
          />
          <div>
            <div style={{ ...base, fontSize: 12, fontWeight: 600, color: C.secondary }}>{item.label}</div>
            <div style={{ ...base, fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShareBar({ pct, color = C.primary }: { pct: number; color?: string }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      <div
        style={{
          width: 72,
          height: 6,
          backgroundColor: C.borderLight,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${width}%`, height: "100%", backgroundColor: color, borderRadius: 3 }} />
      </div>
      <span style={{ ...base, fontSize: 12, minWidth: 44, textAlign: "right" }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

type SortDir = "asc" | "desc";

export function SortableTh({
  label,
  active,
  direction,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const thStyle: CSSProperties = {
    ...styles.th,
    textAlign: align,
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <th style={thStyle} onClick={onClick} title={label}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {label}
        <span style={{ fontSize: 10, color: active ? C.primary : C.textLight }}>
          {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </span>
    </th>
  );
}

export function sortRows<T>(
  rows: T[],
  key: keyof T,
  direction: SortDir,
  compare?: (a: T, b: T) => number,
): T[] {
  const sorted = [...rows].sort((a, b) => {
    if (compare) return compare(a, b);
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv), "es");
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

export function computeMarginPct(income: number, profit: number): number | null {
  if (income <= 0) return null;
  return Math.round((profit / income) * 1000) / 10;
}
