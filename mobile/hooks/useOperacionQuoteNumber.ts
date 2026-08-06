import { useEffect, useState } from "react";
import { normalizeQuoteNumber } from "../../src/services/linbisQuoteLookup";
import { useAuth } from "../auth/AuthContext";
import {
  ensureProfitIndex,
  resolveShipmentQuoteNumber,
} from "../services/operacionQuoteTrackingCache";
import { useLinbisToken } from "./useLinbisToken";

export function useOperacionQuoteNumber(keys: {
  sogNumber?: string | null;
  shipmentId?: number | string | null;
  quoteNumberHint?: string | null;
  charges?: unknown;
}) {
  const { activeUsername } = useAuth();
  const { accessToken, refreshAccessToken, loading: tokenLoading } =
    useLinbisToken();
  const [quoteNumber, setQuoteNumber] = useState<string | null>(
    keys.quoteNumberHint?.trim() || null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (tokenLoading || !accessToken || !activeUsername) return;

    const hinted = normalizeQuoteNumber(keys.quoteNumberHint);
    if (hinted) {
      setQuoteNumber(hinted);
      setLoading(false);
      return;
    }

    setLoading(true);
    void ensureProfitIndex(activeUsername, {
      accessToken,
      refreshAccessToken,
    })
      .then((index) => {
        if (cancelled) return;
        setQuoteNumber(
          resolveShipmentQuoteNumber(
            {
              number: keys.sogNumber,
              id: keys.shipmentId,
              charges: keys.charges,
            },
            index,
          ),
        );
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
    activeUsername,
    keys.charges,
    keys.quoteNumberHint,
    keys.shipmentId,
    keys.sogNumber,
    refreshAccessToken,
    tokenLoading,
  ]);

  return { quoteNumber, loading: loading || tokenLoading };
}
