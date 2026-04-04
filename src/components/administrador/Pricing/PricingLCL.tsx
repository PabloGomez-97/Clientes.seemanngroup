// src/components/administrador/PricingLCL.tsx
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { useAuditLog } from "../../../hooks/useAuditLog";
import { Accordion, Button, Form, Spinner, Alert } from "react-bootstrap";

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

interface RouteFormLCL {
  id: string;
  pol: string;
  servicio: string;
  pod: string;
  ofwm: string;
  currency: string;
  frecuencia: string;
  agente: string;
  tt: string;
  operador: string;
  validez: string;
}

const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyDcpZT3TmaOmrOq-vJPoMMmwHlUzNf1wBQeZiUjSoPexfZ_IpShAJV2RivzyFLGGk3Jw/exec";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "CHF", "CLP", "SEK"];

function PricingLCL() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const { registrarEvento } = useAuditLog();

  const [forms, setForms] = useState<RouteFormLCL[]>([
    {
      id: "1",
      pol: "",
      servicio: "",
      pod: "",
      ofwm: "",
      currency: "USD",
      frecuencia: "",
      agente: "",
      tt: "",
      operador: "",
      validez: "",
    },
  ]);

  const [activeKey, setActiveKey] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para la tabla de datos existentes
  const [existingRoutes, setExistingRoutes] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(30);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Estados para edición de celda individual (doble clic)
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [cellValue, setCellValue] = useState<string>("");

  const addNewForm = () => {
    const newForm: RouteFormLCL = {
      id: Date.now().toString(),
      pol: "",
      servicio: "",
      pod: "",
      ofwm: "",
      currency: "USD",
      frecuencia: "",
      agente: "",
      tt: "",
      operador: "",
      validez: "",
    };
    setForms([...forms, newForm]);
    setActiveKey(forms.length.toString());
  };

  const removeForm = (id: string) => {
    if (forms.length === 1) {
      alert("Debes mantener al menos un formulario");
      return;
    }
    setForms(forms.filter((f) => f.id !== id));
  };

  const updateForm = (id: string, field: keyof RouteFormLCL, value: string) => {
    setForms(forms.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const handleSubmitAll = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Enviar todos los formularios usando iframe (evita CORS)
      for (const form of forms) {
        await sendFormViaIframe(form);
      }

      setSuccess(
        `✅ ${forms.length} ruta${forms.length > 1 ? "s" : ""} agregada${forms.length > 1 ? "s" : ""} exitosamente al Google Sheet`,
      );

      // Registrar auditoría por cada ruta creada
      for (const form of forms) {
        registrarEvento({
          accion: "PRICING_LCL_CREADO",
          categoria: "PRICING",
          descripcion: `Tarifa LCL creada: ${form.pol} → ${form.pod} (${form.operador})`,
          detalles: {
            pol: form.pol,
            servicio: form.servicio,
            pod: form.pod,
            ofwm: form.ofwm,
            currency: form.currency,
            operador: form.operador,
          },
        });
      }

      // Refrescar la tabla de rutas
      await fetchRoutes();

      // Ir a la última página para ver las rutas recién agregadas
      setTimeout(() => {
        const newTotalPages = Math.ceil(existingRoutes.length / rowsPerPage);
        setCurrentPage(newTotalPages);
      }, 100);

      // Limpiar formularios después de 2 segundos
      setTimeout(() => {
        setForms([
          {
            id: Date.now().toString(),
            pol: "",
            servicio: "",
            pod: "",
            ofwm: "",
            currency: "USD",
            frecuencia: "",
            agente: "",
            tt: "",
            operador: "",
            validez: "",
          },
        ]);
        setActiveKey("0");
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error("Error al enviar rutas:", err);
      setError("Error al enviar las rutas. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Función para enviar datos via iframe (evita CORS)
  const sendFormViaIframe = (form: RouteFormLCL): Promise<void> => {
    return new Promise((resolve) => {
      const hiddenForm = document.createElement("form");
      hiddenForm.method = "POST";
      hiddenForm.action = GOOGLE_APPS_SCRIPT_URL;
      hiddenForm.target = "hidden-iframe-" + form.id;
      hiddenForm.style.display = "none";

      const values = [
        "", // Columna 0 vacía
        form.pol,
        form.servicio,
        form.pod,
        form.ofwm,
        form.currency,
        form.frecuencia,
        form.agente,
        form.tt,
        form.operador,
        form.validez,
      ];

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "data";
      input.value = JSON.stringify({ values });
      hiddenForm.appendChild(input);

      const iframe = document.createElement("iframe");
      iframe.name = "hidden-iframe-" + form.id;
      iframe.style.display = "none";

      iframe.onload = () => {
        setTimeout(() => {
          document.body.removeChild(hiddenForm);
          document.body.removeChild(iframe);
          resolve();
        }, 500);
      };

      document.body.appendChild(iframe);
      document.body.appendChild(hiddenForm);
      hiddenForm.submit();
    });
  };

  // Función para obtener todas las rutas
  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL + "?action=getAll");
      const data = await response.json();

      if (data.success && data.data) {
        setExistingRoutes(data.data);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error("Error al cargar rutas:", err);
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
    if (!window.confirm("¿Estás seguro de eliminar esta ruta?")) {
      return;
    }

    try {
      setLoadingRoutes(true);
      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL + `?action=delete&row=${rowIndex}`,
      );
      const data = await response.json();

      if (data.success) {
        setSuccess("✅ Ruta eliminada exitosamente");
        // Registrar auditoría
        const deletedRoute = existingRoutes.find(
          (_: any, i: number) => i + 3 === rowIndex,
        );
        registrarEvento({
          accion: "PRICING_LCL_ELIMINADO",
          categoria: "PRICING",
          descripcion: `Tarifa LCL eliminada: ${deletedRoute?.[1] || ""} → ${deletedRoute?.[3] || ""} (${deletedRoute?.[9] || ""})`,
          detalles: { rowIndex, ruta: deletedRoute || [] },
        });
        fetchRoutes();
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      console.error("Error al eliminar ruta:", err);
      setError("Error al eliminar la ruta");
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Función para iniciar edición
  const startEdit = (route: any, index: number) => {
    setEditingRow(index);
    setEditForm({
      pol: route[1],
      servicio: route[2],
      pod: route[3],
      ofwm: route[4],
      currency: route[5],
      frecuencia: route[6],
      agente: route[7],
      tt: route[8],
      operador: route[9],
      validez: route[10] || "",
    });
  };

  // Función para guardar edición
  const saveEdit = async (rowIndex: number) => {
    try {
      setLoadingRoutes(true);

      const values = [
        "",
        editForm.pol,
        editForm.servicio,
        editForm.pod,
        editForm.ofwm,
        editForm.currency,
        editForm.frecuencia,
        editForm.agente,
        editForm.tt,
        editForm.operador,
        editForm.validez,
      ];

      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL + `?action=update&row=${rowIndex}`,
        {
          method: "POST",
          body: JSON.stringify({ values }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("✅ Ruta actualizada exitosamente");
        // Registrar auditoría
        registrarEvento({
          accion: "PRICING_LCL_ACTUALIZADO",
          categoria: "PRICING",
          descripcion: `Tarifa LCL actualizada: ${editForm.pol} → ${editForm.pod} (${editForm.operador})`,
          detalles: {
            rowIndex,
            pol: editForm.pol,
            servicio: editForm.servicio,
            pod: editForm.pod,
            ofwm: editForm.ofwm,
            currency: editForm.currency,
            operador: editForm.operador,
          },
        });
        setEditingRow(null);
        setEditForm(null);
        fetchRoutes();
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      console.error("Error al actualizar ruta:", err);
      setError("Error al actualizar la ruta");
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

  const handleCellDoubleClick = (
    rowIndex: number,
    colIndex: number,
    currentValue: any,
  ) => {
    if (editingRow !== null) return;

    setEditingCell({ row: rowIndex, col: colIndex });
    setCellValue(currentValue || "");
  };

  const saveCellEdit = async (rowIndex: number, colIndex: number) => {
    try {
      setLoadingRoutes(true);

      const actualRowIndex = rowIndex + 3; // +3 por las 2 filas de headers
      const currentRoute = existingRoutes[rowIndex];

      const updatedRow = [...currentRoute];
      updatedRow[colIndex] = cellValue;

      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL + `?action=update&row=${actualRowIndex}`,
        {
          method: "POST",
          body: JSON.stringify({ values: updatedRow }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("✅ Celda actualizada exitosamente");
        // Registrar auditoría de edición de celda
        const columnNames = [
          "",
          "pol",
          "servicio",
          "pod",
          "ofwm",
          "currency",
          "frecuencia",
          "agente",
          "tt",
          "operador",
          "validez",
        ];
        registrarEvento({
          accion: "PRICING_LCL_ACTUALIZADO",
          categoria: "PRICING",
          descripcion: `Celda de tarifa LCL editada: columna ${columnNames[colIndex] || colIndex} → "${cellValue}"`,
          detalles: {
            rowIndex,
            colIndex,
            campo: columnNames[colIndex] || `col_${colIndex}`,
            nuevoValor: cellValue,
            valorAnterior: currentRoute[colIndex],
          },
        });
        setEditingCell(null);
        setCellValue("");
        fetchRoutes();
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      console.error("Error al actualizar celda:", err);
      setError("Error al actualizar la celda");
    } finally {
      setLoadingRoutes(false);
    }
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setCellValue("");
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number,
  ) => {
    if (e.key === "Enter") {
      saveCellEdit(rowIndex, colIndex);
    } else if (e.key === "Escape") {
      cancelCellEdit();
    }
  };

  // Filtrado
  const filteredRoutes = existingRoutes.filter((route) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return route.some(
      (cell: any) =>
        cell && cell.toString().toLowerCase().includes(searchLower),
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
        <Alert
          variant="success"
          className="mb-4"
          dismissible
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert
          variant="danger"
          className="mb-4"
          dismissible
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Accordion de Formularios */}
      <div className="pricing-forms-section">
        {/* Accordion de Formularios */}
        <Accordion
          activeKey={activeKey}
          onSelect={(key) => setActiveKey(key as string)}
        >
          {forms.map((form, index) => (
            <Accordion.Item
              eventKey={index.toString()}
              key={form.id}
              className="mb-3"
            >
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                  <span>
                    <strong>Ruta LCL #{index + 1}</strong>
                    {form.pol && form.pod && (
                      <span className="ms-2 text-muted">
                        ({form.pol} → {form.pod})
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
                    <h6 className="text-muted mb-3">Puertos y Servicio</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>POL (Puerto de Origen)</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.pol}
                            onChange={(e) =>
                              updateForm(form.id, "pol", e.target.value)
                            }
                            placeholder="Ej: Valparaiso"
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>SERVICIO - VIA</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.servicio}
                            onChange={(e) =>
                              updateForm(form.id, "servicio", e.target.value)
                            }
                            placeholder="Ej: Directo, Via Buenaventura"
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>POD (Puerto de Destino)</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.pod}
                            onChange={(e) =>
                              updateForm(form.id, "pod", e.target.value)
                            }
                            placeholder="Ej: Santos"
                          />
                        </Form.Group>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Tarifa */}
                  <div className="mb-4">
                    <h6 className="text-muted mb-3">Tarifa</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <Form.Group>
                          <Form.Label>OF W/M</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={form.ofwm}
                            onChange={(e) =>
                              updateForm(form.id, "ofwm", e.target.value)
                            }
                            placeholder="45"
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-6">
                        <Form.Group>
                          <Form.Label>Moneda</Form.Label>
                          <Form.Select
                            value={form.currency}
                            onChange={(e) =>
                              updateForm(form.id, "currency", e.target.value)
                            }
                          >
                            {CURRENCY_OPTIONS.map((curr) => (
                              <option key={curr} value={curr}>
                                {curr}
                              </option>
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
                          <Form.Label>Frecuencia</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.frecuencia}
                            onChange={(e) =>
                              updateForm(form.id, "frecuencia", e.target.value)
                            }
                            placeholder="Ej: Semanal, Quincenal"
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Agente</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.agente}
                            onChange={(e) =>
                              updateForm(form.id, "agente", e.target.value)
                            }
                            placeholder="Nombre del agente"
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-4">
                        <Form.Group>
                          <Form.Label>Transit Time Aprox</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.tt}
                            onChange={(e) =>
                              updateForm(form.id, "tt", e.target.value)
                            }
                            placeholder="Ej: 30-35 días"
                          />
                        </Form.Group>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Información Adicional */}
                  <div className="mb-3">
                    <h6 className="text-muted mb-3">Información Adicional</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <Form.Group>
                          <Form.Label>Operador</Form.Label>
                          <Form.Control
                            type="text"
                            value={form.operador}
                            onChange={(e) =>
                              updateForm(form.id, "operador", e.target.value)
                            }
                            placeholder="Nombre del operador"
                          />
                        </Form.Group>
                      </div>
                      <div className="col-md-6">
                        <Form.Group>
                          <Form.Label>Validez</Form.Label>
                          <Form.Control
                            type="date"
                            value={form.validez}
                            onChange={(e) =>
                              updateForm(form.id, "validez", e.target.value)
                            }
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
                Enviando {forms.length} ruta{forms.length > 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-upload me-2"></i>
                Enviar {forms.length} Ruta{forms.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>

        {/* Info adicional */}
        <div className="mt-4 pt-3 border-top">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Todos los campos son opcionales. Las rutas se agregarán directamente
            al Pricing.
          </small>
        </div>
        <div className="mt-2">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Los valores agregados aparecerán al final de la tabla de rutas
            existentes.
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
            <h5 className="mb-1">Rutas LCL Actuales</h5>
            <small className="text-muted">
              {lastFetch &&
                `Última actualización: ${lastFetch.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`}
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
              <table
                className="table table-hover table-sm"
                style={{ fontSize: "0.85rem" }}
              >
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "50px" }}>Acciones</th>
                    <th>POL</th>
                    <th>SERVICIO - VIA</th>
                    <th>POD</th>
                    <th>OF W/M</th>
                    <th>Currency</th>
                    <th>Frecuencia</th>
                    <th>Agente</th>
                    <th>TT Aprox</th>
                    <th>Operador</th>
                    <th>Validez</th>
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
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <i className="bi bi-check"></i>
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={cancelEdit}
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "0.75rem",
                                }}
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
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => deleteRoute(actualIndex + 3)}
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          )}
                        </td>
                        {isEditing ? (
                          <>
                            <td>
                              <Form.Control
                                size="sm"
                                value={editForm.pol}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    pol: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                value={editForm.servicio}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    servicio: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                value={editForm.pod}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    pod: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                type="number"
                                step="0.01"
                                value={editForm.ofwm}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    ofwm: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Form.Select
                                size="sm"
                                value={editForm.currency}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    currency: e.target.value,
                                  })
                                }
                              >
                                {CURRENCY_OPTIONS.map((curr) => (
                                  <option key={curr} value={curr}>
                                    {curr}
                                  </option>
                                ))}
                              </Form.Select>
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                value={editForm.frecuencia}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    frecuencia: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                value={editForm.agente}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    agente: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                value={editForm.tt}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    tt: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                value={editForm.operador}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    operador: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                size="sm"
                                type="date"
                                value={editForm.validez}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    validez: e.target.value,
                                  })
                                }
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            {[1, 2, 3, 4].map((colIndex) => {
                              const isEditingThisCell =
                                editingCell?.row === actualIndex &&
                                editingCell?.col === colIndex;

                              return (
                                <td
                                  key={colIndex}
                                  onDoubleClick={() =>
                                    handleCellDoubleClick(
                                      actualIndex,
                                      colIndex,
                                      route[colIndex],
                                    )
                                  }
                                  style={{
                                    cursor: "pointer",
                                    position: "relative",
                                  }}
                                  title="Doble clic para editar"
                                >
                                  {isEditingThisCell ? (
                                    <Form.Control
                                      size="sm"
                                      type={colIndex === 4 ? "number" : "text"}
                                      step={colIndex === 4 ? "0.01" : undefined}
                                      value={cellValue}
                                      onChange={(e) =>
                                        setCellValue(e.target.value)
                                      }
                                      onKeyDown={(e) =>
                                        handleCellKeyDown(
                                          e,
                                          actualIndex,
                                          colIndex,
                                        )
                                      }
                                      onBlur={() =>
                                        saveCellEdit(actualIndex, colIndex)
                                      }
                                      autoFocus
                                      style={{ minWidth: "80px" }}
                                    />
                                  ) : (
                                    <span>{route[colIndex]}</span>
                                  )}
                                </td>
                              );
                            })}
                            <td>
                              {editingCell?.row === actualIndex &&
                              editingCell?.col === 5 ? (
                                <Form.Select
                                  size="sm"
                                  value={cellValue}
                                  onChange={(e) => setCellValue(e.target.value)}
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(e, actualIndex, 5)
                                  }
                                  onBlur={() => saveCellEdit(actualIndex, 5)}
                                  autoFocus
                                >
                                  {CURRENCY_OPTIONS.map((curr) => (
                                    <option key={curr} value={curr}>
                                      {curr}
                                    </option>
                                  ))}
                                </Form.Select>
                              ) : (
                                <span
                                  className="badge bg-secondary"
                                  onDoubleClick={() =>
                                    handleCellDoubleClick(
                                      actualIndex,
                                      5,
                                      route[5],
                                    )
                                  }
                                  style={{ cursor: "pointer" }}
                                  title="Doble clic para editar"
                                >
                                  {route[5]}
                                </span>
                              )}
                            </td>
                            {[6, 7, 8, 9, 10].map((colIndex) => {
                              const isEditingThisCell =
                                editingCell?.row === actualIndex &&
                                editingCell?.col === colIndex;

                              return (
                                <td
                                  key={colIndex}
                                  onDoubleClick={() =>
                                    handleCellDoubleClick(
                                      actualIndex,
                                      colIndex,
                                      route[colIndex],
                                    )
                                  }
                                  style={{
                                    cursor: "pointer",
                                    position: "relative",
                                  }}
                                  title="Doble clic para editar"
                                >
                                  {isEditingThisCell ? (
                                    <Form.Control
                                      size="sm"
                                      type={colIndex === 10 ? "date" : "text"}
                                      value={cellValue}
                                      onChange={(e) =>
                                        setCellValue(e.target.value)
                                      }
                                      onKeyDown={(e) =>
                                        handleCellKeyDown(
                                          e,
                                          actualIndex,
                                          colIndex,
                                        )
                                      }
                                      onBlur={() =>
                                        saveCellEdit(actualIndex, colIndex)
                                      }
                                      autoFocus
                                      style={{ minWidth: "80px" }}
                                    />
                                  ) : (
                                    <span>{route[colIndex]}</span>
                                  )}
                                </td>
                              );
                            })}
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
                Mostrando {indexOfFirstRow + 1} -{" "}
                {Math.min(indexOfLastRow, filteredRoutes.length)} de{" "}
                {filteredRoutes.length} rutas
                {searchTerm &&
                  ` (filtradas de ${existingRoutes.length} totales)`}
              </small>

              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
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

export default PricingLCL;
