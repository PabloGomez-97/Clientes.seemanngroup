import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import {
  formatMetric,
  type OperacionCommodity,
} from "../../services/operacionDetailLogic";
import { DetailField, DetailSection } from "./DetailFields";

type ModeChip = "Aéreo" | "Marítimo" | "Terrestre";

type OperacionHeroProps = {
  title: string;
  routeLabel: string;
  mode: ModeChip;
  tracked?: boolean;
};

export function OperacionHero({
  title,
  routeLabel,
  mode,
  tracked,
}: OperacionHeroProps) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.heroRoute} numberOfLines={2}>
            {routeLabel}
          </Text>
        </View>
        <View style={styles.chipCol}>
          <View style={styles.modeChip}>
            <Text style={styles.modeChipText}>{mode}</Text>
          </View>
          {tracked ? (
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>En seguimiento</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type ActionButton = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
};

type OperacionActionsProps = {
  actions: ActionButton[];
};

export function OperacionActions({ actions }: OperacionActionsProps) {
  if (actions.length === 0) return null;
  return (
    <View style={styles.actions}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          style={[
            styles.actionBtn,
            action.primary ? styles.actionPrimary : styles.actionSecondary,
            actions.length === 1 && styles.actionFull,
          ]}
          onPress={action.onPress}
        >
          <Ionicons
            name={action.icon}
            size={16}
            color={action.primary ? "#fff" : brand.navy}
          />
          <Text
            style={[
              styles.actionText,
              action.primary ? styles.actionTextPrimary : styles.actionTextSecondary,
            ]}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

type CommoditiesProps = {
  items: OperacionCommodity[];
};

export function OperacionCommoditiesSection({ items }: CommoditiesProps) {
  if (items.length === 0) return null;

  return (
    <DetailSection title="Detalle por ítem">
      {items.map((item, index) => {
        const meta = [
          item.pieces != null ? `${item.pieces} pzas` : null,
          formatMetric(item.totalWeightValue, "kg"),
          formatMetric(item.totalVolumeValue, "m³"),
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <View
            key={`${item.description ?? "item"}-${index}`}
            style={[styles.itemCard, index > 0 && styles.itemCardSpaced]}
          >
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.description?.trim() || `Ítem ${index + 1}`}
            </Text>
            {meta ? <Text style={styles.itemMeta}>{meta}</Text> : null}
            {item.packageType?.description ? (
              <Text style={styles.itemMeta}>
                Empaque: {item.packageType.description}
              </Text>
            ) : null}
            {item.purchaseOrderNumber || item.invoiceNumber ? (
              <Text style={styles.itemMeta}>
                {[
                  item.purchaseOrderNumber
                    ? `PO ${item.purchaseOrderNumber}`
                    : null,
                  item.invoiceNumber ? `Fact. ${item.invoiceNumber}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
          </View>
        );
      })}
    </DetailSection>
  );
}

export function OperacionNotesSection({ notes }: { notes?: string | null }) {
  const value = notes?.trim();
  if (!value) return null;
  return (
    <DetailSection title="Notas">
      <DetailField label="Notas" value={value} />
    </DetailSection>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  heroRoute: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  chipCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  modeChip: {
    backgroundColor: brand.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeChipText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: brand.primaryDark,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#eff4ff",
    borderColor: "#c7d7fc",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2f6fed",
  },
  liveText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: "#1d4ed8",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionFull: {
    flex: 1,
  },
  actionPrimary: {
    backgroundColor: brand.navy,
  },
  actionSecondary: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
  },
  actionText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  actionTextPrimary: {
    color: "#fff",
  },
  actionTextSecondary: {
    color: brand.navy,
  },
  itemCard: {
    borderLeftWidth: 2,
    borderLeftColor: brand.navy,
    paddingLeft: 10,
  },
  itemCardSpaced: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
  },
  itemTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
});
