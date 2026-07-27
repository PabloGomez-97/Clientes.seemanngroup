import { useCallback, useEffect, useRef, useState } from "react";
import { MOBILE_API_BASE } from "../../src/auth/authApi";
import { useAuth } from "../auth/AuthContext";

export function useHomeDocumentsCount(activeUsername: string | undefined) {
  const { token } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const refresh = useCallback(
    async (silent = false) => {
      const requestId = ++requestIdRef.current;
      if (!activeUsername || !token) {
        if (requestId === requestIdRef.current) {
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
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) return;
        const data = await res.json();
        if (requestId !== requestIdRef.current) return;
        const total =
          (data.air?.length ?? 0) +
          (data.ocean?.length ?? 0) +
          (data.ground?.length ?? 0) +
          (data.quotes?.length ?? 0);
        setCount(total);
      } catch {
        /* ignore */
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [activeUsername, token],
  );

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return { count, loading, refresh: () => refresh(true) };
}
