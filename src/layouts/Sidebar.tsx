// src/components/layout/Sidebar.tsx - PREMIUM VERSION
import { useState, type JSX } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoSeemann from './logoseemann.png';

interface SidebarProps {
  isOpen: boolean;
  onToggle?: () => void;
}

interface MenuItem {
  path: string;
  name: string;
  icon: JSX.Element;
  count?: number;
  badge?: string;
  shortcut?: string;
}

interface MenuSection {
  title: string;
  color: string;
  items: MenuItem[];
}

function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuSections: MenuSection[] = [
    {
      title: 'Cotizador',
      color: '#8b5cf6',
      items: [
        {
          path: '/newquotes',
          name: 'Cotizador',
          badge: 'Nuevo',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="m.5 3 .04.87a2 2 0 0 0-.342 1.311l.637 7A2 2 0 0 0 2.826 14H9v-1H2.826a1 1 0 0 1-.995-.91l-.637-7A1 1 0 0 1 2.19 4h11.62a1 1 0 0 1 .996 1.09L14.54 8h1.005l.256-2.819A2 2 0 0 0 13.81 3H9.828a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6.172 1H2.5a2 2 0 0 0-2 2m5.672-1a1 1 0 0 1 .707.293L7.586 3H2.19q-.362.002-.683.12L1.5 2.98a1 1 0 0 1 1-.98z"/>
              <path d="M13.5 9a.5.5 0 0 1 .5.5V11h1.5a.5.5 0 1 1 0 1H14v1.5a.5.5 0 1 1-1 0V12h-1.5a.5.5 0 0 1 0-1H13V9.5a.5.5 0 0 1 .5-.5"/>
            </svg>
          )
        }
      ]
    },
    {
      title: 'General',
      color: '#3b82f6',
      items: [
        {
          path: '/quotes',
          name: 'Cotizaciones',
          count: 1,
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139q.323-.119.684-.12h5.396z"/>
            </svg>
          )
        },
        {
          path: '/air-shipments',
          name: 'Air Shipments',
          count: 1,
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Zm.894.448C7.111 2.02 7 2.569 7 3v4a.5.5 0 0 1-.276.447l-5.448 2.724a.5.5 0 0 0-.276.447v.792l5.418-.903a.5.5 0 0 1 .575.41l.5 3a.5.5 0 0 1-.14.437L6.708 15h2.586l-.647-.646a.5.5 0 0 1-.14-.436l.5-3a.5.5 0 0 1 .576-.411L15 11.41v-.792a.5.5 0 0 0-.276-.447L9.276 7.447A.5.5 0 0 1 9 7V3c0-.432-.11-.979-.322-1.401C8.458 1.159 8.213 1 8 1c-.213 0-.458.158-.678.599Z"/>
            </svg>
          )
        },
        {
          path: '/ocean-shipments',
          name: 'Ocean Shipments',
          count: 1,
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm1.5.5A.5.5 0 0 0 1 4v1.528l7.614 4.57a.5.5 0 0 0 .772-.416V4a.5.5 0 0 0-.5-.5H1.5zm13 .5h-6v1.528l6 3.6V4a.5.5 0 0 0-.5-.5zM15 8.528l-6 3.6v2.372a.5.5 0 0 0 .772.416L15 10.472v-1.944zm-13 1.944 6 3.6a.5.5 0 0 0 .772-.416v-2.372l-6-3.6v2.388z"/>
            </svg>
          )
        },
        {
          path: '/financiera',
          name: 'Reportería Financiera',
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
            </svg>
          )
        },
        {
          path: '/operacional',
          name: 'Reportería Operacional',
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M0 0h1v15h15v1H0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07"/>
            </svg>
          )
        },
        /*{
          path: '/settings',
          name: 'Configuración',
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
            </svg>
          )
        }*/
      ]
    }
  ];

  if (!isOpen) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      style={{
        width: isCollapsed ? '80px' : '280px',
        minWidth: isCollapsed ? '80px' : '280px',
        height: '100vh',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        left: 0,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Header con Logo */}
      <div style={{
        height: '72px',
        padding: isCollapsed ? '0' : '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Efecto de brillo animado */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          animation: 'shine 3s infinite'
        }}></div>

        {!isCollapsed && (
          <img
            src={logoSeemann} 
            alt="Seemann Group" 
            style={{
              width: '150px',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))',
              transition: 'all 0.3s ease'
            }}
          />
        )}
        
        <button
          onClick={handleCollapse}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            position: 'relative',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) rotate(180deg)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
          }}
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d={isCollapsed ? 
              "M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" :
              "M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
            }/>
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        <nav style={{ 
          flex: 1,
          padding: '16px 0'
        }}>
          {menuSections.map((section, sectionIdx) => (
            <div 
              key={sectionIdx} 
              style={{ 
                marginBottom: '24px',
                animation: `fadeInUp 0.5s ease ${sectionIdx * 0.1}s backwards`
              }}
            >
              {!isCollapsed && (
                <div style={{
                  padding: '0 20px 10px 20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#94a3b8',
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${section.color} 0%, ${section.color}dd 100%)`,
                    boxShadow: `0 0 8px ${section.color}66`
                  }}></div>
                  {section.title}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {section.items.map((item, idx) => {
                  const active = isActive(item.path);
                  const isHovered = hoveredItem === item.path;
                  
                  return (
                    <div
                      key={item.path}
                      style={{
                        padding: '0 12px',
                        position: 'relative'
                      }}
                    >
                      <button
                        onClick={() => navigate(item.path)}
                        onMouseEnter={() => setHoveredItem(item.path)}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: isCollapsed ? '0' : '12px',
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                          padding: isCollapsed ? '14px' : '12px 14px',
                          border: 'none',
                          background: active 
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%)'
                            : isHovered 
                            ? 'rgba(248, 250, 252, 0.8)'
                            : 'transparent',
                          color: active ? '#1e40af' : isHovered ? '#334155' : '#64748b',
                          fontSize: '14px',
                          fontWeight: active ? '600' : '500',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          textAlign: 'left',
                          borderRadius: '12px',
                          position: 'relative',
                          overflow: 'hidden',
                          transform: active ? 'translateX(4px)' : isHovered ? 'translateX(2px)' : 'translateX(0)',
                          boxShadow: active 
                            ? '0 4px 12px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                            : '0 0 0 rgba(0, 0, 0, 0)',
                          animation: `fadeInLeft 0.4s ease ${idx * 0.05}s backwards`
                        }}
                      >
                        {/* Active indicator - línea lateral */}
                        {active && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '4px',
                            height: '70%',
                            background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                            borderRadius: '0 4px 4px 0',
                            boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
                            animation: 'slideInLeft 0.3s ease'
                          }}></div>
                        )}

                        {/* Efecto de ripple al hacer hover */}
                        {isHovered && !active && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '100%',
                            height: '100%',
                            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                            transform: 'translate(-50%, -50%)',
                            animation: 'ripple 0.6s ease-out'
                          }}></div>
                        )}
                        
                        {/* Icon container */}
                        <div style={{
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '10px',
                          background: active 
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)'
                            : isHovered
                            ? 'rgba(241, 245, 249, 1)'
                            : 'transparent',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: isHovered ? 'scale(1.05) rotate(5deg)' : 'scale(1) rotate(0deg)',
                          position: 'relative',
                          flexShrink: 0
                        }}>
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            filter: active ? 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' : 'none'
                          }}>
                            {item.icon}
                          </span>

                          {/* Badge de conteo */}
                          {item.count && item.count > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              fontSize: '10px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4), 0 0 0 2px white',
                              animation: 'bounce 2s ease infinite'
                            }}>
                              {item.count}
                            </div>
                          )}
                        </div>
                        
                        {!isCollapsed && (
                          <>
                            <span style={{
                              flex: 1,
                              letterSpacing: active ? '0.2px' : '0',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {item.name}
                            </span>

                            {/* Badge "Nuevo" */}
                            {item.badge && (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: '700',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                color: 'white',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                                animation: 'pulse 2s ease infinite'
                              }}>
                                {item.badge}
                              </span>
                            )}

                            {/* Keyboard shortcut */}
                            {item.shortcut && !active && (
                              <kbd style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600',
                                background: 'rgba(148, 163, 184, 0.1)',
                                color: '#94a3b8',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                fontFamily: 'monospace',
                                opacity: isHovered ? 1 : 0,
                                transition: 'opacity 0.2s ease'
                              }}>
                                {item.shortcut}
                              </kbd>
                            )}

                            {/* Active pulse indicator */}
                            {active && (
                              <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                boxShadow: '0 0 12px rgba(59, 130, 246, 0.8), 0 0 24px rgba(59, 130, 246, 0.4)',
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                              }}></div>
                            )}
                          </>
                        )}
                      </button>

                      {/* Tooltip para modo colapsado */}
                      {isCollapsed && isHovered && (
                        <div style={{
                          position: 'absolute',
                          left: '100%',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          marginLeft: '12px',
                          padding: '8px 12px',
                          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '500',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                          zIndex: 1000,
                          animation: 'fadeIn 0.2s ease',
                          pointerEvents: 'none'
                        }}>
                          {item.name}
                          {item.shortcut && (
                            <kbd style={{
                              marginLeft: '8px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                              {item.shortcut}
                            </kbd>
                          )}
                          <div style={{
                            position: 'absolute',
                            right: '100%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 0,
                            height: 0,
                            borderTop: '6px solid transparent',
                            borderBottom: '6px solid transparent',
                            borderRight: '6px solid #1e293b'
                          }}></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: isCollapsed ? '12px 8px' : '16px 20px',
          borderTop: '1px solid rgba(226, 232, 240, 0.6)',
          background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.8) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          {!isCollapsed ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  position: 'relative'
                }}>
                  <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid white',
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                    animation: 'pulse 2s ease infinite'
                  }}></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '2px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Dashboard v2.0
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
                    }}></div>
                    Sistema Activo
                  </div>
                </div>
              </div>
              
              <div style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.1)',
                fontSize: '10px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>© 2024 Seemann Group</span>
                <div style={{
                  display: 'flex',
                  gap: '4px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    animation: 'blink 1.4s ease infinite'
                  }}></div>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#8b5cf6',
                    animation: 'blink 1.4s ease 0.2s infinite'
                  }}></div>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#ec4899',
                    animation: 'blink 1.4s ease 0.4s infinite'
                  }}></div>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                position: 'relative'
              }}>
                <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid white',
                  animation: 'pulse 2s ease infinite'
                }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-15px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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

        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        @keyframes shine {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes blink {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default Sidebar;