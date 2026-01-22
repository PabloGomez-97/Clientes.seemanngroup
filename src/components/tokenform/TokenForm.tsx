// src/components/tokenform/TokenForm.tsx
import { useState } from "react";

interface TokenFormProps {
  onTokenSaved: (token: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

function TokenForm({ onTokenSaved, error, setError }: TokenFormProps) {
  const [tokenInput, setTokenInput] = useState("");

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      onTokenSaved(tokenInput.trim());
      console.log("Token guardado correctamente");
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card shadow">
          <div className="card-body p-5">
            <div className="text-center mb-4">
              <div className="bg-primary bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
                <svg
                  width="48"
                  height="48"
                  fill="currentColor"
                  className="text-primary"
                  viewBox="0 0 16 16"
                >
                  <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z" />
                </svg>
              </div>
              <h3 className="mb-2">Ingresar Token de Acceso</h3>
              <p className="text-muted mb-4">
                Pega tu token OAuth 2.0 desde Postman
              </p>
            </div>

            <div className="alert alert-info">
              <h6 className="alert-heading">
                Cómo obtener el token desde Postman:
              </h6>
              <ol className="mb-0 ps-3">
                <li>Abre Postman y autentícate con OAuth 2.0</li>
                <li>Una vez autenticado, ve a la pestaña "Authorization"</li>
                <li>Busca "Current Token" y copia el "Access Token"</li>
                <li>Pega el token completo abajo (sin "Bearer")</li>
              </ol>
            </div>

            {error && (
              <div
                className="alert alert-danger alert-dismissible fade show"
                role="alert"
              >
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError(null)}
                ></button>
              </div>
            )}

            <div>
              <div className="mb-3">
                <label htmlFor="token" className="form-label fw-bold">
                  Access Token
                </label>
                <textarea
                  className="form-control font-monospace"
                  id="token"
                  rows={4}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6..."
                  style={{ fontSize: "0.85rem" }}
                />
                <small className="form-text text-muted">
                  El token expirará según la configuración de Linbis (usualmente
                  1 hora)
                </small>
              </div>

              <button
                onClick={handleSaveToken}
                className="btn btn-primary btn-lg w-100"
              >
                Guardar Token y Continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenForm;
