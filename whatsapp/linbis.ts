import type { Db } from 'mongodb';

export type LinbisAccount = {
  id: number;
  name: string;
  email: string;
  contact: string;
  salesRepId: number | null;
  salesRepName: string;
};

type LinbisTokenDoc = {
  _id: string;
  refresh_token: string;
  access_token?: string;
  access_token_expiry?: number;
  updated_at?: Date;
};

const LINBIS_TOKENS_COLLECTION = 'linbistokens';

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const clientId = process.env.LINBIS_CLIENT_ID?.trim();
  const tokenUrl = process.env.LINBIS_TOKEN_URL?.trim();
  if (!clientId || !tokenUrl) {
    throw new Error('Faltan LINBIS_CLIENT_ID o LINBIS_TOKEN_URL');
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
      scope:
        'https://linbis.onmicrosoft.com/linbis-api/access_as_user openid profile offline_access',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo renovar token Linbis: ${response.status} ${text}`);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
}

export async function getLinbisAccessToken(db: Db): Promise<string> {
  const col = db.collection<LinbisTokenDoc>(LINBIS_TOKENS_COLLECTION);
  let doc = await col.findOne({ _id: 'linbis_token' });

  // Fallback: refresh token del .env si aún no hay doc en Mongo
  if (!doc?.refresh_token) {
    const envRefresh = process.env.LINBIS_REFRESH_TOKEN?.trim();
    if (!envRefresh) {
      throw new Error(
        'No hay refresh token de Linbis. Inicialízalo en el portal o define LINBIS_REFRESH_TOKEN.',
      );
    }
    await col.updateOne(
      { _id: 'linbis_token' },
      {
        $set: { refresh_token: envRefresh, updated_at: new Date() },
        $setOnInsert: { _id: 'linbis_token' },
      },
      { upsert: true },
    );
    doc = await col.findOne({ _id: 'linbis_token' });
  }

  if (!doc?.refresh_token) {
    throw new Error('No hay refresh token de Linbis disponible');
  }

  const now = Date.now();
  if (
    doc.access_token &&
    doc.access_token_expiry &&
    doc.access_token_expiry > now + 5 * 60 * 1000
  ) {
    return doc.access_token;
  }

  const data = await refreshAccessToken(doc.refresh_token);
  const expiresAt = now + data.expires_in * 1000;

  await col.updateOne(
    { _id: 'linbis_token' },
    {
      $set: {
        access_token: data.access_token,
        access_token_expiry: expiresAt,
        ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
        updated_at: new Date(),
      },
    },
  );

  return data.access_token;
}

export async function searchLinbisAccounts(
  db: Db,
  searchTerm: string,
): Promise<LinbisAccount[]> {
  const token = await getLinbisAccessToken(db);
  const headers = { Authorization: `Bearer ${token}` };

  const [accountsRes, salesRepsRes] = await Promise.all([
    fetch(
      `https://api.linbis.com/accounts/list?searchTerm=${encodeURIComponent(searchTerm)}&take=10`,
      { headers },
    ),
    fetch('https://api.linbis.com/salesreps/list?take=100', { headers }),
  ]);

  if (!accountsRes.ok) {
    throw new Error(`Error al buscar en Linbis (${accountsRes.status})`);
  }

  const accountsData = await accountsRes.json();
  const salesRepsData = salesRepsRes.ok ? await salesRepsRes.json() : [];

  const salesRepMap = new Map<number, string>();
  if (Array.isArray(salesRepsData)) {
    for (const sr of salesRepsData as Array<{ id?: number; name?: string }>) {
      if (sr.id != null) salesRepMap.set(Number(sr.id), sr.name || '');
    }
  }

  type RawAccount = {
    id?: number;
    name?: string;
    email?: string;
    contact?: string;
    salesRepId?: number | null;
  };

  const raw = (Array.isArray(accountsData) ? accountsData : []) as RawAccount[];
  return raw.map((a) => {
    const repId = a.salesRepId != null ? Number(a.salesRepId) : null;
    return {
      id: Number(a.id ?? 0),
      name: a.name || '',
      email: a.email || '',
      contact: a.contact || '',
      salesRepId: Number.isFinite(repId as number) ? repId : null,
      salesRepName: repId != null ? salesRepMap.get(repId) ?? '' : '',
    };
  });
}
