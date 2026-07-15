import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export default function ScreenHeader({ title, subtitle, right }: Props) {
  return (
    <View style={styles.header}>
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
    gap: 12,
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
