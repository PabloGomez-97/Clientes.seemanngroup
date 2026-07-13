// api/linbis-token.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { LinbisToken } from './models/LinbisToken.js';

const MONGODB_URI = process.env.MONGODB_URI!;
const LINBIS_CLIENT_ID = process.env.LINBIS_CLIENT_ID!;
const LINBIS_TOKEN_URL = process.env.LINBIS_TOKEN_URL!;
const OAUTH_REFRESH_TIMEOUT_MS = 15_000;

// Reutilizar conexión
let cachedDb: typeof mongoose | null = null;
let refreshInflight: Promise<{ token: string; expiresAt: number }> | null = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  const db = await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  cachedDb = db;
  return db;
}

async function refreshAccessTokenFromLinbis(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OAUTH_REFRESH_TIMEOUT_MS);

  try {
    const response = await fetch(LINBIS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: LINBIS_CLIENT_ID,
        refresh_token: refreshToken,
        scope:
          'https://linbis.onmicrosoft.com/linbis-api/access_as_user openid profile offline_access',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[linbis-token] Failed to refresh:', errorText);
      throw new Error(`Failed to refresh Linbis token: ${response.status}`);
    }

    return (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
  } catch (error) {
    if (
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof DOMException && error.name === 'AbortError')
    ) {
      throw new Error('Timed out refreshing Linbis access token');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Obtiene access token (renueva con refresh_token si hace falta). Single-flight. */
async function getLinbisToken(): Promise<{ token: string; expiresAt: number }> {
  await connectDB();

  let tokenDoc = await LinbisToken.findById('linbis_token').exec();

  if (!tokenDoc) {
    throw new Error('No refresh token found in database. Please initialize it first.');
  }

  const now = Date.now();
  if (
    tokenDoc.access_token &&
    tokenDoc.access_token_expiry &&
    tokenDoc.access_token_expiry > now + 300000
  ) {
    console.log('[linbis-token] Using cached access token');
    return {
      token: tokenDoc.access_token,
      expiresAt: tokenDoc.access_token_expiry,
    };
  }

  if (refreshInflight) {
    return refreshInflight;
  }

  refreshInflight = (async () => {
    console.log('[linbis-token] Refreshing access token...');
    const data = await refreshAccessTokenFromLinbis(tokenDoc!.refresh_token);
    const expiresAt = Date.now() + data.expires_in * 1000;

    tokenDoc!.access_token = data.access_token;
    tokenDoc!.access_token_expiry = expiresAt;

    if (data.refresh_token) {
      console.log('[linbis-token] Updating refresh token in database');
      tokenDoc!.refresh_token = data.refresh_token;
    }

    tokenDoc!.updated_at = new Date();
    await tokenDoc!.save();

    console.log('[linbis-token] Token refreshed successfully');
    return { token: data.access_token, expiresAt };
  })().finally(() => {
    refreshInflight = null;
  });

  return refreshInflight;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, expiresAt } = await getLinbisToken();
    return res.json({
      token,
      expiresAt,
      expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
    });
  } catch (error) {
    console.error('[linbis-token] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get token',
    });
  }
}
