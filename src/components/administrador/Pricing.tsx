// src/components/administrador/Pricing.tsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Accordion, Button, Form, Spinner, Alert } from 'react-bootstrap';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

interface RouteForm {
  id: string;
  origin: string;
  destination: string;
  kg45: string;
  kg100: string;
  kg300: string;
  kg500: string;
  kg1000: string;
  carrier: string;
  frequency: string;
  transitTime: string;
  routing: string;
  remark1: string;
  remark2: string;
  currency: string;
}

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'CLP', 'SEK'];

function Pricing() {
  useOutletContext<OutletContext>();
  const { user } = useAuth();

  const [forms, setForms] = useState<RouteForm[]>([
    {
      id: '1',
      origin: '',
      destination: '',
      kg45: '',
      kg100: '',
      kg300: '',
      kg500: '',
      kg1000: '',
      carrier: '',
      frequency: '',
      transitTime: '',
      routing: '',
      remark1: '',
      remark2: '',
      currency: 'USD'
    }
  ]);

  const [activeKey, setActiveKey] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addNewForm = () => {
    const newForm: RouteForm = {
      id: Date.now().toString(),
      origin: '',
      destination: '',
      kg45: '',
      kg100: '',
      kg300: '',
      kg500: '',
      kg1000: '',
      carrier: '',
      frequency: '',
      transitTime: '',
      routing: '',
      remark1: '',
      remark2: '',
      currency: 'USD'
    };
    setForms([...forms, newForm]);
    setActiveKey(forms.length.toString());
  };

  const removeForm = (id: string) => {
    if (forms.length === 1) {
      alert('Debes mantener al menos un formulario');
      return;
    }
    setForms(forms.filter(f => f.id !== id));
  };

  const updateForm = (id: string, field: keyof RouteForm, value: string) => {
    setForms(forms.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const validateForm = (form: RouteForm): string | null => {
    if (!form.origin.trim()) return 'El campo "Origen" es obligatorio';
    if (!form.destination.trim()) return 'El campo "Destino" es obligatorio';
    if (!form.kg45.trim()) return 'El campo "Tarifa 45kg" es obligatorio';
    if (!form.kg100.trim()) return 'El campo "Tarifa 100kg" es obligatorio';
    if (!form.kg300.trim()) return 'El campo "Tarifa 300kg" es obligatorio';
    if (!form.kg500.trim()) return 'El campo "Tarifa 500kg" es obligatorio';
    if (!form.kg1000.trim()) return 'El campo "Tarifa 1000kg" es obligatorio';
    if (!form.carrier.trim()) return 'El campo "Carrier" es obligatorio';
    if (!form.frequency.trim()) return 'El campo "Frecuencia" es obligatorio';
    if (!form.transitTime.trim()) return 'El campo "Transit Time" es obligatorio';
    if (!form.routing.trim()) return 'El campo "Routing" es obligatorio';
    if (!form.remark1.trim()) return 'El campo "Remark 1" es obligatorio';
    if (!form.remark2.trim()) return 'El campo "Remark 2" es obligatorio';
    if (!form.currency.trim()) return 'El campo "Moneda" es obligatorio';
    return null;
  };

    const handleSubmitAll = async () => {
    try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Validar todos los formularios
        for (let i = 0; i < forms.length; i++) {
        const validationError = validateForm(forms[i]);
        if (validationError) {
            setError(`Formulario ${i + 1}: ${validationError}`);
            setLoading(false);
            return;
        }
        }

        // Obtener el token del localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) {
        setError('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
        setLoading(false);
        return;
        }

        // Enviar todos los formularios
        const promises = forms.map(async (form) => {
        const values = [
            '', // Columna 0 vacía
            form.origin,
            form.destination,
            form.kg45,
            form.kg100,
            form.kg300,
            form.kg500,
            form.kg1000,
            form.carrier,
            form.frequency,
            form.transitTime,
            form.routing,
            form.remark1,
            form.remark2,
            form.currency
        ];

        // ✅ CORREGIDO: Llamar a localhost:4000 (backend), no a 5173 (frontend)
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
        const response = await fetch(`${apiBaseUrl}/api/google-sheets/append`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // ✅ Enviar el token correctamente
            },
            body: JSON.stringify({ values })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return response.json();
        });

        const results = await Promise.all(promises);

        setSuccess(`✅ ${forms.length} ruta${forms.length > 1 ? 's' : ''} agregada${forms.length > 1 ? 's' : ''} exitosamente al Google Sheet`);
        
        // Limpiar formularios después de 2 segundos
        setTimeout(() => {
        setForms([{
            id: Date.now().toString(),
            origin: '',
            destination: '',
            kg45: '',
            kg100: '',
            kg300: '',
            kg500: '',
            kg1000: '',
            carrier: '',
            frequency: '',
            transitTime: '',
            routing: '',
            remark1: '',
            remark2: '',
            currency: 'USD'
        }]);
        setActiveKey('0');
        setSuccess(null);
        }, 2000);

    } catch (err) {
        console.error('Error al enviar rutas:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Error al enviar las rutas: ${errorMessage}`);
    } finally {
        setLoading(false);
    }
    };

  return (
    <div className="container-fluid">
      {/* Header con Logo */}
      <div className="row mb-4 align-items-center">
        <div className="col-auto">
          <img 
            src="/logocompleto.png" 
            alt="Seemann Group Logo" 
            style={{ height: '60px', objectFit: 'contain' }}
          />
        </div>
        <div className="col">
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Gestión de Tarifas Aéreas
          </h2>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            margin: 0
          }}>
            Agregar nuevas rutas al sistema de cotización - {user?.username}
          </p>
        </div>
      </div>

      {/* Mensajes de éxito/error */}
      {success && (
        <Alert variant="success" className="mb-4" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Card Principal */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '24px'
      }}>
        {/* Accordion de Formularios */}
        <Accordion activeKey={activeKey} onSelect={(key) => setActiveKey(key as string)}>
          {forms.map((form, index) => (
            <Accordion.Item eventKey={index.toString()} key={form.id} className="mb-3">
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                  <span>
                    <strong>Ruta #{index + 1}</strong>
                    {form.origin && form.destination && (
                      <span className="ms-2 text-muted">
                        ({form.origin} → {form.destination})
                      </span>
                    )}
                  </span>
                </div>
              </Accordion.Header>
              <Accordion.Body>
                {/* Botón de eliminar en la esquina */}
                <div className="d-flex justify-content-end mb-3">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeForm(form.id)}
                    disabled={forms.length === 1}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Eliminar Formulario
                  </Button>
                </div>

                <Form>
                  {/* Sección: Información Básica */}
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">📍 Información Básica</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <Form.Group>
                          <Form.Label>Origen *</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.origin}
                            onChange={(e) => updateForm(form.id, 'origin', e.target.value)}
                            placeholder="Ej: Santiago"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-6">
                        <Form.Group>
                          <Form.Label>Destino *</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.destination}
                            onChange={(e) => updateForm(form.id, 'destination', e.target.value)}
                            placeholder="Ej: New York"
                            required
                          />
                        </Form.Group>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Tarifas por Peso */}
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">💰 Tarifas por Peso (solo números)</h6>
                    <div className="row g-3">
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>45kg *</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg45}
                            onChange={(e) => updateForm(form.id, 'kg45', e.target.value)}
                            placeholder="5.50"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>100kg *</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg100}
                            onChange={(e) => updateForm(form.id, 'kg100', e.target.value)}
                            placeholder="5.00"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>300kg *</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg300}
                            onChange={(e) => updateForm(form.id, 'kg300', e.target.value)}
                            placeholder="4.80"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>500kg *</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg500}
                            onChange={(e) => updateForm(form.id, 'kg500', e.target.value)}
                            placeholder="4.50"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>1000kg *</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg1000}
                            onChange={(e) => updateForm(form.id, 'kg1000', e.target.value)}
                            placeholder="4.00"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>Moneda *</Form.Label>
                          <Form.Select
                            value={form.currency}
                            onChange={(e) => updateForm(form.id, 'currency', e.target.value)}
                            required
                          >
                            {CURRENCY_OPTIONS.map(curr => (
                              <option key={curr} value={curr}>{curr}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Detalles del Servicio */}
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">✈️ Detalles del Servicio</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Carrier *</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.carrier}
                            onChange={(e) => updateForm(form.id, 'carrier', e.target.value)}
                            placeholder="Ej: Lufthansa"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Frecuencia *</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.frequency}
                            onChange={(e) => updateForm(form.id, 'frequency', e.target.value)}
                            placeholder="Ej: Daily, 3x/week"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Transit Time *</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.transitTime}
                            onChange={(e) => updateForm(form.id, 'transitTime', e.target.value)}
                            placeholder="Ej: 2-3 días"
                            required
                          />
                        </Form.Group>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Información Adicional */}
                  <div className="mb-3">
                    <h6 className="text-muted mb-3">📝 Información Adicional</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Routing *</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.routing}
                            onChange={(e) => updateForm(form.id, 'routing', e.target.value)}
                            placeholder="Ej: Direct, Via MIA"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Remark 1 *</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.remark1}
                            onChange={(e) => updateForm(form.id, 'remark1', e.target.value)}
                            placeholder="Observación 1"
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Remark 2 *</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.remark2}
                            onChange={(e) => updateForm(form.id, 'remark2', e.target.value)}
                            placeholder="Observación 2"
                            required
                          />
                        </Form.Group>
                      </div>
                    </div>
                  </div>
                </Form>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>

        {/* Botones de Acción */}
        <div className="d-flex justify-content-between mt-4">
          <Button
            variant="outline-primary"
            onClick={addNewForm}
            disabled={loading}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Agregar Otra Ruta
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmitAll}
            disabled={loading || forms.length === 0}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Enviando {forms.length} ruta{forms.length > 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-upload me-2"></i>
                Enviar {forms.length} Ruta{forms.length > 1 ? 's' : ''} a Google Sheets
              </>
            )}
          </Button>
        </div>

        {/* Info adicional */}
        <div className="mt-4 pt-3 border-top">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Todos los campos marcados con * son obligatorios. Las rutas se agregarán directamente al Google Sheet configurado.
          </small>
        </div>
      </div>
    </div>
  );
}

export default Pricing;