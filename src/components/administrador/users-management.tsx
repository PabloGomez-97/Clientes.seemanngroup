// src/components/administrador/users-management.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';

interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

interface UsersManagementProps {
  accessToken: string;
}

function UsersManagement({ accessToken }: UsersManagementProps) {
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
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      setSuccess('Usuario creado exitosamente');
      setEmail('');
      setUsername('');
      setPassword('');
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
          <div className="col-lg-6">
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h5 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '20px'
              }}>
                Crear Nuevo Usuario
              </h5>

              <form onSubmit={handleCreateUser}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="usuario@ejemplo.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '15px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Nombre de Usuario / Empresa
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Ej: EMPRESA SPA"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '15px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Contraseña
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
                      outline: 'none'
                    }}
                  />
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
                    padding: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: formLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {formLoading ? 'Creando...' : 'Crear Usuario'}
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