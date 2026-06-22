import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthContext";
import LoadingTips from "@/components/cliente/embarques/LoadingTips";
import "./CorreosProveedores.css";

interface ProviderOption {
  id: string;
  label: string;
  asunto: string;
  defaultDescripcion: string;
}

const DRAFT_STORAGE_KEY = "provider-emails-drafts";

function loadDrafts(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveDraft(providerId: string, descripcion: string) {
  const drafts = loadDrafts();
  drafts[providerId] = descripcion;
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

export default function CorreosProveedores() {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selected = providers.find((p) => p.id === selectedId) ?? null;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/provider-emails/providers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("providerEmails.errors.load"));
        return;
      }
      const list = data.providers as ProviderOption[];
      setProviders(list);
      if (list.length > 0) {
        const drafts = loadDrafts();
        setSelectedId((prev) => {
          const next = list.find((p) => p.id === prev) ?? list[0];
          setDescripcion(drafts[next.id] ?? next.defaultDescripcion);
          return next.id;
        });
      }
    } catch {
      setError(t("providerEmails.errors.connection"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleProviderChange = (providerId: string) => {
    if (selectedId) saveDraft(selectedId, descripcion);
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;
    const drafts = loadDrafts();
    setSelectedId(provider.id);
    setDescripcion(drafts[provider.id] ?? provider.defaultDescripcion);
  };

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/provider-emails/send", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ providerId: selected.id, descripcion }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || t("providerEmails.errors.send"));
        return;
      }
      saveDraft(selected.id, descripcion);
      setSuccess(t("providerEmails.success.sent"));
    } catch {
      setError(t("providerEmails.errors.connection"));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  return (
    <div className="cp-page">
      <header className="cp-header">
        <h1 className="cp-title">{t("providerEmails.title")}</h1>
        <p className="cp-subtitle">{t("providerEmails.subtitle")}</p>
      </header>

      {error && <div className="cp-alert cp-alert--error">{error}</div>}
      {success && <div className="cp-alert cp-alert--success">{success}</div>}

      {loading ? (
        <LoadingTips />
      ) : (
        <div className="cp-card">
          <div className="cp-field">
            <label htmlFor="cp-provider">{t("providerEmails.fields.provider")}</label>
            <select
              id="cp-provider"
              value={selectedId}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <>
              <div className="cp-field">
                <label>{t("providerEmails.fields.subject")}</label>
                <div className="cp-readonly">{selected.asunto}</div>
              </div>

              <div className="cp-field">
                <label htmlFor="cp-descripcion">{t("providerEmails.fields.description")}</label>
                <textarea
                  id="cp-descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={t("providerEmails.descriptionPlaceholder")}
                  rows={8}
                />
              </div>

              <div className="cp-card__footer">
                <button
                  type="button"
                  className="cp-btn cp-btn--primary"
                  onClick={handleSend}
                  disabled={sending || !descripcion.trim()}
                >
                  {sending ? t("providerEmails.sending") : t("providerEmails.sendEmail")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
