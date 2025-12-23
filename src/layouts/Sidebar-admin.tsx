// src/components/layout/Sidebar-admin.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface SidebarAdminProps {
  isOpen: boolean;
}

function SidebarAdmin({ isOpen }: SidebarAdminProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const username = user?.nombreuser || 'Administrador';

  const allMenuItems = [
    {
      path: '/admin/cotizador-administrador',
      name: 'Cotizador',
      icon: (
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
        </svg>
      )
    },
    {
      path: '/admin/tusclientes',
      name: 'Tus Clientes',
      icon: (
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
        </svg>
      )
    },
    {
      path: '/admin/users',
      name: 'Gestión de Usuarios',
      icon: (
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
        </svg>
      ),
      restrictedTo: 'superadmin@sphereglobal.io'
    },
    {
      path: '/admin/ejecutivos',
      name: 'Gestión de Ejecutivos',
      icon: (
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
        </svg>
      ),
      restrictedTo: 'superadmin@sphereglobal.io'
    },
    {
      path: '/admin/reporteria',
      name: 'Reportería',
      icon: (
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
        </svg>
      )
    },
    {
      path: '/admin/reportexecutive',
      name: 'Reportes Ejecutivos',
      icon: (
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1zM4.5 9a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM4 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 1 0-1h4a.5.5 0 0 1 0 1h-4z"/>
        </svg>
      ),
      restrictedTo: 'naguilera@seemanngroup.com'
    },
    {
      path: '/admin/dashboard',
      name: 'Registro de Cambios',
      icon: (
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
        </svg>
      )
    }
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.restrictedTo) {
      return user?.email === item.restrictedTo;
    }
    return true;
  });

  if (!isOpen) return null;

  const isActive = (path: string) => location.pathname === path;

  const SIDEBAR_WIDTH = 280;

  return (
    <div
      className="bg-dark text-white d-flex flex-column shadow-lg"
      style={{
        width: `${SIDEBAR_WIDTH}px`,
        minWidth: `${SIDEBAR_WIDTH}px`,
        flex: `0 0 ${SIDEBAR_WIDTH}px`,
        flexShrink: 0,
        height: '100vh',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        position: 'relative'
      }}
    >
      {/* Header con logo de la empresa */}
      <div 
        className="text-center p-4 m-3 rounded-4 shadow-lg d-flex align-items-center justify-content-center"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          minHeight: '120px'
        }}
      >
        <img 
          src="/logocompleto.png" 
          alt="Seemann Group Logo" 
          className="img-fluid"
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

      {/* Divider decorativo */}
      <hr className="mx-4 my-2 opacity-25" style={{ borderColor: '#6366f1' }} />

      {/* Navegación */}
      <nav className="flex-fill px-2" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        <ul className="nav flex-column gap-1">
          {menuItems.map((item) => (
            <li key={item.path} className="nav-item">
              <button
                className={`nav-link text-white w-100 text-start d-flex align-items-center rounded-3 border-0 ${
                  isActive(item.path) ? 'shadow-sm' : ''
                }`}
                onClick={() => navigate(item.path)}
                style={{
                  background: isActive(item.path) 
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
                    : 'transparent',
                  padding: '12px 16px',
                  transition: 'all 0.3s ease',
                  fontWeight: isActive(item.path) ? '600' : '500',
                  fontSize: '0.95rem'
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <span 
                  className="me-3 d-flex align-items-center justify-content-center rounded-2"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: isActive(item.path) 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'rgba(99, 102, 241, 0.1)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {item.icon}
                </span>
                <span className="flex-grow-1 text-truncate">
                  {item.name}
                </span>
                {isActive(item.path) && (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="ms-2">
                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Divider decorativo */}
      <hr className="mx-4 my-2 opacity-25" style={{ borderColor: '#6366f1' }} />

      {/* Footer con usuario */}
      <div className="p-3 m-3 rounded-3" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
        <div className="d-flex align-items-center mb-3">
          <div 
            className="rounded-3 d-flex align-items-center justify-content-center me-3 shadow-sm"
            style={{
              width: '44px',
              height: '44px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            }}
          >
            <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
            </svg>
          </div>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="text-white fw-semibold text-truncate small">
              {username}
            </div>
            <div className="d-flex align-items-center gap-1 mt-1">
              <span 
                className="rounded-circle d-inline-block"
                style={{
                  width: '6px',
                  height: '6px',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981'
                }}
              ></span>
              <small className="text-white-50" style={{ fontSize: '0.75rem' }}>
                En línea
              </small>
            </div>
          </div>
        </div>
        <div className="text-center pt-3 border-top border-secondary border-opacity-25">
          <small className="text-white-50" style={{ fontSize: '0.7rem' }}>
            Seemann Group © {new Date().getFullYear()}
          </small>
        </div>
      </div>
    </div>
  );
}

export default SidebarAdmin;