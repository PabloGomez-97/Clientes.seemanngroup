import { StyleSheet, Text, View } from "react-native";
import { brand, radii } from "../../theme/brand";
import { fonts } from "../../theme/typography";

export type GerencialTableColumn = {
  key: string;
  label: string;
  flex?: number;
  align?: "left" | "right";
};

export type GerencialTableRow = Record<string, string | number>;

type Props = {
  columns: GerencialTableColumn[];
  rows: GerencialTableRow[];
  footer?: GerencialTableRow;
  emptyText?: string;
};

export default function GerencialSimpleTable({
  columns,
  rows,
  footer,
  emptyText = "Sin datos para mostrar.",
}: Props) {
  if (!rows.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[
              styles.headerCell,
              { flex: col.flex ?? 1 },
              col.align === "right" && styles.alignRight,
            ]}
            numberOfLines={1}
          >
            {col.label}
          </Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View
          key={`row-${index}`}
          style={[styles.row, index % 2 === 1 && styles.rowAlt]}
        >
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[
                styles.cell,
                { flex: col.flex ?? 1 },
                col.align === "right" && styles.alignRight,
              ]}
              numberOfLines={2}
            >
              {String(row[col.key] ?? "—")}
            </Text>
          ))}
        </View>
      ))}
      {footer ? (
        <View style={[styles.row, styles.footerRow]}>
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[
                styles.footerCell,
                { flex: col.flex ?? 1 },
                col.align === "right" && styles.alignRight,
              ]}
              numberOfLines={2}
            >
              {String(footer[col.key] ?? "—")}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: brand.surface,
  },
  header: {
    flexDirection: "row",
    backgroundColor: "#e8eef5",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  headerCell: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
  },
  rowAlt: {
    backgroundColor: brand.canvasAlt,
  },
  footerRow: {
    backgroundColor: "#e8eef5",
    borderTopWidth: 1,
    borderTopColor: brand.border,
  },
  cell: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.ink,
  },
  footerCell: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  alignRight: {
    textAlign: "right",
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: brand.muted,
    fontFamily: fonts.regular,
  },
});
