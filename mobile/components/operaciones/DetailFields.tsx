import { StyleSheet, Text, View } from "react-native";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type DetailFieldProps = {
  label: string;
  value?: string | number | null;
  accent?: boolean;
};

function formatDetailValue(value?: string | number | null): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value.trim() || "-";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "-";
}

export function DetailField({ label, value, accent }: DetailFieldProps) {
  const display = formatDetailValue(value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>{display}</Text>
    </View>
  );
}

type DetailSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
    marginBottom: spacing.sm,
  },
  grid: {
    gap: spacing.sm,
  },
  field: {
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 14,
    color: brand.inkSecondary,
    lineHeight: 20,
  },
  valueAccent: {
    color: brand.primary,
    fontFamily: fonts.semiBold,
  },
});
