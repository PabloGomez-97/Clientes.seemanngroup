import React, { useState } from 'react';
import CotizadorAereo from '../quotes/QuoteAIR';
import CotizadorFCL from '../quotes/QuoteFCL';
import CotizadorLCL from '../quotes/QuoteLCL';

type TipoCotizacion = 'AEREO' | 'FCL' | 'LCL' | null;

const Cotizador: React.FC = () => {
  const [tipoCotizacion, setTipoCotizacion] = useState<TipoCotizacion>(null);

  const handleSeleccionTipo = (tipo: TipoCotizacion) => {
    setTipoCotizacion(tipo);
  };

  const handleVolver = () => {
    setTipoCotizacion(null);
  };

  // Pantalla de selección inicial
  if (tipoCotizacion === null) {
    return (
      <div className="container mt-5 mb-5">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="display-4 fw-light mb-3">Sistema de Cotización</h1>
          <p className="lead text-muted">
            Seleccione el tipo de cotización que desea realizar
          </p>
        </div>

        {/* Tarjetas de selección */}
        <div className="row g-4 justify-content-center mb-5">
          {/* AEREO */}
          <div className="col-md-4">
            <div 
              className="card shadow-sm h-100 border-0 cursor-pointer hover-card"
              onClick={() => handleSeleccionTipo('AEREO')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="card-body text-center p-5">
                <h2 className="card-title h3 mb-3">AEREO</h2>
                <p className="card-text text-muted">
                  Cotización de carga aérea
                </p>
                <p className="small text-muted mb-4">
                  Tarifas por kilogramo en diferentes rangos de peso
                </p>
                <button 
                  className="btn btn-outline-primary btn-lg w-100"
                  onClick={() => handleSeleccionTipo('AEREO')}
                >
                  Seleccionar
                </button>
              </div>
            </div>
          </div>

          {/* FCL */}
          <div className="col-md-4">
            <div 
              className="card shadow-sm h-100 border-0 cursor-pointer hover-card"
              onClick={() => handleSeleccionTipo('FCL')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="card-body text-center p-5">
                <h2 className="card-title h3 mb-3">FCL</h2>
                <p className="card-text text-muted">
                  Full Container Load
                </p>
                <p className="small text-muted mb-4">
                  Tarifas por contenedor completo (20GP, 40HQ, 40NOR)
                </p>
                <button 
                  className="btn btn-outline-primary btn-lg w-100"
                  onClick={() => handleSeleccionTipo('FCL')}
                >
                  Seleccionar
                </button>
              </div>
            </div>
          </div>

          {/* LCL */}
          <div className="col-md-4">
            <div 
              className="card shadow-sm h-100 border-0 cursor-pointer hover-card"
              onClick={() => handleSeleccionTipo('LCL')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="card-body text-center p-5">
                <h2 className="card-title h3 mb-3">LCL</h2>
                <p className="card-text text-muted">
                  Less than Container Load
                </p>
                <p className="small text-muted mb-4">
                  Tarifas por consolidación marítima y múltiples proveedores
                </p>
                <button 
                  className="btn btn-outline-primary btn-lg w-100"
                  onClick={() => handleSeleccionTipo('LCL')}
                >
                  Seleccionar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cuadro de ayuda */}
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            <div className="card border-0 bg-light">
              <div className="card-body p-4">
                <h5 className="card-title mb-3">¿Necesita ayuda para elegir?</h5>
                <div className="row g-3">
                  <div className="col-md-4">
                    <h6 className="fw-semibold mb-2">AEREO</h6>
                    <p className="small text-muted mb-0">
                      Ideal para envíos urgentes o productos de alto valor. 
                      Tarifas basadas en peso.
                    </p>
                  </div>
                  <div className="col-md-4">
                    <h6 className="fw-semibold mb-2">FCL</h6>
                    <p className="small text-muted mb-0">
                      Perfecto para grandes volúmenes. Contenedor exclusivo 
                      para su carga.
                    </p>
                  </div>
                  <div className="col-md-4">
                    <h6 className="fw-semibold mb-2">LCL</h6>
                    <p className="small text-muted mb-0">
                      Económico para volúmenes medianos. Comparte espacio 
                      en contenedor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar el componente seleccionado
  return (
    <div className="container mt-4">
      {/* Botón para volver (más elegante) */}
      <button
        className="btn btn-link text-secondary text-decoration-none mb-3"
        onClick={handleVolver}
      >
        <i className="bi bi-arrow-left me-2"></i>
        ← Volver a selección
      </button>

      {/* Componente seleccionado */}
      {tipoCotizacion === 'AEREO' && <CotizadorAereo key="aereo" />}
      {tipoCotizacion === 'FCL' && <CotizadorFCL key="fcl" />}
      {tipoCotizacion === 'LCL' && <CotizadorLCL key="lcl" />}
    </div>
  );
};

export default Cotizador;