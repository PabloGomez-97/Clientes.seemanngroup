import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./ReporteriaFinanciera.css";

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface Invoice {
  id?: number;
  number?: string;
  type?: number;
  date?: string;
  dueDate?: string;
  status?: number;
  billTo?: {
    name?: string;
    identificationNumber?: string;
  };
  billToAddress?: string;
  currency?: {
    abbr?: string;
    name?: string;
  };
  amount?: {
    value?: number;
    userString?: string;
  };
  taxAmount?: {
    value?: number;
    userString?: string;
  };
  totalAmount?: {
    value?: number;
    userString?: string;
  };
  balanceDue?: {
    value?: number;
    userString?: string;
  };
  charges?: Array<{
    description?: string;
    quantity?: number;
    unit?: string;
    rate?: number;
    amount?: number;
  }>;
  shipment?: {
    number?: string;
    waybillNumber?: string;
    consignee?: {
      name?: string;
    };
    departure?: string;
    arrival?: string;
    customerReference?: string;
  };
  paymentTerm?: {
    name?: string;
  };
  notes?: string;
  [key: string]: any;
}

const ITEMS_PER_PAGE = 15;

/* -- Helpers ------------------------------------------------ */

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
    <div className={`rf-info-field ${fullWidth ? "rf-info-field--full" : ""}`}>
      <div className="rf-info-field__label">{label}</div>
      <div className="rf-info-field__value">{String(value)}</div>
    </div>
  );
}

interface TabDef {
  key: string;
  label: string;
  content: React.ReactNode;
  hidden?: boolean;
}

function DetailTabs({ tabs }: { tabs: TabDef[] }) {
  const visibleTabs = tabs.filter((t) => !t.hidden);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key || "");
  const current = visibleTabs.find((t) => t.key === activeTab);

  return (
    <div className="rf-tabs">
      <div className="rf-tabs__nav">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`rf-tabs__btn ${activeTab === tab.key ? "rf-tabs__btn--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(tab.key);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rf-tabs__panel">{current?.content}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "paid" | "pending" | "overdue" }) {
  const config = {
    paid: { label: "Pagada", cls: "rf-badge--paid" },
    pending: { label: "Pendiente", cls: "rf-badge--pending" },
    overdue: { label: "Vencida", cls: "rf-badge--overdue" },
  };
  const c = config[status];
  return <span className={`rf-badge ${c.cls}`}>{c.label}</span>;
}

/* ===========================================================
   MAIN COMPONENT
   =========================================================== */

function ReporteriaFinanciera() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [displayedInvoices, setDisplayedInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(true);

  // Client-side table pagination
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [tablePage, setTablePage] = useState(1);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<
    "month" | "3months" | "6months" | "year" | "all"
  >("month");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "pending" | "overdue"
  >("all");

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Accordion (max 2 open)
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);

  /* -- Format helpers --------------------------------------- */

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (
    value: number,
    currency: string = "CLP",
    decimals: number = 0,
  ): string => {
    const numeric = Number.isFinite(value) ? value : 0;
    const amount = decimals === 0 ? Math.round(numeric) : numeric;
    const formatted = new Intl.NumberFormat("es-CL", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);

    if (currency === "$") return `$${formatted}`;
    return `${currency} $${formatted}`;
  };

  const processCharges = (charges: any[]) => {
    if (!charges || charges.length === 0) return [];
    const uniqueCharges: any[] = [];
    const seenCharges = new Set<string>();
    charges.forEach((charge) => {
      const key = `${charge.description}-${charge.quantity}-${charge.rate}-${charge.amount}`;
      if (!seenCharges.has(key)) {
        seenCharges.add(key);
        uniqueCharges.push(charge);
      }
    });
    return uniqueCharges;
  };

  /* -- Status helpers --------------------------------------- */

  const getInvoiceStatus = (
    invoice: Invoice,
  ): "paid" | "pending" | "overdue" => {
    const balanceDue = invoice.balanceDue?.value || 0;
    if (balanceDue === 0) return "paid";
    if (invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) return "overdue";
    }
    return "pending";
  };

  const getServiceType = (
    shipmentNumber?: string,
  ): "Air" | "Ocean" | "Unknown" => {
    if (!shipmentNumber) return "Unknown";
    if (shipmentNumber.startsWith("SOG")) return "Air";
    if (shipmentNumber.startsWith("HBLI")) return "Ocean";
    return "Unknown";
  };

  /* -- Balance with exchange rate --------------------------- */

  const getConvertedBalance = (invoice: Invoice): string => {
    if (
      invoice.charges &&
      invoice.charges.length > 0 &&
      invoice.totalAmount?.value
    ) {
      const totalCharges = invoice.charges.reduce(
        (sum, charge) => sum + (charge.amount || 0),
        0,
      );
      if (totalCharges > 0) {
        const exchangeRate = (invoice.totalAmount.value / totalCharges) * 2;
        const convertedBalance =
          (invoice.balanceDue?.value || 0) * exchangeRate;
        return formatCurrency(convertedBalance, "CLP");
      }
    }
    return formatCurrency(invoice.balanceDue?.value || 0, "CLP");
  };

  const getExchangeRateText = (invoice: Invoice): string | null => {
    if (
      !invoice.charges ||
      invoice.charges.length === 0 ||
      !invoice.totalAmount?.value
    )
      return null;
    const totalCharges = processCharges(invoice.charges).reduce(
      (sum, charge) => sum + (charge.amount || 0),
      0,
    );
    if (totalCharges <= 0) return null;
    const exchangeRate = (invoice.totalAmount.value / totalCharges).toFixed(2);
    return `${exchangeRate} CLP / ${invoice.currency?.abbr || "USD"}`;
  };

  /* -- Fetch ------------------------------------------------ */

  const fetchInvoices = async (page: number = 1, append: boolean = false) => {
    if (!accessToken) {
      setError("Debes ingresar un token primero");
      return;
    }
    if (!user?.username) {
      setError("No se pudo obtener el nombre de usuario");
      return;
    }

    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        ConsigneeName: user.username,
        Page: page.toString(),
        ItemsPerPage: "50",
        SortBy: "newest",
      });

      const response = await fetch(
        `https://api.linbis.com/invoices?${queryParams}`,
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

      const data = await response.json();
      const invoicesArray: Invoice[] = Array.isArray(data) ? data : [];

      const sortedInvoices = invoicesArray.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setHasMoreInvoices(invoicesArray.length === 50);

      const cacheKey = `invoicesCache_${user.username}`;

      if (append && page > 1) {
        const combined = [...invoices, ...sortedInvoices].sort((a, b) => {
          const dateA = a.date ? new Date(a.date) : new Date(0);
          const dateB = b.date ? new Date(b.date) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setInvoices(combined);
        setDisplayedInvoices(combined);
        localStorage.setItem(cacheKey, JSON.stringify(combined));
        localStorage.setItem(
          `${cacheKey}_timestamp`,
          new Date().getTime().toString(),
        );
        localStorage.setItem(`${cacheKey}_page`, page.toString());
      } else {
        setInvoices(sortedInvoices);
        setDisplayedInvoices(sortedInvoices);
        localStorage.setItem(cacheKey, JSON.stringify(sortedInvoices));
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

  const loadMoreInvoices = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchInvoices(nextPage, true);
  };

  /* -- Initial load / cache --------------------------------- */

  useEffect(() => {
    if (!accessToken || !user?.username) return;

    const cacheKey = `invoicesCache_${user.username}`;
    const cachedInvoices = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const cachedPage = localStorage.getItem(`${cacheKey}_page`);

    if (cachedInvoices && cacheTimestamp) {
      const oneHour = 60 * 60 * 1000;
      const cacheAge = new Date().getTime() - parseInt(cacheTimestamp);
      if (cacheAge < oneHour) {
        const parsed = JSON.parse(cachedInvoices);
        setInvoices(parsed);
        setDisplayedInvoices(parsed);
        if (cachedPage) setCurrentPage(parseInt(cachedPage));
        const lastPageSize = parsed.length % 50;
        setHasMoreInvoices(lastPageSize === 0 && parsed.length >= 50);
        setLoading(false);
        return;
      } else {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
        localStorage.removeItem(`${cacheKey}_page`);
      }
    }

    setCurrentPage(1);
    fetchInvoices(1, false);
  }, [accessToken, user?.username]);

  /* -- Period filter ---------------------------------------- */

  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    const startDate = new Date();

    switch (periodFilter) {
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "3months":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
        return invoices;
    }

    return invoices.filter((inv) => {
      if (!inv.date) return false;
      return new Date(inv.date) >= startDate;
    });
  }, [invoices, periodFilter]);

  /* -- Status filter ---------------------------------------- */

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return filteredByPeriod;
    return filteredByPeriod.filter(
      (inv) => getInvoiceStatus(inv) === statusFilter,
    );
  }, [filteredByPeriod, statusFilter]);

  useEffect(() => {
    setDisplayedInvoices(filteredByStatus);
  }, [filteredByStatus]);

  /* -- Metrics by currency ---------------------------------- */

  const metricsByCurrency = useMemo(() => {
    const currencies: {
      [key: string]: {
        totalBilled: number;
        totalPending: number;
        totalPaid: number;
        count: number;
        overdueCount: number;
      };
    } = {};

    filteredByPeriod.forEach((inv) => {
      const currency = inv.currency?.abbr || "USD";
      if (!currencies[currency]) {
        currencies[currency] = {
          totalBilled: 0,
          totalPending: 0,
          totalPaid: 0,
          count: 0,
          overdueCount: 0,
        };
      }

      const total = inv.totalAmount?.value || 0;
      const balance = inv.balanceDue?.value || 0;
      const status = getInvoiceStatus(inv);

      currencies[currency].totalBilled += total;
      currencies[currency].totalPending += balance;
      currencies[currency].totalPaid += total - balance;
      currencies[currency].count += 1;
      if (status === "overdue") currencies[currency].overdueCount += 1;
    });

    return currencies;
  }, [filteredByPeriod]);

  /* -- Sorting ---------------------------------------------- */

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedInvoices = useMemo(() => {
    return [...displayedInvoices].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortColumn) {
        case "number":
          valA = (a.notes?.split("@")[0] || a.number || "").toLowerCase();
          valB = (b.notes?.split("@")[0] || b.number || "").toLowerCase();
          break;
        case "date":
          valA = a.date ? new Date(a.date).getTime() : 0;
          valB = b.date ? new Date(b.date).getTime() : 0;
          break;
        case "dueDate":
          valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case "total":
          valA = a.totalAmount?.value || 0;
          valB = b.totalAmount?.value || 0;
          break;
        case "balance":
          valA = a.balanceDue?.value || 0;
          valB = b.balanceDue?.value || 0;
          break;
        case "status": {
          const order = { paid: 0, pending: 1, overdue: 2 };
          valA = order[getInvoiceStatus(a)];
          valB = order[getInvoiceStatus(b)];
          break;
        }
        default:
          return 0;
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [displayedInvoices, sortColumn, sortDirection]);

  /* -- Client-side pagination ------------------------------- */

  const totalTablePages = Math.max(
    1,
    Math.ceil(sortedInvoices.length / rowsPerPage),
  );

  const paginatedInvoices = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return sortedInvoices.slice(start, start + rowsPerPage);
  }, [sortedInvoices, tablePage, rowsPerPage]);

  const paginationRangeText = useMemo(() => {
    if (sortedInvoices.length === 0) return "0 de 0";
    const start = (tablePage - 1) * rowsPerPage + 1;
    const end = Math.min(tablePage * rowsPerPage, sortedInvoices.length);
    return `${start}-${end} de ${sortedInvoices.length}`;
  }, [tablePage, rowsPerPage, sortedInvoices.length]);

  useEffect(() => {
    setTablePage(1);
  }, [displayedInvoices]);

  /* -- Accordion toggle (max 2) ----------------------------- */

  const toggleAccordion = (invoice: Invoice) => {
    const key = invoice.id || invoice.number || "";
    setExpandedIds((prev) => {
      if (prev.includes(key)) {
        return prev.filter((id) => id !== key);
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), key];
      }
      return [...prev, key];
    });
  };

  /* -- Refresh ---------------------------------------------- */

  const refreshInvoices = () => {
    if (!user?.username) return;
    const cacheKey = `invoicesCache_${user.username}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    localStorage.removeItem(`${cacheKey}_page`);
    setCurrentPage(1);
    setInvoices([]);
    setDisplayedInvoices([]);
    fetchInvoices(1, false);
  };

  /* -- Generate PDF ----------------------------------------- */

  const generatePDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes para descargar el PDF");
      return;
    }

    const periodLabel = {
      month: "Ultimo Mes",
      "3months": "Ultimos 3 Meses",
      "6months": "Ultimos 6 Meses",
      year: "Ultimo Año",
      all: "Todo el Periodo",
    }[periodFilter];

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte Financiero - ${user?.username}</title>
  <style>
    @media print { @page { margin: 1cm; } body { margin: 0; } .print-button { display: none; } }
    body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #1a1a1a; line-height: 1.6; }
    .header { background: #1a1a1a; color: white; padding: 30px; border-radius: 4px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 8px 0; font-size: 1.5rem; }
    .header p { margin: 2px 0; opacity: 0.85; font-size: 0.875rem; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .metric-card { border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; }
    .metric-card h3 { font-size: 0.6875rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 8px 0; }
    .metric-card .value { font-size: 1.25rem; font-weight: 700; color: #1a1a1a; }
    .currency-section { margin-bottom: 24px; page-break-inside: avoid; }
    .currency-title { font-size: 1rem; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; page-break-inside: avoid; }
    th { background-color: #fafafa; padding: 10px 12px; text-align: left; font-size: 0.6875rem; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 0.8125rem; }
    .status-paid { color: #047857; font-weight: 600; }
    .status-pending { color: #b45309; font-weight: 600; }
    .status-overdue { color: #b91c1c; font-weight: 600; }
    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.8125rem; }
    .print-button { background: #1a1a1a; color: white; border: none; border-radius: 4px; padding: 10px 20px; font-size: 0.875rem; font-weight: 600; cursor: pointer; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reporte Financiero</h1>
    <p><strong>Cliente:</strong> ${user?.username || "N/A"}</p>
    <p><strong>Periodo:</strong> ${periodLabel}</p>
    <p><strong>Generado:</strong> ${new Date().toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
  </div>
  <button class="print-button" onclick="window.print()">Imprimir / Guardar como PDF</button>
  ${Object.entries(metricsByCurrency)
    .map(
      ([currency, metrics]) => `
  <div class="currency-section">
    <h2 class="currency-title">Resumen en ${currency}</h2>
    <div class="metrics">
      <div class="metric-card">
        <h3>Total Facturado</h3>
        <div class="value">${formatCurrency(metrics.totalBilled, currency)}</div>
        <p style="margin:4px 0 0;font-size:0.8125rem;color:#6b7280;">${metrics.count} facturas</p>
      </div>
      <div class="metric-card">
        <h3>Pendiente de Pago</h3>
        <div class="value" style="color:#b45309;">${formatCurrency(metrics.totalPending, currency)}</div>
      </div>
      <div class="metric-card">
        <h3>Total Pagado</h3>
        <div class="value" style="color:#047857;">${formatCurrency(metrics.totalPaid, currency)}</div>
      </div>
      <div class="metric-card">
        <h3>Facturas Vencidas</h3>
        <div class="value" style="color:#b91c1c;">${metrics.overdueCount}</div>
      </div>
    </div>
  </div>`,
    )
    .join("")}
  <div style="margin-top:32px;">
    <h2 style="font-size:1rem;font-weight:600;margin-bottom:12px;">Detalle de Facturas</h2>
    <table>
      <thead>
        <tr>
          <th>Numero</th>
          <th>Estado</th>
          <th>Shipment</th>
          <th>Payment Term</th>
          <th style="text-align:right;">Total</th>
          <th>Fecha</th>
          <th>Vencimiento</th>
          <th style="text-align:right;">Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${displayedInvoices
          .map((invoice) => {
            const status = getInvoiceStatus(invoice);
            const statusLabel = {
              paid: "Pagada",
              pending: "Pendiente",
              overdue: "Vencida",
            }[status];
            return `<tr>
              <td><strong>${invoice.notes ? invoice.notes.split("@")[0] : invoice.number || "N/A"}</strong></td>
              <td style="text-align:center;" class="status-${status}">${statusLabel}</td>
              <td>${invoice.shipment?.number || "-"}</td>
              <td>${invoice.paymentTerm?.name || "-"}</td>
              <td style="text-align:right;">${formatCurrency(invoice.totalAmount?.value || 0, "CLP")}</td>
              <td>${invoice.date ? new Date(invoice.date).toLocaleDateString("es-CL") : "-"}</td>
              <td>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("es-CL") : "-"}</td>
              <td style="text-align:right;" class="status-${status}">${getConvertedBalance(invoice)}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>Reporte generado por el Sistema de Gestion de Envios</p>
    <p>Total de facturas: <strong>${displayedInvoices.length}</strong></p>
  </div>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  /* -- Sort icon -------------------------------------------- */

  const SortIcon = ({ column }: { column: string }) => {
    const active = sortColumn === column;
    return (
      <svg
        className={`rf-sort-icon ${active ? "rf-sort-icon--active" : ""} ${active && sortDirection === "asc" ? "rf-sort-icon--asc" : ""}`}
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
    <div className="rf-container">
      <h2 className="rf-title">Reportes Financieros</h2>

      {/* -- Loading ----------------------------------------- */}
      {loading && (
        <div className="rf-empty">
          <div className="rf-spinner" />
          <p className="rf-empty__subtitle">Cargando facturas...</p>
        </div>
      )}

      {/* -- Error ------------------------------------------- */}
      {error && (
        <div className="rf-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* -- Dashboard --------------------------------------- */}
      {!loading && invoices.length > 0 && (
        <>
          {/* =====================================================
              TABLE
             ===================================================== */}
          <div className="rf-table-wrapper">
            <div className="rf-table-scroll">
              <table className="rf-table">
                <thead>
                  <tr>
                    <th
                      className="rf-th rf-th--sortable"
                      onClick={() => handleSort("number")}
                    >
                      <span>N° Factura</span>
                      <SortIcon column="number" />
                    </th>
                    <th
                      className="rf-th rf-th--center rf-th--sortable"
                      onClick={() => handleSort("status")}
                    >
                      <span>Estado</span>
                      <SortIcon column="status" />
                    </th>
                    <th className="rf-th">
                      <span>Shipment</span>
                    </th>
                    <th className="rf-th">
                      <span>Payment Term</span>
                    </th>
                    <th
                      className="rf-th rf-th--right rf-th--sortable"
                      onClick={() => handleSort("total")}
                    >
                      <span>Total</span>
                      <SortIcon column="total" />
                    </th>
                    <th
                      className="rf-th rf-th--sortable"
                      onClick={() => handleSort("date")}
                    >
                      <span>Fecha</span>
                      <SortIcon column="date" />
                    </th>
                    <th
                      className="rf-th rf-th--sortable"
                      onClick={() => handleSort("dueDate")}
                    >
                      <span>Vencimiento</span>
                      <SortIcon column="dueDate" />
                    </th>
                    <th
                      className="rf-th rf-th--right rf-th--sortable"
                      onClick={() => handleSort("balance")}
                    >
                      <span>Saldo</span>
                      <SortIcon column="balance" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((invoice, index) => {
                    const invoiceKey = invoice.id || invoice.number || index;
                    const isExpanded = expandedIds.includes(
                      invoice.id || invoice.number || "",
                    );
                    const status = getInvoiceStatus(invoice);

                    return (
                      <React.Fragment key={invoiceKey}>
                        <tr
                          className={`rf-tr ${isExpanded ? "rf-tr--active" : ""}`}
                          onClick={() => toggleAccordion(invoice)}
                        >
                          <td className="rf-td rf-td--number">
                            <svg
                              className={`rf-row-chevron ${isExpanded ? "rf-row-chevron--open" : ""}`}
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                            {invoice.notes
                              ? invoice.notes.split("@")[0]
                              : invoice.number || "---"}
                          </td>
                          <td className="rf-td rf-td--center">
                            <StatusBadge status={status} />
                          </td>
                          <td className="rf-td rf-td--shipment">
                            {invoice.shipment?.number || "---"}
                          </td>
                          <td className="rf-td rf-td--payment-term">
                            {invoice.paymentTerm?.name || "---"}
                          </td>
                          <td className="rf-td rf-td--right rf-td--bold">
                            {formatCurrency(
                              invoice.totalAmount?.value || 0,
                              "CLP",
                            )}
                          </td>
                          <td className="rf-td">
                            {formatDateShort(invoice.date)}
                          </td>
                          <td className="rf-td">
                            {formatDateShort(invoice.dueDate)}
                          </td>
                          <td className="rf-td rf-td--right rf-td--bold">
                            {getConvertedBalance(invoice)}
                          </td>
                        </tr>

                        {/* Accordion content */}
                        {isExpanded && (
                          <tr className="rf-accordion-row">
                            <td colSpan={8} className="rf-accordion-cell">
                              <div className="rf-accordion-content">
                                <DetailTabs
                                  tabs={[
                                    {
                                      key: "info",
                                      label: "Información General",
                                      content: (
                                        <div className="rf-cards-grid">
                                          <div className="rf-card">
                                            <h4>Datos de la Factura</h4>
                                            <div className="rf-info-grid">
                                              <InfoField
                                                label="N° Factura (interno)"
                                                value={invoice.number}
                                              />
                                              <InfoField
                                                label="N° Factura"
                                                value={
                                                  invoice.notes
                                                    ? invoice.notes.split(
                                                        "@",
                                                      )[0]
                                                    : null
                                                }
                                              />
                                              <InfoField
                                                label="Fecha de Emision"
                                                value={formatDate(invoice.date)}
                                              />
                                              <InfoField
                                                label="Fecha de Vencimiento"
                                                value={formatDate(
                                                  invoice.dueDate,
                                                )}
                                              />
                                              <InfoField
                                                label="Moneda"
                                                value={
                                                  invoice.currency?.name
                                                    ? `${invoice.currency.name} (${invoice.currency.abbr})`
                                                    : invoice.currency?.abbr
                                                }
                                              />
                                              <InfoField
                                                label="Estado"
                                                value={
                                                  {
                                                    paid: "Pagada",
                                                    pending: "Pendiente",
                                                    overdue: "Vencida",
                                                  }[status]
                                                }
                                              />
                                            </div>
                                          </div>
                                          <div className="rf-card">
                                            <h4>Envio Asociado</h4>
                                            <div className="rf-info-grid">
                                              <InfoField
                                                label="Numero de Shipment"
                                                value={invoice.shipment?.number}
                                              />
                                              <InfoField
                                                label="Tipo de Servicio"
                                                value={getServiceType(
                                                  invoice.shipment?.number,
                                                )}
                                              />
                                              <InfoField
                                                label="Waybill"
                                                value={
                                                  invoice.shipment
                                                    ?.waybillNumber
                                                }
                                              />
                                              <InfoField
                                                label="Referencia Cliente"
                                                value={
                                                  invoice.shipment
                                                    ?.customerReference
                                                }
                                              />
                                              <InfoField
                                                label="Consignatario"
                                                value={
                                                  invoice.shipment?.consignee
                                                    ?.name
                                                }
                                              />
                                            </div>
                                          </div>
                                          <div className="rf-card">
                                            <h4>Facturado a</h4>
                                            <div className="rf-info-grid">
                                              <InfoField
                                                label="Nombre"
                                                value={invoice.billTo?.name}
                                              />
                                              <InfoField
                                                label="RUT / ID"
                                                value={
                                                  invoice.billTo
                                                    ?.identificationNumber
                                                }
                                              />
                                              <InfoField
                                                label="Direccion"
                                                value={invoice.billToAddress}
                                                fullWidth
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ),
                                    },
                                    {
                                      key: "charges",
                                      label: "Detalle de Cargos",
                                      hidden:
                                        !invoice.charges ||
                                        invoice.charges.length === 0,
                                      content: (
                                        <div style={{ overflowX: "auto" }}>
                                          <table className="rf-charges-table">
                                            <thead>
                                              <tr>
                                                <th>Descripcion</th>
                                                <th className="rf-charges-table--right">
                                                  Cantidad
                                                </th>
                                                <th className="rf-charges-table--right">
                                                  Tarifa (
                                                  {invoice.currency?.abbr ||
                                                    "USD"}
                                                  )
                                                </th>
                                                <th className="rf-charges-table--right">
                                                  Monto (
                                                  {invoice.currency?.abbr ||
                                                    "USD"}
                                                  )
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {processCharges(
                                                invoice.charges || [],
                                              ).map((charge, idx) => (
                                                <tr key={idx}>
                                                  <td>{charge.description}</td>
                                                  <td className="rf-charges-table--right">
                                                    {charge.quantity}{" "}
                                                    {charge.unit}
                                                  </td>
                                                  <td className="rf-charges-table--right">
                                                    {formatCurrency(
                                                      charge.rate || 0,
                                                      invoice.currency?.abbr ||
                                                        "USD",
                                                      3,
                                                    )}
                                                  </td>
                                                  <td className="rf-charges-table--right rf-charges-table--bold">
                                                    {formatCurrency(
                                                      charge.amount || 0,
                                                      invoice.currency?.abbr ||
                                                        "USD",
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                              <tr className="rf-charges-total-row">
                                                <td
                                                  colSpan={3}
                                                  style={{ textAlign: "right" }}
                                                >
                                                  TOTAL
                                                </td>
                                                <td
                                                  style={{ textAlign: "right" }}
                                                >
                                                  {formatCurrency(
                                                    processCharges(
                                                      invoice.charges || [],
                                                    ).reduce(
                                                      (sum, c) =>
                                                        sum + (c.amount || 0),
                                                      0,
                                                    ),
                                                    invoice.currency?.abbr ||
                                                      "USD",
                                                  )}
                                                </td>
                                              </tr>
                                              {getExchangeRateText(invoice) && (
                                                <tr className="rf-charges-exchange-row">
                                                  <td
                                                    colSpan={3}
                                                    style={{
                                                      textAlign: "right",
                                                    }}
                                                  >
                                                    Tipo de cambio
                                                  </td>
                                                  <td
                                                    style={{
                                                      textAlign: "right",
                                                    }}
                                                  >
                                                    {getExchangeRateText(
                                                      invoice,
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      ),
                                    },
                                    {
                                      key: "totals",
                                      label: "Totales (CLP)",
                                      content: (
                                        <div className="rf-totals-list">
                                          <div className="rf-totals-row">
                                            <span className="rf-totals-row__label">
                                              Subtotal
                                            </span>
                                            <span className="rf-totals-row__value">
                                              {formatCurrency(
                                                invoice.amount?.value || 0,
                                                "CLP",
                                              )}
                                            </span>
                                          </div>
                                          <div className="rf-totals-row">
                                            <span className="rf-totals-row__label">
                                              IVA
                                            </span>
                                            <span className="rf-totals-row__value">
                                              {formatCurrency(
                                                invoice.taxAmount?.value || 0,
                                                "CLP",
                                              )}
                                            </span>
                                          </div>
                                          <div className="rf-totals-row rf-totals-row--total">
                                            <span className="rf-totals-row__label">
                                              Total
                                            </span>
                                            <span className="rf-totals-row__value">
                                              {formatCurrency(
                                                invoice.totalAmount?.value || 0,
                                                "CLP",
                                              )}
                                            </span>
                                          </div>
                                          <div
                                            className={`rf-totals-row rf-totals-row--balance rf-totals-row--balance-${status}`}
                                          >
                                            <span className="rf-totals-row__label">
                                              Saldo Pendiente
                                            </span>
                                            <span className="rf-totals-row__value">
                                              {getConvertedBalance(invoice)}
                                            </span>
                                          </div>
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
            <div className="rf-table-footer">
              <div className="rf-table-footer__left">
                {hasMoreInvoices && !loadingMore && (
                  <button
                    className="rf-btn rf-btn--ghost"
                    onClick={loadMoreInvoices}
                  >
                    Cargar mas facturas
                  </button>
                )}
                {loadingMore && (
                  <span className="rf-loading-text">Cargando...</span>
                )}
              </div>
              <div className="rf-table-footer__right">
                <span className="rf-pagination-label">Filas por pagina:</span>
                <select
                  className="rf-pagination-select"
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
                <span className="rf-pagination-range">
                  {paginationRangeText}
                </span>
                <button
                  className="rf-pagination-btn"
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
                  className="rf-pagination-btn"
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
        </>
      )}

      {/* -- Empty state -------------------------------------- */}
      {!loading && invoices.length === 0 && (
        <div className="rf-empty">
          <p className="rf-empty__title">No hay facturas disponibles</p>
          <p className="rf-empty__subtitle">
            No se encontraron facturas para tu cuenta
          </p>
        </div>
      )}

      {/* -- Loading more toast ------------------------------- */}
      {loadingMore && (
        <div className="rf-loading-toast">
          <div className="rf-loading-toast__spinner" />
          Cargando mas facturas...
        </div>
      )}
    </div>
  );
}

export default ReporteriaFinanciera;
