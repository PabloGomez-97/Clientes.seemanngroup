import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
};

export default function GerencialScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={22} color={brand.navy} />
      </Pressable>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right ?? <View style={{ width: 22 }} />}</View>
    </View>
  );
}

export function GerencialNotice({
  text,
  tone = "info",
}: {
  text: string;
  tone?: "info" | "warn" | "error";
}) {
  return (
    <View
      style={[
        styles.notice,
        tone === "warn" && styles.noticeWarn,
        tone === "error" && styles.noticeError,
      ]}
    >
      <Text
        style={[
          styles.noticeText,
          tone === "warn" && styles.noticeTextWarn,
          tone === "error" && styles.noticeTextError,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

export function GerencialPrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  right: { minWidth: 36, alignItems: "flex-end" },
  notice: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeWarn: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  noticeError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  noticeText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#1d4ed8",
  },
  noticeTextWarn: { color: "#b45309" },
  noticeTextError: { color: "#b91c1c" },
  primaryBtn: {
    backgroundColor: brand.navy,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
