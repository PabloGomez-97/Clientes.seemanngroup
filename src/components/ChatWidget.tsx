// src/components/ChatWidget.tsx
import { useState, useRef, useEffect } from "react";
import { useChatbot } from "../hooks/useChatbot";
import { useAuth } from "../auth/AuthContext";
import logoSeemann from "../../public/logo.png";

export default function ChatWidget() {
  const { user } = useAuth();
  const {
    messages,
    isOpen,
    isLoading,
    error,
    toggleChat,
    sendMessage,
    clearChat,
  } = useChatbot();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus en el input cuando se abre el chat
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue;
    setInputValue("");
    await sendMessage(message);
  };

  const handleQuickOption = async (option: string) => {
    await sendMessage(option);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Función para renderizar texto con markdown (negrita)
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldText = part.slice(2, -2);
        return <strong key={index}>{boldText}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "100px",
            right: "24px",
            width: "420px",
            maxWidth: "calc(100vw - 48px)",
            height: "650px",
            maxHeight: "calc(100vh - 150px)",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            fontFamily:
              "'Inter', 'Roboto', 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {/* Header minimalista */}
          <div
            style={{
              backgroundColor: "#425b76",
              color: "white",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src={logoSeemann}
                  alt="Seemann Group"
                  style={{
                    width: "24px",
                    height: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "600",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Seemann Group
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    opacity: 0.85,
                    fontWeight: "400",
                  }}
                >
                  Asistente de logística
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px",
                    cursor: "pointer",
                    color: "rgba(255, 255, 255, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.2s",
                  }}
                  title="Limpiar conversación"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                    <path
                      fillRule="evenodd"
                      d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={toggleChat}
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px",
                  cursor: "pointer",
                  color: "rgba(255, 255, 255, 0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 20px",
              backgroundColor: "#fafbfc",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Botones de opciones predeterminadas (solo si no hay mensajes) */}
            {messages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "20px",
                  animation: "fadeIn 0.4s ease-out",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    textAlign: "center",
                    marginBottom: "12px",
                    fontWeight: "500",
                  }}
                >
                  Bienvenido {user?.username ?? ""}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    textAlign: "center",
                    marginBottom: "12px",
                    fontWeight: "500",
                  }}
                >
                  Selecciona una opción para comenzar:
                </p>
                {["¿Qué es FCL?", "¿Qué es EXW?", "¿Qué es AWB?"].map(
                  (option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickOption(option)}
                      disabled={isLoading}
                      style={{
                        padding: "14px 18px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        fontSize: "14px",
                        color: "#374151",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                        fontWeight: "500",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                          e.currentTarget.style.borderColor = "#425b76";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 6px rgba(0, 0, 0, 0.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 1px 2px rgba(0, 0, 0, 0.05)";
                      }}
                    >
                      {option}
                    </button>
                  ),
                )}
              </div>
            )}

            {/* Mensajes */}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  gap: "6px",
                  animation: "slideIn 0.3s ease-out",
                }}
              >
                {/* Nombre del remitente */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingLeft: msg.role === "assistant" ? "0" : "0",
                    paddingRight: msg.role === "user" ? "0" : "0",
                  }}
                >
                  {msg.role === "assistant" && (
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#425b76",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={logoSeemann}
                        alt="Bot"
                        style={{
                          width: "16px",
                          height: "auto",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {msg.role === "user" ? "Tú" : "Seemann Group"}
                  </span>
                </div>

                {/* Mensaje */}
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor:
                      msg.role === "user" ? "#425b76" : "#eaf0f6",
                    color: msg.role === "user" ? "#ffffff" : "#1f2937",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    wordBreak: "break-word",
                    boxShadow:
                      msg.role === "user"
                        ? "0 2px 8px rgba(66, 91, 118, 0.2)"
                        : "0 1px 3px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {renderMessageContent(msg.content)}
                </div>

                {/* Hora (solo para mensajes del usuario) */}
                {msg.role === "user" && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      paddingRight: "4px",
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "6px",
                  animation: "fadeIn 0.3s ease-out",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor: "#425b76",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={logoSeemann}
                      alt="Bot"
                      style={{
                        width: "16px",
                        height: "auto",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                    }}
                  >
                    Seemann Group
                  </span>
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "#eaf0f6",
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#425b76",
                      animation: "pulse 1.4s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#425b76",
                      animation: "pulse 1.4s ease-in-out 0.2s infinite",
                    }}
                  />
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#425b76",
                      animation: "pulse 1.4s ease-in-out 0.4s infinite",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontSize: "13px",
                  color: "#991b1b",
                  display: "flex",
                  gap: "10px",
                  alignItems: "start",
                  animation: "slideIn 0.3s ease-out",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  style={{ flexShrink: 0, marginTop: "2px" }}
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
                </svg>
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "16px 20px",
              borderTop: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
            }}
          >
            <div
              style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s",
                  backgroundColor: "#fafbfc",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#425b76";
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.backgroundColor = "#fafbfc";
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                style={{
                  padding: "12px 14px",
                  backgroundColor:
                    isLoading || !inputValue.trim() ? "#9ca3af" : "#425b76",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor:
                    isLoading || !inputValue.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && inputValue.trim()) {
                    e.currentTarget.style.backgroundColor = "#364a5f";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 8px rgba(0, 0, 0, 0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    isLoading || !inputValue.trim() ? "#9ca3af" : "#425b76";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 4px rgba(0, 0, 0, 0.1)";
                }}
              >
                <svg
                  width="20"
                  height="20"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button
      {!isOpen && (
        <button
          onClick={toggleChat}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#425b76',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(66, 91, 118, 0.3)',
            zIndex: 9999,
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(66, 91, 118, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(66, 91, 118, 0.3)';
          }}
        >
          <svg width="28" height="28" fill="white" viewBox="0 0 16 16">
            <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
          </svg>
        </button>
      )}*/}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scrollbar personalizado */
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: transparent;
        }

        div::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Responsivo */
        @media (max-width: 480px) {
          div[style*="width: 420px"] {
            width: calc(100vw - 32px) !important;
            right: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
