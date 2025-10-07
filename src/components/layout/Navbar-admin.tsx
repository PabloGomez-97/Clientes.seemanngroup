// src/components/layout/Navbar-admin.tsx
import { useAuth } from '../../auth/AuthContext';

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

  const username = user?.username || 'Administrador';
  const tokenPreview = accessToken ? `${accessToken.substring(0, 15)}...` : 'No definido';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
      <div className="container-fluid">
        <button
          className="btn btn-link text-white me-3"
          onClick={toggleSidebar}
          style={{ textDecoration: 'none' }}
          aria-label="Abrir/cerrar menú"
        >
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path
              fillRule="evenodd"
              d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
            />
          </svg>
        </button>

        <span className="navbar-brand mb-0 h1 d-flex align-items-center">
          <svg width="24" height="24" fill="currentColor" className="me-2" viewBox="0 0 16 16">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
          </svg>
          Dashboard Administrador
        </span>

        <div className="ms-auto d-flex align-items-center">
          {accessToken ? (
            <span className="badge bg-success me-3">Conectado</span>
          ) : (
            <span className="badge bg-warning text-dark me-3">Sin token</span>
          )}

          <div className="dropdown">
            <button
              className="btn btn-light dropdown-toggle"
              type="button"
              id="userDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <svg width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
              </svg>
              {username}
            </button>
            <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
              <li>
                <span className="dropdown-item-text small">
                  <strong>Usuario:</strong> {username}
                </span>
              </li>
              <li>
                <span className="dropdown-item-text small">
                  <strong>Token:</strong> {tokenPreview}
                </span>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={handleLogout}>
                  <svg width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                    <path
                      fillRule="evenodd"
                      d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"
                    />
                    <path
                      fillRule="evenodd"
                      d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"
                    />
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