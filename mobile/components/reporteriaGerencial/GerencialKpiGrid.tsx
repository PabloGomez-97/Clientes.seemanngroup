import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

export type GerencialKpi = {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "positive" | "negative" | "accent";
};

type Props = {
  items: GerencialKpi[];
};

export default function GerencialKpiGrid({ items }: Props) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.card}>
          <Text style={styles.label}>{item.label}</Text>
          <Text
            style={[
              styles.value,
              item.tone === "positive" && styles.valuePositive,
              item.tone === "negative" && styles.valueNegative,
              item.tone === "accent" && styles.valueAccent,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {item.value}
          </Text>
          {item.sub ? <Text style={styles.sub}>{item.sub}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function GerencialDeltaText({
  label,
  current,
  previous,
  format = "number",
}: {
  label: string;
  current: number;
  previous: number;
  format?: "number" | "money" | "percent";
}) {
  const delta =
    previous === 0
      ? current === 0
        ? 0
        : null
      : ((current - previous) / Math.abs(previous)) * 100;
  const abs = current - previous;
  const tone =
    delta == null || delta === 0
      ? "default"
      : delta > 0
        ? "positive"
        : "negative";
  const fmtAbs =
    format === "money"
      ? abs.toLocaleString("es-CL", { maximumFractionDigits: 0 })
      : format === "percent"
        ? `${abs.toFixed(1)} pts`
        : abs.toLocaleString("es-CL");
  const pct =
    delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;

  return (
    <View style={styles.deltaRow}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <Text
        style={[
          styles.deltaValue,
          tone === "positive" && styles.valuePositive,
          tone === "negative" && styles.valueNegative,
        ]}
      >
        {fmtAbs} · {pct}
      </Text>
    </View>
  );
}

type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function GerencialChip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  value: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  valuePositive: { color: "#15803d" },
  valueNegative: { color: "#b91c1c" },
  valueAccent: { color: brand.primary },
  sub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  deltaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  deltaLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.ink,
  },
  deltaValue: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  chipActive: {
    backgroundColor: "#e8eef5",
    borderColor: brand.navy,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  chipTextActive: {
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
});
