import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import LoadingTips from "../shipments/LoadingTips";
import "./CorreosProveedores.css";

export interface ProviderAgent {
  id: string;
  nombreAgente: string;
  emailAgente: string;
  numeroAgente: string;
  nombreResponsable: string;
  descripcion: string;
  asunto: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AgentFormData {
  nombreAgente: string;
  emailAgente: string;
  numeroAgente: string;
  nombreResponsable: string;
  descripcion: string;
  asunto: string;
}

const EMPTY_FORM: AgentFormData = {
  nombreAgente: "",
  emailAgente: "",
  numeroAgente: "",
  nombreResponsable: "",
  descripcion: "",
  asunto: "",
};

type ModalMode = "create" | "edit" | "send" | null;

export default function CorreosProveedores() {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [agents, setAgents] = useState<ProviderAgent[]>([]);
  const [draftDescriptions, setDraftDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAgent, setSelectedAgent] = useState<ProviderAgent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const syncDrafts = useCallback((list: ProviderAgent[]) => {
    const drafts: Record<string, string> = {};
    for (const a of list) {
      drafts[a.id] = a.descripcion;
    }
    setDraftDescriptions(drafts);
  }, []);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = incluirInactivos ? "?incluirInactivos=true" : "";
      const res = await fetch(`/api/provider-agents${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("providerEmails.errors.load"));
        return;
      }
      setAgents(data.agentes);
      syncDrafts(data.agentes);
    } catch {
      setError(t("providerEmails.errors.connection"));
    } finally {
      setLoading(false);
    }
  }, [token, incluirInactivos, syncDrafts, t]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const isDescriptionDirty = (agent: ProviderAgent) =>
    (draftDescriptions[agent.id] ?? "") !== agent.descripcion;

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setSelectedAgent(null);
    setModalMode("create");
  };

  const openEdit = (agent: ProviderAgent) => {
    setSelectedAgent(agent);
    setFormData({
      nombreAgente: agent.nombreAgente,
      emailAgente: agent.emailAgente,
      numeroAgente: agent.numeroAgente || "",
      nombreResponsable: agent.nombreResponsable,
      descripcion: agent.descripcion,
      asunto: agent.asunto,
    });
    setModalMode("edit");
  };

  const openSendConfirm = (agent: ProviderAgent) => {
    setSelectedAgent(agent);
    setModalMode("send");
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setSelectedAgent(null);
    setFormData(EMPTY_FORM);
  };

  const handleFormChange = (field: keyof AgentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/provider-agents", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("providerEmails.errors.create"));
        return;
      }
      setSuccess(t("providerEmails.success.created"));
      closeModal();
      await fetchAgents();
    } catch {
      setError(t("providerEmails.errors.connection"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedAgent) return;
    setSubmitting(true);
    setError(null);
    try {
      const { descripcion: _d, ...payload } = formData;
      const res = await fetch(`/api/provider-agents/${selectedAgent.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("providerEmails.errors.update"));
        return;
      }
      setSuccess(t("providerEmails.success.updated"));
      closeModal();
      await fetchAgents();
    } catch {
      setError(t("providerEmails.errors.connection"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (agent: ProviderAgent) => {
    if (!window.confirm(t("providerEmails.confirm.deactivate", { name: agent.nombreAgente }))) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/provider-agents/${agent.id}/deactivate`, {
        method: "PATCH",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("providerEmails.errors.deactivate"));
        return;
      }
      setSuccess(t("providerEmails.success.deactivated"));
      await fetchAgents();
    } catch {
      setError(t("providerEmails.errors.connection"));
    }
  };

  const handleSendEmail = async () => {
    if (!selectedAgent) return;
    setSubmitting(true);
    setSendingId(selectedAgent.id);
    setError(null);
    try {
      const descripcion = draftDescriptions[selectedAgent.id] ?? selectedAgent.descripcion;
      const res = await fetch(`/api/provider-agents/${selectedAgent.id}/send-email`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ descripcion }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("providerEmails.errors.send"));
        return;
      }
      const updated = data.agent as ProviderAgent;
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setDraftDescriptions((prev) => ({ ...prev, [updated.id]: updated.descripcion }));
      setSuccess(
        data.descripcionGuardada
          ? t("providerEmails.success.sentWithSave")
          : t("providerEmails.success.sent"),
      );
      closeModal();
    } catch {
      setError(t("providerEmails.errors.connection"));
    } finally {
      setSubmitting(false);
      setSendingId(null);
    }
  };

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  return (
    <div className="cp-page">
      <div className="cp-header">
        <div>
          <h1 className="cp-title">{t("providerEmails.title")}</h1>
          <p className="cp-subtitle">{t("providerEmails.subtitle")}</p>
        </div>
        <button type="button" className="cp-btn cp-btn--primary" onClick={openCreate}>
          <i className="fa fa-plus" style={{ marginRight: 6 }} />
          {t("providerEmails.createAgent")}
        </button>
      </div>

      <div className="cp-toolbar">
        <label className="cp-checkbox-label">
          <input
            type="checkbox"
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
          />
          {t("providerEmails.showInactive")}
        </label>
      </div>

      {error && <div className="cp-alert cp-alert--error">{error}</div>}
      {success && <div className="cp-alert cp-alert--success">{success}</div>}

      {loading ? (
        <LoadingTips />
      ) : agents.length === 0 ? (
        <div className="cp-empty">{t("providerEmails.empty")}</div>
      ) : (
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th>{t("providerEmails.columns.agentName")}</th>
                <th>{t("providerEmails.columns.email")}</th>
                <th>{t("providerEmails.columns.phone")}</th>
                <th>{t("providerEmails.columns.responsible")}</th>
                <th>{t("providerEmails.columns.subject")}</th>
                <th>{t("providerEmails.columns.description")}</th>
                <th>{t("providerEmails.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className={!agent.activo ? "inactive" : ""}>
                  <td>{agent.nombreAgente}</td>
                  <td>{agent.emailAgente}</td>
                  <td>{agent.numeroAgente || "—"}</td>
                  <td>{agent.nombreResponsable}</td>
                  <td>{agent.asunto}</td>
                  <td>
                    <textarea
                      className={`cp-desc-textarea${isDescriptionDirty(agent) ? " dirty" : ""}`}
                      value={draftDescriptions[agent.id] ?? ""}
                      onChange={(e) =>
                        setDraftDescriptions((prev) => ({
                          ...prev,
                          [agent.id]: e.target.value,
                        }))
                      }
                      disabled={!agent.activo}
                      placeholder={t("providerEmails.descriptionPlaceholder")}
                    />
                    {isDescriptionDirty(agent) && (
                      <div className="cp-field-hint">{t("providerEmails.unsavedDescription")}</div>
                    )}
                  </td>
                  <td>
                    <div className="cp-actions">
                      <button
                        type="button"
                        className="cp-btn cp-btn--secondary"
                        onClick={() => openEdit(agent)}
                        disabled={!agent.activo}
                      >
                        {t("providerEmails.edit")}
                      </button>
                      <button
                        type="button"
                        className="cp-btn cp-btn--send"
                        onClick={() => openSendConfirm(agent)}
                        disabled={!agent.activo || sendingId === agent.id}
                      >
                        {sendingId === agent.id
                          ? t("providerEmails.sending")
                          : t("providerEmails.sendEmail")}
                      </button>
                      {agent.activo && (
                        <button
                          type="button"
                          className="cp-btn cp-btn--danger"
                          onClick={() => handleDeactivate(agent)}
                        >
                          {t("providerEmails.deactivate")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalMode === "create" && (
        <div className="cp-modal-overlay" onClick={closeModal}>
          <div className="cp-modal cp-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h2>{t("providerEmails.modal.createTitle")}</h2>
            </div>
            <div className="cp-modal-body">
              <AgentFormFields
                formData={formData}
                onChange={handleFormChange}
                includeDescription
                t={t}
              />
            </div>
            <div className="cp-modal-footer">
              <button type="button" className="cp-btn cp-btn--secondary" onClick={closeModal} disabled={submitting}>
                {t("providerEmails.cancel")}
              </button>
              <button type="button" className="cp-btn cp-btn--primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? t("providerEmails.saving") : t("providerEmails.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMode === "edit" && selectedAgent && (
        <div className="cp-modal-overlay" onClick={closeModal}>
          <div className="cp-modal cp-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h2>{t("providerEmails.modal.editTitle")}</h2>
            </div>
            <div className="cp-modal-body">
              <AgentFormFields formData={formData} onChange={handleFormChange} includeDescription={false} t={t} />
              <p className="cp-field-hint">{t("providerEmails.modal.editDescriptionHint")}</p>
            </div>
            <div className="cp-modal-footer">
              <button type="button" className="cp-btn cp-btn--secondary" onClick={closeModal} disabled={submitting}>
                {t("providerEmails.cancel")}
              </button>
              <button type="button" className="cp-btn cp-btn--primary" onClick={handleUpdate} disabled={submitting}>
                {submitting ? t("providerEmails.saving") : t("providerEmails.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMode === "send" && selectedAgent && (
        <div className="cp-modal-overlay" onClick={closeModal}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h2>{t("providerEmails.modal.sendTitle")}</h2>
            </div>
            <div className="cp-modal-body">
              <div className="cp-confirm-row">
                <strong>{t("providerEmails.columns.email")}:</strong>
                <span>{selectedAgent.emailAgente}</span>
              </div>
              <div className="cp-confirm-row">
                <strong>{t("providerEmails.columns.subject")}:</strong>
                <span>{selectedAgent.asunto}</span>
              </div>
              {isDescriptionDirty(selectedAgent) && (
                <div className="cp-warning">{t("providerEmails.modal.sendDescriptionWarning")}</div>
              )}
              <div className="cp-warning" style={{ marginTop: 8 }}>
                {t("providerEmails.modal.sendBrevoNote")}
              </div>
            </div>
            <div className="cp-modal-footer">
              <button type="button" className="cp-btn cp-btn--secondary" onClick={closeModal} disabled={submitting}>
                {t("providerEmails.cancel")}
              </button>
              <button type="button" className="cp-btn cp-btn--send" onClick={handleSendEmail} disabled={submitting}>
                {submitting ? t("providerEmails.sending") : t("providerEmails.confirmSend")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentFormFields({
  formData,
  onChange,
  includeDescription,
  t,
}: {
  formData: AgentFormData;
  onChange: (field: keyof AgentFormData, value: string) => void;
  includeDescription: boolean;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="cp-field">
        <label>{t("providerEmails.fields.agentName")} *</label>
        <input
          value={formData.nombreAgente}
          onChange={(e) => onChange("nombreAgente", e.target.value)}
        />
      </div>
      <div className="cp-field">
        <label>{t("providerEmails.fields.email")} *</label>
        <input
          type="email"
          value={formData.emailAgente}
          onChange={(e) => onChange("emailAgente", e.target.value)}
        />
      </div>
      <div className="cp-field">
        <label>{t("providerEmails.fields.phone")}</label>
        <input
          value={formData.numeroAgente}
          onChange={(e) => onChange("numeroAgente", e.target.value)}
          placeholder={t("providerEmails.fields.phoneOptional")}
        />
      </div>
      <div className="cp-field">
        <label>{t("providerEmails.fields.responsible")} *</label>
        <input
          value={formData.nombreResponsable}
          onChange={(e) => onChange("nombreResponsable", e.target.value)}
        />
      </div>
      <div className="cp-field">
        <label>{t("providerEmails.fields.subject")} *</label>
        <input value={formData.asunto} onChange={(e) => onChange("asunto", e.target.value)} />
      </div>
      {includeDescription && (
        <div className="cp-field">
          <label>{t("providerEmails.fields.description")} *</label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => onChange("descripcion", e.target.value)}
            placeholder={t("providerEmails.descriptionPlaceholder")}
          />
          <div className="cp-field-hint">{t("providerEmails.fields.descriptionHint")}</div>
        </div>
      )}
    </>
  );
}
