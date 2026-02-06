import React, { useState, useEffect } from "react";
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

  // Search modal
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Track modal
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackShipment, setTrackShipment] = useState<AirShipment | null>(null);
  const [trackEmail, setTrackEmail] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Embed
  const [embedQuery, setEmbedQuery] = useState<string | null>(null);

  // Search fields
  const [searchDate, setSearchDate] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchNumber, setSearchNumber] = useState("");
  const [showingAll, setShowingAll] = useState(false);

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
      const queryParams = new URLSearchParams({
        ConsigneeName: user.username,
        Page: page.toString(),
        ItemsPerPage: "50",
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
      const allShipments: AirShipment[] = [];
      const seenIds = new Set<number | string>();

      for (const s of shipmentsArray) {
        if (s.id && !seenIds.has(s.id)) {
          allShipments.push(s);
          seenIds.add(s.id);
        }
        if (s.subShipments && Array.isArray(s.subShipments)) {
          for (const sub of s.subShipments) {
            if (sub.id && !seenIds.has(sub.id)) {
              allShipments.push(sub);
              seenIds.add(sub.id);
            }
          }
        }
      }

      const sorted = allShipments.sort((a, b) => {
        const da = a.departure?.date ? new Date(a.departure.date) : new Date(0);
        const db = b.departure?.date ? new Date(b.departure.date) : new Date(0);
        return db.getTime() - da.getTime();
      });

      setHasMoreShipments(shipmentsArray.length === 50);
      const cacheKey = `airShipmentsCache_${user.username}`;

      if (append && page > 1) {
        const combined = [...shipments, ...sorted].sort((a, b) => {
          const da = a.departure?.date
            ? new Date(a.departure.date)
            : new Date(0);
          const db = b.departure?.date
            ? new Date(b.departure.date)
            : new Date(0);
          return db.getTime() - da.getTime();
        });
        const filtered = combined.filter(
          (s) =>
            !String(s.number ?? "")
              .toUpperCase()
              .startsWith("SOG"),
        );
        setShipments(filtered);
        setDisplayedShipments(filtered);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      } else {
        const filtered = sorted.filter(
          (s) =>
            !String(s.number ?? "")
              .toUpperCase()
              .startsWith("SOG"),
        );
        setShipments(filtered);
        setDisplayedShipments(filtered);
        setShowingAll(false);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      }

      console.log(
        `Página ${page}: ${allShipments.length} air-shipments cargados`,
      );
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

    const cacheKey = `airShipmentsCache_${user.username}`;
    const cached = localStorage.getItem(cacheKey);
    const ts = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);

    if (cached && ts) {
      const age = Date.now() - parseInt(ts);
      if (age < 3600000) {
        const parsed = (JSON.parse(cached) as AirShipment[]).filter(
          (s) =>
            !String(s.number ?? "")
              .toUpperCase()
              .startsWith("SOG"),
        );
        setShipments(parsed);
        setDisplayedShipments(parsed);
        setShowingAll(false);
        if (cachedPage) setCurrentPage(parseInt(cachedPage));
        setHasMoreShipments(parsed.length % 50 === 0 && parsed.length >= 50);
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
  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }
    const term = searchNumber.trim().toLowerCase();
    setDisplayedShipments(
      shipments.filter((s) =>
        (s.number || "").toString().toLowerCase().includes(term),
      ),
    );
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }
    setDisplayedShipments(
      shipments.filter((s) => {
        if (!s.date) return false;
        return new Date(s.date).toISOString().split("T")[0] === searchDate;
      }),
    );
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDateRange = () => {
    if (!searchStartDate && !searchEndDate) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }
    setDisplayedShipments(
      shipments.filter((s) => {
        if (!s.date) return false;
        const d = new Date(s.date);
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
    setShowSearchModal(false);
  };

  const clearSearch = () => {
    setSearchNumber("");
    setSearchDate("");
    setSearchStartDate("");
    setSearchEndDate("");
    setDisplayedShipments(shipments);
    setShowingAll(false);
  };

  const refreshShipments = () => {
    if (!user?.username) return;
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

  /* 
     JSX
      */
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
      <div className="asv-toolbar">
        <div className="asv-toolbar__left" />
        <div className="asv-toolbar__right">
          <button
            className="asv-btn asv-btn--ghost"
            onClick={() => setShowSearchModal(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Buscar
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
                  <th className="asv-th">Consignatario</th>
                  <th className="asv-th asv-th--center">Fecha Salida</th>
                  <th className="asv-th asv-th--center">Fecha Llegada</th>
                  <th className="asv-th asv-th--center">Carrier</th>
                </tr>
              </thead>
              <tbody>
                {displayedShipments.map((shipment, index) => {
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
                          {shipment.consignee?.name || "-"}
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
                                          className="asv-info-grid"
                                          style={{ marginBottom: 16 }}
                                        >
                                          <InfoField
                                            label="Descripción de Carga"
                                            value={shipment.cargoDescription}
                                            fullWidth
                                          />
                                          <InfoField
                                            label="Piezas"
                                            value={shipment.commodities?.pieces}
                                            fullWidth
                                          />
                                          <InfoField
                                            label="Piezas Manifestadas"
                                            value={shipment.manifestedPieces}
                                          />
                                          <InfoField
                                            label="Peso Manifestado"
                                            value={
                                              shipment.manifestedWeight
                                                ? `${shipment.manifestedWeight} kg`
                                                : null
                                            }
                                          />
                                          <InfoField
                                            label="Pallets"
                                            value={
                                              shipment.pallets ||
                                              shipment.manifestedPallets
                                            }
                                          />
                                          <InfoField
                                            label="Carga Peligrosa"
                                            value={shipment.hazardous}
                                          />
                                        </div>
                                        <CommoditiesSection
                                          commodities={shipment.commodities!}
                                        />
                                      </div>
                                    ),
                                  },
                                  {
                                    key: "route",
                                    label: "Origen y Destino",
                                    icon: (
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <circle cx="12" cy="10" r="3" />
                                        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z" />
                                      </svg>
                                    ),
                                    content: (
                                      <div className="asv-info-grid">
                                        <InfoField
                                          label="Remitente (Shipper)"
                                          value={shipment.shipper?.name}
                                          fullWidth
                                        />
                                        <InfoField
                                          label="Dirección Remitente"
                                          value={shipment.shipperAddress}
                                          fullWidth
                                        />
                                        <InfoField
                                          label="Carrier"
                                          value={shipment.carrier?.name}
                                          fullWidth
                                        />
                                        <InfoField
                                          label="Dirección Consignatario"
                                          value={shipment.consigneeAddress}
                                          fullWidth
                                        />
                                        <InfoField
                                          label="Notify Party"
                                          value={
                                            shipment.notifyParty?.name ||
                                            shipment.notifyPartyAddress
                                          }
                                          fullWidth
                                        />
                                        <InfoField
                                          label="Agente Forwarding"
                                          value={shipment.forwardingAgent?.name}
                                        />
                                        <InfoField
                                          label="Agente Destino"
                                          value={
                                            shipment.destinationAgent?.name
                                          }
                                        />
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
              Mostrando <strong>{displayedShipments.length}</strong> envíos
              {!hasMoreShipments && <span> (todos cargados)</span>}
            </div>
            <div className="asv-table-footer__right">
              {hasMoreShipments && !loadingMore && (
                <button
                  className="asv-btn asv-btn--ghost asv-btn--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadMoreShipments();
                  }}
                >
                  Cargar más
                </button>
              )}
              {loadingMore && (
                <span className="asv-loading-text">Cargando</span>
              )}
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
          {hasMoreShipments && (
            <button
              className="asv-btn asv-btn--primary"
              onClick={() => loadMoreShipments()}
            >
              Cargar más páginas
            </button>
          )}
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="asv-overlay" onClick={() => setShowSearchModal(false)}>
          <div
            className="asv-modal asv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="asv-modal__title">Buscar Air-Shipments</h3>

            <div className="asv-search-section">
              <label className="asv-label">Por Número</label>
              <input
                className="asv-input"
                type="text"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Ingresa el número del shipment"
              />
              <button
                className="asv-btn asv-btn--primary asv-btn--full"
                onClick={handleSearchByNumber}
              >
                Buscar por Número
              </button>
            </div>

            <div className="asv-search-section">
              <label className="asv-label">Por Fecha Exacta</label>
              <input
                className="asv-input"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <button
                className="asv-btn asv-btn--primary asv-btn--full"
                onClick={handleSearchByDate}
              >
                Buscar por Fecha
              </button>
            </div>

            <div className="asv-search-section">
              <label className="asv-label">Por Rango de Fechas</label>
              <div className="asv-search-row">
                <div style={{ flex: 1 }}>
                  <label className="asv-label asv-label--small">Desde</label>
                  <input
                    className="asv-input"
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="asv-label asv-label--small">Hasta</label>
                  <input
                    className="asv-input"
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="asv-btn asv-btn--primary asv-btn--full"
                onClick={handleSearchByDateRange}
              >
                Buscar por Rango
              </button>
            </div>

            <button
              className="asv-btn asv-btn--ghost asv-btn--full"
              onClick={() => setShowSearchModal(false)}
            >
              Cerrar
            </button>
          </div>
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
