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

export function useHomeQuotesSummary(
  activeUsername: string | undefined,
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
) {
  const [quotes, setQuotes] = useState<HomeQuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUsername || !accessToken) {
      setQuotes([]);
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
          if (!cancelled) setQuotes([]);
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
        if (!cancelled) setQuotes([]);
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
