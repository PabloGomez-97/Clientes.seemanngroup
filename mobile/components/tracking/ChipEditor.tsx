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

type ChipEditorProps = {
  label: string;
  placeholder: string;
  values: string[];
  maxItems: number;
  onChange: (values: string[]) => void;
  keyboardType?: "default" | "email-address";
  validate?: (value: string) => boolean;
  suggestions?: string[];
};

export default function ChipEditor({
  label,
  placeholder,
  values,
  maxItems,
  onChange,
  keyboardType = "default",
  validate,
  suggestions = [],
}: ChipEditorProps) {
  const [draft, setDraft] = useState("");

  const addValue = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed) || values.length >= maxItems) {
      return;
    }
    if (validate && !validate(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  const addSuggestion = (value: string) => {
    if (values.includes(value) || values.length >= maxItems) return;
    onChange([...values, value]);
  };

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
          style={styles.input}
          onSubmitEditing={addValue}
        />
        <Pressable
          onPress={addValue}
          disabled={!draft.trim() || values.length >= maxItems}
          style={[styles.addButton, (!draft.trim() || values.length >= maxItems) && styles.addButtonDisabled]}
        >
          <Text style={styles.addButtonText}>Agregar</Text>
        </Pressable>
      </View>

      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions
            .filter((email) => !values.includes(email))
            .slice(0, 5)
            .map((email) => (
              <Pressable
                key={email}
                onPress={() => addSuggestion(email)}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionText}>{email}</Text>
              </Pressable>
            ))}
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
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  suggestionChip: {
    backgroundColor: brand.canvasAlt,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
