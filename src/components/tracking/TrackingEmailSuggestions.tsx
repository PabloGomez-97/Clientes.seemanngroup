import {
  addUniqueEmail,
  normalizeEmail,
} from "../../services/trackingEmailPreferences";

interface TrackingEmailSuggestionsProps {
  savedEmails: string[];
  selectedEmails: string[];
  onSelectEmail: (email: string) => void;
  onAddAll?: () => void;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
}

function TrackingEmailSuggestions({
  savedEmails,
  selectedEmails,
  onSelectEmail,
  onAddAll,
  disabled = false,
  title = "Correos guardados para esta cuenta",
}: TrackingEmailSuggestionsProps) {
  if (savedEmails.length === 0) {
    return null;
  }

  const selectedSet = new Set(
    selectedEmails.filter(Boolean).map((email) => normalizeEmail(email)),
  );
  const allSelected = savedEmails.every((email) =>
    selectedSet.has(normalizeEmail(email)),
  );

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      ></div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {savedEmails.map((email) => {
          const isSelected = selectedSet.has(normalizeEmail(email));

          return (
            <button
              key={email}
              type="button"
              onClick={() => onSelectEmail(email)}
              disabled={disabled || isSelected}
              style={{
                border: `1px solid ${isSelected ? "#bfdbfe" : "#d1d5db"}`,
                background: isSelected ? "#eff6ff" : "#ffffff",
                color: isSelected ? "#1d4ed8" : "#374151",
                borderRadius: 999,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 500,
                cursor: disabled || isSelected ? "not-allowed" : "pointer",
              }}
            >
              {isSelected ? "Agregado: " : "+ "}
              {email}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TrackingEmailSuggestions;
