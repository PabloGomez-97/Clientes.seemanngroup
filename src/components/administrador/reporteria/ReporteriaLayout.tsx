// src/components/administrador/reporteria/ReporteriaLayout.tsx
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Users, Target, Loader2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { ReporteriaDataProvider } from './context/ReporteriaDataContext';
import { extractOperations } from './utils/dataProcessing';
import type { Operation } from './utils/types';

export default function ReporteriaLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [operations, setOperations] = useState<Operation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar automáticamente el CSV al montar el componente
  useEffect(() => {
    const loadCSV = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch del archivo CSV desde la carpeta public
        const response = await fetch('/reporte.csv');
        
        if (!response.ok) {
          throw new Error('No se pudo cargar el archivo reporte.csv');
        }

        const csvText = await response.text();

        // Parsear el CSV
        Papa.parse(csvText, {
          complete: (res) => {
            try {
              const rows = (res.data as any[]).map((r) =>
                Array.isArray(r) ? (r as string[]).map((c) => (c == null ? '' : String(c))) : []
              );
              const parsedOps = extractOperations(rows);

              if (parsedOps.length === 0) {
                setError('No se encontraron operaciones válidas en el CSV. Verifica el formato del archivo.');
                setLoading(false);
                return;
              }

              console.log(`✅ Operaciones cargadas: ${parsedOps.length}`);
              setOperations(parsedOps);
              setLoading(false);
              
              // Navegar al dashboard después de cargar
              if (location.pathname === '/admin/reporteria') {
                navigate('/admin/reporteria/dashboard');
              }
            } catch (error) {
              console.error('Error procesando CSV:', error);
              setError('Error procesando el archivo CSV. Verifica el formato.');
              setLoading(false);
            }
          },
          error: (error) => {
            console.error('Error leyendo CSV:', error);
            setError('No se pudo leer el CSV. Revisa el formato.');
            setLoading(false);
          },
          delimiter: ',',
          skipEmptyLines: true,
          encoding: 'latin1',
        });
      } catch (error) {
        console.error('Error cargando CSV:', error);
        setError('No se pudo cargar el archivo reporte.csv. Asegúrate de que exista en /public/reporte.csv');
        setLoading(false);
      }
    };

    loadCSV();
  }, [navigate, location.pathname]);

  const menuItems = [
    {
      path: '/admin/reporteria/dashboard',
      name: 'Dashboard',
      icon: <BarChart3 size={18} />
    },
    {
      path: '/admin/reporteria/kpis',
      name: 'KPIs',
      icon: <Target size={18} />
    },
    {
      path: '/admin/reporteria/ejecutivos',
      name: 'Ejecutivos',
      icon: <Users size={18} />
    },
    {
      path: '/admin/reporteria/tendencias',
      name: 'Tendencias',
      icon: <TrendingUp size={18} />
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Configuración de Administrador
          </h2>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            margin: 0
          }}>
          </p>
        </div>
      </div>

      <ReporteriaDataProvider operations={operations} setOperations={setOperations}>
        <div style={{ backgroundColor: '#fafafa', minHeight: 'calc(100vh - 60px)' }}>
          {/* Mostrar loading mientras carga */}
          {loading ? (
            <div className="container-fluid py-5">
              <div className="row justify-content-center">
                <div className="col-lg-6 col-xl-5">
                  <div
                    className="card border-0 shadow-sm"
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '60px 40px',
                      textAlign: 'center'
                    }}
                  >
                    <Loader2 
                      size={48} 
                      className="mx-auto mb-4" 
                      style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} 
                    />
                    <h4 className="fw-semibold mb-2" style={{ color: '#1f2937' }}>
                      Cargando datos de reportería
                    </h4>
                    <p className="text-muted mb-0">
                      Procesando archivo reporte.csv...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            // Mostrar error si hubo algún problema
            <div className="container-fluid py-5">
              <div className="row justify-content-center">
                <div className="col-lg-6 col-xl-5">
                  <div
                    className="card border-0 shadow-sm"
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '40px'
                    }}
                  >
                    <div className="text-center mb-4">
                      <div
                        className="d-inline-flex align-items-center justify-content-center mb-3"
                        style={{
                          width: '80px',
                          height: '80px',
                          backgroundColor: '#fee2e2',
                          borderRadius: '16px',
                        }}
                      >
                        <AlertCircle size={40} color="#dc2626" />
                      </div>
                      <h4 className="fw-semibold mb-2" style={{ color: '#1f2937' }}>
                        Error al cargar datos
                      </h4>
                    </div>

                    <div
                      className="alert alert-danger d-flex align-items-start"
                      style={{ borderRadius: '8px' }}
                    >
                      <AlertCircle size={20} className="me-2 mt-1" style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Error:</strong> {error}
                      </div>
                    </div>

                    <button
                      onClick={() => window.location.reload()}
                      className="btn btn-primary w-100 mt-3"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Si hay datos, mostrar el layout con sidebar
            <div className="d-flex" style={{ minHeight: 'calc(100vh - 60px)' }}>
              {/* Mini Sidebar */}
              <div
                style={{
                  width: '240px',
                  backgroundColor: 'white',
                  borderRight: '1px solid #e5e7eb',
                  padding: '24px 0',
                }}
              >
                <div className="px-4 mb-4">
                  <h6
                    className="text-uppercase fw-semibold mb-0"
                    style={{ color: '#6b7280', fontSize: '0.75rem', letterSpacing: '0.05em' }}
                  >
                    Reportería
                  </h6>
                </div>

                <nav>
                  {menuItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`w-100 text-start d-flex align-items-center px-4 py-3 border-0 ${
                        isActive(item.path) ? 'bg-primary bg-opacity-10' : 'bg-transparent'
                      }`}
                      style={{
                        color: isActive(item.path) ? '#2563eb' : '#6b7280',
                        fontWeight: isActive(item.path) ? 600 : 400,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        borderLeft: isActive(item.path) ? '3px solid #2563eb' : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span className="me-3">{item.icon}</span>
                      {item.name}
                    </button>
                  ))}
                </nav>

                {/* Info del dataset cargado */}
                <div className="px-4 mt-4 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    <div className="mb-2">
                      <strong style={{ color: '#374151' }}>Dataset activo</strong>
                    </div>
                    <div className="d-flex align-items-center mb-1">
                      <svg
                        width="14"
                        height="14"
                        fill="currentColor"
                        className="me-2"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z" />
                      </svg>
                      {operations?.length.toLocaleString()} operaciones
                    </div>
                  </div>
                </div>
              </div>

              {/* Área de contenido */}
              <div className="flex-grow-1" style={{ padding: '32px', overflowY: 'auto' }}>
                <Outlet />
              </div>
            </div>
          )}
        </div>
      </ReporteriaDataProvider>
    </div>
  );
}

// Agregar la animación de spin en tu CSS global si no existe
// @keyframes spin {
//   from { transform: rotate(0deg); }
//   to { transform: rotate(360deg); }
// }