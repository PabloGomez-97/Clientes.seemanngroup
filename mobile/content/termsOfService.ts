import type { LegalDocument } from "./privacyPolicy";

export const termsOfServiceDocument: LegalDocument = {
  title: "Términos de Servicio",
  lastUpdated: "14 de julio de 2026",
  effectiveDate: "1 de enero de 2024",
  introTitle: "Leer antes de utilizar la plataforma",
  introText:
    'Los presentes Términos de Servicio (en adelante, los "Términos") regulan el acceso y uso de la plataforma digital y los servicios logísticos ofrecidos por Seemann Group S.A., sociedad domiciliada en Av. Libertad #1405, of. 1203, Viña del Mar, Chile. Al registrarse en la plataforma o utilizar cualquiera de nuestros servicios, usted declara haber leído, comprendido y aceptado estos Términos en su totalidad. Si actúa en nombre de una empresa, declara tener autoridad legal para vincular a dicha empresa con estos Términos.',
  sections: [
    {
      id: "s1",
      number: "Cláusula 01",
      title: "Aceptación de los Términos",
      blocks: [
        {
          type: "para",
          text: "El acceso y uso de la plataforma digital de Seemann Group (disponible en app.seemanngroup.com y sus subdominios) y la contratación de cualquiera de sus servicios logísticos implican la aceptación plena e incondicional de los presentes Términos de Servicio, así como de la Política de Privacidad y la Política de Cookies.",
        },
        {
          type: "para",
          text: "Si no acepta alguna de estas condiciones, deberá abstenerse de utilizar la plataforma y los servicios de Seemann Group.",
        },
        {
          type: "para",
          text: "Seemann Group se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones serán notificadas con al menos 15 días de anticipación mediante los canales establecidos en la Cláusula 12. El uso continuado de la plataforma tras la entrada en vigor de las modificaciones constituirá la aceptación de las nuevas condiciones.",
        },
      ],
    },
    {
      id: "s2",
      number: "Cláusula 02",
      title: "Descripción de los Servicios",
      blocks: [
        {
          type: "para",
          text: "Seemann Group es una empresa de freight forwarding y logística internacional con más de 35 años de experiencia, que ofrece a sus clientes los siguientes servicios principales a través de su plataforma digital y red operativa:",
        },
        {
          type: "table",
          headers: ["Servicio", "Descripción"],
          rows: [
            [
              "Flete Aéreo (AIR)",
              "Coordinación de embarques aéreos internacionales, gestión de AWB (Air Waybill), consolidación de carga, seguimiento y desconsolidación en destino.",
            ],
            [
              "Flete Marítimo FCL",
              "Reserva de contenedores completos (Full Container Load) en navieras, emisión de Bill of Lading, gestión de manifiestos y coordinación de puertos.",
            ],
            [
              "Flete Marítimo LCL",
              "Consolidación de carga en contenedores compartidos (Less than Container Load), optimización de espacio y desconsolidación en destino.",
            ],
            [
              "Transporte Terrestre Last-Mile",
              "Coordinación de la última milla desde puertos y aeropuertos hacia el domicilio del importador, incluyendo entrega con liftgate y residencial cuando corresponda.",
            ],
            [
              "Agencia Aduanal",
              "Preparación y presentación de declaraciones aduaneras, clasificación arancelaria, gestión de licencias de importación/exportación y coordinación con el Servicio Nacional de Aduanas de Chile y autoridades extranjeras cuando el servicio lo requiera.",
            ],
            [
              "Plataforma Digital",
              "Portal web de gestión: cotizador en línea, tracking de envíos, gestión documental, reportería financiera y operacional, chatbot de asistencia con IA.",
            ],
            [
              "Cotizaciones en Línea",
              "Generación de cotizaciones para flete aéreo, FCL, LCL y combinadas, con envío de documentos PDF al correo electrónico.",
            ],
            [
              "Notificaciones y Alertas",
              "Alertas automáticas sobre cambios de tarifas, vencimiento de embarques, actualización de estatus y eventos críticos en la cadena logística.",
            ],
          ],
        },
        {
          type: "para",
          text: "Seemann Group actúa como agente intermediario entre el cliente y los proveedores de transporte (navieras, aerolíneas, transportistas terrestres), salvo que expresamente se acuerde por escrito que actúa como transportista principal. Las condiciones específicas de los transportistas se incorporan por referencia a los documentos de transporte emitidos.",
        },
        {
          type: "para",
          text: "Las relaciones mercantiles B2B de freight forwarding se rigen principalmente por el Código Civil y el Código de Comercio de Chile, además de los convenios internacionales de transporte aplicables a cada modo. Cuando el cliente sea una persona natural que actúe como consumidor en los términos de la Ley Nº 19.496, se aplicarán además las normas de protección al consumidor que resulten pertinentes, sin que ello implique que todos los usuarios de la plataforma sean calificados como consumidores.",
        },
      ],
    },
    {
      id: "s3",
      number: "Cláusula 03",
      title: "Registro y Cuentas de Usuario",
      blocks: [
        {
          type: "para",
          text: "Para acceder a la plataforma digital de Seemann Group es necesario crear una cuenta de usuario mediante el proceso de registro habilitado. Al hacerlo, el usuario se obliga a:",
        },
        {
          type: "bullets",
          items: [
            "Proporcionar información verdadera, exacta, actual y completa sobre su identidad y la de la empresa que representa.",
            "Mantener y actualizar dicha información para que permanezca veraz y completa en todo momento.",
            "Mantener la confidencialidad de sus credenciales de acceso (usuario y contraseña) y no compartirlas con terceros.",
            "Notificar a Seemann Group de forma inmediata ante cualquier uso no autorizado de su cuenta o cualquier brecha de seguridad en contacto@seemanngroup.com o privacidad@seemanngroup.com.",
            "Ser responsable de todas las actividades que se realicen bajo su cuenta, independientemente de si han sido autorizadas por usted.",
          ],
        },
        {
          type: "para",
          text: "Las cuentas son de uso personal e intransferible. Seemann Group se reserva el derecho de verificar la identidad del usuario y la empresa en cualquier momento, pudiendo solicitar documentación adicional.",
        },
        {
          type: "callout",
          title: "Tipos de cuenta",
          text: "La plataforma gestiona diferentes roles de usuario: Cliente (acceso a cotizador, tracking y reportería), Ejecutivo (gestión comercial), Operaciones (gestión operativa), Proveedor (subida de tarifas) y Administrador (gestión global). Los permisos de cada rol son asignados por Seemann Group conforme al contrato de servicio.",
        },
      ],
    },
    {
      id: "s4",
      number: "Cláusula 04",
      title: "Cotizaciones y Tarifas",
      blocks: [
        {
          type: "para",
          text: "Las cotizaciones generadas a través de la plataforma de Seemann Group se rigen por las siguientes condiciones:",
        },
        {
          type: "bullets",
          items: [
            "Validez: Todas las cotizaciones tienen una validez limitada que se indica expresamente en el documento de cotización. Transcurrido dicho período, la cotización pierde su vigencia y los precios están sujetos a modificación sin previo aviso, en función de las tarifas vigentes de navieras, aerolíneas, tipos de cambio y recargos aplicables.",
            "Naturaleza estimativa: Las cotizaciones son estimaciones basadas en la información proporcionada por el cliente. Seemann Group no se responsabiliza de variaciones derivadas de información incorrecta, incompleta o modificada por el cliente (peso, dimensiones, clasificación arancelaria, naturaleza de la mercancía, etc.).",
            "Cargos adicionales: Las cotizaciones pueden no incluir cargos adicionales que surjan durante el tránsito, como demoras (demurrage y detention), cargos de inspección aduanera, almacenaje portuario, recargos por temporada alta, bunker, war risk u otros impuestos o tasas locales no previsibles en el momento de cotizar.",
            "Tipos de cambio: Las cotizaciones expresadas en moneda extranjera están sujetas al tipo de cambio vigente en la fecha de confirmación del servicio o facturación, salvo acuerdo expreso distinto.",
            "Confirmación: Una cotización se convierte en servicio confirmado únicamente cuando Seemann Group emite una confirmación escrita (orden de servicio o booking confirmation). El cliente deberá confirmar la aceptación de la cotización dentro del período de validez.",
            "Tarifas preferenciales: Las tarifas negociadas con navieras y aerolíneas pueden ser modificadas unilateralmente por dichos transportistas, lo que podría impactar las cotizaciones en curso. Seemann Group notificará al cliente ante cambios significativos con la mayor antelación posible.",
          ],
        },
      ],
    },
    {
      id: "s5",
      number: "Cláusula 05",
      title: "Condiciones del Servicio de Envío",
      blocks: [
        {
          type: "para",
          text: "La contratación de servicios de envío a través de Seemann Group implica la aceptación de las siguientes condiciones operativas:",
        },
        {
          type: "bullets",
          items: [
            "Instrucciones de embarque: El cliente deberá proporcionar instrucciones de embarque completas, precisas y oportunas. Seemann Group no será responsable de demoras o sobrecostos derivados de instrucciones incompletas, erróneas o tardías.",
            "Mercancías prohibidas y restringidas: Queda terminantemente prohibido el envío de mercancías ilegales, peligrosas no declaradas (según IATA, IMDG u otras normas aplicables), artículos sujetos a sanciones o embargos internacionales vigentes, y productos que infrinjan derechos de propiedad intelectual. Seemann Group podrá rechazar, detener o restituir cualquier envío que incumpla estas condiciones, sin responsabilidad por los costos que ello genere.",
            "Mercancías peligrosas declaradas: El transporte de mercancías peligrosas debidamente declaradas (Dangerous Goods) requiere notificación anticipada, documentación específica (MSDS/SDS, DGD) y está sujeto a aceptación previa por parte de Seemann Group y del transportista involucrado.",
            "Embalaje y marcado: El cliente es responsable de que la mercancía sea embalada y marcada adecuadamente para resistir las condiciones normales del transporte internacional, de conformidad con las regulaciones IATA/IMDG y estándares de la industria.",
            "Seguro de carga: Seemann Group ofrecerá opciones de seguro de carga como servicio adicional. En ausencia de contratación expresa de seguro, la responsabilidad por pérdida o daño se limitará a lo establecido en la Cláusula 7. Se recomienda contratar seguro de carga para embarques de valor.",
            "Tránsitos y conexiones: Los tiempos de tránsito indicados son estimativos y no constituyen garantía de entrega. Los retrasos atribuibles a las navieras, aerolíneas, al Servicio Nacional de Aduanas u otras autoridades competentes, o a causas de fuerza mayor, no generan responsabilidad para Seemann Group.",
            "Documentación aduanera: El cliente es el importador/exportador de registro y es responsable de la exactitud de la clasificación arancelaria, valoración aduanera y cumplimiento de las regulaciones de comercio exterior del país de origen y destino, incluyendo las exigencias del Servicio Nacional de Aduanas de Chile cuando corresponda.",
          ],
        },
      ],
    },
    {
      id: "s6",
      number: "Cláusula 06",
      title: "Obligaciones del Cliente",
      blocks: [
        {
          type: "para",
          text: "El cliente se obliga a:",
        },
        {
          type: "bullets",
          items: [
            "Proporcionar información veraz, completa y oportuna sobre la naturaleza, peso, dimensiones, valor, clasificación arancelaria y cualquier característica especial de la mercancía a transportar.",
            "Cumplir con toda la normativa aplicable en materia de comercio exterior, control de exportaciones, sanciones económicas internacionales y regulaciones aduaneras de los países involucrados, incluyendo las del Servicio Nacional de Aduanas de Chile y las obligaciones tributarias ante el Servicio de Impuestos Internos (SII) cuando correspondan.",
            "Obtener y mantener vigentes todas las licencias, permisos y autorizaciones necesarias para la importación o exportación de las mercancías.",
            "Pagar las facturas emitidas por Seemann Group dentro de los plazos acordados y en la moneda pactada.",
            "Revisar y confirmar la exactitud de todos los documentos de transporte emitidos (BL, AWB, Packing List, etc.) dentro de las 24 horas siguientes a su recepción. Pasado dicho plazo, se presumirá la conformidad del cliente.",
            "Notificar a Seemann Group de cualquier circunstancia especial que pueda afectar el transporte (perecibles, temperatura controlada, alto valor, fragilidad, etc.) antes de la confirmación del servicio.",
            "Abstenerse de utilizar la plataforma digital para actividades ilegales, fraudes, o cualquier conducta que comprometa la seguridad o integridad de la plataforma.",
          ],
        },
      ],
    },
    {
      id: "s7",
      number: "Cláusula 07",
      title: "Responsabilidad y Limitaciones de Responsabilidad",
      blocks: [
        {
          type: "para",
          text: "La responsabilidad de Seemann Group en la prestación de sus servicios se rige por los siguientes principios y limitaciones:",
        },
        {
          type: "para",
          text: "7.1 Responsabilidad como agente de carga",
        },
        {
          type: "para",
          text: "En su calidad de freight forwarder (agente de carga internacional), Seemann Group actúa como intermediario entre el cliente y los transportistas. La responsabilidad directa por pérdida, daño o demora de la mercancía recae, por regla general, sobre el transportista efectivo. Las condiciones de responsabilidad de los transportistas se rigen por:",
        },
        {
          type: "bullets",
          items: [
            "Transporte aéreo: Convenio de Montreal (1999), en los montos de limitación allí previstos",
            "Transporte marítimo: Reglas de la Haya-Visby u otros regímenes que resulten aplicables al conocimiento de embarque",
            "Transporte terrestre: Conforme a la legislación chilena y/o del país del trayecto aplicable",
          ],
        },
        {
          type: "para",
          text: "7.2 Limitación de responsabilidad propia",
        },
        {
          type: "para",
          text: "En los supuestos en que Seemann Group sea directamente responsable por error u omisión en la prestación de sus servicios de agencia, su responsabilidad total acumulada en ningún caso excederá el importe de los honorarios de agencia facturados al cliente por el servicio afectado, o el equivalente a USD 5.000, la cantidad que sea menor, sin perjuicio de las normas imperativas de orden público chileno —incluida, cuando proceda, la Ley Nº 19.496— que no admitan exclusión o limitación.",
        },
        {
          type: "para",
          text: "7.3 Exclusiones de responsabilidad",
        },
        {
          type: "para",
          text: "Seemann Group no será responsable por daños causados por:",
        },
        {
          type: "bullets",
          items: [
            "Información incorrecta o incompleta proporcionada por el cliente",
            "Embalaje inadecuado de la mercancía",
            "Causas de fuerza mayor o caso fortuito (ver Cláusula 8)",
            "Decisiones o demoras del Servicio Nacional de Aduanas, del SII u otras autoridades competentes",
            "Huelgas, conflictos laborales o interrupciones en instalaciones de terceros",
            "Fluctuaciones de tipos de cambio o variaciones de tarifas de transportistas",
            "Daños indirectos, consecuenciales, lucro cesante o pérdida de negocio, en la medida en que la ley chilena lo permita",
            "Interrupciones en el servicio de la plataforma digital por mantenimiento programado o causas ajenas al control de Seemann Group",
            "Incumplimiento de normativa aplicable por parte del cliente",
          ],
        },
        {
          type: "callout",
          title: "Recomendación importante",
          text: "Para protección completa del valor de su carga, Seemann Group ofrece la contratación de seguro de carga All-Risk y Named Perils a través de aseguradoras de primera línea. Consulte a su ejecutivo de cuenta para más información.",
        },
      ],
    },
    {
      id: "s8",
      number: "Cláusula 08",
      title: "Fuerza Mayor y Caso Fortuito",
      blocks: [
        {
          type: "para",
          text: "Seemann Group no será responsable por el incumplimiento o retraso en la ejecución de sus obligaciones cuando dichas circunstancias sean consecuencia de fuerza mayor o caso fortuito, en los términos del Código Civil de Chile, esto es, eventos imprevisibles e irresistibles que escapan al control razonable de Seemann Group, incluyendo sin limitación:",
        },
        {
          type: "bullets",
          items: [
            "Desastres naturales: terremotos, maremotos, inundaciones, erupciones volcánicas, incendios forestales u otros fenómenos de la naturaleza",
            "Epidemias, pandemias o emergencias sanitarias declaradas por autoridades competentes",
            "Conflictos bélicos, guerras, actos de terrorismo, insurrección o disturbios civiles",
            "Ataques cibernéticos de gran escala que afecten infraestructuras críticas",
            "Embargos, sanciones económicas internacionales o bloqueos comerciales impuestos por gobiernos",
            "Huelgas generales o conflictos laborales en puertos, aeropuertos, aduanas o transportistas",
            "Fallos en infraestructuras de telecomunicaciones o energía ajenas a Seemann Group",
            "Decisiones gubernamentales o regulatorias que impidan la prestación del servicio",
            "Cierre o congestión de puertos, aeropuertos o vías de comunicación",
          ],
        },
        {
          type: "para",
          text: "En caso de fuerza mayor o caso fortuito, Seemann Group: (a) notificará al cliente en el menor tiempo posible; (b) adoptará las medidas razonables para minimizar el impacto; (c) reanudará la prestación del servicio tan pronto como la situación lo permita. Si el evento persiste por más de 60 días consecutivos, cualquiera de las partes podrá poner término al contrato sin penalización, con derecho a reembolso prorrateado de los servicios no prestados.",
        },
      ],
    },
    {
      id: "s9",
      number: "Cláusula 09",
      title: "Pagos y Facturación",
      blocks: [
        {
          type: "para",
          text: "Las condiciones de pago por los servicios de Seemann Group son las siguientes:",
        },
        {
          type: "bullets",
          items: [
            "Moneda: Las facturas se emiten en pesos chilenos (CLP), dólares estadounidenses (USD) o en la moneda acordada en el contrato de servicio. Los pagos en monedas distintas se realizarán al tipo de cambio aplicable en la fecha de pago, salvo pacto distinto.",
            "Plazos de pago: El plazo estándar de pago es de 30 días calendario a partir de la fecha de emisión de la factura, salvo acuerdo distinto. Clientes nuevos podrán estar sujetos a condiciones de pago anticipado o garantías adicionales.",
            "Mora: Los saldos vencidos devengarán el interés máximo convencional conforme a la Ley Nº 18.010, sobre operaciones de crédito de dinero, de la República de Chile, sin perjuicio de otros derechos y acciones que asistan a Seemann Group.",
            "Retención de documentos: Seemann Group se reserva el derecho de retener documentos de transporte (OBL, AWB) o instrucciones de entrega (Delivery Order) hasta la liquidación completa de las facturas vencidas, en la medida en que la ley lo permita.",
            "Impuestos y aranceles: Los precios no incluyen impuestos aduaneros, aranceles de importación/exportación, IVA u otros tributos aplicables en Chile o en el país de destino, salvo indicación expresa en la cotización. El cliente es responsable del cumplimiento tributario ante el SII cuando corresponda.",
            "Disputas de factura: Cualquier objeción a una factura deberá ser comunicada por escrito dentro de los 10 días hábiles siguientes a su recepción, indicando los rubros objetados y sus motivos. Pasado dicho plazo, la factura se considerará aceptada, sin perjuicio de las normas imperativas aplicables a consumidores bajo la Ley Nº 19.496.",
            "Gastos de cobranza: En caso de incumplimiento, el cliente asumirá los costos y honorarios razonables de cobranza extrajudicial y judicial en que incurra Seemann Group, conforme a la legislación chilena.",
          ],
        },
      ],
    },
    {
      id: "s10",
      number: "Cláusula 10",
      title: "Propiedad Intelectual",
      blocks: [
        {
          type: "para",
          text: "Todos los derechos de propiedad intelectual sobre la plataforma digital de Seemann Group —incluyendo su diseño, código fuente, algoritmos, bases de datos, interfaces, logotipos, marcas, denominaciones, contenidos y documentación— son propiedad exclusiva de Seemann Group S.A. o de sus licenciantes, y están protegidos por la legislación chilena en materia de propiedad intelectual e industrial.",
        },
        {
          type: "para",
          text: "El acceso a la plataforma otorga al cliente una licencia limitada, no exclusiva, intransferible y revocable para utilizar la plataforma exclusivamente para los fines previstos en estos Términos. Queda expresamente prohibido:",
        },
        {
          type: "bullets",
          items: [
            "Copiar, reproducir, distribuir o comercializar cualquier parte de la plataforma",
            "Realizar ingeniería inversa, descompilar o desensamblar el software",
            "Eliminar o modificar avisos de derechos de autor u otras indicaciones de propiedad",
            "Utilizar marcas, logotipos o denominaciones de Seemann Group sin autorización previa y por escrito",
            "Crear obras derivadas basadas en la plataforma o sus contenidos",
            "Utilizar herramientas automatizadas de scraping o extracción masiva de datos",
          ],
        },
        {
          type: "para",
          text: "Los datos e información generados por el cliente en la plataforma (cotizaciones, documentos de envío, datos de tracking) son propiedad del cliente. Seemann Group los utiliza únicamente para la prestación del servicio conforme a la Política de Privacidad.",
        },
      ],
    },
    {
      id: "s11",
      number: "Cláusula 11",
      title: "Protección de Datos Personales",
      blocks: [
        {
          type: "para",
          text: "El tratamiento de datos personales en el contexto de la prestación de los servicios de Seemann Group se rige por la Política de Privacidad de Seemann Group, que forma parte integrante de estos Términos de Servicio, y por la normativa chilena aplicable: artículo 19 Nº 4 de la Constitución Política de la República, Ley Nº 19.628 y, a medida que entre en vigor, Ley Nº 21.719 y regulación de la Agencia de Protección de Datos Personales.",
        },
        {
          type: "para",
          text: "En los casos en que el cliente proporcione a Seemann Group datos personales de terceros (empleados, consignatarios, contactos de entrega), el cliente declara y garantiza que cuenta con el fundamento jurídico adecuado para dicha comunicación y que ha informado a los titulares sobre el tratamiento de sus datos por parte de Seemann Group para los fines del servicio contratado.",
        },
        {
          type: "para",
          text: "Las partes podrán suscribir un acuerdo de tratamiento de datos separado cuando la naturaleza o volumen de los datos compartidos así lo requiera conforme a la normativa chilena aplicable.",
        },
      ],
    },
    {
      id: "s12",
      number: "Cláusula 12",
      title: "Modificaciones del Servicio y de los Términos",
      blocks: [
        {
          type: "para",
          text: "Seemann Group se reserva el derecho de modificar, ampliar, reducir, suspender temporalmente o interrumpir definitivamente cualquier aspecto de la plataforma o de los servicios ofrecidos, siempre que:",
        },
        {
          type: "bullets",
          items: [
            "Las modificaciones sustanciales sean notificadas con al menos 15 días de antelación mediante aviso en la plataforma o correo electrónico a la dirección de cuenta registrada.",
            "Las modificaciones de mantenimiento programado sean comunicadas con 48 horas de anticipación como mínimo, salvo emergencias técnicas.",
            "Las modificaciones legalmente exigidas o de seguridad urgente puedan implementarse de forma inmediata, notificando al cliente en el menor plazo posible.",
          ],
        },
        {
          type: "para",
          text: "La versión vigente de estos Términos siempre estará disponible en app.seemanngroup.com/terms-of-service.",
        },
      ],
    },
    {
      id: "s13",
      number: "Cláusula 13",
      title: "Suspensión y Terminación de la Cuenta",
      blocks: [
        {
          type: "para",
          text: "Seemann Group podrá suspender o terminar el acceso del cliente a la plataforma, con o sin previo aviso, en los siguientes supuestos:",
        },
        {
          type: "bullets",
          items: [
            "Incumplimiento de cualquier obligación establecida en estos Términos",
            "Falta de pago de facturas vencidas por más de 30 días",
            "Uso de la plataforma para actividades fraudulentas o ilegales",
            "Proporcionar información falsa o documentación fraudulenta",
            "Actividades que comprometan la seguridad o integridad de la plataforma",
            "Resolución del contrato de servicios por cualquiera de las partes",
            "Requerimiento de autoridades competentes",
          ],
        },
        {
          type: "para",
          text: "La terminación de la cuenta no extingue las obligaciones económicas pendientes del cliente, ni los derechos de Seemann Group a reclamar daños y perjuicios. El cliente podrá solicitar la exportación de sus datos durante los 30 días posteriores a la notificación de terminación, sin perjuicio de los derechos previstos en la Política de Privacidad y en la legislación chilena de protección de datos.",
        },
        {
          type: "para",
          text: "El cliente podrá cerrar su cuenta en cualquier momento mediante solicitud escrita a contacto@seemanngroup.com, siempre que no tenga operaciones activas ni saldos pendientes.",
        },
      ],
    },
    {
      id: "s14",
      number: "Cláusula 14",
      title: "Ley Aplicable y Jurisdicción",
      blocks: [
        {
          type: "para",
          text: "Los presentes Términos de Servicio se rigen e interpretan conforme a las leyes de la República de Chile.",
        },
        {
          type: "para",
          text: "Para la resolución de controversias derivadas o relacionadas con estos Términos, las partes acuerdan el siguiente procedimiento escalonado:",
        },
        {
          type: "bullets",
          items: [
            "Negociación directa (30 días): Las partes intentarán resolver amistosamente la controversia mediante negociación directa entre sus representantes autorizados.",
            "Mediación: Si la negociación fracasa, las partes someterán de preferencia la controversia a mediación ante el Centro de Arbitraje y Mediación de la Cámara de Comercio de Santiago (CAM Santiago).",
            "Tribunales ordinarios: De no prosperar la mediación, o si las partes no acuerdan someterse a ella, la controversia será conocida por los Tribunales Ordinarios de Justicia con competencia en Viña del Mar, Región de Valparaíso, República de Chile.",
          ],
        },
        {
          type: "para",
          text: "Lo anterior se entiende sin perjuicio de las normas imperativas de protección al consumidor de la Ley Nº 19.496 que resulten aplicables cuando el cliente sea una persona natural que califique como consumidor conforme a dicha ley.",
        },
      ],
    },
    {
      id: "s15",
      number: "Cláusula 15",
      title: "Disposiciones Generales",
      blocks: [
        {
          type: "bullets",
          items: [
            "Integralidad del acuerdo: Estos Términos, junto con la Política de Privacidad, la Política de Cookies y cualquier contrato de servicio suscrito, constituyen el acuerdo completo entre las partes respecto al uso de la plataforma y reemplazan cualquier comunicación o acuerdo anterior.",
            "Divisibilidad: Si alguna disposición de estos Términos fuera declarada inválida o inaplicable por cualquier tribunal competente, las restantes disposiciones continuarán en pleno vigor y efecto.",
            "No renuncia: El hecho de que Seemann Group no ejerza algún derecho previsto en estos Términos no constituye renuncia al mismo para el futuro.",
            "Cesión: El cliente no podrá ceder ni transferir sus derechos u obligaciones bajo estos Términos sin consentimiento previo y por escrito de Seemann Group. Seemann Group podrá ceder sus derechos en el contexto de una fusión, adquisición o venta de activos, notificando al cliente con antelación.",
            "Comunicaciones: Las comunicaciones oficiales entre las partes se realizarán por correo electrónico a las direcciones registradas, siendo válidas las notificaciones enviadas a la dirección de correo de la cuenta.",
            "Idioma: En caso de discrepancia entre versiones de estos Términos en distintos idiomas, prevalecerá la versión en español.",
          ],
        },
      ],
    },
    {
      id: "s16",
      number: "Cláusula 16",
      title: "Contacto",
      blocks: [
        {
          type: "para",
          text: "Para cualquier consulta o comunicación relacionada con estos Términos de Servicio, puede contactarnos a través de:",
        },
        {
          type: "kv",
          items: [
            {
              label: "Soporte General",
              value: "contacto@seemanngroup.com",
            },
            {
              label: "Privacidad",
              value: "privacidad@seemanngroup.com",
            },
            {
              label: "Asuntos de protección de datos",
              value: "pablo@sphereglobal.io",
            },
            { label: "Teléfono", value: "+56 2 2604 8386" },
            {
              label: "Dirección",
              value: "Av. Libertad #1405, of. 1203, Viña del Mar, Chile",
            },
          ],
        },
      ],
    },
  ],
};
