import { useEffect, useMemo, useState } from "react";
import { useTrackingEmailPreferences } from "../../hooks/useTrackingEmailPreferences";
import {
  isValidTrackingEmail,
  MAX_SAVED_TRACKING_EMAILS,
  normalizeEmail,
} from "../../services/trackingEmailPreferences";

interface TrackingEmailSettingsProps {
  reference: string;
  username: string;
  email: string;
  onClose: () => void;
}

function TrackingEmailSettings({
  reference,
  username,
  email,
  onClose,
}: TrackingEmailSettingsProps) {
  const { emails, loading, saving, error, save } =
    useTrackingEmailPreferences(reference);
  const [draftEmails, setDraftEmails] = useState<string[]>([]);
  const [editorValue, setEditorValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftEmails(emails);
  }, [emails]);

  const hasChanges = useMemo(
    () => JSON.stringify(draftEmails) !== JSON.stringify(emails),
    [draftEmails, emails],
  );

  const resetEditor = () => {
    setEditorValue("");
    setEditingIndex(null);
    setLocalError(null);
  };

  const handleSubmitEmail = () => {
    const nextEmail = normalizeEmail(editorValue);

    if (!nextEmail) {
      setLocalError("Ingresa un correo electrónico.");
      return;
    }

    if (!isValidTrackingEmail(nextEmail)) {
      setLocalError("Ingresa un correo electrónico válido.");
      return;
    }

    const duplicateIndex = draftEmails.findIndex(
      (item, index) =>
        normalizeEmail(item) === nextEmail && index !== editingIndex,
    );

    if (duplicateIndex >= 0) {
      setLocalError("Ese correo ya está configurado para esta cuenta.");
      return;
    }

    if (
      editingIndex === null &&
      draftEmails.length >= MAX_SAVED_TRACKING_EMAILS
    ) {
      setLocalError(
        `Solo puedes guardar hasta ${MAX_SAVED_TRACKING_EMAILS} correos por cuenta.`,
      );
      return;
    }

    setDraftEmails((prev) => {
      if (editingIndex === null) {
        return [...prev, nextEmail];
      }

      return prev.map((item, index) =>
        index === editingIndex ? nextEmail : item,
      );
    });
    setSuccessMessage(null);
    resetEditor();
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditorValue(draftEmails[index]);
    setLocalError(null);
    setSuccessMessage(null);
  };

  const handleDelete = (index: number) => {
    setDraftEmails((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
    if (editingIndex === index) {
      resetEditor();
    }
    setSuccessMessage(null);
    setLocalError(null);
  };

  const handleSave = async () => {
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await save(draftEmails);
      setSuccessMessage("Configuración guardada correctamente.");
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la configuración.",
      );
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#ffffff",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "24px 28px",
            borderBottom: "1px solid #e5e7eb",
            background:
              "linear-gradient(135deg, rgba(35,47,62,1) 0%, rgba(52,68,86,1) 100%)",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: 8,
                }}
              >
                Configuraciones
              </div>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>
                Bienvenido, {username}
              </h2>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 14,
                }}
              >
                Cuenta activa: {reference} · Email principal: {email}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                width: 38,
                height: 38,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Guarda hasta {MAX_SAVED_TRACKING_EMAILS} correos para esta cuenta.
            Estos aparecerán como opción predeterminada cuando tú o tu ejecutivo
            creen o administren trackings en tu nombre.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.3fr) minmax(280px, 0.9fr)",
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  Correos configurados
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {draftEmails.length}/{MAX_SAVED_TRACKING_EMAILS}
                </span>
              </div>

              {loading ? (
                <div style={{ color: "#64748b", fontSize: 14 }}>
                  Cargando configuración...
                </div>
              ) : draftEmails.length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {draftEmails.map((savedEmail, index) => (
                    <div
                      key={`${savedEmail}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background:
                          editingIndex === index ? "#eff6ff" : "#ffffff",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#111827",
                            wordBreak: "break-word",
                          }}
                        >
                          {savedEmail}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          Disponible en tracking aéreo y marítimo
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(index)}
                          style={{
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            color: "#374151",
                            borderRadius: 10,
                            padding: "8px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(index)}
                          style={{
                            border: "1px solid #fecaca",
                            background: "#fff1f2",
                            color: "#be123c",
                            borderRadius: 10,
                            padding: "8px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    border: "1px dashed #cbd5e1",
                    color: "#64748b",
                    fontSize: 14,
                    background: "#f8fafc",
                  }}
                >
                  Aún no has configurado correos para esta cuenta.
                </div>
              )}
            </div>

            <div>
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {editingIndex === null ? "Agregar correo" : "Editar correo"}
              </h3>
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                }}
              >
                <label
                  htmlFor="tracking-email-settings-input"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Correo electrónico
                </label>
                <input
                  id="tracking-email-settings-input"
                  type="email"
                  value={editorValue}
                  onChange={(e) => setEditorValue(e.target.value)}
                  placeholder="correo@empresa.com"
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    color: "#111827",
                    boxSizing: "border-box",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleSubmitEmail}
                    style={{
                      border: "none",
                      background: "#232f3e",
                      color: "#ffffff",
                      borderRadius: 12,
                      padding: "11px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {editingIndex === null
                      ? "Agregar a la lista"
                      : "Guardar cambio"}
                  </button>
                  {editingIndex !== null && (
                    <button
                      type="button"
                      onClick={resetEditor}
                      style={{
                        border: "1px solid #d1d5db",
                        background: "#ffffff",
                        color: "#374151",
                        borderRadius: 12,
                        padding: "11px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 14, fontSize: 12, color: "#64748b" }}>
                  Recomendación: usa correos del equipo que realmente necesiten
                  recibir eventos de seguimiento.
                </div>
              </div>
            </div>
          </div>

          {(error || localError || successMessage) && (
            <div
              style={{
                marginTop: 20,
                padding: "12px 14px",
                borderRadius: 12,
                background: successMessage ? "#ecfdf5" : "#fef2f2",
                border: `1px solid ${successMessage ? "#bbf7d0" : "#fecaca"}`,
                color: successMessage ? "#166534" : "#b91c1c",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {successMessage || localError || error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "18px 28px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
            style={{
              border: "none",
              background:
                saving || loading || !hasChanges ? "#94a3b8" : "#ff9900",
              color: "#111827",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 800,
              cursor:
                saving || loading || !hasChanges ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Guardando..." : "Guardar configuraciones"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrackingEmailSettings;
