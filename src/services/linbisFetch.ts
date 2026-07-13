/**
 * Wrapper around fetch for Linbis API calls.
 * On 401, it calls refreshAccessToken() to get a fresh token and retries ONCE.
 * Respects AbortSignal from options (timeouts / cancellation).
 */

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")) ||
    (error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}

export async function linbisFetch(
  url: string,
  options: RequestInit,
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
): Promise<Response> {
  const headers = {
    ...Object.fromEntries(new Headers(options.headers).entries()),
    Authorization: `Bearer ${accessToken}`,
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw error;
  }

  if (response.status === 401) {
    if (options.signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    console.log("[linbisFetch] 401 received, refreshing token and retrying...");
    const newToken = await refreshAccessToken();

    if (options.signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    const retryHeaders = {
      ...Object.fromEntries(new Headers(options.headers).entries()),
      Authorization: `Bearer ${newToken}`,
    };

    return fetch(url, { ...options, headers: retryHeaders });
  }

  return response;
}

/** Combine multiple AbortSignals into one that aborts when any source aborts. */
export function anyAbortSignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => {
    if (!controller.signal.aborted) controller.abort();
  };

  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  return controller.signal;
}

export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}
