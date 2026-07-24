import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import "@/components/cliente/configuracion/SettingsClient.css";

const API_BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:4000" : "";

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
    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
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
    <div className="sc-tab-content">
      <div className="sc-panel">
        <div className="sc-panel__head">
          <span className="sc-panel__label">Seguridad</span>
        </div>

        <div className="sc-panel__body">
          <div className="sc-field-row">
            <label className="sc-label" htmlFor="sa-current-pw">
              Contraseña actual
            </label>
            <input
              id="sa-current-pw"
              type="password"
              className="sc-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa tu contraseña actual"
              autoComplete="current-password"
            />
          </div>

          <div className="sc-field-row">
            <label className="sc-label" htmlFor="sa-new-pw">
              Nueva contraseña
            </label>
            <input
              id="sa-new-pw"
              type="password"
              className="sc-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div className="sc-field-row">
            <label className="sc-label" htmlFor="sa-confirm-pw">
              Confirmar nueva contraseña
            </label>
            <input
              id="sa-confirm-pw"
              type="password"
              className="sc-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="sc-panel__foot">
          <div className="sc-form-actions" style={{ marginTop: 0 }}>
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
      </div>

      {(error || success) && (
        <div
          className={`sc-feedback ${success ? "sc-feedback--success" : "sc-feedback--error"}`}
        >
          {success || error}
        </div>
      )}
    </div>
  );
}

function SettingsAdmin() {
  return (
    <section className="sc-page">
      <div className="sc-shell">
        <header className="sc-header">
          <p className="sc-header__eyebrow">Configuración</p>
          <h1 className="sc-header__title">Mi cuenta</h1>
          <p className="sc-header__desc">
            Cambia la contraseña de acceso al portal.
          </p>
        </header>

        <PasswordSettings />
      </div>
    </section>
  );
}

export default SettingsAdmin;
