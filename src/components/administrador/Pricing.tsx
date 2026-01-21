// src/components/administrador/Pricing.tsx
import { useState, useEffect } from 'react';
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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

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
      fetchRoutes();
      
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

  // Filtrado y ordenamiento
  const filteredRoutes = existingRoutes.filter(route => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return route.some((cell: any) => 
      cell && cell.toString().toLowerCase().includes(searchLower)
    );
  });

  const sortedRoutes = [...filteredRoutes].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const colIndex = parseInt(sortColumn);
    const aVal = a[colIndex] || '';
    const bVal = b[colIndex] || '';
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Paginación
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedRoutes.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedRoutes.length / rowsPerPage);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex.toString()) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnIndex.toString());
      setSortDirection('asc');
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

      {/* ============================================================================ */}
      {/* SECCIÓN: TABLA DE RUTAS EXISTENTES */}
      {/* ============================================================================ */}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '24px',
        marginTop: '24px'
      }}>
        {/* Header de la tabla */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="mb-1">📊 Rutas Aéreas Actuales</h5>
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
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(1)}>
                      Origen {sortColumn === '1' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(2)}>
                      Destino {sortColumn === '2' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(3)}>
                      45kg {sortColumn === '3' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(4)}>
                      100kg {sortColumn === '4' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(5)}>
                      300kg {sortColumn === '5' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(6)}>
                      500kg {sortColumn === '6' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(7)}>
                      1000kg {sortColumn === '7' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(8)}>
                      Carrier {sortColumn === '8' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(9)}>
                      Frecuencia {sortColumn === '9' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(10)}>
                      TT {sortColumn === '10' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(11)}>
                      Routing {sortColumn === '11' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(12)}>
                      Remark1 {sortColumn === '12' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(13)}>
                      Remark2 {sortColumn === '13' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort(14)}>
                      Currency {sortColumn === '14' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
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
                            <td>{route[1]}</td>
                            <td>{route[2]}</td>
                            <td>{route[3]}</td>
                            <td>{route[4]}</td>
                            <td>{route[5]}</td>
                            <td>{route[6]}</td>
                            <td>{route[7]}</td>
                            <td>{route[8]}</td>
                            <td>{route[9]}</td>
                            <td>{route[10]}</td>
                            <td>{route[11]}</td>
                            <td>{route[12]}</td>
                            <td>{route[13]}</td>
                            <td><span className="badge bg-secondary">{route[14]}</span></td>
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
                Mostrando {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, sortedRoutes.length)} de {sortedRoutes.length} rutas
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
    </div>
  );
}

export default Pricing;