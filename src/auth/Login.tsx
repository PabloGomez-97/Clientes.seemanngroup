// src/auth/Login.tsx
import { useState } from 'react';
import { useAuth } from './AuthContext';
import logoSeemann from './logoseemann.png';
import backgroundImage from './imagen4.jpg'; // Renombra tu archivo de fondo como 'imagen4.png' o ajusta este import

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setErr(e.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '20px'
    }}>
      {/* Imagen de fondo */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0
      }} />
      
      {/* Overlay semitransparente */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(2px)',
        zIndex: 1
      }} />
      
      {/* Contenido principal */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Logo y Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px'
        }}>
          <div style={{
            display: 'inline-block',
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            <img 
              src={logoSeemann} 
              alt="Seemann Group" 
              style={{
                height: '64px',
                width: 'auto',
                display: 'block'
              }}
            />
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Portal de Clientes
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            margin: 0,
            fontWeight: '400'
          }}>
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Card del Formulario */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          padding: '40px',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          {/* Error Alert */}
          {err && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'start',
              gap: '12px'
            }}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 16 16" 
                fill="#dc2626"
                style={{ flexShrink: 0, marginTop: '2px' }}
              >
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
              </svg>
              <div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#991b1b',
                  fontWeight: '500'
                }}>
                  {err}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: '24px' }}>
              <label 
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  letterSpacing: '-0.2px'
                }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  color: '#1f2937',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '32px' }}>
              <label 
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  letterSpacing: '-0.2px'
                }}
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  color: '#1f2937',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: loading ? '#93c5fd' : '#2563eb',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '-0.2px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Ingresando...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                    <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                  </svg>
                  Ingresar
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #f3f4f6',
            textAlign: 'center'
          }}>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              ¿No tienes acceso?{' '}
              <span style={{ 
                color: '#2563eb', 
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Contacta al administrador
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#9ca3af',
            fontWeight: '400'
          }}>
            © {new Date().getFullYear()} Seemann Group. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}