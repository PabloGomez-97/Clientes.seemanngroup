import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";

const CACHE_TTL_MS = 20 * 60 * 1000;

interface DocsCache {
  count: number;
  fetchedAt: number;
}

function readDocsCache(username: string): number | null {
  try {
    const raw = localStorage.getItem(`home_docs_count_${username}`);
    if (!raw) return null;
    const parsed: DocsCache = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.count;
  } catch {
    return null;
  }
}

function writeDocsCache(username: string, count: number) {
  try {
    localStorage.setItem(
      `home_docs_count_${username}`,
      JSON.stringify({ count, fetchedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function useHomeDocumentsCount(activeUsername: string | undefined) {
  const { token } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUsername || !token) {
      setLoading(false);
      return;
    }

    const cached = readDocsCache(activeUsername);
    if (cached !== null) {
      setCount(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/documents/all?ownerUsername=${encodeURIComponent(activeUsername)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        const total =
          (data.air?.length ?? 0) +
          (data.ocean?.length ?? 0) +
          (data.ground?.length ?? 0) +
          (data.quotes?.length ?? 0);
        if (!cancelled) {
          setCount(total);
          writeDocsCache(activeUsername, total);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUsername, token]);

  return { count, loading };
}
