import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ArrowLeft, Plane } from "lucide-react";
import LoadingTips from "./LoadingTips";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useClientOverride } from "@/contexts/ClientOverrideContext";
import PageBannerHeader from "@/components/shared/layout/PageBannerHeader";
import { useReporteriaClientesContext } from "@/contexts/ReporteriaClientesContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useTrackingEmailPreferences } from "@/hooks/useTrackingEmailPreferences";
import "./AirShipmentsView.css";
import { QuoteOperationalDocumentsSection } from "@/components/cliente/documentos/QuoteOperationalDocumentsSection";
import TrackingEmailSuggestions from "@/components/shared/tracking/TrackingEmailSuggestions";
import {
  addUniqueEmail,
  MAX_VISIBLE_TRACK_FOLLOWERS,
  OPERATIONS_FOLLOWER_EMAIL,
} from "@/services/trackingEmailPreferences";
import {
  type OutletContext,
  type AirShipment,
} from "@/components/cliente/embarques/Handlers/HandlerAirShipments";
import { MUNDOGAMING_DUMMY_SHIPMENTS } from "@/mocks/mundogaming";
import { linbisFetch } from "@/services/linbisFetch";
import {
  buildLinbisListParams,
  fetchAirShipmentRouteDetail,
  fetchAllLinbisByConsignee,
  fetchShippingOrderTrackingIndex,
  LINBIS_PAGE_SIZE,
} from "@/services/linbisListFetch";
import {
  flattenAirShipmentRecords,
  mapLinbisAirToAirShipment,
} from "@/services/linbisShipmentMappers";
import {
  type ShipsgoEtaEntry,
  formatShipsgoDateLong,
  formatShipsgoScheduledLabel,
  formatShipsgoTime,
  getShipsgoScheduledInitial,
} from "@/services/shipsgoEtaHelpers";
import {
  buildAirOpenTrackingTarget,
  type ShipsGoTrackingLocationState,
} from "@/services/shipsgoTrackingNavigation";
import {
  fetchQuoteProfitIndex,
  lookupQuoteFromProfitIndex,
  type QuoteProfitIndex,
} from "@/services/linbisQuoteLookup";

const ITEMS_PER_PAGE = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AIR_SHIPMENTS_CACHE_PREFIX = "airShipmentsCache_v3_";

interface CargoDetailCacheEntry {
  loading: boolean;
  fetched: boolean;
  cargoDescription: string | null;
  hazardous: boolean | null;
}

interface QuoteNumberCacheEntry {
  loading: boolean;
  fetched: boolean;
  quoteNumber: string | null;
}

interface AirRouteCacheEntry {
  loading: boolean;
  fetched: boolean;
  executedAt: { code?: string; name?: string } | null;
  destination: { code?: string; name?: string } | null;
}

interface TrackingNumberCacheEntry {
  loading: boolean;
  fetched: boolean;
  byNumber: Record<string, string>;
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function FieldGridSection({
  title,
  children,
  sectionRef,
  dataId,
}: {
  title: string;
  children: React.ReactNode;
  sectionRef?: (el: HTMLElement | null) => void;
  dataId?: string;
}) {
  return (
    <section
      ref={sectionRef}
      data-asv-section={dataId}
      className="asv-dsection"
    >
      <h3 className="asv-dsection__title">{title}</h3>
      <div className="asv-field-grid">{children}</div>
    </section>
  );
}

function FieldGridCell({
  label,
  value,
  accent,
  onClick,
  children,
  action,
}: {
  label: string;
  value?: unknown;
  accent?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  action?: boolean;
}) {
  const display = formatFieldValue(value);
  const cellClass = action
    ? "asv-field-cell asv-field-cell--action"
    : "asv-field-cell";

  return (
    <div className={cellClass}>
      {label ? <span className="asv-field-cell__label">{label}</span> : null}
      {children ?? (
        <span
          className={`asv-field-cell__value${display === "-" ? " asv-field-cell__value--muted" : ""}${accent ? " asv-field-cell__value--accent" : ""}`}
          onClick={onClick}
          role={onClick ? "button" : undefined}
          tabIndex={onClick ? 0 : undefined}
          onKeyDown={
            onClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick(e as unknown as React.MouseEvent);
                  }
                }
              : undefined
          }
        >
          {display}
        </span>
      )}
    </div>
  );
}

interface GeneralTabContentProps {
  shipment: AirShipment;
  cargoDetail: CargoDetailCacheEntry | undefined;
  quoteEntry: QuoteNumberCacheEntry | undefined;
  renderAccordionArrivalDate: () => React.ReactNode;
  onMountCargo: (
    shipmentId: string | number | undefined,
    number: string | undefined,
  ) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAllCommodities: (s: AirShipment) => any[];
  formatDate: (dateObj: unknown) => string;
  getDisplayedTrackAwbNumber: (s: AirShipment) => string;
  isTrackAwbLoading: (s: AirShipment) => boolean;
  isTrackAwbReady: (s: AirShipment) => boolean;
  isShipmentAlreadyTracked: (s: AirShipment) => boolean;
  openTrackModal: (s: AirShipment) => void;
  onOpenTracking: () => void;
  onOpenQuote: (quoteNumber: string) => void;
  registerSection: (id: string) => (el: HTMLElement | null) => void;
}

function GeneralTabContent({
  shipment,
  cargoDetail,
  quoteEntry,
  renderAccordionArrivalDate,
  onMountCargo,
  getAllCommodities,
  formatDate,
  getDisplayedTrackAwbNumber,
  isTrackAwbLoading,
  isTrackAwbReady,
  isShipmentAlreadyTracked,
  openTrackModal,
  onOpenTracking,
  onOpenQuote,
  registerSection,
}: GeneralTabContentProps) {
  useEffect(() => {
    onMountCargo(shipment.id, shipment.number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment.id]);

  const comms = getAllCommodities(shipment);
  const packageTypes = new Set<string>();
  for (const c of comms) {
    if (c.packageType?.description) {
      packageTypes.add(c.packageType.description);
    }
  }
  const totalPieces = comms.reduce(
    (sum: number, c: { pieces?: number }) => sum + (c.pieces || 0),
    0,
  );
  const totalWeight = comms.reduce(
    (sum: number, c: { totalWeightValue?: number }) =>
      sum + (c.totalWeightValue || 0),
    0,
  );
  const totalVolume = comms.reduce(
    (sum: number, c: { totalVolumeValue?: number }) =>
      sum + (c.totalVolumeValue || 0),
    0,
  );

  const cargoDescription = cargoDetail?.loading
    ? "Cargando..."
    : (cargoDetail?.cargoDescription ?? shipment.cargoDescription);

  const hazardousDisplay = cargoDetail?.loading
    ? "Cargando..."
    : cargoDetail?.hazardous != null
      ? cargoDetail.hazardous
      : undefined;

  const trackLoading = isTrackAwbLoading(shipment);
  const trackReady = isTrackAwbReady(shipment);
  const alreadyTracked = isShipmentAlreadyTracked(shipment);

  return (
    <>
      <FieldGridSection
        title="Detalles del envío"
        sectionRef={registerSection("detalles")}
        dataId="detalles"
      >
        <FieldGridCell label="Número de envío" value={shipment.number} />
        <FieldGridCell
          label="Referencia cliente"
          value={shipment.customerReference}
        />
        {quoteEntry?.loading ? (
          <FieldGridCell label="Número de cotización" value="Cargando..." />
        ) : quoteEntry?.quoteNumber ? (
          <FieldGridCell label="Número de cotización">
            <span
              className="asv-field-cell__value asv-field-cell__value--accent"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuote(quoteEntry.quoteNumber!);
              }}
              role="button"
              tabIndex={0}
              title="Ver cotización"
            >
              {quoteEntry.quoteNumber}
            </span>
          </FieldGridCell>
        ) : (
          <FieldGridCell label="Número de cotización" value={null} />
        )}
        <FieldGridCell label="Waybill" value={shipment.waybillNumber} />
        <FieldGridCell label="Carga" value={cargoDescription} />
        <FieldGridCell label="ID interno" value={shipment.id} />
      </FieldGridSection>

      <FieldGridSection
        title="Seguimiento y operación"
        sectionRef={registerSection("seguimiento")}
        dataId="seguimiento"
      >
        <FieldGridCell label="Carrier" value={shipment.carrier?.name} />
        <FieldGridCell
          label="Número de seguimiento"
          value={getDisplayedTrackAwbNumber(shipment)}
        />
        <FieldGridCell label="ID interno" value={shipment.id} />
        <FieldGridCell
          label="Fecha salida"
          value={
            shipment.departure
              ? formatDate(shipment.departure)
              : null
          }
        />
        <FieldGridCell label="Seguimiento de tu operación">
          {alreadyTracked ? (
            <button
              type="button"
              className="asv-btn asv-btn--sm asv-accordion-track asv-accordion-track--linked asv-accordion-track--live"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTracking();
              }}
            >
              <span className="asv-accordion-track__dot-wrap" aria-hidden>
                <span className="asv-accordion-track__dot-ring" />
                <span className="asv-accordion-track__dot" />
              </span>
              Ver seguimiento
            </button>
          ) : (
            <button
              type="button"
              className="asv-btn asv-btn--sm asv-accordion-track asv-accordion-track--primary"
              onClick={(e) => {
                e.stopPropagation();
                if (!trackReady) return;
                openTrackModal(shipment);
              }}
              disabled={!trackReady || trackLoading}
              title={
                trackReady
                  ? undefined
                  : trackLoading
                    ? "Espera a que se cargue el Número de Seguimiento."
                    : "No hay número de seguimiento disponible para este envío."
              }
            >
              {trackLoading
                ? "Cargando..."
                : trackReady
                  ? "Trackea tu envío"
                  : "Sin seguimiento"}
            </button>
          )}
        </FieldGridCell>
        <FieldGridCell label="Fecha llegada">
          {renderAccordionArrivalDate()}
        </FieldGridCell>
      </FieldGridSection>

      <FieldGridSection
        title="Información de carga"
        sectionRef={registerSection("carga")}
        dataId="carga"
      >
        <FieldGridCell
          label="Descripción de carga"
          value={cargoDescription}
        />
        <FieldGridCell
          label="Tipo de empaque"
          value={
            packageTypes.size > 0 ? Array.from(packageTypes).join(", ") : null
          }
        />
        <FieldGridCell
          label="Piezas"
          value={totalPieces > 0 ? totalPieces : null}
        />
        <FieldGridCell
          label="Peso total"
          value={totalWeight > 0 ? `${totalWeight} kg` : null}
        />
        <FieldGridCell
          label="Volumen total"
          value={totalVolume > 0 ? `${totalVolume} m³` : null}
        />
        <FieldGridCell
          label="¿Carga peligrosa?"
          value={hazardousDisplay}
        />
      </FieldGridSection>

      <FieldGridSection
        title="Detalle por ítem"
        sectionRef={registerSection("items")}
        dataId="items"
      >
        {comms.length === 0 ? (
          <FieldGridCell label="Sin ítems" value={null} />
        ) : (
          comms.map((commodity, index) => (
            <React.Fragment key={index}>
              {comms.length > 1 ? (
                <div className="asv-field-cell asv-field-cell--item-header">
                  Ítem {index + 1}
                </div>
              ) : null}
              <FieldGridCell
                label="Descripción"
                value={commodity.description}
              />
              <FieldGridCell label="Piezas" value={commodity.pieces} />
              <FieldGridCell
                label="Peso total"
                value={
                  commodity.totalWeightValue
                    ? `${commodity.totalWeightValue} kg`
                    : null
                }
              />
              <FieldGridCell
                label="Volumen total"
                value={
                  commodity.totalVolumeValue
                    ? `${commodity.totalVolumeValue} m³`
                    : null
                }
              />
              <FieldGridCell
                label="Tipo de empaque"
                value={commodity.packageType?.description}
              />
              {commodity.poNumber ? (
                <FieldGridCell label="Número PO" value={commodity.poNumber} />
              ) : null}
              {commodity.invoiceNumber ? (
                <FieldGridCell
                  label="Número de factura"
                  value={commodity.invoiceNumber}
                />
              ) : null}
            </React.Fragment>
          ))
        )}
      </FieldGridSection>
    </>
  );
}

interface AirShipmentDetailPanelProps {
  shipment: AirShipment;
  shipmentId: string | number;
  documentsOnly: boolean;
  onClose: () => void;
  formatAirportCell: (shipment: AirShipment, kind: "origin" | "dest") => string;
  formatDateInline: (displayDate: string | undefined) => string;
  effectiveArrivalDisplayDate: string;
  effectiveArrivalIsShipsgo: boolean;
  cargoDetail: CargoDetailCacheEntry | undefined;
  quoteEntry: QuoteNumberCacheEntry | undefined;
  renderAccordionArrivalDate: () => React.ReactNode;
  onMountCargo: (
    shipmentId: string | number | undefined,
    number: string | undefined,
  ) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAllCommodities: (s: AirShipment) => any[];
  formatDate: (dateObj: unknown) => string;
  getDisplayedTrackAwbNumber: (s: AirShipment) => string;
  isTrackAwbLoading: (s: AirShipment) => boolean;
  isTrackAwbReady: (s: AirShipment) => boolean;
  isShipmentAlreadyTracked: (s: AirShipment) => boolean;
  openTrackModal: (s: AirShipment) => void;
  onOpenTracking: () => void;
  onOpenQuote: (quoteNumber: string) => void;
}

function AirShipmentDetailPanel({
  shipment,
  shipmentId,
  documentsOnly,
  onClose,
  formatAirportCell,
  formatDateInline,
  effectiveArrivalDisplayDate,
  effectiveArrivalIsShipsgo,
  cargoDetail,
  quoteEntry,
  renderAccordionArrivalDate,
  onMountCargo,
  getAllCommodities,
  formatDate,
  getDisplayedTrackAwbNumber,
  isTrackAwbLoading,
  isTrackAwbReady,
  isShipmentAlreadyTracked,
  openTrackModal,
  onOpenTracking,
  onOpenQuote,
}: AirShipmentDetailPanelProps) {
  const hasNotes = !!shipment.notes;
  const trackLoading = isTrackAwbLoading(shipment);
  const trackReady = isTrackAwbReady(shipment);
  const alreadyTracked = isShipmentAlreadyTracked(shipment);

  const [activeSection, setActiveSection] = useState("detalles");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const navSections = useMemo(
    () =>
      [
        { id: "detalles", label: "Detalles del envío" },
        { id: "seguimiento", label: "Seguimiento y operación" },
        { id: "carga", label: "Información de carga" },
        { id: "items", label: "Detalle por ítem" },
        { id: "documentos", label: "Documentos Operacionales" },
        { id: "notas", label: "Notas", hidden: !hasNotes },
      ].filter((section) => !section.hidden),
    [hasNotes],
  );

  // Al cambiar de envío: volver arriba y reiniciar la sección activa
  useEffect(() => {
    setActiveSection("detalles");
    const layoutMain = document.querySelector<HTMLElement>(
      ".user-layout-main",
    );
    layoutMain?.scrollTo({ top: 0 });
  }, [shipmentId]);

  useEffect(() => {
    if (documentsOnly) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.getAttribute("data-asv-section");
        if (id) setActiveSection(id);
      },
      {
        // Compensa topbar sticky (~52px) + margen para marcar la sección activa
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.1, 0.5],
      },
    );
    navSections.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [navSections, shipmentId, documentsOnly]);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const registerSection =
    (id: string) =>
    (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
    };

  const headerBlock = (
    <header className="asv-dhead">
      <div className="asv-dhead__top">
        <div>
          <span className="asv-dhead__eyebrow">Referencia Cliente</span>
          <h2 className="asv-dhead__title">
            {shipment.customerReference || "—"}
          </h2>
        </div>
        <div className="asv-dhead__side">
          <span className="asv-detail__chip">
            <Plane size={13} aria-hidden />
            Aéreo
          </span>
          <div className="asv-dhead__actions">
            {quoteEntry?.quoteNumber && !quoteEntry.loading ? (
              <button
                type="button"
                className="asv-action-btn asv-action-btn--ghost"
                onClick={() => onOpenQuote(quoteEntry.quoteNumber!)}
              >
                Ver cotización
              </button>
            ) : null}
            {alreadyTracked ? (
              <button
                type="button"
                className="asv-action-btn"
                onClick={onOpenTracking}
              >
                Ver seguimiento
              </button>
            ) : (
              <button
                type="button"
                className="asv-action-btn"
                disabled={!trackReady || trackLoading}
                onClick={() => {
                  if (trackReady) openTrackModal(shipment);
                }}
              >
                {trackLoading
                  ? "Cargando..."
                  : trackReady
                    ? "Trackea tu envío"
                    : "Sin seguimiento"}
              </button>
            )}
          </div>
        </div>
      </div>
      <dl className="asv-dhead__meta">
        <div className="asv-dhead__field">
          <dt>N° de envío</dt>
          <dd>{shipment.number || "—"}</dd>
        </div>
        <div className="asv-dhead__field">
          <dt>Origen</dt>
          <dd>{formatAirportCell(shipment, "origin")}</dd>
        </div>
        <div className="asv-dhead__field">
          <dt>Destino</dt>
          <dd>{formatAirportCell(shipment, "dest")}</dd>
        </div>
        <div className="asv-dhead__field">
          <dt>Fecha salida</dt>
          <dd>
            {shipment.departure
              ? formatDateInline(
                  shipment.departure.date ?? shipment.departure.displayDate,
                )
              : "—"}
          </dd>
        </div>
        <div className="asv-dhead__field">
          <dt>Fecha llegada</dt>
          <dd>
            {effectiveArrivalDisplayDate
              ? effectiveArrivalIsShipsgo
                ? formatShipsgoDateLong(effectiveArrivalDisplayDate)
                : formatDateInline(effectiveArrivalDisplayDate)
              : "—"}
          </dd>
        </div>
        <div className="asv-dhead__field">
          <dt>Waybill</dt>
          <dd>{shipment.waybillNumber || "—"}</dd>
        </div>
      </dl>
    </header>
  );

  const summaryAside = (
    <aside className="asv-summary">
      <div className="asv-summary__panel">
        <h3 className="asv-summary__title">Resumen</h3>
        <dl className="asv-summary__rows">
          <div className="asv-summary__row">
            <dt>Carrier</dt>
            <dd>{shipment.carrier?.name || "—"}</dd>
          </div>
          <div className="asv-summary__row">
            <dt>Waybill</dt>
            <dd>{shipment.waybillNumber || "—"}</dd>
          </div>
          <div className="asv-summary__row">
            <dt>Tracking</dt>
            <dd>
              {trackLoading
                ? "Cargando"
                : alreadyTracked
                  ? "Activo"
                  : trackReady
                    ? "Disponible"
                    : "No disponible"}
            </dd>
          </div>
          <div className="asv-summary__row">
            <dt>Cotización</dt>
            <dd>{quoteEntry?.loading ? "Cargando..." : quoteEntry?.quoteNumber || "—"}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );

  if (documentsOnly) {
    return (
      <div className="asv-detail">
        <div className="asv-detail__topbar">
          <button type="button" className="asv-back" onClick={onClose}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Volver a embarques
          </button>
        </div>
        {headerBlock}
        <div className="asv-detail__docs-only">
          <QuoteOperationalDocumentsSection
            mode="air"
            quoteNumber={quoteEntry?.quoteNumber}
            loading={!!quoteEntry?.loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="asv-detail">
      <div className="asv-detail__topbar">
        <button type="button" className="asv-back" onClick={onClose}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          Volver a embarques
        </button>
      </div>

      {headerBlock}

      <div className="asv-detail__body">
        <aside className="asv-detail__nav">
          <nav
            className="asv-detail__nav-inner"
            aria-label="Secciones del envío"
          >
            {navSections.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`asv-detail__nav-item${
                  activeSection === id ? " asv-detail__nav-item--active" : ""
                }`}
                aria-current={activeSection === id ? "true" : undefined}
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="asv-detail__sections asv-sheet">
          <GeneralTabContent
            shipment={shipment}
            cargoDetail={cargoDetail}
            quoteEntry={quoteEntry}
            renderAccordionArrivalDate={renderAccordionArrivalDate}
            onMountCargo={onMountCargo}
            getAllCommodities={getAllCommodities}
            formatDate={formatDate}
            getDisplayedTrackAwbNumber={getDisplayedTrackAwbNumber}
            isTrackAwbLoading={isTrackAwbLoading}
            isTrackAwbReady={isTrackAwbReady}
            isShipmentAlreadyTracked={isShipmentAlreadyTracked}
            openTrackModal={openTrackModal}
            onOpenTracking={onOpenTracking}
            onOpenQuote={onOpenQuote}
            registerSection={registerSection}
          />

          <section
            ref={registerSection("documentos")}
            data-asv-section="documentos"
            className="asv-dsection"
          >
            <h3 className="asv-dsection__title">Documentos Operacionales</h3>
            <QuoteOperationalDocumentsSection
              mode="air"
              quoteNumber={quoteEntry?.quoteNumber}
              loading={!!quoteEntry?.loading}
            />
          </section>

          {hasNotes && (
            <section
              ref={registerSection("notas")}
              data-asv-section="notas"
              className="asv-dsection"
            >
              <h3 className="asv-dsection__title">Notas</h3>
              <div className="asv-notes">{shipment.notes}</div>
            </section>
          )}
        </main>

        {summaryAside}
      </div>
    </div>
  );
}

/* 
   MAIN COMPONENT
    */
function AirShipmentsView({
  documentsOnly = false,
  initialFilterNumber,
}: { documentsOnly?: boolean; initialFilterNumber?: string } = {}) {
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();
  const clientOverride = useClientOverride();
  const reporteriaClientesContext = useReporteriaClientesContext();
  const { registrarEvento } = useAuditLog();
  const { token, activeUsername: authUsername } = useAuth();
  const activeUsername = clientOverride || authUsername;
  const navigate = useNavigate();
  const location = useLocation();
  const { emails: savedTrackingEmails, remember: rememberTrackingEmails } =
    useTrackingEmailPreferences(activeUsername);

  const [shipments, setShipments] = useState<AirShipment[]>([]);
  const [displayedShipments, setDisplayedShipments] = useState<AirShipment[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedShipmentId, setSelectedShipmentId] = useState<
    string | number | null
  >(null);

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [tablePage, setTablePage] = useState(1);

  // Search / filter modal
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Track modal
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackShipment, setTrackShipment] = useState<AirShipment | null>(null);
  const [trackEmails, setTrackEmails] = useState<string[]>([""]);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Cargo details (cargoDescription, hazardous) — lazy, fetched on Cargo tab open
  const [cargoDetailsCache, setCargoDetailsCache] = useState<
    Record<string | number, CargoDetailCacheEntry>
  >({});

  // Quote number — lazy, fetched on accordion open
  const [quoteNumberCache, setQuoteNumberCache] = useState<
    Record<string | number, QuoteNumberCacheEntry>
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

  // Aeropuertos — lazy, fetched solo para la página visible
  const [routeCache, setRouteCache] = useState<
    Record<string | number, AirRouteCacheEntry>
  >({});

  // Tracking Number (AWB) — índice desde /api/shipping-orders por número SOG
  const [trackingIndex, setTrackingIndex] = useState<TrackingNumberCacheEntry>({
    loading: false,
    fetched: false,
    byNumber: {},
  });

  // Already-tracked AWBs (from ShipsGo)
  const [trackedAwbs, setTrackedAwbs] = useState<Set<string>>(new Set());
  /** ETA aerolínea (date_of_rcf + date_of_rcf_initial) por AWB, desde ShipsGo */
  const [shipsgoArrivalByAwb, setShipsgoArrivalByAwb] = useState<
    Record<string, ShipsgoEtaEntry>
  >({});

  // Filter fields
  const [filterNumber, setFilterNumber] = useState("");
  const [filterWaybill, setFilterWaybill] = useState("");
  const [filterClientReference, setFilterClientReference] = useState("");
  const [filterDepartureDate, setFilterDepartureDate] = useState("");
  const [filterArrivalDate, setFilterArrivalDate] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const appliedInitialFilterRef = useRef("");
  const routeInFlightRef = useRef<Set<string | number>>(new Set());
  const routeFetchedRef = useRef<Set<string | number>>(new Set());
  const trackingIndexAbortRef = useRef<AbortController | null>(null);
  const prevTrackingUsernameRef = useRef(activeUsername);

  const loadTrackingIndex = useCallback(
    (options?: { reset?: boolean }) => {
      if (!accessToken || !activeUsername) return;

      trackingIndexAbortRef.current?.abort();
      const controller = new AbortController();
      trackingIndexAbortRef.current = controller;

      setTrackingIndex((prev) => ({
        loading: true,
        fetched: options?.reset ? false : prev.fetched,
        byNumber: options?.reset ? {} : prev.byNumber,
      }));

      void (async () => {
        try {
          const byNumber = await fetchShippingOrderTrackingIndex(
            activeUsername,
            {
              accessToken,
              refreshAccessToken,
              signal: controller.signal,
            },
          );
          if (controller.signal.aborted) return;
          setTrackingIndex({ loading: false, fetched: true, byNumber });
        } catch {
          if (controller.signal.aborted) return;
          setTrackingIndex((prev) => ({
            loading: false,
            fetched: true,
            byNumber: prev.byNumber,
          }));
        }
      })();
    },
    [accessToken, activeUsername, refreshAccessToken],
  );
  const [showingAll, setShowingAll] = useState(false);

  // Focus states for floating labels
  const [isNumberFocused, setIsNumberFocused] = useState(false);
  const [isWaybillFocused, setIsWaybillFocused] = useState(false);
  const [isClientReferenceFocused, setIsClientReferenceFocused] =
    useState(false);
  const [isDepartureFocused, setIsDepartureFocused] = useState(false);
  const [isArrivalFocused, setIsArrivalFocused] = useState(false);
  const [isCarrierFocused, setIsCarrierFocused] = useState(false);

  const activeFilterCount = [
    filterNumber,
    filterWaybill,
    filterClientReference,
    filterDepartureDate,
    filterArrivalDate,
    filterCarrier,
  ].filter(Boolean).length;

  /* -- Table pagination (client-side slice) ----------------- */
  const totalTablePages = Math.max(
    1,
    Math.ceil(displayedShipments.length / rowsPerPage),
  );
  const paginatedShipments = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return displayedShipments.slice(start, start + rowsPerPage);
  }, [displayedShipments, tablePage, rowsPerPage]);

  const paginationRangeText = useMemo(() => {
    if (displayedShipments.length === 0) return "0 de 0";
    const start = (tablePage - 1) * rowsPerPage + 1;
    const end = Math.min(tablePage * rowsPerPage, displayedShipments.length);
    return `${start}-${end} de ${displayedShipments.length}`;
  }, [tablePage, rowsPerPage, displayedShipments.length]);

  useEffect(() => {
    setTablePage(1);
  }, [displayedShipments]);

  const getShipmentRowId = useCallback(
    (shipment: AirShipment, index: number) =>
      shipment.id || shipment.number || index,
    [],
  );

  const selectedShipment = useMemo(() => {
    if (selectedShipmentId == null) return null;
    return (
      paginatedShipments.find(
        (shipment, index) =>
          getShipmentRowId(shipment, index) === selectedShipmentId,
      ) ?? null
    );
  }, [selectedShipmentId, paginatedShipments, getShipmentRowId]);

  const selectedShipmentIndex = useMemo(() => {
    if (selectedShipmentId == null) return -1;
    return paginatedShipments.findIndex(
      (shipment, index) =>
        getShipmentRowId(shipment, index) === selectedShipmentId,
    );
  }, [selectedShipmentId, paginatedShipments, getShipmentRowId]);

  useEffect(() => {
    if (selectedShipmentId == null) return;
    const stillVisible = paginatedShipments.some(
      (shipment, index) =>
        getShipmentRowId(shipment, index) === selectedShipmentId,
    );
    if (!stillVisible) setSelectedShipmentId(null);
  }, [paginatedShipments, selectedShipmentId, getShipmentRowId]);

  /*  Helpers  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (dateObj: any) => {
    if (!dateObj) return "-";
    try {
      if (dateObj.date) {
        const d = new Date(dateObj.date);
        d.setTime(d.getTime() + 3600000);
        return d.toLocaleDateString("es-CL", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      if (!dateObj.displayDate || dateObj.displayDate.trim() === "") return "-";
      const [m, d, y] = dateObj.displayDate.split("/");
      return new Date(+y, +m - 1, +d).toLocaleDateString("es-CL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateObj.displayDate ?? "-";
    }
  };

  const formatDateInline = (displayDate: string | undefined) => {
    if (!displayDate || displayDate.trim() === "") return "-";
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(displayDate)) {
        const d = new Date(displayDate);
        d.setTime(d.getTime() + 3600000);
        return d.toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
      const [m, d, y] = displayDate.split("/");
      return new Date(+y, +m - 1, +d).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return displayDate;
    }
  };

  const formatShipsgoEtaTime = formatShipsgoTime;

  const normalizeAirAwbKey = (value?: string | null) =>
    (value ?? "").replace(/[\s-]/g, "");

  const resolveTrackingNumber = (shipment: AirShipment): string | null => {
    const shipmentNumber = shipment.number?.trim();
    if (shipmentNumber && trackingIndex.byNumber[shipmentNumber]) {
      return trackingIndex.byNumber[shipmentNumber];
    }
    if (typeof shipment.trackingNumber === "string" && shipment.trackingNumber.trim()) {
      return shipment.trackingNumber.trim();
    }
    return null;
  };

  const getAirShipsgoLookupKeys = (shipment: AirShipment): string[] => {
    const raw = [resolveTrackingNumber(shipment), shipment.number];
    return [...new Set(raw.map(normalizeAirAwbKey).filter(Boolean))];
  };

  const findShipsgoAirEtaEntry = (
    shipment: AirShipment,
  ): ShipsgoEtaEntry | undefined => {
    for (const key of getAirShipsgoLookupKeys(shipment)) {
      if (shipsgoArrivalByAwb[key]) return shipsgoArrivalByAwb[key];
    }
    return undefined;
  };

  const findShipsgoAirEta = (shipment: AirShipment): string | undefined =>
    findShipsgoAirEtaEntry(shipment)?.current;

  const isAirArrivalFromShipsgo = (shipment: AirShipment): boolean =>
    getAirShipsgoLookupKeys(shipment).some(
      (key) => shipsgoArrivalByAwb[key] || trackedAwbs.has(key),
    );

  const renderEtaBadge = (tooltip?: string) => (
    <span
      title={tooltip}
      style={{
        fontSize: "0.85em",
        fontWeight: 700,
        letterSpacing: "0.2px",
        padding: "0px 5px",
        background:
          "linear-gradient(260deg, rgba(66, 133, 244, 0.34) 8.57%, rgba(231, 10, 62, 0.34) 101.84%)",
        border: "1px solid rgba(162, 45, 125, 0.95)",
        borderRadius: 3,
        color: "rgb(142, 30, 104)",
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        cursor: tooltip ? "help" : undefined,
      }}
    >
      ETA
    </span>
  );

  const getLinbisArrivalDisplayDate = (shipment: AirShipment): string =>
    shipment.arrival?.date ?? shipment.arrival?.displayDate ?? "";

  const renderAccordionArrivalDate = (shipment: AirShipment) => {
    const linbisDate = getLinbisArrivalDisplayDate(shipment);
    const shipsgoEntry = findShipsgoAirEtaEntry(shipment);
    const shipsgoDate = shipsgoEntry?.current;
    const shipsgoScheduled = getShipsgoScheduledInitial(shipsgoEntry);
    const fromShipsgo = isAirArrivalFromShipsgo(shipment);

    if (fromShipsgo && shipsgoDate) {
      const shipsgoTime = formatShipsgoEtaTime(shipsgoDate);
      return (
        <span
          className="asv-field-cell__value"
          style={{
            display: "inline-flex",
            alignItems: "flex-start",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {renderEtaBadge("Fecha estimada con IA")}
              <span>
                {formatShipsgoDateLong(shipsgoDate)}
                {shipsgoTime ? (
                  <span style={{ marginLeft: 6, fontWeight: 600 }}>
                    {shipsgoTime}
                  </span>
                ) : null}
              </span>
            </span>
            {shipsgoScheduled ? (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#d97706",
                  fontStyle: "italic",
                }}
              >
                Programado: {formatShipsgoScheduledLabel(shipsgoScheduled)}
              </span>
            ) : null}
          </span>
          {linbisDate ? (
            <span style={{ textDecoration: "line-through", opacity: 0.65 }}>
              {formatDateInline(linbisDate)}
            </span>
          ) : null}
        </span>
      );
    }

    const effective = getEffectiveArrivalDisplayDate(shipment);
    if (!effective) {
      return (
        <span className="asv-field-cell__value asv-field-cell__value--muted">
          -
        </span>
      );
    }

    return (
      <span className="asv-field-cell__value">
        {formatDate({
          date: effective,
          displayDate: effective,
        })}
      </span>
    );
  };

  const renderArrivalInline = (displayDate?: string, fromShipsgo = false) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {fromShipsgo ? renderEtaBadge() : null}
      <span>
        {fromShipsgo
          ? formatShipsgoDateLong(displayDate)
          : formatDateInline(displayDate)}
      </span>
    </span>
  );

  const getEffectiveArrivalDisplayDate = (shipment: AirShipment): string => {
    const shipsgoEta = findShipsgoAirEta(shipment);
    if (shipsgoEta) return shipsgoEta;
    return shipment.arrival?.date ?? shipment.arrival?.displayDate ?? "";
  };

  /*  API  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getAllCommodities = (s: AirShipment): any[] => {
    if (
      s.subShipments &&
      Array.isArray(s.subShipments) &&
      s.subShipments.length > 0
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comms: any[] = [];
      for (const sub of s.subShipments) {
        if (sub.commodities && Array.isArray(sub.commodities)) {
          comms.push(...sub.commodities);
        }
      }
      if (comms.length > 0) return comms;
    }
    if (s.commodities && Array.isArray(s.commodities)) {
      return s.commodities;
    }
    return [];
  };

  const fetchAirShipments = async (signal?: AbortSignal) => {
    if (!accessToken) {
      setError("Debes ingresar un token primero");
      return;
    }
    if (!activeUsername) {
      setError("No se pudo obtener el nombre de usuario");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = `${AIR_SHIPMENTS_CACHE_PREFIX}${activeUsername}`;

      const rawRecords = await fetchAllLinbisByConsignee(
        "https://api.linbis.com/air-shipments",
        activeUsername,
        { accessToken, refreshAccessToken, signal },
      );

      if (signal?.aborted) return;

      const airShipments = flattenAirShipmentRecords(rawRecords).map(
        mapLinbisAirToAirShipment,
      );

      console.log(
        `${airShipments.length} air-shipments para ${activeUsername}`,
      );

      // Sort by departure date (newest first)
      const sorted = airShipments.sort((a, b) => {
        const da = a.departure?.date ? new Date(a.departure.date) : new Date(0);
        const db = b.departure?.date ? new Date(b.departure.date) : new Date(0);
        return db.getTime() - da.getTime();
      });

      setShipments(sorted);
      setDisplayedShipments(sorted);
      setShowingAll(false);
      localStorage.setItem(cacheKey, JSON.stringify(sorted));
      localStorage.setItem(
        `${cacheKey}_timestamp`,
        new Date().getTime().toString(),
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error completo:", err);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  // Fetches quote number — triggered when a shipment is selected
  const fetchQuoteNumber = async (
    shipmentId: string | number | undefined,
    shipment?: AirShipment | null,
  ) => {
    if (!shipmentId || !accessToken) return;
    if (
      quoteNumberCache[shipmentId]?.fetched ||
      quoteNumberCache[shipmentId]?.loading
    )
      return;

    setQuoteNumberCache((prev) => ({
      ...prev,
      [shipmentId]: { loading: true, fetched: false, quoteNumber: null },
    }));

    const finishQuote = (quoteNumber: string | null) => {
      setQuoteNumberCache((prev) => ({
        ...prev,
        [shipmentId]: {
          loading: false,
          fetched: true,
          quoteNumber,
        },
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

      const quoteFromProfit = lookupQuoteFromProfitIndex(profit, {
        sogNumber: shipment?.number,
        shipmentId:
          typeof shipment?.id === "number"
            ? shipment.id
            : Number(shipment?.id) || null,
      });

      if (quoteFromProfit) {
        finishQuote(quoteFromProfit);
        return;
      }

      const customerReference = shipment?.customerReference;
      if (!customerReference || !activeUsername) {
        finishQuote(null);
        return;
      }

      const quoteParams = buildLinbisListParams(
        activeUsername,
        1,
        LINBIS_PAGE_SIZE,
      );
      const resp = await linbisFetch(
        `https://api.linbis.com/Quotes?${quoteParams}`,
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
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await resp.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = data.items ?? data ?? [];
      const match = items.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q: any) =>
          q.customerReference?.trim().toLowerCase() ===
          customerReference.trim().toLowerCase(),
      );
      finishQuote(match?.number ?? null);
    } catch {
      finishQuote(null);
    }
  };

  // Fetches cargoDescription + hazardous — triggered lazily when accordion general tab opens
  const fetchCargoDetails = async (
    shipmentId: string | number | undefined,
    shipmentNumber: string | undefined,
  ) => {
    if (!shipmentId || !shipmentNumber || !accessToken) return;
    if (
      cargoDetailsCache[shipmentId]?.fetched ||
      cargoDetailsCache[shipmentId]?.loading
    )
      return;

    setCargoDetailsCache((prev) => ({
      ...prev,
      [shipmentId]: {
        loading: true,
        fetched: false,
        cargoDescription: null,
        hazardous: null,
      },
    }));

    try {
      const resp = await linbisFetch(
        `https://api.linbis.com/air-shipments/number?number=${encodeURIComponent(shipmentNumber)}`,
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
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await resp.json();
      setCargoDetailsCache((prev) => ({
        ...prev,
        [shipmentId]: {
          loading: false,
          fetched: true,
          cargoDescription: data.cargoDescription ?? null,
          hazardous:
            typeof data.hazardous === "boolean" ? data.hazardous : null,
        },
      }));
    } catch {
      setCargoDetailsCache((prev) => ({
        ...prev,
        [shipmentId]: {
          loading: false,
          fetched: true,
          cargoDescription: null,
          hazardous: null,
        },
      }));
    }
  };

  const getOriginAirport = (shipment: AirShipment) => {
    if (shipment.id != null) {
      const cached = routeCache[shipment.id];
      if (cached?.executedAt) return cached.executedAt;
    }
    return shipment.executedAt ?? shipment.origin ?? null;
  };

  const getDestinationAirport = (shipment: AirShipment) => {
    if (shipment.id != null) {
      const cached = routeCache[shipment.id];
      if (cached?.destination) return cached.destination;
    }
    return shipment.destination ?? null;
  };

  const formatAirportLabel = (
    airport?: { code?: string; name?: string } | null,
  ) => {
    if (!airport?.name?.trim() && !airport?.code?.trim()) return "-";
    if (airport.name?.trim()) {
      return `${airport.name.trim()}${airport.code ? ` (${airport.code})` : ""}`;
    }
    return airport.code?.trim() || "-";
  };

  const formatAirportCell = (shipment: AirShipment, kind: "origin" | "dest") => {
    if (shipment.id != null && routeCache[shipment.id]?.loading) {
      return "Cargando...";
    }
    return formatAirportLabel(
      kind === "origin"
        ? getOriginAirport(shipment)
        : getDestinationAirport(shipment),
    );
  };

  const fetchRouteForShipment = useCallback(
    async (shipment: AirShipment) => {
      const shipmentId = shipment.id;
      if (!shipmentId || !accessToken) return;
      if (shipment.executedAt?.name && shipment.destination?.name) {
        routeFetchedRef.current.add(shipmentId);
        return;
      }
      if (
        routeFetchedRef.current.has(shipmentId) ||
        routeInFlightRef.current.has(shipmentId)
      ) {
        return;
      }

      routeInFlightRef.current.add(shipmentId);
      setRouteCache((prev) => ({
        ...prev,
        [shipmentId]: {
          loading: true,
          fetched: false,
          executedAt: null,
          destination: null,
        },
      }));

      try {
        const route = await fetchAirShipmentRouteDetail(shipment, {
          accessToken,
          refreshAccessToken,
        });
        routeFetchedRef.current.add(shipmentId);
        setRouteCache((prev) => ({
          ...prev,
          [shipmentId]: {
            loading: false,
            fetched: true,
            executedAt: route.executedAt,
            destination: route.destination,
          },
        }));
      } catch {
        routeFetchedRef.current.add(shipmentId);
        setRouteCache((prev) => ({
          ...prev,
          [shipmentId]: {
            loading: false,
            fetched: true,
            executedAt: null,
            destination: null,
          },
        }));
      } finally {
        routeInFlightRef.current.delete(shipmentId);
      }
    },
    [accessToken, refreshAccessToken],
  );

  useEffect(() => {
    if (!accessToken) return;
    for (const shipment of paginatedShipments) {
      void fetchRouteForShipment(shipment);
    }
  }, [accessToken, paginatedShipments, fetchRouteForShipment]);

  useEffect(() => {
    const reset = prevTrackingUsernameRef.current !== activeUsername;
    prevTrackingUsernameRef.current = activeUsername;
    loadTrackingIndex({ reset });
    return () => trackingIndexAbortRef.current?.abort();
  }, [loadTrackingIndex, activeUsername]);

  const toggleShipmentSelection = (shipmentId: string | number) => {
    setSelectedShipmentId((prev) => (prev === shipmentId ? null : shipmentId));
  };

  useEffect(() => {
    if (!selectedShipment || selectedShipmentIndex < 0 || !accessToken) return;

    const shipmentId = getShipmentRowId(
      selectedShipment,
      selectedShipmentIndex,
    );
    void fetchRouteForShipment(selectedShipment);
    void fetchQuoteNumber(shipmentId, selectedShipment);
  }, [selectedShipment, selectedShipmentIndex, accessToken]);

  useEffect(() => {
    setCargoDetailsCache({});
    setQuoteNumberCache({});
    setProfitIndex({
      loading: false,
      fetched: false,
      index: { byHbli: {}, bySog: {}, byShipmentId: {}, byQuote: {} },
    });
    setRouteCache({});
    routeInFlightRef.current.clear();
    routeFetchedRef.current.clear();
    setTrackedAwbs(new Set());
    setShipsgoArrivalByAwb({});
  }, [activeUsername]);

  // Fetch tracked air shipments from ShipsGo
  useEffect(() => {
    if (!activeUsername) return;
    const API =
      import.meta.env.MODE === "development"
        ? "http://localhost:4000"
        : "https://portalclientes.seemanngroup.com";
    (async () => {
      try {
        const res = await fetch(`${API}/api/shipsgo/shipments`);
        if (!res.ok) return;
        const data = await res.json();
        const awbs = new Set<string>();
        const etaByAwb: Record<string, ShipsgoEtaEntry> = {};
        for (const s of data.shipments ?? []) {
          if (s.reference === activeUsername && s.awb_number) {
            const key = s.awb_number.replace(/[\s-]/g, "");
            awbs.add(key);
            const current = s.route?.destination?.date_of_rcf;
            const initial = s.route?.destination?.date_of_rcf_initial;
            if (current) {
              etaByAwb[key] = {
                current,
                initial:
                  typeof initial === "string" && initial !== current
                    ? initial
                    : undefined,
              };
            }
          }
        }
        setTrackedAwbs(awbs);
        setShipsgoArrivalByAwb(etaByAwb);
      } catch {
        /* ignore */
      }
    })();
  }, [activeUsername]);

  /*  Cache  */
  useEffect(() => {
    if (!accessToken || !activeUsername) return;

    // ── Cuenta dummy MundoGaming: carga datos hardcodeados ──
    if (activeUsername === "MundoGaming") {
      const dummySorted = [...MUNDOGAMING_DUMMY_SHIPMENTS].sort((a, b) => {
        const da = a.departure?.date ? new Date(a.departure.date) : new Date(0);
        const db = b.departure?.date ? new Date(b.departure.date) : new Date(0);
        return db.getTime() - da.getTime();
      });
      setShipments(dummySorted);
      setDisplayedShipments(dummySorted);
      setLoading(false);
      console.log(
        "MundoGaming: cargando datos dummy (",
        dummySorted.length,
        "envíos)",
      );
      return;
    }

    const cacheKey = `${AIR_SHIPMENTS_CACHE_PREFIX}${activeUsername}`;
    for (const legacyPrefix of ["airShipmentsCache_", "airShipmentsCache_v2_"]) {
      const legacyCacheKey = `${legacyPrefix}${activeUsername}`;
      localStorage.removeItem(legacyCacheKey);
      localStorage.removeItem(`${legacyCacheKey}_timestamp`);
    }

    const cached = localStorage.getItem(cacheKey);
    const ts = localStorage.getItem(`${cacheKey}_timestamp`);

    if (cached && ts) {
      const age = Date.now() - parseInt(ts);
      if (age < 3600000) {
        const parsed = JSON.parse(cached) as AirShipment[];
        setShipments(parsed);
        setDisplayedShipments(parsed);
        setShowingAll(false);
        setLoading(false);
        console.log(
          "Cargando desde caché - datos guardados hace",
          Math.floor(age / 60000),
          "minutos",
        );
        return;
      }
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_timestamp`);
    }

    const controller = new AbortController();
    fetchAirShipments(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeUsername]);

  useEffect(() => {
    const locationState = location.state as {
      shipmentFilterNumber?: string;
    } | null;
    const incomingFilter = (
      initialFilterNumber ||
      locationState?.shipmentFilterNumber ||
      ""
    ).trim();

    if (!incomingFilter || shipments.length === 0) return;
    if (appliedInitialFilterRef.current === incomingFilter) return;

    const filtered = shipments.filter((s) =>
      (s.number || "").toLowerCase().includes(incomingFilter.toLowerCase()),
    );

    appliedInitialFilterRef.current = incomingFilter;
    setFilterNumber(incomingFilter);
    setDisplayedShipments(filtered);
    setShowingAll(true);
    setSelectedShipmentId(filtered[0]?.id ?? filtered[0]?.number ?? null);
    setTablePage(1);

    if (!initialFilterNumber && locationState?.shipmentFilterNumber) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [
    initialFilterNumber,
    location.pathname,
    location.state,
    navigate,
    shipments,
  ]);

  /*  Search  */

  const clearSearch = () => {
    setFilterNumber("");
    setFilterWaybill("");
    setFilterClientReference("");
    setFilterDepartureDate("");
    setFilterArrivalDate("");
    setFilterCarrier("");
    setIsNumberFocused(false);
    setIsWaybillFocused(false);
    setIsClientReferenceFocused(false);
    setIsDepartureFocused(false);
    setIsArrivalFocused(false);
    setIsCarrierFocused(false);
    setDisplayedShipments(shipments);
    setShowingAll(false);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    let filtered = shipments;
    if (filterNumber.trim()) {
      filtered = filtered.filter((s) =>
        (s.number || "").toLowerCase().includes(filterNumber.toLowerCase()),
      );
    }
    if (filterWaybill.trim()) {
      filtered = filtered.filter((s) =>
        (s.waybillNumber || "")
          .toLowerCase()
          .includes(filterWaybill.toLowerCase()),
      );
    }
    if (filterClientReference.trim()) {
      filtered = filtered.filter((s) =>
        (s.customerReference || "")
          .toLowerCase()
          .includes(filterClientReference.toLowerCase()),
      );
    }
    if (filterDepartureDate) {
      filtered = filtered.filter((s) => {
        if (!s.departure?.date) return false;
        const d = new Date(s.departure.date);
        d.setTime(d.getTime() + 3600000);
        return d.toISOString().split("T")[0] === filterDepartureDate;
      });
    }
    if (filterArrivalDate) {
      filtered = filtered.filter((s) => {
        const arrival = getEffectiveArrivalDisplayDate(s);
        if (!arrival) return false;
        const d = new Date(arrival);
        d.setTime(d.getTime() + 3600000);
        return d.toISOString().split("T")[0] === filterArrivalDate;
      });
    }
    if (filterCarrier.trim()) {
      filtered = filtered.filter((s) =>
        (s.carrier?.name || "")
          .toLowerCase()
          .includes(filterCarrier.toLowerCase()),
      );
    }
    setDisplayedShipments(filtered);
    setShowingAll(true);
  };

  const refreshShipments = () => {
    if (!activeUsername) return;

    // ── Cuenta dummy MundoGaming: reload datos hardcodeados ──
    if (activeUsername === "MundoGaming") {
      const dummySorted = [...MUNDOGAMING_DUMMY_SHIPMENTS].sort((a, b) => {
        const da = a.departure?.date ? new Date(a.departure.date) : new Date(0);
        const db = b.departure?.date ? new Date(b.departure.date) : new Date(0);
        return db.getTime() - da.getTime();
      });
      setShipments(dummySorted);
      setDisplayedShipments(dummySorted);
      setShowingAll(false);
      console.log("MundoGaming: datos dummy recargados");
      return;
    }

    const cacheKey = `${AIR_SHIPMENTS_CACHE_PREFIX}${activeUsername}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    localStorage.removeItem(`airShipmentsCache_${activeUsername}`);
    localStorage.removeItem(`airShipmentsCache_${activeUsername}_timestamp`);
    setRouteCache({});
    routeInFlightRef.current.clear();
    routeFetchedRef.current.clear();
    loadTrackingIndex();
    setShipments([]);
    setDisplayedShipments([]);
    fetchAirShipments();
  };

  const openTrackedShipmentInPortal = (shipment: AirShipment) => {
    const awb =
      resolveTrackingNumber(shipment) ||
      shipment.waybillNumber ||
      shipment.number;
    const openTracking = buildAirOpenTrackingTarget(awb);
    const navigationState: ShipsGoTrackingLocationState = openTracking
      ? { openTab: "air", openTracking }
      : { openTab: "air" };

    if (reporteriaClientesContext) {
      reporteriaClientesContext.openTrackingTab("air", openTracking);
      return;
    }

    navigate("/trackings", { state: navigationState });
  };

  /*  Track Modal  */
  const isShipmentAlreadyTracked = (shipment: AirShipment): boolean => {
    if (trackedAwbs.size === 0) return false;
    return getAirShipsgoLookupKeys(shipment).some((key) => trackedAwbs.has(key));
  };

  const getTrackAwbNumber = (shipment: AirShipment | null) => {
    if (!shipment) return "";
    const trackingNumber = resolveTrackingNumber(shipment);
    return trackingNumber || shipment.number || "";
  };

  const getDisplayedTrackAwbNumber = (shipment: AirShipment) => {
    if (isTrackAwbLoading(shipment)) {
      return "Cargando...";
    }
    const trackingNumber = resolveTrackingNumber(shipment);
    return trackingNumber || shipment.number || "-";
  };

  const hasConfirmedAwb = (shipment: AirShipment): boolean =>
    !!resolveTrackingNumber(shipment);

  const isTrackAwbLoading = (shipment: AirShipment): boolean => {
    if (hasConfirmedAwb(shipment)) return false;
    return trackingIndex.loading || !trackingIndex.fetched;
  };

  const isTrackAwbReady = (shipment: AirShipment) => {
    if (isTrackAwbLoading(shipment)) return false;
    return hasConfirmedAwb(shipment);
  };

  const openTrackModal = (shipment: AirShipment) => {
    if (!isTrackAwbReady(shipment)) return;
    setTrackShipment(shipment);
    setTrackEmails([""]);
    setTrackError(null);
    setShowTrackModal(true);
  };

  const closeTrackModal = () => {
    setShowTrackModal(false);
    setTrackShipment(null);
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
    if (!trackShipment) return;

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
      const awbNumber = getTrackAwbNumber(trackShipment).trim();
      if (!awbNumber) {
        setTrackError("No se pudo obtener el AWB para este envío.");
        return;
      }

      const cleanAwb = awbNumber.toString().replace(/[\s-]/g, "");
      const API_BASE_URL =
        import.meta.env.MODE === "development"
          ? "http://localhost:4000"
          : "https://portalclientes.seemanngroup.com";

      const response = await fetch(`${API_BASE_URL}/api/shipsgo/shipments`, {
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

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409)
          setTrackError("Ya existe un trackeo con este AWB en tu cuenta.");
        else if (response.status === 402)
          setTrackError(
            "No hay créditos disponibles. Contacta a tu ejecutivo de cuenta.",
          );
        else setTrackError(data.error || "Error al crear el trackeo.");
        return;
      }

      void rememberTrackingEmails(followers).catch((rememberError) => {
        console.error(
          "No se pudieron guardar los correos usados en el tracking aéreo:",
          rememberError,
        );
      });

      closeTrackModal();
      registrarEvento({
        accion: "TRACKING_CREADO",
        categoria: "TRACKING",
        descripcion: `Tracking aéreo creado desde envíos: AWB ${cleanAwb}`,
        detalles: { tipo: "air", awb: cleanAwb, cuenta: activeUsername },
        clienteAfectado: activeUsername || undefined,
      });
      if (reporteriaClientesContext) {
        reporteriaClientesContext.openTrackingTab("air");
      } else {
        navigate("/trackings-aereo");
      }
    } catch {
      setTrackError(
        "Error de conexión. Verifica tu internet e intenta nuevamente.",
      );
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="asv-container">
      {!selectedShipment && (
        <>
          <PageBannerHeader variant="airShipments" />

          {/* Toolbar */}
          <div className="asv-toolbar">
            <button
              className={`asv-btn asv-btn--ghost asv-toolbar__icon-btn ${activeFilterCount > 0 ? "asv-toolbar__icon-btn--active" : ""}`}
              type="button"
              onClick={() => setShowSearchModal(true)}
              aria-label="Abrir filtros"
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
                <span className="asv-toolbar__badge">{activeFilterCount}</span>
              )}
            </button>
            <button
              className="asv-btn asv-btn--primary"
              onClick={refreshShipments}
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
              Actualizar
            </button>
          </div>
        </>
      )}

      {/* Search / Filter modal */}
      {showSearchModal && (
        <div className="asv-overlay" onClick={() => setShowSearchModal(false)}>
          <div
            className="asv-modal asv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="asv-modal__title">Buscar y filtrar Air Shipments</h5>

            <form
              onSubmit={(e) => {
                handleApplyFilters(e);
                setShowSearchModal(false);
              }}
            >
              <div className="asv-search-section">
                <label className="asv-label">Filtros de tabla</label>
                <div className="asv-search-row">
                  <div style={{ position: "relative", flex: 1 }}>
                    <label
                      style={{
                        position: "absolute",
                        top: filterNumber || isNumberFocused ? "2px" : "10px",
                        left: "8px",
                        fontSize:
                          filterNumber || isNumberFocused ? "10px" : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Número
                    </label>
                    <input
                      className="asv-input"
                      type="text"
                      value={filterNumber}
                      onChange={(e) => setFilterNumber(e.target.value)}
                      onFocus={() => setIsNumberFocused(true)}
                      onBlur={() => setIsNumberFocused(false)}
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                  <div style={{ position: "relative", flex: 1 }}>
                    <label
                      style={{
                        position: "absolute",
                        top: filterWaybill || isWaybillFocused ? "2px" : "10px",
                        left: "8px",
                        fontSize:
                          filterWaybill || isWaybillFocused ? "10px" : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Waybill
                    </label>
                    <input
                      className="asv-input"
                      type="text"
                      value={filterWaybill}
                      onChange={(e) => setFilterWaybill(e.target.value)}
                      onFocus={() => setIsWaybillFocused(true)}
                      onBlur={() => setIsWaybillFocused(false)}
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                </div>
                <div className="asv-search-row">
                  <div style={{ position: "relative", flex: 1 }}>
                    <label
                      style={{
                        position: "absolute",
                        top:
                          filterClientReference || isClientReferenceFocused
                            ? "2px"
                            : "10px",
                        left: "8px",
                        fontSize:
                          filterClientReference || isClientReferenceFocused
                            ? "10px"
                            : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Ref. Cliente
                    </label>
                    <input
                      className="asv-input"
                      type="text"
                      value={filterClientReference}
                      onChange={(e) => setFilterClientReference(e.target.value)}
                      onFocus={() => setIsClientReferenceFocused(true)}
                      onBlur={() => setIsClientReferenceFocused(false)}
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                  <div style={{ position: "relative", flex: 1 }}>
                    <label
                      style={{
                        position: "absolute",
                        top: filterCarrier || isCarrierFocused ? "2px" : "10px",
                        left: "8px",
                        fontSize:
                          filterCarrier || isCarrierFocused ? "10px" : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Carrier
                    </label>
                    <input
                      className="asv-input"
                      type="text"
                      value={filterCarrier}
                      onChange={(e) => setFilterCarrier(e.target.value)}
                      onFocus={() => setIsCarrierFocused(true)}
                      onBlur={() => setIsCarrierFocused(false)}
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                </div>
                <div className="asv-search-row">
                  <div style={{ position: "relative", flex: 1 }}>
                    <label
                      style={{
                        position: "absolute",
                        top:
                          filterDepartureDate || isDepartureFocused
                            ? "2px"
                            : "10px",
                        left: "8px",
                        fontSize:
                          filterDepartureDate || isDepartureFocused
                            ? "10px"
                            : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Fecha Salida
                    </label>
                    <input
                      className="asv-input"
                      type="date"
                      value={filterDepartureDate}
                      onChange={(e) => setFilterDepartureDate(e.target.value)}
                      onFocus={() => setIsDepartureFocused(true)}
                      onBlur={() => setIsDepartureFocused(false)}
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                  <div style={{ position: "relative", flex: 1 }}>
                    <label
                      style={{
                        position: "absolute",
                        top:
                          filterArrivalDate || isArrivalFocused
                            ? "2px"
                            : "10px",
                        left: "8px",
                        fontSize:
                          filterArrivalDate || isArrivalFocused
                            ? "10px"
                            : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Fecha Llegada
                    </label>
                    <input
                      className="asv-input"
                      type="date"
                      value={filterArrivalDate}
                      onChange={(e) => setFilterArrivalDate(e.target.value)}
                      onFocus={() => setIsArrivalFocused(true)}
                      onBlur={() => setIsArrivalFocused(false)}
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="asv-btn asv-btn--primary asv-btn--full"
                  type="submit"
                >
                  Aplicar filtros
                </button>
                <button
                  className="asv-btn asv-btn--ghost"
                  type="button"
                  onClick={() => {
                    clearSearch();
                    setShowSearchModal(false);
                  }}
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <LoadingTips
          columns={[
            { label: "Referencia Cliente" },
            { label: "Origen" },
            { label: "Fecha Salida", center: true },
            { label: "Fecha Llegada", center: true },
            { label: "Carrier", center: true },
          ]}
        />
      )}

      {/* Error */}
      {error && (
        <div className="asv-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Table (list view) */}
      {!loading && displayedShipments.length > 0 && !selectedShipment && (
        <div className="asv-list">
          <div className="asv-table-wrapper">
            <div className="asv-table-scroll">
              <table className="asv-table">
                <thead>
                  <tr>
                    <th className="asv-th">Referencia Cliente</th>
                    <th className="asv-th">Origen</th>
                    <th className="asv-th asv-th--center">Fecha Salida</th>
                    <th className="asv-th asv-th--center">Fecha Llegada</th>
                    <th className="asv-th asv-th--center">Carrier</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedShipments.map((shipment, index) => {
                    const shipmentId = getShipmentRowId(shipment, index);
                    const effectiveArrivalDisplayDate =
                      getEffectiveArrivalDisplayDate(shipment);
                    const effectiveArrivalIsShipsgo =
                      isAirArrivalFromShipsgo(shipment);
                    const referenceLabel =
                      shipment.customerReference || "-";
                    const numberLabel = shipment.number || "---";
                    const originLabel = formatAirportCell(shipment, "origin");
                    const departureLabel = formatDateInline(
                      shipment.departure?.date ??
                        shipment.departure?.displayDate,
                    );
                    const carrierLabel = shipment.carrier?.name || "-";

                    return (
                      <tr
                        key={shipmentId}
                        className="asv-tr"
                        onClick={() => toggleShipmentSelection(shipmentId)}
                      >
                        <td
                          className="asv-td asv-td--reference"
                          title={referenceLabel}
                        >
                          <span className="asv-cell-ref">
                            {referenceLabel}
                          </span>
                          <span className="asv-cell-num">{numberLabel}</span>
                        </td>
                        <td
                          className="asv-td asv-td--waybill"
                          title={originLabel}
                        >
                          {originLabel}
                        </td>
                        <td
                          className="asv-td asv-td--center"
                          title={departureLabel}
                        >
                          {departureLabel}
                        </td>
                        <td
                          className="asv-td asv-td--center"
                          title={effectiveArrivalDisplayDate || "-"}
                        >
                          {renderArrivalInline(
                            effectiveArrivalDisplayDate,
                            effectiveArrivalIsShipsgo,
                          )}
                        </td>
                        <td
                          className="asv-td asv-td--center"
                          title={carrierLabel}
                        >
                          {carrierLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="asv-table-footer">
              <div className="asv-table-footer__left" />
              <div className="asv-table-footer__right">
                <span className="asv-pagination-label">Filas por pagina:</span>
                <select
                  className="asv-pagination-select"
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
                <span className="asv-pagination-range">
                  {paginationRangeText}
                </span>
                <button
                  className="asv-pagination-btn"
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
                  className="asv-pagination-btn"
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
      )}

      {/* Detail (full page) */}
      {!loading && selectedShipment && selectedShipmentIndex >= 0 && (
        <AirShipmentDetailPanel
          shipment={selectedShipment}
          shipmentId={getShipmentRowId(
            selectedShipment,
            selectedShipmentIndex,
          )}
          documentsOnly={documentsOnly}
          onClose={() => setSelectedShipmentId(null)}
          formatAirportCell={formatAirportCell}
          formatDateInline={formatDateInline}
          effectiveArrivalDisplayDate={getEffectiveArrivalDisplayDate(
            selectedShipment,
          )}
          effectiveArrivalIsShipsgo={isAirArrivalFromShipsgo(
            selectedShipment,
          )}
          cargoDetail={
            cargoDetailsCache[
              getShipmentRowId(selectedShipment, selectedShipmentIndex)
            ]
          }
          quoteEntry={
            quoteNumberCache[
              getShipmentRowId(selectedShipment, selectedShipmentIndex)
            ]
          }
          renderAccordionArrivalDate={() =>
            renderAccordionArrivalDate(selectedShipment)
          }
          onMountCargo={fetchCargoDetails}
          getAllCommodities={getAllCommodities}
          formatDate={formatDate}
          getDisplayedTrackAwbNumber={getDisplayedTrackAwbNumber}
          isTrackAwbLoading={isTrackAwbLoading}
          isTrackAwbReady={isTrackAwbReady}
          isShipmentAlreadyTracked={isShipmentAlreadyTracked}
          openTrackModal={openTrackModal}
          onOpenTracking={() =>
            openTrackedShipmentInPortal(selectedShipment)
          }
          onOpenQuote={(qn) => {
            if (reporteriaClientesContext) {
              reporteriaClientesContext.openQuotesTab(qn);
            } else {
              navigate("/quotes", { state: { quoteFilter: qn } });
            }
          }}
        />
      )}

      {/* Empty  no search results */}
      {displayedShipments.length === 0 &&
        !loading &&
        shipments.length > 0 &&
        showingAll && (
          <div className="asv-empty">
            <p className="asv-empty__title">No se encontraron air-shipments</p>
            <p className="asv-empty__subtitle">
              No hay air-shipments que coincidan con tu búsqueda
            </p>
            <button className="asv-btn asv-btn--primary" onClick={clearSearch}>
              Ver los últimos air-shipments
            </button>
          </div>
        )}

      {/* Empty  no shipments */}
      {shipments.length === 0 && !loading && (
        <div className="asv-empty">
          <p className="asv-empty__title">No hay air-shipments disponibles</p>
          <p className="asv-empty__subtitle">
            No se encontraron air-shipments para tu cuenta
          </p>
        </div>
      )}

      {/* Track Modal */}
      {showTrackModal && trackShipment && (
        <div className="asv-overlay" onClick={closeTrackModal}>
          <div
            className="asv-modal asv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="asv-modal__title">Trackea tu envío</h3>

            <div style={{ marginBottom: 16 }}>
              <label className="asv-label">AWB Number</label>
              <input
                className="asv-input"
                type="text"
                value={getTrackAwbNumber(trackShipment)}
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
                <label className="asv-label" style={{ marginBottom: 0 }}>
                  Correo electrónico para seguimiento
                </label>
                <button
                  type="button"
                  className="asv-btn asv-btn--ghost asv-btn--sm"
                  onClick={addTrackEmailField}
                  disabled={trackEmails.length >= MAX_VISIBLE_TRACK_FOLLOWERS}
                >
                  +
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {trackEmails.map((email, index) => (
                  <div
                    key={`air-track-email-${index}`}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      className="asv-input"
                      type="email"
                      value={email}
                      onChange={(e) => updateTrackEmail(index, e.target.value)}
                      placeholder={`Correo ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="asv-btn asv-btn--ghost asv-btn--sm"
                      onClick={() => removeTrackEmailField(index)}
                      disabled={trackEmails.length === 1}
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>
              <small className="asv-hint">
                Puedes agregar hasta 9 correos visibles. El correo de
                operaciones se agrega automáticamente.
              </small>
            </div>
            <TrackingEmailSuggestions
              savedEmails={savedTrackingEmails}
              selectedEmails={trackEmails.filter((email) => email.trim())}
              onSelectEmail={handleSelectSuggestedTrackEmail}
              onAddAll={handleAddAllSuggestedTrackEmails}
            />

            {trackError && <div className="asv-error">{trackError}</div>}

            <p className="asv-modal__question">
              ¿Deseas generar el nuevo rastreo de tu envío?
            </p>

            <div className="asv-modal__actions">
              <button
                className="asv-btn asv-btn--ghost"
                onClick={closeTrackModal}
              >
                No
              </button>
              <button
                className="asv-btn asv-btn--primary"
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

export default AirShipmentsView;
