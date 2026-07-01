import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StatusChipDef } from "../../../src/services/shipsgoTrackingLogic";
import { brand, radii } from "../../theme/brand";

type TrackingStatusStripProps = {
  chips: StatusChipDef[];
  activeKey: string | null;
  onToggle: (key: string) => void;
};

const TONE_COLORS = {
  transit: brand.navy,
  done: "#16a34a",
  delayed: "#dc2626",
  neutral: brand.muted,
};

export default function TrackingStatusStrip({
  chips,
  activeKey,
  onToggle,
}: TrackingStatusStripProps) {
  return (
    <View style={styles.wrap}>
      {chips.map((chip) => {
        const active = activeKey === chip.key;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onToggle(chip.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    TONE_COLORS[chip.tone as keyof typeof TONE_COLORS],
                },
              ]}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {chip.label}
            </Text>
            <Text style={[styles.count, active && styles.countActive]}>
              {chip.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
  },
  chipActive: {
    borderColor: brand.primary,
    backgroundColor: brand.primarySoft,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    color: brand.inkSecondary,
    fontWeight: "500",
  },
  labelActive: {
    color: brand.ink,
    fontWeight: "600",
  },
  count: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.muted,
  },
  countActive: {
    color: brand.primary,
  },
});
