// src/layouts/UserLayout.tsx
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ChatWidget from '../components/ChatWidget';

function UserLayout() {
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Obtener token de Linbis automáticamente al cargar
  useEffect(() => {
    const fetchLinbisToken = async () => {
      try {
        const response = await fetch('/api/linbis-token');
        if (!response.ok) {
          throw new Error('No se pudo obtener el token de Linbis');
        }
        const data = await response.json();
        setAccessToken(data.token);
        setError(null);
      } catch (err) {
        console.error('Error obteniendo token de Linbis:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchLinbisToken();
  }, []);

  const handleLogout = () => {
    setAccessToken('');
    setError(null);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Mostrar loading mientras obtiene el token
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: '#1f2937',
            fontSize: '1rem',
            margin: 0,
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            Iniciando sistema...
          </p>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            margin: 0
          }}>
            Conectando con Linbis
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Mostrar error si falla
  if (error) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '40px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <svg width="32" height="32" fill="#dc2626" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
              </div>
              <h4 style={{ color: '#1f2937', marginBottom: '12px' }}>
                Error de conexión
              </h4>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                {error}
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ height: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-fill d-flex flex-column" style={{ overflow: 'hidden' }}>
        <Navbar 
          accessToken={accessToken}
          onLogout={handleLogout}
          toggleSidebar={toggleSidebar}
        />

        <div className="flex-fill p-4" style={{ overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
          <Outlet context={{ accessToken, onLogout: handleLogout }} />
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}

export default UserLayout;