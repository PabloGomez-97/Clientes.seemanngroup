import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchInvoiceComplement,
  fetchQuotesComplementForPeriod,
  type ClientFinancialPeriod,
  type InvoiceComplementData,
  type QuoteComplementSummary,
} from "@/services/linbisFinancialComplement";
import {
  getInvoiceCurrencyCode,
  type InvoiceLike,
} from "@/utils/invoiceFinancial";

type FetchOptions = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
};

type InvoiceComplementPanelProps = {
  invoiceKey: string;
  invoice: InvoiceLike;
  consigneeName: string;
  clientShipmentNumbers: Set<string>;
  fetchOptions: FetchOptions;
  formatCurrency: (value: number, currency?: string, decimals?: number) => string;
};

function formatQuoteAmount(
  quote: QuoteComplementSummary,
  formatCurrency: InvoiceComplementPanelProps["formatCurrency"],
): string {
  const currency = quote.currency ?? "USD";
  return formatCurrency(quote.totalIncome, currency);
}

export function InvoiceComplementPanel({
  invoiceKey,
  invoice,
  consigneeName,
  clientShipmentNumbers,
  fetchOptions,
  formatCurrency,
}: InvoiceComplementPanelProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<InvoiceComplementData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError(false);

    fetchInvoiceComplement(
      invoiceKey,
      invoice,
      consigneeName,
      clientShipmentNumbers,
      {
        ...fetchOptions,
        signal: controller.signal,
      },
    )
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    invoiceKey,
    invoice,
    consigneeName,
    fetchOptions.accessToken,
    clientShipmentNumbers,
  ]);

  if (loading) {
    return (
      <div className="rf-complement rf-complement--loading">
        <span className="rf-complement__spinner" aria-hidden="true" />
        {t("reportFinancial.complementLoading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rf-complement rf-complement--error">
        {t("reportFinancial.complementError")}
      </div>
    );
  }

  if (!data?.shipmentAccounting && !data?.quote) {
    return (
      <div className="rf-complement rf-complement--empty">
        {t("reportFinancial.complementNoData")}
      </div>
    );
  }

  const invoiceCurrency = getInvoiceCurrencyCode(invoice);
  const invoiceTotal = invoice.totalAmount?.value ?? 0;
  const quoteCurrency = data.quote?.currency;
  const canCompare =
    Boolean(data.quote) &&
    invoiceTotal > 0 &&
    quoteCurrency &&
    quoteCurrency === invoiceCurrency;
  const delta =
    canCompare && data.quote
      ? invoiceTotal - data.quote.totalIncome
      : null;

  return (
    <div className="rf-complement">
      <div className="rf-cards-grid">
        {data.shipmentAccounting ? (
          <div className="rf-card">
            <h4>{t("reportFinancial.complementShipmentTitle")}</h4>
            <div className="rf-info-grid">
              <div className="rf-info-field">
                <div className="rf-info-field__label">
                  {t("reportFinancial.complementAccountingStatus")}
                </div>
                <div className="rf-info-field__value">
                  {data.shipmentAccounting.accountingStatus ||
                    t("reportFinancial.noData")}
                </div>
              </div>
              {data.shipmentAccounting.currentFlow ? (
                <div className="rf-info-field">
                  <div className="rf-info-field__label">
                    {t("reportFinancial.complementOperationFlow")}
                  </div>
                  <div className="rf-info-field__value">
                    {data.shipmentAccounting.currentFlow}
                  </div>
                </div>
              ) : null}
              {data.shipmentAccounting.waybillNumber ? (
                <div className="rf-info-field">
                  <div className="rf-info-field__label">
                    {t("reportFinancial.fieldWaybill")}
                  </div>
                  <div className="rf-info-field__value">
                    {data.shipmentAccounting.waybillNumber}
                  </div>
                </div>
              ) : null}
              {data.shipmentAccounting.customerReference ? (
                <div className="rf-info-field">
                  <div className="rf-info-field__label">
                    {t("reportFinancial.fieldCustomerRef")}
                  </div>
                  <div className="rf-info-field__value">
                    {data.shipmentAccounting.customerReference}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {data.quote ? (
          <div className="rf-card">
            <h4>{t("reportFinancial.complementQuoteTitle")}</h4>
            <div className="rf-info-grid">
              <div className="rf-info-field">
                <div className="rf-info-field__label">
                  {t("reportFinancial.complementQuoteNumber")}
                </div>
                <div className="rf-info-field__value">
                  {data.quoteNumber || data.quote.number}
                </div>
              </div>
              <div className="rf-info-field">
                <div className="rf-info-field__label">
                  {t("reportFinancial.complementQuoteStatus")}
                </div>
                <div className="rf-info-field__value">
                  {data.quote.status || t("reportFinancial.noData")}
                </div>
              </div>
              <div className="rf-info-field">
                <div className="rf-info-field__label">
                  {t("reportFinancial.complementQuoteIncome")}
                </div>
                <div className="rf-info-field__value">
                  {formatQuoteAmount(data.quote, formatCurrency)}
                </div>
              </div>
              {data.quote.modeOfTransportation ? (
                <div className="rf-info-field">
                  <div className="rf-info-field__label">
                    {t("reportFinancial.fieldServiceType")}
                  </div>
                  <div className="rf-info-field__value">
                    {data.quote.modeOfTransportation}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : data.quoteNumber ? (
          <div className="rf-card">
            <h4>{t("reportFinancial.complementQuoteTitle")}</h4>
            <p className="rf-complement__hint">
              {t("reportFinancial.complementQuoteNotFound")}
            </p>
          </div>
        ) : null}

        {canCompare && data.quote ? (
          <div className="rf-card rf-card--full">
            <h4>{t("reportFinancial.complementComparison")}</h4>
            <div className="rf-complement-compare">
              <div className="rf-complement-compare__item">
                <span>{t("reportFinancial.complementQuoteIncome")}</span>
                <strong>{formatQuoteAmount(data.quote, formatCurrency)}</strong>
              </div>
              <div className="rf-complement-compare__item">
                <span>{t("reportFinancial.complementInvoiceTotal")}</span>
                <strong>
                  {formatCurrency(invoiceTotal, invoiceCurrency)}
                </strong>
              </div>
              {delta !== null ? (
                <div className="rf-complement-compare__item">
                  <span>{t("reportFinancial.complementDelta")}</span>
                  <strong
                    className={
                      delta > 0
                        ? "rf-complement-compare__delta--up"
                        : delta < 0
                          ? "rf-complement-compare__delta--down"
                          : ""
                    }
                  >
                    {delta > 0 ? "+" : ""}
                    {formatCurrency(delta, invoiceCurrency)}
                  </strong>
                </div>
              ) : null}
            </div>
          </div>
        ) : data.quote && !canCompare ? (
          <div className="rf-card rf-card--full">
            <p className="rf-complement__hint">
              {t("reportFinancial.complementCurrencyMismatch")}
            </p>
          </div>
        ) : null}

        {data.quote?.chargeDetails.length ? (
          <div className="rf-card rf-card--full">
            <h4>{t("reportFinancial.complementQuoteCharges")}</h4>
            <div style={{ overflowX: "auto" }}>
              <table className="rf-charges-table">
                <thead>
                  <tr>
                    <th>{t("reportFinancial.chargesDescription")}</th>
                    <th className="rf-charges-table--right">
                      {t("reportFinancial.chargesAmount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.quote.chargeDetails.map((charge, index) => (
                    <tr key={`${charge.description}-${index}`}>
                      <td>{charge.description}</td>
                      <td className="rf-charges-table--right rf-charges-table--bold">
                        {formatCurrency(
                          charge.amount,
                          data.quote?.currency ?? "USD",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type PendingQuotesPanelProps = {
  consigneeName: string;
  period: ClientFinancialPeriod;
  fetchOptions: FetchOptions;
  formatCurrency: (value: number, currency?: string, decimals?: number) => string;
  formatDateShort: (dateString?: string) => string;
};

export function PendingQuotesPanel({
  consigneeName,
  period,
  fetchOptions,
  formatCurrency,
  formatDateShort,
}: PendingQuotesPanelProps) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<QuoteComplementSummary[]>([]);

  useEffect(() => {
    setLoaded(false);
    setQuotes([]);
    setError(null);
  }, [period, consigneeName]);

  const loadQuotes = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchQuotesComplementForPeriod(
        consigneeName,
        period,
        fetchOptions,
      );
      setQuotes(result);
      setLoaded(true);
    } catch {
      setError(t("reportFinancial.pendingQuotesError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rf-panel rf-panel--complement">
      <div className="rf-panel__header">
        <div>
          <h3 className="rf-panel__title">
            {t("reportFinancial.pendingQuotesTitle")}
          </h3>
          <p className="rf-panel__subtitle">
            {t("reportFinancial.pendingQuotesHint")}
          </p>
        </div>
        {!loaded ? (
          <button
            type="button"
            className="rf-btn rf-btn--secondary"
            onClick={loadQuotes}
            disabled={loading}
          >
            {loading
              ? t("reportFinancial.pendingQuotesLoading")
              : t("reportFinancial.pendingQuotesLoad")}
          </button>
        ) : (
          <button
            type="button"
            className="rf-btn rf-btn--ghost"
            onClick={loadQuotes}
            disabled={loading}
          >
            {loading
              ? t("reportFinancial.pendingQuotesLoading")
              : t("reportFinancial.refresh")}
          </button>
        )}
      </div>

      {error ? (
        <div className="rf-complement rf-complement--error">{error}</div>
      ) : null}

      {loaded && !loading && quotes.length === 0 ? (
        <p className="rf-complement__hint">
          {t("reportFinancial.pendingQuotesEmpty")}
        </p>
      ) : null}

      {quotes.length > 0 ? (
        <div className="rf-table-scroll">
          <table className="rf-table rf-table--compact">
            <thead>
              <tr>
                <th>{t("reportFinancial.thQuoteNumber")}</th>
                <th>{t("reportFinancial.thQuoteDate")}</th>
                <th>{t("reportFinancial.thQuoteRoute")}</th>
                <th className="rf-th rf-th--right">
                  {t("reportFinancial.thQuoteAmount")}
                </th>
                <th>{t("reportFinancial.thQuoteStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.slice(0, 10).map((quote) => (
                <tr key={quote.number}>
                  <td className="rf-td rf-td--number">{quote.number}</td>
                  <td className="rf-td">{formatDateShort(quote.date)}</td>
                  <td className="rf-td">
                    {[quote.origin, quote.destination]
                      .filter(Boolean)
                      .join(" → ") || "---"}
                  </td>
                  <td className="rf-td rf-td--right rf-td--bold">
                    {formatQuoteAmount(quote, formatCurrency)}
                  </td>
                  <td className="rf-td">{quote.status || "---"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {quotes.length > 10 ? (
            <p className="rf-complement__hint">
              {t("reportFinancial.pendingQuotesMore", {
                count: quotes.length - 10,
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
