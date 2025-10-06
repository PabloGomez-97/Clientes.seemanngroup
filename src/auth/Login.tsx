// src/auth/Login.tsx
import { useState } from 'react';
import { useAuth } from './AuthContext';

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
    <div className="container-fluid min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
            <div className="text-center mb-4">
              <h1 className="h3 fw-bold mb-1">Ingreso de Clientes</h1>
              <p className="text-muted mb-0">Usa las credenciales entregadas por el administrador</p>
            </div>

            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                {err && (
                  <div className="alert alert-danger" role="alert">
                    {err}
                  </div>
                )}

                <form onSubmit={onSubmit} className="needs-validation" noValidate>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold">Correo electrónico</label>
                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="cliente@dominio.com"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold">Clave</label>
                    <input
                      id="password"
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </div>

                  <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Ingresando...
                      </>
                    ) : (
                      'Ingresar'
                    )}
                  </button>

                  <p className="text-muted small mt-3 mb-0">
                    ¿No tienes cuenta? Contacta al administrador.
                  </p>
                </form>
              </div>
            </div>

            <div className="text-center mt-3">
              <small className="text-muted">© {new Date().getFullYear()} Seemann Group</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
