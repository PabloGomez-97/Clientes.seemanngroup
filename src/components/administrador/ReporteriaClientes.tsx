// src/components/administrador/ReporteriaClientes.tsx — Client portal view for ejecutivos
import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ClientOverrideProvider } from "../../contexts/ClientOverrideContext";
import AirShipmentsView from "../shipments/AirShipmentsView";
import OceanShipmentsView from "../shipments/OceanShipmentsView";
import GroundShipmentsView from "../shipments/GroundShipmentsView";
import EXWChargesView from "./Cobros-EXW/EXWChargesView";
import QuotesView from "../Sidebar/QuotesView";

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface Cliente {
  id: string;
  email: string;
  username: string;
  nombreuser?: string;
  createdAt: string;
}

// ── Cache helpers (1 hour TTL) ──
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

const CLIENTS_CACHE_KEY = "rc_clients_list";

function getCachedClients(): Cliente[] | null {
  try {
    const raw = localStorage.getItem(CLIENTS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CLIENTS_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedClients(data: Cliente[]) {
  try {
    localStorage.setItem(
      CLIENTS_CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {
    /* quota exceeded, ignore */
  }
}

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function ReporteriaClientes() {
  useOutletContext<OutletContext>(); // validate outlet context exists
  const { token } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected client
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [activeTab, setActiveTab] = useState<
    "air" | "ocean" | "ground" | "quotes" | "exw"
  >("air");

  // ── Fetch clients list (with cache) ──
  useEffect(() => {
    const fetchClientes = async () => {
      if (!token) return;

      // Check cache first
      const cached = getCachedClients();
      if (cached) {
        setClientes(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resp = await fetch("/api/ejecutivo/clientes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (!resp.ok)
          throw new Error(data?.error || "Error al cargar clientes");
        const lista: Cliente[] = Array.isArray(data?.clientes)
          ? data.clientes
          : [];
        setClientes(lista);
        setCachedClients(lista);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, [token]);

  // When a client is selected, show their portal view
  const handleSelectClient = useCallback((cliente: Cliente) => {
    setSelectedClient(cliente);
    setActiveTab("air");
  }, []);

  // Go back to list
  const handleBack = () => {
    setSelectedClient(null);
  };

  // Filtered client list
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientes;
    const q = searchQuery.toLowerCase();
    return clientes.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.nombreuser && c.nombreuser.toLowerCase().includes(q)),
    );
  }, [clientes, searchQuery]);

  // ── Loading state ──
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
          fontFamily: FONT,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid #f0f0f0",
              borderTop: "3px solid #ff9900",
              borderRadius: "50%",
              animation: "rc-spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ color: "#8d99a8", fontSize: 13 }}>
            Cargando clientes...
          </div>
          <style>{`@keyframes rc-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ fontFamily: FONT, padding: 40, textAlign: "center" }}>
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "24px 32px",
            display: "inline-block",
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#dc2626",
              marginBottom: 4,
            }}
          >
            Error
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{error}</div>
        </div>
      </div>
    );
  }

  // ── Client Detail View (same portal views the client sees) ──
  if (selectedClient) {
    const tabs = [
      { key: "air" as const, label: "Envíos Aéreos", icon: "" },
      { key: "ocean" as const, label: "Envíos Marítimos", icon: "" },
      { key: "ground" as const, label: "Envíos Terrestres", icon: "" },
      { key: "quotes" as const, label: "Cotizaciones", icon: "" },
      { key: "exw" as const, label: "Cobros EXW", icon: "" },
    ];

    return (
      <div style={{ fontFamily: FONT }}>
        {/* Back button */}
        <button
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "none",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            marginBottom: 20,
            transition: "all 0.15s",
            fontFamily: FONT,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f9fafb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver a la lista
        </button>

        {/* Client Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#232f3e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {(selectedClient.username || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#1f2937",
                margin: 0,
              }}
            >
              {selectedClient.username}
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "2px 0 0" }}>
              {selectedClient.email} · Registrado el{" "}
              {new Date(selectedClient.createdAt).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: 0,
            overflowX: "auto",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid #ff6200"
                    : "2px solid transparent",
                marginBottom: -2,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? "#ff6200" : "#6b7280",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
                fontFamily: FONT,
              }}
            >
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content — wraps views with the client's username override */}
        <ClientOverrideProvider value={selectedClient.username}>
          {activeTab === "air" && <AirShipmentsView />}
          {activeTab === "ocean" && <OceanShipmentsView />}
          {activeTab === "ground" && <GroundShipmentsView />}
          {activeTab === "exw" && <EXWChargesView />}
          {activeTab === "quotes" && <QuotesView />}
        </ClientOverrideProvider>
      </div>
    );
  }

  // ── Client List View ──
  return (
    <div style={{ fontFamily: FONT, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{ fontSize: 22, fontWeight: 700, color: "#1f2937", margin: 0 }}
        >
          Mis Clientes
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
          Selecciona un cliente para ver sus cotizaciones y operaciones.
        </p>
      </div>

      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 20,
          padding: "14px 20px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i
            className="fa fa-users"
            style={{ fontSize: 16, color: "#ff9900" }}
          />
          <span style={{ fontSize: 24, fontWeight: 700, color: "#1f2937" }}>
            {clientes.length}
          </span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            clientes asignados
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          Caché: {getCachedClients() ? "activo" : "sin caché"}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            transition: "border-color 0.15s",
          }}
        >
          <svg width="16" height="16" fill="#9ca3af" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar cliente por nombre, empresa o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#1f2937",
              background: "transparent",
              fontFamily: FONT,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                padding: 2,
                fontSize: 16,
              }}
            >
              ×
            </button>
          )}
        </div>
        {searchQuery && (
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
            {filteredClients.length} resultado
            {filteredClients.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Client List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filteredClients.map((client) => {
          return (
            <div
              key={client.id}
              onClick={() => handleSelectClient(client)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ff9900";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#232f3e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {(client.username || "?").charAt(0).toUpperCase()}
              </div>

              {/* Client info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#1f2937",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {client.username}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {client.email}
                </div>
              </div>

              {/* Registration date */}
              <div style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>
                {new Date(client.createdAt).toLocaleDateString("es-CL", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>

              {/* Arrow */}
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          {searchQuery
            ? `No se encontraron clientes para "${searchQuery}"`
            : "No hay clientes asignados a este ejecutivo."}
        </div>
      )}
    </div>
  );
}

export default ReporteriaClientes;
