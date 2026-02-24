import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  type OceanShipment,
  type OutletContext,
  type Quote,
  InfoField,
  QuoteModal,
} from "../shipments/Handlers/Handleroceanshipments";
import { MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS } from "./Handlers/mundogamingDummyOceanData";
import { DocumentosSectionOcean } from "../Sidebar/Documents/DocumentosSectionOcean";
import "./OceanShipmentsView.css";

const DEFAULT_ROWS_PER_PAGE = 10;

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
  const current = visibleTabs.find((t) => t.key === activeTab);

  return (
    <div className="osv-tabs">
      <div className="osv-tabs__nav">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`osv-tabs__btn ${activeTab === tab.key ? "osv-tabs__btn--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(tab.key);
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

/* ===========================================================
   MAIN COMPONENT
   =========================================================== */
function OceanShipmentsView() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, activeUsername } = useAuth();
  const filterConsignee = activeUsername || "";

  const [oceanShipments, setOceanShipments] = useState<OceanShipment[]>([]);
  const [displayedOceanShipments, setDisplayedOceanShipments] = useState<
    OceanShipment[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion - single expanded
  const [expandedShipmentId, setExpandedShipmentId] = useState<
    string | number | null
  >(null);

  // Search modal
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Quote modal
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

  // Embed
  const [embedQuery, setEmbedQuery] = useState<string | null>(null);

  // Search fields
  const [searchDate, setSearchDate] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchNumber, setSearchNumber] = useState("");
  const [showingAll, setShowingAll] = useState(false);

  // Advanced toolbar filters (replicated from AirShipmentsView)
  const [filterNumber, setFilterNumber] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [filterDepartureDate, setFilterDepartureDate] = useState("");
  const [filterVessel, setFilterVessel] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPieces, setFilterPieces] = useState("");

  // Focus states for floating labels (optional)
  const [isNumberFocused, setIsNumberFocused] = useState(false);
  const [isOriginFocused, setIsOriginFocused] = useState(false);
  const [isDestinationFocused, setIsDestinationFocused] = useState(false);
  const [isDepartureFocused, setIsDepartureFocused] = useState(false);
  const [isVesselFocused, setIsVesselFocused] = useState(false);
  const [isTypeFocused, setIsTypeFocused] = useState(false);
  const [isPiecesFocused, setIsPiecesFocused] = useState(false);

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

  /* -- Quote fetch ------------------------------------------- */
  const fetchQuoteByNumber = async (quoteNumber: string) => {
    if (!accessToken) return;
    setLoadingQuote(true);
    try {
      const response = await fetch("https://api.linbis.com/Quotes", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      const quotesArray: Quote[] = Array.isArray(data) ? data : [];
      const found = quotesArray.find((q) => q.number === quoteNumber);
      if (found) {
        setSelectedQuote(found);
        setShowQuoteModal(true);
      } else {
        alert(`No se encontro la cotizacion ${quoteNumber}`);
      }
    } catch (err) {
      console.error("Error al cargar cotizacion:", err);
      alert("Error al cargar la cotizacion");
    } finally {
      setLoadingQuote(false);
    }
  };

  /* -- API --------------------------------------------------- */
  const fetchOceanShipments = async () => {
    if (!accessToken) {
      setError("Debes ingresar un token primero");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "https://api.linbis.com/ocean-shipments/all",
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
          throw new Error("Token invalido o expirado.");
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const arr: OceanShipment[] = Array.isArray(data) ? data : [];
      const filtered = arr.filter((os) => os.consignee === filterConsignee);
      const sorted = filtered.sort((a, b) => {
        const da = a.departure ? new Date(a.departure) : new Date(0);
        const db = b.departure ? new Date(b.departure) : new Date(0);
        return db.getTime() - da.getTime();
      });

      setOceanShipments(sorted);
      localStorage.setItem("oceanShipmentsCache", JSON.stringify(sorted));
      localStorage.setItem(
        "oceanShipmentsCacheTimestamp",
        new Date().getTime().toString(),
      );
      setDisplayedOceanShipments(sorted);
      setShowingAll(false);
      setTablePage(1);

      console.log(
        `${arr.length} ocean shipments totales, ${filtered.length} del consignee`,
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
  }, [displayedOceanShipments, rowsPerPage]);
  useEffect(() => {
    if (!accessToken) return;

    // ── Cuenta dummy MundoGaming: carga datos hardcodeados ──
    if (filterConsignee === "MundoGaming") {
      const dummySorted = [...MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS].sort(
        (a, b) => {
          const da = a.departure ? new Date(a.departure) : new Date(0);
          const db = b.departure ? new Date(b.departure) : new Date(0);
          return db.getTime() - da.getTime();
        },
      );
      setOceanShipments(dummySorted);
      setDisplayedOceanShipments(dummySorted);
      setShowingAll(false);
      setTablePage(1);
      setLoading(false);
      console.log(
        "MundoGaming: cargando datos dummy ocean (",
        dummySorted.length,
        "envíos)",
      );
      return;
    }

    const cached = localStorage.getItem("oceanShipmentsCache");
    const ts = localStorage.getItem("oceanShipmentsCacheTimestamp");

    if (cached && ts) {
      const age = Date.now() - parseInt(ts);
      if (age < 3600000) {
        const parsed: OceanShipment[] = JSON.parse(cached);
        const filtered = parsed.filter(
          (os) => os.consignee === filterConsignee,
        );
        setOceanShipments(filtered);
        setDisplayedOceanShipments(filtered);
        setShowingAll(false);
        setTablePage(1);
        setLoading(false);
        console.log(
          "Cargando desde cache -",
          Math.floor(age / 60000),
          "minutos",
        );
        return;
      }
    }

    fetchOceanShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  /* -- Accordion --------------------------------------------- */
  const toggleAccordion = (shipmentId: string | number) => {
    if (expandedShipmentId === shipmentId) {
      setExpandedShipmentId(null);
      setEmbedQuery(null);
    } else {
      setExpandedShipmentId(shipmentId);
      const s = displayedOceanShipments.find((sh) => {
        const id = sh.id || sh.number;
        return id === shipmentId;
      });
      setEmbedQuery(s?.number || null);
    }
  };

  /* -- Search ------------------------------------------------ */
  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedOceanShipments(oceanShipments);
      setShowingAll(false);
      setTablePage(1);
      return;
    }
    const term = searchNumber.trim().toLowerCase();
    setDisplayedOceanShipments(
      oceanShipments.filter((s) =>
        (s.number || "").toString().toLowerCase().includes(term),
      ),
    );
    setShowingAll(true);
    setTablePage(1);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedOceanShipments(oceanShipments);
      setShowingAll(false);
      setTablePage(1);
      return;
    }
    setDisplayedOceanShipments(
      oceanShipments.filter((s) => {
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
      setDisplayedOceanShipments(oceanShipments);
      setShowingAll(false);
      setTablePage(1);
      return;
    }
    setDisplayedOceanShipments(
      oceanShipments.filter((s) => {
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
    // clear advanced filters as well
    setFilterNumber("");
    setFilterOrigin("");
    setFilterDestination("");
    setFilterDepartureDate("");
    setFilterVessel("");
    setFilterType("");
    setFilterPieces("");
    setDisplayedOceanShipments(oceanShipments);
    setShowingAll(false);
    setTablePage(1);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    let filtered = oceanShipments;
    if (filterNumber.trim()) {
      const term = filterNumber.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.number || "").toString().toLowerCase().includes(term),
      );
    }
    if (filterOrigin.trim()) {
      const term = filterOrigin.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.portOfLoading || "").toLowerCase().includes(term),
      );
    }
    if (filterDestination.trim()) {
      const term = filterDestination.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.portOfUnloading || "").toLowerCase().includes(term),
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
    if (filterVessel.trim()) {
      const term = filterVessel.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.vessel || "").toLowerCase().includes(term),
      );
    }
    if (filterType.trim()) {
      const term = filterType.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.typeOfMove || "").toLowerCase().includes(term),
      );
    }
    if (filterPieces.trim()) {
      const term = filterPieces.trim().toLowerCase();
      filtered = filtered.filter((s) =>
        (s.totalCargo_Pieces ?? "").toString().toLowerCase().includes(term),
      );
    }
    setDisplayedOceanShipments(filtered);
    setShowingAll(true);
    setTablePage(1);
  };

  const refreshShipments = () => {
    // ── Cuenta dummy MundoGaming: reload datos hardcodeados ──
    if (filterConsignee === "MundoGaming") {
      const dummySorted = [...MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS].sort(
        (a, b) => {
          const da = a.departure ? new Date(a.departure) : new Date(0);
          const db = b.departure ? new Date(b.departure) : new Date(0);
          return db.getTime() - da.getTime();
        },
      );
      setOceanShipments(dummySorted);
      setDisplayedOceanShipments(dummySorted);
      setShowingAll(false);
      setTablePage(1);
      console.log("MundoGaming: datos dummy ocean recargados");
      return;
    }

    localStorage.removeItem("oceanShipmentsCache");
    localStorage.removeItem("oceanShipmentsCacheTimestamp");
    setOceanShipments([]);
    setDisplayedOceanShipments([]);
    setTablePage(1);
    fetchOceanShipments();
  };

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <div className="osv-container">
      {/* ShipsGo Map Embed */}
      <div className="osv-map-wrapper">
        <iframe
          id="shipsgo-embed"
          src={`https://embed.shipsgo.com/?token=${import.meta.env.VITE_SHIPSGO_EMBED_TOKEN}${embedQuery ? `&transport=ocean&query=${embedQuery}` : ""}`}
          width="100%"
          height="450"
          frameBorder="0"
          title="ShipsGo Ocean Tracking"
        />
      </div>

      {/* Toolbar (advanced search) */}
      <div
        className="osv-toolbar"
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <form
          className="filters-form"
          onSubmit={handleApplyFilters}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            <label
              style={{
                position: "absolute",
                top: filterNumber || isNumberFocused ? "2px" : "8px",
                left: "8px",
                fontSize: filterNumber || isNumberFocused ? "10px" : "12px",
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
              className="osv-input"
              type="text"
              value={filterNumber}
              onChange={(e) => setFilterNumber(e.target.value)}
              onFocus={() => setIsNumberFocused(true)}
              onBlur={() => setIsNumberFocused(false)}
              placeholder=""
              style={{ width: 140, height: 32 }}
            />
          </div>

          <div style={{ position: "relative", display: "inline-block" }}>
            <label
              style={{
                position: "absolute",
                top: filterOrigin || isOriginFocused ? "2px" : "8px",
                left: "8px",
                fontSize: filterOrigin || isOriginFocused ? "10px" : "12px",
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
              className="osv-input"
              type="text"
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              onFocus={() => setIsOriginFocused(true)}
              onBlur={() => setIsOriginFocused(false)}
              placeholder=""
              style={{ width: 140, height: 32 }}
            />
          </div>

          <div style={{ position: "relative", display: "inline-block" }}>
            <label
              style={{
                position: "absolute",
                top: filterDestination || isDestinationFocused ? "2px" : "8px",
                left: "8px",
                fontSize:
                  filterDestination || isDestinationFocused ? "10px" : "12px",
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
              className="osv-input"
              type="text"
              value={filterDestination}
              onChange={(e) => setFilterDestination(e.target.value)}
              onFocus={() => setIsDestinationFocused(true)}
              onBlur={() => setIsDestinationFocused(false)}
              placeholder=""
              style={{ width: 140, height: 32 }}
            />
          </div>

          <div style={{ position: "relative", display: "inline-block" }}>
            <label
              style={{
                position: "absolute",
                top: filterDepartureDate || isDepartureFocused ? "2px" : "8px",
                left: "8px",
                fontSize:
                  filterDepartureDate || isDepartureFocused ? "10px" : "12px",
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
              placeholder=""
              style={{ width: 140, height: 32 }}
            />
          </div>

          <div style={{ position: "relative", display: "inline-block" }}>
            <label
              style={{
                position: "absolute",
                top: filterVessel || isVesselFocused ? "2px" : "8px",
                left: "8px",
                fontSize: filterVessel || isVesselFocused ? "10px" : "12px",
                fontWeight: "bold",
                color: "#666",
                transition: "all 0.2s ease",
                pointerEvents: "none",
                backgroundColor: "#fff",
                padding: "0 2px",
                zIndex: 1,
              }}
            >
              Vessel
            </label>
            <input
              className="osv-input"
              type="text"
              value={filterVessel}
              onChange={(e) => setFilterVessel(e.target.value)}
              onFocus={() => setIsVesselFocused(true)}
              onBlur={() => setIsVesselFocused(false)}
              placeholder=""
              style={{ width: 120, height: 32 }}
            />
          </div>

          <div style={{ position: "relative", display: "inline-block" }}>
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
              className="osv-input"
              type="text"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              onFocus={() => setIsTypeFocused(true)}
              onBlur={() => setIsTypeFocused(false)}
              placeholder=""
              style={{ width: 100, height: 32 }}
            />
          </div>

          <div style={{ position: "relative", display: "inline-block" }}>
            <label
              style={{
                position: "absolute",
                top: filterPieces || isPiecesFocused ? "2px" : "8px",
                left: "8px",
                fontSize: filterPieces || isPiecesFocused ? "10px" : "12px",
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
              className="osv-input"
              type="text"
              value={filterPieces}
              onChange={(e) => setFilterPieces(e.target.value)}
              onFocus={() => setIsPiecesFocused(true)}
              onBlur={() => setIsPiecesFocused(false)}
              placeholder=""
              style={{ width: 80, height: 32 }}
            />
          </div>

          <button
            className="osv-btn"
            type="submit"
            style={{ color: "white", backgroundColor: "var(--primary-color)" }}
          >
            Aplicar
          </button>
          <button
            className="osv-btn osv-btn--ghost"
            type="button"
            onClick={clearSearch}
            style={{ height: 32 }}
          >
            Limpiar
          </button>
        </form>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            className="osv-btn"
            style={{ color: "white", backgroundColor: "var(--primary-color)" }}
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
          {loadingQuote && (
            <span className="osv-loading-text">Cargando...</span>
          )}
        </div>
      </div>

      {/* Search modal */}
      {showSearchModal && (
        <div className="osv-overlay" onClick={() => setShowSearchModal(false)}>
          <div
            className="osv-modal osv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="osv-modal__title">Buscar Ocean Shipments</h5>

            <div className="osv-search-section">
              <label className="osv-label">Por Numero</label>
              <input
                className="osv-input"
                type="text"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Numero del shipment"
              />
              <button
                className="osv-btn osv-btn--primary osv-btn--full"
                onClick={handleSearchByNumber}
              >
                Buscar
              </button>
            </div>

            <div className="osv-search-section">
              <label className="osv-label">Por Fecha Exacta</label>
              <input
                className="osv-input"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <button
                className="osv-btn osv-btn--primary osv-btn--full"
                onClick={handleSearchByDate}
              >
                Buscar
              </button>
            </div>

            <div className="osv-search-section">
              <label className="osv-label">Por Rango de Fechas</label>
              <div className="osv-search-row">
                <div style={{ flex: 1 }}>
                  <span className="osv-label osv-label--small">Desde</span>
                  <input
                    className="osv-input"
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="osv-label osv-label--small">Hasta</span>
                  <input
                    className="osv-input"
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="osv-btn osv-btn--primary osv-btn--full"
                onClick={handleSearchByDateRange}
              >
                Buscar
              </button>
            </div>

            <button
              className="osv-btn osv-btn--ghost osv-btn--full"
              onClick={() => setShowSearchModal(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="osv-empty">
          <div className="osv-spinner" />
          <p>Cargando ocean shipments...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="osv-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* =====================================================
          TABLE
         ===================================================== */}
      {!loading && displayedOceanShipments.length > 0 && (
        <div className="osv-table-wrapper">
          <div className="osv-table-scroll">
            <table className="osv-table">
              <thead>
                <tr>
                  <th className="osv-th">Numero</th>
                  <th className="osv-th">Origen</th>
                  <th className="osv-th">Destino</th>
                  <th className="osv-th">Fecha Salida</th>
                  <th className="osv-th">Vessel</th>
                  <th className="osv-th osv-th--center">Tipo</th>
                  <th className="osv-th osv-th--center">Piezas</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShipments.map((shipment, index) => {
                  const shipmentId = shipment.id || shipment.number || index;
                  const isExpanded = expandedShipmentId === shipmentId;

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
                          {shipment.quoteNumber && (
                            <span
                              className="osv-quote-badge"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchQuoteByNumber(shipment.quoteNumber!);
                              }}
                            >
                              {shipment.quoteNumber}
                            </span>
                          )}
                        </td>
                        <td className="osv-td">
                          {shipment.portOfLoading || "---"}
                        </td>
                        <td className="osv-td">
                          {shipment.portOfUnloading || "---"}
                        </td>
                        <td className="osv-td">
                          {formatDateShort(shipment.departure)}
                        </td>
                        <td className="osv-td">{shipment.vessel || "-"}</td>
                        <td className="osv-td osv-td--center">
                          {shipment.typeOfMove ? (
                            <span
                              className={`osv-badge osv-badge--${shipment.typeOfMove.toLowerCase()}`}
                            >
                              {shipment.typeOfMove}
                            </span>
                          ) : (
                            "---"
                          )}
                        </td>
                        <td className="osv-td osv-td--center">
                          {shipment.totalCargo_Pieces ?? "---"}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="osv-accordion-row">
                          <td colSpan={6} className="osv-accordion-cell">
                            <div className="osv-accordion-content">
                              {/* Route summary card */}
                              <div className="osv-route-card">
                                <div className="osv-route-card__point">
                                  <span className="osv-route-card__label">
                                    Puerto de Carga
                                  </span>
                                  <span className="osv-route-card__value">
                                    {shipment.portOfLoading || "N/A"}
                                  </span>
                                  {shipment.departure && (
                                    <span className="osv-route-card__date">
                                      {formatDateShort(shipment.departure)}
                                    </span>
                                  )}
                                </div>
                                <div className="osv-route-card__arrow">
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
                                  {shipment.vessel && (
                                    <span className="osv-route-card__transit">
                                      {shipment.vessel}
                                    </span>
                                  )}
                                </div>
                                <div className="osv-route-card__point osv-route-card__point--end">
                                  <span className="osv-route-card__label">
                                    Puerto de Descarga
                                  </span>
                                  <span className="osv-route-card__value">
                                    {shipment.portOfUnloading || "N/A"}
                                  </span>
                                  {shipment.arrival && (
                                    <span className="osv-route-card__date">
                                      {formatDateShort(shipment.arrival)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tabs */}
                              <DetailTabs
                                tabs={[
                                  {
                                    key: "general",
                                    label: "Informacion General",
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
                                      <div className="asv-cards-grid">
                                        <div className="asv-card">
                                          <h4>Detalles del Envío</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Numero de Envio"
                                              value={shipment.number}
                                            />
                                            <InfoField
                                              label="Tipo de Operacion"
                                              value={shipment.operationFlow}
                                            />
                                            <InfoField
                                              label="Tipo de Envio"
                                              value={shipment.shipmentType}
                                            />
                                            <InfoField
                                              label="Tipo de Movimiento"
                                              value={shipment.typeOfMove}
                                            />
                                          </div>
                                        </div>
                                        <div className="asv-card">
                                          <h4>Logistica Maritima</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Vessel"
                                              value={shipment.vessel}
                                            />
                                            <InfoField
                                              label="Voyage"
                                              value={shipment.voyage}
                                            />
                                            <InfoField
                                              label="Carrier"
                                              value={shipment.carrier}
                                            />
                                            <InfoField
                                              label="Puerto de Carga"
                                              value={shipment.portOfLoading}
                                            />
                                            <InfoField
                                              label="Puerto de Descarga"
                                              value={shipment.portOfUnloading}
                                            />
                                            <InfoField
                                              label="Lugar de Entrega"
                                              value={shipment.placeOfDelivery}
                                            />
                                            <InfoField
                                              label="Destino Final"
                                              value={shipment.finalDestination}
                                            />
                                          </div>
                                        </div>
                                        <div className="asv-card">
                                          <h4>Documentos y Referencias</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Booking Number"
                                              value={shipment.bookingNumber}
                                            />
                                            <InfoField
                                              label="BL Number"
                                              value={shipment.waybillNumber}
                                            />
                                            <InfoField
                                              label="Forwarded BL"
                                              value={shipment.fowaredBl}
                                            />
                                            <InfoField
                                              label="Numero de Contenedor"
                                              value={shipment.containerNumber}
                                            />
                                            <InfoField
                                              label="Referencia Cliente"
                                              value={shipment.customerReference}
                                            />
                                            <InfoField
                                              label="Representante Ventas"
                                              value={shipment.salesRep}
                                            />
                                          </div>
                                        </div>
                                        <div className="asv-card">
                                          <h4>Fechas</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Fecha de Creación"
                                              value={
                                                shipment.createdOn
                                                  ? formatDate(
                                                      shipment.createdOn,
                                                    )
                                                  : null
                                              }
                                            />
                                            <InfoField
                                              label="Fecha Salida"
                                              value={
                                                shipment.departure
                                                  ? formatDate(
                                                      shipment.departure,
                                                    )
                                                  : null
                                              }
                                            />
                                            <InfoField
                                              label="Fecha Llegada"
                                              value={
                                                shipment.arrival
                                                  ? formatDate(shipment.arrival)
                                                  : null
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ),
                                  },
                                  {
                                    key: "cargo",
                                    label: "Información de Carga",
                                    icon: (
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <rect
                                          x="1"
                                          y="3"
                                          width="15"
                                          height="13"
                                        />
                                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                        <circle cx="5.5" cy="18.5" r="2.5" />
                                        <circle cx="18.5" cy="18.5" r="2.5" />
                                      </svg>
                                    ),
                                    content: (
                                      <div className="asv-cards-grid">
                                        <div className="asv-card">
                                          <h4>Cantidades</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Total de Piezas"
                                              value={shipment.totalCargo_Pieces}
                                            />
                                            <InfoField
                                              label="Peso Total"
                                              value={
                                                shipment.totalCargo_WeightDisplayValue
                                              }
                                            />
                                            <InfoField
                                              label="Volumen Total"
                                              value={
                                                shipment.totalCargo_VolumeDisplayValue
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className="asv-card">
                                          <h4>Detalle de Carga</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Descripcion de Carga"
                                              value={shipment.cargoDescription}
                                              fullWidth
                                            />
                                            <InfoField
                                              label="Marcas de Carga"
                                              value={shipment.cargoMarks}
                                              fullWidth
                                            />
                                          </div>
                                        </div>
                                        <div className="asv-card">
                                          <h4>Estado y Seguridad</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Estado de Carga"
                                              value={shipment.cargoStatus}
                                            />
                                            <InfoField
                                              label="Carga Peligrosa"
                                              value={
                                                shipment.hazardous ? "Si" : "No"
                                              }
                                            />
                                            <InfoField
                                              label="Containerizado"
                                              value={
                                                shipment.containerized
                                                  ? "Si"
                                                  : "No"
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ),
                                  },
                                  {
                                    key: "documentos",
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
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                      </svg>
                                    ),
                                    content: (
                                      <DocumentosSectionOcean
                                        shipmentId={shipmentId}
                                      />
                                    ),
                                  },
                                  {
                                    key: "financiero",
                                    label: "Financiero",
                                    icon: (
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <line x1="12" y1="1" x2="12" y2="23" />
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                      </svg>
                                    ),
                                    content: (
                                      <div className="osv-finance-card">
                                        <span className="osv-finance-card__label">
                                          Gasto Total (No incluye impuestos)
                                        </span>
                                        <span className="osv-finance-card__amount">
                                          {formatCLP(
                                            shipment.totalCharge_IncomeDisplayValue,
                                          ) || "$0 CLP"}
                                        </span>
                                        <span className="osv-finance-card__note">
                                          Monto estimado para este envio
                                        </span>
                                      </div>
                                    ),
                                  },
                                  {
                                    key: "customs",
                                    label: "Importacion y Aduana",
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
                                      </svg>
                                    ),
                                    hidden: !(
                                      shipment.entryNumber ||
                                      shipment.itNumber ||
                                      shipment.amsNumber ||
                                      shipment.broker
                                    ),
                                    content: (
                                      <div className="osv-info-grid">
                                        <InfoField
                                          label="Entry Number"
                                          value={shipment.entryNumber}
                                        />
                                        <InfoField
                                          label="IT Number"
                                          value={shipment.itNumber}
                                        />
                                        <InfoField
                                          label="AMS Number"
                                          value={shipment.amsNumber}
                                        />
                                        <InfoField
                                          label="Broker"
                                          value={shipment.broker}
                                        />
                                        <InfoField
                                          label="Liberado por Aduana"
                                          value={
                                            shipment.customsReleased
                                              ? "Si"
                                              : "No"
                                          }
                                        />
                                        <InfoField
                                          label="Flete Liberado"
                                          value={
                                            shipment.freightReleased
                                              ? "Si"
                                              : "No"
                                          }
                                        />
                                      </div>
                                    ),
                                  },
                                  {
                                    key: "notas",
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
                                      !shipment.notes ||
                                      shipment.notes === "N/A",
                                    content: (
                                      <div className="osv-notes">
                                        {shipment.notes}
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
          <div className="osv-table-footer">
            <div className="osv-table-footer__left">
              {loading && <span className="osv-loading-text">Cargando...</span>}
            </div>
            <div className="osv-table-footer__right">
              <span className="osv-pagination-label">Filas por pagina:</span>
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

      {/* Quote Modal */}
      {showQuoteModal && (
        <QuoteModal
          quote={selectedQuote}
          onClose={() => {
            setShowQuoteModal(false);
            setSelectedQuote(null);
          }}
        />
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
              No hay ocean shipments que coincidan con tu busqueda
            </p>
            <button className="osv-btn osv-btn--primary" onClick={clearSearch}>
              Limpiar filtros
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
