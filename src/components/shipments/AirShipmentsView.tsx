import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./AirShipmentsView.css";
import { DocumentosSectionAir } from "../Sidebar/Documents/DocumentosSectionAir";
import {
  type OutletContext,
  type AirShipment,
  ShipmentTimeline,
  InfoField,
  CommoditiesSection,
  SubShipmentsList,
} from "../shipments/Handlers/Handlersairshipments";
import { MUNDOGAMING_DUMMY_SHIPMENTS } from "./Handlers/mundogamingDummyData";

const ITEMS_PER_PAGE = 10;

/*  DetailTabs  */
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
    <div className="asv-tabs">
      <div className="asv-tabs__nav">
        {visible.map((tab) => (
          <button
            key={tab.key}
            className={`asv-tabs__btn ${active === tab.key ? "asv-tabs__btn--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActive(tab.key);
            }}
          >
            {tab.icon && <span className="asv-tabs__icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="asv-tabs__panel">{current?.content}</div>
    </div>
  );
}

/* 
   MAIN COMPONENT
    */
function AirShipmentsView() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [shipments, setShipments] = useState<AirShipment[]>([]);
  const [displayedShipments, setDisplayedShipments] = useState<AirShipment[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion  single expanded
  const [expandedShipmentId, setExpandedShipmentId] = useState<
    string | number | null
  >(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreShipments, setHasMoreShipments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [tablePage, setTablePage] = useState(1);

  // Search modal
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackShipment, setTrackShipment] = useState<AirShipment | null>(null);
  const [trackEmail, setTrackEmail] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Embed
  const [embedQuery, setEmbedQuery] = useState<string | null>(null);

  // Filter fields
  const [filterNumber, setFilterNumber] = useState("");
  const [filterWaybill, setFilterWaybill] = useState("");
  const [filterClientReference, setFilterClientReference] = useState("");
  const [filterDepartureDate, setFilterDepartureDate] = useState("");
  const [filterArrivalDate, setFilterArrivalDate] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [showingAll, setShowingAll] = useState(false);

  // Focus states for floating labels
  const [isNumberFocused, setIsNumberFocused] = useState(false);
  const [isWaybillFocused, setIsWaybillFocused] = useState(false);
  const [isClientReferenceFocused, setIsClientReferenceFocused] =
    useState(false);
  const [isDepartureFocused, setIsDepartureFocused] = useState(false);
  const [isArrivalFocused, setIsArrivalFocused] = useState(false);
  const [isCarrierFocused, setIsCarrierFocused] = useState(false);

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

  /*  Helpers  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (dateObj: any) => {
    if (!dateObj?.displayDate || dateObj.displayDate.trim() === "") return "-";
    try {
      const [m, d, y] = dateObj.displayDate.split("/");
      return new Date(+y, +m - 1, +d).toLocaleDateString("es-CL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateObj.displayDate;
    }
  };

  const formatDateInline = (displayDate: string | undefined) => {
    if (!displayDate || displayDate.trim() === "") return "-";
    try {
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

  const isShipmentArrived = (shipment: AirShipment) => {
    if (!shipment.arrival?.displayDate) return false;
    try {
      const [m, d, y] = shipment.arrival.displayDate.split("/");
      return new Date(+y, +m - 1, +d) <= new Date();
    } catch {
      return false;
    }
  };

  const filterShipments = (shipments: AirShipment[]): AirShipment[] => {
    const groups = new Map<string, AirShipment[]>();
    for (const s of shipments) {
      const key = String(s.customerReference || "");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }

    const result: AirShipment[] = [];
    for (const [key, group] of groups) {
      if (group.length > 1) {
        // Excluir los que empiezan con SOG
        result.push(
          ...group.filter(
            (s) =>
              !String(s.number ?? "")
                .toUpperCase()
                .startsWith("SOG"),
          ),
        );
      } else {
        // Incluir el único
        result.push(...group);
      }
    }
    return result;
  };

  /*  API  */
  const fetchAirShipments = async (
    page: number = 1,
    append: boolean = false,
  ) => {
    if (!accessToken) {
      setError("Debes ingresar un token primero");
      return;
    }
    if (!user?.username) {
      setError("No se pudo obtener el nombre de usuario");
      return;
    }

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const cacheKey = `airShipmentsCache_${user.username}`;

      // We'll collect results across pages into these
      const combinedAllShipments: AirShipment[] = [];
      const seenIds = new Set<number | string>();

      let pageToFetch = page;
      let lastPageCount = 0;

      // Continue fetching pages until we get less than ITEMS_PER_PAGE
      while (true) {
        const queryParams = new URLSearchParams({
          ConsigneeName: user.username,
          Page: pageToFetch.toString(),
          ItemsPerPage: ITEMS_PER_PAGE.toString(),
          SortBy: "newest",
        });

        const response = await fetch(
          `https://api.linbis.com/air-shipments?${queryParams}`,
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

        const shipmentsArray: AirShipment[] = await response.json();
        lastPageCount = shipmentsArray.length;

        for (const s of shipmentsArray) {
          if (s.id && !seenIds.has(s.id)) {
            combinedAllShipments.push(s);
            seenIds.add(s.id);
          }
          if (s.subShipments && Array.isArray(s.subShipments)) {
            for (const sub of s.subShipments) {
              if (sub.id && !seenIds.has(sub.id)) {
                combinedAllShipments.push(sub);
                seenIds.add(sub.id);
              }
            }
          }
        }

        console.log(
          `Página ${pageToFetch}: ${shipmentsArray.length} air-shipments cargados`,
        );

        // If this was a single-page append request, or the last fetched page has less than ITEMS_PER_PAGE, stop
        if (append && pageToFetch === page) break;
        if (shipmentsArray.length < ITEMS_PER_PAGE) break;

        pageToFetch += 1;
      }

      // Sort combined results by departure date (newest first)
      const sorted = combinedAllShipments.sort((a, b) => {
        const da = a.departure?.date ? new Date(a.departure.date) : new Date(0);
        const db = b.departure?.date ? new Date(b.departure.date) : new Date(0);
        return db.getTime() - da.getTime();
      });

      const filtered = filterShipments(sorted);

      // If append was requested and there were existing shipments, merge them and dedupe
      if (append && page > 1) {
        const combined = [...shipments, ...filtered].sort((a, b) => {
          const da = a.departure?.date
            ? new Date(a.departure.date)
            : new Date(0);
          const db = b.departure?.date
            ? new Date(b.departure.date)
            : new Date(0);
          return db.getTime() - da.getTime();
        });
        const finalFiltered = filterShipments(combined);
        setShipments(finalFiltered);
        setDisplayedShipments(finalFiltered);
        localStorage.setItem(cacheKey, JSON.stringify(finalFiltered));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, pageToFetch.toString());
      } else {
        setShipments(filtered);
        setDisplayedShipments(filtered);
        setShowingAll(false);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, pageToFetch.toString());
      }

      // Update pagination flags
      setHasMoreShipments(lastPageCount === ITEMS_PER_PAGE);
      setCurrentPage(pageToFetch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error completo:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreShipments = () => {
    const next = currentPage + 1;
    setCurrentPage(next);
    fetchAirShipments(next, true);
  };

  /*  Accordion  */
  const toggleAccordion = (shipmentId: string | number) => {
    if (expandedShipmentId === shipmentId) {
      setExpandedShipmentId(null);
      setEmbedQuery(null);
    } else {
      setExpandedShipmentId(shipmentId);
      const s = displayedShipments.find((sh) => {
        const id = sh.id || sh.number;
        return id === shipmentId;
      });
      setEmbedQuery(s?.number || null);
    }
  };

  /*  Cache  */
  useEffect(() => {
    if (!accessToken || !user?.username) return;

    // ── Cuenta dummy MundoGaming: carga datos hardcodeados ──
    if (user.username === "MundoGaming") {
      const dummySorted = [...MUNDOGAMING_DUMMY_SHIPMENTS].sort((a, b) => {
        const da = a.departure?.date ? new Date(a.departure.date) : new Date(0);
        const db = b.departure?.date ? new Date(b.departure.date) : new Date(0);
        return db.getTime() - da.getTime();
      });
      setShipments(dummySorted);
      setDisplayedShipments(dummySorted);
      setHasMoreShipments(false);
      setLoading(false);
      console.log(
        "MundoGaming: cargando datos dummy (",
        dummySorted.length,
        "envíos)",
      );
      return;
    }

    const cacheKey = `airShipmentsCache_${user.username}`;
    const cached = localStorage.getItem(cacheKey);
    const ts = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);

    if (cached && ts) {
      const age = Date.now() - parseInt(ts);
      if (age < 3600000) {
        const parsed = filterShipments(JSON.parse(cached) as AirShipment[]);
        setShipments(parsed);
        setDisplayedShipments(parsed);
        setShowingAll(false);
        if (cachedPage) setCurrentPage(parseInt(cachedPage));
        setHasMoreShipments(
          parsed.length % ITEMS_PER_PAGE === 0 &&
            parsed.length >= ITEMS_PER_PAGE,
        );
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
      localStorage.removeItem(`${cacheKey}_page`);
    }

    setCurrentPage(1);
    fetchAirShipments(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user?.username]);

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
        return (
          new Date(s.departure.date).toISOString().split("T")[0] ===
          filterDepartureDate
        );
      });
    }
    if (filterArrivalDate) {
      filtered = filtered.filter((s) => {
        if (!s.arrival?.date) return false;
        return (
          new Date(s.arrival.date).toISOString().split("T")[0] ===
          filterArrivalDate
        );
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
    if (!user?.username) return;

    // ── Cuenta dummy MundoGaming: reload datos hardcodeados ──
    if (user.username === "MundoGaming") {
      const dummySorted = [...MUNDOGAMING_DUMMY_SHIPMENTS].sort((a, b) => {
        const da = a.departure?.date ? new Date(a.departure.date) : new Date(0);
        const db = b.departure?.date ? new Date(b.departure.date) : new Date(0);
        return db.getTime() - da.getTime();
      });
      setShipments(dummySorted);
      setDisplayedShipments(dummySorted);
      setHasMoreShipments(false);
      setShowingAll(false);
      console.log("MundoGaming: datos dummy recargados");
      return;
    }

    const cacheKey = `airShipmentsCache_${user.username}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    localStorage.removeItem(`${cacheKey}_page`);
    setCurrentPage(1);
    setShipments([]);
    setDisplayedShipments([]);
    fetchAirShipments(1, false);
  };

  /*  Track Modal  */
  const openTrackModal = (shipment: AirShipment) => {
    setTrackShipment(shipment);
    setTrackEmail("");
    setTrackError(null);
    setShowTrackModal(true);
  };

  const closeTrackModal = () => {
    setShowTrackModal(false);
    setTrackShipment(null);
    setTrackEmail("");
    setTrackError(null);
  };

  const handleTrackSubmit = async () => {
    if (!trackShipment || !trackEmail.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trackEmail.trim())) {
      setTrackError("Por favor ingresa un correo electrónico válido.");
      return;
    }

    setTrackLoading(true);
    setTrackError(null);

    try {
      const cleanAwb =
        trackShipment.number?.toString().replace(/[\s-]/g, "") || "";
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
          reference: user?.username,
          awb_number: cleanAwb,
          followers: [trackEmail.trim()],
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

      closeTrackModal();
      navigate("/trackings");
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
      {/* ShipsGo Map Embed */}
      <div className="asv-map-wrapper">
        <iframe
          id="shipsgo-embed"
          src={`https://embed.shipsgo.com/?token=${import.meta.env.VITE_SHIPSGO_EMBED_TOKEN}${embedQuery ? `&transport=air&query=${embedQuery}` : ""}`}
          width="100%"
          height="450"
          frameBorder="0"
          title="ShipsGo Air Tracking"
        />
      </div>

      {/* Toolbar */}
      <div
        className="asv-toolbar"
        style={{ display: "flex", alignItems: "center", gap: "16px" }}
      >
        <div
          className="asv-toolbar__left"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <form
            className="filters-form"
            onSubmit={handleApplyFilters}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <label
                style={{
                  position: "absolute",
                  top: filterNumber || isNumberFocused ? "2px" : "8px",
                  left: "8px",
                  fontSize: filterNumber || isNumberFocused ? "10px" : "12px",
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
                Número
              </label>
              <input
                className="q-field__native q-placeholder"
                type="text"
                value={filterNumber}
                onChange={(e) => setFilterNumber(e.target.value)}
                onFocus={() => setIsNumberFocused(true)}
                onBlur={() => setIsNumberFocused(false)}
                placeholder=""
                style={{
                  width: "140px",
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
            <div style={{ position: "relative", display: "inline-block" }}>
              <label
                style={{
                  position: "absolute",
                  top: filterWaybill || isWaybillFocused ? "2px" : "8px",
                  left: "8px",
                  fontSize: filterWaybill || isWaybillFocused ? "10px" : "12px",
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
                Waybill
              </label>
              <input
                className="q-field__native q-placeholder"
                type="text"
                value={filterWaybill}
                onChange={(e) => setFilterWaybill(e.target.value)}
                onFocus={() => setIsWaybillFocused(true)}
                onBlur={() => setIsWaybillFocused(false)}
                placeholder=""
                style={{
                  width: "100px",
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
            <div style={{ position: "relative", display: "inline-block" }}>
              <label
                style={{
                  position: "absolute",
                  top:
                    filterClientReference || isClientReferenceFocused
                      ? "2px"
                      : "8px",
                  left: "8px",
                  fontSize:
                    filterClientReference || isClientReferenceFocused
                      ? "10px"
                      : "12px",
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
                Ref. Cliente
              </label>
              <input
                className="q-field__native q-placeholder"
                type="text"
                value={filterClientReference}
                onChange={(e) => setFilterClientReference(e.target.value)}
                onFocus={() => setIsClientReferenceFocused(true)}
                onBlur={() => setIsClientReferenceFocused(false)}
                placeholder=""
                style={{
                  width: "120px",
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
            <div style={{ position: "relative", display: "inline-block" }}>
              <label
                style={{
                  position: "absolute",
                  top:
                    filterDepartureDate || isDepartureFocused ? "2px" : "8px",
                  left: "8px",
                  fontSize:
                    filterDepartureDate || isDepartureFocused ? "10px" : "12px",
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
                Fecha Salida
              </label>
              <input
                className="q-field__native q-placeholder"
                type="date"
                value={filterDepartureDate}
                onChange={(e) => setFilterDepartureDate(e.target.value)}
                onFocus={() => setIsDepartureFocused(true)}
                onBlur={() => setIsDepartureFocused(false)}
                placeholder=""
                style={{
                  width: "120px",
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
            <div style={{ position: "relative", display: "inline-block" }}>
              <label
                style={{
                  position: "absolute",
                  top: filterArrivalDate || isArrivalFocused ? "2px" : "8px",
                  left: "8px",
                  fontSize:
                    filterArrivalDate || isArrivalFocused ? "10px" : "12px",
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
                Fecha Llegada
              </label>
              <input
                className="q-field__native q-placeholder"
                type="date"
                value={filterArrivalDate}
                onChange={(e) => setFilterArrivalDate(e.target.value)}
                onFocus={() => setIsArrivalFocused(true)}
                onBlur={() => setIsArrivalFocused(false)}
                placeholder=""
                style={{
                  width: "120px",
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
            <div style={{ position: "relative", display: "inline-block" }}>
              <label
                style={{
                  position: "absolute",
                  top: filterCarrier || isCarrierFocused ? "2px" : "8px",
                  left: "8px",
                  fontSize: filterCarrier || isCarrierFocused ? "10px" : "12px",
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
                Carrier
              </label>
              <input
                className="q-field__native q-placeholder"
                type="text"
                value={filterCarrier}
                onChange={(e) => setFilterCarrier(e.target.value)}
                onFocus={() => setIsCarrierFocused(true)}
                onBlur={() => setIsCarrierFocused(false)}
                placeholder=""
                style={{
                  width: "100px",
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
            <button
              className="asv-btn asv-btn--primary"
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
              className="asv-btn asv-btn--ghost"
              type="button"
              onClick={clearSearch}
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
          className="asv-toolbar__right"
          style={{ marginLeft: "auto", display: "flex", gap: "8px" }}
        >
          <button
            className="asv-btn"
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
          {loadingMore && <span className="asv-loading-text">Cargando</span>}
          {showingAll && (
            <button
              className="asv-btn asv-btn--ghost asv-btn--sm"
              onClick={clearSearch}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="asv-empty">
          <div className="asv-spinner" />
          <p className="asv-empty__subtitle">Cargando air-shipments</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="asv-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Table */}
      {!loading && displayedShipments.length > 0 && (
        <div className="asv-table-wrapper">
          <div className="asv-table-scroll">
            <table className="asv-table">
              <thead>
                <tr>
                  <th className="asv-th">Número</th>
                  <th className="asv-th">Waybill</th>
                  <th className="asv-th">Referencia Cliente</th>
                  <th className="asv-th asv-th--center">Fecha Salida</th>
                  <th className="asv-th asv-th--center">Fecha Llegada</th>
                  <th className="asv-th asv-th--center">Carrier</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShipments.map((shipment, index) => {
                  const shipmentId = shipment.id || shipment.number || index;
                  const isExpanded = expandedShipmentId === shipmentId;
                  const arrived = isShipmentArrived(shipment);

                  return (
                    <React.Fragment key={shipmentId}>
                      <tr
                        className={`asv-tr ${isExpanded ? "asv-tr--active" : ""}`}
                        onClick={() => toggleAccordion(shipmentId)}
                      >
                        <td className="asv-td asv-td--number">
                          <svg
                            className={`asv-row-chevron ${isExpanded ? "asv-row-chevron--open" : ""}`}
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
                        <td className="asv-td asv-td--waybill">
                          {shipment.waybillNumber || "-"}
                        </td>
                        <td className="asv-td">
                          {shipment.customerReference || "-"}
                        </td>
                        <td className="asv-td asv-td--center">
                          {formatDateInline(shipment.departure?.displayDate)}
                        </td>
                        <td className="asv-td asv-td--center">
                          {formatDateInline(shipment.arrival?.displayDate)}
                        </td>
                        <td className="asv-td asv-td--center">
                          {shipment.carrier?.name || "-"}
                        </td>
                      </tr>

                      {/* Accordion content */}
                      {isExpanded && (
                        <tr className="asv-accordion-row">
                          <td colSpan={6} className="asv-accordion-cell">
                            <div className="asv-accordion-content">
                              {/* ShipmentTimeline  preserved exactly */}
                              <div className="asv-timeline-section">
                                <ShipmentTimeline shipment={shipment} />
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
                                      <div className="asv-cards-grid">
                                        <div className="asv-card">
                                          <h4>Detalles del Envío</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Número de Envío"
                                              value={shipment.number}
                                            />
                                            <InfoField
                                              label="Referencia Cliente"
                                              value={shipment.customerReference}
                                            />
                                            <InfoField
                                              label="Waybill"
                                              value={shipment.waybillNumber}
                                            />
                                            <InfoField
                                              label="Carga"
                                              value={shipment.cargoDescription}
                                            />
                                          </div>
                                        </div>
                                        <div className="asv-card">
                                          <h4>Seguimiento del Envío</h4>
                                          <div className="asv-info-grid">
                                            {/* Track button */}
                                            <div className="asv-track-field">
                                              <div className="asv-track-field__label">
                                                ¿Quieres trackear tu envío?
                                              </div>
                                              {arrived ? (
                                                <span className="asv-track-field__unavailable">
                                                  No disponible
                                                </span>
                                              ) : (
                                                <button
                                                  className="asv-btn asv-btn--secondary asv-btn--sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openTrackModal(shipment);
                                                  }}
                                                >
                                                  Trackea tu envío
                                                </button>
                                              )}
                                            </div>
                                            <InfoField
                                              label="Remitente (Shipper)"
                                              value={shipment.shipper?.name}
                                              fullWidth
                                            />
                                            <InfoField
                                              label="Agente Forwarding"
                                              value={
                                                shipment.forwardingAgent?.name
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className="asv-card">
                                          <h4>Operación Logística</h4>
                                          <div className="asv-info-grid">
                                            <InfoField
                                              label="Carrier"
                                              value={shipment.carrier?.name}
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
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                      </svg>
                                    ),
                                    content: (
                                      <div>
                                        <div
                                          className="asv-cards-grid"
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                              "repeat(2, 1fr)",
                                            gap: "16px",
                                            marginBottom: 16,
                                          }}
                                        >
                                          <div className="asv-card">
                                            <h4>Descripción Carga</h4>
                                            <div className="asv-info-grid">
                                              <InfoField
                                                label="Descripción de Carga"
                                                value={
                                                  shipment.cargoDescription
                                                }
                                                fullWidth
                                              />
                                              <InfoField
                                                label="Tipo de Empaque"
                                                value={(() => {
                                                  if (
                                                    shipment.subShipments &&
                                                    Array.isArray(
                                                      shipment.subShipments,
                                                    )
                                                  ) {
                                                    const packageTypes =
                                                      new Set<string>();
                                                    for (const sub of shipment.subShipments) {
                                                      if (
                                                        sub.commodities &&
                                                        Array.isArray(
                                                          sub.commodities,
                                                        )
                                                      ) {
                                                        sub.commodities.forEach(
                                                          (c: any) => {
                                                            if (
                                                              c.packageType
                                                                ?.description
                                                            ) {
                                                              packageTypes.add(
                                                                c.packageType
                                                                  .description,
                                                              );
                                                            }
                                                          },
                                                        );
                                                      }
                                                    }
                                                    return packageTypes.size > 0
                                                      ? Array.from(
                                                          packageTypes,
                                                        ).join(", ")
                                                      : null;
                                                  }
                                                  return null;
                                                })()}
                                              />
                                            </div>
                                          </div>
                                          <div className="asv-card">
                                            <h4>Medidas y Peso</h4>
                                            <div className="asv-info-grid">
                                              <InfoField
                                                label="Piezas"
                                                value={(() => {
                                                  if (
                                                    shipment.subShipments &&
                                                    Array.isArray(
                                                      shipment.subShipments,
                                                    )
                                                  ) {
                                                    let total = 0;
                                                    for (const sub of shipment.subShipments) {
                                                      if (
                                                        sub.commodities &&
                                                        Array.isArray(
                                                          sub.commodities,
                                                        )
                                                      ) {
                                                        total +=
                                                          sub.commodities.reduce(
                                                            (
                                                              sum: number,
                                                              c: {
                                                                pieces?: number;
                                                              },
                                                            ) =>
                                                              sum +
                                                              (c.pieces || 0),
                                                            0,
                                                          );
                                                      }
                                                    }
                                                    return total > 0
                                                      ? total
                                                      : null;
                                                  }
                                                  return null;
                                                })()}
                                              />
                                              <InfoField
                                                label="Peso Total"
                                                value={(() => {
                                                  if (
                                                    shipment.subShipments &&
                                                    Array.isArray(
                                                      shipment.subShipments,
                                                    )
                                                  ) {
                                                    let total = 0;
                                                    for (const sub of shipment.subShipments) {
                                                      if (
                                                        sub.commodities &&
                                                        Array.isArray(
                                                          sub.commodities,
                                                        )
                                                      ) {
                                                        total +=
                                                          sub.commodities.reduce(
                                                            (
                                                              sum: number,
                                                              c: {
                                                                totalWeightValue?: number;
                                                              },
                                                            ) =>
                                                              sum +
                                                              (c.totalWeightValue ||
                                                                0),
                                                            0,
                                                          );
                                                      }
                                                    }
                                                    return total > 0
                                                      ? `${total} kg`
                                                      : null;
                                                  }
                                                  return null;
                                                })()}
                                              />
                                              <InfoField
                                                label="Volumen Total"
                                                value={(() => {
                                                  if (
                                                    shipment.subShipments &&
                                                    Array.isArray(
                                                      shipment.subShipments,
                                                    )
                                                  ) {
                                                    let total = 0;
                                                    for (const sub of shipment.subShipments) {
                                                      if (
                                                        sub.commodities &&
                                                        Array.isArray(
                                                          sub.commodities,
                                                        )
                                                      ) {
                                                        total +=
                                                          sub.commodities.reduce(
                                                            (
                                                              sum: number,
                                                              c: {
                                                                totalVolumeValue?: number;
                                                              },
                                                            ) =>
                                                              sum +
                                                              (c.totalVolumeValue ||
                                                                0),
                                                            0,
                                                          );
                                                      }
                                                    }
                                                    return total > 0
                                                      ? `${total} m³`
                                                      : null;
                                                  }
                                                  return null;
                                                })()}
                                              />
                                              <InfoField
                                                label="¿Carga Peligrosa?"
                                                value={shipment.hazardous}
                                              />
                                              <CommoditiesSection
                                                commodities={
                                                  shipment.commodities!
                                                }
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
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
                                      </svg>
                                    ),
                                    content: (
                                      <DocumentosSectionAir
                                        shipmentId={shipmentId}
                                      />
                                    ),
                                  },
                                  {
                                    key: "subshipments",
                                    label: `Cotización (${shipment.subShipments?.length || 0})`,
                                    hidden:
                                      !shipment.subShipments ||
                                      shipment.subShipments.length === 0,
                                    content: (
                                      <SubShipmentsList
                                        subShipments={shipment.subShipments!}
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
                                      <div className="asv-notes">
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
          <div className="asv-table-footer">
            <div className="asv-table-footer__left">
              {loadingMore && (
                <span className="asv-loading-text">Cargando...</span>
              )}
              {hasMoreShipments && !loadingMore && (
                <button
                  className="asv-btn asv-btn--primary"
                  onClick={loadMoreShipments}
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    height: "auto",
                  }}
                >
                  Cargar más
                </button>
              )}
            </div>
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
                value={trackShipment.number || ""}
                disabled
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="asv-label">
                Correo electrónico para seguimiento
              </label>
              <input
                className="asv-input"
                type="email"
                value={trackEmail}
                onChange={(e) => setTrackEmail(e.target.value)}
                placeholder="Ingresa tu correo electrónico"
              />
              <small className="asv-hint">
                Si deseas agregar más correos, dirígete a Mis Envíos.
              </small>
            </div>

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
