// src/components/administrador/Documentacion.tsx — Gestión de documentos para ejecutivos
import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { DocumentosUnificadosView } from "../Sidebar/Documents/DocumentosUnificadosView";

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

interface Cliente {
  id: string;
  email: string;
  username: string;
  nombreuser?: string;
  createdAt: string;
}

const CACHE_TTL = 60 * 60 * 1000;
const CLIENTS_CACHE_KEY = "rc_clients_list";
const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

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
    /* quota exceeded */
  }
}

function Documentacion() {
  useOutletContext<OutletContext>();
  const { token } = useAuth();
  const { clientUsername } = useParams<{ clientUsername?: string }>();
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

  // Fetch clients
  useEffect(() => {
    const fetchClientes = async () => {
      if (!token) return;
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

  const handleSelectClient = useCallback(
    (cliente: Cliente) => {
      navigate(`/admin/documentacion/${encodeURIComponent(cliente.username)}`, {
        replace: true,
      });
    },
    [navigate],
  );

  const handleBack = () => navigate("/admin/documentacion", { replace: true });

  // URL is source of truth
  useEffect(() => {
    if (!clientUsername) {
      setSelectedClient(null);
      return;
    }
    if (loading || clientes.length === 0) return;
    const match = clientes.find(
      (c) =>
        c.username.toLowerCase() ===
        decodeURIComponent(clientUsername).toLowerCase(),
    );
    if (!match) return;
    setSelectedClient((prev) =>
      prev?.username.toLowerCase() === match.username.toLowerCase()
        ? prev
        : match,
    );
  }, [clientUsername, clientes, loading]);

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

  // Loading state
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
              width: 28,
              height: 28,
              border: "3px solid #f0f0f0",
              borderTop: "3px solid #2563eb",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <div style={{ color: "#9ca3af", fontSize: 13 }}>
            Cargando clientes...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Error state
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
              fontSize: 14,
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

  // ── Client Document View ──
  if (selectedClient) {
    return (
      <div style={{ fontFamily: FONT }}>
        {/* Back + Client header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <button
            onClick={handleBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              fontFamily: FONT,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f9fafb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Volver
          </button>

          {/* Avatar + info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#1e40af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {(selectedClient.username || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                {selectedClient.username}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                {selectedClient.email}
              </div>
            </div>
          </div>
        </div>

        <DocumentosUnificadosView ownerUsername={selectedClient.username} />
      </div>
    );
  }

  // ── Client List View ──
  return (
    <div style={{ fontFamily: FONT, maxWidth: 860 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#1e40af",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
            }}
          >
            Documentación
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
            Selecciona un cliente para ver sus documentos.
          </p>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>
          {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <svg width="14" height="14" fill="#9ca3af" viewBox="0 0 16 16">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar cliente..."
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
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {searchQuery && (
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
          {filteredClients.length} resultado
          {filteredClients.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Client list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {filteredClients.map((client) => (
          <div
            key={client.id}
            onClick={() => handleSelectClient(client)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: "#1e40af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {(client.username || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1f2937",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {client.username}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {client.email}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>
              {new Date(client.createdAt).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        ))}
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
            ? `Sin resultados para "${searchQuery}"`
            : "No hay clientes asignados."}
        </div>
      )}
    </div>
  );
}

export default Documentacion;
