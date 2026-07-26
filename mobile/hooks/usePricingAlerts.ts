import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  fetchPricingAlertStatus,
  fetchPricingExpiry,
  type PricingAlertStatus,
  type PricingExpiryData,
} from "../services/pricingApi";

const DEFAULT_DAYS = 7;

export function usePricingAlerts(days = DEFAULT_DAYS) {
  const { token } = useAuth();
  const [expiry, setExpiry] = useState<PricingExpiryData | null>(null);
  const [status, setStatus] = useState<PricingAlertStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setExpiry(null);
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [expiryData, statusData] = await Promise.all([
        fetchPricingExpiry(token, days),
        fetchPricingAlertStatus(token),
      ]);
      setExpiry(expiryData);
      setStatus(statusData);
    } catch (e) {
      setExpiry(null);
      setStatus(null);
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar las alertas.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    expiry,
    status,
    loading,
    error,
    refresh: load,
    days,
  };
}
