// src/components/footer/PrivacyPolicy.tsx
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import "./legal.css";

const LAST_UPDATED = "14 de julio de 2026";
const EFFECTIVE_DATE = "1 de enero de 2024";

const TOC_ITEMS = [
  { id: "s1", label: "1. Responsable del Tratamiento" },
  { id: "s2", label: "2. Datos que Recopilamos" },
  { id: "s3", label: "3. Fundamentos del Tratamiento" },
  { id: "s4", label: "4. Cómo Usamos sus Datos" },
  { id: "s5", label: "5. Compartición de Datos" },
  { id: "s6", label: "6. Transferencias Internacionales" },
  { id: "s7", label: "7. Conservación de Datos" },
  { id: "s8", label: "8. Sus Derechos" },
  { id: "s9", label: "9. Seguridad de la Información" },
  { id: "s10", label: "10. Menores de Edad" },
  { id: "s11", label: "11. Cookies y Rastreo" },
  { id: "s12", label: "12. Cambios a esta Política" },
  { id: "s13", label: "13. Contacto" },
];

function PrivacyPolicy() {
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
          <ShieldCheck
            size={12}
            style={{ display: "inline", marginRight: 4 }}
          />
          Documento Legal
        </span>
        <h1 className="legal-hero__title">Política de Privacidad</h1>
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
            <span className="legal-infocard__heading">Resumen ejecutivo</span>
            En <strong>Seemann Group S.A.</strong> tratamos sus datos personales
            con la máxima responsabilidad, de conformidad con el ordenamiento
            jurídico de la República de Chile. Esta Política explica qué datos
            recabamos, con qué finalidad, bajo qué supuestos jurídicos, qué
            derechos le asisten y cómo puede ejercerlos. Le recomendamos leerla
            íntegramente antes de utilizar nuestros servicios.
          </div>

          {/* S1 */}
          <section className="legal-section" id="s1">
            <span className="legal-section__number">Artículo 01</span>
            <h2 className="legal-section__title">
              Responsable del Tratamiento de Datos
            </h2>
            <div className="legal-section__body">
              <p>El responsable del tratamiento de sus datos personales es:</p>
              <div className="legal-contact-card">
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Razón Social
                  </span>
                  <span className="legal-contact-item__value">
                    Seemann Group S.A.
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Domicilio Social
                  </span>
                  <span className="legal-contact-item__value">
                    Av. Libertad #1405, of. 1203
                    <br />
                    Viña del Mar, Chile
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">RUT</span>
                  <span className="legal-contact-item__value">-</span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Correo de Privacidad
                  </span>
                  <span className="legal-contact-item__value">
                    <a href="mailto:privacidad@seemanngroup.com">
                      privacidad@seemanngroup.com
                    </a>
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Correo general
                  </span>
                  <span className="legal-contact-item__value">
                    <a href="mailto:contacto@seemanngroup.com">
                      contacto@seemanngroup.com
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
                  <span className="legal-contact-item__label">
                    Contacto de protección de datos
                  </span>
                  <span className="legal-contact-item__value">
                    <a href="mailto:pablo@sphereglobal.io">
                      pablo@sphereglobal.io
                    </a>
                  </span>
                </div>
              </div>
              <p>
                Esta Política se rige por la Constitución Política de la
                República de Chile, en particular el{" "}
                <strong>artículo 19 Nº 4</strong> (protección de la vida privada
                y de los datos personales), y por la{" "}
                <strong>Ley Nº 19.628</strong>, sobre protección de la vida
                privada, en su texto vigente. Asimismo, Seemann Group reconoce
                la <strong>Ley Nº 21.719</strong> (publicada el 13 de diciembre
                de 2024), que reforma de manera integral la Ley Nº 19.628 y crea
                la Agencia de Protección de Datos Personales (APDP), cuya entrada
                en vigor plena está fijada para el{" "}
                <strong>1 de diciembre de 2026</strong>. La Compañía ya prepara
                el cumplimiento del marco reformado y aplicará las nuevas
                obligaciones a medida que entren en vigor.
              </p>
            </div>
          </section>

          {/* S2 */}
          <section className="legal-section" id="s2">
            <span className="legal-section__number">Artículo 02</span>
            <h2 className="legal-section__title">
              Datos Personales que Recopilamos
            </h2>
            <div className="legal-section__body">
              <p>
                Recopilamos distintas categorías de datos personales según el
                tipo de interacción que usted mantiene con nosotros:
              </p>
              <div className="legal-table-wrapper">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Datos específicos</th>
                      <th>Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Datos de identificación</td>
                      <td>
                        Nombre completo, cédula de identidad, pasaporte, RUT u
                        otro identificador empresarial o personal
                      </td>
                      <td>Proporcionados por el usuario</td>
                    </tr>
                    <tr>
                      <td>Datos de contacto</td>
                      <td>
                        Correo electrónico, número de teléfono, domicilio,
                        dirección fiscal o de despacho
                      </td>
                      <td>Proporcionados por el usuario</td>
                    </tr>
                    <tr>
                      <td>Datos de envío y operación</td>
                      <td>
                        Origen, destino, tipo de mercancía, peso/volumen,
                        documentos aduaneros (BL, AWB, DUS/DIN u equivalentes),
                        número de contenedor
                      </td>
                      <td>Proporcionados y generados en el sistema</td>
                    </tr>
                    <tr>
                      <td>Datos de cuenta</td>
                      <td>
                        Nombre de usuario, contraseña cifrada, rol, historial de
                        accesos, preferencias
                      </td>
                      <td>Creados por el usuario y el sistema</td>
                    </tr>
                    <tr>
                      <td>Datos de navegación</td>
                      <td>
                        Dirección IP, tipo de navegador, sistema operativo,
                        páginas visitadas, duración de sesión, cookies
                      </td>
                      <td>Recabados automáticamente</td>
                    </tr>
                    <tr>
                      <td>Datos financieros</td>
                      <td>
                        Información de facturación, referencias de pago,
                        historial de transacciones (no se almacenan datos
                        completos de tarjeta)
                      </td>
                      <td>
                        Proporcionados por el usuario / pasarela de pago
                      </td>
                    </tr>
                    <tr>
                      <td>Datos de comunicaciones</td>
                      <td>
                        Contenido de mensajes enviados a través de
                        formularios de contacto y correo electrónico
                      </td>
                      <td>Generados por el usuario</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="legal-infocard">
                <span className="legal-infocard__heading">Datos sensibles</span>
                Seemann Group no recaba intencionalmente datos sensibles, en el
                sentido de la legislación chilena sobre protección de datos
                (por ejemplo, datos relativos a la salud, origen racial o
                étnico, vida sexual, creencias o afiliaciones). Si en alguna
                comunicación usted los proporciona voluntariamente, serán
                tratados con las reservas, limitaciones y medidas de seguridad
                reforzadas que impone la Ley Nº 19.628 y, a partir de su
                vigencia plena, el marco de la Ley Nº 21.719.
              </div>
            </div>
          </section>

          {/* S3 */}
          <section className="legal-section" id="s3">
            <span className="legal-section__number">Artículo 03</span>
            <h2 className="legal-section__title">
              Fundamentos del Tratamiento
            </h2>
            <div className="legal-section__body">
              <p>
                El tratamiento de sus datos personales se sustenta en los
                siguientes fundamentos, conforme a la Ley Nº 19.628 y, en la
                medida en que resulten aplicables a medida que entren en vigor,
                a las reglas de la Ley Nº 21.719:
              </p>
              <ul>
                <li>
                  <strong>Consentimiento del titular:</strong> Cuando usted
                  autoriza el tratamiento para finalidades específicas, tales
                  como comunicaciones comerciales, boletines, notificaciones de
                  tarifas no operativas o uso de cookies no esenciales. Puede
                  revocar su consentimiento en cualquier momento, sin efecto
                  retroactivo sobre tratamientos ya realizados lícitamente.
                </li>
                <li>
                  <strong>
                    Ejecución de la relación contractual o de servicios:
                  </strong>{" "}
                  Cuando el tratamiento es necesario para prestar los servicios
                  logísticos y de plataforma contratados, incluyendo
                  cotizaciones, emisión de documentos, gestión de embarques,
                  facturación, tracking y atención operacional.
                </li>
                <li>
                  <strong>Cumplimiento de obligaciones legales:</strong> Cuando
                  la ley chilena u otras normas aplicables exijan el
                  tratamiento, en especial obligaciones aduaneras ante el{" "}
                  <strong>Servicio Nacional de Aduanas de Chile</strong>,
                  obligaciones tributarias ante el{" "}
                  <strong>Servicio de Impuestos Internos (SII)</strong>,
                  prevención de delitos, preservación de información contable y
                  otras exigencias de autoridad competente.
                </li>
                <li>
                  <strong>
                    Interés legítimo del responsable, en cuanto sea compatible
                    con la Ley Nº 19.628 y con el marco de la Ley Nº 21.719:
                  </strong>{" "}
                  Para mejorar la seguridad de la plataforma, prevenir fraudes,
                  mantener la continuidad operacional y realizar análisis
                  estadísticos agregados o seudonimizados, siempre que no
                  prevalezcan los derechos e intereses del titular.
                </li>
              </ul>
            </div>
          </section>

          {/* S4 */}
          <section className="legal-section" id="s4">
            <span className="legal-section__number">Artículo 04</span>
            <h2 className="legal-section__title">
              Cómo Utilizamos sus Datos Personales
            </h2>
            <div className="legal-section__body">
              <p>
                Los datos personales recopilados son utilizados para las
                siguientes finalidades:
              </p>
              <ul>
                <li>
                  <strong>
                    Gestión de embarques y operaciones logísticas:
                  </strong>{" "}
                  Coordinación de envíos aéreos, marítimos (FCL/LCL) y
                  terrestres; preparación de documentos de transporte (Bill of
                  Lading, AWB, Packing List, certificados de origen); gestión
                  aduanera y coordinación con agencias de aduana.
                </li>
                <li>
                  <strong>Prestación de la plataforma digital:</strong>{" "}
                  Autenticación de usuarios, generación y visualización de
                  cotizaciones, tracking de envíos, acceso a documentación y
                  reportes.
                </li>
                <li>
                  <strong>Comunicaciones operativas:</strong> Notificaciones
                  sobre el estado de embarques, alertas de tarifas, vencimiento
                  de documentos, confirmaciones de cotizaciones y facturas.
                </li>
                <li>
                  <strong>Facturación y pagos:</strong> Emisión de facturas,
                  seguimiento de cuentas por cobrar, gestión de crédito
                  comercial y conciliación de pagos.
                </li>
                <li>
                  <strong>Mejora del servicio y análisis:</strong> Análisis de
                  uso de la plataforma (con datos anonimizados o
                  seudonimizados), métricas de rendimiento y detección de
                  anomalías.
                </li>
                <li>
                  <strong>Cumplimiento legal y regulatorio:</strong>{" "}
                  Comunicación a autoridades chilenas competentes, en especial
                  el Servicio Nacional de Aduanas de Chile y el Servicio de
                  Impuestos Internos (SII), así como cumplimiento de
                  obligaciones de comercio exterior, control de exportaciones y
                  prevención de delitos aplicables.
                </li>
                <li>
                  <strong>
                    Marketing y comunicaciones comerciales (solo con
                    consentimiento):
                  </strong>{" "}
                  Envío de información sobre nuevas rutas, tarifas promocionales
                  y actualizaciones del sector logístico.
                </li>
                <li>
                  <strong>Atención al cliente:</strong> Gestión de solicitudes,
                  reclamos, consultas y soporte técnico a través de los
                  canales convencionales de Seemann Group.
                </li>
              </ul>
            </div>
          </section>

          {/* S5 */}
          <section className="legal-section" id="s5">
            <span className="legal-section__number">Artículo 05</span>
            <h2 className="legal-section__title">
              Compartición y Divulgación de Datos
            </h2>
            <div className="legal-section__body">
              <p>
                Seemann Group no vende ni arrienda sus datos personales a
                terceros. Solo compartimos sus datos en las circunstancias
                descritas a continuación, aplicando en todo caso los mecanismos
                contractuales y técnicos apropiados:
              </p>
              <div className="legal-table-wrapper">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Destinatario</th>
                      <th>Finalidad</th>
                      <th>Fundamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Navieras y aerolíneas</td>
                      <td>
                        Reserva de espacio, emisión de B/L y AWB, coordinación
                        de rutas
                      </td>
                      <td>Ejecución de contrato / servicios</td>
                    </tr>
                    <tr>
                      <td>Agentes de aduana</td>
                      <td>
                        Despacho aduanero, presentación de declaraciones y
                        manifiestos
                      </td>
                      <td>Ejecución de contrato / Obligación legal</td>
                    </tr>
                    <tr>
                      <td>
                        Autoridades chilenas (Servicio Nacional de Aduanas, SII
                        y otras competentes)
                      </td>
                      <td>
                        Cumplimiento de obligaciones legales, aduaneras,
                        tributarias y de seguridad
                      </td>
                      <td>Obligación legal</td>
                    </tr>
                    <tr>
                      <td>
                        Proveedores tecnológicos (infraestructura cloud y
                        almacenamiento)
                      </td>
                      <td>Operación segura de la plataforma</td>
                      <td>
                        Contrato de encargo / interés legítimo compatible
                      </td>
                    </tr>
                    <tr>
                      <td>Proveedores de transporte last-mile</td>
                      <td>Entrega de mercancía en destino final</td>
                      <td>Ejecución de contrato / servicios</td>
                    </tr>
                    <tr>
                      <td>Servicios de correo electrónico</td>
                      <td>
                        Envío de notificaciones operativas, cotizaciones y
                        alertas
                      </td>
                      <td>Ejecución de contrato / Consentimiento</td>
                    </tr>
                    <tr>
                      <td>Plataformas de análisis de rendimiento</td>
                      <td>
                        Monitoreo técnico (datos anonimizados o seudonimizados
                        en la medida de lo posible)
                      </td>
                      <td>
                        Interés legítimo compatible / Consentimiento cuando
                        corresponda
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Los terceros que traten datos por cuenta de Seemann Group quedan
                sujetos a obligaciones contractuales de confidencialidad,
                seguridad y uso limitado a las finalidades encargadas.
              </p>
            </div>
          </section>

          {/* S6 */}
          <section className="legal-section" id="s6">
            <span className="legal-section__number">Artículo 06</span>
            <h2 className="legal-section__title">
              Transferencias Internacionales de Datos
            </h2>
            <div className="legal-section__body">
              <p>
                Dado el carácter internacional de los servicios de transporte
                que ofrecemos, sus datos pueden ser transferidos y tratados
                fuera de Chile cuando ello resulte necesario para la prestación
                del servicio (por ejemplo, coordinación con transportistas,
                agentes en destino o proveedores cloud). Seemann Group aplica
                las siguientes salvaguardas:
              </p>
              <ul>
                <li>
                  Transferencias sustentadas en la ejecución de la relación
                  contractual o de servicios logísticos internacionalmente
                  contratados.
                </li>
                <li>
                  Contratos y cláusulas de confidencialidad y protección de
                  datos con destinatarios y encargados en el extranjero.
                </li>
                <li>
                  Medidas técnicas razonables de seguridad (cifrado en tránsito,
                  controles de acceso y minimización).
                </li>
                <li>
                  Ajuste progresivo a los requisitos de transferencias
                  internacionales que establezca la Ley Nº 21.719 y la Agencia
                  de Protección de Datos Personales una vez se encuentren
                  plenamente vigentes y operativos.
                </li>
              </ul>
              <div className="legal-infocard">
                <span className="legal-infocard__heading">
                  Países destinatarios principales
                </span>
                Estados Unidos, países de la Unión Europea, China, Japón, Corea
                del Sur, Emiratos Árabes Unidos, México, Colombia, Brasil y
                demás destinos de nuestras rutas logísticas activas. Para cada
                transferencia aplicamos el mecanismo de garantía apropiado
                conforme a la normativa chilena vigente al momento del
                tratamiento.
              </div>
            </div>
          </section>

          {/* S7 */}
          <section className="legal-section" id="s7">
            <span className="legal-section__number">Artículo 07</span>
            <h2 className="legal-section__title">Conservación de Datos</h2>
            <div className="legal-section__body">
              <p>
                Conservamos sus datos personales únicamente durante el tiempo
                necesario para cumplir las finalidades para las que fueron
                recabados, o mientras existan obligaciones legales o
                contractuales que lo exijan:
              </p>
              <div className="legal-table-wrapper">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Tipo de dato</th>
                      <th>Período de conservación</th>
                      <th>Fundamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Datos de cuenta de usuario activa</td>
                      <td>
                        Mientras la cuenta esté activa + 6 meses tras el cierre
                      </td>
                      <td>Ejecución de contrato / servicios</td>
                    </tr>
                    <tr>
                      <td>
                        Documentos de envío y aduaneros (BL, AWB, Packing List,
                        declaraciones)
                      </td>
                      <td>Hasta 10 años, según regulación aplicable</td>
                      <td>
                        Obligaciones aduaneras y tributarias (Servicio Nacional
                        de Aduanas / SII)
                      </td>
                    </tr>
                    <tr>
                      <td>Registros de facturación y contables</td>
                      <td>
                        Hasta 6 a 10 años, según tipo de obligación
                      </td>
                      <td>
                        Código Tributario y normativa del SII / contabilidad
                        comercial
                      </td>
                    </tr>
                    <tr>
                      <td>Cotizaciones y comunicaciones comerciales</td>
                      <td>5 años</td>
                      <td>
                        Posibles reclamaciones contractuales (Código Civil y
                        Código de Comercio)
                      </td>
                    </tr>
                    <tr>
                      <td>Logs de acceso y seguridad</td>
                      <td>12 meses</td>
                      <td>
                        Seguridad de sistemas e investigación de incidentes
                      </td>
                    </tr>
                    <tr>
                      <td>Datos de cookies y análisis web</td>
                      <td>13 meses máximo</td>
                      <td>
                        Consentimiento / interés legítimo compatible
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Comunicaciones de marketing (si dio consentimiento)
                      </td>
                      <td>Hasta retirada del consentimiento</td>
                      <td>Consentimiento</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Transcurridos los períodos indicados, sus datos serán eliminados
                de forma segura o anonimizados de manera irreversible para usos
                estadísticos.
              </p>
            </div>
          </section>

          {/* S8 */}
          <section className="legal-section" id="s8">
            <span className="legal-section__number">Artículo 08</span>
            <h2 className="legal-section__title">
              Sus Derechos como Titular de los Datos
            </h2>
            <div className="legal-section__body">
              <p>
                Conforme a la Ley Nº 19.628 y al artículo 19 Nº 4 de la
                Constitución Política de la República, usted dispone, en
                términos generales, de los siguientes derechos:
              </p>
              <ul>
                <li>
                  <strong>Derecho de acceso:</strong> Conocer qué datos
                  personales suyos tratamos, con qué finalidad, su origen y
                  destinatarios.
                </li>
                <li>
                  <strong>Derecho de rectificación:</strong> Solicitar la
                  corrección de datos inexactos, incompletos o desactualizados.
                </li>
                <li>
                  <strong>Derecho de cancelación:</strong> Solicitar la
                  eliminación de sus datos cuando ya no sean necesarios para la
                  finalidad del tratamiento o cuando éste carezca de fundamento
                  jurídico; este derecho puede estar limitado por obligaciones
                  legales de conservación.
                </li>
                <li>
                  <strong>Derecho de oposición y/o bloqueo:</strong> Oponerse
                  al tratamiento o solicitar el bloqueo de sus datos cuando
                  resulte procedente conforme a la ley.
                </li>
                <li>
                  <strong>Revocación del consentimiento:</strong> Cuando el
                  tratamiento se sustente en su consentimiento, podrá
                  revocarlo en cualquier momento.
                </li>
                <li>
                  <strong>Derechos adicionales bajo la Ley Nº 21.719:</strong> A
                  partir de la entrada en vigor plena del marco reformado, se
                  reconocerán asimismo derechos de portabilidad y demás
                  facultades del esquema ARCOP (u otras denominaciones legales
                  equivalentes) en la medida en que resulten exigibles conforme
                  a dicha ley y a la regulación de la APDP.
                </li>
              </ul>
              <div className="legal-infocard">
                <span className="legal-infocard__heading">
                  ¿Cómo ejercer sus derechos?
                </span>
                Envíe su solicitud por escrito a{" "}
                <a href="mailto:privacidad@seemanngroup.com">
                  privacidad@seemanngroup.com
                </a>{" "}
                o a{" "}
                <a href="mailto:pablo@sphereglobal.io">pablo@sphereglobal.io</a>
                , indicando: nombre completo, documento de identidad, derecho
                que desea ejercer y, si aplica, medio de respuesta. Bajo la
                práctica vigente de la Ley Nº 19.628, responderemos dentro de
                los plazos legales aplicables a cada derecho. Una vez plenamente
                vigente la Ley Nº 21.719, el plazo típico de respuesta a estas
                solicitudes será de <strong>30 días</strong> contados desde la
                recepción de la solicitud, sin perjuicio de prórrogas o
                excepciones que la ley o la APDP establezcan. Si estima que su
                solicitud no ha sido atendida adecuadamente, podrá reclamar ante
                los <strong>tribunales ordinarios de justicia de Chile</strong>{" "}
                y, a partir de la vigencia operativa de la Ley Nº 21.719,
                también ante la{" "}
                <strong>Agencia de Protección de Datos Personales</strong>.
              </div>
            </div>
          </section>

          {/* S9 */}
          <section className="legal-section" id="s9">
            <span className="legal-section__number">Artículo 09</span>
            <h2 className="legal-section__title">
              Seguridad de la Información
            </h2>
            <div className="legal-section__body">
              <p>
                Seemann Group implementa medidas técnicas y organizativas
                adecuadas para proteger sus datos personales contra el acceso no
                autorizado, la pérdida accidental, la alteración o la
                divulgación indebida. Estas medidas incluyen:
              </p>
              <ul>
                <li>
                  <strong>Cifrado en tránsito:</strong> Comunicaciones entre su
                  navegador y nuestra plataforma mediante protocolos TLS 1.2 /
                  TLS 1.3 (HTTPS).
                </li>
                <li>
                  <strong>Cifrado en reposo:</strong> Datos almacenados en bases
                  de datos y sistemas de archivos con AES-256 o equivalente.
                </li>
                <li>
                  <strong>Contraseñas:</strong> Almacenadas exclusivamente como
                  hashes criptográficos (bcrypt con salt), nunca en texto plano.
                </li>
                <li>
                  <strong>Control de acceso:</strong> Acceso basado en roles
                  (RBAC) con principio de mínimo privilegio. Autenticación de
                  dos factores disponible para cuentas administrativas.
                </li>
                <li>
                  <strong>Auditoría y monitoreo:</strong> Registros de acceso y
                  actividad, monitoreo de anomalías y alertas ante intentos
                  sospechosos.
                </li>
                <li>
                  <strong>Infraestructura:</strong> Alojada en proveedores cloud
                  de nivel empresarial, con controles de seguridad y
                  certificaciones de mercado cuando corresponda.
                </li>
                <li>
                  <strong>Gestión de incidentes:</strong> Procedimiento
                  documentado de respuesta ante brechas. Cuando una brecha
                  afecte de manera relevante sus derechos, le notificaremos
                  conforme a la normativa chilena aplicable y a los plazos que
                  ésta determine.
                </li>
                <li>
                  <strong>Evaluaciones periódicas:</strong> Revisiones de
                  seguridad y análisis de vulnerabilidades de forma regular.
                </li>
              </ul>
              <p>
                Ningún sistema de transmisión de datos por Internet puede
                garantizar una seguridad absoluta. Si sospecha que su cuenta ha
                sido comprometida, contáctenos de inmediato en{" "}
                <a href="mailto:privacidad@seemanngroup.com">
                  privacidad@seemanngroup.com
                </a>{" "}
                o{" "}
                <a href="mailto:contacto@seemanngroup.com">
                  contacto@seemanngroup.com
                </a>
                .
              </p>
            </div>
          </section>

          {/* S10 */}
          <section className="legal-section" id="s10">
            <span className="legal-section__number">Artículo 10</span>
            <h2 className="legal-section__title">Menores de Edad</h2>
            <div className="legal-section__body">
              <p>
                Los servicios de Seemann Group están dirigidos exclusivamente a
                personas mayores de 18 años que actúen en calidad de empresas,
                importadores, exportadores o profesionales del comercio
                internacional. No recabamos ni tratamos intencionalmente datos
                personales de menores de 18 años.
              </p>
              <p>
                Si tenemos conocimiento de haber recabado datos de un menor sin
                la autorización o consentimiento legalmente exigido,
                procederemos a eliminar dicha información de forma inmediata. Si
                usted es padre, madre o representante legal y cree que un menor
                a su cargo nos ha proporcionado datos personales, contáctenos en{" "}
                <a href="mailto:privacidad@seemanngroup.com">
                  privacidad@seemanngroup.com
                </a>
                .
              </p>
            </div>
          </section>

          {/* S11 */}
          <section className="legal-section" id="s11">
            <span className="legal-section__number">Artículo 11</span>
            <h2 className="legal-section__title">
              Cookies y Tecnologías de Rastreo
            </h2>
            <div className="legal-section__body">
              <p>
                Nuestra plataforma utiliza cookies y tecnologías similares para
                garantizar el funcionamiento correcto del sitio, analizar el uso
                de la plataforma y, con su consentimiento cuando corresponda,
                ofrecer contenido personalizado. Para información detallada
                sobre los tipos de cookies que utilizamos, su duración,
                proveedores y cómo gestionar sus preferencias, consulte nuestra{" "}
                <Link to="/cookie-settings">Política de Cookies</Link>.
              </p>
              <p>
                Puede modificar sus preferencias de cookies en cualquier momento
                accediendo a la Configuración de Cookies disponible en el pie de
                página de nuestra plataforma.
              </p>
            </div>
          </section>

          {/* S12 */}
          <section className="legal-section" id="s12">
            <span className="legal-section__number">Artículo 12</span>
            <h2 className="legal-section__title">
              Cambios a esta Política de Privacidad
            </h2>
            <div className="legal-section__body">
              <p>
                Seemann Group se reserva el derecho de modificar esta Política
                de Privacidad en cualquier momento para reflejar cambios en
                nuestras prácticas, servicios, normativa chilena aplicable
                —incluida la gradual entrada en vigor de la Ley Nº 21.719— o
                requerimientos de autoridad.
              </p>
              <p>
                Cuando realicemos cambios materiales, le notificaremos con al
                menos <strong>15 días de antelación</strong> mediante uno o
                varios de los siguientes mecanismos: aviso prominente en la
                plataforma, notificación por correo electrónico a la dirección
                registrada en su cuenta, o banner informativo en el acceso a la
                plataforma.
              </p>
              <p>
                La fecha de la &quot;Última actualización&quot; al inicio de
                este documento refleja cuándo se realizó la revisión más
                reciente. El uso continuado de la plataforma tras la entrada en
                vigor de los cambios constituirá su aceptación de la nueva
                versión. Si no está de acuerdo con los cambios, deberá cesar el
                uso de la plataforma y puede solicitar la eliminación de su
                cuenta.
              </p>
              <p>
                Conservamos las versiones anteriores de esta Política accesibles
                bajo solicitud.
              </p>
            </div>
          </section>

          {/* S13 */}
          <section className="legal-section" id="s13">
            <span className="legal-section__number">Artículo 13</span>
            <h2 className="legal-section__title">Contacto y Reclamaciones</h2>
            <div className="legal-section__body">
              <p>
                Para cualquier consulta, solicitud de ejercicio de derechos o
                reclamación relacionada con el tratamiento de sus datos
                personales, puede contactarnos a través de los siguientes
                canales:
              </p>
              <div className="legal-contact-card">
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Email de Privacidad
                  </span>
                  <span className="legal-contact-item__value">
                    <a href="mailto:privacidad@seemanngroup.com">
                      privacidad@seemanngroup.com
                    </a>
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Email general
                  </span>
                  <span className="legal-contact-item__value">
                    <a href="mailto:contacto@seemanngroup.com">
                      contacto@seemanngroup.com
                    </a>
                  </span>
                </div>
                <div className="legal-contact-item">
                  <span className="legal-contact-item__label">
                    Contacto de protección de datos
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
                  <span className="legal-contact-item__label">
                    Dirección Postal
                  </span>
                  <span className="legal-contact-item__value">
                    Av. Libertad #1405, of. 1203
                    <br />
                    Viña del Mar, Chile
                  </span>
                </div>
              </div>
              <div className="legal-infocard">
                <span className="legal-infocard__heading">
                  Autoridad y vías de reclamo
                </span>
                Hasta que la Agencia de Protección de Datos Personales se
                encuentre plenamente operativa conforme a la Ley Nº 21.719,
                usted conserva el derecho a reclamar ante los{" "}
                <strong>
                  tribunales ordinarios de justicia de la República de Chile
                </strong>
                . A partir de la vigencia plena de dicha ley y de la puesta en
                marcha de la APDP, podrá además presentar reclamaciones ante la{" "}
                <strong>Agencia de Protección de Datos Personales</strong>, sin
                perjuicio de las acciones judiciales que le correspondan.
              </div>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

export default PrivacyPolicy;
