// src/components/administrador/users-management.tsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  ejecutivoNombre?: string;    // ✅ NUEVO
  ejecutivoEmail?: string;     // ✅ NUEVO
  ejecutivoTelefono?: string;  // ✅ NUEVO
}

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

function UsersManagement() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ejecutivoNombre, setEjecutivoNombre] = useState('');      // ✅ NUEVO
  const [ejecutivoEmail, setEjecutivoEmail] = useState('');        // ✅ NUEVO
  const [ejecutivoTelefono, setEjecutivoTelefono] = useState('');  // ✅ NUEVO
  const [formLoading, setFormLoading] = useState(false);

  // Cargar usuarios
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  // Crear usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          username, 
          password,
          ejecutivoNombre,    // ✅ NUEVO
          ejecutivoEmail,     // ✅ NUEVO
          ejecutivoTelefono   // ✅ NUEVO
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      setSuccess('Usuario creado exitosamente');
      setEmail('');
      setUsername('');
      setPassword('');
      setEjecutivoNombre('');     // ✅ NUEVO
      setEjecutivoEmail('');      // ✅ NUEVO
      setEjecutivoTelefono('');   // ✅ NUEVO
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setFormLoading(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${userEmail}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      setSuccess('Usuario eliminado exitosamente');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '8px',
                letterSpacing: '-0.5px'
              }}>
                Gestión de Usuarios
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                margin: 0
              }}>
                Crear y administrar cuentas de usuarios
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              {showForm ? 'Cancelar' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '14px 16px',
          marginBottom: '24px',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#d1fae5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          padding: '14px 16px',
          marginBottom: '24px',
          color: '#065f46'
        }}>
          {success}
        </div>
      )}

      {/* Formulario de creación */}
      {showForm && (
        <div className="row mb-4">
          <div className="col-lg-8">
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h5 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '24px'
              }}>
                Crear Nuevo Usuario
              </h5>

              <form onSubmit={handleCreateUser}>
                {/* Información del Cliente */}
                <div style={{
                  marginBottom: '24px',
                  paddingBottom: '24px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <h6 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                      <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                    </svg>
                    Información del Cliente
                  </h6>

                  <div className="row">
                    <div className="col-md-6" style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Email del Cliente *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="cliente@empresa.com"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '15px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      />
                    </div>

                    <div className="col-md-6" style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Nombre / Empresa *
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="EMPRESA SPA"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '15px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      />
                    </div>

                    <div className="col-12" style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Contraseña *
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '15px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      />
                    </div>
                  </div>
                </div>

                {/* Información del Ejecutivo */}
                <div style={{ marginBottom: '24px' }}>
                  <h6 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                    </svg>
                    Ejecutivo Asignado <span style={{ fontWeight: '400', fontSize: '14px', color: '#6b7280' }}>(Opcional)</span>
                  </h6>

                  <div className="row">
                    <div className="col-md-4" style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Nombre del Ejecutivo
                      </label>
                      <input
                        type="text"
                        value={ejecutivoNombre}
                        onChange={(e) => setEjecutivoNombre(e.target.value)}
                        placeholder="Juan Pérez"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '15px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      />
                    </div>

                    <div className="col-md-4" style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Email del Ejecutivo
                      </label>
                      <input
                        type="email"
                        value={ejecutivoEmail}
                        onChange={(e) => setEjecutivoEmail(e.target.value)}
                        placeholder="ejecutivo@empresa.com"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '15px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      />
                    </div>

                    <div className="col-md-4" style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Teléfono del Ejecutivo
                      </label>
                      <input
                        type="tel"
                        value={ejecutivoTelefono}
                        onChange={(e) => setEjecutivoTelefono(e.target.value)}
                        placeholder="+56 9 1234 5678"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '15px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    width: '100%',
                    backgroundColor: formLoading ? '#93c5fd' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!formLoading) e.currentTarget.style.backgroundColor = '#1d4ed8';
                  }}
                  onMouseLeave={(e) => {
                    if (!formLoading) e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                >
                  {formLoading ? 'Creando Usuario...' : 'Crear Usuario'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="row">
        <div className="col-12">
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h5 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Usuarios Registrados ({users.length})
              </h5>
            </div>

            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <p style={{ color: '#6b7280' }}>Cargando usuarios...</p>
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <p style={{ color: '#6b7280' }}>No hay usuarios registrados</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Email
                      </th>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Nombre / Empresa
                      </th>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Ejecutivo
                      </th>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Creado
                      </th>
                      <th style={{
                        padding: '12px 24px',
                        textAlign: 'right',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={{
                          padding: '16px 24px',
                          fontSize: '14px',
                          color: '#1f2937'
                        }}>
                          {user.email}
                        </td>
                        <td style={{
                          padding: '16px 24px',
                          fontSize: '14px',
                          color: '#1f2937',
                          fontWeight: '500'
                        }}>
                          {user.username}
                          {user.username === 'Administrador' && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 8px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              fontSize: '11px',
                              fontWeight: '600',
                              borderRadius: '4px'
                            }}>
                              ADMIN
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: '16px 24px',
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          {user.ejecutivoNombre || (
                            <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: '16px 24px',
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          {formatDate(user.createdAt)}
                        </td>
                        <td style={{
                          padding: '16px 24px',
                          textAlign: 'right'
                        }}>
                          {user.username !== 'Administrador' && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fee2e2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              Eliminar
                            </button>
                          )}
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
    </div>
  );
}

export default UsersManagement;