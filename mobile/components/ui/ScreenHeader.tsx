import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={22} color={brand.ink} />
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
    gap: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
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
