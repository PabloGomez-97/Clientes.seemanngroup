// src/components/layout/Sidebar.tsx
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
}

function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuSections = [
    {
      title: 'GENERAL',
      items: [
        {
          path: '/newquotes',
          name: 'Crear Cotización',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="m.5 3 .04.87a2 2 0 0 0-.342 1.311l.637 7A2 2 0 0 0 2.826 14H9v-1H2.826a1 1 0 0 1-.995-.91l-.637-7A1 1 0 0 1 2.19 4h11.62a1 1 0 0 1 .996 1.09L14.54 8h1.005l.256-2.819A2 2 0 0 0 13.81 3H9.828a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6.172 1H2.5a2 2 0 0 0-2 2m5.672-1a1 1 0 0 1 .707.293L7.586 3H2.19q-.362.002-.683.12L1.5 2.98a1 1 0 0 1 1-.98z"/>
              <path d="M13.5 9a.5.5 0 0 1 .5.5V11h1.5a.5.5 0 1 1 0 1H14v1.5a.5.5 0 1 1-1 0V12h-1.5a.5.5 0 0 1 0-1H13V9.5a.5.5 0 0 1 .5-.5"/>
            </svg>
          )
        },
        {
          path: '/quotes',
          name: 'Cotizaciones',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139q.323-.119.684-.12h5.396z"/>
            </svg>
          )
        }
      ]
    },
    {
      title: 'MODULES',
      items: [
        {
          path: '/air-shipments',
          name: 'Air Shipments',
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Zm.894.448C7.111 2.02 7 2.569 7 3v4a.5.5 0 0 1-.276.447l-5.448 2.724a.5.5 0 0 0-.276.447v.792l5.418-.903a.5.5 0 0 1 .575.41l.5 3a.5.5 0 0 1-.14.437L6.708 15h2.586l-.647-.646a.5.5 0 0 1-.14-.436l.5-3a.5.5 0 0 1 .576-.411L15 11.41v-.792a.5.5 0 0 0-.276-.447L9.276 7.447A.5.5 0 0 1 9 7V3c0-.432-.11-.979-.322-1.401C8.458 1.159 8.213 1 8 1c-.213 0-.458.158-.678.599Z"/>
            </svg>
          )
        },
        {
          path: '/ocean-shipments',
          name: 'Ocean Shipments',
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm1.5.5A.5.5 0 0 0 1 4v1.528l7.614 4.57a.5.5 0 0 0 .772-.416V4a.5.5 0 0 0-.5-.5H1.5zm13 .5h-6v1.528l6 3.6V4a.5.5 0 0 0-.5-.5zM15 8.528l-6 3.6v2.372a.5.5 0 0 0 .772.416L15 10.472v-1.944zm-13 1.944 6 3.6a.5.5 0 0 0 .772-.416v-2.372l-6-3.6v2.388z"/>
            </svg>
          )
        },
        {
          path: '/all-shipments',
          name: 'All Shipments',
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm1.5.5A.5.5 0 0 0 1 4v1.528l7.614 4.57a.5.5 0 0 0 .772-.416V4a.5.5 0 0 0-.5-.5H1.5zm13 .5h-6v1.528l6 3.6V4a.5.5 0 0 0-.5-.5zM15 8.528l-6 3.6v2.372a.5.5 0 0 0 .772.416L15 10.472v-1.944zm-13 1.944 6 3.6a.5.5 0 0 0 .772-.416v-2.372l-6-3.6v2.388z"/>
            </svg>
          )
        },
        {
          path: '/reports',
          name: 'Reportes',
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
            </svg>
          )
        },
        {
          path: '/settings',
          name: 'Configuración',
          icon: (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
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
        width: '260px',
        minWidth: '260px',
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        left: 0
      }}
    >
      {/* Logo Section - Sin borde */}
      <div style={{
        padding: '0px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img 
          src="src\layouts\logoseemann1.png" 
          alt="Seemann Logo" 
          style={{ 
            width: '180px', 
            height: 'auto',
            objectFit: 'contain' 
          }} 
        />
      </div>

      {/* Contenedor con borde que comienza después del logo */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #e5e7eb'
      }}>
        {/* Menu Sections */}
        <nav style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '16px 0'
        }}>
          {menuSections.map((section, sectionIdx) => (
            <div key={sectionIdx} style={{ marginBottom: '24px' }}>
              {/* Section Title */}
              <div style={{
                padding: '0 20px 8px 20px',
                fontSize: '11px',
                fontWeight: '600',
                color: '#9ca3af',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                {section.title}
              </div>

              {/* Section Items */}
              <div>
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 20px',
                        border: 'none',
                        backgroundColor: active ? '#eff6ff' : 'transparent',
                        color: active ? '#3b82f6' : '#6b7280',
                        fontSize: '14px',
                        fontWeight: active ? '500' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                        borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        opacity: active ? 1 : 0.7
                      }}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <div>Dashboard v1.0</div>
          <div style={{ marginTop: '4px' }}>Seemann Group</div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;