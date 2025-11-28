// src/components/layout/Sidebar.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import logoSeemann from './logoseemann.png';

interface SidebarProps {
  isOpen: boolean;
}

function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuSections = [
    {
      title: 'Cotizador',
      items: [
        /*{
          path: '/newquotes',
          name: 'Cotizador',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="m.5 3 .04.87a2 2 0 0 0-.342 1.311l.637 7A2 2 0 0 0 2.826 14H9v-1H2.826a1 1 0 0 1-.995-.91l-.637-7A1 1 0 0 1 2.19 4h11.62a1 1 0 0 1 .996 1.09L14.54 8h1.005l.256-2.819A2 2 0 0 0 13.81 3H9.828a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6.172 1H2.5a2 2 0 0 0-2 2m5.672-1a1 1 0 0 1 .707.293L7.586 3H2.19q-.362.002-.683.12L1.5 2.98a1 1 0 0 1 1-.98z"/>
              <path d="M13.5 9a.5.5 0 0 1 .5.5V11h1.5a.5.5 0 1 1 0 1H14v1.5a.5.5 0 1 1-1 0V12h-1.5a.5.5 0 0 1 0-1H13V9.5a.5.5 0 0 1 .5-.5"/>
            </svg>
          )
        }*/
      ]
    },
    {
      title: 'GENERAL',
      items: [
        {
          path: '/quotes',
          name: 'Cotizaciones',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139q.323-.119.684-.12h5.396z"/>
            </svg>
          )
        },
        {
          path: '/air-shipments',
          name: 'Air Shipments',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Zm.894.448C7.111 2.02 7 2.569 7 3v4a.5.5 0 0 1-.276.447l-5.448 2.724a.5.5 0 0 0-.276.447v.792l5.418-.903a.5.5 0 0 1 .575.41l.5 3a.5.5 0 0 1-.14.437L6.708 15h2.586l-.647-.646a.5.5 0 0 1-.14-.436l.5-3a.5.5 0 0 1 .576-.411L15 11.41v-.792a.5.5 0 0 0-.276-.447L9.276 7.447A.5.5 0 0 1 9 7V3c0-.432-.11-.979-.322-1.401C8.458 1.159 8.213 1 8 1c-.213 0-.458.158-.678.599Z"/>
            </svg>
          )
        },
        {
          path: '/ocean-shipments',
          name: 'Ocean Shipments',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm1.5.5A.5.5 0 0 0 1 4v1.528l7.614 4.57a.5.5 0 0 0 .772-.416V4a.5.5 0 0 0-.5-.5H1.5zm13 .5h-6v1.528l6 3.6V4a.5.5 0 0 0-.5-.5zM15 8.528l-6 3.6v2.372a.5.5 0 0 0 .772.416L15 10.472v-1.944zm-13 1.944 6 3.6a.5.5 0 0 0 .772-.416v-2.372l-6-3.6v2.388z"/>
            </svg>
          )
        },
        {
          path: '/financiera',
          name: 'Reportería Financiera',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
            </svg>
          )
        },
        {
          path: '/reporteriaoperacional',
          name: 'Reportería Operacional',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M0 0h1v15h15v1H0zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07"/>
            </svg>
          )
        },
        {
          path: '/settings',
          name: 'Configuración',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
            </svg>
          )
        }
      ]
    }
  ];

  if (!isOpen) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        left: 0,
        animation: 'slideInLeft 0.3s ease'
      }}
    >
      <div style={{
        height: '64px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #f3f4f6'
      }}>
        <img
          src={logoSeemann} 
          alt="Seemann Group" 
          style={{
            width: '140px',
            height: 'auto',
            objectFit: 'contain'
          }}
        />
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #e5e7eb'
      }}>
        <nav style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '12px 0'
        }}>
          {menuSections.map((section, sectionIdx) => (
            <div 
              key={sectionIdx} 
              style={{ 
                marginBottom: '20px',
                animation: `fadeInUp 0.3s ease ${sectionIdx * 0.1}s backwards`
              }}
            >
              <div style={{
                padding: '0 16px 8px 16px',
                fontSize: '10px',
                fontWeight: '700',
                color: '#9ca3af',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{
                  width: '3px',
                  height: '3px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6'
                }}></div>
                {section.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {section.items.map((item, idx) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 16px',
                        margin: '0 6px',
                        width: 'calc(100% - 12px)',
                        border: 'none',
                        backgroundColor: active ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'transparent',
                        background: active ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'transparent',
                        color: active ? '#1e40af' : '#6b7280',
                        fontSize: '13px',
                        fontWeight: active ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'left',
                        borderRadius: '8px',
                        position: 'relative',
                        overflow: 'hidden',
                        animation: `fadeInLeft 0.3s ease ${idx * 0.05}s backwards`
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.transform = 'translateX(3px)';
                          e.currentTarget.style.color = '#374151';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.color = '#6b7280';
                        }
                      }}
                    >
                      {active && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '3px',
                          background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                          borderRadius: '0 3px 3px 0',
                          boxShadow: '0 0 6px rgba(59, 130, 246, 0.4)'
                        }}></div>
                      )}
                      
                      <div style={{
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '7px',
                        backgroundColor: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        transition: 'all 0.2s'
                      }}>
                        <span style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          transform: active ? 'scale(1.05)' : 'scale(1)',
                          transition: 'transform 0.2s'
                        }}>
                          {item.icon}
                        </span>
                      </div>
                      
                      <span style={{
                        flex: 1,
                        letterSpacing: active ? '0.1px' : '0'
                      }}>
                        {item.name}
                      </span>

                      {active && (
                        <div style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)',
                          animation: 'pulse 2s ease infinite'
                        }}></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #f3f4f6',
          background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '11px',
            color: '#9ca3af',
            marginBottom: '3px'
          }}>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '5px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
            }}>
              <svg width="10" height="10" fill="white" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
            </div>
            <span style={{ fontWeight: '600' }}>Dashboard v1.0</span>
          </div>
          <div style={{
            fontSize: '10px',
            color: '#9ca3af',
            paddingLeft: '25px'
          }}>
            Seemann Group
          </div>
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
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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
      `}</style>
    </div>
  );
}

export default Sidebar;