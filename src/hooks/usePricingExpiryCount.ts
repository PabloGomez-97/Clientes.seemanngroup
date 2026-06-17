import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";

const CACHE_KEY = "pricing_expiry_count";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  count: number;
  ts: number;
}

export function usePricingExpiryCount(enabled: boolean): number {
  const { token, user } = useAuth();
  const [count, setCount] = useState(0);

  const canFetch =
    enabled &&
    !!token &&
    (user?.roles?.administrador || user?.roles?.pricing);

  useEffect(() => {
    if (!canFetch) {
      setCount(0);
      return;
    }

    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CacheEntry;
        if (Date.now() - cached.ts < CACHE_TTL_MS) {
          setCount(cached.count);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/pricing/expiry-check?days=2", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const total = json.totals?.all ?? 0;
        if (!cancelled) {
          setCount(total);
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ count: total, ts: Date.now() }),
          );
        }
      } catch {
        /* silent */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canFetch, token]);

  return count;
}
