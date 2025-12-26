// src/components/layout/Navbar-admin.tsx
import { useAuth } from '../auth/AuthContext';

interface NavbarAdminProps {
  accessToken: string;
  onLogout: () => void;
  toggleSidebar: () => void;
}

function NavbarAdmin({ accessToken, onLogout, toggleSidebar }: NavbarAdminProps) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };

  const getUserImage = (nombre?: string) => {
    if (!nombre) return null;

    const partes = nombre.trim().split(' ');
    if (partes.length < 2) return null;

    const iniciales =
      partes[0][0].toLowerCase() + partes[1][0].toLowerCase();

    return `/ejecutivos/${iniciales}.png`;
  };

  const userImage = getUserImage(user?.nombreuser);


  const username = user?.nombreuser || 'Administrador';
  const userEmail = user?.email || 'admin@sphereglobal.io';
  const tokenPreview = accessToken ? `${accessToken.substring(0, 15)}...` : 'No definido';

  return (
    <nav 
      className="navbar navbar-expand-lg navbar-dark shadow-sm"
      style={{ 
        minHeight: '70px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderBottom: '2px solid rgba(99, 102, 241, 0.3)'
      }}
    >
      <div className="container-fluid px-4">
        {/* Toggle Sidebar Button */}
        <button
          className="btn btn-link text-white p-2 me-3 rounded-3 border-0"
          onClick={toggleSidebar}
          style={{
            background: 'rgba(99, 102, 241, 0.15)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
            e.currentTarget.style.transform = 'rotate(90deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
          aria-label="Abrir/cerrar menú"
        >
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </button>

        {/* Right side items */}
        <div className="ms-auto d-flex align-items-center gap-3">
          {/* Connection Status Badge */}
          {accessToken ? (
            <span 
              className="badge rounded-pill px-3 py-2 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                fontSize: '0.75rem',
                fontWeight: '600',
                letterSpacing: '0.5px'
              }}
            >
              <span className="me-2">●</span>
              Conectado
            </span>
          ) : (
            <span 
              className="badge rounded-pill px-3 py-2 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                fontSize: '0.75rem',
                fontWeight: '600',
                letterSpacing: '0.5px'
              }}
            >
              Sin token
            </span>
          )}

          {/* User Dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-link text-white d-flex align-items-center gap-2 p-2 px-3 rounded-3 border-0 text-decoration-none"
              type="button"
              id="userDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                className="rounded-3 me-3 shadow-sm overflow-hidden"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
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
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
                      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                      <path
                        fillRule="evenodd"
                        d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="d-none d-md-block text-start">
                <div className="fw-semibold" style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>
                  {username}
                </div>
              </div>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="ms-1">
                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
            
            <ul 
              className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2"
              aria-labelledby="userDropdown"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                minWidth: '280px',
                borderRadius: '16px'
              }}
            >
              {/* User Profile Header */}
              <li className="p-3 border-bottom border-secondary border-opacity-25">
                <div className="d-flex align-items-center gap-3">
                  <div
                className="rounded-3 me-3 shadow-sm overflow-hidden"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
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
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
                      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                      <path
                        fillRule="evenodd"
                        d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"
                      />
                    </svg>
                  </div>
                )}
              </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="text-white fw-semibold mb-1" style={{ fontSize: '0.95rem' }}>
                      {username}
                    </div>
                    <div className="text-white-50 text-truncate" style={{ fontSize: '0.8rem' }}>
                      {userEmail}
                    </div>
                  </div>
                </div>
              </li>
              
              {/* Menu Items */}
              <li className="p-2">
                <button 
                  className="dropdown-item d-flex align-items-center gap-2 text-white rounded-3 border-0"
                  style={{
                    padding: '10px 12px',
                    background: 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                    <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                  </svg>
                  Mi Perfil
                </button>
              </li>
              
              <li className="p-2">
                <button 
                  className="dropdown-item d-flex align-items-center gap-2 text-white rounded-3 border-0"
                  style={{
                    padding: '10px 12px',
                    background: 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
                  </svg>
                  Configuración
                </button>
              </li>

              {/* Token Info */}
              <li className="px-3 py-2">
                <div 
                  className="rounded-3 p-3"
                  style={{ background: 'rgba(99, 102, 241, 0.15)' }}
                >
                  <div className="text-white-50 mb-1" style={{ fontSize: '0.75rem' }}>
                    Token de Acceso
                  </div>
                  <div className="text-white text-truncate" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {tokenPreview}
                  </div>
                </div>
              </li>
              
              {/* Logout */}
              <li className="p-2 border-top border-secondary border-opacity-25">
                <button 
                  className="dropdown-item d-flex align-items-center gap-2 rounded-3 border-0 fw-semibold"
                  onClick={handleLogout}
                  style={{
                    padding: '10px 12px',
                    color: '#ef4444',
                    background: 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                    <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                  </svg>
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavbarAdmin;