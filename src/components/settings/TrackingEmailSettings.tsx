import { useEffect, useMemo, useState } from "react";
import { useTrackingEmailPreferences } from "../../hooks/useTrackingEmailPreferences";
import {
  isValidTrackingEmail,
  MAX_SAVED_TRACKING_EMAILS,
  normalizeEmail,
} from "../../services/trackingEmailPreferences";
import "./TrackingEmailSettings.css";

interface TrackingEmailSettingsProps {
  reference: string;
  username: string;
  email: string;
}

function TrackingEmailSettings({
  reference,
  username,
  email,
}: TrackingEmailSettingsProps) {
  const hasReference = Boolean(reference.trim());
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
    <section className="tracking-settings-page">
      <div className="tracking-settings-shell">
        <header className="tracking-settings-hero">
          <div>
            <p className="tracking-settings-eyebrow">Configuraciones</p>
            <h1>Correos para seguimiento</h1>
            <p className="tracking-settings-copy">
              Puede añadir emails para que sea más rápido la gestión de
              seguimientos en vivo.
            </p>
          </div>
          <div className="tracking-settings-account-card">
            <span>Cuenta activa</span>
            <strong>{reference || "Sin cuenta activa"}</strong>
            <small>{username}</small>
            <small>{email}</small>
          </div>
        </header>

        <div className="tracking-settings-intro-card">
          <span>Límite por cuenta</span>
          <strong>
            {draftEmails.length}/{MAX_SAVED_TRACKING_EMAILS} correos guardados
          </strong>
        </div>

        <div className="tracking-settings-grid">
          <section className="tracking-settings-card">
            <div className="tracking-settings-section-head">
              <h2>Correos configurados</h2>
            </div>

            {!hasReference ? (
              <div className="tracking-settings-empty">
                Selecciona una cuenta para administrar sus correos.
              </div>
            ) : loading ? (
              <div className="tracking-settings-empty">
                Cargando configuración...
              </div>
            ) : draftEmails.length > 0 ? (
              <div className="tracking-settings-list">
                {draftEmails.map((savedEmail, index) => (
                  <article
                    key={`${savedEmail}-${index}`}
                    className={`tracking-settings-item ${editingIndex === index ? "tracking-settings-item--active" : ""}`}
                  >
                    <div>
                      <div className="tracking-settings-item-email">
                        {savedEmail}
                      </div>
                      <div className="tracking-settings-item-meta">
                        Disponible en tracking aéreo y marítimo
                      </div>
                    </div>
                    <div className="tracking-settings-item-actions">
                      <button
                        type="button"
                        className="tracking-settings-btn tracking-settings-btn--ghost"
                        onClick={() => handleEdit(index)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="tracking-settings-btn tracking-settings-btn--danger"
                        onClick={() => handleDelete(index)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="tracking-settings-empty">
                Aún no has configurado correos para esta cuenta.
              </div>
            )}
          </section>

          <section className="tracking-settings-card tracking-settings-card--editor">
            <div className="tracking-settings-section-head">
              <h2>
                {editingIndex === null ? "Agregar correo" : "Editar correo"}
              </h2>
            </div>

            <label
              className="tracking-settings-label"
              htmlFor="tracking-email-settings-input"
            >
              Correo electrónico
            </label>
            <input
              id="tracking-email-settings-input"
              type="email"
              className="tracking-settings-input"
              value={editorValue}
              onChange={(e) => setEditorValue(e.target.value)}
              placeholder="correo@empresa.com"
              disabled={!hasReference}
            />

            <div className="tracking-settings-editor-actions">
              <button
                type="button"
                className="tracking-settings-btn tracking-settings-btn--primary"
                onClick={handleSubmitEmail}
                disabled={!hasReference}
              >
                {editingIndex === null
                  ? "Agregar a la lista"
                  : "Guardar cambio"}
              </button>
              {editingIndex !== null && (
                <button
                  type="button"
                  className="tracking-settings-btn tracking-settings-btn--ghost"
                  onClick={resetEditor}
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <p className="tracking-settings-note">
              Usa correos del equipo que realmente necesiten recibir eventos de
              seguimiento.
            </p>
          </section>
        </div>

        {(error || localError || successMessage) && (
          <div
            className={`tracking-settings-feedback ${successMessage ? "tracking-settings-feedback--success" : "tracking-settings-feedback--error"}`}
          >
            {successMessage || localError || error}
          </div>
        )}

        <div className="tracking-settings-footer">
          <button
            type="button"
            className="tracking-settings-btn tracking-settings-btn--primary"
            onClick={handleSave}
            disabled={saving || loading || !hasChanges || !hasReference}
          >
            {saving ? "Guardando..." : "Guardar configuraciones"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default TrackingEmailSettings;
