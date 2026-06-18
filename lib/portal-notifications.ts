/**
 * Smart upsert for portal notifications — preserves read state when content unchanged.
 */

export interface PortalNotificationUpsertDoc {
  audience: string;
  recipientEmail: string;
  type: string;
  dedupKey: string;
  read?: boolean;
  readAt?: Date;
  updatedAt?: Date;
  createdAt?: Date;
  [key: string]: unknown;
}

export function portalNotificationFingerprint(
  doc: Partial<PortalNotificationUpsertDoc>,
): string {
  const { read, readAt, updatedAt, createdAt, dedupKey, ...rest } = doc;
  const sortedRest = Object.keys(rest)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = rest[key];
      return acc;
    }, {});
  return JSON.stringify(sortedRest);
}

export function shouldResetNotificationRead(
  existing: PortalNotificationUpsertDoc | null,
  incoming: Partial<PortalNotificationUpsertDoc>,
): boolean {
  if (!existing) return true;
  if (existing.type !== incoming.type) return true;
  return (
    portalNotificationFingerprint(existing) !==
    portalNotificationFingerprint(incoming as PortalNotificationUpsertDoc)
  );
}
