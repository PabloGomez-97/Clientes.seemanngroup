import { useTranslation } from "react-i18next";
import {
  type AppliedComparisonSuggestion,
  SUGGESTION_CATEGORY_LABEL_KEYS,
  SUGGESTION_CATEGORY_ORDER,
  type ComparisonSuggestion,
} from "./comparisonSuggestions";
import {
  C,
  base,
  inputStyle,
  styles,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

type Props = {
  suggestions: ComparisonSuggestion[];
  activeSuggestion: AppliedComparisonSuggestion | null;
  onSelect: (suggestionId: string) => void;
  disabled?: boolean;
};

export default function QuickSuggestionsPanel({
  suggestions,
  activeSuggestion,
  onSelect,
  disabled = false,
}: Props) {
  const { t } = useTranslation();

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
      <div style={{ ...styles.label, marginBottom: 8 }}>
        {t("analisysSystem.suggestions.title")}
      </div>
      <select
        value={activeSuggestion?.id ?? ""}
        onChange={(event) => {
          const { value } = event.target;
          if (value) onSelect(value);
        }}
        disabled={disabled}
        style={{ ...inputStyle, width: "100%", maxWidth: "100%" }}
      >
        <option value="">{t("analisysSystem.suggestions.placeholder")}</option>
        {SUGGESTION_CATEGORY_ORDER.map((category) => {
          const items = suggestions.filter((item) => item.category === category);
          if (items.length === 0) return null;
          return (
            <optgroup key={category} label={t(SUGGESTION_CATEGORY_LABEL_KEYS[category])}>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.labelKey)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "8px 0 0", lineHeight: 1.5 }}>
        {t("analisysSystem.suggestions.lead")}
      </p>
    </div>
  );
}
