import { useState, useEffect, useCallback } from "react";
import type {
  IGestionCotizadorConfig,
  IFclCotizadorConfig,
} from "../types/gestionCotizador";
import { DEFAULT_GESTION_COTIZADOR_CONFIG } from "../types/gestionCotizador";
import { useAuth } from "../auth/AuthContext";

export type { IGestionCotizadorConfig, IFclCotizadorConfig };
export {
  DEFAULT_GESTION_COTIZADOR_CONFIG,
  getFclTtRate,
  getVespucioExtendedMultiplier,
} from "../types/gestionCotizador";

export function useGestionCotizador() {
  const { token } = useAuth();
  const [config, setConfig] = useState<IGestionCotizadorConfig>(
    DEFAULT_GESTION_COTIZADOR_CONFIG,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/gestion-cotizador/config");
      if (!res.ok) throw new Error("Error al obtener configuración del cotizador");
      const data = await res.json();
      setConfig({
        fcl: {
          ttRate20GP: data.fcl?.ttRate20GP ?? DEFAULT_GESTION_COTIZADOR_CONFIG.fcl.ttRate20GP,
          ttRate40: data.fcl?.ttRate40 ?? DEFAULT_GESTION_COTIZADOR_CONFIG.fcl.ttRate40,
          vespucioExtendedSurchargePct:
            data.fcl?.vespucioExtendedSurchargePct ??
            DEFAULT_GESTION_COTIZADOR_CONFIG.fcl.vespucioExtendedSurchargePct,
        },
        updatedBy: data.updatedBy ?? "system",
      });
    } catch (e) {
      console.error("[useGestionCotizador] fetch error:", e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateFcl = useCallback(
    async (updates: Partial<IFclCotizadorConfig>) => {
      try {
        setSaving(true);
        setError(null);
        const res = await fetch("/api/gestion-cotizador/config", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fcl: updates }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error al guardar");
        }
        const data = await res.json();
        setConfig({
          fcl: data.fcl,
          updatedBy: data.updatedBy,
        });
      } catch (e) {
        console.error("[useGestionCotizador] update error:", e);
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  return { config, loading, error, saving, updateFcl, refetch: fetchConfig };
}
