import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type OperacionesPaginationBarProps = {
  page: number;
  totalPages?: number;
  totalItems?: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  itemLabel?: string;
};

export default function OperacionesPaginationBar({
  page,
  totalPages,
  totalItems,
  hasPrevious,
  hasNext,
  loading = false,
  onPrevious,
  onNext,
  itemLabel = "operaciones",
}: OperacionesPaginationBarProps) {
  const pageLabel =
    totalPages != null
      ? `Página ${page} de ${totalPages}`
      : `Página ${page}`;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.button, !hasPrevious && styles.buttonDisabled]}
        onPress={onPrevious}
        disabled={!hasPrevious || loading}
      >
        <Ionicons
          name="chevron-back"
          size={18}
          color={hasPrevious ? brand.navy : brand.mutedLight}
        />
        <Text
          style={[styles.buttonText, !hasPrevious && styles.buttonTextDisabled]}
        >
          Anterior
        </Text>
      </Pressable>

      <View style={styles.meta}>
        <Text style={styles.pageText}>{pageLabel}</Text>
        {totalItems != null ? (
          <Text style={styles.countText}>
            {totalItems} {itemLabel}
          </Text>
        ) : null}
      </View>

      <Pressable
        style={[styles.button, !hasNext && styles.buttonDisabled]}
        onPress={onNext}
        disabled={!hasNext || loading}
      >
        <Text
          style={[styles.buttonText, !hasNext && styles.buttonTextDisabled]}
        >
          Siguiente
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={hasNext ? brand.navy : brand.mutedLight}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.navy,
  },
  buttonTextDisabled: {
    color: brand.mutedLight,
  },
  meta: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  pageText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  countText: {
    fontSize: 11,
    color: brand.muted,
  },
});
