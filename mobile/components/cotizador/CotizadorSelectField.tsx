import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

export type CotizadorOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  options: CotizadorOption[];
  onChange: (option: CotizadorOption) => void;
  disabled?: boolean;
  searchable?: boolean;
};

export default function CotizadorSelectField({
  label,
  value,
  placeholder = "Seleccionar",
  options,
  onChange,
  disabled,
  searchable = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel =
    options.find((o) => o.value === value)?.label || value || placeholder;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.box, disabled && styles.boxDisabled]}
        disabled={disabled}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        <Text
          style={[styles.value, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={brand.muted} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={brand.navy} />
              </Pressable>
            </View>
            {searchable ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar…"
                placeholderTextColor={brand.mutedLight}
                style={styles.search}
                autoCorrect={false}
              />
            ) : null}
            <ScrollView contentContainerStyle={styles.list}>
              {filtered.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={brand.navy} />
                    ) : null}
                  </Pressable>
                );
              })}
              {filtered.length === 0 ? (
                <Text style={styles.empty}>Sin resultados</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  box: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    backgroundColor: brand.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  boxDisabled: { opacity: 0.5 },
  value: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  placeholder: { color: brand.muted },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "75%",
    backgroundColor: brand.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: 6,
    paddingBottom: spacing.lg,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: brand.canvas,
  },
  optionActive: { backgroundColor: "#E8F1FB" },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  optionTextActive: { fontFamily: fonts.semiBold },
  empty: {
    textAlign: "center",
    color: brand.muted,
    paddingVertical: 20,
    fontFamily: fonts.regular,
  },
});
