export type LegalBlock =
  | { type: "para"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "kv"; items: { label: string; value: string }[] }
  | { type: "callout"; title: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type LegalSection = {
  id: string;
  number: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  effectiveDate: string;
  introTitle: string;
  introText: string;
  sections: LegalSection[];
};

export const privacyPolicyDocument: LegalDocument = {
  title: "Política de Privacidad",
  lastUpdated: "22 de julio de 2026",
  effectiveDate: "1 de enero de 2024",
  introTitle: "Resumen ejecutivo",
  introText:
    "En Seemann Group S.A. tratamos sus datos personales con la máxima responsabilidad, de conformidad con el ordenamiento jurídico de la República de Chile. Esta Política explica qué datos recabamos, con qué finalidad, bajo qué supuestos jurídicos, qué derechos le asisten y cómo puede ejercerlos —incluyendo el uso del Portal de Clientes y de la aplicación móvil Seemann Group—. Le recomendamos leerla íntegramente antes de utilizar nuestros servicios. La versión pública actualizada también está disponible en https://www.seemanngroup.com/privacidad.",
  sections: [
    {
      id: "s1",
      number: "Artículo 01",
      title: "Responsable del Tratamiento de Datos",
      blocks: [
        {
          type: "para",
          text: "El responsable del tratamiento de sus datos personales es:",
        },
        {
          type: "kv",
          items: [
            { label: "Razón Social", value: "Seemann Group S.A." },
            {
              label: "Domicilio Social",
              value: "Av. Libertad #1405, of. 1203, Viña del Mar, Chile",
            },
            { label: "RUT", value: "-" },
            {
              label: "Correo de Privacidad",
              value: "privacidad@seemanngroup.com",
            },
            {
              label: "Correo general",
              value: "contacto@seemanngroup.com",
            },
            { label: "Teléfono", value: "+56 2 2604 8386" },
            {
              label: "Contacto de protección de datos",
              value: "pablo@sphereglobal.io",
            },
          ],
        },
        {
          type: "para",
          text: "Esta Política se rige por la Constitución Política de la República de Chile, en particular el artículo 19 Nº 4 (protección de la vida privada y de los datos personales), y por la Ley Nº 19.628, sobre protección de la vida privada, en su texto vigente. Asimismo, Seemann Group reconoce la Ley Nº 21.719 (publicada el 13 de diciembre de 2024), que reforma de manera integral la Ley Nº 19.628 y crea la Agencia de Protección de Datos Personales (APDP), cuya entrada en vigor plena está fijada para el 1 de diciembre de 2026. La Compañía ya prepara el cumplimiento del marco reformado y aplicará las nuevas obligaciones a medida que entren en vigor.",
        },
      ],
    },
    {
      id: "s2",
      number: "Artículo 02",
      title: "Datos Personales que Recopilamos",
      blocks: [
        {
          type: "para",
          text: "Recopilamos distintas categorías de datos personales según el tipo de interacción que usted mantiene con nosotros:",
        },
        {
          type: "table",
          headers: ["Categoría", "Datos específicos", "Fuente"],
          rows: [
            [
              "Datos de identificación",
              "Nombre completo, cédula de identidad, pasaporte, RUT u otro identificador empresarial o personal",
              "Proporcionados por el usuario",
            ],
            [
              "Datos de contacto",
              "Correo electrónico, número de teléfono, domicilio, dirección fiscal o de despacho",
              "Proporcionados por el usuario",
            ],
            [
              "Datos de envío y operación",
              "Origen, destino, tipo de mercancía, peso/volumen, documentos aduaneros (BL, AWB, DUS/DIN u equivalentes), número de contenedor",
              "Proporcionados y generados en el sistema",
            ],
            [
              "Datos de cuenta",
              "Nombre de usuario, contraseña cifrada, rol, historial de accesos, preferencias",
              "Creados por el usuario y el sistema",
            ],
            [
              "Datos de navegación",
              "Dirección IP, tipo de navegador, sistema operativo, páginas visitadas, duración de sesión, cookies",
              "Recabados automáticamente",
            ],
            [
              "Datos financieros",
              "Información de facturación, referencias de pago, historial de transacciones (no se almacenan datos completos de tarjeta)",
              "Proporcionados por el usuario / pasarela de pago",
            ],
            [
              "Datos de comunicaciones",
              "Contenido de mensajes enviados a través de formularios de contacto y correo electrónico",
              "Generados por el usuario",
            ],
          ],
        },
        {
          type: "callout",
          title: "Datos sensibles",
          text: "Seemann Group no recaba intencionalmente datos sensibles, en el sentido de la legislación chilena sobre protección de datos (por ejemplo, datos relativos a la salud, origen racial o étnico, vida sexual, creencias o afiliaciones). Si en alguna comunicación usted los proporciona voluntariamente, serán tratados con las reservas, limitaciones y medidas de seguridad reforzadas que impone la Ley Nº 19.628 y, a partir de su vigencia plena, el marco de la Ley Nº 21.719.",
        },
      ],
    },
    {
      id: "s3",
      number: "Artículo 03",
      title: "Fundamentos del Tratamiento",
      blocks: [
        {
          type: "para",
          text: "El tratamiento de sus datos personales se sustenta en los siguientes fundamentos, conforme a la Ley Nº 19.628 y, en la medida en que resulten aplicables a medida que entren en vigor, a las reglas de la Ley Nº 21.719:",
        },
        {
          type: "bullets",
          items: [
            "Consentimiento del titular: Cuando usted autoriza el tratamiento para finalidades específicas, tales como comunicaciones comerciales, boletines, notificaciones de tarifas no operativas o uso de cookies no esenciales. Puede revocar su consentimiento en cualquier momento, sin efecto retroactivo sobre tratamientos ya realizados lícitamente.",
            "Ejecución de la relación contractual o de servicios: Cuando el tratamiento es necesario para prestar los servicios logísticos y de plataforma contratados, incluyendo cotizaciones, emisión de documentos, gestión de embarques, facturación, tracking y atención operacional.",
            "Cumplimiento de obligaciones legales: Cuando la ley chilena u otras normas aplicables exijan el tratamiento, en especial obligaciones aduaneras ante el Servicio Nacional de Aduanas de Chile, obligaciones tributarias ante el Servicio de Impuestos Internos (SII), prevención de delitos, preservación de información contable y otras exigencias de autoridad competente.",
            "Interés legítimo del responsable, en cuanto sea compatible con la Ley Nº 19.628 y con el marco de la Ley Nº 21.719: Para mejorar la seguridad de la plataforma, prevenir fraudes, mantener la continuidad operacional y realizar análisis estadísticos agregados o seudonimizados, siempre que no prevalezcan los derechos e intereses del titular.",
          ],
        },
      ],
    },
    {
      id: "s4",
      number: "Artículo 04",
      title: "Cómo Utilizamos sus Datos Personales",
      blocks: [
        {
          type: "para",
          text: "Los datos personales recopilados son utilizados para las siguientes finalidades:",
        },
        {
          type: "bullets",
          items: [
            "Gestión de embarques y operaciones logísticas: Coordinación de envíos aéreos, marítimos (FCL/LCL) y terrestres; preparación de documentos de transporte (Bill of Lading, AWB, Packing List, certificados de origen); gestión aduanera y coordinación con agencias de aduana.",
            "Prestación de la plataforma digital: Autenticación de usuarios, generación y visualización de cotizaciones, tracking de envíos, acceso a documentación y reportes.",
            "Comunicaciones operativas: Notificaciones sobre el estado de embarques, alertas de tarifas, vencimiento de documentos, confirmaciones de cotizaciones y facturas.",
            "Facturación y pagos: Emisión de facturas, seguimiento de cuentas por cobrar, gestión de crédito comercial y conciliación de pagos.",
            "Mejora del servicio y análisis: Análisis de uso de la plataforma (con datos anonimizados o seudonimizados), métricas de rendimiento y detección de anomalías.",
            "Cumplimiento legal y regulatorio: Comunicación a autoridades chilenas competentes, en especial el Servicio Nacional de Aduanas de Chile y el Servicio de Impuestos Internos (SII), así como cumplimiento de obligaciones de comercio exterior, control de exportaciones y prevención de delitos aplicables.",
            "Marketing y comunicaciones comerciales (solo con consentimiento): Envío de información sobre nuevas rutas, tarifas promocionales y actualizaciones del sector logístico.",
            "Atención al cliente: Gestión de solicitudes, reclamos, consultas y soporte técnico a través de los canales convencionales de Seemann Group.",
          ],
        },
      ],
    },
    {
      id: "s5",
      number: "Artículo 05",
      title: "Compartición y Divulgación de Datos",
      blocks: [
        {
          type: "para",
          text: "Seemann Group no vende ni arrienda sus datos personales a terceros. Solo compartimos sus datos en las circunstancias descritas a continuación, aplicando en todo caso los mecanismos contractuales y técnicos apropiados:",
        },
        {
          type: "table",
          headers: ["Destinatario", "Finalidad", "Fundamento"],
          rows: [
            [
              "Navieras y aerolíneas",
              "Reserva de espacio, emisión de B/L y AWB, coordinación de rutas",
              "Ejecución de contrato / servicios",
            ],
            [
              "Agentes de aduana",
              "Despacho aduanero, presentación de declaraciones y manifiestos",
              "Ejecución de contrato / Obligación legal",
            ],
            [
              "Autoridades chilenas (Servicio Nacional de Aduanas, SII y otras competentes)",
              "Cumplimiento de obligaciones legales, aduaneras, tributarias y de seguridad",
              "Obligación legal",
            ],
            [
              "Proveedores tecnológicos (infraestructura cloud y almacenamiento)",
              "Operación segura de la plataforma",
              "Contrato de encargo / interés legítimo compatible",
            ],
            [
              "Proveedores de transporte last-mile",
              "Entrega de mercancía en destino final",
              "Ejecución de contrato / servicios",
            ],
            [
              "Servicios de correo electrónico",
              "Envío de notificaciones operativas, cotizaciones y alertas",
              "Ejecución de contrato / Consentimiento",
            ],
            [
              "Plataformas de análisis de rendimiento",
              "Monitoreo técnico (datos anonimizados o seudonimizados en la medida de lo posible)",
              "Interés legítimo compatible / Consentimiento cuando corresponda",
            ],
          ],
        },
        {
          type: "para",
          text: "Los terceros que traten datos por cuenta de Seemann Group quedan sujetos a obligaciones contractuales de confidencialidad, seguridad y uso limitado a las finalidades encargadas.",
        },
      ],
    },
    {
      id: "s6",
      number: "Artículo 06",
      title: "Transferencias Internacionales de Datos",
      blocks: [
        {
          type: "para",
          text: "Dado el carácter internacional de los servicios de transporte que ofrecemos, sus datos pueden ser transferidos y tratados fuera de Chile cuando ello resulte necesario para la prestación del servicio (por ejemplo, coordinación con transportistas, agentes en destino o proveedores cloud). Seemann Group aplica las siguientes salvaguardas:",
        },
        {
          type: "bullets",
          items: [
            "Transferencias sustentadas en la ejecución de la relación contractual o de servicios logísticos internacionalmente contratados.",
            "Contratos y cláusulas de confidencialidad y protección de datos con destinatarios y encargados en el extranjero.",
            "Medidas técnicas razonables de seguridad (cifrado en tránsito, controles de acceso y minimización).",
            "Ajuste progresivo a los requisitos de transferencias internacionales que establezca la Ley Nº 21.719 y la Agencia de Protección de Datos Personales una vez se encuentren plenamente vigentes y operativos.",
          ],
        },
        {
          type: "callout",
          title: "Países destinatarios principales",
          text: "Estados Unidos, países de la Unión Europea, China, Japón, Corea del Sur, Emiratos Árabes Unidos, México, Colombia, Brasil y demás destinos de nuestras rutas logísticas activas. Para cada transferencia aplicamos el mecanismo de garantía apropiado conforme a la normativa chilena vigente al momento del tratamiento.",
        },
      ],
    },
    {
      id: "s7",
      number: "Artículo 07",
      title: "Conservación de Datos",
      blocks: [
        {
          type: "para",
          text: "Conservamos sus datos personales únicamente durante el tiempo necesario para cumplir las finalidades para las que fueron recabados, o mientras existan obligaciones legales o contractuales que lo exijan:",
        },
        {
          type: "table",
          headers: ["Tipo de dato", "Período de conservación", "Fundamento"],
          rows: [
            [
              "Datos de cuenta de usuario activa",
              "Mientras la cuenta esté activa + 6 meses tras el cierre",
              "Ejecución de contrato / servicios",
            ],
            [
              "Documentos de envío y aduaneros (BL, AWB, Packing List, declaraciones)",
              "Hasta 10 años, según regulación aplicable",
              "Obligaciones aduaneras y tributarias (Servicio Nacional de Aduanas / SII)",
            ],
            [
              "Registros de facturación y contables",
              "Hasta 6 a 10 años, según tipo de obligación",
              "Código Tributario y normativa del SII / contabilidad comercial",
            ],
            [
              "Cotizaciones y comunicaciones comerciales",
              "5 años",
              "Posibles reclamaciones contractuales (Código Civil y Código de Comercio)",
            ],
            [
              "Logs de acceso y seguridad",
              "12 meses",
              "Seguridad de sistemas e investigación de incidentes",
            ],
            [
              "Datos de cookies y análisis web",
              "13 meses máximo",
              "Consentimiento / interés legítimo compatible",
            ],
            [
              "Comunicaciones de marketing (si dio consentimiento)",
              "Hasta retirada del consentimiento",
              "Consentimiento",
            ],
          ],
        },
        {
          type: "para",
          text: "Transcurridos los períodos indicados, sus datos serán eliminados de forma segura o anonimizados de manera irreversible para usos estadísticos.",
        },
      ],
    },
    {
      id: "s8",
      number: "Artículo 08",
      title: "Sus Derechos como Titular de los Datos",
      blocks: [
        {
          type: "para",
          text: "Conforme a la Ley Nº 19.628 y al artículo 19 Nº 4 de la Constitución Política de la República, usted dispone, en términos generales, de los siguientes derechos:",
        },
        {
          type: "bullets",
          items: [
            "Derecho de acceso: Conocer qué datos personales suyos tratamos, con qué finalidad, su origen y destinatarios.",
            "Derecho de rectificación: Solicitar la corrección de datos inexactos, incompletos o desactualizados.",
            "Derecho de cancelación: Solicitar la eliminación de sus datos cuando ya no sean necesarios para la finalidad del tratamiento o cuando éste carezca de fundamento jurídico; este derecho puede estar limitado por obligaciones legales de conservación.",
            "Derecho de oposición y/o bloqueo: Oponerse al tratamiento o solicitar el bloqueo de sus datos cuando resulte procedente conforme a la ley.",
            "Revocación del consentimiento: Cuando el tratamiento se sustente en su consentimiento, podrá revocarlo en cualquier momento.",
            "Derechos adicionales bajo la Ley Nº 21.719: A partir de la entrada en vigor plena del marco reformado, se reconocerán asimismo derechos de portabilidad y demás facultades del esquema ARCOP (u otras denominaciones legales equivalentes) en la medida en que resulten exigibles conforme a dicha ley y a la regulación de la APDP.",
          ],
        },
        {
          type: "callout",
          title: "¿Cómo ejercer sus derechos?",
          text: "Envíe su solicitud por escrito a privacidad@seemanngroup.com o a pablo@sphereglobal.io, indicando: nombre completo, documento de identidad, derecho que desea ejercer y, si aplica, medio de respuesta. Bajo la práctica vigente de la Ley Nº 19.628, responderemos dentro de los plazos legales aplicables a cada derecho. Una vez plenamente vigente la Ley Nº 21.719, el plazo típico de respuesta a estas solicitudes será de 30 días contados desde la recepción de la solicitud, sin perjuicio de prórrogas o excepciones que la ley o la APDP establezcan. Si estima que su solicitud no ha sido atendida adecuadamente, podrá reclamar ante los tribunales ordinarios de justicia de Chile y, a partir de la vigencia operativa de la Ley Nº 21.719, también ante la Agencia de Protección de Datos Personales.",
        },
      ],
    },
    {
      id: "s9",
      number: "Artículo 09",
      title: "Seguridad de la Información",
      blocks: [
        {
          type: "para",
          text: "Seemann Group implementa medidas técnicas y organizativas adecuadas para proteger sus datos personales contra el acceso no autorizado, la pérdida accidental, la alteración o la divulgación indebida. Estas medidas incluyen:",
        },
        {
          type: "bullets",
          items: [
            "Cifrado en tránsito: Comunicaciones entre su navegador y nuestra plataforma mediante protocolos TLS 1.2 / TLS 1.3 (HTTPS).",
            "Cifrado en reposo: Datos almacenados en bases de datos y sistemas de archivos con AES-256 o equivalente.",
            "Contraseñas: Almacenadas exclusivamente como hashes criptográficos (bcrypt con salt), nunca en texto plano.",
            "Control de acceso: Acceso basado en roles (RBAC) con principio de mínimo privilegio. Autenticación de dos factores disponible para cuentas administrativas.",
            "Auditoría y monitoreo: Registros de acceso y actividad, monitoreo de anomalías y alertas ante intentos sospechosos.",
            "Infraestructura: Alojada en proveedores cloud de nivel empresarial, con controles de seguridad y certificaciones de mercado cuando corresponda.",
            "Gestión de incidentes: Procedimiento documentado de respuesta ante brechas. Cuando una brecha afecte de manera relevante sus derechos, le notificaremos conforme a la normativa chilena aplicable y a los plazos que ésta determine.",
            "Evaluaciones periódicas: Revisiones de seguridad y análisis de vulnerabilidades de forma regular.",
          ],
        },
        {
          type: "para",
          text: "Ningún sistema de transmisión de datos por Internet puede garantizar una seguridad absoluta. Si sospecha que su cuenta ha sido comprometida, contáctenos de inmediato en privacidad@seemanngroup.com o contacto@seemanngroup.com.",
        },
      ],
    },
    {
      id: "s10",
      number: "Artículo 10",
      title: "Menores de Edad",
      blocks: [
        {
          type: "para",
          text: "Los servicios de Seemann Group están dirigidos exclusivamente a personas mayores de 18 años que actúen en calidad de empresas, importadores, exportadores o profesionales del comercio internacional. No recabamos ni tratamos intencionalmente datos personales de menores de 18 años.",
        },
        {
          type: "para",
          text: "Si tenemos conocimiento de haber recabado datos de un menor sin la autorización o consentimiento legalmente exigido, procederemos a eliminar dicha información de forma inmediata. Si usted es padre, madre o representante legal y cree que un menor a su cargo nos ha proporcionado datos personales, contáctenos en privacidad@seemanngroup.com.",
        },
      ],
    },
    {
      id: "s11",
      number: "Artículo 11",
      title: "Cookies y Tecnologías de Rastreo",
      blocks: [
        {
          type: "para",
          text: "Nuestra plataforma digital y sitio web pueden utilizar cookies y tecnologías similares para garantizar el funcionamiento correcto, analizar el uso y, con su consentimiento cuando corresponda, ofrecer contenido personalizado. En el Portal de Clientes encontrará el detalle de cookies y podrá gestionar sus preferencias desde el pie de página, una vez autenticado.",
        },
        {
          type: "para",
          text: "En el sitio corporativo www.seemanngroup.com únicamente se emplean cookies técnicas o de terceros estrictamente necesarias para el funcionamiento, medición o seguridad, según la configuración vigente del sitio. La aplicación móvil no utiliza cookies de navegador; puede almacenar preferencias y tokens de sesión de forma segura en el dispositivo.",
        },
      ],
    },
    {
      id: "s12",
      number: "Artículo 12",
      title: "Aplicación Móvil «Seemann Group»",
      blocks: [
        {
          type: "para",
          text: "Esta sección complementa la presente Política respecto de la aplicación móvil oficial de Seemann Group para iOS (y, en su caso, Android), disponible en las tiendas de aplicaciones correspondientes. El responsable del tratamiento es el mismo indicado en el Artículo 01.",
        },
        {
          type: "para",
          text: "La app es un canal B2B del Portal de Clientes. No ofrece registro público: las cuentas son creadas por Seemann Group para clientes existentes. El inicio de sesión utiliza las mismas credenciales del portal web (portalclientes.seemanngroup.com).",
        },
        {
          type: "table",
          headers: ["Dato / categoría", "Finalidad en la app", "Fundamento"],
          rows: [
            [
              "Credenciales de acceso (email / usuario)",
              "Autenticación y mantenimiento de sesión segura en el dispositivo",
              "Ejecución de contrato / servicios",
            ],
            [
              "Token de sesión y preferencias locales (almacenamiento seguro del dispositivo)",
              "Mantener la sesión iniciada y recordar el último correo utilizado en el login",
              "Ejecución de contrato / servicios",
            ],
            [
              "Datos operativos de la cuenta (embarques, cotizaciones, documentos, reportería)",
              "Visualización y gestión del servicio logístico ya contratado",
              "Ejecución de contrato / servicios",
            ],
            [
              "Token de notificaciones push e identificadores de dispositivo asociados",
              "Enviar avisos operativos (p. ej. cambios de estado en seguimientos), si usted habilita las notificaciones",
              "Consentimiento / ejecución de contrato (preferencia configurable en la app)",
            ],
            [
              "Datos técnicos del dispositivo (sistema operativo, versión de app)",
              "Compatibilidad, seguridad y diagnóstico de fallos",
              "Interés legítimo compatible / seguridad",
            ],
          ],
        },
        {
          type: "bullets",
          items: [
            "Notificaciones push: puede activarlas o desactivarlas en Más → Notificaciones. Al desactivarlas, dejaremos de asociar el token de su dispositivo para esos envíos, sin perjuicio de otras comunicaciones por correo u otros canales operativos.",
            "Permisos del sistema: la app solicita únicamente los permisos necesarios (p. ej. notificaciones). No solicitamos acceso a la cámara, contactos, micrófono ni ubicación continua para el funcionamiento habitual del portal.",
            "Eliminación de cuenta: puede solicitar la baja desde Más → Eliminar cuenta, o escribiendo a privacidad@seemanngroup.com. Atenderemos la solicitud en un plazo de hasta 30 días hábiles, salvo obligaciones legales de conservación (p. ej. documentación aduanera o tributaria).",
            "Proveedores: la app se comunica con los mismos sistemas y encargados descritos en esta Política (infraestructura cloud, servicios de correo, plataformas de tracking, etc.). No vendemos datos obtenidos a través de la app.",
            "Menores: la app, al igual que los demás servicios, está dirigida a mayores de 18 años en contexto empresarial.",
          ],
        },
        {
          type: "callout",
          title: "App Store / Google Play",
          text: "La versión pública de esta Política en https://www.seemanngroup.com/privacidad es la URL de privacidad aplicable a la aplicación móvil Seemann Group. Si tiene consultas específicas sobre la app, escriba a privacidad@seemanngroup.com.",
        },
      ],
    },
    {
      id: "s13",
      number: "Artículo 13",
      title: "Cambios a esta Política de Privacidad",
      blocks: [
        {
          type: "para",
          text: "Seemann Group se reserva el derecho de modificar esta Política de Privacidad en cualquier momento para reflejar cambios en nuestras prácticas, servicios, normativa chilena aplicable —incluida la gradual entrada en vigor de la Ley Nº 21.719— o requerimientos de autoridad.",
        },
        {
          type: "para",
          text: "Cuando realicemos cambios materiales, le notificaremos con al menos 15 días de antelación mediante uno o varios de los siguientes mecanismos: aviso prominente en la plataforma o sitio web, notificación por correo electrónico a la dirección registrada en su cuenta, o banner informativo en el acceso a la plataforma o aplicación.",
        },
        {
          type: "para",
          text: 'La fecha de la "Última actualización" al inicio de este documento refleja cuándo se realizó la revisión más reciente. El uso continuado de la plataforma, el sitio o la app tras la entrada en vigor de los cambios constituirá su aceptación de la nueva versión. Si no está de acuerdo con los cambios, deberá cesar el uso de los servicios y puede solicitar la eliminación de su cuenta.',
        },
        {
          type: "para",
          text: "Conservamos las versiones anteriores de esta Política accesibles bajo solicitud.",
        },
      ],
    },
    {
      id: "s14",
      number: "Artículo 14",
      title: "Contacto y Reclamaciones",
      blocks: [
        {
          type: "para",
          text: "Para cualquier consulta, solicitud de ejercicio de derechos o reclamación relacionada con el tratamiento de sus datos personales, puede contactarnos a través de los siguientes canales:",
        },
        {
          type: "kv",
          items: [
            {
              label: "Email de Privacidad",
              value: "privacidad@seemanngroup.com",
            },
            {
              label: "Email general",
              value: "contacto@seemanngroup.com",
            },
            {
              label: "Contacto de protección de datos",
              value: "pablo@sphereglobal.io",
            },
            { label: "Teléfono", value: "+56 2 2604 8386" },
            {
              label: "Dirección Postal",
              value: "Av. Libertad #1405, of. 1203, Viña del Mar, Chile",
            },
            {
              label: "Versión pública web",
              value: "https://www.seemanngroup.com/privacidad",
            },
          ],
        },
        {
          type: "callout",
          title: "Autoridad y vías de reclamo",
          text: "Hasta que la Agencia de Protección de Datos Personales se encuentre plenamente operativa conforme a la Ley Nº 21.719, usted conserva el derecho a reclamar ante los tribunales ordinarios de justicia de la República de Chile. A partir de la vigencia plena de dicha ley y de la puesta en marcha de la APDP, podrá además presentar reclamaciones ante la Agencia de Protección de Datos Personales, sin perjuicio de las acciones judiciales que le correspondan.",
        },
      ],
    },
  ],
};
