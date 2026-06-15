export async function fetchDocumentCountsBatch(
  token: string,
  usernames: string[],
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  if (usernames.length === 0) return {};

  const qs = usernames.map((username) => encodeURIComponent(username)).join(",");
  const resp = await fetch(`/api/documents/counts?usernames=${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!resp.ok) {
    return Object.fromEntries(usernames.map((username) => [username, 0]));
  }

  const data = await resp.json();
  const counts =
    data?.counts && typeof data.counts === "object" ? data.counts : {};
  const result: Record<string, number> = {};

  for (const username of usernames) {
    result[username] =
      typeof counts[username] === "number" ? counts[username] : 0;
  }

  return result;
}
