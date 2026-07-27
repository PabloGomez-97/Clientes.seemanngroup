import { useCallback, useEffect, useState } from "react";
import { MOBILE_API_BASE } from "../../src/auth/authApi";
import { useAuth } from "../auth/AuthContext";
import { useRequestGate } from "./useRequestGate";

export function useHomeDocumentsCount(activeUsername: string | undefined) {
  const { token } = useAuth();
  const { next, isLatest } = useRequestGate();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    async (silent = false) => {
      const requestId = next();
      if (!activeUsername || !token) {
        if (isLatest(requestId)) {
          setCount(0);
          setLoading(false);
        }
        return;
      }
      if (!silent) setLoading(true);
      try {
        const res = await fetch(
          `${MOBILE_API_BASE}/api/documents/all?ownerUsername=${encodeURIComponent(activeUsername)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!isLatest(requestId)) return;
        if (!res.ok) return;
        const data = await res.json();
        if (!isLatest(requestId)) return;
        const total =
          (data.air?.length ?? 0) +
          (data.ocean?.length ?? 0) +
          (data.ground?.length ?? 0) +
          (data.quotes?.length ?? 0);
        setCount(total);
      } catch {
        /* ignore */
      } finally {
        if (isLatest(requestId)) setLoading(false);
      }
    },
    [activeUsername, token, next, isLatest],
  );

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return { count, loading, refresh: () => refresh(true) };
}
