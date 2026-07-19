import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { ArrowLeft, Truck } from "lucide-react";
import LoadingTips from "./LoadingTips";
import { useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useClientOverride } from "@/contexts/ClientOverrideContext";
import PageBannerHeader from "@/components/shared/layout/PageBannerHeader";
import { type GroundShipment } from "./Handlers/HandlerGroundShipments";
import type { OutletContext } from "./Handlers/HandlerOceanShipments";
import { MUNDOGAMING_DUMMY_GROUND_SHIPMENTS } from "@/mocks/mundogaming";
import { DocumentosSectionGround } from "@/components/cliente/documentos/DocumentosSectionGround";
import "./GroundShipmentsView.css";
import { linbisFetch } from "@/services/linbisFetch";
import { consigneeMatches } from "@/services/linbisListFetch";

const GROUND_ALL_CACHE_KEY = "groundShipmentsAllCache_v1";
const GROUND_ALL_CACHE_TS_KEY = "groundShipmentsAllCacheTimestamp_v1";

const DEFAULT_ROWS_PER_PAGE = 15;

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
      data-gsv-section={dataId}
      className="gsv-dsection"
    >
      <h3 className="gsv-dsection__title">{title}</h3>
      <div className="gsv-field-grid">{children}</div>
    </section>
  );
}

function FieldGridCell({ label, value }: { label: string; value?: unknown }) {
  const display = formatFieldValue(value);
  return (
    <div className="gsv-field-cell">
      <span className="gsv-field-cell__label">{label}</span>
      <span
        className={`gsv-field-cell__value${display === "-" ? " gsv-field-cell__value--muted" : ""}`}
      >
        {display}
      </span>
    </div>
  );
}

interface GroundShipmentDetailPanelProps {
  shipment: GroundShipment;
  shipmentId: string | number;
  documentsOnly: boolean;
  onClose: () => void;
  formatDate: (dateString?: string) => string;
  formatDateShort: (dateString?: string) => string;
  formatCLP: (priceString?: string) => string | null;
}

function GroundShipmentDetailPanel({
  shipment,
  shipmentId,
  documentsOnly,
  onClose,
  formatDate,
  formatDateShort,
  formatCLP,
}: GroundShipmentDetailPanelProps) {
  const hasNotes = !!shipment.notes && shipment.notes !== "N/A";

  const [activeSection, setActiveSection] = useState("detalles");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const navSections = useMemo(
    () =>
      [
        { id: "detalles", label: "Detalles del envío" },
        { id: "transporte", label: "Transporte terrestre" },
        { id: "referencias", label: "Documentos y referencias" },
        { id: "fechas", label: "Fechas" },
        { id: "carga", label: "Información de carga" },
        { id: "documentos", label: "Documentos" },
        { id: "financiero", label: "Financiero" },
        { id: "notas", label: "Notas", hidden: !hasNotes },
      ].filter((section) => !section.hidden),
    [hasNotes],
  );

  // Al cambiar de envío: volver arriba y reiniciar la sección activa
  useEffect(() => {
    setActiveSection("detalles");
    const layoutMain = document.querySelector<HTMLElement>(".user-layout-main");
    layoutMain?.scrollTo({ top: 0 });
  }, [shipmentId]);

  useEffect(() => {
    if (documentsOnly) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.getAttribute("data-gsv-section");
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

  const registerSection = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  const heroBlock = (
    <header className="gsv-detail__hero">
      <div className="gsv-detail__id">
        <span className="gsv-detail__eyebrow">Referencia Cliente</span>
        <h2 className="gsv-detail__title">
          {shipment.customerReference || "—"}
        </h2>
        <div className="gsv-detail__meta">
          <span className="gsv-detail__chip">
            <Truck size={13} aria-hidden />
            Terrestre
          </span>
          {shipment.number && (
            <span className="gsv-detail__chip">N° {shipment.number}</span>
          )}
        </div>
      </div>

      <div className="gsv-route">
        <div className="gsv-route__point">
          <span className="gsv-route__label">Origen</span>
          <span className="gsv-route__value">{shipment.from || "N/A"}</span>
          {shipment.departure && (
            <span className="gsv-route__date">
              {formatDateShort(shipment.departure)}
            </span>
          )}
        </div>
        <div className="gsv-route__connector" aria-hidden>
          <span className="gsv-route__line" />
          <span className="gsv-route__icon">
            <Truck size={16} aria-hidden />
          </span>
          <span className="gsv-route__line" />
          {shipment.carrier && (
            <span className="gsv-route__transit" title={shipment.carrier}>
              {shipment.carrier}
            </span>
          )}
        </div>
        <div className="gsv-route__point gsv-route__point--end">
          <span className="gsv-route__label">Destino</span>
          <span className="gsv-route__value">{shipment.to || "N/A"}</span>
          {shipment.arrival && (
            <span className="gsv-route__date">
              {formatDateShort(shipment.arrival)}
            </span>
          )}
        </div>
      </div>
    </header>
  );

  if (documentsOnly) {
    return (
      <div className="gsv-detail">
        <div className="gsv-detail__topbar">
          <button type="button" className="gsv-back" onClick={onClose}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Volver a embarques
          </button>
        </div>
        {heroBlock}
        <div className="gsv-detail__docs-only">
          <DocumentosSectionGround shipmentId={shipmentId} />
        </div>
      </div>
    );
  }

  return (
    <div className="gsv-detail">
      <div className="gsv-detail__topbar">
        <button type="button" className="gsv-back" onClick={onClose}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          Volver a embarques
        </button>
      </div>

      <div className="gsv-detail__body">
        <aside className="gsv-detail__nav">
          <nav
            className="gsv-detail__nav-inner"
            aria-label="Secciones del envío"
          >
            {navSections.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`gsv-detail__nav-item${
                  activeSection === id ? " gsv-detail__nav-item--active" : ""
                }`}
                aria-current={activeSection === id ? "true" : undefined}
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="gsv-detail__sections">
          {heroBlock}

          <dl className="gsv-stats">
            <div className="gsv-stat">
              <dt className="gsv-stat__label">Fecha salida</dt>
              <dd className="gsv-stat__value">
                {shipment.departure ? formatDate(shipment.departure) : "—"}
              </dd>
            </div>
            <div className="gsv-stat">
              <dt className="gsv-stat__label">Fecha llegada</dt>
              <dd className="gsv-stat__value">
                {shipment.arrival ? formatDate(shipment.arrival) : "—"}
              </dd>
            </div>
            <div className="gsv-stat">
              <dt className="gsv-stat__label">Transportista</dt>
              <dd className="gsv-stat__value">{shipment.carrier || "—"}</dd>
            </div>
            <div className="gsv-stat">
              <dt className="gsv-stat__label">Gasto total</dt>
              <dd className="gsv-stat__value gsv-stat__value--amount">
                {formatCLP(shipment.totalCharge_IncomeDisplayValue) || "$0 CLP"}
              </dd>
            </div>
          </dl>

          <FieldGridSection
            title="Detalles del envío"
            sectionRef={registerSection("detalles")}
            dataId="detalles"
          >
            <FieldGridCell label="Numero de Envio" value={shipment.number} />
            <FieldGridCell
              label="Tipo de Operacion"
              value={shipment.operationFlow}
            />
            <FieldGridCell
              label="Tipo de Envio"
              value={shipment.shipmentType}
            />
            <FieldGridCell label="Clase" value={shipment.shipmentClass} />
            <FieldGridCell label="Categoria" value={shipment.rateCategory} />
            <FieldGridCell label="Tipo de Pago" value={shipment.paymentType} />
          </FieldGridSection>

          <FieldGridSection
            title="Transporte terrestre"
            sectionRef={registerSection("transporte")}
            dataId="transporte"
          >
            <FieldGridCell label="Transportista" value={shipment.carrier} />
            <FieldGridCell label="Conductor" value={shipment.driver} />
            <FieldGridCell label="N° Camion" value={shipment.truckNumber} />
            <FieldGridCell
              label="N° Tracking"
              value={shipment.trackingNumber}
            />
            <FieldGridCell label="Pro Number" value={shipment.proNumber} />
            <FieldGridCell label="Origen" value={shipment.from} />
            <FieldGridCell label="Destino" value={shipment.to} />
            <FieldGridCell
              label="Destino Final"
              value={shipment.finalDestination}
            />
          </FieldGridSection>

          <FieldGridSection
            title="Documentos y referencias"
            sectionRef={registerSection("referencias")}
            dataId="referencias"
          >
            <FieldGridCell
              label="Booking Number"
              value={shipment.bookingNumber}
            />
            <FieldGridCell
              label="Waybill Number"
              value={shipment.waybillNumber}
            />
            <FieldGridCell
              label="N° Contenedor"
              value={shipment.containerNumber}
            />
            <FieldGridCell
              label="Referencia Cliente"
              value={shipment.customerReference}
            />
            <FieldGridCell
              label="Representante Ventas"
              value={shipment.salesRep}
            />
          </FieldGridSection>

          <FieldGridSection
            title="Fechas"
            sectionRef={registerSection("fechas")}
            dataId="fechas"
          >
            <FieldGridCell
              label="Fecha de Creacion"
              value={shipment.createdOn ? formatDate(shipment.createdOn) : null}
            />
            <FieldGridCell
              label="Fecha Salida"
              value={shipment.departure ? formatDate(shipment.departure) : null}
            />
            <FieldGridCell
              label="Fecha Llegada"
              value={shipment.arrival ? formatDate(shipment.arrival) : null}
            />
          </FieldGridSection>

          <FieldGridSection
            title="Información de carga"
            sectionRef={registerSection("carga")}
            dataId="carga"
          >
            <FieldGridCell
              label="Total de Piezas"
              value={shipment.totalCargo_Pieces}
            />
            <FieldGridCell
              label="Peso Total"
              value={shipment.totalCargo_WeightDisplayValue}
            />
            <FieldGridCell
              label="Volumen Total"
              value={shipment.totalCargo_VolumeDisplayValue}
            />
            <FieldGridCell label="Pallets" value={shipment.pallets} />
            <FieldGridCell
              label="Descripcion de Carga"
              value={shipment.cargoDescription}
            />
            <FieldGridCell
              label="Estado de Carga"
              value={shipment.cargoStatus}
            />
            <FieldGridCell
              label="Carga Peligrosa"
              value={shipment.hazardous ? "Si" : "No"}
            />
          </FieldGridSection>

          <section
            ref={registerSection("documentos")}
            data-gsv-section="documentos"
            className="gsv-dsection"
          >
            <h3 className="gsv-dsection__title">Documentos</h3>
            <DocumentosSectionGround shipmentId={shipmentId} />
          </section>

          <section
            ref={registerSection("financiero")}
            data-gsv-section="financiero"
            className="gsv-dsection"
          >
            <h3 className="gsv-dsection__title">Financiero</h3>
            <div className="gsv-amount">
              <span className="gsv-amount__value">
                {formatCLP(shipment.totalCharge_IncomeDisplayValue) || "$0 CLP"}
              </span>
              <span className="gsv-amount__label">
                Gasto Total (No incluye impuestos)
              </span>
              <span className="gsv-amount__hint">
                Monto estimado para este envío
              </span>
            </div>
          </section>

          {hasNotes && (
            <section
              ref={registerSection("notas")}
              data-gsv-section="notas"
              className="gsv-dsection"
            >
              <h3 className="gsv-dsection__title">Notas</h3>
              <div className="gsv-notes">{shipment.notes}</div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

/* ===========================================================
   MAIN COMPONENT
   =========================================================== */
function GroundShipmentsView({
  documentsOnly = false,
  initialFilterNumber,
}: { documentsOnly?: boolean; initialFilterNumber?: string } = {}) {
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();
  const clientOverride = useClientOverride();
  const { activeUsername: authUsername } = useAuth();
  const activeUsername = clientOverride || authUsername;
  const filterConsignee = activeUsername || "";
  const navigate = useNavigate();
  const location = useLocation();

  const [groundShipments, setGroundShipments] = useState<GroundShipment[]>([]);
  const [displayedShipments, setDisplayedShipments] = useState<
    GroundShipment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedShipmentId, setSelectedShipmentId] = useState<
    string | number | null
  >(null);

  // Search modal
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Embed
  const [, setEmbedQuery] = useState<string | null>(null);

  // Search fields
  const [searchDate, setSearchDate] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchNumber, setSearchNumber] = useState("");
  const [showingAll, setShowingAll] = useState(false);

  // Advanced toolbar filters
  const [filterNumber, setFilterNumber] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [filterDepartureDate, setFilterDepartureDate] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPieces, setFilterPieces] = useState("");
  const appliedInitialFilterRef = useRef("");

  // Focus states for floating labels
  const [isNumberFocused, setIsNumberFocused] = useState(false);
  const [isOriginFocused, setIsOriginFocused] = useState(false);
  const [isDestinationFocused, setIsDestinationFocused] = useState(false);
  const [isDepartureFocused, setIsDepartureFocused] = useState(false);
  const [isCarrierFocused, setIsCarrierFocused] = useState(false);
  const [isTypeFocused, setIsTypeFocused] = useState(false);
  const [isPiecesFocused, setIsPiecesFocused] = useState(false);

  const activeFilterCount = [
    filterNumber,
    filterOrigin,
    filterDestination,
    filterDepartureDate,
    filterCarrier,
    filterType,
    filterPieces,
  ].filter(Boolean).length;

  // Pagination
  const [tablePage, setTablePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  /* -- Helpers ------------------------------------------------ */
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCLP = (priceString?: string) => {
    if (!priceString) return null;
    const numberMatch = priceString.match(/[\d.,]+/);
    if (!numberMatch) return priceString;
    const cleanNumber = numberMatch[0].replace(/,/g, "");
    const number = parseFloat(cleanNumber);
    if (isNaN(number)) return priceString;
    return `$${new Intl.NumberFormat("es-CL").format(number)} CLP`;
  };

  /* -- Pagination ------------------------------------------------ */
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

  const getShipmentRowId = useCallback(
    (shipment: GroundShipment, index: number) =>
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

  const sortGroundShipments = (items: GroundShipment[]) =>
    [...items].sort((a, b) => {
      const da = a.departure ? new Date(a.departure) : new Date(0);
      const db = b.departure ? new Date(b.departure) : new Date(0);
      return db.getTime() - da.getTime();
    });

  const applyConsigneeFilter = (arr: GroundShipment[]) =>
    sortGroundShipments(
      arr.filter((gs) => consigneeMatches(gs.consignee, filterConsignee)),
    );

  const readGroundAllCache = (): GroundShipment[] | null => {
    try {
      const cached = localStorage.getItem(GROUND_ALL_CACHE_KEY);
      const ts = localStorage.getItem(GROUND_ALL_CACHE_TS_KEY);
      if (!cached || !ts) return null;
      if (Date.now() - parseInt(ts, 10) > 3600000) {
        localStorage.removeItem(GROUND_ALL_CACHE_KEY);
        localStorage.removeItem(GROUND_ALL_CACHE_TS_KEY);
        return null;
      }
      const parsed: GroundShipment[] = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const writeGroundAllCache = (arr: GroundShipment[]) => {
    try {
      localStorage.setItem(GROUND_ALL_CACHE_KEY, JSON.stringify(arr));
      localStorage.setItem(GROUND_ALL_CACHE_TS_KEY, Date.now().toString());
    } catch {
      /* quota exceeded */
    }
  };

  /* -- API --------------------------------------------------- */
  const fetchGroundShipments = async () => {
    if (!accessToken) {
      setError("Debes ingresar un token primero");
      return;
    }
    if (!filterConsignee) {
      setError("No se pudo obtener el nombre de usuario");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const cachedAll = readGroundAllCache();
      let arr: GroundShipment[];

      if (cachedAll) {
        arr = cachedAll;
      } else {
        const response = await linbisFetch(
          "https://api.linbis.com/ground-shipments/all",
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
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        arr = Array.isArray(data) ? data : [];
        writeGroundAllCache(arr);
      }

      const filtered = applyConsigneeFilter(arr);
      setGroundShipments(filtered);
      setDisplayedShipments(filtered);
      setShowingAll(false);
      setTablePage(1);

      console.log(
        `${arr.length} ground shipments totales, ${filtered.length} para ${filterConsignee}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error completo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTablePage(1);
  }, [displayedShipments, rowsPerPage]);

  useEffect(() => {
    if (!accessToken || !filterConsignee) return;

    // ── Cuenta dummy MundoGaming ──
    if (filterConsignee === "MundoGaming") {
      const dummySorted = [...MUNDOGAMING_DUMMY_GROUND_SHIPMENTS].sort(
        (a, b) => {
          const da = a.departure ? new Date(a.departure) : new Date(0);
          const db = b.departure ? new Date(b.departure) : new Date(0);
          return db.getTime() - da.getTime();
        },
      );
      setGroundShipments(dummySorted);
      setDisplayedShipments(dummySorted);
      setShowingAll(false);
      setTablePage(1);
      setLoading(false);
      console.log(
        "MundoGaming: cargando datos dummy ground (",
        dummySorted.length,
        "envíos)",
      );
      return;
    }

    const cachedAll = readGroundAllCache();
    if (cachedAll) {
      const filtered = applyConsigneeFilter(cachedAll);
      setGroundShipments(filtered);
      setDisplayedShipments(filtered);
      setShowingAll(false);
      setTablePage(1);
      setLoading(false);
      console.log(
        `Ground: ${filtered.length} envíos para ${filterConsignee} (caché global)`,
      );
      return;
    }

    fetchGroundShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, filterConsignee]);

  useEffect(() => {
    const locationState = location.state as {
      shipmentFilterNumber?: string;
    } | null;
    const incomingFilter = (
      initialFilterNumber ||
      locationState?.shipmentFilterNumber ||
      ""
    ).trim();

    if (!incomingFilter || groundShipments.length === 0) return;
    if (appliedInitialFilterRef.current === incomingFilter) return;

    const filtered = groundShipments.filter((s) =>
      (s.number || "")
        .toString()
        .toLowerCase()
        .includes(incomingFilter.toLowerCase()),
    );

    appliedInitialFilterRef.current = incomingFilter;
    setFilterNumber(incomingFilter);
    setDisplayedShipments(filtered);
    setShowingAll(true);
    setTablePage(1);
    setSelectedShipmentId(filtered[0]?.id ?? filtered[0]?.number ?? null);
    setEmbedQuery(filtered[0]?.number || null);

    if (!initialFilterNumber && locationState?.shipmentFilterNumber) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [
    initialFilterNumber,
    groundShipments,
    location.pathname,
    location.state,
    navigate,
  ]);

  const toggleShipmentSelection = (shipmentId: string | number) => {
    if (selectedShipmentId === shipmentId) {
      setSelectedShipmentId(null);
      setEmbedQuery(null);
      return;
    }

    setSelectedShipmentId(shipmentId);
    const shipment =
      paginatedShipments.find(
        (sh, index) => getShipmentRowId(sh, index) === shipmentId,
      ) ?? displayedShipments.find((sh) => (sh.id || sh.number) === shipmentId);
    if (shipment) setEmbedQuery(shipment.number || null);
  };

  /* -- Search ------------------------------------------------ */
  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedShipments(groundShipments);
      setShowingAll(false);
      setTablePage(1);
      return;
    }
    const term = searchNumber.trim().toLowerCase();
    setDisplayedShipments(
      groundShipments.filter((s) =>
        (s.number || "").toString().toLowerCase().includes(term),
      ),
    );
    setShowingAll(true);
    setTablePage(1);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedShipments(groundShipments);
      setShowingAll(false);
      setTablePage(1);
      return;
    }
    setDisplayedShipments(
      groundShipments.filter((s) => {
        if (!s.createdOn) return false;
        return new Date(s.createdOn).toISOString().split("T")[0] === searchDate;
      }),
    );
    setShowingAll(true);
    setTablePage(1);
    setShowSearchModal(false);
  };

  const handleSearchByDateRange = () => {
    if (!searchStartDate && !searchEndDate) {
      setDisplayedShipments(groundShipments);
      setShowingAll(false);
      setTablePage(1);
      return;
    }
    setDisplayedShipments(
      groundShipments.filter((s) => {
        if (!s.createdOn) return false;
        const d = new Date(s.createdOn);
        if (searchStartDate && searchEndDate) {
          const end = new Date(searchEndDate);
          end.setHours(23, 59, 59, 999);
          return d >= new Date(searchStartDate) && d <= end;
        }
        if (searchStartDate) return d >= new Date(searchStartDate);
        if (searchEndDate) {
          const end = new Date(searchEndDate);
          end.setHours(23, 59, 59, 999);
          return d <= end;
        }
        return false;
      }),
    );
    setShowingAll(true);
    setTablePage(1);
    setShowSearchModal(false);
  };

  const clearSearch = () => {
    setSearchNumber("");
    setSearchDate("");
    setSearchStartDate("");
    setSearchEndDate("");
    setFilterNumber("");
    setFilterOrigin("");
    setFilterDestination("");
    setFilterDepartureDate("");
    setFilterCarrier("");
    setFilterType("");
    setFilterPieces("");
    setDisplayedShipments(groundShipments);
    setShowingAll(false);
    setTablePage(1);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    let filtered = groundShipments;

    if (filterNumber.trim()) {
      const term = filterNumber.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.number || "").toString().toLowerCase().includes(term),
      );
    }
    if (filterOrigin.trim()) {
      const term = filterOrigin.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.from || "").toLowerCase().includes(term),
      );
    }
    if (filterDestination.trim()) {
      const term = filterDestination.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.to || "").toLowerCase().includes(term),
      );
    }
    if (filterDepartureDate) {
      filtered = filtered.filter((s) => {
        if (!s.departure) return false;
        return (
          new Date(s.departure).toISOString().split("T")[0] ===
          filterDepartureDate
        );
      });
    }
    if (filterCarrier.trim()) {
      const term = filterCarrier.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.carrier || "").toLowerCase().includes(term),
      );
    }
    if (filterType.trim()) {
      const term = filterType.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.shipmentClass || s.rateCategory || "").toLowerCase().includes(term),
      );
    }
    if (filterPieces.trim()) {
      const term = filterPieces.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.totalCargo_Pieces ?? "").toString().toLowerCase().includes(term),
      );
    }
    setDisplayedShipments(filtered);
    setShowingAll(true);
    setTablePage(1);
    setShowSearchModal(false);
  };

  const refreshShipments = () => {
    if (filterConsignee === "MundoGaming") {
      const dummySorted = [...MUNDOGAMING_DUMMY_GROUND_SHIPMENTS].sort(
        (a, b) => {
          const da = a.departure ? new Date(a.departure) : new Date(0);
          const db = b.departure ? new Date(b.departure) : new Date(0);
          return db.getTime() - da.getTime();
        },
      );
      setGroundShipments(dummySorted);
      setDisplayedShipments(dummySorted);
      setShowingAll(false);
      setTablePage(1);
      console.log("MundoGaming: datos dummy ground recargados");
      return;
    }

    localStorage.removeItem(GROUND_ALL_CACHE_KEY);
    localStorage.removeItem(GROUND_ALL_CACHE_TS_KEY);
    setGroundShipments([]);
    setDisplayedShipments([]);
    setTablePage(1);
    fetchGroundShipments();
  };

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <div className="gsv-container">
      {!selectedShipment && (
        <>
          <PageBannerHeader variant="groundShipments" />

          {/* Toolbar */}
          <div className="gsv-toolbar">
            <button
              className={`gsv-btn gsv-btn--ghost gsv-toolbar__icon-btn ${activeFilterCount > 0 ? "gsv-toolbar__icon-btn--active" : ""}`}
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
                <span className="gsv-toolbar__badge">{activeFilterCount}</span>
              )}
            </button>
            <button
              className="gsv-btn gsv-btn--primary"
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

      {/* Search modal */}
      {showSearchModal && (
        <div className="gsv-overlay" onClick={() => setShowSearchModal(false)}>
          <div
            className="gsv-modal gsv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="gsv-modal__title">
              Buscar y filtrar Ground Shipments
            </h5>

            <form
              onSubmit={handleApplyFilters}
              className="gsv-filters-modal__form"
            >
              <div className="gsv-search-section">
                <label className="gsv-label">Filtros de tabla</label>
                <div className="gsv-search-row">
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      flex: 1,
                    }}
                  >
                    <label
                      style={{
                        position: "absolute",
                        top: filterNumber || isNumberFocused ? "2px" : "8px",
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
                      Numero
                    </label>
                    <input
                      className="gsv-input"
                      type="text"
                      value={filterNumber}
                      onChange={(e) => setFilterNumber(e.target.value)}
                      onFocus={() => setIsNumberFocused(true)}
                      onBlur={() => setIsNumberFocused(false)}
                      placeholder=""
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      flex: 1,
                    }}
                  >
                    <label
                      style={{
                        position: "absolute",
                        top: filterOrigin || isOriginFocused ? "2px" : "8px",
                        left: "8px",
                        fontSize:
                          filterOrigin || isOriginFocused ? "10px" : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Origen
                    </label>
                    <input
                      className="gsv-input"
                      type="text"
                      value={filterOrigin}
                      onChange={(e) => setFilterOrigin(e.target.value)}
                      onFocus={() => setIsOriginFocused(true)}
                      onBlur={() => setIsOriginFocused(false)}
                      placeholder=""
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                </div>
                <div className="gsv-search-row">
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      flex: 1,
                    }}
                  >
                    <label
                      style={{
                        position: "absolute",
                        top:
                          filterDestination || isDestinationFocused
                            ? "2px"
                            : "8px",
                        left: "8px",
                        fontSize:
                          filterDestination || isDestinationFocused
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
                      Destino
                    </label>
                    <input
                      className="gsv-input"
                      type="text"
                      value={filterDestination}
                      onChange={(e) => setFilterDestination(e.target.value)}
                      onFocus={() => setIsDestinationFocused(true)}
                      onBlur={() => setIsDestinationFocused(false)}
                      placeholder=""
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      flex: 1,
                    }}
                  >
                    <label
                      style={{
                        position: "absolute",
                        top:
                          filterDepartureDate || isDepartureFocused
                            ? "2px"
                            : "8px",
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
                      className="gsv-input"
                      type="date"
                      value={filterDepartureDate}
                      onChange={(e) => setFilterDepartureDate(e.target.value)}
                      onFocus={() => setIsDepartureFocused(true)}
                      onBlur={() => setIsDepartureFocused(false)}
                      placeholder=""
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                </div>
                <div className="gsv-search-row">
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      flex: 1,
                    }}
                  >
                    <label
                      style={{
                        position: "absolute",
                        top: filterCarrier || isCarrierFocused ? "2px" : "8px",
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
                      Transportista
                    </label>
                    <input
                      className="gsv-input"
                      type="text"
                      value={filterCarrier}
                      onChange={(e) => setFilterCarrier(e.target.value)}
                      onFocus={() => setIsCarrierFocused(true)}
                      onBlur={() => setIsCarrierFocused(false)}
                      placeholder=""
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      flex: 1,
                    }}
                  >
                    <label
                      style={{
                        position: "absolute",
                        top: filterType || isTypeFocused ? "2px" : "8px",
                        left: "8px",
                        fontSize: filterType || isTypeFocused ? "10px" : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Tipo
                    </label>
                    <input
                      className="gsv-input"
                      type="text"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      onFocus={() => setIsTypeFocused(true)}
                      onBlur={() => setIsTypeFocused(false)}
                      placeholder=""
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      flex: 1,
                    }}
                  >
                    <label
                      style={{
                        position: "absolute",
                        top: filterPieces || isPiecesFocused ? "2px" : "8px",
                        left: "8px",
                        fontSize:
                          filterPieces || isPiecesFocused ? "10px" : "12px",
                        fontWeight: "bold",
                        color: "#666",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                        backgroundColor: "#fff",
                        padding: "0 2px",
                        zIndex: 1,
                      }}
                    >
                      Piezas
                    </label>
                    <input
                      className="gsv-input"
                      type="text"
                      value={filterPieces}
                      onChange={(e) => setFilterPieces(e.target.value)}
                      onFocus={() => setIsPiecesFocused(true)}
                      onBlur={() => setIsPiecesFocused(false)}
                      placeholder=""
                      style={{ width: "100%", height: 44 }}
                    />
                  </div>
                </div>
                <div className="gsv-modal__actions">
                  <button
                    className="gsv-btn"
                    type="submit"
                    style={{
                      color: "white",
                      backgroundColor: "var(--primary-color)",
                    }}
                  >
                    Aplicar filtros
                  </button>
                  <button
                    className="gsv-btn gsv-btn--ghost"
                    type="button"
                    onClick={clearSearch}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </form>

            <div className="gsv-search-section">
              <label className="gsv-label">Por Numero</label>
              <input
                className="gsv-input"
                type="text"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Numero del shipment"
              />
              <button
                className="gsv-btn gsv-btn--primary gsv-btn--full"
                onClick={handleSearchByNumber}
              >
                Buscar
              </button>
            </div>

            <div className="gsv-search-section">
              <label className="gsv-label">Por Fecha Exacta</label>
              <input
                className="gsv-input"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <button
                className="gsv-btn gsv-btn--primary gsv-btn--full"
                onClick={handleSearchByDate}
              >
                Buscar
              </button>
            </div>

            <div className="gsv-search-section">
              <label className="gsv-label">Por Rango de Fechas</label>
              <div className="gsv-search-row">
                <div style={{ flex: 1 }}>
                  <span className="gsv-label gsv-label--small">Desde</span>
                  <input
                    className="gsv-input"
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="gsv-label gsv-label--small">Hasta</span>
                  <input
                    className="gsv-input"
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="gsv-btn gsv-btn--primary gsv-btn--full"
                onClick={handleSearchByDateRange}
              >
                Buscar
              </button>
            </div>

            <button
              className="gsv-btn gsv-btn--ghost gsv-btn--full"
              onClick={() => setShowSearchModal(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <LoadingTips
          columns={[
            { label: "Referencia Cliente" },
            { label: "Origen" },
            { label: "Destino" },
            { label: "Fecha Salida" },
            { label: "Transportista" },
            { label: "Tipo", center: true },
            { label: "Piezas", center: true },
          ]}
        />
      )}

      {/* Error */}
      {error && (
        <div className="gsv-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* =====================================================
          TABLE
         ===================================================== */}
      {!loading && displayedShipments.length > 0 && !selectedShipment && (
        <div className="gsv-list">
          <div className="gsv-table-wrapper">
            <div className="gsv-table-scroll">
              <table className="gsv-table">
                <thead>
                  <tr>
                    <th className="gsv-th">Referencia Cliente</th>
                    <th className="gsv-th">Origen</th>
                    <th className="gsv-th">Destino</th>
                    <th className="gsv-th">Fecha Salida</th>
                    <th className="gsv-th">Transportista</th>
                    <th className="gsv-th gsv-th--center">Tipo</th>
                    <th className="gsv-th gsv-th--center">Piezas</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedShipments.map((shipment, index) => {
                    const shipmentId = getShipmentRowId(shipment, index);
                    const referenceLabel = shipment.customerReference || "-";
                    const numberLabel = shipment.number || "---";
                    const originLabel = shipment.from || "---";
                    const destinationLabel = shipment.to || "---";
                    const departureLabel = formatDateShort(shipment.departure);
                    const carrierLabel = shipment.carrier
                      ? shipment.carrier.length > 30
                        ? shipment.carrier.substring(0, 30) + "…"
                        : shipment.carrier
                      : "-";

                    return (
                      <tr
                        key={shipmentId}
                        className="gsv-tr"
                        onClick={() => toggleShipmentSelection(shipmentId)}
                      >
                        <td
                          className="gsv-td gsv-td--reference"
                          title={referenceLabel}
                        >
                          <span className="gsv-cell-ref">{referenceLabel}</span>
                          <span className="gsv-cell-num">{numberLabel}</span>
                        </td>
                        <td className="gsv-td" title={originLabel}>
                          {originLabel}
                        </td>
                        <td className="gsv-td" title={destinationLabel}>
                          {destinationLabel}
                        </td>
                        <td className="gsv-td" title={departureLabel}>
                          {departureLabel}
                        </td>
                        <td className="gsv-td" title={carrierLabel}>
                          {carrierLabel}
                        </td>
                        <td className="gsv-td gsv-td--center">
                          {shipment.shipmentClass ? (
                            <span
                              className={`gsv-badge gsv-badge--${shipment.shipmentClass.toLowerCase()}`}
                            >
                              {shipment.shipmentClass}
                            </span>
                          ) : (
                            "---"
                          )}
                        </td>
                        <td className="gsv-td gsv-td--center">
                          {shipment.totalCargo_Pieces ?? "---"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="gsv-table-footer">
              <div className="gsv-table-footer__left">
                {loading && (
                  <span className="gsv-loading-text">Cargando...</span>
                )}
              </div>
              <div className="gsv-table-footer__right">
                <span className="gsv-pagination-label">Filas por pagina:</span>
                <select
                  className="gsv-pagination-select"
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
                <span className="gsv-pagination-range">
                  {paginationRangeText}
                </span>
                <button
                  className="gsv-pagination-btn"
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
                  className="gsv-pagination-btn"
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
        <GroundShipmentDetailPanel
          shipment={selectedShipment}
          shipmentId={getShipmentRowId(selectedShipment, selectedShipmentIndex)}
          documentsOnly={documentsOnly}
          onClose={() => setSelectedShipmentId(null)}
          formatDate={formatDate}
          formatDateShort={formatDateShort}
          formatCLP={formatCLP}
        />
      )}

      {/* Empty - no search results */}
      {displayedShipments.length === 0 &&
        !loading &&
        groundShipments.length > 0 &&
        showingAll && (
          <div className="gsv-empty">
            <p className="gsv-empty__title">
              No se encontraron operaciones terrestres
            </p>
            <p className="gsv-empty__subtitle">
              No hay operaciones terrestres que coincidan con tu busqueda
            </p>
            <button className="gsv-btn gsv-btn--primary" onClick={clearSearch}>
              Limpiar filtros
            </button>
          </div>
        )}

      {/* Empty - no shipments */}
      {groundShipments.length === 0 && !loading && (
        <div className="gsv-empty">
          <p className="gsv-empty__title">
            No hay operaciones terrestres disponibles
          </p>
          <p className="gsv-empty__subtitle">
            No se encontraron operaciones terrestres para tu cuenta
          </p>
        </div>
      )}
    </div>
  );
}

export default GroundShipmentsView;
