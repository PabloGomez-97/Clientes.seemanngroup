import * as FileSystem from "expo-file-system/legacy";

/** Legacy FileSystem TTL dir (`ops_cache_v1/`). Kept only to wipe leftovers. */
const CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}ops_cache_v1/`;

/**
 * Wipe leftover operaciones FileSystem cache.
 * Pass `[]` to delete the whole `ops_cache_v1/` directory.
 */
export async function clearOpsCache(_partsPrefix: string[] = []): Promise<void> {
  try {
    if (!FileSystem.cacheDirectory) return;
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch {
    // ignore
  }
}
