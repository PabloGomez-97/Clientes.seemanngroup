// src/components/shipsgo/CreateShipmentForm.tsx
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./CreateShipmentForm.css";
import * as bootstrap from "bootstrap";

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

function CreateShipmentForm() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll(
      '[data-bs-toggle="tooltip"]',
    );
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }, []);

  useEffect(() => {
    const awb = searchParams.get("awb");
    if (awb) {
      setAwbNumber(awb);
    }
  }, [searchParams]);

  const [awbNumber, setAwbNumber] = useState("");
  const [followers, setFollowers] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newFollower, setNewFollower] = useState("");
  const [newTag, setNewTag] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdShipment, setCreatedShipment] = useState<any>(null);

  // Validación de AWB
  const validateAwb = (value: string): { valid: boolean; message: string } => {
    const clean = value.replace(/[\s-]/g, "");

    if (clean.length === 0) {
      return { valid: false, message: "" };
    }

    if (!/^\d+$/.test(clean)) {
      return { valid: false, message: "El AWB solo puede contener números" };
    }

    if (clean.length !== 11) {
      return {
        valid: false,
        message: `El AWB debe tener 11 dígitos (tiene ${clean.length})`,
      };
    }

    return { valid: true, message: "Formato válido" };
  };

  const awbValidation = validateAwb(awbNumber);

  // Validar email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Agregar follower a la lista
  const addFollower = () => {
    const email = newFollower.trim();
    if (
      email &&
      isValidEmail(email) &&
      !followers.includes(email) &&
      followers.length < 10
    ) {
      setFollowers([...followers, email]);
      setNewFollower("");
    }
  };

  // Remover follower
  const removeFollower = (email: string) => {
    setFollowers(followers.filter((f) => f !== email));
  };

  // Agregar tag
  const addTag = () => {
    const tagValue = newTag.trim();
    if (tagValue && !tags.includes(tagValue) && tags.length < 10) {
      setTags([...tags, tagValue]);
      setNewTag("");
    }
  };

  // Remover tag
  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Manejar Enter en inputs
  const handleFollowerKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFollower();
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // Validar formulario
  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!awbValidation.valid) {
      errors.push("El AWB debe tener exactamente 11 dígitos numéricos");
    }

    return { valid: errors.length === 0, errors };
  };

  // Enviar formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.errors.join(". "));
      return;
    }

    setLoading(true);

    try {
      const cleanAwb = awbNumber.replace(/[\s-]/g, "");

      const shipmentData = {
        reference: user?.username,
        awb_number: cleanAwb,
        followers: followers,
        tags: tags,
      };

      console.log("📤 Enviando:", shipmentData);

      const response = await fetch(`${API_BASE_URL}/api/shipsgo/shipments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(shipmentData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(
            "Ya existe un trackeo con este AWB en tu cuenta. Por favor verifica el número ingresado.",
          );
        } else if (response.status === 402) {
          setError(
            "No hay créditos disponibles. Por favor contacta a tu ejecutivo de cuenta para renovar tu plan.",
          );
        } else {
          setError(
            data.error ||
              "Error al crear el trackeo. Por favor intenta nuevamente.",
          );
        }
        return;
      }

      console.log("✅ Shipment creado:", data.shipment);
      setCreatedShipment(data.shipment);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("❌ Error:", err);
      setError(
        "Error de conexión. Por favor verifica tu internet e intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const goToTracking = () => {
    navigate("/shipsgo");
  };

  return (
    <div className="shipment-form-wrapper">
      <div className="shipment-form-container">
        <div className="shipment-card">
          <div className="shipment-card-body">
            <h4 className="header-title">Track New Shipment</h4>
            <p className="sub-header">
              Puede crear un nuevo seguimiento de envío aéreo proporcionando el
              número AWB (guía aérea).
            </p>

            {/* Advertencia AWB */}
            <div
              className="alert alert-warning d-flex align-items-start mb-4"
              role="alert"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                className="me-3 mt-1 flex-shrink-0"
                viewBox="0 0 16 16"
              >
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.438-.99.982-1.767L8.982 1.566z" />
                <path d="M8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
              </svg>

              <div style={{ textAlign: "justify" }}>
                <h6 className="fw-bold mb-1">Importante antes de continuar</h6>
                <p className="mb-1">
                  Asegúrese de ingresar{" "}
                  <strong>exactamente el AWB entregado por su aerolínea</strong>
                  . Un número incorrecto puede generar un trackeo fallido y
                  consumir créditos de su cuenta innecesariamente.
                </p>
                <p className="mb-0">
                  ¿No conoce su AWB? Puede revisarlo en la sección{" "}
                  <strong>Operaciones Aéreas</strong>, donde encontrará sus AWB
                  disponibles en NÚMEROS.
                </p>

                {/* Ayudame a colocar este div en el centro por favor*/}
                <div className="csf-callout-cta mt-3 d-flex justify-content-center">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary csf-btn-soft"
                    onClick={() => navigate("/air-shipments")}
                  >
                    Ver AWB
                    <svg
                      width="16"
                      height="16"
                      className="ms-2"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Reference Number */}
              <div className="form-group">
                <i className=""></i>
                <label htmlFor="input-reference-number">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  id="input-reference-number"
                  className="form-control"
                  value={user?.username || ""}
                  disabled
                  readOnly
                  style={{ backgroundColor: "#e9ecef" }}
                />
              </div>

              {/* AWB Number */}
              <div className="form-group">
                <label htmlFor="input-awb-number">
                  AWB Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="input-awb-number"
                  className={`form-control ${
                    awbNumber &&
                    (awbValidation.valid ? "is-valid" : "is-invalid")
                  }`}
                  placeholder="Enter 11-digit AWB number"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  maxLength={12}
                  required
                />
                {awbNumber && !awbValidation.valid && (
                  <div className="invalid-feedback">
                    {awbValidation.message}
                  </div>
                )}
                {awbNumber && awbValidation.valid && (
                  <div className="valid-feedback">{awbValidation.message}</div>
                )}
                <small className="text-muted d-block mt-1">
                  Número de guía aérea de 11 dígitos proporcionado por la
                  aerolínea
                </small>
              </div>

              {/* Shipment's Tags */}
              <div className="form-group mb-1">
                <label
                  htmlFor="input-tag"
                  className="d-flex align-items-center gap-2"
                >
                  <span>Shipment's Tags</span>

                  <i
                    className="fa fa-info-circle text-muted"
                    role="button"
                    tabIndex={0}
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Puedes agrupar tus envíos usando etiquetas. Máximo 10 etiquetas, 64 caracteres cada una."
                    aria-label="Información sobre Shipment's Tags"
                  />
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    id="input-tag"
                    className="form-control"
                    placeholder="Enter a tag and press Enter"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    maxLength={64}
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={addTag}
                      disabled={!newTag.trim() || tags.length >= 10}
                    >
                      <svg
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                      </svg>
                      Add
                    </button>
                  </div>
                </div>
                <small className="text-muted d-block mt-1">
                  Puedes agrupar tus envíos con etiquetas. Cada etiqueta debe
                  tener un máximo de 64 caracteres. ({tags.length}/10)
                </small>
              </div>

              {/* Tags List */}
              {tags.length > 0 && (
                <div className="form-group mb-3">
                  <ul className="list-group">
                    {tags.map((tag, index) => (
                      <li key={index} className="list-group-item">
                        <span>{tag}</span>
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => removeTag(tag)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.875rem",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Shipment's Followers */}
              <div className="form-group mb-1 mt-2">
                <i className=""></i>
                <label
                  htmlFor="input-follower"
                  className="d-flex align-items-center gap-2 mb-1"
                >
                  <span>Shipment's Followers</span>

                  <i
                    className="fa fa-info-circle text-muted"
                    role="button"
                    tabIndex={0}
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Agregue emails para recibir notificaciones del envío. Puede incluir hasta 10 destinatarios."
                    aria-label="Información sobre Shipment's Followers"
                  />
                </label>
                <div className="input-group">
                  <input
                    type="email"
                    id="input-follower"
                    className="form-control"
                    placeholder="Enter email and press Enter"
                    value={newFollower}
                    onChange={(e) => setNewFollower(e.target.value)}
                    onKeyPress={handleFollowerKeyPress}
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={addFollower}
                      disabled={
                        !newFollower.trim() ||
                        !isValidEmail(newFollower) ||
                        followers.length >= 10
                      }
                    >
                      <svg
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                      </svg>
                      Add
                    </button>
                  </div>
                </div>
                <small className="text-muted d-block mt-1">
                  Puedes agregar direcciones de correo electrónico donde deseas
                  recibir notificaciones sobre el envío ({followers.length}/10)
                </small>
              </div>

              {/* Followers List */}
              {followers.length > 0 && (
                <div className="form-group mb-3">
                  <ul className="list-group">
                    {followers.map((email, index) => (
                      <li key={index} className="list-group-item">
                        <span>{email}</span>
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => removeFollower(email)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.875rem",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="button-group text-right">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !awbValidation.valid}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="mr-2"
                        viewBox="0 0 16 16"
                        style={{
                          display: "inline-block",
                          verticalAlign: "middle",
                        }}
                      >
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                      </svg>
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Shipment Created Successfully</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSuccessModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="success-icon">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p>
                  Your air shipment has been created and tracking has started.
                </p>
                <div className="success-awb">
                  AWB: {createdShipment?.awb_number}
                </div>
                <p className="text-muted">
                  You can now monitor your shipment in real-time from the
                  tracking section.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSuccessModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={goToTracking}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="mr-2"
                    viewBox="0 0 16 16"
                    style={{ display: "inline-block", verticalAlign: "middle" }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"
                    />
                  </svg>
                  View Tracking
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
