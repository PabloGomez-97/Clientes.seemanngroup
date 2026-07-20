export type ReviewAddonCardProps = {
  title: string;
  description: string;
  imageSrc: string;
  active: boolean;
  disabled?: boolean;
  badge?: string;
  detail?: string;
  warning?: string;
  onToggle: () => void;
};

export function ReviewAddonCard({
  title,
  description,
  imageSrc,
  active,
  disabled = false,
  badge,
  detail,
  warning,
  onToggle,
}: ReviewAddonCardProps) {
  return (
    <div className="col-md-6">
      <button
        type="button"
        className="w-100 h-100 border-0 bg-transparent p-0 text-start"
        disabled={disabled}
        onClick={() => {
          if (!disabled) onToggle();
        }}
        aria-pressed={active}
      >
        <div
          className="d-flex align-items-start gap-3 p-3 rounded border h-100 position-relative"
          style={{
            backgroundColor: "#fff",
            borderColor: active
              ? "rgba(35, 47, 62, 0.45)"
              : "var(--qa-border-color)",
            boxShadow: active
              ? "0 0 0 3px rgba(255, 98, 0, 0.1)"
              : "0 1px 4px rgba(0, 0, 0, 0.04)",
            opacity: disabled ? 0.65 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <div
            className="flex-shrink-0 rounded overflow-hidden d-flex align-items-center justify-content-center"
            style={{
              width: 56,
              height: 56,
              backgroundColor: "rgba(35, 47, 62, 0.05)",
            }}
          >
            <img
              src={imageSrc}
              alt={title}
              loading="lazy"
              style={{ width: 44, height: 44, objectFit: "contain" }}
            />
          </div>
          <div className="flex-grow-1 min-w-0 pe-4">
            <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
              <span className="fw-semibold">{title}</span>
              {badge && (
                <span className="qa-badge qa-badge-primary">{badge}</span>
              )}
            </div>
            {warning && <p className="text-warning small mb-1">{warning}</p>}
            <p className="small text-muted mb-1" style={{ lineHeight: 1.45 }}>
              {description}
            </p>
            {detail && (
              <span
                className="qa-badge qa-badge-primary"
                style={{ display: "inline-block" }}
              >
                {detail}
              </span>
            )}
          </div>
          <i
            className={`bi ${active ? "bi-check-circle-fill" : "bi-circle"} position-absolute`}
            style={{
              top: "0.85rem",
              right: "0.85rem",
              color: active ? "var(--qa-primary)" : "var(--qa-text-secondary)",
              fontSize: "1.1rem",
            }}
            aria-hidden
          />
        </div>
      </button>
    </div>
  );
}
