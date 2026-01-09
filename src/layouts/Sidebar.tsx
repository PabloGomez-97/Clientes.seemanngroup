// src/components/layout/Sidebar.tsx - ShipsGo Professional Style (Light Theme)
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoSeemann from './logoseemann.png';

interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
}

interface SubMenuItem {
  path: string;
  name: string;
}

interface MenuItem {
  path?: string;
  name: string;
  icon: string;
  badge?: {
    text: string;
    type: 'new' | 'beta' | 'trial' | 'try';
  };
  subItems?: SubMenuItem[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Reports']);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const menuSections: MenuSection[] = [
  {
    title: 'Cotizador',
    items: [
      {
        path: '/newquotes',
        name: 'Cotizador',
        icon: 'fa fa-calculator',
        badge: { text: 'NEW', type: 'new' }
      }
    ]
  },
  {
    title: 'Cotizaciones & Operaciones',
    items: [
      {
        path: '/quotes',
        name: 'Cotizaciones',
        icon: 'fa fa-folder-open'
      },
      {
        path: '/air-shipments',
        name: 'Operaciones Aéreas',
        icon: 'fa fa-plane'
      },
      {
        path: '/ocean-shipments',
        name: 'Operaciones Marítimas',
        icon: 'fa fa-ship'
      }
    ]
  },
  {
    title: 'Rastreo de Operaciones',
    items: [
      {
        path: '/trackings',
        name: 'Rastreo',
        icon: 'fa fa-route'
      },
      {
        path: '/new-tracking',
        name: 'Nuevo Rastreo',
        icon: 'fa fa-route'
      }
    ]
  },
  {
    title: 'Reportes',
    items: [
      {
        name: 'Reportería',
        icon: 'fa fa-chart-bar',
        subItems: [
          { path: '/financiera', name: 'Financiera' },
          { path: '/operacional', name: 'Operacional' }
        ]
      }
    ]
  }
];


  if (!isOpen) return null;

  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const getBadgeStyles = (type: 'new' | 'beta' | 'trial' | 'try') => {
    const styles = {
      new: {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.1)'
      },
      beta: {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.1)'
      },
      trial: {
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        color: '#16a34a',
        border: '1px solid #86efac',
        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.1)'
      },
      try: {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.1)'
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
        background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        left: 0,
        borderRight: '1px solid #e5e7eb',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)'
      }}
      className="sidebar-scroll"
    >
      {/* Header con Logo */}
      <div
        style={{
          height: '70px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, rgba(139, 92, 246, 0.02) 100%)',
          position: 'relative'
        }}
      >
        <img
          src={logoSeemann}
          alt="Seemann Group"
          style={{
            width: '145px',
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))'
          }}
        />
      </div>

      {/* Navigation Menu */}
      <div style={{ flex: 1, padding: '20px 0' }}>
        {menuSections.map((section, sectionIdx) => (
          <div key={sectionIdx} style={{ marginBottom: '10px' }}>
            {/* Section Title */}
            <div
              style={{
                padding: '10px 24px 8px 24px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#6b7280',
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
                          ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)'
                          : isHovered
                          ? 'rgba(248, 250, 252, 0.8)'
                          : 'transparent',
                        borderLeft: isItemActive ? '3px solid #3b82f6' : '3px solid transparent',
                        color: isItemActive ? '#1e40af' : '#4b5563',
                        fontSize: '14px',
                        fontWeight: isItemActive ? '600' : '500',
                        position: 'relative',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        marginBottom: '2px'
                      }}
                    >
                      {/* Icon with gradient background */}
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isItemActive ? '#3b82f6' : '#6b7280',
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
                            color: '#9ca3af',
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
                          background: 'linear-gradient(180deg, rgba(249, 250, 251, 0.5) 0%, rgba(243, 244, 246, 0.3) 100%)'
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
                                    ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.06) 0%, rgba(59, 130, 246, 0.02) 100%)'
                                    : isSubHovered
                                    ? 'rgba(248, 250, 252, 0.6)'
                                    : 'transparent',
                                  borderLeft: isSubActive
                                    ? '3px solid #3b82f6'
                                    : '3px solid transparent',
                                  color: isSubActive ? '#2563eb' : '#6b7280',
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
                                    background: isSubActive ? '#3b82f6' : '#cbd5e1',
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

      {/* Footer */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          background: 'linear-gradient(180deg, #fafbfc 0%, #f9fafb 100%)'
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
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: '700',
              color: 'white',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}
          >
            S
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '3px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              <button
                onClick={() => navigate('/changelog')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#1f2937',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#1f2937';
                }}
                title="Ver Changelog"
              >
                Dashboard v2.2.0
              </button>
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#6b7280',
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
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
              Sistema Activo
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.1)',
            fontSize: '10px',
            color: '#6b7280',
            textAlign: 'center',
            fontWeight: '500',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          © 2025 Seemann Group
        </div>
      </div>

      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar-scroll::-webkit-scrollbar-track {
          background: #f9fafb;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
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

export default Sidebar;