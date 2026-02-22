// src/components/administrador/alumnospractica.tsx
// Dashboard de Seguimiento y Ranking Acumulativo de Alumnos
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
);

// ── Design Tokens ──
const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const COLORS = {
  bg: "#f8f9fa",
  card: "#ffffff",
  border: "#e8ecf1",
  accent: "#ff6200",
  accentLight: "#fff3eb",
  accentDark: "#e55800",
  navy: "#232f3e",
  navyLight: "#2d3a4a",
  gold: "#ff9900",
  text: "#1a1a1a",
  textMuted: "#6b7280",
  textLight: "#a3a3a3",
  success: "#059669",
  successBg: "#ecfdf5",
  info: "#2563eb",
  infoBg: "#eff6ff",
  purple: "#7c3aed",
  purpleBg: "#f5f3ff",
  cyan: "#0891b2",
  cyanBg: "#ecfeff",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  warning: "#f59e0b",
  warningBg: "#fffbeb",
};

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

interface Alumno {
  _id: string;
  nombre: string;
  tipoEntrenamiento: string;
  puntajeTotal: number;
  historial: { puntaje: number; tipoEntrenamiento: string; fecha: string }[];
  createdAt: string;
}

interface RankingItem {
  _id: string;
  nombre: string;
  tipoEntrenamiento: string;
  puntajeTotal: number;
  puntajePeriodo?: number;
}

type ModalType =
  | "none"
  | "addAlumno"
  | "addPuntaje"
  | "compare2"
  | "compareAll"
  | "showAlumno"
  | "rankingSemana"
  | "rankingMes";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// ── Spinner ──
function Spinner({
  size = 20,
  color = COLORS.accent,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      style={{ display: "block" }}
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

// ── Medal Icon ──
function MedalIcon({ rank }: { rank: number }) {
  if (rank > 3)
    return (
      <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.textMuted }}>
        #{rank}
      </span>
    );
  const color = MEDAL_COLORS[rank - 1];
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="7" fill={color} opacity="0.2" />
      <circle cx="12" cy="10" r="5" fill={color} />
      <text
        x="12"
        y="13"
        textAnchor="middle"
        fill="#fff"
        fontSize="8"
        fontWeight="bold"
      >
        {rank}
      </text>
      <path d="M8 16l-2 6 6-3 6 3-2-6" fill={color} opacity="0.5" />
    </svg>
  );
}

// ── Overlay / Modal ──
function ModalOverlay({
  open,
  onClose,
  title,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "90%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          animation: "slideUp 0.25s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: "linear-gradient(135deg, #232f3e 0%, #2d3a4a 100%)",
            borderRadius: "16px 16px 0 0",
          }}
        >
          <h3
            style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.background =
                "rgba(255,255,255,0.25)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.background =
                "rgba(255,255,255,0.15)")
            }
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Input Component ──
function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.text,
          marginBottom: 6,
        }}
      >
        {label} {required && <span style={{ color: COLORS.danger }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: 10,
          fontSize: 14,
          fontFamily: FONT,
          outline: "none",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
        onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
      />
    </div>
  );
}

// ── Select Component ──
function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.text,
          marginBottom: 6,
        }}
      >
        {label} <span style={{ color: COLORS.danger }}>*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: 10,
          fontSize: 14,
          fontFamily: FONT,
          outline: "none",
          background: "#fff",
          cursor: "pointer",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
          appearance: "auto",
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
        onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
      >
        <option value="">{placeholder || "Seleccionar..."}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Button Component ──
function Btn({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  icon,
  size = "md",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "ghost"
    | "outline"
    | "gold";
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md";
}) {
  const styles: Record<
    string,
    { bg: string; color: string; border: string; hoverBg: string }
  > = {
    primary: {
      bg: COLORS.accent,
      color: "#fff",
      border: "none",
      hoverBg: COLORS.accentDark,
    },
    secondary: {
      bg: COLORS.navy,
      color: "#fff",
      border: "none",
      hoverBg: COLORS.navyLight,
    },
    success: {
      bg: COLORS.success,
      color: "#fff",
      border: "none",
      hoverBg: "#047857",
    },
    danger: {
      bg: COLORS.danger,
      color: "#fff",
      border: "none",
      hoverBg: "#b91c1c",
    },
    ghost: {
      bg: "transparent",
      color: COLORS.text,
      border: `1.5px solid ${COLORS.border}`,
      hoverBg: "#f3f4f6",
    },
    outline: {
      bg: "transparent",
      color: COLORS.accent,
      border: `1.5px solid ${COLORS.accent}`,
      hoverBg: COLORS.accentLight,
    },
    gold: {
      bg: COLORS.gold,
      color: "#fff",
      border: "none",
      hoverBg: "#e68a00",
    },
  };
  const s = styles[variant];
  const pad = size === "sm" ? "7px 14px" : "10px 20px";
  const fs = size === "sm" ? 12 : 13;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: pad,
        background: disabled ? "#d1d5db" : s.bg,
        color: disabled ? "#9ca3af" : s.color,
        border: s.border,
        borderRadius: 10,
        fontSize: fs,
        fontWeight: 600,
        fontFamily: FONT,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = s.hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = s.bg;
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Stat Card ──
function StatCard({
  label,
  value,
  icon,
  accent,
  bg,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "20px 22px",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: COLORS.textLight,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: accent,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════
function AlumnosPractica() {
  const { token } = useAuth();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>("none");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Add Alumno form
  const [newNombre, setNewNombre] = useState("");
  const [newTipo, setNewTipo] = useState("");
  const [newPuntaje, setNewPuntaje] = useState("");

  // Add Puntaje form
  const [selAlumnoId, setSelAlumnoId] = useState("");
  const [addTipo, setAddTipo] = useState("");
  const [addPuntaje, setAddPuntaje] = useState("");

  // Compare 2
  const [cmp1, setCmp1] = useState("");
  const [cmp2, setCmp2] = useState("");

  // Show specific
  const [showAlumnoId, setShowAlumnoId] = useState("");

  // Ranking filters
  const [rankingData, setRankingData] = useState<RankingItem[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [selectedMes, setSelectedMes] = useState(String(new Date().getMonth()));
  const [selectedAnio, setSelectedAnio] = useState(
    String(new Date().getFullYear()),
  );

  // ── Fetch alumnos ──
  const fetchAlumnos = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/alumnos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data?.alumnos)) {
        setAlumnos(data.alumnos);
      }
    } catch {
      showToast("Error al cargar alumnos", "error");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  // ── Toast ──
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Add Alumno ──
  const handleAddAlumno = async () => {
    if (!newNombre.trim() || !newTipo.trim() || !newPuntaje.trim()) {
      showToast("Todos los campos son requeridos", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/alumnos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: newNombre,
          tipoEntrenamiento: newTipo,
          puntaje: Number(newPuntaje),
        }),
      });
      if (res.ok) {
        showToast(`Alumno "${newNombre}" agregado exitosamente`, "success");
        setNewNombre("");
        setNewTipo("");
        setNewPuntaje("");
        setModal("none");
        fetchAlumnos();
      } else {
        const d = await res.json();
        showToast(d.error || "Error al crear alumno", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
    setSaving(false);
  };

  // ── Add Puntaje ──
  const handleAddPuntaje = async () => {
    if (!selAlumnoId || !addTipo.trim() || !addPuntaje.trim()) {
      showToast("Todos los campos son requeridos", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/alumnos/puntaje", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alumnoId: selAlumnoId,
          tipoEntrenamiento: addTipo,
          puntaje: Number(addPuntaje),
        }),
      });
      if (res.ok) {
        const alumnoName =
          alumnos.find((a) => a._id === selAlumnoId)?.nombre || "";
        showToast(`+${addPuntaje} puntos para "${alumnoName}"`, "success");
        setSelAlumnoId("");
        setAddTipo("");
        setAddPuntaje("");
        setModal("none");
        fetchAlumnos();
      } else {
        const d = await res.json();
        showToast(d.error || "Error al agregar puntaje", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
    setSaving(false);
  };

  // ── Fetch Ranking ──
  const fetchRanking = async (periodo: string, mes?: string, anio?: string) => {
    setRankingLoading(true);
    try {
      const params = new URLSearchParams({ periodo });
      if (mes !== undefined) params.set("mes", mes);
      if (anio) params.set("anio", anio);
      const res = await fetch(`/api/alumnos/ranking?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRankingData(data.ranking);
      }
    } catch {
      showToast("Error al obtener ranking", "error");
    }
    setRankingLoading(false);
  };

  // ── Derived data ──
  const sortedAlumnos = useMemo(
    () => [...alumnos].sort((a, b) => b.puntajeTotal - a.puntajeTotal),
    [alumnos],
  );

  const topAlumno = sortedAlumnos[0];
  const totalPuntos = alumnos.reduce((s, a) => s + a.puntajeTotal, 0);
  const promedio = alumnos.length
    ? Math.round(totalPuntos / alumnos.length)
    : 0;

  const alumno1 = alumnos.find((a) => a._id === cmp1);
  const alumno2 = alumnos.find((a) => a._id === cmp2);
  const alumnoDetalle = alumnos.find((a) => a._id === showAlumnoId);

  // ── Chart colors ──
  const chartColors = [
    "#ff6200",
    "#2563eb",
    "#059669",
    "#7c3aed",
    "#0891b2",
    "#dc2626",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#ef4444",
    "#6366f1",
    "#14b8a6",
    "#f97316",
    "#84cc16",
  ];

  return (
    <div style={{ fontFamily: FONT, maxWidth: 1300 }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 2000,
            padding: "14px 24px",
            borderRadius: 12,
            background:
              toast.type === "success" ? COLORS.success : COLORS.danger,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: FONT,
            boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
            animation: "slideUp 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: COLORS.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: COLORS.accent }}>🏆</span> Ranking de Alumnos
          </h1>
          <p
            style={{ fontSize: 14, color: COLORS.textMuted, margin: "4px 0 0" }}
          >
            Dashboard de seguimiento y puntaje acumulativo
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn
            variant="primary"
            onClick={() => setModal("addAlumno")}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            }
          >
            Agregar Alumno
          </Btn>
          <Btn
            variant="gold"
            onClick={() => setModal("addPuntaje")}
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            }
          >
            Agregar Puntaje
          </Btn>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Total Alumnos"
          value={loading ? <Spinner /> : String(alumnos.length)}
          accent={COLORS.accent}
          bg={COLORS.accentLight}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.accent}
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Puntos Totales"
          value={loading ? <Spinner /> : totalPuntos.toLocaleString()}
          accent={COLORS.info}
          bg={COLORS.infoBg}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.info}
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
        />
        <StatCard
          label="Promedio"
          value={loading ? <Spinner /> : promedio.toLocaleString()}
          accent={COLORS.purple}
          bg={COLORS.purpleBg}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.purple}
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          }
        />
        <StatCard
          label="Líder Actual"
          value={
            loading ? (
              <Spinner />
            ) : topAlumno ? (
              topAlumno.nombre.split(" ")[0]
            ) : (
              "—"
            )
          }
          accent={COLORS.gold}
          bg={COLORS.warningBg}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.gold}
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 7 12 7s5-3 7.5-3a2.5 2.5 0 0 1 0 5H18" />
              <path d="M18 9v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
            </svg>
          }
        />
      </div>

      {/* ── Main Ranking Table ── */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(135deg, #232f3e 0%, #37475a 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏅</span>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Ranking General
            </h2>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} registrado
            {alumnos.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Spinner size={30} />
            <p style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 13 }}>
              Cargando ranking...
            </p>
          </div>
        ) : sortedAlumnos.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0 }}>
              No hay alumnos registrados. Agrega el primer alumno usando el
              botón superior.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafbfc" }}>
                  <th style={{ ...thStyle, width: 60, textAlign: "center" }}>
                    #
                  </th>
                  <th style={thStyle}>Nombre Alumno</th>
                  <th style={thStyle}>Tipo de Entrenamiento</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>
                    Puntaje Actitud
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAlumnos.map((alumno, i) => {
                  const rank = i + 1;
                  const isTop3 = rank <= 3;
                  return (
                    <tr
                      key={alumno._id}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                        background: isTop3
                          ? rank === 1
                            ? "linear-gradient(90deg, rgba(255,215,0,0.06) 0%, transparent 100%)"
                            : rank === 2
                              ? "linear-gradient(90deg, rgba(192,192,192,0.06) 0%, transparent 100%)"
                              : "linear-gradient(90deg, rgba(205,127,50,0.06) 0%, transparent 100%)"
                          : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isTop3)
                          e.currentTarget.style.background = "#fafbfc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isTop3)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <MedalIcon rank={rank} />
                      </td>
                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: isTop3
                                ? `linear-gradient(135deg, ${MEDAL_COLORS[rank - 1]}88, ${MEDAL_COLORS[rank - 1]})`
                                : `linear-gradient(135deg, ${COLORS.accent}88, ${COLORS.accent})`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#fff",
                              flexShrink: 0,
                            }}
                          >
                            {alumno.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: COLORS.text,
                              }}
                            >
                              {alumno.nombre}
                            </div>
                            <div
                              style={{ fontSize: 11, color: COLORS.textLight }}
                            >
                              {alumno.historial?.length || 0} registro
                              {(alumno.historial?.length || 0) !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 12px",
                            background: COLORS.infoBg,
                            color: COLORS.info,
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: COLORS.info,
                            }}
                          />
                          {alumno.tipoEntrenamiento}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: isTop3
                              ? MEDAL_COLORS[rank - 1]
                              : COLORS.accent,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {alumno.puntajeTotal.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: COLORS.textLight,
                            marginLeft: 4,
                          }}
                        >
                          pts
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: COLORS.text,
            margin: "0 0 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={COLORS.accent}
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Herramientas de Análisis
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Btn
            variant="outline"
            onClick={() => {
              setCmp1("");
              setCmp2("");
              setModal("compare2");
            }}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 3h5v5" />
                <path d="M8 3H3v5" />
                <path d="M21 3l-7 7" />
                <path d="M3 3l7 7" />
                <path d="M16 21h5v-5" />
                <path d="M8 21H3v-5" />
                <path d="M21 21l-7-7" />
                <path d="M3 21l7-7" />
              </svg>
            }
            size="sm"
          >
            Comparar 2 Alumnos
          </Btn>
          <Btn
            variant="outline"
            onClick={() => {
              setModal("compareAll");
            }}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            }
            size="sm"
          >
            Comparar Todos
          </Btn>
          <Btn
            variant="outline"
            onClick={() => {
              setShowAlumnoId("");
              setModal("showAlumno");
            }}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            size="sm"
          >
            Ver Alumno Específico
          </Btn>
          <Btn
            variant="secondary"
            onClick={() => {
              fetchRanking("semana");
              setModal("rankingSemana");
            }}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            size="sm"
          >
            Ranking de la Semana
          </Btn>
          <Btn
            variant="success"
            onClick={() => {
              setSelectedMes(String(new Date().getMonth()));
              setSelectedAnio(String(new Date().getFullYear()));
              fetchRanking(
                "mes",
                String(new Date().getMonth()),
                String(new Date().getFullYear()),
              );
              setModal("rankingMes");
            }}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="14" x2="8" y2="18" />
                <line x1="12" y1="14" x2="12" y2="18" />
                <line x1="16" y1="14" x2="16" y2="18" />
              </svg>
            }
            size="sm"
          >
            Ranking del Mes
          </Btn>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════ */}

      {/* ── Modal: Agregar Alumno ── */}
      <ModalOverlay
        open={modal === "addAlumno"}
        onClose={() => setModal("none")}
        title="Agregar Nuevo Alumno"
      >
        <FormInput
          label="Nombre del Alumno"
          value={newNombre}
          onChange={setNewNombre}
          placeholder="Ej: Juan Pérez"
        />
        <FormInput
          label="Tipo de Entrenamiento"
          value={newTipo}
          onChange={setNewTipo}
          placeholder="Ej: Resistencia, Fuerza, Cardio"
        />
        <FormInput
          label="Puntaje Inicial"
          value={newPuntaje}
          onChange={setNewPuntaje}
          type="number"
          placeholder="Ej: 100"
        />
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <Btn variant="ghost" onClick={() => setModal("none")}>
            Cancelar
          </Btn>
          <Btn variant="primary" onClick={handleAddAlumno} disabled={saving}>
            {saving ? <Spinner size={14} color="#fff" /> : null}
            {saving ? "Guardando..." : "Agregar Alumno"}
          </Btn>
        </div>
      </ModalOverlay>

      {/* ── Modal: Agregar Puntaje ── */}
      <ModalOverlay
        open={modal === "addPuntaje"}
        onClose={() => setModal("none")}
        title="Agregar Puntaje"
      >
        <FormSelect
          label="Seleccionar Alumno"
          value={selAlumnoId}
          onChange={setSelAlumnoId}
          options={sortedAlumnos.map((a) => ({
            value: a._id,
            label: `${a.nombre} (${a.puntajeTotal} pts)`,
          }))}
          placeholder="Seleccionar alumno..."
        />
        <FormInput
          label="Tipo de Entrenamiento"
          value={addTipo}
          onChange={setAddTipo}
          placeholder="Ej: Fuerza, Velocidad, Técnica"
        />
        <FormInput
          label="Puntaje a Agregar"
          value={addPuntaje}
          onChange={setAddPuntaje}
          type="number"
          placeholder="Ej: 50"
        />
        {selAlumnoId && (
          <div
            style={{
              background: COLORS.accentLight,
              borderRadius: 10,
              padding: 14,
              marginBottom: 10,
              border: `1px solid ${COLORS.accent}20`,
            }}
          >
            <div
              style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}
            >
              Puntaje actual:
            </div>
            <div
              style={{ fontSize: 22, fontWeight: 800, color: COLORS.accent }}
            >
              {alumnos
                .find((a) => a._id === selAlumnoId)
                ?.puntajeTotal.toLocaleString() || 0}{" "}
              pts
            </div>
            {addPuntaje && Number(addPuntaje) > 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: COLORS.success,
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                → Nuevo total:{" "}
                {(
                  (alumnos.find((a) => a._id === selAlumnoId)?.puntajeTotal ||
                    0) + Number(addPuntaje)
                ).toLocaleString()}{" "}
                pts
              </div>
            )}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <Btn variant="ghost" onClick={() => setModal("none")}>
            Cancelar
          </Btn>
          <Btn variant="gold" onClick={handleAddPuntaje} disabled={saving}>
            {saving ? <Spinner size={14} color="#fff" /> : null}
            {saving ? "Guardando..." : "Agregar Puntaje"}
          </Btn>
        </div>
      </ModalOverlay>

      {/* ── Modal: Comparar 2 Alumnos ── */}
      <ModalOverlay
        open={modal === "compare2"}
        onClose={() => setModal("none")}
        title="Comparar 2 Alumnos"
        width={700}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <FormSelect
            label="Alumno 1"
            value={cmp1}
            onChange={setCmp1}
            options={sortedAlumnos
              .filter((a) => a._id !== cmp2)
              .map((a) => ({ value: a._id, label: a.nombre }))}
          />
          <FormSelect
            label="Alumno 2"
            value={cmp2}
            onChange={setCmp2}
            options={sortedAlumnos
              .filter((a) => a._id !== cmp1)
              .map((a) => ({ value: a._id, label: a.nombre }))}
          />
        </div>
        {alumno1 && alumno2 && (
          <div>
            {/* Visual comparison */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: 20,
                marginBottom: 24,
              }}
            >
              <CompareCard
                alumno={alumno1}
                isWinner={alumno1.puntajeTotal > alumno2.puntajeTotal}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #232f3e, #37475a)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  VS
                </div>
              </div>
              <CompareCard
                alumno={alumno2}
                isWinner={alumno2.puntajeTotal > alumno1.puntajeTotal}
              />
            </div>
            {/* Bar chart comparison */}
            <div style={{ height: 250 }}>
              <Bar
                data={{
                  labels: [alumno1.nombre, alumno2.nombre],
                  datasets: [
                    {
                      label: "Puntaje Total",
                      data: [alumno1.puntajeTotal, alumno2.puntajeTotal],
                      backgroundColor: [
                        COLORS.accent + "CC",
                        COLORS.info + "CC",
                      ],
                      borderColor: [COLORS.accent, COLORS.info],
                      borderWidth: 2,
                      borderRadius: 8,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: "#f0f0f0" } },
                  },
                }}
              />
            </div>
          </div>
        )}
      </ModalOverlay>

      {/* ── Modal: Comparar Todos ── */}
      <ModalOverlay
        open={modal === "compareAll"}
        onClose={() => setModal("none")}
        title="Comparativa General"
        width={800}
      >
        {sortedAlumnos.length > 0 ? (
          <div
            style={{ height: Math.max(300, sortedAlumnos.length * 40 + 60) }}
          >
            <Bar
              data={{
                labels: sortedAlumnos.map((a) => a.nombre),
                datasets: [
                  {
                    label: "Puntaje Total",
                    data: sortedAlumnos.map((a) => a.puntajeTotal),
                    backgroundColor: sortedAlumnos.map(
                      (_, i) => chartColors[i % chartColors.length] + "CC",
                    ),
                    borderColor: sortedAlumnos.map(
                      (_, i) => chartColors[i % chartColors.length],
                    ),
                    borderWidth: 2,
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) =>
                        `${(ctx.parsed.x ?? 0).toLocaleString()} puntos`,
                    },
                  },
                },
                scales: {
                  x: { beginAtZero: true, grid: { color: "#f0f0f0" } },
                  y: { grid: { display: false } },
                },
              }}
            />
          </div>
        ) : (
          <p style={{ textAlign: "center", color: COLORS.textMuted }}>
            No hay alumnos para comparar.
          </p>
        )}
      </ModalOverlay>

      {/* ── Modal: Ver Alumno Específico ── */}
      <ModalOverlay
        open={modal === "showAlumno"}
        onClose={() => setModal("none")}
        title="Detalle de Alumno"
        width={650}
      >
        <FormSelect
          label="Seleccionar Alumno"
          value={showAlumnoId}
          onChange={setShowAlumnoId}
          options={sortedAlumnos.map((a) => ({
            value: a._id,
            label: a.nombre,
          }))}
        />
        {alumnoDetalle && (
          <div>
            {/* Summary Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #232f3e 0%, #37475a 100%)",
                borderRadius: 14,
                padding: 24,
                marginBottom: 20,
                color: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${COLORS.accent}88, ${COLORS.accent})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {alumnoDetalle.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                    {alumnoDetalle.nombre}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    Entrenamiento: {alumnoDetalle.tipoEntrenamiento}
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: 14,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 4,
                    }}
                  >
                    PUNTAJE TOTAL
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: COLORS.gold,
                    }}
                  >
                    {alumnoDetalle.puntajeTotal.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: 14,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 4,
                    }}
                  >
                    POSICIÓN
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>
                    #
                    {sortedAlumnos.findIndex(
                      (a) => a._id === alumnoDetalle._id,
                    ) + 1}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: 14,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 4,
                    }}
                  >
                    REGISTROS
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>
                    {alumnoDetalle.historial?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* History Chart */}
            {alumnoDetalle.historial && alumnoDetalle.historial.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: COLORS.text,
                    margin: "0 0 12px",
                  }}
                >
                  Evolución de Puntaje
                </h4>
                <div style={{ height: 220 }}>
                  <Line
                    data={{
                      labels: alumnoDetalle.historial.map((h) =>
                        new Date(h.fecha).toLocaleDateString("es-CL", {
                          day: "2-digit",
                          month: "short",
                        }),
                      ),
                      datasets: [
                        {
                          label: "Puntaje",
                          data: alumnoDetalle.historial.reduce(
                            (acc: number[], h) => {
                              const prev =
                                acc.length > 0 ? acc[acc.length - 1] : 0;
                              acc.push(prev + h.puntaje);
                              return acc;
                            },
                            [],
                          ),
                          borderColor: COLORS.accent,
                          backgroundColor: COLORS.accent + "20",
                          fill: true,
                          tension: 0.4,
                          pointRadius: 5,
                          pointBackgroundColor: COLORS.accent,
                          pointBorderColor: "#fff",
                          pointBorderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, grid: { color: "#f0f0f0" } },
                        x: { grid: { display: false } },
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {/* History Table */}
            {alumnoDetalle.historial && alumnoDetalle.historial.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: COLORS.text,
                    margin: "0 0 12px",
                  }}
                >
                  Historial de Puntajes
                </h4>
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: "auto",
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          background: "#fafbfc",
                          position: "sticky",
                          top: 0,
                        }}
                      >
                        <th style={{ ...thStyleSm }}>Fecha</th>
                        <th style={{ ...thStyleSm }}>Entrenamiento</th>
                        <th style={{ ...thStyleSm, textAlign: "right" }}>
                          Puntaje
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...alumnoDetalle.historial].reverse().map((h, i) => (
                        <tr
                          key={i}
                          style={{ borderBottom: `1px solid ${COLORS.border}` }}
                        >
                          <td style={tdStyleSm}>
                            {new Date(h.fecha).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td style={tdStyleSm}>{h.tipoEntrenamiento}</td>
                          <td
                            style={{
                              ...tdStyleSm,
                              textAlign: "right",
                              fontWeight: 700,
                              color: COLORS.success,
                            }}
                          >
                            +{h.puntaje}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalOverlay>

      {/* ── Modal: Ranking de la Semana ── */}
      <ModalOverlay
        open={modal === "rankingSemana"}
        onClose={() => setModal("none")}
        title="🗓️ Ranking de la Semana"
        width={650}
      >
        {rankingLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Spinner size={24} />
          </div>
        ) : (
          <RankingTable
            data={rankingData}
            periodKey="puntajePeriodo"
            periodLabel="Puntos esta Semana"
          />
        )}
      </ModalOverlay>

      {/* ── Modal: Ranking del Mes ── */}
      <ModalOverlay
        open={modal === "rankingMes"}
        onClose={() => setModal("none")}
        title="📅 Ranking del Mes"
        width={700}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <FormSelect
            label="Mes"
            value={selectedMes}
            onChange={(v) => {
              setSelectedMes(v);
              fetchRanking("mes", v, selectedAnio);
            }}
            options={MESES.map((m, i) => ({ value: String(i), label: m }))}
          />
          <FormSelect
            label="Año"
            value={selectedAnio}
            onChange={(v) => {
              setSelectedAnio(v);
              fetchRanking("mes", selectedMes, v);
            }}
            options={Array.from({ length: 5 }, (_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return { value: String(y), label: String(y) };
            })}
          />
        </div>
        <div
          style={{
            background: COLORS.infoBg,
            borderRadius: 10,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: COLORS.info,
            fontWeight: 600,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Mostrando ranking de {MESES[Number(selectedMes)]} {selectedAnio}
        </div>
        {rankingLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Spinner size={24} />
          </div>
        ) : (
          <RankingTable
            data={rankingData}
            periodKey="puntajePeriodo"
            periodLabel={`Puntos en ${MESES[Number(selectedMes)]}`}
          />
        )}
      </ModalOverlay>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function CompareCard({
  alumno,
  isWinner,
}: {
  alumno: Alumno;
  isWinner: boolean;
}) {
  return (
    <div
      style={{
        background: isWinner ? COLORS.successBg : "#fff",
        border: `2px solid ${isWinner ? COLORS.success : COLORS.border}`,
        borderRadius: 14,
        padding: 20,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isWinner && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: COLORS.success,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          LÍDER
        </div>
      )}
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${COLORS.accent}88, ${COLORS.accent})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 800,
          color: "#fff",
          margin: "0 auto 12px",
        }}
      >
        {alumno.nombre.charAt(0).toUpperCase()}
      </div>
      <h4
        style={{
          margin: "0 0 4px",
          fontSize: 16,
          fontWeight: 700,
          color: COLORS.text,
        }}
      >
        {alumno.nombre}
      </h4>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.textMuted }}>
        {alumno.tipoEntrenamiento}
      </p>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: isWinner ? COLORS.success : COLORS.accent,
        }}
      >
        {alumno.puntajeTotal.toLocaleString()}
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: COLORS.textLight,
            marginLeft: 4,
          }}
        >
          pts
        </span>
      </div>
    </div>
  );
}

function RankingTable({
  data,
  periodKey,
  periodLabel,
}: {
  data: RankingItem[];
  periodKey: string;
  periodLabel: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 30,
          color: COLORS.textMuted,
          fontSize: 13,
        }}
      >
        No hay datos para este período.
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#fafbfc" }}>
            <th style={{ ...thStyleSm, width: 50, textAlign: "center" }}>#</th>
            <th style={thStyleSm}>Alumno</th>
            <th style={thStyleSm}>Entrenamiento</th>
            <th style={{ ...thStyleSm, textAlign: "right" }}>{periodLabel}</th>
            <th style={{ ...thStyleSm, textAlign: "right" }}>
              Total Acumulado
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => {
            const score =
              (item as unknown as Record<string, number>)[periodKey] ??
              item.puntajeTotal;
            return (
              <tr
                key={item._id}
                style={{ borderBottom: `1px solid ${COLORS.border}` }}
              >
                <td style={{ ...tdStyleSm, textAlign: "center" }}>
                  <MedalIcon rank={i + 1} />
                </td>
                <td style={{ ...tdStyleSm, fontWeight: 600 }}>{item.nombre}</td>
                <td style={tdStyleSm}>
                  <span
                    style={{
                      padding: "2px 10px",
                      background: COLORS.infoBg,
                      color: COLORS.info,
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {item.tipoEntrenamiento}
                  </span>
                </td>
                <td
                  style={{
                    ...tdStyleSm,
                    textAlign: "right",
                    fontWeight: 700,
                    color: score > 0 ? COLORS.success : COLORS.textLight,
                  }}
                >
                  {score > 0 ? `+${score.toLocaleString()}` : "0"}
                </td>
                <td
                  style={{
                    ...tdStyleSm,
                    textAlign: "right",
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {item.puntajeTotal.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Table styles ──
const thStyle: React.CSSProperties = {
  padding: "14px 20px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  borderBottom: `2px solid #e8ecf1`,
};

const tdStyle: React.CSSProperties = {
  padding: "14px 20px",
  fontSize: 14,
  color: "#1a1a1a",
  verticalAlign: "middle",
};

const thStyleSm: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  borderBottom: `2px solid #e8ecf1`,
};

const tdStyleSm: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "#1a1a1a",
  verticalAlign: "middle",
};

export default AlumnosPractica;
