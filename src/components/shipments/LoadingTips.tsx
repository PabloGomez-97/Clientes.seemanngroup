import { useState, useEffect, useCallback, useRef } from "react";

const tips: string[] = [
  "En 2021, el buque Ever Given encalló en el Canal de Suez durante 6 días y bloqueó mercancías por más de USD 9,600 millones diarios.",
  "El primer contenedor marino estándar fue creado por Malcolm McLean en 1956. Antes de eso, descargar un barco tomaba semanas enteras.",
  "El puerto de Shanghái mueve más contenedores al año que todos los puertos de América Latina juntos.",
  "Durante la pandemia, el precio de fletar un contenedor de 40 pies de Asia a Sudamérica llegó a costar más de USD 20,000, cuando históricamente rondaba los USD 1,500.",
  "Hay más de 20 millones de contenedores en circulación en el mundo. Si los pusieras en fila, darían más de 5 vueltas a la Tierra.",
  "El aeropuerto de Memphis en EE.UU. es el mayor hub de carga aérea del mundo, gracias a FedEx, que tiene allí su sede central de operaciones.",
  "Un Boeing 747 carguero puede transportar el equivalente a unas 6 camionetas doble cabina en peso, pero su costo por kilo es casi 5 veces mayor que el barco.",
  "El Canal de Panamá fue ampliado en 2016 para permitir el paso de los llamados 'Neo-Panamax', barcos que pueden llevar hasta 14,000 TEUs.",
  "La ruta marítima Shanghái–Rotterdam es la más transitada del mundo y tarda aproximadamente 30 días.",
  "Existen contenedores especiales para transportar automóviles, ganado vivo, objetos de arte e incluso casas prefabricadas.",
  "Rotterdam es el puerto más grande de Europa y puede descargar un buque de 24,000 TEUs en menos de 48 horas usando grúas automatizadas.",
  "Se estima que cada año se pierden en el mar alrededor de 1,500 contenedores durante tormentas o maniobras de emergencia.",
  "El concepto de 'carga suelta' (LCL) existe desde antes de los contenedores: se consolidaban cargas de distintos dueños en bodegas de barcos de madera.",
  "La aviación de carga mueve solo el 1% del volumen del comercio mundial, pero representa cerca del 35% de su valor en dólares.",
  "En algunos países, el proceso de despacho de aduana puede tomar menos de 3 horas gracias a sistemas de ventanilla única electrónica.",
  "Chile es uno de los países con más TLCs del mundo: tiene acuerdos con más de 65 economías, incluyendo la Unión Europea, EE.UU., China y Japón.",
  "Los barcos portacontenedores más grandes del mundo, clase 'Evergreen A', tienen más de 400 metros de largo, casi como 4 torres Eiffel acostadas.",
  "El sistema AIS (Automatic Identification System) permite rastrear en tiempo real la posición de casi cualquier barco en el mundo desde tu celular.",
  "La logística representa en promedio el 10-15% del costo final de un producto. En países con infraestructura deficiente, puede superar el 30%.",
  "En el mundo hay más de 50,000 buques mercantes operativos. Si fueran una ciudad, sería la quinta más grande del planeta.",
  "El término 'flete' viene del neerlandés antiguo 'vracht', que significa carga. Los navegantes holandeses dominaron el comercio marítimo en el siglo XVII.",
  "El aeropuerto de Incheon, en Corea del Sur, ha sido elegido el mejor aeropuerto del mundo en manejo de carga múltiples veces por su eficiencia.",
  "Una de las rutas terrestres más largas del mundo es la ruta de la seda moderna: trenes de carga de China a Europa que recorren más de 11,000 km.",
  "Los contenedores reefer (refrigerados) tienen su propio sistema eléctrico y pueden mantener temperaturas entre -30°C y +30°C durante semanas.",
  "El puerto de Busan en Corea del Sur procesa más del 75% de toda la carga de exportación del país y está entre los 5 más activos del mundo.",
  "En promedio, cada persona en el mundo consume indirectamente los servicios de la cadena logística unas 4 veces al día.",
  "La primera vez que se utilizó un código de barras para rastrear carga fue en los años 70 en EE.UU., aplicado inicialmente en vagones de ferrocarril.",
  "India planea construir el puerto de Vadhavan, que al completarse será uno de los 10 puertos más grandes del mundo con capacidad para 23 millones de TEUs.",
  "En la logística moderna, se estima que el 60% de los errores de entrega ocurren no en el transporte, sino en la gestión administrativa de los documentos.",
  "El 80% del comercio mundial viaja por mar.",
  "Un contenedor de 40' puede mover hasta 67 m³ de carga.",
  "Shanghái es el puerto más activo del mundo por volumen de TEUs.",
  "El Canal de Panamá permite ahorrar miles de kilómetros en rutas transoceánicas.",
  "El transporte aéreo mueve poco volumen, pero concentra gran parte del valor global.",
  "Un error en el Bill of Lading puede retrasar toda la carga indefinidamente.",
  "El lead time puede variar significativamente por congestión portuaria.",
  "Los contenedores reefer controlan temperatura y niveles de oxígeno simultáneamente.",
  "Más de 20 millones de contenedores circulan en el mundo en todo momento.",
  "El flete marítimo es el modo de transporte más barato por kilo transportado.",
  "Los Incoterms definen con precisión quién paga qué en cada etapa de un envío.",
  "El tracking de barcos es posible en tiempo real gracias al sistema AIS.",
  "Un buque moderno puede transportar más de 20,000 contenedores en un solo viaje.",
  "FedEx opera el mayor hub de carga aérea del mundo en Memphis, Tennessee.",
  "El pallet fue desarrollado originalmente para uso militar durante la Segunda Guerra Mundial.",
  "Los barcos modernos también experimentan con energía eólica para reducir emisiones.",
  "Más del 90% de los productos manufacturados pasaron por un barco en algún punto.",
  "Los contenedores estandarizaron el comercio mundial y redujeron costos radicalmente.",
  "La documentación incorrecta es la principal causa de errores en logística internacional.",
];

const INTERVAL_MS = 3000;
const DOT_COUNT = 5;
const ACCENT = "#ff6200";

function shuffleIndices(length: number): number[] {
  return [...Array(length).keys()].sort(() => Math.random() - 0.5);
}

export default function LoadingTips() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedTip, setDisplayedTip] = useState("");
  const [visible, setVisible] = useState(true);
  const [progressKey, setProgressKey] = useState(0);

  const orderRef = useRef<number[]>(shuffleIndices(tips.length));

  const getTip = useCallback((idx: number): string => {
    return tips[orderRef.current[idx % orderRef.current.length]];
  }, []);

  useEffect(() => {
    setDisplayedTip(getTip(0));
  }, [getTip]);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          setDisplayedTip(getTip(next));
          setProgressKey((k) => k + 1);
          return next;
        });
        setVisible(true);
      }, 280);
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [getTip]);

  const displayNumber = (currentIndex % tips.length) + 1;
  const activeDot = currentIndex % DOT_COUNT;

  return (
    <div style={styles.root}>
      {/* Spinner + label */}
      <div style={styles.spinnerWrap}>
        <svg
          style={styles.spinnerSvg}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="10" cy="10" r="8" stroke="#e0e0e0" strokeWidth="2" />
          <path
            d="M10 2a8 8 0 0 1 8 8"
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span style={styles.spinnerLabel}>Cargando la información...</span>
      </div>

      {/* Card */}
      <div style={styles.cardOuter}>
        <div
          style={{
            ...styles.card,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(5px)",
          }}
        >
          {/* Left accent bar */}
          <div style={styles.accentBar} />

          {/* Content */}
          <div style={styles.cardBody}>
            <div style={styles.cardHeader}>
              <span style={styles.label}>¿Sabías que...?</span>
              <span style={styles.counter}>
                {displayNumber} / {tips.length}
              </span>
            </div>
            <p style={styles.tipText}>{displayedTip}</p>
          </div>

          {/* Progress bar */}
          <div style={styles.progressTrack}>
            <div
              key={progressKey}
              style={{
                ...styles.progressFill,
                animationDuration: `${INTERVAL_MS}ms`,
              }}
            />
          </div>
        </div>

        {/* Dots */}
        <div style={styles.dots}>
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === activeDot ? ACCENT : "#d0d0d0",
                opacity: i === activeDot ? 0.8 : 0.35,
                transform: i === activeDot ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes osv-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes osv-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .osv-spinner-anim {
          animation: osv-spin 1s linear infinite;
        }
        .osv-progress-anim {
          animation: osv-progress linear forwards;
        }
      `}</style>
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.75rem",
    padding: "2rem 0",
    fontFamily:
      '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  spinnerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  spinnerSvg: {
    width: 22,
    height: 22,
    animation: "osv-spin 1s linear infinite",
  } as React.CSSProperties,
  spinnerLabel: {
    fontSize: "0.8125rem",
    color: "#999",
    letterSpacing: "0.02em",
  },
  cardOuter: {
    width: "min(560px, calc(100% - 2rem))",
    display: "flex",
    flexDirection: "column",
    gap: "0.875rem",
  },
  card: {
    background: "#30302e",
    border: "0.5px solid #e8e8e8",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    flexDirection: "row",
    transition: "opacity 0.28s ease, transform 0.28s ease",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  accentBar: {
    width: 3,
    flexShrink: 0,
    background: ACCENT,
    borderRadius: "12px 0 0 0",
  },
  cardBody: {
    flex: 1,
    padding: "1.25rem 1.5rem 1.125rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.625rem",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.09em",
    textTransform: "uppercase" as const,
    color: ACCENT,
  },
  counter: {
    fontSize: "0.6875rem",
    color: "#888",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "0.04em",
  },
  tipText: {
    fontSize: "0.9375rem",
    color: "#ffffff",
    lineHeight: 1.65,
    margin: 0,
    fontWeight: 400,
    minHeight: 60,
  },
  progressTrack: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    background: "#f0f0f0",
  },
  progressFill: {
    height: "100%",
    background: ACCENT,
    opacity: 0.5,
    animation: "osv-progress linear forwards",
  } as React.CSSProperties,
  dots: {
    display: "flex",
    justifyContent: "center",
    gap: "0.4rem",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    transition: "background 0.3s ease, opacity 0.3s ease, transform 0.3s ease",
  },
};
