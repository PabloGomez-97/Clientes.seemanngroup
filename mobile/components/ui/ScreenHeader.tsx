import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
};

export default function ScreenHeader({ title, subtitle, right, onBack }: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={26} color={brand.navy} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 8,
  },
  backBtn: {
    marginLeft: -4,
    paddingVertical: 4,
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: brand.muted,
  },
});
