// src/components/administrador/Pricing.tsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import { Accordion, Button, Form, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { AirportAutocomplete } from '../Utils/Airportautocomplete';

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

const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYYU3sdPvU5svUgCWMovXMu4AeDpqvcpqTTjpiZoYTGQQbWsfDqSnt-SgKV2sEHXMz/exec';

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'CLP', 'SEK'];

function Pricing() {
  const { accessToken } = useOutletContext<OutletContext>();
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

  // Estados para la tabla de datos existentes
  const [existingRoutes, setExistingRoutes] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(30);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  
  // Estados para edición de celda individual (doble clic)
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [cellValue, setCellValue] = useState<string>('');

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

      // Enviar todos los formularios usando un iframe oculto (evita CORS)
      for (const form of forms) {
        await sendFormViaIframe(form);
      }

      setSuccess(`✅ ${forms.length} ruta${forms.length > 1 ? 's' : ''} agregada${forms.length > 1 ? 's' : ''} exitosamente al Google Sheet`);
      
      // Refrescar la tabla de rutas
      await fetchRoutes();
      
      // Ir a la última página para ver las rutas recién agregadas
      setTimeout(() => {
        const newTotalPages = Math.ceil(existingRoutes.length / rowsPerPage);
        setCurrentPage(newTotalPages);
      }, 100);
      
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
      setError('Error al enviar las rutas. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para enviar datos via iframe (evita CORS)
  const sendFormViaIframe = (form: RouteForm): Promise<void> => {
    return new Promise((resolve) => {
      // Crear un formulario HTML temporal
      const hiddenForm = document.createElement('form');
      hiddenForm.method = 'POST';
      hiddenForm.action = GOOGLE_APPS_SCRIPT_URL;
      hiddenForm.target = 'hidden-iframe-' + form.id;
      hiddenForm.style.display = 'none';

      // Crear campos para cada valor
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

      // Crear input con JSON
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'data';
      input.value = JSON.stringify({ values });
      hiddenForm.appendChild(input);

      // Crear iframe oculto
      const iframe = document.createElement('iframe');
      iframe.name = 'hidden-iframe-' + form.id;
      iframe.style.display = 'none';
      
      // Resolver después de 1 segundo (tiempo suficiente para enviar)
      iframe.onload = () => {
        setTimeout(() => {
          document.body.removeChild(hiddenForm);
          document.body.removeChild(iframe);
          resolve();
        }, 500);
      };

      // Agregar al DOM
      document.body.appendChild(iframe);
      document.body.appendChild(hiddenForm);

      // Enviar
      hiddenForm.submit();
    });
  };

  // Función para obtener todas las rutas
  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL + '?action=getAll');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Mantener orden original (más antiguas primero, nuevas al final)
        setExistingRoutes(data.data);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error('Error al cargar rutas:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Cargar rutas al montar el componente
  useEffect(() => {
    fetchRoutes();
  }, []);

  // Función para eliminar una ruta
  const deleteRoute = async (rowIndex: number) => {
    if (!window.confirm('¿Estás seguro de eliminar esta ruta?')) {
      return;
    }

    try {
      setLoadingRoutes(true);
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL + `?action=delete&row=${rowIndex}`);
      const data = await response.json();
      
      if (data.success) {
        setSuccess('✅ Ruta eliminada exitosamente');
        fetchRoutes();
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      console.error('Error al eliminar ruta:', err);
      setError('Error al eliminar la ruta');
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Función para iniciar edición
  const startEdit = (route: any, index: number) => {
    setEditingRow(index);
    setEditForm({
      origin: route[1],
      destination: route[2],
      kg45: route[3],
      kg100: route[4],
      kg300: route[5],
      kg500: route[6],
      kg1000: route[7],
      carrier: route[8],
      frequency: route[9],
      transitTime: route[10],
      routing: route[11],
      remark1: route[12],
      remark2: route[13],
      currency: route[14]
    });
  };

  // Función para guardar edición
  const saveEdit = async (rowIndex: number) => {
    try {
      setLoadingRoutes(true);
      
      const values = [
        '',
        editForm.origin,
        editForm.destination,
        editForm.kg45,
        editForm.kg100,
        editForm.kg300,
        editForm.kg500,
        editForm.kg1000,
        editForm.carrier,
        editForm.frequency,
        editForm.transitTime,
        editForm.routing,
        editForm.remark1,
        editForm.remark2,
        editForm.currency
      ];

      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL + `?action=update&row=${rowIndex}`,
        {
          method: 'POST',
          body: JSON.stringify({ values })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('✅ Ruta actualizada exitosamente');
        setEditingRow(null);
        setEditForm(null);
        fetchRoutes();
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      console.error('Error al actualizar ruta:', err);
      setError('Error al actualizar la ruta');
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Función para cancelar edición
  const cancelEdit = () => {
    setEditingRow(null);
    setEditForm(null);
  };

  // ============================================================================
  // FUNCIONES PARA EDICIÓN DE CELDA INDIVIDUAL (DOBLE CLIC)
  // ============================================================================

  // Iniciar edición de celda individual con doble clic
  const handleCellDoubleClick = (rowIndex: number, colIndex: number, currentValue: any) => {
    // No permitir editar si ya hay una fila en modo edición completa
    if (editingRow !== null) return;
    
    setEditingCell({ row: rowIndex, col: colIndex });
    setCellValue(currentValue || '');
  };

  // Guardar cambio de celda individual
  const saveCellEdit = async (rowIndex: number, colIndex: number) => {
    try {
      setLoadingRoutes(true);
      
      // Obtener la fila completa actual
      const actualRowIndex = rowIndex + 3; // +3 por las filas de headers
      const currentRoute = existingRoutes[rowIndex];
      
      // Crear copia de la fila y actualizar solo la celda modificada
      const updatedRow = [...currentRoute];
      updatedRow[colIndex] = cellValue;
      
      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL + `?action=update&row=${actualRowIndex}`,
        {
          method: 'POST',
          body: JSON.stringify({ values: updatedRow })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('✅ Celda actualizada exitosamente');
        setEditingCell(null);
        setCellValue('');
        fetchRoutes();
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      console.error('Error al actualizar celda:', err);
      setError('Error al actualizar la celda');
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Cancelar edición de celda
  const cancelCellEdit = () => {
    setEditingCell(null);
    setCellValue('');
  };

  // Manejar teclas en edición de celda (Enter = guardar, Escape = cancelar)
  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      saveCellEdit(rowIndex, colIndex);
    } else if (e.key === 'Escape') {
      cancelCellEdit();
    }
  };

  // Filtrado (sin ordenamiento)
  const filteredRoutes = existingRoutes.filter(route => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return route.some((cell: any) => 
      cell && cell.toString().toLowerCase().includes(searchLower)
    );
  });

  // Paginación
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredRoutes.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredRoutes.length / rowsPerPage);

  return (
    <>
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

      {/* Accordion de Formularios */}
      <div className="pricing-forms-section">
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
                    <h6 className="text-muted mb-3">Información Básica</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <label className="form-label mb-0">Origen</label>
                          <OverlayTrigger
                            placement="right"
                            overlay={
                              <Tooltip id="tooltip-origen">
                                Si conoces el code IATA, ingresalo, de manera contraria, escribe el origen de manera Ciudad (País)
                              </Tooltip>
                            }
                          >
                            <i className="bi bi-info-circle" style={{
                              color: '#ff0000',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}></i>
                          </OverlayTrigger>
                        </div>
                        <AirportAutocomplete
                          label=""
                          value={form.origin}
                          onChange={(value) => updateForm(form.id, 'origin', value)}
                          placeholder="Ej: MIA, SCL, LHR"
                        />
                      </div>

                      <div className="col-md-6">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <label className="form-label mb-0">Destino</label>
                          <OverlayTrigger
                            placement="right"
                            overlay={
                              <Tooltip id="tooltip-destino">
                                Si conoces el code IATA, ingresalo, de manera contraria, escribe el destino de manera Ciudad (País)
                              </Tooltip>
                            }
                          >
                            <i className="bi bi-info-circle" style={{
                              color: '#ff0000',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}></i>
                          </OverlayTrigger>
                        </div>
                        <AirportAutocomplete
                          label=""
                          value={form.destination}
                          onChange={(value) => updateForm(form.id, 'destination', value)}
                          placeholder="Ej: MIA, SCL, LHR"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección: Tarifas por Peso */}
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">Tarifas por Peso (solo números)</h6>
                    <div className="row g-3">
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>1-99kg</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg45}
                            onChange={(e) => updateForm(form.id, 'kg45', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>100-299kg</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg100}
                            onChange={(e) => updateForm(form.id, 'kg100', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>300-499kg</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg300}
                            onChange={(e) => updateForm(form.id, 'kg300', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>500-999kg</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg500}
                            onChange={(e) => updateForm(form.id, 'kg500', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>+1000kg</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.kg1000}
                            onChange={(e) => updateForm(form.id, 'kg1000', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-2">
                        <Form.Group>
                          <Form.Label>Moneda</Form.Label>
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
                    <h6 className="text-muted mb-3">Detalles del Servicio</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Carrier</Form.Label>
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
                          <Form.Label>Frecuencia</Form.Label>
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
                          <Form.Label>Transit Time</Form.Label>
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
                    <h6 className="text-muted mb-3">Información Adicional</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Routing</Form.Label>
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
                          <Form.Label>Remark 1</Form.Label>
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
                          <Form.Label>Mínimo</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.remark2}
                            onChange={(e) => updateForm(form.id, 'remark2', e.target.value)}
                            placeholder="Mínimo de cargo"
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
                Enviar {forms.length} Ruta{forms.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>

        {/* Info adicional */}
        <div className="mt-4 pt-3 border-top">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Todos los campos son obligatorios. Las rutas se agregarán directamente al Pricing.
          </small>
        </div>
        <div className="mt-2">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Los valores agregados aparecerán al final de la tabla de rutas existentes.
          </small>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN: TABLA DE RUTAS EXISTENTES */}
      {/* ============================================================================ */}

      <div className="pricing-routes-section">
        {/* Header de la tabla */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="mb-1">
            Rutas Aéreas Actuales 
            </h5>
            <small className="text-muted">
              {lastFetch && `Última actualización: ${lastFetch.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`}
            </small>
          </div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={fetchRoutes}
            disabled={loadingRoutes}
          >
            {loadingRoutes ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Actualizando...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refrescar Datos
              </>
            )}
          </Button>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-3">
          <Form.Control
            type="text"
            placeholder="🔍 Buscar en todas las columnas..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Tabla */}
        {loadingRoutes && existingRoutes.length === 0 ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Cargando datos...</p>
          </div>
        ) : existingRoutes.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted">No hay rutas registradas aún</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover table-sm" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }}>Acciones</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>45kg</th>
                    <th>100kg</th>
                    <th>300kg</th>
                    <th>500kg</th>
                    <th>1000kg</th>
                    <th>Carrier</th>
                    <th>Frecuencia</th>
                    <th>TT</th>
                    <th>Routing</th>
                    <th>Remark1</th>
                    <th>Mínimo</th>
                    <th>Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((route, index) => {
                    const actualIndex = indexOfFirstRow + index;
                    const isEditing = editingRow === actualIndex;
                    
                    return (
                      <tr key={actualIndex}>
                        <td>
                          {isEditing ? (
                            <div className="d-flex gap-1">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => saveEdit(actualIndex + 3)}
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              >
                                <i className="bi bi-check"></i>
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={cancelEdit}
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              >
                                <i className="bi bi-x"></i>
                              </Button>
                            </div>
                          ) : (
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => startEdit(route, actualIndex)}
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => deleteRoute(actualIndex + 3)}
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          )}
                        </td>
                        {isEditing ? (
                          <>
                            <td><Form.Control size="sm" value={editForm.origin} onChange={(e) => setEditForm({...editForm, origin: e.target.value})} /></td>
                            <td><Form.Control size="sm" value={editForm.destination} onChange={(e) => setEditForm({...editForm, destination: e.target.value})} /></td>
                            <td><Form.Control size="sm" type="number" step="0.01" value={editForm.kg45} onChange={(e) => setEditForm({...editForm, kg45: e.target.value})} /></td>
                            <td><Form.Control size="sm" type="number" step="0.01" value={editForm.kg100} onChange={(e) => setEditForm({...editForm, kg100: e.target.value})} /></td>
                            <td><Form.Control size="sm" type="number" step="0.01" value={editForm.kg300} onChange={(e) => setEditForm({...editForm, kg300: e.target.value})} /></td>
                            <td><Form.Control size="sm" type="number" step="0.01" value={editForm.kg500} onChange={(e) => setEditForm({...editForm, kg500: e.target.value})} /></td>
                            <td><Form.Control size="sm" type="number" step="0.01" value={editForm.kg1000} onChange={(e) => setEditForm({...editForm, kg1000: e.target.value})} /></td>
                            <td><Form.Control size="sm" value={editForm.carrier} onChange={(e) => setEditForm({...editForm, carrier: e.target.value})} /></td>
                            <td><Form.Control size="sm" value={editForm.frequency} onChange={(e) => setEditForm({...editForm, frequency: e.target.value})} /></td>
                            <td><Form.Control size="sm" value={editForm.transitTime} onChange={(e) => setEditForm({...editForm, transitTime: e.target.value})} /></td>
                            <td><Form.Control size="sm" value={editForm.routing} onChange={(e) => setEditForm({...editForm, routing: e.target.value})} /></td>
                            <td><Form.Control size="sm" value={editForm.remark1} onChange={(e) => setEditForm({...editForm, remark1: e.target.value})} /></td>
                            <td><Form.Control size="sm" value={editForm.remark2} onChange={(e) => setEditForm({...editForm, remark2: e.target.value})} /></td>
                            <td>
                              <Form.Select size="sm" value={editForm.currency} onChange={(e) => setEditForm({...editForm, currency: e.target.value})}>
                                {CURRENCY_OPTIONS.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                              </Form.Select>
                            </td>
                          </>
                        ) : (
                          <>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((colIndex) => {
                              const isEditingThisCell = editingCell?.row === actualIndex && editingCell?.col === colIndex;
                              
                              return (
                                <td 
                                  key={colIndex}
                                  onDoubleClick={() => handleCellDoubleClick(actualIndex, colIndex, route[colIndex])}
                                  style={{ 
                                    cursor: 'pointer',
                                    position: 'relative'
                                  }}
                                  title="Doble clic para editar"
                                >
                                  {isEditingThisCell ? (
                                    <Form.Control
                                      size="sm"
                                      type={[3, 4, 5, 6, 7].includes(colIndex) ? 'number' : 'text'}
                                      step={[3, 4, 5, 6, 7].includes(colIndex) ? '0.01' : undefined}
                                      value={cellValue}
                                      onChange={(e) => setCellValue(e.target.value)}
                                      onKeyDown={(e) => handleCellKeyDown(e, actualIndex, colIndex)}
                                      onBlur={() => saveCellEdit(actualIndex, colIndex)}
                                      autoFocus
                                      style={{ minWidth: '80px' }}
                                    />
                                  ) : (
                                    <span>{route[colIndex]}</span>
                                  )}
                                </td>
                              );
                            })}
                            <td>
                              {editingCell?.row === actualIndex && editingCell?.col === 14 ? (
                                <Form.Select
                                  size="sm"
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onKeyDown={(e) => handleCellKeyDown(e, actualIndex, 14)}
                                  onBlur={() => saveCellEdit(actualIndex, 14)}
                                  autoFocus
                                >
                                  {CURRENCY_OPTIONS.map(curr => (
                                    <option key={curr} value={curr}>{curr}</option>
                                  ))}
                                </Form.Select>
                              ) : (
                                <span 
                                  className="badge bg-secondary" 
                                  onDoubleClick={() => handleCellDoubleClick(actualIndex, 14, route[14])}
                                  style={{ cursor: 'pointer' }}
                                  title="Doble clic para editar"
                                >
                                  {route[14]}
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">
                Mostrando {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, filteredRoutes.length)} de {filteredRoutes.length} rutas
                {searchTerm && ` (filtradas de ${existingRoutes.length} totales)`}
              </small>
              
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </Button>
                <span className="align-self-center mx-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default Pricing;