import { useEffect, useState } from "react";
import { useLinbisToken } from "./useLinbisToken";
import { resolveOperacionQuoteNumber } from "../services/operacionDetailApi";

export function useOperacionQuoteNumber(keys: {
  sogNumber?: string | null;
  shipmentId?: number | string | null;
  quoteNumberHint?: string | null;
}) {
  const { accessToken, refreshAccessToken, loading: tokenLoading } =
    useLinbisToken();
  const [quoteNumber, setQuoteNumber] = useState<string | null>(
    keys.quoteNumberHint?.trim() || null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (tokenLoading || !accessToken) return;

    const hinted = keys.quoteNumberHint?.trim();
    if (hinted) {
      setQuoteNumber(hinted);
      setLoading(false);
      return;
    }

    setLoading(true);
    void resolveOperacionQuoteNumber(
      { accessToken, refreshAccessToken },
      {
        sogNumber: keys.sogNumber,
        shipmentId: keys.shipmentId,
        quoteNumberHint: keys.quoteNumberHint,
      },
    )
      .then((value) => {
        if (!cancelled) setQuoteNumber(value);
      })
      .catch(() => {
        if (!cancelled) setQuoteNumber(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    keys.quoteNumberHint,
    keys.shipmentId,
    keys.sogNumber,
    refreshAccessToken,
    tokenLoading,
  ]);

  return { quoteNumber, loading: loading || tokenLoading };
}
