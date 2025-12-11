// src/components/layout/Navbar.tsx - PREMIUM VERSION
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface NavbarProps {
  accessToken: string;
  onLogout: () => void;
  toggleSidebar: () => void;
}

function Navbar({ accessToken, onLogout, toggleSidebar }: NavbarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'Nueva cotización', message: 'Cotización #1234 creada', time: '5 min', unread: true, type: 'info' },
    { id: 2, title: 'Envío actualizado', message: 'AIR-2024-001 en tránsito', time: '15 min', unread: true, type: 'success' },
    { id: 3, title: 'Documento pendiente', message: 'Factura #5678 requiere revisión', time: '1 hora', unread: false, type: 'warning' }
  ]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // User data
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

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    setShowProfile(false);
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K para abrir búsqueda
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Escape para cerrar modales
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
        setShowProfile(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-dropdown') && !target.closest('.notification-button')) {
        setShowNotifications(false);
      }
      if (!target.closest('.profile-dropdown') && !target.closest('.profile-button')) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbs = () => {
    const pathMap: { [key: string]: string } = {
      '/newquotes': 'Cotizador',
      '/quotes': 'Cotizaciones',
      '/air-shipments': 'Air Shipments',
      '/ocean-shipments': 'Ocean Shipments',
      '/financiera': 'Reportería Financiera',
      '/reporteriaoperacional': 'Reportería Operacional',
      '/settings': 'Configuración'
    };

    return pathMap[location.pathname] || 'Dashboard';
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <nav style={{
      height: '72px',
      minHeight: '72px',
      maxHeight: '72px',
      flexShrink: 0,  // Evita que se encoja si el padre es flex
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
      animation: 'slideDown 0.4s ease'
    }}>
        {/* Left Section - Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" fill="#3b82f6" viewBox="0 0 16 16">
              <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5ZM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5 5 5Z"/>
            </svg>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>/</span>
            <span style={{
              fontSize: '15px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {getBreadcrumbs()}
            </span>
          </div>

          {/* Quick Stats */}
          <div style={{
            marginLeft: '24px',
            display: 'flex',
            gap: '12px'
          }}>
            <div style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#059669'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                animation: 'pulse 2s ease infinite'
              }}></div>
              Conectado
            </div>

            <div style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: '12px',
              fontWeight: '600',
              color: '#2563eb'
            }}>
              {currentTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Center Section - Search
        <div style={{ flex: 1, maxWidth: '500px' }}>
          <button
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '12px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="18" height="18" fill="#94a3b8" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <span style={{ 
              flex: 1, 
              color: '#94a3b8', 
              fontSize: '14px',
              textAlign: 'left'
            }}>
              Buscar en el sistema...
            </span>
            <kbd style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.8)',
              color: '#64748b',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              fontFamily: 'monospace',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              ⌘K
            </kbd>
          </button>
        </div>
         */}

        {/* Right Section - Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Notifications */}
          {/*{
          <div style={{ position: 'relative' }}>
            <button
              className="notification-button"
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                background: showNotifications 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)',
                color: showNotifications ? 'white' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                boxShadow: showNotifications 
                  ? '0 4px 16px rgba(59, 130, 246, 0.3)'
                  : '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
              onMouseEnter={(e) => {
                if (!showNotifications) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }
              }}
              onMouseLeave={(e) => {
                if (!showNotifications) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                }
              }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
              </svg>
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4), 0 0 0 3px white',
                  animation: 'bounce 2s ease infinite'
                }}>
                  {unreadCount}
                </div>
              )}
            </button>

            {showNotifications && (
              <div
                className="notification-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  right: 0,
                  width: '380px',
                  maxHeight: '480px',
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  animation: 'slideDown 0.3s ease',
                  zIndex: 1000
                }}
              >
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#1e293b'
                    }}>
                      Notificaciones
                    </h3>
                    {unreadCount > 0 && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0
                  }}>
                    Marcar todas como leídas
                  </button>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid #f8fafc',
                        background: notification.unread ? 'rgba(59, 130, 246, 0.02)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = notification.unread ? 'rgba(59, 130, 246, 0.02)' : 'white';
                      }}
                    >
                      {notification.unread && (
                        <div style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                          boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
                        }}></div>
                      )}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: notification.type === 'info' 
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)'
                            : notification.type === 'success'
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)'
                            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg width="18" height="18" fill={
                            notification.type === 'info' ? '#3b82f6' :
                            notification.type === 'success' ? '#10b981' : '#f59e0b'
                          } viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '4px'
                          }}>
                            {notification.title}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#64748b',
                            marginBottom: '6px'
                          }}>
                            {notification.message}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#94a3b8'
                          }}>
                            Hace {notification.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #f1f5f9',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  textAlign: 'center'
                }}>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}>
                    Ver todas las notificaciones
                  </button>
                </div>
              </div>
            )}
          </div>
          */}

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '32px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(226, 232, 240, 0.6) 50%, transparent 100%)'
          }}></div>

          {/* User Profile */}
          <div style={{ position: 'relative' }}>
            <button
              className="profile-button"
              onClick={() => setShowProfile(!showProfile)}
              style={{
                height: '44px',
                padding: '0 14px',
                borderRadius: '12px',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                background: showProfile
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: showProfile
                  ? '0 4px 16px rgba(59, 130, 246, 0.3)'
                  : '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
              onMouseEnter={(e) => {
                if (!showProfile) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }
              }}
              onMouseLeave={(e) => {
                if (!showProfile) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                }
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: showProfile 
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }}>
                {initials}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: showProfile ? 'white' : '#1e293b',
                  lineHeight: '1.2'
                }}>
                  {username}
                </div>
              </div>
              <svg 
                width="14" 
                height="14" 
                fill={showProfile ? 'white' : '#64748b'} 
                viewBox="0 0 16 16"
                style={{
                  transition: 'transform 0.3s ease',
                  transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              >
                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div
                className="profile-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  right: 0,
                  width: '350px',
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  animation: 'slideDown 0.3s ease',
                  zIndex: 1000
                }}
              >
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid #f1f5f9',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: '700',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '2px'
                      }}>
                        {username}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#64748b',
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ejecutivo Section - Premium Card */}
                {hasEjecutivo && ejecutivo && (
                  <div style={{
                    margin: '12px 12px 16px 12px',
                    padding: '0',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Decorative gradient */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                    }}></div>

                    {/* Header */}
                    <div style={{
                      padding: '14px 16px 12px 16px',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                      borderBottom: '1px solid rgba(226, 232, 240, 0.6)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#3b82f6',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
                        }}>
                          <svg width="12" height="12" fill="white" viewBox="0 0 16 16">
                            <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                          </svg>
                        </div>
                        <span>Tu Ejecutivo Asignado</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '18px 20px' }}>
                      {/* Ejecutivo Info */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        marginBottom: '16px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'white',
                        border: '1px solid rgba(226, 232, 240, 0.6)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                          position: 'relative'
                        }}>
                          <svg width="26" height="26" fill="white" viewBox="0 0 16 16">
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/>
                          </svg>
                          {/* Online indicator */}
                          <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '3px solid white',
                            boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                          }}></div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '3px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {ejecutivo.nombre}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#64748b',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <div style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              background: '#3b82f6'
                            }}></div>
                            Ejecutivo Comercial
                          </div>
                        </div>
                      </div>

                      {/* Contact Methods */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        {/* Email */}
                        <a
                          href={`mailto:${ejecutivo.email}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '11px 12px',
                            backgroundColor: 'white',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '9px',
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.25s ease'
                          }}>
                            <svg width="17" height="17" fill="#3b82f6" viewBox="0 0 16 16">
                              <path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757zm3.436-.586L16 11.801V4.697l-5.803 3.546z"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '2px'
                            }}>
                              Email
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: '#1e293b',
                              fontWeight: '600',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {ejecutivo.email}
                            </div>
                          </div>
                          <svg width="16" height="16" fill="#94a3b8" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                          </svg>
                        </a>

                        {/* Phone */}
                        <a
                          href={`tel:${ejecutivo.telefono}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '11px 12px',
                            backgroundColor: 'white',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#10b981';
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '9px',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.25s ease'
                          }}>
                            <svg width="17" height="17" fill="#10b981" viewBox="0 0 16 16">
                              <path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '2px'
                            }}>
                              Teléfono
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: '#1e293b',
                              fontWeight: '600'
                            }}>
                              {ejecutivo.telefono}
                            </div>
                          </div>
                          <svg width="16" height="16" fill="#94a3b8" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{
                  padding: '12px 20px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: 'none',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                      color: '#dc2626',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)';
                      e.currentTarget.style.color = '#dc2626';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                      <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                    </svg>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Command Palette / Search Modal */}
      {showSearch && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998,
              animation: 'fadeIn 0.2s ease'
            }}
            onClick={() => setShowSearch(false)}
          ></div>

          <div
            style={{
              position: 'fixed',
              top: '120px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '640px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              zIndex: 9999,
              overflow: 'hidden',
              animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <svg width="20" height="20" fill="#3b82f6" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar cotizaciones, envíos, reportes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  color: '#1e293b',
                  background: 'transparent'
                }}
              />
              <kbd style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                fontFamily: 'monospace'
              }}>
                ESC
              </kbd>
            </div>

            <div style={{
              padding: '12px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {searchQuery === '' ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 16px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="32" height="32" fill="#3b82f6" viewBox="0 0 16 16">
                      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                  </div>
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b'
                  }}>
                    Búsqueda Rápida
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    Busca cotizaciones, envíos, reportes y más...
                  </p>

                  <div style={{
                    marginTop: '24px',
                    display: 'grid',
                    gap: '8px',
                    textAlign: 'left'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Accesos Rápidos
                    </div>
                    {[
                      { icon: '📝', label: 'Nueva Cotización', key: 'N' },
                      { icon: '✈️', label: 'Air Shipments', key: 'A' },
                      { icon: '🚢', label: 'Ocean Shipments', key: 'O' },
                      { icon: '📊', label: 'Reportes', key: 'R' }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '14px',
                          color: '#475569'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.03)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{item.icon}</span>
                        <span style={{ flex: 1, textAlign: 'left', fontWeight: '500' }}>{item.label}</span>
                        <kbd style={{
                          padding: '3px 7px',
                          borderRadius: '5px',
                          fontSize: '11px',
                          background: '#f8fafc',
                          color: '#64748b',
                          border: '1px solid #e2e8f0',
                          fontFamily: 'monospace'
                        }}>
                          {item.key}
                        </kbd>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '8px' }}>
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    Buscando "{searchQuery}"...
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
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

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </>
  );
}

export default Navbar;