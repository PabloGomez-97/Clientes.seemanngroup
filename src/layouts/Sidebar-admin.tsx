// src/components/layout/Sidebar-admin.tsx - ShipsGo Style (Dark Theme)
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface SidebarAdminProps {
  isOpen: boolean;
}

interface SubMenuItem {
  path: string;
  name: string;
  restrictedTo?: string | string[];
}

interface MenuItem {
  path?: string;
  name: string;
  icon: string;
  restrictedTo?: string | string[];
  badge?: {
    text: string;
    type: 'new' | 'beta' | 'admin' | 'super';
  };
  subItems?: SubMenuItem[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

function SidebarAdmin({ isOpen }: SidebarAdminProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const username = user?.nombreuser || 'Administrador';

  const getUserImage = (nombre?: string) => {
    if (!nombre) return null;
    const partes = nombre.trim().split(' ');
    if (partes.length < 2) return null;
    const iniciales = partes[0][0].toLowerCase() + partes[1][0].toLowerCase();
    return `/ejecutivos/${iniciales}.png`;
  };

  const userImage = getUserImage(user?.nombreuser);

  const menuSections: MenuSection[] = [
    {
      title: 'Main',
      items: [
        {
          path: '/admin/cotizador-administrador',
          name: 'Cotizador',
          icon: 'fa fa-calculator'
        },
        {
          path: '/admin/tusclientes',
          name: 'Tus Clientes',
          icon: 'fa fa-users'
        },
        {
          path: '/admin/users',
          name: 'Gestión de Usuarios',
          icon: 'fa fa-user-shield',
          restrictedTo: 'superadmin@sphereglobal.io',
          badge: { text: 'ADMIN', type: 'admin' }
        },
        {
          path: '/admin/ejecutivos',
          name: 'Gestión de Ejecutivos',
          icon: 'fa fa-user-tie',
          restrictedTo: 'superadmin@sphereglobal.io',
          badge: { text: 'ADMIN', type: 'admin' }
        },
        {
          path: '/admin/dashboard',
          name: 'Registro de Cambios',
          icon: 'fa fa-history'
        }
      ]
    },
    {
      title: 'Reports',
      items: [
        {
          path: '/admin/reporteria',
          name: 'Reportería',
          icon: 'fa fa-chart-bar'
        },
        {
          path: '/admin/reportexecutive',
          name: 'Reportes Ejecutivos',
          icon: 'fa fa-file-contract',
          restrictedTo: ['naguilera@seemanngroup.com', 'ifmaldonado@seemanngroup.com', "superadmin@sphereglobal.io"],
          badge: { text: 'EXEC', type: 'super' }
        }
      ]
    }
  ];

  // Filter menu items based on user permissions
  const filteredSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.restrictedTo) {
        // Handle both single email and array of emails
        if (Array.isArray(item.restrictedTo)) {
          return item.restrictedTo.includes(user?.email || '');
        }
        return user?.email === item.restrictedTo;
      }
      return true;
    })
  })).filter(section => section.items.length > 0);

  if (!isOpen) return null;

  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const getBadgeStyles = (type: 'new' | 'beta' | 'admin' | 'super') => {
    const styles = {
      new: {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
      },
      beta: {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
      },
      admin: {
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        color: '#1e40af',
        border: '1px solid #93c5fd',
        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
      },
      super: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        color: '#92400e',
        border: '1px solid #fcd34d',
        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
      }
    };
    return styles[type];
  };

  return (
    <div
      style={{
        width: '260px',
        minWidth: '260px',
        height: '100vh',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        left: 0,
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow: '2px 0 12px rgba(0, 0, 0, 0.3)'
      }}
      className="sidebar-scroll"
    >
      {/* Header con Logo */}
      <div
        style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
          minHeight: '120px'
        }}
      >
        <img
          src="/logocompleto.png"
          alt="Seemann Group"
          style={{
            maxWidth: '100%',
            maxHeight: '80px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}
        />
      </div>

      {/* Navigation Menu */}
      <div style={{ flex: 1, padding: '20px 0' }}>
        {filteredSections.map((section, sectionIdx) => (
          <div key={sectionIdx} style={{ marginBottom: '10px' }}>
            {/* Section Title */}
            <div
              style={{
                padding: '10px 24px 8px 24px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginTop: sectionIdx > 0 ? '16px' : '0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              {section.title}
            </div>

            {/* Menu Items */}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {section.items.map((item, itemIdx) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedMenus.includes(item.name);
                const isItemActive = item.path ? isActive(item.path) : false;
                const isHovered = hoveredItem === `${section.title}-${item.name}`;

                return (
                  <li key={itemIdx}>
                    {/* Main Menu Item */}
                    <div
                      onClick={() => {
                        if (hasSubItems) {
                          toggleMenu(item.name);
                        } else if (item.path) {
                          navigate(item.path);
                        }
                      }}
                      onMouseEnter={() => setHoveredItem(`${section.title}-${item.name}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={{
                        padding: '13px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isItemActive
                          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)'
                          : isHovered
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'transparent',
                        borderLeft: isItemActive ? '3px solid #6366f1' : '3px solid transparent',
                        color: isItemActive ? '#c7d2fe' : '#94a3b8',
                        fontSize: '14px',
                        fontWeight: isItemActive ? '600' : '500',
                        position: 'relative',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        marginBottom: '2px'
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isItemActive ? '#a5b4fc' : '#64748b',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <i
                          className={item.icon}
                          style={{
                            fontSize: '17px'
                          }}
                        />
                      </div>

                      {/* Name */}
                      <span style={{ flex: 1, fontSize: '14px', lineHeight: '1.4' }}>
                        {item.name}
                      </span>

                      {/* Badge (if exists) */}
                      {item.badge && (
                        <span
                          style={{
                            ...getBadgeStyles(item.badge.type),
                            padding: '3px 7px',
                            borderRadius: '5px',
                            fontSize: '9px',
                            fontWeight: '700',
                            letterSpacing: '0.4px',
                            marginLeft: 'auto'
                          }}
                        >
                          {item.badge.text}
                        </span>
                      )}

                      {/* Arrow for submenus */}
                      {hasSubItems && (
                        <i
                          className="fa fa-chevron-right"
                          style={{
                            fontSize: '10px',
                            transition: 'transform 0.2s ease',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            color: '#64748b',
                            marginLeft: item.badge ? '8px' : '0'
                          }}
                        />
                      )}
                    </div>

                    {/* Submenu Items */}
                    {hasSubItems && (
                      <div
                        style={{
                          maxHeight: isExpanded ? '500px' : '0',
                          overflow: 'hidden',
                          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: 'rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0 }}>
                          {item.subItems!.map((subItem, subIdx) => {
                            const isSubActive = isActive(subItem.path);
                            const isSubHovered = hoveredItem === `sub-${subItem.path}`;

                            return (
                              <li
                                key={subIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(subItem.path);
                                }}
                                onMouseEnter={() => setHoveredItem(`sub-${subItem.path}`)}
                                onMouseLeave={() => setHoveredItem(null)}
                                style={{
                                  padding: '11px 24px 11px 54px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  background: isSubActive
                                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
                                    : isSubHovered
                                    ? 'rgba(255, 255, 255, 0.03)'
                                    : 'transparent',
                                  borderLeft: isSubActive
                                    ? '3px solid #6366f1'
                                    : '3px solid transparent',
                                  color: isSubActive ? '#a5b4fc' : '#94a3b8',
                                  fontSize: '13.5px',
                                  fontWeight: isSubActive ? '600' : '500',
                                  position: 'relative',
                                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                  marginBottom: '1px'
                                }}
                              >
                                {/* Bullet point for submenu */}
                                <span
                                  style={{
                                    position: 'absolute',
                                    left: '40px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: isSubActive ? '#6366f1' : '#475569',
                                    transition: 'all 0.15s ease'
                                  }}
                                />
                                {subItem.name}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer con usuario */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(99, 102, 241, 0.08)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            {userImage ? (
              <img
                src={userImage}
                alt={username}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <i
                className="fa fa-user"
                style={{
                  fontSize: '20px',
                  color: 'white'
                }}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#e2e8f0',
                marginBottom: '3px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {username}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
              En línea
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '10px',
            color: '#64748b',
            textAlign: 'center',
            fontWeight: '500',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          © {new Date().getFullYear()} Seemann Group
        </div>
      </div>

      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
      `}</style>
    </div>
  );
}

export default SidebarAdmin;