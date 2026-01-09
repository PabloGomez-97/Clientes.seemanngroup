// src/components/shipsgo/CreateShipmentForm.tsx
import { useState, FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

// ✅ Detectar automáticamente el ambiente (desarrollo o producción)
const API_BASE_URL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:4000'
  : 'https://portalclientes.seemanngroup.com';

interface CreateShipmentResponse {
  success: boolean;
  message: string;
  shipment: {
    id: number;
    reference: string;
    awb_number: string;
  };
}

function CreateShipmentForm() {
  const { user, token } = useAuth(); // ✅ CORREGIDO: Usar token del AuthContext
  const navigate = useNavigate();
  
  // Estados del formulario
  const [awbNumber, setAwbNumber] = useState('');
  const [followers, setFollowers] = useState<string[]>(['']);
  const [tags, setTags] = useState<string[]>(['']);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdShipment, setCreatedShipment] = useState<any>(null);

  // Validación de AWB en tiempo real
  const validateAwb = (value: string): { valid: boolean; message: string } => {
    // Remover espacios y guiones
    const clean = value.replace(/[\s-]/g, '');
    
    if (clean.length === 0) {
      return { valid: false, message: '' };
    }
    
    // Solo números
    if (!/^\d+$/.test(clean)) {
      return { valid: false, message: 'El AWB solo puede contener números' };
    }
    
    // Exactamente 11 dígitos
    if (clean.length !== 11) {
      return { 
        valid: false, 
        message: `El AWB debe tener 11 dígitos (tiene ${clean.length})` 
      };
    }
    
    return { valid: true, message: '✓ Formato válido' };
  };

  const awbValidation = validateAwb(awbNumber);

  // Validar email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Agregar follower
  const addFollower = () => {
    if (followers.length < 10) {
      setFollowers([...followers, '']);
    }
  };

  // Remover follower
  const removeFollower = (index: number) => {
    setFollowers(followers.filter((_, i) => i !== index));
  };

  // Actualizar follower
  const updateFollower = (index: number, value: string) => {
    const newFollowers = [...followers];
    newFollowers[index] = value;
    setFollowers(newFollowers);
  };

  // Agregar tag
  const addTag = () => {
    if (tags.length < 10) {
      setTags([...tags, '']);
    }
  };

  // Remover tag
  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // Actualizar tag
  const updateTag = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  // Validar formulario completo
  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validar AWB
    if (!awbValidation.valid) {
      errors.push('El AWB debe tener exactamente 11 dígitos numéricos');
    }

    // Validar followers (solo los que tienen contenido)
    const filledFollowers = followers.filter(f => f.trim() !== '');
    const invalidEmails = filledFollowers.filter(f => !isValidEmail(f));
    if (invalidEmails.length > 0) {
      errors.push(`Hay ${invalidEmails.length} email(s) con formato inválido`);
    }

    return { valid: errors.length === 0, errors };
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar formulario
    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.errors.join('. '));
      return;
    }

    setLoading(true);

    try {
      // Preparar datos
      const cleanAwb = awbNumber.replace(/[\s-]/g, '');
      const filledFollowers = followers.filter(f => f.trim() !== '');
      const filledTags = tags.filter(t => t.trim() !== '');

      const shipmentData = {
        reference: user?.username, // Automático
        awb_number: cleanAwb,
        followers: filledFollowers,
        tags: filledTags
      };

      console.log('📤 Enviando:', shipmentData);

      // ✅ CORREGIDO: Usar token del AuthContext directamente
      const response = await fetch(`${API_BASE_URL}/api/shipsgo/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(shipmentData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejar errores específicos
        if (response.status === 409) {
          setError('Ya existe un trackeo con este AWB para tu cuenta. Por favor verifica el número ingresado.');
        } else if (response.status === 402) {
          setError('No hay créditos disponibles. Por favor contacta a tu ejecutivo de cuenta para renovar tu plan.');
        } else {
          setError(data.error || 'Error al crear el trackeo. Por favor intenta nuevamente.');
        }
        return;
      }

      // Éxito
      console.log('✅ Shipment creado:', data.shipment);
      setCreatedShipment(data.shipment);
      setShowSuccessModal(true);

    } catch (err) {
      console.error('❌ Error:', err);
      setError('Error de conexión. Por favor verifica tu internet e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Ir a rastreos
  const goToTracking = () => {
    navigate('/shipsgo'); // Ajustar según tu ruta
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-2">Crear Nuevo Trackeo Aéreo</h2>
          <p className="text-muted">
            Ingresa los datos de tu envío para comenzar a rastrearlo en tiempo real
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                
                {/* Referencia (readonly) */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    Referencia
                    <span className="text-muted ms-2">(Asignada automáticamente)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg bg-light"
                    value={user?.username || ''}
                    disabled
                    readOnly
                  />
                  <small className="text-muted">
                    Esta referencia te permitirá identificar tus envíos
                  </small>
                </div>

                {/* AWB Number */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    AWB Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-lg ${
                      awbNumber && (awbValidation.valid ? 'is-valid' : 'is-invalid')
                    }`}
                    placeholder="33388888888 o 333-88888888"
                    value={awbNumber}
                    onChange={(e) => setAwbNumber(e.target.value)}
                    maxLength={12}
                    required
                  />
                  {awbNumber && (
                    <div className={awbValidation.valid ? 'valid-feedback' : 'invalid-feedback'}>
                      {awbValidation.message}
                    </div>
                  )}
                  <small className="text-muted">
                    Número de guía aérea de 11 dígitos proporcionado por la aerolínea
                  </small>
                </div>

                {/* Followers (Emails) */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    Emails para Notificaciones
                    <span className="text-muted ms-2">(Opcional)</span>
                  </label>
                  <small className="text-muted d-block mb-2">
                    Agrega hasta 10 emails que recibirán actualizaciones del envío
                  </small>
                  
                  {followers.map((follower, index) => (
                    <div key={index} className="input-group mb-2">
                      <input
                        type="email"
                        className={`form-control ${
                          follower && !isValidEmail(follower) ? 'is-invalid' : ''
                        }`}
                        placeholder="ejemplo@email.com"
                        value={follower}
                        onChange={(e) => updateFollower(index, e.target.value)}
                      />
                      {followers.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeFollower(index)}
                        >
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {followers.length < 10 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={addFollower}
                    >
                      <svg width="16" height="16" fill="currentColor" className="me-1" viewBox="0 0 16 16">
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                      </svg>
                      Agregar Email
                    </button>
                  )}
                </div>

                {/* Tags */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    Etiquetas (Tags)
                    <span className="text-muted ms-2">(Opcional)</span>
                  </label>
                  <small className="text-muted d-block mb-2">
                    Agrega hasta 10 etiquetas para clasificar tu envío
                  </small>
                  
                  {tags.map((tag, index) => (
                    <div key={index} className="input-group mb-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: IMPORT, URGENTE, FRÁGIL"
                        value={tag}
                        onChange={(e) => updateTag(index, e.target.value)}
                        maxLength={50}
                      />
                      {tags.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeTag(index)}
                        >
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {tags.length < 10 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={addTag}
                    >
                      <svg width="16" height="16" fill="currentColor" className="me-1" viewBox="0 0 16 16">
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                      </svg>
                      Agregar Etiqueta
                    </button>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                {/* Botones */}
                <div className="d-flex gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-lg flex-fill"
                    onClick={() => navigate(-1)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg flex-fill"
                    disabled={loading || !awbValidation.valid}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creando...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                          <path d="M15.854 5.146a.5.5 0 0 1 0 .708l-8 8a.5.5 0 0 1-.708 0l-4-4a.5.5 0 1 1 .708-.708L7.5 12.793l7.646-7.647a.5.5 0 0 1 .708 0z"/>
                        </svg>
                        Crear Trackeo
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Info Card */}
          <div className="card bg-light border-0 mt-3">
            <div className="card-body">
              <h6 className="fw-bold mb-2">
                <svg width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
                Información Importante
              </h6>
              <ul className="mb-0 small text-muted">
                <li>El trackeo comenzará automáticamente una vez creado</li>
                <li>Recibirás notificaciones por email sobre el estado de tu envío</li>
                <li>Puedes ver el progreso en tiempo real desde la sección "Rastreos"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center py-5">
                <div className="mb-4">
                  <svg width="80" height="80" fill="currentColor" className="text-success" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                </div>
                <h3 className="mb-3">¡Trackeo Creado Exitosamente!</h3>
                <p className="text-muted mb-2">
                  Tu envío <strong>{createdShipment?.awb_number}</strong> está siendo rastreado
                </p>
                <p className="text-muted mb-4">
                  Puedes revisar el estado de tu cargamento en la sección de Rastreos
                </p>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={goToTracking}
                >
                  <svg width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                  </svg>
                  Ir a Rastreos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateShipmentForm;