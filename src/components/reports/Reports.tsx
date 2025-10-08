import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

function Reports() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-0">Reportes</h2>
          <p className="text-muted">Análisis y reportes de datos</p>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <svg width="64" height="64" fill="currentColor" className="text-muted mb-3" viewBox="0 0 16 16">
            <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2z"/>
          </svg>
          <h4 className="text-muted">Módulo de Reportes</h4>
          <p className="text-muted">Esta sección está pendiente de implementación, {user?.username}</p>
        </div>
      </div>
    </div>
  );
}

export default Reports;