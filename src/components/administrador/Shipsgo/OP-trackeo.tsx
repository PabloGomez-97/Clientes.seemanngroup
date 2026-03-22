// OP Tracking (ALL clients) — Reuses ShipsGoTracking + CreateShipmentForm / CreateOceanShipmentForm
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../auth/AuthContext";
import ShipsGoTracking from "../../Sidebar/Shipsgotracking";
import CreateShipmentForm from "../../Sidebar/CreateShipmentForm";
import CreateOceanShipmentForm from "../../Sidebar/CreateOceanShipmentForm";
import type {
  AirShipment,
  OceanShipment,
  AirResponse,
  OceanResponse,
} from "../../Sidebar/shipsgo/types";

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

interface Cliente {
  id: string;
  email: string;
  username: string;
  usernames: string[];
  nombreuser: string;
  createdAt: string;
}

type CreateFormType = "air" | "ocean" | null;

interface CreateFormState {
  type: Exclude<CreateFormType, null>;
  referenceUsername: string;
}

function ShipsGoTrackingAdminOP() {
  const { token } = useAuth();

  // Client list
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Shipment counts per reference (for summary badges)
  const [airShipments, setAirShipments] = useState<AirShipment[]>([]);
  const [oceanShipments, setOceanShipments] = useState<OceanShipment[]>([]);
  const [shipmentsLoaded, setShipmentsLoaded] = useState(false);

  // Selected client
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

  // Create tracking modal
  const [showCreateForm, setShowCreateForm] = useState<CreateFormState | null>(
    null,
  );

  // Key to force remount ShipsGoTracking after creating a new tracking
  const [trackingKey, setTrackingKey] = useState(0);

  // ── Fetch clients ──
  useEffect(() => {
    const fetchClientes = async () => {
      if (!token) return;
      setClientsLoading(true);
      try {
        const resp = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error("Error al cargar usuarios");
        const data = await resp.json();
        const users: Cliente[] = (data.users || [])
          .filter((u: Cliente) => u.username !== "Ejecutivo")
          .sort((a: Cliente, b: Cliente) =>
            a.username.localeCompare(b.username, "es", { sensitivity: "base" }),
          );
        setClientes(users);
      } catch (e) {
        setClientsError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClientes();
  }, [token]);

  // ── Fetch all shipments for counts ──
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [airRes, oceanRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/shipsgo/shipments`),
          fetch(`${API_BASE_URL}/api/shipsgo/ocean/shipments`),
        ]);
        if (airRes.ok) {
          const airData: AirResponse = await airRes.json();
          setAirShipments(airData.shipments);
        }
        if (oceanRes.ok) {
          const oceanData: OceanResponse = await oceanRes.json();
          setOceanShipments(oceanData.shipments);
        }
      } catch {
        // Non-critical: counts just won't show
      } finally {
        setShipmentsLoaded(true);
      }
    };
    fetchAll();
  }, []);

  // ── Count shipments per client (using all usernames) ──
  const clientShipmentCounts = useMemo(() => {
    const map = new Map<string, { air: number; ocean: number }>();
    for (const client of clientes) {
      const names =
        client.usernames?.length > 0 ? client.usernames : [client.username];
      let air = 0;
      let ocean = 0;
      for (const name of names) {
        air += airShipments.filter((s) => s.reference === name).length;
        ocean += oceanShipments.filter((s) => s.reference === name).length;
      }
      map.set(client.id, { air, ocean });
    }
    return map;
  }, [clientes, airShipments, oceanShipments]);

  // Total shipments
  const totalAir = airShipments.length;
  const totalOcean = oceanShipments.length;

  // ── Filtered clients ──
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientes;
    const q = searchQuery.toLowerCase();
    return clientes.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.nombreuser && c.nombreuser.toLowerCase().includes(q)) ||
        (c.usernames && c.usernames.some((u) => u.toLowerCase().includes(q))),
    );
  }, [clientes, searchQuery]);

  const handleSelectClient = useCallback((client: Cliente) => {
    setSelectedClient(client);
    setShowCreateForm(null);
    setTrackingKey((k) => k + 1);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedClient(null);
    setShowCreateForm(null);
  }, []);

  const handleNewTracking = useCallback(
    (type: "air" | "ocean", referenceUsername: string) => {
      setShowCreateForm({ type, referenceUsername });
    },
    [],
  );

  const handleCreateSuccess = useCallback(() => {
    setShowCreateForm(null);
    setTrackingKey((k) => k + 1);
  }, []);

  const handleCreateCancel = useCallback(() => {
    setShowCreateForm(null);
  }, []);

  // ── Loading ──
  if (clientsLoading) {
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
              animation: "sgadm-spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ color: "#8d99a8", fontSize: 13 }}>
            Cargando clientes...
          </div>
          <style>{`@keyframes sgadm-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (clientsError) {
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
          <div style={{ fontSize: 13, color: "#6b7280" }}>{clientsError}</div>
        </div>
      </div>
    );
  }

  // ── Client Detail View (reuses ShipsGoTracking) ──
  if (selectedClient) {
    const clientUsernames =
      selectedClient.usernames?.length > 0
        ? selectedClient.usernames
        : [selectedClient.username];

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
          <div style={{ flex: 1 }}>
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
              {selectedClient.email}
              {clientUsernames.length > 1 && (
                <span style={{ marginLeft: 8, color: "#9ca3af" }}>
                  · {clientUsernames.length} cuentas
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Account selector for clients with multiple usernames */}
        {clientUsernames.length > 1 && (
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#6b7280",
                alignSelf: "center",
                marginRight: 4,
              }}
            >
              Cuentas:
            </span>
            {clientUsernames.map((name) => (
              <span
                key={name}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #e5e7eb",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Create form modal overlay */}
        {showCreateForm && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateForm(null);
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                maxWidth: 640,
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto",
                boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Crear tracking{" "}
                    {showCreateForm.type === "air" ? "aéreo" : "marítimo"}
                  </h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    Para: <strong>{showCreateForm.referenceUsername}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateForm(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 20,
                    color: "#9ca3af",
                    padding: 4,
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: "0 8px" }}>
                {showCreateForm.type === "air" ? (
                  <CreateShipmentForm
                    referenceUsername={showCreateForm.referenceUsername}
                    onSuccess={handleCreateSuccess}
                    onCancel={handleCreateCancel}
                  />
                ) : (
                  <CreateOceanShipmentForm
                    referenceUsername={showCreateForm.referenceUsername}
                    onSuccess={handleCreateSuccess}
                    onCancel={handleCreateCancel}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reuse ShipsGoTracking for each username */}
        {clientUsernames.map((name) => (
          <div
            key={`${name}-${trackingKey}`}
            style={{ marginBottom: clientUsernames.length > 1 ? 32 : 0 }}
          >
            <ShipsGoTracking
              filterUsername={name}
              onNewTracking={(type) => handleNewTracking(type, name)}
            />
          </div>
        ))}
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
          Rastreo de Envíos
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
          Selecciona un cliente para ver y gestionar sus trackeos.
        </p>
      </div>

      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 20,
          padding: "14px 20px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#1f2937" }}>
            {clientes.length}
          </span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>clientes</span>
        </div>
        {shipmentsLoaded && (
          <>
            <div style={{ width: 1, height: 28, background: "#e5e7eb" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15 }}>✈️</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#1f2937" }}>
                {totalAir}
              </span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>aéreos</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15 }}>🚢</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#1f2937" }}>
                {totalOcean}
              </span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>marítimos</span>
            </div>
          </>
        )}
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
          const counts = clientShipmentCounts.get(client.id);
          const airCount = counts?.air ?? 0;
          const oceanCount = counts?.ocean ?? 0;
          const totalCount = airCount + oceanCount;

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

              {/* Shipment counts */}
              {shipmentsLoaded && totalCount > 0 && (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {airCount > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "#eff6ff",
                        color: "#2563eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✈️ {airCount}
                    </span>
                  )}
                  {oceanCount > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "#f0fdf4",
                        color: "#16a34a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🚢 {oceanCount}
                    </span>
                  )}
                </div>
              )}

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
            : "No hay clientes registrados."}
        </div>
      )}
    </div>
  );
}

export default ShipsGoTrackingAdminOP;
