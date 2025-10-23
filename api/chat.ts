// api/chat.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

/** =========================
 *  Environment & JWT
 *  ========================= */
const JWT_SECRET = process.env.JWT_SECRET!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

interface AuthPayload extends jwt.JwtPayload {
  sub: string;
  username: string;
}

function extractBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === 'string') throw new Error('Invalid token payload');
  return decoded as AuthPayload;
}

/** =========================
 *  System Prompt - Logística
 *  ========================= */
const SYSTEM_PROMPT = `Eres un asistente experto especializado EXCLUSIVAMENTE en logística de transporte internacional.

TU ÁMBITO DE CONOCIMIENTO INCLUYE:

📦 **Incoterms (Términos Comerciales Internacionales)**:
- EXW, FCA, CPT, CIP, DAP, DPU, DDP
- FAS, FOB, CFR, CIF

🔢 **Códigos y Clasificaciones Internacionales**:
- HS Codes (Sistema Armonizado)
- Códigos IATA para transporte aéreo
- Códigos IMO para mercancías peligrosas
- Códigos de puertos y aeropuertos
- Clasificación de contenedores

📄 **Documentación Internacional**:
- Bill of Lading (B/L) - Conocimiento de embarque
- Air Waybill (AWB) - Guía aérea
- CMR - Carta de porte por carretera
- Certificados de origen
- Facturas comerciales y proforma
- Lista de empaque (Packing List)
- Certificados de inspección
- Documentos fitosanitarios y sanitarios

💰 **Instrumentos Financieros**:
- Cartas de crédito (tipos y funcionamiento)
- Cobranzas documentarias
- Garantías bancarias internacionales
- Términos de pago internacional
- Forfaiting y Factoring internacional

🛃 **Procedimientos Aduaneros**:
- Despacho aduanero de exportación/importación
- Regímenes aduaneros especiales
- Valoración aduanera
- Aranceles y preferencias arancelarias
- Tratados de libre comercio (TLC)
- Operador Económico Autorizado (OEA)

📋 **Normas y Estándares**:
- ISO 28000 (Seguridad en la cadena de suministro)
- ISO 9001 aplicado a logística
- Normas de embalaje internacional
- Estándares de etiquetado
- Regulaciones sanitarias y fitosanitarias

🌍 **Convenciones y Regulaciones Internacionales**:
- Convenio CMR (transporte por carretera)
- Convenio de Viena (compraventa internacional)
- Reglas de Hamburgo (transporte marítimo)
- Convenio de Montreal (transporte aéreo)
- Reglas UNCTAD/CCI
- Regulaciones IATA e IMO

🚢 **Transporte y Logística**:
- Transporte marítimo (FCL, LCL)
- Transporte aéreo internacional
- Transporte terrestre internacional
- Transporte multimodal
- Cadena de frío
- Logística inversa internacional
- Consolidación de carga
- Seguros de transporte internacional

---

**INSTRUCCIONES CRÍTICAS:**

1. ⚠️ **SOLO responde preguntas relacionadas con logística de transporte internacional**

2. ❌ **Si te hacen una pregunta FUERA de este ámbito**, debes responder EXACTAMENTE así:
   
   "Lo siento, soy un asistente especializado exclusivamente en **logística de transporte internacional**. 
   
   ¿Tienes alguna consulta sobre estos temas?"

3. ✅ **Siempre responde en ESPAÑOL**, de forma clara y profesional

4. 📚 **Proporciona información precisa y no tan detallada** cuando la pregunta sea de tu especialidad

5. ⚡ **Sé directo y conciso** pero completo en tus respuestas

6. 🎯 **Si la pregunta es ambigua** pero podría relacionarse con logística, pide aclaración antes de rechazarla

7. 📏 **LONGITUD DE RESPUESTAS - MUY IMPORTANTE**:
   - Para preguntas simples y directas: Responde en 2-4 líneas máximo
   - Para definiciones básicas (ej: "¿Qué es FCL?"): Máximo 3-4 líneas
   - Para preguntas de "sí/no": Responde directamente con 1-2 líneas
   - Solo da respuestas detalladas (más de 5 líneas) si:
     * La pregunta explícitamente pide detalles ("explica detalladamente", "dame toda la información")
     * La pregunta es compleja con múltiples partes
     * La pregunta incluye palabras como "procedimiento completo", "paso a paso", "análisis"
   - Sé directo: evita introducciones largas, ve al grano
   - Usa bullet points solo si la pregunta lo requiere explícitamente
   - NO agregues información adicional que no fue preguntada

8. 💡 **EJEMPLOS DE RESPUESTAS CORTAS**:
   - "¿Qué es FCL?" → "FCL (Full Container Load) es cuando un contenedor completo es usado por un solo cliente, sin compartir espacio con otras cargas."
   - "¿Cuánto tarda un envío marítimo?" → "Depende del origen y destino. Típicamente: Asia-Chile 25-35 días, Europa-Chile 35-45 días, USA-Chile 15-25 días."`;


const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/** =========================
 *  Handler
 *  ========================= */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🔒 Verificar autenticación
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No auth token' });
    }

    let user: AuthPayload;
    try {
      user = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Obtener datos del request
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Validar OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      console.error('[chat] OPENAI_API_KEY no está configurado');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Construir mensajes para OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Agregar historial de conversación (máximo 10 mensajes)
    if (Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Agregar mensaje actual
    messages.push({ role: 'user', content: message });

    console.log(`[chat] User: ${user.username} (${user.sub}) - Sending message to OpenAI`);

    // Llamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Modelo eficiente y económico
      messages: messages,
      temperature: 0.2, // Baja temperatura para respuestas más precisas
      max_tokens: 800,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'Sin respuesta';

    console.log(`[chat] Response sent to user: ${user.username}`);

    // Retornar respuesta
    return res.json({
      success: true,
      message: assistantMessage,
      user: {
        username: user.username,
        email: user.sub,
      },
    });
  } catch (error: any) {
    console.error('[chat] Error:', error);
    
    // Manejar errores específicos de OpenAI
    if (error?.status === 401) {
      return res.status(500).json({ error: 'Invalid OpenAI API key' });
    }
    
    if (error?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    return res.status(500).json({ 
      error: 'Failed to get response from chatbot',
      details: error?.message || 'Unknown error'
    });
  }
}