// src/components/administrador/ejecutivos-management.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../../auth/AuthContext";

interface Ejecutivo {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  clientesAsignados: number;
  createdAt: string;
}

interface Cliente {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

function EjecutivosManagement() {
  const { token } = useAuth();
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [activo, setActivo] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<Ejecutivo | null>(
    null,
  );
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const fetchEjecutivos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/ejecutivos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al cargar ejecutivos");
      }

      const data = await response.json();
      setEjecutivos(data.ejecutivos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientesEjecutivo = async (ejecutivoId: string) => {
    setLoadingClientes(true);
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al cargar clientes");
      }

      const data = await response.json();
      const clientesFiltrados = data.users.filter(
        (user: any) =>
          user.ejecutivo?.id === ejecutivoId && user.username !== "Ejecutivo",
      );
      setClientes(clientesFiltrados);
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleOpenModal = (ejecutivo: Ejecutivo) => {
    if (ejecutivo.clientesAsignados === 0) return;
    setSelectedEjecutivo(ejecutivo);
    setShowModal(true);
    fetchClientesEjecutivo(ejecutivo.id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEjecutivo(null);
    setClientes([]);
  };

  useEffect(() => {
    fetchEjecutivos();
  }, [token]);

  const resetForm = () => {
    setNombre("");
    setEmail("");
    setTelefono("");
    setActivo(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = editingId
        ? `/api/admin/ejecutivos/${editingId}`
        : "/api/admin/ejecutivos";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, email, telefono, activo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar ejecutivo");
      }

      setSuccess(
        editingId
          ? "Ejecutivo actualizado exitosamente"
          : "Ejecutivo creado exitosamente",
      );
      resetForm();
      fetchEjecutivos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (ejecutivo: Ejecutivo) => {
    setEditingId(ejecutivo.id);
    setNombre(ejecutivo.nombre);
    setEmail(ejecutivo.email);
    setTelefono(ejecutivo.telefono);
    setActivo(ejecutivo.activo);
    setShowForm(true);
  };

  const handleDelete = async (
    ejecutivoId: string,
    ejecutivoNombre: string,
    clientesAsignados: number,
  ) => {
    if (clientesAsignados > 0) {
      alert(
        `No se puede eliminar. Hay ${clientesAsignados} cliente(s) asignado(s) a este ejecutivo.`,
      );
      return;
    }

    if (
      !confirm(`¿Estás seguro de eliminar al ejecutivo ${ejecutivoNombre}?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/ejecutivos/${ejecutivoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar ejecutivo");
      }

      setSuccess("Ejecutivo eliminado exitosamente");
      fetchEjecutivos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#1f2937",
                  marginBottom: "8px",
                  letterSpacing: "-0.5px",
                }}
              >
                Gestión de Ejecutivos
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                Crear, editar y administrar ejecutivos de cuenta
              </p>
            </div>
            <button
              onClick={() => {
                if (showForm && !editingId) {
                  resetForm();
                } else if (showForm && editingId) {
                  resetForm();
                } else {
                  setShowForm(true);
                }
              }}
              style={{
                backgroundColor: showForm ? "#6b7280" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = showForm
                  ? "#4b5563"
                  : "#1d4ed8")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = showForm
                  ? "#6b7280"
                  : "#2563eb")
              }
            >
              {showForm ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                  </svg>
                  Cancelar
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                  </svg>
                  Nuevo Ejecutivo
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "24px",
            color: "#991b1b",
            animation: "slideDown 0.3s ease",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            backgroundColor: "#d1fae5",
            border: "1px solid #a7f3d0",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "24px",
            color: "#065f46",
            animation: "slideDown 0.3s ease",
          }}
        >
          {success}
        </div>
      )}

      {showForm && (
        <div className="row mb-4" style={{ animation: "fadeIn 0.3s ease" }}>
          <div className="col-lg-6">
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "32px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
              }}
            >
              <h5
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "24px",
                }}
              >
                {editingId ? "Editar Ejecutivo" : "Crear Nuevo Ejecutivo"}
              </h5>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    placeholder="Juan Pérez"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "15px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#3b82f6")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#d1d5db")
                    }
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ejecutivo@seemann.com"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "15px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#3b82f6")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#d1d5db")
                    }
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required
                    placeholder="+56 9 1234 5678"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "15px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#3b82f6")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#d1d5db")
                    }
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={(e) => setActivo(e.target.checked)}
                      style={{
                        width: "18px",
                        height: "18px",
                        marginRight: "8px",
                        cursor: "pointer",
                      }}
                    />
                    Ejecutivo activo
                  </label>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "6px",
                      marginBottom: 0,
                      marginLeft: "26px",
                    }}
                  >
                    Los ejecutivos inactivos no aparecerán en el selector al
                    crear usuarios
                  </p>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="submit"
                    disabled={formLoading}
                    style={{
                      flex: 1,
                      backgroundColor: formLoading ? "#93c5fd" : "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "14px",
                      fontSize: "15px",
                      fontWeight: "600",
                      cursor: formLoading ? "not-allowed" : "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!formLoading)
                        e.currentTarget.style.backgroundColor = "#1d4ed8";
                    }}
                    onMouseLeave={(e) => {
                      if (!formLoading)
                        e.currentTarget.style.backgroundColor = "#2563eb";
                    }}
                  >
                    {formLoading
                      ? editingId
                        ? "Actualizando..."
                        : "Creando..."
                      : editingId
                        ? "Actualizar Ejecutivo"
                        : "Crear Ejecutivo"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      style={{
                        padding: "14px 24px",
                        backgroundColor: "transparent",
                        color: "#6b7280",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "15px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f3f4f6")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <h5
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                Ejecutivos Registrados ({ejecutivos.length})
              </h5>
            </div>

            {loading ? (
              <div style={{ padding: "60px", textAlign: "center" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "4px solid #e5e7eb",
                    borderTop: "4px solid #3b82f6",
                    borderRadius: "50%",
                    margin: "0 auto 16px",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                <p style={{ color: "#6b7280" }}>Cargando ejecutivos...</p>
              </div>
            ) : ejecutivos.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 16px",
                    borderRadius: "50%",
                    backgroundColor: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    fill="#9ca3af"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm.256 7a4.474 4.474 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10c.26 0 .507.009.74.025.226-.341.496-.65.804-.918C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4s1 1 1 1h5.256Z" />
                  </svg>
                </div>
                <p style={{ color: "#6b7280", fontSize: "15px" }}>
                  No hay ejecutivos registrados
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb" }}>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Nombre
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Email
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Teléfono
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Clientes
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Estado
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ejecutivos.map((ejecutivo, index) => (
                      <tr
                        key={ejecutivo.id}
                        style={{
                          borderTop: "1px solid #e5e7eb",
                          animation: `fadeInUp 0.3s ease ${index * 0.05}s backwards`,
                        }}
                      >
                        <td
                          style={{
                            padding: "16px 24px",
                            fontSize: "14px",
                            color: "#1f2937",
                            fontWeight: "500",
                          }}
                        >
                          {ejecutivo.nombre}
                        </td>
                        <td
                          style={{
                            padding: "16px 24px",
                            fontSize: "14px",
                            color: "#6b7280",
                          }}
                        >
                          {ejecutivo.email}
                        </td>
                        <td
                          style={{
                            padding: "16px 24px",
                            fontSize: "14px",
                            color: "#6b7280",
                          }}
                        >
                          {ejecutivo.telefono}
                        </td>
                        <td
                          style={{
                            padding: "16px 24px",
                            textAlign: "center",
                          }}
                        >
                          <span
                            onClick={() => handleOpenModal(ejecutivo)}
                            style={{
                              backgroundColor:
                                ejecutivo.clientesAsignados > 0
                                  ? "#dbeafe"
                                  : "#f3f4f6",
                              color:
                                ejecutivo.clientesAsignados > 0
                                  ? "#1e40af"
                                  : "#6b7280",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor:
                                ejecutivo.clientesAsignados > 0
                                  ? "pointer"
                                  : "default",
                              transition: "all 0.2s",
                              display: "inline-block",
                            }}
                            onMouseEnter={(e) => {
                              if (ejecutivo.clientesAsignados > 0) {
                                e.currentTarget.style.backgroundColor =
                                  "#bfdbfe";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (ejecutivo.clientesAsignados > 0) {
                                e.currentTarget.style.backgroundColor =
                                  "#dbeafe";
                                e.currentTarget.style.transform = "scale(1)";
                              }
                            }}
                          >
                            {ejecutivo.clientesAsignados}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "16px 24px",
                            textAlign: "center",
                          }}
                        >
                          <span
                            style={{
                              padding: "4px 10px",
                              backgroundColor: ejecutivo.activo
                                ? "#d1fae5"
                                : "#fee2e2",
                              color: ejecutivo.activo ? "#065f46" : "#991b1b",
                              fontSize: "12px",
                              fontWeight: "600",
                              borderRadius: "12px",
                            }}
                          >
                            {ejecutivo.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "16px 24px",
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "flex-end",
                            }}
                          >
                            <button
                              onClick={() => handleEdit(ejecutivo)}
                              style={{
                                backgroundColor: "transparent",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#eff6ff";
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                              }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(
                                  ejecutivo.id,
                                  ejecutivo.nombre,
                                  ejecutivo.clientesAsignados,
                                )
                              }
                              style={{
                                backgroundColor: "transparent",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#fee2e2";
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Clientes */}
      {showModal && (
        <>
          <div
            onClick={handleCloseModal}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              animation: "fadeIn 0.2s ease",
            }}
          />

          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              zIndex: 1001,
              width: "90%",
              maxWidth: "700px",
              maxHeight: "80vh",
              overflow: "hidden",
              animation: "slideIn 0.3s ease",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 6px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <svg width="24" height="24" fill="white" viewBox="0 0 16 16">
                    <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                  </svg>
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#1f2937",
                      margin: 0,
                      marginBottom: "4px",
                    }}
                  >
                    Clientes de {selectedEjecutivo?.nombre}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      margin: 0,
                    }}
                  >
                    {selectedEjecutivo?.clientesAsignados} cliente
                    {selectedEjecutivo?.clientesAsignados !== 1 ? "s" : ""}{" "}
                    asignado
                    {selectedEjecutivo?.clientesAsignados !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "8px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
                  e.currentTarget.style.color = "#1f2937";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                <svg
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                </svg>
              </button>
            </div>

            <div
              style={{
                maxHeight: "calc(80vh - 120px)",
                overflowY: "auto",
                padding: "24px",
              }}
            >
              {loadingClientes ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "4px solid #e5e7eb",
                      borderTop: "4px solid #3b82f6",
                      borderRadius: "50%",
                      margin: "0 auto 16px",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  <p style={{ color: "#6b7280" }}>Cargando clientes...</p>
                </div>
              ) : clientes.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      margin: "0 auto 16px",
                      borderRadius: "50%",
                      backgroundColor: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="32"
                      height="32"
                      fill="#9ca3af"
                      viewBox="0 0 16 16"
                    >
                      <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm.256 7a4.474 4.474 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10c.26 0 .507.009.74.025.226-.341.496-.65.804-.918C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4s1 1 1 1h5.256Z" />
                    </svg>
                  </div>
                  <p style={{ color: "#6b7280", fontSize: "15px" }}>
                    No hay clientes asignados
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {clientes.map((cliente, index) => (
                    <div
                      key={cliente.id}
                      style={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "16px",
                        transition: "all 0.2s",
                        animation: `fadeInUp 0.3s ease ${index * 0.05}s backwards`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                        e.currentTarget.style.borderColor = "#d1d5db";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px rgba(0, 0, 0, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background:
                              "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            fill="#3b82f6"
                            viewBox="0 0 16 16"
                          >
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "600",
                              color: "#1f2937",
                              marginBottom: "4px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {cliente.username}
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#6b7280",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {cliente.email}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#9ca3af",
                            flexShrink: 0,
                          }}
                        >
                          {formatDate(cliente.createdAt).split(",")[0]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default EjecutivosManagement;
