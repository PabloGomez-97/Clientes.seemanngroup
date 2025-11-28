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

  const ejecutivo = user?.ejecutivo;
  const hasEjecutivo = !!ejecutivo;

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
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
      animation: 'slideDown 0.3s ease'
    }}>
      <div>
        <button
          onClick={toggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            borderRadius: '8px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="16" height="16" fill="#6b7280" viewBox="0 0 16 16" style={{ transition: 'all 0.2s' }}>
            <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </button>
      </div>

      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 12px',
          background: accessToken 
            ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' 
            : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '600',
          color: accessToken ? '#166534' : '#92400e',
          boxShadow: accessToken 
            ? '0 2px 4px rgba(34, 197, 94, 0.15)' 
            : '0 2px 4px rgba(251, 191, 36, 0.15)',
          transition: 'all 0.2s',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            backgroundColor: accessToken ? '#22c55e' : '#fbbf24',
            borderRadius: '50%',
            boxShadow: accessToken 
              ? '0 0 6px rgba(34, 197, 94, 0.5)' 
              : '0 0 6px rgba(251, 191, 36, 0.5)',
            animation: 'pulse 2s ease infinite'
          }} />
          {accessToken ? 'Conectado' : 'Sin token'}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: dropdownOpen ? '0 4px 6px rgba(0, 0, 0, 0.05)' : '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              if (!dropdownOpen) {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.03)';
              }
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '700',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.2s'
            }}>
              {initials}
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              lineHeight: '1.2'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                letterSpacing: '0.1px'
              }}>
                {username}
              </span>
              <span style={{
                fontSize: '11px',
                color: '#6b7280',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {email}
              </span>
            </div>

            <svg
              width="14"
              height="14"
              fill="currentColor"
              viewBox="0 0 16 16"
              style={{
                color: '#9ca3af',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>

          {dropdownOpen && (
            <>
              <div
                onClick={() => setDropdownOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 40,
                  animation: 'fadeIn 0.2s ease'
                }}
              />

              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '320px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                zIndex: 50,
                animation: 'dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {hasEjecutivo && ejecutivo && (
                  <div style={{
                    padding: '16px',
                    borderBottom: '1px solid #f3f4f6',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 5px rgba(59, 130, 246, 0.25)'
                      }}>
                        <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
                          <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
                        </svg>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#374151',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px'
                      }}>
                        Tu Ejecutivo
                      </span>
                    </div>
                    
                    <div style={{
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      borderRadius: '10px',
                      padding: '14px',
                      border: '1px solid #bfdbfe'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '9px',
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                        }}>
                          <svg width="18" height="18" fill="#1e40af" viewBox="0 0 16 16">
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/>
                          </svg>
                        </div>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#1e40af',
                          letterSpacing: '0.1px'
                        }}>
                          {ejecutivo.nombre}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <a
                          href={`mailto:${ejecutivo.email}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            padding: '8px 10px',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            borderRadius: '7px',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            border: '1px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#93c5fd';
                            e.currentTarget.style.transform = 'translateX(3px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <svg width="14" height="14" fill="#0284c7" viewBox="0 0 16 16">
                            <path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/>
                          </svg>
                          <span style={{
                            fontSize: '12px',
                            color: '#0284c7',
                            fontWeight: '500'
                          }}>
                            {ejecutivo.email}
                          </span>
                        </a>

                        <a
                          href={`tel:${ejecutivo.telefono}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            padding: '8px 10px',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            borderRadius: '7px',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            border: '1px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#93c5fd';
                            e.currentTarget.style.transform = 'translateX(3px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <svg width="14" height="14" fill="#0284c7" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
                          </svg>
                          <span style={{
                            fontSize: '12px',
                            color: '#0284c7',
                            fontWeight: '500'
                          }}>
                            {ejecutivo.telefono}
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

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
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.transform = 'translateX(3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                      <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                    </svg>
                  </div>
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
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

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </nav>
  );
}

export default Navbar;