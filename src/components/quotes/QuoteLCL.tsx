import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";

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

  // Estados para validaciones
  const [weightError, setWeightError] = useState<string | null>(null);
  const [dimensionError, setDimensionError] = useState<string | null>(null);

  // Estados para el commodity
  const [overallDimsAndWeight, setOverallDimsAndWeight] = useState(false);
  const [pieces, setPieces] = useState(1);
  const [description, setDescription] = useState("Test Cargo - Claude Tester");
  const [length, setLength] = useState(100); // cm
  const [width, setWidth] = useState(80); // cm
  const [height, setHeight] = useState(60); // cm
  const [weight, setWeight] = useState(50); // kg
  const [manualVolume, setManualVolume] = useState(0.48); // m³ (para cuando overall está activo)
  const [manualWeight, setManualWeight] = useState(100); // kg (para cuando overall está activo)
  const [selectedPackageType, setSelectedPackageType] = useState(97); // Por defecto 

  const packageTypeOptions = [
    { id: 97, name: "BOX" },
    { id: 57, name: "CARTON" }
  ];

  // Cálculos automáticos
  const calculateVolume = () => {
    // Volumen en m³ = (length × width × height) / 1,000,000
    return (length * width * height) / 1000000;
  };

  const calculateVolumeWeight = () => {
    // Peso volumétrico = volumen (m³) × 167 kg/m³ (factor estándar aéreo)
    return calculateVolume() * 167;
  };

  const volume = calculateVolume();
  const volumeWeight = calculateVolumeWeight();
  const totalVolume = volume * pieces;
  const totalWeight = weight * pieces;
  const totalVolumeWeight = volumeWeight * pieces;

  // Función para calcular el rate de EXW según el peso chargeable (mayor entre peso real y volumétrico)
  const calculateEXWRate = (weightKg: number, volumeWeightKg: number) => {
    // Usar el mayor entre peso real y peso volumétrico
    const chargeableWeight = Math.max(weightKg, volumeWeightKg);
    
    let ratePerKg = 0;
    
    // Determinar el rate por kg según el rango de peso
    if (chargeableWeight >= 1000) {
      ratePerKg = 0.6;
    } else if (chargeableWeight >= 500) {
      ratePerKg = 0.65;
    } else if (chargeableWeight >= 250) {
      ratePerKg = 0.75;
    } else {
      // 0-250KG (incluyendo 100-250 y 0-100)
      ratePerKg = 0.8;
    }
    
    // Calcular el rate total
    const calculatedRate = chargeableWeight * ratePerKg;
    
    // Aplicar el mínimo de US$150
    return Math.max(calculatedRate, 150);
  };

  // Función para calcular el rate de AWB (US$0.15 por kg chargeable)
  const calculateAWBRate = (weightKg: number, volumeWeightKg: number) => {
    // Usar el mayor entre peso real y peso volumétrico
    const chargeableWeight = Math.max(weightKg, volumeWeightKg);
    
    // AWB es US$0.15 por kg
    return chargeableWeight * 0.15;
  };

  const getTestPayload = () => {
    // MODO NORMAL - Con dimensiones
    if (!overallDimsAndWeight) {
      return {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        customerReference: "TEST-REF-CLAUDE",
        contact: {
            name: user?.username
        },
        origin: {
            name: "PUERTO DE SHANGHAI"
        },
        destination: {
            name: "SAN ANTONIO"
        },
        modeOfTransportation: {
            id: 1
        },
        rateCategoryId: 2,
        portOfReceipt: {
            name: "PUERTO DE SHANGHAI"
        },
        shipper: {
            name: "SEEMANN Y CIA LTDA"
        },
        consignee: {
            name: user?.username
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
                  id: selectedPackageType
                },
                pieces: pieces,
                description: description,
                weightPerUnitValue: weight,
                weightPerUnitUOM: "kg",
                totalWeightValue: totalWeight,
                totalWeightUOM: "kg",
                lengthValue: length,
                lengthUOM: "cm",
                widthValue: width,
                widthUOM: "cm",
                heightValue: height,
                heightUOM: "cm",
                volumeValue: volume,
                volumeUOM: "m3",
                totalVolumeValue: totalVolume,
                totalVolumeUOM: "m3",
                volumeWeightValue: volumeWeight,
                volumeWeightUOM: "kg",
                totalVolumeWeightValue: totalVolumeWeight,
                totalVolumeWeightUOM: "kg"
            }
        ],
        charges: [
          // Cobro de BL en MODO NORMAL
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
                name: user?.username
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
          // Cobro de Handling en MODO NORMAL
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
                name: user?.username
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
          // Cobro de EXW en MODO NORMAL
          {
            service: {
              id: 271,
              code: "EC"
            },
            income: {
              quantity: 1,
              unit: "EXW CHARGES",
              rate: calculateEXWRate(totalWeight, totalVolumeWeight),
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: user?.username
              },
              currency: {
                abbr: "USD"
              },
              reference: "TEST-REF-HANDLING",
              showOnDocument: true,
              notes: "EXW CHARGES charge created via API"
            },
            expense: {
              currency: {
                abbr: "USD"
              }
            }
          },
          // Cobro de AWB en MODO NORMAL
          {
            service: {
              id: 10,
              code: "AWB"
            },
            income: {
              quantity: 1,
              unit: "AIRWAY BILL FEE",
              rate: calculateAWBRate(totalWeight, totalVolumeWeight),
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: user?.username
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
          }
      ]
      };
    }
    
    // MODO OVERALL - Sin dimensiones ni peso volumétrico
    return {
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      transitDays: 5,
      customerReference: "TEST-REF-CLAUDE",
      contact: {
          name: "SCANCONTROLS INGENIERIA LTDA"
      },
      origin: {
          name: "PUERTO DE SHANGHAI"
      },
      destination: {
          name: "SAN ANTONIO"
      },
      modeOfTransportation: {
          id: 1
      },
      rateCategoryId: 2,
      portOfReceipt: {
          name: "PUERTO DE SHANGHAI"
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
                  id: selectedPackageType
                },
              pieces: pieces,
              description: description,
              weightPerUnitValue: manualWeight,
              weightPerUnitUOM: "kg",
              totalWeightValue: manualWeight,
              totalWeightUOM: "kg",
              volumeValue: manualVolume,
              volumeUOM: "m3",
              totalVolumeValue: manualVolume,
              totalVolumeUOM: "m3"
          }
      ],
      charges: [
        // Cobro de BL en MODO OVERALL
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
                name: user?.username
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
          // Cobro de Handling en MODO OVERALL
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
                name: user?.username
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
          // Cobro de EXW en MODO OVERALL
          {
            service: {
              id: 271,
              code: "EC"
            },
            income: {
              quantity: 1,
              unit: "EXW CHARGES",
              rate: calculateEXWRate(manualWeight, manualVolume * 167),
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: user?.username
              },
              currency: {
                abbr: "USD"
              },
              reference: "TEST-REF-HANDLING",
              showOnDocument: true,
              notes: "EXW CHARGES charge created via API"
            },
            expense: {
              currency: {
                abbr: "USD"
              }
            }
          },
          // Cobro de AWB en MODO OVERALL
          {
            service: {
              id: 10,
              code: "AWB"
            },
            income: {
              quantity: 1,
              unit: "AIRWAY BILL FEE",
              rate: calculateAWBRate(manualWeight, manualVolume * 167),
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: user?.username
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
      
      const res = await fetch('https://api.linbis.com/Quotes/create', {
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
          <h2 className="mb-2">🧪 API Quote Tester - LCL</h2>
          <p className="text-muted">Prueba de creación de cotización LCL</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          {/* Formulario de Commodity */}
          <div className="border rounded p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
            <h6 className="mb-3">📦 Datos del Commodity</h6>
            
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Piezas</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={pieces}
                  onChange={(e) => {
                    const newPieces = Number(e.target.value);
                    setPieces(newPieces);
                    // Validar peso total
                    if (!overallDimsAndWeight) {
                      const newTotalWeight = weight * newPieces;
                      if (newTotalWeight > 2000) {
                        setWeightError('El peso total no puede exceder 2000 kg');
                      } else {
                        setWeightError(null);
                      }
                    }
                  }}
                  min="1"
                />
              </div>
              
              <div className="col-md-6">
                <label className="form-label">Descripción</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

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

              {/* Checkbox Overall Dims and Weight */}
              <div className="col-12">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="overallDimsCheck"
                    checked={overallDimsAndWeight}
                    onChange={(e) => setOverallDimsAndWeight(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="overallDimsCheck">
                    <strong>Overall Dims and Weight</strong> (ingresar peso y volumen totales directamente)
                  </label>
                </div>
              </div>

              {/* Campos de dimensiones - Solo visibles cuando Overall está DESACTIVADO */}
              {!overallDimsAndWeight && (
                <>
                  <div className="col-md-3">
                    <label className="form-label">Largo (cm)</label>
                    <input 
                      type="number" 
                      className={`form-control ${dimensionError && dimensionError.includes('Largo') ? 'is-invalid' : ''}`}
                      value={length}
                      onChange={(e) => {
                        const newLength = Number(e.target.value);
                        setLength(newLength);
                        if (newLength > 290) {
                          setDimensionError('El largo no puede exceder 290 cm');
                        } else if (width > 290 || height > 160) {
                          // Mantener error si hay otros problemas
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('largo') && (
                      <div className="invalid-feedback">{dimensionError}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Ancho (cm)</label>
                    <input 
                      type="number" 
                      className={`form-control ${dimensionError && dimensionError.includes('Ancho') ? 'is-invalid' : ''}`}
                      value={width}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setWidth(newWidth);
                        if (newWidth > 290) {
                          setDimensionError('El ancho no puede exceder 290 cm');
                        } else if (length > 290 || height > 160) {
                          // Mantener error si hay otros problemas
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('ancho') && (
                      <div className="invalid-feedback">{dimensionError}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Alto (cm)</label>
                    <input 
                      type="number" 
                      className={`form-control ${dimensionError && dimensionError.includes('Alto') ? 'is-invalid' : ''}`}
                      value={height}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        setHeight(newHeight);
                        if (newHeight > 160) {
                          setDimensionError('El alto no puede exceder 160 cm');
                        } else if (length > 290 || width > 290) {
                          // Mantener error si hay otros problemas
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('alto') && (
                      <div className="invalid-feedback">{dimensionError}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Peso por pieza (kg)</label>
                    <input 
                      type="number" 
                      className={`form-control ${weightError ? 'is-invalid' : ''}`}
                      value={weight}
                      onChange={(e) => {
                        const newWeight = Number(e.target.value);
                        setWeight(newWeight);
                        const newTotalWeight = newWeight * pieces;
                        if (newTotalWeight > 2000) {
                          setWeightError('El peso total no puede exceder 2000 kg');
                        } else {
                          setWeightError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {weightError && <div className="invalid-feedback">{weightError}</div>}
                  </div>
                </>
              )}

              {/* Campos cuando Overall está ACTIVADO */}
              {overallDimsAndWeight && (
                <>
                  <div className="col-md-6">
                    <label className="form-label">Peso Total (kg)</label>
                    <input 
                      type="number" 
                      className={`form-control ${weightError ? 'is-invalid' : ''}`}
                      value={manualWeight}
                      onChange={(e) => {
                        const newManualWeight = Number(e.target.value);
                        setManualWeight(newManualWeight);
                        if (newManualWeight > 2000) {
                          setWeightError('El peso total no puede exceder 2000 kg');
                        } else {
                          setWeightError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    <small className="text-muted">Este es el peso total de todas las piezas</small>
                    {weightError && <div className="invalid-feedback">{weightError}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Volumen Total (m³)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={manualVolume}
                      onChange={(e) => setManualVolume(Number(e.target.value))}
                      min="0"
                      step="0.0001"
                    />
                    <small className="text-muted">Este es el volumen total de todas las piezas</small>
                  </div>
                </>
              )}
            </div>

            {/* Cálculos Automáticos */}
            <div className="mt-3 p-3 border rounded" style={{ backgroundColor: '#e7f5ff' }}>
              <h6 className="mb-2">🧮 Cálculos {overallDimsAndWeight ? '(Modo Overall)' : '(Modo Normal)'}</h6>
              <div className="row g-2" style={{ fontSize: '0.9rem' }}>
                {!overallDimsAndWeight ? (
                  <>
                    <div className="col-md-6">
                      <strong>Volumen por pieza:</strong> {volume.toFixed(4)} m³
                    </div>
                    <div className="col-md-6">
                      <strong>Peso volumétrico por pieza:</strong> {volumeWeight.toFixed(2)} kg
                    </div>
                    <div className="col-md-6">
                      <strong>Volumen total:</strong> {totalVolume.toFixed(4)} m³
                    </div>
                    <div className="col-md-6">
                      <strong>Peso total:</strong> {totalWeight.toFixed(2)} kg
                    </div>
                    <div className="col-12">
                      <strong>Peso volumétrico total:</strong> {totalVolumeWeight.toFixed(2)} kg
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-md-6">
                      <strong>Volumen total:</strong> {manualVolume.toFixed(4)} m³
                    </div>
                    <div className="col-md-6">
                      <strong>Peso total:</strong> {manualWeight.toFixed(2)} kg
                    </div>
                    <div className="col-12 mt-2">
                      <small className="text-muted">
                        ℹ️ En modo Overall no se calcula el peso volumétrico - usas tus propios valores
                      </small>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={testAPI}
            disabled={loading || !accessToken || weightError !== null || dimensionError !== null}
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

          {(weightError || dimensionError) && (
            <div className="alert alert-warning mt-3">
              ⚠️ <strong>Corrección necesaria:</strong> {weightError || dimensionError}
            </div>
          )}

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