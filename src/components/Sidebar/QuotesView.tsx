import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { DocumentosSection } from "./Documents/DocumentosSection";
import "./QuotesView.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";

interface OutletContext {
  accessToken: string;
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
  [key: string]: any;
}

const ITEMS_PER_PAGE = 10;

/* -- Helpers ------------------------------------------------ */

function isQuoteValid(validUntilDate?: string): boolean | null {
  if (!validUntilDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(validUntilDate);
  until.setHours(23, 59, 59, 999);
  return until >= today;
}

function StatusBadge({ validUntilDate }: { validUntilDate?: string }) {
  const valid = isQuoteValid(validUntilDate);
  if (valid === null)
    return <span className="qv-badge qv-badge--neutral">---</span>;
  return valid ? (
    <span className="qv-badge qv-badge--valid">Valida</span>
  ) : (
    <span className="qv-badge qv-badge--expired">Vencida</span>
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

  const current = visibleTabs.find((t) => t.key === activeTab);

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
      <div className="qv-tabs__panel">{current?.content}</div>
    </div>
  );
}

/* ===========================================================
   MAIN COMPONENT
   =========================================================== */

function QuotesView() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, token, activeUsername } = useAuth();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [displayedQuotes, setDisplayedQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF state
  const [availablePDFs, setAvailablePDFs] = useState<Set<string>>(new Set());
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreQuotes, setHasMoreQuotes] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [tablePage, setTablePage] = useState(1);

  // Accordion
  const [expandedQuoteId, setExpandedQuoteId] = useState<
    string | number | null
  >(null);
  const [documentCounts, setDocumentCounts] = useState<
    Record<string | number, number>
  >({});

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("number");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

  // Focus states (optional for floating labels)
  const [isFilterNumberFocused, setIsFilterNumberFocused] = useState(false);
  const [isFilterOriginFocused, setIsFilterOriginFocused] = useState(false);
  const [isFilterDestinationFocused, setIsFilterDestinationFocused] =
    useState(false);
  const [isFilterTransportFocused, setIsFilterTransportFocused] =
    useState(false);

  /* -- Format helpers --------------------------------------- */
  const formatDateShort = (dateString?: string) => {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateLong = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCLP = (priceString?: string) => {
    if (!priceString) return null;
    const numberMatch = priceString.match(/[\d.,]+/);
    if (!numberMatch) return priceString;
    const cleanNumber = numberMatch[0].replace(/,/g, "");
    const num = parseFloat(cleanNumber);
    if (isNaN(num)) return priceString;
    return `$${new Intl.NumberFormat("es-CL").format(num)} CLP`;
  };

  /* -- Sorting ---------------------------------------------- */
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedQuotes = useMemo(() => {
    const sorted = [...displayedQuotes].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortColumn) {
        case "number":
          valA = parseInt(a.number?.replace(/\D/g, "") || "0", 10);
          valB = parseInt(b.number?.replace(/\D/g, "") || "0", 10);
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
          valA = (a.origin || "").toLowerCase();
          valB = (b.origin || "").toLowerCase();
          break;
        case "destination":
          valA = (a.destination || "").toLowerCase();
          valB = (b.destination || "").toLowerCase();
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

  useEffect(() => {
    setTablePage(1);
  }, [displayedQuotes]);

  /* -- Fetch ------------------------------------------------ */
  const fetchQuotes = async (page: number = 1, append: boolean = false) => {
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
      const queryParams = new URLSearchParams({
        ConsigneeName: activeUsername,
        Page: page.toString(),
        ItemsPerPage: ITEMS_PER_PAGE.toString(),
        SortBy: "newest",
      });

      const response = await fetch(
        `https://api.linbis.com/Quotes?${queryParams}`,
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
      const quotesArray: Quote[] = Array.isArray(data) ? data : [];
      const sortedArr = quotesArray.sort((a, b) => {
        const nA = parseInt(a.number?.replace(/\D/g, "") || "0", 10);
        const nB = parseInt(b.number?.replace(/\D/g, "") || "0", 10);
        return nB - nA;
      });

      setHasMoreQuotes(quotesArray.length === ITEMS_PER_PAGE);

      const cacheKey = `quotesCache_${activeUsername}`;
      if (append && page > 1) {
        const combined = [...quotes, ...sortedArr].sort((a, b) => {
          const nA = parseInt(a.number?.replace(/\D/g, "") || "0", 10);
          const nB = parseInt(b.number?.replace(/\D/g, "") || "0", 10);
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
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
        const parsed = JSON.parse(cachedQuotes);
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
    fetchQuotes(1, false);
  }, [accessToken, activeUsername]);

  /* -- Quick search ----------------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      const term = quickSearch.trim().toLowerCase();
      if (!term) {
        setDisplayedQuotes(quotes);
        setShowingAll(false);
        return;
      }
      const results = quotes.filter((q) => {
        const number = (q.number || "").toLowerCase();
        const origin = (q.origin || "").toLowerCase();
        const destination = (q.destination || "").toLowerCase();
        const date = (q.date || "").toLowerCase();
        return (
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
      quotes.filter((q) => (q.number || "").toLowerCase().includes(term)),
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
        (q.number || "").toLowerCase().includes(term),
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
        (q.modeOfTransportation || "").toLowerCase().includes(term),
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
  };

  const clearSearch = () => {
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
  };

  const refreshQuotes = () => {
    if (!activeUsername) return;
    const k = `quotesCache_${activeUsername}`;
    localStorage.removeItem(k);
    localStorage.removeItem(`${k}_timestamp`);
    localStorage.removeItem(`${k}_page`);
    setCurrentPage(1);
    setQuotes([]);
    setDisplayedQuotes([]);
    fetchQuotes(1, false);
  };

  const toggleAccordion = (quote: Quote) => {
    const quoteKey = quote.id || quote.number || "";
    setExpandedQuoteId((prev) => (prev === quoteKey ? null : quoteKey));
  };

  /* -- Fetch available PDFs --------------------------------- */
  useEffect(() => {
    console.log(
      "[QuotesView] fetchPDFs effect triggered, token present:",
      !!token,
    );
    if (!token) return;
    const fetchPDFs = async () => {
      try {
        const res = await fetch("/api/quote-pdf/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("[QuotesView] PDF list response status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("[QuotesView] PDF list data:", data);
          if (data.success && Array.isArray(data.pdfs)) {
            const pdfNumbers = new Set<string>(
              data.pdfs.map((pdf: { quoteNumber: string }) => pdf.quoteNumber),
            );
            console.log("[QuotesView] Available PDF quoteNumbers:", [
              ...pdfNumbers,
            ]);
            console.log(
              "[QuotesView] Raw PDF data:",
              JSON.stringify(
                data.pdfs.map((p: any) => ({
                  qn: p.quoteNumber,
                  name: p.nombreArchivo,
                })),
              ),
            );
            setAvailablePDFs(pdfNumbers);
          }
        } else {
          const errText = await res.text();
          console.error(
            "[QuotesView] Error fetching PDF list:",
            res.status,
            errText,
          );
        }
      } catch (err) {
        console.error("[QuotesView] Error fetching PDF list:", err);
      }
    };
    fetchPDFs();
  }, [token]);

  // Debug: compare availablePDFs vs displayed quotes
  useEffect(() => {
    if (availablePDFs.size > 0 && displayedQuotes.length > 0) {
      const pdfArr = [...availablePDFs];
      const quoteNums = displayedQuotes.slice(0, 15).map((q) => q.number);
      console.log("[QuotesView] === PDF MATCH DEBUG ===");
      console.log("[QuotesView] PDFs in DB:", pdfArr);
      console.log("[QuotesView] Quote numbers (first 15):", quoteNums);
      const matches = quoteNums.filter((n) => n && availablePDFs.has(n));
      console.log("[QuotesView] Matches found:", matches.length, matches);
      if (matches.length === 0) {
        console.warn(
          "[QuotesView] ⚠️ NO MATCHES! quoteNumbers in DB don't match any quote.number in the list",
        );
      }
    }
  }, [availablePDFs, displayedQuotes]);

  const handleDownloadPDF = async (quoteNumber: string) => {
    if (!token || !quoteNumber) return;
    setDownloadingPDF(quoteNumber);
    try {
      const res = await fetch(
        `/api/quote-pdf/download/${encodeURIComponent(quoteNumber)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("PDF no encontrado");
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
  };

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
      <h2 className="hal-app-name">Mis Cotizaciones</h2>
      {/* -- Map --------------------------------------------- */}
      <div
        style={{
          marginBottom: "32px",
          height: "350px",
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

      {/* -- Toolbar (advanced search) ------------------------- */}
      <div
        className="qv-toolbar"
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <form
          className="qv-filters-form"
          onSubmit={handleApplyFilters}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            className="qv-input"
            type="text"
            placeholder="N Cotizacion"
            value={filterNumber}
            onChange={(e) => setFilterNumber(e.target.value)}
            style={{ width: 120, height: 32 }}
          />
          <input
            className="qv-input"
            type="text"
            placeholder="Estado (valida/vencida)"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 160, height: 32 }}
          />
          <input
            className="qv-input"
            type="text"
            placeholder="Origen"
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value)}
            style={{ width: 140, height: 32 }}
          />
          <input
            className="qv-input"
            type="text"
            placeholder="Destino"
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            style={{ width: 140, height: 32 }}
          />
          <input
            className="qv-input"
            type="text"
            placeholder="Transporte"
            value={filterTransport}
            onChange={(e) => setFilterTransport(e.target.value)}
            style={{ width: 120, height: 32 }}
          />
          <input
            className="qv-input"
            type="text"
            placeholder="Piezas"
            value={filterPieces}
            onChange={(e) => setFilterPieces(e.target.value)}
            style={{ width: 80, height: 32 }}
          />
          <input
            className="qv-input"
            type="date"
            placeholder="Fecha Emision"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ width: 140, height: 32 }}
          />
          <input
            className="qv-input"
            type="date"
            placeholder="Valida Hasta"
            value={filterValidUntil}
            onChange={(e) => setFilterValidUntil(e.target.value)}
            style={{ width: 140, height: 32 }}
          />
          <input
            className="qv-input"
            type="text"
            placeholder="Transito (d)"
            value={filterTransit}
            onChange={(e) => setFilterTransit(e.target.value)}
            style={{ width: 80, height: 32 }}
          />

          <button
            className="qv-btn qv-btn--primary"
            type="submit"
            style={{ height: 32 }}
          >
            Aplicar
          </button>
          <button
            className="qv-btn qv-btn--ghost"
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
            Actualizar
          </button>
          {loadingMore && <span className="qv-loading-text">Cargando...</span>}
        </div>
      </div>

      {/* -- Search modal ------------------------------------ */}
      {showSearchModal && (
        <div className="qv-overlay" onClick={() => setShowSearchModal(false)}>
          <div
            className="qv-modal qv-modal--search"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="qv-modal__title">Buscar Cotizaciones</h5>
            <div className="qv-search-section">
              <label className="qv-label">Por Numero</label>
              <input
                className="qv-input"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Numero de cotizacion"
              />
              <button
                className="qv-btn qv-btn--primary qv-btn--full"
                onClick={handleSearchByNumber}
              >
                Buscar
              </button>
            </div>
            <div className="qv-search-section">
              <label className="qv-label">Por Ruta</label>
              <div className="qv-search-row">
                <select
                  className="qv-input"
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                >
                  <option value="">Origen</option>
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
                  <option value="">Destino</option>
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
                Buscar
              </button>
            </div>
            <div className="qv-search-section">
              <label className="qv-label">Por Fecha Exacta</label>
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
                Buscar
              </button>
            </div>
            <div className="qv-search-section">
              <label className="qv-label">Por Rango de Fechas</label>
              <div className="qv-search-row">
                <div style={{ flex: 1 }}>
                  <span className="qv-label qv-label--small">Desde</span>
                  <input
                    className="qv-input"
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="qv-label qv-label--small">Hasta</span>
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
                Buscar
              </button>
            </div>
            <button
              className="qv-btn qv-btn--ghost qv-btn--full"
              onClick={() => setShowSearchModal(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* -- Loading ----------------------------------------- */}
      {loading && (
        <div className="qv-empty">
          <div className="qv-spinner" />
          <p>Cargando cotizaciones...</p>
        </div>
      )}

      {/* -- Error ------------------------------------------- */}
      {error && (
        <div className="qv-error">
          <strong>Error:</strong> {error}
        </div>
      )}
      {/* =====================================================
          TABLE
         ===================================================== */}
      {!loading && displayedQuotes.length > 0 && (
        <div className="qv-table-wrapper">
          <div className="qv-table-scroll">
            <table className="qv-table">
              <thead>
                <tr>
                  <th
                    className="qv-th qv-th--sortable"
                    onClick={() => handleSort("number")}
                  >
                    <span>N Cotizacion</span>
                    <SortIcon column="number" />
                  </th>
                  <th className="qv-th qv-th--center">
                    <span>Estado</span>
                  </th>
                  <th
                    className="qv-th qv-th--sortable"
                    onClick={() => handleSort("origin")}
                  >
                    <span>Origen</span>
                    <SortIcon column="origin" />
                  </th>
                  <th
                    className="qv-th qv-th--sortable"
                    onClick={() => handleSort("destination")}
                  >
                    <span>Destino</span>
                    <SortIcon column="destination" />
                  </th>
                  <th className="qv-th">
                    <span>Transporte</span>
                  </th>
                  <th className="qv-th qv-th--center">
                    <span>Piezas</span>
                  </th>
                  <th
                    className="qv-th qv-th--sortable"
                    onClick={() => handleSort("date")}
                  >
                    <span>Fecha Emision</span>
                    <SortIcon column="date" />
                  </th>
                  <th
                    className="qv-th qv-th--sortable"
                    onClick={() => handleSort("validUntil")}
                  >
                    <span>Valida Hasta</span>
                    <SortIcon column="validUntil" />
                  </th>
                  <th
                    className="qv-th qv-th--center qv-th--sortable"
                    onClick={() => handleSort("transit")}
                  >
                    <span>Transito</span>
                    <SortIcon column="transit" />
                  </th>
                  <th className="qv-th qv-th--center">
                    <span>PDF</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedQuotes.map((quote, index) => {
                  const quoteKey = quote.id || quote.number || index;
                  const isExpanded =
                    expandedQuoteId === (quote.id || quote.number || "");
                  return (
                    <React.Fragment key={quoteKey}>
                      <tr
                        className={`qv-tr ${isExpanded ? "qv-tr--active" : ""}`}
                        onClick={() => toggleAccordion(quote)}
                      >
                        <td className="qv-td qv-td--number">
                          <svg
                            className={`qv-row-chevron ${isExpanded ? "qv-row-chevron--open" : ""}`}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          {quote.number || "---"}
                        </td>
                        <td className="qv-td qv-td--center">
                          <StatusBadge validUntilDate={quote.validUntil_Date} />
                        </td>
                        <td className="qv-td">{quote.origin || "---"}</td>
                        <td className="qv-td">{quote.destination || "---"}</td>
                        <td className="qv-td">
                          {quote.modeOfTransportation || "---"}
                        </td>
                        <td className="qv-td qv-td--center">
                          {quote.totalCargo_Pieces ?? "---"}
                        </td>
                        <td className="qv-td">{formatDateShort(quote.date)}</td>
                        <td className="qv-td">
                          {formatDateShort(quote.validUntil_Date)}
                        </td>
                        <td className="qv-td qv-td--center">
                          {quote.transitDays != null
                            ? `${quote.transitDays}d`
                            : "---"}
                        </td>
                        <td
                          className="qv-td qv-td--center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {availablePDFs.has(quote.number || "") ? (
                            <button
                              className="qv-btn qv-btn--primary"
                              style={{
                                fontSize: "11px",
                                padding: "4px 10px",
                                whiteSpace: "nowrap",
                              }}
                              disabled={downloadingPDF === quote.number}
                              onClick={() =>
                                handleDownloadPDF(quote.number || "")
                              }
                            >
                              {downloadingPDF === quote.number ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  style={{ width: "12px", height: "12px" }}
                                />
                              ) : (
                                <>
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ marginRight: "4px" }}
                                  >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  Descargar
                                </>
                              )}
                            </button>
                          ) : (
                            <span style={{ color: "#999", fontSize: "11px" }}>
                              ---
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="qv-accordion-row">
                          <td colSpan={10} className="qv-accordion-cell">
                            <div className="qv-accordion-content">
                              {/* Route summary */}
                              <div className="qv-route-card">
                                <div className="qv-route-card__point">
                                  <span className="qv-route-card__label">
                                    Origen
                                  </span>
                                  <span className="qv-route-card__value">
                                    {quote.origin || "N/A"}
                                  </span>
                                  {quote.deperture_Date && (
                                    <span className="qv-route-card__date">
                                      {formatDateShort(quote.deperture_Date)}
                                    </span>
                                  )}
                                </div>
                                <div className="qv-route-card__arrow">
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
                                  {quote.transitDays != null && (
                                    <span className="qv-route-card__transit">
                                      {quote.transitDays} dias
                                    </span>
                                  )}
                                </div>
                                <div className="qv-route-card__point qv-route-card__point--end">
                                  <span className="qv-route-card__label">
                                    Destino
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
                                      <div className="qv-cards-grid">
                                        <div className="qv-card">
                                          <h4>Detalles de Cotización</h4>
                                          <div className="qv-info-grid">
                                            <InfoField
                                              label="Numero de Cotizacion"
                                              value={quote.number}
                                            />
                                            <InfoField
                                              label="Fecha de Emision"
                                              value={
                                                quote.date
                                                  ? formatDateLong(quote.date)
                                                  : null
                                              }
                                            />
                                            <InfoField
                                              label="Valida Hasta"
                                              value={
                                                quote.validUntil_Date
                                                  ? formatDateLong(
                                                      quote.validUntil_Date,
                                                    )
                                                  : null
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className="qv-card">
                                          <h4>Logística</h4>
                                          <div className="qv-info-grid">
                                            <InfoField
                                              label="Dias de Transito"
                                              value={quote.transitDays}
                                            />
                                            <InfoField
                                              label="Modo de Transporte"
                                              value={quote.modeOfTransportation}
                                            />
                                            <InfoField
                                              label="Tipo de Pago"
                                              value={quote.paymentType}
                                            />
                                          </div>
                                        </div>
                                        <div className="qv-card">
                                          <h4>Información del cliente</h4>
                                          <div className="qv-info-grid">
                                            <InfoField
                                              label="Carrier/Broker"
                                              value={quote.carrierBroker}
                                              fullWidth
                                            />
                                            <InfoField
                                              label="Referencia Cliente"
                                              value={quote.customerReference}
                                              fullWidth
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ),
                                  },
                                  {
                                    key: "carga",
                                    label: "Carga",
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
                                      <div className="qv-cards-grid">
                                        <div className="qv-card">
                                          <h4>Cantidades</h4>
                                          <div className="qv-info-grid">
                                            <InfoField
                                              label="Total de Piezas"
                                              value={quote.totalCargo_Pieces}
                                            />
                                            <InfoField
                                              label="Contenedores"
                                              value={quote.totalCargo_Container}
                                            />
                                          </div>
                                        </div>
                                        <div className="qv-card">
                                          <h4>Pesos y Volúmenes</h4>
                                          <div className="qv-info-grid">
                                            <InfoField
                                              label="Peso Total"
                                              value={
                                                quote.totalCargo_WeightDisplayValue
                                              }
                                            />
                                            <InfoField
                                              label="Volumen Total"
                                              value={
                                                quote.totalCargo_VolumeDisplayValue
                                              }
                                            />
                                            <InfoField
                                              label="Peso Volumetrico"
                                              value={
                                                quote.totalCargo_VolumeWeightDisplayValue
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className="qv-card">
                                          <h4>Estado y Seguridad</h4>
                                          <div className="qv-info-grid">
                                            <InfoField
                                              label="Carga Peligrosa"
                                              value={quote.hazardous}
                                            />
                                            <InfoField
                                              label="Estado de Carga"
                                              value={quote.cargoStatus}
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
                                        <polyline points="10 9 9 9 8 9" />
                                      </svg>
                                    ),
                                    content: (
                                      <DocumentosSection
                                        quoteId={String(
                                          quote.id || quote.number || "",
                                        )}
                                        onCountChange={(count) =>
                                          setDocumentCounts((prev) => ({
                                            ...prev,
                                            [String(
                                              quote.id || quote.number || "",
                                            )]: count,
                                          }))
                                        }
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
                                      <div className="qv-finance-card">
                                        <span className="qv-finance-card__label">
                                          Gasto Total (No incluye impuestos)
                                        </span>
                                        <span className="qv-finance-card__amount">
                                          {formatCLP(
                                            quote.totalCharge_IncomeDisplayValue,
                                          ) || "$0 CLP"}
                                        </span>
                                        <span className="qv-finance-card__note">
                                          Monto estimado para esta cotizacion
                                        </span>
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
                                      !quote.notes || quote.notes === "N/A",
                                    content: (
                                      <div className="qv-notes">
                                        {quote.notes}
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

          {/* -- Table footer / pagination ------------------- */}
          <div className="qv-table-footer">
            <div className="qv-table-footer__left">
              {loadingMore && (
                <span className="qv-loading-text">Cargando...</span>
              )}
            </div>
            <div className="qv-table-footer__right">
              <span className="qv-pagination-label">Filas por pagina:</span>
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
              <span className="qv-pagination-range">{paginationRangeText}</span>
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
      )}

      {/* -- Empty states ------------------------------------- */}
      {displayedQuotes.length === 0 &&
        !loading &&
        quotes.length > 0 &&
        showingAll && (
          <div className="qv-empty">
            <p className="qv-empty__title">No se encontraron cotizaciones</p>
            <p className="qv-empty__subtitle">
              No hay cotizaciones que coincidan con tu busqueda
            </p>
            <button className="qv-btn qv-btn--primary" onClick={clearSearch}>
              Ver todas las cotizaciones
            </button>
          </div>
        )}

      {quotes.length === 0 && !loading && (
        <div className="qv-empty">
          <p className="qv-empty__title">No hay cotizaciones disponibles</p>
          <p className="qv-empty__subtitle">
            No se encontraron cotizaciones para tu cuenta
          </p>
        </div>
      )}
    </div>
  );
}

export default QuotesView;
