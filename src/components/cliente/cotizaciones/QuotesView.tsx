import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useClientOverride } from "@/contexts/ClientOverrideContext";
import { useReporteriaClientesContext } from "@/contexts/ReporteriaClientesContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useTrackingEmailPreferences } from "@/hooks/useTrackingEmailPreferences";
import { useTranslation } from "react-i18next";
import PageBannerHeader from "@/components/shared/layout/PageBannerHeader";
import LoadingTips from "@/components/cliente/embarques/LoadingTips";
import { DocumentosSection } from "@/components/cliente/documentos/DocumentosSection";
import { DocumentosSectionQuoteAir } from "@/components/cliente/documentos/DocumentosSectionQuoteAir";
import { DocumentosSectionQuoteOcean } from "@/components/cliente/documentos/DocumentosSectionQuoteOcean";
import TrackingEmailSuggestions from "@/components/shared/tracking/TrackingEmailSuggestions";
import QuotePdfResendCell from "./QuotePdfResendCell";
import { linbisFetch } from "@/services/linbisFetch";
import { buildLinbisListParams } from "@/services/linbisListFetch";
import {
  fetchQuoteProfitIndex,
  getShipmentFilterNumberFromProfitLink,
  lookupShipmentLinkFromProfitIndex,
  lookupShipmentNumberFromProfitIndex,
  normalizeQuoteNumber,
  type QuoteProfitIndex,
} from "@/services/linbisQuoteLookup";
import {
  addUniqueEmail,
  MAX_VISIBLE_TRACK_FOLLOWERS,
  OPERATIONS_FOLLOWER_EMAIL,
} from "@/services/trackingEmailPreferences";
import "@/components/cliente/styles/QuotesView.css";

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

interface Quote {
  id?: string | number;
  number?: string;
  date?: string;
  time?: string;
  validUntil_Date?: string;
  validUntil_Time?: string;
  transitDays?: number;
  customerReference?: string;
  issuingCompany?: string;
  contact?: string;
  contactAddress?: string;
  carrierBroker?: string;
  portOfReceipt?: string;
  shipper?: string;
  shipperAddress?: string;
  pickupFrom?: string;
  pickupFromAddress?: string;
  salesRep?: string;
  origin?: string;
  deperture_Date?: string;
  deperture_Time?: string;
  consignee?: string;
  consigneeAddress?: string;
  destination?: string;
  arrival_Date?: string;
  arrival_Time?: string;
  notes?: string;
  totalCargo_Pieces?: number;
  totalCargo_Container?: number;
  totalCargo_WeightDisplayValue?: string;
  totalCargo_VolumeDisplayValue?: string;
  totalCargo_VolumeWeightDisplayValue?: string;
  totalCharge_IncomeDisplayValue?: string;
  totalCharge_ExpenseDisplayValue?: string;
  totalCharge_ProfitDisplayValue?: string;
  paymentType?: string;
  hazardous?: string;
  currentFlow?: string;
  cargoStatus?: string;
  modeOfTransportation?: string;
  customFieldValues?: QuoteCustomFieldValue[];
  [key: string]: any;
}

function getQuoteTransportModeLabel(quote: Quote): string {
  const mode = quote.modeOfTransportation;
  if (typeof mode === "string") return mode;
  if (mode && typeof mode === "object") {
    const name = (mode as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "";
}

function isStrictQuoteAirMode(quote: Quote): boolean {
  return getQuoteTransportModeLabel(quote)
    .toLowerCase()
    .includes("40 - air");
}

function isStrictQuoteSeaMode(quote: Quote): boolean {
  const mode = getQuoteTransportModeLabel(quote).toLowerCase();
  return mode.includes("10 - vessel") || mode.includes("11 - vessel");
}

function getQuoteTrackType(quote: Quote): "air" | "ocean" | null {
  if (isStrictQuoteAirMode(quote)) return "air";
  if (isStrictQuoteSeaMode(quote)) return "ocean";
  return null;
}

function getQuoteTrackingNumber(quote: Quote): string {
  const fields = quote.customFieldValues;
  if (!Array.isArray(fields)) return "";
  const entry = fields.find(
    (field) =>
      field.customFieldId === QUOTE_TRACKING_CUSTOM_FIELD_ID &&
      (field.fieldName || "").trim().toLowerCase() === "tracking number",
  );
  const value = entry?.value;
  return typeof value === "string" ? value.trim() : "";
}

function shouldShowQuoteTracking(quote: Quote): boolean {
  return !!getQuoteTrackType(quote) && !!getQuoteTrackingNumber(quote);
}

const ITEMS_PER_PAGE = 15;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QUOTE_TRACKING_CUSTOM_FIELD_ID = 17;
const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

interface QuoteCustomFieldValue {
  customFieldId?: number;
  fieldName?: string;
  fieldType?: string;
  value?: string;
}

/* -- Helpers ------------------------------------------------ */

const getQuoteDate = (quote: Record<string, unknown>): string => {
  const candidates = [
    quote.date,
    quote.createdAt,
    quote.created_at,
    quote.dateCreated,
    quote.createdDate,
    quote.creationDate,
    quote.quoteDate,
    quote.quotationDate,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      "displayDate" in candidate &&
      typeof (candidate as { displayDate?: unknown }).displayDate === "string"
    ) {
      const displayDate = (candidate as { displayDate: string }).displayDate;
      if (displayDate.trim()) {
        return displayDate;
      }
    }
  }

  return "";
};

const normalizeQuote = (quote: Quote): Quote => ({
  ...quote,
  date: getQuoteDate(quote),
  number:
    quote.number !== null && quote.number !== undefined
      ? String(quote.number)
      : quote.number,
  customerReference:
    quote.customerReference !== null && quote.customerReference !== undefined
      ? String(quote.customerReference)
      : quote.customerReference,
});

function toSortableText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

function getQuoteDisplayReference(quote: Quote): string {
  const ref = quote.customerReference?.trim();
  return ref || "---";
}

function getQuoteNumberLabel(quote: Quote): string {
  const num = quote.number?.trim();
  return num || "---";
}

function getQuoteTransportDisplay(quote: Quote): string {
  const label = getQuoteTransportModeLabel(quote);
  if (label) return label;
  const mode = quote.modeOfTransportation;
  if (mode === null || mode === undefined || mode === "") return "---";
  if (typeof mode === "object") {
    const name = (mode as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name;
    return "---";
  }
  return String(mode);
}

function isQuoteValid(validUntilDate?: string): boolean | null {
  if (!validUntilDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(validUntilDate);
  until.setHours(23, 59, 59, 999);
  return until >= today;
}

/**
 * Detect if a quote was created from the portal and return the quote type.
 * Returns "AIR" | "FCL" | "LCL" | null
 */
function getPortalQuoteType(quote: Quote): "AIR" | "FCL" | "LCL" | null {
  const ref = (quote.customerReference || "").toLowerCase();
  if (ref.includes("portal") && ref.includes("[air")) return "AIR";
  if (ref.includes("portal") && ref.includes("[fcl")) return "FCL";
  if (ref.includes("portal") && ref.includes("[lcl")) return "LCL";
  return null;
}

/**
 * Map the quote type to the navigation tipoEnvio for Cotizador
 */
function mapQuoteTypeToTipoEnvio(
  type: "AIR" | "FCL" | "LCL",
): "AEREO" | "FCL" | "LCL" {
  if (type === "AIR") return "AEREO";
  return type;
}

function StatusBadge({ validUntilDate }: { validUntilDate?: string }) {
  const { t } = useTranslation();
  const valid = isQuoteValid(validUntilDate);
  if (valid === null)
    return <span className="qv-badge qv-badge--neutral">---</span>;
  return valid ? (
    <span className="qv-badge qv-badge--neutral">
      {t("quotesView.statusValid")}
    </span>
  ) : (
    <span className="qv-badge qv-badge--neutral" style={{ color: "#6b7280" }}>
      {t("quotesView.statusExpired")}
    </span>
  );
}

function FlowBadge({ currentFlow }: { currentFlow?: string | null }) {
  const flow = currentFlow || "Requested";
  const flowMap: Record<string, { label: string; extraClass?: string }> = {
    Requested: { label: "Solicitado" },
    Pricing: { label: "Tarificación" },
    Revision: { label: "Revisión" },
    Sent: { label: "Enviado" },
    Approved: { label: "Aprobado", extraClass: "qv-badge--completed" },
    Completed: { label: "Completado", extraClass: "qv-badge--valid" },
    Canceled: { label: "Cancelado", extraClass: "qv-badge--expired" },
  };
  const entry = flowMap[flow] ?? { label: flow };
  return (
    <span className={`qv-badge ${entry.extraClass ?? "qv-badge--neutral"}`}>
      {entry.label}
    </span>
  );
}

/* -- InfoField (modal) -------------------------------------- */
function InfoField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: any;
  fullWidth?: boolean;
}) {
  if (value === null || value === undefined || value === "" || value === "N/A")
    return null;
  return (
    <div className={`qv-info-field ${fullWidth ? "qv-info-field--full" : ""}`}>
      <div className="qv-info-field__label">{label}</div>
      <div className="qv-info-field__value">{String(value)}</div>
    </div>
  );
}

/* -- CollapsibleSection (modal) ----------------------------- */
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="qv-collapsible">
      <button
        className={`qv-collapsible__header ${isOpen ? "qv-collapsible__header--open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="qv-collapsible__title">{title}</span>
        <svg
          className={`qv-collapsible__chevron ${isOpen ? "qv-collapsible__chevron--open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && <div className="qv-collapsible__body">{children}</div>}
    </div>
  );
}

/* -- DetailTabs (accordion inline tabs) --------------------- */
interface TabDef {
  key: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  hidden?: boolean;
}

function DetailTabs({ tabs }: { tabs: TabDef[] }) {
  const visibleTabs = tabs.filter((t) => !t.hidden);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key || "");

  return (
    <div className="qv-tabs">
      <div className="qv-tabs__nav">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`qv-tabs__btn ${activeTab === tab.key ? "qv-tabs__btn--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(tab.key);
            }}
          >
            {tab.icon && <span className="qv-tabs__icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      {visibleTabs.map((tab) => (
        <div
          key={tab.key}
          className="qv-tabs__panel"
          hidden={activeTab !== tab.key}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "" || value === "N/A")
    return "-";
  return String(value);
}

function FieldGridSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="qv-field-section">
      <h4 className="qv-field-section__title">{title}</h4>
      <div className="qv-field-grid">{children}</div>
    </section>
  );
}

function FieldGridCell({
  label,
  value,
  children,
  action,
  className,
}: {
  label: string;
  value?: unknown;
  children?: React.ReactNode;
  action?: boolean;
  className?: string;
}) {
  const display = formatFieldValue(value);
  const cellClass = [
    action ? "qv-field-cell qv-field-cell--action" : "qv-field-cell",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cellClass}>
      {label ? <span className="qv-field-cell__label">{label}</span> : null}
      {children ?? (
        <span
          className={`qv-field-cell__value${display === "-" ? " qv-field-cell__value--muted" : ""}`}
        >
          {display}
        </span>
      )}
    </div>
  );
}

interface QuoteGeneralTabContentProps {
  quote: Quote;
  t: (key: string) => string;
  formatDateLong: (dateString?: string) => string;
  formatCLP: (priceString?: string) => string | null;
  shouldShowQuoteTracking: (quote: Quote) => boolean;
  isQuoteAlreadyTracked: (quote: Quote) => boolean;
  getQuoteTrackingNumber: (quote: Quote) => string;
  openTrackModal: (quote: Quote) => void;
  onOpenTracking: (type: "air" | "ocean") => void;
  showPdfAction?: boolean;
  hasPdf?: boolean;
  isDownloadingPdf?: boolean;
  onDownloadPdf?: () => void;
  isResendingPdf?: boolean;
  onResendPdf?: (params: {
    quoteNumber: string;
    emails: string[];
    customerReference?: string;
    ownerUsername?: string;
  }) => Promise<void>;
  resendToken?: string | null;
  resendOwnerUsername?: string;
  operationNumber?: string | null;
  operationFilterNumber?: string | null;
  operationNumberLoading?: boolean;
  onOpenShipment?: (params: {
    shipmentType: "air" | "ocean";
    filterNumber: string;
  }) => void;
}

function QuoteGeneralTabContent({
  quote,
  t,
  formatDateLong,
  formatCLP,
  shouldShowQuoteTracking,
  isQuoteAlreadyTracked,
  getQuoteTrackingNumber,
  openTrackModal,
  onOpenTracking,
  showPdfAction = false,
  hasPdf = false,
  isDownloadingPdf = false,
  onDownloadPdf,
  isResendingPdf = false,
  onResendPdf,
  resendToken = null,
  resendOwnerUsername,
  operationNumber = null,
  operationFilterNumber = null,
  operationNumberLoading = false,
  onOpenShipment,
}: QuoteGeneralTabContentProps) {
  const showTracking = shouldShowQuoteTracking(quote);
  const alreadyTracked = isQuoteAlreadyTracked(quote);
  const trackType = getQuoteTrackType(quote);
  const shipmentType = getQuoteTrackType(quote);
  const canOpenShipment =
    !operationNumberLoading &&
    !!operationNumber &&
    !!operationFilterNumber &&
    !!shipmentType &&
    !!onOpenShipment;

  return (
    <div className="qv-field-sections">
      <FieldGridSection title={t("quotesView.quoteDetails")}>
        <FieldGridCell label={t("quotesView.quoteNumber")} value={quote.number} />
        {operationNumberLoading ? (
          <FieldGridCell label={t("quotesView.quoteOperationNumber")} value="Cargando..." />
        ) : canOpenShipment ? (
          <FieldGridCell label={t("quotesView.quoteOperationNumber")}>
            <span
              className="qv-field-cell__value qv-field-cell__value--accent"
              onClick={(e) => {
                e.stopPropagation();
                onOpenShipment!({
                  shipmentType: shipmentType!,
                  filterNumber: operationFilterNumber!,
                });
              }}
              role="button"
              tabIndex={0}
              title={
                shipmentType === "air"
                  ? "Ver envío aéreo"
                  : "Ver envío marítimo"
              }
            >
              {operationNumber}
            </span>
          </FieldGridCell>
        ) : (
          <FieldGridCell label={t("quotesView.quoteOperationNumber")} value={operationNumber} />
        )}
        <FieldGridCell
          label={t("quotesView.issueDate")}
          value={quote.date ? formatDateLong(quote.date) : null}
        />
        <FieldGridCell
          label={t("quotesView.validUntil")}
          value={
            quote.validUntil_Date
              ? formatDateLong(quote.validUntil_Date)
              : null
          }
        />
        <FieldGridCell
          label={t("quotesView.customerRef")}
          value={quote.customerReference}
        />
        <FieldGridCell
          label={t("quotesView.carrierBroker")}
          value={quote.carrierBroker}
        />
        <FieldGridCell label="ID interno" value={quote.id} />
      </FieldGridSection>

      <FieldGridSection title={t("quotesView.logistics")}>
        <FieldGridCell
          label={t("quotesView.transitDaysLabel")}
          value={quote.transitDays}
        />
        <FieldGridCell
          label={t("quotesView.transportMode")}
          value={getQuoteTransportModeLabel(quote) || quote.modeOfTransportation}
        />
        <FieldGridCell
          label={t("quotesView.paymentType")}
          value={quote.paymentType}
        />
        {showTracking ? (
          <FieldGridCell
            label="Número de seguimiento"
            value={getQuoteTrackingNumber(quote)}
          />
        ) : null}
        <FieldGridCell
          label={t("quotesView.origin")}
          value={quote.origin}
        />
        <FieldGridCell
          label={t("quotesView.destination")}
          value={quote.destination}
        />
        {showTracking ? (
          <FieldGridCell label="" action>
            {alreadyTracked && trackType ? (
              <button
                type="button"
                className="qv-btn qv-accordion-track qv-accordion-track--linked qv-accordion-track--live"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTracking(trackType);
                }}
              >
                <span className="qv-accordion-track__dot-wrap" aria-hidden>
                  <span className="qv-accordion-track__dot-ring" />
                  <span className="qv-accordion-track__dot" />
                </span>
                Ver seguimiento
              </button>
            ) : (
              <button
                type="button"
                className="qv-btn qv-accordion-track qv-accordion-track--primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openTrackModal(quote);
                }}
              >
                Trackea tu envío
              </button>
            )}
          </FieldGridCell>
        ) : null}
      </FieldGridSection>

      <FieldGridSection title={t("quotesView.tabCargo")}>
        <FieldGridCell
          label={t("quotesView.totalPieces")}
          value={quote.totalCargo_Pieces}
        />
        <FieldGridCell
          label={t("quotesView.containers")}
          value={quote.totalCargo_Container}
        />
        <FieldGridCell
          label={t("quotesView.totalWeight")}
          value={quote.totalCargo_WeightDisplayValue}
        />
        <FieldGridCell
          label={t("quotesView.totalVolume")}
          value={quote.totalCargo_VolumeDisplayValue}
        />
        <FieldGridCell
          label={t("quotesView.volumeWeight")}
          value={quote.totalCargo_VolumeWeightDisplayValue}
        />
        <FieldGridCell
          label={t("quotesView.hazardous")}
          value={quote.hazardous}
        />
        <FieldGridCell
          label={t("quotesView.cargoStatus")}
          value={quote.cargoStatus}
        />
      </FieldGridSection>

      <FieldGridSection title={t("quotesView.tabFinancial")}>
        <FieldGridCell label={t("quotesView.totalExpense")}>
          <span className="qv-field-cell__value qv-field-cell__value--finance">
            {formatCLP(quote.totalCharge_IncomeDisplayValue) || "$0 CLP"}
          </span>
        </FieldGridCell>
        <FieldGridCell
          label={t("quotesView.estimatedAmount")}
          value={t("quotesView.estimatedAmount")}
        />
        <FieldGridCell label="Flujo actual" value={quote.currentFlow} />
        <FieldGridCell label="Ejecutivo comercial" value={quote.salesRep} />
        <FieldGridCell
          label={t("quotesView.resendQuote")}
          action={hasPdf}
        >
          <QuotePdfResendCell
            quoteNumber={quote.number || ""}
            hasPdf={hasPdf}
            customerReference={quote.customerReference}
            ownerUsername={resendOwnerUsername}
            token={resendToken}
            isSending={isResendingPdf}
            onSend={async (params) => {
              if (!onResendPdf) {
                throw new Error("No se pudo enviar el PDF.");
              }
              await onResendPdf(params);
            }}
          />
        </FieldGridCell>
        {showPdfAction ? (
          <FieldGridCell label={t("quotesView.thPDF")} action>
            {hasPdf ? (
              <button
                type="button"
                className="qv-pdf-btn"
                disabled={isDownloadingPdf}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadPdf?.();
                }}
              >
                {isDownloadingPdf ? (
                  <span
                    className="spinner-border spinner-border-sm"
                    style={{ width: "10px", height: "10px" }}
                  />
                ) : (
                  t("quotesView.download")
                )}
              </button>
            ) : (
              <span className="qv-field-cell__value qv-field-cell__value--muted">
                —
              </span>
            )}
          </FieldGridCell>
        ) : null}
      </FieldGridSection>
    </div>
  );
}

function getQuoteNumberForDocuments(quote: Quote): string {
  const num = quote.number?.trim();
  return num || String(quote.id || "");
}

interface QuoteDocumentCountBridgeProps {
  quote: Quote;
  setDocumentCounts: React.Dispatch<
    React.SetStateAction<Record<string | number, number>>
  >;
  children: (handlers: {
    onCotizacionCountChange: (count: number) => void;
    onOperacionalCountChange: (count: number) => void;
  }) => React.ReactNode;
}

function QuoteDocumentCountBridge({
  quote,
  setDocumentCounts,
  children,
}: QuoteDocumentCountBridgeProps) {
  const quoteKey = getQuoteNumberForDocuments(quote);
  const [cotizacionCount, setCotizacionCount] = useState(0);
  const [operacionalCount, setOperacionalCount] = useState(0);

  useEffect(() => {
    if (!quoteKey) return;
    setDocumentCounts((prev) => ({
      ...prev,
      [quoteKey]: cotizacionCount + operacionalCount,
    }));
  }, [cotizacionCount, operacionalCount, quoteKey, setDocumentCounts]);

  return (
    <>
      {children({
        onCotizacionCountChange: setCotizacionCount,
        onOperacionalCountChange: setOperacionalCount,
      })}
    </>
  );
}

interface QuoteDocumentsTabsProps {
  quote: Quote;
  setDocumentCounts: React.Dispatch<
    React.SetStateAction<Record<string | number, number>>
  >;
}

function QuoteDocumentsTabs({
  quote,
  setDocumentCounts,
}: QuoteDocumentsTabsProps) {
  const quoteNumber = getQuoteNumberForDocuments(quote);
  const trackType = getQuoteTrackType(quote);

  return (
    <QuoteDocumentCountBridge quote={quote} setDocumentCounts={setDocumentCounts}>
      {({ onCotizacionCountChange, onOperacionalCountChange }) => (
        <DetailTabs
          tabs={[
            {
              key: "documentos",
              label: "Documentos",
              content: (
                <DocumentosSection
                  quoteId={quoteNumber}
                  onCountChange={onCotizacionCountChange}
                />
              ),
            },
            {
              key: "documentos-operacionales",
              label: "Documentos Operacionales",
              hidden: !trackType,
              content:
                trackType === "air" ? (
                  <DocumentosSectionQuoteAir
                    quoteNumber={quoteNumber}
                    onCountChange={onOperacionalCountChange}
                  />
                ) : trackType === "ocean" ? (
                  <DocumentosSectionQuoteOcean
                    quoteNumber={quoteNumber}
                    onCountChange={onOperacionalCountChange}
                  />
                ) : null,
            },
          ]}
        />
      )}
    </QuoteDocumentCountBridge>
  );
}

interface QuoteDetailPanelProps {
  quote: Quote;
  documentsOnly: boolean;
  onClose: () => void;
  t: (key: string) => string;
  formatDateShort: (dateString?: string) => string;
  formatDateLong: (dateString?: string) => string;
  formatCLP: (priceString?: string) => string | null;
  shouldShowQuoteTracking: (quote: Quote) => boolean;
  isQuoteAlreadyTracked: (quote: Quote) => boolean;
  getQuoteTrackingNumber: (quote: Quote) => string;
  openTrackModal: (quote: Quote) => void;
  onOpenTracking: (type: "air" | "ocean") => void;
  setDocumentCounts: React.Dispatch<
    React.SetStateAction<Record<string | number, number>>
  >;
  availablePDFs: Set<string>;
  downloadingPDF: string | null;
  onDownloadPdf: (quoteNumber: string) => void;
  resendingPDF: string | null;
  onResendPdf: (params: {
    quoteNumber: string;
    emails: string[];
    customerReference?: string;
    ownerUsername?: string;
  }) => Promise<void>;
  resendToken: string | null;
  resendOwnerUsername?: string;
  operationNumber?: string | null;
  operationFilterNumber?: string | null;
  operationNumberLoading?: boolean;
  onOpenShipment?: (params: {
    shipmentType: "air" | "ocean";
    filterNumber: string;
  }) => void;
}

function QuoteDetailPanel({
  quote,
  documentsOnly,
  onClose,
  t,
  formatDateShort,
  formatDateLong,
  formatCLP,
  shouldShowQuoteTracking,
  isQuoteAlreadyTracked,
  getQuoteTrackingNumber,
  openTrackModal,
  onOpenTracking,
  setDocumentCounts,
  availablePDFs,
  downloadingPDF,
  onDownloadPdf,
  resendingPDF,
  onResendPdf,
  resendToken,
  resendOwnerUsername,
  operationNumber = null,
  operationFilterNumber = null,
  operationNumberLoading = false,
  onOpenShipment,
}: QuoteDetailPanelProps) {
  const quoteNumber = quote.number || "";
  const hasPdf = availablePDFs.has(quoteNumber);
  const trackType = getQuoteTrackType(quote);

  return (
    <>
      <div className="qv-split-detail__header">
        <div>
          <span className="qv-split-detail__eyebrow">
            {t("quotesView.customerRef")}
          </span>
          <h3 className="qv-split-detail__title">
            {quote.customerReference || "—"}
          </h3>
        </div>
        <button
          type="button"
          className="qv-split-detail__close"
          onClick={onClose}
          aria-label={t("quotesView.close")}
        >
          {t("quotesView.close")}
        </button>
      </div>
      <div className="qv-split-detail__body">

        <div className="qv-route-card">
          <div className="qv-route-card__point">
            <span className="qv-route-card__label">{t("quotesView.origin")}</span>
            <span className="qv-route-card__value">{quote.origin || "N/A"}</span>
            {quote.deperture_Date && (
              <span className="qv-route-card__date">
                {formatDateShort(quote.deperture_Date)}
              </span>
            )}
          </div>
          <div className="qv-route-card__connector">
            <span className="qv-route-card__line" />
            {quote.transitDays != null && (
              <span className="qv-route-card__carrier">
                {quote.transitDays} {t("quotesView.transitDays")}
              </span>
            )}
          </div>
          <div className="qv-route-card__point qv-route-card__point--end">
            <span className="qv-route-card__label">
              {t("quotesView.destination")}
            </span>
            <span className="qv-route-card__value">
              {quote.destination || "N/A"}
            </span>
            {quote.arrival_Date && (
              <span className="qv-route-card__date">
                {formatDateShort(quote.arrival_Date)}
              </span>
            )}
          </div>
        </div>

        {documentsOnly ? (
          <QuoteDocumentsTabs
            quote={quote}
            setDocumentCounts={setDocumentCounts}
          />
        ) : (
          <QuoteDocumentCountBridge
            quote={quote}
            setDocumentCounts={setDocumentCounts}
          >
            {({ onCotizacionCountChange, onOperacionalCountChange }) => (
              <DetailTabs
                tabs={[
                  {
                    key: "general",
                    label: t("quotesView.tabGeneral"),
                    icon: (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    ),
                    content: (
                      <QuoteGeneralTabContent
                        quote={quote}
                        t={t}
                        formatDateLong={formatDateLong}
                        formatCLP={formatCLP}
                        shouldShowQuoteTracking={shouldShowQuoteTracking}
                        isQuoteAlreadyTracked={isQuoteAlreadyTracked}
                        getQuoteTrackingNumber={getQuoteTrackingNumber}
                        openTrackModal={openTrackModal}
                        onOpenTracking={onOpenTracking}
                        showPdfAction
                        hasPdf={hasPdf}
                        isDownloadingPdf={downloadingPDF === quoteNumber}
                        onDownloadPdf={() => onDownloadPdf(quoteNumber)}
                        isResendingPdf={resendingPDF === quoteNumber}
                        onResendPdf={onResendPdf}
                        resendToken={resendToken}
                        resendOwnerUsername={resendOwnerUsername}
                        operationNumber={operationNumber}
                        operationFilterNumber={operationFilterNumber}
                        operationNumberLoading={operationNumberLoading}
                        onOpenShipment={onOpenShipment}
                      />
                    ),
                  },
                  {
                    key: "documentos",
                    label: t("quotesView.tabDocuments"),
                    icon: (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    ),
                    content: (
                      <DocumentosSection
                        quoteId={getQuoteNumberForDocuments(quote)}
                        onCountChange={onCotizacionCountChange}
                      />
                    ),
                  },
                  {
                    key: "documentos-operacionales",
                    label: "Documentos Operacionales",
                    hidden: !trackType,
                    icon: (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    ),
                    content:
                      trackType === "air" ? (
                        <DocumentosSectionQuoteAir
                          quoteNumber={getQuoteNumberForDocuments(quote)}
                          onCountChange={onOperacionalCountChange}
                        />
                      ) : trackType === "ocean" ? (
                        <DocumentosSectionQuoteOcean
                          quoteNumber={getQuoteNumberForDocuments(quote)}
                          onCountChange={onOperacionalCountChange}
                        />
                      ) : null,
                  },
                  {
                    key: "notas",
                    label: t("quotesView.tabNotes"),
                    icon: (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    ),
                    hidden: !quote.notes || quote.notes === "N/A",
                    content: <div className="qv-notes">{quote.notes}</div>,
                  },
                ]}
              />
            )}
          </QuoteDocumentCountBridge>
        )}
      </div>
    </>
  );
}

/* ===========================================================
   MAIN COMPONENT
   =========================================================== */

function QuotesView({
  documentsOnly = false,
  initialQuoteFilter,
}: { documentsOnly?: boolean; initialQuoteFilter?: string } = {}) {
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();
  const clientOverride = useClientOverride();
  const { user, token, activeUsername: authUsername } = useAuth();
  const activeUsername = clientOverride || authUsername;
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const reporteriaClientesContext = useReporteriaClientesContext();
  const { registrarEvento } = useAuditLog();
  const { emails: savedTrackingEmails, remember: rememberTrackingEmails } =
    useTrackingEmailPreferences(activeUsername);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [displayedQuotes, setDisplayedQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF state
  const [availablePDFs, setAvailablePDFs] = useState<Set<string>>(new Set());
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [resendingPDF, setResendingPDF] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreQuotes, setHasMoreQuotes] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [tablePage, setTablePage] = useState(1);

  // Selection (split detail panel)
  const [selectedQuoteId, setSelectedQuoteId] = useState<
    string | number | null
  >(null);
  const [documentCounts, setDocumentCounts] = useState<
    Record<string | number, number>
  >({});

  const [profitIndex, setProfitIndex] = useState<{
    loading: boolean;
    fetched: boolean;
    index: QuoteProfitIndex;
  }>({
    loading: false,
    fetched: false,
    index: { byHbli: {}, bySog: {}, byShipmentId: {}, byQuote: {} },
  });

  const [operationNumberCache, setOperationNumberCache] = useState<
    Record<
      string,
      {
        value: string | null;
        filterNumber: string | null;
        loading: boolean;
        fetched: boolean;
      }
    >
  >({});

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("number");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Tracks whether an external filter (from initial prop / navigation state) is active
  // Using a ref avoids stale-closure issues inside the quick-search setTimeout
  const externalFilterApplied = React.useRef(false);

  // Search
  const [quickSearch, setQuickSearch] = useState("");
  const [showingAll, setShowingAll] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchNumber, setSearchNumber] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchOrigin, setSearchOrigin] = useState("");
  const [searchDestination, setSearchDestination] = useState("");
  const [showAllQuotes, setShowAllQuotes] = useState(false);

  // Advanced toolbar filters
  const [filterNumber, setFilterNumber] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [filterTransport, setFilterTransport] = useState("");
  const [filterPieces, setFilterPieces] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterValidUntil, setFilterValidUntil] = useState("");
  const [filterTransit, setFilterTransit] = useState("");

  const [trackedAirAwbs, setTrackedAirAwbs] = useState<Set<string>>(new Set());
  const [trackedOceanNumbers, setTrackedOceanNumbers] = useState<Set<string>>(
    new Set(),
  );
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackQuote, setTrackQuote] = useState<Quote | null>(null);
  const [trackType, setTrackType] = useState<"air" | "ocean" | null>(null);
  const [trackEmails, setTrackEmails] = useState<string[]>([""]);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const activeFilterCount = [
    filterNumber,
    filterStatus,
    filterOrigin,
    filterDestination,
    filterTransport,
    filterPieces,
    filterDate,
    filterValidUntil,
    filterTransit,
  ].filter(Boolean).length;

  /* -- Format helpers --------------------------------------- */
  const formatDateShort = useCallback((dateString?: string) => {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  const formatDateLong = useCallback((dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const formatCLP = useCallback((priceString?: string) => {
    if (!priceString) return null;
    const numberMatch = priceString.match(/[\d.,]+/);
    if (!numberMatch) return priceString;
    const cleanNumber = numberMatch[0].replace(/,/g, "");
    const num = parseFloat(cleanNumber);
    if (isNaN(num)) return priceString;
    return `$${new Intl.NumberFormat("es-CL").format(num)} CLP`;
  }, []);

  /* -- Sorting ---------------------------------------------- */
  const handleSort = useCallback((column: string) => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection("desc");
      return column;
    });
  }, []);

  const sortedQuotes = useMemo(() => {
    const sorted = [...displayedQuotes].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortColumn) {
        case "number":
          valA = parseInt(String(a.number ?? "").replace(/\D/g, "") || "0", 10);
          valB = parseInt(String(b.number ?? "").replace(/\D/g, "") || "0", 10);
          break;
        case "customerReference":
          valA = toSortableText(a.customerReference || a.number);
          valB = toSortableText(b.customerReference || b.number);
          break;
        case "date":
          valA = a.date ? new Date(a.date).getTime() : 0;
          valB = b.date ? new Date(b.date).getTime() : 0;
          break;
        case "validUntil":
          valA = a.validUntil_Date ? new Date(a.validUntil_Date).getTime() : 0;
          valB = b.validUntil_Date ? new Date(b.validUntil_Date).getTime() : 0;
          break;
        case "origin":
          valA = toSortableText(a.origin);
          valB = toSortableText(b.origin);
          break;
        case "destination":
          valA = toSortableText(a.destination);
          valB = toSortableText(b.destination);
          break;
        case "transit":
          valA = a.transitDays || 0;
          valB = b.transitDays || 0;
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [displayedQuotes, sortColumn, sortDirection]);

  /* -- Table pagination (client-side slice) ----------------- */
  const totalTablePages = Math.max(
    1,
    Math.ceil(sortedQuotes.length / rowsPerPage),
  );
  const paginatedQuotes = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return sortedQuotes.slice(start, start + rowsPerPage);
  }, [sortedQuotes, tablePage, rowsPerPage]);

  const paginationRangeText = useMemo(() => {
    if (sortedQuotes.length === 0) return "0 de 0";
    const start = (tablePage - 1) * rowsPerPage + 1;
    const end = Math.min(tablePage * rowsPerPage, sortedQuotes.length);
    return `${start}-${end} de ${sortedQuotes.length}`;
  }, [tablePage, rowsPerPage, sortedQuotes.length]);

  const getQuoteRowId = useCallback(
    (quote: Quote, index: number) => quote.id || quote.number || index,
    [],
  );

  const selectedQuote = useMemo(() => {
    if (selectedQuoteId == null) return null;
    return (
      paginatedQuotes.find(
        (quote, index) => getQuoteRowId(quote, index) === selectedQuoteId,
      ) ?? null
    );
  }, [selectedQuoteId, paginatedQuotes, getQuoteRowId]);

  const selectedQuoteIndex = useMemo(() => {
    if (selectedQuoteId == null) return -1;
    return paginatedQuotes.findIndex(
      (quote, index) => getQuoteRowId(quote, index) === selectedQuoteId,
    );
  }, [selectedQuoteId, paginatedQuotes, getQuoteRowId]);

  useEffect(() => {
    if (selectedQuoteId == null) return;
    const stillVisible = paginatedQuotes.some(
      (quote, index) => getQuoteRowId(quote, index) === selectedQuoteId,
    );
    if (!stillVisible) setSelectedQuoteId(null);
  }, [paginatedQuotes, selectedQuoteId, getQuoteRowId]);

  const fetchOperationNumberForQuote = useCallback(
    async (quote: Quote) => {
      if (!accessToken) return;

      const cacheKey = normalizeQuoteNumber(quote.number);
      if (!cacheKey) return;

      const existing = operationNumberCache[cacheKey];
      if (existing?.loading) return;
      if (existing?.fetched) return;

      setOperationNumberCache((prev) => ({
        ...prev,
        [cacheKey]: {
          value: null,
          filterNumber: null,
          loading: true,
          fetched: false,
        },
      }));

      const finish = (value: string | null, filterNumber: string | null) => {
        setOperationNumberCache((prev) => ({
          ...prev,
          [cacheKey]: { value, filterNumber, loading: false, fetched: true },
        }));
      };

      try {
        let profit = profitIndex.index;
        if (!profitIndex.fetched) {
          profit = await fetchQuoteProfitIndex({
            accessToken,
            refreshAccessToken,
          });
          setProfitIndex({ loading: false, fetched: true, index: profit });
        }

        const link = lookupShipmentLinkFromProfitIndex(profit, quote.number);
        finish(
          lookupShipmentNumberFromProfitIndex(profit, quote.number),
          getShipmentFilterNumberFromProfitLink(link, getQuoteTrackType(quote)),
        );
      } catch (err) {
        console.error("Error fetching operation number from /Quotes/Profit:", err);
        finish(null, null);
      }
    },
    [
      accessToken,
      refreshAccessToken,
      operationNumberCache,
      profitIndex.fetched,
      profitIndex.index,
    ],
  );

  useEffect(() => {
    if (!selectedQuote) return;
    fetchOperationNumberForQuote(selectedQuote);
  }, [selectedQuote, fetchOperationNumberForQuote]);

  const selectedQuoteOperationEntry = useMemo(() => {
    if (!selectedQuote) return null;
    const cacheKey = normalizeQuoteNumber(selectedQuote.number);
    if (!cacheKey) {
      return {
        value: null,
        filterNumber: null,
        loading: false,
        fetched: true,
      };
    }
    return (
      operationNumberCache[cacheKey] ?? {
        value: null,
        filterNumber: null,
        loading: true,
        fetched: false,
      }
    );
  }, [selectedQuote, operationNumberCache]);

  useEffect(() => {
    setTablePage(1);
  }, [displayedQuotes]);

  /* -- Fetch ------------------------------------------------ */
  const fetchQuotes = async (
    page: number = 1,
    append: boolean = false,
    signal?: AbortSignal,
  ) => {
    if (!accessToken) {
      setError("Debes ingresar un token primero");
      return;
    }
    if (!activeUsername) {
      setError("No se pudo obtener el nombre de usuario");
      return;
    }
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const queryParams = buildLinbisListParams(
        activeUsername,
        page,
        ITEMS_PER_PAGE,
      );

      const response = await linbisFetch(
        `https://api.linbis.com/Quotes?${queryParams}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal,
        },
        accessToken,
        refreshAccessToken,
      );

      if (!response.ok) {
        if (response.status === 400) {
          if (page === 1 && !append) {
            setQuotes([]);
            setDisplayedQuotes([]);
          }
          setHasMoreQuotes(false);
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const quotesArray: Quote[] = (Array.isArray(data) ? data : []).map(
        normalizeQuote,
      );
      const sortedArr = quotesArray.sort((a, b) => {
        const nA = parseInt(String(a.number ?? "").replace(/\D/g, "") || "0", 10);
        const nB = parseInt(String(b.number ?? "").replace(/\D/g, "") || "0", 10);
        return nB - nA;
      });

      setHasMoreQuotes(quotesArray.length === ITEMS_PER_PAGE);

      const cacheKey = `quotesCache_${activeUsername}`;
      if (append && page > 1) {
        const combined = [...quotes, ...sortedArr].sort((a, b) => {
          const nA = parseInt(String(a.number ?? "").replace(/\D/g, "") || "0", 10);
          const nB = parseInt(String(b.number ?? "").replace(/\D/g, "") || "0", 10);
          return nB - nA;
        });
        setQuotes(combined);
        setDisplayedQuotes(combined);
        localStorage.setItem(cacheKey, JSON.stringify(combined));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      } else {
        setQuotes(sortedArr);
        setDisplayedQuotes(sortedArr);
        setShowingAll(false);
        localStorage.setItem(cacheKey, JSON.stringify(sortedArr));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : t("quotesView.unknownError"),
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  /* -- Initial load / cache --------------------------------- */
  useEffect(() => {
    if (!accessToken || !activeUsername) return;
    const cacheKey = `quotesCache_${activeUsername}`;
    const cachedQuotes = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);

    if (cachedQuotes && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const cacheAge = new Date().getTime() - parseInt(cacheTimestamp);
      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedQuotes).map(normalizeQuote);
        setQuotes(parsed);
        setDisplayedQuotes(parsed);
        if (cachedPage) setCurrentPage(parseInt(cachedPage));
        const lastPageSize = parsed.length % ITEMS_PER_PAGE;
        setHasMoreQuotes(lastPageSize === 0 && parsed.length >= ITEMS_PER_PAGE);
        setLoading(false);
        return;
      } else {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
        localStorage.removeItem(`${cacheKey}_page`);
      }
    }
    setCurrentPage(1);
    const controller = new AbortController();
    fetchQuotes(1, false, controller.signal);
    return () => controller.abort();
  }, [accessToken, activeUsername]);

  useEffect(() => {
    setTrackedAirAwbs(new Set());
    setTrackedOceanNumbers(new Set());
  }, [activeUsername]);

  useEffect(() => {
    if (!activeUsername) return;

    (async () => {
      try {
        const [airRes, oceanRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/shipsgo/shipments`),
          fetch(`${API_BASE_URL}/api/shipsgo/ocean/shipments`),
        ]);

        if (airRes.ok) {
          const airData = await airRes.json();
          const awbs = new Set<string>();
          for (const shipment of airData.shipments ?? []) {
            if (shipment.reference === activeUsername && shipment.awb_number) {
              awbs.add(shipment.awb_number.replace(/[\s-]/g, ""));
            }
          }
          setTrackedAirAwbs(awbs);
        }

        if (oceanRes.ok) {
          const oceanData = await oceanRes.json();
          const nums = new Set<string>();
          for (const shipment of oceanData.shipments ?? []) {
            if (shipment.reference !== activeUsername) continue;
            if (shipment.container_number) {
              nums.add(shipment.container_number.toUpperCase());
            }
            if (shipment.booking_number) {
              nums.add(shipment.booking_number.toUpperCase());
            }
          }
          setTrackedOceanNumbers(nums);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [activeUsername]);

  const isQuoteAlreadyTracked = (quote: Quote): boolean => {
    const trackingNumber = getQuoteTrackingNumber(quote);
    if (!trackingNumber) return false;

    const type = getQuoteTrackType(quote);
    if (type === "air") {
      return trackedAirAwbs.has(trackingNumber.replace(/[\s-]/g, ""));
    }
    if (type === "ocean") {
      return trackedOceanNumbers.has(trackingNumber.trim().toUpperCase());
    }
    return false;
  };

  const openTrackModal = (quote: Quote) => {
    const type = getQuoteTrackType(quote);
    if (!type || !getQuoteTrackingNumber(quote)) return;
    setTrackQuote(quote);
    setTrackType(type);
    setTrackEmails([""]);
    setTrackError(null);
    setShowTrackModal(true);
  };

  const closeTrackModal = () => {
    setShowTrackModal(false);
    setTrackQuote(null);
    setTrackType(null);
    setTrackEmails([""]);
    setTrackError(null);
  };

  const updateTrackEmail = (index: number, value: string) => {
    setTrackEmails((prev) =>
      prev.map((email, currentIndex) =>
        currentIndex === index ? value : email,
      ),
    );
  };

  const addTrackEmailField = () => {
    setTrackError(null);
    setTrackEmails((prev) => {
      if (prev.length >= MAX_VISIBLE_TRACK_FOLLOWERS) return prev;
      return [...prev, ""];
    });
  };

  const removeTrackEmailField = (index: number) => {
    setTrackError(null);
    setTrackEmails((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const handleSelectSuggestedTrackEmail = (email: string) => {
    setTrackError(null);
    setTrackEmails((prev) =>
      addUniqueEmail(prev, email, MAX_VISIBLE_TRACK_FOLLOWERS),
    );
  };

  const handleAddAllSuggestedTrackEmails = () => {
    setTrackError(null);
    setTrackEmails((prev) =>
      savedTrackingEmails.reduce(
        (currentEmails, email) =>
          addUniqueEmail(currentEmails, email, MAX_VISIBLE_TRACK_FOLLOWERS),
        prev,
      ),
    );
  };

  const handleTrackSubmit = async () => {
    if (!trackQuote || !trackType) return;

    const trackingNumber = getQuoteTrackingNumber(trackQuote).trim();
    if (!trackingNumber) {
      setTrackError("No se pudo obtener el número de seguimiento.");
      return;
    }

    const normalizedEmails = trackEmails
      .map((email) => email.trim())
      .filter(Boolean)
      .filter(
        (email) =>
          email.toLowerCase() !== OPERATIONS_FOLLOWER_EMAIL.toLowerCase(),
      );

    if (normalizedEmails.length === 0) {
      setTrackError("Debes ingresar al menos un correo electrónico.");
      return;
    }

    if (normalizedEmails.length > MAX_VISIBLE_TRACK_FOLLOWERS) {
      setTrackError(
        "Máximo 10 correos electrónicos visibles para seguimiento.",
      );
      return;
    }

    const invalidEmail = normalizedEmails.find(
      (email) => !EMAIL_REGEX.test(email),
    );
    if (invalidEmail) {
      setTrackError(`El correo ${invalidEmail} no es válido.`);
      return;
    }

    const uniqueEmails = new Map<string, string>();
    for (const email of normalizedEmails) {
      const key = email.toLowerCase();
      if (uniqueEmails.has(key)) {
        setTrackError("No repitas correos electrónicos en el seguimiento.");
        return;
      }
      uniqueEmails.set(key, email);
    }

    const followers = Array.from(uniqueEmails.values());

    if (!token) {
      setTrackError("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    setTrackLoading(true);
    setTrackError(null);

    try {
      let response: Response;

      if (trackType === "air") {
        const cleanAwb = trackingNumber.replace(/[\s-]/g, "");
        response = await fetch(`${API_BASE_URL}/api/shipsgo/shipments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reference: activeUsername,
            awb_number: cleanAwb,
            followers,
            tags: [],
          }),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/shipsgo/ocean/shipments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reference: activeUsername,
            carrier: "SG_XXXX",
            booking_number: trackingNumber,
            followers,
            tags: [],
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setTrackError("Ya existe un trackeo con este número en tu cuenta.");
        } else if (response.status === 402) {
          setTrackError(
            "No hay créditos disponibles. Contacta a tu ejecutivo de cuenta.",
          );
        } else {
          setTrackError(data.error || "Error al crear el trackeo.");
        }
        return;
      }

      void rememberTrackingEmails(followers).catch((rememberError) => {
        console.error(
          "No se pudieron guardar los correos usados en el tracking desde cotizaciones:",
          rememberError,
        );
      });

      if (trackType === "air") {
        const cleanAwb = trackingNumber.replace(/[\s-]/g, "");
        setTrackedAirAwbs((prev) => new Set(prev).add(cleanAwb));
      } else {
        setTrackedOceanNumbers((prev) =>
          new Set(prev).add(trackingNumber.trim().toUpperCase()),
        );
      }

      closeTrackModal();
      registrarEvento({
        accion: "TRACKING_CREADO",
        categoria: "TRACKING",
        descripcion: `Tracking ${trackType === "air" ? "aéreo" : "marítimo"} creado desde cotizaciones: ${trackingNumber}`,
        detalles: {
          tipo: trackType,
          numero: trackingNumber,
          cuenta: activeUsername,
          quoteNumber: trackQuote.number,
        },
        clienteAfectado: activeUsername || undefined,
      });

      if (reporteriaClientesContext) {
        reporteriaClientesContext.openTrackingTab(trackType);
      } else {
        navigate(
          trackType === "air" ? "/trackings-aereo" : "/trackings-maritimo",
        );
      }
    } catch {
      setTrackError(
        "Error de conexión. Verifica tu internet e intenta nuevamente.",
      );
    } finally {
      setTrackLoading(false);
    }
  };

  const handleOpenShipment = useCallback(
    ({
      shipmentType,
      filterNumber,
    }: {
      shipmentType: "air" | "ocean";
      filterNumber: string;
    }) => {
      const trimmed = filterNumber.trim();
      if (!trimmed) return;

      if (reporteriaClientesContext) {
        reporteriaClientesContext.openShipmentsTab(shipmentType, trimmed);
        return;
      }

      const route =
        shipmentType === "air" ? "/air-shipments" : "/ocean-shipments";
      navigate(route, { state: { shipmentFilterNumber: trimmed } });
    },
    [navigate, reporteriaClientesContext],
  );

  /* -- Quick search ----------------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      const term = quickSearch.trim().toLowerCase();
      if (!term) {
        // If an external (navigation/prop) filter is active, don't wipe it out
        if (externalFilterApplied.current) return;
        setDisplayedQuotes(quotes);
        setShowingAll(false);
        return;
      }
      // User is now driving quick search manually — release the external filter lock
      externalFilterApplied.current = false;
      const results = quotes.filter((q) => {
        const reference = toSortableText(q.customerReference || q.number);
        const number = toSortableText(q.number);
        const origin = toSortableText(q.origin);
        const destination = toSortableText(q.destination);
        const date = toSortableText(q.date);
        return (
          reference.includes(term) ||
          number.includes(term) ||
          origin.includes(term) ||
          destination.includes(term) ||
          date.includes(term)
        );
      });
      setDisplayedQuotes(results);
      setShowingAll(true);
    }, 250);
    return () => clearTimeout(t);
  }, [quickSearch, quotes]);

  /* -- Auto-apply initial quote filter (from navigation) ---- */
  useEffect(() => {
    const filterFromProp = initialQuoteFilter;
    const filterFromState = (
      location.state as {
        quoteFilter?: string;
        quoteFilterNumber?: string;
      }
    )?.quoteFilterNumber;
    const legacyFilterFromState = (location.state as { quoteFilter?: string })
      ?.quoteFilter;
    const quoteFilter =
      filterFromProp || filterFromState || legacyFilterFromState;
    if (!quoteFilter || quotes.length === 0) return;

    // Lock: prevent the quick-search effect from resetting this filter
    externalFilterApplied.current = true;
    setFilterNumber(quoteFilter);
    const term = quoteFilter.trim().toLowerCase();
    const filtered = quotes.filter((q) =>
      toSortableText(q.number).includes(term) ||
      toSortableText(q.customerReference).includes(term),
    );
    setDisplayedQuotes(filtered);
    setShowingAll(true);
    setTablePage(1);

    // Clear location state so it doesn't re-apply on re-renders
    if (filterFromState) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [initialQuoteFilter, quotes]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -- Unique origins/destinations -------------------------- */
  const uniqueOrigins = useMemo(
    () =>
      quotes
        .map((q) => q.origin)
        .filter((o) => o && o !== "N/A")
        .filter((v, i, s) => s.indexOf(v) === i)
        .sort(),
    [quotes],
  );
  const uniqueDestinations = useMemo(
    () =>
      quotes
        .map((q) => q.destination)
        .filter((d) => d && d !== "N/A")
        .filter((v, i, s) => s.indexOf(v) === i)
        .sort(),
    [quotes],
  );

  /* -- Search handlers -------------------------------------- */
  const loadMoreQuotes = () => {
    const next = currentPage + 1;
    setCurrentPage(next);
    fetchQuotes(next, true);
  };

  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedQuotes(quotes);
      setShowingAll(false);
      setShowAllQuotes(false);
      return;
    }
    const term = searchNumber.trim().toLowerCase();
    setDisplayedQuotes(
      quotes.filter(
        (q) =>
          toSortableText(q.number).includes(term) ||
          toSortableText(q.customerReference).includes(term),
      ),
    );
    setShowingAll(true);
    setShowAllQuotes(false);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedQuotes(quotes);
      setShowingAll(false);
      setShowAllQuotes(false);
      return;
    }
    setDisplayedQuotes(
      quotes.filter((q) => {
        if (!q.date) return false;
        return new Date(q.date).toISOString().split("T")[0] === searchDate;
      }),
    );
    setShowingAll(true);
    setShowAllQuotes(false);
    setShowSearchModal(false);
  };

  const handleSearchByDateRange = () => {
    if (!searchStartDate && !searchEndDate) {
      setDisplayedQuotes(quotes);
      setShowingAll(false);
      setShowAllQuotes(false);
      return;
    }
    setDisplayedQuotes(
      quotes.filter((q) => {
        if (!q.date) return false;
        const d = new Date(q.date);
        if (searchStartDate && searchEndDate) {
          const s = new Date(searchStartDate);
          const e = new Date(searchEndDate);
          e.setHours(23, 59, 59, 999);
          return d >= s && d <= e;
        }
        if (searchStartDate) return d >= new Date(searchStartDate);
        if (searchEndDate) {
          const e = new Date(searchEndDate);
          e.setHours(23, 59, 59, 999);
          return d <= e;
        }
        return false;
      }),
    );
    setShowingAll(true);
    setShowAllQuotes(false);
    setShowSearchModal(false);
  };

  const handleSearchByRoute = () => {
    if (!searchOrigin && !searchDestination) {
      setDisplayedQuotes(quotes);
      setShowingAll(false);
      setShowAllQuotes(false);
      return;
    }
    setDisplayedQuotes(
      quotes.filter(
        (q) =>
          (!searchOrigin || q.origin === searchOrigin) &&
          (!searchDestination || q.destination === searchDestination),
      ),
    );
    setShowingAll(true);
    setShowAllQuotes(false);
    setShowSearchModal(false);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    let filtered = quotes;
    if (filterNumber.trim()) {
      const term = filterNumber.trim().toLowerCase();
      filtered = filtered.filter((q) =>
        toSortableText(q.number).includes(term),
      );
    }
    if (filterStatus.trim()) {
      const term = filterStatus.trim().toLowerCase();
      filtered = filtered.filter((q) => {
        const valid = isQuoteValid(q.validUntil_Date);
        if (term === "valida" || term === "vencida") {
          return term === "valida" ? valid === true : valid === false;
        }
        return (q.validUntil_Date || "").toLowerCase().includes(term);
      });
    }
    if (filterOrigin.trim()) {
      const term = filterOrigin.trim().toLowerCase();
      filtered = filtered.filter((q) =>
        (q.origin || "").toLowerCase().includes(term),
      );
    }
    if (filterDestination.trim()) {
      const term = filterDestination.trim().toLowerCase();
      filtered = filtered.filter((q) =>
        (q.destination || "").toLowerCase().includes(term),
      );
    }
    if (filterTransport.trim()) {
      const term = filterTransport.trim().toLowerCase();
      filtered = filtered.filter((q) =>
        toSortableText(getQuoteTransportDisplay(q)).includes(term),
      );
    }
    if (filterPieces.trim()) {
      const term = filterPieces.trim();
      filtered = filtered.filter((q) =>
        (q.totalCargo_Pieces ?? "")
          .toString()
          .toLowerCase()
          .includes(term.toLowerCase()),
      );
    }
    if (filterDate) {
      filtered = filtered.filter(
        (q) =>
          q.date && new Date(q.date).toISOString().split("T")[0] === filterDate,
      );
    }
    if (filterValidUntil) {
      filtered = filtered.filter(
        (q) =>
          q.validUntil_Date &&
          new Date(q.validUntil_Date).toISOString().split("T")[0] ===
          filterValidUntil,
      );
    }
    if (filterTransit.trim()) {
      const term = filterTransit.trim();
      filtered = filtered.filter((q) =>
        (q.transitDays ?? "").toString().includes(term),
      );
    }
    setDisplayedQuotes(filtered);
    setShowingAll(true);
    setTablePage(1);
    setShowSearchModal(false);
  };

  const clearSearch = useCallback(() => {
    externalFilterApplied.current = false;
    setQuickSearch("");
    setSearchNumber("");
    setSearchDate("");
    setSearchStartDate("");
    setSearchEndDate("");
    setSearchOrigin("");
    setSearchDestination("");
    // clear advanced filters
    setFilterNumber("");
    setFilterStatus("");
    setFilterOrigin("");
    setFilterDestination("");
    setFilterTransport("");
    setFilterPieces("");
    setFilterDate("");
    setFilterValidUntil("");
    setFilterTransit("");
    setDisplayedQuotes(quotes);
    setShowingAll(false);
    setShowAllQuotes(false);
    setTablePage(1);
  }, [quotes]);

  const refreshQuotes = useCallback(() => {
    if (!activeUsername) return;
    const k = `quotesCache_${activeUsername}`;
    localStorage.removeItem(k);
    localStorage.removeItem(`${k}_timestamp`);
    localStorage.removeItem(`${k}_page`);
    setCurrentPage(1);
    setQuotes([]);
    setDisplayedQuotes([]);
    fetchQuotes(1, false);
  }, [activeUsername]);

  const toggleQuoteSelection = useCallback((quote: Quote, index: number) => {
    const quoteKey = getQuoteRowId(quote, index);
    setSelectedQuoteId((prev) => (prev === quoteKey ? null : quoteKey));
  }, [getQuoteRowId]);

  /* -- Fetch available PDFs --------------------------------- */
  useEffect(() => {
    if (!token) return;
    const fetchPDFs = async () => {
      try {
        const pdfListParams = new URLSearchParams();
        if (activeUsername) {
          pdfListParams.set("ownerUsername", activeUsername);
        }

        const res = await fetch(
          `/api/quote-pdf/list?${pdfListParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.pdfs)) {
            const pdfNumbers = new Set<string>(
              data.pdfs.map((pdf: { quoteNumber: string }) => pdf.quoteNumber),
            );
            setAvailablePDFs(pdfNumbers);
          }
        }
      } catch (err) {
        console.error("[QuotesView] Error fetching PDF list:", err);
      }
    };
    fetchPDFs();
  }, [token, activeUsername]);

  const handleDownloadPDF = useCallback(
    async (quoteNumber: string) => {
      if (!token || !quoteNumber) return;
      setDownloadingPDF(quoteNumber);
      try {
        const downloadParams = new URLSearchParams();
        if (activeUsername) {
          downloadParams.set("ownerUsername", activeUsername);
        }

        const res = await fetch(
          `/api/quote-pdf/download/${encodeURIComponent(quoteNumber)}?${downloadParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error("PDF no encontrado");

        const contentType = res.headers.get("Content-Type") || "";

        // Nuevo flujo R2: el backend hace proxy del binario, sin CORS
        if (contentType.includes("application/pdf")) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const disposition = res.headers.get("Content-Disposition") || "";
          const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
          const filename = match
            ? decodeURIComponent(match[1].replace(/"/g, ""))
            : `Cotizacion_${quoteNumber}.pdf`;
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          return;
        }

        // Fallback legacy: contenidoBase64 (PDFs antiguos en MongoDB)
        const data = await res.json();
        if (data.success && data.quotePdf?.contenidoBase64) {
          const link = document.createElement("a");
          link.href = data.quotePdf.contenidoBase64;
          link.download =
            data.quotePdf.nombreArchivo || `Cotizacion_${quoteNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.error("Error descargando PDF:", err);
      } finally {
        setDownloadingPDF(null);
      }
    },
    [token, activeUsername],
  );

  const handleResendQuotePdf = useCallback(
    async ({
      quoteNumber,
      emails,
      customerReference,
      ownerUsername,
    }: {
      quoteNumber: string;
      emails: string[];
      customerReference?: string;
      ownerUsername?: string;
    }) => {
      if (!token || !quoteNumber) {
        throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      }

      setResendingPDF(quoteNumber);
      try {
        const res = await fetch("/api/quote-pdf/resend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quoteNumber,
            emails,
            customerReference,
            ownerUsername: ownerUsername || activeUsername,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "No se pudo enviar el correo.",
          );
        }

        registrarEvento({
          accion: "COTIZACION_PDF_REENVIADO",
          categoria: "COTIZACION",
          descripcion: `PDF de cotización ${quoteNumber} reenviado a ${data.recipientCount ?? emails.length} destinatario(s)`,
          detalles: {
            quoteNumber,
            recipientCount: data.recipientCount ?? emails.length,
            cuenta: activeUsername,
          },
          clienteAfectado: activeUsername || undefined,
        });
      } finally {
        setResendingPDF(null);
      }
    },
    [token, activeUsername, registrarEvento],
  );

  /* -- Sort icon -------------------------------------------- */
  const SortIcon = ({ column }: { column: string }) => {
    const active = sortColumn === column;
    return (
      <svg
        className={`qv-sort-icon ${active ? "qv-sort-icon--active" : ""} ${active && sortDirection === "asc" ? "qv-sort-icon--asc" : ""}`}
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M7 10l5 5 5-5z" />
      </svg>
    );
  };

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <div className="qv-container">
      <PageBannerHeader variant="quotes" rounded />

      {/* -- Toolbar (advanced search) ------------------------- */}
      <div
        className="qv-toolbar"
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            className={`qv-btn qv-btn--ghost qv-toolbar__icon-btn ${activeFilterCount > 0 ? "qv-toolbar__icon-btn--active" : ""}`}
            type="button"
            onClick={() => setShowSearchModal(true)}
            aria-label={t("quotesView.searchTitle")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <span className="qv-toolbar__badge">{activeFilterCount}</span>
            )}
          </button>
          <button
            className="qv-btn"
            style={{ color: "white", backgroundColor: "var(--primary-color)" }}
            onClick={refreshQuotes}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {t("quotesView.refresh")}
          </button>
          {loadingMore && (
            <span className="qv-loading-text">{t("quotesView.loading")}</span>
          )}
        </div>
      </div>

      {/* -- Search modal ------------------------------------ */}
      {showSearchModal && (
        <div className="qv-overlay" onClick={() => setShowSearchModal(false)}>
          <div
            className="qv-modal qv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="qv-modal__title">{t("quotesView.searchTitle")}</h5>
            <form
              onSubmit={handleApplyFilters}
              className="qv-filters-modal__form"
            >
              <div className="qv-search-section">
                <label className="qv-label">Filtros de tabla</label>
                <div className="qv-search-row">
                  <input
                    className="qv-input"
                    type="text"
                    placeholder={t("quotesView.filterNumber")}
                    value={filterNumber}
                    onChange={(e) => setFilterNumber(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                  <input
                    className="qv-input"
                    type="text"
                    placeholder={t("quotesView.filterStatus")}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                </div>
                <div className="qv-search-row">
                  <input
                    className="qv-input"
                    type="text"
                    placeholder={t("quotesView.filterOrigin")}
                    value={filterOrigin}
                    onChange={(e) => setFilterOrigin(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                  <input
                    className="qv-input"
                    type="text"
                    placeholder={t("quotesView.filterDestination")}
                    value={filterDestination}
                    onChange={(e) => setFilterDestination(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                </div>
                <div className="qv-search-row">
                  <input
                    className="qv-input"
                    type="text"
                    placeholder={t("quotesView.filterTransport")}
                    value={filterTransport}
                    onChange={(e) => setFilterTransport(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                  <input
                    className="qv-input"
                    type="text"
                    placeholder={t("quotesView.filterPieces")}
                    value={filterPieces}
                    onChange={(e) => setFilterPieces(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                  <input
                    className="qv-input"
                    type="text"
                    placeholder={t("quotesView.filterTransit")}
                    value={filterTransit}
                    onChange={(e) => setFilterTransit(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                </div>
                <div className="qv-search-row">
                  <input
                    className="qv-input"
                    type="date"
                    placeholder={t("quotesView.filterDate")}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                  <input
                    className="qv-input"
                    type="date"
                    placeholder={t("quotesView.filterValidUntil")}
                    value={filterValidUntil}
                    onChange={(e) => setFilterValidUntil(e.target.value)}
                    style={{ flex: 1, height: 44 }}
                  />
                </div>
                <div className="qv-modal__actions">
                  <button className="qv-btn qv-btn--primary" type="submit">
                    {t("quotesView.apply")}
                  </button>
                  <button
                    className="qv-btn qv-btn--ghost"
                    type="button"
                    onClick={clearSearch}
                  >
                    {t("quotesView.clear")}
                  </button>
                </div>
              </div>
            </form>
            <div className="qv-search-section">
              <label className="qv-label">
                {t("quotesView.searchByNumber")}
              </label>
              <input
                className="qv-input"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder={t("quotesView.searchPlaceholderNumber")}
              />
              <button
                className="qv-btn qv-btn--primary qv-btn--full"
                onClick={handleSearchByNumber}
              >
                {t("quotesView.search")}
              </button>
            </div>
            <div className="qv-search-section">
              <label className="qv-label">
                {t("quotesView.searchByRoute")}
              </label>
              <div className="qv-search-row">
                <select
                  className="qv-input"
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                >
                  <option value="">{t("quotesView.filterOrigin")}</option>
                  {uniqueOrigins.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <select
                  className="qv-input"
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                >
                  <option value="">{t("quotesView.filterDestination")}</option>
                  {uniqueDestinations.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="qv-btn qv-btn--primary qv-btn--full"
                onClick={handleSearchByRoute}
              >
                {t("quotesView.search")}
              </button>
            </div>
            <div className="qv-search-section">
              <label className="qv-label">
                {t("quotesView.searchByExactDate")}
              </label>
              <input
                className="qv-input"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <button
                className="qv-btn qv-btn--primary qv-btn--full"
                onClick={handleSearchByDate}
              >
                {t("quotesView.search")}
              </button>
            </div>
            <div className="qv-search-section">
              <label className="qv-label">
                {t("quotesView.searchByDateRange")}
              </label>
              <div className="qv-search-row">
                <div style={{ flex: 1 }}>
                  <span className="qv-label qv-label--small">
                    {t("quotesView.from")}
                  </span>
                  <input
                    className="qv-input"
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="qv-label qv-label--small">
                    {t("quotesView.to")}
                  </span>
                  <input
                    className="qv-input"
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="qv-btn qv-btn--primary qv-btn--full"
                onClick={handleSearchByDateRange}
              >
                {t("quotesView.search")}
              </button>
            </div>
            <button
              className="qv-btn qv-btn--ghost qv-btn--full"
              onClick={() => setShowSearchModal(false)}
            >
              {t("quotesView.close")}
            </button>
          </div>
        </div>
      )}

      {/* -- Loading ----------------------------------------- */}
      {/* Loading */}
      {loading && (
        <LoadingTips
          columns={[
            { label: t("quotesView.customerRef") },
            { label: t("quotesView.thNumber") },
            { label: "Etapa", center: true },
            { label: "Vigencia", center: true },
            { label: t("quotesView.thOrigin") },
            { label: t("quotesView.thDestination") },
            { label: t("quotesView.thTransport") },
            { label: t("quotesView.thIssueDate") },
            { label: t("quotesView.thValidUntil") },
            { label: t("quotesView.thTransit"), center: true },
            { label: t("quotesView.thPDF"), center: true },
          ]}
        />
      )}

      {/* -- Error ------------------------------------------- */}
      {error && (
        <div className="qv-error">
          <strong>{t("quotesView.error")}</strong> {error}
        </div>
      )}
      {/* =====================================================
          TABLE
         ===================================================== */}
      {!loading && displayedQuotes.length > 0 && (
        <div
          className={`qv-split-view${selectedQuote ? " qv-split-view--active" : ""}`}
        >
          <div className="qv-split-list">
            <div className="qv-table-wrapper">
              <div className="qv-table-scroll">
                <table className="qv-table">
                  <thead>
                    <tr>
                      <th
                        className="qv-th qv-th--sortable"
                        onClick={() => handleSort("customerReference")}
                      >
                        <span>{t("quotesView.customerRef")}</span>
                        <SortIcon column="customerReference" />
                      </th>
                      <th
                        className="qv-th qv-th--sortable qv-th--split-hidden"
                        onClick={() => handleSort("number")}
                      >
                        <span>{t("quotesView.thNumber")}</span>
                        <SortIcon column="number" />
                      </th>
                      <th className="qv-th qv-th--center">
                        <span>Etapa</span>
                      </th>
                      <th className="qv-th qv-th--center qv-th--split-hidden">
                        <span>Vigencia</span>
                      </th>
                      <th
                        className="qv-th qv-th--sortable"
                        onClick={() => handleSort("origin")}
                      >
                        <span>{t("quotesView.thOrigin")}</span>
                        <SortIcon column="origin" />
                      </th>
                      <th
                        className="qv-th qv-th--sortable"
                        onClick={() => handleSort("destination")}
                      >
                        <span>{t("quotesView.thDestination")}</span>
                        <SortIcon column="destination" />
                      </th>
                      <th className="qv-th qv-th--split-hidden">
                        <span>{t("quotesView.thTransport")}</span>
                      </th>
                      <th
                        className="qv-th qv-th--sortable qv-th--split-hidden"
                        onClick={() => handleSort("date")}
                      >
                        <span>{t("quotesView.thIssueDate")}</span>
                        <SortIcon column="date" />
                      </th>
                      <th
                        className="qv-th qv-th--sortable"
                        onClick={() => handleSort("validUntil")}
                      >
                        <span>{t("quotesView.thValidUntil")}</span>
                        <SortIcon column="validUntil" />
                      </th>
                      <th
                        className="qv-th qv-th--center qv-th--sortable qv-th--split-hidden"
                        onClick={() => handleSort("transit")}
                      >
                        <span>{t("quotesView.thTransit")}</span>
                        <SortIcon column="transit" />
                      </th>
                      <th className="qv-th qv-th--center qv-th--split-hidden">
                        <span>{t("quotesView.thPDF")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQuotes.map((quote, index) => {
                      const quoteKey = getQuoteRowId(quote, index);
                      const isSelected = selectedQuoteId === quoteKey;
                      const referenceLabel = getQuoteDisplayReference(quote);
                      const numberLabel = getQuoteNumberLabel(quote);
                      const transportLabel = getQuoteTransportDisplay(quote);

                      return (
                        <tr
                          key={quoteKey}
                          className={`qv-tr${isSelected ? " qv-tr--selected" : ""}`}
                          onClick={() => toggleQuoteSelection(quote, index)}
                        >
                          <td
                            className="qv-td qv-td--reference"
                            title={referenceLabel}
                          >
                            {referenceLabel}
                          </td>
                          <td
                            className="qv-td qv-td--number qv-td--split-hidden"
                            title={numberLabel}
                          >
                            {numberLabel}
                          </td>
                          <td className="qv-td qv-td--center">
                            <FlowBadge currentFlow={quote.currentFlow} />
                          </td>
                          <td className="qv-td qv-td--center qv-td--split-hidden">
                            <StatusBadge validUntilDate={quote.validUntil_Date} />
                          </td>
                          <td
                            className="qv-td qv-td--truncate"
                            title={quote.origin || "---"}
                          >
                            {quote.origin || "---"}
                          </td>
                          <td
                            className="qv-td qv-td--truncate"
                            title={quote.destination || "---"}
                          >
                            {quote.destination || "---"}
                          </td>
                          <td
                            className="qv-td qv-td--split-hidden"
                            title={transportLabel}
                          >
                            {transportLabel}
                          </td>
                          <td className="qv-td qv-td--split-hidden">
                            {formatDateShort(quote.date)}
                          </td>
                          <td className="qv-td">
                            {formatDateShort(quote.validUntil_Date)}
                          </td>
                          <td className="qv-td qv-td--center qv-td--split-hidden">
                            {quote.transitDays != null
                              ? `${quote.transitDays}d`
                              : "---"}
                          </td>
                          <td
                            className="qv-td qv-td--center qv-td--split-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <QuotePdfResendCell
                              quoteNumber={quote.number || ""}
                              hasPdf={availablePDFs.has(quote.number || "")}
                              customerReference={quote.customerReference}
                              ownerUsername={activeUsername}
                              token={token}
                              isSending={resendingPDF === quote.number}
                              onSend={handleResendQuotePdf}
                              triggerLabel={t("quotesView.download")}
                              triggerClassName="qv-pdf-btn"
                              showSuccessMessage={false}
                              emptyVariant="table"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="qv-table-footer">
                <div className="qv-table-footer__left">
                  {loadingMore && (
                    <span className="qv-loading-text">
                      {t("quotesView.loading")}
                    </span>
                  )}
                </div>
                <div className="qv-table-footer__right">
                  <span className="qv-pagination-label">
                    {t("quotesView.rowsPerPage")}
                  </span>
                  <select
                    className="qv-pagination-select"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setTablePage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="qv-pagination-range">
                    {paginationRangeText}
                  </span>
                  <button
                    className="qv-pagination-btn"
                    disabled={tablePage <= 1}
                    onClick={() => setTablePage((p) => p - 1)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    className="qv-pagination-btn"
                    disabled={tablePage >= totalTablePages}
                    onClick={() => setTablePage((p) => p + 1)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {selectedQuote && selectedQuoteIndex >= 0 && (
            <aside className="qv-split-detail">
              <QuoteDetailPanel
                quote={selectedQuote}
                documentsOnly={documentsOnly}
                onClose={() => setSelectedQuoteId(null)}
                t={t}
                formatDateShort={formatDateShort}
                formatDateLong={formatDateLong}
                formatCLP={formatCLP}
                shouldShowQuoteTracking={shouldShowQuoteTracking}
                isQuoteAlreadyTracked={isQuoteAlreadyTracked}
                getQuoteTrackingNumber={getQuoteTrackingNumber}
                openTrackModal={openTrackModal}
                onOpenTracking={(type) => {
                  if (reporteriaClientesContext) {
                    reporteriaClientesContext.openTrackingTab(type);
                  } else {
                    navigate(
                      type === "air"
                        ? "/trackings-aereo"
                        : "/trackings-maritimo",
                    );
                  }
                }}
                setDocumentCounts={setDocumentCounts}
                availablePDFs={availablePDFs}
                downloadingPDF={downloadingPDF}
                onDownloadPdf={handleDownloadPDF}
                resendingPDF={resendingPDF}
                onResendPdf={handleResendQuotePdf}
                resendToken={token}
                resendOwnerUsername={activeUsername}
                operationNumber={selectedQuoteOperationEntry?.value ?? null}
                operationFilterNumber={
                  selectedQuoteOperationEntry?.filterNumber ?? null
                }
                operationNumberLoading={
                  selectedQuoteOperationEntry?.loading ?? false
                }
                onOpenShipment={handleOpenShipment}
              />
            </aside>
          )}
        </div>
      )}

      {/* -- Empty states ------------------------------------- */}
      {displayedQuotes.length === 0 &&
        !loading &&
        quotes.length > 0 &&
        showingAll && (
          <div className="qv-empty">
            <p className="qv-empty__title">
              {t("quotesView.emptySearchTitle")}
            </p>
            <p className="qv-empty__subtitle">
              {t("quotesView.emptySearchSubtitle")}
            </p>
            <button className="qv-btn qv-btn--primary" onClick={clearSearch}>
              {t("quotesView.viewAll")}
            </button>
          </div>
        )}

      {quotes.length === 0 && !loading && (
        <div className="qv-empty">
          <p className="qv-empty__title">{t("quotesView.emptyTitle")}</p>
          <p className="qv-empty__subtitle">{t("quotesView.emptySubtitle")}</p>
        </div>
      )}

      {showTrackModal && trackQuote && trackType && (
        <div className="qv-overlay" onClick={closeTrackModal}>
          <div
            className="qv-modal qv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="qv-modal__title">Trackea tu envío</h3>

            <div style={{ marginBottom: 16 }}>
              <label className="qv-label">
                {trackType === "air" ? "AWB Number" : "HBL Number"}
              </label>
              <input
                className="qv-input"
                type="text"
                value={getQuoteTrackingNumber(trackQuote)}
                disabled
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  gap: 12,
                }}
              >
                <label className="qv-label" style={{ marginBottom: 0 }}>
                  Correo electrónico para seguimiento
                </label>
                <button
                  type="button"
                  className="qv-btn qv-btn--ghost qv-btn--sm"
                  onClick={addTrackEmailField}
                  disabled={trackEmails.length >= MAX_VISIBLE_TRACK_FOLLOWERS}
                >
                  +
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {trackEmails.map((email, index) => (
                  <div
                    key={`quote-track-email-${index}`}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      className="qv-input"
                      type="email"
                      value={email}
                      onChange={(e) => updateTrackEmail(index, e.target.value)}
                      placeholder={`Correo ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="qv-btn qv-btn--ghost qv-btn--sm"
                      onClick={() => removeTrackEmailField(index)}
                      disabled={trackEmails.length === 1}
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>
              <small className="qv-hint">
                Puedes agregar hasta 9 correos visibles. El correo de operaciones
                se agrega automáticamente.
              </small>
            </div>
            <TrackingEmailSuggestions
              savedEmails={savedTrackingEmails}
              selectedEmails={trackEmails.filter((email) => email.trim())}
              onSelectEmail={handleSelectSuggestedTrackEmail}
              onAddAll={handleAddAllSuggestedTrackEmails}
            />

            {trackError && <div className="qv-error">{trackError}</div>}

            <p className="qv-modal__question">
              ¿Deseas generar el nuevo rastreo de tu envío?
            </p>

            <div className="qv-modal__actions">
              <button className="qv-btn qv-btn--ghost" onClick={closeTrackModal}>
                No
              </button>
              <button
                className="qv-btn qv-btn--primary"
                onClick={handleTrackSubmit}
                disabled={trackLoading}
              >
                {trackLoading ? "Creando" : "Sí"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuotesView;
