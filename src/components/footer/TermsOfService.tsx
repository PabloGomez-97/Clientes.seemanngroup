// src/components/footer/TermsOfService.tsx
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import "./legal.css";

const LAST_UPDATED = "14 de julio de 2026";
const EFFECTIVE_DATE = "1 de enero de 2024";

const TOC_ITEMS = [
  { id: "s1", label: "1. Aceptación de los Términos" },
  { id: "s2", label: "2. Descripción de los Servicios" },
  { id: "s3", label: "3. Registro y Cuentas de Usuario" },
  { id: "s4", label: "4. Cotizaciones y Tarifas" },
  { id: "s5", label: "5. Condiciones del Servicio de Envío" },
  { id: "s6", label: "6. Obligaciones del Cliente" },
  { id: "s7", label: "7. Responsabilidad y Limitaciones" },
  { id: "s8", label: "8. Fuerza Mayor" },
  { id: "s9", label: "9. Pagos y Facturación" },
  { id: "s10", label: "10. Propiedad Intelectual" },
  { id: "s11", label: "11. Protección de Datos" },
  { id: "s12", label: "12. Modificaciones del Servicio" },
  { id: "s13", label: "13. Suspensión y Terminación" },
  { id: "s14", label: "14. Ley Aplicable y Jurisdicción" },
  { id: "s15", label: "15. Disposiciones Generales" },
  { id: "s16", label: "16. Contacto" },
];

function TermsOfService() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-header__brand">
          <img
            src="/logo.png"
            alt="Seemann Group"
            className="legal-header__logo"
            width={36}
            height={36}
          />
          <span className="legal-header__name">Seemann Group</span>
        </Link>
        <Link to="/" className="legal-header__back">
          <ArrowLeft size={14} />
          Volver al inicio
        </Link>
      </header>

      <section className="legal-hero">
        <span className="legal-hero__badge">
          <FileText size={12} style={{ display: "inline", marginRight: 4 }} />
          Documento Legal
        </span>
        <h1 className="legal-hero__title">Términos de Servicio</h1>
        <p className="legal-hero__meta">
          Última actualización: <strong>{LAST_UPDATED}</strong> · Vigente desde:{" "}
          <strong>{EFFECTIVE_DATE}</strong>
        </p>
      </section>

      <main className="legal-body">
        <aside className="legal-toc" aria-label="Tabla de contenidos">
          <p className="legal-toc__title">Contenido</p>
          <ul className="legal-toc__list">
            {TOC_ITEMS.map((item) => (
              <li key={item.id} className="legal-toc__item">
                <a href={`#${item.id}`} className="legal-toc__link">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <article className="legal-article">
          <div
            className="legal-infocard legal-infocard--blue"
            style={{ marginBottom: "2rem" }}
          >
            <span className="legal-infocard__heading">
              Leer antes de utilizar la plataforma
            </span>
            Los presentes Términos de Servicio (en adelante, los
            &quot;Términos&quot;) regulan el acceso y uso de la plataforma
            digital y los servicios logísticos ofrecidos por{" "}
            <strong>Seemann Group S.A.</strong>, sociedad domiciliada en Av.
            Libertad #1405, of. 1203, Viña del Mar, Chile. Al registrarse en la
            plataforma o utilizar cualquiera de nuestros servicios, usted
            declara haber leído, comprendido y aceptado estos Términos en su
            totalidad. Si actúa en nombre de una empresa, declara tener
            autoridad legal para vincular a dicha empresa con estos Términos.
          </div>

          {/* S1 */}
          <section className="legal-section" id="s1">
            <span className="legal-section__number">Cláusula 01</span>
            <h2 className="legal-section__title">Aceptación de los Términos</h2>
            <div className="legal-section__body">
              <p>
                El acceso y uso de la plataforma digital de Seemann Group
                (disponible en <strong>app.seemanngroup.com</strong> y sus
                subdominios) y la contratación de cualquiera de sus servicios
                logísticos implican la aceptación plena e incondicional de los
                presentes Términos de Servicio, así como de la{" "}
                <Link to="/privacy-policy">Política de Privacidad</Link> y la{" "}
                <Link to="/cookie-settings">Política de Cookies</Link>.
              </p>
              <p>
                Si no acepta alguna de estas condiciones, deberá abstenerse de
                utilizar la plataforma y los servicios de Seemann Group.
              </p>
              <p>
                Seemann Group se reserva el derecho de modificar estos Términos
                en cualquier momento. Las modificaciones serán notificadas con
                al menos <strong>15 días de anticipación</strong> mediante los
                canales establecidos en la Cláusula 12. El uso continuado de la
                plataforma tras la entrada en vigor de las modificaciones
                constituirá la aceptación de las nuevas condiciones.
              </p>
            </div>
          </section>

          {/* S2 */}
          <section className="legal-section" id="s2">
            <span className="legal-section__number">Cláusula 02</span>
            <h2 className="legal-section__title">
              Descripción de los Servicios
            </h2>
            <div className="legal-section__body">
              <p>
                Seemann Group es una empresa de freight forwarding y logística
                internacional con más de 35 años de experiencia, que ofrece a
                sus clientes los siguientes servicios principales a través de su
                plataforma digital y red operativa:
              </p>

              <div className="legal-table-wrapper">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Flete Aéreo (AIR)</td>
                      <td>
                        Coordinación de embarques aéreos internacionales,
                        gestión de AWB (Air Waybill), consolidación de carga,
                        seguimiento y desconsolidación en destino.
                      </td>
                    </tr>
                    <tr>
                      <td>Flete Marítimo FCL</td>
                      <td>
                        Reserva de contenedores completos (Full Container Load)
                        en navieras, emisión de Bill of Lading, gestión de
                        manifiestos y coordinación de puertos.
                      </td>
                    </tr>
                    <tr>
                      <td>Flete Marítimo LCL</td>
                      <td>
                        Consolidación de carga en contenedores compartidos (Less
                        than Container Load), optimización de espacio y
                        desconsolidación en destino.
                      </td>
                    </tr>
                    <tr>
                      <td>Transporte Terrestre Last-Mile</td>
                      <td>
                        Coordinación de la última milla desde puertos y
                        aeropuertos hacia el domicilio del importador,
                        incluyendo entrega con liftgate y residencial cuando
                        corresponda.
                      </td>
                    </tr>
                    <tr>
                      <td>Agencia Aduanal</td>
                      <td>
                        Preparación y presentación de declaraciones aduaneras,
                        clasificación arancelaria, gestión de licencias de
                        importación/exportación y coordinación con el Servicio
                        Nacional de Aduanas de Chile y autoridades extranjeras
                        cuando el servicio lo requiera.
                      </td>
                    </tr>
                    <tr>
                      <td>Plataforma Digital</td>
                      <td>
                        Portal web y aplicación móvil de gestión: tracking de
                        envíos, cotizaciones, gestión documental y reportería
                        financiera y operacional.
                      </td>
                    </tr>
                    <tr>
                      <td>Cotizaciones en Línea</td>
                      <td>
                        Generación de cotizaciones para flete aéreo, FCL, LCL y
                        combinadas, con envío de documentos PDF al correo
                        electrónico.
                      </td>
                    </tr>
                    <tr>
                      <td>Notificaciones y Alertas</td>
                      <td>
                        Alertas automáticas sobre cambios de tarifas,
                        vencimiento de embarques, actualización de estatus y
                        eventos críticos en la cadena logística.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                Seemann Group actúa como agente intermediario entre el cliente y
                los proveedores de transporte (navieras, aerolíneas,
                transportistas terrestres), salvo que expresamente se acuerde
                por escrito que actúa como transportista principal. Las
                condiciones específicas de los transportistas se incorporan por
                referencia a los documentos de transporte emitidos.
              </p>
              <p>
                Las relaciones mercantiles B2B de freight forwarding se rigen
                principalmente por el <strong>Código Civil</strong> y el{" "}
                <strong>Código de Comercio</strong> de Chile, además de los
                convenios internacionales de transporte aplicables a cada modo.
                Cuando el cliente sea una persona natural que actúe como
                consumidor en los términos de la{" "}
                <strong>Ley Nº 19.496</strong>, se aplicarán además las normas
                de protección al consumidor que resulten pertinentes, sin que
                ello implique que todos los usuarios de la plataforma sean
                calificados como consumidores.
              </p>
            </div>
          </section>

          {/* S3 */}
          <section className="legal-section" id="s3">
            <span className="legal-section__number">Cláusula 03</span>
            <h2 className="legal-section__title">
              Registro y Cuentas de Usuario
            </h2>
            <div className="legal-section__body">
              <p>
                Para acceder a la plataforma digital de Seemann Group es
                necesario crear una cuenta de usuario mediante el proceso de
                registro habilitado. Al hacerlo, el usuario se obliga a:
              </p>
              <ul>
                <li>
                  Proporcionar información verdadera, exacta, actual y completa
                  sobre su identidad y la de la empresa que representa.
                </li>
                <li>
                  Mantener y actualizar dicha información para que permanezca
                  veraz y completa en todo momento.
                </li>
                <li>
                  Mantener la confidencialidad de sus credenciales de acceso
                  (usuario y contraseña) y no compartirlas con terceros.
                </li>
                <li>
                  Notificar a Seemann Group de forma inmediata ante cualquier
                  uso no autorizado de su cuenta o cualquier brecha de
                  seguridad en{" "}
                  <a href="mailto:contacto@seemanngroup.com">
                    contacto@seemanngroup.com
                  </a>{" "}
                  o{" "}
                  <a href="mailto:privacidad@seemanngroup.com">
                    privacidad@seemanngroup.com
                  </a>
                  .
                </li>
                <li>
                  Ser responsable de todas las actividades que se realicen bajo
                  su cuenta, independientemente de si han sido autorizadas por
                  usted.
                </li>
              </ul>
              <p>
                Las cuentas son de uso personal e intransferible. Seemann Group
                se reserva el derecho de verificar la identidad del usuario y la
                empresa en cualquier momento, pudiendo solicitar documentación
                adicional.
              </p>
              <div className="legal-infocard">
                <span className="legal-infocard__heading">Tipos de cuenta</span>
                La plataforma gestiona diferentes roles de usuario: Cliente
                (acceso a cotizador, tracking y reportería), Ejecutivo (gestión
                comercial), Operaciones (gestión operativa), Proveedor (subida
                de tarifas) y Administrador (gestión global). Los permisos de
                cada rol son asignados por Seemann Group conforme al contrato
                de servicio.
              </div>
            </div>
          </section>

          {/* S4 */}
          <section className="legal-section" id="s4">
            <span className="legal-section__number">Cláusula 04</span>
            <h2 className="legal-section__title">Cotizaciones y Tarifas</h2>
            <div className="legal-section__body">
              <p>
                Las cotizaciones generadas a través de la plataforma de Seemann
                Group se rigen por las siguientes condiciones:
              </p>
              <ul>
                <li>
                  <strong>Validez:</strong> Todas las cotizaciones tienen una
                  validez limitada que se indica expresamente en el documento de
                  cotización. Transcurrido dicho período, la cotización pierde
                  su vigencia y los precios están sujetos a modificación sin
                  previo aviso, en función de las tarifas vigentes de navieras,
                  aerolíneas, tipos de cambio y recargos aplicables.
                </li>
                <li>
                  <strong>Naturaleza estimativa:</strong> Las cotizaciones son
                  estimaciones basadas en la información proporcionada por el
                  cliente. Seemann Group no se responsabiliza de variaciones
                  derivadas de información incorrecta, incompleta o modificada
                  por el cliente (peso, dimensiones, clasificación arancelaria,
                  naturaleza de la mercancía, etc.).
                </li>
                <li>
                  <strong>Cargos adicionales:</strong> Las cotizaciones pueden
                  no incluir cargos adicionales que surjan durante el tránsito,
                  como demoras (demurrage y detention), cargos de inspección
                  aduanera, almacenaje portuario, recargos por temporada alta,
                  bunker, war risk u otros impuestos o tasas locales no
                  previsibles en el momento de cotizar.
                </li>
                <li>
                  <strong>Tipos de cambio:</strong> Las cotizaciones expresadas
                  en moneda extranjera están sujetas al tipo de cambio vigente
                  en la fecha de confirmación del servicio o facturación, salvo
                  acuerdo expreso distinto.
                </li>
                <li>
                  <strong>Confirmación:</strong> Una cotización se convierte en
                  servicio confirmado únicamente cuando Seemann Group emite una
                  confirmación escrita (orden de servicio o booking
                  confirmation). El cliente deberá confirmar la aceptación de
                  la cotización dentro del período de validez.
                </li>
                <li>
                  <strong>Tarifas preferenciales:</strong> Las tarifas
                  negociadas con navieras y aerolíneas pueden ser modificadas
                  unilateralmente por dichos transportistas, lo que podría
                  impactar las cotizaciones en curso. Seemann Group notificará
                  al cliente ante cambios significativos con la mayor
                  antelación posible.
                </li>
              </ul>
            </div>
          </section>

          {/* S5 */}
          <section className="legal-section" id="s5">
            <span className="legal-section__number">Cláusula 05</span>
            <h2 className="legal-section__title">
              Condiciones del Servicio de Envío
            </h2>
            <div className="legal-section__body">
              <p>
                La contratación de servicios de envío a través de Seemann Group
                implica la aceptación de las siguientes condiciones operativas:
              </p>
              <ul>
                <li>
                  <strong>Instrucciones de embarque:</strong> El cliente deberá
                  proporcionar instrucciones de embarque completas, precisas y
                  oportunas. Seemann Group no será responsable de demoras o
                  sobrecostos derivados de instrucciones incompletas, erróneas
                  o tardías.
                </li>
                <li>
                  <strong>Mercancías prohibidas y restringidas:</strong> Queda
                  terminantemente prohibido el envío de mercancías ilegales,
                  peligrosas no declaradas (según IATA, IMDG u otras normas
                  aplicables), artículos sujetos a sanciones o embargos
                  internacionales vigentes, y productos que infrinjan derechos
                  de propiedad intelectual. Seemann Group podrá rechazar,
                  detener o restituir cualquier envío que incumpla estas
                  condiciones, sin responsabilidad por los costos que ello
                  genere.
                </li>
                <li>
                  <strong>Mercancías peligrosas declaradas:</strong> El
                  transporte de mercancías peligrosas debidamente declaradas
                  (Dangerous Goods) requiere notificación anticipada,
                  documentación específica (MSDS/SDS, DGD) y está sujeto a
                  aceptación previa por parte de Seemann Group y del
                  transportista involucrado.
                </li>
                <li>
                  <strong>Embalaje y marcado:</strong> El cliente es responsable
                  de que la mercancía sea embalada y marcada adecuadamente para
                  resistir las condiciones normales del transporte
                  internacional, de conformidad con las regulaciones IATA/IMDG
                  y estándares de la industria.
                </li>
                <li>
                  <strong>Seguro de carga:</strong> Seemann Group ofrecerá
                  opciones de seguro de carga como servicio adicional. En
                  ausencia de contratación expresa de seguro, la responsabilidad
                  por pérdida o daño se limitará a lo establecido en la
                  Cláusula 7. Se recomienda contratar seguro de carga para
                  embarques de valor.
                </li>
                <li>
                  <strong>Tránsitos y conexiones:</strong> Los tiempos de
                  tránsito indicados son estimativos y no constituyen garantía
                  de entrega. Los retrasos atribuibles a las navieras,
                  aerolíneas, al Servicio Nacional de Aduanas u otras
                  autoridades competentes, o a causas de fuerza mayor, no
                  generan responsabilidad para Seemann Group.
                </li>
                <li>
                  <strong>Documentación aduanera:</strong> El cliente es el
                  importador/exportador de registro y es responsable de la
                  exactitud de la clasificación arancelaria, valoración
                  aduanera y cumplimiento de las regulaciones de comercio
                  exterior del país de origen y destino, incluyendo las
                  exigencias del Servicio Nacional de Aduanas de Chile cuando
                  corresponda.
                </li>
              </ul>
            </div>
          </section>

          {/* S6 */}
          <section className="legal-section" id="s6">
            <span className="legal-section__number">Cláusula 06</span>
            <h2 className="legal-section__title">Obligaciones del Cliente</h2>
            <div className="legal-section__body">
              <p>El cliente se obliga a:</p>
              <ul>
                <li>
                  Proporcionar información veraz, completa y oportuna sobre la
                  naturaleza, peso, dimensiones, valor, clasificación
                  arancelaria y cualquier característica especial de la
                  mercancía a transportar.
                </li>
                <li>
                  Cumplir con toda la normativa aplicable en materia de
                  comercio exterior, control de exportaciones, sanciones
                  económicas internacionales y regulaciones aduaneras de los
                  países involucrados, incluyendo las del Servicio Nacional de
                  Aduanas de Chile y las obligaciones tributarias ante el
                  Servicio de Impuestos Internos (SII) cuando correspondan.
                </li>
                <li>
                  Obtener y mantener vigentes todas las licencias, permisos y
                  autorizaciones necesarias para la importación o exportación de
                  las mercancías.
                </li>
                <li>
                  Pagar las facturas emitidas por Seemann Group dentro de los
                  plazos acordados y en la moneda pactada.
                </li>
                <li>
                  Revisar y confirmar la exactitud de todos los documentos de
                  transporte emitidos (BL, AWB, Packing List, etc.) dentro de
                  las <strong>24 horas</strong> siguientes a su recepción.
                  Pasado dicho plazo, se presumirá la conformidad del cliente.
                </li>
                <li>
                  Notificar a Seemann Group de cualquier circunstancia especial
                  que pueda afectar el transporte (perecibles, temperatura
                  controlada, alto valor, fragilidad, etc.) antes de la
                  confirmación del servicio.
                </li>
                <li>
                  Abstenerse de utilizar la plataforma digital para actividades
                  ilegales, fraudes, o cualquier conducta que comprometa la
                  seguridad o integridad de la plataforma.
                </li>
              </ul>
            </div>
          </section>

          {/* S7 */}
          <section className="legal-section" id="s7">
            <span className="legal-section__number">Cláusula 07</span>
            <h2 className="legal-section__title">
              Responsabilidad y Limitaciones de Responsabilidad
            </h2>
            <div className="legal-section__body">
              <p>
                La responsabilidad de Seemann Group en la prestación de sus
                servicios se rige por los siguientes principios y limitaciones:
              </p>
              <p>
                <strong>7.1 Responsabilidad como agente de carga</strong>
              </p>
              <p>
                En su calidad de freight forwarder (agente de carga
                internacional), Seemann Group actúa como intermediario entre el
                cliente y los transportistas. La responsabilidad directa por
                pérdida, daño o demora de la mercancía recae, por regla
                general, sobre el transportista efectivo. Las condiciones de
                responsabilidad de los transportistas se rigen por:
              </p>
              <ul>
                <li>
                  <strong>Transporte aéreo:</strong> Convenio de Montreal
                  (1999), en los montos de limitación allí previstos
                </li>
                <li>
                  <strong>Transporte marítimo:</strong> Reglas de la
                  Haya-Visby u otros regímenes que resulten aplicables al
                  conocimiento de embarque
                </li>
                <li>
                  <strong>Transporte terrestre:</strong> Conforme a la
                  legislación chilena y/o del país del trayecto aplicable
                </li>
              </ul>
              <p>
                <strong>7.2 Limitación de responsabilidad propia</strong>
              </p>
              <p>
                En los supuestos en que Seemann Group sea directamente
                responsable por error u omisión en la prestación de sus
                servicios de agencia, su responsabilidad total acumulada en
                ningún caso excederá el importe de los honorarios de agencia
                facturados al cliente por el servicio afectado, o el equivalente
                a <strong>USD 5.000</strong>, la cantidad que sea menor, sin
                perjuicio de las normas imperativas de orden público chileno
                —incluida, cuando proceda, la Ley Nº 19.496— que no admitan
                exclusión o limitación.
              </p>
              <p>
                <strong>7.3 Exclusiones de responsabilidad</strong>
              </p>
              <p>Seemann Group no será responsable por daños causados por:</p>
              <ul>
                <li>
                  Información incorrecta o incompleta proporcionada por el
                  cliente
                </li>
                <li>Embalaje inadecuado de la mercancía</li>
                <li>
                  Causas de fuerza mayor o caso fortuito (ver Cláusula 8)
                </li>
                <li>
                  Decisiones o demoras del Servicio Nacional de Aduanas, del
                  SII u otras autoridades competentes
                </li>
                <li>
                  Huelgas, conflictos laborales o interrupciones en
                  instalaciones de terceros
                </li>
                <li>
                  Fluctuaciones de tipos de cambio o variaciones de tarifas de
                  transportistas
                </li>
                <li>
                  Daños indirectos, consecuenciales, lucro cesante o pérdida de
                  negocio, en la medida en que la ley chilena lo permita
                </li>
                <li>
                  Interrupciones en el servicio de la plataforma digital por
                  mantenimiento programado o causas ajenas al control de
                  Seemann Group
                </li>
                <li>
                  Incumplimiento de normativa aplicable por parte del cliente
                </li>
              </ul>
              <div className="legal-infocard">
                <span className="legal-infocard__heading">
                  Recomendación importante
                </span>
                Para protección completa del valor de su carga, Seemann Group
                ofrece la contratación de seguro de carga All-Risk y Named
                Perils a través de aseguradoras de primera línea. Consulte a
                su ejecutivo de cuenta para más información.
              </div>
            </div>
          </section>

          {/* S8 */}
          <section className="legal-section" id="s8">
            <span className="legal-section__number">Cláusula 08</span>
            <h2 className="legal-section__title">
              Fuerza Mayor y Caso Fortuito
            </h2>
            <div className="legal-section__body">
              <p>
                Seemann Group no será responsable por el incumplimiento o
                retraso en la ejecución de sus obligaciones cuando dichas
                circunstancias sean consecuencia de fuerza mayor o caso
                fortuito, en los términos del{" "}
                <strong>Código Civil de Chile</strong>, esto es, eventos
                imprevisibles e irresistibles que escapan al control razonable
                de Seemann Group, incluyendo sin limitación:
              </p>
              <ul>
                <li>
                  Desastres naturales: terremotos, maremotos, inundaciones,
                  erupciones volcánicas, incendios forestales u otros fenómenos
                  de la naturaleza
                </li>
                <li>
                  Epidemias, pandemias o emergencias sanitarias declaradas por
                  autoridades competentes
                </li>
                <li>
                  Conflictos bélicos, guerras, actos de terrorismo,
                  insurrección o disturbios civiles
                </li>
                <li>
                  Ataques cibernéticos de gran escala que afecten
                  infraestructuras críticas
                </li>
                <li>
                  Embargos, sanciones económicas internacionales o bloqueos
                  comerciales impuestos por gobiernos
                </li>
                <li>
                  Huelgas generales o conflictos laborales en puertos,
                  aeropuertos, aduanas o transportistas
                </li>
                <li>
                  Fallos en infraestructuras de telecomunicaciones o energía
                  ajenas a Seemann Group
                </li>
                <li>
                  Decisiones gubernamentales o regulatorias que impidan la
                  prestación del servicio
                </li>
                <li>
                  Cierre o congestión de puertos, aeropuertos o vías de
                  comunicación
                </li>
              </ul>
              <p>
                En caso de fuerza mayor o caso fortuito, Seemann Group: (a)
                notificará al cliente en el menor tiempo posible; (b) adoptará
                las medidas razonables para minimizar el impacto; (c) reanudará
                la prestación del servicio tan pronto como la situación lo
                permita. Si el evento persiste por más de{" "}
                <strong>60 días consecutivos</strong>, cualquiera de las partes
                podrá poner término al contrato sin penalización, con derecho a
                reembolso prorrateado de los servicios no prestados.
              </p>
            </div>
          </section>

          {/* S9 */}
          <section className="legal-section" id="s9">
            <span className="legal-section__number">Cláusula 09</span>
            <h2 className="legal-section__title">Pagos y Facturación</h2>
            <div className="legal-section__body">
              <p>
                Las condiciones de pago por los servicios de Seemann Group son
                las siguientes:
              </p>
              <ul>
                <li>
                  <strong>Moneda:</strong> Las facturas se emiten en pesos
                  chilenos (CLP), dólares estadounidenses (USD) o en la moneda
                  acordada en el contrato de servicio. Los pagos en monedas
                  distintas se realizarán al tipo de cambio aplicable en la
                  fecha de pago, salvo pacto distinto.
                </li>
                <li>
                  <strong>Plazos de pago:</strong> El plazo estándar de pago es
                  de <strong>30 días calendario</strong> a partir de la fecha de
                  emisión de la factura, salvo acuerdo distinto. Clientes nuevos
                  podrán estar sujetos a condiciones de pago anticipado o
                  garantías adicionales.
                </li>
                <li>
                  <strong>Mora:</strong> Los saldos vencidos devengarán el
                  interés máximo convencional conforme a la{" "}
                  <strong>Ley Nº 18.010</strong>, sobre operaciones de crédito
                  de dinero, de la República de Chile, sin perjuicio de otros
                  derechos y acciones que asistan a Seemann Group.
                </li>
                <li>
                  <strong>Retención de documentos:</strong> Seemann Group se
                  reserva el derecho de retener documentos de transporte (OBL,
                  AWB) o instrucciones de entrega (Delivery Order) hasta la
                  liquidación completa de las facturas vencidas, en la medida
                  en que la ley lo permita.
                </li>
                <li>
                  <strong>Impuestos y aranceles:</strong> Los precios no
                  incluyen impuestos aduaneros, aranceles de
                  importación/exportación, IVA u otros tributos aplicables en
                  Chile o en el país de destino, salvo indicación expresa en la
                  cotización. El cliente es responsable del cumplimiento
                  tributario ante el SII cuando corresponda.
                </li>
                <li>
                  <strong>Disputas de factura:</strong> Cualquier objeción a una
                  factura deberá ser comunicada por escrito dentro de los{" "}
                  <strong>10 días hábiles</strong> siguientes a su recepción,
                  indicando los rubros objetados y sus motivos. Pasado dicho
                  plazo, la factura se considerará aceptada, sin perjuicio de
                  las normas imperativas aplicables a consumidores bajo la Ley
                  Nº 19.496.
                </li>
                <li>
                  <strong>Gastos de cobranza:</strong> En caso de
                  incumplimiento, el cliente asumirá los costos y honorarios
                  razonables de cobranza extrajudicial y judicial en que
                  incurra Seemann Group, conforme a la legislación chilena.
                </li>
              </ul>
            </div>
          </section>

          {/* S10 */}
          <section className="legal-section" id="s10">
            <span className="legal-section__number">Cláusula 10</span>
            <h2 className="legal-section__title">Propiedad Intelectual</h2>
            <div className="legal-section__body">
              <p>
                Todos los derechos de propiedad intelectual sobre la plataforma
                digital de Seemann Group —incluyendo su diseño, código fuente,
                algoritmos, bases de datos, interfaces, logotipos, marcas,
                denominaciones, contenidos y documentación— son propiedad
                exclusiva de Seemann Group S.A. o de sus licenciantes, y están
                protegidos por la legislación chilena en materia de propiedad
                intelectual e industrial.
              </p>
              <p>
                El acceso a la plataforma otorga al cliente una{" "}
                <strong>
                  licencia limitada, no exclusiva, intransferible y revocable
                </strong>{" "}
                para utilizar la plataforma exclusivamente para los fines
                previstos en estos Términos. Queda expresamente prohibido:
              </p>
              <ul>
                <li>
                  Copiar, reproducir, distribuir o comercializar cualquier parte
                  de la plataforma
                </li>
                <li>
                  Realizar ingeniería inversa, descompilar o desensamblar el
                  software
                </li>
                <li>
                  Eliminar o modificar avisos de derechos de autor u otras
                  indicaciones de propiedad
                </li>
                <li>
                  Utilizar marcas, logotipos o denominaciones de Seemann Group
                  sin autorización previa y por escrito
                </li>
                <li>
                  Crear obras derivadas basadas en la plataforma o sus
                  contenidos
                </li>
                <li>
                  Utilizar herramientas automatizadas de scraping o extracción
                  masiva de datos
                </li>
              </ul>
              <p>
                Los datos e información generados por el cliente en la
                plataforma (cotizaciones, documentos de envío, datos de
                tracking) son propiedad del cliente. Seemann Group los utiliza
                únicamente para la prestación del servicio conforme a la
                Política de Privacidad.
              </p>
            </div>
          </section>

          {/* S11 */}
          <section className="legal-section" id="s11">
            <span className="legal-section__number">Cláusula 11</span>
            <h2 className="legal-section__title">
              Protección de Datos Personales
            </h2>
            <div className="legal-section__body">
              <p>
                El tratamiento de datos personales en el contexto de la
                prestación de los servicios de Seemann Group se rige por la{" "}
                <Link to="/privacy-policy">Política de Privacidad</Link> de
                Seemann Group, que forma parte integrante de estos Términos de
                Servicio, y por la normativa chilena aplicable: artículo 19 Nº 4
                de la Constitución Política de la República, Ley Nº 19.628 y, a
                medida que entre en vigor, Ley Nº 21.719 y regulación de la
                Agencia de Protección de Datos Personales.
              </p>
              <p>
                En los casos en que el cliente proporcione a Seemann Group datos
                personales de terceros (empleados, consignatarios, contactos de
                entrega), el cliente declara y garantiza que cuenta con el
                fundamento jurídico adecuado para dicha comunicación y que ha
                informado a los titulares sobre el tratamiento de sus datos por
                parte de Seemann Group para los fines del servicio contratado.
              </p>
              <p>
                Las partes podrán suscribir un acuerdo de tratamiento de datos
                separado cuando la naturaleza o volumen de los datos compartidos
                así lo requiera conforme a la normativa chilena aplicable.
              </p>
            </div>
          </section>

          {/* S12 */}
          <section className="legal-section" id="s12">
            <span className="legal-section__number">Cláusula 12</span>
            <h2 className="legal-section__title">
              Modificaciones del Servicio y de los Términos
            </h2>
            <div className="legal-section__body">
              <p>
                Seemann Group se reserva el derecho de modificar, ampliar,
                reducir, suspender temporalmente o interrumpir definitivamente
                cualquier aspecto de la plataforma o de los servicios
                ofrecidos, siempre que:
              </p>
              <ul>
                <li>
                  Las modificaciones sustanciales sean notificadas con al menos{" "}
                  <strong>15 días de antelación</strong> mediante aviso en la
                  plataforma o correo electrónico a la dirección de cuenta
                  registrada.
                </li>
                <li>
                  Las modificaciones de mantenimiento programado sean
                  comunicadas con <strong>48 horas</strong> de anticipación
                  como mínimo, salvo emergencias técnicas.
                </li>
                <li>
                  Las modificaciones legalmente exigidas o de seguridad urgente
                  puedan implementarse de forma inmediata, notificando al
                  cliente en el menor plazo posible.
                </li>
              </ul>
              <p>
                La versión vigente de estos Términos siempre estará disponible
                en app.seemanngroup.com/terms-of-service.
              </p>
            </div>
          </section>

          {/* S13 */}
          <section className="legal-section" id="s13">
            <span className="legal-section__number">Cláusula 13</span>
            <h2 className="legal-section__title">
              Suspensión y Terminación de la Cuenta
            </h2>
            <div className="legal-section__body">
              <p>
                Seemann Group podrá suspender o terminar el acceso del cliente a
                la plataforma, con o sin previo aviso, en los siguientes
                supuestos:
              </p>
              <ul>
                <li>
                  Incumplimiento de cualquier obligación establecida en estos
                  Términos
                </li>
                <li>
                  Falta de pago de facturas vencidas por más de 30 días
                </li>
                <li>
                  Uso de la plataforma para actividades fraudulentas o ilegales
                </li>
                <li>
                  Proporcionar información falsa o documentación fraudulenta
                </li>
                <li>
                  Actividades que comprometan la seguridad o integridad de la
                  plataforma
                </li>
                <li>
                  Resolución del contrato de servicios por cualquiera de las
                  partes
                </li>
                <li>Requerimiento de autoridades competentes</li>
              </ul>
              <p>
                La terminación de la cuenta no extingue las obligaciones
                económicas pendientes del cliente, ni los derechos de Seemann
                Group a reclamar daños y perjuicios. El cliente podrá solicitar
                la exportación de sus datos durante los 30 días posteriores a la
                notificación de terminación, sin perjuicio de los derechos
                previstos en la Política de Privacidad y en la legislación
                chilena de protección de datos.
              </p>
              <p>
                El cliente podrá cerrar su cuenta en cualquier momento mediante
                solicitud escrita a{" "}
                <a href="mailto:contacto@seemanngroup.com">
                  contacto@seemanngroup.com
                </a>
                , siempre que no tenga operaciones activas ni saldos
                pendientes.
              </p>
            </div>
          </section>

          {/* S14 */}
          <section className="legal-section" id="s14">
            <span className="legal-section__number">Cláusula 14</span>
            <h2 className="legal-section__title">
              Ley Aplicable y Jurisdicción
            </h2>
            <div className="legal-section__body">
              <p>
                Los presentes Términos de Servicio se rigen e interpretan
                conforme a las leyes de la{" "}
                <strong>República de Chile</strong>.
              </p>
              <p>
                Para la resolución de controversias derivadas o relacionadas con
                estos Términos, las partes acuerdan el siguiente procedimiento
                escalonado:
              </p>
              <ul>
                <li>
                  <strong>Negociación directa (30 días):</strong> Las partes
                  intentarán resolver amistosamente la controversia mediante
                  negociación directa entre sus representantes autorizados.
                </li>
                <li>
                  <strong>Mediación:</strong> Si la negociación fracasa, las
                  partes someterán de preferencia la controversia a mediación
                  ante el{" "}
                  <strong>
                    Centro de Arbitraje y Mediación de la Cámara de Comercio de
                    Santiago (CAM Santiago)
                  </strong>
                  .
                </li>
                <li>
                  <strong>Tribunales ordinarios:</strong> De no prosperar la
                  mediación, o si las partes no acuerdan someterse a ella, la
                  controversia será conocida por los{" "}
                  <strong>
                    Tribunales Ordinarios de Justicia con competencia en Viña
                    del Mar, Región de Valparaíso
                  </strong>
                  , República de Chile.
                </li>
              </ul>
              <p>
                Lo anterior se entiende sin perjuicio de las normas imperativas
                de protección al consumidor de la Ley Nº 19.496 que resulten
                aplicables cuando el cliente sea una persona natural que
                califique como consumidor conforme a dicha ley.
              </p>
            </div>
          </section>

          {/* S15 */}
          <section className="legal-section" id="s15">
            <span className="legal-section__number">Cláusula 15</span>
            <h2 className="legal-section__title">Disposiciones Generales</h2>
            <div className="legal-section__body">
              <ul>
                <li>
                  <strong>Integralidad del acuerdo:</strong> Estos Términos,
                  junto con la Política de Privacidad, la Política de Cookies y
                  cualquier contrato de servicio suscrito, constituyen el
                  acuerdo completo entre las partes respecto al uso de la
                  plataforma y reemplazan cualquier comunicación o acuerdo
                  anterior.
                </li>
                <li>
                  <strong>Divisibilidad:</strong> Si alguna disposición de estos
                  Términos fuera declarada inválida o inaplicable por cualquier
                  tribunal competente, las restantes disposiciones continuarán
                  en pleno vigor y efecto.
                </li>
                <li>
                  <strong>No renuncia:</strong> El hecho de que Seemann Group no
                  ejerza algún derecho previsto en estos Términos no constituye
                  renuncia al mismo para el futuro.
                </li>
                <li>
                  <strong>Cesión:</strong> El cliente no podrá ceder ni
                  transferir sus derechos u obligaciones bajo estos Términos
                  sin consentimiento previo y por escrito de Seemann Group.
                  Seemann Group podrá ceder sus derechos en el contexto de una
                  fusión, adquisición o venta de activos, notificando al cliente
                  con antelación.
                </li>
                <li>
                  <strong>Comunicaciones:</strong> Las comunicaciones oficiales
                  entre las partes se realizarán por correo electrónico a las
                  direcciones registradas, siendo válidas las notificaciones
                  enviadas a la dirección de correo de la cuenta.
                </li>
                <li>
                  <strong>Idioma:</strong> En caso de discrepancia entre
                  versiones de estos Términos en distintos idiomas, prevalecerá
                  la versión en español.
                </li>
              </ul>
            </div>
          </section>

          {/* S16 */}
          <section className="legal-section" id="s16">
            <span className="legal-section__number">Cláusula 16</span>
            <h2 className="legal-section__title">Contacto</h2>
            <div className="legal-section__body">
              <p>
                Para cualquier consulta o comunicación relacionada con estos
                Términos de Servicio, puede contactarnos a través de:
              </p>
              <div className="legal-contact-card">
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Soporte General
                  </span>
                  <span className="legal-contact-item__value">
                    <a href="mailto:contacto@seemanngroup.com">
                      contacto@seemanngroup.com
                    </a>
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">Privacidad</span>
                  <span className="legal-contact-item__value">
                    <a href="mailto:privacidad@seemanngroup.com">
                      privacidad@seemanngroup.com
                    </a>
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Asuntos de protección de datos
                  </span>
                  <span className="legal-contact-item__value">
                    <a href="mailto:pablo@sphereglobal.io">
                      pablo@sphereglobal.io
                    </a>
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">Teléfono</span>
                  <span className="legal-contact-item__value">
                    +56 2 2604 8386
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">Dirección</span>
                  <span className="legal-contact-item__value">
                    Av. Libertad #1405, of. 1203
                    <br />
                    Viña del Mar, Chile
                  </span>
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

export default TermsOfService;
