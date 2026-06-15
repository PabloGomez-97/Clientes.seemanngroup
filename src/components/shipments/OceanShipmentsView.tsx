import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import LoadingTips from "./LoadingTips";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useClientOverride } from "../../contexts/ClientOverrideContext";
import PageBannerHeader from "../PageBannerHeader";
import { useReporteriaClientesContext } from "../../contexts/ReporteriaClientesContext";
import { useAuditLog } from "../../hooks/useAuditLog";
import { useTrackingEmailPreferences } from "../../hooks/useTrackingEmailPreferences";
import { type OutletContext } from "../shipments/Handlers/Handleroceanshipments";
import { MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS } from "./Handlers/mundogamingDummyOceanData";
import { DocumentosSectionOcean } from "../Sidebar/Documents/DocumentosSectionOcean";
import TrackingEmailSuggestions from "../tracking/TrackingEmailSuggestions";
import {
  addUniqueEmail,
  MAX_VISIBLE_TRACK_FOLLOWERS,
  OPERATIONS_FOLLOWER_EMAIL,
} from "../../services/trackingEmailPreferences";
import "./OceanShipmentsView.css";
import { linbisFetch } from "../../services/linbisFetch";
import {
  buildLinbisListParams,
  consigneeMatches,
  fetchShippingOrderTrackingIndex,
  LINBIS_PAGE_SIZE,
} from "../../services/linbisListFetch";
import { mapLinbisOceanToShippingOrder } from "../../services/linbisShipmentMappers";
import {
  type ShipsgoEtaEntry,
  formatShipsgoDateLong,
  formatShipsgoScheduledLabel,
  formatShipsgoTime,
  getShipsgoScheduledInitial,
} from "../../services/shipsgoEtaHelpers";
import {
  buildOceanOpenTrackingTarget,
  type ShipsGoTrackingLocationState,
} from "../../services/shipsgoTrackingNavigation";

const ITEMS_PER_PAGE = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

const OCEAN_ALL_CACHE_KEY = "oceanShipmentsAllCache_v1";
const OCEAN_ALL_CACHE_TS_KEY = "oceanShipmentsAllCacheTimestamp_v1";

interface OceanShippingOrder {
  id: number;
  number: string;
  waybillNumber?: string | null;
  bookingNumber?: string | null;
  customerReference?: string | null;
  additionalCustomerReference?: string | null;
  departureDate?: string | null;
  arrivalDate?: string | null;
  cutOffDate?: string | null;
  cutOffDocsDate?: string | null;
  notes?: string | null;
  operationFlow?: number | null;
  modeOfTransportation?: string | null;
  rateCategoryId?: number | null;
  carrier?: { id?: number; name?: string; code?: string } | null;
  shipper?: { id?: number; name?: string; code?: string } | null;
  shipperAddress?: string | null;
  consignee?: { id?: number; name?: string; code?: string } | null;
  consigneeAddress?: string | null;
  notifyParty?: { name?: string } | null;
  notifyPartyAddress?: string | null;
  executedAt?: { code?: string; name?: string } | null;
  destination?: { code?: string; name?: string } | null;
  salesRep?: string | null;
  trackingNumber?: string | null;
  totalCargo?: {
    pieces?: number;
    value?: number;
    containers?: number;
    weight?: { userDisplay?: string; value?: number };
    volume?: { userDisplay?: string; value?: number };
    volumeWeight?: { userDisplay?: string; value?: number };
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commodities?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  charges?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface HBLICacheEntry {
  loading: boolean;
  fetched: boolean;
  hbliNumber: string | null;
  containerNumber: string | null;
}

interface TrackingNumberCacheEntry {
  loading: boolean;
  fetched: boolean;
  byNumber: Record<string, string>;
}

interface QuoteNumberCacheEntry {
  loading: boolean;
  fetched: boolean;
  quoteNumber: string | null;
}

/* -- DetailTabs  -------------------------------------------- */
interface TabDef {
  key: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  hidden?: boolean;
}

function DetailTabs({ tabs }: { tabs: TabDef[] }) {
  const visible = tabs.filter((t) => !t.hidden);
  const [active, setActive] = useState(visible[0]?.key || "");
  const current = visible.find((t) => t.key === active);

  return (
    <div className="osv-tabs">
      <div className="osv-tabs__nav">
        {visible.map((tab) => (
          <button
            key={tab.key}
            className={`osv-tabs__btn ${active === tab.key ? "osv-tabs__btn--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActive(tab.key);
            }}
          >
            {tab.icon && <span className="osv-tabs__icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="osv-tabs__panel">{current?.content}</div>
    </div>
  );
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sí" : "No";
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
    <section className="osv-field-section">
      <h4 className="osv-field-section__title">{title}</h4>
      <div className="osv-field-grid">{children}</div>
    </section>
  );
}

function FieldGridCell({
  label,
  value,
  children,
  action,
}: {
  label: string;
  value?: unknown;
  children?: React.ReactNode;
  action?: boolean;
}) {
  const display = formatFieldValue(value);
  const cellClass = action
    ? "osv-field-cell osv-field-cell--action"
    : "osv-field-cell";

  return (
    <div className={cellClass}>
      {label ? <span className="osv-field-cell__label">{label}</span> : null}
      {children ?? (
        <span
          className={`osv-field-cell__value${display === "-" ? " osv-field-cell__value--muted" : ""}`}
        >
          {display}
        </span>
      )}
    </div>
  );
}

interface OceanGeneralTabContentProps {
  shipment: OceanShippingOrder;
  quoteEntry: QuoteNumberCacheEntry | undefined;
  hbliEntry: HBLICacheEntry | undefined;
  renderAccordionArrivalDate: () => React.ReactNode;
  getHBLIFromShipment: (s: OceanShippingOrder) => string | null;
  formatDateLong: (dateString?: string | null) => string;
  getDisplayedTrackingNumber: (s: OceanShippingOrder) => string;
  isTrackingLoading: (s: OceanShippingOrder) => boolean;
  isTrackingReady: (s: OceanShippingOrder) => boolean;
  isOceanShipmentAlreadyTracked: (s: OceanShippingOrder) => boolean;
  openTrackModal: (s: OceanShippingOrder) => void;
  onOpenTracking: () => void;
  onOpenQuote: (quoteNumber: string) => void;
}

function OceanGeneralTabContent({
  shipment,
  quoteEntry,
  hbliEntry,
  renderAccordionArrivalDate,
  getHBLIFromShipment,
  formatDateLong,
  getDisplayedTrackingNumber,
  isTrackingLoading,
  isTrackingReady,
  isOceanShipmentAlreadyTracked,
  openTrackModal,
  onOpenTracking,
  onOpenQuote,
}: OceanGeneralTabContentProps) {
  const comms = shipment.commodities ?? [];
  const hbliValue =
    getHBLIFromShipment(shipment) ??
    (hbliEntry?.loading ? "Cargando..." : hbliEntry?.hbliNumber);
  const containerValue = hbliEntry?.loading
    ? "Cargando..."
    : hbliEntry?.containerNumber;

  const trackLoading = isTrackingLoading(shipment);
  const trackReady = isTrackingReady(shipment);
  const alreadyTracked = isOceanShipmentAlreadyTracked(shipment);

  return (
    <div className="osv-field-sections">
      <FieldGridSection title="Detalles del envío">
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
              className="osv-field-cell__value osv-field-cell__value--accent"
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
        <FieldGridCell label="Booking number" value={shipment.bookingNumber} />
        <FieldGridCell label="BL / HBLI" value={hbliValue} />
        <FieldGridCell label="ID interno" value={shipment.id} />
      </FieldGridSection>

      <FieldGridSection title="Seguimiento y operación">
        <FieldGridCell label="Carrier" value={shipment.carrier?.name} />
        <FieldGridCell
          label="Número de seguimiento"
          value={getDisplayedTrackingNumber(shipment)}
        />
        <FieldGridCell label="ID interno" value={shipment.id} />
        <FieldGridCell
          label="Fecha salida"
          value={formatDateLong(shipment.departureDate)}
        />
        <FieldGridCell label="Fecha llegada">
          {renderAccordionArrivalDate()}
        </FieldGridCell>
        <FieldGridCell label="" action>
          {alreadyTracked ? (
            <button
              type="button"
              className="osv-btn osv-accordion-track osv-accordion-track--linked osv-accordion-track--live"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTracking();
              }}
            >
              <span className="osv-accordion-track__dot-wrap" aria-hidden>
                <span className="osv-accordion-track__dot-ring" />
                <span className="osv-accordion-track__dot" />
              </span>
              Ver seguimiento
            </button>
          ) : (
            <button
              type="button"
              className="osv-btn osv-accordion-track osv-accordion-track--primary"
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
      </FieldGridSection>

      <FieldGridSection title="Información de carga">
        <FieldGridCell
          label="Total de piezas"
          value={shipment.totalCargo?.pieces}
        />
        <FieldGridCell
          label="Peso total"
          value={shipment.totalCargo?.weight?.userDisplay}
        />
        <FieldGridCell
          label="Volumen total"
          value={shipment.totalCargo?.volume?.userDisplay}
        />
        <FieldGridCell
          label="Contenedores"
          value={shipment.totalCargo?.containers}
        />
      </FieldGridSection>

      <FieldGridSection title="Detalle por ítem">
        {comms.length > 0 ? (
          comms.map((commodity, index) => (
            <React.Fragment key={index}>
              {comms.length > 1 ? (
                <div className="osv-field-cell osv-field-cell--item-header">
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
                    : commodity.weight?.userDisplay
                }
              />
              <FieldGridCell
                label="Volumen total"
                value={
                  commodity.totalVolumeValue
                    ? `${commodity.totalVolumeValue} m³`
                    : commodity.volume?.userDisplay
                }
              />
              <FieldGridCell
                label="Tipo de empaque"
                value={commodity.packageType?.description}
              />
              {commodity.poNumber ? (
                <FieldGridCell label="Número PO" value={commodity.poNumber} />
              ) : null}
            </React.Fragment>
          ))
        ) : (
          <>
            <FieldGridCell label="Contenedor" value={containerValue} />
            <FieldGridCell
              label="Modo de transporte"
              value={shipment.modeOfTransportation}
            />
            <FieldGridCell label="Shipper" value={shipment.shipper?.name} />
            <FieldGridCell label="Consignee" value={shipment.consignee?.name} />
          </>
        )}
      </FieldGridSection>
    </div>
  );
}

/* ===========================================================
   MAIN COMPONENT
   =========================================================== */
function OceanShipmentsView({
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

  const [oceanShipments, setOceanShipments] = useState<OceanShippingOrder[]>(
    [],
  );
  const [displayedOceanShipments, setDisplayedOceanShipments] = useState<
    OceanShippingOrder[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion - single expanded
  const [expandedShipmentId, setExpandedShipmentId] = useState<
    string | number | null
  >(null);

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [tablePage, setTablePage] = useState(1);

  // Search / filter modal
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Track modal
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackShipment, setTrackShipment] = useState<OceanShippingOrder | null>(
    null,
  );
  const [trackEmails, setTrackEmails] = useState<string[]>([""]);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Already-tracked ocean numbers (from ShipsGo)
  const [trackedOceanNumbers, setTrackedOceanNumbers] = useState<Set<string>>(
    new Set(),
  );
  /** ETA naviera (date_of_discharge + initial) por container/booking, desde ShipsGo */
  const [shipsgoArrivalByNumber, setShipsgoArrivalByNumber] = useState<
    Record<string, ShipsgoEtaEntry>
  >({});

  // HBLI cache (tracking number lookup via /commodities chain)
  const [hbliCache, setHbliCache] = useState<Record<string, HBLICacheEntry>>(
    {},
  );

  // Tracking Number desde /api/shipping-orders (mismo índice que aéreo)
  const [trackingIndex, setTrackingIndex] = useState<TrackingNumberCacheEntry>({
    loading: false,
    fetched: false,
    byNumber: {},
  });
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

  // Quote number cache
  const [quoteNumberCache, setQuoteNumberCache] = useState<
    Record<string, QuoteNumberCacheEntry>
  >({});

  const [showingAll, setShowingAll] = useState(false);

  // Filter fields (matching AirShipmentsView pattern)
  const [filterNumber, setFilterNumber] = useState("");
  const [filterWaybill, setFilterWaybill] = useState("");
  const [filterClientReference, setFilterClientReference] = useState("");
  const [filterDepartureDate, setFilterDepartureDate] = useState("");
  const [filterArrivalDate, setFilterArrivalDate] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const appliedInitialFilterRef = useRef("");

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
    Math.ceil(displayedOceanShipments.length / rowsPerPage),
  );
  const paginatedShipments = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return displayedOceanShipments.slice(start, start + rowsPerPage);
  }, [displayedOceanShipments, tablePage, rowsPerPage]);

  const paginationRangeText = useMemo(() => {
    if (displayedOceanShipments.length === 0) return "0 de 0";
    const start = (tablePage - 1) * rowsPerPage + 1;
    const end = Math.min(
      tablePage * rowsPerPage,
      displayedOceanShipments.length,
    );
    return `${start}-${end} de ${displayedOceanShipments.length}`;
  }, [tablePage, rowsPerPage, displayedOceanShipments.length]);

  useEffect(() => {
    setTablePage(1);
  }, [displayedOceanShipments]);

  /* -- Helpers ---------------------------------------------- */
  const formatDateLong = (dateString?: string | null) => {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      d.setTime(d.getTime() + 3600000);
      return d.toLocaleDateString("es-CL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateInline = (dateString?: string | null) => {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      d.setTime(d.getTime() + 3600000);
      return d.toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatShipsgoEtaTime = formatShipsgoTime;

  const normalizeOceanTrackKey = (value?: string | null) =>
    (value ?? "").replace(/[\s-]/g, "").toUpperCase();

  const resolveShippingOrderTracking = (
    shipment: OceanShippingOrder,
  ): string | null => {
    const shipmentNumber = shipment.number?.trim();
    if (shipmentNumber && trackingIndex.byNumber[shipmentNumber]) {
      return trackingIndex.byNumber[shipmentNumber];
    }
    if (
      typeof shipment.trackingNumber === "string" &&
      shipment.trackingNumber.trim()
    ) {
      return shipment.trackingNumber.trim();
    }
    return null;
  };

  const getOceanShipsgoLookupKeys = (shipment: OceanShippingOrder): string[] => {
    const hbli = hbliCache[shipment.number];
    const raw = [
      resolveShippingOrderTracking(shipment),
      shipment.bookingNumber,
      hbli?.containerNumber,
      shipment.waybillNumber,
    ];
    return [...new Set(raw.map(normalizeOceanTrackKey).filter(Boolean))];
  };

  const findShipsgoOceanEtaEntry = (
    shipment: OceanShippingOrder,
  ): ShipsgoEtaEntry | undefined => {
    for (const key of getOceanShipsgoLookupKeys(shipment)) {
      if (shipsgoArrivalByNumber[key]) return shipsgoArrivalByNumber[key];
    }
    return undefined;
  };

  const findShipsgoOceanEta = (
    shipment: OceanShippingOrder,
  ): string | undefined => findShipsgoOceanEtaEntry(shipment)?.current;

  const isOceanArrivalFromShipsgo = (shipment: OceanShippingOrder): boolean =>
    getOceanShipsgoLookupKeys(shipment).some(
      (key) => shipsgoArrivalByNumber[key] || trackedOceanNumbers.has(key),
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

  const renderAccordionArrivalDate = (shipment: OceanShippingOrder) => {
    const linbisDate = shipment.arrivalDate;
    const shipsgoEntry = findShipsgoOceanEtaEntry(shipment);
    const shipsgoDate = shipsgoEntry?.current;
    const shipsgoScheduled = getShipsgoScheduledInitial(shipsgoEntry);
    const fromShipsgo = isOceanArrivalFromShipsgo(shipment);

    if (fromShipsgo && shipsgoDate) {
      const shipsgoTime = formatShipsgoEtaTime(shipsgoDate);
      return (
        <span
          className="osv-field-cell__value"
          style={{
            display: "inline-flex",
            alignItems: "flex-start",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {linbisDate ? (
            <span style={{ textDecoration: "line-through", opacity: 0.65 }}>
              {formatDateLong(linbisDate)}
            </span>
          ) : null}
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
        </span>
      );
    }

    const effective = getEffectiveArrivalDate(shipment);
    return (
      <span
        className={`osv-field-cell__value${!effective ? " osv-field-cell__value--muted" : ""}`}
      >
        {formatDateLong(effective)}
      </span>
    );
  };

  const renderArrivalInline = (dateString?: string | null, fromShipsgo = false) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {fromShipsgo ? renderEtaBadge() : null}
      <span>
        {fromShipsgo
          ? formatShipsgoDateLong(dateString)
          : formatDateInline(dateString)}
      </span>
    </span>
  );

  /* -- Synchronous HBLI helper: reads from already-loaded charges[] --- */
  const getHBLIFromShipment = (shipment: OceanShippingOrder): string | null => {
    if (!Array.isArray(shipment.charges)) return null;
    for (const charge of shipment.charges) {
      const ref: string | undefined = charge.income?.reference;
      if (typeof ref === "string" && ref.toUpperCase().startsWith("HBLI")) {
        return ref;
      }
    }
    return null;
  };

  /* -- HBLI fetch: finds container/tracking number via /commodities chain */
  const fetchHBLIForShipment = useCallback(
    async (sogNumber: string) => {
      if (!accessToken) return;
      if (hbliCache[sogNumber]?.fetched || hbliCache[sogNumber]?.loading)
        return;

      setHbliCache((prev) => ({
        ...prev,
        [sogNumber]: {
          loading: true,
          fetched: false,
          hbliNumber: null,
          containerNumber: null,
        },
      }));

      try {
        // Step 1: Get commodities for this SOG number
        const resp1 = await linbisFetch(
          `https://api.linbis.com/commodities?Number=${encodeURIComponent(sogNumber)}&PageNumber=1&PageSize=5`,
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

        if (!resp1.ok) {
          setHbliCache((prev) => ({
            ...prev,
            [sogNumber]: {
              loading: false,
              fetched: true,
              hbliNumber: null,
              containerNumber: null,
            },
          }));
          return;
        }

        const data1 = await resp1.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items1: any[] = data1.items || [];
        if (items1.length === 0) {
          setHbliCache((prev) => ({
            ...prev,
            [sogNumber]: {
              loading: false,
              fetched: true,
              hbliNumber: null,
              containerNumber: null,
            },
          }));
          return;
        }

        const moduleId = items1[0].moduleId;
        if (!moduleId) {
          setHbliCache((prev) => ({
            ...prev,
            [sogNumber]: {
              loading: false,
              fetched: true,
              hbliNumber: null,
              containerNumber: null,
            },
          }));
          return;
        }

        // Step 2: Get commodities by module
        const resp2 = await linbisFetch(
          `https://api.linbis.com/commodities/by-module/${moduleId}?pageNumber=1&pageSize=50`,
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

        if (!resp2.ok) {
          setHbliCache((prev) => ({
            ...prev,
            [sogNumber]: {
              loading: false,
              fetched: true,
              hbliNumber: null,
              containerNumber: null,
            },
          }));
          return;
        }

        const data2 = await resp2.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items2: any[] = data2.items || [];

        // Find item whose number starts with HBLI
        const hbliItem = items2.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) =>
            typeof item.number === "string" &&
            item.number.toUpperCase().startsWith("HBLI"),
        );

        let hbliNumber: string | null = null;
        let containerNumber: string | null = null;

        if (hbliItem) {
          hbliNumber = hbliItem.number;
          const description: string | null = hbliItem.description || null;
          // Extract container number from description (4 letters + 7 digits)
          if (description) {
            const lines = description.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (/^[A-Z]{4}[0-9]{7}$/.test(trimmed)) {
                containerNumber = trimmed;
                break;
              }
            }
          }
        }

        setHbliCache((prev) => ({
          ...prev,
          [sogNumber]: {
            loading: false,
            fetched: true,
            hbliNumber,
            containerNumber,
          },
        }));
      } catch (err) {
        console.error("Error fetching HBLI:", err);
        setHbliCache((prev) => ({
          ...prev,
          [sogNumber]: {
            loading: false,
            fetched: true,
            hbliNumber: null,
            containerNumber: null,
          },
        }));
      }
    },
    [accessToken, refreshAccessToken, hbliCache],
  );

  useEffect(() => {
    if (!accessToken) return;
    for (const shipment of paginatedShipments) {
      if (
        !resolveShippingOrderTracking(shipment) &&
        !shipment.bookingNumber &&
        shipment.number
      ) {
        void fetchHBLIForShipment(shipment.number);
      }
    }
  }, [accessToken, paginatedShipments, fetchHBLIForShipment, trackingIndex]);

  /* -- Quote number fetch (lazy on accordion open) ---------- */
  const fetchQuoteNumberForShipment = useCallback(
    async (sogNumber: string, customerReference: string | null | undefined) => {
      if (!accessToken || !activeUsername) return;
      if (
        quoteNumberCache[sogNumber]?.fetched ||
        quoteNumberCache[sogNumber]?.loading
      )
        return;

      if (!customerReference) {
        setQuoteNumberCache((prev) => ({
          ...prev,
          [sogNumber]: { loading: false, fetched: true, quoteNumber: null },
        }));
        return;
      }

      setQuoteNumberCache((prev) => ({
        ...prev,
        [sogNumber]: { loading: true, fetched: false, quoteNumber: null },
      }));

      try {
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
        setQuoteNumberCache((prev) => ({
          ...prev,
          [sogNumber]: {
            loading: false,
            fetched: true,
            quoteNumber: match?.number ?? null,
          },
        }));
      } catch {
        setQuoteNumberCache((prev) => ({
          ...prev,
          [sogNumber]: { loading: false, fetched: true, quoteNumber: null },
        }));
      }
    },
    [accessToken, refreshAccessToken, quoteNumberCache, activeUsername],
  );

  /* -- API: Fetch ocean shipments via shipping-orders ------- */
  const readOceanAllCache = (): unknown[] | null => {
    try {
      const cached = localStorage.getItem(OCEAN_ALL_CACHE_KEY);
      const ts = localStorage.getItem(OCEAN_ALL_CACHE_TS_KEY);
      if (!cached || !ts) return null;
      if (Date.now() - parseInt(ts, 10) > 3600000) {
        localStorage.removeItem(OCEAN_ALL_CACHE_KEY);
        localStorage.removeItem(OCEAN_ALL_CACHE_TS_KEY);
        return null;
      }
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const writeOceanAllCache = (records: unknown[]) => {
    try {
      localStorage.setItem(OCEAN_ALL_CACHE_KEY, JSON.stringify(records));
      localStorage.setItem(OCEAN_ALL_CACHE_TS_KEY, Date.now().toString());
    } catch {
      /* quota exceeded */
    }
  };

  const fetchOceanShipments = async (signal?: AbortSignal) => {
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
      const cacheKey = `oceanShipmentsCache_${activeUsername}`;

      let allRecords: unknown[] = readOceanAllCache() ?? [];

      if (!allRecords.length) {
        const allResponse = await linbisFetch(
          "https://api.linbis.com/ocean-shipments/all",
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

        if (!allResponse.ok) {
          throw new Error(
            `Error ${allResponse.status}: ${allResponse.statusText}`,
          );
        }

        const allData = await allResponse.json();
        allRecords = Array.isArray(allData) ? allData : [];
        writeOceanAllCache(allRecords);
      }

      if (signal?.aborted) return;

      const oceanOrders: OceanShippingOrder[] = allRecords
        .filter((record) => {
          if (!record || typeof record !== "object") return false;
          const raw = record as Record<string, unknown>;
          return consigneeMatches(raw.consignee, activeUsername);
        })
        .map(
          (record) =>
            mapLinbisOceanToShippingOrder(
              record as Record<string, unknown>,
            ) as OceanShippingOrder,
        )
        .filter((order) => order.id && order.number);

      console.log(
        `${oceanOrders.length} ocean shipments para ${activeUsername}`,
      );

      // Sort by departure date (newest first)
      const sorted = oceanOrders.sort((a, b) => {
        const da = a.departureDate ? new Date(a.departureDate) : new Date(0);
        const db = b.departureDate ? new Date(b.departureDate) : new Date(0);
        return db.getTime() - da.getTime();
      });

      setOceanShipments(sorted);
      setDisplayedOceanShipments(sorted);
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

  /* -- Cache / load effects --------------------------------- */
  useEffect(() => {
    if (!accessToken || !activeUsername) return;

    // MundoGaming dummy account
    if (activeUsername === "MundoGaming") {
      const mapped: OceanShippingOrder[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS.map((s: any) => ({
          id: s.id || 0,
          number: s.number || "",
          waybillNumber: s.waybillNumber || null,
          bookingNumber: s.bookingNumber || null,
          customerReference: s.customerReference || null,
          departureDate: s.departure || null,
          arrivalDate: s.arrival || null,
          carrier: s.carrier ? { name: s.carrier } : null,
          shipper: s.shipper ? { name: s.shipper } : null,
          shipperAddress: s.shipperAddress || null,
          consignee: s.consignee ? { name: s.consignee } : null,
          consigneeAddress: s.consigneeAddress || null,
          notes: s.notes || null,
          totalCargo: {
            pieces: s.totalCargo_Pieces || 0,
            weight: { userDisplay: s.totalCargo_WeightDisplayValue || "" },
            volume: { userDisplay: s.totalCargo_VolumeDisplayValue || "" },
          },
        }));
      const dummySorted = mapped.sort((a, b) => {
        const da = a.departureDate ? new Date(a.departureDate) : new Date(0);
        const db = b.departureDate ? new Date(b.departureDate) : new Date(0);
        return db.getTime() - da.getTime();
      });
      setOceanShipments(dummySorted);
      setDisplayedOceanShipments(dummySorted);
      setLoading(false);
      console.log(
        "MundoGaming: cargando datos dummy ocean (",
        dummySorted.length,
        "envíos)",
      );
      return;
    }

    const cacheKey = `oceanShipmentsCache_${activeUsername}`;
    const cached = localStorage.getItem(cacheKey);
    const ts = localStorage.getItem(`${cacheKey}_timestamp`);

    if (cached && ts) {
      const age = Date.now() - parseInt(ts);
      if (age < 3600000) {
        const parsed = JSON.parse(cached) as OceanShippingOrder[];
        setOceanShipments(parsed);
        setDisplayedOceanShipments(parsed);
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

    const cachedAll = readOceanAllCache();
    if (cachedAll?.length) {
      const filtered = cachedAll
        .filter((record) => {
          if (!record || typeof record !== "object") return false;
          const raw = record as Record<string, unknown>;
          return consigneeMatches(raw.consignee, activeUsername);
        })
        .map(
          (record) =>
            mapLinbisOceanToShippingOrder(
              record as Record<string, unknown>,
            ) as OceanShippingOrder,
        )
        .filter((order) => order.id && order.number)
        .sort((a, b) => {
          const da = a.departureDate ? new Date(a.departureDate) : new Date(0);
          const db = b.departureDate ? new Date(b.departureDate) : new Date(0);
          return db.getTime() - da.getTime();
        });
      setOceanShipments(filtered);
      setDisplayedOceanShipments(filtered);
      setShowingAll(false);
      setLoading(false);
      console.log(
        `Ocean: ${filtered.length} envíos para ${activeUsername} (caché global)`,
      );
      return;
    }

    const controller = new AbortController();
    fetchOceanShipments(controller.signal);
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

    if (!incomingFilter || oceanShipments.length === 0) return;
    if (appliedInitialFilterRef.current === incomingFilter) return;

    const filtered = oceanShipments.filter((s) =>
      (s.number || "").toLowerCase().includes(incomingFilter.toLowerCase()),
    );

    appliedInitialFilterRef.current = incomingFilter;
    setFilterNumber(incomingFilter);
    setDisplayedOceanShipments(filtered);
    setShowingAll(true);
    setExpandedShipmentId(filtered[0]?.id ?? null);
    setTablePage(1);

    if (!initialFilterNumber && locationState?.shipmentFilterNumber) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [
    initialFilterNumber,
    location.pathname,
    location.state,
    navigate,
    oceanShipments,
  ]);

  useEffect(() => {
    setHbliCache({});
    setQuoteNumberCache({});
    setTrackedOceanNumbers(new Set());
    setShipsgoArrivalByNumber({});
  }, [activeUsername]);

  useEffect(() => {
    const reset = prevTrackingUsernameRef.current !== activeUsername;
    prevTrackingUsernameRef.current = activeUsername;
    loadTrackingIndex({ reset });
    return () => trackingIndexAbortRef.current?.abort();
  }, [loadTrackingIndex, activeUsername]);

  // Fetch tracked ocean shipments from ShipsGo
  useEffect(() => {
    if (!activeUsername) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/shipsgo/ocean/shipments`);
        if (!res.ok) return;
        const data = await res.json();
        const nums = new Set<string>();
        const etaByNumber: Record<string, ShipsgoEtaEntry> = {};
        for (const s of data.shipments ?? []) {
          if (s.reference !== activeUsername) continue;
          const current = s.route?.port_of_discharge?.date_of_discharge;
          const initial = s.route?.port_of_discharge?.date_of_discharge_initial;
          const storeEta = (key: string) => {
            if (!current) return;
            etaByNumber[key] = {
              current,
              initial:
                typeof initial === "string" && initial !== current
                  ? initial
                  : undefined,
            };
          };
          if (s.container_number) {
            const key = s.container_number.toUpperCase();
            nums.add(key);
            storeEta(key);
          }
          if (s.booking_number) {
            const key = s.booking_number.toUpperCase();
            nums.add(key);
            storeEta(key);
          }
        }
        setTrackedOceanNumbers(nums);
        setShipsgoArrivalByNumber(etaByNumber);
      } catch {
        /* ignore */
      }
    })();
  }, [activeUsername]);

  /* -- Accordion -------------------------------------------- */
  const toggleAccordion = (shipmentId: string | number) => {
    if (expandedShipmentId === shipmentId) {
      setExpandedShipmentId(null);
    } else {
      setExpandedShipmentId(shipmentId);
      const s = displayedOceanShipments.find((sh) => {
        const id = sh.id || sh.number;
        return id === shipmentId;
      });
      if (s?.number) {
        fetchHBLIForShipment(s.number);
        fetchQuoteNumberForShipment(s.number, s.customerReference);
      }
    }
  };

  /* -- Tracking helpers ------------------------------------- */
  const getTrackOceanNumber = (shipment: OceanShippingOrder | null) => {
    if (!shipment) return "";
    const shippingOrderTracking = resolveShippingOrderTracking(shipment);
    if (shippingOrderTracking) return shippingOrderTracking;
    if (shipment.bookingNumber) return shipment.bookingNumber;
    const hbli = hbliCache[shipment.number];
    if (hbli?.containerNumber) return hbli.containerNumber;
    if (shipment.waybillNumber) return shipment.waybillNumber;
    return "";
  };

  const getDisplayedTrackingNumber = (shipment: OceanShippingOrder) => {
    if (isTrackingLoading(shipment)) return "Cargando...";
    const shippingOrderTracking = resolveShippingOrderTracking(shipment);
    if (shippingOrderTracking) return shippingOrderTracking;
    const hbli = hbliCache[shipment.number];
    if (hbli?.containerNumber) return hbli.containerNumber;
    if (shipment.bookingNumber) return shipment.bookingNumber;
    if (shipment.waybillNumber) return shipment.waybillNumber;
    return "-";
  };

  const needsHbliResolution = (shipment: OceanShippingOrder) =>
    !resolveShippingOrderTracking(shipment) && !shipment.bookingNumber?.trim();

  const isTrackingLoading = (shipment: OceanShippingOrder): boolean => {
    if (resolveShippingOrderTracking(shipment)) return false;
    if (shipment.bookingNumber?.trim()) return false;
    if (trackingIndex.loading || !trackingIndex.fetched) return true;
    if (needsHbliResolution(shipment)) {
      const hbli = hbliCache[shipment.number];
      if (!hbli || hbli.loading || !hbli.fetched) return true;
    }
    return false;
  };

  const isTrackingReady = (shipment: OceanShippingOrder) => {
    if (isTrackingLoading(shipment)) return false;
    return !!getTrackOceanNumber(shipment).trim();
  };

  const isOceanShipmentAlreadyTracked = (
    shipment: OceanShippingOrder,
  ): boolean => {
    if (trackedOceanNumbers.size === 0) return false;
    return getOceanShipsgoLookupKeys(shipment).some((key) =>
      trackedOceanNumbers.has(key),
    );
  };

  /** Fecha llegada: ShipsGo (naviera) si hay tracking activo; si no, Linbis */
  const getEffectiveArrivalDate = (
    shipment: OceanShippingOrder,
  ): string | null | undefined => {
    const shipsgoEta = findShipsgoOceanEta(shipment);
    if (shipsgoEta) return shipsgoEta;
    return shipment.arrivalDate;
  };

  const openTrackedShipmentInPortal = (shipment: OceanShippingOrder) => {
    const hbli = hbliCache[shipment.number];
    const openTracking = buildOceanOpenTrackingTarget({
      containerNumber: hbli?.containerNumber,
      bookingNumber: shipment.bookingNumber,
      trackingNumber: resolveShippingOrderTracking(shipment),
    });
    const navigationState: ShipsGoTrackingLocationState = openTracking
      ? { openTab: "ocean", openTracking }
      : { openTab: "ocean" };

    if (reporteriaClientesContext) {
      reporteriaClientesContext.openTrackingTab("ocean", openTracking);
      return;
    }

    navigate("/trackings", { state: navigationState });
  };

  const openTrackModal = (shipment: OceanShippingOrder) => {
    if (!isTrackingReady(shipment)) return;
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

    const oceanNumber = getTrackOceanNumber(trackShipment).trim();
    if (!oceanNumber) {
      setTrackError(
        "No se pudo obtener el número de tracking. Consulta la pestaña BL/HBLI.",
      );
      return;
    }

    setTrackLoading(true);
    setTrackError(null);

    try {
      const isContainerNumber = /^[A-Z]{4}[0-9]{7}$/.test(
        oceanNumber.toUpperCase(),
      );

      const payload: Record<string, unknown> = {
        reference: activeUsername,
        carrier: "SG_XXXX",
        followers,
        tags: [],
      };

      if (isContainerNumber) {
        payload.container_number = oceanNumber.toUpperCase();
      } else {
        payload.booking_number = oceanNumber;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/shipsgo/ocean/shipments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setTrackError(
            "Ya existe un trackeo con este contenedor/booking en tu cuenta.",
          );
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
          "No se pudieron guardar los correos usados en el tracking marítimo:",
          rememberError,
        );
      });

      closeTrackModal();
      registrarEvento({
        accion: "TRACKING_CREADO",
        categoria: "TRACKING",
        descripcion: `Tracking marítimo creado desde envíos: ${oceanNumber}`,
        detalles: {
          tipo: "ocean",
          numero: oceanNumber,
          cuenta: activeUsername,
        },
        clienteAfectado: activeUsername || undefined,
      });
      if (reporteriaClientesContext) {
        reporteriaClientesContext.openTrackingTab("ocean");
      } else {
        navigate("/trackings-maritimo");
      }
    } catch {
      setTrackError(
        "Error de conexión. Verifica tu internet e intenta nuevamente.",
      );
    } finally {
      setTrackLoading(false);
    }
  };

  /* -- Search / filter -------------------------------------- */
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
    setDisplayedOceanShipments(oceanShipments);
    setShowingAll(false);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    let filtered = oceanShipments;
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
        if (!s.departureDate) return false;
        const d = new Date(s.departureDate);
        d.setTime(d.getTime() + 3600000);
        return d.toISOString().split("T")[0] === filterDepartureDate;
      });
    }
    if (filterArrivalDate) {
      filtered = filtered.filter((s) => {
        const arrival = getEffectiveArrivalDate(s);
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
    setDisplayedOceanShipments(filtered);
    setShowingAll(true);
  };

  const refreshShipments = () => {
    if (!activeUsername) return;

    // MundoGaming dummy
    if (activeUsername === "MundoGaming") {
      const mapped: OceanShippingOrder[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS.map((s: any) => ({
          id: s.id || 0,
          number: s.number || "",
          waybillNumber: s.waybillNumber || null,
          bookingNumber: s.bookingNumber || null,
          customerReference: s.customerReference || null,
          departureDate: s.departure || null,
          arrivalDate: s.arrival || null,
          carrier: s.carrier ? { name: s.carrier } : null,
          consignee: s.consignee ? { name: s.consignee } : null,
          notes: s.notes || null,
          totalCargo: {
            pieces: s.totalCargo_Pieces || 0,
            weight: { userDisplay: s.totalCargo_WeightDisplayValue || "" },
            volume: { userDisplay: s.totalCargo_VolumeDisplayValue || "" },
          },
        }));
      const dummySorted = mapped.sort((a, b) => {
        const da = a.departureDate ? new Date(a.departureDate) : new Date(0);
        const db = b.departureDate ? new Date(b.departureDate) : new Date(0);
        return db.getTime() - da.getTime();
      });
      setOceanShipments(dummySorted);
      setDisplayedOceanShipments(dummySorted);
      setShowingAll(false);
      console.log("MundoGaming: datos dummy ocean recargados");
      return;
    }

    const cacheKey = `oceanShipmentsCache_${activeUsername}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    localStorage.removeItem(OCEAN_ALL_CACHE_KEY);
    localStorage.removeItem(OCEAN_ALL_CACHE_TS_KEY);
    loadTrackingIndex();
    setOceanShipments([]);
    setDisplayedOceanShipments([]);
    fetchOceanShipments();
  };

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <div className="osv-container">
      <PageBannerHeader variant="oceanShipments" />

      {/* Toolbar */}
      <div
        className="osv-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 24,
        }}
      >
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {/* Filter Icon Button */}
          <button
            className={`osv-btn osv-btn--ghost${activeFilterCount > 0 ? " osv-btn--ghost-active" : ""}`}
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
              <span
                style={{
                  backgroundColor: "var(--primary-color)",
                  color: "#fff",
                  borderRadius: "9999px",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  padding: "1px 7px",
                  marginLeft: 2,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            className="osv-btn"
            onClick={refreshShipments}
            style={{
              backgroundColor: "var(--primary-color)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "0 12px",
              height: "32px",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily:
                '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Search / Filter modal */}
      {showSearchModal && (
        <div className="osv-overlay" onClick={() => setShowSearchModal(false)}>
          <div
            className="osv-modal osv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="osv-modal__title">
              Buscar y filtrar Ocean Shipments
            </h5>

            <form
              onSubmit={(e) => {
                handleApplyFilters(e);
                setShowSearchModal(false);
              }}
            >
              <div className="osv-search-section">
                <label className="osv-label">Filtros de tabla</label>
                <div className="osv-search-row">
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
                      className="osv-input"
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
                      className="osv-input"
                      type="text"
                      value={filterWaybill}
                      onChange={(e) => setFilterWaybill(e.target.value)}
                      onFocus={() => setIsWaybillFocused(true)}
                      onBlur={() => setIsWaybillFocused(false)}
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                </div>
                <div className="osv-search-row">
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
                      className="osv-input"
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
                      className="osv-input"
                      type="text"
                      value={filterCarrier}
                      onChange={(e) => setFilterCarrier(e.target.value)}
                      onFocus={() => setIsCarrierFocused(true)}
                      onBlur={() => setIsCarrierFocused(false)}
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                </div>
                <div className="osv-search-row">
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
                      className="osv-input"
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
                      className="osv-input"
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
                  className="osv-btn osv-btn--primary osv-btn--full"
                  type="submit"
                >
                  Aplicar filtros
                </button>
                <button
                  className="osv-btn osv-btn--ghost"
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
            { label: "Número" },
            { label: "Origen" },
            { label: "Referencia Cliente" },
            { label: "Fecha Salida", center: true },
            { label: "Fecha Llegada", center: true },
            { label: "Carrier", center: true },
          ]}
        />
      )}

      {/* Error */}
      {error && (
        <div className="osv-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Table */}
      {!loading && displayedOceanShipments.length > 0 && (
        <div className="osv-table-wrapper">
          <div className="osv-table-scroll">
            <table className="osv-table">
              <thead>
                <tr>
                  <th className="osv-th">Número</th>
                  <th className="osv-th">Origen</th>
                  <th className="osv-th">Referencia Cliente</th>
                  <th className="osv-th osv-th--center">Fecha Salida</th>
                  <th className="osv-th osv-th--center">Fecha Llegada</th>
                  <th className="osv-th osv-th--center">Carrier</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShipments.map((shipment, index) => {
                  const shipmentId = shipment.id || shipment.number || index;
                  const isExpanded = expandedShipmentId === shipmentId;
                  const effectiveArrivalDate = getEffectiveArrivalDate(shipment);
                  const effectiveArrivalIsShipsgo =
                    isOceanArrivalFromShipsgo(shipment);

                  return (
                    <React.Fragment key={shipmentId}>
                      <tr
                        className={`osv-tr ${isExpanded ? "osv-tr--active" : ""}`}
                        onClick={() => toggleAccordion(shipmentId)}
                      >
                        <td className="osv-td osv-td--number">
                          <svg
                            className={`osv-row-chevron ${isExpanded ? "osv-row-chevron--open" : ""}`}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          {shipment.number || "---"}
                        </td>
                        <td className="osv-td">
                          {shipment.executedAt?.name?.trim() || "-"}
                        </td>
                        <td className="osv-td">
                          {shipment.customerReference || "-"}
                        </td>
                        <td className="osv-td osv-td--center">
                          {formatDateInline(shipment.departureDate)}
                        </td>
                        <td className="osv-td osv-td--center">
                          {renderArrivalInline(
                            effectiveArrivalDate,
                            effectiveArrivalIsShipsgo,
                          )}
                        </td>
                        <td className="osv-td osv-td--center">
                          {shipment.carrier?.name || "-"}
                        </td>
                      </tr>

                      {/* Accordion content */}
                      {isExpanded && (
                        <tr className="osv-accordion-row">
                          <td colSpan={6} className="osv-accordion-cell">
                            <div className="osv-accordion-content">
                              {/* Route summary card */}
                              <div className="osv-route-card">
                                <div className="osv-route-card__point">
                                  <span className="osv-route-card__label">
                                    Origen
                                  </span>
                                  <span className="osv-route-card__value">
                                    {shipment.executedAt?.name?.trim() || "-"}
                                  </span>
                                  {shipment.departureDate && (
                                    <span className="osv-route-card__date">
                                      {formatDateInline(shipment.departureDate)}
                                    </span>
                                  )}
                                </div>
                                <div className="osv-route-card__connector">
                                  <span className="osv-route-card__line" />
                                  {shipment.carrier?.name && (
                                    <span
                                      className="osv-route-card__carrier"
                                      title={shipment.carrier.name}
                                    >
                                      {shipment.carrier.name}
                                    </span>
                                  )}
                                </div>
                                <div className="osv-route-card__point osv-route-card__point--end">
                                  <span className="osv-route-card__label">
                                    Destino
                                  </span>
                                  <span className="osv-route-card__value">
                                    {shipment.destination?.name?.trim() || "-"}
                                  </span>
                                  {effectiveArrivalDate && (
                                    <span className="osv-route-card__date">
                                      {effectiveArrivalIsShipsgo
                                        ? formatShipsgoDateLong(
                                            effectiveArrivalDate,
                                          )
                                        : formatDateInline(effectiveArrivalDate)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tabs */}
                              {documentsOnly ? (
                                <DocumentosSectionOcean
                                  shipmentId={shipmentId}
                                />
                              ) : (
                                <DetailTabs
                                  tabs={[
                                    {
                                      key: "general",
                                      label: "Información General",
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
                                          <line
                                            x1="12"
                                            y1="16"
                                            x2="12"
                                            y2="12"
                                          />
                                          <line
                                            x1="12"
                                            y1="8"
                                            x2="12.01"
                                            y2="8"
                                          />
                                        </svg>
                                      ),
                                      content: (
                                        <OceanGeneralTabContent
                                          shipment={shipment}
                                          quoteEntry={
                                            quoteNumberCache[shipment.number]
                                          }
                                          hbliEntry={
                                            hbliCache[shipment.number]
                                          }
                                          renderAccordionArrivalDate={() =>
                                            renderAccordionArrivalDate(shipment)
                                          }
                                          getHBLIFromShipment={
                                            getHBLIFromShipment
                                          }
                                          formatDateLong={formatDateLong}
                                          getDisplayedTrackingNumber={
                                            getDisplayedTrackingNumber
                                          }
                                          isTrackingLoading={isTrackingLoading}
                                          isTrackingReady={isTrackingReady}
                                          isOceanShipmentAlreadyTracked={
                                            isOceanShipmentAlreadyTracked
                                          }
                                          openTrackModal={openTrackModal}
                                          onOpenTracking={() =>
                                            openTrackedShipmentInPortal(shipment)
                                          }
                                          onOpenQuote={(qn) => {
                                            if (reporteriaClientesContext) {
                                              reporteriaClientesContext.openQuotesTab(
                                                qn,
                                              );
                                            } else {
                                              navigate("/quotes", {
                                                state: { quoteFilter: qn },
                                              });
                                            }
                                          }}
                                        />
                                      ),
                                    },
                                    {
                                      key: "docs",
                                      label: "Documentos",
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
                                          <line
                                            x1="16"
                                            y1="13"
                                            x2="8"
                                            y2="13"
                                          />
                                          <line
                                            x1="16"
                                            y1="17"
                                            x2="8"
                                            y2="17"
                                          />
                                        </svg>
                                      ),
                                      content: (
                                        <DocumentosSectionOcean
                                          shipmentId={shipmentId}
                                        />
                                      ),
                                    },
                                    {
                                      key: "notes",
                                      label: "Notas",
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
                                      hidden: !shipment.notes,
                                      content: (
                                        <div className="osv-notes">
                                          {shipment.notes}
                                        </div>
                                      ),
                                    },
                                  ]}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="osv-table-footer">
            <div className="osv-table-footer__left">
              {loading && <span className="osv-loading-text">Cargando...</span>}
            </div>
            <div className="osv-table-footer__right">
              <span className="osv-pagination-label">Filas por página:</span>
              <select
                className="osv-pagination-select"
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
              <span className="osv-pagination-range">
                {paginationRangeText}
              </span>
              <button
                className="osv-pagination-btn"
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
                className="osv-pagination-btn"
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
      )}

      {/* Track Modal */}
      {showTrackModal && trackShipment && (
        <div className="osv-overlay" onClick={closeTrackModal}>
          <div
            className="osv-modal osv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="osv-modal__title">Trackea tu envío</h3>

            <div style={{ marginBottom: 16 }}>
              <label className="osv-label">Tracking Number</label>
              <input
                className="osv-input"
                type="text"
                value={getTrackOceanNumber(trackShipment)}
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
                <label className="osv-label" style={{ marginBottom: 0 }}>
                  Correo electrónico para seguimiento
                </label>
                <button
                  type="button"
                  className="osv-btn osv-btn--ghost osv-btn--sm"
                  onClick={addTrackEmailField}
                  disabled={trackEmails.length >= MAX_VISIBLE_TRACK_FOLLOWERS}
                >
                  +
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {trackEmails.map((email, index) => (
                  <div
                    key={`ocean-track-email-${index}`}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      className="osv-input"
                      type="email"
                      value={email}
                      onChange={(e) => updateTrackEmail(index, e.target.value)}
                      placeholder={`Correo ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="osv-btn osv-btn--ghost osv-btn--sm"
                      onClick={() => removeTrackEmailField(index)}
                      disabled={trackEmails.length === 1}
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>
              <small className="osv-label osv-label--small">
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

            {trackError && <div className="osv-error">{trackError}</div>}

            <p className="osv-modal__question">
              ¿Deseas generar el nuevo rastreo de tu envío?
            </p>

            <div className="osv-modal__actions">
              <button
                className="osv-btn osv-btn--ghost"
                onClick={closeTrackModal}
              >
                No
              </button>
              <button
                className="osv-btn osv-btn--primary"
                onClick={handleTrackSubmit}
                disabled={trackLoading}
              >
                {trackLoading ? "Creando..." : "Sí"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty - no search results */}
      {displayedOceanShipments.length === 0 &&
        !loading &&
        oceanShipments.length > 0 &&
        showingAll && (
          <div className="osv-empty">
            <p className="osv-empty__title">
              No se encontraron ocean shipments
            </p>
            <p className="osv-empty__subtitle">
              No hay ocean shipments que coincidan con tu búsqueda
            </p>
            <button className="osv-btn osv-btn--primary" onClick={clearSearch}>
              Ver los últimos ocean shipments
            </button>
          </div>
        )}

      {/* Empty - no shipments */}
      {oceanShipments.length === 0 && !loading && (
        <div className="osv-empty">
          <p className="osv-empty__title">No hay ocean shipments disponibles</p>
          <p className="osv-empty__subtitle">
            No se encontraron ocean shipments para tu cuenta
          </p>
        </div>
      )}
    </div>
  );
}

export default OceanShipmentsView;
