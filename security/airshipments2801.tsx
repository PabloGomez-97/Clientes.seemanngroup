import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./AirShipmentsView.css"; // 👈 Importar el CSS
import { DocumentosSectionAir } from "../Sidebar/Documents/DocumentosSectionAir";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  type OutletContext,
  type AirShipment,
  ShipmentTimeline,
  CollapsibleSection,
  InfoField,
  CommoditiesSection,
  SubShipmentsList,
} from "../shipments/Handlers/Handlersairshipments";

function AirShipmentsView() {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<AirShipment[]>([]);
  const [displayedShipments, setDisplayedShipments] = useState<AirShipment[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAccordions, setOpenAccordions] = useState<(string | number)[]>([]);
  const [activeTabs, setActiveTabs] = useState<Record<string | number, number>>(
    {},
  );

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreShipments, setHasMoreShipments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal state
  const [selectedShipment, setSelectedShipment] = useState<AirShipment | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Búsqueda por fecha
  const [searchDate, setSearchDate] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");

  // Búsqueda por número
  const [searchNumber, setSearchNumber] = useState("");

  const [showingAll, setShowingAll] = useState(false);

  // Tooltips estado
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Define los mensajes de ayuda para cada columna
  const tooltipMessages = {
    numero:
      "Número a utilizar para rastrear el envío con la aerolínea o transportista.",
    gasto: "Se excluyen impuestos asociados",
  };

  // Componente de Tooltip mejorado con posicionamiento inteligente
  const TooltipIcon = ({ id, message }: { id: string; message: string }) => {
    const iconRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
        setActiveTooltip(id);
      }
    };

    const handleMouseLeave = () => {
      setActiveTooltip(null);
      setTooltipPosition(null);
    };

    // Calcular si el tooltip debe ir a la izquierda o derecha
    const getTooltipStyle = () => {
      if (!tooltipPosition) return {};

      const windowWidth = window.innerWidth;
      const tooltipWidth = 280; // maxWidth del tooltip
      const shouldAlignRight =
        tooltipPosition.x + tooltipWidth / 2 > windowWidth - 20;
      const shouldAlignLeft = tooltipPosition.x - tooltipWidth / 2 < 20;

      let transform = "translate(-50%, -100%)";
      let left = tooltipPosition.x;

      if (shouldAlignRight) {
        // Si está muy a la derecha, alinear el tooltip a la derecha
        transform = "translate(-100%, -100%)";
        left = tooltipPosition.x + 8; // pequeño offset
      } else if (shouldAlignLeft) {
        // Si está muy a la izquierda, alinear el tooltip a la izquierda
        transform = "translate(0%, -100%)";
        left = tooltipPosition.x - 8;
      }

      return {
        position: "fixed" as const,
        left: `${left}px`,
        top: `${tooltipPosition.y}px`,
        transform: transform,
        marginTop: "-12px",
      };
    };

    return (
      <div
        ref={iconRef}
        style={{
          position: "relative",
          display: "inline-block",
          marginLeft: "6px",
          zIndex: 9999,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "16px",
            height: "16px",
            backgroundColor: "#3b82f6",
            color: "white",
            borderRadius: "50%",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "help",
            userSelect: "none",
          }}
        >
          ?
        </span>
        {activeTooltip === id && tooltipPosition && (
          <div
            style={{
              ...getTooltipStyle(),
              padding: "10px 14px",
              backgroundColor: "#1f2937",
              color: "white",
              borderRadius: "8px",
              fontSize: "0.8rem",
              lineHeight: "1.4",
              whiteSpace: "normal",
              maxWidth: "280px",
              minWidth: "200px",
              width: "max-content",
              zIndex: 99999,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              pointerEvents: "none",
              textAlign: "center",
              wordWrap: "break-word",
            }}
          >
            {message}
            {/* Flecha del tooltip - ajustar posición según alineación */}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left:
                  tooltipPosition.x + 280 / 2 > window.innerWidth - 20
                    ? "auto"
                    : tooltipPosition.x - 280 / 2 < 20
                      ? "20px"
                      : "50%",
                right:
                  tooltipPosition.x + 280 / 2 > window.innerWidth - 20
                    ? "20px"
                    : "auto",
                transform:
                  tooltipPosition.x + 280 / 2 > window.innerWidth - 20 ||
                  tooltipPosition.x - 280 / 2 < 20
                    ? "none"
                    : "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid #1f2937",
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // Función auxiliar para formatear fechas
  const formatDate = (dateObj: any) => {
    if (!dateObj || !dateObj.displayDate) return "-";

    if (dateObj.displayDate.trim() === "") return "-";

    try {
      const [month, day, year] = dateObj.displayDate.split("/");
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      return date.toLocaleDateString("es-CL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateObj.displayDate;
    }
  };

  // Obtener air-shipments usando el token con paginación
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
        if (response.status === 401) {
          throw new Error(
            "Token inválido o expirado. Obtén un nuevo token desde Postman.",
          );
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      const shipmentsArray: AirShipment[] = responseData.data || [];

      // Aplanar la lista incluyendo subShipments para evitar duplicados
      const allShipments: AirShipment[] = [];
      const seenIds = new Set<number | string>();

      for (const shipment of shipmentsArray) {
        if (shipment.id && !seenIds.has(shipment.id)) {
          allShipments.push(shipment);
          seenIds.add(shipment.id);
        }
        if (shipment.subShipments && Array.isArray(shipment.subShipments)) {
          for (const sub of shipment.subShipments) {
            if (sub.id && !seenIds.has(sub.id)) {
              allShipments.push(sub);
              seenIds.add(sub.id);
            }
          }
        }
      }

      const sortedShipments = allShipments.sort((a, b) => {
        const dateA = a.departure?.date
          ? new Date(a.departure.date)
          : new Date(0);
        const dateB = b.departure?.date
          ? new Date(b.departure.date)
          : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setHasMoreShipments(shipmentsArray.length === 50);

      if (append && page > 1) {
        const combined = [...shipments, ...sortedShipments];
        const resorted = combined.sort((a, b) => {
          const dateA = a.departure?.date
            ? new Date(a.departure.date)
            : new Date(0);
          const dateB = b.departure?.date
            ? new Date(b.departure.date)
            : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        const filtered = resorted.filter(
          (s) =>
            !String(s.number ?? "")
              .toUpperCase()
              .startsWith("SOG"),
        );
        setShipments(filtered);
        setDisplayedShipments(filtered);

        const cacheKey = `airShipmentsCache_${user.username}`;
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      } else {
        const filtered = sortedShipments.filter(
          (s) =>
            !String(s.number ?? "")
              .toUpperCase()
              .startsWith("SOG"),
        );
        setShipments(filtered);
        setDisplayedShipments(filtered);
        setShowingAll(false);

        const cacheKey = `airShipmentsCache_${user.username}`;
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
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchAirShipments(nextPage, true);
  };

  // Función para obtener la ruta de la bandera
  const getFlagPath = (locationName: string | undefined) => {
    if (!locationName) return null;
    // Limpiar el nombre: reemplazar caracteres no válidos en nombres de archivo
    const cleanName = locationName
      .trim()
      .replace(/\//g, "-") // Reemplazar / por -
      .replace(/\\/g, "-") // Reemplazar \ por -
      .replace(/:/g, "-") // Reemplazar : por -
      .replace(/\*/g, "") // Eliminar *
      .replace(/\?/g, "") // Eliminar ?
      .replace(/"/g, "") // Eliminar "
      .replace(/</g, "") // Eliminar <
      .replace(/>/g, "") // Eliminar >
      .replace(/\|/g, "-"); // Reemplazar | por -

    return `/paises/${cleanName}.png`;
  };

  // Componente para mostrar ubicación con bandera
  const LocationWithFlag = ({ location }: { location: string | undefined }) => {
    if (!location) return <>-</>;

    const flagPath = getFlagPath(location);

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {flagPath && (
          <img
            src={flagPath}
            alt={location}
            style={{
              width: "20px",
              height: "15px",
              objectFit: "cover",
              borderRadius: "2px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <span style={{ fontWeight: "600" }}>{location}</span>
      </div>
    );
  };

  // Funciones para manejar accordion
  const toggleAccordion = (shipmentId: string | number) => {
    setOpenAccordions((prev) => {
      const isOpen = prev.includes(shipmentId);

      if (isOpen) {
        return prev.filter((id) => id !== shipmentId);
      } else {
        if (prev.length >= 3) {
          return [...prev.slice(1), shipmentId];
        }
        return [...prev, shipmentId];
      }
    });

    if (!activeTabs[shipmentId]) {
      setActiveTabs((prev) => ({ ...prev, [shipmentId]: 0 }));
    }
  };

  const setActiveTab = (shipmentId: string | number, tabIndex: number) => {
    setActiveTabs((prev) => ({ ...prev, [shipmentId]: tabIndex }));
  };

  useEffect(() => {
    if (!accessToken) {
      console.log("No hay token disponible todavía");
      return;
    }

    if (!user?.username) {
      console.log("No hay usuario disponible todavía");
      return;
    }

    const cacheKey = `airShipmentsCache_${user.username}`;
    const cachedShipments = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);

    if (cachedShipments && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);

      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedShipments);
        const filtered = parsed.filter(
          (s: any) =>
            !String(s.number ?? "")
              .toUpperCase()
              .startsWith("SOG"),
        );

        setShipments(filtered);
        setDisplayedShipments(filtered);
        setShowingAll(false);

        if (cachedPage) {
          setCurrentPage(parseInt(cachedPage));
        }

        const lastPageSize = parsed.length % 50;
        setHasMoreShipments(lastPageSize === 0 && parsed.length >= 50);

        setLoading(false);
        console.log(
          "✅ Cargando desde caché - datos guardados hace",
          Math.floor(cacheAge / 60000),
          "minutos",
        );
        console.log(`📦 ${parsed.length} air-shipments en caché`);
        return;
      } else {
        console.log("🗑️ Caché expirado, limpiando...");
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
        localStorage.removeItem(`${cacheKey}_page`);
      }
    }

    setCurrentPage(1);
    fetchAirShipments(1, false);
  }, [accessToken, user?.username]);

  const handleSearchByNumber = () => {
    if (!searchNumber.trim()) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }

    const searchTerm = searchNumber.trim().toLowerCase();
    const results = shipments.filter((shipment) => {
      const number = (shipment.number || "").toString().toLowerCase();
      return number.includes(searchTerm);
    });

    setDisplayedShipments(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDate = () => {
    if (!searchDate) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }

    const results = shipments.filter((shipment) => {
      if (!shipment.date) return false;
      const shipmentDate = new Date(shipment.date).toISOString().split("T")[0];
      return shipmentDate === searchDate;
    });

    setDisplayedShipments(results);
    setShowingAll(true);
    setShowSearchModal(false);
  };

  const handleSearchByDateRange = () => {
    if (!searchStartDate && !searchEndDate) {
      setDisplayedShipments(shipments);
      setShowingAll(false);
      return;
    }

    const results = shipments.filter((shipment) => {
      if (!shipment.date) return false;
      const shipmentDate = new Date(shipment.date);

      if (searchStartDate && searchEndDate) {
        const start = new Date(searchStartDate);
        const end = new Date(searchEndDate);
        end.setHours(23, 59, 59, 999);
        return shipmentDate >= start && shipmentDate <= end;
      } else if (searchStartDate) {
        return shipmentDate >= new Date(searchStartDate);
      } else if (searchEndDate) {
        const end = new Date(searchEndDate);
        end.setHours(23, 59, 59, 999);
        return shipmentDate <= end;
      }
      return false;
    });

    setDisplayedShipments(results);
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

    console.log("🔄 Datos refrescados desde la API");
  };

  const openModal = (shipment: AirShipment) => {
    setSelectedShipment(shipment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedShipment(null);
  };

  const openSearchModal = () => {
    setShowSearchModal(true);
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
  };

  return (
    <>
      {/* Interactive Map */}
      <div
        style={{
          marginBottom: "32px",
          height: "350px", // 👈 MODIFICA ESTE VALOR para ajustar altura (300px-400px)
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          zIndex: 1,
          position: "relative",
        }}
      >
        <MapContainer
          center={[-33.4489, -70.6693]} // Coordenadas de Santiago, Chile
          zoom={3}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>

      {/* Botones de acción */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <button
          onClick={openSearchModal}
          style={{
            backgroundColor: "transparent",
            color: "#111827",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px 14px",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: "500",
            transition: "background-color 0.2s ease, border-color 0.2s ease",
          }}
        >
          Buscar
        </button>

        {/* Botón Actualizar */}
        <button
          onClick={refreshShipments}
          className="btn-refresh"
          title="Actualizar lista de envíos"
        >
          🔄 Actualizar
        </button>

        {loadingMore && (
          <div
            style={{
              padding: "8px 14px",
              color: "#6b7280",
              fontSize: "0.85rem",
              fontWeight: "400",
            }}
          >
            Cargando…
          </div>
        )}

        {showingAll && (
          <button
            onClick={clearSearch}
            style={{
              backgroundColor: "transparent",
              color: "#6b7280",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "400",
              transition: "color 0.2s ease, border-color 0.2s ease",
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Modal de Búsqueda */}
      {showSearchModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            animation: "fadeIn 0.3s ease-in-out",
          }}
          onClick={closeSearchModal}
        >
          <div
            className="bg-white rounded p-4"
            style={{
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 style={{ marginBottom: "20px", color: "#1f2937" }}>
              Buscar Air-Shipments
            </h5>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  color: "#374151",
                }}
              >
                Por Número
              </label>
              <input
                type="text"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Ingresa el número del shipment"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                }}
              />
              <button
                onClick={handleSearchByNumber}
                style={{
                  marginTop: "10px",
                  width: "100%",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >
                Buscar por Número
              </button>
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "20px",
                marginBottom: "20px",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  color: "#374151",
                }}
              >
                Por Fecha Exacta
              </label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                }}
              />
              <button
                onClick={handleSearchByDate}
                style={{
                  marginTop: "10px",
                  width: "100%",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >
                Buscar por Fecha
              </button>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  color: "#374151",
                }}
              >
                Por Rango de Fechas
              </label>
              <div
                style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "0.8rem",
                      color: "#6b7280",
                    }}
                  >
                    Desde
                  </label>
                  <input
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "0.8rem",
                      color: "#6b7280",
                    }}
                  >
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleSearchByDateRange}
                style={{
                  width: "100%",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >
                Buscar por Rango
              </button>
            </div>

            <button
              onClick={closeSearchModal}
              style={{
                marginTop: "20px",
                width: "100%",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "6px",
                padding: "10px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "16px",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            ✈️
          </div>
          <p style={{ color: "#6b7280", fontSize: "1rem" }}>
            Cargando air-shipments...
          </p>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #fecaca",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tabla de Air-Shipments con Accordion */}
      {!loading && displayedShipments.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            overflow: "visible",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  <th
                    style={{
                      padding: "16px 20px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Número
                    <TooltipIcon id="numero" message={tooltipMessages.numero} />
                  </th>
                  <th
                    style={{
                      padding: "16px 20px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Waybill
                  </th>
                  <th
                    style={{
                      padding: "16px 20px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      minWidth: "200px",
                    }}
                  >
                    Consignatario
                  </th>
                  <th
                    style={{
                      padding: "16px 20px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Fecha Salida
                  </th>
                  <th
                    style={{
                      padding: "16px 20px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      minWidth: "150px",
                    }}
                  >
                    Fecha Llegada
                  </th>
                  <th
                    style={{
                      padding: "16px 20px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Carrier
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedShipments.map((shipment, index) => {
                  const shipmentId = shipment.id || shipment.number || index;
                  const isOpen = openAccordions.includes(shipmentId);
                  const activeTabIndex = activeTabs[shipmentId] || 0;

                  const isDelivered = !!shipment.proofOfDelivery?.podDelivery;
                  const isInCustoms =
                    shipment.customsReleased || !!shipment.importSection?.entry;
                  const hasArrived =
                    shipment.arrival &&
                    new Date(shipment.arrival) <= new Date();
                  const inTransit = !!shipment.departure;

                  let statusLabel = "Pendiente";
                  let statusColor = "#9ca3af";
                  let statusBg = "#f3f4f6";

                  if (isDelivered) {
                    statusLabel = "Entregado";
                    statusColor = "#059669";
                    statusBg = "#d1fae5";
                  } else if (isInCustoms) {
                    statusLabel = "En Aduana";
                    statusColor = "#d97706";
                    statusBg = "#fef3c7";
                  } else if (hasArrived) {
                    statusLabel = "Arribado";
                    statusColor = "#2563eb";
                    statusBg = "#dbeafe";
                  } else if (inTransit) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    statusLabel = "En Tránsito";
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    statusColor = "#7c3aed";
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    statusBg = "#ede9fe";
                  }

                  return (
                    <>
                      {/* Fila de la tabla */}
                      <tr
                        key={`row-${shipmentId}`}
                        onClick={() => toggleAccordion(shipmentId)}
                        className={`shipments-table-row ${isOpen ? "expanded" : ""}`}
                        style={{
                          borderBottom:
                            !isOpen && index < displayedShipments.length - 1
                              ? "1px solid #f3f4f6"
                              : "none",
                        }}
                      >
                        <td
                          style={{
                            padding: "16px 20px",
                            fontWeight: "600",
                            color: "#1f2937",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shipment.number || "N/A"}
                        </td>
                        <td
                          style={{
                            padding: "16px 20px",
                            color: "#3b82f6",
                            fontWeight: "500",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shipment.waybillNumber || "-"}
                        </td>
                        <td
                          style={{
                            padding: "16px 20px",
                            color: "#4b5563",
                          }}
                        >
                          {shipment.consignee?.name || "-"}
                        </td>
                        <td
                          style={{
                            padding: "16px 20px",
                            textAlign: "center",
                            color: "#4b5563",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shipment.departure &&
                          shipment.departure.displayDate &&
                          shipment.departure.displayDate.trim() !== ""
                            ? (() => {
                                try {
                                  const [month, day, year] =
                                    shipment.departure.displayDate.split("/");
                                  const date = new Date(
                                    parseInt(year),
                                    parseInt(month) - 1,
                                    parseInt(day),
                                  );
                                  return date.toLocaleDateString("es-CL", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  });
                                } catch {
                                  return shipment.departure.displayDate;
                                }
                              })()
                            : "-"}
                        </td>
                        <td
                          style={{
                            padding: "16px 20px",
                            textAlign: "center",
                            color: "#4b5563",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shipment.arrival &&
                          shipment.arrival.displayDate &&
                          shipment.arrival.displayDate.trim() !== ""
                            ? (() => {
                                try {
                                  const [month, day, year] =
                                    shipment.arrival.displayDate.split("/");
                                  const date = new Date(
                                    parseInt(year),
                                    parseInt(month) - 1,
                                    parseInt(day),
                                  );
                                  return date.toLocaleDateString("es-CL", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  });
                                } catch {
                                  return shipment.arrival.displayDate;
                                }
                              })()
                            : "-"}
                        </td>
                        <td
                          style={{
                            padding: "16px 20px",
                            textAlign: "center",
                            color: "#4b5563",
                          }}
                        >
                          {shipment.carrier?.name || "-"}
                        </td>
                      </tr>

                      {/* Contenido del Accordion */}
                      {isOpen && (
                        <tr key={`accordion-${shipmentId}`}>
                          <td
                            colSpan={6}
                            style={{
                              padding: 0,
                              borderTop: "3px solid #1F2937",
                            }}
                          >
                            <div className="accordion-content">
                              {/* Timeline Visual encima de los tabs */}
                              <div className="accordion-timeline-section">
                                <ShipmentTimeline shipment={shipment} />
                              </div>

                              {/* Tabs horizontales */}
                              <div className="tabs-container">
                                <button
                                  className={`tab-button ${activeTabIndex === 0 ? "active" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab(shipmentId, 0);
                                  }}
                                >
                                  Información General
                                </button>
                                <button
                                  className={`tab-button ${activeTabIndex === 5 ? "active" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab(shipmentId, 5);
                                  }}
                                >
                                  Documentos
                                </button>
                                <button
                                  className={`tab-button ${activeTabIndex === 1 ? "active" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab(shipmentId, 1);
                                  }}
                                >
                                  Origen y Destino
                                </button>
                                {shipment.commodities &&
                                  shipment.commodities.length > 0 && (
                                    <button
                                      className={`tab-button ${activeTabIndex === 2 ? "active" : ""}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab(shipmentId, 2);
                                      }}
                                    >
                                      Carga
                                    </button>
                                  )}
                                {shipment.subShipments &&
                                  shipment.subShipments.length > 0 && (
                                    <button
                                      className={`tab-button ${activeTabIndex === 3 ? "active" : ""}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab(shipmentId, 3);
                                      }}
                                    >
                                      Sub-Envíos ({shipment.subShipments.length}
                                      )
                                    </button>
                                  )}
                                {shipment.notes && (
                                  <button
                                    className={`tab-button ${activeTabIndex === 4 ? "active" : ""}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab(shipmentId, 4);
                                    }}
                                  >
                                    Notas
                                  </button>
                                )}
                              </div>

                              {/* Contenido de los tabs */}
                              <div className="tab-content">
                                {/* Tab 0: Información General */}
                                {activeTabIndex === 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "12px",
                                    }}
                                  >
                                    <InfoField
                                      label="Número de Envío"
                                      value={shipment.number}
                                    />
                                    <InfoField
                                      label="Waybill"
                                      value={shipment.waybillNumber}
                                    />
                                    <InfoField
                                      label="Referencia Cliente"
                                      value={shipment.customerReference}
                                    />
                                    <InfoField
                                      label="Número de Booking"
                                      value={shipment.bookingNumber}
                                    />
                                    <InfoField
                                      label="Carrier"
                                      value={shipment.carrier?.name}
                                      fullWidth
                                    />
                                    <InfoField
                                      label="Vuelo"
                                      value={shipment.flight}
                                    />
                                    <InfoField
                                      label="Aeropuerto Salida"
                                      value={shipment.airportOfDeparture}
                                    />
                                    <InfoField
                                      label="Aeropuerto Llegada"
                                      value={shipment.airportOfArrival}
                                    />
                                    <InfoField
                                      label="Fecha Salida"
                                      value={
                                        shipment.departure
                                          ? formatDate(shipment.departure)
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
                                )}

                                {/* Tab 1: Origen y Destino */}
                                {activeTabIndex === 1 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "12px",
                                    }}
                                  >
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
                                      label="Consignatario"
                                      value={shipment.consignee?.name}
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
                                      value={shipment.destinationAgent?.name}
                                    />
                                  </div>
                                )}

                                {/* Tab 2: Carga y Commodities */}
                                {activeTabIndex === 2 &&
                                  shipment.commodities &&
                                  shipment.commodities.length > 0 && (
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: "12px",
                                          marginBottom: "16px",
                                        }}
                                      >
                                        <InfoField
                                          label="Descripción de Carga"
                                          value={shipment.cargoDescription}
                                          fullWidth
                                        />
                                        <InfoField
                                          label="Marcas de Carga"
                                          value={shipment.cargoMarks}
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
                                        commodities={shipment.commodities}
                                      />
                                    </div>
                                  )}

                                {/* Tab 3: Sub-Shipments */}
                                {activeTabIndex === 3 &&
                                  shipment.subShipments &&
                                  shipment.subShipments.length > 0 && (
                                    <SubShipmentsList
                                      subShipments={shipment.subShipments}
                                    />
                                  )}

                                {/* Tab 4: Notas */}
                                {activeTabIndex === 4 && shipment.notes && (
                                  <div
                                    style={{
                                      padding: "12px",
                                      backgroundColor: "#fffbeb",
                                      borderRadius: "6px",
                                      border: "1px solid #fde047",
                                      color: "#713f12",
                                      fontSize: "0.875rem",
                                      whiteSpace: "pre-wrap",
                                      lineHeight: "1.6",
                                    }}
                                  >
                                    {shipment.notes}
                                  </div>
                                )}

                                {/* Tab 5: Documentos */}
                                {activeTabIndex === 5 && (
                                  <div style={{ padding: "12px" }}>
                                    <DocumentosSectionAir
                                      shipmentId={shipmentId}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer de la tabla */}
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
              }}
            >
              Mostrando{" "}
              <strong style={{ color: "#1f2937" }}>
                {displayedShipments.length}
              </strong>{" "}
              envíos
              {!hasMoreShipments && <span> (todos cargados)</span>}
            </div>
            {hasMoreShipments && !loadingMore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  loadMoreShipments();
                }}
                style={{
                  backgroundColor: "white",
                  color: "#3b82f6",
                  border: "1px solid #3b82f6",
                  borderRadius: "6px",
                  padding: "6px 16px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.color = "#3b82f6";
                }}
              >
                Cargar más
              </button>
            )}
            {loadingMore && (
              <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                Cargando...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalles MEJORADO */}
      {showModal && selectedShipment && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            overflowY: "auto",
            animation: "fadeIn 0.3s ease-in-out",
          }}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded"
            style={{
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "24px",
                color: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <h5
                    style={{
                      margin: 0,
                      fontSize: "1.3rem",
                      fontWeight: "700",
                      marginBottom: "4px",
                    }}
                  >
                    Air-Shipment #
                    {selectedShipment.number || selectedShipment.id || "N/A"}
                  </h5>
                  {selectedShipment.waybillNumber && (
                    <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                      Waybill: {selectedShipment.waybillNumber}
                    </div>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    borderRadius: "6px",
                    width: "32px",
                    height: "32px",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "white",
                    lineHeight: 1,
                    padding: 0,
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.3)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.2)")
                  }
                >
                  ×
                </button>
              </div>
            </div>

            {/* Contenido del Modal con Scroll */}
            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {/* Timeline Visual */}
              <ShipmentTimeline shipment={selectedShipment} />

              {/* Información en Secciones Colapsables */}

              {/* Información General */}
              <CollapsibleSection
                title="Información General"
                defaultOpen={true}
                icon="📋"
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <InfoField
                    label="Número de Envío"
                    value={selectedShipment.number}
                  />
                  <InfoField
                    label="Waybill"
                    value={selectedShipment.waybillNumber}
                  />
                  <InfoField
                    label="Referencia Cliente"
                    value={selectedShipment.customerReference}
                  />
                  <InfoField
                    label="Número de Booking"
                    value={selectedShipment.bookingNumber}
                  />
                  <InfoField
                    label="Carrier"
                    value={selectedShipment.carrier?.name}
                    fullWidth
                  />
                  <InfoField label="Vuelo" value={selectedShipment.flight} />
                  <InfoField
                    label="Aeropuerto Salida"
                    value={selectedShipment.airportOfDeparture}
                  />
                  <InfoField
                    label="Aeropuerto Llegada"
                    value={selectedShipment.airportOfArrival}
                  />
                  <InfoField
                    label="Fecha Salida"
                    value={
                      selectedShipment.departure
                        ? formatDate(selectedShipment.departure)
                        : null
                    }
                  />
                  <InfoField
                    label="Fecha Llegada"
                    value={
                      selectedShipment.arrival
                        ? formatDate(selectedShipment.arrival)
                        : null
                    }
                  />
                </div>
              </CollapsibleSection>

              {/* Origen y Destino */}
              <CollapsibleSection
                title="Origen y Destino"
                defaultOpen={true}
                icon="🌍"
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  <InfoField
                    label="Remitente (Shipper)"
                    value={selectedShipment.shipper?.name}
                    fullWidth
                  />
                  <InfoField
                    label="Dirección Remitente"
                    value={selectedShipment.shipperAddress}
                    fullWidth
                  />
                  <InfoField
                    label="Consignatario"
                    value={selectedShipment.consignee?.name}
                    fullWidth
                  />
                  <InfoField
                    label="Dirección Consignatario"
                    value={selectedShipment.consigneeAddress}
                    fullWidth
                  />
                  <InfoField
                    label="Notify Party"
                    value={
                      selectedShipment.notifyParty?.name ||
                      selectedShipment.notifyPartyAddress
                    }
                    fullWidth
                  />
                  <InfoField
                    label="Agente Forwarding"
                    value={selectedShipment.forwardingAgent?.name}
                  />
                  <InfoField
                    label="Agente Destino"
                    value={selectedShipment.destinationAgent?.name}
                  />
                </div>
              </CollapsibleSection>

              {/* Carga y Commodities */}
              {selectedShipment.commodities &&
                selectedShipment.commodities.length > 0 && (
                  <CollapsibleSection
                    title="Carga"
                    defaultOpen={false}
                    icon="📦"
                  >
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "12px",
                          marginBottom: "16px",
                        }}
                      >
                        <InfoField
                          label="Descripción de Carga"
                          value={selectedShipment.cargoDescription}
                          fullWidth
                        />
                        <InfoField
                          label="Marcas de Carga"
                          value={selectedShipment.cargoMarks}
                          fullWidth
                        />
                        <InfoField
                          label="Piezas Manifestadas"
                          value={selectedShipment.manifestedPieces}
                        />
                        <InfoField
                          label="Peso Manifestado"
                          value={
                            selectedShipment.manifestedWeight
                              ? `${selectedShipment.manifestedWeight} kg`
                              : null
                          }
                        />
                        <InfoField
                          label="Pallets"
                          value={
                            selectedShipment.pallets ||
                            selectedShipment.manifestedPallets
                          }
                        />
                        <InfoField
                          label="Carga Peligrosa"
                          value={selectedShipment.hazardous}
                        />
                      </div>
                    </div>
                    <CommoditiesSection
                      commodities={selectedShipment.commodities}
                    />
                  </CollapsibleSection>
                )}

              {/* Sub-Shipments */}
              {selectedShipment.subShipments &&
                selectedShipment.subShipments.length > 0 && (
                  <CollapsibleSection
                    title={`Sub-Envíos (${selectedShipment.subShipments.length})`}
                    defaultOpen={false}
                    icon="📦"
                  >
                    <SubShipmentsList
                      subShipments={selectedShipment.subShipments}
                    />
                  </CollapsibleSection>
                )}

              {/* Notas Adicionales */}
              {selectedShipment.notes && (
                <CollapsibleSection title="Notas" defaultOpen={false} icon="📝">
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "6px",
                      color: "#1f2937",
                      fontSize: "0.875rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedShipment.notes}
                  </div>
                </CollapsibleSection>
              )}
            </div>

            {/* Footer del Modal */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                backgroundColor: "#f9fafb",
              }}
            >
              <button
                onClick={closeModal}
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 24px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-1px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío - Sin resultados de búsqueda */}
      {displayedShipments.length === 0 &&
        !loading &&
        shipments.length > 0 &&
        showingAll && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                fontSize: "4rem",
                marginBottom: "16px",
                opacity: 0.5,
              }}
            >
              📋
            </div>
            <h5
              style={{
                color: "#1f2937",
                marginBottom: "8px",
                fontSize: "1.2rem",
              }}
            >
              No se encontraron air-shipments
            </h5>
            <p style={{ color: "#6b7280", marginBottom: "24px" }}>
              No hay air-shipments que coincidan con tu búsqueda
            </p>
            <button
              onClick={clearSearch}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
                boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
              }}
            >
              Ver los últimos 10 air-shipments
            </button>
          </div>
        )}

      {/* Estado vacío - Sin air-shipments cargados */}
      {shipments.length === 0 && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "16px",
              opacity: 0.5,
            }}
          >
            ✈️
          </div>
          <h5
            style={{
              color: "#1f2937",
              marginBottom: "8px",
              fontSize: "1.2rem",
            }}
          >
            No hay air-shipments disponibles
          </h5>
          <p style={{ color: "#6b7280", marginBottom: "24px" }}>
            No se encontraron air-shipments para tu cuenta
          </p>
          {hasMoreShipments && (
            <button
              onClick={() => loadMoreShipments()}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
                boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
              }}
            >
              Cargar más páginas
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default AirShipmentsView;
