import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

/**
 * 🧪 COMPONENTE DE PRUEBA - API Quote Tester
 * 
 * Este componente es temporal y sirve para:
 * 1. Identificar qué campos son obligatorios en la API
 * 2. Ver la estructura exacta que espera el endpoint
 * 3. Probar diferentes combinaciones de datos
 * 
 * ⚠️ ELIMINAR después de identificar los campos requeridos
 */
function QuoteAPITester() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  const [testLevel, setTestLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Diferentes niveles de prueba con complejidad incremental
  // USANDO IDS REALES DEL SISTEMA
  const getTestPayload = (level: number) => {
    const payloads: Record<number, any> = {
      // NIVEL 1: Absolutamente mínimo - Solo campos primitivos básicos
      1: {
        date: new Date().toISOString(),
      },
      
      // NIVEL 2: Agregar campos de fecha y validez
      2: {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 días
        transitDays: 5,
      },
      
      // NIVEL 3: Agregar referencias y descripción
      3: {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        customerReference: "TEST-REF-CLAUDE",
        descriptionOfGoods: "Test shipment from API tester",
        remarks: "API test - Claude",
      },
      
      // NIVEL 4: Agregar issuingCompany y contact (IDs REALES)
      4: {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        customerReference: "TEST-REF-CLAUDE",
        descriptionOfGoods: "Test shipment from API tester",
        remarks: "API test - Level 4",
        issuingCompany: {
          id: 24257  // ID real: DT CHINA (SHANGHAI) LTD
        },
        contact: {
          id: 21969  // ID real: SCANCONTROLS INGENIERIA LTDA
        },
      },
      
      // NIVEL 5: Agregar origen y destino (IDs REALES)
      5: {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        customerReference: "TEST-REF-CLAUDE",
        descriptionOfGoods: "Test shipment from API tester",
        remarks: "API test - Level 5",
        issuingCompany: {
          id: 24257
        },
        contact: {
          id: 21969
        },
        origin: {
          id: 9066  // SHANGHAI PUDONG INTERNATIONAL AIRPORT
        },
        destination: {
          id: 6580  // COMODORO ARTURO MERINO BENITEZ INTERNATIONAL AIRPORT
        },
      },
      
      // NIVEL 6: Agregar shipper y consignee (IDs REALES)
      6: {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        customerReference: "TEST-REF-PABLO",
        modeOfTransportation: { id: 1, name: "10 - Vessel"},
        descriptionOfGoods: "Test shipment from API tester",
        remarks: "API test - Level 6",
        issuingCompany: {
          id: 24257
        },
        contact: {
          id: 21969
        },
        origin: {
          id: 9066
        },
        destination: {
          id: 6580
        },
        shipper: {
          id: 30699  // Rotork Flow Technology (Suzhou)Co.Ltd
        },
        consignee: {
          id: 21969  // SCANCONTROLS INGENIERIA LTDA
        },
      },
      
      // NIVEL 7: Agregar modo de transporte, carrier y salesRep
      7: {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 11,
        customerReference: "TEST-REF-CLAUDE",
        descriptionOfGoods: "Test shipment from API tester",
        remarks: "API test - Level 7",
        issuingCompany: {
          id: 24257
        },
        contact: {
          id: 21969
        },
        origin: {
          id: 9066
        },
        destination: {
          id: 6580
        },
        shipper: {
          id: 30699
        },
        consignee: {
          id: 21969
        },
        modeOfTransportation: {
          id: 1,
          name: "40 - Air"
        },
        carrierBroker: {
          id: 27821  // AMERICAN AIRLINES
        },
        salesRep: {
          id: 8057  // Natalia Aguilera
        },
      },
      
      // NIVEL 8: Agregar portOfReceipt y pickupFrom
      8: {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 11,
        customerReference: "TEST-REF-CLAUDE",
        descriptionOfGoods: "Test shipment from API tester",
        remarks: "API test - Level 8",
        issuingCompany: {
          id: 24257
        },
        contact: {
          id: 21969
        },
        origin: {
          id: 9066
        },
        destination: {
          id: 6580
        },
        shipper: {
          id: 30699
        },
        consignee: {
          id: 21969
        },
        modeOfTransportation: {
          id: 1,
          name: "40 - Air"
        },
        carrierBroker: {
          id: 27821
        },
        salesRep: {
          id: 8057
        },
        portOfReceipt: {
          id: 9066  // SHANGHAI PUDONG INTERNATIONAL AIRPORT
        },
        pickupFrom: {
          id: 30699  // Rotork Flow Technology
        },
      },
      
      // NIVEL 9: Agregar un commodity básico
      9: {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 11,
        customerReference: "TEST-REF-CLAUDE",
        descriptionOfGoods: "Test shipment from API tester",
        remarks: "API test - Level 9",
        issuingCompany: {
          id: 24257
        },
        contact: {
          id: 21969
        },
        origin: {
          id: 9066
        },
        destination: {
          id: 6580
        },
        shipper: {
          id: 30699
        },
        consignee: {
          id: 21969
        },
        modeOfTransportation: {
          id: 1,
          name: "40 - Air"
        },
        carrierBroker: {
          id: 27821
        },
        salesRep: {
          id: 8057
        },
        portOfReceipt: {
          id: 9066
        },
        pickupFrom: {
          id: 30699
        },
        commodities: [
          {
            commodityType: "Standard",
            pieces: 1,
            description: "Test Cargo - Claude Tester",
            weightPerUnitValue: 101,
            weightPerUnitUOM: "lb",
            totalWeightValue: 101,
            totalWeightUOM: "lb",
            lengthValue: 50,
            lengthUOM: "in",
            widthValue: 40,
            widthUOM: "in",
            heightValue: 30,
            heightUOM: "in",
          }
        ],
      },
    };
    
    return payloads[level] || payloads[1];
  };

  const testAPI = async () => {
    if (!accessToken) {
      setError('No hay token de acceso disponible');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    const payload = getTestPayload(testLevel);

    try {
      console.log('🚀 Enviando payload de prueba (Nivel ' + testLevel + '):', payload);
      
      const res = await fetch('https://api.linbis.com/Quotes/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('❌ Error en la respuesta:', data);
        setError(`Error ${res.status}: ${JSON.stringify(data, null, 2)}`);
      } else {
        console.log('✅ ¡Éxito! Respuesta:', data);
        setResponse(data);
      }
    } catch (err) {
      console.error('❌ Error en la llamada:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-2">🧪 API Quote Tester</h2>
          <p className="text-muted">Componente temporal para identificar campos obligatorios</p>
          <div className="alert alert-warning" role="alert">
            ⚠️ <strong>Nota:</strong> Este componente es solo para pruebas. Eliminar después de identificar los campos requeridos.
          </div>
        </div>
      </div>

      {/* Control de nivel de prueba */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Nivel de Prueba</h5>
          <div className="d-flex gap-2 flex-wrap mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
              <button
                key={level}
                onClick={() => setTestLevel(level)}
                className={`btn ${testLevel === level ? 'btn-primary' : 'btn-outline-primary'}`}
              >
                Nivel {level}
              </button>
            ))}
          </div>
          
          <div className="alert alert-info mb-3">
            <strong>Nivel {testLevel}:</strong>
            <ul className="mb-0 mt-2" style={{ fontSize: '0.9rem' }}>
              {testLevel === 1 && <li>Solo fecha básica</li>}
              {testLevel === 2 && <li>Fecha + validez + días de tránsito</li>}
              {testLevel === 3 && <li>Nivel 2 + referencias y descripción</li>}
              {testLevel === 4 && <li>Nivel 3 + empresa emisora y contacto (IDs REALES)</li>}
              {testLevel === 5 && <li>Nivel 4 + origen y destino (IDs REALES)</li>}
              {testLevel === 6 && <li>Nivel 5 + shipper y consignee (IDs REALES)</li>}
              {testLevel === 7 && <li>Nivel 6 + modo de transporte, carrier y salesRep (IDs REALES)</li>}
              {testLevel === 8 && <li>Nivel 7 + portOfReceipt y pickupFrom (IDs REALES)</li>}
              {testLevel === 9 && <li>Nivel 8 + commodity básico</li>}
            </ul>
          </div>

          <button
            onClick={testAPI}
            disabled={loading || !accessToken}
            className="btn btn-lg btn-success"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Probando...
              </>
            ) : (
              <>🚀 Probar API (Nivel {testLevel})</>
            )}
          </button>

          {!accessToken && (
            <div className="alert alert-danger mt-3">
              ⚠️ No hay token de acceso. Asegúrate de estar autenticado.
            </div>
          )}
        </div>
      </div>

      {/* Payload que se va a enviar */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title">📤 Payload que se enviará</h5>
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '5px',
            maxHeight: '300px',
            overflow: 'auto',
            fontSize: '0.85rem'
          }}>
            {JSON.stringify(getTestPayload(testLevel), null, 2)}
          </pre>
        </div>
      </div>

      {/* Resultados */}
      {error && (
        <div className="card shadow-sm mb-4 border-danger">
          <div className="card-body">
            <h5 className="card-title text-danger">❌ Error en la llamada</h5>
            <pre style={{
              backgroundColor: '#fff5f5',
              padding: '15px',
              borderRadius: '5px',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '0.85rem',
              color: '#c53030'
            }}>
              {error}
            </pre>
            <div className="mt-3">
              <p className="mb-2"><strong>💡 Sugerencias:</strong></p>
              <ul style={{ fontSize: '0.9rem' }}>
                <li>Revisa el mensaje de error para identificar campos faltantes</li>
                <li>Prueba con el siguiente nivel para agregar más campos</li>
                <li>Si el error es de autenticación, verifica el token</li>
                <li>Si el error es 400, probablemente faltan campos obligatorios</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {response && (
        <div className="card shadow-sm mb-4 border-success">
          <div className="card-body">
            <h5 className="card-title text-success">✅ ¡Éxito! Respuesta de la API</h5>
            <pre style={{
              backgroundColor: '#f0fdf4',
              padding: '15px',
              borderRadius: '5px',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '0.85rem',
              color: '#15803d'
            }}>
              {JSON.stringify(response, null, 2)}
            </pre>
            <div className="alert alert-success mt-3">
              🎉 <strong>¡Perfecto!</strong> Este nivel de campos es suficiente para crear una cotización. 
              Ahora sabemos qué campos son obligatorios.
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">📋 Instrucciones de uso</h5>
          <ol style={{ fontSize: '0.9rem' }}>
            <li className="mb-2">
              <strong>Comienza con Nivel 1</strong> y haz clic en "Probar API"
            </li>
            <li className="mb-2">
              <strong>Si da error</strong>, lee el mensaje de error para identificar qué campos faltan
            </li>
            <li className="mb-2">
              <strong>Incrementa el nivel</strong> progresivamente hasta que la llamada sea exitosa
            </li>
            <li className="mb-2">
              <strong>Una vez que funcione</strong>, sabremos exactamente qué campos son obligatorios
            </li>
            <li className="mb-2">
              <strong>Anota los resultados</strong> para crear el formulario final
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default QuoteAPITester;