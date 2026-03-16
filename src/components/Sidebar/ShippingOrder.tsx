import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useClientOverride } from "../../contexts/ClientOverrideContext";
import { InfoField } from "../shipments/Handlers/Handlersairshipments";
import "./ShippingOrder.css";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface ShippingOrderEntity {
  id: number | null;
  name: string | null;
  accountNumber: string | null;
  code: string | null;
  scacNumber: string | null;
  iataCode: string | null;
  identificationNumber: string | null;
  email: string | null;
  phone: string | null;
  ownerId: string | null;
}

interface WeightVolume {
  userDisplay: string;
  value: number;
  uoM: number;
}

interface TotalCargo {
  pieces: number;
  value: number;
  containers: number;
  declaredValue: number;
  weight: WeightVolume;
  volume: WeightVolume;
  volumeWeight: WeightVolume;
  weightValue: number;
  weightUOM: number;
  volumeValue: number;
  volumeUOM: number;
  volumeWeightValue: number;
  volumeWeightUOM: number;
}

interface ExecutedAt {
  id: number;
  code: string;
  name: string;
  description: string;
}

interface ShippingOrder {
  id: number;
  number: string;
  waybillNumber: string | null;
  bookingNumber: string | null;
  additionalCustomerReference: string | null;
  customerReference: string | null;
  departureDate: string | null;
  arrivalDate: string | null;
  cutOffDate: string | null;
  cutOffDocsDate: string | null;
  spottingDate: string | null;
  notes: string | null;
  podDeliveryDate: string | null;
  podReceivedBy: string | null;
  podNotes: string | null;
  podInternalNotes: string | null;
  operationFlow: number;
  modeOfTransportation: string | null;
  rateCategoryId: number | null;
  carrier: ShippingOrderEntity | null;
  shipper: ShippingOrderEntity | null;
  shipperAddress: string | null;
  consignee: ShippingOrderEntity | null;
  consigneeAddress: string | null;
  notifyParty: ShippingOrderEntity | null;
  notifyPartyAddress: string | null;
  intermediateConsignee: ShippingOrderEntity | null;
  intermediateConsigneeAddress: string | null;
  forwardingAgent: ShippingOrderEntity | null;
  forwardingAgentAddress: string | null;
  destinationAgent: ShippingOrderEntity | null;
  destinationAgentAddress: string | null;
  maxPieces: number;
  maxWeight: number;
  executedOnDate: string | null;
  executedBy: string | null;
  executedAt: ExecutedAt | null;
  analyst: string | null;
  orderDate: string | null;
  commercialInvoiceDate: string | null;
  shippingCharges: number;
  commercialInvoiceNotes: string | null;
  packingListNotes: string | null;
  reasonExport: string | null;
  trackingNumber: string | null;
  salesRep: string | null;
  totalCargo: TotalCargo | null;
  commodities: unknown[];
  charges: unknown[];
}

interface ShippingOrdersResponse {
  shippingOrders: {
    items: ShippingOrder[];
  };
}

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const ITEMS_PER_PAGE = 10;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function formatISODate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatISODateShort(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function getOperationFlowLabel(flow: number): string {
  switch (flow) {
    case 1:
      return "Export";
    case 2:
      return "Import";
    case 3:
      return "Transit";
    default:
      return "N/A";
  }
}

function getOperationFlowBadgeClass(flow: number): string {
  switch (flow) {
    case 1:
      return "sov-badge--export";
    case 2:
      return "sov-badge--import";
    case 3:
      return "sov-badge--transit";
    default:
      return "sov-badge--unknown";
  }
}

function formatWeight(
  value: number | undefined,
  uom: number | undefined,
): string {
  if (value === undefined || value === null || value === 0) return "-";
  const unit = uom === 2 ? "kg" : "lb";
  return `${value.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
}

function formatVolume(
  value: number | undefined,
  uom: number | undefined,
): string {
  if (value === undefined || value === null || value === 0) return "-";
  const unit = uom === 2 ? "m³" : "ft³";
  return `${value.toLocaleString("es-CL", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${unit}`;
}

/** Extract the numeric suffix from number field (e.g. "SOG0003897" → 3897) */
function extractNumberSuffix(num: string): number {
  const match = num.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/* ────────────────────────────────────────────
   DetailTabs
   ──────────────────────────────────────────── */

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
    <div className="sov-tabs">
      <div className="sov-tabs__nav">
        {visible.map((tab) => (
          <button
            key={tab.key}
            className={`sov-tabs__btn ${active === tab.key ? "sov-tabs__btn--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActive(tab.key);
            }}
          >
            {tab.icon && <span className="sov-tabs__icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="sov-tabs__panel">{current?.content}</div>
    </div>
  );
}

/* ────────────────────────────────────────────
   AddressBlock
   ──────────────────────────────────────────── */

function AddressBlock({
  label,
  entity,
  address,
}: {
  label: string;
  entity: ShippingOrderEntity | null;
  address: string | null;
}) {
  if (!entity && !address) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {entity?.name && (
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--secondary-color)",
            marginBottom: 2,
          }}
        >
          {entity.name}
        </div>
      )}
      {entity?.code && (
        <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 2 }}>
          Código: {entity.code}
        </div>
      )}
      {entity?.identificationNumber && (
        <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: 2 }}>
          ID: {entity.identificationNumber}
        </div>
      )}
      {address && <div className="sov-address">{address.trim()}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────── */

function ShippingOrderView() {
  const { accessToken } = useOutletContext<OutletContext>();
  const clientOverride = useClientOverride();
  const { activeUsername: authUsername } = useAuth();
  const activeUsername = clientOverride || authUsername;

  const [allOrders, setAllOrders] = useState<ShippingOrder[]>([]);
  const [displayedOrders, setDisplayedOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [tablePage, setTablePage] = useState(1);

  // Filters
  const [filterNumber, setFilterNumber] = useState("");
  const [filterReference, setFilterReference] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [filterDepartureDate, setFilterDepartureDate] = useState("");
  const [filterArrivalDate, setFilterArrivalDate] = useState("");
  const [filterFlow, setFilterFlow] = useState("");
  const [showingFiltered, setShowingFiltered] = useState(false);

  // Focus states for floating labels
  const [isNumberFocused, setIsNumberFocused] = useState(false);
  const [isReferenceFocused, setIsReferenceFocused] = useState(false);
  const [isCarrierFocused, setIsCarrierFocused] = useState(false);
  const [isDepartureFocused, setIsDepartureFocused] = useState(false);
  const [isArrivalFocused, setIsArrivalFocused] = useState(false);
  const [isFlowFocused, setIsFlowFocused] = useState(false);

  // Embed
  const [embedQuery, setEmbedQuery] = useState<string | null>(null);

  /* ── Table pagination ─────────────────────── */
  const totalTablePages = Math.max(
    1,
    Math.ceil(displayedOrders.length / rowsPerPage),
  );

  const paginatedOrders = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return displayedOrders.slice(start, start + rowsPerPage);
  }, [displayedOrders, tablePage, rowsPerPage]);

  const paginationRangeText = useMemo(() => {
    if (displayedOrders.length === 0) return "0 de 0";
    const start = (tablePage - 1) * rowsPerPage + 1;
    const end = Math.min(tablePage * rowsPerPage, displayedOrders.length);
    return `${start}-${end} de ${displayedOrders.length}`;
  }, [tablePage, rowsPerPage, displayedOrders.length]);

  useEffect(() => {
    setTablePage(1);
  }, [displayedOrders]);

  /* ── Fetch ────────────────────────────────── */
  const fetchShippingOrders = async () => {
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
      // Check cache first
      const cacheKey = `shippingOrdersCache_${activeUsername}`;
      const cached = localStorage.getItem(cacheKey);
      const ts = localStorage.getItem(`${cacheKey}_timestamp`);

      if (cached && ts) {
        const age = Date.now() - parseInt(ts);
        if (age < CACHE_DURATION) {
          const parsed: ShippingOrder[] = JSON.parse(cached);
          setAllOrders(parsed);
          setDisplayedOrders(parsed);
          setLoading(false);
          return;
        }
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
      }

      const response = await fetch(
        "https://api.linbis.com/api/shipping-orders?PageNumber=1&PageSize=9999",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401)
          throw new Error("Token inválido o expirado.");
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: ShippingOrdersResponse = await response.json();
      const items = data?.shippingOrders?.items ?? [];

      // Filter by consignee.name matching activeUsername
      const userOrders = items.filter(
        (order) =>
          order.consignee?.name?.trim().toLowerCase() ===
          activeUsername.trim().toLowerCase(),
      );

      // Sort by number descending (newest first)
      const sorted = userOrders.sort(
        (a, b) => extractNumberSuffix(b.number) - extractNumberSuffix(a.number),
      );

      setAllOrders(sorted);
      setDisplayedOrders(sorted);
      setShowingFiltered(false);

      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify(sorted));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error fetching shipping orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken || !activeUsername) return;
    fetchShippingOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeUsername]);

  /* ── Refresh ──────────────────────────────── */
  const refreshOrders = () => {
    if (!activeUsername) return;
    const cacheKey = `shippingOrdersCache_${activeUsername}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    setAllOrders([]);
    setDisplayedOrders([]);
    fetchShippingOrders();
  };

  /* ── Filters ──────────────────────────────── */
  const clearFilters = () => {
    setFilterNumber("");
    setFilterReference("");
    setFilterCarrier("");
    setFilterDepartureDate("");
    setFilterArrivalDate("");
    setFilterFlow("");
    setDisplayedOrders(allOrders);
    setShowingFiltered(false);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    let filtered = allOrders;

    if (filterNumber.trim()) {
      filtered = filtered.filter((o) =>
        o.number.toLowerCase().includes(filterNumber.toLowerCase()),
      );
    }
    if (filterReference.trim()) {
      filtered = filtered.filter((o) =>
        (o.customerReference || "")
          .toLowerCase()
          .includes(filterReference.toLowerCase()),
      );
    }
    if (filterCarrier.trim()) {
      filtered = filtered.filter((o) =>
        (o.carrier?.name || "")
          .toLowerCase()
          .includes(filterCarrier.toLowerCase()),
      );
    }
    if (filterDepartureDate) {
      filtered = filtered.filter((o) => {
        if (!o.departureDate) return false;
        return o.departureDate.split("T")[0] === filterDepartureDate;
      });
    }
    if (filterArrivalDate) {
      filtered = filtered.filter((o) => {
        if (!o.arrivalDate) return false;
        return o.arrivalDate.split("T")[0] === filterArrivalDate;
      });
    }
    if (filterFlow.trim()) {
      filtered = filtered.filter((o) => String(o.operationFlow) === filterFlow);
    }

    setDisplayedOrders(filtered);
    setShowingFiltered(true);
  };

  /* ── Accordion ────────────────────────────── */
  const toggleAccordion = (orderId: number) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setEmbedQuery(null);
    } else {
      setExpandedOrderId(orderId);
      const order = displayedOrders.find((o) => o.id === orderId);
      setEmbedQuery(
        order?.waybillNumber || order?.trackingNumber || order?.number || null,
      );
    }
  };

  /* ── Floating label input helper ──────────── */
  const FloatingInput = ({
    label,
    value,
    onChange,
    isFocused,
    onFocus,
    onBlur,
    type = "text",
    width = "140px",
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    isFocused: boolean;
    onFocus: () => void;
    onBlur: () => void;
    type?: string;
    width?: string;
  }) => (
    <div style={{ position: "relative", display: "inline-block" }}>
      <label
        style={{
          position: "absolute",
          top: value || isFocused ? "2px" : "8px",
          left: "8px",
          fontSize: value || isFocused ? "10px" : "12px",
          fontWeight: "bold",
          fontFamily:
            '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: "#666",
          transition: "all 0.2s ease",
          pointerEvents: "none",
          backgroundColor: "#fff",
          padding: "0 2px",
          zIndex: 1,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder=""
        style={{
          width,
          height: "32px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "12px 8px 4px 8px",
          fontSize: "12px",
          fontFamily:
            '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          backgroundColor: "#fff",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );

  /* ────────────────────────────────────────────
     RENDER
     ──────────────────────────────────────────── */

  return (
    <div className="sov-container">
      {/* ShipsGo Map Embed */}
      <div className="sov-map-wrapper">
        <iframe
          src={`https://embed.shipsgo.com/?token=${import.meta.env.VITE_SHIPSGO_EMBED_TOKEN}${embedQuery ? `&query=${embedQuery}` : ""}`}
          width="100%"
          height="450"
          frameBorder="0"
          title="ShipsGo Tracking"
        />
      </div>

      {/* Toolbar */}
      <div
        className="sov-toolbar"
        style={{ display: "flex", alignItems: "center", gap: "16px" }}
      >
        <div
          className="sov-toolbar__left"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <form
            onSubmit={handleApplyFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <FloatingInput
              label="Número"
              value={filterNumber}
              onChange={setFilterNumber}
              isFocused={isNumberFocused}
              onFocus={() => setIsNumberFocused(true)}
              onBlur={() => setIsNumberFocused(false)}
            />
            <FloatingInput
              label="Ref. Cliente"
              value={filterReference}
              onChange={setFilterReference}
              isFocused={isReferenceFocused}
              onFocus={() => setIsReferenceFocused(true)}
              onBlur={() => setIsReferenceFocused(false)}
              width="120px"
            />
            <FloatingInput
              label="Carrier"
              value={filterCarrier}
              onChange={setFilterCarrier}
              isFocused={isCarrierFocused}
              onFocus={() => setIsCarrierFocused(true)}
              onBlur={() => setIsCarrierFocused(false)}
              width="120px"
            />
            <FloatingInput
              label="Fecha Salida"
              value={filterDepartureDate}
              onChange={setFilterDepartureDate}
              isFocused={isDepartureFocused}
              onFocus={() => setIsDepartureFocused(true)}
              onBlur={() => setIsDepartureFocused(false)}
              type="date"
              width="120px"
            />
            <FloatingInput
              label="Fecha Llegada"
              value={filterArrivalDate}
              onChange={setFilterArrivalDate}
              isFocused={isArrivalFocused}
              onFocus={() => setIsArrivalFocused(true)}
              onBlur={() => setIsArrivalFocused(false)}
              type="date"
              width="120px"
            />
            <div style={{ position: "relative", display: "inline-block" }}>
              <label
                style={{
                  position: "absolute",
                  top: filterFlow || isFlowFocused ? "2px" : "8px",
                  left: "8px",
                  fontSize: filterFlow || isFlowFocused ? "10px" : "12px",
                  fontWeight: "bold",
                  fontFamily:
                    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  color: "#666",
                  transition: "all 0.2s ease",
                  pointerEvents: "none",
                  backgroundColor: "#fff",
                  padding: "0 2px",
                  zIndex: 1,
                }}
              >
                Flujo
              </label>
              <select
                value={filterFlow}
                onChange={(e) => setFilterFlow(e.target.value)}
                onFocus={() => setIsFlowFocused(true)}
                onBlur={() => setIsFlowFocused(false)}
                style={{
                  width: "100px",
                  height: "32px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  fontFamily:
                    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  backgroundColor: "#fff",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              >
                <option value="">Todos</option>
                <option value="1">Export</option>
                <option value="2">Import</option>
                <option value="3">Transit</option>
              </select>
            </div>
            <button
              type="submit"
              style={{
                height: "32px",
                padding: "0 12px",
                fontSize: "12px",
                borderRadius: "4px",
                border: "none",
                fontFamily:
                  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                backgroundColor: "var(--primary-color)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={clearFilters}
              style={{
                height: "32px",
                padding: "0 12px",
                fontSize: "12px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontFamily:
                  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                backgroundColor: "#fff",
                color: "#666",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </form>
        </div>

        <div
          className="sov-toolbar__right"
          style={{ marginLeft: "auto", display: "flex", gap: "8px" }}
        >
          <button
            onClick={refreshOrders}
            style={{
              backgroundColor: "var(--primary-color)",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "0 12px",
              height: "32px",
              fontSize: "12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
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
          {showingFiltered && (
            <button
              className="sov-btn sov-btn--ghost sov-btn--sm"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="sov-empty">
          <div className="sov-spinner" />
          <p className="sov-empty__subtitle">Cargando shipping orders...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="sov-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Table */}
      {!loading && displayedOrders.length > 0 && (
        <div className="sov-table-wrapper">
          <div className="sov-table-scroll">
            <table className="sov-table">
              <thead>
                <tr>
                  <th className="sov-th">Número</th>
                  <th className="sov-th">Ref. Cliente</th>
                  <th className="sov-th asv-th--center">Flujo</th>
                  <th className="sov-th">Carrier</th>
                  <th className="sov-th sov-th--center">Fecha Salida</th>
                  <th className="sov-th sov-th--center">Fecha Llegada</th>
                  <th className="sov-th sov-th--center">Piezas</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className={`sov-tr ${isExpanded ? "sov-tr--active" : ""}`}
                        onClick={() => toggleAccordion(order.id)}
                      >
                        <td className="sov-td sov-td--number">
                          <svg
                            className={`sov-row-chevron ${isExpanded ? "sov-row-chevron--open" : ""}`}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          {order.number}
                        </td>
                        <td className="sov-td">
                          {order.customerReference || "-"}
                        </td>
                        <td className="sov-td sov-td--center">
                          <span
                            className={`sov-badge ${getOperationFlowBadgeClass(order.operationFlow)}`}
                          >
                            {getOperationFlowLabel(order.operationFlow)}
                          </span>
                        </td>
                        <td className="sov-td">{order.carrier?.name || "-"}</td>
                        <td className="sov-td sov-td--center">
                          {formatISODateShort(order.departureDate)}
                        </td>
                        <td className="sov-td sov-td--center">
                          {formatISODateShort(order.arrivalDate)}
                        </td>
                        <td className="sov-td sov-td--center">
                          {order.totalCargo?.pieces ?? "-"}
                        </td>
                      </tr>

                      {/* Accordion content */}
                      {isExpanded && (
                        <tr className="sov-accordion-row">
                          <td colSpan={7} className="sov-accordion-cell">
                            <div className="sov-accordion-content">
                              {/* Route summary card */}
                              <div className="sov-route-card">
                                <div className="sov-route-card__point">
                                  <span className="sov-route-card__label">
                                    Origen
                                  </span>
                                  <span className="sov-route-card__value">
                                    {order.executedAt
                                      ? `${order.executedAt.name} (${order.executedAt.code})`
                                      : order.shipper?.name || "-"}
                                  </span>
                                  {order.departureDate && (
                                    <span className="sov-route-card__date">
                                      {formatISODate(order.departureDate)}
                                    </span>
                                  )}
                                </div>
                                <div className="sov-route-card__arrow">
                                  <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--primary-color)"
                                    strokeWidth="2"
                                  >
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                  </svg>
                                  {order.carrier?.name && (
                                    <span className="sov-route-card__transit">
                                      {order.carrier.name}
                                    </span>
                                  )}
                                </div>
                                <div className="sov-route-card__point sov-route-card__point--end">
                                  <span className="sov-route-card__label">
                                    Destino
                                  </span>
                                  {/*<span className="sov-route-card__value">
                                    {order.consignee?.name || "-"}
                                  </span>*/}
                                  {order.arrivalDate && (
                                    <span className="sov-route-card__date">
                                      {formatISODate(order.arrivalDate)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tabs */}
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
                                        <line x1="12" y1="16" x2="12" y2="12" />
                                        <line
                                          x1="12"
                                          y1="8"
                                          x2="12.01"
                                          y2="8"
                                        />
                                      </svg>
                                    ),
                                    content: (
                                      <div className="sov-cards-grid">
                                        <div className="sov-card">
                                          <h4>Detalles de la Orden</h4>
                                          <div className="sov-info-grid">
                                            <InfoField
                                              label="Número de Orden"
                                              value={order.number}
                                            />
                                            <InfoField
                                              label="Referencia Cliente"
                                              value={order.customerReference}
                                            />
                                            <InfoField
                                              label="Ref. Adicional"
                                              value={
                                                order.additionalCustomerReference
                                              }
                                            />
                                            <InfoField
                                              label="Waybill"
                                              value={order.waybillNumber}
                                            />
                                            <InfoField
                                              label="Booking"
                                              value={order.bookingNumber}
                                            />
                                            <InfoField
                                              label="Tracking Number"
                                              value={order.trackingNumber}
                                            />
                                            <InfoField
                                              label="Flujo de Operación"
                                              value={getOperationFlowLabel(
                                                order.operationFlow,
                                              )}
                                            />
                                            <InfoField
                                              label="Modo de Transporte"
                                              value={order.modeOfTransportation}
                                            />
                                            <InfoField
                                              label="Fecha de Orden"
                                              value={formatISODate(
                                                order.orderDate,
                                              )}
                                            />
                                            <InfoField
                                              label="Ejecutado en"
                                              value={
                                                order.executedAt
                                                  ? `${order.executedAt.name} (${order.executedAt.code})`
                                                  : null
                                              }
                                            />
                                            <InfoField
                                              label="Fecha de Ejecución"
                                              value={formatISODate(
                                                order.executedOnDate,
                                              )}
                                            />
                                          </div>
                                        </div>

                                        <div className="sov-card">
                                          <h4>Fechas Clave</h4>
                                          <div className="sov-info-grid">
                                            <InfoField
                                              label="Fecha de Salida"
                                              value={formatISODate(
                                                order.departureDate,
                                              )}
                                            />
                                            <InfoField
                                              label="Fecha de Llegada"
                                              value={formatISODate(
                                                order.arrivalDate,
                                              )}
                                            />
                                            <InfoField
                                              label="Cut-Off Carga"
                                              value={formatISODate(
                                                order.cutOffDate,
                                              )}
                                            />
                                            <InfoField
                                              label="Cut-Off Documentos"
                                              value={formatISODate(
                                                order.cutOffDocsDate,
                                              )}
                                            />
                                            <InfoField
                                              label="Spotting Date"
                                              value={formatISODate(
                                                order.spottingDate,
                                              )}
                                            />
                                            <InfoField
                                              label="Factura Comercial"
                                              value={formatISODate(
                                                order.commercialInvoiceDate,
                                              )}
                                            />
                                          </div>
                                        </div>

                                        <div className="sov-card">
                                          <h4>Carga</h4>
                                          <div className="sov-info-grid">
                                            <InfoField
                                              label="Piezas"
                                              value={
                                                order.totalCargo?.pieces
                                                  ? order.totalCargo.pieces
                                                  : null
                                              }
                                            />
                                            <InfoField
                                              label="Contenedores"
                                              value={
                                                order.totalCargo?.containers
                                                  ? order.totalCargo.containers
                                                  : null
                                              }
                                            />
                                            <InfoField
                                              label="Peso"
                                              value={
                                                order.totalCargo?.weight
                                                  ?.userDisplay ||
                                                formatWeight(
                                                  order.totalCargo?.weightValue,
                                                  order.totalCargo?.weightUOM,
                                                )
                                              }
                                            />
                                            <InfoField
                                              label="Volumen"
                                              value={
                                                order.totalCargo?.volume
                                                  ?.userDisplay ||
                                                formatVolume(
                                                  order.totalCargo?.volumeValue,
                                                  order.totalCargo?.volumeUOM,
                                                )
                                              }
                                            />
                                            <InfoField
                                              label="Peso Volumétrico"
                                              value={
                                                order.totalCargo?.volumeWeight
                                                  ?.userDisplay ||
                                                formatWeight(
                                                  order.totalCargo
                                                    ?.volumeWeightValue,
                                                  order.totalCargo
                                                    ?.volumeWeightUOM,
                                                )
                                              }
                                            />
                                            <InfoField
                                              label="Valor Declarado"
                                              value={
                                                order.totalCargo?.declaredValue
                                                  ? `$${order.totalCargo.declaredValue.toLocaleString("es-CL")}`
                                                  : null
                                              }
                                            />
                                            <InfoField
                                              label="Cargos de Envío"
                                              value={
                                                order.shippingCharges
                                                  ? `$${order.shippingCharges.toLocaleString("es-CL")}`
                                                  : null
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ),
                                  },
                                  {
                                    key: "parties",
                                    label: "Partes Involucradas",
                                    icon: (
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                      </svg>
                                    ),
                                    content: (
                                      <div
                                        className="sov-cards-grid"
                                        style={{
                                          gridTemplateColumns: "repeat(2, 1fr)",
                                        }}
                                      >
                                        <div className="sov-card">
                                          <h4>Shipper (Embarcador)</h4>
                                          <AddressBlock
                                            label="Shipper"
                                            entity={order.shipper}
                                            address={order.shipperAddress}
                                          />
                                        </div>

                                        <div className="sov-card">
                                          <h4>Consignee (Consignatario)</h4>
                                          <AddressBlock
                                            label="Consignee"
                                            entity={order.consignee}
                                            address={order.consigneeAddress}
                                          />
                                        </div>

                                        <div className="sov-card">
                                          <h4>Carrier (Transportista)</h4>
                                          <AddressBlock
                                            label="Carrier"
                                            entity={order.carrier}
                                            address={null}
                                          />
                                          {order.carrier?.code && (
                                            <InfoField
                                              label="Código Carrier"
                                              value={order.carrier.code}
                                            />
                                          )}
                                        </div>

                                        <div className="sov-card">
                                          <h4>Notify Party</h4>
                                          <AddressBlock
                                            label="Notify Party"
                                            entity={order.notifyParty}
                                            address={order.notifyPartyAddress}
                                          />
                                        </div>

                                        {(order.forwardingAgent ||
                                          order.forwardingAgentAddress) && (
                                          <div className="sov-card">
                                            <h4>Agente de Carga</h4>
                                            <AddressBlock
                                              label="Forwarding Agent"
                                              entity={order.forwardingAgent}
                                              address={
                                                order.forwardingAgentAddress
                                              }
                                            />
                                          </div>
                                        )}

                                        {(order.destinationAgent ||
                                          order.destinationAgentAddress) && (
                                          <div className="sov-card">
                                            <h4>Agente de Destino</h4>
                                            <AddressBlock
                                              label="Destination Agent"
                                              entity={order.destinationAgent}
                                              address={
                                                order.destinationAgentAddress
                                              }
                                            />
                                          </div>
                                        )}

                                        {(order.intermediateConsignee ||
                                          order.intermediateConsigneeAddress) && (
                                          <div className="sov-card">
                                            <h4>Consignatario Intermedio</h4>
                                            <AddressBlock
                                              label="Intermediate Consignee"
                                              entity={
                                                order.intermediateConsignee
                                              }
                                              address={
                                                order.intermediateConsigneeAddress
                                              }
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  },
                                  {
                                    key: "delivery",
                                    label: "Entrega (POD)",
                                    icon: (
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                      </svg>
                                    ),
                                    hidden:
                                      !order.podDeliveryDate &&
                                      !order.podReceivedBy &&
                                      !order.podNotes,
                                    content: (
                                      <div
                                        className="sov-cards-grid"
                                        style={{ gridTemplateColumns: "1fr" }}
                                      >
                                        <div className="sov-card">
                                          <h4>Prueba de Entrega (POD)</h4>
                                          <div className="sov-info-grid">
                                            <InfoField
                                              label="Fecha de Entrega"
                                              value={formatISODate(
                                                order.podDeliveryDate,
                                              )}
                                            />
                                            <InfoField
                                              label="Recibido Por"
                                              value={order.podReceivedBy}
                                            />
                                            <InfoField
                                              label="Notas de Entrega"
                                              value={order.podNotes}
                                              fullWidth
                                            />
                                          </div>
                                        </div>
                                      </div>
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
                                    hidden:
                                      !order.notes &&
                                      !order.commercialInvoiceNotes &&
                                      !order.packingListNotes &&
                                      !order.reasonExport,
                                    content: (
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 12,
                                        }}
                                      >
                                        {order.notes && (
                                          <div>
                                            <div
                                              style={{
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                color: "#6b7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                                marginBottom: 4,
                                              }}
                                            >
                                              Notas Generales
                                            </div>
                                            <div className="sov-notes">
                                              {order.notes}
                                            </div>
                                          </div>
                                        )}
                                        {order.commercialInvoiceNotes && (
                                          <div>
                                            <div
                                              style={{
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                color: "#6b7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                                marginBottom: 4,
                                              }}
                                            >
                                              Notas Factura Comercial
                                            </div>
                                            <div className="sov-notes">
                                              {order.commercialInvoiceNotes}
                                            </div>
                                          </div>
                                        )}
                                        {order.packingListNotes && (
                                          <div>
                                            <div
                                              style={{
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                color: "#6b7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                                marginBottom: 4,
                                              }}
                                            >
                                              Notas Packing List
                                            </div>
                                            <div className="sov-notes">
                                              {order.packingListNotes}
                                            </div>
                                          </div>
                                        )}
                                        {order.reasonExport && (
                                          <div>
                                            <div
                                              style={{
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                color: "#6b7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                                marginBottom: 4,
                                              }}
                                            >
                                              Razón de Exportación
                                            </div>
                                            <div className="sov-notes">
                                              {order.reasonExport}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  },
                                ]}
                              />
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
          <div className="sov-table-footer">
            <div className="sov-table-footer__left" />
            <div className="sov-table-footer__right">
              <span className="sov-pagination-label">Filas por página:</span>
              <select
                className="sov-pagination-select"
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
              <span className="sov-pagination-range">
                {paginationRangeText}
              </span>
              <button
                className="sov-pagination-btn"
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
                className="sov-pagination-btn"
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

      {/* Empty — no search results */}
      {displayedOrders.length === 0 &&
        !loading &&
        allOrders.length > 0 &&
        showingFiltered && (
          <div className="sov-empty">
            <p className="sov-empty__title">
              No se encontraron shipping orders
            </p>
            <p className="sov-empty__subtitle">
              No hay shipping orders que coincidan con tu búsqueda
            </p>
            <button
              className="sov-btn sov-btn--primary"
              onClick={clearFilters}
              style={{ marginTop: 12 }}
            >
              Ver todas las shipping orders
            </button>
          </div>
        )}

      {/* Empty — no orders at all */}
      {allOrders.length === 0 && !loading && !error && (
        <div className="sov-empty">
          <p className="sov-empty__title">No hay shipping orders disponibles</p>
          <p className="sov-empty__subtitle">
            No se encontraron shipping orders para tu cuenta
          </p>
        </div>
      )}
    </div>
  );
}

export default ShippingOrderView;
