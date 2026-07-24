import { useEffect, useMemo, useState } from "react";
import {
  formatProfitColumnSummary,
  resolveEffectiveProfitMarkup,
  type IClientProfitOverrideFields,
  type IProfitMarkupConfig,
  type ProfitMode,
} from "@/types/profitMarkup";

const FONT = "var(--portal-font)";

const MODE_LABELS: Record<ProfitMode, string> = {
  air: "Aéreo",
  fcl: "FCL",
  lcl: "LCL",
};

type Props = {
  open: boolean;
  onClose: () => void;
  clientUsername: string;
  clientEmail: string;
  clientUserId: string;
  globalMarkup: IProfitMarkupConfig;
  override: IClientProfitOverrideFields | null;
  /** false mientras carga el listado de overrides — bloquea guardar */
  dataReady?: boolean;
  saving?: boolean;
  onSave: (fields: Partial<IClientProfitOverrideFields>) => Promise<unknown>;
  onClearMode: (mode: ProfitMode) => Promise<unknown>;
  onClearAll: () => Promise<unknown>;
};

function parsePositiveInt(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

export function ClientProfitEditModal({
  open,
  onClose,
  clientUsername,
  clientEmail,
  globalMarkup,
  override,
  dataReady = true,
  saving = false,
  onSave,
  onClearMode,
  onClearAll,
}: Props) {
  const [draft, setDraft] = useState<Record<ProfitMode, string>>({
    air: "",
    fcl: "",
    lcl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const actionsDisabled = saving || !dataReady;

  useEffect(() => {
    if (!open || !dataReady) return;
    setError(null);
    setDraft({
      air: override?.air != null ? String(override.air) : "",
      fcl: override?.fcl != null ? String(override.fcl) : "",
      lcl: override?.lcl != null ? String(override.lcl) : "",
    });
  }, [open, override, dataReady]);

  const preview = useMemo(() => {
    const fields: IClientProfitOverrideFields = {
      air: parsePositiveInt(draft.air),
      fcl: parsePositiveInt(draft.fcl),
      lcl: parsePositiveInt(draft.lcl),
    };
    // vacío = general (null); inválido se trata como vacío en preview
    return resolveEffectiveProfitMarkup(globalMarkup, {
      air: draft.air.trim() === "" ? null : fields.air,
      fcl: draft.fcl.trim() === "" ? null : fields.fcl,
      lcl: draft.lcl.trim() === "" ? null : fields.lcl,
    });
  }, [draft, globalMarkup]);

  if (!open) return null;

  const handleSave = async () => {
    if (!dataReady) {
      setError("Espera a que termine de cargar el profit del cliente.");
      return;
    }
    setError(null);
    const payload: Partial<IClientProfitOverrideFields> = {};
    for (const mode of ["air", "fcl", "lcl"] as ProfitMode[]) {
      const raw = draft[mode].trim();
      if (raw === "") {
        payload[mode] = null;
        continue;
      }
      const n = parsePositiveInt(raw);
      if (n === null) {
        setError(
          `${MODE_LABELS[mode]}: solo enteros positivos (≥ 1). Deja vacío para usar el general.`,
        );
        return;
      }
      payload[mode] = n;
    }
    try {
      await onSave(payload);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleClearMode = async (mode: ProfitMode) => {
    if (!dataReady) return;
    setError(null);
    try {
      await onClearMode(mode);
      setDraft((prev) => ({ ...prev, [mode]: "" }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleClearAll = async () => {
    if (!dataReady) return;
    setError(null);
    try {
      await onClearAll();
      setDraft({ air: "", fcl: "", lcl: "" });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(17, 24, 39, 0.45)",
        padding: 16,
        fontFamily: FONT,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f0f1f3",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
              Profit del cliente
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {clientUsername} · {clientEmail}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              color: "#9ca3af",
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Vacío = profit general. Solo enteros ≥ 1. General actual: A{" "}
            {globalMarkup.air}% · F {globalMarkup.fcl}% · L {globalMarkup.lcl}%.
          </p>

          {(["air", "fcl", "lcl"] as ProfitMode[]).map((mode) => (
            <div key={mode} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}
                >
                  {MODE_LABELS[mode]}
                </label>
                <button
                  type="button"
                  disabled={actionsDisabled || draft[mode].trim() === ""}
                  onClick={() => void handleClearMode(mode)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#9ca3af",
                    fontSize: 12,
                    cursor:
                      actionsDisabled || draft[mode].trim() === ""
                        ? "default"
                        : "pointer",
                    opacity:
                      actionsDisabled || draft[mode].trim() === "" ? 0.5 : 1,
                  }}
                >
                  Usar general
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft[mode]}
                  placeholder={`General (${globalMarkup[mode]}%)`}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [mode]: e.target.value }))
                  }
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: FONT,
                  }}
                />
                <span style={{ fontSize: 13, color: "#6b7280", width: 18 }}>
                  %
                </span>
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: "#f9fafb",
              borderRadius: 8,
              fontSize: 12,
              color: "#4b5563",
            }}
          >
            Efectivo: {formatProfitColumnSummary(preview)}
            <span style={{ color: "#9ca3af" }}> (·g = general)</span>
          </div>

          {!dataReady && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 10px",
                background: "#fff7ed",
                color: "#9a3412",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              Cargando profit del cliente… espera antes de guardar.
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 10px",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #f0f1f3",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() => void handleClearAll()}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fff",
              color: "#b91c1c",
              fontSize: 13,
              cursor: actionsDisabled ? "default" : "pointer",
              opacity: actionsDisabled ? 0.6 : 1,
              fontFamily: FONT,
            }}
          >
            Restaurar todos
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={() => void handleSave()}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent-color, #ff6200)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: actionsDisabled ? "default" : "pointer",
                opacity: actionsDisabled ? 0.6 : 1,
                fontFamily: FONT,
              }}
            >
              {saving ? "Guardando…" : !dataReady ? "Cargando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfitDirectoryCell({
  summary,
  hasCustom,
  onEdit,
  disabled = false,
  disabledReason,
}: {
  summary: string;
  hasCustom: boolean;
  onEdit: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span
        title={hasCustom ? "Tiene override personalizado" : "Profit general"}
        style={{
          fontSize: 11,
          color: hasCustom ? "#9a3412" : "#9ca3af",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {summary}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onEdit();
        }}
        title={disabled ? disabledReason || "No disponible" : "Editar profit"}
        style={{
          padding: "3px 8px",
          fontSize: 11,
          borderRadius: 6,
          border: "1px solid #e5e7eb",
          background: "#fff",
          color: disabled ? "#d1d5db" : "#4b5563",
          cursor: disabled ? "default" : "pointer",
          fontFamily: FONT,
        }}
      >
        Editar
      </button>
    </div>
  );
}
