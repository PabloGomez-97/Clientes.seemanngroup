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
      const startTime = Date.now();
      
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
        // Asegurar que el loading se muestre por al menos 1 segundos
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 500 - elapsedTime);
        
        setTimeout(() => {
          setLoading(false);
        }, remainingTime);
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
      <div 
        className="d-flex flex-column align-items-center justify-content-center vh-100 position-relative overflow-hidden"
        style={{
          backgroundImage: 'url(/logoseemann.jpg)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1a365d'
        }}
      >
        {/* Overlay oscuro para mejor contraste */}
        <div 
          className="position-absolute w-100 h-100"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 0
          }}
        ></div>

        {/* Contenido centrado */}
        <div 
          className="text-center position-relative"
          style={{ zIndex: 1 }}
        >
          {/* Spinner */}
          <div 
            className="spinner-border text-light mx-auto mb-4"
            role="status"
            style={{ width: '60px', height: '60px' }}
          >
            <span className="visually-hidden">Cargando...</span>
          </div>

          {/* Text */}
          <h4 className="text-white fw-bold mb-2" style={{ fontSize: '1.5rem', letterSpacing: '0.5px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Iniciando Sistema
          </h4>
          <p className="text-white mb-0" style={{ fontSize: '1rem', fontWeight: '500', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            Conectando con Seemann Group...
          </p>

          {/* Progress dots */}
          <div className="d-flex gap-2 justify-content-center mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-circle"
                style={{
                  width: '10px',
                  height: '10px',
                  background: 'white',
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              ></div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
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