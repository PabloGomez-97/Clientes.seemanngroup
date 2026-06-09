import { useCallback, useEffect, useState } from "react";
import type { IAirConnectSpainConfig } from "../types/airConnectSpainConfig";
import { DEFAULT_AIR_CONNECT_SPAIN_CONFIG } from "../types/airConnectSpainConfig";
import { useAuth } from "../auth/AuthContext";

function normalizeConfig(data: Record<string, unknown>): IAirConnectSpainConfig {
  const legacy =
    typeof data.profitMarkupPct === "number" && !Number.isNaN(data.profitMarkupPct)
      ? data.profitMarkupPct
      : undefined;
  const fca = data.profitMarkupPctFca;
  const exw = data.profitMarkupPctExw;

  return {
    profitMarkupPctFca:
      typeof fca === "number" && !Number.isNaN(fca)
        ? fca
        : (legacy ?? DEFAULT_AIR_CONNECT_SPAIN_CONFIG.profitMarkupPctFca),
    profitMarkupPctExw:
      typeof exw === "number" && !Number.isNaN(exw)
        ? exw
        : DEFAULT_AIR_CONNECT_SPAIN_CONFIG.profitMarkupPctExw,
    updatedBy:
      (data.updatedBy as string) ?? DEFAULT_AIR_CONNECT_SPAIN_CONFIG.updatedBy,
  };
}

export type AirConnectSpainConfigUpdate = Partial<
  Pick<IAirConnectSpainConfig, "profitMarkupPctFca" | "profitMarkupPctExw">
>;

export function useAirConnectSpainConfig() {
  const { token } = useAuth();
  const [config, setConfig] = useState<IAirConnectSpainConfig>(
    DEFAULT_AIR_CONNECT_SPAIN_CONFIG,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/air-connect-spain/config");
      if (!res.ok) {
        throw new Error("Error al obtener configuración AirConnect España");
      }
      const data = await res.json();
      setConfig(normalizeConfig(data));
    } catch (e) {
      console.error("[useAirConnectSpainConfig] fetch error:", e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(
    async (updates: AirConnectSpainConfigUpdate) => {
      const res = await fetch("/api/air-connect-spain/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ airConnectSpain: updates }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }
      const data = await res.json();
      setConfig(normalizeConfig(data));
    },
    [token],
  );

  const save = useCallback(
    async (updates: AirConnectSpainConfigUpdate) => {
      try {
        setSaving(true);
        setError(null);
        await updateConfig(updates);
      } catch (e) {
        console.error("[useAirConnectSpainConfig] update error:", e);
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [updateConfig],
  );

  return { config, loading, error, saving, updateConfig: save, refetch: fetchConfig };
}
