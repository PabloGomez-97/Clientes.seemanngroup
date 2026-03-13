import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  fetchTrackingEmailPreference,
  saveTrackingEmailPreference,
} from "../services/trackingEmailPreferences";

export function useTrackingEmailPreferences(
  reference?: string,
  enabled: boolean = true,
) {
  const { token } = useAuth();
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !reference || !token) {
      setEmails([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const preference = await fetchTrackingEmailPreference(token, reference);
      setEmails(preference.emails);
    } catch (err) {
      setEmails([]);
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los correos.",
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, reference, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (nextEmails: string[]) => {
      if (!reference || !token) {
        throw new Error("No hay sesión activa o cuenta seleccionada.");
      }

      setSaving(true);
      setError(null);

      try {
        const preference = await saveTrackingEmailPreference(
          token,
          reference,
          nextEmails,
        );
        setEmails(preference.emails);
        return preference;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudieron guardar los correos.";
        setError(message);
        throw new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [reference, token],
  );

  return {
    emails,
    loading,
    saving,
    error,
    reload: load,
    save,
  };
}