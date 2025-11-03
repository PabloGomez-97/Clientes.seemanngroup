import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";
import { packageTypeOptions } from './PackageTypes/Containertypes';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

function QuoteAPITester() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para el packageType seleccionado
  const [selectedPackageType, setSelectedPackageType] = useState(40); // Por defecto 20 FT. STANDARD CONTAINER

  const getTestPayload = () => {
    return {
      id: 14184,
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      transitDays: 5,
      customerReference: "TEST-REF-CLAUDE",
      contact: {
        name: "SCANCONTROLS INGENIERIA LTDA"
      },
      origin: {
        name: "FRA"
      },
      destination: {
        name: "SCL"
      },
      modeOfTransportation: {
        id: 1
      },
      rateCategoryId: 2,
      portOfReceipt: {
        name: "FRA"
      },
      shipper: {
        name: "SEEMANN Y CIA LTDA"
      },
      consignee: {
        name: "SCANCONTROLS INGENIERIA LTDA"
      },
      issuingCompany: {
        name: "MUELLER-GYSIN LIMITED"
      },
      salesRep: {
        name: "Ignacio Maldonado"
      },
      commodities: [
        {
          commodityType: "Standard",
          packageType: {
            id: 97
          },
          pieces: 1,
          description: "Test Cargo - Claude Tester",
          weightPerUnitValue: 50,
          weightPerUnitUOM: "kg",
          totalWeightValue: 50,
          totalWeightUOM: "kg",
          lengthValue: 100,
          lengthUOM: "cm",
          widthValue: 80,
          widthUOM: "cm",
          heightValue: 60,
          heightUOM: "cm",
          volumeValue: 0.48,
          volumeUOM: "m3",
          totalVolumeValue: 0.48,
          totalVolumeUOM: "m3",
          volumeWeightValue: 80.16,
          volumeWeightUOM: "kg",
          totalVolumeWeightValue: 80.16,
          totalVolumeWeightUOM: "kg"
        }
      ],
      charges: [
        {
          service: {
            id: 168,
            code: "B"
          },
          income: {
            quantity: 1,
            unit: "BL",
            rate: 60,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: "SCANCONTROLS INGENIERIA LTDA"
            },
            currency: {
              abbr: "USD"
            },
            reference: "TEST-REF",
            showOnDocument: true,
            notes: "Charge created via API"
          },
          expense: {
            currency: {
              abbr: "USD"
            }
          }
        },
        {
          service: {
            id: 162,
            code: "H"
          },
          income: {
            quantity: 1,
            unit: "HL",
            rate: 45,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: "SCANCONTROLS INGENIERIA LTDA"
            },
            currency: {
              abbr: "USD"
            },
            reference: "TEST-REF-HANDLING",
            showOnDocument: true,
            notes: "Handling charge created via API"
          },
          expense: {
            currency: {
              abbr: "USD"
            }
          }
        },
        {
          service: {
            id: 271,
            code: "EC"
          },
          income: {
            quantity: 1,
            unit: "EXW CHARGES",
            rate: 150,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: "SCANCONTROLS INGENIERIA LTDA"
            },
            currency: {
              abbr: "USD"
            },
            reference: "TEST-REF-EXW",
            showOnDocument: true,
            notes: "EXW charge created via API"
          },
          expense: {
            currency: {
              abbr: "USD"
            }
          }
        },
        {
          service: {
            id: 335,
            code: "AWB"
          },
          income: {
            quantity: 1,
            unit: "AWB",
            rate: 12.024,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: "SCANCONTROLS INGENIERIA LTDA"
            },
            currency: {
              abbr: "USD"
            },
            reference: "TEST-REF-AWB",
            showOnDocument: true,
            notes: "AWB charge created via API"
          },
          expense: {
            currency: {
              abbr: "USD"
            }
          }
        },
        {
          service: {
            id: 4,
            code: "AF"
          },
          income: {
            quantity: 80.16,
            unit: "AIR FREIGHT",
            rate: 3.3925,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: "SCANCONTROLS INGENIERIA LTDA"
            },
            currency: {
              abbr: "USD"
            },
            reference: "TEST-REF-AIRFREIGHT",
            showOnDocument: true,
            notes: "AIR FREIGHT charge - Tarifa: EUR 2.95/kg + 15%"
          },
          expense: {
            quantity: 80.16,
            unit: "AIR FREIGHT",
            rate: 2.95,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: "SCANCONTROLS INGENIERIA LTDA"
            },
            currency: {
              abbr: "USD"
            },
            reference: "TEST-REF-AIRFREIGHT",
            showOnDocument: true,
            notes: "AIR FREIGHT expense - Tarifa: EUR 2.95/kg"
          }
        }
      ]
    };
  };

  const testAPI = async () => {
    if (!accessToken) {
      setError('No hay token de acceso disponible');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    const payload = getTestPayload();

    try {
      console.log('🚀 Enviando payload de prueba:', payload);
      
      const res = await fetch('https://api.linbis.com/Quotes/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Verificar si hay contenido en la respuesta
      const responseText = await res.text();
      
      if (!res.ok) {
        // Intentar parsear el error como JSON
        let errorData;
        try {
          errorData = responseText ? JSON.parse(responseText) : { message: 'No error details provided' };
        } catch {
          errorData = { message: responseText || 'Error sin detalles' };
        }
        console.error('❌ Error en la respuesta:', errorData);
        setError(`Error ${res.status}: ${JSON.stringify(errorData, null, 2)}`);
      } else {
        // Intentar parsear la respuesta exitosa como JSON
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : { message: 'Success - No data returned' };
        } catch {
          data = { message: 'Success', rawResponse: responseText };
        }
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
          <h2 className="mb-2">🧪 API Quote Tester - FCL</h2>
          <p className="text-muted">Prueba de creación de cotización FCL</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          {/* Selector de Package Type */}
          <div className="border rounded p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
            <h6 className="mb-3">Seleccionar Tipo de Contenedor</h6>
            
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Package Type</label>
                <select 
                  className="form-select" 
                  value={selectedPackageType}
                  onChange={(e) => setSelectedPackageType(Number(e.target.value))}
                >
                  {packageTypeOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mostrar el ID seleccionado */}
            <div className="mt-3 p-3 border rounded" style={{ backgroundColor: '#e7f5ff' }}>
              <small className="text-muted">
                <strong>ID seleccionado:</strong> {selectedPackageType} - {packageTypeOptions.find(opt => opt.id === selectedPackageType)?.name}
              </small>
            </div>
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
              <>Generar Cotización</>
            )}
          </button>

          {!accessToken && (
            <div className="alert alert-danger mt-3">
              âš ï¸ No hay token de acceso. AsegÃºrate de estar autenticado.
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
            {JSON.stringify(getTestPayload(), null, 2)}
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
              🎉 <strong>¡Perfecto!</strong> Cotización creada exitosamente.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteAPITester;