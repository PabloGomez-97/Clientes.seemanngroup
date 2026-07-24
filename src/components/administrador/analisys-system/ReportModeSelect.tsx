import { useTranslation } from "react-i18next";
import {
  type AppliedComparisonSuggestion,
  REPORT_MODE_CUSTOM_COMPARISON,
  REPORT_MODE_CUSTOM_RANGE,
  SUGGESTION_CATEGORY_LABEL_KEYS,
  SUGGESTION_CATEGORY_ORDER,
  type ComparisonSuggestion,
} from "./comparisonSuggestions";
import {
  C,
  inputStyle,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

type Props = {
  suggestions: ComparisonSuggestion[];
  activeSuggestion: AppliedComparisonSuggestion | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function ReportModeSelect({
  suggestions,
  activeSuggestion,
  value,
  onChange,
  disabled = false,
}: Props) {
  const { t } = useTranslation();

  const selectValue =
    value ||
    (activeSuggestion?.id === REPORT_MODE_CUSTOM_COMPARISON
      ? REPORT_MODE_CUSTOM_COMPARISON
      : activeSuggestion?.id) ||
    "";

  return (
    <div style={{ flex: "1 1 320px", minWidth: 240, maxWidth: 440 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: C.textMuted,
          marginBottom: 6,
        }}
      >
        {t("analisysSystem.suggestions.selectLabel")}
      </label>
      <select
        value={selectValue}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        style={{ ...inputStyle, width: "100%", maxWidth: "100%" }}
      >
        <option value="" disabled>
          {t("analisysSystem.suggestions.placeholder")}
        </option>
        <option value={REPORT_MODE_CUSTOM_RANGE}>
          {t("analisysSystem.suggestions.items.customRange")}
        </option>
        <option value={REPORT_MODE_CUSTOM_COMPARISON}>
          {t("analisysSystem.suggestions.items.customComparison")}
        </option>
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
    </div>
  );
}
