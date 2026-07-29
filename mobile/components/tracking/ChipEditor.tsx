import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, radii } from "../../theme/brand";

export type ChipAddResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

type ChipEditorProps = {
  label: string;
  placeholder: string;
  values: string[];
  maxItems: number;
  onChange: (values: string[]) => void;
  keyboardType?: "default" | "email-address";
  /** Validación simple (p. ej. email). Se usa si no hay validateAdd. */
  validate?: (value: string) => boolean;
  /**
   * Validación completa al agregar (manual o sugerencia).
   * Preferible para tags ShipsGo (límites, duplicados case-insensitive).
   */
  validateAdd?: (values: string[], candidate: string) => ChipAddResult;
  suggestions?: string[];
  maxLength?: number;
  onError?: (message: string | null) => void;
  suggestionsTitle?: string;
};

function normalizeCompare(value: string): string {
  return value.trim().toLowerCase();
}

export default function ChipEditor({
  label,
  placeholder,
  values,
  maxItems,
  onChange,
  keyboardType = "default",
  validate,
  validateAdd,
  suggestions = [],
  maxLength,
  onError,
  suggestionsTitle,
}: ChipEditorProps) {
  const [draft, setDraft] = useState("");

  const tryAdd = (candidate: string) => {
    if (validateAdd) {
      const result = validateAdd(values, candidate);
      if (!result.ok) {
        onError?.(result.error);
        return;
      }
      onError?.(null);
      onChange([...values, result.value]);
      setDraft("");
      return;
    }

    const trimmed = candidate.trim();
    if (!trimmed) return;

    if (maxLength && trimmed.length > maxLength) {
      onError?.(
        `Cada valor puede tener máximo ${maxLength} caracteres.`,
      );
      return;
    }

    if (
      values.some(
        (item) => normalizeCompare(item) === normalizeCompare(trimmed),
      )
    ) {
      onError?.("Ese valor ya fue agregado.");
      return;
    }

    if (values.length >= maxItems) {
      onError?.(`Máximo ${maxItems} valores permitidos.`);
      return;
    }

    if (validate && !validate(trimmed)) {
      onError?.("El valor ingresado no es válido.");
      return;
    }

    onError?.(null);
    onChange([...values, trimmed]);
    setDraft("");
  };

  const addValue = () => {
    tryAdd(draft);
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  const selectedSet = new Set(values.map((value) => normalizeCompare(value)));
  const visibleSuggestions = suggestions
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => !maxLength || value.length <= maxLength)
    .filter((value) => !selectedSet.has(normalizeCompare(value)));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label} ({values.length}/{maxItems})
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={brand.mutedLight}
          keyboardType={keyboardType}
          autoCapitalize="none"
          maxLength={maxLength}
          style={styles.input}
          onSubmitEditing={addValue}
        />
        <Pressable
          onPress={addValue}
          disabled={!draft.trim() || values.length >= maxItems}
          style={[
            styles.addButton,
            (!draft.trim() || values.length >= maxItems) &&
              styles.addButtonDisabled,
          ]}
        >
          <Text style={styles.addButtonText}>Agregar</Text>
        </Pressable>
      </View>

      {visibleSuggestions.length > 0 ? (
        <View style={styles.suggestionsWrap}>
          {suggestionsTitle ? (
            <Text style={styles.suggestionsTitle}>{suggestionsTitle}</Text>
          ) : null}
          <View style={styles.suggestions}>
            {visibleSuggestions.slice(0, 5).map((value) => (
              <Pressable
                key={value}
                onPress={() => tryAdd(value)}
                disabled={values.length >= maxItems}
                style={[
                  styles.suggestionChip,
                  values.length >= maxItems && styles.suggestionChipDisabled,
                ]}
              >
                <Text style={styles.suggestionText}>+ {value}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.chips}>
        {values.map((value) => (
          <View key={value} style={styles.chip}>
            <Text style={styles.chipText}>{value}</Text>
            <Pressable onPress={() => removeValue(value)} hitSlop={8}>
              <Ionicons name="close" size={14} color={brand.muted} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.inkSecondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: brand.ink,
  },
  addButton: {
    backgroundColor: brand.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#ccc",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  suggestionsWrap: {
    marginTop: 10,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: brand.muted,
    marginBottom: 8,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: brand.canvasAlt,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionChipDisabled: {
    opacity: 0.5,
  },
  suggestionText: {
    fontSize: 12,
    color: brand.inkSecondary,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: brand.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    color: brand.inkSecondary,
  },
});
