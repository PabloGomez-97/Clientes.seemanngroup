import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useTrackingEmailPreferences } from "../../hooks/useTrackingEmailPreferences";
import {
  isValidTrackingEmail,
  MAX_SAVED_TRACKING_EMAILS,
  normalizeEmail,
} from "../../services/trackingEmailPreferences";
import "./SettingsClient.css";

type SettingsTab = "emails" | "password";

const API_BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:4000" : "";

interface SettingsClientProps {
  reference: string;
  username: string;
  email: string;
  allowPasswordChange?: boolean;
}

/* ── Email Settings Section ── */
function EmailSettings({
  reference,
  hasReference,
}: {
  reference: string;
  hasReference: boolean;
}) {
  const { emails, loading, saving, error, save } = useTrackingEmailPreferences(
    reference,
    hasReference,
  );
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
      if (editingIndex === null) return [...prev, nextEmail];
      return prev.map((item, i) => (i === editingIndex ? nextEmail : item));
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
    setDraftEmails((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) resetEditor();
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
    <>
      <div className="sc-badge">
        {draftEmails.length}/{MAX_SAVED_TRACKING_EMAILS} correos guardados
      </div>

      <div className="sc-card">
        <h2>Correos configurados</h2>
        {!hasReference ? (
          <div className="sc-empty">
            Selecciona una cuenta para administrar sus correos.
          </div>
        ) : loading ? (
          <div className="sc-empty">Cargando configuración...</div>
        ) : draftEmails.length > 0 ? (
          <div className="sc-email-list">
            {draftEmails.map((savedEmail, index) => (
              <div
                key={`${savedEmail}-${index}`}
                className={`sc-email-item ${editingIndex === index ? "sc-email-item--active" : ""}`}
              >
                <span className="sc-email-text">{savedEmail}</span>
                <div className="sc-email-item-actions">
                  <button
                    type="button"
                    className="sc-btn sc-btn--ghost sc-btn--sm"
                    onClick={() => handleEdit(index)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="sc-btn sc-btn--danger sc-btn--sm"
                    onClick={() => handleDelete(index)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sc-empty">
            Aún no has configurado correos para esta cuenta.
          </div>
        )}
      </div>

      <div className="sc-card">
        <h2>{editingIndex === null ? "Agregar correo" : "Editar correo"}</h2>
        <div className="sc-form-row">
          <label className="sc-label" htmlFor="sc-email-input">
            Correo electrónico
          </label>
          <input
            id="sc-email-input"
            type="email"
            className="sc-input"
            value={editorValue}
            onChange={(e) => setEditorValue(e.target.value)}
            placeholder="correo@empresa.com"
            disabled={!hasReference}
          />
        </div>
        <div className="sc-form-actions">
          <button
            type="button"
            className="sc-btn sc-btn--primary"
            onClick={handleSubmitEmail}
            disabled={!hasReference}
          >
            {editingIndex === null ? "Agregar a la lista" : "Guardar cambio"}
          </button>
          {editingIndex !== null && (
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={resetEditor}
            >
              Cancelar
            </button>
          )}
        </div>
        <p className="sc-note">
          Correos del equipo que recibirán eventos de seguimiento.
        </p>
      </div>

      {(error || localError || successMessage) && (
        <div
          className={`sc-feedback ${successMessage ? "sc-feedback--success" : "sc-feedback--error"}`}
        >
          {successMessage || localError || error}
        </div>
      )}

      <div className="sc-footer">
        <button
          type="button"
          className="sc-btn sc-btn--primary"
          onClick={handleSave}
          disabled={saving || loading || !hasChanges || !hasReference}
        >
          {saving ? "Guardando..." : "Guardar configuraciones"}
        </button>
      </div>
    </>
  );
}

/* ── Password Settings Section ── */
function PasswordSettings() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Ingresa tu contraseña actual.");
      return;
    }
    if (!newPassword) {
      setError("Ingresa la nueva contraseña.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "No se pudo cambiar la contraseña.");
        return;
      }

      setSuccess("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sc-card">
        <h2>Cambiar contraseña</h2>

        <div className="sc-form-row">
          <label className="sc-label" htmlFor="sc-current-pw">
            Contraseña actual
          </label>
          <input
            id="sc-current-pw"
            type="password"
            className="sc-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Ingresa tu contraseña actual"
          />
        </div>

        <div className="sc-form-row">
          <label className="sc-label" htmlFor="sc-new-pw">
            Nueva contraseña
          </label>
          <input
            id="sc-new-pw"
            type="password"
            className="sc-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Ingresa la nueva contraseña"
          />
        </div>

        <div className="sc-form-row">
          <label className="sc-label" htmlFor="sc-confirm-pw">
            Confirmar nueva contraseña
          </label>
          <input
            id="sc-confirm-pw"
            type="password"
            className="sc-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la nueva contraseña"
          />
        </div>

        <div className="sc-form-actions">
          <button
            type="button"
            className="sc-btn sc-btn--primary"
            onClick={handleChangePassword}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`sc-feedback ${success ? "sc-feedback--success" : "sc-feedback--error"}`}
        >
          {success || error}
        </div>
      )}
    </>
  );
}

/* ── Main Component ── */
function SettingsClient({
  reference,
  username,
  email,
  allowPasswordChange = true,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("emails");
  const hasReference = Boolean(reference.trim());

  return (
    <section className="sc-page">
      <div className="sc-shell">
        <div className="sc-header">
          <h1>Configuración</h1>
          <p>
            {username} · {email}
          </p>
        </div>

        {allowPasswordChange ? (
          <div className="sc-tabs">
            <button
              type="button"
              className={`sc-tab ${activeTab === "emails" ? "sc-tab--active" : ""}`}
              onClick={() => setActiveTab("emails")}
            >
              Correos de seguimiento
            </button>
            <button
              type="button"
              className={`sc-tab ${activeTab === "password" ? "sc-tab--active" : ""}`}
              onClick={() => setActiveTab("password")}
            >
              Cambiar contraseña
            </button>
          </div>
        ) : null}

        {activeTab === "emails" && (
          <EmailSettings reference={reference} hasReference={hasReference} />
        )}
        {allowPasswordChange && activeTab === "password" ? (
          <PasswordSettings />
        ) : null}
      </div>
    </section>
  );
}

export default SettingsClient;
