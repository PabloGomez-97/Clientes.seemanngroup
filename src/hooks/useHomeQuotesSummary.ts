import { useState, useEffect } from "react";
import { linbisFetch } from "../services/linbisFetch";
import { buildLinbisListParams } from "../services/linbisListFetch";

export interface HomeQuoteSummary {
  id?: string | number;
  number?: string;
  origin?: string;
  destination?: string;
  date?: string;
  modeOfTransportation?: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000;

function getQuoteDate(quote: Record<string, unknown>): string {
  const candidates = [
    quote.date,
    quote.createdAt,
    quote.created_at,
    quote.dateCreated,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return "";
}

function readQuotesCache(username: string): HomeQuoteSummary[] | null {
  try {
    const raw = localStorage.getItem(`quotesCache_${username}`);
    const ts = localStorage.getItem(`quotesCache_${username}_timestamp`);
    if (!raw || !ts) return null;
    if (Date.now() - parseInt(ts, 10) > CACHE_TTL_MS) return null;
    const parsed = JSON.parse(raw) as HomeQuoteSummary[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function useHomeQuotesSummary(
  activeUsername: string | undefined,
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
) {
  const [quotes, setQuotes] = useState<HomeQuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUsername) {
      setLoading(false);
      return;
    }

    const cached = readQuotesCache(activeUsername);
    if (cached?.length) {
      setQuotes(cached.slice(0, 10));
      setLoading(false);
      if (cached.length >= 3) return;
    }

    if (!accessToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const params = buildLinbisListParams(activeUsername, 1, 10);
        const response = await linbisFetch(
          `https://api.linbis.com/Quotes?${params}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          },
          accessToken,
          refreshAccessToken,
        );

        if (!response.ok) {
          if (!cancelled) setQuotes(cached?.slice(0, 10) ?? []);
          return;
        }

        const data = await response.json();
        const arr: HomeQuoteSummary[] = (Array.isArray(data) ? data : []).map(
          (q: Record<string, unknown>) => ({
            id: q.id as string | number,
            number: q.number as string,
            origin: q.origin as string,
            destination: q.destination as string,
            date: getQuoteDate(q),
            modeOfTransportation:
              typeof q.modeOfTransportation === "string"
                ? q.modeOfTransportation
                : (q.modeOfTransportation as { name?: string })?.name,
          }),
        );

        const sorted = arr.sort((a, b) => {
          const nA = parseInt(a.number?.replace(/\D/g, "") || "0", 10);
          const nB = parseInt(b.number?.replace(/\D/g, "") || "0", 10);
          return nB - nA;
        });

        if (!cancelled) setQuotes(sorted);
      } catch {
        if (!cancelled) setQuotes(cached?.slice(0, 10) ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUsername, accessToken, refreshAccessToken]);

  return {
    quotes,
    count: quotes.length,
    recent: quotes.slice(0, 3),
    loading,
  };
}
