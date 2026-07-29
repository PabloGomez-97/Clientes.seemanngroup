interface TrackingTagSuggestionsProps {
  suggestions: string[];
  selectedTags: string[];
  onSelectTag: (tag: string) => void;
  disabled?: boolean;
  maxTags?: number;
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function TrackingTagSuggestions({
  suggestions,
  selectedTags,
  onSelectTag,
  disabled = false,
  maxTags = 10,
}: TrackingTagSuggestionsProps) {
  const selectedSet = new Set(
    selectedTags.filter(Boolean).map((tag) => normalizeTag(tag)),
  );

  const visibleSuggestions = Array.from(
    new Set(
      suggestions
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => !selectedSet.has(normalizeTag(value))),
    ),
  );

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const atLimit = selectedTags.length >= maxTags;

  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 4,
        padding: 12,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 8,
        }}
      >
        Sugerencias desde Referencia Cliente
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {visibleSuggestions.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onSelectTag(tag)}
            disabled={disabled || atLimit}
            style={{
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 500,
              cursor: disabled || atLimit ? "not-allowed" : "pointer",
              opacity: disabled || atLimit ? 0.6 : 1,
            }}
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TrackingTagSuggestions;
