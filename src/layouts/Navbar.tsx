import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

interface NavbarProps {
  accessToken: string;
  onLogout: () => void;
  toggleSidebar: () => void;
}

function Navbar({ accessToken, onLogout, toggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    setDropdownOpen(false);
  };

  const username = user?.username || 'Usuario';
  const email = user?.email || 'usuario@ejemplo.com';

  // ✅ NUEVO: Datos del ejecutivo
  const ejecutivoNombre = user?.ejecutivoNombre;
  const ejecutivoEmail = user?.ejecutivoEmail;
  const ejecutivoTelefono = user?.ejecutivoTelefono;
  const hasEjecutivo = ejecutivoNombre || ejecutivoEmail || ejecutivoTelefono;

  // Obtener iniciales del usuario
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(username);

  return (
    <nav style={{
      height: '70px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      {/* Left side - Menu toggle button */}
      <div>
        <button
          onClick={toggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </button>
      </div>

      {/* Right side - Status and User */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: accessToken ? '#dcfce7' : '#fef3c7',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '500',
          color: accessToken ? '#166534' : '#92400e'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            backgroundColor: accessToken ? '#22c55e' : '#fbbf24',
            borderRadius: '50%'
          }} />
          {accessToken ? 'Conectado' : 'Sin token'}
        </div>

        {/* User Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            {/* Avatar with Initials */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {initials}
            </div>

            {/* User Info */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              lineHeight: '1.2'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#111827'
              }}>
                {username}
              </span>
              <span style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {email}
              </span>
            </div>

            {/* Dropdown Arrow */}
            <svg
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              style={{
                color: '#6b7280',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              {/* Overlay para cerrar el dropdown al hacer click fuera */}
              <div
                onClick={() => setDropdownOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 40
                }}
              />

              {/* Dropdown content */}
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '320px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                zIndex: 50
              }}>
                {/* User Info in Dropdown */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: '600'
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '2px'
                      }}>
                        {username}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280'
                      }}>
                        {email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ NUEVO: Sección del Ejecutivo */}
                {hasEjecutivo && (
                  <div style={{
                    padding: '16px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <svg width="16" height="16" fill="#3b82f6" viewBox="0 0 16 16">
                        <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                      </svg>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#374151',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Tu Ejecutivo
                      </span>
                    </div>
                    
                    <div style={{
                      backgroundColor: '#f0f9ff',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid #bae6fd'
                    }}>
                      {ejecutivoNombre && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: ejecutivoEmail || ejecutivoTelefono ? '8px' : '0'
                        }}>
                          <svg width="14" height="14" fill="#0284c7" viewBox="0 0 16 16">
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                          </svg>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#0c4a6e'
                          }}>
                            {ejecutivoNombre}
                          </span>
                        </div>
                      )}

                      {ejecutivoEmail && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: ejecutivoTelefono ? '8px' : '0'
                        }}>
                          <svg width="14" height="14" fill="#0284c7" viewBox="0 0 16 16">
                            <path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/>
                          </svg>
                          <a
                            href={`mailto:${ejecutivoEmail}`}
                            style={{
                              fontSize: '13px',
                              color: '#0284c7',
                              textDecoration: 'none',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#0369a1'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#0284c7'}
                          >
                            {ejecutivoEmail}
                          </a>
                        </div>
                      )}

                      {ejecutivoTelefono && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg width="14" height="14" fill="#0284c7" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
                          </svg>
                          <a
                            href={`tel:${ejecutivoTelefono}`}
                            style={{
                              fontSize: '13px',
                              color: '#0284c7',
                              textDecoration: 'none',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#0369a1'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#0284c7'}
                          >
                            {ejecutivoTelefono}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#dc2626',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                    <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;