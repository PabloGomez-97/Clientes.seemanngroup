import * as FileSystem from "expo-file-system/legacy";

const TTL_MS = 60 * 60 * 1000; // 1 hora
const CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}ops_cache_v1/`;

type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

function fileName(parts: string[]): string {
  return `${parts.join("__").replace(/[^a-zA-Z0-9._-]+/g, "_")}.json`;
}

function filePath(parts: string[]): string {
  return `${CACHE_DIR}${fileName(parts)}`;
}

async function ensureCacheDir(): Promise<boolean> {
  if (!FileSystem.cacheDirectory) return false;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  return true;
}

export async function readOpsCache<T>(parts: string[]): Promise<T | null> {
  try {
    if (!(await ensureCacheDir())) return null;
    const path = filePath(parts);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.ts || Date.now() - parsed.ts > TTL_MS) {
      await FileSystem.deleteAsync(path, { idempotent: true });
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export async function writeOpsCache<T>(
  parts: string[],
  data: T,
): Promise<void> {
  try {
    if (!(await ensureCacheDir())) return;
    const envelope: CacheEnvelope<T> = { ts: Date.now(), data };
    await FileSystem.writeAsStringAsync(
      filePath(parts),
      JSON.stringify(envelope),
    );
  } catch {
    // quota / serialization — ignore
  }
}

export async function clearOpsCache(partsPrefix: string[]): Promise<void> {
  try {
    if (!(await ensureCacheDir())) return;
    if (partsPrefix.length === 0) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      return;
    }
    const prefix = fileName(partsPrefix).replace(/\.json$/, "");
    const listing = await FileSystem.readDirectoryAsync(CACHE_DIR);
    await Promise.all(
      listing
        .filter((name) => name.startsWith(prefix))
        .map((name) =>
          FileSystem.deleteAsync(`${CACHE_DIR}${name}`, { idempotent: true }),
        ),
    );
  } catch {
    // ignore
  }
}
