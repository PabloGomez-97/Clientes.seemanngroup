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
  initialRange?: DateRange;
  onClose: () => void;
  onApply: (range: DateRange) => void;
};

function isValidRange(range: DateRange): boolean {
  return Boolean(range.startDate && range.endDate && range.startDate <= range.endDate);
}

export default function CustomRangeModal({ initialRange, onClose, onApply }: Props) {
  const { t } = useTranslation();
  const [range, setRange] = useState<DateRange>(
    initialRange ?? { startDate: "", endDate: "" },
  );
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    if (!isValidRange(range)) {
      setError(t("analisysSystem.suggestions.customRangeInvalid"));
      return;
    }
    setError(null);
    onApply(range);
  };

  return (
    <AnalisysSimpleModal
      title={t("analisysSystem.suggestions.customRangeTitle")}
      description={t("analisysSystem.suggestions.customRangeLead")}
      onClose={onClose}
      maxWidth={480}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div>
            <label style={styles.label}>{t("analisysSystem.filters.from")}</label>
            <input
              type="date"
              value={range.startDate}
              onChange={(event) =>
                setRange((prev) => ({ ...prev, startDate: event.target.value }))
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={styles.label}>{t("analisysSystem.filters.to")}</label>
            <input
              type="date"
              value={range.endDate}
              onChange={(event) =>
                setRange((prev) => ({ ...prev, endDate: event.target.value }))
              }
              style={inputStyle}
            />
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
            {t("analisysSystem.actions.generate")}
          </button>
        </div>
      </div>
    </AnalisysSimpleModal>
  );
}
