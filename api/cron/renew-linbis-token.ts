// api/cron/renew-linbis-token.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import LinbisAuthService from '../services/linbisAuthService.ts';

export const config = {
  maxDuration: 300, // 5 minutos (máximo en Vercel Pro)
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('\n[CRON] 🔄 Iniciando renovación automática de token Linbis...');

  try {
    // Verificar secret de autorización
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[CRON] ❌ CRON_SECRET no configurado');
      return res.status(500).json({
        success: false,
        error: 'CRON_SECRET no configurado'
      });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[CRON] ❌ Intento no autorizado de renovación');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const email = process.env.LINBIS_EMAIL;
    const password = process.env.LINBIS_PASSWORD;
    const clientId = process.env.LINBIS_CLIENT_ID;

    if (!email || !password || !clientId) {
      console.error('[CRON] ❌ Configuración incompleta');
      return res.status(500).json({
        success: false,
        error: 'Configuración de Linbis incompleta'
      });
    }

    console.log('[CRON] ✓ Credenciales y autorización verificadas');

    // Ejecutar autenticación
    const tokens = await LinbisAuthService.getNewRefreshToken({
      email,
      password,
      clientId,
    });

    console.log('[CRON] ✅ Nueva autenticación completada');
    console.log('[CRON] 🔄 Enviando token a init endpoint...');

    // Enviar el refresh_token al endpoint de init
    const initResponse = await fetch(`${process.env.VERCEL_URL || 'https://clientes-seemanngroup.vercel.app'}/api/admin/init-linbis-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: tokens.refresh_token
      })
    });

    const initResult = await initResponse.json();

    if (!initResponse.ok) {
      console.error('[CRON] ❌ Error al guardar token:', initResult);
      throw new Error(`Error guardando token: ${JSON.stringify(initResult)}`);
    }

    console.log('[CRON] ✅ Token guardado exitosamente');
    console.log('[CRON] ========================================');
    console.log('[CRON] ✅ RENOVACIÓN COMPLETADA EXITOSAMENTE');
    console.log('[CRON] ========================================\n');

    return res.json({
      success: true,
      message: 'Token renovado exitosamente',
      timestamp: new Date().toISOString(),
      expires_in: tokens.expires_in,
      next_renewal: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
      init_response: initResult
    });

  } catch (error: any) {
    console.error('[CRON] ❌ Error en renovación:', error.message);
    console.error('[CRON] Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}