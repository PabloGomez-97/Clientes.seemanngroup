import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { brand } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
};

export default function SectionHeader({
  title,
  subtitle,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.accent} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  accent: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: brand.primary,
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: brand.muted,
    lineHeight: 18,
  },
});
