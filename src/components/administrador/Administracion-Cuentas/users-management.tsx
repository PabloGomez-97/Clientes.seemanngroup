// src/components/administrador/users-management.tsx
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { useAuditLog } from "../../../hooks/useAuditLog";
import { validateRoles, getRoleLabels } from "../../../config/roleRoutes";
import * as XLSX from "xlsx";

interface Ejecutivo {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  roles?: {
    administrador: boolean;
    pricing: boolean;
    ejecutivo: boolean;
  };
}

interface User {
  id: string;
  email: string;
  username: string;
  usernames: string[];
  nombreuser: string;
  createdAt: string;
  ejecutivo: Ejecutivo | null;
}

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

function UsersManagement() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { token } = useAuth();
  const { registrarEvento } = useAuditLog();
  const [users, setUsers] = useState<User[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ✨ NUEVO: Estado para el toggle
  const [showAdmins, setShowAdmins] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [usernames, setUsernames] = useState<string[]>([""]);
  const [nombreuser, setNombreuser] = useState("");
  const [password, setPassword] = useState("");
  const [ejecutivoId, setEjecutivoId] = useState<string>("");
  const [formLoading, setFormLoading] = useState(false);

  // Estado de roles para edición de ejecutivos
  const [isEditingEjecutivo, setIsEditingEjecutivo] = useState(false);
  const [editRoles, setEditRoles] = useState({
    administrador: false,
    pricing: false,
    ejecutivo: true,
  });

  // Cargar ejecutivos
  const fetchEjecutivos = async () => {
    try {
      const response = await fetch("/api/admin/ejecutivos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEjecutivos(data.ejecutivos.filter((e: any) => e.activo));
      }
    } catch (err) {
      console.error("Error al cargar ejecutivos:", err);
    }
  };

  // Cargar usuarios
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEjecutivos();
    fetchUsers();
  }, [token]);

  // ✨ NUEVO: Filtrar usuarios según el toggle
  const filteredUsers = users.filter((user) => {
    const isAdmin = user.username === "Ejecutivo";
    return showAdmins ? isAdmin : !isAdmin;
  });

  // ✨ NUEVO: Contar admins y usuarios
  const adminCount = users.filter((u) => u.username === "Ejecutivo").length;
  const userCount = users.filter((u) => u.username !== "Ejecutivo").length;

  const resetForm = () => {
    setEmail("");
    setUsernames([""]);
    setNombreuser("");
    setPassword("");
    setEjecutivoId("");
    setEditingUserId(null);
    setShowForm(false);
    setIsEditingEjecutivo(false);
    setEditRoles({ administrador: false, pricing: false, ejecutivo: true });
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEmail(user.email);
    setUsernames(
      user.usernames && user.usernames.length > 0
        ? [...user.usernames]
        : [user.username],
    );
    setNombreuser(user.nombreuser);
    setPassword("");
    setEjecutivoId(user.ejecutivo?.id || "");

    // Si es un ejecutivo, buscar sus roles en la lista de ejecutivos
    if (user.username === "Ejecutivo") {
      setIsEditingEjecutivo(true);
      const matchingEj = ejecutivos.find((e) => e.email === user.email);
      if (matchingEj?.roles) {
        setEditRoles({ ...matchingEj.roles });
      } else {
        setEditRoles({ administrador: false, pricing: false, ejecutivo: true });
      }
    } else {
      setIsEditingEjecutivo(false);
    }

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    // Filtrar usernames vacíos
    const cleanUsernames = usernames.map((u) => u.trim()).filter(Boolean);
    if (cleanUsernames.length === 0) {
      setError("Debe agregar al menos una empresa");
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username: cleanUsernames[0],
          usernames: cleanUsernames,
          nombreuser,
          password,
          ejecutivoId: ejecutivoId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear usuario");
      }

      setSuccess("Usuario creado exitosamente");
      // Registrar auditoría
      registrarEvento({
        accion: "USUARIO_CREADO",
        categoria: "GESTION_USUARIOS",
        descripcion: `Usuario creado: ${nombreuser} (${email})`,
        detalles: {
          email,
          usernames: cleanUsernames,
          nombreuser,
          ejecutivoId: ejecutivoId || "sin asignar",
        },
      });
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    // Validar roles si es ejecutivo
    if (isEditingEjecutivo) {
      const roleError = validateRoles(editRoles);
      if (roleError) {
        setError(roleError);
        setFormLoading(false);
        return;
      }
    }

    try {
      const cleanUsernames = usernames.map((u) => u.trim()).filter(Boolean);

      const updateData: any = isEditingEjecutivo
        ? {
            nombreuser,
            roles: editRoles,
          }
        : {
            username: cleanUsernames[0] || "",
            usernames: cleanUsernames,
            nombreuser,
            ejecutivoId: ejecutivoId || null,
          };

      if (password.trim()) {
        updateData.password = password;
      }

      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar usuario");
      }

      setSuccess(
        isEditingEjecutivo
          ? "Ejecutivo actualizado exitosamente"
          : "Usuario actualizado exitosamente",
      );

      // Registrar auditoría
      registrarEvento({
        accion: isEditingEjecutivo
          ? "EJECUTIVO_ACTUALIZADO"
          : "USUARIO_ACTUALIZADO",
        categoria: isEditingEjecutivo
          ? "GESTION_EJECUTIVOS"
          : "GESTION_USUARIOS",
        descripcion: isEditingEjecutivo
          ? `Ejecutivo actualizado: ${nombreuser} (${email}) — Roles: ${getRoleLabels(editRoles).join(", ")}`
          : `Usuario actualizado: ${nombreuser} (ID: ${editingUserId})`,
        detalles: isEditingEjecutivo
          ? {
              userId: editingUserId,
              email,
              nombreuser,
              roles: editRoles,
              passwordChanged: !!password.trim(),
            }
          : {
              userId: editingUserId,
              usernames: usernames.map((u) => u.trim()).filter(Boolean),
              nombreuser,
              ejecutivoId: ejecutivoId || "sin asignar",
              passwordChanged: !!password.trim(),
            },
      });
      resetForm();
      fetchUsers();
      if (isEditingEjecutivo) fetchEjecutivos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = editingUserId ? handleUpdateUser : handleCreateUser;

  const handleDeleteUser = async (
    userId: string,
    userEmail: string,
    isEjecutivo: boolean = false,
  ) => {
    const label = isEjecutivo ? "ejecutivo" : "usuario";
    if (!confirm(`¿Estás seguro de eliminar al ${label} ${userEmail}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error al eliminar ${label}`);
      }

      setSuccess(
        `${isEjecutivo ? "Ejecutivo" : "Usuario"} eliminado exitosamente`,
      );
      // Registrar auditoría
      registrarEvento({
        accion: isEjecutivo ? "EJECUTIVO_ELIMINADO" : "USUARIO_ELIMINADO",
        categoria: isEjecutivo ? "GESTION_EJECUTIVOS" : "GESTION_USUARIOS",
        descripcion: `${isEjecutivo ? "Ejecutivo" : "Usuario"} eliminado: ${userEmail}`,
        detalles: {
          userId,
          email: userEmail,
        },
      });
      fetchUsers();
      if (isEjecutivo) fetchEjecutivos();
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

  // Función para descargar Excel de clientes
  const handleDownloadClients = () => {
    const clients = users.filter((user) => user.username !== "Ejecutivo");
    const data = clients.map((user) => ({
      Email: user.email,
      "Nombre/Empresa": (user.usernames && user.usernames.length > 0
        ? user.usernames
        : [user.username]
      ).join(" | "),
      Ejecutivo: user.ejecutivo
        ? `${user.ejecutivo.nombre} - ${user.ejecutivo.email}`
        : "Sin asignar",
      Creado: formatDate(user.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "clientes_portal.xlsx");
  };

  return (
    <div className="container-fluid">
      {/* Header con estadísticas */}
      <div className="row mb-4">
        <div className="col">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
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
                Gestión de Usuarios
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                Administra cuentas de clientes y ejecutivos del sistema
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {!showAdmins && (
                <button
                  onClick={handleDownloadClients}
                  style={{
                    backgroundColor: "#10b981",
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
                    (e.currentTarget.style.backgroundColor = "#059669")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#10b981")
                  }
                >
                  <svg
                    width="18"
                    height="18"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                  </svg>
                  Descargar Excel
                </button>
              )}
              {(!showAdmins || showForm) && (
                <button
                  onClick={() => {
                    if (showForm) {
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
                      Crear Usuario
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ✨ NUEVO: Cards de Estadísticas con Toggle */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            {/* Card Usuarios */}
            <div
              onClick={() => setShowAdmins(false)}
              style={{
                backgroundColor: showAdmins ? "white" : "#eff6ff",
                border: showAdmins ? "1px solid #e5e7eb" : "2px solid #3b82f6",
                borderRadius: "12px",
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                transform: showAdmins ? "scale(1)" : "scale(1.02)",
                boxShadow: showAdmins
                  ? "0 1px 3px rgba(0,0,0,0.1)"
                  : "0 4px 12px rgba(59, 130, 246, 0.2)",
              }}
              onMouseEnter={(e) => {
                if (showAdmins) {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (showAdmins) {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    backgroundColor: showAdmins ? "#dbeafe" : "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    fill={showAdmins ? "#3b82f6" : "white"}
                    viewBox="0 0 16 16"
                  >
                    <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                  </svg>
                </div>
                {!showAdmins && (
                  <div
                    style={{
                      backgroundColor: "#10b981",
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      animation: "pulse 2s infinite",
                    }}
                  >
                    ACTIVO
                  </div>
                )}
              </div>
              <h3
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: showAdmins ? "#1f2937" : "#1e40af",
                  marginBottom: "4px",
                  transition: "all 0.3s ease",
                }}
              >
                {userCount}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: showAdmins ? "#6b7280" : "#1e40af",
                  fontWeight: showAdmins ? "500" : "600",
                  margin: 0,
                }}
              >
                Clientes / Usuarios
              </p>
            </div>

            {/* Card Ejecutivos */}
            <div
              onClick={() => setShowAdmins(true)}
              style={{
                backgroundColor: showAdmins ? "#faf5ff" : "white",
                border: showAdmins ? "2px solid #a855f7" : "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                transform: showAdmins ? "scale(1.02)" : "scale(1)",
                boxShadow: showAdmins
                  ? "0 4px 12px rgba(168, 85, 247, 0.2)"
                  : "0 1px 3px rgba(0,0,0,0.1)",
              }}
              onMouseEnter={(e) => {
                if (!showAdmins) {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!showAdmins) {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    backgroundColor: showAdmins ? "#a855f7" : "#f3e8ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    fill={showAdmins ? "white" : "#a855f7"}
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
                    <path
                      fillRule="evenodd"
                      d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5Z"
                    />
                  </svg>
                </div>
                {showAdmins && (
                  <div
                    style={{
                      backgroundColor: "#10b981",
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      animation: "pulse 2s infinite",
                    }}
                  >
                    ACTIVO
                  </div>
                )}
              </div>
              <h3
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: showAdmins ? "#7e22ce" : "#1f2937",
                  marginBottom: "4px",
                  transition: "all 0.3s ease",
                }}
              >
                {adminCount}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: showAdmins ? "#7e22ce" : "#6b7280",
                  fontWeight: showAdmins ? "600" : "500",
                  margin: 0,
                }}
              >
                Ejecutivos
              </p>
            </div>

            {/* Card Total */}
            <div
              style={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="24" height="24" fill="white" viewBox="0 0 16 16">
                    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  </svg>
                </div>
              </div>
              <h3
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#1f2937",
                  marginBottom: "4px",
                }}
              >
                {users.length}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontWeight: "500",
                  margin: 0,
                }}
              >
                Total de Cuentas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
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

      {/* Formulario de creación/edición */}
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
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {editingUserId ? (
                  <>
                    <svg
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                      <path
                        fillRule="evenodd"
                        d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"
                      />
                    </svg>
                    {isEditingEjecutivo ? "Editar Ejecutivo" : "Editar Usuario"}
                  </>
                ) : (
                  "Crear Nuevo Usuario"
                )}
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
                    Email del Cliente *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!editingUserId}
                    disabled={!!editingUserId}
                    placeholder="cliente@empresa.com"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "15px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      backgroundColor: editingUserId ? "#f3f4f6" : "white",
                      cursor: editingUserId ? "not-allowed" : "text",
                    }}
                    onFocus={(e) =>
                      !editingUserId &&
                      (e.currentTarget.style.borderColor = "#3b82f6")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#d1d5db")
                    }
                  />
                  {editingUserId && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "4px",
                        marginBottom: 0,
                      }}
                    >
                      El email no se puede modificar
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    {isEditingEjecutivo
                      ? "Nombre del Ejecutivo *"
                      : "Nombre del Cliente *"}
                  </label>
                  <input
                    type="text"
                    value={nombreuser}
                    onChange={(e) => setNombreuser(e.target.value)}
                    required
                    placeholder="Ej: Juan Pérez / Empresa S.A."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      transition: "all 0.2s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px rgba(59, 130, 246, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#d1d5db";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                {!isEditingEjecutivo && (
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
                      Nombre / Empresa *{" "}
                      {usernames.filter((u) => u.trim()).length > 1 && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            fontWeight: "400",
                          }}
                        >
                          ({usernames.filter((u) => u.trim()).length} empresas)
                        </span>
                      )}
                    </label>

                    {usernames.map((uname, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "8px",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={uname}
                          onChange={(e) => {
                            const updated = [...usernames];
                            updated[index] = e.target.value;
                            setUsernames(updated);
                          }}
                          required={index === 0}
                          placeholder={
                            index === 0
                              ? "EMPRESA PRINCIPAL SPA"
                              : `Empresa ${index + 1}`
                          }
                          style={{
                            flex: 1,
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
                        {usernames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = usernames.filter(
                                (_, i) => i !== index,
                              );
                              setUsernames(updated);
                            }}
                            style={{
                              backgroundColor: "transparent",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                              borderRadius: "6px",
                              padding: "8px 10px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#fee2e2")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "transparent")
                            }
                            title="Eliminar empresa"
                          >
                            <svg
                              width="16"
                              height="16"
                              fill="currentColor"
                              viewBox="0 0 16 16"
                            >
                              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setUsernames([...usernames, ""])}
                      style={{
                        backgroundColor: "transparent",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "8px 14px",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "4px",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#eff6ff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <svg
                        width="14"
                        height="14"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                      </svg>
                      Agregar empresa
                    </button>

                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "6px",
                        marginBottom: 0,
                      }}
                    >
                      Puedes asignar múltiples empresas al mismo cliente. La
                      primera será la empresa principal.
                    </p>
                  </div>
                )}

                {/* Roles del ejecutivo (solo visible al editar ejecutivos) */}
                {isEditingEjecutivo && (
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "12px",
                      }}
                    >
                      Roles del Ejecutivo *
                    </label>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {/* Administrador */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: editRoles.administrador
                            ? "2px solid #7e22ce"
                            : "1px solid #d1d5db",
                          cursor: "pointer",
                          backgroundColor: editRoles.administrador
                            ? "#faf5ff"
                            : "white",
                          transition: "all 0.2s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editRoles.administrador}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditRoles({
                                administrador: true,
                                pricing: false,
                                ejecutivo: false,
                              });
                            } else {
                              setEditRoles({
                                administrador: false,
                                pricing: false,
                                ejecutivo: true,
                              });
                            }
                          }}
                          style={{
                            width: "18px",
                            height: "18px",
                            accentColor: "#7e22ce",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: "600",
                              fontSize: "14px",
                              color: "#1f2937",
                            }}
                          >
                            Administrador
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            Acceso completo a todas las funciones
                          </div>
                        </div>
                        {editRoles.administrador && (
                          <span
                            style={{
                              padding: "2px 8px",
                              backgroundColor: "#7e22ce",
                              color: "white",
                              fontSize: "11px",
                              fontWeight: "600",
                              borderRadius: "4px",
                            }}
                          >
                            EXCLUSIVO
                          </span>
                        )}
                      </label>

                      {/* Pricing */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: editRoles.pricing
                            ? "2px solid #2563eb"
                            : "1px solid #d1d5db",
                          cursor: editRoles.administrador
                            ? "not-allowed"
                            : "pointer",
                          backgroundColor: editRoles.pricing
                            ? "#eff6ff"
                            : "white",
                          opacity: editRoles.administrador ? 0.5 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editRoles.pricing}
                          disabled={editRoles.administrador}
                          onChange={(e) =>
                            setEditRoles({
                              ...editRoles,
                              pricing: e.target.checked,
                            })
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            accentColor: "#2563eb",
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: "600",
                              fontSize: "14px",
                              color: "#1f2937",
                            }}
                          >
                            Pricing
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            Acceso a cotizaciones y tarifas
                          </div>
                        </div>
                      </label>

                      {/* Ejecutivo */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: editRoles.ejecutivo
                            ? "2px solid #16a34a"
                            : "1px solid #d1d5db",
                          cursor: editRoles.administrador
                            ? "not-allowed"
                            : "pointer",
                          backgroundColor: editRoles.ejecutivo
                            ? "#f0fdf4"
                            : "white",
                          opacity: editRoles.administrador ? 0.5 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editRoles.ejecutivo}
                          disabled={editRoles.administrador}
                          onChange={(e) =>
                            setEditRoles({
                              ...editRoles,
                              ejecutivo: e.target.checked,
                            })
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            accentColor: "#16a34a",
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: "600",
                              fontSize: "14px",
                              color: "#1f2937",
                            }}
                          >
                            Ejecutivo
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            Acceso a clientes, trackeos y reportería
                          </div>
                        </div>
                      </label>
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "8px",
                        marginBottom: 0,
                      }}
                    >
                      Administrador es exclusivo y no puede combinarse con otros
                      roles
                    </p>
                  </div>
                )}

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
                    Contraseña {editingUserId ? "" : "*"}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUserId}
                    placeholder={
                      editingUserId
                        ? "Dejar en blanco para no cambiar"
                        : "Mínimo 6 caracteres"
                    }
                    minLength={password ? 6 : undefined}
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
                  {editingUserId && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "4px",
                        marginBottom: 0,
                      }}
                    >
                      Solo completa si deseas cambiar la contraseña
                    </p>
                  )}
                </div>

                {!isEditingEjecutivo && (
                  <div style={{ marginBottom: "24px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "8px",
                      }}
                    >
                      Ejecutivo Asignado
                    </label>
                    <select
                      value={ejecutivoId}
                      onChange={(e) => setEjecutivoId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        fontSize: "15px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        outline: "none",
                        transition: "border-color 0.2s",
                        backgroundColor: "white",
                        cursor: "pointer",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = "#3b82f6")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = "#d1d5db")
                      }
                    >
                      <option value="">Sin asignar</option>
                      {ejecutivos.map((ej) => (
                        <option key={ej.id} value={ej.id}>
                          {ej.nombre} - {ej.email}
                        </option>
                      ))}
                    </select>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "6px",
                        marginBottom: 0,
                      }}
                    >
                      {editingUserId
                        ? "Selecciona un ejecutivo diferente para reasignar el cliente"
                        : "El cliente verá los datos de contacto de su ejecutivo en el portal"}
                    </p>
                  </div>
                )}

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
                      ? editingUserId
                        ? "Actualizando..."
                        : "Creando..."
                      : editingUserId
                        ? isEditingEjecutivo
                          ? "Actualizar Ejecutivo"
                          : "Actualizar Usuario"
                        : "Crear Usuario"}
                  </button>

                  {editingUserId && (
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
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
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

      {/* ✨ Lista de usuarios filtrada con animación */}
      <div className="row">
        <div className="col-12">
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
              animation: "fadeIn 0.3s ease",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                background: showAdmins
                  ? "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)"
                  : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h5
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#1f2937",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  {showAdmins ? (
                    <>
                      <svg
                        width="20"
                        height="20"
                        fill="#a855f7"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
                        <path
                          fillRule="evenodd"
                          d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5Z"
                        />
                      </svg>
                      Ejecutivos
                    </>
                  ) : (
                    <>
                      <svg
                        width="20"
                        height="20"
                        fill="#3b82f6"
                        viewBox="0 0 16 16"
                      >
                        <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                      </svg>
                      Clientes / Usuarios
                    </>
                  )}
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "13px",
                      fontWeight: "600",
                      backgroundColor: showAdmins ? "#f3e8ff" : "#dbeafe",
                      color: showAdmins ? "#7e22ce" : "#1e40af",
                    }}
                  >
                    {filteredUsers.length}
                  </span>
                </h5>
              </div>
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
                <p style={{ color: "#6b7280" }}>Cargando...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
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
                    <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm.256 7a4.474 4.474 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10c.26 0 .507.009.74.025.226-.341.496-.65.804-.918C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4s1 1 1 1h5.256Zm3.63-4.54c.18-.613 1.048-.613 1.229 0l.043.148a.64.64 0 0 0 .921.382l.136-.074c.561-.306 1.175.308.87.869l-.075.136a.64.64 0 0 0 .382.92l.149.045c.612.18.612 1.048 0 1.229l-.15.043a.64.64 0 0 0-.38.921l.074.136c.305.561-.309 1.175-.87.87l-.136-.075a.64.64 0 0 0-.92.382l-.045.149c-.18.612-1.048.612-1.229 0l-.043-.15a.64.64 0 0 0-.921-.38l-.136.074c-.561.305-1.175-.309-.87-.87l.075-.136a.64.64 0 0 0-.382-.92l-.148-.045c-.613-.18-.613-1.048 0-1.229l.148-.043a.64.64 0 0 0 .382-.921l-.074-.136c-.306-.561.308-1.175.869-.87l.136.075a.64.64 0 0 0 .92-.382l.045-.148ZM14 12.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                  </svg>
                </div>
                <p style={{ color: "#6b7280", fontSize: "15px" }}>
                  {showAdmins
                    ? "No hay ejecutivos registrados"
                    : "No hay clientes registrados"}
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
                        Email
                      </th>
                      {showAdmins && (
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
                          Nombre del Ejecutivo
                        </th>
                      )}
                      {showAdmins && (
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
                          Rol
                        </th>
                      )}
                      {!showAdmins && (
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
                          Empresas
                        </th>
                      )}
                      {!showAdmins && (
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
                          Ejecutivo
                        </th>
                      )}
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
                        Creado
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
                    {filteredUsers.map((user, index) => (
                      <tr
                        key={user.id}
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
                          }}
                        >
                          {user.email}
                        </td>
                        {showAdmins && (
                          <td
                            style={{
                              padding: "16px 24px",
                              fontSize: "14px",
                              color: "#1f2937",
                              fontWeight: "500",
                            }}
                          >
                            {user.nombreuser || "-"}
                          </td>
                        )}
                        {showAdmins && (
                          <td
                            style={{
                              padding: "16px 24px",
                              fontSize: "14px",
                            }}
                          >
                            {(() => {
                              const ej = ejecutivos.find(
                                (e) => e.email === user.email,
                              );
                              if (!ej?.roles)
                                return (
                                  <span
                                    style={{
                                      color: "var(--primary-color)",
                                      fontStyle: "italic",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Sin rol
                                  </span>
                                );
                              return (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "4px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {ej.roles.administrador && (
                                    <span
                                      style={{
                                        padding: "2px 8px",
                                        backgroundColor: "var(--primary-color)",
                                        color: "white",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      Admin
                                    </span>
                                  )}
                                  {ej.roles.pricing && (
                                    <span
                                      style={{
                                        padding: "2px 8px",
                                        backgroundColor: "var(--primary-color)",
                                        color: "white",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      Pricing
                                    </span>
                                  )}
                                  {ej.roles.ejecutivo && (
                                    <span
                                      style={{
                                        padding: "2px 8px",
                                        backgroundColor: "var(--primary-color)",
                                        color: "white",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      Ejecutivo
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        )}
                        {!showAdmins && (
                          <td
                            style={{
                              padding: "16px 24px",
                              fontSize: "14px",
                              color: "#1f2937",
                            }}
                          >
                            {(() => {
                              const names =
                                user.usernames && user.usernames.length > 0
                                  ? user.usernames
                                  : [user.username];
                              return (
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "4px",
                                  }}
                                >
                                  {names.map((name, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        padding: "2px 8px",
                                        backgroundColor:
                                          i === 0 ? "#dbeafe" : "#f3f4f6",
                                        color: i === 0 ? "#1e40af" : "#374151",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        borderRadius: "4px",
                                        border:
                                          i === 0
                                            ? "1px solid #bfdbfe"
                                            : "1px solid #e5e7eb",
                                      }}
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                        )}
                        {!showAdmins && (
                          <td
                            style={{
                              padding: "16px 24px",
                              fontSize: "14px",
                              color: "#6b7280",
                            }}
                          >
                            {user.ejecutivo ? (
                              <div>
                                <div
                                  style={{
                                    fontWeight: "500",
                                    color: "#1f2937",
                                  }}
                                >
                                  {user.ejecutivo.nombre}
                                </div>
                                <div
                                  style={{ fontSize: "12px", color: "#9ca3af" }}
                                >
                                  {user.ejecutivo.email}
                                </div>
                              </div>
                            ) : (
                              <span
                                style={{
                                  fontStyle: "italic",
                                  color: "#9ca3af",
                                }}
                              >
                                Sin asignar
                              </span>
                            )}
                          </td>
                        )}
                        <td
                          style={{
                            padding: "16px 24px",
                            fontSize: "14px",
                            color: "#6b7280",
                          }}
                        >
                          {formatDate(user.createdAt)}
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
                              onClick={() => handleEditUser(user)}
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
                                handleDeleteUser(
                                  user.id,
                                  user.email,
                                  user.username === "Ejecutivo",
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

      {/* ✨ Agregar animaciones CSS */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}

export default UsersManagement;
