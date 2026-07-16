import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StatusChipDef } from "../../../src/services/shipsgoTrackingLogic";
import { brand } from "../../theme/brand";
import { fonts } from "../../theme/typography";

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
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
  },
  chipActive: {
    borderColor: brand.primaryBorder,
    backgroundColor: brand.primarySoft,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    color: brand.inkSecondary,
    fontFamily: fonts.medium,
  },
  labelActive: {
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
  count: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.muted,
  },
  countActive: {
    color: brand.primary,
  },
});
