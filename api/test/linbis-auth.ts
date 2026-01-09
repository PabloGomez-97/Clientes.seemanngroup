// api/test/linbis-auth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import LinbisAuthService from '../services/linbisAuthService.ts';

export const config = {
  maxDuration: 60, // Tiempo máximo de ejecución
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Test] Iniciando prueba de autenticación Linbis');

    // Obtener credenciales desde variables de entorno
    const email = process.env.LINBIS_EMAIL;
    const password = process.env.LINBIS_PASSWORD;
    const clientId = process.env.LINBIS_CLIENT_ID;

    if (!email || !password || !clientId) {
      return res.status(500).json({
        error: 'Configuración incompleta',
        missing: {
          email: !email,
          password: !password,
          clientId: !clientId,
        },
      });
    }

    // Ejecutar autenticación
    const tokens = await LinbisAuthService.getNewRefreshToken({
      email,
      password,
      clientId,
    });

    // Retornar resultado (con tokens truncados para seguridad en logs)
    return res.json({
      success: true,
      message: 'Autenticación exitosa',
      tokens: {
        access_token: `${tokens.access_token.substring(0, 20)}...`,
        refresh_token: `${tokens.refresh_token.substring(0, 20)}...`,
        refresh_token_full: tokens.refresh_token, // SOLO PARA PRUEBAS
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Test] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Error desconocido',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}