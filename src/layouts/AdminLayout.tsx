// src/layouts/AdminLayout.tsx
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import NavbarAdmin from './Navbar-admin';
import SidebarAdmin from './Sidebar-admin';
import ChatWidget from '../components/ChatWidget';

function AdminLayout() {
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  if (loading) {
    return (
      <div 
        className="d-flex flex-column align-items-center justify-content-center vh-100 position-relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        {/* Animated background circles */}
        <div 
          className="position-absolute rounded-circle"
          style={{
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            top: '10%',
            left: '20%',
            animation: 'float 6s ease-in-out infinite'
          }}
        ></div>
        <div 
          className="position-absolute rounded-circle"
          style={{
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            bottom: '15%',
            right: '25%',
            animation: 'float 8s ease-in-out infinite 1s'
          }}
        ></div>

        {/* Loading card */}
        <div 
          className="bg-white rounded-4 shadow-lg p-5 text-center position-relative"
          style={{
            minWidth: '320px',
            maxWidth: '400px',
            backdropFilter: 'blur(20px)',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          {/* Animated logo */}
          <div 
            className="rounded-4 d-flex align-items-center justify-content-center mx-auto mb-4 shadow"
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              animation: 'float 3s ease-in-out infinite'
            }}
          >
            <svg width="40" height="40" fill="white" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
            </svg>
          </div>

          {/* Spinner */}
          <div 
            className="spinner-border text-primary mx-auto mb-4"
            role="status"
            style={{ width: '60px', height: '60px' }}
          >
            <span className="visually-hidden">Cargando...</span>
          </div>

          {/* Text */}
          <h4 className="text-dark fw-bold mb-2" style={{ fontSize: '1.3rem', letterSpacing: '0.5px' }}>
            Iniciando Dashboard
          </h4>
          <p className="text-secondary mb-0" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
            Conectando con Seemann Group...
          </p>

          {/* Progress dots */}
          <div className="d-flex gap-2 justify-content-center mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-circle"
                style={{
                  width: '8px',
                  height: '8px',
                  background: '#6366f1',
                  animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`
                }}
              ></div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="d-flex align-items-center justify-content-center vh-100 p-4"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div 
          className="bg-white rounded-4 shadow-lg p-5 text-center"
          style={{
            maxWidth: '500px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          {/* Error icon */}
          <div 
            className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
            style={{
              width: '80px',
              height: '80px',
              border: '4px solid rgba(220, 38, 38, 0.3)'
            }}
          >
            <svg width="40" height="40" fill="#dc2626" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
            </svg>
          </div>

          <h3 className="text-dark fw-bold mb-3" style={{ fontSize: '1.5rem' }}>
            Error de Conexión
          </h3>
          
          <p className="text-secondary mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
            {error}
          </p>
          
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary btn-lg px-4 py-3 rounded-3 fw-semibold shadow"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(99, 102, 241, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16" className="me-2">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex vh-100 overflow-hidden">
      <SidebarAdmin isOpen={sidebarOpen} />

      <div className="flex-fill d-flex flex-column overflow-hidden">
        <NavbarAdmin 
          accessToken={accessToken}
          onLogout={handleLogout}
          toggleSidebar={toggleSidebar}
        />

        <div 
          className="flex-fill p-4 overflow-auto position-relative"
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
          }}
        >
          {/* Decorative background elements */}
          <div 
            className="position-fixed rounded-circle"
            style={{
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
              top: '-200px',
              right: '-200px',
              pointerEvents: 'none',
              zIndex: 0
            }}
          ></div>
          <div 
            className="position-fixed rounded-circle"
            style={{
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
              bottom: '-150px',
              left: '-150px',
              pointerEvents: 'none',
              zIndex: 0
            }}
          ></div>

          <div className="position-relative" style={{ zIndex: 1 }}>
            <Outlet context={{ accessToken, onLogout: handleLogout }} />
          </div>
        </div>
      </div>
      
      <ChatWidget/>
    </div>
  );
}

export default AdminLayout;