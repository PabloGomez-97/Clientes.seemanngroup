// src/components/settings/Settings.tsx
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

function Settings() {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-0">Configuración</h2>
          <p className="text-muted">Ajustes del sistema - {user?.username}</p>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <svg width="64" height="64" fill="currentColor" className="text-muted mb-3" viewBox="0 0 16 16">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
          </svg>
          <h4 className="text-muted">Módulo de Configuración</h4>
          <p className="text-muted">Esta sección está pendiente de implementación</p>
          <small className="text-muted d-block mt-3">
            Token disponible: {accessToken ? 'Sí ✓' : 'No'}
          </small>
        </div>
      </div>
    </div>
  );
}

export default Settings;