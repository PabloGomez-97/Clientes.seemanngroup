// src/AdminApp.tsx
import { useState } from 'react';
import TokenForm from './components/tokenform/TokenForm';
import NavbarAdmin from './components/layout/Navbar-admin';
import SidebarAdmin from './components/layout/Sidebar-admin';
import DashboardAdmin from './components/administrador/dashboard-admin';
import UsersManagement from './components/administrador/users-management'; // ← NUEVO

function AdminApp() {
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleTokenSaved = (token: string) => {
    console.log('Token recibido en AdminApp:', token ? 'Sí (longitud: ' + token.length + ')' : 'No');
    setAccessToken(token);
    setError(null);
  };

  const handleLogout = () => {
    setAccessToken('');
    setError(null);
    setActiveView('dashboard');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // ============================================================
  // 🔴 SECCIÓN TOKEN LINBIS - ELIMINAR EN EL FUTURO 🔴
  // ============================================================
  if (!accessToken) {
    return (
      <div className="container py-5">
        <div className="text-center mb-5">
          <h1 className="display-4 fw-bold text-primary mb-2">Panel de Administración</h1>
          <p className="text-muted">Sistema de gestión Linbis</p>
        </div>
        <TokenForm 
          onTokenSaved={handleTokenSaved}
          error={error}
          setError={setError}
        />
      </div>
    );
  }
  // ============================================================
  // 🔴 FIN SECCIÓN TOKEN LINBIS 🔴
  // ============================================================

  return (
    <div className="d-flex" style={{ height: '100vh' }}>
      <SidebarAdmin 
        activeView={activeView}
        setActiveView={setActiveView}
        isOpen={sidebarOpen}
      />

      <div className="flex-fill d-flex flex-column" style={{ overflow: 'hidden' }}>
        <NavbarAdmin 
          accessToken={accessToken}
          onLogout={handleLogout}
          toggleSidebar={toggleSidebar}
        />

        <div className="flex-fill p-4" style={{ overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
          {activeView === 'dashboard' && (
            <DashboardAdmin 
              accessToken={accessToken}
              onLogout={handleLogout}
            />
          )}
          {activeView === 'users' && (  // ← NUEVO
            <UsersManagement 
              accessToken={accessToken}
            />
          )}
          {activeView === 'reporteria' && (
            <div className="text-center py-5">
              <h3 className="text-muted">Módulo de Reportería</h3>
              <p className="text-muted">En desarrollo...</p>
            </div>
          )}
          {activeView === 'soporte' && (
            <div className="text-center py-5">
              <h3 className="text-muted">Módulo de Soporte</h3>
              <p className="text-muted">En desarrollo...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminApp;