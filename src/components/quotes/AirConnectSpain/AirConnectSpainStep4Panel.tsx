import { QuoteGeneratingMessage } from "../QuoteGeneratingMessage";
import type { QuoteBtnPhase } from "../hooks/useQuoteGeneratingMessage";
import {
  AIR_CONNECT_CURRENCY,
  type AirConnectPricedOffer,
  type AirConnectQuotationResponse,
} from "../../../services/airConnectSpainQuote";
import { AIR_CONNECT_EXW_POSTAL_ERROR, isValidSpainPostalCode } from "./flow";

interface AirConnectSpainStep4PanelProps {
  isExw: boolean;
  exwPostalRetryActive: boolean;
  loading: boolean;
  error: string | null;
  quote: AirConnectQuotationResponse | null;
  pricedOffers: AirConnectPricedOffer[];
  step3Extra: number;
  selectedKey: string | null;
  onSelectOffer: (key: string) => void;
  postalCode: string;
  onPostalCodeChange: (value: string) => void;
  pickupFromAddress?: string;
  onRetryQuote: () => void;
  btnPhase: QuoteBtnPhase;
  onGenerateQuote: () => void;
  submitDisabled: boolean;
  onDownloadPdf?: () => void;
}

export function AirConnectSpainStep4Panel({
  isExw,
  exwPostalRetryActive,
  loading,
  error,
  quote,
  pricedOffers,
  step3Extra,
  selectedKey,
  onSelectOffer,
  postalCode,
  onPostalCodeChange,
  pickupFromAddress,
  onRetryQuote,
  btnPhase,
  onGenerateQuote,
  submitDisabled,
  onDownloadPdf,
}: AirConnectSpainStep4PanelProps) {
  const showExwPostalRetry =
    isExw && !loading && !quote && (exwPostalRetryActive || !!error);
  const postalIncomplete =
    postalCode.length > 0 && !isValidSpainPostalCode(postalCode);

  return (
    <div className="mb-4">
      <h6 className="qa-section-label mb-3">Opciones por aerolínea</h6>
      {loading && (
        <div className="text-center py-4 text-muted">
          <div className="spinner-border spinner-border-sm me-2" />
          Consultando tarifas…
        </div>
      )}

      {showExwPostalRetry && (
        <div className="alert alert-warning">
          <p className="mb-3">{error ?? AIR_CONNECT_EXW_POSTAL_ERROR}</p>
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-semibold mb-1">
                Código postal
              </label>
              <input
                type="text"
                className="form-control"
                inputMode="numeric"
                maxLength={5}
                value={postalCode}
                onChange={(e) =>
                  onPostalCodeChange(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Ej: 46001"
              />
              {postalIncomplete ? (
                <div className="form-text text-muted">
                  Ingresa los 5 dígitos del código postal.
                </div>
              ) : null}
            </div>
            <div className="col-md-auto">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!isValidSpainPostalCode(postalCode) || loading}
                onClick={onRetryQuote}
              >
                Cotizar
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !loading && !showExwPostalRetry && (
        <div className="alert alert-danger">{error}</div>
      )}

      {!loading && !error && !quote && (
        <div className="text-center py-4 text-muted small">
          No hay tarifas disponibles. Verifica el cargamento y pulsa{" "}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 align-baseline"
            onClick={onRetryQuote}
          >
            Cotizar de nuevo
          </button>
          .
        </div>
      )}

      {quote && !loading && (
        <>
          <div className="p-3 bg-light rounded border mb-3 small">
            <div className="row g-2">
              <div className="col-6 text-muted">Ruta</div>
              <div className="col-6 text-end fw-semibold">
                {quote.origin}
                {quote.cityName ? ` (${quote.cityName})` : ""} → {quote.destination}
              </div>
              {quote.postalCode ? (
                <>
                  <div className="col-6 text-muted">Código postal</div>
                  <div className="col-6 text-end fw-semibold">{quote.postalCode}</div>
                </>
              ) : null}
              {pickupFromAddress?.trim() ? (
                <>
                  <div className="col-6 text-muted">Dirección de recogida</div>
                  <div className="col-6 text-end fw-semibold">
                    {pickupFromAddress.trim()}
                  </div>
                </>
              ) : null}
              <div className="col-6 text-muted">Peso cobrable (API)</div>
              <div className="col-6 text-end fw-semibold">
                {(quote.parcelsData?.airChargeableWeight ?? 0).toFixed(2)} kg
              </div>
              <div className="col-6 text-muted">Cargos terrestres</div>
              <div className="col-6 text-end fw-semibold">
                {(quote.totalLand ?? 0).toFixed(2)} {AIR_CONNECT_CURRENCY}
              </div>
            </div>
          </div>

          <div className="qa-routes-table-wrap">
            <table className="qa-routes-table">
              <thead>
                <tr>
                  <th className="qa-rt-th-select"></th>
                  <th>Aerolínea</th>
                  <th>Tramo</th>
                  <th>Rate EUR/kg</th>
                  <th>Flete</th>
                  <th>Fuel</th>
                  <th>Fees</th>
                  <th>Total aéreo</th>
                  <th>Total c/ tierra</th>
                  {step3Extra > 0 ? <th>Serv. adic.</th> : null}
                  <th>Total estimado</th>
                </tr>
              </thead>
              <tbody>
                {[...pricedOffers]
                  .sort(
                    (a, b) =>
                      a.incomeWithLand +
                      step3Extra -
                      (b.incomeWithLand + step3Extra),
                  )
                  .map((offer) => {
                    const grandTotal = offer.incomeWithLand + step3Extra;
                    const isSelected = selectedKey === offer.key;
                    return (
                      <tr
                        key={offer.key}
                        className={isSelected ? "is-selected" : undefined}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectOffer(offer.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectOffer(offer.key);
                          }
                        }}
                      >
                        <td className="qa-rt-td-select">
                          <input
                            type="radio"
                            name="airconnect-offer"
                            checked={isSelected}
                            onChange={() => onSelectOffer(offer.key)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          {offer.airline}
                          {offer.via ? (
                            <div className="small text-muted">vía {offer.via}</div>
                          ) : null}
                        </td>
                        <td>{offer.freight}</td>
                        <td className="fw-semibold">
                          {offer.incomeRate.toFixed(2)}
                        </td>
                        <td>{offer.incomeFreight.toFixed(2)}</td>
                        <td>{offer.fuelAmount.toFixed(2)}</td>
                        <td>{offer.feesAmount.toFixed(2)}</td>
                        <td>{offer.incomeAirTotal.toFixed(2)}</td>
                        <td>{offer.incomeWithLand.toFixed(2)}</td>
                        {step3Extra > 0 ? (
                          <td>{step3Extra.toFixed(2)}</td>
                        ) : null}
                        <td className="fw-bold text-primary">
                          {grandTotal.toFixed(2)} {AIR_CONNECT_CURRENCY}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {selectedKey && (
            <div className="quote-submit-row mt-4">
              <QuoteGeneratingMessage btnPhase={btnPhase} />
              {btnPhase !== "done" ? (
                <button
                  type="button"
                  className={`qa-btn qa-btn-primary quote-submit-btn${btnPhase !== "idle" ? " is-morphed" : ""}`}
                  onClick={onGenerateQuote}
                  disabled={submitDisabled}
                >
                  <span className="quote-btn-content">
                    Generar Cotización
                    <i className="ti ti-arrow-right"></i>
                  </span>
                  {btnPhase === "loading" && <div className="quote-spinner-ring" />}
                </button>
              ) : (
                onDownloadPdf && (
                  <button
                    type="button"
                    className="qa-btn qa-btn-primary"
                    onClick={onDownloadPdf}
                  >
                    Descargar PDF
                  </button>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
