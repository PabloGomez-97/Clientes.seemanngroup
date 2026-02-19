import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { COLORS, GRADIENTS } from "../../themes/reportTheme";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface Shipment {
  id?: number;
  number?: string;
  customerReference?: string;
  waybillNumber?: string;
  bookingNumber?: string;
  currentFlow?: string;
  departure?: string;
  arrival?: string;
  createdOn?: string;
  updateOn?: string;
  origin?: string;
  destination?: string;
  serviceType?: string;
  modeOfTransportation?: string;
  lastEvent?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightValue?: number;
  totalCargo_VolumeWeightValue?: number;
  containerNumber?: string;
  division?: string;
  salesRep?: string;
  shipper?: string;
  consignee?: string;
  [key: string]: any;
}

type TabType = "general" | "routes" | "performance" | "recent";
type ModalType =
  | "total"
  | "air"
  | "sea"
  | "pieces"
  | "weight"
  | "volume"
  | "transit"
  | "avgWeight"
  | "containers"
  | "divisions"
  | "reps"
  | null;

const styles = {
  metricCard: {
    borderRadius: "12px",
    border: "none",
    transition: "all 0.3s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    cursor: "pointer",
  },
  chartCard: {
    borderRadius: "12px",
    border: `1px solid ${COLORS.border}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  chartTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: "1rem",
  },
};

function ShipmentsView() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, activeUsername } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreShipments, setHasMoreShipments] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Fetch shipments usando el nuevo endpoint con ConsigneeName
  const fetchShipments = async (page: number = 1, append: boolean = false) => {
    if (!accessToken) {
      setError("Debes ingresar un token primero");
      return;
    }

    if (!activeUsername) {
      setError("No se pudo obtener el nombre de usuario");
      return;
    }

    // Si es la primera página, mostrar loading completo
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      // Construir URL con query parameters
      const queryParams = new URLSearchParams({
        ConsigneeName: activeUsername,
        Page: page.toString(),
        ItemsPerPage: "50",
        SortBy: "newest",
      });

      const response = await fetch(
        `https://api.linbis.com/shipments/all?${queryParams}`,
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
          throw new Error("Token inválido o expirado");
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const shipmentsArray: Shipment[] = Array.isArray(data) ? data : [];

      // Ordenar los shipments por createdOn (más nueva primero)
      const sortedShipments = shipmentsArray.sort((a, b) => {
        const dateA = new Date(a.createdOn || 0);
        const dateB = new Date(b.createdOn || 0);
        return dateB.getTime() - dateA.getTime(); // Descendente (más nueva primero)
      });

      // Si recibimos menos de 50 shipments, no hay más páginas
      setHasMoreShipments(shipmentsArray.length === 50);

      if (append && page > 1) {
        // Agregar los nuevos shipments a los existentes y re-ordenar todo
        const combined = [...shipments, ...sortedShipments];
        const resorted = combined.sort((a, b) => {
          const dateA = new Date(a.createdOn || 0);
          const dateB = new Date(b.createdOn || 0);
          return dateB.getTime() - dateA.getTime();
        });
        setShipments(resorted);

        // Guardar en caché con el username del usuario
        const cacheKey = `shipmentsCache_${activeUsername}`;
        localStorage.setItem(cacheKey, JSON.stringify(resorted));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      } else {
        // Primera carga: reemplazar todo
        setShipments(sortedShipments);

        // Guardar en caché con el username del usuario
        const cacheKey = `shipmentsCache_${activeUsername}`;
        localStorage.setItem(cacheKey, JSON.stringify(sortedShipments));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      }

      console.log(
        `Página ${page}: ${shipmentsArray.length} shipments cargados`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      console.error("Error completo:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      console.log("No hay token disponible todavía");
      return;
    }

    if (!activeUsername) {
      console.log("No hay usuario disponible todavía");
      return;
    }

    // Intentar cargar desde caché primero
    const cacheKey = `shipmentsCache_${activeUsername}`;
    const cachedShipments = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);

    if (cachedShipments && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000; // 1 hora en milisegundos
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);

      if (cacheAge < oneHour) {
        // El caché es válido (menos de 1 hora)
        const parsed = JSON.parse(cachedShipments);
        setShipments(parsed);

        // Restaurar la página actual
        if (cachedPage) {
          setCurrentPage(parseInt(cachedPage));
        }

        // Verificar si hay más shipments disponibles
        const lastPageSize = parsed.length % 50;
        setHasMoreShipments(lastPageSize === 0 && parsed.length >= 50);

        setLoading(false);
        console.log(
          "✅ Cargando desde caché - datos guardados hace",
          Math.floor(cacheAge / 60000),
          "minutos",
        );
        console.log(`🚢 ${parsed.length} shipments en caché`);
        return;
      } else {
        // El caché expiró, limpiarlo
        console.log("🗑️ Caché expirado, limpiando...");
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
        localStorage.removeItem(`${cacheKey}_page`);
      }
    }

    // No hay caché válido, cargar desde la API
    setCurrentPage(1);
    fetchShipments(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeUsername]);

  // Función para cargar más shipments (paginación)
  const loadMoreShipments = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchShipments(nextPage, true);
  };

  // Función para refrescar datos (limpiar caché y recargar)
  const refreshShipments = () => {
    if (!activeUsername) return;

    // Limpiar caché del usuario actual
    const cacheKey = `shipmentsCache_${activeUsername}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    localStorage.removeItem(`${cacheKey}_page`);

    // Recargar desde la API
    setCurrentPage(1);
    setShipments([]);
    fetchShipments(1, false);

    console.log("🔄 Datos refrescados desde la API");
  };

  // Filtered shipments by date range
  const filteredShipments = useMemo(() => {
    if (!startDate && !endDate) return shipments;

    return shipments.filter((shipment) => {
      const shipmentDate = new Date(shipment.createdOn || 0);

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return shipmentDate >= start && shipmentDate <= end;
      } else if (startDate) {
        return shipmentDate >= new Date(startDate);
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return shipmentDate <= end;
      }

      return true;
    });
  }, [shipments, startDate, endDate]);

  // Helper to detect air shipments
  const isAirShipment = (mode: string | undefined): boolean => {
    if (!mode) return false;
    const modeStr = mode.toLowerCase();
    return modeStr.includes("40 - air") || modeStr.includes("41 - air");
  };

  // Helper to detect sea shipments
  const isSeaShipment = (mode: string | undefined): boolean => {
    if (!mode) return false;
    const modeStr = mode.toLowerCase();
    return modeStr.includes("10 - vessel") || modeStr.includes("11 - vessel");
  };

  // KPIs calculation
  const kpis = useMemo(() => {
    const total = filteredShipments.length;

    const air = filteredShipments.filter((s) =>
      isAirShipment(s.modeOfTransportation),
    ).length;
    const sea = filteredShipments.filter((s) =>
      isSeaShipment(s.modeOfTransportation),
    ).length;

    const totalPieces = filteredShipments.reduce(
      (sum, s) => sum + (s.totalCargo_Pieces || 0),
      0,
    );
    const totalWeight = filteredShipments.reduce(
      (sum, s) => sum + (s.totalCargo_WeightValue || 0),
      0,
    );
    const totalVolume = filteredShipments.reduce(
      (sum, s) => sum + (s.totalCargo_VolumeWeightValue || 0),
      0,
    );

    const shipmentsWithTransit = filteredShipments.filter(
      (s) => s.departure && s.arrival,
    );
    const avgTransitDays =
      shipmentsWithTransit.length > 0
        ? shipmentsWithTransit.reduce((sum, s) => {
            const dep = new Date(s.departure!);
            const arr = new Date(s.arrival!);
            const days =
              (arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / shipmentsWithTransit.length
        : 0;

    const avgWeight = total > 0 ? totalWeight / total : 0;

    // New metrics
    const containersCount = filteredShipments.filter(
      (s) => s.containerNumber && s.containerNumber !== "",
    ).length;
    const uniqueDivisions = new Set(
      filteredShipments.map((s) => s.division).filter((d) => d),
    ).size;
    const uniqueReps = new Set(
      filteredShipments.map((s) => s.salesRep).filter((r) => r),
    ).size;

    return {
      total,
      air,
      sea,
      totalPieces,
      totalWeight,
      totalVolume,
      avgTransitDays,
      avgWeight,
      containersCount,
      uniqueDivisions,
      uniqueReps,
    };
  }, [filteredShipments]);

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { air: number; sea: number }>();

    filteredShipments.forEach((shipment) => {
      const date = new Date(shipment.createdOn || 0);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const isAir = isAirShipment(shipment.modeOfTransportation);
      const isSea = isSeaShipment(shipment.modeOfTransportation);

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { air: 0, sea: 0 });
      }

      const current = monthMap.get(monthKey)!;
      if (isAir) {
        current.air++;
      } else if (isSea) {
        current.sea++;
      }
    });

    const sortedData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("es-ES", {
          month: "short",
          year: "numeric",
        }),
        Aéreos: data.air,
        Marítimos: data.sea,
        Total: data.air + data.sea,
      }));

    return sortedData;
  }, [filteredShipments]);

  // Pie chart data
  const pieData = [
    { name: "Aéreos", value: kpis.air, color: COLORS.air },
    { name: "Marítimos", value: kpis.sea, color: COLORS.ocean },
  ];

  // Helper to shorten route names
  const shortenRouteName = (route: string): string => {
    const parts = route.split(" → ");
    if (parts.length !== 2) return route;

    const shortenLocation = (location: string): string => {
      // Remove common airport/port suffixes
      let short = location
        .replace(/International Airport/gi, "")
        .replace(/Airport/gi, "")
        .replace(/Arturo Merino Benitez/gi, "")
        .replace(/Executive\/Airport/gi, "")
        .replace(/O'Hare/gi, "")
        .trim();

      // If still too long, take first 25 chars
      if (short.length > 25) {
        short = short.substring(0, 25) + "...";
      }

      return short;
    };

    return `${shortenLocation(parts[0])} → ${shortenLocation(parts[1])}`;
  };

  // Top routes data with shortened names
  const topRoutes = useMemo(() => {
    const routeMap = new Map<string, number>();

    filteredShipments.forEach((shipment) => {
      if (shipment.origin && shipment.destination) {
        const route = `${shipment.origin} → ${shipment.destination}`;
        routeMap.set(route, (routeMap.get(route) || 0) + 1);
      }
    });

    return Array.from(routeMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([route, count]) => ({
        route: shortenRouteName(route),
        fullRoute: route,
        count,
      }));
  }, [filteredShipments]);

  // Top destinations
  const topDestinations = useMemo(() => {
    const destMap = new Map<string, number>();

    filteredShipments.forEach((shipment) => {
      if (shipment.destination) {
        destMap.set(
          shipment.destination,
          (destMap.get(shipment.destination) || 0) + 1,
        );
      }
    });

    return Array.from(destMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([destination, count]) => ({ destination, count }));
  }, [filteredShipments]);

  // Top shippers
  const topShippers = useMemo(() => {
    const shipperMap = new Map<string, number>();

    filteredShipments.forEach((shipment) => {
      if (shipment.shipper) {
        shipperMap.set(
          shipment.shipper,
          (shipperMap.get(shipment.shipper) || 0) + 1,
        );
      }
    });

    return Array.from(shipperMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([shipper, count]) => ({ shipper, count }));
  }, [filteredShipments]);

  // Performance by transport mode
  const performanceByMode = useMemo(() => {
    const airShipments = filteredShipments.filter((s) =>
      isAirShipment(s.modeOfTransportation),
    );
    const seaShipments = filteredShipments.filter((s) =>
      isSeaShipment(s.modeOfTransportation),
    );

    const calcAvgTransit = (ships: Shipment[]) => {
      const withTransit = ships.filter((s) => s.departure && s.arrival);
      if (withTransit.length === 0) return 0;

      return (
        withTransit.reduce((sum, s) => {
          const dep = new Date(s.departure!);
          const arr = new Date(s.arrival!);
          const days = (arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / withTransit.length
      );
    };

    const calcAvgWeight = (ships: Shipment[]) => {
      if (ships.length === 0) return 0;
      const totalWeight = ships.reduce(
        (sum, s) => sum + (s.totalCargo_WeightValue || 0),
        0,
      );
      return totalWeight / ships.length;
    };

    return {
      air: {
        avgTransit: calcAvgTransit(airShipments),
        avgWeight: calcAvgWeight(airShipments),
        count: airShipments.length,
      },
      sea: {
        avgTransit: calcAvgTransit(seaShipments),
        avgWeight: calcAvgWeight(seaShipments),
        count: seaShipments.length,
      },
    };
  }, [filteredShipments]);

  // Recent shipments
  const recentShipments = useMemo(() => {
    return filteredShipments.slice(0, 5);
  }, [filteredShipments]);

  // Year comparison
  const yearComparison = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const currentYearShipments = filteredShipments.filter((s) => {
      const year = new Date(s.createdOn || 0).getFullYear();
      return year === currentYear;
    });

    const previousYearShipments = filteredShipments.filter((s) => {
      const year = new Date(s.createdOn || 0).getFullYear();
      return year === previousYear;
    });

    const growth =
      previousYearShipments.length > 0
        ? ((currentYearShipments.length - previousYearShipments.length) /
            previousYearShipments.length) *
          100
        : 0;

    return {
      current: currentYearShipments.length,
      previous: previousYearShipments.length,
      growth,
    };
  }, [filteredShipments]);

  // Clear filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Número",
      "Fecha",
      "Origen",
      "Destino",
      "Modo",
      "Piezas",
      "Peso (kg)",
      "Volumen",
    ];
    const rows = filteredShipments.map((s) => [
      s.number || s.id || "",
      new Date(s.createdOn || "").toLocaleDateString("es-ES"),
      s.origin || "",
      s.destination || "",
      s.modeOfTransportation || "",
      s.totalCargo_Pieces || 0,
      s.totalCargo_WeightValue || 0,
      s.totalCargo_VolumeWeightValue || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `reporte_operacional_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Get modal data based on type
  const getModalData = (type: ModalType) => {
    switch (type) {
      case "total":
        return filteredShipments.slice(0, 20);
      case "air":
        return filteredShipments
          .filter((s) => isAirShipment(s.modeOfTransportation))
          .slice(0, 20);
      case "sea":
        return filteredShipments
          .filter((s) => isSeaShipment(s.modeOfTransportation))
          .slice(0, 20);
      case "pieces":
        return [...filteredShipments]
          .filter((s) => s.totalCargo_Pieces && s.totalCargo_Pieces > 0)
          .sort(
            (a, b) => (b.totalCargo_Pieces || 0) - (a.totalCargo_Pieces || 0),
          )
          .slice(0, 20);
      case "weight":
        return [...filteredShipments]
          .filter(
            (s) => s.totalCargo_WeightValue && s.totalCargo_WeightValue > 0,
          )
          .sort(
            (a, b) =>
              (b.totalCargo_WeightValue || 0) - (a.totalCargo_WeightValue || 0),
          )
          .slice(0, 20);
      case "volume":
        return [...filteredShipments]
          .filter(
            (s) =>
              s.totalCargo_VolumeWeightValue &&
              s.totalCargo_VolumeWeightValue > 0,
          )
          .sort(
            (a, b) =>
              (b.totalCargo_VolumeWeightValue || 0) -
              (a.totalCargo_VolumeWeightValue || 0),
          )
          .slice(0, 20);
      case "containers":
        return filteredShipments
          .filter((s) => s.containerNumber && s.containerNumber !== "")
          .slice(0, 20);
      default:
        return [];
    }
  };

  // Get modal title
  const getModalTitle = (type: ModalType): string => {
    const titles: Record<string, string> = {
      total: "Envíos Totales",
      air: "Envíos Aéreos",
      sea: "Envíos Marítimos",
      pieces: "Top Envíos por Piezas",
      weight: "Top Envíos por Peso",
      volume: "Top Envíos por Volumen",
      containers: "Envíos con Contenedor",
    };
    return titles[type || ""] || "";
  };

  // Render modal
  const renderModal = () => {
    if (!activeModal) return null;

    const data = getModalData(activeModal);

    return (
      <div
        onClick={() => setActiveModal(null)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            maxWidth: "900px",
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            animation: "slideUp 0.3s ease",
            overflow: "hidden",
          }}
        >
          {/* Modal header */}
          <div
            style={{
              background: GRADIENTS.purple,
              padding: "24px",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>
              {getModalTitle(activeModal)}
            </h3>
            <button
              onClick={() => setActiveModal(null)}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                border: "none",
                borderRadius: "6px",
                width: "32px",
                height: "32px",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "white",
                padding: 0,
              }}
            >
              ×
            </button>
          </div>

          {/* Modal body */}
          <div
            style={{
              padding: "24px",
              overflowY: "auto",
              flex: 1,
            }}
          >
            <div className="table-responsive">
              <table className="table table-hover">
                <thead style={{ backgroundColor: COLORS.tableHeaderBg }}>
                  <tr>
                    <th
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: COLORS.textSecondary,
                      }}
                    >
                      N° OPERACIÓN
                    </th>
                    <th
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: COLORS.textSecondary,
                      }}
                    >
                      ORIGEN
                    </th>
                    <th
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: COLORS.textSecondary,
                      }}
                    >
                      DESTINO
                    </th>
                    <th
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: COLORS.textSecondary,
                      }}
                    >
                      PIEZAS
                    </th>
                    <th
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: COLORS.textSecondary,
                      }}
                    >
                      PESO (KG)
                    </th>
                    <th
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: COLORS.textSecondary,
                      }}
                    >
                      FECHA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((shipment, index) => (
                    <tr key={shipment.id || index}>
                      <td
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: COLORS.textPrimary,
                        }}
                      >
                        {shipment.number || `OP-${shipment.id}`}
                      </td>
                      <td
                        style={{
                          fontSize: "0.875rem",
                          color: COLORS.textSecondary,
                        }}
                      >
                        {shipment.origin || "N/A"}
                      </td>
                      <td
                        style={{
                          fontSize: "0.875rem",
                          color: COLORS.textSecondary,
                        }}
                      >
                        {shipment.destination || "N/A"}
                      </td>
                      <td
                        style={{
                          fontSize: "0.875rem",
                          color: COLORS.textSecondary,
                        }}
                      >
                        {shipment.totalCargo_Pieces || 0}
                      </td>
                      <td
                        style={{
                          fontSize: "0.875rem",
                          color: COLORS.textSecondary,
                        }}
                      >
                        {formatNumber(shipment.totalCargo_WeightValue || 0)}
                      </td>
                      <td
                        style={{
                          fontSize: "0.875rem",
                          color: COLORS.textSecondary,
                        }}
                      >
                        {formatDate(shipment.createdOn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length === 0 && (
              <div className="text-center py-4">
                <p style={{ color: COLORS.textSecondary }}>
                  No hay datos disponibles
                </p>
              </div>
            )}
            {data.length === 20 && (
              <div className="text-center mt-3">
                <small style={{ color: COLORS.textSecondary }}>
                  Mostrando los primeros 20 resultados
                </small>
              </div>
            )}
          </div>

          {/* Modal footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.background,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setActiveModal(null)}
              className="btn"
              style={{
                background: GRADIENTS.purple,
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontWeight: "600",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div
        style={{
          background: GRADIENTS.purple,
          padding: "32px 24px",
          marginBottom: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(102, 126, 234, 0.3)",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: "700",
                marginBottom: "8px",
              }}
            >
              📊 Reportería Operacional
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: "1rem" }}>
              Análisis completo de tus operaciones de envío
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                fontWeight: "600",
              }}
            >
              🔍 {showFilters ? "Ocultar" : "Filtros"}
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredShipments.length === 0}
              className="btn"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                fontWeight: "600",
                opacity: filteredShipments.length === 0 ? 0.5 : 1,
              }}
            >
              📥 Exportar CSV
            </button>
            <button
              onClick={refreshShipments}
              disabled={loading}
              className="btn"
              style={{
                backgroundColor: "white",
                color: COLORS.primary,
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Actualizando...
                </>
              ) : (
                <>🔄 Actualizar</>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div
            style={{
              marginTop: "24px",
              padding: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-4">
                <label
                  className="form-label"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    opacity: 0.9,
                  }}
                >
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                  }}
                />
              </div>
              <div className="col-12 col-md-4">
                <label
                  className="form-label"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    opacity: 0.9,
                  }}
                >
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                  }}
                />
              </div>
              <div className="col-12 col-md-4">
                <button
                  onClick={clearFilters}
                  className="btn w-100"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    fontWeight: "600",
                  }}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-5">
          <div
            className="spinner-border text-primary"
            style={{ width: "3rem", height: "3rem" }}
            role="status"
          >
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3" style={{ color: COLORS.textSecondary }}>
            Cargando datos...
          </p>
        </div>
      )}

      {/* Main content */}
      {!loading && shipments.length > 0 && (
        <div style={{ paddingTop: "1rem" }}>
          {/* Cards de Métricas */}
          <div className="row g-4 mb-4">
            {/* Total Shipments */}
            <div className="col-12 col-sm-6 col-lg-4">
              <div
                className="card"
                style={{
                  ...styles.metricCard,
                  background: GRADIENTS.purple,
                  color: "white",
                }}
                onClick={() => setActiveModal("total")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(102, 102, 234, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.06)";
                }}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p
                        className="mb-1"
                        style={{
                          opacity: 0.9,
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        Envíos Totales
                      </p>
                      <h2
                        className="mb-0 fw-bold"
                        style={{ fontSize: "2.5rem" }}
                      >
                        {formatNumber(kpis.total)}
                      </h2>
                      {yearComparison.growth !== 0 && (
                        <div
                          style={{
                            fontSize: "0.875rem",
                            opacity: 0.9,
                            marginTop: "0.5rem",
                          }}
                        >
                          {yearComparison.growth > 0 ? "↑" : "↓"}{" "}
                          {Math.abs(yearComparison.growth).toFixed(1)}% vs año
                          anterior
                        </div>
                      )}
                    </div>
                    <div
                      className="rounded-circle p-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        fontSize: "1.5rem",
                      }}
                    >
                      📦
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Air Shipments */}
            <div className="col-12 col-sm-6 col-lg-4">
              <div
                className="card"
                style={{
                  ...styles.metricCard,
                  background: GRADIENTS.blue,
                  color: "white",
                }}
                onClick={() => setActiveModal("air")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(59, 130, 246, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.06)";
                }}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p
                        className="mb-1"
                        style={{
                          opacity: 0.9,
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        Envíos Aéreos
                      </p>
                      <h2
                        className="mb-0 fw-bold"
                        style={{ fontSize: "2.5rem" }}
                      >
                        {formatNumber(kpis.air)}
                      </h2>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          opacity: 0.9,
                          marginTop: "0.5rem",
                        }}
                      >
                        {kpis.total > 0
                          ? ((kpis.air / kpis.total) * 100).toFixed(1)
                          : 0}
                        % del total
                      </div>
                    </div>
                    <div
                      className="rounded-circle p-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        fontSize: "1.5rem",
                      }}
                    >
                      ✈️
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sea Shipments */}
            <div className="col-12 col-sm-6 col-lg-4">
              <div
                className="card"
                style={{
                  ...styles.metricCard,
                  background: GRADIENTS.cyan,
                  color: "white",
                }}
                onClick={() => setActiveModal("sea")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(6, 182, 212, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.06)";
                }}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p
                        className="mb-1"
                        style={{
                          opacity: 0.9,
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        Envíos Marítimos
                      </p>
                      <h2
                        className="mb-0 fw-bold"
                        style={{ fontSize: "2.5rem" }}
                      >
                        {formatNumber(kpis.sea)}
                      </h2>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          opacity: 0.9,
                          marginTop: "0.5rem",
                        }}
                      >
                        {kpis.total > 0
                          ? ((kpis.sea / kpis.total) * 100).toFixed(1)
                          : 0}
                        % del total
                      </div>
                    </div>
                    <div
                      className="rounded-circle p-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        fontSize: "1.5rem",
                      }}
                    >
                      🚢
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Pieces */}
            <div className="col-12 col-sm-6 col-lg-4">
              <div
                className="card"
                style={{
                  ...styles.metricCard,
                  background: GRADIENTS.pink,
                  color: "white",
                }}
                onClick={() => setActiveModal("pieces")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(236, 72, 153, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.06)";
                }}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p
                        className="mb-1"
                        style={{
                          opacity: 0.9,
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        Total Piezas
                      </p>
                      <h2
                        className="mb-0 fw-bold"
                        style={{ fontSize: "2.5rem" }}
                      >
                        {formatNumber(kpis.totalPieces)}
                      </h2>
                    </div>
                    <div
                      className="rounded-circle p-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        fontSize: "1.5rem",
                      }}
                    >
                      📊
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Weight */}
            <div className="col-12 col-sm-6 col-lg-4">
              <div
                className="card"
                style={{
                  ...styles.metricCard,
                  background: GRADIENTS.orange,
                  color: "white",
                }}
                onClick={() => setActiveModal("weight")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(245, 158, 11, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.06)";
                }}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p
                        className="mb-1"
                        style={{
                          opacity: 0.9,
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        Peso Total (kg)
                      </p>
                      <h2
                        className="mb-0 fw-bold"
                        style={{ fontSize: "2.5rem" }}
                      >
                        {formatNumber(Math.round(kpis.totalWeight))}
                      </h2>
                    </div>
                    <div
                      className="rounded-circle p-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        fontSize: "1.5rem",
                      }}
                    >
                      ⚖️
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Volume */}
            <div className="col-12 col-sm-6 col-lg-4">
              <div
                className="card"
                style={{
                  ...styles.metricCard,
                  background: GRADIENTS.green,
                  color: "white",
                }}
                onClick={() => setActiveModal("volume")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(16, 185, 129, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.06)";
                }}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p
                        className="mb-1"
                        style={{
                          opacity: 0.9,
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        Volumen Total
                      </p>
                      <h2
                        className="mb-0 fw-bold"
                        style={{ fontSize: "2.5rem" }}
                      >
                        {formatNumber(Math.round(kpis.totalVolume))}
                      </h2>
                    </div>
                    <div
                      className="rounded-circle p-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        fontSize: "1.5rem",
                      }}
                    >
                      📐
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="card mb-4"
            style={{
              ...styles.chartCard,
              borderRadius: "12px 12px 0 0",
              marginBottom: 0,
            }}
          >
            <div className="card-body p-0">
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  padding: "16px 16px 0 16px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  flexWrap: "wrap",
                }}
              >
                {[
                  { id: "general", label: "📊 Análisis General" },
                  { id: "routes", label: "🗺️ Rutas y Destinos" },
                  { id: "performance", label: "⚡ Rendimiento" },
                  { id: "recent", label: "📅 Actividad Reciente" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className="btn"
                    style={{
                      padding: "12px 24px",
                      background:
                        activeTab === tab.id ? GRADIENTS.purple : "transparent",
                      color:
                        activeTab === tab.id ? "white" : COLORS.textSecondary,
                      border: "none",
                      borderRadius: "8px 8px 0 0",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      boxShadow:
                        activeTab === tab.id
                          ? "0 -2px 4px rgba(102, 126, 234, 0.2)"
                          : "none",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div
            className="card"
            style={{ ...styles.chartCard, borderRadius: "0 0 12px 12px" }}
          >
            <div className="card-body p-4">
              {/* General Tab */}
              {activeTab === "general" && (
                <div className="row g-4">
                  {/* Monthly Line Chart */}
                  <div className="col-12">
                    <h5 style={styles.chartTitle}>
                      📈 Tendencia de Envíos por Mes
                    </h5>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={COLORS.border}
                        />
                        <XAxis
                          dataKey="month"
                          stroke={COLORS.textSecondary}
                          style={{ fontSize: "0.75rem" }}
                        />
                        <YAxis
                          stroke={COLORS.textSecondary}
                          style={{ fontSize: "0.75rem" }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Aéreos"
                          stroke={COLORS.air}
                          strokeWidth={3}
                          dot={{ fill: COLORS.air, r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Marítimos"
                          stroke={COLORS.ocean}
                          strokeWidth={3}
                          dot={{ fill: COLORS.ocean, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="col-12 col-lg-6">
                    <h5 style={styles.chartTitle}>🍩 Distribución por Tipo</h5>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) =>
                            `${name}: ${value} (${((percent as number) * 100).toFixed(1)}%)`
                          }
                          outerRadius={90}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="col-12 col-lg-6">
                    <h5 style={styles.chartTitle}>
                      📊 Envíos Mensuales Apilados
                    </h5>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={COLORS.border}
                        />
                        <XAxis
                          dataKey="month"
                          stroke={COLORS.textSecondary}
                          style={{ fontSize: "0.75rem" }}
                        />
                        <YAxis
                          stroke={COLORS.textSecondary}
                          style={{ fontSize: "0.75rem" }}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="Aéreos"
                          stackId="a"
                          fill={COLORS.air}
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="Marítimos"
                          stackId="a"
                          fill={COLORS.ocean}
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Routes Tab */}
              {activeTab === "routes" && (
                <div className="row g-4">
                  <div className="col-12">
                    <h5 style={styles.chartTitle}>
                      🛤️ Top 10 Rutas Más Utilizadas
                    </h5>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart
                        data={topRoutes}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={COLORS.border}
                        />
                        <XAxis type="number" stroke={COLORS.textSecondary} />
                        <YAxis
                          type="category"
                          dataKey="route"
                          stroke={COLORS.textSecondary}
                          width={140}
                          style={{ fontSize: "0.75rem" }}
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              return (
                                <div
                                  style={{
                                    backgroundColor: "white",
                                    padding: "10px",
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "0.875rem",
                                      fontWeight: "600",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    {payload[0].payload.fullRoute}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.875rem",
                                      color: COLORS.textSecondary,
                                    }}
                                  >
                                    Envíos: {payload[0].value}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill={COLORS.primary}
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="col-12 col-md-6">
                    <h5 style={styles.chartTitle}>
                      🎯 Top 5 Destinos Más Frecuentes
                    </h5>
                    <div className="row g-3">
                      {topDestinations.map((dest, index) => (
                        <div key={index} className="col-12">
                          <div
                            className="d-flex justify-content-between align-items-center p-3"
                            style={{
                              backgroundColor: COLORS.background,
                              borderRadius: "8px",
                              border: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  background: GRADIENTS.purple,
                                  color: "white",
                                  fontWeight: "700",
                                }}
                              >
                                {index + 1}
                              </div>
                              <span
                                style={{
                                  fontWeight: "600",
                                  color: COLORS.textPrimary,
                                }}
                              >
                                {dest.destination}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: "700",
                                color: COLORS.primary,
                              }}
                            >
                              {dest.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <h5 style={styles.chartTitle}>📤 Top 5 Embarcadores</h5>
                    <div className="row g-3">
                      {topShippers.map((shipper, index) => (
                        <div key={index} className="col-12">
                          <div
                            className="d-flex justify-content-between align-items-center p-3"
                            style={{
                              backgroundColor: COLORS.background,
                              borderRadius: "8px",
                              border: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  background: GRADIENTS.blue,
                                  color: "white",
                                  fontWeight: "700",
                                }}
                              >
                                {index + 1}
                              </div>
                              <span
                                style={{
                                  fontWeight: "600",
                                  color: COLORS.textPrimary,
                                }}
                              >
                                {shipper.shipper}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: "700",
                                color: COLORS.air,
                              }}
                            >
                              {shipper.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === "performance" && (
                <div className="row g-4">
                  <div className="col-12">
                    <h5 style={styles.chartTitle}>
                      ⚡ Comparativa de Rendimiento
                    </h5>
                  </div>

                  <div className="col-12 col-md-6">
                    <div
                      className="p-4"
                      style={{
                        backgroundColor: "#eff6ff",
                        borderRadius: "12px",
                        border: `2px solid ${COLORS.air}`,
                      }}
                    >
                      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>
                        ✈️
                      </div>
                      <h5 style={{ color: COLORS.air, marginBottom: "16px" }}>
                        Transporte Aéreo
                      </h5>
                      <div className="row g-3">
                        <div className="col-12">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            TRÁNSITO PROMEDIO
                          </small>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: COLORS.air,
                            }}
                          >
                            {formatNumber(performanceByMode.air.avgTransit)}{" "}
                            días
                          </div>
                        </div>
                        <div className="col-12">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            PESO PROMEDIO
                          </small>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: COLORS.air,
                            }}
                          >
                            {formatNumber(performanceByMode.air.avgWeight)} kg
                          </div>
                        </div>
                        <div className="col-12">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            TOTAL ENVÍOS
                          </small>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: COLORS.air,
                            }}
                          >
                            {performanceByMode.air.count}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div
                      className="p-4"
                      style={{
                        backgroundColor: "#f0fdfa",
                        borderRadius: "12px",
                        border: `2px solid ${COLORS.ocean}`,
                      }}
                    >
                      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>
                        🚢
                      </div>
                      <h5 style={{ color: COLORS.ocean, marginBottom: "16px" }}>
                        Transporte Marítimo
                      </h5>
                      <div className="row g-3">
                        <div className="col-12">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            TRÁNSITO PROMEDIO
                          </small>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: COLORS.ocean,
                            }}
                          >
                            {formatNumber(performanceByMode.sea.avgTransit)}{" "}
                            días
                          </div>
                        </div>
                        <div className="col-12">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            PESO PROMEDIO
                          </small>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: COLORS.ocean,
                            }}
                          >
                            {formatNumber(performanceByMode.sea.avgWeight)} kg
                          </div>
                        </div>
                        <div className="col-12">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            TOTAL ENVÍOS
                          </small>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: COLORS.ocean,
                            }}
                          >
                            {performanceByMode.sea.count}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <h5 style={styles.chartTitle}>📅 Comparativa Año a Año</h5>
                    <div
                      className="p-4"
                      style={{
                        backgroundColor: COLORS.background,
                        borderRadius: "12px",
                        border: `2px solid ${COLORS.border}`,
                      }}
                    >
                      <div className="row g-4 text-center">
                        <div className="col-12 col-md-4">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            AÑO {new Date().getFullYear() - 1}
                          </small>
                          <div
                            style={{
                              fontSize: "2.5rem",
                              fontWeight: "700",
                              color: COLORS.textSecondary,
                            }}
                          >
                            {yearComparison.previous}
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            AÑO {new Date().getFullYear()}
                          </small>
                          <div
                            style={{
                              fontSize: "2.5rem",
                              fontWeight: "700",
                              color: COLORS.primary,
                            }}
                          >
                            {yearComparison.current}
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <small
                            style={{
                              color: COLORS.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            CRECIMIENTO
                          </small>
                          <div
                            style={{
                              fontSize: "2.5rem",
                              fontWeight: "700",
                              color:
                                yearComparison.growth >= 0
                                  ? COLORS.success
                                  : COLORS.danger,
                            }}
                          >
                            {yearComparison.growth >= 0 ? "+" : ""}
                            {yearComparison.growth.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Tab */}
              {activeTab === "recent" && (
                <div>
                  <h5 style={styles.chartTitle}>📅 Últimos 5 Envíos</h5>
                  <div className="row g-3">
                    {recentShipments.map((shipment, index) => {
                      const isAir = isAirShipment(
                        shipment.modeOfTransportation,
                      );
                      const color = isAir ? COLORS.air : COLORS.ocean;
                      const icon = isAir ? "✈️" : "🚢";

                      return (
                        <div key={shipment.id || index} className="col-12">
                          <div
                            className="p-3"
                            style={{
                              backgroundColor: "white",
                              borderRadius: "12px",
                              border: `2px solid ${color}`,
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            <div className="row align-items-center g-3">
                              <div className="col-auto">
                                <div style={{ fontSize: "2rem" }}>{icon}</div>
                              </div>
                              <div className="col">
                                <div
                                  style={{
                                    fontWeight: "700",
                                    color: COLORS.textPrimary,
                                    marginBottom: "4px",
                                  }}
                                >
                                  {shipment.number || `OP-${shipment.id}`}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.875rem",
                                    color: COLORS.textSecondary,
                                    marginBottom: "8px",
                                  }}
                                >
                                  {shipment.origin || "N/A"} →{" "}
                                  {shipment.destination || "N/A"}
                                </div>
                                <div
                                  className="d-flex gap-3 flex-wrap"
                                  style={{
                                    fontSize: "0.75rem",
                                    color: COLORS.textSecondary,
                                  }}
                                >
                                  {shipment.totalCargo_Pieces && (
                                    <span>
                                      📦 {shipment.totalCargo_Pieces} piezas
                                    </span>
                                  )}
                                  {shipment.totalCargo_WeightValue && (
                                    <span>
                                      ⚖️{" "}
                                      {formatNumber(
                                        shipment.totalCargo_WeightValue,
                                      )}{" "}
                                      kg
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="col-auto text-end">
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: COLORS.textSecondary,
                                    marginBottom: "4px",
                                  }}
                                >
                                  {formatDate(shipment.createdOn)}
                                </div>
                                {shipment.currentFlow && (
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor: COLORS.background,
                                      color: color,
                                      fontWeight: "600",
                                    }}
                                  >
                                    {shipment.currentFlow}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Empty state for no data */}
          {kpis.total === 0 && (
            <div className="text-center py-5">
              <div
                style={{
                  fontSize: "4rem",
                  marginBottom: "1.5rem",
                  opacity: 0.5,
                }}
              >
                📊
              </div>
              <h5
                style={{
                  color: COLORS.textPrimary,
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                }}
              >
                No hay datos disponibles
              </h5>
              <p style={{ color: COLORS.textSecondary }}>
                Intenta cambiar los filtros o verifica que existan envíos
                registrados
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botón Cargar Más */}
      {!loading && shipments.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            padding: "24px",
            marginTop: "24px",
          }}
        >
          <div
            style={{
              fontSize: "0.9rem",
              color: COLORS.textSecondary,
              fontWeight: "600",
            }}
          >
            Mostrando{" "}
            <strong style={{ color: COLORS.primary }}>
              {shipments.length}
            </strong>{" "}
            operaciones
            {!hasMoreShipments && <span> (todas cargadas)</span>}
          </div>

          {hasMoreShipments && !loadingMore && (
            <button
              onClick={loadMoreShipments}
              disabled={loadingMore}
              className="btn"
              style={{
                background: GRADIENTS.purple,
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontWeight: "600",
                cursor: loadingMore ? "not-allowed" : "pointer",
                opacity: loadingMore ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              🚢 Cargar Más Operaciones
            </button>
          )}

          {loadingMore && (
            <div
              style={{
                fontSize: "0.9rem",
                color: COLORS.textSecondary,
                fontWeight: "600",
              }}
            >
              ⏳ Cargando más operaciones...
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && shipments.length === 0 && (
        <div className="text-center py-5">
          <div
            style={{ fontSize: "4rem", marginBottom: "1.5rem", opacity: 0.5 }}
          >
            📦
          </div>
          <h5
            style={{
              color: COLORS.textPrimary,
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            No hay operaciones disponibles
          </h5>
          <p style={{ color: COLORS.textSecondary }}>
            Aún no tienes operaciones registradas
          </p>
        </div>
      )}

      {/* Modal */}
      {renderModal()}

      {/* CSS animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </>
  );
}

export default ShipmentsView;
