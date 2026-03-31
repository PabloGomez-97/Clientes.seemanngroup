import { useState, useEffect, useCallback } from "react";

const tips = [
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
  "El Airbus A380 tiene una versión carguera que nunca llegó a producirse masivamente, aunque Airbus estudió convertir los modelos de pasajeros en retiro.",
  "La primera vez que se utilizó un código de barras para rastrear carga fue en los años 70 en EE.UU., aplicado inicialmente en vagones de ferrocarril.",
  "India planea construir el puerto de Vadhavan, que al completarse será uno de los 10 puertos más grandes del mundo con capacidad para 23 millones de TEUs.",
  "En la logística moderna, se estima que el 60% de los errores de entrega ocurren no en el transporte, sino en la gestión administrativa de los documentos.",
  "El 80% del comercio mundial viaja por mar",
  "Un contenedor de 40’ puede mover hasta 67 m³",
  "Shanghái es el puerto más activo del mundo",
  "El Canal de Panamá permite ahorrar miles de km",
  "El transporte aéreo mueve poco volumen, pero mucho valor",
  "Un error en el BL puede retrasar toda la carga",
  "El lead time puede variar por congestión portuaria",
  "Los contenedores reefer controlan temperatura y oxígeno",
  "Más de 20 millones de contenedores circulan en el mundo",
  "El flete marítimo es el más barato por kilo",
  "Los Incoterms definen quién paga qué en un envío",
  "Chile tiene acuerdos comerciales con más de 65 economías",
  "El tracking de barcos es posible en tiempo real (AIS)",
  "Rotterdam es el puerto más grande de Europa",
  "Un buque puede transportar más de 20.000 contenedores",
  "La logística puede representar hasta el 15% del costo",
  "FedEx opera el mayor hub de carga aérea en Memphis",
  "El pallet nació para uso militar en la Segunda Guerra Mundial",
  "Los drones ya se usan para entregas médicas",
  "El 'Just-in-Time' nació observando supermercados",
  "Los barcos modernos también usan energía eólica",
  "Más del 90% de los productos pasaron por un barco",
  "El transporte marítimo es clave para la globalización",
  "Los contenedores estandarizaron el comercio mundial",
  "La documentación causa la mayoría de errores logísticos",
];

function LoadingTips() {
  const getRandomIndex = useCallback(
    () => Math.floor(Math.random() * tips.length),
    [],
  );

  const [index, setIndex] = useState(getRandomIndex);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => {
        let next = getRandomIndex();
        while (next === prev) {
          next = getRandomIndex();
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [getRandomIndex]);

  return (
    <div className="osv-empty">
      <div className="osv-spinner" />
      <p className="osv-empty__subtitle">Cargando la información...</p>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: "1.5rem",
        }}
      >
        <div
          style={{
            width: "min(600px, calc(100% - 2rem))",
            borderRadius: "4px",
            padding: "1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            fontFamily:
              '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--primary-color, #ff6200)",
            }}
          >
            ¿Sabías que...?
          </span>
          <span
            style={{
              fontSize: "0.9rem",
              color: "var(--secondary-color, #1a1a1a)",
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            {tips[index]}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoadingTips;
