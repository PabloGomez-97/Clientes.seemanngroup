import { useState } from "react";
import { useTranslation } from "react-i18next";
import AnalisysSimpleModal from "./AnalisysSimpleModal";
import type { DateRange } from "./comparisonSuggestions";
import {
  C,
  base,
  btnOutline,
  btnPrimary,
  inputStyle,
  styles,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

type Props = {
  initialPeriodA?: DateRange;
  initialPeriodB?: DateRange;
  onClose: () => void;
  onApply: (periodA: DateRange, periodB: DateRange) => void;
};

function isValidRange(range: DateRange): boolean {
  return Boolean(range.startDate && range.endDate && range.startDate <= range.endDate);
}

export default function CustomComparisonModal({
  initialPeriodA,
  initialPeriodB,
  onClose,
  onApply,
}: Props) {
  const { t } = useTranslation();
  const [periodA, setPeriodA] = useState<DateRange>(
    initialPeriodA ?? { startDate: "", endDate: "" },
  );
  const [periodB, setPeriodB] = useState<DateRange>(
    initialPeriodB ?? { startDate: "", endDate: "" },
  );
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    if (!isValidRange(periodA) || !isValidRange(periodB)) {
      setError(t("analisysSystem.suggestions.customComparisonInvalid"));
      return;
    }
    setError(null);
    onApply(periodA, periodB);
  };

  return (
    <AnalisysSimpleModal
      title={t("analisysSystem.suggestions.customComparisonTitle")}
      description={t("analisysSystem.suggestions.customComparisonLead")}
      onClose={onClose}
      maxWidth={640}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ ...styles.sectionTitle, marginBottom: 4 }}>
            {t("analisysSystem.analytics.periodComparison.periodA")}
          </div>
          <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "0 0 10px" }}>
            {t("analisysSystem.analytics.periodComparison.periodAHint")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div>
              <label style={styles.label}>{t("analisysSystem.filters.from")}</label>
              <input
                type="date"
                value={periodA.startDate}
                onChange={(event) =>
                  setPeriodA((prev) => ({ ...prev, startDate: event.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={styles.label}>{t("analisysSystem.filters.to")}</label>
              <input
                type="date"
                value={periodA.endDate}
                onChange={(event) =>
                  setPeriodA((prev) => ({ ...prev, endDate: event.target.value }))
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div>
          <div style={{ ...styles.sectionTitle, marginBottom: 4 }}>
            {t("analisysSystem.analytics.periodComparison.periodB")}
          </div>
          <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "0 0 10px" }}>
            {t("analisysSystem.analytics.periodComparison.periodBHint")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div>
              <label style={styles.label}>{t("analisysSystem.filters.from")}</label>
              <input
                type="date"
                value={periodB.startDate}
                onChange={(event) =>
                  setPeriodB((prev) => ({ ...prev, startDate: event.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={styles.label}>{t("analisysSystem.filters.to")}</label>
              <input
                type="date"
                value={periodB.endDate}
                onChange={(event) =>
                  setPeriodB((prev) => ({ ...prev, endDate: event.target.value }))
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {error && (
          <p style={{ ...base, fontSize: 13, color: C.negative, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" style={btnOutline} onClick={onClose}>
            {t("analisysSystem.actions.cancel")}
          </button>
          <button type="button" style={btnPrimary} onClick={handleApply}>
            {t("analisysSystem.suggestions.customComparisonApply")}
          </button>
        </div>
      </div>
    </AnalisysSimpleModal>
  );
}
