// src/components/Sidebar/Changelog.tsx
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { COLORS, GRADIENTS } from '../../themes/reportTheme';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface Change {
  type: 'feature' | 'improvement' | 'fix' | 'breaking';
  description: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: Change[];
}

// ========================================
// 🚀 AQUÍ AGREGAS TUS CAMBIOS ANTES DE HACER DEPLOY
// ========================================
const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: '2.2.0',
    date: '2024-12-17',
    changes: [
      {
        type: 'feature',
        description: 'Imágenes de carriers en todas las cotizaciones (Aéreas, LCL y FCL)'
      },
      {
        type: 'feature',
        description: 'Sistema de notificación cuando cliente selecciona cotización con costo $0 (caso a caso)'
      },
      {
        type: 'feature',
        description: 'Nuevos badges "Mejor opción" y "Menor tiempo" para facilitar decisión del cliente'
      },
      {
        type: 'feature',
        description: 'Componente Changelog para visualizar actualizaciones del portal de clientes y ejecutivos'
      },
      {
        type: 'feature',
        description: 'Alerta en LCL cuando cliente escoge ruta con valor $0 para contactar con ejecutivo'
      },
      {
        type: 'fix',
        description: 'Corrección de rutas indefinidas en el portal de clientes'
      },
      {
        type: 'fix',
        description: 'Normalización de nombres de puertos LCL: San Antonio - Valparaíso ahora se muestra como San Antonio / Valparaíso'
      }
    ]
  },
  {
    version: '2.1.0',
    date: '2024-01-15',
    changes: [
      {
        type: 'feature',
        description: 'Nuevo sistema de búsqueda avanzada en el módulo de embarques'
      },
      {
        type: 'feature',
        description: 'Dashboard de analytics con gráficos interactivos en tiempo real'
      },
      {
        type: 'improvement',
        description: 'Optimización del rendimiento en la carga de datos de cotizaciones'
      },
      {
        type: 'improvement',
        description: 'Mejoras en la interfaz de usuario del módulo de usuarios'
      },
      {
        type: 'fix',
        description: 'Corrección en el cálculo de tarifas para embarques FCL'
      },
      {
        type: 'fix',
        description: 'Solución de bug en la exportación de reportes a Excel'
      }
    ]
  },
  {
    version: '2.0.5',
    date: '2024-01-08',
    changes: [
      {
        type: 'feature',
        description: 'Integración con API de Linbis para tracking en tiempo real'
      },
      {
        type: 'improvement',
        description: 'Rediseño completo del módulo de cotizaciones'
      },
      {
        type: 'fix',
        description: 'Corrección en la validación de formularios de embarque'
      }
    ]
  },
  {
    version: '2.0.0',
    date: '2024-01-01',
    changes: [
      {
        type: 'breaking',
        description: 'Migración completa a React 18 y TypeScript'
      },
      {
        type: 'feature',
        description: 'Nueva arquitectura de autenticación con JWT'
      },
      {
        type: 'feature',
        description: 'Sistema de roles y permisos granulares'
      },
      {
        type: 'improvement',
        description: 'Mejoras significativas en la velocidad de carga de páginas'
      }
    ]
  }
];
// ========================================

const getChangeTypeConfig = (type: Change['type']) => {
  switch (type) {
    case 'feature':
      return {
        label: 'Nueva Funcionalidad',
        color: COLORS.primary,
        gradient: GRADIENTS.purple,
        icon: (
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
        )
      };
    case 'improvement':
      return {
        label: 'Mejora',
        color: COLORS.ocean,
        gradient: GRADIENTS.cyan,
        icon: (
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
          </svg>
        )
      };
    case 'fix':
      return {
        label: 'Corrección',
        color: COLORS.success,
        gradient: GRADIENTS.green,
        icon: (
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M14.12 10.163 12 12.283V10a2 2 0 0 0-2-2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6.163z"/>
            <path d="M2 14v-1.293l6.646-6.647a.5.5 0 0 1 .708 0l2.586 2.586a.5.5 0 0 1 0 .708L5.293 16H4a2 2 0 0 1-2-2z"/>
          </svg>
        )
      };
    case 'breaking':
      return {
        label: 'Cambio Importante',
        color: COLORS.danger,
        gradient: GRADIENTS.danger,
        icon: (
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
        )
      };
  }
};

function Changelog() {
  const { accessToken, onLogout } = useOutletContext<OutletContext>();
  const { user } = useAuth();

  return (
    <div className="container-fluid" style={{ paddingBottom: '40px' }}>
      {/* Header con efecto degradado */}
      <div className="row mb-4">
        <div className="col">
          <div style={{
            background: GRADIENTS.purple,
            borderRadius: '16px',
            padding: '32px',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decoración de fondo */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(40px)'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <svg width="32" height="32" fill="white" viewBox="0 0 16 16">
                    <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                  </svg>
                </div>
                <div>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    margin: 0,
                    letterSpacing: '-0.5px'
                  }}>
                    Registro de Cambios
                  </h1>
                  <p style={{
                    fontSize: '16px',
                    margin: 0,
                    opacity: 0.9
                  }}>
                    Historial completo de actualizaciones y mejoras del sistema
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: `2px solid ${COLORS.primary}`,
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)'
          }}>
            <div style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '8px' }}>
              Versión Actual
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: COLORS.primary }}>
              {CHANGELOG_DATA[0].version}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: `2px solid ${COLORS.success}`,
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
          }}>
            <div style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '8px' }}>
              Última Actualización
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS.success }}>
              {new Date(CHANGELOG_DATA[0].date).toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline de Versiones */}
      <div className="row">
        <div className="col">
          {CHANGELOG_DATA.map((entry, index) => (
            <div key={entry.version} style={{ position: 'relative', paddingLeft: '40px', marginBottom: '32px' }}>
              {/* Línea vertical */}
              {index !== CHANGELOG_DATA.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '20px',
                  top: '60px',
                  bottom: '-32px',
                  width: '2px',
                  background: `linear-gradient(180deg, ${COLORS.primary} 0%, transparent 100%)`
                }} />
              )}
              
              {/* Punto en la línea */}
              <div style={{
                position: 'absolute',
                left: '10px',
                top: '24px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: index === 0 ? GRADIENTS.purple : COLORS.border,
                border: `3px solid ${index === 0 ? COLORS.primary : COLORS.background}`,
                boxShadow: index === 0 ? '0 0 20px rgba(99, 102, 241, 0.5)' : 'none',
                zIndex: 1
              }} />

              {/* Card de versión */}
              <div style={{
                background: 'white',
                borderRadius: '16px',
                border: `2px solid ${index === 0 ? COLORS.primary : COLORS.border}`,
                overflow: 'hidden',
                boxShadow: index === 0 ? '0 8px 32px rgba(99, 102, 241, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s ease'
              }}>
                {/* Header de la versión */}
                <div style={{
                  background: index === 0 ? GRADIENTS.purple : COLORS.background,
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {index === 0 && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backdropFilter: 'blur(10px)'
                      }}>
                        ✨ ÚLTIMA VERSIÓN
                      </div>
                    )}
                    <div>
                      <h3 style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        margin: 0,
                        color: index === 0 ? 'white' : COLORS.textPrimary
                      }}>
                        v{entry.version}
                      </h3>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: index === 0 ? 'rgba(255, 255, 255, 0.9)' : COLORS.textSecondary,
                    fontWeight: '500'
                  }}>
                    {new Date(entry.date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>

                {/* Lista de cambios */}
                <div style={{ padding: '24px' }}>
                  {entry.changes.map((change, changeIndex) => {
                    const config = getChangeTypeConfig(change.type);
                    return (
                      <div
                        key={changeIndex}
                        style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: changeIndex !== entry.changes.length - 1 ? '16px' : 0,
                          padding: '16px',
                          background: COLORS.background,
                          borderRadius: '12px',
                          border: `1px solid ${COLORS.border}`,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = config.color;
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = COLORS.border;
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        {/* Badge del tipo de cambio */}
                        <div style={{
                          minWidth: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: config.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          flexShrink: 0
                        }}>
                          {config.icon}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: config.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            {config.label}
                          </div>
                          <div style={{
                            fontSize: '15px',
                            color: COLORS.textPrimary,
                            lineHeight: '1.5'
                          }}>
                            {change.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Changelog;